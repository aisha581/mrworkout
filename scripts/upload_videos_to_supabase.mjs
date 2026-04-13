/**
 * Uploads all exercise videos from public/videos/exercises/ to Supabase Storage.
 * Run once: node scripts/upload_videos_to_supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://btmopyfbuvylmdfwqfuo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bW9weWZidXZ5bG1kZndxZnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUxNDI1MiwiZXhwIjoyMDg5MDkwMjUyfQ.aHBBOLlV4i7bcWEHaxHPy9tIEmUtDymNa1iJ7cSmxKE';
const BUCKET = 'exercise-library';
const VIDEOS_DIR = path.join(__dirname, '../public/videos/exercises');
// ────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function ensureBucket() {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET);
    if (!exists) {
        const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
        if (error) throw new Error(`Failed to create bucket: ${error.message}`);
        console.log(`✓ Created bucket: ${BUCKET}`);
    } else {
        // Make sure it's public
        await supabase.storage.updateBucket(BUCKET, { public: true });
        console.log(`✓ Bucket ready: ${BUCKET}`);
    }
}

async function uploadFile(filename) {
    const filePath = path.join(VIDEOS_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, fileBuffer, {
            contentType: 'video/mp4',
            upsert: true,   // overwrite if exists
        });

    if (error) {
        console.error(`  ✗ ${filename}: ${error.message}`);
        return false;
    }
    return true;
}

async function main() {
    console.log('\n── Mr. Workout: Supabase Video Upload ──────────────────\n');

    await ensureBucket();

    const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4'));
    console.log(`\nUploading ${files.length} videos...\n`);

    let success = 0;
    let fail = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${files.length}] ${file}...`);
        const ok = await uploadFile(file);
        if (ok) {
            success++;
            console.log(' ✓');
        } else {
            fail++;
        }
    }

    const publicBase = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
    console.log(`\n────────────────────────────────────────────────────────`);
    console.log(`✓ Uploaded: ${success}   ✗ Failed: ${fail}`);
    console.log(`\nPublic URL base:\n  ${publicBase}/<filename>.mp4`);
    console.log(`\nExample:\n  ${publicBase}/bench-press.mp4\n`);
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
});
