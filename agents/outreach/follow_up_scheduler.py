#!/usr/bin/env python3
"""
follow_up_scheduler.py — 24h nudge sender for High Interest leads.

Run via cron every 30 min:
  */30 * * * * cd /path/to/repo && python3 agents/outreach/follow_up_scheduler.py >> agents/outreach/followup.log 2>&1
"""
import os, sys, pathlib, random, requests
from datetime import datetime, timezone, date

BOUNCE_RATE_LIMIT = 5.0

# ── Env ───────────────────────────────────────────────────────────────────────
ENV_FILE = pathlib.Path(__file__).parents[2] / ".env.local"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

BREVO_KEY = os.environ.get("BREVO_API_KEY", "")
SB_URL    = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SB_KEY    = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "") or \
            os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
OWNER_BCC = "nangobiaisha148@gmail.com"

LINK = {
    "coach":   "https://mrworkout.pro",
    "creator": "https://mrworkout.pro/partners",
    "recruit": "https://mrworkout.pro/roast",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_bounce_rate():
    today = date.today().isoformat()
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
    print(f"\n{'!'*60}\n  EMERGENCY: {msg}\n{'!'*60}")
    try:
        requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json={
                "sender": {"name": "clinic alert", "email": "hello@mrworkout.pro"},
                "to":     [{"email": OWNER_BCC}],
                "subject": "campaign kill switch triggered",
                "textContent": f"emergency stop:\n\n{msg}\n\ncheck brevo dashboard immediately.",
            },
            headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
            timeout=10,
        )
    except Exception:
        pass

def sb_headers(prefer=""):
    h = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
         "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    return h

def nudge_text(name, lead_type):
    link  = LINK.get(lead_type, "https://mrworkout.pro")
    token = str(random.randint(10000, 99999))
    return (
        f"hey {name},\n\n"
        f"noticed you checked the clinic. "
        f"did the ai roast you yet?\n\n"
        f"the beta slots for coaches are closing tomorrow.\n\n"
        f"{link}\n\n"
        f"coach\n\n{token}"
    )

def brevo_send(to_email, name, lead_type):
    payload = {
        "sender":      {"name": "coach", "email": "hello@mrworkout.pro"},
        "to":          [{"email": to_email}],
        "bcc":         [{"email": OWNER_BCC}],
        "subject":     "forgot this",
        "textContent": nudge_text(name, lead_type),
    }
    r = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        json=payload,
        headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
        timeout=20,
    )
    return r.status_code == 201

def mark_sent(email):
    requests.patch(
        f"{SB_URL}/rest/v1/outbound_leads",
        json={"follow_up_sent": True, "status": "followup_sent"},
        params={"email": f"eq.{email}"},
        headers=sb_headers("return=minimal"),
        timeout=8,
    )

def log_comm(email, lead_type):
    requests.post(
        f"{SB_URL}/rest/v1/communication_logs",
        json={
            "handle":       email,
            "platform":     "email",
            "message_text": f"[24h nudge] 'forgot this' — subject sent",
            "lead_type":    lead_type,
            "status":       "sent",
        },
        headers=sb_headers("return=minimal"),
        timeout=8,
    )

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    now = datetime.now(timezone.utc).isoformat()
    print(f"\n[{now[:19]}] follow_up_scheduler — scanning …")

    bounce_rate = get_bounce_rate()
    print(f"  bounce rate: {bounce_rate:.2f}%")
    if bounce_rate >= BOUNCE_RATE_LIMIT:
        emergency_alert(
            f"bounce rate {bounce_rate:.2f}% >= {BOUNCE_RATE_LIMIT}% — follow-up run aborted."
        )
        sys.exit(1)

    r = requests.get(
        f"{SB_URL}/rest/v1/outbound_leads",
        params={
            "select":          "email,first_name,lead_type",
            "interest_level":  "eq.high",
            "follow_up_sent":  "eq.false",
            "follow_up_at":    f"lte.{now}",
        },
        headers=sb_headers(),
        timeout=10,
    )
    if not r.ok:
        print(f"  Supabase error: {r.status_code} {r.text[:200]}")
        return

    leads = r.json()
    if not leads:
        print("  No follow-ups due.")
        return

    print(f"  {len(leads)} lead(s) due for nudge.")
    sent = failed = 0

    for lead in leads:
        email     = lead["email"]
        name      = (lead.get("first_name") or email.split("@")[0]).lower()
        lead_type = lead.get("lead_type") or "recruit"

        ok = brevo_send(email, name, lead_type)
        if ok:
            mark_sent(email)
            log_comm(email, lead_type)
            print(f"  ✓  {email}")
            sent += 1
        else:
            print(f"  ✗  {email} — brevo rejected")
            failed += 1

    print(f"  Done. sent={sent} failed={failed}")

if __name__ == "__main__":
    main()
