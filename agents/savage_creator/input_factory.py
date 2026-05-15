#!/usr/bin/env python3
"""
INPUT FACTORY
=============
Handles the 2 daily input-folder slots: 08:00 and 16:00 UTC.

Rules:
  Alphabet Rule  — single-letter stem (a.mp4, b.mov):
                   Post RAW. No text, no edits, no voiceover.

  Sentence Rule  — multi-word descriptive filename:
                   First post  → upload as-is, no overlay
                   Repost (30+ days later) → add centered lowercase hook from filename

  No Voiceover   — never. Input folder videos have their own audio.

  Fallback       — if input_videos/ is empty, pull from armoury/.

  CTA caption    — always mentions MR. WORKOUT + weird engagement keyword.

Usage:
    source set_env.sh
    python3 -u input_factory.py           # post both slots (manual run)
    python3 -u input_factory.py --slot    # auto-detect current UTC slot
    python3 -u input_factory.py --preview # show queue, no upload
"""
from __future__ import annotations

import argparse, json, os, random, re, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from humor_sync import edit_video as hs_edit_video

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT              = Path(__file__).parent.parent.parent
INPUT_DIR         = ROOT / "input_videos"
ARMOURY_DIR       = ROOT / "public" / "videos" / "exercises"
OUTPUT_DIR        = Path(__file__).parent / "output" / "input_slots"
OUTPUT_VIDEOS_DIR = ROOT / "output_videos"
HISTORY_FILE      = Path(__file__).parent / "input_history.json"
POST_STATE        = Path(__file__).parent / "post_state.json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

# ── Credentials ───────────────────────────────────────────────────────────────

ZERNIO_API_KEY = os.environ.get("ZERNIO_API_KEY", "")
GROK_API_KEY   = os.environ.get("GROK_API_KEY", "")

# ── Schedule ──────────────────────────────────────────────────────────────────

INPUT_SLOTS    = ["08:00", "16:00"]
SLOT_UTC_HOURS = {"8": 0, "16": 1}   # UTC hour string → slot index

# ── Engagement CTA pool ───────────────────────────────────────────────────────

ENGAGEMENT_CTAS = [
    "Comment FAHHHHH to train with MR. WORKOUT.",
    "Comment SHOULDERS and I'll send the full program.",
    "Comment GAINS for the MR. WORKOUT blueprint.",
    "Comment ELITE if you want this split.",
    "Comment ALPHA for the MR. WORKOUT routine.",
    "Comment SAVAGE to train with MR. WORKOUT.",
    "Download MR. WORKOUT now. Link in bio. We do not miss.",
]

_HASHTAG_SETS = [
    "#mrworkout #SavageCoaching #SavageProtocol #gym #fitness #Fitness #GymTok",
    "#mrworkout #SavageCoaching #gym #fitness #bodybuilding #strengthtraining #Fitness",
    "#mrworkout #SavageCoaching #gym #fitness #gymlife #CNSrecovery #Fitness",
    "#mrworkout #SavageCoaching #SavageProtocol #gym #fitness #elitetraining #Fitness",
]

_COMPETITOR_ALTS = [
    "The best alternative to MyFitnessPal for real lifters.",
    "The best alternative to Strava for real lifters.",
    "The best alternative to Nike Training Club for real lifters.",
    "The best alternative to Whoop for real lifters.",
    "The best alternative to Fitbod for real lifters.",
]

# ── Verbose logger ────────────────────────────────────────────────────────────

def log(msg: str = "") -> None:
    print(msg, flush=True)

# ── History ───────────────────────────────────────────────────────────────────

def load_history() -> dict:
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text())
        except Exception:
            pass
    return {"used_videos": [], "posts": []}


def save_history(h: dict) -> None:
    HISTORY_FILE.write_text(json.dumps(h, indent=2))


def _has_been_posted(filename: str, history: dict) -> bool:
    return any(p["filename"] == filename for p in history.get("posts", []))


def _days_since_posted(filename: str, history: dict) -> float:
    posts = [p for p in history.get("posts", []) if p["filename"] == filename]
    if not posts:
        return 9999.0
    latest = max(datetime.fromisoformat(p["timestamp"]) for p in posts)
    return (datetime.now(timezone.utc) - latest).total_seconds() / 86400

# ── Video classification ───────────────────────────────────────────────────────

def is_master_original(path: Path) -> bool:
    """Single-letter stem: a.mp4, b.MOV etc. → post raw."""
    return bool(re.match(r'^[a-zA-Z]$', path.stem))


def is_repost_eligible(path: Path, history: dict) -> bool:
    """Video posted 30+ days ago qualifies for repost with hook overlay."""
    return _days_since_posted(path.name, history) >= 30

# ── Video pool ────────────────────────────────────────────────────────────────

_VIDEO_EXTS = ("*.mp4", "*.MP4", "*.mov", "*.MOV")


def _pool(directory: Path) -> list[Path]:
    files = []
    for ext in _VIDEO_EXTS:
        files += list(directory.glob(ext))
    seen, out = set(), []
    for p in files:
        if p.name.lower() not in seen:
            seen.add(p.name.lower())
            out.append(p)
    return out


def pick_video(slot_idx: int, history: dict) -> Optional[Path]:
    """
    Pick one video for this slot.
    Priority: unposted input_videos → repost-eligible input → armoury fallback.
    """
    pool = _pool(INPUT_DIR)
    if not pool:
        log("  ℹ  input_videos/ empty — falling back to armoury")
        pool = _pool(ARMOURY_DIR)
        if not pool:
            log("  ✗ Armoury also empty — nothing to post")
            return None

    used = set(history.get("used_videos", []))

    # Prefer unposted videos
    fresh = [p for p in pool if p.name not in used]
    if not fresh:
        log("  ℹ  All input videos rotated — resetting")
        history["used_videos"] = []
        fresh = pool

    chosen = random.choice(fresh)
    history["used_videos"].append(chosen.name)
    return chosen

# ── Font loader ───────────────────────────────────────────────────────────────

def load_font(size: int) -> ImageFont.FreeTypeFont:
    _home = str(Path.home() / "Library/Fonts")
    for path in [
        f"{_home}/Montserrat-ExtraBold.ttf",
        f"{_home}/Montserrat-Black.ttf",
        f"{_home}/BebasNeue-Regular.ttf",
        f"{_home}/ArchivoBlack-Regular.ttf",
        "/Library/Fonts/Montserrat-ExtraBold.ttf",
        "/Library/Fonts/BebasNeue-Regular.ttf",
        "/Library/Fonts/ArchivoBlack-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

# ── Caption builder ───────────────────────────────────────────────────────────

def _grok_caption(filename_text: str) -> str:
    """Use Grok to write a punchy caption for this video."""
    if not GROK_API_KEY:
        return _fallback_caption(filename_text)
    try:
        prompt = (
            f"Write a punchy 1-sentence social media caption for a fitness video about: '{filename_text}'.\n"
            f"Rules:\n"
            f"- Mention 'Mr. Workout App' or 'MR. WORKOUT' naturally\n"
            f"- Include the phrase 'Savage Coaching' somewhere natural\n"
            f"- End with one of these CTAs (pick the most fitting): "
            f"'Comment FAHHHHH to train with MR. WORKOUT.' OR "
            f"'Comment SHOULDERS for the full Savage Protocol.' OR "
            f"'Comment GAINS for the MR. WORKOUT blueprint.'\n"
            f"- Max 30 words total. No hashtags. No emojis. No quotes.\n"
            f"Reply with ONLY the caption text."
        )
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "grok-3-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 60, "temperature": 0.85,
            },
            timeout=20,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip().strip('"')
    except Exception as e:
        log(f"    ⚠  Grok caption failed: {e}")
        return _fallback_caption(filename_text)


def _fallback_caption(text: str) -> str:
    cta = random.choice(ENGAGEMENT_CTAS)
    return f"{text.strip().rstrip('.')}. {cta}"


def build_caption(video_path: Path) -> str:
    stem_clean = video_path.stem.replace("_", " ").replace("-", " ").strip()
    if is_master_original(video_path):
        stem_clean = "MR. WORKOUT"
    first_line = _grok_caption(stem_clean)
    hashtags   = random.choice(_HASHTAG_SETS)
    competitor = random.choice(_COMPETITOR_ALTS)
    return (
        f"{first_line}\n\n"
        f"Mr. Workout — Savage Coaching. {competitor}\n\n"
        f"Link in bio to download the Mr. Workout App 💪\n\n"
        f"{hashtags}"
    )

# ── Post state (5-slot tracking) ──────────────────────────────────────────────

def _load_post_state() -> dict:
    if POST_STATE.exists():
        try:
            return json.loads(POST_STATE.read_text())
        except Exception:
            pass
    return {"last_post_ts": 0, "posted_slots": []}


def _slot_already_posted(slot_iso: str) -> bool:
    return slot_iso in _load_post_state().get("posted_slots", [])


def _mark_slot_posted(slot_iso: str) -> None:
    state  = _load_post_state()
    posted = state.get("posted_slots", [])
    if slot_iso not in posted:
        posted.append(slot_iso)
    today          = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    state["posted_slots"] = [s for s in posted if s.startswith(today)]
    state["last_post_ts"] = time.time()
    POST_STATE.write_text(json.dumps(state, indent=2))

# ── Slot utilities ────────────────────────────────────────────────────────────

def _slot_iso(t_str: str) -> str:
    now   = datetime.now(timezone.utc)
    today = now.date()
    h, m  = map(int, t_str.split(":"))
    dt    = datetime(today.year, today.month, today.day, h, m, tzinfo=timezone.utc)
    if dt <= now:
        dt += timedelta(days=1)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _due_slot() -> Optional[tuple]:
    """Return (slot_idx, slot_iso) if current UTC time is within 20 min of an input slot."""
    now   = datetime.now(timezone.utc)
    today = now.date()
    for idx, t_str in enumerate(INPUT_SLOTS):
        h, m     = map(int, t_str.split(":"))
        slot_dt  = datetime(today.year, today.month, today.day, h, m, tzinfo=timezone.utc)
        slot_iso = slot_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        delta    = (now - slot_dt).total_seconds()
        if -60 <= delta <= 1200 and not _slot_already_posted(slot_iso):
            return idx, slot_iso
    return None

# ── Zernio uploader ───────────────────────────────────────────────────────────

def _zernio_headers() -> dict:
    return {"Authorization": f"Bearer {ZERNIO_API_KEY}", "Content-Type": "application/json"}


def _zernio_accounts() -> dict:
    resp = requests.get("https://zernio.com/api/v1/accounts",
                        headers=_zernio_headers(), timeout=30)
    resp.raise_for_status()
    return {a["platform"]: a["_id"] for a in resp.json().get("accounts", [])}


def upload_video(video_path: Path, caption: str, slot_iso: str) -> dict:
    if not ZERNIO_API_KEY:
        log("    ⚠  ZERNIO_API_KEY not set — saved locally only")
        return {"status": "local_only"}

    pr = requests.post("https://zernio.com/api/v1/media/presign",
                       headers=_zernio_headers(),
                       json={"filename": video_path.name, "contentType": "video/mp4"},
                       timeout=30)
    if not pr.ok:
        return {"status": f"presign_{pr.status_code}"}

    upload_url = pr.json()["uploadUrl"]
    public_url = pr.json()["publicUrl"]

    with open(video_path, "rb") as f:
        put = requests.put(upload_url, data=f,
                           headers={"Content-Type": "video/mp4"}, timeout=300)
    if not put.ok:
        return {"status": f"put_{put.status_code}"}
    log(f"    ✓ CDN upload → {public_url[:72]}…")

    try:
        acct_map = _zernio_accounts()
    except Exception as e:
        return {"status": f"accounts_error: {e}"}

    platforms = []
    for plat, post_type in [("instagram", "REEL"), ("tiktok", "VIDEO")]:
        aid = acct_map.get(plat)
        if aid:
            platforms.append({
                "platform": plat, "accountId": aid,
                "platformSpecificData": {"postType": post_type},
            })
        else:
            log(f"    ⚠  No {plat} account in Zernio")

    if not platforms:
        return {"status": "no_accounts"}

    log(f"    → Posting to: {', '.join(p['platform'] for p in platforms)}")
    try:
        post = requests.post(
            "https://zernio.com/api/v1/posts",
            headers=_zernio_headers(),
            json={
                "content": caption, "scheduledFor": slot_iso,
                "platforms": platforms,
                "mediaItems": [{"type": "video", "url": public_url}],
            },
            timeout=(10, 300),
        )
    except requests.exceptions.ReadTimeout:
        log("    ⚠  Timed out — check zernio.com/dashboard")
        return {"status": "timeout"}

    if not post.ok:
        log(f"    ✗ Post failed {post.status_code}: {post.text[:120]}")
        return {"status": f"post_{post.status_code}"}

    post_id = post.json().get("post", {}).get("_id", "?")
    log(f"    ✓ Zernio postId: {post_id}")
    return post.json()

# ── Core slot runner ──────────────────────────────────────────────────────────

def run_slot(slot_idx: int, slot_iso: str, history: dict, preview: bool = False) -> dict:
    log(f"\n{'─'*68}")
    log(f"  INPUT SLOT {slot_idx + 1}/2  ({INPUT_SLOTS[slot_idx]} UTC)  →  {slot_iso}")
    log(f"{'─'*68}")

    video = pick_video(slot_idx, history)
    if not video:
        return {"slot": slot_iso, "status": "no_video"}

    is_original   = is_master_original(video)
    is_first_time = not _has_been_posted(video.name, history)
    is_repost     = not is_first_time and is_repost_eligible(video, history)

    # Determine treatment
    if is_original:
        treatment = "master_original"
        label     = "MASTER ORIGINAL — posting raw"
    elif is_first_time:
        treatment = "first_post"
        label     = "FIRST POST — as-is"
    elif is_repost:
        treatment = "repost_hook"
        label     = "REPOST — adding hook overlay"
    else:
        treatment = "first_post"   # posted recently, not repost-eligible — as-is again
        label     = "RECENT POST — as-is (not yet 30 days)"

    log(f"  Video     : {video.name}")
    log(f"  Treatment : {label}")

    caption = build_caption(video)
    log(f"  Caption   : {caption[:100]}…")
    log(f"  Slot ISO  : {slot_iso}")

    if preview:
        return {
            "slot": slot_iso, "video": video.name,
            "treatment": treatment, "caption": caption, "status": "preview",
        }

    # ── Apply treatment ───────────────────────────────────────────────────────
    work_dir = OUTPUT_DIR / datetime.now().strftime("%Y-%m-%d") / f"slot_{slot_idx + 1}"
    work_dir.mkdir(parents=True, exist_ok=True)

    if treatment == "repost_hook":
        hook_text = video.stem.replace("_", " ").replace("-", " ").lower()
        log(f"\n  ██ APPLYING HOOK OVERLAY: '{hook_text[:60]}'")
        out_path = work_dir / f"hook_{video.stem[:40]}.mp4"
        try:
            hs_edit_video(video, out_path, hook_text=hook_text)
            upload_path = out_path
            log(f"  ██ OVERLAY DONE → {out_path.name}")
        except Exception as e:
            log(f"  ✗ Overlay failed: {e} — posting as-is")
            upload_path = video
    else:
        upload_path = video

    import shutil
    mirror = OUTPUT_VIDEOS_DIR / upload_path.name
    if upload_path != video:
        shutil.copy2(str(upload_path), str(mirror))
        log(f"  ██ VIDEO SAVED → output_videos/{upload_path.name}")

    size_mb = upload_path.stat().st_size / 1_048_576
    log(f"\n  ✅ READY  ({size_mb:.1f} MB)")

    result     = upload_video(upload_path, caption, slot_iso)
    zernio_id  = result.get("post", {}).get("_id", result.get("status", "sent"))
    upload_ok  = not str(zernio_id).startswith(
        ("presign_", "put_", "post_", "no_accounts", "accounts_error"))

    if upload_ok:
        _mark_slot_posted(slot_iso)
        history["posts"].append({
            "filename":  video.name,
            "treatment": treatment,
            "slot":      slot_iso,
            "zernio_id": str(zernio_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status":    "done",
        })
        save_history(history)

    return {
        "slot": slot_iso, "video": video.name,
        "treatment": treatment, "zernio_id": str(zernio_id),
        "status": "done" if upload_ok else str(zernio_id),
    }

# ── Main runner ───────────────────────────────────────────────────────────────

def run(preview: bool = False, slot_idx: Optional[int] = None) -> None:
    today_str = datetime.now().strftime("%Y-%m-%d")
    history   = load_history()

    log(f"\n{'='*68}")
    log(f"  INPUT FACTORY — {today_str}")
    log(f"  SOURCE: {INPUT_DIR}  ({len(_pool(INPUT_DIR))} videos)")
    log(f"{'='*68}")

    if slot_idx is not None:
        # Single-slot mode
        slot_iso = _slot_iso(INPUT_SLOTS[slot_idx])
        result   = run_slot(slot_idx, slot_iso, history, preview)
        results  = [result]
    else:
        # Run both slots
        results = []
        for i, t_str in enumerate(INPUT_SLOTS):
            slot_iso = _slot_iso(t_str)
            r = run_slot(i, slot_iso, history, preview)
            results.append(r)
            if i < len(INPUT_SLOTS) - 1:
                time.sleep(3)

    log(f"\n{'='*68}")
    log(f"  DONE — {today_str}")
    log(f"{'='*68}")
    for r in results:
        log(f"  {r.get('treatment','?'):18s}  {r.get('status','?'):14s}  {r.get('video','?')[:40]}")
    log()

    if preview:
        log("  [preview mode — no uploads]\n")

# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Input Factory — 2 daily input-folder slots")
    parser.add_argument("--preview", action="store_true",
                        help="Show queue and treatment decisions, no upload")
    parser.add_argument("--slot", action="store_true",
                        help="Auto-detect current UTC slot (08:00 or 16:00) and post it")
    args = parser.parse_args()

    if args.slot:
        due = _due_slot()
        if not due:
            now_utc = datetime.now(timezone.utc)
            log(f"  No input slot due right now ({now_utc.strftime('%H:%M')} UTC) — exiting")
            sys.exit(0)
        idx, slot_iso = due
        log(f"  Slot detected: {slot_iso}  →  INPUT {idx + 1}/2 ({INPUT_SLOTS[idx]} UTC)")
        history = load_history()
        run_slot(idx, slot_iso, history)
    else:
        run(preview=args.preview)
