#!/usr/bin/env python3
"""
daily_emails/email_blast.py
────────────────────────────
Pulls all users from Supabase, generates a savage email body via Grok,
and blasts it through Resend at 09:00 UTC every day.

Cron: 0 9 * * * TZ=UTC python3 .../email_blast.py
"""

import json
import os
import random
import re
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

import requests

# ── Env ───────────────────────────────────────────────────────────────────────

REPO = Path(__file__).resolve().parents[2]

def _load_env() -> None:
    env_file = REPO / ".env.local"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

_load_env()

RESEND_API_KEY        = os.environ.get("RESEND_API_KEY", "")
GROK_API_KEY          = os.environ.get("GROK_API_KEY", "")
SUPABASE_URL          = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
FROM_EMAIL            = "MR. WORKOUT <noreply@mrworkout.pro>"
REPLY_TO              = "support@mrworkout.pro"
LOG_FILE              = Path(__file__).parent / "blast_log.json"


def log(msg: str = "") -> None:
    print(msg, flush=True)


# ── Subject line pool ─────────────────────────────────────────────────────────

SUBJECT_LINES = [
    "Is that a pump or a pimple?",
    "The Clinic is waiting.",
    "You skipped leg day. We noticed.",
    "Your CNS is cooked. Let's fix that.",
    "Stop decorating the gym.",
    "The Savage Protocol doesn't care about your mood.",
    "We built this for real lifters. Are you one?",
    "Your rest day is over. Get in.",
    "You vs. you. Who's winning?",
    "The Armoury is loaded. Are you?",
    "Log your set or log off.",
    "Progress report: it's not good.",
    "Fahhhhh. That's it. That's the email.",
    "You opened this. Now open the app.",
    "Another day, another excuse? Not here.",
    "The Clinic doesn't do warm-up sets.",
    "Your competitors trained today. Did you?",
    "This email is shorter than your rest period.",
    "No fluff. No excuses. Just gains.",
    "Your future self sent us.",
]


# ── Grok email body generator ─────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Mr. Workout — a sarcastic, brutally honest fitness AI coach.
Your voice is: direct, funny, slightly roasting, zero fluff, zero corporate speak.
You write savage short emails to real athletes who use the Mr. Workout app.
Never use emojis. Never use bullet points. Write in short punchy paragraphs.
Always mention 'the Clinic', 'Savage Protocol', or 'MR. WORKOUT' naturally once.
End every email with a single call-to-action line."""

def _grok_email_body(subject: str) -> str:
    if not GROK_API_KEY:
        return _fallback_body(subject)
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "grok-3-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": (
                        f"Write a savage daily email to our athletes. "
                        f"Today's subject line is: '{subject}'. "
                        f"Body should be 3–4 short paragraphs. Max 120 words. "
                        f"End with: 'Open the app. Train. #Fahhhhh' or similar CTA."
                    )},
                ],
                "max_tokens": 200,
                "temperature": 0.92,
            },
            timeout=25,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        log(f"  ⚠  Grok failed: {e}")
        return _fallback_body(subject)


def _fallback_body(subject: str) -> str:
    return (
        f"You opened this email. Good. That's the first rep done.\n\n"
        f"The Clinic is open. The Savage Protocol is loaded. "
        f"Your excuses are not on the menu today.\n\n"
        f"MR. WORKOUT doesn't care what mood you're in. "
        f"It cares about your next set.\n\n"
        f"Open the app. Train. #Fahhhhh"
    )


# ── HTML wrapper ──────────────────────────────────────────────────────────────

def _build_html(body_text: str, subject: str) -> str:
    paragraphs = "".join(
        f'<p style="margin:0 0 16px 0;line-height:1.6;">{p.strip()}</p>'
        for p in body_text.strip().split("\n\n") if p.strip()
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo bar -->
        <tr><td style="padding:0 0 28px 0;border-bottom:1px solid #222;">
          <span style="color:#FFD700;font-size:22px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">
            MR. WORKOUT
          </span>
          <span style="color:#444;font-size:11px;margin-left:12px;letter-spacing:0.2em;text-transform:uppercase;">
            Savage Protocol v.1
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 0 24px 0;font-size:15px;">
          {paragraphs}
        </td></tr>

        <!-- CTA button -->
        <tr><td style="padding:8px 0 40px 0;">
          <a href="https://mrworkout.pro" style="display:inline-block;background:#FFD700;color:#000;font-weight:900;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Enter the Clinic
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #1a1a1a;padding:24px 0 0 0;font-size:11px;color:#444;line-height:1.8;">
          You're getting this because you signed up at mrworkout.pro.<br>
          <a href="https://mrworkout.pro/unsubscribe?email={{{{email}}}}" style="color:#666;text-decoration:underline;">Unsubscribe</a>
          &nbsp;·&nbsp; mrworkout.pro
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Supabase user fetch ───────────────────────────────────────────────────────

def _fetch_emails() -> list[str]:
    """Pull all emails from the Supabase 'waitlist' table."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log("  ⚠  Supabase env missing — no recipients")
        return []
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/waitlist",
            headers={
                "apikey":        SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            },
            params={"select": "email", "limit": "10000"},
            timeout=15,
        )
        resp.raise_for_status()
        rows = resp.json()
        emails = [r["email"] for r in rows if r.get("email")]
        log(f"  ✓ Fetched {len(emails)} recipients from Supabase")
        return emails
    except Exception as e:
        log(f"  ✗ Supabase fetch failed: {e}")
        return []


# ── Resend sender ─────────────────────────────────────────────────────────────

def _send_batch(emails: list[str], subject: str, html: str, text: str) -> dict:
    """
    Resend supports batch sends up to 100 recipients per call.
    We chunk and send, collecting results.
    """
    if not RESEND_API_KEY:
        log("  ✗ RESEND_API_KEY not set")
        return {"sent": 0, "failed": len(emails)}

    sent = 0
    failed = 0
    chunk_size = 100

    for i in range(0, len(emails), chunk_size):
        chunk = emails[i : i + chunk_size]
        payload = {
            "from":     FROM_EMAIL,
            "to":       chunk,
            "reply_to": REPLY_TO,
            "subject":  subject,
            "html":     html,
            "text":     text,
        }
        try:
            resp = requests.post(
                "https://api.resend.com/emails/batch",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=[payload],  # batch endpoint takes array
                timeout=30,
            )
            if resp.status_code in (200, 201):
                sent += len(chunk)
                log(f"    ✓ Chunk {i//chunk_size + 1}: {len(chunk)} sent")
            else:
                failed += len(chunk)
                log(f"    ✗ Chunk {i//chunk_size + 1}: {resp.status_code} — {resp.text[:120]}")
        except Exception as e:
            failed += len(chunk)
            log(f"    ✗ Chunk {i//chunk_size + 1} exception: {e}")

    return {"sent": sent, "failed": failed}


# ── Log ───────────────────────────────────────────────────────────────────────

def _write_log(entry: dict) -> None:
    history: list = []
    if LOG_FILE.exists():
        try:
            history = json.loads(LOG_FILE.read_text())
        except Exception:
            pass
    history.append(entry)
    history = history[-90:]  # keep 90 days
    LOG_FILE.write_text(json.dumps(history, indent=2))


# ── Main ──────────────────────────────────────────────────────────────────────

def main(preview: bool = False) -> None:
    now = datetime.now(timezone.utc)
    log()
    log("=" * 68)
    log(f"  DAILY EMAIL BLAST — {now.strftime('%Y-%m-%d %H:%M UTC')}")
    log("=" * 68)

    subject   = random.choice(SUBJECT_LINES)
    log(f"  Subject   : {subject}")

    body_text = _grok_email_body(subject)
    log(f"  Body preview:\n    {body_text[:120].replace(chr(10), ' ')}…")

    html = _build_html(body_text, subject)

    if preview:
        log()
        log("── PREVIEW MODE — no emails sent ─────────────────────────────")
        log(f"Subject : {subject}")
        log()
        log(body_text)
        log()
        return

    emails = _fetch_emails()
    if not emails:
        log("  ✗ No recipients — aborting")
        return

    log(f"  Sending to {len(emails)} recipients…")
    result = _send_batch(emails, subject, html, body_text)

    entry = {
        "date":    now.strftime("%Y-%m-%d"),
        "subject": subject,
        "sent":    result["sent"],
        "failed":  result["failed"],
        "total":   len(emails),
    }
    _write_log(entry)

    log()
    log(f"  ✓ DONE — {result['sent']} sent / {result['failed']} failed")
    log("=" * 68)


if __name__ == "__main__":
    preview = "--preview" in sys.argv
    try:
        main(preview=preview)
    except Exception:
        log("✗ FATAL:")
        traceback.print_exc()
        sys.exit(1)
