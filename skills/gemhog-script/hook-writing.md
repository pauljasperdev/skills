# Writing the hook

The **hook** is the first sentence of a short. In the finished video Paul says it into the camera: a person first, graphics after. Until he records it, the voiceover speaks it as a placeholder, and he rewords it when he has watched the edited video. The hook fixes the video's question; Paul's rewording keeps that question, so the Skript holds.

Paul's **[Short-Form Hook Crafting Guide](https://app.notion.com/p/3cdb424e54608026827fd3c134f4dcd3)** in Notion is the craft: Relevance, Payoff, Tension and Proof; the spoken, visual and text layers; the angles; the construction steps and the final check. Fetch it and work through it. This file adds what holds for Gemhog.

## What Gemhog adds

- **The viewer's questions.** Relevance comes from the questions in [QUESTIONS.md](../gemhog-content/QUESTIONS.md): why it moved, why it fell despite good figures, why nobody can copy it, what could tip it. „Was macht eigentlich X?“ is the research question and stays out of the hook; definitions run weakly (Reuters' „What is SK Hynix and why is it moving the market today?“: 4,600 views), a concrete thing with a puzzle runs strongly („Why is Amazon dumping millions worth of stock?“, How Money Works: 2.6 M).
- **A name the viewer knows.** People invest in what they know, and supplier firms nobody has heard of lack that. The hits on such names borrow it: Apple, Nvidia, the price of a phone, China. The Report's answer to „Woher kenne ich das?“ supplies it.
- **The claim first.** In every transcribed hit on Gemhog's companies, the first sentence states the claim or puzzle. Reveal the what, delay the why: curiosity makes people remember the answer to the question that raised it (Gruber et al. 2014), so the hook asks the question whose answer ends the video.
- **German, in Paul's mouth.** Five to eight words, as the guide says, said without looking, with the company's name in it and no word a newcomer would stumble on.
- **Proof from the Report.** The guide's Proof is a sourced fact; every claim in the hook is carried by the Report (SOURCES.md).
- **Lasting, not breaking.** Paul wants a channel people watch in a row, so a short should still hold when someone finds it months later. Lasting hooks rest on how the business works, its structure, a pattern across cycles, or the last year or quarter; breaking ones rest on this week's move or news. Every short ages with the market, so lasting means measured in quarters, not days. A breaking hook is made as a News video that goes out within days, ahead of the lasting ones (Paul, 2026-10-17).
- **Inside the limits.** The hook promises an explanation of what happened or how something works, and its answer stays inside CHANNEL.md's Limits. A question that can only be answered with a verdict on the share („Lohnt sich …?“, „Ist es zu spät für …?“) is no candidate, however well such titles run elsewhere.

The evidence behind these lines is Gemhog's research of 16.10.2026 („Was Privatanleger von Shorts wollen“, `~/Documents/gemhog/recherche/`). It shows directions, not sizes: no study tests finance shorts directly.

## Candidates and their answer

Write each candidate with the answer it promises: the payoff the video ends on, with its deshalb (QUESTIONS.md). A hook whose answer you cannot write in one sentence is not ready. Vary the candidates across the guide's angles, so the judge compares different promises, not wordings of one.

## The judgement

A fresh judge, who knows only Paul's guide, this file, CHANNEL.md, QUESTIONS.md, the Report and the candidates, runs the guide's final check on each and rates it:

| Criterion | Question |
| --- | --- |
| Lücke | Would an interested non-specialist want the answer, from the hook alone? |
| Einlösbar | Does the Report carry the answer, and can a 60-to-90-second short deliver it? |
| Klarheit | Is it understood at first hearing, every word known to a newcomer? |
| Anker | Does it hold a name, number or thing the viewer knows? |
| Sprechbar | Five to eight words, natural in Paul's mouth? |
| Haltbarkeit | Does hook and answer still hold in three months, or only this week? |
| Grenzen | Inside CHANNEL.md's Limits, hook and answer alike, and in what the viewer concludes from them? |

Lücke, Klarheit, Anker, Sprechbar and Haltbarkeit each get 0, 1 or 2, with a reason of one line, so a candidate scores at most 10. Einlösbar and Grenzen are gates: a candidate that fails either drops out. For Grenzen the judge writes the one sentence a newcomer would take away from hook and answer; a candidate fails when that sentence lands on cheap or expensive, risky or safe, early or late, though no word of the candidate says so (a KGV explained „kann täuschen“ leaves the viewer at „billig oder teuer“). The judge returns the candidates ranked, the lasting ones first, and for the best candidate of each question the one change that would make it stronger. It also groups the passing candidates by the question they answer: one question is one video, and a Report often carries more than one.

## The hook package

What Paul gets with the edited video, so that recording takes him a minute:

- **Gesprochener Hook:** the winner, as the placeholder voice says it.
- **Text-Hook:** three to seven words for the screen that say the same thing without repeating the sentence (the guide's text layer; the edit sets it per its [hooks.md](../gemhog-edit-short/hooks.md)).
- **Andere Formulierungen:** three rewordings of the same question, for him to say or to start from.
- **Visueller Hook:** what the first seconds could show as proof, from what the Report names: the logo, a price chart, a product. It goes under Hinweise für den Schnitt.

## More videos from one Report

How many videos a Report yields follows from the judgement, with no cap: every question whose best candidate passes both gates and scores at least 7 of 10 is a video of its own. A different question counts, not a different wording. Its Haltbarkeit is above 0, unless it is a News video with the date after which it no longer holds. `gemhog-script` writes each and puts it on the Videos board as a card of its own.
