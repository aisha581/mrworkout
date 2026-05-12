#!/usr/bin/env python3
"""
SAVAGE RECYCLER
===============
5 unique posts per run. Each one picks a fresh Armoury video, generates a
new Savage Tip voiceover, assembles the video, and schedules via Ayrshare.

Usage:
    source set_env.sh
    python3 savage_recycler.py

Required env vars:
    ELEVENLABS_API_KEY
    ELEVENLABS_VOICE_ID   (falls back to hardcoded default)
    AYRSHARE_API_KEY      (optional — skips scheduling if missing)

Optional:
    POST_TIME_UTC         e.g. "18:00" — defaults to 18:00 local → converted to UTC
"""

from __future__ import annotations

import os, sys, random, time, json, requests
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta, timezone
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
from moviepy.editor import (
    VideoFileClip, AudioFileClip, CompositeVideoClip,
    ImageClip, concatenate_videoclips,
)


# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT        = Path(__file__).parent.parent.parent          # project root
ARMOURY_DIR = ROOT / "public" / "videos" / "exercises"
ASSETS_DIR  = ROOT / "public" / "assets"
OUTPUT_DIR  = Path(__file__).parent / "output" / "recycler"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Credentials ───────────────────────────────────────────────────────────────

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID           = os.environ.get("ELEVENLABS_VOICE_ID", "TzXBctXOhevTjqk0P3Vj")
AYRSHARE_API_KEY   = os.environ.get("AYRSHARE_API_KEY", "")

# ── Video spec ────────────────────────────────────────────────────────────────

OUT_W, OUT_H = 1080, 1920
FPS          = 30
GOLD         = (255, 215, 0)
WHITE        = (255, 255, 255)

GOLD_WORDS = {
    "CNS", "CNS.", "CNS,", "PR", "PR.", "SOLDIER", "SAVAGE", "MISSION",
    "ARMOURY", "ARMOURY.", "RECOVERY", "RECOVERY.", "NERVOUS", "SYSTEM",
    "MR.", "WORKOUT", "WORKOUT.", "ELITE", "PROTOCOL", "OPERATOR",
}

# ── Savage Tip content pool ───────────────────────────────────────────────────
# Each entry: hook (headline), body, cta
# We track which indices have been used this run so no repeat within 5 posts.

TIPS = [
    {
        "hook": "More sets isn't more progress. More recovered sets is.",
        "body": (
            "Two sets at 95% CNS capacity outperform five sets at 60 percent. "
            "Volume without recovery is just fatigue accumulation. "
            "Mr. Workout's CNS tracker tells you when your output is actually worth it."
        ),
    },
    {
        "hook": "The first rep of a set tells you everything. Most people ignore it.",
        "body": (
            "If the first rep feels slower than last session — CNS is still recovering. "
            "Push anyway and you're digging a hole. Pull back and you're building a peak. "
            "That's the difference between smart training and just showing up."
        ),
    },
    {
        "hook": "Rest days don't recover your CNS. Sleep and nutrition do.",
        "body": (
            "You can take a full day off and still go into tomorrow's session at 50 percent "
            "if your sleep debt is real. "
            "CNS recovery isn't about time off — it's about what you do in that time."
        ),
    },
    {
        "hook": "Eccentric control isn't harder. It's smarter.",
        "body": (
            "Three seconds down. One second hold. Explosive up. "
            "That's more muscle fibre recruitment than four sloppy reps. "
            "Every move in the Mr. Workout Armoury has the right protocol. 89 of them."
        ),
    },
    {
        "hook": "Your PR isn't a weight. It's a CNS state.",
        "body": (
            "You've hit 100 kg before. But not every day. "
            "Because a PR requires your nervous system firing at near-maximum capacity. "
            "Track the score, not just the weight."
        ),
    },
    {
        "hook": "You don't overtrain muscles. You overtrain your nervous system.",
        "body": (
            "The muscle recovers in 48 hours. The CNS takes 72 to 96. "
            "That's why the second week of a hard block always feels worse. "
            "Mr. Workout flags the drop before you feel it."
        ),
    },
    {
        "hook": "Deload weeks aren't weakness. They're strategy.",
        "body": (
            "Elite athletes build deloads into every training block. "
            "It's not about going easy — it's about supercompensating. "
            "Your CNS needs the quiet to come back louder."
        ),
    },
    {
        "hook": "Sleep is the only legal performance enhancer that actually works.",
        "body": (
            "Eight hours of sleep improves reaction time, strength output, and CNS recovery "
            "more than any supplement. "
            "Mr. Workout factors your sleep quality into your daily score."
        ),
    },
]

CTAS = [
    "89 exercises in the Armoury. Every one coached. Link in bio.",
    "The CNS tracker is live in Mr. Workout. Free to try. Link in bio.",
    "Mr. Workout. Train with actual intelligence. Link in bio.",
    "Stop guessing. Start tracking. Mr. Workout. Link in bio.",
]

CAPTIONS = [
    "This is the difference between training and adapting. 🧠💀\n\n"
    "#trainingtips #GymTok #mrworkout #CNS #savage #strengthcoach #gymscience",

    "Coaches know this. Now you do too. ⚡️\n\n"
    "#gymtips #GymTok #mrworkoutapp #CNSrecovery #strength #savage #recover",

    "Smart > hard. But smart AND hard is the answer. 🔱\n\n"
    "#fitnessknowledge #GymTok #mrworkout #gymcoach #savage #CNS #personalrecord",

    "Your nervous system runs the show. Train it. 🧠\n\n"
    "#CNSrecovery #GymTok #mrworkout #savage #strengthtraining #overtraining",

    "The smartest people in the gym never look like they're trying. 💀\n\n"
    "#gymscience #GymTok #mrworkout #CNS #elitetraining #savage #gains",
]


# ── Audio helpers ─────────────────────────────────────────────────────────────

MAX_RETRIES     = 3
RETRY_DELAY_SEC = 4
MIN_AUDIO_BYTES = 80_000   # ~5s at 128kbps — tips are shorter than CNS posts


def _wrap_ssml(text: str) -> str:
    return f'<speak>{text.strip()}<break time="1.5s"/></speak>'


def _call_elevenlabs(text: str) -> bytes:
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
        json={
            "text":     _wrap_ssml(text),
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
    return resp.content


def generate_voiceover(script: str, out_path: Path):
    if out_path.exists():
        out_path.unlink()

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"    → ElevenLabs attempt {attempt}/{MAX_RETRIES}…")
        try:
            audio = _call_elevenlabs(script)
            size_kb = len(audio) / 1024
            if len(audio) < MIN_AUDIO_BYTES:
                print(f"    ✗ Too small ({size_kb:.0f} KB) — retrying…")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SEC)
                continue
            out_path.write_bytes(audio)
            print(f"    ✓ Voiceover — {size_kb:.0f} KB  ✅")
            return out_path
        except requests.HTTPError as e:
            print(f"    ✗ HTTP {e.response.status_code} — {e.response.text[:100]}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC)
    return None


# ── Visual helpers ────────────────────────────────────────────────────────────

def load_font(size: int) -> ImageFont.ImageFont:
    _home = str(Path.home() / "Library/Fonts")
    for path in [
        f"{_home}/Montserrat-ExtraBold.ttf",
        f"{_home}/Montserrat-Black.ttf",
        f"{_home}/BebasNeue-Regular.ttf",
        f"{_home}/Bebas Neue Regular.ttf",
        f"{_home}/ArchivoBlack-Regular.ttf",
        "/Library/Fonts/Montserrat-ExtraBold.ttf",
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


def grade(frame: np.ndarray) -> np.ndarray:
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


def build_bg_clip(src: Path, duration: float):
    clip = VideoFileClip(str(src)).without_audio()
    scale = max(OUT_W / clip.w, OUT_H / clip.h)
    tw, th = int(clip.w * scale), int(clip.h * scale)
    x1 = (tw - OUT_W) // 2
    y1 = (th - OUT_H) // 2

    def process(frame):
        img = Image.fromarray(frame).resize((tw, th), Image.LANCZOS)
        arr = np.array(img)[y1:y1 + OUT_H, x1:x1 + OUT_W]
        if arr.shape[0] < OUT_H or arr.shape[1] < OUT_W:
            arr = np.array(Image.fromarray(arr).resize((OUT_W, OUT_H), Image.LANCZOS))
        return grade(arr)

    clip = clip.fl_image(process)
    if clip.duration < duration:
        reps = int(np.ceil(duration / clip.duration))
        clip = concatenate_videoclips([clip] * reps)
    return clip.subclip(0, duration)


def caption_frame(text: str, font: ImageFont.ImageFont) -> np.ndarray:
    img   = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(img)
    words = text.lower().split()
    lines, cur, cw = [], [], 0
    for w in words:
        ww = font.getbbox(w + " ")[2]
        if cw + ww > OUT_W - 120 and cur:
            lines.append(cur); cur = [w]; cw = ww
        else:
            cur.append(w); cw += ww
    if cur:
        lines.append(cur)
    lh      = font.size + 22
    total_h = lh * len(lines)
    y       = int(OUT_H * 0.50) - total_h // 2
    for line in lines:
        line_text = " ".join(line)
        lw = font.getbbox(line_text)[2]
        x  = (OUT_W - lw) // 2
        draw.text((x + 6, y + 6), line_text, font=font, fill=(0, 0, 0, 110))
        draw.text((x, y), line_text, font=font,
                  fill=(255, 255, 255, 255),
                  stroke_width=4, stroke_fill=(0, 0, 0, 255))
        y += lh
    return np.array(img)


def body_frame(text: str, font: ImageFont.ImageFont) -> np.ndarray:
    img   = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(img)
    words = text.lower().split()
    lines, cur, cw = [], [], 0
    for w in words:
        ww = font.getbbox(w + " ")[2]
        if cw + ww > OUT_W - 120 and cur:
            lines.append(cur); cur = [w]; cw = ww
        else:
            cur.append(w); cw += ww
    if cur:
        lines.append(cur)
    lh      = font.size + 16
    total_h = lh * len(lines)
    y       = int(OUT_H * 0.72) - total_h // 2
    for line in lines:
        line_text = " ".join(line)
        lw = font.getbbox(line_text)[2]
        x  = (OUT_W - lw) // 2
        draw.text((x + 5, y + 5), line_text, font=font, fill=(0, 0, 0, 110))
        draw.text((x, y), line_text, font=font,
                  fill=(255, 255, 255, 230),
                  stroke_width=3, stroke_fill=(0, 0, 0, 255))
        y += lh
    return np.array(img)


def watermark_frame(font: ImageFont.ImageFont) -> np.ndarray:
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "MR. WORKOUT"
    bbox = font.getbbox(text)
    x = OUT_W - (bbox[2] - bbox[0]) - 36
    y = 40
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 110))
    draw.text((x, y),         text, font=font, fill=(255, 255, 255, 150))
    return np.array(img)


def cta_frame(font: ImageFont.ImageFont, duration: float, cta_start: float) -> ImageClip:
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "LINK IN BIO ↑"
    bbox = font.getbbox(text)
    tw   = bbox[2] - bbox[0]
    pad_x, pad_y = 36, 16
    rx = (OUT_W - tw) // 2 - pad_x
    ry = int(OUT_H * 0.90) - pad_y
    rw = tw + pad_x * 2
    rh = bbox[3] - bbox[1] + pad_y * 2
    draw.rounded_rectangle([rx, ry, rx + rw, ry + rh], radius=20, fill=(255, 215, 0, 255))
    draw.text((rx + pad_x, ry + pad_y), text, font=font, fill=(0, 0, 0, 255))
    length = max(duration - cta_start, 0)
    return (
        ImageClip(np.array(img))
        .set_start(cta_start)
        .set_duration(length)
        .crossfadein(0.3)
    )


# ── Ayrshare scheduling ───────────────────────────────────────────────────────

def schedule_via_ayrshare(video_path: Path, caption: str, post_time_utc: datetime) -> dict:
    if not AYRSHARE_API_KEY:
        print("    ⚠  AYRSHARE_API_KEY not set — skipping schedule")
        return {}

    headers = {
        "Authorization": f"Bearer {AYRSHARE_API_KEY}",
        "Content-Type":  "application/json",
    }

    # Step 1: upload media to Ayrshare CDN
    print("    → Uploading to Ayrshare CDN…")
    with open(video_path, "rb") as f:
        upload_resp = requests.post(
            "https://app.ayrshare.com/api/media/upload",
            headers={"Authorization": f"Bearer {AYRSHARE_API_KEY}"},
            files={"file": (video_path.name, f, "video/mp4")},
            timeout=120,
        )
    upload_resp.raise_for_status()
    media_url = upload_resp.json().get("url") or upload_resp.json().get("mediaUrl")
    print(f"    ✓ CDN URL: {media_url[:70]}…")

    # Step 2: schedule post
    schedule_str = post_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "post":         caption,
        "platforms":    ["tiktok", "instagram"],
        "mediaUrls":    [media_url],
        "scheduleDate": schedule_str,
    }
    sched_resp = requests.post(
        "https://app.ayrshare.com/api/post",
        headers=headers,
        json=payload,
        timeout=30,
    )
    sched_resp.raise_for_status()
    result = sched_resp.json()
    print(f"    ✓ Scheduled for {schedule_str}  —  id: {result.get('id','?')}")
    return result


# ── Single post assembly ──────────────────────────────────────────────────────

def make_post(post_num: int, tip: dict, bg_path: Path, today_str: str) -> dict:
    work_dir = OUTPUT_DIR / today_str / f"post_{post_num}"
    work_dir.mkdir(parents=True, exist_ok=True)
    out_path = work_dir / "final.mp4"

    print(f"\n  ── Post {post_num}/5 ────────────────────────────────────")
    print(f"  Background : {bg_path.name}")
    print(f"  Hook       : {tip['hook'][:60]}…")

    # Build full script
    cta    = random.choice(CTAS)
    script = f"{tip['hook']}\n\n{tip['body']}\n\n{cta}"

    # Voiceover
    vo_path = generate_voiceover(script, work_dir / "voiceover.mp3")
    if not vo_path:
        print("    ✗ Skipping post — no audio")
        return {"post_num": post_num, "status": "audio_failed"}

    audio    = AudioFileClip(str(vo_path))
    duration = audio.duration

    # Video layers
    font_lg = load_font(90)
    font_md = load_font(52)
    font_sm = load_font(36)

    hook_duration = min(6.0, duration)
    words    = tip["hook"].lower().split()
    chunks   = [" ".join(words[i:i+2]) for i in range(0, len(words), 2)]
    time_each = hook_duration / max(len(chunks), 1)
    hook_clips = []
    for i, chunk in enumerate(chunks or [tip["hook"]]):
        c = (ImageClip(caption_frame(chunk, font_lg))
             .set_start(i * time_each)
             .set_duration(time_each + 0.05)
             .crossfadein(0.08).crossfadeout(0.08))
        hook_clips.append(c)

    bg       = build_bg_clip(bg_path, duration)
    headline = hook_clips  # list of word-pop clips
    body_cl  = (
        ImageClip(body_frame(tip["body"], font_md))
        .set_start(6.0)
        .set_duration(max(duration - 10.0, 2.0))
        .crossfadein(0.3).crossfadeout(0.3)
    ) if duration > 8 else None

    wm       = ImageClip(watermark_frame(font_sm)).set_duration(duration)
    cta_clip = cta_frame(font_lg, duration, max(duration - 4.0, duration * 0.75))

    layers = [bg] + headline + [wm, cta_clip]
    if body_cl:
        layers.insert(-2, body_cl)

    final = CompositeVideoClip(layers, size=(OUT_W, OUT_H)).set_audio(audio)

    print(f"    → Rendering {out_path.name}…")
    final.write_videofile(
        str(out_path), fps=FPS,
        codec="libx264", audio_codec="aac",
        bitrate="6000k", audio_bitrate="192k",
        ffmpeg_params=["-crf", "20", "-pix_fmt", "yuv420p"],
        preset="fast", logger=None,
    )

    size_mb = out_path.stat().st_size / 1_048_576
    print(f"    ✓ Rendered — {size_mb:.1f} MB")

    # Caption for social
    caption = random.choice(CAPTIONS)

    # Schedule at 6 PM UTC today + offset by post_num * 5 min so they don't clash
    post_time = datetime.now(timezone.utc).replace(
        hour=18, minute=(post_num - 1) * 5, second=0, microsecond=0
    )
    if post_time < datetime.now(timezone.utc):
        post_time += timedelta(days=1)

    schedule_result = schedule_via_ayrshare(out_path, caption, post_time)

    return {
        "post_num":    post_num,
        "hook":        tip["hook"],
        "bg":          bg_path.name,
        "output":      str(out_path),
        "size_mb":     round(size_mb, 1),
        "scheduled":   post_time.isoformat(),
        "ayrshare_id": schedule_result.get("id", "not_scheduled"),
        "status":      "done",
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    today_str = datetime.now().strftime("%Y-%m-%d")

    print(f"\n{'='*60}")
    print(f"  SAVAGE RECYCLER — {today_str}  (5 posts)")
    print(f"{'='*60}")

    # Gather all Armoury videos
    all_videos = sorted(ARMOURY_DIR.glob("*.mp4"))
    if not all_videos:
        sys.exit(f"✗ No .mp4 files found in {ARMOURY_DIR}")
    print(f"\n  Armoury: {len(all_videos)} videos available")

    # Pick 5 unique videos (shuffle so no repeats within a batch)
    bg_pool = random.sample(all_videos, min(5, len(all_videos)))

    # Pick 5 unique tips (shuffle pool, take first 5)
    tip_pool = random.sample(TIPS, min(5, len(TIPS)))

    results = []
    for i, (tip, bg) in enumerate(zip(tip_pool, bg_pool), 1):
        try:
            result = make_post(i, tip, bg, today_str)
            results.append(result)
        except Exception as e:
            print(f"  ✗ Post {i} failed: {e}")
            results.append({"post_num": i, "status": f"error: {e}"})
        # Stagger renders so ElevenLabs doesn't rate-limit
        if i < 5:
            time.sleep(3)

    # Summary
    summary_path = OUTPUT_DIR / today_str / "summary.json"
    summary_path.write_text(json.dumps(results, indent=2))

    done  = sum(1 for r in results if r.get("status") == "done")
    print(f"\n{'='*60}")
    print(f"  DONE — {done}/5 posts rendered")
    if AYRSHARE_API_KEY:
        print(f"  Scheduled on TikTok + Instagram at 18:00–18:20 UTC")
    else:
        print(f"  ⚠  Add AYRSHARE_API_KEY to set_env.sh to enable auto-scheduling")
    print(f"  Summary → {summary_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
