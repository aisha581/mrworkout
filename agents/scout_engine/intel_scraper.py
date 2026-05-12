#!/usr/bin/env python3
"""
SAVAGE INTELLIGENCE SCRAPER
============================
Fetches the latest videos from competitor YouTube channels via their public
Atom/RSS feeds (no API key required). Sends all titles to Grok for trend
analysis. Writes agents/intel_report.md which mdx_ghostwriter.py reads to
auto-pivot blog topics toward what is performing in the niche right now.

Usage:
    source ../savage_creator/set_env.sh
    python3 intel_scraper.py           # skips if already run today
    python3 intel_scraper.py --force   # always regenerate
"""
from __future__ import annotations

import os, sys, re, json, time, argparse, requests
from datetime import datetime, timezone
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT         = Path(__file__).parent.parent.parent
AGENTS_DIR   = Path(__file__).parent.parent
COMPETITORS  = AGENTS_DIR / "competitors.json"
REPORT_FILE  = AGENTS_DIR / "intel_report.md"
STATE_FILE   = Path(__file__).parent / "intel_scraper_state.json"

GROK_API_KEY = os.environ.get("GROK_API_KEY", "")

YT_RSS = "https://www.youtube.com/feeds/videos.xml?channel_id={cid}"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# ── State ─────────────────────────────────────────────────────────────────────

def load_state() -> dict:
    return json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}

def save_state(s: dict) -> None:
    STATE_FILE.write_text(json.dumps(s, indent=2))

# ── YouTube channel_id resolver ───────────────────────────────────────────────

def resolve_channel_id(handle_url: str) -> str | None:
    """Extract YouTube channelId from the channel page HTML meta tags."""
    try:
        r = requests.get(handle_url, headers=HEADERS, timeout=15)
        m = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]{20,})"', r.text)
        if m:
            return m.group(1)
        m = re.search(r'/channel/(UC[a-zA-Z0-9_-]{20,})', r.text)
        if m:
            return m.group(1)
    except Exception as e:
        print(f"    ⚠  resolve_channel_id {handle_url[-40:]}: {e}")
    return None

# ── YouTube RSS ───────────────────────────────────────────────────────────────

def fetch_yt_rss(channel_id: str, handle: str) -> list[dict]:
    """Fetch up to 15 recent video entries via YouTube's public Atom feed."""
    try:
        r = requests.get(YT_RSS.format(cid=channel_id), headers=HEADERS, timeout=15)
        r.raise_for_status()
        root = ET.fromstring(r.content)
        ns = {
            "a":  "http://www.w3.org/2005/Atom",
            "yt": "http://www.youtube.com/xml/schemas/2015",
        }
        videos = []
        for entry in root.findall("a:entry", ns)[:15]:
            title = (entry.findtext("a:title", "", ns) or "").strip()
            pub   = (entry.findtext("a:published", "", ns) or "")[:10]
            link  = entry.find("a:link", ns)
            url   = link.get("href", "") if link is not None else ""
            if title:
                videos.append({"handle": handle, "title": title,
                                "published": pub, "url": url})
        return videos
    except Exception as e:
        print(f"    ⚠  RSS fetch ({handle}): {e}")
        return []

# ── Grok trend analysis ───────────────────────────────────────────────────────

def analyze_trends(all_videos: list[dict]) -> dict:
    if not GROK_API_KEY or not all_videos:
        return {}

    titles_text = "\n".join(
        f"[{v['handle']} | {v['published']}] {v['title']}"
        for v in all_videos
    )

    schema = (
        '{\n'
        '  "trending_topics": [{"topic":"str","count":int,"examples":["str","str"]}],\n'
        '  "breakout_keywords": ["str"],\n'
        '  "gap_opportunities": ["str — high-value topics competitors undercover"],\n'
        '  "recommended_blog_topics": [\n'
        '    {"title":"str","primary_keyword":"str","angle":"str"}\n'
        '  ],\n'
        '  "title_patterns": ["str — structural patterns that drive clicks"]\n'
        '}'
    )

    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}",
                     "Content-Type": "application/json"},
            json={
                "model": "grok-3-mini",
                "messages": [
                    {"role": "system",
                     "content": (
                         "You are a fitness content strategist for MR. WORKOUT — a science-backed "
                         "training app. Analyse these competitor YouTube titles and return ONLY valid "
                         f"JSON matching this schema:\n{schema}\n\n"
                         "Rules:\n"
                         "- trending_topics: top 5 recurring themes with example titles\n"
                         "- breakout_keywords: ≤8 specific phrases appearing in multiple videos\n"
                         "- gap_opportunities: 3 high-value niches competitors are NOT covering\n"
                         "- recommended_blog_topics: 5 punchy blog titles with a savage science angle\n"
                         "- title_patterns: 4 structural patterns (e.g. myth-busting, numbered lists)"
                     )},
                    {"role": "user",
                     "content": f"Competitor videos:\n{titles_text}\n\nIdentify trends and gaps."},
                ],
                "max_tokens": 1600,
                "temperature": 0.45,
            },
            timeout=60,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("` \n")
        return json.loads(raw)
    except Exception as e:
        print(f"    ⚠  Grok trend analysis: {e}")
        return {}

# ── Report renderer ───────────────────────────────────────────────────────────

def render_report(analysis: dict, all_videos: list[dict], today: str) -> str:
    handles = list(dict.fromkeys(v["handle"] for v in all_videos))
    lines = [
        f"# Savage Intelligence Report — {today}",
        "",
        "_Auto-generated by intel_scraper.py. Read by mdx_ghostwriter.py for topic pivoting._",
        "",
        f"**Competitors analysed:** {', '.join(handles)}  ",
        f"**Videos scanned:** {len(all_videos)}",
        "",
    ]

    trending = analysis.get("trending_topics", [])
    if trending:
        lines += ["## Trending Topics", ""]
        for i, t in enumerate(trending, 1):
            exs = " · ".join(t.get("examples", [])[:2])
            lines.append(f"{i}. **{t['topic']}** (×{t.get('count', '?')})")
            if exs:
                lines.append(f"   > _{exs}_")
        lines.append("")

    kws = analysis.get("breakout_keywords", [])
    if kws:
        lines += ["## Breakout Keywords", ""]
        lines.append("  ".join(f"`{k}`" for k in kws[:8]))
        lines.append("")

    gaps = analysis.get("gap_opportunities", [])
    if gaps:
        lines += ["## Gap Opportunities — Own These", ""]
        for g in gaps:
            lines.append(f"- {g}")
        lines.append("")

    recs = analysis.get("recommended_blog_topics", [])
    if recs:
        lines += ["## Recommended Blog Topics", ""]
        for r in recs[:5]:
            lines.append(f"- **{r['title']}**  ")
            lines.append(f"  Keyword: `{r.get('primary_keyword', '')}` · Angle: {r.get('angle', '')}")
        lines.append("")

    patterns = analysis.get("title_patterns", [])
    if patterns:
        lines += ["## High-Click Title Patterns", ""]
        for p in patterns:
            lines.append(f"- {p}")
        lines.append("")

    return "\n".join(lines)

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Savage Intelligence Scraper")
    parser.add_argument("--force", action="store_true",
                        help="Regenerate even if already run today")
    args = parser.parse_args()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    state = load_state()

    if not args.force and state.get("last_run") == today:
        print(f"✓  Intel already generated today ({today}). Use --force to redo.")
        return

    if not GROK_API_KEY:
        sys.exit("✗  GROK_API_KEY not set. Source set_env.sh first.")

    competitors = json.loads(COMPETITORS.read_text())
    W = 60

    print(f"\n{'='*W}")
    print("  SAVAGE INTELLIGENCE SCRAPER")
    print(f"  Analysing {len(competitors['youtube'])} YouTube competitors")
    print(f"{'='*W}\n")

    all_videos: list[dict] = []

    for comp in competitors["youtube"]:
        handle = comp["handle"]
        print(f"  → @{handle:<28}", end="", flush=True)

        cid = resolve_channel_id(comp["url"])
        if not cid:
            print("✗  channel_id not found — skipping")
            time.sleep(1)
            continue

        videos = fetch_yt_rss(cid, handle)
        print(f"{len(videos)} videos")
        all_videos.extend(videos)
        time.sleep(1.5)

    if not all_videos:
        print("\n✗  No video data collected. Check network.")
        return

    print(f"\n  Analysing {len(all_videos)} titles with Grok…")
    analysis = analyze_trends(all_videos)

    report = render_report(analysis, all_videos, today)
    REPORT_FILE.write_text(report, encoding="utf-8")

    topics = [t["topic"] for t in analysis.get("trending_topics", [])]
    state.update({"last_run": today, "video_count": len(all_videos), "topics": topics,
                  "recommended": [r["title"] for r in analysis.get("recommended_blog_topics", [])]})
    save_state(state)

    print(f"\n  ✓  {REPORT_FILE.name} saved")
    if topics:
        print(f"  Top trends : {' · '.join(topics[:3])}")
    recs = analysis.get("recommended_blog_topics", [])
    if recs:
        print(f"  Blog pivot : \"{recs[0]['title']}\"")
    print(f"\n{'='*W}\n")


if __name__ == "__main__":
    main()
