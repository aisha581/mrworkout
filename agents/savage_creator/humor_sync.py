#!/usr/bin/env python3
"""
HUMOR SYNC ENGINE
=================
Adds 'Savage Coach' text overlays to workout videos and generates
matching Zernio social captions.

Overlay logic:
  - TOP hook  (first half)  → branded hook, random from 20, no repeats
  - BOTTOM punchline (2nd half) → exercise-specific from metadata.json

Usage:
    python3 humor_sync.py path/to/video.mp4
    python3 humor_sync.py path/to/video.mp4 -o path/to/output.mp4
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import CompositeVideoClip, ImageClip, TextClip, VideoFileClip

# ── Config ────────────────────────────────────────────────────────────────────

METADATA_FILE = Path(__file__).parent / "metadata.json"
HOOK_HISTORY  = Path(__file__).parent / "hook_history.json"
FONT_SIZE     = 90
TEXT_WIDTH_PC = 0.82
BOTTOM_PAD    = 150
GOLD          = (255, 215, 0,   255)
WHITE         = (255, 255, 255, 255)
BLACK         = (0,   0,   0,   255)
BRAND_WORDS   = {"MR", "WORKOUT", "APP"}

# ── 20 hooks across 4 relationship categories ──────────────────────────────────
# Each entry: (category, style_tag, hook_text)
# Category is used for logging; style_tag drives caption tone.

BRANDED_HOOKS = [
    # ── The "Girlfriend" POV — couples, girls training, before/after ──────────
    ("Girlfriend POV", "POV",
     "POV: You finally convinced your boyfriend to start training with the MR. WORKOUT app."),
    ("Girlfriend POV", "POV",
     "POV: Your girl started using MR. WORKOUT and now you have to keep up."),
    ("Girlfriend POV", "POV",
     'POV: She said she "just wanted to tone up" but then she downloaded MR. WORKOUT.'),
    ("Girlfriend POV", "POV",
     "POV: You finally stopped arguing and started using the MR. WORKOUT duo split."),
    ("Girlfriend POV", "POV",
     "POV: You caught him checking the MR. WORKOUT app more than his texts."),
    ("Girlfriend POV", "Humor",
     "POV: Your boyfriend is a 10, but he doesn't have the MR. WORKOUT app (he's a 4)."),

    # ── The "Boyfriend / Alpha" POV — heavy lifts, high-intensity ────────────
    ("Boyfriend POV", "POV",
     "POV: You're training her so she can use the MR. WORKOUT app without help."),
    ("Boyfriend POV", "POV",
     "POV: You finally got her on the MR. WORKOUT program and now she's out-lifting you."),
    ("Boyfriend POV", "Savage",
     "POV: When you realize she's only with you for your MR. WORKOUT progress."),
    ("Boyfriend POV", "POV",
     "POV: You told your crush you use MR. WORKOUT and she actually replied."),
    ("Boyfriend POV", "Flex",
     "POV: Watching your girl hit a PR thanks to the MR. WORKOUT blueprint."),

    # ── The "Savage / Crush" POV — solo flex, scrolling humor ────────────────
    ("Savage POV", "Savage",
     "POV: Your crush is watching. Better open the MR. WORKOUT app."),
    ("Savage POV", "Humor",
     "POV: You're single, but the MR. WORKOUT app is your soulmate."),
    ("Savage POV", "Savage",
     "POV: You see your ex at the gym but you're too busy following your MR. WORKOUT split."),
    ("Savage POV", "Humor",
     "POV: She left you, so you moved in with the MR. WORKOUT app."),
    ("Savage POV", "POV",
     'POV: Your crush likes "fitness guys." Say no more, MR. WORKOUT is downloading.'),

    # ── "Tag a Partner" — engagement drivers ─────────────────────────────────
    ("Tag a Partner", "Direct",
     "POV: Tag someone who needs the MR. WORKOUT app more than they need a boyfriend."),
    ("Tag a Partner", "Direct",
     "POV: The couple that uses MR. WORKOUT together, stays together."),
    ("Tag a Partner", "Humor",
     "POV: If he doesn't use MR. WORKOUT, is he even your boyfriend?"),
    ("Tag a Partner", "Direct",
     "POV: Send this to your partner so they finally download MR. WORKOUT."),
]

# ── Hashtag pool — rotated per post ───────────────────────────────────────────

_HASHTAG_SETS = [
    "#mrworkout #gym #fitness #gymmotivation #workout #gains",
    "#mrworkout #gym #fitness #bodybuilding #strengthtraining #lifting",
    "#mrworkout #gym #fitness #gymlife #training #CNS",
    "#mrworkout #gym #fitness #strength #musclebuilding #GymTok",
    "#mrworkout #gym #fitness #elitetraining #savage #CNSrecovery",
]

# ── Hook history (no-repeat rotation) ─────────────────────────────────────────

def _load_hook_history() -> list:
    if HOOK_HISTORY.exists():
        return json.loads(HOOK_HISTORY.read_text()).get("used", [])
    return []


def _save_hook_history(used: list) -> None:
    HOOK_HISTORY.write_text(json.dumps({"used": used}, indent=2))


def pick_hook() -> tuple:
    """Pick one unused (category, style, hook_text) triple; resets when all 20 exhausted."""
    used      = _load_hook_history()
    available = [(cat, sty, h) for cat, sty, h in BRANDED_HOOKS if h not in used]
    if not available:
        print("  ℹ  All hooks used — resetting hook rotation")
        used      = []
        available = BRANDED_HOOKS
    category, style, hook = random.choice(available)
    used.append(hook)
    _save_hook_history(used)
    return category, style, hook


# ── Caption generator ─────────────────────────────────────────────────────────

def generate_caption(hook: str) -> str:
    """
    Build a Zernio social caption from a hook.
    Format: hook + CTA line + hashtags.
    """
    hashtags = random.choice(_HASHTAG_SETS)
    return f"{hook}\n\nLink in bio to download MR. WORKOUT 💪\n\n{hashtags}"


# ── Metadata / punchline ───────────────────────────────────────────────────────

def _load_metadata() -> dict:
    if METADATA_FILE.exists():
        return json.loads(METADATA_FILE.read_text())
    return {}


def pick_punchline(filename: str, metadata: dict) -> str:
    stem = Path(filename).stem.lower().replace("-", "_").replace(" ", "_")

    for fname, data in metadata.get("exact_files", {}).items():
        if Path(fname).stem.lower() == stem:
            return random.choice(data["savage_lines"])["punchline"]

    for _cat, data in metadata.get("keyword_categories", {}).items():
        if any(kw in stem for kw in data.get("keywords", [])):
            return random.choice(data["savage_lines"])["punchline"]

    defaults = metadata.get("_default", {}).get("savage_lines", [
        {"punchline": "Mr. Workout fixes that. Free."}
    ])
    return random.choice(defaults)["punchline"]


# ── Font loader ───────────────────────────────────────────────────────────────

def _load_font(size: int) -> ImageFont.FreeTypeFont:
    from pathlib import Path
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
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


# ── PIL text rendering with glow ──────────────────────────────────────────────

def _word_wrap(words: list, font: ImageFont.FreeTypeFont, max_w: int) -> list:
    lines, cur, cur_w = [], [], 0
    for word in words:
        ww = font.getbbox(word + " ")[2]
        if cur_w + ww > max_w and cur:
            lines.append(cur)
            cur, cur_w = [word], ww
        else:
            cur.append(word)
            cur_w += ww
    if cur:
        lines.append(cur)
    return lines


def _pil_text_array(text: str, video_w: int, branded: bool = False) -> np.ndarray:  # noqa: ARG001
    """Renders text onto a transparent RGBA canvas — lowercase, thick stroke, drop shadow."""
    font   = _load_font(FONT_SIZE)
    max_w  = int(video_w * TEXT_WIDTH_PC)
    lines  = _word_wrap(text.lower().split(), font, max_w)

    line_h   = FONT_SIZE + 22
    canvas_h = line_h * len(lines) + 28
    canvas_w = video_w

    img  = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for i, line_words in enumerate(lines):
        line_text = " ".join(line_words)
        line_w    = font.getbbox(line_text)[2]
        x         = (canvas_w - line_w) // 2
        y         = i * line_h + 12

        # Drop shadow
        draw.text((x + 6, y + 6), line_text, font=font, fill=(0, 0, 0, 110))
        # White text with thick black stroke (Pillow built-in)
        draw.text((x, y), line_text, font=font,
                  fill=(255, 255, 255, 255),
                  stroke_width=4, stroke_fill=(0, 0, 0, 255))

    return np.array(img)


# ── Clip builder ──────────────────────────────────────────────────────────────

def _try_textclip(text: str, video_w: int) -> Optional[TextClip]:
    """MoviePy TextClip fallback (requires ImageMagick). Not used for branded clips."""
    try:
        return TextClip(
            text,
            fontsize=FONT_SIZE,
            font="Impact",
            color="white",
            stroke_color="black",
            stroke_width=2,
            method="caption",
            size=(int(video_w * TEXT_WIDTH_PC), None),
            align="center",
        )
    except Exception:
        return None


def _build_clip(
    text: str,
    video_w: int,
    duration: float,
    start: float,
    position: tuple,
    branded: bool = False,
) -> ImageClip:
    # Always use PIL for branded hooks (per-word gold colouring)
    if not branded:
        tc = _try_textclip(text, video_w)
        if tc is not None:
            return tc.set_position(position).set_start(start).set_duration(duration)

    arr = _pil_text_array(text, video_w, branded=branded)
    return (
        ImageClip(arr, ismask=False)
        .set_position(position)
        .set_start(start)
        .set_duration(duration)
    )


# ── Main function ─────────────────────────────────────────────────────────────

def edit_video(
    video_path: Path,
    output_path: Optional[Path] = None,
    hook_text: Optional[str] = None,
) -> dict:
    """
    Overlay Savage Coach text onto a workout video.

    hook_text – if provided, overrides pool selection (master_factory passes the
                filename-derived or Grok-generated hook directly).

    Returns a dict with keys:
      output_path  – Path to the rendered video
      hook         – Hook text used on screen
      caption      – Ready-to-paste Zernio caption
      style        – Hook style tag
      category     – Hook category
    """
    video_path = Path(video_path)
    if output_path is None:
        output_path = video_path.parent / f"humor_{video_path.name}"
    output_path = Path(output_path)

    print(f"\n  ── Humor Sync: {video_path.name} {'─'*30}")

    if hook_text is not None:
        category, style, hook = "Custom", "Direct", hook_text
    else:
        category, style, hook = pick_hook()
    caption               = generate_caption(hook)
    metadata              = _load_metadata()
    punchline             = pick_punchline(video_path.name, metadata)

    print(f"  Category  : {category}")
    print(f"  Style     : {style}")
    print(f"  ↑ Hook    : {hook}")
    print(f"  ↓ Punchline: {punchline}")

    video         = VideoFileClip(str(video_path))
    half_duration = video.duration / 2

    # ── Hook: centre-frame, 0 → half_duration ────────────────────────────────
    hook_arr = _pil_text_array(hook, video.w, branded=True)
    hook_y   = (video.h - hook_arr.shape[0]) // 2
    hook_clip = _build_clip(
        text=hook,
        video_w=video.w,
        duration=half_duration,
        start=0,
        position=("center", hook_y),
        branded=True,
    )

    # ── Punchline: bottom-centre, half_duration → end ─────────────────────────
    punch_arr = _pil_text_array(punchline, video.w, branded=False)
    punch_y   = video.h - punch_arr.shape[0] - BOTTOM_PAD

    punch_clip = _build_clip(
        text=punchline,
        video_w=video.w,
        duration=half_duration,
        start=half_duration,
        position=("center", punch_y),
        branded=False,
    )

    # ── Composite & export ────────────────────────────────────────────────────
    final = CompositeVideoClip(
        [video, hook_clip, punch_clip],
        size=(video.w, video.h),
    )

    final.write_videofile(
        str(output_path),
        fps=video.fps or 30,
        codec="libx264",
        audio_codec="aac",
        bitrate="6000k",
        ffmpeg_params=["-crf", "20", "-pix_fmt", "yuv420p"],
        preset="fast",
        logger=None,
    )

    size_mb = output_path.stat().st_size / 1_048_576
    print(f"  ✓ Humor-synced → {output_path.name}  ({size_mb:.1f} MB)")
    print(f"\n  ── Zernio caption ──────────────────────────────────────")
    print(f"  {caption.replace(chr(10), chr(10) + '  ')}")

    return {
        "output_path": output_path,
        "hook":        hook,
        "category":    category,
        "style":       style,
        "caption":     caption,
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Humor Sync Engine — Savage Coach overlay")
    parser.add_argument("video",          help="Input video path")
    parser.add_argument("-o", "--output", help="Output path (default: humor_<input>.mp4)",
                        default=None)
    args = parser.parse_args()

    result = edit_video(
        Path(args.video),
        Path(args.output) if args.output else None,
    )
    print(f"\n  Caption saved in result dict.")
