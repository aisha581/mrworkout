-- communication_logs: every DM, comment, and email sent by any outreach channel
CREATE TABLE IF NOT EXISTS communication_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  handle       text NOT NULL,
  platform     text NOT NULL CHECK (platform IN ('ig', 'x', 'email', 'reddit', 'youtube')),
  message_text text NOT NULL,
  lead_type    text NOT NULL DEFAULT 'recruit' CHECK (lead_type IN ('creator', 'coach', 'recruit')),
  status       text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_created   ON communication_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_platform  ON communication_logs (platform);
CREATE INDEX IF NOT EXISTS idx_comm_logs_lead_type ON communication_logs (lead_type);

-- Add lead_type column to waitlist for categorized ingestion
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS lead_type text
  DEFAULT 'recruit' CHECK (lead_type IN ('creator', 'coach', 'recruit'));
