# Frontend Redesign — Design Spec

**Date:** 2026-05-12  
**Status:** Approved

## Goal

Redesign the frontend to look strict, modern, and premium. No wow-effect, no decorative excess. The result should feel expensive and data-focused — closer to Linear/Stripe Dashboard than to a crypto app.

---

## 1. Design Tokens

### Color System

Two themes via `[data-theme="dark"]` / `[data-theme="light"]` on `<html>`. Toggle stored in `localStorage`.

**Dark theme (default):**
```
--color-bg:           #09090b   /* zinc-950 */
--color-surface:      #18181b   /* zinc-900 */
--color-surface-2:    #27272a   /* zinc-800 */
--color-border:       rgba(255,255,255,0.08)
--color-border-strong: rgba(255,255,255,0.15)
--color-text:         #fafafa
--color-text-secondary: #a1a1aa /* zinc-400 */
--color-text-muted:   #71717a   /* zinc-500 */
```

**Light theme:**
```
--color-bg:           #fafafa   /* zinc-50 */
--color-surface:      #ffffff
--color-surface-2:    #f4f4f5   /* zinc-100 */
--color-border:       rgba(0,0,0,0.08)
--color-border-strong: rgba(0,0,0,0.15)
--color-text:         #09090b
--color-text-secondary: #52525b /* zinc-600 */
--color-text-muted:   #71717a   /* zinc-500 */
```

**Accent (same in both themes):**
```
--color-accent:       #059669   /* emerald-600 */
--color-accent-hover: #047857   /* emerald-700 */
--color-accent-bg:    rgba(5,150,105,0.10)
```

**Semantic (same in both themes):**
```
--color-danger:       #dc2626
--color-danger-bg:    rgba(220,38,38,0.08)
--color-warning:      #d97706
--color-warning-bg:   rgba(217,119,6,0.08)
```

**Removed entirely:** `gradient-warm`, `gradient-cool`, `gradient-hero`, `gradient-mesh`, `gradient-card-shine`, `gradient-primary`, `gradient-accent`, `shadow-glow-*`, `color-primary-glow`, `color-accent-glow`.

### Shadows (no color, no glow)

```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)
```

### Border Radius (stricter)

```
--radius-sm:  4px
--radius-md:  6px
--radius-lg:  8px
--radius-xl:  12px
--radius-full: 9999px   /* pill badges only */
```

### Spacing (unchanged)

Keep existing `--space-*` tokens.

---

## 2. Typography

### Fonts

```
--font-body: 'Inter', system-ui, -apple-system, sans-serif
--font-mono: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace
```

Load Geist Mono from `https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap` (add to `index.html`).

### Usage Rule

- **Any number, amount, percentage, date/time** → `font-family: var(--font-mono)`, `font-variant-numeric: tabular-nums`
- **All text, labels, headings** → `font-family: var(--font-body)`

### Scale

```
--text-xs:   0.6875rem  (11px)
--text-sm:   0.75rem    (12px)
--text-md:   0.875rem   (14px)
--text-base: 1rem       (16px)
--text-lg:   1.125rem   (18px)
--text-xl:   1.375rem   (22px)
--text-2xl:  1.75rem    (28px)
```

### Heading style

```css
font-weight: 600;
letter-spacing: -0.02em;
line-height: 1.3;
```

### Label style (form labels, stat card labels)

```css
font-size: var(--text-xs);
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.06em;
color: var(--color-text-muted);
```

---

## 3. Navigation

### Header

- Height: `48px`
- Background: `var(--color-bg)` — no blur, no glassmorphism, no backdrop-filter
- Border-bottom: `1px solid var(--color-border)`
- Position: `sticky top: 0`, `z-index: 50`
- Max-width container: `1280px`, centered

**Left:** Logo — `● Home Finance`
  - `●` is a 6px filled circle, `color: var(--color-accent)`
  - Text: Inter, `font-weight: 600`, `font-size: var(--text-md)`, `color: var(--color-text)`, no gradient
  - No wallet icon

**Center:** Nav links separated by `|` dividers
  - Link text: Inter, `font-size: var(--text-md)`, `font-weight: 400`
  - Default color: `var(--color-text-secondary)`
  - Active color: `var(--color-accent)`, `font-weight: 500`
  - Hover: color transition to `var(--color-text)`, `120ms easeOut`, no background, no scale
  - Divider `|`: `color: var(--color-border-strong)`, `font-size: var(--text-sm)`

**Right:** `{username}` + logout icon + theme toggle (sun/moon icon)
  - All items separated by the same `|` divider pattern
  - Theme toggle: clicking cycles between `dark` and `light`, updates `localStorage` and `data-theme` on `<html>`

### Mobile bottom nav

- Keep existing bottom nav layout
- Remove glassmorphism (no `backdrop-filter`, no `blur`)
- Background: `var(--color-surface)`
- Border-top: `1px solid var(--color-border)`
- Active item: `color: var(--color-accent)`

---

## 4. Components

### Stat Cards (HomePage)

Replace colorful gradient cards with clean data blocks.

**Layout:** 3-column grid (expense | income | balance). On mobile: stacked.

**Each card:**
```
┌─────────────────────────────┐
│ РАСХОДЫ ЗА МЕСЯЦ            │  ← label: text-xs, uppercase, text-muted
│                             │
│ 84 320 ₽                    │  ← Geist Mono, text-2xl, font-weight 600, text
│ ────────────────────────    │  ← 1px solid border
│ 23 транзакции               │  ← text-sm, text-muted, Geist Mono for number
└─────────────────────────────┘
```

- Background: `var(--color-surface)`
- Border: `1px solid var(--color-border)`
- Border-radius: `var(--radius-lg)`
- Padding: `var(--space-lg)`
- No icon
- Balance card: amount color = `var(--color-accent)` if positive, `var(--color-danger)` if negative
- No hover animation on stat cards

### TransactionCard

Flat list row style, no left color bar, no glow.

```
● Продукты          [Еда]     5 мая, 14:32      −1 240 ₽
```

- `●` dot: 8px, `color: categoryColor`, no shadow
- Description: Inter, `font-weight: 500`, `var(--text-base)`
- Category badge: `font-size: var(--text-xs)`, `font-weight: 500`, `background: categoryColor + 12% opacity`, `color: categoryColor`, `border-radius: var(--radius-sm)`, `padding: 2px 6px`
- Date: Geist Mono, `var(--text-sm)`, `color: var(--color-text-muted)`
- Amount: Geist Mono, `font-weight: 600`, `var(--text-md)`, `tabular-nums`, right-aligned
  - Expense: `var(--color-text)` with `−` prefix
  - Income: `var(--color-accent)` with `+` prefix
- Hover: `background: var(--color-surface-2)` on full row, `120ms easeOut`, no scale
- Edit/delete buttons: appear on hover only (opacity 0→1)
- No gap between rows — list container uses `border-bottom: 1px solid var(--color-border)` on each row except the last (`:last-child { border-bottom: none }`)
- List container itself has `border: 1px solid var(--color-border)` and `border-radius: var(--radius-lg)` to frame the whole list

### Buttons

```css
/* Primary */
background: var(--color-accent);
color: white;
border: none;
font-weight: 500;
font-size: var(--text-md);
padding: 0.5rem 1rem;
border-radius: var(--radius-md);
cursor: pointer;
transition: background 120ms easeOut;

/* Hover */
background: var(--color-accent-hover);

/* Secondary */
background: transparent;
color: var(--color-text);
border: 1px solid var(--color-border-strong);

/* Secondary hover */
background: var(--color-surface-2);

/* Danger */
background: transparent;
color: var(--color-danger);
border: 1px solid rgba(220,38,38,0.30);

/* Danger hover */
background: var(--color-danger-bg);
```

No `translateY`, no `scale`, no `box-shadow glow` on any button state.

### Forms

- Input border: `1px solid var(--color-border-strong)`
- Input background: `var(--color-surface)`
- Focus: `border-color: var(--color-accent)`, no box-shadow ring
- Placeholder: `var(--color-text-muted)`
- Label: uppercase, `var(--text-xs)`, `font-weight: 500`, `var(--color-text-muted)`
- Select: same as input, custom chevron SVG in `var(--color-text-muted)`

### Cards (generic `.card`)

```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius-lg);
padding: var(--space-lg);
box-shadow: var(--shadow-sm);
```

No gradient overlay, no `card-shine`. Hover: border-color to `var(--color-border-strong)`.

---

## 5. Animations

**Universal rule — two keyframes only:**

```css
/* Appear (page load, list items) */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: fade-up 150ms ease-out;

/* Page transition */
opacity 0 → 1, 100ms ease-out (no Y movement)
```

**Framer-motion usage:**
- Replace all `spring` with `{ duration: 0.15, ease: 'easeOut' }`
- Remove all `whileHover: { scale }`, `whileTap: { scale }`
- Remove all `whileHover` glow box-shadow changes
- Keep `layout` and `layoutId` for nav indicator (but remove the glow from the indicator itself)
- Keep `AnimatePresence` for modals/toasts

**Removed keyframes:** `pulse-glow`, `float`, `grid-scroll` — deleted from `index.css`.

**Hover interactions:** CSS transitions only (`transition: color 120ms ease-out`, `transition: background 120ms ease-out`). No JS/framer for hover.

---

## 6. Implementation Order

1. `index.html` — add Geist Mono font link
2. `index.css` — full rewrite of tokens, base styles, button/card/form/animation classes
3. `App.tsx` — add theme toggle logic (`localStorage`, `data-theme` on `<html>`)
4. `Layout.tsx` — new header and mobile nav
5. `HomePage.tsx` — new stat cards
6. `TransactionCard.tsx` — flat list row style
7. `TransactionListPage.tsx` — list container (remove per-card borders, add dividers)
8. All remaining pages — apply new token usage, strip inline gradients/glows
9. `motion.ts` — update animation variants

---

## 7. Out of Scope

- No changes to backend, API, or data logic
- No changes to routing
- No new pages or features
- No CSS framework (keep inline styles + CSS variables approach)
- No Storybook or component library
