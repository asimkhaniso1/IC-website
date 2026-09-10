#!/usr/bin/env bash
# Frame-accurate check of how each chosen take ends (and begins), to settle whether the Kling
# clips snap to their end keyframe on the last frame (a 1-frame pop at the join).
# Output: build/tails/<clip>-tail.png (last 8 frames, left→right) and <clip>-head.png (first 4),
# plus frame count, fps and duration per clip.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CLIPS="$HERE/../clips"
OUT="$HERE/../build/tails"
mkdir -p "$OUT"

for name in shot1-kling-pro shot2-seedance-std-1080p shot3-minimax-h3 shot4-seedance-std-1080p shot5-kling-pro shot6-kling-pro; do
  f="$CLIPS/$name.mp4"
  info=$(ffprobe -v error -select_streams v:0 -count_frames \
    -show_entries stream=nb_read_frames,r_frame_rate,duration -of csv=p=0 "$f")
  echo "$name  frames,fps,duration: $info"
  n=$(echo "$info" | awk -F, '{print $NF}')   # nb_read_frames is the last field
  # last 8 frames (frame-accurate: select by frame index, not by time)
  ffmpeg -hide_banner -loglevel error -y -i "$f" \
    -vf "select='gte(n\,$((n - 8)))',scale=320:-2,tile=8x1" -frames:v 1 -fps_mode passthrough "$OUT/$name-tail.png"
  # first 4 frames
  ffmpeg -hide_banner -loglevel error -y -i "$f" \
    -vf "select='lt(n\,4)',scale=320:-2,tile=4x1" -frames:v 1 -fps_mode passthrough "$OUT/$name-head.png"
done
ls -la "$OUT"
