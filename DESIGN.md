# Design Brief: Maddox Arcade Hub

**Purpose:** Retro-futuristic arcade game hub for desktop browser play. Single-player games aggregated into one playable platform.

**Tone & Aesthetic:** Bold arcade energy meets contemporary gaming. Deep dark mode with vibrant neon accents (cyan, magenta, gold, purple). Inspired by 80s arcade cabinets with modern polish and high contrast for accessibility.

**Differentiation:** Per-game color coding (Golf=gold, Shooter=cyan, Snake=magenta, Flappy=purple). Glowing card borders, subtle scanline texture overlay, game-specific UI overlays.

## Palette

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| Background | `0.99 0 0` | `0.11 0 0` | Dark navy base, pure black game layers |
| Foreground | `0.15 0 0` | `0.96 0 0` | Text on dark |
| Primary | `0.35 0 0` | `0.48 0.28 262` | Blue-purple UI accents |
| Accent | `0.35 0 0` | `0.65 0.25 312` | Magenta highlights |
| Destructive | `0.55 0.22 25` | `0.65 0.22 22` | Error/warning red |
| Chart-1 | `0.65 0.22 40` | `0.75 0.28 262` | Cyan neon (Shooter) |
| Chart-2 | `0.6 0.12 185` | `0.72 0.24 312` | Magenta (Snake) |
| Chart-3 | `0.4 0.07 227` | `0.82 0.22 60` | Gold (Golf) |
| Chart-4 | `0.83 0.19 84` | `0.78 0.25 37` | Purple (Flappy) |

## Typography

| Role | Font | Scale | Weight | Usage |
| --- | --- | --- | --- | --- |
| Display | Bricolage Grotesque | 2.5rem–4rem | 700 | Main title, game names on tiles |
| Body | Figtree | 1rem–1.125rem | 400–600 | Menu text, score labels, UI copy |
| Mono | Geist Mono | 0.875rem | 400 | High scores, game stats, debug text |

## Structural Zones

| Zone | Background | Border | Elevation | Purpose |
| --- | --- | --- | --- | --- |
| Header | `0.14` (card) | `border-border` | Subtle shadow | Title, branding, nav |
| Game Grid | `0.11` (background) | None | Flat | 2×2 arcade tile layout |
| Game Tile | `0.14` (card) | Glowing accent | Game-glow | Clickable game selector with neon halo |
| Score Bar | `0.18` (popover) | `border-border` | Inset shadow | All-time high scores display |
| Game Overlay | `0.11` (background) | None | Full-screen | Active game canvas + UI |

## Spacing & Rhythm

- **Grid Gap:** 1.5rem (arcade-grid utility)
- **Padding:** 2rem container, 1rem internal tiles
- **Type Hierarchy:** 2.5rem display → 1.125rem body → 0.875rem mono

## Component Patterns

| Pattern | Implementation | Notes |
| --- | --- | --- |
| Game Tile | Card + game-glow shadow + arcade-grid | Per-game accent color via chart tokens |
| High Scores | Mono font + popover background | Fixed header or modal |
| Game UI | Canvas overlay + scanline texture | Score, lives, level display via UI overlay |
| Button States | Primary accent on hover + pulse-glow animation | Game selection feedback |

## Motion

- **Transitions:** 0.3s smooth cubic-bezier for all interactive elements
- **Animations:** pulse-glow (2s) on game tiles, float (3s) on scores
- **Entrance:** Staggered tile fade-in on page load (100ms stagger)
- **Gameplay:** Canvas-driven animations, no page-level transitions

## Shadow & Depth

- **Card Elevation:** game-glow (20px blur, magenta shadow with inset highlight)
- **Per-Game Shadows:** glow-cyan (Shooter), glow-magenta (Snake), glow-gold (Golf) — 30px radius, subtle intensity
- **No Drop Shadows:** Avoid traditional shadows; glow + border technique instead

## Constraints

- Minimum 4.5:1 contrast (WCAG AA) for all text on background
- Game canvas remains full-screen without page chrome during play
- Scanline overlay subtle (3% opacity) — readability first
- No animated GIFs or video backgrounds — static imagery + CSS animations only

## Signature Detail

**Arcade Scanlines:** Repeating horizontal lines (1px height, 0.03 opacity) across full background. Reinforces retro aesthetic without compromising legibility.
