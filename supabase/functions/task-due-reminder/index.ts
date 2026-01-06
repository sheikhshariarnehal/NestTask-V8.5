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
      const lines: string[] = []
      for (let i = 0; i < keyContent.length; i += 64) {
        lines.push(keyContent.substring(i, i + 64))
      }
      FIREBASE_PRIVATE_KEY = header + '\n' + lines.join('\n') + '\n' + footer
    }
  }
}
const FIREBASE_CLIENT_EMAIL = (Deno.env.get('FIREBASE_CLIENT_EMAIL') || '').trim()

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
    const errText = await response.text()
    throw new Error('Failed to get access token: ' + errText)
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
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errMsg }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const requestUrl = new URL(req.url)
  const testMode = requestUrl.searchParams.get('test') === 'true'
  
  console.log('=== Task Due Reminder Job Started ===')
  console.log('Test mode:', testMode)
  console.log('Request method:', req.method)

  try {
    // Validate Firebase configuration
    if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
      console.error('❌ Firebase configuration missing!')
      console.error('FIREBASE_PROJECT_ID:', FIREBASE_PROJECT_ID ? 'Set' : 'Missing')
      console.error('FIREBASE_PRIVATE_KEY:', FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing')
      console.error('FIREBASE_CLIENT_EMAIL:', FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing')
      throw new Error('Firebase configuration missing')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing!')
      throw new Error('Supabase configuration missing')
    }
    
    console.log('✅ All configurations validated')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]

    console.log('📅 Current date:', todayStr)
    console.log('📅 Looking for tasks due on:', tomorrowStr)

    console.log('🔍 Querying tasks...')
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, due_date, department_id, batch_id, section_id, status')
      .eq('due_date', tomorrowStr)
      .neq('status', 'completed')
      .not('section_id', 'is', null)

    if (tasksError) {
      console.error('❌ Failed to fetch tasks:', tasksError.message)
      console.error('Error details:', tasksError)
      throw new Error('Failed to fetch tasks: ' + tasksError.message)
    }

    console.log('📊 Query returned', tasks?.length || 0, 'tasks')
    
    if (!tasks || tasks.length === 0) {
      console.log('ℹ️ No tasks due tomorrow')
      return new Response(
        JSON.stringify({ message: 'No tasks due tomorrow', tasksProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Found ' + tasks.length + ' tasks due tomorrow')

    const taskIds = tasks.map(t => t.id)
    
    // In test mode, skip the duplicate check
    let tasksToProcess = tasks
    let alreadySentCount = 0
    
    if (!testMode) {
      console.log('🔍 Checking for already sent reminders...')
      const { data: existingLogs, error: logsError } = await supabase
        .from('task_reminder_logs')
        .select('task_id')
        .in('task_id', taskIds)
        .eq('reminder_date', todayStr)

      if (logsError) {
        console.warn('⚠️ Error checking logs:', logsError.message)
      }

      const alreadySentTaskIds = new Set((existingLogs || []).map((l: { task_id: string }) => l.task_id))
      alreadySentCount = alreadySentTaskIds.size
      tasksToProcess = tasks.filter(t => !alreadySentTaskIds.has(t.id))
      console.log('📋 Already sent:', alreadySentCount, '| To process:', tasksToProcess.length)
    } else {
      console.log('⚠️ Test mode: Skipping duplicate check')
    }

    if (tasksToProcess.length === 0) {
      console.log('ℹ️ All task reminders already sent today')
      return new Response(
        JSON.stringify({ message: 'All reminders already sent', tasksProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔄 Processing ' + tasksToProcess.length + ' tasks (skipped: ' + alreadySentCount + ')')

    const accessToken = await getFirebaseAccessToken()

    let totalSent = 0
    let totalFailed = 0
    const results: Array<{ taskId: string; taskName: string; sent: number; failed: number }> = []

    for (const task of tasksToProcess) {
      console.log('Processing task: ' + task.name + ' (' + task.id + ')')

      let usersQuery = supabase.from('users').select('id')

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
        console.log('No matching users found for task ' + task.id)
        await supabase.from('task_reminder_logs').insert({
          task_id: task.id,
          reminder_date: todayStr,
          recipients_count: 0,
          status: 'sent'
        })
        continue
      }

      console.log('✅ Found ' + matchingUsers.length + ' matching users')

      const userIds = matchingUsers.map((u: { id: string }) => u.id)
      console.log('🔍 Fetching FCM tokens for ' + userIds.length + ' users...')
      
      const { data: tokens, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('id, token, user_id')
        .in('user_id', userIds)
        .eq('is_active', true)

      if (tokensError) {
        console.error('❌ Error fetching tokens for task ' + task.id + ':', tokensError)
        console.error('Token error details:', tokensError.message, tokensError.code, tokensError.details)
        continue
      }

      console.log('📱 Found ' + (tokens?.length || 0) + ' active FCM tokens')

      if (!tokens || tokens.length === 0) {
        console.warn('⚠️ No active FCM tokens for matching users')
        await supabase.from('task_reminder_logs').insert({
          task_id: task.id,
          reminder_date: todayStr,
          recipients_count: 0,
          status: 'sent'
        })
        continue
      }

      console.log('📤 Sending to ' + tokens.length + ' FCM tokens')

      const notification = {
        title: '⏰ Task Due Tomorrow',
        body: '"' + task.name + '" is due tomorrow. Don\'t forget!'
      }

      const notificationData = {
        taskId: task.id,
        taskName: task.name,
        type: 'TASK_REMINDER',
        route: '/task/view/' + task.id,
        dueDate: tomorrowStr
      }

      console.log('📨 Notification:', notification.title)
      console.log('📦 Data payload:', notificationData)

      let taskSent = 0
      let taskFailed = 0
      const failedReasons: string[] = []

      const sendPromises = tokens.map(async (tokenRecord: { id: string; token: string }) => {
        const result = await sendFCMMessage(accessToken, tokenRecord.token, notification, notificationData)
        if (result.success) {
          taskSent++
          console.log('✅ Sent to token ending:', tokenRecord.token.slice(-6))
        } else {
          taskFailed++
          const reason = result.error || 'Unknown error'
          failedReasons.push(reason)
          console.error('❌ Failed to send to token ending:', tokenRecord.token.slice(-6), '- Reason:', reason)
          if (result.tokenInvalid) {
            console.log('🗑️ Marking invalid token as inactive')
            await supabase.from('fcm_tokens').update({ is_active: false }).eq('id', tokenRecord.id)
          }
        }
        return result
      })

      await Promise.all(sendPromises)

      console.log('📊 Results - Sent: ' + taskSent + ', Failed: ' + taskFailed)
      if (failedReasons.length > 0) {
        console.log('❌ Failure reasons:', [...new Set(failedReasons)].join(', '))
      }

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
    console.log('=== ✅ Job Completed in ' + duration + 'ms ===')
    console.log('📊 Final Stats:')
    console.log('  • Tasks processed:', tasksToProcess.length)
    console.log('  • Total sent:', totalSent)
    console.log('  • Total failed:', totalFailed)
    console.log('  • Success rate:', tasksToProcess.length > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) + '%' : 'N/A')

    const response = {
      success: true,
      message: 'Task reminders processed successfully',
      data: {
        tasksProcessed: tasksToProcess.length,
        totalTasksFound: tasks.length,
        totalSent,
        totalFailed,
        successRate: totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 0,
        durationMs: duration,
        timestamp: new Date().toISOString(),
        testMode
      },
      results
    }

    return new Response(
      JSON.stringify(response, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    const errStack = error instanceof Error ? error.stack : undefined
    
    console.error('=== ❌ Task Reminder Job Failed ===')
    console.error('Error:', errMsg)
    if (errStack) {
      console.error('Stack:', errStack)
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errMsg,
        timestamp: new Date().toISOString()
      }, null, 2),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
