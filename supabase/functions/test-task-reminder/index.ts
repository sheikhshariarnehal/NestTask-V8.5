import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Test Task Reminder - Manual Trigger ===')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured')
    }
    
    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY not configured')
    }

    // Call the task-due-reminder function with test mode
    const functionUrl = `${supabaseUrl}/functions/v1/task-due-reminder?test=true`
    
    console.log('Calling task-due-reminder function:', functionUrl)
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({})
    })

    const result = await response.json()
    
    console.log('Response status:', response.status)
    console.log('Response:', JSON.stringify(result, null, 2))

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        message: 'Task reminder test completed',
        result
      }, null, 2),
      { 
        status: response.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Test failed:', errMsg)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errMsg,
        message: 'Failed to test task reminder function'
      }, null, 2),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
