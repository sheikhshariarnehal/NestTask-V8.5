-- Migration: Create FCM tokens table for push notifications
-- Date: 2024-12-29

-- Drop old Web Push subscriptions table (if exists)
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Create FCM tokens table for native push notifications
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_info jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

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

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_fcm_tokens_updated_at ON fcm_tokens;
CREATE TRIGGER trigger_fcm_tokens_updated_at
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_fcm_tokens_updated_at();

-- Comment for documentation
COMMENT ON TABLE fcm_tokens IS 'Stores Firebase Cloud Messaging tokens for push notifications';
COMMENT ON COLUMN fcm_tokens.token IS 'FCM registration token from device';
COMMENT ON COLUMN fcm_tokens.platform IS 'Device platform: android, ios, or web';
COMMENT ON COLUMN fcm_tokens.device_info IS 'Optional device metadata (model, OS version, etc.)';
COMMENT ON COLUMN fcm_tokens.is_active IS 'Whether this token is still valid and should receive notifications';
