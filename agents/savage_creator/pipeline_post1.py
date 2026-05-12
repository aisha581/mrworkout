#!/usr/bin/env python3
"""
SAVAGE CREATOR — Post 1 Pipeline

Pillar A: CNS Emergency
Runs: Armoury video → ElevenLabs voice (verified) → MoviePy assembly → final .mp4
"""
from __future__ import annotations

import os, requests, time, glob, random
import numpy as np
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
from moviepy.editor import (
    VideoFileClip, AudioFileClip, CompositeVideoClip, ImageClip
)

# ── Config ────────────────────────────────────────────────────────────────────

GROK_API_KEY       = os.environ.get("GROK_API_KEY", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID           = "TzXBctXOhevTjqk0P3Vj"

OUT_W, OUT_H = 1080, 1920
FPS          = 30
OUTPUT       = Path(__file__).parent / "output" / "post_1_cns_emergency.mp4"
WORK_DIR     = Path(__file__).parent / "output" / "post_1_work"
WORK_DIR.mkdir(parents=True, exist_ok=True)

GOLD  = (255, 215, 0)
WHITE = (255, 255, 255)

GOLD_WORDS = {
    "CNS", "CNS.", "CNS,", "NERVOUS", "SYSTEM", "SYSTEM.",
    "MR.", "WORKOUT", "WORKOUT.", "REAL", "INTELLIGENCE.",
    "INTELLIGENCE", "ATTACK", "ATTACK.", "REAL-TIME", "REAL-TIME.",
}

SCRIPT = """Your CNS is cooked. Right now.

Not your muscles. Your nervous system.

That's why 80kg felt like 100 last Tuesday.
That's why your reps slowed down — and you pushed anyway.

Mr. Workout reads your CNS recovery score in real time.
So you know exactly when to attack — and when to pull back.

Train with actual intelligence. Link in bio."""

CAPTIONS = [
    ("YOUR CNS IS COOKED.",                           0.0,  2.2),
    ("RIGHT NOW.",                                    2.2,  1.4),
    ("NOT YOUR MUSCLES.",                             3.6,  1.8),
    ("YOUR NERVOUS SYSTEM.",                          5.4,  1.8),
    ("THAT'S WHY 80KG FELT LIKE 100 LAST TUESDAY.",  7.2,  2.6),
    ("MR. WORKOUT READS YOUR CNS IN REAL TIME.",     10.0,  2.8),
    ("KNOW WHEN TO ATTACK. KNOW WHEN TO PULL BACK.", 12.8,  2.4),
]

GROK_PROMPT = (
    "Authentic UGC gym footage, handheld camera, slight motion blur, mild shake. "
    "Male athlete mid-20s, black training gear, chalk on hands. "
    "He has just finished a heavy deadlift — bar still loaded on the floor. "
    "He stands over it, head down, breathing hard. Not performing. Actually exhausted. "
    "Tight shot from low angle — bar at bottom of frame, athlete's torso and face above it. "
    "Harsh fluorescent overhead lighting casting hard shadows under jaw and eyes. "
    "Colour grade: heavily desaturated, slightly blue-tinted shadows, deep blacks, cinematic grain. "
    "Mood: clinical urgency. Raw. Gritty. No smiling. No hype. Real fatigue. "
    "9:16 vertical frame. No text overlays. No watermarks. No studio lighting. No posed shots."
)

# ── Step 1: Pick Armoury background video ────────────────────────────────────

ARMOURY_DIR = Path(__file__).parent.parent.parent / "public" / "videos" / "exercises"

# Preferred clips for CNS Emergency pillar — heavy compound lifts
CNS_PREFERRED = [
    "barbell-deadlift.mp4",
    "barbell-sumo-deadlift.mp4",
    "romanian-deadlifts.mp4",
    "barbell-squats.mp4",
    "squat.mp4",
]

def pick_armoury_video() -> Path:
    for name in CNS_PREFERRED:
        candidate = ARMOURY_DIR / name
        if candidate.exists():
            print(f"  ✓ Armoury video: {name}")
            return candidate
    # Fallback: any available exercise video
    all_vids = glob.glob(str(ARMOURY_DIR / "*.mp4"))
    if all_vids:
        chosen = random.choice(all_vids)
        print(f"  ✓ Armoury fallback: {Path(chosen).name}")
        return Path(chosen)
    raise FileNotFoundError(f"No .mp4 files found in {ARMOURY_DIR}")


# ── Step 2: ElevenLabs voiceover with verification loop ──────────────────────

MAX_RETRIES      = 3
RETRY_DELAY_SEC  = 4

# Minimum expected bytes: 2 seconds of audio per 20 words, at 128kbps MP3
# 128kbps = 16 000 bytes/sec
_WORD_COUNT      = len(SCRIPT.split())
MIN_DURATION_SEC = max(8.0, (_WORD_COUNT / 20) * 2.0)   # never below 8s
MIN_AUDIO_BYTES  = int(MIN_DURATION_SEC * 16_000)        # 128kbps estimate


def _wrap_ssml(text: str) -> str:
    # Trim trailing whitespace, append a 1.5s pause so the voice doesn't cut off
    body = text.strip()
    return f'<speak>{body}<break time="1.5s"/></speak>'


def _call_elevenlabs() -> bytes:
    ssml_text = _wrap_ssml(SCRIPT)
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
        json={
            "text":     ssml_text,
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


def _estimate_duration_sec(audio_bytes: bytes) -> float:
    # Rough MP3 duration from file size at 128kbps
    return len(audio_bytes) / 16_000


def fetch_voiceover(force: bool = False) -> Optional[Path]:
    out = WORK_DIR / "voiceover.mp3"

    if out.exists() and not force:
        size     = out.stat().st_size
        est_dur  = _estimate_duration_sec(out.read_bytes())
        if size >= MIN_AUDIO_BYTES and est_dur >= MIN_DURATION_SEC:
            print(f"  ✓ Voiceover cached — {size/1024:.0f} KB (~{est_dur:.1f}s)")
            return out
        print(f"  ⚠  Cached audio too short ({size/1024:.0f} KB, ~{est_dur:.1f}s) — regenerating")
        out.unlink()

    if not ELEVENLABS_API_KEY:
        print("  ✗ ELEVENLABS_API_KEY not set — skipping audio")
        return None

    print(f"  ℹ  ElevenLabs key: {ELEVENLABS_API_KEY[:4]}…  |  Script: {_WORD_COUNT} words  |  Min: {MIN_DURATION_SEC:.1f}s ({MIN_AUDIO_BYTES//1000}KB)")

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"  → Attempt {attempt}/{MAX_RETRIES}  [SSML + break 1.5s]…")
        try:
            audio_bytes = _call_elevenlabs()
            size_kb     = len(audio_bytes) / 1024
            est_dur     = _estimate_duration_sec(audio_bytes)

            if len(audio_bytes) < MIN_AUDIO_BYTES or est_dur < MIN_DURATION_SEC:
                print(f"  ✗ Too short — {size_kb:.0f} KB (~{est_dur:.1f}s), need {MIN_DURATION_SEC:.1f}s — retrying…")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SEC)
                continue

            out.write_bytes(audio_bytes)
            print(f"  ✓ Verified — {size_kb:.0f} KB (~{est_dur:.1f}s)  ✅ HIGH QUALITY")
            return out

        except requests.HTTPError as e:
            print(f"  ✗ HTTP {e.response.status_code}: {e.response.text[:150]}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC)

    print(f"  ✗ All {MAX_RETRIES} attempts failed — proceeding without audio")
    return None


# ── Colour grade ──────────────────────────────────────────────────────────────

def grade(frame):
    img = Image.fromarray(frame)
    img = Image.blend(img, img.convert("L").convert("RGB"), 0.32)
    img = ImageEnhance.Contrast(img).enhance(1.22)
    arr = np.array(img, dtype=np.float32)
    dark = (1.0 - arr.mean(axis=2, keepdims=True) / 255.0) ** 2
    arr[:, :, 2] = np.clip(arr[:, :, 2] + dark[:, :, 0] * 28, 0, 255)
    arr[:, :, 0] = np.clip(arr[:, :, 0] - dark[:, :, 0] * 10, 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))
    vig = Image.new("L", img.size, 0)
    vd  = ImageDraw.Draw(vig)
    w, h = img.size
    for i in range(150):
        vd.ellipse([i, i, w-i, h-i], fill=min(int(i * 1.3), 150))
    vig = vig.filter(ImageFilter.GaussianBlur(70))
    vig = Image.eval(vig, lambda x: 150 - x)
    img.paste(Image.new("RGB", img.size, (0, 0, 0)), mask=vig)
    return np.array(img)


# ── Caption rendering ─────────────────────────────────────────────────────────

def load_font(size):
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


def caption_image(text, font):
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
        # Drop shadow
        draw.text((x + 6, y + 6), line_text, font=font, fill=(0, 0, 0, 110))
        # White with thick black stroke
        draw.text((x, y), line_text, font=font,
                  fill=(255, 255, 255, 255),
                  stroke_width=4, stroke_fill=(0, 0, 0, 255))
        y += lh
    return np.array(img)


def watermark_image(font):
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "MR. WORKOUT"
    bbox = font.getbbox(text)
    x = OUT_W - (bbox[2] - bbox[0]) - 36
    y = 40
    draw.text((x+2, y+2), text, font=font, fill=(0, 0, 0, 110))
    draw.text((x,   y),   text, font=font, fill=(255, 255, 255, 150))
    return np.array(img)


# ── Background clip builder (video or image) ─────────────────────────────────

def build_bg_clip(src: Path, duration: float):
    suffix = src.suffix.lower()

    if suffix == ".mp4":
        raw   = VideoFileClip(str(src)).without_audio()
        scale = max(OUT_W / raw.w, OUT_H / raw.h)
        tw, th = int(raw.w * scale), int(raw.h * scale)
        x1 = (tw - OUT_W) // 2
        y1 = (th - OUT_H) // 2

        def process_frame(frame):
            # Resize via PIL (avoids MoviePy's broken ANTIALIAS call)
            img = Image.fromarray(frame).resize((tw, th), Image.LANCZOS)
            arr = np.array(img)
            arr = arr[y1:y1+OUT_H, x1:x1+OUT_W]
            return grade(arr)

        from moviepy.video.VideoClip import VideoClip
        clip = raw.fl_image(process_frame)
        # Loop to fill audio duration
        if clip.duration < duration:
            from moviepy.editor import concatenate_videoclips
            reps = int(np.ceil(duration / clip.duration))
            clip = concatenate_videoclips([clip] * reps)
        return clip.subclip(0, duration)

    # Still image → Ken Burns zoom
    img   = Image.open(src).convert("RGB")
    scale = max(OUT_W / img.width, OUT_H / img.height) * 1.08
    nw    = int(img.width  * scale)
    nh    = int(img.height * scale)
    arr   = np.array(img.resize((nw, nh), Image.LANCZOS))

    def make_frame(t):
        progress = t / duration
        mx = int((nw - OUT_W) * max(0, 1 - progress * 0.45))
        my = int((nh - OUT_H) * max(0, 1 - progress * 0.45))
        crop = arr[my//2:my//2+OUT_H, mx//2:mx//2+OUT_W]
        if crop.shape[0] < OUT_H or crop.shape[1] < OUT_W:
            crop = np.array(Image.fromarray(crop).resize((OUT_W, OUT_H), Image.LANCZOS))
        return grade(crop)

    from moviepy.video.VideoClip import VideoClip
    return VideoClip(make_frame, duration=duration).set_fps(FPS)


# Keep old name as alias so nothing else breaks
build_ken_burns_clip = build_bg_clip


# ── Main assembly ─────────────────────────────────────────────────────────────

def main():
    print(f"\n{'='*55}")
    print("  SAVAGE CREATOR — Post 1: CNS EMERGENCY")
    print(f"{'='*55}\n")

    print("STEP 1: Armoury video")
    bg_path = pick_armoury_video()

    print("\nSTEP 2: ElevenLabs voiceover")
    vo_path = fetch_voiceover()

    print("\nSTEP 3: Build video")
    audio    = AudioFileClip(str(vo_path)) if vo_path and vo_path.exists() else None
    duration = audio.duration if audio else 15.0

    bg = build_bg_clip(bg_path, duration)

    font    = load_font(90)
    font_sm = load_font(36)

    clips = [bg]
    for text, start, length in CAPTIONS:
        if start + length > duration:
            continue
        frame = caption_image(text, font)
        c = (ImageClip(frame)
             .set_start(start)
             .set_duration(length)
             .crossfadein(0.2)
             .crossfadeout(0.2))
        clips.append(c)

    wm = ImageClip(watermark_image(font_sm)).set_duration(duration)
    clips.append(wm)

    final = CompositeVideoClip(clips, size=(OUT_W, OUT_H))
    if audio:
        final = final.set_audio(audio)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    print(f"\nSTEP 4: Exporting → {OUTPUT}")
    final.write_videofile(
        str(OUTPUT), fps=FPS,
        codec="libx264", audio_codec="aac",
        bitrate="8000k", audio_bitrate="192k",
        ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p"],
        preset="slow", logger="bar",
    )
    print(f"\n{'='*55}")
    print(f"  ✓ DONE — {OUTPUT}")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
