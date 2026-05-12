#!/bin/bash
# ============================================================
#  SAVAGE LOOP — Daily 8 AM Content Engine
#  Steps: RSS scan → Ghostwriter → Deploy → (5m wait) →
#         Omni Responder → Sniper → Value Commenter →
#         Social Monitor → Mailer
# ============================================================
set -euo pipefail

REPO="/Users/fs/Downloads/Mr. Workout"
LOG="$HOME/Library/Logs/mrworkout_savage_loop.log"
PY="/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/bin/python3"

# Extend PATH for npm globals (vercel CLI)
export PATH="/Users/fs/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Timestamp helper
ts() { date '+%Y-%m-%d %H:%M:%S'; }

log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "======================================================"
log "  SAVAGE LOOP START"
log "======================================================"

# ── 1. Load env vars (API keys) ────────────────────────────
log "[1/9] Loading env vars…"
# shellcheck disable=SC1091
source "$REPO/agents/savage_creator/set_env.sh" >> "$LOG" 2>&1 || true

# ── 2. Reddit RSS scan — find hot leads ───────────────────
log "[2/9] Scanning Reddit RSS for hot leads…"
$PY "$REPO/agents/scout_engine/rss_listener.py" --once \
    >> "$LOG" 2>&1 && log "      RSS scan complete" \
    || log "      RSS scan error (non-fatal)"

# ── 3. MDX Ghostwriter — blog any unprocessed archive vids ─
log "[3/9] Running MDX ghostwriter…"
$PY "$REPO/agents/ghostwriter/mdx_ghostwriter.py" \
    >> "$LOG" 2>&1 && log "      Ghostwriter complete" \
    || log "      Ghostwriter error (non-fatal)"

# ── 4. Auto-push any new MDX to Vercel ────────────────────
log "[4/9] Checking for new MDX to deploy…"
# Count MDX files not yet in content/blog
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
            # Strip import line and copy
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

# ── 5. Wait for Vercel build to finish ────────────────────
log "[5/9] Waiting 5 min for Vercel build before Omni Responder…"
sleep 300

# ── 6. Omni Responder — intercept competitor fan questions ─
log "[6/9] Running Omni Responder…"
$PY "$REPO/agents/scout_engine/omni_responder.py" \
    >> "$LOG" 2>&1 && log "      Omni Responder complete" \
    || log "      Omni Responder error (non-fatal)"

# ── 7. Savage Sniper — post all pending leads headlessly ──
log "[7/9] Running Savage Sniper (headless)…"
PENDING=$(python3 -c "
import csv, sys
try:
    rows = list(csv.DictReader(open('$REPO/twitter_leads/savage_leads_2026.csv')))
    n = sum(1 for r in rows if r.get('status','').strip().lower() not in ('posted','skipped'))
    print(n)
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

# ── 6. Reddit Value Commenter — draft comments on hot posts ───
log "[8/9] Running Reddit Value Commenter…"
$PY "$REPO/agents/scout_engine/reddit_value_commenter.py" \
    >> "$LOG" 2>&1 && log "      Value Commenter complete" \
    || log "      Value Commenter error (non-fatal)"

# ── 7. Social Monitor — scan YouTube + Instagram comments ──────
log "[9/9] Running Social Monitor…"
$PY "$REPO/agents/scout_engine/social_monitor.py" \
    >> "$LOG" 2>&1 && log "      Social Monitor complete" \
    || log "      Social Monitor error (non-fatal)"

# ── 8. Mailer — drip sequence for new email signups ────────────
log "[10/10] Running Email Mailer…"
$PY "$REPO/agents/mailer.py" \
    >> "$LOG" 2>&1 && log "      Mailer complete" \
    || log "      Mailer error (non-fatal)"

log "======================================================"
log "  SAVAGE LOOP DONE"
log "======================================================"
