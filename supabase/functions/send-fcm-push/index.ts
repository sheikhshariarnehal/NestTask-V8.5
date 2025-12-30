import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Firebase configuration from environment variables
const FIREBASE_PROJECT_ID = (Deno.env.get('FIREBASE_PROJECT_ID') || '').trim()
// Handle various private key formats (with \n, \\n, or actual newlines)
let FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY') || ''
// Normalize the private key format
if (FIREBASE_PRIVATE_KEY) {
  // Replace escaped newlines with actual newlines
  FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.trim().replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
  // Ensure it has proper formatting
  if (!FIREBASE_PRIVATE_KEY.includes('\n')) {
    // If still no newlines, try to add them every 64 characters (standard PEM format)
    const header = '-----BEGIN PRIVATE KEY-----'
    const footer = '-----END PRIVATE KEY-----'
    if (FIREBASE_PRIVATE_KEY.includes(header) && FIREBASE_PRIVATE_KEY.includes(footer)) {
      const keyContent = FIREBASE_PRIVATE_KEY.replace(header, '').replace(footer, '').replace(/\s/g, '')
      const lines = []
      for (let i = 0; i < keyContent.length; i += 64) {
        lines.push(keyContent.substring(i, i + 64))
      }
      FIREBASE_PRIVATE_KEY = `${header}\n${lines.join('\n')}\n${footer}`
    }
  }
}
const FIREBASE_CLIENT_EMAIL = (Deno.env.get('FIREBASE_CLIENT_EMAIL') || '').trim()

interface NotificationPayload {
  taskId: string
  title: string
  body: string
  sectionId?: string
  data?: Record<string, string>
}

interface FCMResponse {
  name?: string
  error?: {
    code: number
    message: string
    status: string
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Base64URL encode without padding
function base64URLEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Convert ArrayBuffer to base64URL
function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return base64URLEncode(binary)
}

// Parse PEM private key to CryptoKey
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and decode base64
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )
}

// Generate JWT for Firebase authentication
async function generateFirebaseJWT(): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour expiry
    iat: now
  }

  const encodedHeader = base64URLEncode(JSON.stringify(header))
  const encodedPayload = base64URLEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Import private key and sign
  const privateKey = await importPrivateKey(FIREBASE_PRIVATE_KEY)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  )

  const encodedSignature = arrayBufferToBase64URL(signature)
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

// Get OAuth2 access token from Firebase
async function getFirebaseAccessToken(): Promise<string> {
  const jwt = await generateFirebaseJWT()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get access token: ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

// Send FCM message to a single token
async function sendFCMMessage(
  accessToken: string,
  fcmToken: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string; tokenInvalid?: boolean }> {
  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: data || {},
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'tasks',
                clickAction: 'PUSH_NOTIFICATION_CLICK',
                color: '#3b82f6',
                icon: 'ic_notification',
                defaultSound: true,
                defaultVibrateTimings: true,
                notificationPriority: 'PRIORITY_HIGH',
                visibility: 'PUBLIC',
                notificationCount: 1,
              },
            },
          },
        }),
      }
    )

    const result: FCMResponse = await response.json()

    if (!response.ok) {
      console.error(`FCM API Error - Status: ${response.status}`, JSON.stringify(result, null, 2))
      
      const isInvalidToken = result.error?.message?.includes('not a valid FCM registration token') ||
                            result.error?.message?.includes('Requested entity was not found') ||
                            result.error?.code === 404

      return {
        success: false,
        error: result.error?.message || 'Failed to send notification',
        tokenInvalid: isInvalidToken,
      }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate Firebase configuration
    if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
      throw new Error('Firebase configuration is missing. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL secrets.')
    }

    const { taskId, title, body, sectionId, data }: NotificationPayload = await req.json()

    if (!taskId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: taskId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Query FCM tokens
    // If sectionId is provided, only get tokens for users in that section
    let query = supabase
      .from('fcm_tokens')
      .select('id, token, user_id')
      .eq('is_active', true)

    if (sectionId) {
      // Join with users table to filter by section
      const { data: sectionUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('section_id', sectionId)

      if (usersError) {
        console.error('Error fetching section users:', usersError)
      } else if (sectionUsers && sectionUsers.length > 0) {
        const userIds = sectionUsers.map(u => u.id)
        query = query.in('user_id', userIds)
      }
    }

    const { data: tokens, error: tokensError } = await query

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`)
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, total: 0, message: 'No active FCM tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken()

    // Send notifications to all tokens
    const notificationData = {
      taskId,
      type: 'TASK',
      route: `/task/view/${taskId}`,
      ...data,
    }

    const results = await Promise.all(
      tokens.map(async ({ id, token }) => {
        const result = await sendFCMMessage(
          accessToken,
          token,
          { title, body },
          notificationData
        )

        // Log failures for debugging
        if (!result.success) {
          console.error(`Failed to send to token ${token.substring(0, 10)}...: ${result.error}`)
        }

        // If token is invalid, mark it as inactive
        if (result.tokenInvalid) {
          console.log(`Marking token ${token.substring(0, 10)}... as inactive`)
          await supabase
            .from('fcm_tokens')
            .update({ is_active: false })
            .eq('id', id)
        }

        return result
      })
    )

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length
    const invalidTokens = results.filter(r => r.tokenInvalid).length

    console.log(`FCM Push: ${successCount} sent, ${failedCount} failed, ${invalidTokens} invalid tokens`)
    
    // Log failed errors summary
    if (failedCount > 0) {
      const errors = results.filter(r => !r.success).map(r => r.error).join(', ')
      console.error(`Errors: ${errors}`)
    }

    return new Response(
      JSON.stringify({
        sent: successCount,
        failed: failedCount,
        invalidTokens,
        total: tokens.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in send-fcm-push:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
