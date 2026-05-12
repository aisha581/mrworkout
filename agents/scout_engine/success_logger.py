#!/usr/bin/env python3
"""
SUCCESS LOGGER
==============
Tracks which social replies actually get engagement.
Builds a few-shot example library that Omni Empire uses to write
progressively better replies over time.

Modes:
  scan          Check posted X/Twitter replies for likes + replies via Playwright
  mark <url>    Manually flag a URL as a high-performing reply
  list          Print the current success log

Usage:
    source ../savage_creator/set_env.sh
    python3 success_logger.py scan
    python3 success_logger.py scan --headful
    python3 success_logger.py mark "https://x.com/user/status/123"
    python3 success_logger.py list
"""
from __future__ import annotations

import csv, json, sys, re, time, random, argparse
from datetime import datetime, timezone
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    sys.exit("✗  pip3 install playwright && python3 -m playwright install chromium")

ROOT         = Path(__file__).parent.parent.parent
LEADS_CSV    = ROOT / "twitter_leads" / "savage_leads_2026.csv"
SUCCESS_LOG  = Path(__file__).parent / "success_log.json"
COOKIES_FILE = Path(__file__).parent / "savage_cookies.json"

MIN_ENGAGEMENT = 2   # combined likes+replies to qualify as a success
MAX_EXAMPLES   = 40  # cap the few-shot library size

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
STEALTH_JS = "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"

# ── IO helpers ────────────────────────────────────────────────────────────────

def load_log() -> list[dict]:
    return json.loads(SUCCESS_LOG.read_text()) if SUCCESS_LOG.exists() else []

def save_log(entries: list[dict]) -> None:
    # Keep the most recent MAX_EXAMPLES, sorted by engagement desc
    entries.sort(key=lambda e: e.get("engagement", 0), reverse=True)
    SUCCESS_LOG.write_text(json.dumps(entries[:MAX_EXAMPLES], indent=2))

def load_leads() -> list[dict]:
    if not LEADS_CSV.exists():
        return []
    with open(LEADS_CSV, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_leads(rows: list[dict]) -> None:
    if not rows:
        return
    fields = list(rows[0].keys())
    with open(LEADS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

# ── Browser ───────────────────────────────────────────────────────────────────

def make_context(pw, headless: bool = True):
    browser = pw.chromium.launch(
        headless=headless,
        args=["--disable-blink-features=AutomationControlled"],
    )
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent=UA, locale="en-GB",
    )
    ctx.add_init_script(STEALTH_JS)
    if COOKIES_FILE.exists():
        try:
            ctx.add_cookies(json.loads(COOKIES_FILE.read_text()))
        except Exception:
            pass
    return browser, ctx

# ── Engagement scraper ────────────────────────────────────────────────────────

def _parse_count(text: str) -> int:
    m = re.search(r"([\d,]+)", text)
    return int(m.group(1).replace(",", "")) if m else 0

def get_tweet_engagement(page, url: str) -> dict:
    """Scrape reply count + like count from an X post."""
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=25_000)
        time.sleep(random.uniform(2.5, 4))

        likes, replies = 0, 0

        for el in page.locator("[data-testid='reply']").all()[:1]:
            try:
                replies = _parse_count(el.inner_text(timeout=2_000))
            except Exception:
                pass

        for el in page.locator("[data-testid='like']").all()[:1]:
            try:
                likes = _parse_count(el.inner_text(timeout=2_000))
            except Exception:
                pass

        return {"likes": likes, "replies": replies, "total": likes + replies}
    except Exception:
        return {"likes": 0, "replies": 0, "total": 0}

# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_scan(headless: bool = True) -> None:
    leads  = load_leads()
    posted = [
        r for r in leads
        if r.get("status", "").strip().lower() == "posted"
        and r.get("platform", "").strip().lower() == "twitter"
        and (r.get("url") or "").startswith("http")
    ]

    if not posted:
        print("  No posted Twitter/X leads to scan.")
        return

    log      = load_log()
    log_urls = {e["url"] for e in log}
    new_hits: list[dict] = []

    print(f"  Scanning {len(posted)} posted X replies for engagement…\n")

    with sync_playwright() as pw:
        browser, ctx = make_context(pw, headless)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        for r in posted:
            url = r.get("url", "")
            if url in log_urls:
                continue

            eng   = get_tweet_engagement(page, url)
            total = eng["total"]
            mark  = "✓ HIT " if total >= MIN_ENGAGEMENT else "· miss"
            print(f"  {mark}  likes={eng['likes']:>3}  replies={eng['replies']:>3}  "
                  f"{url[-55:]}")

            if total >= MIN_ENGAGEMENT:
                new_hits.append({
                    "url":           url,
                    "platform":      r.get("platform", "twitter"),
                    "post_context":  r.get("post_context", "")[:200],
                    "drafted_reply": r.get("drafted_reply", ""),
                    "likes":         eng["likes"],
                    "replies_count": eng["replies"],
                    "engagement":    total,
                    "logged_at":     datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                })

            time.sleep(random.uniform(2, 3.5))

        try:
            COOKIES_FILE.write_text(json.dumps(ctx.cookies(), indent=2))
        except Exception:
            pass
        ctx.close()
        browser.close()

    if new_hits:
        save_log(log + new_hits)
        print(f"\n  ✓  {len(new_hits)} new success(es) added → success_log.json")
        print(f"     These will be used as few-shot examples in future replies.")
    else:
        print(f"\n  No new successes (threshold: {MIN_ENGAGEMENT} engagements).")


def cmd_mark(url: str) -> None:
    leads = load_leads()
    match = next((r for r in leads if r.get("url", "") == url), None)
    if not match:
        print(f"  ✗  URL not found in savage_leads_2026.csv")
        print(f"     Check the URL matches exactly. Searched: {url}")
        return

    log = load_log()
    if any(e["url"] == url for e in log):
        print(f"  Already in success log: {url[:80]}")
        return

    log.append({
        "url":           url,
        "platform":      match.get("platform", ""),
        "post_context":  match.get("post_context", "")[:200],
        "drafted_reply": match.get("drafted_reply", ""),
        "likes":         0,
        "replies_count": 0,
        "engagement":    99,  # manually marked — treated as top example
        "logged_at":     datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    })
    save_log(log)
    print(f"  ✓  Marked as success (engagement=99): {url[:80]}")


def cmd_list() -> None:
    log = load_log()
    if not log:
        print("  Success log is empty. Run 'scan' or 'mark <url>' to populate it.")
        return

    print(f"\n  SUCCESS LOG — {len(log)} example(s) (top 10 shown)\n")
    for e in log[:10]:
        eng_str = "manual" if e["engagement"] == 99 else f"eng={e['engagement']}"
        print(f"  [{e['platform']:<9}] {eng_str:>9}  {e['url'][-55:]}")
        reply_preview = (e.get("drafted_reply") or "")[:110]
        print(f"    \"{reply_preview}…\"")
        print()

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Success Logger — few-shot reply trainer")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("scan", help="Check posted X replies for engagement via Playwright")

    mp = sub.add_parser("mark", help="Manually flag a reply URL as a success")
    mp.add_argument("url", help="Exact URL of the posted reply")

    sub.add_parser("list", help="Print the current success log")

    parser.add_argument("--headful", action="store_true",
                        help="Show browser window (needed for first login)")

    args = parser.parse_args()

    if args.cmd == "mark":
        cmd_mark(args.url)
    elif args.cmd == "list":
        cmd_list()
    else:
        cmd_scan(headless=not getattr(args, "headful", False))


if __name__ == "__main__":
    main()
