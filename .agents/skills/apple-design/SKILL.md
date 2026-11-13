---
name: apple-design
description: >-
  Applies Apple Human Interface Guidelines (HIG), macOS/iOS frosted-glass vibrancy,
  SF Pro typography hierarchy, Apple color tokens (#F5F5F7, #1D1D1F, #86868B, #0071E3),
  generous whitespace, and smooth spring transitions. Activate whenever designing or
  styling web, desktop, or mobile user interfaces.
---

# Apple Design System & Human Interface Guidelines (HIG)

Follow these Apple design standards to create clean, minimal, tactile, and intuitive user interfaces inspired by macOS, iOS, and apple.com.

---

## 1. Core Principles (Clarity, Deference, Depth)

1. **Clarity**:
   - Text is legible at every size (`-webkit-font-smoothing: antialiased`).
   - Icons are precise and paired with concise labels.
   - Adornments are subtle; every visual element serves a clear functional purpose.
2. **Deference (Content First)**:
   - Fluid motion and a crisp, minimal interface help people understand and interact with content without competing with it.
   - Use generous whitespace and avoid heavy borders or noisy backgrounds.
3. **Depth & Vibrancy (Frosted Glass)**:
   - Use translucent materials (`backdrop-filter: saturate(180%) blur(20px)`) for sticky headers, toolbars, and floating bars so content softly shines through as it scrolls.
   - Layer elevated cards (`#FFFFFF`) over a subtle cool-gray canvas (`#F5F5F7`).

---

## 2. Apple Color Tokens

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| **Canvas Background** | `#F5F5F7` | Main page background |
| **Elevated Surface** | `#FFFFFF` | Cards, modals, message bubbles, inputs |
| **Translucent Surface** | `rgba(255, 255, 255, 0.75)` | Sticky navbars & floating bars (with `blur(20px)`) |
| **Primary Ink** | `#1D1D1F` | Headings and primary body text |
| **Secondary Ink** | `#86868B` | Subtitles, captions, and muted labels |
| **Apple Blue (Primary)** | `#0071E3` (Hover: `#0077ED`) | Primary buttons, active links, focus rings, user bubbles |
| **Apple Blue Tint** | `#E8F2FF` | Subtle icon badges, active chips, hover highlights |
| **Apple Green** | `#34C759` (Tint: `#EAF9EE`) | Success badges, high match scores, online indicators |
| **Apple Red** | `#FF3B30` | Destructive actions and error states |
| **Hairline Border** | `rgba(0, 0, 0, 0.08)` (`#D2D2D7`) | Crisp 1px dividers and card outlines |

---

## 3. Typography (SF Pro Aesthetic)

- **Font Stack**:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  ```
- **Hierarchy & Tracking**:
  - **Display / Hero (`h4`)**: `font-weight: 700`, `letter-spacing: -0.028em`, `line-height: 1.15`.
  - **Section Title (`h5` / `h6`)**: `font-weight: 600`, `letter-spacing: -0.02em`, `line-height: 1.25`.
  - **Body Copy (`body1`)**: `15px–16px`, `font-weight: 400`, `letter-spacing: -0.01em`, `line-height: 1.6`.
  - **Caption / Metadata**: `12px–13px`, `color: #86868B`, `font-weight: 500`.

---

## 4. Geometry, Shadows & Micro-Interactions

1. **Continuous Corner Radii**:
   - Cards & Panels: `16px–20px`
   - Buttons & Inputs: `12px` (or `980px` pill shape for primary CTAs)
   - Chips & Badges: `980px` (pill)
2. **Diffused Ambient Shadows**:
   - Resting Card: `0 2px 12px rgba(0, 0, 0, 0.04)` with `1px solid rgba(0, 0, 0, 0.06)`
   - Hover / Floating Bar: `0 8px 30px rgba(0, 0, 0, 0.08)`
   - Focus Ring: `0 0 0 4px rgba(0, 113, 227, 0.18)`
3. **Smooth Spring Transitions**:
   - Use `transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)` on interactive elements.

