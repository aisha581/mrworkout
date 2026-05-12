#!/usr/bin/env python3
"""
OMNI EMPIRE — Unified Social Patrol
=====================================
One browser session. Three missions.

Mission 1 — OWN posts (YouTube + Instagram + X)
  Reads comments on MR. WORKOUT's own content. Replies with science
  and a relevant blog link to re-engage the audience.

Mission 2 — COMPETITOR posts (YouTube + Instagram + X)
  Finds fan questions on competitor content. Intercepts with:
  "Saw your question about [topic]. I broke this down here: [blog]"

Mission 3 — Reddit RSS
  Scans fitness subreddits for hot questions. Drafts value-first comments
  linked to the most relevant Mr. Workout blog post.

All leads → twitter_leads/savage_leads_2026.csv for Savage Sniper to post.

Usage:
    source ../savage_creator/set_env.sh
    python3 omni_empire.py                        # all missions
    python3 omni_empire.py --missions own reddit  # pick missions
    python3 omni_empire.py --headful              # show browser
    python3 omni_empire.py --limit 2              # posts per handle
"""
from __future__ import annotations

import os, sys, csv, json, time, random, re, argparse
from pathlib import Path

import requests
try:
    from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeout
except ImportError:
    sys.exit("✗  pip3 install playwright && python3 -m playwright install chromium")
try:
    import feedparser
except ImportError:
    sys.exit("✗  pip3 install feedparser")

# ── Config ────────────────────────────────────────────────────────────────────

ROOT          = Path(__file__).parent.parent.parent
BLOG_DIR      = ROOT / "content" / "blog"
LEADS_CSV     = ROOT / "twitter_leads" / "savage_leads_2026.csv"
COOKIES_FILE  = Path(__file__).parent / "savage_cookies.json"
COMPETITORS   = Path(__file__).parent.parent / "competitors.json"
GROK_API_KEY  = os.environ.get("GROK_API_KEY", "")
VERCEL_DOMAIN = os.environ.get("VERCEL_DOMAIN", "https://mrworkout.pro").rstrip("/")
SUCCESS_LOG   = Path(__file__).parent / "success_log.json"

OWN_YT        = "https://www.youtube.com/@mrworkoutapp"
OWN_IG        = "mrworkout.pro"
OWN_X         = "mrworkoutapp"

LEADS_FIELDS  = ["url", "platform", "post_context", "drafted_reply",
                 "status", "posted_at", "error_msg"]

HOT_WORDS  = ["how", "why", "help", "advice", "stuck", "plateau",
              "not working", "what should", "recommend", "gains",
              "progress", "should i", "best way", "tips", "?",
              "beginner", "struggling", "confused", "anyone"]
COLD_WORDS = ["spam", "follow", "promo", "check my", "link in bio",
              "giveaway", "subscribe", "collab", "dm me"]
HOT_THRESHOLD = 1

REDDIT_SUBS = [
    "fitness", "bodybuilding", "xxfitness", "gainit",
    "leangains", "naturalbodybuilding", "weightroom",
]

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {} };
"""

# ── Few-shot success examples ─────────────────────────────────────────────────

def load_few_shots(n: int = 4) -> list[dict]:
    """Return top-n successful reply examples from success_log.json."""
    if not SUCCESS_LOG.exists():
        return []
    try:
        entries = json.loads(SUCCESS_LOG.read_text())
        entries.sort(key=lambda e: e.get("engagement", 0), reverse=True)
        return [
            {"context": e.get("post_context", "")[:120],
             "reply":   e.get("drafted_reply", "")[:220]}
            for e in entries[:n]
            if e.get("drafted_reply")
        ]
    except Exception:
        return []

def _few_shot_block(few_shots: list[dict], label: str = "") -> str:
    if not few_shots:
        return ""
    header = f"HIGH-PERFORMING {label}REPLY EXAMPLES (few-shot):\n"
    body   = "\n".join(
        f"Example {i+1}:\n  Context: {ex['context']}\n  Reply: {ex['reply']}"
        for i, ex in enumerate(few_shots)
    )
    return f"\n\n{header}{body}\n\nMatch this style and impact:"

# ── Blog index ────────────────────────────────────────────────────────────────

def load_blog_index() -> list[dict]:
    posts = []
    for mdx in BLOG_DIR.glob("*.mdx"):
        raw = mdx.read_text(encoding="utf-8", errors="ignore")
        m   = re.search(r"^---\n(.+?)\n---", raw, re.DOTALL)
        if not m:
            continue
        fm     = m.group(1)
        title  = re.search(r'^title:\s*"(.+?)"',  fm, re.MULTILINE)
        tags_m = re.search(r'^tags:\s*\[(.+?)\]', fm, re.MULTILINE)
        tags   = [t.strip().strip('"') for t in tags_m.group(1).split(",")] if tags_m else []
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

# ── Grok helpers ──────────────────────────────────────────────────────────────

def extract_topic(comment: str) -> str:
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
                                  "Return ONLY the topic, lowercase. E.g. 'training frequency'."},
                      {"role": "user", "content": comment[:200]}],
                  "max_tokens": 12, "temperature": 0.2},
            timeout=12,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip().strip('"').lower()[:40]
    except Exception:
        return "training"

def draft_reply_own(comment: str, platform: str, blog_url: str,
                    few_shots: list[dict] | None = None) -> str:
    """Reply for comments on OWN posts — re-engagement + blog link."""
    fallback = (
        f"That plateau is a CNS signal, not a motivation issue. "
        f"Covered the full fix here: {blog_url} — hope it helps."
    )
    if not GROK_API_KEY:
        return fallback
    fs_block = _few_shot_block(few_shots or [], "OWN-POST ")
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}",
                     "Content-Type": "application/json"},
            json={"model": "grok-3-mini",
                  "messages": [
                      {"role": "system",
                       "content": (
                           "You are MR. WORKOUT replying to a comment on your own content. "
                           "Write ONE reply (max 200 chars): address their point brutally and helpfully, "
                           "drop one science fact, end with: 'Full breakdown: [BLOG_URL]'. "
                           "British English. No hashtags. Return ONLY the reply."
                           + fs_block
                       ).replace("[BLOG_URL]", blog_url)},
                      {"role": "user",
                       "content": f"Platform: {platform}\nComment: {comment[:250]}"}],
                  "max_tokens": 90, "temperature": 0.85},
            timeout=20,
        )
        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"].strip().strip('"')
        if blog_url not in reply:
            reply = reply.rstrip(".") + f" Full breakdown: {blog_url}"
        return reply[:280]
    except Exception:
        return fallback

def draft_reply_competitor(comment: str, blog_url: str,
                           few_shots: list[dict] | None = None) -> str:
    """Intercept reply for competitor fan questions."""
    if not GROK_API_KEY or not few_shots:
        topic = extract_topic(comment)
        return (
            f"Saw your question about {topic}. I actually just broke this down "
            f"in a deep dive here: {blog_url} — hope it helps!"
        )
    fs_block = _few_shot_block(few_shots, "COMPETITOR-INTERCEPT ")
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}",
                     "Content-Type": "application/json"},
            json={"model": "grok-3-mini",
                  "messages": [
                      {"role": "system",
                       "content": (
                           "You reply to competitor fans who asked a fitness question. "
                           "Format: 'Saw your question about [topic]. I broke this down here: [URL]' "
                           "Max 200 chars. British English. No hashtags. Return ONLY the reply."
                           f"{fs_block}"
                       ).replace("[URL]", blog_url)},
                      {"role": "user", "content": f"Comment: {comment[:250]}"}],
                  "max_tokens": 80, "temperature": 0.75},
            timeout=18,
        )
        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"].strip().strip('"')
        if blog_url not in reply:
            reply = reply.rstrip(".") + f" {blog_url}"
        return reply[:280]
    except Exception:
        topic = extract_topic(comment)
        return (f"Saw your question about {topic}. Broke this down here: {blog_url}")

def draft_reply_hijack(comment: str, blog_url: str, competitor_handle: str,
                       few_shots: list[dict] | None = None) -> str:
    """Competitor Hijack: acknowledge → expose the gap → provide the savage solution."""
    fallback = (
        f"Good question. Most mainstream advice covers the surface but misses "
        f"the CNS recovery mechanism that actually drives results. "
        f"Full breakdown: {blog_url}"
    )
    if not GROK_API_KEY:
        return fallback
    fs_block = _few_shot_block(few_shots or [], "HIJACK ")
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}",
                     "Content-Type": "application/json"},
            json={"model": "grok-3-mini",
                  "messages": [
                      {"role": "system",
                       "content": (
                           "You are MR. WORKOUT intercepting a fan question under a competitor's post. "
                           "Write ONE reply using exactly this 3-part structure (max 240 chars total):\n"
                           "1. Acknowledge their question directly (1 short sentence)\n"
                           "2. Point out the specific gap in standard advice on this topic — "
                           "   savage but scientific, do NOT name the competitor (1 sentence)\n"
                           "3. End with: 'Full answer: [BLOG_URL]'\n"
                           "British English. No hashtags. No emojis. Return ONLY the reply."
                           + fs_block
                       ).replace("[BLOG_URL]", blog_url)},
                      {"role": "user",
                       "content": f"Fan comment under @{competitor_handle} post:\n{comment[:250]}"}],
                  "max_tokens": 100, "temperature": 0.88},
            timeout=20,
        )
        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"].strip().strip('"')
        if blog_url not in reply:
            reply = reply.rstrip(".") + f" Full answer: {blog_url}"
        return reply[:290]
    except Exception:
        return fallback

def draft_reddit_comment(post_title: str, post_body: str, blog_url: str,
                         few_shots: list[dict] | None = None) -> str:
    fallback = (
        f"Your plateau is almost always a training frequency issue, not effort. "
        f"Your CNS needs stimulus + recovery in the right ratio. "
        f"Full breakdown here: {blog_url}"
    )
    if not GROK_API_KEY:
        return fallback
    fs_block = _few_shot_block(few_shots or [], "REDDIT ")
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}",
                     "Content-Type": "application/json"},
            json={"model": "grok-3-mini",
                  "messages": [
                      {"role": "system",
                       "content": (
                           "You are a knowledgeable fitness scientist commenting on Reddit. "
                           "Write a Value-First comment (max 300 chars): open with a direct "
                           "science-backed answer, name the mechanism (progressive overload / "
                           "CNS recovery / training frequency), end with: "
                           f"'Full breakdown: {blog_url}'. No bold markdown. Return ONLY the comment."
                           + fs_block
                       )},
                      {"role": "user",
                       "content": f'Post: "{post_title[:200]}"\nContext: "{post_body[:150]}"'}],
                  "max_tokens": 120, "temperature": 0.82},
            timeout=22,
        )
        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"].strip().strip('"')
        if blog_url not in reply:
            reply = reply.rstrip(".") + f" Full breakdown: {blog_url}"
        return reply[:350]
    except Exception:
        return fallback

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
        page.mouse.wheel(0, random.randint(400, 700))
        time.sleep(random.uniform(0.7, 1.4))

def scroll_to_comments(page: Page) -> None:
    try:
        page.click("body")
    except Exception:
        pass
    for _ in range(3):
        page.keyboard.press("End")
        time.sleep(1.2)
    for _ in range(5):
        page.mouse.wheel(0, 500)
        time.sleep(0.5)
    time.sleep(2)

# ── YouTube scraper ───────────────────────────────────────────────────────────

def scrape_youtube(page: Page, channel_url: str, label: str,
                   limit: int, own: bool) -> list[dict]:
    results = []
    try:
        page.set_default_timeout(12_000)
        page.goto(channel_url + "/videos", wait_until="domcontentloaded", timeout=25_000)
        time.sleep(2)

        video_links = page.locator("ytd-rich-item-renderer a[href*='/watch']").all()
        urls, seen = [], set()
        for v in video_links:
            href = v.get_attribute("href")
            if href and "/watch" in href and href not in seen:
                seen.add(href)
                urls.append("https://www.youtube.com" + href
                            if href.startswith("/") else href)
            if len(urls) >= limit:
                break

        for vurl in urls:
            try:
                page.goto(vurl, wait_until="domcontentloaded", timeout=25_000)
                time.sleep(2)
                scroll_to_comments(page)
                page.wait_for_selector("ytd-comment-thread-renderer", timeout=12_000)
                for c in page.locator("ytd-comment-thread-renderer").all()[:25]:
                    try:
                        author = c.locator("#author-text").inner_text(timeout=2_000).strip()
                        text   = c.locator("#content-text").inner_text(timeout=2_000).strip()
                        if not text:
                            continue
                        if own and author.lower() in ("mrworkout", "mr. workout", "mrworkoutapp"):
                            continue
                        score = score_comment(text)
                        if score >= HOT_THRESHOLD:
                            results.append({"url": vurl, "text": text,
                                            "score": score, "context": f"YT {label}"})
                    except Exception:
                        continue
            except PWTimeout:
                pass
            time.sleep(1)
    except Exception as e:
        print(f"    YT error ({label}): {e}")
    finally:
        page.set_default_timeout(30_000)
    return results

# ── Instagram scraper ─────────────────────────────────────────────────────────

def scrape_instagram(page: Page, handle: str, label: str,
                     limit: int) -> list[dict]:
    results = []
    try:
        page.goto(f"https://www.instagram.com/{handle}/",
                  wait_until="domcontentloaded", timeout=30_000)
        time.sleep(random.uniform(2.5, 4))

        post_urls, seen = [], set()
        for a in page.locator("a[href*='/p/']").all():
            href = a.get_attribute("href")
            if href and "/p/" in href and href not in seen:
                seen.add(href)
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
                                            "score": score, "context": f"IG {label}"})
                    break
                except PWTimeout:
                    continue
            time.sleep(random.uniform(1.5, 2.5))
    except Exception as e:
        print(f"    IG error ({label}): {e}")
    return results

# ── X/Twitter scraper ─────────────────────────────────────────────────────────

def scrape_twitter(page: Page, handle: str, label: str) -> list[dict]:
    results = []
    try:
        page.goto(f"https://x.com/{handle}", wait_until="domcontentloaded", timeout=30_000)
        time.sleep(random.uniform(3, 5))
        human_scroll(page, 2)

        tweet_urls, seen = [], set()
        for t in page.locator("article a[href*='/status/']").all()[:6]:
            href = t.get_attribute("href")
            if href and "/status/" in href and href not in seen:
                seen.add(href)
                tweet_urls.append("https://x.com" + href if href.startswith("/") else href)

        for turl in tweet_urls[:2]:
            page.goto(turl, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(random.uniform(3, 5))
            human_scroll(page, 3)
            try:
                page.wait_for_selector("article", timeout=8_000)
                for art in page.locator("article").all()[1:15]:
                    try:
                        text = art.locator("[data-testid='tweetText']").inner_text(timeout=2_000).strip()
                        if not text:
                            continue
                        score = score_comment(text)
                        if score >= HOT_THRESHOLD:
                            results.append({"url": turl, "text": text,
                                            "score": score, "context": f"X {label}"})
                    except Exception:
                        continue
            except PWTimeout:
                pass
            time.sleep(random.uniform(2, 3.5))
    except Exception as e:
        print(f"    X error ({label}): {e}")
    return results

# ── TikTok scraper ───────────────────────────────────────────────────────────

def scrape_tiktok(page: Page, handle: str, label: str) -> list[dict]:
    """Scrape comments from recent TikTok videos. Raises on bot-block detection."""
    results = []
    profile_url = f"https://www.tiktok.com/@{handle}"

    page.goto(profile_url, wait_until="domcontentloaded", timeout=30_000)
    time.sleep(random.uniform(3, 5))

    # Detect captcha / redirect to verify page — raise so caller logs BLOCKED
    title_lower = page.title().lower()
    url_lower   = page.url.lower()
    if any(kw in title_lower + url_lower for kw in ("captcha", "verify", "robot", "blocked")):
        raise RuntimeError(f"TikTok bot-protection on @{handle}")

    # Collect up to 3 video links from the profile grid
    video_urls: list[str] = []
    seen_hrefs: set = set()
    for v in page.locator("a[href*='/video/']").all()[:9]:
        href = v.get_attribute("href")
        if href and "/video/" in href and href not in seen_hrefs:
            seen_hrefs.add(href)
            video_urls.append(
                f"https://www.tiktok.com{href}" if href.startswith("/") else href
            )
        if len(video_urls) >= 3:
            break

    if not video_urls:
        # No videos found — could be private or bot-detected
        raise RuntimeError(f"TikTok no video links found for @{handle} — possibly blocked")

    for vurl in video_urls[:2]:
        try:
            page.goto(vurl, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(random.uniform(2.5, 4))
            human_scroll(page, 3)

            for sel in (
                "[data-e2e='comment-level-1']",
                "div[class*='CommentItemWrapper']",
                "[class*='comment-item-wrapper']",
                "p[data-e2e='comment-level-1-text']",
            ):
                try:
                    page.wait_for_selector(sel, timeout=6_000)
                    for item in page.locator(sel).all()[:20]:
                        try:
                            text = item.inner_text(timeout=2_000).strip()
                            if len(text) < 8:
                                continue
                            score = score_comment(text)
                            if score >= HOT_THRESHOLD:
                                results.append({"url": vurl, "text": text,
                                                "score": score, "context": f"TT {label}"})
                        except Exception:
                            continue
                    break
                except PWTimeout:
                    continue

            time.sleep(random.uniform(2, 3))
        except Exception as e:
            print(f"    TT video skip ({handle}): {e}")

    return results

# ── Reddit RSS ────────────────────────────────────────────────────────────────

REDDIT_HOT_WORDS = ["help", "how do i", "should i", "advice", "plateau",
                    "not working", "struggling", "confused", "recommend", "stuck", "tips"]
REDDIT_SKIP      = ["meme", "progress pic", "rate my", "weekly thread",
                    "daily thread", "[discussion]", "motivation"]

def fetch_reddit(sub: str, limit: int = 15) -> list[dict]:
    url = f"https://www.reddit.com/r/{sub}/hot.rss?limit={limit}&restrict_sr=on"
    try:
        resp = requests.get(url, headers={"User-Agent": "MrWorkoutBot/1.0"}, timeout=12)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
        posts = []
        for e in feed.entries:
            title   = e.get("title", "")
            link    = e.get("link", "")
            summary = re.sub(r"<[^>]+>", " ", e.get("summary", ""))
            if any(sw in title.lower() for sw in REDDIT_SKIP):
                continue
            score = sum(1 for hw in REDDIT_HOT_WORDS if hw in (title + summary).lower())
            score += (title + summary).count("?")
            if score >= 1:
                posts.append({"url": link, "title": title,
                              "body": summary[:400], "sub": sub})
        return posts
    except Exception:
        return []

# ── Mission runners ───────────────────────────────────────────────────────────

def mission_own(page: Page, blog_index: list[dict],
                limit: int, seen: set, new_leads: list[dict],
                few_shots: list[dict] | None = None) -> None:
    """Patrol OWN YouTube + Instagram + X for incoming questions."""
    print(f"\n  ── OWN POSTS ──────────────────────────────────────")

    sources = [
        ("youtube", lambda: scrape_youtube(page, OWN_YT, "@mrworkoutapp", limit, own=True)),
        ("instagram", lambda: scrape_instagram(page, OWN_IG, "@mrworkout.pro", limit)),
        ("twitter",  lambda: scrape_twitter(page, OWN_X, "@mrworkoutapp")),
    ]

    for platform, scrape_fn in sources:
        hits = scrape_fn()
        print(f"    {platform:<12} {len(hits)} question(s)")
        for hit in hits:
            key = hit["context"][:40] + hit["text"][:40]
            if key in seen:
                continue
            seen.add(key)
            blog    = pick_blog(hit["text"], blog_index)
            reply   = draft_reply_own(hit["text"], platform, blog["url"], few_shots)
            new_leads.append({
                "url":           hit["url"],
                "platform":      platform,
                "post_context":  f'OWN {hit["context"]} | {hit["text"][:100]}',
                "drafted_reply": reply,
                "status":        "pending",
                "posted_at":     "",
                "error_msg":     "",
            })

def mission_competitor(page: Page, blog_index: list[dict],
                       limit: int, seen: set, new_leads: list[dict],
                       few_shots: list[dict] | None = None,
                       blocked_log: list[str] | None = None) -> None:
    """Intercept fan questions on competitor posts.

    Routes primary/hijack competitors to draft_reply_hijack().
    All platform scrapers are wrapped — failures auto-skip and are logged
    to blocked_log so the loop can alert and continue on other platforms.
    """
    if blocked_log is None:
        blocked_log = []

    print(f"\n  ── COMPETITOR PATROL ──────────────────────────────")
    competitors = json.loads(COMPETITORS.read_text()) if COMPETITORS.exists() else {}

    platform_scrapers = [
        ("youtube",   lambda comp: scrape_youtube(page, comp["url"], f'@{comp["handle"]}', limit, own=False)),
        ("instagram", lambda comp: scrape_instagram(page, comp["handle"], f'@{comp["handle"]}', limit)),
        ("twitter",   lambda comp: scrape_twitter(page, comp["handle"], f'@{comp["handle"]}')),
        ("tiktok",    lambda comp: scrape_tiktok(page, comp["handle"], f'@{comp["handle"]}')),
    ]

    for platform, scrape_fn in platform_scrapers:
        for comp in competitors.get(platform, []):
            handle     = comp["handle"]
            is_primary = comp.get("primary", False)
            is_hijack  = comp.get("hijack", False) or is_primary

            # ── Platform failover: catch any block / timeout ─────────────
            try:
                hits = scrape_fn(comp)
            except Exception as e:
                msg = (f"PLATFORM BLOCKED — {platform.upper()} @{handle}: "
                       f"{type(e).__name__}: {str(e)[:80]}")
                print(f"    [ALERT] {msg}")
                blocked_log.append(msg)
                time.sleep(random.uniform(2, 4))
                continue  # auto-switch to next handle / platform

            tag = "★ HIJACK" if is_hijack else "  COMP  "
            print(f"    [{tag}] @{handle:<22} {len(hits)} question(s)")

            for hit in hits:
                key = hit["context"][:40] + hit["text"][:40]
                if key in seen:
                    continue
                seen.add(key)
                blog = pick_blog(hit["text"], blog_index)

                # Route: primary/hijack → 3-part hijack reply; others → standard intercept
                if is_hijack:
                    reply   = draft_reply_hijack(hit["text"], blog["url"], handle, few_shots)
                    ctx_tag = "HIJACK"
                else:
                    reply   = draft_reply_competitor(hit["text"], blog["url"], few_shots)
                    ctx_tag = "COMP"

                new_leads.append({
                    "url":           hit["url"],
                    "platform":      platform,
                    "post_context":  f'{ctx_tag} {hit["context"]} | {hit["text"][:100]}',
                    "drafted_reply": reply,
                    "status":        "pending",
                    "posted_at":     "",
                    "error_msg":     "",
                })

            time.sleep(random.uniform(1.5, 3))

def mission_reddit(blog_index: list[dict],
                   seen: set, new_leads: list[dict],
                   few_shots: list[dict] | None = None) -> None:
    """Scan Reddit fitness subs for hot questions."""
    print(f"\n  ── REDDIT PATROL ──────────────────────────────────")
    for sub in REDDIT_SUBS:
        posts = fetch_reddit(sub)
        new   = [p for p in posts if p["url"] not in seen]
        print(f"    r/{sub:<24} {len(posts):>3} hot  {len(new):>3} new")
        for p in new:
            seen.add(p["url"])
            blog  = pick_blog(p["title"] + " " + p["body"], blog_index)
            reply = draft_reddit_comment(p["title"], p["body"], blog["url"], few_shots)
            new_leads.append({
                "url":           p["url"],
                "platform":      "reddit",
                "post_context":  f'r/{sub} | {p["title"][:120]}',
                "drafted_reply": reply,
                "status":        "pending",
                "posted_at":     "",
                "error_msg":     "",
            })
            time.sleep(random.uniform(0.3, 0.7))
        time.sleep(random.uniform(1, 2))

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Omni Empire — unified social patrol")
    parser.add_argument("--missions", nargs="+",
                        choices=["own", "competitor", "reddit"],
                        default=["own", "competitor", "reddit"])
    parser.add_argument("--limit",   type=int, default=2,
                        help="Posts/videos per handle (default: 2)")
    parser.add_argument("--headful", action="store_true")
    args = parser.parse_args()

    blog_index = load_blog_index()
    if not blog_index:
        sys.exit("✗  No blog posts in content/blog/ — run ghostwriter first.")

    few_shots      = load_few_shots()
    existing_leads = load_leads()
    seen           = {r.get("post_context", "")[:80] for r in existing_leads}
    seen          |= {r.get("url", "") for r in existing_leads}
    new_leads:    list[dict] = []
    blocked_log:  list[str]  = []

    print(f"\n{'='*60}")
    print(f"  OMNI EMPIRE  —  {'|'.join(m.upper() for m in args.missions)}")
    print(f"  Blog posts  : {len(blog_index)}")
    print(f"  Few-shots   : {len(few_shots)} success example(s) loaded")
    print(f"  Missions    : {', '.join(args.missions)}")
    print(f"{'='*60}")

    needs_browser = any(m in args.missions for m in ("own", "competitor"))

    if needs_browser:
        with sync_playwright() as pw:
            browser, ctx = make_context(pw, not args.headful)
            page = ctx.pages[0] if ctx.pages else ctx.new_page()

            if "own" in args.missions:
                mission_own(page, blog_index, args.limit, seen, new_leads, few_shots)

            if "competitor" in args.missions:
                mission_competitor(page, blog_index, args.limit, seen, new_leads,
                                   few_shots, blocked_log)

            try:
                COOKIES_FILE.write_text(json.dumps(ctx.cookies(), indent=2))
            except Exception:
                pass
            ctx.close()
            browser.close()

    if "reddit" in args.missions:
        mission_reddit(blog_index, seen, new_leads, few_shots)

    if new_leads:
        all_leads = existing_leads + new_leads
        save_leads(all_leads)
        print(f"\n  ✓  {len(new_leads)} new lead(s) queued → {LEADS_CSV.name}")
        print(f"     Savage Sniper will post them in the next loop.")

    else:
        print(f"\n  ✓  No new leads found.")

    # ── Platform block summary — logged for savage_loop.sh to surface ─────────
    if blocked_log:
        print(f"\n  {'='*56}")
        print(f"  [ALERT] {len(blocked_log)} PLATFORM BLOCK(S) THIS RUN — auto-switched to others:")
        for msg in blocked_log:
            print(f"    ⚠  {msg}")
        print(f"  {'='*56}")
        print(f"  ACTION: Run with --headful to re-authenticate blocked platforms.")
    print()


if __name__ == "__main__":
    main()
