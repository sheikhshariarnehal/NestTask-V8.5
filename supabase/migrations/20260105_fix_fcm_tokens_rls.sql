-- Migration: Fix FCM tokens RLS policies for edge functions
-- Date: 2026-01-05
-- Issue: Edge functions need to read FCM tokens to send push notifications

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can view own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can update own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can delete own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Service role can manage all tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Admins can view all tokens" ON fcm_tokens;

-- Policy: Users can manage their own FCM tokens
CREATE POLICY "Users can insert own FCM tokens"
  ON fcm_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own FCM tokens"
  ON fcm_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own FCM tokens"
  ON fcm_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own FCM tokens"
  ON fcm_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role (edge functions) can read and manage all tokens
-- This is needed for the send-fcm-push and task-due-reminder functions
CREATE POLICY "Service role can manage all tokens"
  ON fcm_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Admins can view all tokens (for debugging and management)
CREATE POLICY "Admins can view all tokens"
  ON fcm_tokens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'section_admin', 'super-admin')
    )
  );

-- Add comment
COMMENT ON POLICY "Service role can manage all tokens" ON fcm_tokens IS 
  'Allows edge functions with service role to send push notifications';
