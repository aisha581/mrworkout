#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GROK MEN FACTORY
================
Daily 3-video pipeline from /Users/fs/Downloads/grok men/.

Usage:
    source set_env.sh
    python3 -u grok_men_factory.py                  # full 3-vibe batch
    python3 -u grok_men_factory.py --vibe roaster   # single vibe test
    python3 -u grok_men_factory.py --preview        # scripts only, no render
"""
from __future__ import annotations

import argparse, base64, json, os, random, re, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import (
    AudioFileClip, CompositeVideoClip, ImageClip,
    VideoFileClip, concatenate_videoclips,
)

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT              = Path(__file__).parent.parent.parent
GROK_MEN_DIR      = Path("/Users/fs/Downloads/grok men")
OUTPUT_DIR        = Path(__file__).parent / "output" / "grok_men"
OUTPUT_VIDEOS_DIR = ROOT / "output_videos"
HISTORY_FILE      = Path(__file__).parent / "grok_men_history.json"
POST_STATE        = Path(__file__).parent / "post_state.json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


# ── Verbose logger (always flushes — no buffering surprises) ──────────────────

def log(msg: str = "") -> None:
    print(msg, flush=True)

# ── Credentials ───────────────────────────────────────────────────────────────

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID           = os.environ.get("ELEVENLABS_VOICE_ID", "TzXBctXOhevTjqk0P3Vj")
ZERNIO_API_KEY     = os.environ.get("ZERNIO_API_KEY", "")
GROK_API_KEY       = os.environ.get("GROK_API_KEY", "")

# ── Video spec ────────────────────────────────────────────────────────────────

OUT_W, OUT_H = 1080, 1920
FPS          = 30

# ── Vibe definitions ──────────────────────────────────────────────────────────

VIBES = {
    "roaster": {
        "label":      "The Roaster",
        "micro_cta":  "save this before you forget.",
        "end_line1":  "comment ROAST",
        "end_line2":  "download mr. workout. we're done here.",
        "voice_settings": {
            "stability": 0.35, "similarity_boost": 0.75,
            "style": 0.65, "use_speaker_boost": True,
        },
        "system": (
            "You write punchy, sarcastic, slightly aggressive 'tough love' fitness scripts "
            "for the MR. WORKOUT app. Tone: brutally honest best friend — funny, roasting, never cruel.\n\n"
            "Script rules:\n"
            "- 65-80 words total (about 30 seconds of speech)\n"
            "- Open with a sarcastic roast of their gym struggle (first sentence)\n"
            "- Mention 'MR. WORKOUT' naturally once in the MIDDLE (around sentence 3-4) — "
            "as the solution to their problem, e.g. 'that's why MR. WORKOUT exists'\n"
            "- End with EXACTLY this line: 'comment ROAST and train with MR. WORKOUT. we're done here.'\n"
            "- Do NOT add a save/share CTA — that's a visual overlay\n"
            "- No hashtags, no emojis, no markdown, no stage directions"
        ),
    },
    "storyteller": {
        "label":      "The Storyteller",
        "micro_cta":  "save this. you'll need it.",
        "end_line1":  "download mr. workout now.",
        "end_line2":  "your chapter two starts today.",
        "voice_settings": {
            "stability": 0.70, "similarity_boost": 0.80,
            "style": 0.15, "use_speaker_boost": True,
        },
        "system": (
            "You write emotional, cinematic fitness scripts for the MR. WORKOUT app. "
            "Tone: movie narrator — calm, measured, powerful Hero's Journey.\n\n"
            "Script rules:\n"
            "- 65-80 words total (about 30 seconds of speech)\n"
            "- Open with a short scene: a person, a gym, a silent struggle (first 2 sentences)\n"
            "- Mention 'MR. WORKOUT' once in the MIDDLE as the system that changed everything, "
            "e.g. 'then they found MR. WORKOUT'\n"
            "- End with EXACTLY this line: 'download MR. WORKOUT now. your chapter two starts today.'\n"
            "- Do NOT add a save/share CTA — that's a visual overlay\n"
            "- No hashtags, no emojis, no markdown, no stage directions"
        ),
    },
    "chaos": {
        "label":      "The Chaos",
        "micro_cta":  "save this or regret it. we do not miss here.",
        "end_line1":  "comment FAHHHHH",
        "end_line2":  "to train with mr. workout. do it now.",
        "voice_settings": {
            "stability": 0.20, "similarity_boost": 0.70,
            "style": 0.90, "use_speaker_boost": True,
        },
        "system": (
            "You write high-energy, chaotic, weird-funny fitness scripts for the MR. WORKOUT app. "
            "Tone: unhinged gym bro meets internet meme — fast, absurdist, self-aware.\n\n"
            "Script rules:\n"
            "- 65-80 words total (about 30 seconds of speech)\n"
            "- Open with something chaotic or unexpected (weird scenario, fake emergency)\n"
            "- Mention 'MR. WORKOUT' once in the MIDDLE in an unhinged but clear way, "
            "e.g. 'bro just download MR. WORKOUT already'\n"
            "- End with EXACTLY this line: 'comment FAHHHHH to train with MR. WORKOUT. do it now.'\n"
            "- Do NOT add a save/share CTA — that's a visual overlay\n"
            "- No hashtags, no emojis, no markdown, no stage directions"
        ),
    },
}

VIBE_ORDER = ["roaster", "storyteller", "chaos"]

# ── History (no-repeat video rotation) ───────────────────────────────────────

def load_history() -> dict:
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return {"used_videos": [], "posts": []}


def save_history(h: dict) -> None:
    HISTORY_FILE.write_text(json.dumps(h, indent=2))


def pick_videos(n: int, history: dict) -> list[Path]:
    exts = ("*.mp4", "*.MP4", "*.mov", "*.MOV")
    pool = []
    for ext in exts:
        pool += list(GROK_MEN_DIR.glob(ext))

    used = set(history.get("used_videos", []))
    available = [p for p in pool if p.name not in used]
    if len(available) < n:
        log(f"  ℹ  Rotation reset — all {len(pool)} videos used")
        history["used_videos"] = []
        available = pool

    chosen = random.sample(available, min(n, len(available)))
    history["used_videos"] += [p.name for p in chosen]
    return chosen


# ── Grok script generation ────────────────────────────────────────────────────

def generate_script(vibe_key: str) -> str:
    vibe = VIBES[vibe_key]
    if not GROK_API_KEY:
        return f"you skipped leg day again. mr. workout sees you. comment {vibe['end_keyword']} for the program."

    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model":       "grok-3",
                "messages":    [
                    {"role": "system", "content": vibe["system"]},
                    {"role": "user",   "content": "Write the script now."},
                ],
                "max_tokens":  200,
                "temperature": 0.9,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        log(f"    ⚠  Grok script failed ({vibe_key}): {e} — using fallback")
        return (
            f"bro. you've been lifting for months and nothing changed. "
            f"that's a plan problem. mr. workout fixes that. "
            f"comment {vibe['end_keyword']} for the program."
        )


# ── ElevenLabs with-timestamps voiceover ─────────────────────────────────────

def generate_voiceover_with_timestamps(script: str, vibe_key: str, out_path: Path) -> Optional[dict]:
    """
    Returns {"audio_path": Path, "words": [{"word", "start", "end"}, ...]}
    or None on failure.
    """
    vibe = VIBES[vibe_key]
    url  = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/with-timestamps"

    for attempt in range(1, 4):
        log(f"    → ElevenLabs (timestamps) attempt {attempt}/3…")
        try:
            resp = requests.post(
                url,
                headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
                json={
                    "text":           script,
                    "model_id":       "eleven_multilingual_v2",
                    "voice_settings": vibe["voice_settings"],
                },
                timeout=60,
            )
            resp.raise_for_status()
            data       = resp.json()
            audio_b64  = data["audio_base64"]
            audio_bytes = base64.b64decode(audio_b64)
            out_path.write_bytes(audio_bytes)
            words = _parse_word_timestamps(data["alignment"])
            log(f"    ✓ Voiceover — {len(audio_bytes)//1024} KB, {len(words)} words timed")
            return {"audio_path": out_path, "words": words}
        except Exception as e:
            log(f"    ✗ Attempt {attempt} failed: {e}")
            if attempt < 3:
                time.sleep(4)
    return None


def _parse_word_timestamps(alignment: dict) -> list:
    """Convert ElevenLabs character-level alignment → word-level timing."""
    chars  = alignment.get("characters", [])
    starts = alignment.get("character_start_times_seconds", [])
    ends   = alignment.get("character_end_times_seconds", [])

    words, cur, w_start, w_end = [], [], None, None
    for ch, s, e in zip(chars, starts, ends):
        if ch in (" ", "\n", "\r"):
            if cur:
                words.append({"word": "".join(cur), "start": w_start, "end": w_end})
                cur, w_start, w_end = [], None, None
        else:
            if not cur:
                w_start = s
            cur.append(ch)
            w_end = e
    if cur:
        words.append({"word": "".join(cur), "start": w_start, "end": w_end})
    return words


def _group_words(words: list, size: int = 2) -> list:
    """Group word timestamps into short phrases for Hormozi-style display."""
    groups = []
    for i in range(0, len(words), size):
        chunk = words[i:i + size]
        groups.append({
            "text":  " ".join(w["word"] for w in chunk),
            "start": chunk[0]["start"],
            "end":   chunk[-1]["end"],
        })
    return groups


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


# ── Frame renderers ───────────────────────────────────────────────────────────

def _centered_text_frame(
    text: str, font: ImageFont.FreeTypeFont,
    y_frac: float, alpha: int = 255,
) -> np.ndarray:
    """Lowercase, centered, thick stroke, drop shadow."""
    img   = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(img)
    words = text.lower().split()
    max_w = OUT_W - 120

    lines, cur, cw = [], [], 0
    for w in words:
        ww = font.getbbox(w + " ")[2]
        if cw + ww > max_w and cur:
            lines.append(cur); cur, cw = [w], ww
        else:
            cur.append(w); cw += ww
    if cur:
        lines.append(cur)

    lh      = font.size + 18
    total_h = lh * len(lines)
    y       = int(OUT_H * y_frac) - total_h // 2

    for line in lines:
        lt = " ".join(line)
        lw = font.getbbox(lt)[2]
        x  = (OUT_W - lw) // 2
        draw.text((x + 5, y + 5), lt, font=font, fill=(0, 0, 0, 100))
        draw.text((x, y), lt, font=font,
                  fill=(255, 255, 255, alpha),
                  stroke_width=4, stroke_fill=(0, 0, 0, 255))
        y += lh
    return np.array(img)


def _subtitle_frame(text: str, font: ImageFont.FreeTypeFont) -> np.ndarray:
    """Hormozi-style subtitle — large, centered, clear of the gold pill zone (bottom 20%)."""
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    t    = text.lower().strip().rstrip(".,!?")
    bbox = font.getbbox(t)
    tw   = bbox[2] - bbox[0]
    x    = (OUT_W - tw) // 2
    y    = int(OUT_H * 0.68)   # sits above micro-CTA (0.86) and end CTA (0.88+)
    draw.text((x + 5, y + 5), t, font=font, fill=(0, 0, 0, 120))
    draw.text((x, y), t, font=font,
              fill=(255, 255, 255, 255),
              stroke_width=5, stroke_fill=(0, 0, 0, 255))
    return np.array(img)


def _midroll_frame(font: ImageFont.FreeTypeFont) -> np.ndarray:
    """Bold gold 'MR. WORKOUT' text pop — center frame, mid-roll brand hit."""
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "mr. workout"
    bbox = font.getbbox(text)
    tw   = bbox[2] - bbox[0]
    x    = (OUT_W - tw) // 2
    y    = int(OUT_H * 0.44)
    draw.text((x + 6, y + 6), text, font=font, fill=(0, 0, 0, 140))
    draw.text((x, y), text, font=font,
              fill=(255, 215, 0, 255),
              stroke_width=5, stroke_fill=(0, 0, 0, 255))
    return np.array(img)


def _micro_cta_frame(text: str, font: ImageFont.FreeTypeFont) -> np.ndarray:
    """Gold pill badge — centered mid-frame."""
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    t    = text.lower()
    bbox = font.getbbox(t)
    tw   = bbox[2] - bbox[0]
    th   = bbox[3] - bbox[1]
    px, py = 40, 20
    rx = (OUT_W - tw) // 2 - px
    ry = int(OUT_H * 0.86) - py
    draw.rounded_rectangle(
        [rx, ry, rx + tw + px * 2, ry + th + py * 2],
        radius=22, fill=(255, 215, 0, 230),
    )
    draw.text((rx + px, ry + py), t, font=font, fill=(0, 0, 0, 255))
    return np.array(img)


def _end_cta_frame(line1: str, line2: str,
                   font_lg: ImageFont.FreeTypeFont,
                   font_sm: ImageFont.FreeTypeFont) -> np.ndarray:
    """Two-line end CTA — line1 in gold (large), line2 in white (small)."""
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for font, text, y_frac, color in [
        (font_lg, line1.lower(), 0.87, (255, 215, 0, 255)),
        (font_sm, line2.lower(), 0.93, (255, 255, 255, 230)),
    ]:
        bbox = font.getbbox(text)
        tw   = bbox[2] - bbox[0]
        x    = (OUT_W - tw) // 2
        y    = int(OUT_H * y_frac)
        draw.text((x + 4, y + 4), text, font=font, fill=(0, 0, 0, 120))
        draw.text((x, y), text, font=font,
                  fill=color, stroke_width=3, stroke_fill=(0, 0, 0, 255))
    return np.array(img)


def _wm_frame(font: ImageFont.FreeTypeFont) -> np.ndarray:
    img  = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "MR. WORKOUT"
    bbox = font.getbbox(text)
    x    = OUT_W - (bbox[2] - bbox[0]) - 36
    draw.text((x + 2, 42), text, font=font, fill=(0, 0, 0, 100))
    draw.text((x, 40),     text, font=font, fill=(255, 255, 255, 140))
    return np.array(img)


# ── Video background processor ────────────────────────────────────────────────

def _prepare_bg(video_path: Path, duration: float) -> VideoFileClip:
    raw   = VideoFileClip(str(video_path)).without_audio()
    scale = max(OUT_W / raw.w, OUT_H / raw.h)
    tw, th = int(raw.w * scale), int(raw.h * scale)
    x1 = (tw - OUT_W) // 2
    y1 = (th - OUT_H) // 2

    def crop(frame):
        img = Image.fromarray(frame).resize((tw, th), Image.LANCZOS)
        arr = np.array(img)[y1:y1 + OUT_H, x1:x1 + OUT_W]
        if arr.shape[0] < OUT_H or arr.shape[1] < OUT_W:
            arr = np.array(Image.fromarray(arr).resize((OUT_W, OUT_H), Image.LANCZOS))
        return arr

    bg = raw.fl_image(crop)
    if bg.duration < duration:
        reps = int(np.ceil(duration / bg.duration))
        bg   = concatenate_videoclips([bg] * reps)
    return bg.subclip(0, duration)


# ── Main video builder ────────────────────────────────────────────────────────

def build_video(
    bg_path: Path,
    vo_data: dict,
    vibe_key: str,
    hook_text: str,       # noqa: ARG001 — not shown in grok men, footage is the star
    out_path: Path,
) -> None:
    vibe    = VIBES[vibe_key]
    audio   = AudioFileClip(str(vo_data["audio_path"]))
    dur     = audio.duration
    groups  = _group_words(vo_data["words"], size=2)

    font_lg = load_font(72)
    font_md = load_font(46)
    font_sm = load_font(36)

    bg = _prepare_bg(bg_path, dur)

    # ── End CTA window (subtitles are suppressed here) ────────────────────────
    end_start = max(dur - 4.5, dur * 0.80)

    # ── Hormozi subtitles — word-by-word, stop before end CTA ────────────────
    sub_clips = []
    for g in groups:
        if g["start"] >= end_start:
            break                      # don't overlap the end CTA zone
        g_dur = min(max(g["end"] - g["start"], 0.08), end_start - g["start"])
        c = (ImageClip(_subtitle_frame(g["text"], font_lg))
             .set_start(g["start"])
             .set_duration(g_dur)
             .crossfadein(0.03).crossfadeout(0.03))
        sub_clips.append(c)

    # ── Micro-CTA badge — t=5s, 3s duration ──────────────────────────────────
    micro_start = min(5.0, dur * 0.30)
    micro_clip  = (
        ImageClip(_micro_cta_frame(vibe["micro_cta"], font_md))
        .set_start(micro_start).set_duration(3.0)
        .crossfadein(0.2).crossfadeout(0.2)
    )

    # ── Mid-roll brand pop — t=10s, 1.8s, gold "mr. workout" ─────────────────
    midroll_start = min(10.0, dur * 0.40)
    midroll_clip  = (
        ImageClip(_midroll_frame(load_font(80)))
        .set_start(midroll_start).set_duration(1.8)
        .crossfadein(0.1).crossfadeout(0.1)
    )

    # ── End CTA — last 4.5s, strong closer ───────────────────────────────────
    end_clip = (
        ImageClip(_end_cta_frame(vibe["end_line1"], vibe["end_line2"], font_lg, font_sm))
        .set_start(end_start).set_duration(dur - end_start)
        .crossfadein(0.3)
    )

    # ── Watermark — full duration ─────────────────────────────────────────────
    wm_clip = ImageClip(_wm_frame(font_sm)).set_duration(dur)

    # No hook clip — footage is the star for Grok Men
    layers = (
        [bg]
        + sub_clips
        + [micro_clip, midroll_clip, wm_clip, end_clip]
    )

    log(f"\n  ██ STARTING RENDER — {out_path.name}")
    log(f"     vibe={vibe_key}  dur={dur:.1f}s  subtitles={len(sub_clips)}")
    log(f"     mid-roll brand pop @ t={midroll_start:.1f}s  |  end CTA @ t={end_start:.1f}s")

    final = CompositeVideoClip(layers, size=(OUT_W, OUT_H)).set_audio(audio)
    final.write_videofile(
        str(out_path), fps=FPS,
        codec="libx264", audio_codec="aac",
        bitrate="6000k", audio_bitrate="192k",
        ffmpeg_params=["-crf", "20", "-pix_fmt", "yuv420p"],
        preset="fast", logger=None,
    )

    size_mb = out_path.stat().st_size / 1_048_576
    # Mirror to output_videos/ for easy access
    import shutil
    mirror = OUTPUT_VIDEOS_DIR / out_path.name
    shutil.copy2(str(out_path), str(mirror))

    log(f"  ██ VIDEO SAVED → output_videos/{out_path.name}  ({size_mb:.1f} MB)")


# ── Zernio upload ─────────────────────────────────────────────────────────────

def _zernio_headers() -> dict:
    return {"Authorization": f"Bearer {ZERNIO_API_KEY}", "Content-Type": "application/json"}


def _zernio_accounts() -> dict:
    resp = requests.get("https://zernio.com/api/v1/accounts",
                        headers=_zernio_headers(), timeout=30)
    resp.raise_for_status()
    return {a["platform"]: a["_id"] for a in resp.json().get("accounts", [])}


def upload_video(video_path: Path, caption: str, scheduled_for: str) -> dict:
    if not ZERNIO_API_KEY:
        log("    ⚠  ZERNIO_API_KEY not set — saved locally only")
        return {"status": "local_only"}

    # Presign
    pr = requests.post("https://zernio.com/api/v1/media/presign",
                       headers=_zernio_headers(),
                       json={"filename": video_path.name, "contentType": "video/mp4"},
                       timeout=30)
    if not pr.ok:
        return {"status": f"presign_{pr.status_code}"}
    upload_url = pr.json()["uploadUrl"]
    public_url = pr.json()["publicUrl"]

    # PUT
    with open(video_path, "rb") as f:
        put = requests.put(upload_url, data=f,
                           headers={"Content-Type": "video/mp4"}, timeout=300)
    if not put.ok:
        return {"status": f"put_{put.status_code}"}
    log(f"    ✓ CDN upload → {public_url[:72]}…")

    # Accounts
    try:
        acct_map = _zernio_accounts()
    except Exception as e:
        return {"status": f"accounts_error: {e}"}

    platforms = []
    for plat, post_type in [("instagram", "REEL"), ("tiktok", "VIDEO")]:
        aid = acct_map.get(plat)
        if aid:
            platforms.append({
                "platform":             plat,
                "accountId":            aid,
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
                "content":      caption,
                "scheduledFor": scheduled_for,
                "platforms":    platforms,
                "mediaItems":   [{"type": "video", "url": public_url}],
            },
            timeout=(10, 300),
        )
    except requests.exceptions.ReadTimeout:
        log("    ⚠  Timed out — check zernio.com/dashboard")
        return {"status": "timeout_check_dashboard"}

    if not post.ok:
        log(f"    ✗ Post failed {post.status_code}: {post.text[:120]}")
        return {"status": f"post_{post.status_code}"}

    post_id = post.json().get("post", {}).get("_id", "?")
    log(f"    ✓ Zernio postId: {post_id}")
    return post.json()


# ── Post state (per-slot tracking + legacy 20h guard) ────────────────────────

# Maps UTC hour (as string) → vibe key
SLOT_VIBES = {"12": "roaster", "20": "storyteller", "0": "chaos"}


def _load_post_state() -> dict:
    if POST_STATE.exists():
        try:
            return json.loads(POST_STATE.read_text())
        except Exception:
            pass
    return {"last_post_ts": 0, "posted_slots": []}


def _slot_already_posted(slot_iso: str) -> bool:
    return slot_iso in _load_post_state().get("posted_slots", [])


def _update_post_state(slot_iso: str = "") -> None:
    state = _load_post_state()
    state["last_post_ts"] = time.time()
    if slot_iso:
        posted = state.get("posted_slots", [])
        if slot_iso not in posted:
            posted.append(slot_iso)
        # Keep only today's slots to avoid unbounded growth
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        state["posted_slots"] = [s for s in posted if s.startswith(today)]
    POST_STATE.write_text(json.dumps(state, indent=2))


def _due_slot() -> Optional[tuple]:
    """
    Return (vibe_key, slot_iso) if the current UTC time is within 20 minutes
    of a posting slot AND that slot hasn't been posted yet. Else None.
    """
    now     = datetime.now(timezone.utc)
    today   = now.date()
    for t_str, vibe_key in zip(_DAILY_SLOTS, VIBE_ORDER):
        h, m = map(int, t_str.split(":"))
        slot_dt = datetime(today.year, today.month, today.day, h, m, tzinfo=timezone.utc)
        # midnight slot belongs to the next calendar day
        if h == 0:
            slot_dt += timedelta(days=1)
        slot_iso = slot_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        delta    = (now - slot_dt).total_seconds()
        if -60 <= delta <= 1200:
            if not _slot_already_posted(slot_iso):
                return vibe_key, slot_iso
    return None


# ── Caption builder ───────────────────────────────────────────────────────────

_HASHTAG_SETS = [
    "#mrworkout #SavageCoaching #gym #fitness #Fitness",
    "#mrworkout #SavageCoaching #gym #fitness #SavageProtocol #GymTok #Fitness",
    "#mrworkout #SavageCoaching #gym #fitness #CNSrecovery #Fitness",
    "#mrworkout #SavageCoaching #SavageProtocol #gym #fitness #elitetraining #Fitness",
]

_COMPETITOR_ALTS = [
    "The best alternative to MyFitnessPal for real lifters.",
    "The best alternative to Strava for real lifters.",
    "The best alternative to Nike Training Club for real lifters.",
    "The best alternative to Whoop for real lifters.",
    "The best alternative to Fitbod for real lifters.",
]

def build_caption(script: str, vibe_key: str) -> str:
    hashtags   = random.choice(_HASHTAG_SETS)
    competitor = random.choice(_COMPETITOR_ALTS)
    # Pull the first sentence as the caption hook
    first = re.split(r'(?<=[.!?])\s', script)[0]
    return (
        f"{first}\n\n"
        f"Mr. Workout — Savage Coaching. {competitor}\n\n"
        f"Link in bio to download the Mr. Workout App 💪\n\n"
        f"{hashtags}"
    )


# ── Slot calculator ───────────────────────────────────────────────────────────

_DAILY_SLOTS = ["12:00", "20:00", "00:00"]

def _slot_iso(t_str: str) -> str:
    now   = datetime.now(timezone.utc)
    today = now.date()
    h, m  = map(int, t_str.split(":"))
    dt    = datetime(today.year, today.month, today.day, h, m, tzinfo=timezone.utc)
    if dt <= now:
        dt += timedelta(days=1)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


# ── Daily runner ──────────────────────────────────────────────────────────────

def run_daily(preview: bool = False, only_vibe: Optional[str] = None) -> None:
    if not ELEVENLABS_API_KEY:
        sys.exit("✗ ELEVENLABS_API_KEY not set")
    if not GROK_API_KEY:
        log("  ⚠  GROK_API_KEY not set — using fallback scripts")

    log(f"\n  SOURCE  : {GROK_MEN_DIR}")
    log(f"  OUTPUT  : {OUTPUT_VIDEOS_DIR}")
    log(f"  PREVIEW : {preview}   VIBE FILTER: {only_vibe or 'all'}\n")

    today_str  = datetime.now().strftime("%Y-%m-%d")
    history    = load_history()
    vibe_order = [only_vibe] if only_vibe else VIBE_ORDER
    n_videos   = len(vibe_order)
    videos     = pick_videos(n_videos, history)

    if len(videos) < n_videos:
        log(f"  ⚠  Only {len(videos)} videos available in grok men/")

    slots = [_slot_iso(t) for t in _DAILY_SLOTS[:n_videos]]

    log(f"\n{'='*68}")
    log(f"  GROK MEN FACTORY — {today_str}")
    log(f"{'='*68}")
    for i, (vid, slot, vibe_key) in enumerate(zip(videos, slots, vibe_order), 1):
        log(f"  [{i}] {VIBES[vibe_key]['label']:18s}  →  {slot}  —  {vid.name[:42]}")
    log(f"{'='*68}\n")

    results = []
    for i, (video, slot, vibe_key) in enumerate(zip(videos, slots, vibe_order), 1):
        vibe = VIBES[vibe_key]
        log(f"\n{'─'*68}")
        log(f"  [{i}/3]  {vibe['label'].upper()}  —  {video.name[:50]}")
        log(f"{'─'*68}")

        # 1. Generate script
        log("    → Generating script via Grok…")
        script = generate_script(vibe_key)
        # First line is the on-screen hook
        hook_text = re.split(r'(?<=[.!?])\s', script)[0][:80]
        log(f"    → Script ({len(script.split())} words):")
        log(f"       {script[:160]}{'…' if len(script) > 160 else ''}")
        log(f"    → Hook: {hook_text}")

        if preview:
            results.append({"vibe": vibe_key, "script": script, "video": video.name})
            continue

        work_dir = OUTPUT_DIR / today_str / f"post_{i}_{vibe_key}"
        work_dir.mkdir(parents=True, exist_ok=True)

        # 2. Voiceover with timestamps
        vo_path = work_dir / "voiceover.mp3"
        vo_data = generate_voiceover_with_timestamps(script, vibe_key, vo_path)
        if not vo_data:
            log(f"    ✗ Voiceover failed — skipping post {i}")
            results.append({"vibe": vibe_key, "status": "vo_failed"})
            continue

        # 3. Build video
        out_path = work_dir / f"grok_men_{vibe_key}.mp4"
        log("    → Assembling video with Hormozi subtitles…")
        try:
            build_video(video, vo_data, vibe_key, hook_text, out_path)
        except Exception as e:
            log(f"    ✗ Build failed: {e}")
            results.append({"vibe": vibe_key, "status": f"build_failed: {e}"})
            continue

        # 4. Upload
        caption = build_caption(script, vibe_key)
        log(f"\n    ✅ READY  ({out_path.stat().st_size/1_048_576:.1f} MB)")
        log(f"    → Caption: {caption[:100]}…")
        log(f"    → Slot   : {slot}")

        zernio_result = upload_video(out_path, caption, slot)
        zernio_id     = zernio_result.get("post", {}).get("_id",
                            zernio_result.get("status", "sent"))
        upload_ok = not str(zernio_id).startswith(("presign_", "put_", "post_",
                                                    "no_accounts", "accounts_error"))
        if upload_ok:
            _update_post_state(slot_iso=slot)

        record = {
            "vibe":       vibe_key,
            "video":      video.name,
            "script":     script,
            "slot":       slot,
            "zernio_id":  str(zernio_id),
            "timestamp":  datetime.now(timezone.utc).isoformat(),
            "status":     "done" if upload_ok else str(zernio_id),
        }
        history["posts"].append(record)
        results.append(record)
        save_history(history)

        if i < len(videos):
            time.sleep(3)

    # ── Summary ───────────────────────────────────────────────────────────────
    log(f"\n{'='*68}")
    log(f"  DONE — {today_str}")
    log(f"{'='*68}")
    for r in results:
        label  = VIBES[r["vibe"]]["label"]
        status = r.get("status", "?")
        slot   = r.get("slot", "preview")
        log(f"  {label:18s}  {status:12s}  {slot}")
    log()

    if preview:
        log("  [preview mode — no videos rendered]\n")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Grok Men Factory — 3-vibe daily engine")
    parser.add_argument("--preview", action="store_true",
                        help="Generate and print scripts only — no video render or upload")
    parser.add_argument("--vibe", choices=["roaster", "storyteller", "chaos"], default=None,
                        help="Run a single vibe only (default: all 3)")
    parser.add_argument("--slot", action="store_true",
                        help="Auto-detect the current UTC slot and post only that vibe")
    args = parser.parse_args()

    if args.slot:
        due = _due_slot()
        if not due:
            now_utc = datetime.now(timezone.utc)
            log(f"  No slot due right now ({now_utc.strftime('%H:%M')} UTC) — exiting")
            sys.exit(0)
        vibe_key, slot_iso = due
        log(f"  Slot detected: {slot_iso}  →  {VIBES[vibe_key]['label']}")
        run_daily(only_vibe=vibe_key)
    else:
        run_daily(preview=args.preview, only_vibe=args.vibe)
