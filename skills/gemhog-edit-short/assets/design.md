# Design — Gemhog

Brand truth for this project, taken from https://gemhog.com (CSS tokens and Open Graph image, read 2026-10-07).

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| paper | `#f5f5f0` | background of every graphic scene |
| ink | `#1c1c1c` | text, strokes, borders, hard shadows |
| teal | `#0d9488` | the one accent: the point of each sentence, the spoken caption word |
| muted | `#555555` | secondary labels |
| tint | `#d5f0ee` | the soft wandering glow behind the graphics |
| card | `#ffffff` | cards, tiles, caption cards |
| red | `#dc2626` | damage only (crossed-out server, crack, power cut); the site's `--destructive` |

## Type

- Headings: Urbanist, uppercase, weight 800, tracking -0.025em, line-height 0.98 (`assets/fonts/urbanist-latin-400-700.woff2`, the site's own file).
- Labels and captions: DM Sans 700 (`assets/fonts/dm-sans-latin-400-700.woff2`). Eyebrows are uppercase, tracking 0.14em, with a 20 px teal square in front.
- Wordmark: `GEMHOG.` in Urbanist, the dot in teal.

## Shape

- Square corners everywhere (`--radius: 0`).
- 4 px ink borders and a hard `8px 8px 0` ink shadow on cards, tiles, buttons and caption cards. No blur, no gradients on components.
- Hairline ink rules as structure; the top rail doubles as the progress bar.

## Don't

- No rounded corners, no drop-shadow blur, no second accent colour, no yellow from the Shorts house style.
