#!/usr/bin/env python3
"""
SAVAGE MAILER — Vercel Database Drip Pipeline
==============================================
Pulls new signups directly from the Supabase 'waitlist' table,
sends a 2-email science-backed sequence via Resend API.

Sequence:
  Email 1 (Day 0) — Savage Strength Template (immediate on signup)
  Email 2 (Day 3) — Still plateauing? [Blog Link]

State is tracked locally in mailer_state.json so re-runs are always safe.

Usage:
    source ../savage_creator/set_env.sh
    python3 mailer.py
    python3 mailer.py --dry-run    # print emails, don't send
    python3 mailer.py --force      # ignore state, re-send everything

Required env vars:
    RESEND_API_KEY        from resend.com
    SUPABASE_URL          from Supabase → Project Settings → API
    SUPABASE_ANON_KEY     from Supabase → Project Settings → API
    FROM_EMAIL            verified Resend sender (coach@mrworkout.pro)
    VERCEL_DOMAIN         https://mrworkout.pro
"""
from __future__ import annotations

import os, json, time, argparse
from datetime import date, timedelta
from pathlib import Path

import requests

# ── Config ────────────────────────────────────────────────────────────────────

ROOT          = Path(__file__).parent.parent
STATE_FILE    = ROOT / "twitter_leads" / "mailer_state.json"
RESEND_KEY    = os.environ.get("RESEND_API_KEY", "")
SUPABASE_URL  = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY  = os.environ.get("SUPABASE_ANON_KEY", "")
FROM_EMAIL    = os.environ.get("FROM_EMAIL", "coach@mrworkout.pro")
FROM_NAME     = "MR. WORKOUT"
VERCEL_DOMAIN = os.environ.get("VERCEL_DOMAIN", "https://mrworkout.pro").rstrip("/")
APP_LINK      = "https://apps.apple.com/app/mr-workout"

PLATEAU_BLOG  = (
    "bro-really-thought-it-was-genetics-but-it-was-just-6-months-of-the-mr-workout-bl"
)
RPE_BLOG      = "pov-you-finally-stopped-guessing-your-rpe-and-let-mr-workout-take-the-wheel"

# ── Email templates ───────────────────────────────────────────────────────────

def _email_day0(name: str) -> tuple[str, str]:
    """Day 0 — Savage Strength Template."""
    first = name.split()[0] if name else "Athlete"
    subject = "Your Savage Strength Template is here."
    html = f"""
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;
                   background:#fff;color:#111;padding:24px;">

<h2 style="color:#FFD700;font-size:1.5rem;margin-bottom:4px;">
  Welcome, {first}. Here's your template.
</h2>
<p style="color:#555;font-size:0.9rem;margin-top:0;">
  Science-backed. Zero fluff. Built on progressive overload.
</p>

<hr style="border:none;border-top:2px solid #FFD700;margin:1.5rem 0;">

<h3 style="margin-bottom:8px;">📋 The Savage 4-Day Strength Split</h3>
<p>This is the exact frequency framework MR. WORKOUT uses to build progressive
overload into every session — 2× per muscle group weekly, 48-72 hr recovery windows.</p>

<table width="100%" cellpadding="10" cellspacing="0"
       style="border-collapse:collapse;font-size:0.92rem;">
  <thead>
    <tr style="background:#FFD700;color:#000;">
      <th align="left">Day</th><th align="left">Focus</th><th align="left">Key lifts</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#f9f9f9;">
      <td><strong>Mon</strong></td>
      <td>Push (Chest / Shoulders / Triceps)</td>
      <td>Bench · OHP · Dips</td>
    </tr>
    <tr>
      <td><strong>Tue</strong></td>
      <td>Pull (Back / Biceps)</td>
      <td>Deadlift · Row · Curl</td>
    </tr>
    <tr style="background:#f9f9f9;">
      <td><strong>Thu</strong></td>
      <td>Legs (Quad / Hamstring / Glute)</td>
      <td>Squat · RDL · Leg Press</td>
    </tr>
    <tr>
      <td><strong>Fri</strong></td>
      <td>Full Body Strength</td>
      <td>Power Clean · Pull-up · OHP</td>
    </tr>
    <tr style="background:#f9f9f9;">
      <td><strong>Wed/Sat/Sun</strong></td>
      <td>Active Recovery / Rest</td>
      <td>Walk · Stretch · Sleep</td>
    </tr>
  </tbody>
</table>

<h3 style="margin-top:1.5rem;">The Progressive Overload Rule</h3>
<p>Add <strong>2.5 kg</strong> to any lift the moment you hit the top of your rep range
with clean form. That's it. That's the science.</p>
<ul>
  <li>Sets: <strong>3–4 working sets</strong> per exercise</li>
  <li>Reps: <strong>5–8</strong> for strength · <strong>8–12</strong> for hypertrophy</li>
  <li>RPE target: <strong>7–8</strong> (leave 2 reps in reserve)</li>
  <li>Rest: <strong>2–3 min</strong> between compound sets</li>
</ul>

<h3>CNS Recovery — the rule most people ignore</h3>
<p>Back-to-back heavy sessions without 48 hrs recovery don't build muscle —
they break it down. MR. WORKOUT tracks your fatigue index and tells you exactly
when to push and when to recover.</p>

<p style="margin:2rem 0;text-align:center;">
  <a href="{APP_LINK}"
     style="background:#FFD700;color:#000;padding:0.9rem 2.5rem;border-radius:8px;
            font-weight:900;text-decoration:none;font-size:1rem;display:inline-block;">
    ↓ Track This Template in the App — Free
  </a>
</p>

<p style="color:#555;font-size:0.85rem;">
  In 3 days I'll send you the #1 reason people still plateau even when they
  follow a programme like this. Stay sharp.
</p>
<p style="color:#555;font-size:0.85rem;margin-top:2rem;">
  — MR. WORKOUT
</p>
</body></html>"""
    return subject, html


def _email_day3(name: str) -> tuple[str, str]:
    """Day 3 — Still plateauing? Blog link."""
    first   = name.split()[0] if name else "Athlete"
    blog_url = f"{VERCEL_DOMAIN}/blog/{PLATEAU_BLOG}"
    subject  = f"Still plateauing, {first}? Read this."
    html = f"""
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;
                   background:#fff;color:#111;padding:24px;">

<h2 style="color:#FFD700;font-size:1.4rem;">
  Still plateauing, {first}?
</h2>

<p>Most people blame genetics. Wrong answer.</p>

<p>After 6 months on MR. WORKOUT, the pattern is clear: plateaus are almost
never a genetics problem. They're a <strong>training stimulus problem</strong> —
specifically, failing to apply progressive overload with enough consistency
and recovery.</p>

<p>I broke the whole thing down here:</p>

<p style="margin:2rem 0;">
  <a href="{blog_url}"
     style="background:#FFD700;color:#000;padding:0.85rem 2rem;border-radius:8px;
            font-weight:800;text-decoration:none;font-size:0.95rem;display:inline-block;">
    Still plateauing? Read this: the real fix →
  </a>
</p>

<p>The short version:</p>
<ol>
  <li>Your CNS needs 48–72 hrs between sessions hitting the same motor patterns</li>
  <li>Progressive overload only compounds when recovery is complete</li>
  <li>Most "genetic ceilings" are just undertreated fatigue</li>
</ol>

<p>MR. WORKOUT tracks your fatigue index in real time and adjusts your load
automatically. No more guessing. No more plateaus.</p>

<p style="margin:2rem 0;text-align:center;">
  <a href="{APP_LINK}"
     style="border:2px solid #FFD700;color:#000;padding:0.85rem 2rem;border-radius:8px;
            font-weight:800;text-decoration:none;font-size:0.95rem;display:inline-block;">
    ↓ Break the Plateau — Download Free
  </a>
</p>

<p style="color:#555;font-size:0.85rem;margin-top:3rem;">
  — MR. WORKOUT<br>
  Train smart. Recover harder.
</p>
</body></html>"""
    return subject, html

# ── Supabase fetch ────────────────────────────────────────────────────────────

def fetch_leads() -> list[dict]:
    """Pull all waitlist rows from Supabase via REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  ✗  SUPABASE_URL / SUPABASE_ANON_KEY not set")
        return []
    if "PASTE_" in SUPABASE_URL or "PASTE_" in SUPABASE_KEY:
        print("  ✗  Supabase credentials not filled in set_env.sh")
        return []
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/waitlist",
            headers={
                "apikey":        SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            params={"select": "email,name,created_at", "order": "created_at.asc"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  ✗  Supabase fetch failed: {e}")
        return []

# ── State (tracks which email step each address has reached) ──────────────────

def load_state() -> dict:
    """{ email: { step: int, last_sent: "YYYY-MM-DD" } }"""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {}

def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))

# ── Resend sender ─────────────────────────────────────────────────────────────

def send_email(to_email: str, to_name: str, subject: str, html: str,
               dry_run: bool) -> bool:
    if dry_run:
        print(f"    [DRY RUN] → {to_email}  |  {subject[:60]}")
        return True
    if not RESEND_KEY:
        print("    ✗  RESEND_API_KEY not set")
        return False
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}",
                     "Content-Type":  "application/json"},
            json={"from":    f"{FROM_NAME} <{FROM_EMAIL}>",
                  "to":      [f"{to_name} <{to_email}>" if to_name else to_email],
                  "subject": subject,
                  "html":    html},
            timeout=20,
        )
        resp.raise_for_status()
        return True
    except Exception as e:
        print(f"    ✗  Send failed: {e}")
        return False

# ── Sequence logic ────────────────────────────────────────────────────────────

SEQUENCE = [
    (0, _email_day0),   # Day 0 — Savage Strength Template
    (3, _email_day3),   # Day 3 — Still plateauing?
]

def should_send(email: str, signup_date: date, state: dict,
                today: date, force: bool) -> int | None:
    """Return sequence index to send, or None."""
    entry = state.get(email, {"step": 0, "last_sent": ""})
    step  = entry.get("step", 0)

    if step >= len(SEQUENCE):
        return None   # all done

    day_offset, _ = SEQUENCE[step]
    due = signup_date + timedelta(days=day_offset)

    if today < due:
        return None   # not yet due

    if entry.get("last_sent") and not force:
        try:
            if date.fromisoformat(entry["last_sent"]) >= due:
                return None  # already sent this step
        except ValueError:
            pass

    return step

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Savage Mailer — Supabase drip pipeline")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force",   action="store_true",
                        help="Ignore state, re-send everything")
    args = parser.parse_args()

    today = date.today()
    leads = fetch_leads()
    state = load_state()

    print(f"\n{'='*60}")
    print(f"  SAVAGE MAILER  —  {today}")
    print(f"  Leads from Supabase : {len(leads)}")
    print(f"  Mode : {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"  FROM : {FROM_NAME} <{FROM_EMAIL}>")
    print(f"{'='*60}\n")

    sent = skipped = errors = 0

    for lead in leads:
        email = (lead.get("email") or "").strip().lower()
        name  = (lead.get("name")  or "").strip()
        created_raw = (lead.get("created_at") or "").strip()

        if not email:
            continue

        try:
            signup_date = date.fromisoformat(created_raw[:10])
        except (ValueError, TypeError):
            signup_date = today

        idx = should_send(email, signup_date, state, today, args.force)
        if idx is None:
            skipped += 1
            continue

        _, email_fn = SEQUENCE[idx]
        subject, html = email_fn(name)

        print(f"  [{email}]  Step {idx+1}/{len(SEQUENCE)} — {subject[:52]}")
        ok = send_email(email, name, subject, html, args.dry_run)

        if ok:
            state[email] = {
                "step":      idx + 1,
                "last_sent": today.isoformat(),
            }
            sent += 1
            time.sleep(0.4)
        else:
            errors += 1

    save_state(state)

    print(f"\n  {'='*60}")
    print(f"  Sent: {sent}  |  Skipped: {skipped}  |  Errors: {errors}")
    print(f"  State saved → {STATE_FILE.name}")
    print(f"  {'='*60}\n")


if __name__ == "__main__":
    main()
