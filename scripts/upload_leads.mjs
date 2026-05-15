#!/usr/bin/env node
/**
 * scripts/upload_leads.mjs
 * ────────────────────────
 * Parses every CSV in ~/email_csv/ and upserts leads into
 * the Supabase `outbound_leads` table — skipping duplicates.
 *
 * Usage:
 *   node scripts/upload_leads.mjs
 *   node scripts/upload_leads.mjs --dry-run
 *
 * Expected CSV columns (case-insensitive, any order):
 *   email, first_name / name / firstname, source (optional)
 */

import fs   from 'fs';
import path from 'path';
import os   from 'os';
import { createClient } from '@supabase/supabase-js';

// ── Env ───────────────────────────────────────────────────────────────────────

const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
        const [k, ...rest] = line.split('=');
        if (k && rest.length && !k.startsWith('#')) {
            process.env[k.trim()] ??= rest.join('=').trim();
        }
    });
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_DIR       = path.join(process.cwd(), 'Email CSV');
const DRY_RUN       = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('✗ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── CSV parser (no deps) ──────────────────────────────────────────────────────

function parseCsv(raw) {
    const lines  = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

    return lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
        const row  = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        return row;
    }).filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((r.email || '').trim()));
}

function normalise(row, source) {
    const email = (row.email || '').toLowerCase().trim();
    const first =
        row.first_name   ||
        row.firstname    ||
        row.first        ||
        (row.name || '').split(' ')[0] ||
        '';
    return { email, first_name: first.trim(), source, status: 'pending', email_step: 0 };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!fs.existsSync(CSV_DIR)) {
        console.error(`✗ Folder not found: ${CSV_DIR}`);
        process.exit(1);
    }

    const csvFiles = fs.readdirSync(CSV_DIR).filter(f => f.toLowerCase().endsWith('.csv'));
    if (!csvFiles.length) { console.log('No CSV files found in', CSV_DIR); return; }

    let totalParsed = 0;
    let totalUpserted = 0;
    let totalSkipped  = 0;

    for (const file of csvFiles) {
        const filePath = path.join(CSV_DIR, file);
        const source   = path.basename(file, '.csv');
        console.log(`\n── ${file}`);

        const raw  = fs.readFileSync(filePath, 'utf8');
        const rows = parseCsv(raw);
        console.log(`   Parsed ${rows.length} rows`);
        totalParsed += rows.length;

        const leads = rows.map(r => normalise(r, source));

        if (DRY_RUN) {
            console.log(`   DRY-RUN — sample:`, leads.slice(0, 3));
            continue;
        }

        // Upsert in chunks of 200, conflict on email → do nothing
        const CHUNK = 200;
        for (let i = 0; i < leads.length; i += CHUNK) {
            const chunk = leads.slice(i, i + CHUNK);
            const { data, error } = await supabase
                .from('outbound_leads')
                .upsert(chunk, { onConflict: 'email', ignoreDuplicates: true })
                .select('email');

            if (error) {
                console.error(`   ✗ Upsert error (chunk ${i}):`, error.message);
            } else {
                const inserted = data?.length ?? 0;
                const skipped  = chunk.length - inserted;
                totalUpserted += inserted;
                totalSkipped  += skipped;
                console.log(`   ✓ chunk ${i/CHUNK + 1}: ${inserted} new, ${skipped} duplicates skipped`);
            }
        }
    }

    console.log('\n════════════════════════════════');
    if (DRY_RUN) {
        console.log(`DRY-RUN complete — ${totalParsed} leads parsed, nothing written`);
    } else {
        console.log(`DONE — ${totalUpserted} inserted, ${totalSkipped} duplicates skipped`);
    }
}

main().catch(e => { console.error('✗ Fatal:', e); process.exit(1); });
