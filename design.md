# Design — Melete

A locked design system for the Melete website. Every page uses the same visual
language while keeping its existing route, content, scripts, forms, and backend
ownership.

## Genre

Editorial with modern-minimal application surfaces. The site should feel
scholarly, calm, direct, and precise rather than promotional or decorative.

## Macrostructure family

- Marketing pages: Editorial Product Walkthrough with rule-led lists and product evidence.
- App pages: Workbench with compact controls, clear task hierarchy, and paper panels.
- Content pages: Long Document with a narrow reading measure and anchored navigation.

## Theme

- `--color-paper`: `oklch(97.5% 0.012 82)`
- `--color-paper-2`: `oklch(94.5% 0.018 79)`
- `--color-paper-3`: `oklch(91% 0.022 77)`
- `--color-ink`: `oklch(22% 0.035 260)`
- `--color-ink-2`: `oklch(42% 0.035 258)`
- `--color-rule`: `oklch(80% 0.022 78)`
- `--color-accent`: `oklch(39% 0.135 259)`
- `--color-accent-ink`: `oklch(98% 0.008 82)`
- `--color-focus`: `oklch(63% 0.19 250)`

## Typography

- Display: Playfair Display, weight 600–700, roman
- Body: Inter, weight 400–700
- Utility: Inter, uppercase only for short labels
- Display tracking: `-0.035em`
- Display scale anchor: `clamp(3.3rem, 7.5vw, 6.9rem)`

## Spacing

Use the named 4-point scale in `tokens.css`. Page-specific CSS consumes the
tokens and does not introduce arbitrary colour or font values.

## Motion

- Easings: `--ease-out`, `--ease-in`, and `--ease-in-out`
- Reveal pattern: short opacity and transform changes only
- Reduced motion: opacity-only at 140ms or less

## Microinteractions stance

- Silent success; errors appear beside the control that caused them
- Visible, immediate focus rings
- Buttons move at most two pixels and return immediately on active state
- No tilt, magnetic pull, text scrambling, or decorative counters on task pages

## CTA voice

- Primary: royal-blue square button, short verb-led label
- Secondary: paper surface with a thin rule and ink text

## Per-page allowances

- Marketing pages may use one product demonstration as enrichment.
- App pages use function as the visual focus.
- Content pages use typography, rules, and restrained callouts only.

## What pages MUST share

- Melete wordmark and royal-blue accent
- Playfair Display and Inter
- Warm paper surfaces and ink navy text
- Button, form, focus, rule, and panel treatment
- Compact utility labels and consistent navigation rhythm

## What pages MAY differ on

- Page-level macrostructure within its declared family
- Density according to task complexity
- Presence of a sidebar, filter rail, report sheet, or live-session stage

## Exports

### tokens.css

The canonical CSS export is maintained in `tokens.css` and mirrored to
`public/tokens.css` for production delivery.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(97.5% 0.012 82);
  --color-ink: oklch(22% 0.035 260);
  --color-accent: oklch(39% 0.135 259);
  --font-display: "Playfair Display", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;
  --spacing-md: 1.5rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "color": {
    "paper": { "$value": "oklch(97.5% 0.012 82)", "$type": "color" },
    "ink": { "$value": "oklch(22% 0.035 260)", "$type": "color" },
    "accent": { "$value": "oklch(39% 0.135 259)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Playfair Display", "$type": "fontFamily" },
    "body": { "$value": "Inter", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 97.5% 0.012 82;
  --foreground: 22% 0.035 260;
  --primary: 39% 0.135 259;
  --primary-foreground: 98% 0.008 82;
  --muted: 94.5% 0.018 79;
  --muted-foreground: 42% 0.035 258;
  --border: 80% 0.022 78;
  --input: 80% 0.022 78;
  --ring: 63% 0.19 250;
  --radius: 0.25rem;
}
```
