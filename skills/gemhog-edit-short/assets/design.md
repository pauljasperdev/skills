# Design — Gemhog

Brand truth for this project, taken from the Gemhog media kit and the CSS tokens of the gemhog.de landing page (read 2026-10-16). The colours did not change with the media kit; the shapes did.

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| paper | `#f5f5f0` | background of every graphic scene |
| ink | `#1c1c1c` | text, strokes, pills |
| teal | `#0d9488` | the one accent: the point of each sentence, the spoken caption word; the call to action's background |
| teal-strong | `#0b5f59` | teal text on white or on a teal tint |
| muted | `#5b5b55` | secondary labels |
| border | `#e4e2d8` | the soft border of cards and tiles |
| tint | `#d5f0ee` | the still glow behind the graphics |
| card | `#ffffff` | cards, tiles, caption cards |
| red | `#dc2626` | damage only (crossed-out server, crack, power cut), and the bearish side in app screens |

## Type

- Headings: Urbanist 800 in sentence case, tracking -0.035em, line-height 1 (`assets/fonts/urbanist-latin-400-700.woff2`). The teal line carries the point, as „Hör beide Seiten" on the landing page.
- Labels and captions: DM Sans 700 (`assets/fonts/dm-sans-latin-400-700.woff2`). Small notes are uppercase with wide tracking.
- Lockup: the app mark (`assets/brand/gemhog-app-mark.png`) beside the lowercase wordmark (`assets/brand/wordmark-ink.png`, `wordmark-white.png`).

## Shape

- Rounded corners: cards 28 px, tiles about a quarter of their size, pills fully round (`--radius-md` 16 to `--radius-xl` 28 on the site).
- Cards and tiles: white, a 2 px `#e4e2d8` border and a soft shadow (`0 14px 36px` at 8 % ink). Pills: ink with white text, as the site's buttons.
- No hard ink shadows, no 4 px ink borders; they belonged to the look before 2026-10-16.

## Don't

- No second accent colour, no yellow from the Shorts house style, no gradients on components.
