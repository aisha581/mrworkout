#!/usr/bin/env python3
"""
OMNI RESPONDER
==============
Visits competitor handles on YouTube, Instagram, and X/Twitter.
Finds fan questions in recent comments, picks the most relevant Mr. Workout
blog post, and queues a reply in savage_leads_2026.csv for the Savage Sniper.

Reply format:
  "Saw your question about [Topic]. I actually just broke this down in a deep
   dive here: [Blog URL]. Hope it helps!"

Usage:
    source ../savage_creator/set_env.sh
    python3 omni_responder.py
    python3 omni_responder.py --platforms youtube instagram
    python3 omni_responder.py --headful      # show browser (first login)
    python3 omni_responder.py --limit 3      # videos/posts per handle
"""
from __future__ import annotations

import os, sys, csv, json, time, random, re, argparse
from pathlib import Path

import requests
try:
    from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeout
except ImportError:
    sys.exit("✗  pip3 install playwright && python3 -m playwright install chromium")

# ── Config ────────────────────────────────────────────────────────────────────

ROOT          = Path(__file__).parent.parent.parent
COMPETITORS   = Path(__file__).parent.parent / "competitors.json"
BLOG_DIR      = ROOT / "content" / "blog"
LEADS_CSV     = ROOT / "twitter_leads" / "savage_leads_2026.csv"
COOKIES_FILE  = Path(__file__).parent / "savage_cookies.json"
GROK_API_KEY  = os.environ.get("GROK_API_KEY", "")
VERCEL_DOMAIN = os.environ.get("VERCEL_DOMAIN", "https://mrworkout.pro").rstrip("/")

LEADS_FIELDS  = ["url", "platform", "post_context", "drafted_reply",
                 "status", "posted_at", "error_msg"]

HOT_WORDS  = ["how", "why", "help", "advice", "stuck", "plateau",
              "not working", "what should", "recommend", "gains",
              "progress", "should i", "best way", "tips", "?"]
COLD_WORDS = ["spam", "follow", "promo", "check my", "link in bio",
              "giveaway", "subscribe", "collab"]

HOT_THRESHOLD = 2

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {} };
"""

# ── Blog index ────────────────────────────────────────────────────────────────

def load_blog_index() -> list[dict]:
    posts = []
    for mdx in BLOG_DIR.glob("*.mdx"):
        raw = mdx.read_text(encoding="utf-8", errors="ignore")
        m   = re.search(r"^---\n(.+?)\n---", raw, re.DOTALL)
        if not m:
            continue
        fm      = m.group(1)
        title   = re.search(r'^title:\s*"(.+?)"',  fm, re.MULTILINE)
        tags_m  = re.search(r'^tags:\s*\[(.+?)\]', fm, re.MULTILINE)
        tags    = [t.strip().strip('"') for t in tags_m.group(1).split(",")] if tags_m else []
        posts.append({
            "slug":  mdx.stem,
            "title": title.group(1) if title else mdx.stem,
            "tags":  tags,
            "url":   f"{VERCEL_DOMAIN}/blog/{mdx.stem}",
        })
    return posts

def pick_blog(text: str, blog_index: list[dict]) -> dict:
    t = text.lower()
    best, best_score = blog_index[0], 0
    for b in blog_index:
        score = sum(1 for tag in b["tags"] if tag.replace("-", " ") in t)
        score += sum(1 for w in ["overload", "plateau", "frequency", "muscle",
                                  "gains", "rpe", "fatigue", "hypertrophy"]
                     if w in t and w in (b["title"] + " ".join(b["tags"])).lower())
        if score > best_score:
            best_score, best = score, b
    return best

# ── Scoring ───────────────────────────────────────────────────────────────────

def score_comment(text: str) -> int:
    t = text.lower()
    if any(w in t for w in COLD_WORDS):
        return 0
    return sum(1 for w in HOT_WORDS if w in t) + text.count("?")

# ── Reply drafter ─────────────────────────────────────────────────────────────

def extract_topic(comment: str) -> str:
    """Use Grok to extract a 2-4 word topic from the comment. Falls back to 'training'."""
    if not GROK_API_KEY:
        return "training"
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}",
                     "Content-Type": "application/json"},
            json={"model": "grok-3-mini",
                  "messages": [
                      {"role": "system",
                       "content": "Extract the fitness topic from this comment in 2-4 words. "
                                  "Return ONLY the topic, lowercase, no punctuation. "
                                  "Examples: 'training frequency', 'progressive overload', 'CNS recovery'."},
                      {"role": "user", "content": comment[:250]}],
                  "max_tokens": 15, "temperature": 0.3},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip().strip('"').lower()[:40]
    except Exception:
        return "training"

def draft_reply(comment: str, blog_url: str, blog_title: str) -> str:
    topic = extract_topic(comment)
    return (
        f"Saw your question about {topic}. I actually just broke this down "
        f"in a deep dive here: {blog_url}. Hope it helps!"
    )

# ── CSV helpers ───────────────────────────────────────────────────────────────

def load_leads() -> list[dict]:
    if not LEADS_CSV.exists():
        return []
    with open(LEADS_CSV, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_leads(rows: list[dict]) -> None:
    for r in rows:
        for field in LEADS_FIELDS:
            r.setdefault(field, "")
    with open(LEADS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=LEADS_FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

# ── Browser ───────────────────────────────────────────────────────────────────

def make_context(pw, headless: bool):
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

def human_scroll(page: Page, times: int = 3) -> None:
    for _ in range(times):
        page.mouse.wheel(0, random.randint(400, 800))
        time.sleep(random.uniform(0.8, 1.6))

# ── Platform scrapers ─────────────────────────────────────────────────────────

def scrape_youtube_handle(page: Page, handle_url: str, handle: str,
                          limit: int) -> list[dict]:
    results = []
    try:
        page.goto(handle_url + "/videos", wait_until="domcontentloaded", timeout=30_000)
        time.sleep(random.uniform(2, 3.5))
        human_scroll(page, 2)

        video_links = page.locator("a#video-title-link").all()[:limit]
        urls = []
        for v in video_links:
            href = v.get_attribute("href")
            if href:
                urls.append("https://www.youtube.com" + href
                            if href.startswith("/") else href)

        for vurl in urls:
            page.goto(vurl, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(random.uniform(3, 5))
            human_scroll(page, 4)
            try:
                page.wait_for_selector("ytd-comment-thread-renderer", timeout=10_000)
            except PWTimeout:
                continue
            for c in page.locator("ytd-comment-thread-renderer").all()[:20]:
                try:
                    author = c.locator("#author-text").inner_text(timeout=3_000).strip()
                    text   = c.locator("#content-text").inner_text(timeout=3_000).strip()
                    if not text or author.lower() in (handle.lower(), "mrworkout", "mr. workout"):
                        continue
                    score = score_comment(text)
                    if score >= HOT_THRESHOLD:
                        results.append({"url": vurl, "text": text,
                                        "score": score, "context": f"YT @{handle}"})
                except Exception:
                    continue
            time.sleep(random.uniform(2, 3.5))
    except Exception as e:
        print(f"    YT scrape error ({handle}): {e}")
    return results

def scrape_instagram_handle(page: Page, handle_url: str, handle: str,
                             limit: int) -> list[dict]:
    results = []
    try:
        page.goto(handle_url, wait_until="domcontentloaded", timeout=30_000)
        time.sleep(random.uniform(2.5, 4))

        seen_hrefs: set = set()
        post_urls = []
        for a in page.locator("a[href*='/p/']").all():
            href = a.get_attribute("href")
            if href and "/p/" in href and href not in seen_hrefs:
                seen_hrefs.add(href)
                post_urls.append("https://www.instagram.com" + href
                                 if href.startswith("/") else href)
            if len(post_urls) >= limit:
                break

        for purl in post_urls:
            page.goto(purl, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(random.uniform(2, 3.5))
            human_scroll(page, 3)
            for sel in ("span._aacl._aaco._aacu._aacx._aad7._aade",
                        "div._a9zs span", "ul._a9z6 li span"):
                try:
                    page.wait_for_selector(sel, timeout=5_000)
                    for item in page.locator(sel).all()[:20]:
                        text = item.inner_text(timeout=2_000).strip()
                        if len(text) < 8:
                            continue
                        score = score_comment(text)
                        if score >= HOT_THRESHOLD:
                            results.append({"url": purl, "text": text,
                                            "score": score, "context": f"IG @{handle}"})
                    break
                except PWTimeout:
                    continue
            time.sleep(random.uniform(1.5, 2.5))
    except Exception as e:
        print(f"    IG scrape error ({handle}): {e}")
    return results

def scrape_twitter_handle(page: Page, handle_url: str, handle: str) -> list[dict]:
    """Scrape replies to the competitor's latest tweet."""
    results = []
    try:
        page.goto(handle_url, wait_until="domcontentloaded", timeout=30_000)
        time.sleep(random.uniform(3, 5))
        human_scroll(page, 2)

        # Click first tweet link to open it (to see replies)
        tweet_links = page.locator("article a[href*='/status/']").all()[:3]
        tweet_urls  = []
        for t in tweet_links:
            href = t.get_attribute("href")
            if href and "/status/" in href and href not in tweet_urls:
                tweet_urls.append("https://x.com" + href
                                  if href.startswith("/") else href)

        for turl in tweet_urls[:2]:
            page.goto(turl, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(random.uniform(3, 5))
            human_scroll(page, 3)
            try:
                page.wait_for_selector("article", timeout=8_000)
                articles = page.locator("article").all()[1:15]  # skip first (original tweet)
                for art in articles:
                    try:
                        text = art.locator("[data-testid='tweetText']").inner_text(timeout=2_000).strip()
                        if not text:
                            continue
                        score = score_comment(text)
                        if score >= HOT_THRESHOLD:
                            results.append({"url": turl, "text": text,
                                            "score": score, "context": f"X @{handle}"})
                    except Exception:
                        continue
            except PWTimeout:
                pass
            time.sleep(random.uniform(2, 4))
    except Exception as e:
        print(f"    X scrape error ({handle}): {e}")
    return results

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Omni Responder — competitor fan interceptor")
    parser.add_argument("--platforms", nargs="+",
                        choices=["youtube", "instagram", "twitter"],
                        default=["youtube", "instagram", "twitter"])
    parser.add_argument("--limit",   type=int, default=2,
                        help="Posts/videos per handle (default: 2)")
    parser.add_argument("--headful", action="store_true",
                        help="Show browser (needed for first login)")
    args = parser.parse_args()

    # Load config
    competitors = json.loads(COMPETITORS.read_text())
    blog_index  = load_blog_index()
    if not blog_index:
        sys.exit("✗  No blog posts found in content/blog/ — run ghostwriter first.")

    existing_leads = load_leads()
    seen_texts     = {r.get("post_context", "")[:80] for r in existing_leads}
    new_leads: list[dict] = []

    print(f"\n{'='*60}")
    print(f"  OMNI RESPONDER")
    print(f"  Platforms  : {', '.join(args.platforms)}")
    print(f"  Blog posts : {len(blog_index)} available")
    print(f"{'='*60}\n")

    headless = not args.headful

    with sync_playwright() as pw:
        browser, ctx = make_context(pw, headless)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        for platform in args.platforms:
            handles = competitors.get(platform, [])
            print(f"  [{platform.upper()}] {len(handles)} competitor(s)")

            for comp in handles:
                handle    = comp["handle"]
                comp_url  = comp["url"]
                print(f"    → @{handle}", end=" ", flush=True)

                if platform == "youtube":
                    hits = scrape_youtube_handle(page, comp_url, handle, args.limit)
                elif platform == "instagram":
                    hits = scrape_instagram_handle(page, comp_url, handle, args.limit)
                else:
                    hits = scrape_twitter_handle(page, comp_url, handle)

                print(f"{len(hits)} question(s)")

                for hit in hits:
                    ctx_key = hit["context"][:80] + hit["text"][:40]
                    if ctx_key in seen_texts:
                        continue
                    seen_texts.add(ctx_key)

                    blog    = pick_blog(hit["text"], blog_index)
                    reply   = draft_reply(hit["text"], blog["url"], blog["title"])

                    new_leads.append({
                        "url":           hit["url"],
                        "platform":      platform,
                        "post_context":  f'{hit["context"]} | {hit["text"][:100]}',
                        "drafted_reply": reply,
                        "status":        "pending",
                        "posted_at":     "",
                        "error_msg":     "",
                    })

                time.sleep(random.uniform(2, 4))

        # Save cookies
        try:
            COOKIES_FILE.write_text(json.dumps(ctx.cookies(), indent=2))
        except Exception:
            pass
        ctx.close()
        browser.close()

    if new_leads:
        all_leads = existing_leads + new_leads
        save_leads(all_leads)
        print(f"\n  ✓  {len(new_leads)} new lead(s) queued → {LEADS_CSV.name}")
        print(f"     Savage Sniper will post them in the next loop.\n")
    else:
        print(f"\n  ✓  No new questions found.\n")


if __name__ == "__main__":
    main()
