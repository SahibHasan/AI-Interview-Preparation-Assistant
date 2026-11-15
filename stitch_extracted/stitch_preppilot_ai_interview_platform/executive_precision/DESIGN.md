---
name: Executive Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004c76'
  on-tertiary: '#ffffff'
  tertiary-container: '#00659a'
  on-tertiary-container: '#bedfff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system establishes an aura of composure, analytical rigor, and executive-level authority for an AI-powered interview preparation platform. The visual tone departs entirely from playful consumer chatbot tropes, avoiding hyper-saturated neon glows, synthetic mesh gradients, and gimmicky sparkles. Instead, it projects the quiet confidence of an elite executive coaching suite.

Targeted at candidates preparing for high-stakes technical, product, and leadership interviews, the interface prioritizes cognitive clarity and deep focus. The aesthetic merges contemporary high-density SaaS utility with subtle editorial refinement: crisp structural borders, micro-elevated slate surfaces, grounded deep navy structural navigation, and laser-targeted indigo data signals. Interactions feel deliberate, deterministic, and friction-free, assuring users that their preparation is guided by systematic, institutional intelligence.

## Colors
The color architecture operates on a deliberate split-canvas logic: rich structural anchor frames juxtaposed against pristine, cool-tinted workspaces.

- **Primary (`#4f46e5` - Electric Indigo):** Reserved for primary calls-to-action, active stage steppers, and focal AI feedback moments. Its darker counterpart (`#4338ca`) governs interactive hover states, while `#6366f1` serves as an active border or selection outline.
- **Secondary (`#0f172a` - Deep Slate Navy):** Deployed for persistent navigation rails, primary headers, and terminal-level metrics. It establishes visual grounding, ensuring the app reads as an enterprise platform rather than a transient utility. A stepped tone (`#1e293b`) is utilized for sub-panels or flyouts within dark modules.
- **Tertiary (`#0284c7` - Deep Sky):** Used selectively for telemetry indicators, benchmark comparisons, and non-actionable status data.
- **Neutral (`#64748b` - Cool Slate):** Governs secondary prose, structural iconography, and subtle UI metadata. Surface backdrops strictly employ `#f8fafc` for the canvas and `#f1f5f9` for secondary recessed panels.
- **Functional Semantics:**
  - Success / Readiness: `#059669` (Emerald 600)
  - Caution / Improvement Need: `#d97706` (Amber 600)
  - Critical / Weak Response: `#dc2626` (Red 600)
- **Dividers & Structural Rules:** Crisp, hairline borders must utilize `#e2e8f0` on light canvases and `#334155` within dark navigation panes.

## Typography
The typographic hierarchy leverages a dual-engine architecture:

1. **Plus Jakarta Sans (Headings & Metric Scoring):** Delivers clean geometric warmth with high-end executive authority. Used strictly for section titles, modal headers, scorecard aggregates, and dashboard titles. Its tight tracking creates an intentional editorial presence without sacrificing readability.
2. **Inter (Body, Analysis Transcripts, Form Fields & Badges):** Provides neutral, highly legible utility for complex interview transcripts, simulated feedback, behavioral question breakdowns, and metric descriptions.

**Application Rules:**
- Avoid sentence-casing for tags and micro-labels; use uppercase with subtle positive letter spacing (`label-sm`).
- AI feedback suggestions and mock interview speech transcriptions must render in `body-lg` with heightened line-height (`26px`) to reduce ocular fatigue during exhaustive review sessions.
- Quantitative data points (e.g., "87% Readiness Index") pair a `headline-lg` numeric display with a `label-md` neutral descriptor.

## Layout & Spacing
The layout relies on an asymmetrical split-pane system:
- **Navigation Anchor:** A fixed desktop sidebar (280px) bathed in `#0f172a`, providing persistent access to session history, rubric templates, and mock environments.
- **Main Canvas:** Fluid grid with fixed max-width constraints (1440px max) nested in `#f8fafc`. The desktop view adheres to a 12-column layout with 24px (`1.5rem`) gutters and 32px (`2rem`) boundary margins.
- **Simulation Dual-Pane:** During active interview simulations, the layout collapses into a dual-column split: 60% viewport width for the media/video/transcript feed and 40% for the real-time AI context monitor.

**Responsive Adjustments:**
- **Tablet (768px – 1024px):** Sidebar collapses to an icon rail (72px). Canvas margins shift to 24px (`1.5rem`).
- **Mobile (< 768px):** Navigation tucks into a bottom sheet or off-canvas drawer. The grid drops to a single column with 16px (`1rem`) gutters and canvas padding. Dynamic cards stack vertically.

## Elevation & Depth
Depth is produced through structural boundaries combined with micro-diffused ambient drop shadows, rejecting intense artificial layering.

- **Flat Canvas Plane:** Surfaces default to `#f8fafc`. Cards, containers, and analysis panels sit at `#ffffff`.
- **Crisp Structural Boundaries:** Every elevated card must feature a 1px solid border in `#e2e8f0` to anchor edges against the canvas.
- **Restrained Micro-Elevation:**
  - *Resting Card:* `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`
  - *Interactive Hover:* `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` accompanied by a border transition to `#cbd5e1`.
  - *Active Popover & Dropdown:* `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)` with `#ffffff` fill and `#e2e8f0` stroke.
  - *Focus Highlight:* Instead of glow rings, focused states use a clean dual-ring: 2px `#ffffff` inner offset followed by a 2px `#4f46e5` primary ring.

## Shapes
The design system establishes a unified corner radius architecture centered on level 2 roundedness, with specific tierings:
- **Cards & Analysis Containers:** Consistently use `rounded-xl` (1.5rem / 24px outer geometry or 1rem / 16px inner modules) to maintain a modern SaaS presence without appearing overly soft or childish.
- **Buttons, Text Inputs & Selection Cells:** Use standard `rounded` (0.5rem / 8px) for crisp operational efficiency and immediate spatial recognition.
- **Badges, Status Pills & Tags:** Use full pill shapes (`9999px`) to create distinction between actionable square inputs and passive metric badges.
- **Embedded Media & Audio Visualizers:** Contained in `rounded-lg` (1rem / 16px) with an inner 1px border stroke.

## Components

### Buttons
- **Primary:** Filled `#4f46e5` with crisp `#ffffff` text, font weight 600, `rounded` (8px). Hover state transitions to `#4338ca`. Active state transitions to `#3730a3`.
- **Secondary / Outline:** Background `#ffffff`, 1px border in `#e2e8f0`, text in `#0f172a`. Hover transitions to `#f8fafc` background with `#cbd5e1` border.
- **Ghost:** Background transparent, text `#475569`. Hover transitions to `#f1f5f9` with text `#0f172a`.
- **Destructive:** Background `#ffffff`, border `#fecaca`, text `#dc2626`. Hover transitions to `#fef2f2`.

### Cards & Analysis Panels
- Built with a `#ffffff` fill, 1px `#e2e8f0` structural border, and `rounded-xl` corners.
- Header zones contain an integrated 1px divider border at the bottom, segregating title metadata from analytical body content.
- Cards feature explicit internal padding of `space-lg` (24px).

### Input Fields & Selectors
- Background `#ffffff`, 1px border `#cbd5e1`, 8px corner radius.
- Placeholder text in `#94a3b8`. Active text in `#0f172a`.
- Active focus state: border shifts to `#6366f1` with zero fuzzy blur; uses a 2px solid crisp focus ring.
- Disabled state: background `#f1f5f9`, border `#e2e8f0`, text `#94a3b8`.

### Status Indicators & Badges
- Pill-shaped (`rounded-full`) with a unified internal padding of 4px vertical, 10px horizontal.
- **AI Suggested / Optimal:** Background `#eef2ff`, border `#c7d2fe`, text `#4338ca`.
- **Needs Review:** Background `#fffbeb`, border `#fde68a`, text `#b45309`.
- **Critical Gap:** Background `#fef2f2`, border `#fecaca`, text `#b91c1c`.
- **Benchmarked Metric:** Background `#f0f9ff`, border `#bae6fd`, text `#0369a1`.

### Audio Waveform & Speech Visualizer
- Minimalist vertical amplitude bars (width: 3px, gap: 2px, radius: 2px).
- Inactive state: `#cbd5e1`. Active voice detection: `#4f46e5` transition with zero outer glowing halos.

### Score & Progress Rings
- Circular data visualizations implement clean flat strokes with `#e2e8f0` as track background and `#4f46e5` for completion percentage.
- Centered typography reveals raw score in Plus Jakarta Sans (`headline-md`) over a micro label descriptor.