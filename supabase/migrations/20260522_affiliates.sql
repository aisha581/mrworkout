CREATE TABLE IF NOT EXISTS affiliates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  first_name text,
  email      text UNIQUE NOT NULL,
  handle     text,
  platform   text,
  audience_size text,
  estimated_monthly_earnings numeric,
  status     text NOT NULL DEFAULT 'approved',
  ref_code   text,
  clicks     integer NOT NULL DEFAULT 0,
  signups    integer NOT NULL DEFAULT 0
);

-- Add any missing columns if table already exists
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS estimated_monthly_earnings numeric,
  ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS ref_code   text,
  ADD COLUMN IF NOT EXISTS clicks     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signups    integer NOT NULL DEFAULT 0;
