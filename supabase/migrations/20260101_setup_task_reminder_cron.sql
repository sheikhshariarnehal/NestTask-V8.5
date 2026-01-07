-- Migration: setup_task_reminder_cron
-- Created: 2026-01-01
-- Purpose: Schedule daily task due reminder notifications at 8:30 PM Bangladesh Time

-- Schedule the cron job to run daily at 14:30 UTC (8:30 PM Bangladesh Time, UTC+6)
-- Uses pg_net extension to call the Edge Function

-- Remove existing job if it exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('task-due-reminder-daily');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, ignore
    NULL;
END $$;

-- Schedule the new cron job
SELECT cron.schedule(
  'task-due-reminder-daily',   -- Job name
  '30 14 * * *',               -- Cron expression: 14:30 UTC = 8:30 PM BDT (PRODUCTION)
  $$
  SELECT net.http_post(
    url := 'https://nglfbbdoyyfslzyjarqs.supabase.co/functions/v1/task-due-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler - includes task-due-reminder-daily at 8:30 PM BDT';
