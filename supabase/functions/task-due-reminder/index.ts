import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_PROJECT_ID = (Deno.env.get('FIREBASE_PROJECT_ID') || '').trim()
let FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY') || ''
if (FIREBASE_PRIVATE_KEY) {
  FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.trim().replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
  if (!FIREBASE_PRIVATE_KEY.includes('\n')) {
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

interface Task {
  id: string
  name: string
  due_date: string
  department_id: string | null
  batch_id: string | null
  section_id: string | null
  status: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

function base64URLEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return base64URLEncode(binary)
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

async function generateFirebaseJWT(): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }
  const encodedHeader = base64URLEncode(JSON.stringify(header))
  const encodedPayload = base64URLEncode(JSON.stringify(payload))
  const signatureInput = encodedHeader + '.' + encodedPayload
  const privateKey = await importPrivateKey(FIREBASE_PRIVATE_KEY)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  )
  return encodedHeader + '.' + encodedPayload + '.' + arrayBufferToBase64URL(signature)
}

async function getFirebaseAccessToken(): Promise<string> {
  const jwt = await generateFirebaseJWT()
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to get access token: ' + await response.text())
  }
  const data = await response.json()
  return data.access_token
}

async function sendFCMMessage(
  accessToken: string,
  fcmToken: string,
  notification: { title: string; body: string },
  data: Record<string, string>
): Promise<{ success: boolean; error?: string; tokenInvalid?: boolean }> {
  try {
    const response = await fetch(
      'https://fcm.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/messages:send',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification,
            data,
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
              },
            },
          },
        }),
      }
    )
    const result = await response.json()
    if (!response.ok) {
      const isInvalidToken = result.error?.message?.includes('not a valid FCM registration token') ||
                            result.error?.message?.includes('Requested entity was not found') ||
                            result.error?.code === 404
      return { success: false, error: result.error?.message, tokenInvalid: isInvalidToken }
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('=== Task Due Reminder Job Started ===')

  try {
    if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
      throw new Error('Firebase configuration missing')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]

    console.log('Looking for tasks due on: ' + tomorrowStr)

    // Query tasks that are due tomorrow and not completed
    // Must have section_id to identify target users
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, due_date, department_id, batch_id, section_id, status')
      .eq('due_date', tomorrowStr)
      .neq('status', 'completed')
      .not('section_id', 'is', null)

    if (tasksError) {
      throw new Error('Failed to fetch tasks: ' + tasksError.message)
    }

    if (!tasks || tasks.length === 0) {
      console.log('No tasks due tomorrow')
      return new Response(
        JSON.stringify({ message: 'No tasks due tomorrow', tasksProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found ' + tasks.length + ' tasks due tomorrow')

    // Check which tasks already have reminders sent today (idempotency)
    const taskIds = tasks.map(t => t.id)
    const { data: existingLogs } = await supabase
      .from('task_reminder_logs')
      .select('task_id')
      .in('task_id', taskIds)
      .eq('reminder_date', todayStr)

    const alreadySentTaskIds = new Set((existingLogs || []).map(l => l.task_id))
    const tasksToProcess = tasks.filter(t => !alreadySentTaskIds.has(t.id))

    if (tasksToProcess.length === 0) {
      console.log('All task reminders already sent today')
      return new Response(
        JSON.stringify({ message: 'All reminders already sent', tasksProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing ' + tasksToProcess.length + ' tasks (' + alreadySentTaskIds.size + ' already sent)')

    // Get Firebase access token once for all notifications
    const accessToken = await getFirebaseAccessToken()

    let totalSent = 0
    let totalFailed = 0
    const results: Array<{ taskId: string; taskName: string; sent: number; failed: number }> = []

    for (const task of tasksToProcess) {
      console.log('Processing task: ' + task.name + ' (' + task.id + ')')
      console.log('  Section: ' + task.section_id + ', Batch: ' + task.batch_id + ', Dept: ' + task.department_id)

      // Build query to find users with matching department, batch, and section
      let usersQuery = supabase.from('users').select('id')

      // Match all three: department, batch, and section
      if (task.section_id) {
        usersQuery = usersQuery.eq('section_id', task.section_id)
      }
      if (task.batch_id) {
        usersQuery = usersQuery.eq('batch_id', task.batch_id)
      }
      if (task.department_id) {
        usersQuery = usersQuery.eq('department_id', task.department_id)
      }

      const { data: matchingUsers, error: usersError } = await usersQuery

      if (usersError) {
        console.error('Error fetching users for task ' + task.id + ':', usersError)
        continue
      }

      if (!matchingUsers || matchingUsers.length === 0) {
        console.log('  No matching users found for task ' + task.id)
        await supabase.from('task_reminder_logs').insert({
          task_id: task.id,
          reminder_date: todayStr,
          recipients_count: 0,
          status: 'sent'
        })
        continue
      }

      console.log('  Found ' + matchingUsers.length + ' matching users')

      // Get FCM tokens for these users
      const userIds = matchingUsers.map(u => u.id)
      const { data: tokens, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('id, token, user_id')
        .in('user_id', userIds)
        .eq('is_active', true)

      if (tokensError) {
        console.error('Error fetching tokens for task ' + task.id + ':', tokensError)
        continue
      }

      if (!tokens || tokens.length === 0) {
        console.log('  No active FCM tokens for matching users')
        await supabase.from('task_reminder_logs').insert({
          task_id: task.id,
          reminder_date: todayStr,
          recipients_count: 0,
          status: 'sent'
        })
        continue
      }

      console.log('  Sending to ' + tokens.length + ' FCM tokens')

      // Send notifications
      const notification = {
        title: '⏰ Task Due Tomorrow',
        body: 'Your task "' + task.name + '" is due tomorrow'
      }

      const notificationData = {
        taskId: task.id,
        type: 'TASK_REMINDER',
        route: '/task/view/' + task.id
      }

      let taskSent = 0
      let taskFailed = 0

      const sendPromises = tokens.map(async ({ id, token }) => {
        const result = await sendFCMMessage(accessToken, token, notification, notificationData)
        if (result.success) {
          taskSent++
        } else {
          taskFailed++
          console.error('  Failed token ' + token.substring(0, 10) + '...: ' + result.error)
          if (result.tokenInvalid) {
            await supabase.from('fcm_tokens').update({ is_active: false }).eq('id', id)
          }
        }
        return result
      })

      await Promise.all(sendPromises)

      console.log('  Sent: ' + taskSent + ', Failed: ' + taskFailed)

      // Log the reminder (idempotency record)
      const status = taskFailed === 0 ? 'sent' : (taskSent > 0 ? 'partial' : 'failed')
      await supabase.from('task_reminder_logs').insert({
        task_id: task.id,
        reminder_date: todayStr,
        recipients_count: taskSent,
        status
      })

      totalSent += taskSent
      totalFailed += taskFailed
      results.push({ taskId: task.id, taskName: task.name, sent: taskSent, failed: taskFailed })
    }

    const duration = Date.now() - startTime
    console.log('=== Job Completed in ' + duration + 'ms ===')
    console.log('Total: ' + totalSent + ' sent, ' + totalFailed + ' failed')

    return new Response(
      JSON.stringify({
        success: true,
        tasksProcessed: tasksToProcess.length,
        totalSent,
        totalFailed,
        durationMs: duration,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Task reminder job error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
