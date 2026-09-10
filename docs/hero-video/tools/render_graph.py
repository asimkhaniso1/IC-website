"""Render the shot-2 design graph: an eight-point-star ("star and cross") lattice
quantised to square cells, like the Design Studio pattern-grid export
(one cell = one warp end x one weft pick). Used as the exact-pattern reference
for keyframe K2 so the image model can't drift into six-pointed stars.

Each motif is a true eight-point star polygon (16 vertices alternating between
an outer and inner radius). Two overlapping squares were tried first but read
as squares with nubs at this cell size. POINT_REACH < 0.5 keeps neighbouring
stars apart so each reads as a distinct white star on the navy ground.
"""
import math
import os

from PIL import Image, ImageDraw

CELLS = 64          # cells across the square graph
CELL_PX = 24        # pixels per cell
SPACING = 21.0      # star-centre spacing, in cells (~3 stars across)
POINT_REACH = 0.42  # star point radius as a fraction of spacing (<0.5 keeps stars apart)
GROUND = (10, 42, 92)       # navy ground yarn
MOTIF = (232, 238, 247)     # white figure yarn
LINE = (79, 143, 224)       # luminous IC-blue grid line

INNER_RATIO = 0.5   # inner/outer radius; lower = sharper points

R_OUT = POINT_REACH * SPACING
R_IN = R_OUT * INNER_RATIO
# 16-vertex eight-point star, one point straight up
STAR = [
    ((R_OUT if k % 2 == 0 else R_IN) * math.sin(k * math.pi / 8),
     -(R_OUT if k % 2 == 0 else R_IN) * math.cos(k * math.pi / 8))
    for k in range(16)
]


def in_polygon(px: float, py: float, poly) -> bool:
    inside = False
    n = len(poly)
    for a in range(n):
        x1, y1 = poly[a]
        x2, y2 = poly[(a + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def in_star(x: float, y: float) -> bool:
    # nearest star centre on the lattice (offset so a star sits mid-panel)
    cx = round((x - SPACING / 2) / SPACING) * SPACING + SPACING / 2
    cy = round((y - SPACING / 2) / SPACING) * SPACING + SPACING / 2
    return in_polygon(x - cx, y - cy, STAR)


size = CELLS * CELL_PX
img = Image.new("RGB", (size, size), GROUND)
draw = ImageDraw.Draw(img)

for j in range(CELLS):
    for i in range(CELLS):
        if in_star(i + 0.5, j + 0.5):
            x0, y0 = i * CELL_PX, j * CELL_PX
            draw.rectangle([x0, y0, x0 + CELL_PX - 1, y0 + CELL_PX - 1], fill=MOTIF)

for k in range(CELLS + 1):
    p = min(k * CELL_PX, size - 1)
    draw.line([(p, 0), (p, size)], fill=LINE, width=2)
    draw.line([(0, p), (size, p)], fill=LINE, width=2)

out = os.path.join(os.path.dirname(__file__), "..", "keyframes", "graph-ref.png")
img.save(os.path.normpath(out))
print("wrote", os.path.normpath(out), img.size)
