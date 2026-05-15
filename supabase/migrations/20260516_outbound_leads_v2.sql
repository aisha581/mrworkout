-- Drop old table if it exists (bigserial version), recreate with UUID
drop table if exists outbound_leads;

create extension if not exists "pgcrypto";

create table outbound_leads (
  id             uuid        primary key default gen_random_uuid(),
  email          text        not null unique,
  first_name     text        not null default '',
  status         text        not null default 'pending'
                             check (status in ('pending', 'sent', 'followup_sent', 'blacklisted', 'converted')),
  last_sent_date timestamptz,
  created_at     timestamptz not null default now()
);

create index idx_outbound_leads_status    on outbound_leads (status);
create index idx_outbound_leads_last_sent on outbound_leads (last_sent_date);
