#!/usr/bin/env python3
"""
VERCEL SEO GHOSTWRITER
======================
Reads every video in ./archive, generates a 600+ word .mdx blog post,
and saves it in ./vercel_blogs — ready to push to your Vercel / Next.js repo.

Frontmatter  : title, date, excerpt, tags
Structure    : H2 sections → H3 subsections, **bold** emphasis, bullet lists
SEO keywords : progressive overload · hypertrophy · optimal training frequency
CTA          : <DownloadCTA /> component (source included in each file)

Usage:
    source ../savage_creator/set_env.sh
    python3 mdx_ghostwriter.py                   # all archive videos
    python3 mdx_ghostwriter.py --file "x.MP4"   # single file
    python3 mdx_ghostwriter.py --force           # overwrite existing
"""
from __future__ import annotations

import os, sys, json, re, time, argparse, unicodedata, requests
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT        = Path(__file__).parent.parent.parent
ARCHIVE_DIR = ROOT / "archive"
OUT_DIR     = ROOT / "vercel_blogs"
LOG_FILE    = Path(__file__).parent / "mdx_ghostwriter_log.json"
OUT_DIR.mkdir(parents=True, exist_ok=True)

GROK_API_KEY   = os.environ.get("GROK_API_KEY", "")
APP_STORE_URL  = "https://apps.apple.com/app/mr-workout"
PLAY_STORE_URL = "https://play.google.com/store/apps/mr-workout"

SEO_TAGS = [
    "progressive overload",
    "hypertrophy",
    "optimal training frequency",
    "MR. WORKOUT",
    "CNS recovery",
    "fitness app",
]

# ── Log ───────────────────────────────────────────────────────────────────────

def load_log() -> dict:
    if LOG_FILE.exists():
        return json.loads(LOG_FILE.read_text())
    return {"posts": {}}

def save_log(log: dict) -> None:
    LOG_FILE.write_text(json.dumps(log, indent=2))

# ── Filename helpers ──────────────────────────────────────────────────────────

def filename_to_hook(name: str) -> str:
    stem = Path(name).stem.strip('"\'').strip()
    return re.sub(r"\s+", " ", stem)

def slugify(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_str = nfkd.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_str.lower()).strip("-")[:80]

# ── Grok ──────────────────────────────────────────────────────────────────────

_SYSTEM = r"""You are the lead content writer for MR. WORKOUT — a science-backed fitness app.

Brand voice: savage, authoritative, scientific. British English. No fluff.
Call out gym myths by name. Back every claim with physiology.

Return ONLY valid JSON — no markdown fences, no commentary. Schema:
{
  "title":    "string — 55 chars max, punchy, keyword-rich",
  "excerpt":  "string — 145-155 chars, compelling hook with one target keyword",
  "tags":     ["string", "string", "string", "string"],
  "intro":    "string — 2-3 brutal opening sentences with **bold** on key terms. No heading.",
  "sections": [
    {
      "h2": "string — punchy H2 subheading",
      "prose": "string — 2-3 authoritative sentences; wrap key terms in **double asterisks**",
      "subsections": [
        {
          "h3": "string — specific H3 subheading",
          "prose": "string — 1-2 sentences with **bold** emphasis",
          "bullets": ["string max 15 words", "string", "string"]
        }
      ]
    }
  ],
  "word_count": number
}

Rules:
- 3-4 H2 sections, each with 1-2 H3 subsections
- Total word count 620-680 words (intro + all sections)
- Weave in naturally (once each, bold them):
    **progressive overload**, **hypertrophy**, **optimal training frequency**, **CNS recovery**
- tags array: 4-5 slugified strings e.g. "progressive-overload"
- Do NOT write a CTA section — added automatically"""

_USER = 'Hook: "{hook}"\nPrimary keyword: {kw}\n\nWrite the blog JSON.'

def _primary_kw(hook: str) -> str:
    h = hook.lower()
    if any(w in h for w in ("overload", "rpe", "blueprint", "genetics", "progress", "sets")):
        return "progressive overload"
    if any(w in h for w in ("muscle", "gains", "hypertrophy", "physique", "grow")):
        return "hypertrophy"
    return "optimal training frequency"

def call_grok(hook: str) -> Optional[dict]:
    if not GROK_API_KEY:
        print("  ✗  GROK_API_KEY not set")
        return None
    for attempt in range(1, 4):
        try:
            resp = requests.post(
                "https://api.x.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROK_API_KEY}",
                         "Content-Type": "application/json"},
                json={
                    "model": "grok-3-mini",
                    "messages": [
                        {"role": "system", "content": _SYSTEM},
                        {"role": "user",   "content": _USER.format(
                            hook=hook[:300], kw=_primary_kw(hook))},
                    ],
                    "max_tokens": 2200,
                    "temperature": 0.78,
                },
                timeout=90,
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("` \n")
            data = json.loads(raw)
            assert "title" in data and "sections" in data and len(data["sections"]) >= 3
            assert "excerpt" in data and "tags" in data
            return data
        except (json.JSONDecodeError, AssertionError) as e:
            print(f"    ⚠  Attempt {attempt}: schema error — {e}")
        except requests.exceptions.ReadTimeout:
            print(f"    ⚠  Attempt {attempt}: timeout")
        except requests.RequestException as e:
            print(f"    ⚠  Attempt {attempt}: {e}")
        if attempt < 3:
            time.sleep(4)
    return None

# ── DownloadCTA component (raw string — no Python format substitution) ─────────

# Placeholders APP_URL / PLAY_URL are swapped via .replace() — safe from JSX {}
_DOWNLOAD_CTA_TSX = r"""// components/DownloadCTA.tsx
// Place this file in your Next.js /components directory.
// Usage in MDX: <DownloadCTA />

import React from 'react'

export function DownloadCTA() {
  return (
    <div style={{
      background: '#000',
      borderRadius: '16px',
      padding: '2.5rem 2rem',
      marginTop: '3rem',
      textAlign: 'center',
      color: '#fff',
    }}>
      <h2 style={{ color: '#FFD700', fontSize: '1.6rem', marginBottom: '0.75rem' }}>
        Stop Guessing. Start Dominating.
      </h2>
      <p style={{ color: '#bbb', marginBottom: '1.75rem', maxWidth: '520px', margin: '0 auto 1.75rem' }}>
        MR. WORKOUT tracks your CNS score, builds your progressive overload
        blueprint, and coaches every rep across 89 exercises. Zero excuses. Free to start.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="APP_URL"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#FFD700', color: '#000',
            padding: '0.85rem 2.25rem', borderRadius: '8px',
            fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none',
          }}
        >
          ↓ Download on App Store
        </a>
        <a
          href="PLAY_URL"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            border: '2px solid #FFD700', color: '#FFD700',
            padding: '0.85rem 2.25rem', borderRadius: '8px',
            fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none',
          }}
        >
          ↓ Get on Google Play
        </a>
      </div>
    </div>
  )
}
"""

def _cta_tsx() -> str:
    return (
        _DOWNLOAD_CTA_TSX
        .replace("APP_URL", APP_STORE_URL)
        .replace("PLAY_URL", PLAY_STORE_URL)
    )

# ── MDX renderer ──────────────────────────────────────────────────────────────

_IMPORT_EXPORT_RE = re.compile(r'^(import|export)\s', re.MULTILINE)

def _sanitize(text: str) -> str:
    """Escape { } so MDX doesn't treat them as JSX expressions.
    Prefix any line starting with import/export to avoid acorn treating them
    as ESM statements."""
    text = text.replace("{", r"\{").replace("}", r"\}")
    # Prefix bare import/export lines with a zero-width space
    text = _IMPORT_EXPORT_RE.sub(r'&#8203;\1 ', text)
    return text

def render_mdx(data: dict) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    raw_tags  = data.get("tags", SEO_TAGS[:4])
    tags_yaml = ", ".join(
        f'"{re.sub(r"[^a-z0-9-]", "-", t.lower().strip()).strip("-")}"'
        for t in raw_tags
    )

    # Sanitize all AI-generated text before rendering
    title   = data["title"].replace('"', "'")
    excerpt = data["excerpt"].replace('"', "'")

    lines = [
        "---",
        f'title: "{title}"',
        f'date: "{today}"',
        f'excerpt: "{excerpt}"',
        f"tags: [{tags_yaml}]",
        "---",
        "",
        f"# {title}",
        "",
        _sanitize(data["intro"].strip()),
        "",
    ]

    for sec in data["sections"]:
        lines.append(f"## {sec['h2']}")
        lines.append("")
        lines.append(_sanitize(sec["prose"].strip()))
        lines.append("")

        for sub in sec.get("subsections", []):
            lines.append(f"### {sub['h3']}")
            lines.append("")
            lines.append(_sanitize(sub["prose"].strip()))
            lines.append("")
            for b in sub.get("bullets", []):
                lines.append(f"- {_sanitize(b.lstrip('•-– ').strip())}")
            lines.append("")

    lines += [
        "---",
        "",
        "<DownloadCTA />",
        "",
    ]

    return "\n".join(lines)

# ── Processor ─────────────────────────────────────────────────────────────────

def process_video(filename: str, log: dict, force: bool = False) -> bool:
    if not force and filename in log["posts"]:
        return False

    hook = filename_to_hook(filename)
    slug = slugify(hook) or "mr-workout"
    out  = OUT_DIR / f"{slug}.mdx"

    print(f"\n  [{filename[:58]}]")
    print(f"  Hook : {hook[:72]}")

    data = call_grok(hook)
    if not data:
        print("  ✗  Generation failed — skipping")
        return False

    mdx = render_mdx(data)
    out.write_text(mdx, encoding="utf-8")
    wc   = data.get("word_count", "~600")
    size = out.stat().st_size // 1024

    print(f"  ✓  {out.name}  ({size} KB, ~{wc} words)")
    print(f"     \"{data['title']}\"")

    log["posts"][filename] = {
        "slug":     slug,
        "title":    data["title"],
        "excerpt":  data["excerpt"],
        "tags":     data.get("tags", []),
        "file":     out.name,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    return True

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Vercel MDX Ghostwriter")
    parser.add_argument("--file",  metavar="FILENAME", help="Single archive file")
    parser.add_argument("--force", action="store_true", help="Overwrite existing posts")
    args = parser.parse_args()

    if not GROK_API_KEY:
        sys.exit("✗  GROK_API_KEY not set.  Run: source ../savage_creator/set_env.sh")

    log = load_log()
    W   = 66

    print(f"\n{'='*W}")
    print(f"  VERCEL SEO GHOSTWRITER")
    print(f"  Archive  → {ARCHIVE_DIR}")
    print(f"  Output   → {OUT_DIR}")
    print(f"{'='*W}")

    if args.file:
        targets = [args.file]
    else:
        raw  = sorted(ARCHIVE_DIR.glob("*.mp4")) + sorted(ARCHIVE_DIR.glob("*.MP4"))
        seen: set = set()
        targets: list = []
        for p in raw:
            if p.name.lower() not in seen:
                seen.add(p.name.lower())
                targets.append(p.name)

    todo    = [t for t in targets if t not in log["posts"] or args.force]
    already = len(targets) - len(todo)

    print(f"\n  {len(targets)} video(s) in archive")
    print(f"  {already} already done  |  {len(todo)} to generate\n")

    written = 0
    for i, filename in enumerate(todo, 1):
        print(f"  ── [{i}/{len(todo)}]", end=" ")
        if process_video(filename, log, force=args.force):
            written += 1
        save_log(log)
        if i < len(todo):
            time.sleep(1.5)

    print(f"\n{'='*W}")
    print(f"  DONE — {written} MDX file(s) written to vercel_blogs/")
    print(f"{'='*W}\n")

    if written:
        print("  Files ready to push:")
        for fn, entry in log["posts"].items():
            if fn in todo:
                print(f"    • {entry['file']}")
        print(f"\n  Component needed in your repo:")
        print(f"    components/DownloadCTA.tsx")
        print(f"    (source is embedded at the bottom of each .mdx file)\n")


if __name__ == "__main__":
    main()
