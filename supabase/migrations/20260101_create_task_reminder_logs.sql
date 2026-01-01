-- Task Reminder Logs Table
-- Tracks sent reminders to prevent duplicate notifications
-- Migration applied: 2026-01-01

CREATE TABLE IF NOT EXISTS public.task_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reminder_date date NOT NULL,
  sent_at timestamptz DEFAULT now(),
  recipients_count integer DEFAULT 0,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'partial')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  
  -- Unique constraint to prevent duplicate reminders for same task on same day
  UNIQUE(task_id, reminder_date)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_reminder_logs_task_id ON public.task_reminder_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminder_logs_reminder_date ON public.task_reminder_logs(reminder_date);
CREATE INDEX IF NOT EXISTS idx_task_reminder_logs_sent_at ON public.task_reminder_logs(sent_at);

-- Enable RLS
ALTER TABLE public.task_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access" ON public.task_reminder_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE public.task_reminder_logs IS 'Tracks task due date reminder notifications to prevent duplicates';
