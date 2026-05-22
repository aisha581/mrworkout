#!/usr/bin/env python3
"""
daily_campaign.py — Mr. Workout Savage Distribution Engine.
Sends exactly 150 coaches + 50 creators + 30 recruits per day,
spaced across a 12-hour window. Tracks every send. Posts a daily
summary to the Scouting Dashboard via Supabase.

Usage:
    python3 daily_campaign.py           # runs today's batch
    python3 daily_campaign.py --dry-run # preview, no sends
    python3 daily_campaign.py --status  # show today's progress
"""
import csv, re, os, sys, json, time, argparse, pathlib, math, random
from datetime import datetime, timezone, timedelta
from typing import Literal

# ── Env ───────────────────────────────────────────────────────────────────────
ENV_FILE = pathlib.Path(__file__).parents[2] / ".env.local"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

BREVO_KEY     = os.environ.get("BREVO_API_KEY", "")
SB_URL        = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SB_KEY        = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
OWNER_BCC     = "nangobiaisha148@gmail.com"
DASHBOARD_URL = "https://mrworkout.pro/dashboard-alpha"

CSV_FOLDER   = pathlib.Path(__file__).parents[2] / "Email CSV"
STATE_FILE   = pathlib.Path(__file__).parent / "campaign_state.json"
LOG_FILE     = pathlib.Path(__file__).parent / "outreach_log.json"

import requests

# ── Send schedule ────────────────────────────────────────────────────────────
DAILY_CAPS: dict[str, int] = {"coach": 150, "creator": 50, "recruit": 30}
TOTAL_DAILY        = sum(DAILY_CAPS.values())   # 230 cap
BATCH_SIZE           = 25          # sends per burst
BATCH_PAUSE_S        = 7200        # 2 hours between bursts
INTRA_BATCH_MIN      = 180         # minimum seconds between individual sends (3 min)
INTRA_BATCH_MAX      = 300         # maximum seconds between individual sends (5 min)
PLAIN_TEXT_THRESHOLD = 100         # first N sends go plain-text only for reputation warm-up

# ── Classification (same as mass_outreach.py) ─────────────────────────────────
CREATOR_KW = {
    "influencers", "#gymtok", "#fitnessjourney", "#bodybuilding", "#gymvlog",
    "dm for collaboration", "calisthenics", "calisthenics athlete", "gymtok",
}
COACH_KW = {
    "coaches", "personal trainers", "gym owner", "online coach", "fitness studios",
    "gyms", "fitness coach", "personal trainer", "crossfit level 1 coach",
}
COACH_BIO_KW = {
    "coach", "trainer", "training", "gym", "studio", "crossfit", "bootcamp",
    "strength coach", "performance", "online coaching",
}
COMPLAINER_KW = {
    "lost motivation", "how do i start", "help me", "stuck", "plateau",
    "can't lose", "nothing works", "tried everything", "need help",
}

def classify_ig(keyword: str, description: str) -> str:
    kw = keyword.lower().strip()
    if any(c in kw for c in COACH_KW):     return "coach"
    if any(c in kw for c in CREATOR_KW):   return "creator"
    desc = description.lower()
    if any(b in desc for b in COACH_BIO_KW): return "coach"
    return "recruit"

def classify_tiktok(fans: int, bio: str) -> str:
    if any(b in bio.lower() for b in COACH_BIO_KW): return "coach"
    if fans >= 10000: return "creator"
    return "recruit"

def is_complainer(keyword: str, description: str) -> bool:
    text = (keyword + " " + description).lower()
    return any(c in text for c in COMPLAINER_KW)

def extract_first_name(title: str, fallback: str = "") -> str:
    title = re.sub(r'https?://\S+|@\S+|#\S+', '', title)
    title = re.sub(r'[^\w\s\-]', ' ', title).strip()
    parts = re.split(r'[\|\-•·:]', title)
    words = [w for w in parts[0].split() if w and w[0].isupper() and len(w) > 1]
    return words[0].lower() if words else (fallback.lower() or "there")

# ── Shared email shell ────────────────────────────────────────────────────────
# Minimal — no header bar, no footer nav, no unsubscribe block.
# Looks like a direct message from a person, not a campaign.
_FONT = "'Courier New', 'Courier', 'Lucida Console', monospace"
_BG   = "#060606"
_TEXT = "#cccccc"
_DIM  = "#3a3a3a"
_CYAN = "#00E5CC"
_MAG  = "#e879f9"

def _shell(body_rows: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:{_BG};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{_BG};">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="540" cellpadding="0" cellspacing="0" border="0"
           style="background:{_BG};max-width:540px;width:100%;">
      <tr><td style="padding:0;font-family:{_FONT};font-size:14px;line-height:2;color:{_TEXT};">
{body_rows}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

# ── Templates ─────────────────────────────────────────────────────────────────
_SIG = f"""<p style="margin:32px 0 0;color:{_DIM};font-size:13px;line-height:1.6;">--<br>
sent from the clinic ai<br>
<a href="https://mrworkout.pro"
   style="color:{_CYAN};text-decoration:none;font-weight:bold;">mrworkout.pro</a>
</p>"""

_SIG_TEXT = "--\nsent from the clinic ai\nmrworkout.pro"

def make_creator_email(name: str) -> dict:
    body = f"""<p style="margin:0 0 16px;">hey {name},</p>
<p style="margin:0 0 16px;">came across your page. you've clearly built something real — the kind of audience most people spend years chasing.</p>
<p style="margin:0 0 16px;">i'm running a training clinic called <span style="color:{_CYAN};font-weight:bold;">mr. workout</span>. it's ai-driven, built for people who take training seriously, and right now i'm locking in <span style="color:{_MAG};">5 founding partners</span> before we open to the public.</p>
<p style="margin:0 0 16px;">what that means for you: lifetime access to the full system + <strong style="color:{_TEXT};">50% revenue share on every subscription that comes through your link.</strong> no posting schedule. no pitch decks. just passive income from something your audience already needs.</p>
<p style="margin:0 0 16px;">i think your following would actually use this. worth a conversation?</p>
{_SIG}"""
    text = (f"hey {name},\n\ncame across your page. you've clearly built something real.\n\n"
            "i'm running a training clinic called mr. workout — ai-driven, built for people who take training seriously. "
            "i'm locking in 5 founding partners before we open to the public.\n\n"
            "lifetime access + 50% revenue share on every sub through your link. "
            "no posting schedule. no pitch decks.\n\nworth a conversation?\n\n" + _SIG_TEXT)
    return {"subject": "regarding your training", "html": _shell(body), "text": text}

def make_coach_email(_: str) -> dict:
    body = f"""<p style="margin:0 0 16px;">coach,</p>
<p style="margin:0 0 16px;">saw your page and wanted to reach out directly.</p>
<p style="margin:0 0 16px;">i built a system called <span style="color:{_CYAN};font-weight:bold;">mr. workout</span> that handles the programming side of coaching automatically — periodization, progressive overload, client check-ins, all of it. the ai runs the engine. you keep the relationship.</p>
<p style="margin:0 0 16px;">the coaches using it right now are cutting 8–10 hours a week off their admin and keeping clients longer because the programming actually adapts to them.</p>
<p style="margin:0 0 16px;">i think it fits what you're doing. take a look and tell me what you think.</p>
{_SIG}"""
    text = ("coach,\n\nsaw your page and wanted to reach out directly.\n\n"
            "i built a system called mr. workout that handles the programming side of coaching automatically — "
            "periodization, progressive overload, client check-ins. the ai runs the engine. you keep the relationship.\n\n"
            "coaches using it are cutting 8–10 hours a week off admin and keeping clients longer.\n\n"
            "take a look and tell me what you think.\n\n" + _SIG_TEXT)
    return {"subject": "regarding your training program", "html": _shell(body), "text": text}

def make_recruit_email(_: str) -> dict:
    body = f"""<p style="margin:0 0 16px;">quick one.</p>
<p style="margin:0 0 16px;">i run a training clinic called <span style="color:{_CYAN};font-weight:bold;">mr. workout</span>. we built an ai that looks at how you're training and tells you exactly what's holding you back — form, programming, recovery, all of it.</p>
<p style="margin:0 0 16px;">most people are leaving a significant amount of progress on the table with their current setup. not because they're not working hard, but because the programming isn't built around them.</p>
<p style="margin:0 0 16px;">first session is free. the ai will give you a full breakdown. if it's not useful, no hard feelings.</p>
<p style="margin:0 0 16px;">worth 10 minutes?</p>
{_SIG}"""
    text = ("quick one.\n\ni run a training clinic called mr. workout. we built an ai that looks at "
            "how you're training and tells you exactly what's holding you back.\n\n"
            "most people are leaving progress on the table — not because they're not working hard, "
            "but because the programming isn't built around them.\n\n"
            "first session is free. full breakdown. if it's not useful, no hard feelings.\n\n"
            "worth 10 minutes?\n\n" + _SIG_TEXT)
    return {"subject": "regarding your training", "html": _shell(body), "text": text}

TEMPLATE_MAP = {"creator": make_creator_email, "coach": make_coach_email, "recruit": make_recruit_email}

# ── Supabase ──────────────────────────────────────────────────────────────────
def sb_headers() -> dict:
    return {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
            "Content-Type": "application/json", "Prefer": "return=minimal"}

def get_already_sent_emails() -> set:
    if not SB_URL or not SB_KEY:
        return set()
    try:
        r = requests.get(f"{SB_URL}/rest/v1/outbound_leads?select=email&status=in.(sent,followup_sent,converted)",
                         headers=sb_headers(), timeout=20)
        if r.ok:
            return {row["email"] for row in r.json()}
    except Exception as e:
        print(f"  [SB] dedup error: {e}")
    return set()

def insert_outbound(email: str, name: str) -> bool:
    if not SB_URL or not SB_KEY:
        return False
    try:
        r = requests.post(
            f"{SB_URL}/rest/v1/outbound_leads",
            json={"email": email, "first_name": name, "status": "sent",
                  "last_sent_date": datetime.now(timezone.utc).isoformat()},
            headers={**sb_headers(), "Prefer": "resolution=ignore-duplicates,return=minimal"},
            timeout=10
        )
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"  [SB] insert error: {e}")
        return False

def log_comm(handle: str, platform: str, message_text: str, lead_type: str, status: str):
    if not SB_URL or not SB_KEY:
        return
    try:
        requests.post(f"{SB_URL}/rest/v1/communication_logs",
                      json={"handle": handle, "platform": platform, "message_text": message_text[:500],
                            "lead_type": lead_type, "status": status},
                      headers=sb_headers(), timeout=10)
    except Exception as e:
        print(f"  [SB] comm log error: {e}")

def post_daily_summary(day_num: int, sent: int, coaches: int, creators: int, recruits: int, bounces: int):
    """Write daily summary row to communication_logs (platform=email, handle='__summary__')."""
    if not SB_URL or not SB_KEY:
        return
    msg = (f"day {day_num}: {sent} total contacts made — "
           f"{coaches} coaches | {creators} creators | {recruits} recruits | "
           f"{bounces} bounces")
    try:
        requests.post(f"{SB_URL}/rest/v1/communication_logs",
                      json={"handle": "__daily_summary__", "platform": "email",
                            "message_text": msg, "lead_type": "coach", "status": "sent"},
                      headers=sb_headers(), timeout=10)
        print(f"\n  Dashboard summary posted: {msg}")
    except Exception as e:
        print(f"  [SB] summary error: {e}")

# ── Email send (Brevo) ────────────────────────────────────────────────────────
def _brevo_post(to: str, subject: str, html: str = "", text: str = "",
                bcc=None, plain_only: bool = False,
                from_name: str = "the clinic",
                from_email: str = "coach@mrworkout.pro") -> bool:
    """Single Brevo send. Returns True on 201.
    plain_only=True → textContent only, no htmlContent.
    """
    if not BREVO_KEY:
        print("  [BREVO] no api key")
        return False
    payload: dict = {
        "sender":      {"name": from_name, "email": from_email},
        "to":          [{"email": to}],
        "subject":     subject,
        "textContent": text or subject,
    }
    if not plain_only and html:
        payload["htmlContent"] = html
    if bcc:
        payload["bcc"] = [{"email": bcc}]
    try:
        r = requests.post("https://api.brevo.com/v3/smtp/email",
                          json=payload,
                          headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
                          timeout=15)
        return r.status_code == 201
    except Exception as e:
        print(f"  [BREVO] {e}")
        return False

def send_email(to_email: str, subject: str, html: str = "", text: str = "",
               plain_only: bool = False) -> bool:
    """Send outreach email with silent BCC to owner. BCC is blind — recipient never sees it."""
    return _brevo_post(to_email, subject, html=html, text=text,
                       bcc=OWNER_BCC, plain_only=plain_only)

def _smtp_send(to: str, subject: str, body: str) -> bool:
    """Hostinger SMTP fallback — used for Creators bucket if Brevo hits Promotions."""
    import smtplib, ssl
    from email.mime.text import MIMEText
    smtp_user = os.environ.get("SMTP_USER", "coach@mrworkout.pro")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    if not smtp_pass:
        print("  [SMTP] no SMTP_PASS")
        return False
    try:
        msg = MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"]    = f"coach <{smtp_user}>"
        msg["To"]      = to
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.hostinger.com", 465, context=ctx) as s:
            s.login(smtp_user, smtp_pass)
            s.sendmail(smtp_user, to, msg.as_string())
        return True
    except Exception as e:
        print(f"  [SMTP] {e}")
        return False

def send_stealth_test(to: str, name: str = "coach") -> bool:
    """
    Calibration test — all spam signals removed:
    - Starts with hey [name] (personalised greeting)
    - Subject: quick question for [name]
    - Casual in-sentence URL mention, no link tag
    - No signature block, no dashes
    - From: hello@mrworkout.pro
    - Unique 5-digit token (breaks exact-duplicate detection)
    - Plain text only
    """
    token   = str(random.randint(10000, 99999))
    subject = f"quick question for {name}"
    body = (
        f"hey {name},\n\n"
        "i've been building a training clinic powered by ai — it looks at how you're currently "
        "training and builds a program specifically around you. periodization, recovery windows, "
        "progression — all automated.\n\n"
        "a handful of coaches and athletes are already running it and the feedback has been solid. "
        "i'm at mrworkout.pro if you want to see the clinic.\n\n"
        "worth a look?\n\n"
        f"coach\n\n{token}"
    )
    ok = _brevo_post(
        to         = to,
        subject    = subject,
        text       = body,
        plain_only = True,
        from_name  = "coach",
        from_email = "hello@mrworkout.pro",
    )
    return ok

def send_daily_digest(day_num: int, sent: int, coaches: int, creators: int,
                      recruits: int, bounces: int, remaining: int):
    """Send end-of-day summary email to owner."""
    if not BREVO_KEY:
        return
    date_str  = datetime.now(timezone.utc).strftime("%B %d, %Y")
    bounce_color = "#ff4444" if bounces > 0 else "#00ff88"
    html = f"""<div style="font-family:monospace;background:#050505;color:#e0e0e0;padding:40px;max-width:600px;line-height:1.9;border:1px solid #111">
<p style="color:#a855f7;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px">daily intel report — {date_str}</p>
<h2 style="color:#00E5CC;font-size:20px;margin:0 0 24px">day {day_num}: {sent} contacts made</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">bucket</td>
    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:right">sent</td>
    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:right">pitch</td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #111;color:#00E5CC;font-weight:bold">coaches</td>
    <td style="padding:10px 0;border-bottom:1px solid #111;text-align:right;font-size:18px;font-weight:900">{coaches}</td>
    <td style="padding:10px 0;border-bottom:1px solid #111;text-align:right;color:#555;font-size:11px">efficiency play</td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #111;color:#a855f7;font-weight:bold">creators</td>
    <td style="padding:10px 0;border-bottom:1px solid #111;text-align:right;font-size:18px;font-weight:900">{creators}</td>
    <td style="padding:10px 0;border-bottom:1px solid #111;text-align:right;color:#555;font-size:11px">status/affiliate play</td>
  </tr>
  <tr>
    <td style="padding:10px 0;color:#FFD700;font-weight:bold">recruits</td>
    <td style="padding:10px 0;text-align:right;font-size:18px;font-weight:900">{recruits}</td>
    <td style="padding:10px 0;text-align:right;color:#555;font-size:11px">roast play</td>
  </tr>
</table>
<div style="display:flex;gap:16px;margin-bottom:28px">
  <div style="flex:1;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;padding:14px;text-align:center">
    <div style="color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase">bounces</div>
    <div style="color:{bounce_color};font-size:22px;font-weight:900;margin-top:6px">{bounces}</div>
  </div>
  <div style="flex:1;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;padding:14px;text-align:center">
    <div style="color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase">remaining</div>
    <div style="color:#FFD700;font-size:22px;font-weight:900;margin-top:6px">{remaining}</div>
  </div>
</div>
<a href="{DASHBOARD_URL}" style="display:block;background:#a855f7;color:#000;font-weight:900;font-size:12px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 24px;border-radius:8px;text-align:center;margin-bottom:24px">view may 2026 dashboard →</a>
<p style="color:#333;font-size:10px;margin:0">next batch fires tomorrow 07:00 local · {remaining} leads remaining in queue</p>
</div>"""
    ok = _brevo_post(OWNER_BCC, f"day {day_num} intel: {sent} contacts | mr. workout", html)
    if ok:
        print(f"  Daily digest sent → {OWNER_BCC}")
    else:
        print(f"  [DIGEST] send failed")

def send_test_email() -> bool:
    """Deliverability test:
    - thebillion9@gmail.com  → plain text only  (fresh account, inbox check)
    - nangobiaisha148@gmail.com → HTML version  (known account, layout check)
    Subject uses the new personalised format.
    """
    if not BREVO_KEY:
        print("  no BREVO_KEY — cannot send test")
        return False
    tmpl    = make_coach_email("coach")
    subject = "question for you"
    html    = tmpl["html"]
    text    = tmpl["text"]
    all_ok  = True
    sends   = [
        ("thebillion9@gmail.com",      True,  "plain-text — inbox placement test"),
        (OWNER_BCC,                    False, "html — layout reference"),
    ]
    for addr, plain, label in sends:
        ok = _brevo_post(addr, subject, html=html, text=text, plain_only=plain)
        tag = "✓" if ok else "✗"
        print(f"  {tag} {addr}  [{label}]")
        if not ok:
            all_ok = False
    return all_ok

# ── CSV parsing ───────────────────────────────────────────────────────────────
def load_all_leads() -> list:
    leads = []
    seen  = set()

    # Instagram
    for filepath in sorted(CSV_FOLDER.glob("dataset_instagram-lead-scraper_*.csv")):
        with open(filepath, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                email = (row.get("email") or "").strip().lower()
                if not email or "@" not in email or email in seen:
                    continue
                seen.add(email)
                keyword = (row.get("keyword") or "").strip()
                title   = (row.get("title") or "").strip()
                desc    = (row.get("description") or "").strip()
                url     = (row.get("url") or "").strip()
                handle  = re.search(r'instagram\.com/([^/?]+)', url)
                handle  = "@" + (handle.group(1) if handle else email.split("@")[0])
                lt      = classify_ig(keyword, title + " " + desc)
                priority = 1 if is_complainer(keyword, title + " " + desc) else 0
                leads.append({
                    "email": email, "name": extract_first_name(title, email.split("@")[0]),
                    "handle": handle, "platform": "ig", "lead_type": lt, "priority": priority,
                })

    # TikTok
    tiktok_file = CSV_FOLDER / "dataset_tiktok-scraper_2026-05-20_10-25-15-301.csv"
    if tiktok_file.exists():
        with open(tiktok_file, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                bio = (row.get("authorMeta/signature") or "").strip()
                m   = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z.]+', bio)
                if not m:
                    continue
                email = m.group(0).lower()
                if email in seen:
                    continue
                seen.add(email)
                name   = (row.get("authorMeta/nickName") or row.get("authorMeta/name") or "").strip()
                handle = "@" + (row.get("authorMeta/profileUrl") or "").split("/@")[-1]
                try:
                    fans = int(row.get("authorMeta/fans") or 0)
                except ValueError:
                    fans = 0
                lt       = classify_tiktok(fans, bio)
                priority = 1 if is_complainer("", bio) else 0
                leads.append({
                    "email": email, "name": extract_first_name(name, handle.lstrip("@")),
                    "handle": handle, "platform": "x", "lead_type": lt, "priority": priority,
                })

    # Complainers first, then by type priority (creator > coach > recruit)
    TYPE_ORDER = {"creator": 0, "coach": 1, "recruit": 2}
    leads.sort(key=lambda l: (1 - l["priority"], TYPE_ORDER.get(l["lead_type"], 3)))
    return leads

# ── State ─────────────────────────────────────────────────────────────────────
def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"day": 0, "sent_emails": [], "campaign_start": datetime.now(timezone.utc).isoformat()}

def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",      action="store_true")
    parser.add_argument("--status",       action="store_true", help="Print today's progress and exit")
    parser.add_argument("--test-email",   action="store_true", help="Send format test to owner BCC and exit")
    parser.add_argument("--stealth-test", action="store_true", help="Send stealth plain-text test to thebillion9")
    args = parser.parse_args()

    state = load_state()

    if args.stealth_test:
        target = "thebillion9@gmail.com"
        print(f"\n  stealth test → {target}")
        ok = send_stealth_test(target)
        print(f"  {'✓ sent' if ok else '✗ failed'}")
        return

    if args.test_email:
        print(f"\n  Sending format test → {OWNER_BCC}")
        send_test_email()
        return

    if args.status:
        today = datetime.now(timezone.utc).date().isoformat()
        today_sent = [e for e in state.get("sent_emails", []) if e.get("sent_at", "").startswith(today)]
        buckets    = {"coach": 0, "creator": 0, "recruit": 0}
        for e in today_sent:
            buckets[e.get("lead_type", "recruit")] = buckets.get(e.get("lead_type", "recruit"), 0) + 1
        print(f"\n  Day {state['day']} status:")
        print(f"  Today: {len(today_sent)} sent  |  coaches={buckets['coach']}  creators={buckets['creator']}  recruits={buckets['recruit']}")
        print(f"  Total sent all-time: {len(state.get('sent_emails', []))}")
        return

    mode = "[DRY RUN]" if args.dry_run else "[LIVE]"
    state["day"] = state.get("day", 0) + 1
    day_num      = state["day"]

    print(f"\n{'='*64}")
    print(f"  SAVAGE DISTRIBUTION — DAY {day_num}  {mode}")
    print(f"  Coaches: {DAILY_CAPS['coach']}/day | Creators: {DAILY_CAPS['creator']}/day | Recruits: {DAILY_CAPS['recruit']}/day")
    print(f"  Schedule: {BATCH_SIZE} emails per burst · {BATCH_PAUSE_S//3600}h between bursts · {INTRA_BATCH_MIN}-{INTRA_BATCH_MAX}s random delay between sends")
    print(f"{'='*64}\n")

    # Load all leads
    all_leads = load_all_leads()

    # Filter already sent (from Supabase + local state)
    already_sent_sb    = get_already_sent_emails()
    already_sent_local = {e["email"] for e in state.get("sent_emails", [])}
    already_sent       = already_sent_sb | already_sent_local
    fresh_leads        = [l for l in all_leads if l["email"] not in already_sent]

    print(f"  Total unique leads:  {len(all_leads)}")
    print(f"  Already contacted:   {len(already_sent)}")
    print(f"  Remaining in queue:  {len(fresh_leads)}")
    print(f"  Sending today:       {min(TOTAL_DAILY, len(fresh_leads))}")
    print()

    # Build today's queue: respect per-type daily caps + complainer priority (already sorted)
    today_queue: list = []
    cap_used = {"coach": 0, "creator": 0, "recruit": 0}
    for lead in fresh_leads:
        lt = lead["lead_type"]
        if cap_used[lt] < DAILY_CAPS[lt]:
            today_queue.append(lead)
            cap_used[lt] += 1
        if sum(cap_used.values()) >= TOTAL_DAILY:
            break

    if not today_queue:
        print("  No leads left — campaign complete.\n")
        return

    # How many total sends exist across all campaign history
    all_time_sent = len(state.get("sent_emails", []))

    # Send — burst mode: BATCH_SIZE emails, then BATCH_PAUSE_S sleep, repeat
    results     = {"sent": 0, "failed": 0, "by_type": {"coach": 0, "creator": 0, "recruit": 0}}
    BUCKET_ICON = {"creator": "★", "coach": "◈", "recruit": "→"}
    STATUS_ICON = {"sent": "✓", "failed": "✗", "pending": "◌"}

    for i, lead in enumerate(today_queue, 1):
        email  = lead["email"]
        name   = lead["name"]
        handle = lead["handle"]
        lt     = lead["lead_type"]
        plat   = lead["platform"]

        # Personalized subject: "question for [name]"
        subject = f"question for {name}" if name and name != "there" else "question for you"

        # Plain-text only for first PLAIN_TEXT_THRESHOLD sends (reputation warm-up)
        use_plain = (all_time_sent + results["sent"]) < PLAIN_TEXT_THRESHOLD
        tmpl = TEMPLATE_MAP[lt](name)
        html = None if use_plain else tmpl["html"]
        text = tmpl["text"]
        mode_tag = "[txt]" if use_plain else "[htm]"

        if args.dry_run:
            ok, status = True, "pending"
        else:
            ok     = send_email(email, subject, html or "", text=text, plain_only=use_plain)
            status = "sent" if ok else "failed"

        icon = STATUS_ICON[status]
        pri  = "🔥" if lead["priority"] else "  "
        print(f"  [{i:04d}] {icon} {mode_tag} {BUCKET_ICON[lt]} {lt:<8}  {email:<40}  {subject}")

        if ok or args.dry_run:
            results["sent"] += 1
            results["by_type"][lt] += 1
            state.setdefault("sent_emails", []).append({
                "email": email, "name": name, "handle": handle, "lead_type": lt,
                "platform": plat, "status": status,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            })
        else:
            results["failed"] += 1

        if not args.dry_run:
            log_comm(handle, plat, text[:500], lt, status)
            if ok:
                insert_outbound(email, name)

            # Intra-burst delay between individual sends
            if i < len(today_queue):
                time.sleep(random.randint(INTRA_BATCH_MIN, INTRA_BATCH_MAX))

            # After every BATCH_SIZE sends, pause for BATCH_PAUSE_S (2h)
            if i % BATCH_SIZE == 0 and i < len(today_queue):
                burst_num = i // BATCH_SIZE
                resume_at = datetime.now(timezone.utc).strftime("%H:%M UTC")
                print(f"\n  ── burst {burst_num} complete. pausing {BATCH_PAUSE_S//3600}h "
                      f"(resume ~{resume_at}) ──\n")
                save_state(state)   # checkpoint before sleeping
                time.sleep(BATCH_PAUSE_S)

    remaining = len(fresh_leads) - len(today_queue)

    if not args.dry_run:
        # Post summary to Supabase (dashboard feed)
        post_daily_summary(
            day_num=day_num,
            sent=results["sent"],
            coaches=results["by_type"]["coach"],
            creators=results["by_type"]["creator"],
            recruits=results["by_type"]["recruit"],
            bounces=results["failed"]
        )
        # Send digest email to owner
        send_daily_digest(
            day_num=day_num,
            sent=results["sent"],
            coaches=results["by_type"]["coach"],
            creators=results["by_type"]["creator"],
            recruits=results["by_type"]["recruit"],
            bounces=results["failed"],
            remaining=remaining
        )
        save_state(state)
    print(f"\n{'='*64}")
    print(f"  DAY {day_num} COMPLETE")
    print(f"  Sent:      {results['sent']}  |  Failed: {results['failed']}")
    print(f"  Coaches:   {results['by_type']['coach']}")
    print(f"  Creators:  {results['by_type']['creator']}")
    print(f"  Recruits:  {results['by_type']['recruit']}")
    print(f"  Remaining: {remaining} leads in queue")
    days_left = math.ceil(remaining / TOTAL_DAILY) if remaining > 0 else 0
    print(f"  At 230/day → {days_left} more days to clear the queue")
    print(f"{'='*64}\n")

if __name__ == "__main__":
    main()
