# Homepage Hero Video — Storyboard & Higgsfield Credit Plan

Status: **PLAN ONLY — nothing generated. Awaiting approval.**
Prepared: 2026-09-10 · Higgsfield balance at time of writing: **1,585.4 credits** (Max plan)

---

## 0. Ground rules

1. **The live site is the source of truth. Not a redesign.** The video replaces only the
   `<img>` layer inside `HeroSlider` (`src/pages/Home.tsx:79-97`). Nav, badge, H1/subtitle copy,
   the three CTAs, slider dots, floating stats, the dark gradient and the 60% opacity stay as they are.
2. **The video carries no text and no logos.** All copy stays live HTML for SEO, accessibility and
   crispness. (Exception: shot 6 may show the real woven-logo tape from our own photo. See the risks section.)
3. **Silent.** Hero autoplay has to be `muted`, so every generation runs with audio off, which is also cheaper.
4. **Credits are limited.** Iterate on cheap stills first. Spend video credits only on approved
   keyframes. Use premium models only for the two hard shots.

---

## 1. What the existing site dictates

| Constraint | Source | Consequence for the video |
|---|---|---|
| Hero = `h-screen`, full-bleed `object-cover`, **opacity 60%** | `Home.tsx:79,92` | Needs high-contrast subjects; fine detail is lost, bold forms survive |
| Gradient `from-slate-900 via-slate-900/60 to-transparent` (left→right) | `Home.tsx:95` | Left ~45% of frame is near-black behind the copy → **nothing important there** |
| Copy block `max-w-2xl`, left-aligned | `Home.tsx:105` | Desktop text-safe zone: x 0–48% |
| Floating stats bottom-right (`lg:` only) | `Home.tsx:153` | Keep x 55–95%, y 82–95% low-detail on desktop |
| Slider auto-advances every **5000 ms**, **6 slides** | `Home.tsx:74` | **6 shots × 5 s = 30 s**. Each shot lines up with one slide's headline |
| Palette: slate-900/950 grounds, IC blue `#004A99`, white; amber accent in Studio CTA | `index.css`, `Home.tsx:643` | Grade: low-key charcoal/slate, IC-blue + white yarns, one small amber/gold accent (aramid) |
| Photography style: product on charcoal, soft top-left key (`1.jpg`, `3.jpg`, `studio-jacquard.jpg`) | `public/images` | Match it: studio macro, shallow DOF, no factory clutter, no people |
| Brand mark = geometric star-lattice (`LOGO1.png`) | `public/images` | Use the lattice as the jacquard **motif** (geometry, no letters, so AI-safe) |
| Design Studio exports a true **pattern grid**: 1 cell = 1 warp end × 1 weft pick | `src/lib/loomExport.ts:7-13` | The "graph" in shot 2 should look like that real grid, which ties the hero to `/studio` |

### Framing: one 16:9 master serves desktop and mobile

- **Desktop (≥1024 px):** subject lives in **x 50–90%, y 15–80%**.
- **Mobile (375×812):** `object-cover` only shows **~26% of the frame width**. With
  `object-position: 72% 50%` the visible window is **x ≈ 53–79%**. That is the **"mobile spine"**.
  The mobile copy covers the middle y 20–80%, so the spine needs **vertical** interest (warp
  threads, falling yarn) that reads in the top and bottom bands.
- **Rule for every shot:** the hero subject's centre of mass sits at **x ≈ 66%**, with vertical
  motion lines through x 55–78%. Both crops then work from a single render, at **0 extra credits** for mobile.

```
16:9 master
┌──────────────────────────────────────────────────────────────┐
│ nav                                                          │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ┌── mobile spine ─┐            │
│░░ TEXT-SAFE (dark gradient) ░   │  x 53% → 79%    │  subject   │
│░░ x 0–48%  — keep empty     ░   │  vertical lines │  zone      │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  centre ≈ 66%   │  x 50–90%  │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   └─────────────────┘            │
│ dots                                        stats (calm zone)│
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Storyboard: 6 connected shots, 30 s

Shots are **chained through keyframes**. The end frame of shot *n* is the start frame of shot
*n+1* (K0 → K1 → … → K6), so the transitions are continuous morphs and match-moves, not hard
cuts. Each shot lines up with an **existing** slide headline (copy unchanged).

> **Decision needed:** the story order differs from the current slide order. The proposal is to
> reorder the 6 entries in the `slides` array. Titles and subtitles stay verbatim; only the order changes.

| # | Time | Slide headline (existing copy) | Shot | Transition out |
|---|---|---|---|---|
| 1 | 0–5 s | **Quality Material Selection** | Low-key macro of three yarn cones: white cotton, IC-blue polyester, gold aramid. Slow push-in. One IC-blue yarn end lifts off the cone and draws upward through the mobile spine. | The yarn line becomes the first column of a glowing grid |
| 2 | 5–10 s | **Jacquard Weaving** | **GRAPH → YARN.** A Design-Studio-style pattern grid (IC-blue/white cells forming the logo's star lattice) floats in dark space. Row by row the flat cells **extrude into real yarn**: columns become warp ends, rows become weft picks, until the grid *is* a woven jacquard fabric. | Camera pulls back; the fabric is a moving tape |
| 3 | 10–15 s | **Precision Weaving** | Reveal: the tape is forming on a narrow-fabric needle loom. Warp ends run vertically through heddles, the reed beats the weft in, the tape advances. Macro, mechanical, precise. | Tape exits frame-right and lifts into dark space |
| 4 | 15–20 s | **High-Tech Narrow Textiles** | **EXPLODED CONSTRUCTION.** The jacquard elastic tape separates into floating layers: ground warp, elastane core ends, weft picks, the figure yarns carrying the motif. It holds for a beat, then snaps back together into one finished tape. Engineering-diagram clarity, photoreal yarn. | Reassembled tape curls toward the needle bed |
| 5 | 20–25 s | **Advanced Knitting** | Crochet/warp-knitting needles in macro, knitting an IC-blue elastic tape. Latches open and close, loops form, vertical movement through the spine. | Knitted tape slides out and loops |
| 6 | 25–30 s | **Premium Tapes & Braids** | Payoff: the finished IC navy jacquard elastic loops across the frame (from `studio-jacquard.jpg`). Slow pull-back reveals rolls of woven and striped tapes (`studio-woven.jpg`, `1.jpg` look) on charcoal. The last ~1 s is almost still. | 0.8 s CSS crossfade back to shot 1 (loop) |

### Keyframes (stills, generated and approved first)

| Key | Frame | Reference from site |
|---|---|---|
| K0 | Yarn cones on charcoal, IC-blue/white/gold, subject at x≈66% | `4.jpg` (cone forms), `1.jpg` (lighting) |
| K1 | Blue yarn line rising into a faint pattern grid | `LOGO1.png` (lattice) |
| K2 | Full star-lattice grid, half cells now woven yarn | `LOGO1.png`, `studio-jacquard.jpg` (weave texture) |
| K3 | Narrow loom macro, tape emerging | `4.jpg` (machine), `studio-woven.jpg` |
| K4 | Finished jacquard tape floating, lit like `1.jpg` | `studio-jacquard.jpg` |
| K5 | Crochet needle bed knitting IC-blue tape | `a-2-crochet-machine-500x500.jpg` |
| K6 | IC navy jacquard loop + rolls on charcoal | `studio-jacquard.jpg`, `studio-woven.jpg`, `1.jpg` |

Shot *n* = animate **K(n-1) → K(n)**.

---

## 3. Model & credit plan

Prices are live Higgsfield preflights (`get_cost`, nothing submitted), 16:9, silent.

### Price sheet (5 s unless noted)

| Model | Frames supported | Cost |
|---|---|---|
| Nano Banana 2, still 2K (image-to-image w/ references) | n/a | **2** |
| Veo 3.1 Lite (6 s) | start + end | 6 |
| Hailuo 2.3 Fast 1080 (6 s) | start (+end unconfirmed on 2.3) | 7 |
| Kling 3.0 Std | start + end | 7.5 |
| **Kling 3.0 Pro (1080p)** | **start + end** | **8.75** |
| Kling 3.0 Turbo 1080p | start only | 10 |
| MiniMax H3 2K | start + end + refs | 10 |
| Seedance 2.0 Mini 720p | start + end + refs | 12.5 |
| **Seedance 2.0 Fast 720p** (motion preview) | start + end + refs | **17.5** |
| Wan 3.0 1080p | start + end + refs | 17.5 |
| Seedance 2.0 Std 720p | start + end + refs | 22.5 |
| Kling 3.0 4K | start + end | 30 |
| **Seedance 2.0 Std 1080p** | **start + end + refs** | **45** |
| Seedance 2.5 1080p | start + end + refs | 45 |
| Cinema Studio 3.0 1080p | start + end | 50 |

### Model choice per shot

| Shot | Complexity | Model | Why this one | Credits |
|---|---|---|---|---|
| Keyframes K0–K6 | stills | **Nano Banana 2 · 2K** | Cheapest capable image-to-image with site photos as references. All look/brand iteration happens here, at 2 cr a try | 7 × 2 variants × 2 = **28** |
| 1 Materials | low (push-in, one yarn lifts) | **Kling 3.0 Pro** | Cheapest model with start+end frames **and** 1080p. Chaining needs end-frame control | **8.75** |
| 2 Graph → yarn | **high** (abstract to physical transformation) | **Seedance 2.0 Std 1080p** ⭐ | Best at reference-guided morphs with start+end frames and multiple refs (grid + real weave). First a **Seedance 2.0 Fast 720p preview** (17.5) to lock motion before paying 45 | 17.5 + **45** |
| 3 Loom | medium (mechanical motion) | **Kling 3.0 Pro** | Strong physics for heddle/reed motion; keyframes carry the look | **8.75** |
| 4 Exploded construction | **high** (layer separation + reassembly, structural accuracy) | **Seedance 2.0 Std 1080p** ⭐ | Hardest shot; needs multi-reference fidelity to the real tape. Same preview-then-final gate | 17.5 + **45** |
| 5 Knitting | medium | **Kling 3.0 Pro** | Same reasoning as shot 3 | **8.75** |
| 6 Product payoff | low (slow pull-back) | **Kling 3.0 Pro** | Minimal motion; start frame is our own product photo | **8.75** |
| Mobile version | — | **none**: ffmpeg crop of the master | Framing rules in §1 make the crop work | **0** |
| Audio | — | **none** | Hero is muted | **0** |

Why not the cheaper Veo 3.1 Lite or Hailuo for the simple shots? They save only 1–3 credits per
shot, but output resolution and end-frame support are not confirmed for this pipeline. One failed
chained shot costs more than the saving. Kling 3.0 Pro is the cheapest *confirmed* fit.

### Budget

| Line | Credits |
|---|---|
| Keyframes (28 imgs max) | 28 |
| Standard shots 1, 3, 5, 6 | 35 |
| Premium previews 2, 4 (720p fast) | 35 |
| Premium finals 2, 4 (1080p std) | 90 |
| **Planned total** | **188** (≈12% of balance) |
| Contingency: 1 retry per standard shot (35) + 1 premium final retry (45) + 7 extra stills (14) | 94 |
| **Hard cap (stop and ask if reached)** | **≈ 280** |

### Spend gates (nothing moves past a gate without your OK)

1. **Gate A (≈28 cr):** 7 keyframes → you approve the look, framing and brand fit. Re-rolls happen here, cheaply.
2. **Gate B (≈70 cr):** the four Kling shots plus the two Seedance 720p previews → approve motion and continuity.
3. **Gate C (≈90 cr):** the two premium 1080p finals.
4. **Stop-loss:** any single shot that fails twice gets simplified (e.g. shot 4 becomes a slower,
   partial explode) instead of re-rolled on premium.

---

## 4. Site integration (post-generation, code-side)

- One `<video autoplay muted loop playsinline preload="metadata" poster=…>` replaces the `<img>` in
  `HeroSlider`. Same `object-cover opacity-60`, same gradient overlay.
- **Slide text is driven by the video clock:** `current = floor(currentTime / 5)`. Dots `seek` to
  `i × 5`. The existing `motion` text animations, copy, CTAs and stats are untouched.
- **Encodes:** desktop 1920×1080 H.264 MP4 plus WebM, target ≤ 5 MB. Mobile file is a pre-cropped
  **608×1080** (x offset ≈ 945 px, the mobile spine), target ≤ 1.5 MB, chosen via
  `<source media="(max-width: 767px)">`.
- **Poster / LCP:** K0 still as WebP, preloaded.
- **Fallbacks:** `prefers-reduced-motion` or `Save-Data` shows the poster and the existing image
  slider unchanged.
- Assets go in `public/video/hero-*.{mp4,webm}` and `public/video/hero-poster.webp`.

---

## 5. Draft prompts (to be tuned at Gate A)

**Shared style suffix:** *low-key studio macro, charcoal/slate-900 background, soft top-left key
light, shallow depth of field, photoreal textile, IC blue #004A99 and white yarns, subject centred
at 66% frame width, left 45% of frame dark and empty, no text, no logos, no people, 16:9.*

- **K0 / S1:** Three yarn cones on a charcoal surface: matte white cotton, IC-blue polyester,
  golden-yellow aramid. Slow push-in; a single blue yarn end lifts from the cone and rises
  vertically out of frame.
- **S2:** A flat glowing pattern grid in IC blue and white, each square one warp-end × weft-pick,
  forming a geometric eight-point star lattice. Row by row the flat squares extrude into real
  interlaced yarns, vertical warp and horizontal weft, until the grid becomes a woven jacquard
  fabric. Smooth continuous transformation, locked camera then slight pull-back.
- **S3:** Macro of a narrow-fabric needle loom: vertical warp threads through heddles, the reed
  beats each weft pick, a narrow blue jacquard tape advances toward the camera. Precise, rhythmic,
  industrial.
- **S4:** A navy jacquard elastic tape floating in dark space separates into an exploded view:
  a layer of ground warp threads, a layer of parallel elastane core strands, weft picks, and the
  white figure yarns carrying a star-lattice motif. The layers hover apart, hold, then glide back
  and interlock into the finished tape. Technical, clean, photoreal.
- **S5:** Extreme macro of crochet knitting needles forming loops of IC-blue elastic yarn, latches
  opening and closing, a knitted elastic tape growing downward.
- **S6:** A navy woven elastic tape (from the reference photo) loops gracefully across the frame,
  camera slowly pulls back to reveal neat rolls of navy, white and striped narrow tapes on
  charcoal. Motion decelerates to near-still.

---

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Woven "INTERCONVERTERS" text on the shot-6 tape warps during motion | Minimal motion on that element. If it still warps, swap to a plain navy/striped tape (keyframe re-roll, 2 cr) |
| Morph shots (2, 4) come out mushy | 720p preview gate before the 1080p spend; strong start **and** end keyframes |
| Continuity drift between shots | Chained keyframes; shared style suffix; same reference set on every still |
| Subject drifts into the text zone | Framing written into every prompt; checked at Gate A against a hero overlay mock |
| Page weight / LCP | Poster-first, `preload="metadata"`, separate small mobile file, reduced-motion/Save-Data fallbacks |

---

## 7. Decisions needed before any credits are spent

1. **Approve the credit plan:** 188 planned, hard cap ≈ 280.
2. **Slide order:** OK to reorder the 6 existing slide entries (copy verbatim) to match the story?
3. **Reference uploads:** OK to upload `LOGO1.png`, `studio-jacquard.jpg`, `studio-woven.jpg`,
   `1.jpg`, `4.jpg`, `a-2-crochet-machine-500x500.jpg` to Higgsfield as generation references?
4. **Mobile:** crop of the master (0 cr, recommended), or dedicated 9:16 renders of shots 2 and 4 (+≈90 cr)?

**All four approved 2026-09-10** (as recommended: 188 planned / ≈280 cap, reorder slides, upload refs, mobile = crop).

---

## 8. Gate A — keyframes (in progress)

Stills saved in `docs/hero-video/keyframes/`. Nano Banana 2 · 2K (2752×1536).

| Key | Pick | Why | Rejected |
|---|---|---|---|
| K0 | **K0b** | Blue cone centred at ≈67% = mobile spine; loose yarn end ready to lift | K0a: blue cone off-centre |
| K1 | **K1b** | Vertical yarn through glowing grid at ≈66%; clean | K1a: grid has **printed numerals** (text rule) |
| K2 | **K2d** (+ **K2c** as woven-lattice style ref for shot 2) | **Client pick:** closest to the IC logo — blue hexagons laced with white interlace bands. K2d shows the split clearly: design grid with logo-style blue hexagons on the left, woven interlace on the right | K2a/b: paper-style panel; K2e/K2f: eight-point stars from `graph-ref.png`, further from the logo than the hexagon lattice |
| K3 | **K3b** | Warp threads in the spine (top band), tape in bottom band; left side falls into dark | K3a: ring-shaped heddles look unreal; machine intrudes into text zone |
| K4 | **K4a** | Eight-point Islamic geometric jacquard motif, S-curve in x 43–83% | K4b: floral motif, loop intrudes to x 35% |
| K5 | **K5a** | Knitted tape exactly in the mobile spine (x 53–75%) | K5b: thin tape, machine intrudes |
| K6 | **K6b** | Product group x 44–100%, calm end frame | K6a: loop reaches into text zone |

**Structural fix found at Gate A:** shot 4 (exploded construction) now runs **K4a → K4a**: the
tape explodes and snaps back into the same pose. Shot 3 → 4 becomes a match cut (tape on loom →
same tape floating) instead of a loom-to-tape morph inside the expensive shot. Shot 5 = K4a → K5a.

**K2 re-roll #1 (K2c, K2d): rejected.** Even with the logo, K4a and an explicit "eight-pointed
only" instruction, the model still produced six-pointed/interlaced-triangle lattices. Prompting
alone is not reliable for this motif, so the graph is now **drawn deterministically**
(`tools/render_graph.py` → `keyframes/graph-ref.png`: eight-point star-and-cross lattice quantised
to square cells, like the Studio pattern-grid export) and used as the exact-pattern reference
for one final bounded K2 attempt. (Render took three passes, all free: touching stars → squat
two-square stars → final true 16-vertex eight-point star polygons, 64×64 cells, 3×3 stars.)

**Spend so far:** 28 (14 stills) + 4 (K2 re-roll #1) + 4 (K2 final, graph-ref) = **36 credits**,
verified against the live balance (1,585.4 → 1,549.4). Gate A came in at 36 vs 28 planned; the
extra 8 came from the keyframe-retry contingency.

**Gate A picks: K0b · K1b · K2d · K3b · K4a · K5a · K6b** (K2 switched from K2f to K2d on
client feedback; K1b's lit cell already carries the same lattice, so no K1b fix needed).
Awaiting approval before Gate B.
Preview with the hero treatment: `keyframes/gate-a-contact-sheet.jpg`.

**Gate A approved** (with client pick K2d). K4 redone to carry the logo lattice: first attempt
(K4c) copied K4a's rosette pose reference too literally, second attempt (K4d, K2c + logo refs
only) succeeded → **K4d** replaces K4a. Stills total: **40 credits**.

---

## 9. Gate B — motion previews (in review)

Clips in `docs/hero-video/clips/` (review page: `clips/review.html`, served by the `hero-clips`
launch config). Submission note: Higgsfield intercepted the first submission of shots 1, 2, 6
with a "IN THE DARK" preset recommendation (not charged); resubmitted with the preset declined
to keep the approved keyframe look.

> **⚠ CORRECTION:** the ❌ "frozen" verdicts in the table and *Finding* below are **wrong**.
> They were a review-tool artifact, not a problem with the clips (see *Correction* at the end
> of this section). All four Kling clips move and land on their end keyframes.

Reviewed with an exact-seek canvas filmstrip (6 frames per clip incl. the true last frame).
All clips 5.04 s; Kling 1928×1076, Seedance Fast 1280×720.

| Shot | Model | Clip | Result |
|---|---|---|---|
| 1 | Kling 3.0 Pro | `shot1-kling-pro.mp4` | ❌ holds the K0b cones to the last frame; end frame (K1b) ignored |
| 2 | Seedance 2.0 Fast 720p | `shot2-seedance-fast-720p.mp4` | ✅ yarn → hexagon grid → half-woven → ends on K2d |
| 3 | Kling 3.0 Pro | `shot3-kling-pro.mp4` | ❌ holds the K2d panel; never reaches the loom (K3b) |
| 4 | Seedance 2.0 Fast 720p | `shot4-seedance-fast-720p.mp4` | ✅ layers explode and reassemble to K4d |
| 5 | Kling 3.0 Pro | `shot5-kling-pro.mp4` | ❌ holds the K4d tape; never reaches the knitting machine (K5a) |
| 6 | Kling 3.0 Pro | `shot6-kling-pro.mp4` | ❌ holds the K5a knitting machine; never reaches the product rolls (K6b) |

**Finding:** the four Kling 3.0 Pro clips are **frozen stills**. Mean per-pixel difference
between successive frames (11 exact-seek samples at 96×54) is **0.00 on every step, first→last
0.00**, vs 10–34 per step on the Seedance clips. So this isn't a weak creative take; the service
returned the start image as a 5 s static video, and it was charged (4 × 8.75 = 35 cr).
Seedance 2.0 honoured start + end on both morph shots.
(An earlier reading that shot 2 "returns to K1b" came from inaccurate `#t=` media-fragment
seeking, not the clip.)

**Spend:** 40 (stills) + 70 (Gate B) = **110 credits**, verified (balance 1,475.4).

**Recovery plan:** test shot 1 on **MiniMax H3 2K** (start + end frames, 10 cr) — *test
approved 2026-09-10; rollout needs separate approval.* If it moves → shots 3, 5, 6 on H3 (+30).
If it fails → shots 1, 3, 5, 6 on Seedance 2.0 Fast 720p (+70). Premium 1080p finals for
shots 2 + 4 (90) unchanged.

**H3 test result — ✅ pass** (`clips/shot1-minimax-h3.mp4`, job `d76b6335`, 2560×1440, 5.17 s).
Motion steps 8–17 easing to 1.1 at the end (first→last 31.8). Keyframe match (mean per-pixel
diff at 96×54): first frame vs K0b **4.3**, last frame vs K1b **4.5** (K0b vs K1b = 29.4 for
scale). Visually: cones → push-in as the blue yarn glows through the cone → yarn through the
design grid. Replaces the frozen Kling shot 1. Running total **120 credits**.

**H3 rollout approved 2026-09-10:** shots 3, 5, 6 on MiniMax H3 2K (3 × 10 cr, preflighted
with their real keyframes). Running total after submission: **150 credits**, verified
(balance 1,435.4).

### Correction: the Kling clips were never frozen

The review page was served by `python -m http.server`, which doesn't support HTTP Range
requests, so Chrome couldn't seek into clips that hadn't fully downloaded and returned stale
frames. The misread tracked file size: the 7–8 MB Kling clips (and the 4.4 MB H3 shot 3)
"froze", while the ~3 MB clips measured correctly. The same issue caused the earlier `#t=`
glitches and the filmstrips that disagreed with the pixel metric.

Re-measured with each clip **fully downloaded into memory (blob URL) before seeking**
(mean per-pixel diff at 96×54, lower = closer):

| Clip | First vs start KF | Last vs end KF | Motion (max step) | Verdict |
|---|---|---|---|---|
| Kling shot 1 (7.3 MB) | 3.0 | 3.6 | 23.5 | ✅ |
| Kling shot 3 (8.1 MB) | 7.8 | 9.5 | 42.2 | ✅ |
| Kling shot 5 (8.2 MB) | 4.3 | 7.3 | 18.4 | ✅ |
| Kling shot 6 (7.7 MB) | 5.9 | 3.4 | 32.0 | ✅ |
| H3 shot 1 (3.6 MB) | 4.3 | 4.5 | 17.5 | ✅ |
| H3 shot 3 (4.4 MB) | 10.3 | 10.6 | 34.4 | ✅ |
| H3 shot 5 (3.6 MB) | 5.9 | 7.3 | 23.9 | ✅ |
| H3 shot 6 (3.0 MB) | 7.5 | 4.4 | 37.7 | ✅ |

**Consequences**
- The H3 recovery (10 + 30 = **40 credits**) was based on a wrong diagnosis and wasn't needed.
  Result: two working takes of shots 1, 3, 5, 6 (Kling 1928×1076 vs H3 2560×1440) to choose from.
- **No refund claim** for the four Kling jobs; they're fine.
- `clips/review.html` now loads each clip as a blob before seeking.

### Take selection (confirmed by client 2026-09-10)

**Gate C approved 2026-09-10:** Seedance 2.0 Std 1080p finals for shots 2 + 4 (2 × 45 cr,
preflighted with real keyframes, same prompts/keyframes as the working previews). Running
total after submission: **240 credits** (cap ≈280), verified against the live balance
(1,585.4 → 1,345.4). No further generation planned.

| Final | Clip | Check (blob-loaded, mean per-pixel diff at 96×54) | Result |
|---|---|---|---|
| Shot 4 | `shot4-seedance-std-1080p.mp4` (job `85441a91`, 1920×1080, 5.04 s, 6.6 MB) | first vs K4d **5.8**, last vs K4d **5.6**, furthest from K4d mid-clip 28.9; steps 7–26 | ✅ explodes and reassembles to the same pose; cleaner layer stack than the preview |
| Shot 2 | `shot2-seedance-std-1080p.mp4` (job `445f9c3c`, 1920×1080, 5.04 s, 5.3 MB) | first vs K1b **3.7** ✓; last vs K2d **26.5** ✗ (K1b vs K2d = 22.7 for scale); steps 11–23 | ⚠ smooth graph → yarn transformation, but ends on a **fully woven** panel, not K2d's half-grid/half-woven panel (the preview did the same; masked earlier by the seek bug) |

### Join continuity (chosen takes, blob-loaded, mean per-pixel diff at 96×54)

| Join | Clip's true last frame vs next clip's first | Frame at 5.0 s vs next first | Reading |
|---|---|---|---|
| 1→2 | 3.7 | 30.8 | seamless *if* the true last frame is used; see note |
| 2→3 | 29.0 | 29.0 | ✗ shot 2 ends fully woven → crossfade |
| 3→4 | 32.3 | 32.3 | planned match cut (loom → floating tape), lands on a slide change |
| 4→5 | 5.1 | 5.1 | ✓ seamless |
| 5→6 | 6.8 | 26.6 | seamless *if* the true last frame is used; see note |
| 6→1 loop | 37.2 | 31.5 | ✗ product rolls → cones; needs a baked loop crossfade |

**Note:** on both Kling joins (1→2, 5→6) the frame at 5.0 s is far from the next clip but the true
last frame (≈5.02 s) matches it. Either Kling snaps to its end keyframe on the very last frame
(a 1-frame pop), or browser seeking isn't frame-accurate at the clip tail. That needs a
frame-accurate check with ffmpeg before the join treatment is final. It also means the encode
must not simply trim at 5.0 s; retiming each full clip to 5.0 s (≤3.4% speed change) keeps
the true last frames.

**Encode tooling (approved 2026-09-10):** FFmpeg 9.0.1 full build via `winget install --id
Gyan.FFmpeg --exact` (portable zip, 251 MB, gyan.dev builds on GitHub `GyanD/codexffmpeg`,
winget-verified SHA256 `2e8e28af…5b00`). `tools/check_tails.sh` does a frame-accurate tail/head
inspection of each take before the join treatment is finalised. The 6 → 1 loop seam is baked
into the file: the last 0.5 s fades into shot 1's first frame.

**Tail check (ffmpeg, frame-accurate):** all takes are 24 fps; the Kling and Seedance takes have
121 frames (5.04 s), H3 shot 3 has 124 (5.17 s). The last 8 frames of Kling shots 1 and 5 are a
stable settled pose that matches the next take's first frames (`build/tails/*.png`). **No
last-frame snap:** joins 1→2 and 5→6 are seamless straight cuts. The earlier "frame at 5.0 s"
gap was browser seek inaccuracy. Trimming at 5.0 s drops at most one near-identical frame, so no
retime is needed.

**Shot 2 → 3 join fix (0 credits):** a 0.5 s crossfade at that join in `tools/encode_hero.sh`.
Shot 3's near-still last frame is held 0.33 s so every shot still ends on a 5 s boundary. A
re-render (45 cr) would take the total to 285, past the ≈280 cap.

---

## 10. Encode — done (2026-09-10)

`tools/encode_hero.sh` (FFmpeg 9.0.1). Takes: Kling 1, 5, 6 · MiniMax H3 3 · Seedance Std 1080p 2, 4.
Joins: 1→2 cut · 2→3 0.5 s crossfade · 3→4 match cut · 4→5 cut · 5→6 cut · 6→1 loop fade 0.5 s
(baked). Every shot boundary lands on a multiple of 5 s (slider sync).

The first run failed (`xfade` timebase mismatch after `concat`; fixed with `settb=1/30`). An
earlier "exit 0" was a pipe masking the failure. Final run: real exit code 0.

| Output (`IC-website/public/video/`) | Spec | Size | Target |
|---|---|---|---|
| `hero-desktop.mp4` | H.264 High, 1920×1080, 30 fps, 900 frames, 30.000 s, faststart, no audio | **4.80 MB** (1.28 Mbps) | ≤ 5 MB ✓ |
| `hero-desktop.webm` | VP9, 1920×1080, 30 fps, 900 frames, 30.000 s, no audio | **4.40 MB** (1.17 Mbps) | ≤ 5 MB ✓ |
| `hero-mobile.mp4` | H.264 High, 608×1080 pre-cropped spine (x = 945), 900 frames, faststart, no audio | **1.48 MB** (396 kbps) | ≤ 1.5 MB ✓ |
| `hero-poster.webp` | 1920×1080, first frame (K0b) | 52 KB | — |
| `hero-poster-mobile.webp` | 608×1080 spine crop | 36 KB | — |

Bitrate caps were tightened after a first pass came in slightly over (desktop 1400k → 1300k,
mobile 420k → 390k).

**Verification** (`build/verify/`): one mid-shot frame per slide confirms the story order on
desktop and mobile; frames either side of each 5 s boundary confirm the join treatments; loop
seam SSIM first vs last frame **0.944** (vs 0.605 for the raw 6 → 1 cut). The mobile crop keeps
the subject in frame in all six shots; the left ~45% stays dark behind the copy.

---

## 11. Site integration — done (approved 2026-09-10)

Only `HeroSlider` in `src/pages/Home.tsx` changed. Nav, badge, headline and subtitle copy, CTAs,
stats, gradient and 60% opacity are untouched.

- **Slides reordered** to the story (copy verbatim): Quality Material Selection → Jacquard
  Weaving → Precision Weaving → High-Tech Narrow Textiles → Advanced Knitting → Premium Tapes &
  Braids. Each keeps an image for the fallback slider.
- **Video layer** replaces the rotating `<img>`: `autoPlay muted loop playsInline`, `aria-hidden`
  (decorative; all copy stays HTML), `object-cover object-[72%_50%] opacity-60`, same gradient.
- **Sync:** `onTimeUpdate` → slide = `floor(currentTime / 5)`; dots seek to `i × 5`.
- **Files:** below 768 px, `hero-mobile.mp4` + mobile poster; otherwise `hero-desktop.webm`
  (then `.mp4`) + desktop poster. A `matchMedia` listener swaps files when the viewport crosses
  the breakpoint; the `<video>` is keyed on it and resumes at the current slide.
- **Fallbacks → original image slider with its 5 s timer:** `prefers-reduced-motion: reduce`,
  Save-Data, a load error on the last `<source>`, or a rejected `play()` (e.g. iOS Low Power
  Mode). `muted` is also set imperatively, because React doesn't reliably set the attribute
  iOS needs for autoplay.

**Verified** (dev server, `npm run dev`, port 3000):
- `tsc --noEmit` passes.
- Desktop 1053 px: `hero-desktop.webm` 1920×1080 playing, headline in sync (10.9 s → "Precision Weaving").
- Dot 4 → 15 s + "High-Tech Narrow Textiles".
- Phone 375×812: `hero-mobile.mp4` 608×1080; live resize desktop ↔ phone swaps files and keeps the slide.
- No Vite server errors.
- **Not browser-tested:** the reduced-motion / Save-Data / blocked-autoplay fallbacks (can't be
  emulated with the available tools). Reviewed in code: they reuse the original slider unchanged.

Found and fixed during verification: file choice was made once at mount, so a page first loaded
narrow kept the soft mobile file after widening. Now handled by the breakpoint listener.

**Post-deploy fix (found checking production):** the first release treated *any* `play()`
rejection as "autoplay blocked" and switched permanently to the image slider. In a hidden tab,
Chrome rejects with `AbortError` ("video-only background media was paused to save power"), so
visitors who opened the site in a background tab never got the video, even after switching to
it. Now only `NotAllowedError` (autoplay genuinely blocked, e.g. iOS Low Power Mode) falls back;
`AbortError` is ignored and `play()` is retried on `visibilitychange` → visible. Rejections
from a replaced (breakpoint-swapped) `<video>` are also ignored.

Console: one React warning ("final argument passed to useEffect changed size … `[true]` →
`[true, false]`"). It was the hot-reload swap of the edited effect, whose deps went from 1 to 2
while the page was mounted. It didn't recur across three further full reloads (count stayed at
1), and the current dependency arrays are fixed-length.

From reliable filmstrips (start / middle / end):

| Shot | Pick | Why | Alternate |
|---|---|---|---|
| 1 | **Kling** `shot1-kling-pro.mp4` | Middle frame shows a single blue yarn rising out of the cone: the exact story beat | H3 reads as a soft ghosted crossfade |
| 2 | Seedance preview → **1080p final** | Only take; morph works | — |
| 3 | **H3** `shot3-minimax-h3.mp4` | Panel shrinks into a single tape strip in darkness, then the loom: panel → tape → loom reads as one action | Kling reaches the loom early, less connected |
| 4 | Seedance preview → **1080p final** | Only take; explode/reassemble works | — |
| 5 | **Kling** `shot5-kling-pro.mp4` | Steady motion throughout; tape leaves as the machine arrives | H3 reaches the machine early, mid-clip lull |
| 6 | **Kling** `shot6-kling-pro.mp4` | Knitted tape falls onto the rolls; eases to near-still (0.9) at the loop point | H3 cuts to the product scene early |

Resolutions differ (Kling 1928×1076, H3 2560×1440, Seedance final 1920×1080); everything gets
encoded to 1920×1080 for the site, so the mix won't show.
