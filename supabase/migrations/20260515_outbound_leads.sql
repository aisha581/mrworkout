-- outbound_leads: cold email lead table for the Savage Hunter drip
create table if not exists outbound_leads (
  id              bigserial primary key,
  email           text        not null unique,
  first_name      text        not null default '',
  source          text        not null default 'csv',
  status          text        not null default 'pending'
                              check (status in ('pending', 'active', 'blacklisted', 'converted')),
  email_step      integer     not null default 0,   -- 0=none sent, 1=intro sent, 2=protocol sent
  last_sent_date  timestamptz,
  created_at      timestamptz not null default now()
);

-- index for the daily cron queries
create index if not exists idx_outbound_leads_status       on outbound_leads (status);
create index if not exists idx_outbound_leads_last_sent    on outbound_leads (last_sent_date);
create index if not exists idx_outbound_leads_email_step   on outbound_leads (email_step);
