### 8.1 Visual design system (based on getambee.com, studied in the browser on 14 Nov 2026)

We want EmberCal to look like Ambee: a clean, editorial, data-company aesthetic. That means mostly white and near-black, thin grey borders, no shadows, big tight-tracked headlines, a dotted-grid hero, and one soft light-blue accent. **Copy the style, not the brand.** Do not use Ambee's logo, wording, images or illustrations, and do not hotlink their font files. Load fonts from their official sources (below).

**Fonts** (both free for commercial use; check the licence files when installing):
- **Satoshi** (display and headings, weights 500/700): from Fontshare, `https://api.fontshare.com/v2/css?f[]=satoshi@500,700&display=swap`, or self-host the files downloaded from fontshare.com.
- **Inter** (UI, body, tables and numbers, weights 400/500/600): from Google Fonts or `@fontsource/inter`. Use `font-feature-settings: "tnum"` for numbers in tables, cards and charts so digits line up.
- Fallback stack: `Satoshi, Inter, system-ui, -apple-system, "Segoe UI", sans-serif`. Sinhala and Tamil: `Noto Sans Sinhala` and `Noto Sans Tamil`, matched in size and weight.

**Type scale** (measured on Ambee; use `clamp()` for fluid sizes):

| Token | Font | Size | Weight | Line height | Letter-spacing |
|---|---|---|---|---|---|
| display (hero H1) | Satoshi | 40–52 px | 700 | 1.35 | −0.02em |
| h2 (section) | Satoshi | 24–29 px | 700 | 1.35 | −0.03em |
| h3 (card title) | Inter | 17 px | 500 | 1.47 | −0.03em |
| body-lg | Inter | 17 px | 400–500 | 1.53 | −0.01em |
| body | Inter | 14–15 px | 400 | 1.5 | normal |
| label / nav / button | Inter | 14 px | 400–500 | 20 px | normal |
| eyebrow tag | Inter | 11–12 px | 500, uppercase | — | +0.04em |
| big stat (anomaly card) | Satoshi | 40–56 px | 700, tabular | 1.1 | −0.02em |

**Colour tokens** (Ambee's neutrals and accent; put them in `web/src/styles/tokens.css` and the Tailwind theme):

```css
:root {
  /* neutrals */
  --n-0:   #FFFFFF;  /* page, cards */
  --n-50:  #FAFAFA;  /* subtle panels */
  --n-75:  #F5F5F5;  /* alternate section background */
  --n-100: #F3F3F3;
  --n-200: #E8E8E9;  /* default 1px borders, dividers */
  --n-300: #D5D6D7;  /* input / secondary-button borders */
  --n-400: #C3C4C5;
  --n-500: #949698;  /* placeholder, disabled */
  --n-600: #6C6E70;  /* secondary text */
  --n-700: #333333;  /* body text */
  --n-800: #232425;
  --n-900: #0A0A0A;  /* headings, primary button, dark sections */
  --n-950: #151516;  /* dark panels */
  --border-dark: #434547; /* borders on dark sections */

  /* accent (Ambee light blue) */
  --accent-300: #97DEF0;  /* highlights, active tab underline, focus ring */
  --accent-400: #82C6DF;  /* hover, selected state */
  --accent-50:  #EFF9FD;  /* eyebrow tag / info background */
  --accent-100: #D8E9EF;  /* eyebrow tag border */
  --accent-ink: #061F28;  /* text on accent backgrounds, deep teal panels */

  /* EmberCal-only semantic colours (Ambee has none; keep them rare) */
  --alert-normal:  #6C6E70;  /* grey */
  --alert-above:   #F4B266;  /* light orange */
  --alert-high:    #E8743B;  /* orange */
  --alert-extreme: #B8401A;  /* dark orange, always with icon + label */
  --success:       #2E7D5B;  /* "Confirmed" */
}
```

Fire orange appears **only** for alert levels and fire markers. The rest of the UI stays neutral with the light-blue accent, as on Ambee. Data colours stay as in §2 R8: viridis/cividis for counts, blue–white–orange diverging for anomalies. These are separate from the UI palette and must pass a colour-blind check.

**Components and layout** (as seen on Ambee):
- **Page:** white background, max content width 80 rem (1280 px), generous whitespace, 12-column grid, sections separated by 96–128 px on desktop.
- **Top nav:** white, 64–80 px tall, logo left, 14 px Inter links in the centre, a solid near-black pill-ish button right ("Open app →", radius 4 px, padding 7×14 px, white text, a small arrow icon).
- **Hero:** a centred Satoshi headline on a **dotted-grid background** (light-grey dots on white, fading out at the edges with a white gradient overlay `linear-gradient(rgba(255,255,255,.8), rgba(255,255,255,0))`). Below it, a row of 3 bordered cards, each with a two-line title and a text link with "→". For EmberCal: "Harmonized fire calendar → Explore", "Live fire alerts → Set up", "Methods & accuracy → Read".
- **Cards:** `background: rgba(255,255,255,.5)` (or white), `border: 1px solid var(--n-200)`, `border-radius: 8px`, padding 24–28 px, **no box-shadow**. Hover: border turns `--n-300`, no lift.
- **Buttons:** primary = `--n-900` background, white text, radius 4 px. Secondary = white background, 1px `--n-300` border, `--n-900` text, radius 4 px, padding 11×17 px. Text links = 14 px Inter 500 with a trailing "→" that nudges 2 px right on hover.
- **Eyebrow tags:** small uppercase label in a light-blue tinted chip (`--accent-50` background, `--accent-100` border, `--accent-ink` text, radius 4 px, "»" after the text), placed above section titles, e.g. "EMBERCAL IN ACTION »".
- **Dark sections:** `--n-900` background with a subtle vertical gradient (`#0A0A0A → #0F0F0F → rgba(97,106,115,.12) → #0E0E0E → #0A0A0A`), white Satoshi headline, `#DDDDDD` body text, cards with a `--border-dark` border. Use one for the "Problem → Harmonize → Decide" story on the landing page (Ambee's "Data / Product / Decision" three-step pattern).
- **Logo strip:** greyscale partner and data logos (NASA FIRMS, Copernicus, etc.), only where we actually use their data, with their attribution rules respected.
- **Product screenshots:** large, rounded 8 px, thin border, showing the real calendar and map; no stock photos.
- **Motion:** subtle only. Fade or slide-up on scroll (150–250 ms), smooth scrolling (Lenis or CSS). Respect `prefers-reduced-motion`.
- **Map style:** a light, low-contrast basemap (e.g. Carto Positron) in the light theme and a dark basemap (e.g. Carto Dark Matter) on dark panels, so data colours stand out.
- **Dark mode** for the app (not required for the landing page): `--n-950` surfaces, `--border-dark` borders, same accent.

**Where each style applies:**
1. **Landing page (`/`)** — Ambee-style marketing page: hero with dotted grid + 3 cards, dark three-step story section, "It all starts with the data" section (NASA data + harmonization), live demo screenshot, accuracy stats as big numbers in cards, call to action.
2. **App (`/app`)** — same fonts, colours, borders and radii, but denser: left panel (area tools, date range, filters), main area (calendar hero, charts in bordered cards), right or bottom panel (anomaly card, live alerts). The anomaly card uses a big Satoshi number, a level chip and a one-line sentence.
3. **Methods / Accuracy pages** — editorial layout like Ambee's resource pages: narrow text column (≈ 680 px), Satoshi headings, figures in bordered cards.

**Accessibility checks for this palette:** body text `#333333` on white passes AA. **Never put light-blue `--accent-300` text on white; it fails contrast.** Use the accent only for fills, borders, underlines and focus rings, with `--accent-ink` or `--n-900` text on top. Focus ring: 2 px `--accent-400` plus a 2 px white offset.

### 8.2 Design patterns from leading fire tools to reuse
- **EFFIS/GWIS style seasonal charts:** current year line over a shaded historical min–max band and an average line. Use this for the day-of-year view.
- **Global Forest Watch:** an "above usual levels" comparison, layer toggles on the map, and overlays such as protected areas.
- **FIRMS:** time-slider over the map and per-satellite layer toggles. Keep our version simpler: responders shouldn't need sensor names to read it.
- Always show the **as-of time and data source** near every number, in small `--n-600` text.


---

