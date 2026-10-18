---
name: gemhog-voiceover
description: Generate a Gemhog short's voiceover. Reads the ElevenLabs-Fassung from the video's Notion page, has Eleven v4 speak it in Paul's cloned voice through the ElevenLabs connector, and saves it in the short's folder, for one named video or with no topic for every video in the Videos board's Skript column. Use when asked to generate, voice or re-take a voiceover for a Gemhog topic.
---

# Generate a Gemhog voiceover

The **voiceover** is one audio file that reads the whole script in Paul's voice: `voiceover.mp3` in the short's folder, generated from the **ElevenLabs-Fassung** that `gemhog-script` wrote. `gemhog-edit-short` cuts the video to it. The folder holds that one file and no other audio.

Where things live in Notion is in the `gemhog-content` skill next to this one: [SKILL.md](../gemhog-content/SKILL.md).

## The voice

- **Connector:** the `claude.ai ElevenLabs` tools, `creative_add_flow_node`, `creative_run_flow_nodes` and `creative_get_flow_run_status`. When they are missing from the session, say so; Paul then generates in the ElevenLabs app.
- **Model:** `eleven_v4`.
- **Voice:** `uMxcXdeu66pvv1vPuksy`, Paul's professional clone. `creative_list_voices` with `search: "Paul"` shows it as the one "Paul" with `is_library_voice: false`; the library holds other voices of that name.
- **Language:** `language_code: "de"`, always. Without it the model guesses the language word by word, and a German word between English terms is read in English („private Cloud").
- **Settings:** the connector sets no others. Stability, similarity and speed are the voice's own defaults, and the edit sets the speed.
- **Cost:** about one credit per character, so a 1,500-character script costs about 1,500 credits.

## Working with Paul

Every generation spends his credits. His order to generate, or a topic in Up Next (a production order, gemhog-content), covers one generation per video. A further one, also after a failed run, waits for a new order.

## Steps

### 1. Load

With no video named, take every video in **Skript** on the Videos board.

Fetch the video's page and copy the code block under **ElevenLabs-Fassung** character for character: tags, `…`, capitals, the hook as its first line. The voice speaks the hook as the placeholder the edit plays until Paul records his take.

Done when you hold the text and it is under 3,000 characters.

### 2. Generate

Add the node with `creative_add_flow_node`: `node_type: "tts"`, the model and voice above, the text as `prompt`, and `model_parameters: {"language_code": "de"}`. `creative_generate_speech` cannot set the language, so it stays unused. Start it once with `creative_run_flow_nodes` and `generations_count: 1`. Then poll `creative_get_flow_run_status` with the returned `flow_id` and `session_ids`, waiting `poll_after_seconds` between calls. A full script takes about a minute.

Done when `all_completed` is true. On `has_failures`, report the failure and what was charged, and stop.

### 3. Save

Create the short's folder when it is missing, named as the `gemhog-content` skill says, and write its name to the card's `Ordner`. Download the generation to `<folder>/voiceover.mp3` with `curl` from its `content_url` in the status; that URL is signed and expires after two hours. A voiceover already there is replaced.

Done when `ffprobe` reads a duration from the file and it is the only audio file in the folder. The card stays in **Skript**: the board has no voiceover column, and `gemhog-edit-short` moves it on to Pre-Edit. Under a production order the edit follows at once; otherwise tell Paul the duration and the flow's `url`, where he can also listen.

## Other orders

- **A re-take,** after a script change or because Paul dislikes the read: for a script change, bring the ElevenLabs-Fassung in line with `gemhog-script` first. Then run all steps; the new file replaces the old one.
- **A re-take of one passage:** generate the whole script again. One generation carries the full context, and a spliced passage changes the level the edit expects.
