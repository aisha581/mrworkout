#!/usr/bin/env python3
"""
batch_day1.py — Day 1 campaign: 50 Coaches + 20 Creators.
Three-phase delivery:
  Phase 1 (sends  1-10): stealth plain text — no HTML, hello@, casual subject
  Phase 2 (sends 11-20): transition — minimal dark HTML, no neon accents yet
  Phase 3 (sends 21+  ): full dark neon template
Random delay 4-7 min between every send.
Hard stops on bounce / rate-limit. BCC on every email.
Logs every delivery to Supabase in real time.
"""
import csv, re, os, json, time, pathlib, random
from datetime import datetime, timezone

# ── Env ───────────────────────────────────────────────────────────────────────
ENV_FILE = pathlib.Path(__file__).parents[2] / ".env.local"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

import requests

BREVO_KEY  = os.environ.get("BREVO_API_KEY", "")
SB_URL     = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SB_KEY     = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SMTP_USER  = os.environ.get("SMTP_USER", "coach@mrworkout.pro")
SMTP_PASS  = os.environ.get("SMTP_PASS", "")
OWNER_BCC  = "nangobiaisha148@gmail.com"
CSV_FOLDER = pathlib.Path(__file__).parents[2] / "Email CSV"
STATE_FILE = pathlib.Path(__file__).parent / "campaign_state.json"
LOG_FILE   = pathlib.Path(__file__).parent / "day1_log.json"

# ── Day 1 caps ────────────────────────────────────────────────────────────────
TODAY_CAPS  = {"coach": 50, "creator": 20, "recruit": 0}
DELAY_MIN   = 240   # 4 min
DELAY_MAX   = 420   # 7 min
PHASE1_END  = 10    # stealth plain text
PHASE2_END  = 20    # transition: minimal dark HTML

# ── Classification (mirrors daily_campaign.py) ────────────────────────────────
CREATOR_KW   = {"influencers","#gymtok","#fitnessjourney","#bodybuilding","#gymvlog",
                "dm for collaboration","calisthenics","calisthenics athlete","gymtok"}
COACH_KW     = {"coaches","personal trainers","gym owner","online coach","fitness studios",
                "gyms","fitness coach","personal trainer","crossfit level 1 coach"}
COACH_BIO_KW = {"coach","trainer","training","gym","studio","crossfit","bootcamp",
                "strength coach","performance","online coaching"}

def classify_ig(keyword, description):
    kw = keyword.lower()
    if any(c in kw for c in COACH_KW):   return "coach"
    if any(c in kw for c in CREATOR_KW): return "creator"
    if any(b in description.lower() for b in COACH_BIO_KW): return "coach"
    return "recruit"

def classify_tiktok(fans, bio):
    if any(b in bio.lower() for b in COACH_BIO_KW): return "coach"
    return "creator" if fans >= 10000 else "recruit"

_GENERIC = {"new","personal","online","fitness","gym","the","coach","trainer",
            "certified","official","real","daily","top","best","pro","elite",
            "team","body","health","strong","fit","sport","active","life",
            "my","your","our","their","this","that","with","for","and","just"}

def extract_name(title, fallback=""):
    title = re.sub(r'https?://\S+|@\S+|#\S+', '', title)
    title = re.sub(r'[^\w\s\-]', ' ', title).strip()
    words = [w for w in re.split(r'[\|\-•·:]', title)[0].split()
             if w and w[0].isupper() and len(w) > 1 and w.lower() not in _GENERIC]
    if words:
        return words[0].lower()
    # fall back to email prefix, cleaned up
    parts = re.sub(r'[\d_.\-]', ' ', fallback).split() if fallback else []
    prefix = parts[0] if parts else ""
    return prefix.lower() if len(prefix) > 1 else "coach"

# ── Three email phases ────────────────────────────────────────────────────────
def phase1_body(name, lead_type):
    """Pure plain text. URL on its own line, no https:// prefix."""
    token = str(random.randint(10000, 99999))
    if lead_type == "coach":
        core = (
            f"i run a training system called the clinic — ai handles the programming "
            f"so coaches spend time coaching, not building spreadsheets.\n\n"
            f"coaches using it are reclaiming 8-10 hours a week. "
            f"i put the logic here if you want to see how it works:\n\n"
            f"mrworkout.pro"
        )
    elif lead_type == "creator":
        core = (
            f"i've been building something called the clinic — ai-driven training "
            f"built for people who are serious about it.\n\n"
            f"i've reserved one founding partner slot for you. "
            f"you can see the split dashboard here:\n\n"
            f"mrworkout.pro/partners"
        )
    else:
        core = (
            f"i've been building an ai training system called the clinic.\n\n"
            f"your form is a 5/10. i'm not joking. "
            f"let the ai fix it here:\n\n"
            f"mrworkout.pro/roast"
        )
    return {
        "subject": f"quick question for {name}",
        "text":    f"hey {name},\n\n{core}\n\ncoach\n\n{token}",
        "html":    None,
        "from_email": "hello@mrworkout.pro",
        "from_name":  "coach",
    }

def phase2_body(name, lead_type):
    """Minimal dark HTML — no neon, no accents yet. URL on its own line, no https://."""
    token = str(random.randint(10000, 99999))
    if lead_type == "coach":
        core_html = (
            "<p>i run a training system called the clinic. "
            "ai handles the programming so you spend time coaching, not building spreadsheets.</p>"
            "<p>coaches using it are reclaiming 8–10 hours a week. "
            "i put the logic here if you want to see how it works:</p>"
            "<p>https://mrworkout.pro</p>"
        )
        core_text = (
            "i run a training system called the clinic. "
            "ai handles the programming so you spend time coaching, not building spreadsheets.\n\n"
            "coaches using it are reclaiming 8-10 hours a week. "
            "i put the logic here if you want to see how it works:\n\n"
            "https://mrworkout.pro"
        )
    elif lead_type == "creator":
        core_html = (
            "<p>i've been building something called the clinic — "
            "ai-driven training built for people who take it seriously.</p>"
            "<p>i've reserved one founding partner slot for you. "
            "you can see the split dashboard here:</p>"
            "<p>https://mrworkout.pro/partners</p>"
        )
        core_text = (
            "i've been building something called the clinic — "
            "ai-driven training built for people who take it seriously.\n\n"
            "i've reserved one founding partner slot for you. "
            "you can see the split dashboard here:\n\n"
            "https://mrworkout.pro/partners"
        )
    else:
        core_html = (
            "<p>i've been building an ai training system called the clinic.</p>"
            "<p>your form is a 5/10. i'm not joking. "
            "let the ai fix it here:</p>"
            "<p>https://mrworkout.pro/roast</p>"
        )
        core_text = (
            "i've been building an ai training system called the clinic.\n\n"
            "your form is a 5/10. i'm not joking. "
            "let the ai fix it here:\n\n"
            "https://mrworkout.pro/roast"
        )
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#070707;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070707;">
<tr><td align="center" style="padding:36px 16px;">
<table width="520" cellpadding="0" cellspacing="0"
       style="background:#070707;max-width:520px;width:100%;">
<tr><td style="font-family:'Courier New',monospace;font-size:14px;line-height:1.9;color:#c0c0c0;padding:0;">
<p style="margin:0 0 16px;">hey {name},</p>
{core_html}
<p style="margin:20px 0 0;color:#333;">coach</p>
<p style="margin:8px 0 0;color:#1a1a1a;font-size:11px;">{token}</p>
</td></tr></table>
</td></tr></table></body></html>"""
    return {
        "subject":    f"quick question for {name}",
        "text":       f"hey {name},\n\n{core_text}\n\ncoach\n\n{token}",
        "html":       html,
        "from_email": "hello@mrworkout.pro",
        "from_name":  "coach",
    }

def phase3_body(name, lead_type):
    """Full dark neon template — restored after reputation is warmed up."""
    token = str(random.randint(10000, 99999))
    CYAN, MAG, DIM = "#00E5CC", "#e879f9", "#333"
    FONT = "'Courier New','Courier',monospace"
    if lead_type == "coach":
        core_html = (
            f"<p>i built a training system called "
            f"<span style='color:{CYAN};font-weight:bold;'>the clinic</span>. "
            f"ai handles periodization, progression, and client check-ins automatically.</p>"
            f"<p>coaches using it are cutting <strong>8–10 hours of admin per week</strong> "
            f"and keeping clients longer because the programming actually adapts.</p>"
            f"<p>check your current programming against the ai here:</p>"
            f"<p><span style='color:{CYAN};'>https://mrworkout.pro</span></p>"
        )
        core_text = (
            "i built a training system called the clinic. "
            "ai handles periodization, progression, and client check-ins automatically.\n\n"
            "coaches using it are cutting 8-10 hours of admin per week.\n\n"
            "check your current programming against the ai here:\n\n"
            "https://mrworkout.pro"
        )
    elif lead_type == "creator":
        core_html = (
            f"<p>i built an ai training clinic called "
            f"<span style='color:{CYAN};font-weight:bold;'>mr. workout</span>. "
            f"it's for people who take training seriously.</p>"
            f"<p>i've reserved one of <span style='color:{MAG};'>5 founding partner slots</span> "
            f"for you. <strong>lifetime access + 50% of every sub through your link.</strong> "
            f"no posting requirements.</p>"
            f"<p>you can see the split dashboard here:</p>"
            f"<p><span style='color:{MAG};'>https://mrworkout.pro/partners</span></p>"
        )
        core_text = (
            "i built an ai training clinic called mr. workout. "
            "it's for people who take training seriously.\n\n"
            "i've reserved one founding partner slot for you. "
            "lifetime access + 50% of every sub through your link. no posting requirements.\n\n"
            "you can see the split dashboard here:\n\n"
            "https://mrworkout.pro/partners"
        )
    else:
        core_html = (
            f"<p>i built an ai training system called "
            f"<span style='color:{CYAN};font-weight:bold;'>the clinic</span>.</p>"
            f"<p>your form is a 5/10. i'm not joking. "
            f"let the ai fix it here:</p>"
            f"<p><span style='color:{MAG};'>https://mrworkout.pro/roast</span></p>"
        )
        core_text = (
            "i built an ai training system called the clinic.\n\n"
            "your form is a 5/10. i'm not joking. "
            "let the ai fix it here:\n\n"
            "https://mrworkout.pro/roast"
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
<p style="margin:24px 0 0;color:{DIM};">coach</p>
<p style="margin:6px 0 0;color:#111;font-size:11px;">{token}</p>
</td></tr></table>
</td></tr></table></body></html>"""
    return {
        "subject":    f"quick question for {name}",
        "text":       f"hey {name},\n\n{core_text}\n\ncoach\n\n{token}",
        "html":       html,
        "from_email": "hello@mrworkout.pro",
        "from_name":  "coach",
    }

def get_template(send_num, name, lead_type):
    if send_num <= PHASE1_END:
        return phase1_body(name, lead_type)
    elif send_num <= PHASE2_END:
        return phase2_body(name, lead_type)
    else:
        return phase3_body(name, lead_type)

# ── Send ──────────────────────────────────────────────────────────────────────
def brevo_send(tmpl, to) -> tuple[bool, str]:
    """Returns (ok, error_reason). Raises SystemExit on bounce/rate-limit."""
    payload = {
        "sender":      {"name": tmpl["from_name"], "email": tmpl["from_email"]},
        "to":          [{"email": to}],
        "bcc":         [{"email": OWNER_BCC}],
        "subject":     tmpl["subject"],
        "textContent": tmpl["text"],
    }
    if tmpl.get("html"):
        payload["htmlContent"] = tmpl["html"]
    try:
        r = requests.post("https://api.brevo.com/v3/smtp/email",
                          json=payload,
                          headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
                          timeout=20)
        if r.status_code == 201:
            return True, ""
        body = r.text[:300]
        # Hard stop conditions
        if r.status_code == 429:
            alert(f"RATE LIMIT hit after {to} — stopping campaign.\n{body}")
            raise SystemExit(1)
        if r.status_code in (550, 551, 552, 553, 554):
            alert(f"BOUNCE/BLOCK on {to} (HTTP {r.status_code}) — stopping.\n{body}")
            raise SystemExit(1)
        return False, f"HTTP {r.status_code}: {body}"
    except SystemExit:
        raise
    except Exception as e:
        return False, str(e)

def alert(msg):
    print(f"\n{'!'*64}\n  ALERT: {msg}\n{'!'*64}\n")

# ── Supabase real-time log ────────────────────────────────────────────────────
def sb_headers():
    return {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
            "Content-Type": "application/json", "Prefer": "return=minimal"}

def log_send(handle, platform, text, lead_type, status):
    if not SB_URL or not SB_KEY:
        return
    try:
        requests.post(f"{SB_URL}/rest/v1/communication_logs",
                      json={"handle": handle, "platform": platform,
                            "message_text": text[:400], "lead_type": lead_type,
                            "status": status},
                      headers=sb_headers(), timeout=8)
    except Exception:
        pass

def upsert_outbound(email, name, lead_type="recruit"):
    if not SB_URL or not SB_KEY:
        return
    try:
        requests.post(f"{SB_URL}/rest/v1/outbound_leads",
                      json={"email": email, "first_name": name, "status": "sent",
                            "lead_type": lead_type,
                            "last_sent_date": datetime.now(timezone.utc).isoformat()},
                      headers={**sb_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
                      timeout=8)
    except Exception:
        pass

# ── Load leads ────────────────────────────────────────────────────────────────
def load_leads():
    seen, leads = set(), []
    # Already sent (state file)
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
        seen  = {e["email"] for e in state.get("sent_emails", [])}

    for fp in sorted(CSV_FOLDER.glob("dataset_instagram-lead-scraper_*.csv")):
        with open(fp, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                email = (row.get("email") or "").strip().lower()
                if not email or "@" not in email or email in seen:
                    continue
                seen.add(email)
                kw   = row.get("keyword","")
                titl = row.get("title","")
                url  = row.get("url","")
                hdl  = re.search(r'instagram\.com/([^/?]+)', url)
                hdl  = "@" + (hdl.group(1) if hdl else email.split("@")[0])
                lt   = classify_ig(kw, titl)
                nm   = extract_name(titl, email.split("@")[0])
                leads.append({"email":email,"name":nm,"handle":hdl,
                               "platform":"ig","lead_type":lt})

    tt = CSV_FOLDER / "dataset_tiktok-scraper_2026-05-20_10-25-15-301.csv"
    if tt.exists():
        with open(tt, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                bio = (row.get("authorMeta/signature") or "")
                m   = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z.]+', bio)
                if not m: continue
                email = m.group(0).lower()
                if email in seen: continue
                seen.add(email)
                nm  = extract_name(row.get("authorMeta/nickName",""), email.split("@")[0])
                hdl = "@" + (row.get("authorMeta/profileUrl","")).split("/@")[-1]
                try: fans = int(row.get("authorMeta/fans",0) or 0)
                except: fans = 0
                lt  = classify_tiktok(fans, bio)
                leads.append({"email":email,"name":nm,"handle":hdl,
                               "platform":"x","lead_type":lt})
    return leads

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*64}")
    print(f"  DAY 1 BATCH — 50 Coaches + 20 Creators")
    print(f"  Delay: {DELAY_MIN//60}-{DELAY_MAX//60} min random between sends")
    print(f"  Phase 1 (1-{PHASE1_END}): stealth plain text")
    print(f"  Phase 2 ({PHASE1_END+1}-{PHASE2_END}): transition minimal HTML")
    print(f"  Phase 3 ({PHASE2_END+1}+):  full dark neon")
    print(f"  BCC: {OWNER_BCC}")
    print(f"{'='*64}\n")

    # Account for emails already sent in prior runs of this script
    already = {"coach": 0, "creator": 0, "recruit": 0}
    prior_send_num = 0
    if LOG_FILE.exists():
        try:
            prior = json.loads(LOG_FILE.read_text())
            for row in prior.get("log", []):
                if row.get("status") == "sent":
                    already[row.get("lead_type", "recruit")] = already.get(row.get("lead_type","recruit"), 0) + 1
                    prior_send_num = max(prior_send_num, row.get("send_num", 0))
        except Exception:
            pass

    effective_caps = {lt: max(0, TODAY_CAPS[lt] - already[lt]) for lt in TODAY_CAPS}
    print(f"  Already sent: coaches={already['coach']} creators={already['creator']}")
    print(f"  Remaining:    coaches={effective_caps['coach']} creators={effective_caps['creator']}\n")

    all_leads  = load_leads()
    cap_used   = {"coach": 0, "creator": 0, "recruit": 0}
    queue      = []
    for lead in all_leads:
        lt = lead["lead_type"]
        if cap_used.get(lt, 0) < effective_caps.get(lt, 0):
            queue.append(lead)
            cap_used[lt] += 1
        if sum(cap_used.values()) >= sum(effective_caps.values()):
            break

    print(f"  Queue: {len(queue)} leads  "
          f"(coaches={cap_used['coach']} creators={cap_used['creator']})\n")

    results   = {"sent": already["coach"] + already["creator"], "failed": 0,
                 "coaches": already["coach"], "creators": already["creator"]}
    # load prior log rows so the JSON accumulates correctly
    log_rows  = []
    if LOG_FILE.exists():
        try: log_rows = json.loads(LOG_FILE.read_text()).get("log", [])
        except Exception: pass
    send_num  = prior_send_num

    for lead in queue:
        send_num += 1
        email = lead["email"]
        name  = lead["name"]
        lt    = lead["lead_type"]

        # Phase label
        if send_num <= PHASE1_END:
            phase = "P1-stealth"
        elif send_num <= PHASE2_END:
            phase = "P2-transition"
        else:
            phase = "P3-neon"

        tmpl = get_template(send_num, name, lt)
        ok, err = brevo_send(tmpl, email)    # raises SystemExit on hard errors
        status  = "sent" if ok else "failed"
        icon    = "✓" if ok else "✗"
        delay   = random.randint(DELAY_MIN, DELAY_MAX)

        print(f"  [{send_num:03d}] {icon} [{phase}] {lt:<8} {email:<42} — {name}")

        if ok:
            results["sent"] += 1
            results["coaches" if lt == "coach" else "creators"] += 1
            log_send(lead["handle"], lead["platform"], tmpl["text"][:300], lt, "sent")
            upsert_outbound(email, name, lt)
        else:
            results["failed"] += 1
            print(f"         ↳ err: {err}")
            log_send(lead["handle"], lead["platform"], tmpl["text"][:300], lt, "failed")

        log_rows.append({"send_num": send_num, "phase": phase, "email": email,
                         "name": name, "lead_type": lt, "status": status,
                         "subject": tmpl["subject"],
                         "sent_at": datetime.now(timezone.utc).isoformat()})
        LOG_FILE.write_text(json.dumps({"results": results, "log": log_rows}, indent=2))

        if send_num < len(queue):
            print(f"         ↳ next send in {delay//60}m {delay%60}s …")
            time.sleep(delay)

    # Final summary
    print(f"\n{'='*64}")
    print(f"  BATCH COMPLETE")
    print(f"  Sent:    {results['sent']}  |  Failed: {results['failed']}")
    print(f"  Coaches: {results['coaches']}  |  Creators: {results['creators']}")
    print(f"  Log →    {LOG_FILE}")
    print(f"{'='*64}\n")

if __name__ == "__main__":
    main()
