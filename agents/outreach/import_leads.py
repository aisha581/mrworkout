#!/usr/bin/env python3
"""
import_leads.py — one-time (and idempotent) CSV → Supabase importer.

Reads all IG scraper CSVs + TikTok CSV from 'Email CSV/' folder,
classifies each lead as coach / creator / recruit,
and upserts into outbound_leads with status='pending'.

Already-existing emails are skipped (upsert with ignore-duplicates).
Run once now, then re-run any time you drop new CSVs in the folder.

Usage:
  python3 agents/outreach/import_leads.py
  python3 agents/outreach/import_leads.py --dry-run
"""
import csv, re, os, sys, pathlib, requests

# ── Env ───────────────────────────────────────────────────────────────────────
ENV_FILE = pathlib.Path(__file__).parents[2] / ".env.local"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

SB_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
CSV_FOLDER = pathlib.Path(__file__).parents[2] / "Email CSV"
DRY_RUN    = "--dry-run" in sys.argv

# ── Classification ────────────────────────────────────────────────────────────
CREATOR_KW   = {"influencers","#gymtok","#fitnessjourney","#bodybuilding","#gymvlog",
                "dm for collaboration","calisthenics","calisthenics athlete","gymtok"}
COACH_KW     = {"coaches","personal trainers","gym owner","online coach","fitness studios",
                "gyms","fitness coach","personal trainer","crossfit level 1 coach"}
COACH_BIO_KW = {"coach","trainer","training","gym","studio","crossfit","bootcamp",
                "strength coach","performance","online coaching"}
_GENERIC     = {"new","personal","online","fitness","gym","the","coach","trainer",
                "certified","official","real","daily","top","best","pro","elite",
                "team","body","health","strong","fit","sport","active","life",
                "my","your","our","their","this","that","with","for","and","just"}

def classify_ig(keyword, description):
    kw = keyword.lower()
    if any(c in kw for c in COACH_KW):    return "coach"
    if any(c in kw for c in CREATOR_KW):  return "creator"
    if any(b in description.lower() for b in COACH_BIO_KW): return "coach"
    return "recruit"

def classify_tiktok(fans, bio):
    if any(b in bio.lower() for b in COACH_BIO_KW): return "coach"
    return "creator" if fans >= 10000 else "recruit"

def extract_name(title, fallback=""):
    title = re.sub(r'https?://\S+|@\S+|#\S+', '', title)
    title = re.sub(r'[^\w\s\-]', ' ', title).strip()
    words = [w for w in re.split(r'[\|\-•·:]', title)[0].split()
             if w and w[0].isupper() and len(w) > 1 and w.lower() not in _GENERIC]
    if words:
        return words[0].lower()
    parts  = re.sub(r'[\d_.\-]', ' ', fallback).split() if fallback else []
    prefix = parts[0] if parts else ""
    return prefix.lower() if len(prefix) > 1 else "coach"

# ── Load ──────────────────────────────────────────────────────────────────────
def load_leads():
    seen, leads = set(), []

    for fp in sorted(CSV_FOLDER.glob("dataset_instagram-lead-scraper_*.csv")):
        with open(fp, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                email = (row.get("email") or "").strip().lower()
                if not email or "@" not in email or email in seen:
                    continue
                seen.add(email)
                kw   = row.get("keyword", "")
                titl = row.get("title", "")
                url  = row.get("url", "")
                hdl  = re.search(r'instagram\.com/([^/?]+)', url)
                hdl  = "@" + (hdl.group(1) if hdl else email.split("@")[0])
                lt   = classify_ig(kw, titl)
                nm   = extract_name(titl, email.split("@")[0])
                leads.append({"email": email, "first_name": nm,
                              "lead_type": lt, "handle": hdl})

    tt = CSV_FOLDER / "dataset_tiktok-scraper_2026-05-20_10-25-15-301.csv"
    if tt.exists():
        with open(tt, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                bio = (row.get("authorMeta/signature") or "")
                m   = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z.]+', bio)
                if not m:
                    continue
                email = m.group(0).lower()
                if email in seen:
                    continue
                seen.add(email)
                nm  = extract_name(row.get("authorMeta/nickName", ""), email.split("@")[0])
                try:
                    fans = int(row.get("authorMeta/fans", 0) or 0)
                except Exception:
                    fans = 0
                lt  = classify_tiktok(fans, bio)
                leads.append({"email": email, "first_name": nm, "lead_type": lt, "handle": ""})

    return leads

# ── Upsert ────────────────────────────────────────────────────────────────────
def sb_h(prefer=""):
    h = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
         "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    return h

BATCH = 200   # Supabase REST upsert batch size

def upsert_batch(rows):
    payload = [
        {"email": r["email"], "first_name": r["first_name"],
         "lead_type": r["lead_type"], "status": "pending"}
        for r in rows
    ]
    r = requests.post(
        f"{SB_URL}/rest/v1/outbound_leads",
        json=payload,
        headers=sb_h("resolution=ignore-duplicates,return=minimal"),
        timeout=30,
    )
    return r.ok

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*60}")
    print(f"  import_leads — CSV → Supabase outbound_leads")
    print(f"  Folder: {CSV_FOLDER}")
    if DRY_RUN:
        print("  DRY RUN — no writes to Supabase")
    print(f"{'='*60}\n")

    leads = load_leads()

    by_type = {"coach": 0, "creator": 0, "recruit": 0}
    for l in leads:
        by_type[l["lead_type"]] = by_type.get(l["lead_type"], 0) + 1

    print(f"  Loaded {len(leads)} unique leads from CSVs")
    print(f"  coaches={by_type['coach']}  creators={by_type['creator']}  recruits={by_type['recruit']}\n")

    if DRY_RUN:
        print("  Dry run — first 5 leads:")
        for l in leads[:5]:
            print(f"    {l['lead_type']:<8}  {l['email']:<40}  {l['first_name']}")
        return

    inserted = failed = 0
    for i in range(0, len(leads), BATCH):
        chunk = leads[i:i + BATCH]
        ok = upsert_batch(chunk)
        if ok:
            inserted += len(chunk)
            print(f"  ✓  {inserted}/{len(leads)} upserted …")
        else:
            failed += len(chunk)
            print(f"  ✗  batch {i//BATCH + 1} failed")

    print(f"\n  Done. upserted={inserted}  failed={failed}")
    print(f"  All leads now in outbound_leads with status='pending'.")
    print(f"  daily_batch.py will pick them up starting tomorrow 9 AM UTC.\n")

if __name__ == "__main__":
    main()
