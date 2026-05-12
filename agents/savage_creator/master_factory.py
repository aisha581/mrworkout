#!/usr/bin/env python3
"""
SAVAGE MASTER FACTORY
=====================
One command → N unique posts → Instagram Reels + TikTok + YouTube Shorts.

Usage:
    source set_env.sh
    python3 master_factory.py --count 5

Required env vars (add to set_env.sh):
    ELEVENLABS_API_KEY
    ELEVENLABS_VOICE_ID
    IG_USERNAME / IG_PASSWORD          (Instagram)
    YT_CLIENT_SECRETS                  (path to YouTube client_secrets.json)

Required files:
    tiktok_cookies.txt                 (export from browser via EditThisCookie)

Optional:
    ELEVENLABS_API_KEY already in set_env.sh ✓
"""
from __future__ import annotations

import os, sys, json, random, time, argparse, requests, shutil
from datetime import timedelta

# humor_sync lives alongside this script
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from humor_sync import (
    edit_video       as hs_edit_video,
    generate_caption as hs_generate_caption,
    BRANDED_HOOKS    as HS_HOOKS,
)
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
from moviepy.editor import (
    VideoFileClip, AudioFileClip, CompositeVideoClip,
    ImageClip, concatenate_videoclips,
)

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT              = Path(__file__).parent.parent.parent
ARMOURY_DIR       = ROOT / "public" / "videos" / "exercises"
INPUT_VIDEOS_DIR  = ROOT / "input_videos"
OUTPUT_VIDEOS_DIR = ROOT / "output_videos"
ARCHIVE_DIR       = ROOT / "archive"
OUTPUT_DIR        = Path(__file__).parent / "output" / "factory"
HISTORY_FILE      = Path(__file__).parent / "post_history.json"
POST_LOG          = Path(__file__).parent / "post_log.json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Daily schedule (UTC) ──────────────────────────────────────────────────────

PEAK_TIMES_UTC = ["08:00", "13:00", "17:00", "21:00", "01:00"]

# ── Credentials ───────────────────────────────────────────────────────────────

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID           = os.environ.get("ELEVENLABS_VOICE_ID", "TzXBctXOhevTjqk0P3Vj")
ZERNIO_API_KEY     = os.environ.get("ZERNIO_API_KEY", "")
GROK_API_KEY       = os.environ.get("GROK_API_KEY", "")

# ── Video spec ────────────────────────────────────────────────────────────────

OUT_W, OUT_H = 1080, 1920
FPS          = 30
GOLD         = (255, 215, 0)
WHITE        = (255, 255, 255)
GOLD_WORDS   = {
    "CNS", "CNS.", "CNS,", "PR", "PR.", "SAVAGE", "ARMOURY",
    "RECOVERY", "RECOVERY.", "NERVOUS", "SYSTEM", "MR.", "WORKOUT",
    "WORKOUT.", "ELITE", "PROTOCOL", "SOLDIER",
}

# ── Content pool ──────────────────────────────────────────────────────────────

TIPS = [
    {
        "hook": "More sets isn't more progress. More recovered sets is.",
        "body": "Two sets at 95% CNS capacity outperform five sets at 60 percent. Volume without recovery is just fatigue accumulation. Mr. Workout's CNS tracker tells you when your output is actually worth it.",
        "tags": "#trainingtips #GymTok #mrworkout #CNS #savage #strengthcoach",
    },
    {
        "hook": "The first rep tells you everything. Most people ignore it.",
        "body": "If the first rep feels slower than last session — CNS is still recovering. Push anyway and you're digging a hole. Pull back and you're building a peak.",
        "tags": "#gymscience #GymTok #mrworkout #CNSrecovery #savage #strength",
    },
    {
        "hook": "Rest days don't recover your CNS. Sleep and nutrition do.",
        "body": "You can take a full day off and still go into tomorrow's session at 50 percent if your sleep debt is real. CNS recovery isn't about time off — it's about what you do in that time.",
        "tags": "#recovery #GymTok #mrworkout #CNS #sleep #savage #overtraining",
    },
    {
        "hook": "Eccentric control isn't harder. It's smarter.",
        "body": "Three seconds down. One second hold. Explosive up. That's more muscle fibre recruitment than four sloppy reps. Every move in the Mr. Workout Armoury has the right protocol.",
        "tags": "#technique #GymTok #mrworkout #armoury #savage #liftingtips",
    },
    {
        "hook": "Your PR isn't a weight. It's a CNS state.",
        "body": "You've hit 100 kg before. But not every day. Because a PR requires your nervous system firing at near-maximum capacity. Track the score, not just the weight.",
        "tags": "#PR #GymTok #mrworkout #CNS #savage #personalrecord #strength",
    },
    {
        "hook": "You don't overtrain muscles. You overtrain your nervous system.",
        "body": "The muscle recovers in 48 hours. The CNS takes 72 to 96. That's why the second week of a hard block always feels worse. Mr. Workout flags the drop before you feel it.",
        "tags": "#overtraining #GymTok #mrworkout #CNS #savage #recovery #gym",
    },
    {
        "hook": "Deload weeks aren't weakness. They're strategy.",
        "body": "Elite athletes build deloads into every training block. It's not about going easy — it's about supercompensating. Your CNS needs the quiet to come back louder.",
        "tags": "#deload #GymTok #mrworkout #elitetraining #savage #CNS #strength",
    },
    {
        "hook": "Sleep is the only legal performance enhancer that actually works.",
        "body": "Eight hours of sleep improves reaction time, strength output, and CNS recovery more than any supplement. Mr. Workout factors your sleep quality into your daily score.",
        "tags": "#sleep #GymTok #mrworkout #CNS #savage #performance #recovery",
    },
    {
        "hook": "The warm-up isn't optional. It's the session.",
        "body": "Your CNS needs 15 to 20 minutes to reach peak firing capacity. Skipping the warm-up doesn't save time — it wastes the session. Mr. Workout builds it into every mission.",
        "tags": "#warmup #GymTok #mrworkout #CNS #savage #trainingtips #gym",
    },
    {
        "hook": "Consistency beats intensity every single time.",
        "body": "Three hard sessions per week for a year outperforms six brutal sessions for two months. The nervous system builds on repetition. Mr. Workout tracks the streak so you never break it.",
        "tags": "#consistency #GymTok #mrworkout #savage #streaks #gymlife #CNS",
    },
]

CTAS = [
    "89 exercises in the Armoury. Every one coached. Link in bio.",
    "The CNS tracker is live in Mr. Workout. Free to try. Link in bio.",
    "Mr. Workout. Train with actual intelligence. Link in bio.",
    "Stop guessing. Start tracking. Mr. Workout. Link in bio.",
    "Download Mr. Workout. Your nervous system will thank you. Link in bio.",
]


# ── Post history ──────────────────────────────────────────────────────────────

def load_history() -> dict:
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return {"used_hooks": [], "used_videos": [], "posts": []}


def save_history(history: dict):
    HISTORY_FILE.write_text(json.dumps(history, indent=2))


# ── Post log (filename → hook/caption history for repost AI) ─────────────────

def _load_post_log() -> dict:
    if POST_LOG.exists():
        return json.loads(POST_LOG.read_text())
    return {"posts": []}


def _save_post_log(log: dict) -> None:
    POST_LOG.write_text(json.dumps(log, indent=2))


def _record_post(log: dict, filename: str, hook: str, caption: str, zernio_id: str) -> None:
    log["posts"].append({
        "filename":   filename,
        "hook":       hook,
        "caption":    caption,
        "zernio_id":  zernio_id,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    })
    _save_post_log(log)


# ── Filename → hook text ───────────────────────────────────────────────────────

# Filename prefixes that mark a file as carrying its own readable hook text
_DESCRIPTIVE_PREFIXES = {
    "POV", "SAVAGE", "FLEX", "HUMOR", "REALITY", "AUTHORITY",
    "RESULTS", "MOTIVATION", "DIRECT", "COUPLE", "BOYFRIEND",
    "GIRLFRIEND", "TAG", "WHEN", "ME", "THAT",
}


def _filename_to_hook(path: Path) -> str:
    """bench_press_heavy.mp4 → 'BENCH PRESS HEAVY'"""
    return path.stem.replace("_", " ").replace("-", " ").upper()


def _determine_hook(bg: Path) -> Optional[str]:
    """
    Final hook rule:
      1. 'LOCKED' in filename → None (no overlay, post as-is)
      2. Everything else      → filename text (extension stripped, separators → spaces)
    """
    if "LOCKED" in bg.name.upper():
        return None
    hook = _filename_to_hook(bg)
    print(f"    → Hook: {hook}")
    return hook


# ── Grok AI hook variation (for reposts) ──────────────────────────────────────

def _grok_new_hook(filename_text: str, prior_hooks: list) -> str:
    """Call xAI Grok to generate a fresh hook variation for a reposted video."""
    if not GROK_API_KEY:
        return filename_text  # fallback: reuse filename text

    prior_str = "\n".join(f"- {h}" for h in prior_hooks) if prior_hooks else "None"
    prompt = (
        f"You write short, punchy social media hooks for the MR. WORKOUT fitness app.\n"
        f"Video topic: {filename_text}\n"
        f"Prior hooks already used (do NOT repeat these):\n{prior_str}\n\n"
        f"Write ONE new hook (max 15 words) that:\n"
        f"- Mentions MR. WORKOUT naturally mid-sentence\n"
        f"- Uses a POV, Savage Coach, or humor style\n"
        f"- Opens with the drama, not the brand name\n"
        f"Reply with ONLY the hook text, no quotes, no explanation."
    )
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model":       "grok-3-mini",
                "messages":    [{"role": "user", "content": prompt}],
                "max_tokens":  60,
                "temperature": 0.9,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip().strip('"')
    except Exception as e:
        print(f"    ⚠  Grok hook generation failed: {e} — using filename text")
        return filename_text


# ── Repost candidate selection ────────────────────────────────────────────────

REPOST_DAYS = 30


def _find_repost_candidate() -> Optional[dict]:
    """
    Return the post_log entry for a video not posted in the last 30 days,
    or None if no eligible candidate exists.

    Groups by filename, uses the most-recent timestamp per file.
    """
    post_log = _load_post_log()
    if not post_log["posts"]:
        return None

    now = datetime.now(timezone.utc)

    # Latest timestamp per filename
    latest: dict = {}
    for entry in post_log["posts"]:
        fn  = entry["filename"]
        ts  = datetime.fromisoformat(entry["timestamp"])
        if fn not in latest or ts > latest[fn]["ts"]:
            latest[fn] = {"ts": ts, "entry": entry}

    eligible = [
        v["entry"]
        for v in latest.values()
        if (now - v["ts"]).days >= REPOST_DAYS
    ]

    if not eligible:
        return None

    return random.choice(eligible)


# ── Temp file cleanup ─────────────────────────────────────────────────────────

def _cleanup_temp(paths: list) -> None:
    for p in paths:
        try:
            p = Path(p)
            if p.exists():
                p.unlink()
                print(f"    🗑  Deleted temp: {p.name}")
        except Exception as e:
            print(f"    ⚠  Could not delete {p.name}: {e}")


def pick_unused_tip(history: dict) -> dict:
    used = set(history.get("used_hooks", []))
    available = [t for t in TIPS if t["hook"] not in used]
    if not available:
        # Full rotation complete — reset
        print("  ℹ  All tips used — resetting rotation")
        history["used_hooks"] = []
        available = TIPS
    tip = random.choice(available)
    history["used_hooks"].append(tip["hook"])
    return tip


def pick_unused_video(history: dict) -> Path:
    all_vids = sorted(ARMOURY_DIR.glob("*.mp4"))
    used     = set(history.get("used_videos", []))
    available = [v for v in all_vids if v.name not in used]
    if not available:
        print("  ℹ  All videos used — resetting video rotation")
        history["used_videos"] = []
        available = all_vids
    vid = random.choice(available)
    history["used_videos"].append(vid.name)
    return vid


# ── ElevenLabs voiceover ──────────────────────────────────────────────────────

MIN_AUDIO_BYTES = 80_000
MAX_RETRIES     = 3


def generate_voiceover(script: str, out_path: Path) -> Optional[Path]:
    if out_path.exists():
        out_path.unlink()

    ssml = f'<speak>{script.strip()}<break time="1.5s"/></speak>'

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"    → ElevenLabs attempt {attempt}/{MAX_RETRIES}…")
        try:
            resp = requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
                headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
                json={
                    "text":     ssml,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability":        0.60,
                        "similarity_boost": 0.80,
                        "style":            0.00,
                        "use_speaker_boost": True,
                    },
                },
                timeout=60,
            )
            resp.raise_for_status()
            audio = resp.content
            if len(audio) < MIN_AUDIO_BYTES:
                print(f"    ✗ Too small ({len(audio)//1024} KB) — retrying")
                if attempt < MAX_RETRIES:
                    time.sleep(4)
                continue
            out_path.write_bytes(audio)
            print(f"    ✓ Voiceover — {len(audio)//1024} KB ✅")
            return out_path
        except requests.HTTPError as e:
            print(f"    ✗ HTTP {e.response.status_code}: {e.response.text[:80]}")
            if attempt < MAX_RETRIES:
                time.sleep(4)
    return None


# ── Video assembly ────────────────────────────────────────────────────────────

def load_font(size):
    _home = str(Path.home() / "Library/Fonts")
    for path in [
        f"{_home}/Montserrat-ExtraBold.ttf",
        f"{_home}/Montserrat-Black.ttf",
        f"{_home}/BebasNeue-Regular.ttf",
        f"{_home}/Bebas Neue Regular.ttf",
        f"{_home}/ArchivoBlack-Regular.ttf",
        "/Library/Fonts/Montserrat-ExtraBold.ttf",
        "/Library/Fonts/Montserrat-Black.ttf",
        "/Library/Fonts/BebasNeue-Regular.ttf",
        "/Library/Fonts/ArchivoBlack-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def grade(frame):
    img  = Image.fromarray(frame)
    img  = Image.blend(img, img.convert("L").convert("RGB"), 0.32)
    img  = ImageEnhance.Contrast(img).enhance(1.22)
    arr  = np.array(img, dtype=np.float32)
    dark = (1.0 - arr.mean(axis=2, keepdims=True) / 255.0) ** 2
    arr[:, :, 2] = np.clip(arr[:, :, 2] + dark[:, :, 0] * 28, 0, 255)
    arr[:, :, 0] = np.clip(arr[:, :, 0] - dark[:, :, 0] * 10, 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))
    vig = Image.new("L", img.size, 0)
    vd  = ImageDraw.Draw(vig)
    w, h = img.size
    for i in range(150):
        vd.ellipse([i, i, w - i, h - i], fill=min(int(i * 1.3), 150))
    vig = vig.filter(ImageFilter.GaussianBlur(70))
    vig = Image.eval(vig, lambda x: 150 - x)
    img.paste(Image.new("RGB", img.size, (0, 0, 0)), mask=vig)
    return np.array(img)


def text_layer(text, font, y_frac, max_width=OUT_W - 120):
    img   = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(img)
    words = text.lower().split()
    lines, cur, cw = [], [], 0
    for w in words:
        ww = font.getbbox(w + " ")[2]
        if cw + ww > max_width and cur:
            lines.append(cur); cur = [w]; cw = ww
        else:
            cur.append(w); cw += ww
    if cur:
        lines.append(cur)
    lh      = font.size + 22
    total_h = lh * len(lines)
    y       = int(OUT_H * y_frac) - total_h // 2
    for line in lines:
        line_text = " ".join(line)
        lw = font.getbbox(line_text)[2]
        x  = (OUT_W - lw) // 2
        # Subtle drop shadow
        draw.text((x + 6, y + 6), line_text, font=font, fill=(0, 0, 0, 110))
        # White text with thick black stroke
        draw.text((x, y), line_text, font=font,
                  fill=(255, 255, 255, 255),
                  stroke_width=4, stroke_fill=(0, 0, 0, 255))
        y += lh
    return np.array(img)


def _word_pop_clips(text: str, font, y_frac: float, total_duration: float) -> list:
    """Split text into 2-word chunks — each pops in sequence for a beat-sync effect."""
    words  = text.lower().split()
    chunks = [" ".join(words[i:i+2]) for i in range(0, len(words), 2)]
    if not chunks:
        return [ImageClip(text_layer(text, font, y_frac)).set_duration(total_duration)]
    time_each = total_duration / len(chunks)
    clips = []
    for i, chunk in enumerate(chunks):
        c = (ImageClip(text_layer(chunk, font, y_frac))
             .set_start(i * time_each)
             .set_duration(time_each + 0.05)
             .crossfadein(0.08).crossfadeout(0.08))
        clips.append(c)
    return clips


def cta_layer(font):
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "LINK IN BIO ↑"
    bbox = font.getbbox(text)
    tw   = bbox[2] - bbox[0]
    th   = bbox[3] - bbox[1]
    px, py = 36, 16
    rx = (OUT_W - tw) // 2 - px
    ry = int(OUT_H * 0.90) - py
    draw.rounded_rectangle([rx, ry, rx + tw + px*2, ry + th + py*2],
                           radius=20, fill=(255, 215, 0, 255))
    draw.text((rx + px, ry + py), text, font=font, fill=(0, 0, 0, 255))
    return np.array(img)


def wm_layer(font):
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "MR. WORKOUT"
    bbox = font.getbbox(text)
    x = OUT_W - (bbox[2] - bbox[0]) - 36
    draw.text((x + 2, 42), text, font=font, fill=(0, 0, 0, 110))
    draw.text((x,     40), text, font=font, fill=(255, 255, 255, 150))
    return np.array(img)


def build_video(bg_path: Path, vo_path: Path, tip: dict, out_path: Path):
    audio    = AudioFileClip(str(vo_path))
    duration = audio.duration

    # Background
    raw   = VideoFileClip(str(bg_path)).without_audio()
    scale = max(OUT_W / raw.w, OUT_H / raw.h)
    tw, th = int(raw.w * scale), int(raw.h * scale)
    x1 = (tw - OUT_W) // 2
    y1 = (th - OUT_H) // 2

    def process(frame):
        img = Image.fromarray(frame).resize((tw, th), Image.LANCZOS)
        arr = np.array(img)[y1:y1+OUT_H, x1:x1+OUT_W]
        if arr.shape[0] < OUT_H or arr.shape[1] < OUT_W:
            arr = np.array(Image.fromarray(arr).resize((OUT_W, OUT_H), Image.LANCZOS))
        return grade(arr)

    bg = raw.fl_image(process)
    if bg.duration < duration:
        reps = int(np.ceil(duration / bg.duration))
        bg   = concatenate_videoclips([bg] * reps)
    bg = bg.subclip(0, duration)

    font_lg = load_font(90)
    font_md = load_font(52)
    font_sm = load_font(36)

    hook_duration = min(6.0, duration)
    hook_clips    = _word_pop_clips(tip["hook"], font_lg, 0.50, hook_duration)

    body_clip = (
        ImageClip(text_layer(tip["body"], font_md, 0.72))
        .set_start(6.0)
        .set_duration(max(duration - 10.0, 2.0))
        .crossfadein(0.3).crossfadeout(0.3)
    ) if duration > 9 else None

    cta_start = max(duration - 4.0, duration * 0.75)
    cta_clip  = (
        ImageClip(cta_layer(font_lg))
        .set_start(cta_start)
        .set_duration(duration - cta_start)
        .crossfadein(0.3)
    )
    wm_clip = ImageClip(wm_layer(font_sm)).set_duration(duration)

    layers = [bg] + hook_clips + [wm_clip, cta_clip]
    if body_clip:
        layers.insert(-2, body_clip)

    final = CompositeVideoClip(layers, size=(OUT_W, OUT_H)).set_audio(audio)
    final.write_videofile(
        str(out_path), fps=FPS,
        codec="libx264", audio_codec="aac",
        bitrate="6000k", audio_bitrate="192k",
        ffmpeg_params=["-crf", "20", "-pix_fmt", "yuv420p"],
        preset="fast", logger=None,
    )
    print(f"    ✓ Video — {out_path.stat().st_size / 1_048_576:.1f} MB")


# ── Zernio distribution ───────────────────────────────────────────────────────
# Old custom Instagram/TikTok/YouTube uploaders archived in:
#   archive_custom_uploads/custom_uploaders.py

ZERNIO_BASE = "https://zernio.com/api/v1"


def _zernio_headers() -> dict:
    return {
        "Authorization": f"Bearer {ZERNIO_API_KEY}",
        "Content-Type":  "application/json",
    }


def _zernio_accounts() -> dict:
    """Return {platform: accountId} for all connected Zernio accounts."""
    resp = requests.get(
        f"{ZERNIO_BASE}/accounts",
        headers=_zernio_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return {a["platform"]: a["_id"] for a in resp.json().get("accounts", [])}


def upload_to_all(
    video_path: Path,
    caption: str,
    title: str,
    description: str = "",
    tags: Optional[list] = None,
    scheduled_for: str = "",
) -> dict:
    """
    Schedule a video on Instagram (Reel), TikTok (video), YouTube Short via Zernio.

    scheduled_for – ISO 8601 UTC string, e.g. '2026-05-11T13:00:00Z'.
                    Required; publishNow is never used.

    Flow (Zernio 2026 docs):
      1. POST /media/presign   → uploadUrl (for PUT) + publicUrl (for post)
      2. PUT  <uploadUrl>      → direct upload, no auth header
      3. GET  /accounts        → resolve connected accountIds automatically
      4. POST /posts           → scheduledFor with platform-specific postType
    """
    if not ZERNIO_API_KEY:
        print("    ⚠  ZERNIO_API_KEY not set — video saved locally only")
        return {"status": "skipped"}

    file_size = video_path.stat().st_size

    # ── Step 1: request presigned URL ─────────────────────────────────────────
    print("    → Zernio: requesting presigned upload URL…")
    presign_resp = requests.post(
        f"{ZERNIO_BASE}/media/presign",
        headers=_zernio_headers(),
        json={
            "filename":    os.path.basename(video_path),
            "contentType": "video/mp4",
        },
        timeout=30,
    )
    if not presign_resp.ok:
        print(f"    ✗ Presign failed {presign_resp.status_code}: {presign_resp.text[:120]}")
        return {"status": f"presign_error_{presign_resp.status_code}"}

    presign    = presign_resp.json()
    upload_url = presign["uploadUrl"]
    public_url = presign["publicUrl"]
    print(f"    ✓ Presign OK ({file_size / 1_048_576:.1f} MB) — uploading…")

    # ── Step 2: PUT file directly to presigned URL (no auth needed) ───────────
    with open(video_path, "rb") as f:
        put_resp = requests.put(
            upload_url,
            data=f,
            headers={"Content-Type": "video/mp4"},
            timeout=300,
        )
    if not put_resp.ok:
        print(f"    ✗ File PUT failed {put_resp.status_code}")
        return {"status": f"upload_error_{put_resp.status_code}"}
    print(f"    ✓ Upload complete → {public_url[:72]}…")

    # ── Step 3: discover connected account IDs ────────────────────────────────
    try:
        account_map = _zernio_accounts()
    except Exception as e:
        print(f"    ✗ accounts.getAccounts failed: {e}")
        return {"status": f"accounts_error: {e}"}

    # Platform-specific post types per Zernio docs
    yt_description = f"{description}\n#shorts".strip() if description else "#shorts"
    _platform_config = {
        "instagram": {"postType": "REEL"},
        "tiktok":    {"postType": "VIDEO"},
        "youtube":   {
            "postType":           "SHORT",
            "youtubeTitle":       f"MR. WORKOUT - {title}"[:100],
            "description":        yt_description,
            "tags":               tags or [],
            "youtube_visibility": "public",
            "youtube_shorts":     True,
        },
    }

    platforms = []
    for platform, extra in _platform_config.items():
        acct_id = account_map.get(platform)
        if acct_id:
            platforms.append({
                "platform":             platform,
                "accountId":            acct_id,
                "platformSpecificData": extra,
            })
        else:
            print(f"    ⚠  No {platform} account found in Zernio — skipping")

    if not platforms:
        print("    ✗ No accounts resolved — connect them at zernio.com/dashboard")
        return {"status": "no_accounts"}

    platform_names = ", ".join(p["platform"].capitalize() for p in platforms)
    print(f"    → Posting to  : {platform_names}")
    print(f"    → Scheduled   : {scheduled_for}")

    # ── Step 4: posts.createPost ──────────────────────────────────────────────
    payload = {
        "content":      caption,
        "scheduledFor": scheduled_for,
        "platforms":    platforms,
        "mediaItems":   [{"type": "video", "url": public_url}],
    }
    try:
        post_resp = requests.post(
            f"{ZERNIO_BASE}/posts",
            headers=_zernio_headers(),
            json=payload,
            timeout=(10, 300),   # 10s connect, 5min read
        )
    except requests.exceptions.ReadTimeout:
        print("    ⚠  posts.createPost timed out — Zernio is still processing.")
        print("       Check zernio.com/dashboard to confirm the post was queued.")
        return {"status": "read_timeout_check_dashboard"}

    if not post_resp.ok:
        print(f"    ✗ posts.createPost failed {post_resp.status_code}: {post_resp.text[:120]}")
        return {"status": f"post_error_{post_resp.status_code}"}

    result  = post_resp.json()
    post_id = result.get("post", {}).get("_id", "?")
    print(f"    ✓ Zernio postId: {post_id}")
    for p in platforms:
        ptype = p["platformSpecificData"].get("postType", "")
        print(f"    ✓ {p['platform'].capitalize()} → {ptype}")
    return result


# ── Filename classification & hook selection for content videos ───────────────

# Vibe keywords → hook style/category filter
_VIBE_MAP = {
    "pov":          "POV",
    "savage":       "Savage",
    "reality":      "Reality",
    "flex":         "Flex",
    "couple":       "Relationship",
    "boyfriend":    "Relationship",
    "girlfriend":   "Relationship",
    "tag":          "Relationship",
    "humor":        "Humor",
    "authority":    "Authority",
    "results":      "Results",
    "motivation":   "Motivation",
}


def _classify_filename(path: Path) -> str:
    """Return 'short' (1-2 meaningful words) or 'long' (3+ words / sentence)."""
    stem  = path.stem
    words = [w for w in stem.replace("_", " ").replace("-", " ").split() if w]
    return "short" if len(words) <= 2 else "long"


def _pick_hook_for_vibe(stem: str) -> str:
    """
    Map a short filename to its closest vibe and pick a matching branded hook.
    e.g. 'pov 1' → POV hooks,  'reality' → Reality hooks.
    """
    clean = stem.lower().replace(" ", "").replace("_", "").replace("-", "").rstrip("0123456789")
    vibe  = _VIBE_MAP.get(clean, "any")

    if vibe == "Relationship":
        candidates = [h for cat, _sty, h in HS_HOOKS
                      if any(k in cat for k in ("Girlfriend", "Boyfriend", "Tag", "Savage"))]
    elif vibe == "any":
        candidates = [h for _cat, _sty, h in HS_HOOKS]
    else:
        candidates = [h for _cat, sty, h in HS_HOOKS if sty == vibe]

    if not candidates:
        candidates = [h for _cat, _sty, h in HS_HOOKS]

    return random.choice(candidates)


def _hook_for_content_video(path: Path) -> str | None:
    """
    Determine the on-screen hook for a content video:
      - 'LOCKED' anywhere in name → None (post as-is)
      - Long filename (3+ words)  → use filename text verbatim (uppercased)
      - Short filename (1-2 words) → pick themed hook from MR. WORKOUT bank
    """
    if "LOCKED" in path.name.upper():
        return None

    if _classify_filename(path) == "long":
        hook = path.stem.upper()
        print(f"    → Long filename → overlay: {hook[:60]}{'…' if len(hook) > 60 else ''}")
        return hook

    hook = _pick_hook_for_vibe(path.stem)
    print(f"    → Short filename ({path.stem!r}) → vibe hook: {hook[:60]}")
    return hook


# ── Content video pool ────────────────────────────────────────────────────────

def _pick_content_videos(n: int) -> list:
    """
    Return up to n video Paths from input_videos + output_videos.
    Falls back to archive/ if both are empty.
    Handles .mp4 and .MP4 (case-insensitive glob on macOS is fine, but we
    do both patterns for safety).
    """
    pool = []
    for d in [INPUT_VIDEOS_DIR, OUTPUT_VIDEOS_DIR]:
        if d.exists():
            pool += sorted(d.glob("*.mp4")) + sorted(d.glob("*.MP4"))

    if not pool and ARCHIVE_DIR.exists():
        pool = sorted(ARCHIVE_DIR.glob("*.mp4")) + sorted(ARCHIVE_DIR.glob("*.MP4"))

    # Deduplicate by name (macOS case-insensitive fs can double-match)
    seen, deduped = set(), []
    for p in pool:
        if p.name.lower() not in seen:
            seen.add(p.name.lower())
            deduped.append(p)

    random.shuffle(deduped)
    return deduped[:n]


# ── Next peak slot ────────────────────────────────────────────────────────────

def _next_peak_info() -> tuple:
    """
    Return (slot_label, slot_dt_utc, slot_index_0based) for the next
    upcoming UTC peak time.
    """
    now   = datetime.now(timezone.utc)
    today = now.date()
    slots = []
    for t_str in PEAK_TIMES_UTC:
        h, m = map(int, t_str.split(":"))
        dt   = datetime(today.year, today.month, today.day, h, m, tzinfo=timezone.utc)
        if dt <= now:
            dt += timedelta(days=1)
        slots.append(dt)

    next_dt  = min(slots)
    idx      = slots.index(next_dt)
    label    = PEAK_TIMES_UTC[idx]
    return label, next_dt, idx


# ── Post one content video (no voiceover) ────────────────────────────────────

def post_content_video(post_num: int, video_path: Path, today_str: str,
                        scheduled_for: str = "") -> dict:
    """
    Upload a video from input_videos / output_videos / archive.
    Applies humor overlay unless LOCKED; logs to post_log on success.
    """
    print(f"\n  ── Content Post {post_num} [{video_path.name}] {'─'*20}")

    hook        = _hook_for_content_video(video_path)
    work_dir    = OUTPUT_DIR / today_str / f"content_{post_num}"
    work_dir.mkdir(parents=True, exist_ok=True)
    temp_files  = []

    if hook is None:
        upload_path = video_path
        caption     = "MR. WORKOUT\n\nLink in bio to download 💪\n\n#mrworkout #gym #fitness"
        print("    🔒 LOCKED — posting as-is")
    else:
        humor_path  = work_dir / f"humor_{video_path.stem}.mp4"
        hs_edit_video(video_path, humor_path, hook_text=hook)
        upload_path = humor_path
        caption     = hs_generate_caption(hook)
        temp_files.append(humor_path)

    yt_tags = ["mrworkout", "gym", "fitness", "gymmotivation", "workout", "savage"]
    size_mb = upload_path.stat().st_size / 1_048_576
    print(f"\n  ✅ CONTENT VIDEO READY  ({size_mb:.1f} MB)")
    print(f"     Caption: {caption[:80]}…")

    zernio_id = "local_only"
    if ZERNIO_API_KEY:
        print("\n    → Scheduling via Zernio…")
        zernio_result = upload_to_all(
            upload_path,
            caption,
            hook or "MR. WORKOUT",
            description=caption,
            tags=yt_tags,
            scheduled_for=scheduled_for,
        )
        zernio_id = zernio_result.get("post", {}).get("_id", zernio_result.get("status", "sent"))
        upload_ok = not any(
            str(zernio_id).startswith(e)
            for e in ("presign_error", "upload_error", "post_error", "no_accounts", "accounts_error")
        )
        if upload_ok:
            if hook:
                post_log = _load_post_log()
                _record_post(post_log, video_path.name, hook, caption, str(zernio_id))
            _cleanup_temp(temp_files)
    else:
        print("\n    ℹ  ZERNIO_API_KEY not set — saved locally only.")

    return {
        "post_num":  post_num,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hook":      hook,
        "video":     video_path.name,
        "zernio_id": zernio_id,
        "status":    "done",
    }


# ── Daily 5-post batch ────────────────────────────────────────────────────────

def run_daily_batch(history: dict, today_str: str) -> None:
    """
    Full daily mix:
      Post #1      → Armoury MP4 + AI voiceover (tip-driven)
      Posts #2–5   → input_videos / output_videos (fallback: archive)
    """
    # ── Compute the 5 fixed UTC slots for today's batch ──────────────────────
    BATCH_SLOTS = ["13:00", "17:00", "21:00", "01:00", "05:00"]
    now   = datetime.now(timezone.utc)
    today = now.date()

    def _slot_dt(t_str: str, base_date) -> datetime:
        h, m  = map(int, t_str.split(":"))
        dt    = datetime(base_date.year, base_date.month, base_date.day, h, m, tzinfo=timezone.utc)
        # 01:00 and 05:00 are early-morning — always next calendar day
        if h < 8:
            dt += timedelta(days=1)
        return dt

    slots_iso = [_slot_dt(t, today).strftime("%Y-%m-%dT%H:%M:%SZ") for t in BATCH_SLOTS]

    print(f"\n{'='*60}")
    print(f"  DAILY BATCH — {today_str}")
    for label, iso in zip(BATCH_SLOTS, slots_iso):
        print(f"    {label} UTC  →  {iso}")
    print(f"{'='*60}")

    # Post 1: armoury + voiceover → 13:00
    print(f"\n  ── [1/5] ARMOURY POST (AI voiceover) → {slots_iso[0]} ──")
    make_and_post(1, history, today_str, scheduled_for=slots_iso[0])

    # Posts 2-5: content videos → 17:00, 21:00, 01:00, 05:00
    content_vids = _pick_content_videos(4)
    if not content_vids:
        print("\n  ⚠  No content videos found in input_videos / output_videos / archive.")
    for i, vid in enumerate(content_vids, start=2):
        slot_iso = slots_iso[i - 1]
        print(f"\n  ── [{i}/5] CONTENT POST → {slot_iso} ──────────────")
        post_content_video(i, vid, today_str, scheduled_for=slot_iso)
        if i < min(5, 1 + len(content_vids)):
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"  DAILY BATCH COMPLETE — {1 + len(content_vids)}/5 posts scheduled")
    print(f"{'='*60}")


# ── Single post ───────────────────────────────────────────────────────────────

def make_and_post(
    post_num: int,
    history: dict,
    today_str: str,
    bg_override: Optional[Path] = None,
    hook_override: Optional[str] = None,
    scheduled_for: str = "",
) -> dict:
    """
    Build one post and schedule via Zernio.

    bg_override   – force a specific background video (used by --repost)
    hook_override – force a specific hook text (used by --repost)
    scheduled_for – ISO 8601 UTC string for Zernio scheduling
    """
    print(f"\n  ── Post {post_num} ──────────────────────────────────────────")

    tip = pick_unused_tip(history)
    bg  = bg_override if bg_override else pick_unused_video(history)

    is_locked = "LOCKED" in bg.name.upper()
    print(f"  Video : {bg.name}{'  🔒 LOCKED' if is_locked else ''}")

    work_dir = OUTPUT_DIR / today_str / f"post_{post_num}"
    work_dir.mkdir(parents=True, exist_ok=True)

    cta    = random.choice(CTAS)
    script = f"{tip['hook']}\n\n{tip['body']}\n\n{cta}"

    # 1. Voiceover
    vo_path = generate_voiceover(script, work_dir / "voiceover.mp3")
    if not vo_path:
        return {"post_num": post_num, "status": "audio_failed"}

    # 2. Build base video
    base_path = work_dir / "final.mp4"
    print("    → Assembling base video…")
    build_video(bg, vo_path, tip, base_path)

    temp_to_delete = [base_path, vo_path]

    # 3. Hook determination → three-tier logic
    if hook_override:
        hook_used = hook_override
        print(f"    → Hook (override): {hook_used}")
    else:
        hook_used = _determine_hook(bg)  # None if LOCKED

    # 4. Overlay or pass-through
    if hook_used is None:
        # LOCKED — post base video exactly as built
        upload_path = base_path
        caption     = f"{tip['hook']}\n\n{tip['tags']}"
        print("    🔒 LOCKED — no text overlay")
    else:
        humor_path = work_dir / "humor_final.mp4"
        hs_edit_video(base_path, humor_path, hook_text=hook_used)
        upload_path = humor_path
        caption     = hs_generate_caption(hook_used)
        temp_to_delete.append(humor_path)

    # 5. Upload via Zernio
    size_mb = upload_path.stat().st_size / 1_048_576
    print(f"\n  ✅ VIDEO READY  ({size_mb:.1f} MB) → {upload_path.name}")
    print(f"     Caption : {caption[:80]}…")

    yt_tags = [t.lstrip("#") for t in tip["tags"].split()]

    if ZERNIO_API_KEY:
        print("\n    → Scheduling via Zernio…")
        zernio_result = upload_to_all(
            upload_path,
            caption,
            hook_used or tip["hook"],
            description=tip["body"],
            tags=yt_tags,
            scheduled_for=scheduled_for,
        )
        zernio_id = zernio_result.get("post", {}).get("_id", zernio_result.get("status", "sent"))
        upload_ok = not any(
            str(zernio_id).startswith(e)
            for e in ("presign_error", "upload_error", "post_error", "no_accounts", "accounts_error")
        )

        # 6. Log to post_log and clean up temp files on success
        if upload_ok:
            if hook_used:
                post_log = _load_post_log()
                _record_post(post_log, bg.name, hook_used, caption, str(zernio_id))
            _cleanup_temp(temp_to_delete)
    else:
        print("\n    ℹ  ZERNIO_API_KEY not set — video saved locally, not posted.")
        zernio_result = {}
        zernio_id     = "local_only"
        upload_ok     = False

    record = {
        "post_num":  post_num,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hook":      hook_used or tip["hook"],
        "video":     bg.name,
        "locked":    is_locked,
        "output":    str(upload_path),
        "zernio_id": zernio_id,
        "status":    "done",
    }
    history["posts"].append(record)
    save_history(history)

    print(f"  ✓ Post {post_num} complete")
    return record


# ── Batch multi-day schedule ─────────────────────────────────────────────────

def batch_schedule(today_str: str, days: int = 3) -> None:
    """
    Distribute all videos in input_videos/ across `days` × 5 UTC slots.
    Applies humor overlay (sentence-to-text for long names, vibe hook for short),
    uploads each to Zernio with the correct scheduledFor, then moves originals
    to ./archive/.
    """
    BATCH_SLOTS = ["13:00", "17:00", "21:00", "01:00", "05:00"]
    today = datetime.strptime(today_str, "%Y-%m-%d").date()

    # ── Build full slot list across N days ────────────────────────────────────
    all_slots: list = []
    for day_idx in range(days):
        base = today + timedelta(days=day_idx)
        for t_str in BATCH_SLOTS:
            h, m = map(int, t_str.split(":"))
            dt = datetime(base.year, base.month, base.day, h, m, tzinfo=timezone.utc)
            if h < 8:          # 01:00 / 05:00 are next calendar day
                dt += timedelta(days=1)
            all_slots.append({
                "day":   day_idx + 1,
                "label": t_str,
                "iso":   dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "date":  dt.strftime("%Y-%m-%d"),
            })

    # ── Collect & deduplicate input videos ────────────────────────────────────
    raw = sorted(INPUT_VIDEOS_DIR.glob("*.mp4")) + sorted(INPUT_VIDEOS_DIR.glob("*.MP4"))
    seen: set = set()
    videos: list = []
    for p in raw:
        if p.name.lower() not in seen:
            seen.add(p.name.lower())
            videos.append(p)

    if not videos:
        print("  ⚠  No videos found in input_videos/ — nothing to schedule.")
        return

    to_schedule = videos[:len(all_slots)]
    overflow    = videos[len(all_slots):]

    # ── Pre-flight schedule table ─────────────────────────────────────────────
    print(f"\n{'='*72}")
    print(f"  BATCH SCHEDULE — {len(to_schedule)} video(s) over {days} days")
    if overflow:
        print(f"  ⚠  {len(overflow)} video(s) exceed available slots (skipped):")
        for v in overflow:
            print(f"       • {v.name}")
    print(f"{'='*72}")
    print(f"\n  {'#':<4} {'Day':<6} {'Date':<13} {'UTC':>8}   Video")
    print(f"  {'─'*4} {'─'*6} {'─'*13} {'─'*8}   {'─'*45}")
    for i, (vid, slot) in enumerate(zip(to_schedule, all_slots), 1):
        print(f"  {i:<4} Day {slot['day']:<2} {slot['date']:<13} {slot['label']:>8}   {vid.name[:50]}")
    print()

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    results: list = []

    # ── Process each video ────────────────────────────────────────────────────
    for i, (video, slot) in enumerate(zip(to_schedule, all_slots), 1):
        print(f"\n{'─'*72}")
        print(f"  [{i}/{len(to_schedule)}]  Day {slot['day']} @ {slot['label']} UTC  —  {video.name[:60]}")
        print(f"{'─'*72}")

        result = post_content_video(i, video, today_str, scheduled_for=slot["iso"])
        result["day"]       = slot["day"]
        result["slot_time"] = slot["label"]
        result["slot_date"] = slot["date"]
        results.append(result)

        upload_ok = result.get("status") == "done"
        if upload_ok or not ZERNIO_API_KEY:
            dest = ARCHIVE_DIR / video.name
            if dest.exists():
                print(f"    ⚠  archive/{video.name[:50]} already exists — skipping move")
            else:
                shutil.move(str(video), str(dest))
                print(f"    📦 Archived → archive/{video.name[:50]}")

        if i < len(to_schedule):
            time.sleep(2)

    # ── Final summary table ───────────────────────────────────────────────────
    print(f"\n{'='*72}")
    print(f"  BATCH COMPLETE — {len(results)} video(s) processed")
    print(f"{'='*72}")
    print(f"\n  {'#':<4} {'Day':<6} {'Date':<13} {'UTC':>8}   {'Status':<14} Video")
    print(f"  {'─'*4} {'─'*6} {'─'*13} {'─'*8}   {'─'*14} {'─'*38}")
    for r in results:
        status = "✓ Queued" if r.get("status") == "done" else r.get("status", "?")
        print(
            f"  {r['post_num']:<4} "
            f"Day {r.get('day','?'):<2} "
            f"{r.get('slot_date','?'):<13} "
            f"{r.get('slot_time','?'):>8}   "
            f"{status:<14} "
            f"{r.get('video','?')[:38]}"
        )
    print()


# ── Repost mode ───────────────────────────────────────────────────────────────

def repost_mode(history: dict, today_str: str) -> None:
    """
    --repost: pick a video not posted in 30+ days, generate an AI hook
    variation, and post it as post #1.
    """
    print(f"\n{'='*60}")
    print(f"  REPOST MODE — finding video not posted in {REPOST_DAYS}+ days")
    print(f"{'='*60}")

    candidate = _find_repost_candidate()
    if not candidate:
        print(f"  ℹ  No eligible reposts — all videos posted within {REPOST_DAYS} days.")
        return

    filename   = candidate["filename"]
    prior_hook = candidate.get("hook", "")
    print(f"  → Candidate : {filename}")
    print(f"  → Prior hook: {prior_hook}")

    # Locate the video file
    video_path = ARMOURY_DIR / filename
    if not video_path.exists():
        # Search output dirs as fallback
        found = list(OUTPUT_DIR.rglob(filename))
        if not found:
            print(f"  ✗ Video file not found: {filename}")
            return
        video_path = found[0]

    # Generate fresh AI hook from the original hook as the topic
    post_log    = _load_post_log()
    prior_hooks = [p["hook"] for p in post_log["posts"] if p["filename"] == filename and p.get("hook")]
    new_hook    = _grok_new_hook(prior_hook or filename, prior_hooks)
    print(f"  → New AI hook: {new_hook}")

    make_and_post(1, history, today_str, bg_override=video_path, hook_override=new_hook)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Savage Master Factory")
    parser.add_argument("--count", type=int, default=1,
                        help="Number of armoury posts to generate (default: 1)")
    parser.add_argument("--daily", action="store_true",
                        help="Run the full 5-post daily mix (1 armoury + 4 content videos)")
    parser.add_argument("--repost", action="store_true",
                        help=f"Repost a video not uploaded in {REPOST_DAYS}+ days with a new AI hook")
    parser.add_argument("--batch", action="store_true",
                        help="Schedule all input_videos/ across multiple days (5 slots/day)")
    parser.add_argument("--days", type=int, default=3,
                        help="Number of days to spread --batch across (default: 3)")
    args = parser.parse_args()

    if not ELEVENLABS_API_KEY:
        sys.exit("✗ ELEVENLABS_API_KEY not set. Run: source set_env.sh")

    today_str = datetime.now().strftime("%Y-%m-%d")
    history   = load_history()

    # ── Always show next peak slot ────────────────────────────────────────────
    slot_label, slot_dt, slot_idx = _next_peak_info()
    content_vids = _pick_content_videos(4)
    # Post #1 is armoury; posts 2-5 are content videos
    if slot_idx == 0:
        next_file = f"[armoury] {pick_unused_video(history).name}"
    elif content_vids and slot_idx - 1 < len(content_vids):
        next_file = content_vids[slot_idx - 1].name
    else:
        next_file = "no content video available"

    print(f"\n  Next peak slot : {slot_label} UTC  ({slot_dt.strftime('%Y-%m-%d %H:%M')} UTC)")
    print(f"  Queued file    : {next_file}")

    if args.batch:
        batch_schedule(today_str, days=args.days)
        return

    if args.daily:
        run_daily_batch(history, today_str)
        save_history(history)
        return

    if args.repost:
        repost_mode(history, today_str)
        save_history(history)
        return

    print(f"\n{'='*60}")
    print(f"  SAVAGE MASTER FACTORY — {today_str}  ({args.count} posts)")
    print(f"  History: {len(history.get('posts', []))} previous posts")
    print(f"{'='*60}")

    results = []
    for i in range(1, args.count + 1):
        try:
            result = make_and_post(i, history, today_str)
            results.append(result)
        except Exception as e:
            print(f"  ✗ Post {i} crashed: {e}")
            results.append({"post_num": i, "status": f"crashed: {e}"})
        if i < args.count:
            time.sleep(5)

    done = sum(1 for r in results if r.get("status") == "done")
    print(f"\n{'='*60}")
    print(f"  DONE — {done}/{args.count} posts published")
    print(f"  History saved → {HISTORY_FILE}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
