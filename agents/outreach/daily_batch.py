#!/usr/bin/env python3
"""
daily_batch.py — automated daily outreach engine.
Called by GitHub Actions 3× per day (9 AM / 12 PM / 3 PM UTC).
Each run sends up to 25 emails at 300 s intervals.
Daily totals across all 3 runs: 50 coaches + 25 creators max (hard cap 150).

Safety guards:
  - Bounce rate >= 5% → emergency alert + sys.exit(1)
  - Daily hard cap 150 → abort if already hit
  - HTTP 429 from Brevo → emergency alert + sys.exit(1)
  - HTTP 5xx bounce codes → skip lead, continue batch
"""
import os, sys, pathlib, random, time, requests
from datetime import datetime, timezone, date

# ── Env ───────────────────────────────────────────────────────────────────────
ENV_FILE = pathlib.Path(__file__).parents[2] / ".env.local"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

BREVO_KEY   = os.environ["BREVO_API_KEY"]
SB_URL      = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SB_KEY      = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
OWNER_EMAIL = "nangobiaisha148@gmail.com"
OWNER_BCC   = "nangobiaisha148@gmail.com"

# ── Config ────────────────────────────────────────────────────────────────────
DAILY_CAP_COACHES  = 50
DAILY_CAP_CREATORS = 25
DAILY_HARD_CAP     = 150    # absolute ceiling across all lead types
BOUNCE_RATE_LIMIT  = 5.0    # percent — triggers kill switch
DRIP_DELAY_S       = 300    # 5 min between sends
BATCH_SIZE         = 25     # emails per single GitHub Actions run

LINK = {
    "coach":   "https://mrworkout.pro",
    "creator": "https://mrworkout.pro/partners",
    "recruit": "https://mrworkout.pro/roast",
}

# ── Supabase helpers ──────────────────────────────────────────────────────────
def sb_h(prefer=""):
    h = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
         "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    return h

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_prefix():
    return date.today().isoformat()   # "YYYY-MM-DD"

def count_sent_today(lead_type=None):
    params = {
        "select":          "id",
        "status":          "eq.sent",
        "last_sent_date":  f"gte.{today_prefix()}T00:00:00Z",
    }
    if lead_type:
        params["lead_type"] = f"eq.{lead_type}"
    r = requests.get(f"{SB_URL}/rest/v1/outbound_leads", params=params,
                     headers={**sb_h(), "Prefer": "count=exact"}, timeout=10)
    return int(r.headers.get("content-range", "0/0").split("/")[-1]) if r.ok else 0

def pull_pending(lead_type, limit):
    if limit <= 0:
        return []
    r = requests.get(
        f"{SB_URL}/rest/v1/outbound_leads",
        params={"select": "id,email,first_name,lead_type",
                "status":    "eq.pending",
                "lead_type": f"eq.{lead_type}",
                "order":     "created_at.asc",
                "limit":     str(limit)},
        headers=sb_h(), timeout=10,
    )
    return r.json() if r.ok else []

def mark_sent(lead_id):
    requests.patch(
        f"{SB_URL}/rest/v1/outbound_leads",
        json={"status": "sent", "last_sent_date": now_iso()},
        params={"id": f"eq.{lead_id}"},
        headers=sb_h("return=minimal"), timeout=8,
    )

def log_comm(email, lead_type, preview):
    try:
        requests.post(
            f"{SB_URL}/rest/v1/communication_logs",
            json={"handle": email, "platform": "email",
                  "message_text": preview[:400], "lead_type": lead_type, "status": "sent"},
            headers=sb_h("return=minimal"), timeout=8,
        )
    except Exception:
        pass

# ── Brevo helpers ─────────────────────────────────────────────────────────────
def get_bounce_rate():
    today = today_prefix()
    r = requests.get(
        "https://api.brevo.com/v3/smtp/statistics/aggregatedReport",
        params={"startDate": today, "endDate": today},
        headers={"api-key": BREVO_KEY}, timeout=15,
    )
    if not r.ok:
        return 0.0
    d = r.json()
    total   = d.get("requests", 0)
    bounces = d.get("hardBounces", 0) + d.get("softBounces", 0)
    return (bounces / total * 100) if total > 0 else 0.0

def emergency_alert(msg):
    banner = "!" * 60
    print(f"\n{banner}\n  EMERGENCY: {msg}\n{banner}")
    try:
        requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json={
                "sender": {"name": "clinic alert", "email": "hello@mrworkout.pro"},
                "to":     [{"email": OWNER_EMAIL}],
                "subject": "campaign kill switch triggered",
                "textContent": f"emergency stop:\n\n{msg}\n\ncheck brevo dashboard immediately.\nmrworkout.pro",
            },
            headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
            timeout=10,
        )
    except Exception:
        pass

# ── Email templates ───────────────────────────────────────────────────────────
def make_email(name, lead_type):
    token = str(random.randint(10000, 99999))
    link  = LINK.get(lead_type, "https://mrworkout.pro")
    FONT  = "'Courier New','Courier',monospace"
    CYAN, MAG = "#00E5CC", "#e879f9"

    if lead_type == "coach":
        core_html = (
            "<p>i run a training system called the clinic. "
            "ai handles the programming so you spend time coaching, not building spreadsheets.</p>"
            "<p>coaches using it are reclaiming 8&#8211;10 hours a week. "
            "i put the logic here if you want to see how it works:</p>"
            f"<p><span style='color:{CYAN};'>{link}</span></p>"
        )
        core_text = (
            "i run a training system called the clinic. "
            "ai handles the programming so you spend time coaching, not building spreadsheets.\n\n"
            f"coaches using it are reclaiming 8-10 hours a week. "
            f"i put the logic here if you want to see how it works:\n\n{link}"
        )
    elif lead_type == "creator":
        core_html = (
            "<p>i built an ai training clinic called mr. workout. "
            "it's for people who take training seriously.</p>"
            "<p>i've reserved one founding partner slot for you. "
            "lifetime access + 50% of every sub through your link. no posting requirements.</p>"
            f"<p>you can see the split dashboard here:</p>"
            f"<p><span style='color:{MAG};'>{link}</span></p>"
        )
        core_text = (
            "i built an ai training clinic called mr. workout. "
            "it's for people who take training seriously.\n\n"
            "i've reserved one founding partner slot for you. "
            f"lifetime access + 50% of every sub through your link. no posting requirements.\n\n"
            f"you can see the split dashboard here:\n\n{link}"
        )
    else:
        core_html = (
            "<p>i built an ai training system called the clinic.</p>"
            f"<p>your form is a 5/10. i'm not joking. "
            f"let the ai fix it here:</p>"
            f"<p><span style='color:{MAG};'>{link}</span></p>"
        )
        core_text = (
            "i built an ai training system called the clinic.\n\n"
            f"your form is a 5/10. i'm not joking. "
            f"let the ai fix it here:\n\n{link}"
        )

    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060606;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060606;">
<tr><td align="center" style="padding:36px 16px;">
<table width="520" cellpadding="0" cellspacing="0"
       style="background:#060606;max-width:520px;width:100%;">
<tr><td style="font-family:{FONT};font-size:14px;line-height:2;color:#cccccc;padding:0;">
<p style="margin:0 0 16px;">hey {name},</p>
{core_html}
<p style="margin:24px 0 0;color:#333;">coach</p>
<p style="margin:6px 0 0;color:#111;font-size:11px;">{token}</p>
</td></tr></table>
</td></tr></table></body></html>"""

    return {
        "subject": f"quick question for {name}",
        "html":    html,
        "text":    f"hey {name},\n\n{core_text}\n\ncoach\n\n{token}",
        "preview": core_text[:120],
    }

def brevo_send(to, tmpl):
    r = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        json={
            "sender":      {"name": "coach", "email": "hello@mrworkout.pro"},
            "to":          [{"email": to}],
            "bcc":         [{"email": OWNER_BCC}],
            "subject":     tmpl["subject"],
            "textContent": tmpl["text"],
            "htmlContent": tmpl["html"],
        },
        headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
        timeout=20,
    )
    if r.status_code == 429:
        emergency_alert(f"brevo rate limit hit — run aborted")
        sys.exit(1)
    if r.status_code in (550, 551, 552, 553, 554):
        return False   # hard bounce — skip, don't stop
    return r.status_code == 201

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ts = now_iso()[:19]
    print(f"\n{'='*60}")
    print(f"  daily_batch  {ts}")
    print(f"{'='*60}\n")

    # ── Hard cap check ────────────────────────────────────────────────────────
    total_today = count_sent_today()
    if total_today >= DAILY_HARD_CAP:
        print(f"  daily hard cap reached ({total_today}/{DAILY_HARD_CAP}). done.")
        sys.exit(0)
    remaining = DAILY_HARD_CAP - total_today
    print(f"  sent today: {total_today}  |  remaining cap: {remaining}")

    # ── Bounce rate check ─────────────────────────────────────────────────────
    bounce_rate = get_bounce_rate()
    print(f"  bounce rate: {bounce_rate:.2f}%  (limit {BOUNCE_RATE_LIMIT}%)")
    if bounce_rate >= BOUNCE_RATE_LIMIT:
        emergency_alert(
            f"bounce rate {bounce_rate:.2f}% exceeds {BOUNCE_RATE_LIMIT}% threshold. "
            f"campaign paused automatically."
        )
        sys.exit(1)

    # ── Build queue ───────────────────────────────────────────────────────────
    coaches_sent  = count_sent_today("coach")
    creators_sent = count_sent_today("creator")

    coach_quota   = max(0, min(DAILY_CAP_COACHES  - coaches_sent,  remaining,     BATCH_SIZE))
    creator_quota = max(0, min(DAILY_CAP_CREATORS - creators_sent, remaining - coach_quota, BATCH_SIZE))

    coaches  = pull_pending("coach",   coach_quota)
    creators = pull_pending("creator", creator_quota)

    # interleave so BCC feed looks natural
    queue, ci, cj = [], 0, 0
    while ci < len(coaches) or cj < len(creators):
        if ci < len(coaches):   queue.append(coaches[ci]);   ci += 1
        if cj < len(creators):  queue.append(creators[cj]);  cj += 1

    print(f"  queue: {len(coaches)} coaches + {len(creators)} creators = {len(queue)} emails\n")

    if not queue:
        print("  nothing to send — caps met or leads exhausted.")
        sys.exit(0)

    sent = failed = 0

    for i, lead in enumerate(queue):
        email     = lead["email"]
        name      = (lead.get("first_name") or email.split("@")[0]).lower()
        lead_type = lead.get("lead_type", "recruit")
        lead_id   = lead["id"]

        # re-check bounce rate every 10 sends
        if i > 0 and i % 10 == 0:
            br = get_bounce_rate()
            if br >= BOUNCE_RATE_LIMIT:
                emergency_alert(
                    f"bounce rate hit {br:.2f}% mid-batch after {sent} sends. stopping."
                )
                sys.exit(1)

        tmpl = make_email(name, lead_type)
        ok   = brevo_send(email, tmpl)

        if ok:
            mark_sent(lead_id)
            log_comm(email, lead_type, tmpl["preview"])
            sent += 1
            print(f"  [{sent:03d}] ✓ {lead_type:<8}  {email}")
        else:
            failed += 1
            print(f"  [---] ✗ bounce      {email}")

        if i < len(queue) - 1:
            print(f"         ↳ sleeping {DRIP_DELAY_S}s …")
            time.sleep(DRIP_DELAY_S)

    print(f"\n  run complete — sent={sent}  failed={failed}")
    print(f"  total sent today: {count_sent_today()}/{DAILY_HARD_CAP}")

if __name__ == "__main__":
    main()
