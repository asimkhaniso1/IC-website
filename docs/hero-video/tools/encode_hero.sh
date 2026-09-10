#!/usr/bin/env bash
# Assemble the 30 s homepage hero video from the six chosen takes and encode the site files.
#
#   master      1920×1080, 30 fps, 6 × 5.0 s, near-lossless intermediate (not shipped)
#   desktop     hero-desktop.mp4 (H.264) + hero-desktop.webm (VP9), target ≤ 5 MB each
#   mobile      hero-mobile.mp4, pre-cropped 608×1080 "mobile spine" (x ≈ 53–79%), target ≤ 1.5 MB
#   posters     hero-poster.webp (desktop, first frame) + hero-poster-mobile.webp
#
# Takes (client-confirmed 2026-09-10): Kling for shots 1, 5, 6; MiniMax H3 for shot 3;
# Seedance 2.0 Std 1080p finals for shots 2 and 4. Silent throughout (hero autoplays muted).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
CLIPS="$HERE/../clips"
OUT="$HERE/../../../public/video"
WORK="$HERE/../build"
mkdir -p "$OUT" "$WORK"

TAKES=(
  "$CLIPS/shot1-kling-pro.mp4"
  "$CLIPS/shot2-seedance-std-1080p.mp4"
  "$CLIPS/shot3-minimax-h3.mp4"
  "$CLIPS/shot4-seedance-std-1080p.mp4"
  "$CLIPS/shot5-kling-pro.mp4"
  "$CLIPS/shot6-kling-pro.mp4"
)

SHOT_SECONDS=5      # matches the 5000 ms HeroSlider interval → slide i = floor(t / 5)
FPS=30
# Mobile crop: object-position 72% on a 375×812 phone shows ~26% of a 16:9 frame.
# On 1920 wide: crop width 608 (1080 × 9/16), x = 0.72 × (1920 − 608) ≈ 945.
MOBILE_W=608
MOBILE_X=945

# Crossfade (seconds) at each join: 1→2, 2→3, 3→4, 4→5, 5→6. 0 = straight cut.
# 2→3 needs one: the shot 2 final ends on a fully woven panel, not K2d, which shot 3 starts from.
XF=(0 0.5 0 0 0)

add() { awk "BEGIN { print $1 + $2 }"; }
sub() { awk "BEGIN { print $1 - $2 }"; }

inputs=()
filters=""
for i in "${!TAKES[@]}"; do
  [[ -f "${TAKES[$i]}" ]] || { echo "missing take: ${TAKES[$i]}" >&2; exit 1; }
  inputs+=(-i "${TAKES[$i]}")
  # A clip that fades in gets its crossfade length added, so every shot still ends on a
  # 5 s boundary (the slider syncs to floor(t / 5)). Short clips are extended by holding the
  # last frame (tpad clone), then trimmed to exact length. Sources: 1928×1076, 2560×1440, 1920×1080.
  len=$SHOT_SECONDS
  (( i > 0 )) && len=$(add "$SHOT_SECONDS" "${XF[$((i - 1))]}")
  filters+="[$i:v]trim=0:${len},setpts=PTS-STARTPTS,fps=${FPS},"
  filters+="scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,setsar=1,format=yuv420p,"
  filters+="tpad=stop_mode=clone:stop_duration=1,trim=0:${len},setpts=PTS-STARTPTS,settb=1/${FPS}[v$i];"
done

acc="v0"
acclen=$SHOT_SECONDS
for (( j = 1; j < ${#TAKES[@]}; j++ )); do
  xf=${XF[$((j - 1))]}
  if [[ "$xf" != "0" ]]; then
    filters+="[$acc][v$j]xfade=transition=fade:duration=${xf}:offset=$(sub "$acclen" "$xf")[a$j];"
  else
    # concat outputs a 1/1000000 timebase; xfade needs both inputs on the same one.
    filters+="[$acc][v$j]concat=n=2:v=1:a=0,settb=1/${FPS}[a$j];"
  fi
  acc="a$j"
  acclen=$(add "$acclen" "$SHOT_SECONDS")
done

# Loop seam: shot 6 ends on product rolls, shot 1 opens on yarn cones (diff 37). Fade the last
# LOOP_XF seconds into shot 1's first frame, so the file's last frame matches its first and
# <video loop> restarts invisibly. Total length stays 6 × 5 s.
LOOP_XF=0.5
loop_in=${#TAKES[@]}
inputs+=(-i "${TAKES[0]}")
filters+="[$loop_in:v]trim=end_frame=1,setpts=PTS-STARTPTS,fps=${FPS},"
filters+="scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,setsar=1,format=yuv420p,"
filters+="tpad=stop_mode=clone:stop_duration=1,trim=0:${LOOP_XF},setpts=PTS-STARTPTS,settb=1/${FPS}[tail];"
filters+="[$acc][tail]xfade=transition=fade:duration=${LOOP_XF}:offset=$(sub "$acclen" "$LOOP_XF")[out]"

echo "→ master"
ffmpeg -hide_banner -y "${inputs[@]}" -filter_complex "$filters" -map "[out]" \
  -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -an "$WORK/hero-master.mp4"

echo "→ desktop H.264"
ffmpeg -hide_banner -y -i "$WORK/hero-master.mp4" \
  -c:v libx264 -preset slow -crf 27 -maxrate 1300k -bufsize 2600k -profile:v high \
  -pix_fmt yuv420p -movflags +faststart -an "$OUT/hero-desktop.mp4"

echo "→ desktop VP9"
ffmpeg -hide_banner -y -i "$WORK/hero-master.mp4" \
  -c:v libvpx-vp9 -crf 38 -b:v 1300k -row-mt 1 -deadline good -cpu-used 2 \
  -pix_fmt yuv420p -an "$OUT/hero-desktop.webm"

echo "→ mobile (pre-cropped spine)"
ffmpeg -hide_banner -y -i "$WORK/hero-master.mp4" \
  -vf "crop=${MOBILE_W}:1080:${MOBILE_X}:0" \
  -c:v libx264 -preset slow -crf 28 -maxrate 390k -bufsize 780k -profile:v high \
  -pix_fmt yuv420p -movflags +faststart -an "$OUT/hero-mobile.mp4"

echo "→ posters (first frame = K0b)"
ffmpeg -hide_banner -y -i "$WORK/hero-master.mp4" -frames:v 1 -c:v libwebp -quality 80 "$OUT/hero-poster.webp"
ffmpeg -hide_banner -y -i "$WORK/hero-master.mp4" -frames:v 1 -vf "crop=${MOBILE_W}:1080:${MOBILE_X}:0" \
  -c:v libwebp -quality 80 "$OUT/hero-poster-mobile.webp"

echo
ls -la "$OUT"
