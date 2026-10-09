# Writing a scene

A scene illustrates one passage of the voiceover on the board. Each element enters on the word that names it and stays until the scene leaves. The stub that `assemble` writes carries the CSS classes and motion helpers below; you add the markup and the cues.

## Canvas

1080 × 1920. Content stays between x 90 and 990.

| Zone | y | Holds |
| --- | --- | --- |
| Header | 196–265 | wordmark and rule, drawn by the board |
| Heading | from 356 | `.h`, one or two lines, centred |
| Graphic | 560–1400 | the diagram, centred on x 540 |
| Captions | 1500–1680 | the caption card |
| Notice | 1716–1750 | `KI-generiert`, right-aligned, drawn by the board |

Centre every group on x 540: add up its left and right edges, including an 8 px card shadow. Text stays left-set only where it sits beside an object (a label right of a server stack) or names a chart axis.

## Type

- **Headings** `.h`: Urbanist 800, uppercase. A capital runs about 0.55 em wide, so 900 px holds 16 letters at 96 px and 10 at 150 px. Take the largest size that fits the longest line; the second line in `.a` (teal) carries the point.
- **Labels** `.lbl`: place with `left`, `top`, `width`, `height` and size with `font-size`; 44 to 74 px in Urbanist. `.sm` switches to DM Sans Bold with wide tracking for small notes, 26 to 32 px; `#555555` for a secondary note.
- The fonts hold Latin letters, digits, `×`, `~`, `=`, `%`. Draw any other sign as SVG, as the `≠` in `examples/boerse.html`.

## Building blocks

| Class | Is |
| --- | --- |
| `.in` | hidden until a helper brings it in; give it to every element that enters |
| `.a` | teal text |
| `.card` | white box, 4 px ink border, hard 8 px shadow: logos and anything quoted |
| `.tile` | the same box, square, for an icon or an inline SVG mark |
| `.ink` | a stroke that draws on, inside `<svg id="<scene>-svg" viewBox="0 0 1080 1920">`; `.accent` teal, `.warn` red |

Prefix every `id` with the scene id. Square corners everywhere.

## Motion

Cues are voiceover seconds: the `start` of the spoken word in `prep/voiceover.words.json`. Put the word in a comment.

```js
pop("#x-card", 39.56);        // "CoreWeave": a card, tile, number or heading lands
rise("#x-label", 20.54);      // a line of text comes up
slide("#x-row", 30.38);       // a wide row comes in from the left
draw("#x-arrow", 51.62, 0.45); // a stroke draws on over 0.45 s
fade("#x-old", 13.32);        // something steps back; a third argument dims it instead, e.g. 0.3
leave();                      // once, last line: the scene clears 0.2 s before it ends
```

For anything else use `tl` with `T(vo)` as the position, as the count-up and the unit swap in the examples do. A number counts up with a `textContent` tween and `snap`; a callback would be skipped when the renderer seeks.

## What goes on screen

- Labels state what was said. A number appears only if it is spoken, with its hedge: "ungefähr dem 6-fachen" is `~6×`.
- A schematic (two growth arrows) carries no values.
- One teal accent marks the point of the sentence. Red marks damage only: a crossed-out option, a crack, a power cut.
- A named company gets its real logo on a white card, from the workspace's `media/` folder. No file there: `npx hyperframes media-use resolve --type logo --entity <name> --project .`, inlined in a `.tile` with fill `#1c1c1c`.
- Few words. The voiceover explains; the scene shows.

## Sound effects

In `edit.json`: `{"sound": "pop", "vo": 33.32, "label": "Hyperscaler"}`, with `vo` the cue of the element it belongs to. A pop for something that lands, a swoosh for something that moves. About one every eight seconds, on the moments that matter; the draft already holds the swoosh at the cut and the pop on the card.

## Where to find a pattern

| Example | Shows |
| --- | --- |
| `definition.html` | a large one-line heading, an outline with an icon inside, three stacked lines, an underline |
| `cloud.html` | a scaled SVG group, building and server rack, a red cross-out, icon tiles that replace a faded element |
| `vorteile.html` | boxes built from `div`s, a shake and swap, three linked sites, a status button, text beside an object |
| `hyperscaler.html` | logo rows that slide in, a heading in mid-scene, chips that stagger in and dim for the last one |
| `neoclouds.html` | two logo cards converging on a target ring, a three-step flow with arrows |
| `kunden.html` | logo tiles, curved arrows into a card, check marks |
| `boerse.html` | an inequality row, two bars with numbers that ride them and count up |
| `wachstum.html` | two growth arrows, a heading that is replaced, a lens over a dimmed chart |

## Before `npm run check`

- Every element with `.in` has a helper that brings it in.
- An element that slides off the canvas on purpose carries `data-layout-allow-overflow`.
- An `<svg>` or image inside a flex row has `flex: none`, or the row squeezes it to nothing.
- One property of one element is tweened by one cue at a time.
