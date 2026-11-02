<!-- SEED: established with the user before implementation; re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: Jughd
description: The midnight owl that names the reason — a calm, premium posture companion that watches, speaks specifically, and grows from your verdicts.
---

# Design System: Jughd

## Overview

**Creative North Star: "The Midnight Watch"**

Jughd is a watcher in a quiet room at night. The world is midnight navy and layered blues — the depth of a dark desk lit only by a screen — and the one warm light in it is the owl's amber gaze. The identity is warm and premium without decoration: calm, present, in-motion the way a living watcher is, never busy. It is a Persian-first RTL world where Vazirmatn speaks in every register and the owl illustration is the ever-present witness, not a mascot performing for attention.

Material character is tonal, not chrome: depth comes from layered blues stepping into the dark, hairlines instead of shadows, and a single emissive color — amber — that belongs to the owl's eyes and to the named alert. Imagery is authored, never stock: the owl is an illustration, and human figures are drawn as sparse landmark geometry rather than photographed people, so the page never shows a pixel the product would never let leave the device. Motion is the world's breath: slow, alive, purposeful; deviation lifts and cools the surface, confirmation settles it warm and flat, and every movement honors `prefers-reduced-motion`.

**Key Characteristics:**
- Midnight navy ground with layered-blue tonal depth; no decorative shadows.
- Amber gold as the only light: the owl's eyes and the named alert, nothing else.
- Oval geometry as the signature form — the gaze shape repeats in callouts, badges, and key actions.
- Sparse stars as punctuation; ornament is rare and small.
- Vazirmatn at extreme scale contrast; one family, one voice.
- The owl watches; it never performs. Calm, present, premium.

## Colors

A full palette of four committed roles on a midnight ground, resolved at implementation from these characters: deep navy and layered blues carry the surface, teal carries structure, and amber is the single point of light.

### Primary
- **Amber Gold** (`[to be resolved during implementation]`): the owl's eyes and the named alert — the reason an alert is legible in a glance. Never a generic accent.

### Secondary
- **Deep Teal** (`[to be resolved during implementation]`): structural color — rules, secondary controls, quiet emphasis against the navy.

### Neutral
- **Midnight Navy** (`[to be resolved during implementation]`): the ground of the whole world; the dark room the watch happens in.
- **Layered Blues** (`[to be resolved during implementation]`): a tonal step family used for depth — panels, stages, insets recede or advance by tone.
- **Moon Ivory** (`[to be resolved during implementation]`): text and the quiet paper-like surfaces where long reading happens.

### Named Rules
**The Amber Rule.** Amber exists in exactly two places: the owl's gaze and the named alert. Its rarity is its power; a page with three ambers is a page that has lost the plot.

## Typography

**Display Font:** Vazirmatn (fallback: Tahoma, sans-serif)
**Body Font:** Vazirmatn (fallback: Tahoma, sans-serif)

**Character:** One Persian family carried to every register — the discipline is scale contrast, not a second voice. Monumental display sizes sit beside small, precise labels; hierarchy is made of scale, weight, and the amber/navy color axis. RTL is native: logical properties, Persian numerals in all copy.

### Hierarchy
- **Display** (Black/900, `[size to be resolved]`, tight leading): the claim — the one line a visitor remembers.
- **Headline** (Bold/700, `[size to be resolved]`): section anchors.
- **Title** (Medium/500, `[size to be resolved]`): card and panel titles.
- **Body** (Regular/400, `[size to be resolved]`, comfortable leading, 65–75ch measure): reading copy.
- **Label** (Medium/500, small, slight tracking): meta, chips, verdicts, numeric readouts.

### Named Rules
**The Single Voice Rule.** Vazirmatn carries every role. When the type feels flat, the answer is a bigger scale jump or a change of color — never a second typeface.

## Layout

RTL-first, built on logical properties so every edge is correct in Persian. The spatial model is watchful asymmetry: one dominant presence (the owl, or the live stage) holds the field while text and action gather along the leading (right) edge; generous quiet around dense moments. One spacing rhythm runs throughout `[values to be resolved during implementation]`, with more space above a heading than below it. Responsive behavior keeps the watching presence and the named alert legible at every width; columns reflow, the gaze never shrinks into decoration.

## Elevation & Depth

Depth is tonal: layered blues step from midnight ground to lifted panels. There are no decorative drop shadows; a surface advances by tone and hairline, not by blur. The single emissive element in the system is amber — the owl's eyes and the named alert may carry a soft local glow, the one place light belongs.

### Named Rules
**The Tonal Depth Rule.** If a panel needs to lift, it lifts by tone and a hairline rule. Shadows are not the vocabulary of this world.

## Shapes

The signature form is the oval — the owl's gaze. Ovals carry callouts, badges, and the primary key actions; stars appear as sparse punctuation, never as pattern filler. Corner treatment follows the oval family (full radii on callout shapes, gentle radii on panels `[values to be resolved]`); borders are hairline. The silhouette language is round-eyed and calm, never spiky or playful.

## Do's and Don'ts

### Do:
- **Do** reserve amber for the owl's gaze and the named alert (The Amber Rule).
- **Do** draw human figures as sparse landmark geometry — the product's own visual language, consistent with the privacy floor.
- **Do** set all user-facing copy in Persian with Persian numerals, RTL logical properties throughout.
- **Do** keep motion slow and alive — the world breathes — and honor `prefers-reduced-motion` with settled states.
- **Do** use the oval as the recurring form for anything that names or alerts.

### Don't:
- **Don't** scatter amber as a general accent, link color, or gradient.
- **Don't** nag: no warning-red energy, shame language, or scolding states — this world coaches in a calm voice.
- **Don't** frame anything clinically or medically — no hospital palette, no diagnosis patterns.
- **Don't** reach for stock-SaaS defaults: gradient heroes, glassmorphism, feature-card rows, or component-library assemblage.
- **Don't** use photographed people as hero imagery; the world is illustration and geometry.
- **Don't** visualize fabricated claims: demonstration data is authored and labeled synthetic; statistics render only from real aggregates.
