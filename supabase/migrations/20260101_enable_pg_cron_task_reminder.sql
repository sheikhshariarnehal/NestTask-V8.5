-- Enable pg_cron and pg_net extensions for scheduled HTTP requests
-- Migration applied: 2026-01-01

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests from within Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the task reminder job to run daily at 8:30 PM Bangladesh Time (UTC+6)
-- 8:30 PM BDT = 14:30 UTC
-- Cron format: minute hour day month day_of_week
SELECT cron.schedule(
  'task-due-reminder-daily',  -- Job name
  '30 14 * * *',              -- 14:30 UTC = 8:30 PM BDT
  $$
  SELECT net.http_post(
    url := 'https://ycuymjlcsvigorskvsdr.supabase.co/functions/v1/task-due-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- View scheduled jobs: SELECT * FROM cron.job;
-- View job run history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- Unschedule job: SELECT cron.unschedule('task-due-reminder-daily');
