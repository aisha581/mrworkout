-- Click interest tracking + 24h follow-up scheduling
ALTER TABLE outbound_leads
  ADD COLUMN IF NOT EXISTS lead_type       text DEFAULT 'recruit'
    CHECK (lead_type IN ('creator', 'coach', 'recruit')),
  ADD COLUMN IF NOT EXISTS interest_level  text
    CHECK (interest_level IN ('high')),
  ADD COLUMN IF NOT EXISTS clicked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_at    timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_sent  boolean NOT NULL DEFAULT false;

-- Required for realtime UPDATE events to carry full row data
ALTER TABLE outbound_leads REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_outbound_leads_interest
  ON outbound_leads (interest_level, follow_up_at)
  WHERE interest_level = 'high' AND follow_up_sent = false;
