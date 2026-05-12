#!/bin/bash
# ============================================================
#  SAVAGE LOOP — Daily 8 AM Content Engine
#  Order: Intel (Mon) → RSS scan → Ghostwriter → Blog Push →
#         (5m wait) → Omni Empire → Sniper → Success Scan →
#         Email Mailer
# ============================================================
set -euo pipefail

REPO="/Users/fs/Downloads/Mr. Workout"
LOG="$HOME/Library/Logs/mrworkout_savage_loop.log"
PY="/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/bin/python3"

export PATH="/Users/fs/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

ts()  { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# ── Caffeinate — keep Mac awake for the full run ──────────────────────
caffeinate -s -w $$ &
CAFF_PID=$!
trap 'kill "$CAFF_PID" 2>/dev/null || true' EXIT

log "======================================================"
log "  SAVAGE LOOP START (caffeinate PID=$CAFF_PID)"
log "======================================================"

# ── 1. Load env vars ───────────────────────────────────────
log "[1/8] Loading env vars…"
# shellcheck disable=SC1091
source "$REPO/agents/savage_creator/set_env.sh" >> "$LOG" 2>&1 || true

# ── 2. Intelligence Scraper — run every Monday ─────────────
DOW=$(date +%u)   # 1=Monday … 7=Sunday
if [ "$DOW" = "1" ]; then
    log "[2/8] Running weekly Intelligence Scraper (Monday)…"
    $PY "$REPO/agents/scout_engine/intel_scraper.py" \
        >> "$LOG" 2>&1 && log "      Intel report updated" \
        || log "      Intel scraper error (non-fatal)"
else
    log "[2/8] Intelligence Scraper — skipping (runs on Mondays, today=DOW$DOW)"
fi

# ── 3. Reddit RSS scan — find hot leads ───────────────────
log "[3/8] Scanning Reddit RSS for hot leads…"
$PY "$REPO/agents/scout_engine/rss_listener.py" --once \
    >> "$LOG" 2>&1 && log "      RSS scan complete" \
    || log "      RSS scan error (non-fatal)"

# ── 4. MDX Ghostwriter — draft blogs (pivot from intel) ───
log "[4/8] Running MDX ghostwriter…"
$PY "$REPO/agents/ghostwriter/mdx_ghostwriter.py" \
    >> "$LOG" 2>&1 && log "      Ghostwriter complete" \
    || log "      Ghostwriter error (non-fatal)"

# ── 5. Blog Push — copy new MDX and deploy to Vercel ──────
log "[5/8] Checking for new MDX to deploy…"
NEW_MDX=$(comm -23 \
    <(ls "$REPO/vercel_blogs/"*.mdx 2>/dev/null | xargs -I{} basename {} | sort) \
    <(ls "$REPO/content/blog/"*.mdx 2>/dev/null | xargs -I{} basename {} | sort) \
    | wc -l | tr -d ' ')

if [ "$NEW_MDX" -gt 0 ]; then
    log "      $NEW_MDX new MDX file(s) found — deploying…"
    for f in "$REPO/vercel_blogs/"*.mdx; do
        fname=$(basename "$f")
        dest="$REPO/content/blog/$fname"
        if [ ! -f "$dest" ]; then
            sed "s|^import { DownloadCTA } from '@/components/DownloadCTA'$||" \
                "$f" > "$dest"
            log "      Copied: $fname"
        fi
    done
    cd "$REPO"
    git add content/blog/ >> "$LOG" 2>&1 || true
    git commit -m "blog: daily autopush $(date '+%Y-%m-%d')" >> "$LOG" 2>&1 || true
    git push origin main >> "$LOG" 2>&1 \
        && log "      Pushed to GitHub — Vercel build triggered" \
        || log "      git push error (non-fatal)"
else
    log "      No new MDX files to deploy"
fi

# ── 6. Wait for Vercel build ───────────────────────────────
log "[6/8] Waiting 5 min for Vercel build before social replies…"
sleep 300

# ── 7. Omni Empire — own + competitor + Reddit replies ────
log "[7/8] Running Omni Empire…"
$PY "$REPO/agents/scout_engine/omni_empire.py" \
    --missions own competitor reddit \
    >> "$LOG" 2>&1 && log "      Omni Empire complete" \
    || log "      Omni Empire error (non-fatal)"

# ── 7b. Savage Sniper — post all pending leads ────────────
log "[7b/8] Running Savage Sniper…"
PENDING=$(python3 -c "
import csv
try:
    rows = list(csv.DictReader(open('$REPO/twitter_leads/savage_leads_2026.csv')))
    print(sum(1 for r in rows if r.get('status','').strip().lower() not in ('posted','skipped')))
except:
    print(0)
" 2>/dev/null)

if [ "${PENDING:-0}" -gt 0 ]; then
    log "      $PENDING pending lead(s) to post…"
    $PY "$REPO/agents/scout_engine/savage_sniper.py" \
        >> "$LOG" 2>&1 && log "      Sniper complete" \
        || log "      Sniper error (non-fatal)"
else
    log "      No pending leads to post"
fi

# ── 7c. Success Logger — scan posted X replies for engagement
log "[7c/8] Scanning posted replies for engagement (few-shot update)…"
$PY "$REPO/agents/scout_engine/success_logger.py" scan \
    >> "$LOG" 2>&1 && log "      Success scan complete" \
    || log "      Success scan error (non-fatal)"

# ── 8. Email Mailer — Supabase drip sequence ──────────────
log "[8/8] Running Email Mailer…"
$PY "$REPO/agents/mailer.py" \
    >> "$LOG" 2>&1 && log "      Mailer complete" \
    || log "      Mailer error (non-fatal)"

log "======================================================"
log "  SAVAGE LOOP DONE"
log "======================================================"
