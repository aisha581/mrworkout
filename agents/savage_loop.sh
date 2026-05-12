#!/bin/bash
# ============================================================
#  SAVAGE LOOP — Daily 8 AM Content Engine
#  Steps: RSS scan → Ghostwriter → Blog Push → (5m wait) →
#         Omni Empire → Savage Sniper → Email Mailer
# ============================================================
set -euo pipefail

REPO="/Users/fs/Downloads/Mr. Workout"
LOG="$HOME/Library/Logs/mrworkout_savage_loop.log"
PY="/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/bin/python3"

export PATH="/Users/fs/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "======================================================"
log "  SAVAGE LOOP START"
log "======================================================"

# ── 1. Load env vars ───────────────────────────────────────
log "[1/7] Loading env vars…"
# shellcheck disable=SC1091
source "$REPO/agents/savage_creator/set_env.sh" >> "$LOG" 2>&1 || true

# ── 2. Reddit RSS scan — find hot leads ───────────────────
log "[2/7] Scanning Reddit RSS for hot leads…"
$PY "$REPO/agents/scout_engine/rss_listener.py" --once \
    >> "$LOG" 2>&1 && log "      RSS scan complete" \
    || log "      RSS scan error (non-fatal)"

# ── 3. MDX Ghostwriter — draft blogs from archive vids ────
log "[3/7] Running MDX ghostwriter…"
$PY "$REPO/agents/ghostwriter/mdx_ghostwriter.py" \
    >> "$LOG" 2>&1 && log "      Ghostwriter complete" \
    || log "      Ghostwriter error (non-fatal)"

# ── 4. Blog Push — copy new MDX to content/blog and deploy
log "[4/7] Checking for new MDX to deploy…"
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

# ── 5. Wait for Vercel build ───────────────────────────────
log "[5/7] Waiting 5 min for Vercel build before social replies…"
sleep 300

# ── 6. Omni Empire — own posts + competitor fans + Reddit ──
log "[6/7] Running Omni Empire (own + competitor + Reddit)…"
$PY "$REPO/agents/scout_engine/omni_empire.py" \
    --missions own competitor reddit \
    >> "$LOG" 2>&1 && log "      Omni Empire complete" \
    || log "      Omni Empire error (non-fatal)"

# ── 6b. Savage Sniper — post all pending leads headlessly ──
log "[6b/7] Running Savage Sniper…"
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

# ── 7. Email Mailer — Supabase drip sequence ───────────────
log "[7/7] Running Email Mailer…"
$PY "$REPO/agents/mailer.py" \
    >> "$LOG" 2>&1 && log "      Mailer complete" \
    || log "      Mailer error (non-fatal)"

log "======================================================"
log "  SAVAGE LOOP DONE"
log "======================================================"
