# Forja Brand Kit

Forge-editorial visual system. All assets in this folder are free to use for press, integrations, and community — but read the usage rules first.

Forja is the token toolkit for [Tempo](https://tempo.xyz) — the payments-first blockchain by Stripe and Paradigm.

---

## Assets

| File | Use | Aspect |
|------|-----|--------|
| `logo.svg` | Primary mark — gold gradient + ember spark | 32×32 viewBox (scales infinitely) |
| `logo-mono-gold.svg` | Solid-gold fill on dark backgrounds | 32×32 |
| `logo-mono-light.svg` | Off-white fill on dark backgrounds | 32×32 |
| `logo-mono-dark.svg` | Dark fill on light backgrounds | 32×32 |
| `wordmark.svg` | "Forja" text only, gold gradient | 400×120 |
| `lockup-horizontal.svg` | Mark + wordmark side-by-side | 520×120 |
| `lockup-vertical.svg` | Mark above wordmark, centered | 400×280 |
| `x-avatar.svg` | X / Twitter profile picture | 400×400 |
| `x-banner.svg` | X / Twitter header banner | 1500×500 |
| `farcaster-banner.svg` | Farcaster / Warpcast banner | 1500×500 |
| `og-template.svg` | Share card reference (Open Graph) | 1200×630 |
| `palette.svg` | Color token reference chart | 1200×600 |

All SVG — open in Figma, Illustrator, or any editor. Export to PNG with a rasterizer (e.g. [svg2png](https://svgtopng.com)) if a platform requires it.

---

## Palette

### Accents

| Token | Hex | Use |
|-------|-----|-----|
| **Gold** | `#F0D38A` | Primary CTA, brand mark, conversion actions, gold-italic headline accent |
| **Ember** | `#FF6B3D` | Warning, claim / airdrop heat, graduation status, spark on logo |
| **Indigo** | `#818CF8` | Secondary action, Lock tool accent, chart lines, personal-page chips |
| **Green** | `#4ADE80` | Success, Dispatched state, Vested / Active badges, "Live" dot |
| **Red** | `#F87171` | Error, Revoke destructive action, Wrong-network alert |
| **Pink** | `#F472B6` | Launchpad tool color (graduation gradient with purple `#A78BFA`) |

### Surfaces (5-tier depth)

| Token | Hex | Use |
|-------|-----|-----|
| `bg-page` | `#0B0B10` | Viewport / body background |
| `bg-void` | `#06060A` | Deepest layer, modals behind modals |
| `bg-elevated` | `#12121A` | Cards, dialogs, primary surface |
| `bg-card` | `#16161F` | Hover lift, secondary card |
| `bg-field` | `#1C1C26` | Inputs, subtle internal fills |

### Borders

| Token | Value | Use |
|-------|-------|-----|
| `border-hair` | `rgba(255,255,255,0.06)` | Default 1px line |
| `border-subtle` | `rgba(255,255,255,0.09)` | Hover / focus |
| `border-strong` | `rgba(255,255,255,0.14)` | Emphasis |
| `border-gold` | `rgba(240,211,138,0.22)` | Gold-accent hairlines |

### Text (3-tier)

| Token | Hex | Use |
|-------|-----|-----|
| `text-primary` | `#F5F5F0` | Headlines, primary body |
| `text-secondary` | `#A6A6A0` | Default paragraph |
| `text-tertiary` | `#666663` | Labels, muted meta |

### Gold gradient (primary CTA)

```css
background: linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860);
box-shadow: 0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5);
color: #1a1307;
```

---

## Typography

| Family | Weight | Use | Source |
|--------|--------|-----|--------|
| **Instrument Serif** | 400 (normal, italic) | Display headlines, italic gold accent words | [Google Fonts](https://fonts.google.com/specimen/Instrument+Serif) |
| **Geist** | 300, 400, 500, 600, 700 | Body, UI, buttons | [Google Fonts](https://fonts.google.com/specimen/Geist) |
| **JetBrains Mono** | 400, 500, 600 | Addresses, numbers, mono eyebrow labels | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono) |

**Display pattern** for headlines:
> First half. <em>italic gold accent.</em>

The italic gold accent uses `.gold-text` class (linear-gradient text-fill) — reserved for marketing pages and section titles, not inline body.

**Mono eyebrow pattern**:
```css
font-family: "JetBrains Mono";
font-size: 11px;
text-transform: uppercase;
letter-spacing: 0.12em;
color: #666663;
```

---

## Logo usage

### ✅ Do

- Use on dark backgrounds (#0B0B10 and darker). Gold reads with highest contrast on deep slate.
- Keep padding: minimum clearspace = 50% of mark height on all sides.
- Always include the ember spark (the small `#FF6B3D` rectangle). It's part of the identity.
- For monochrome contexts, use `logo-mono-light.svg` on dark or `logo-mono-dark.svg` on light.

### ❌ Don't

- Don't stretch, skew, rotate, or change the proportions.
- Don't recolor the gradient outside the [`#FFE5A8` → `#F0D38A` → `#E8B860`] range.
- Don't place on busy photographic backgrounds without adding a dark gradient scrim underneath.
- Don't separate the spark from the anvil — they read as one mark.
- Don't use the wordmark in a font that isn't Instrument Serif — the serif + italic character is the visual identity.

---

## Social specs (current)

- **X / Twitter**
  - Avatar: 400×400, use `x-avatar.svg` (rasterize to PNG for upload)
  - Banner: 1500×500, use `x-banner.svg`
- **Farcaster / Warpcast**
  - Avatar: 512×512, use `x-avatar.svg` at scale
  - Banner: 1500×500, use `farcaster-banner.svg`
- **Open Graph / Twitter Card**
  - 1200×630, automatically generated from `/opengraph-image.tsx` at runtime. `og-template.svg` is a reference only — the live version uses server-side Satori rendering.

---

## Tagline

Primary: **Create. Send. Lock. Claim. Launch. Trade.**

Variations (context-dependent):
- Mono eyebrow: `TOKEN TOOLKIT · TEMPO MAINNET`
- Hero subtitle: `The complete token toolkit for Tempo.`
- Short-form: `Forge tokens at the speed of payments.`

---

## Contact

- Site: [forja.fun](https://forja.fun)
- Security: [security@forja.fun](mailto:security@forja.fun) · [forja.fun/security](https://forja.fun/security)
- GitHub: [ForjaTempo/forja](https://github.com/ForjaTempo/forja)

_Brand kit v1.0 — 2026-04-19. Revise when the visual system shifts._
