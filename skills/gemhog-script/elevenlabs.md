# The ElevenLabs-Fassung

The voiceover should sound like Paul explaining something to a friend: interested, now and then amused, never performed. Eleven v4 reads **audio tags** as direction: plain English in square brackets, inside the German text.

## How tags work

- A tag sits before the words it colours, and its colour carries on until the next tag. Set a new one only where the delivery should shift: six to ten in a 75-second script.
- One tag per clause. Two qualities share one bracket: `[curious, a little amused]`.
- Tags are free text. When a listed one does not fit the moment, describe the read: `[matter-of-fact]`, `[like letting someone in on a secret]`.
- Square brackets only; anything else is read aloud.
- A tag is a suggestion to the model. `gemhog-voiceover` generates one read, and a new one on Paul's order.

## What goes in

| For | Tags |
| --- | --- |
| Interest and thought | `[curious]`, `[intrigued]`, `[thoughtful]`, `[puzzled]` |
| Lightness | `[playful]`, `[amused]`, `[warm]`, `[optimistic]` |
| A finding that lands | `[excited]`, `[amazed]`, `[building]` |
| Pace | `[slowly]`, `[snappy]`, `[softly]` |
| A beat | `[pause]`, `[long pause]`, or `…` for a short one |

Let the tags follow the script's arc: curiosity on the question, warmth on the answer, play in the examples, a `[pause]` and a change of tone at the turn, lift on the number, thought on the reason.

Punctuation directs too. A comma is a breath, `…` holds a moment before a reveal, and one word in CAPITALS gets the stress. Use capitals once or twice.

## What stays out

Everything one would cut from a recording, and everything that changes the level the edit expects:

- **Noises:** `[laughs]`, `[sighs]`, `[gasps]`, `[clears throat]`, `[coughs]`, `[exhales]`.
- **Sound effects** of any kind: `[applause]`, `[door slams]`.
- **Extremes:** `[whispers]`, `[shouts]`, accents, characters, `[sings]`.
- **Shaky moods** such as `[nervous]`, `[anxious]`, `[frazzled]`: on these the model adds stammers of its own.

The words stay the Skript's words. No fillers („ähm", „also ja"), no changed or added word: captions and sources rest on the text.

## Form

The whole script in one code block, one paragraph per passage, the hook question as its first line. One generation carries it (the limit is 3,000 characters), and the model reads better with the full context. Eleven v4 has no speed setting; the edit sets the speed.

## An example

The opening and the turn of „Was ist eigentlich eine Neo-Cloud?":

```
[curious] Was ist eigentlich eine Neocloud?

[warm] Eine Neocloud ist ein Anbieter, der Rechenleistung speziell für künstliche Intelligenz vermietet.

[playful] Das hat viele Vorteile: Man muss sich zum Beispiel nicht selbst um Ersatz kümmern, wenn ein Schaden auftritt …

[pause] [intrigued] An der Börse ist aber Neocloud NICHT gleich Neocloud. CoreWeave wird mit ungefähr dem Sechsfachen seines Umsatzes der letzten zwölf Monate bewertet. [pause] [amazed] Bei Nebius ist es das 45-Fache.

[thoughtful] Nebius ist zuletzt allerdings beim Umsatz prozentual deutlich schneller gewachsen. Das könnte einen Teil des Bewertungsunterschieds erklären.
```
