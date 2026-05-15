#!/usr/bin/env node
/**
 * One-time setup: creates the outbound_leads table in Supabase.
 * Run once: node scripts/create_outbound_leads_table.mjs
 *
 * If this fails, paste supabase/migrations/20260515_outbound_leads.sql
 * directly into your Supabase Dashboard → SQL Editor → Run.
 */

import fs   from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
        const [k, ...rest] = line.split('=');
        if (k && rest.length && !k.startsWith('#')) process.env[k.trim()] ??= rest.join('=').trim();
    });
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Test by inserting + deleting a dummy row — if table exists, great.
// If not, we'll get an error telling the user to run the SQL manually.
const { error } = await supabase
    .from('outbound_leads')
    .select('id')
    .limit(1);

if (!error) {
    console.log('✓ outbound_leads table already exists — nothing to do.');
    process.exit(0);
}

console.log('outbound_leads table not found. Creating via Supabase Management API…');

// Use the Management API (requires project ref from URL)
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0];
const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260515_outbound_leads.sql'), 'utf8');

const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method:  'POST',
    headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
});

if (resp.ok) {
    console.log('✓ Table created successfully.');
} else {
    const body = await resp.text();
    console.error('✗ Could not auto-create table:', resp.status, body);
    console.log('\nPlease run this SQL manually in your Supabase Dashboard → SQL Editor:\n');
    console.log(sql);
}
