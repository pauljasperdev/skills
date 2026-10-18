---
name: gemhog-research
description: Research Gemhog topics. Turns one named Content Backlog idea, or with no topic every idea in the board's Up Next column, into its Report, a standalone sourced briefing on the idea's Notion page; each is researched and independently reviewed by subagents. Also adds new ideas to the backlog or reviews an existing Report. Use when asked to research, deepen or review a Gemhog topic.
---

# Research Gemhog topics

The **Report** is the first finished artifact of a short. It is written before anyone decides what the video will say: research finds what is there and answers the investor questions, and choosing the video's own question belongs to `gemhog-script`.

Shared rules are in the `gemhog-content` skill next to this one: [CHANNEL.md](../gemhog-content/CHANNEL.md), [QUESTIONS.md](../gemhog-content/QUESTIONS.md), [FORMATS.md](../gemhog-content/FORMATS.md), [SOURCES.md](../gemhog-content/SOURCES.md), and where things live in Notion in its [SKILL.md](../gemhog-content/SKILL.md).

## Roles

You run the research as its **editor**: you pick the ideas, dispatch the work, and are the only one who writes to Notion. Each idea gets two subagents of its own:

- a **researcher**, briefed with [researcher.md](researcher.md), who returns the Report;
- a **reviewer**, briefed with [reviewer.md](reviewer.md), who gets only the Report's text and checks it against its sources.

In Claude Code both run on `opus` (Paul's choice of 2026-10-17, after a first `sonnet` Report needed 16 corrections); elsewhere give both the strongest model at hand. Each brief names the absolute path of its file and of the `gemhog-content` folder. In a session without subagents, do each role yourself in turn, the review from the Report's text alone.

## Steps

### 1. Pick the ideas

- **A topic was named:** find its entry in the Content Backlog. An idea without an entry gets one first.
- **No topic:** every idea in **Up Next** on the board. Fetch each page.

Done when you have told Paul the list of ideas you are starting, each with its question and format. An empty list ends here.

### 2. Research

Dispatch one researcher per idea, all at once. Its brief holds the entry as fetched (title, format, `Notizen`, the page's text), today's date, and a file path for the Report in a temporary folder outside the workspace.

A Report whose own gap list names what another search would close goes back to its researcher before any review.

Done when every Report is in its file.

### 3. Review

Dispatch one reviewer per Report, with the path of its file only: no notes from the researcher, no summary of yours.

- **PASS:** go on.
- **REVISE:** send the findings to that idea's researcher, then the corrected Report to the same reviewer. Two reviews are the limit; findings still open after the second go to Paul as gaps.
- **REJECT:** the idea is not saved. Paul gets the reviewer's reason.

Done when every Report has a final verdict.

### 4. Save and stop

Write each Report that passed, or whose open findings you will name, to the top of its idea's page, above the original idea entry: the Report, then the appendix collapsed as **Quellen- und Prüfanhang**. Set `Status` to **Researched**. Fetch each page again to confirm.

Under a production order (an idea in Up Next, gemhog-content) the script follows at once, with `gemhog-script`; Paul reads the Report when he wants to. Under an order for the Report only, tell him per idea the core statement, the strongest findings, the verdict, the gaps that remain, and until when the Report holds, and stop.

## Other orders

- **A new idea:** a backlog entry with the research question as its title, the format, and in `Notizen` the economic angle and a checkable research lead. A suspected peculiarity is marked as unconfirmed.
- **A review of a Report:** dispatch a reviewer on it and pass on its findings and verdict.
- **Material** (logos, photos, existing charts), when asked: an existing original, linked, with publisher, date and known usage terms. Graphics of our own are made in the edit.
