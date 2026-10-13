---
name: publish-short
description: Publish exported shorts. Uploads each export to Publer once and schedules it on TikTok, Instagram and YouTube. Use only when the user asks to publish, post, schedule or draft shorts.
---

# Publish a short

Turns each exported `<NNN>/<NNN>.mp4` into three scheduled Publer posts in the `powlymoli` workspace, through the Publer connector (`submit_publer_posts` and its sibling tools).

## Steps

### 1. Upload once

The connector imports media from a public address only, so the local export goes to Publer's API directly. Upload each export once and reuse the returned `id` for all three posts:

```sh
KEY=$(security find-generic-password -s publer-api-key -w)
WS=$(curl -sS https://app.publer.com/api/v1/workspaces -H "Authorization: Bearer-API $KEY" \
  | jq -r '.[] | select(.name == "powlymoli") | .id')
curl -sS -X POST https://app.publer.com/api/v1/media \
  -H "Authorization: Bearer-API $KEY" -H "Publer-Workspace-Id: $WS" \
  -F "file=@<NNN>/<NNN>.mp4;type=video/mp4" -F "in_library=true"
```

The `;type=video/mp4` is required: without it Publer answers `File is not supported`. The key lives in the macOS Keychain as `publer-api-key` (scopes `media` and `workspaces`); when the lookup fails, stop and ask the user to create one under Publer Settings → Access & Login → API Keys and store it with `security add-generic-password -s publer-api-key -a publer -w`.

Done when the response carries the media `id` and its `validity` is true for `tiktok`, `instagram.reel` and `youtube.short`.

### 2. Write the copy

German, in the speaker's voice, drawn from what the short says: one or two sentences, then the music credit, then four or five hashtags. The YouTube title is the hook in sentence case; its description is the caption with `#shorts` first among the hashtags.

**Layout:** the caption is plain text broken into short lines. The opening sentence stands alone; each further sentence starts its own line; a blank line separates the text, the music credit and the hashtags.

**Music credit:** a short with music carries it on every channel. Music means an `<audio id="music">` in `<NNN>/hyperframes/index.html` with a `data-volume` above 0. The credit is `Musik: „<title>“ von <artist>`, read from that element's file name (`<artist>-<title>-<id>.mp3`); the house track gives `Musik: „Boom Bap Old School Groove“ von Alex Morgan`.

### 3. Schedule three posts per video

**The slot** is read from `list_publer_posts` with `state: "scheduled"`, in Europe/Berlin time:

- Every day has one slot at 21:00. A short takes the earliest day whose 21:00 holds no video post.
- When that day lies more than seven days ahead, every day has a second slot at 12:00, so a new short goes out within the week instead of at the end of the queue.
- A date the user names outranks the slots.

Publer's own queue (`when: "auto"`) is left alone: it put a short on a 21:00 that already held one, because it does not count posts scheduled at a fixed time.

Take the account ids from `lookup_publer_accounts`. The workspace also holds an X account; these three are the only targets. Each account gets its own `submit_publer_posts` call, because the posts of one call share one account set and the captions differ:

| Account | `platform` | `post_type` | Also |
| --- | --- | --- | --- |
| powlymoli | `tiktok` | `video` | `network_options.details`: `privacy: PUBLIC_TO_EVERYONE`, `comment: true`, `duet: false`, `stitch: false`, `promotional: false`, `paid: false` |
| powlymoli | `instagram` | `reel` | `network_options.details`: `type: reel`, `feed: true` |
| Paul Jasper | `youtube` | `short` | `title`; `network_options.details`: `type: short`, `privacy: public` |

Every call carries `account`, `caption`, the uploaded `media_id`, `when: "schedule"` and `scheduled_for` with the Berlin offset (`2026-10-16T21:00:00+02:00`). For drafts, when the user asks for them: `when: "draft"`.

**After a connector error** (`session expired`, a timeout), look the short up with `list_publer_posts` and `query` before sending the call again: the post is often created anyway, and a second call duplicates it.

A post Publer already holds is changed in place: `reschedule_publer_post` moves it, `update_publer_post` rewords it.

**A new video for a scheduled post** (a re-export) needs the post replaced: Publer changes only text and title on an existing post, and `update_publer_post` with a `media_id` reports success while the old video stays. Upload the new export, show the user the posts to go with `delete_publer_posts`, and once they say yes delete them with `confirm_delete_publer_posts` and schedule them again at the same times with the new `media_id`. One `submit_publer_posts` call per account can carry all of that account's posts (`confirm_multiple: true`), each with its own `scheduled_for`.

Done when `list_publer_posts` with `state: "scheduled"` and a `query` from the caption shows the short once per channel, all three at the same time.

### 4. Report

Tell the user which short goes out when and on which channels. The connector's list shows caption, channel and time only, so name the per-channel options (privacy, reel, short) as sent, not as read back.
