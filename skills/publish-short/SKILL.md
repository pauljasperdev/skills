---
name: publish-short
description: Publish exported shorts. Uploads each export to Postiz once and schedules it on TikTok, Instagram and YouTube. Use only when the user asks to publish, post, schedule or draft shorts.
---

# Publish a short

Turns each exported `<NNN>/<NNN>.mp4` into three scheduled Postiz posts.

## Steps

### 1. Upload once

Postiz hosts the video itself. Upload each export once and reuse the returned `path` for all three posts:

```sh
curl -sS -X POST https://api.postiz.com/public/v1/upload \
  -H "Authorization: $(security find-generic-password -s postiz-api-key -w)" \
  -F "file=@<NNN>/<NNN>.mp4;type=video/mp4"
```

The response is `{"id": …, "path": "https://uploads.postiz.com/….mp4"}`. The key lives in the macOS Keychain as `postiz-api-key`; when the lookup fails, stop and ask the user to store one from Postiz Settings.

Done when a `HEAD` request on `path` returns the local file's exact size.

### 2. Write the copy

German, in the speaker's voice, drawn from what the short says: one or two sentences, then four or five hashtags. The YouTube title is the hook in sentence case; its description is the caption with `#shorts` first among the hashtags.

### 3. Schedule three posts per video

One `integrationSchedulePostTool` call carries every post. Each has the caption as a single `<p>`, the uploaded `path` as its only attachment, and:

| Channel | Platform | Settings |
| --- | --- | --- |
| powlymoli | `tiktok-business` | `content_posting_method: DIRECT_POST`, `privacy_level: PUBLIC_TO_EVERYONE`, `comment: true`, `autoAddMusic: no`; `duet`, `stitch`, `video_made_with_ai`, `brand_content_toggle`, `brand_organic_toggle` all `false` |
| powlymoli | `instagram-standalone` | `post_type: post`, `is_trial_reel: false`, `collaborators: []` |
| Paul Jasper | `youtube` | `title`, `type: public`, `selfDeclaredMadeForKids: no` |

Look the channel IDs up with `integrationList`. The account also holds Gemhog channels; these three are the only targets.

`type: schedule`, one short per day at 22:00 Europe/Berlin (the tool takes UTC), on the first days `postsListTool` shows without a short, unless the user names dates. `type: draft` when the user asks for drafts.

The Postiz tools can change a queued post's settings only, so check captions, channels and dates before the call; a wrong post is one the user has to delete in the Postiz app.

Done when `postsListTool` shows every post in state `QUEUE` on its channel at its date.

### 4. Report

Tell the user which short goes out when, on which channels, with each post's `previewUrl`.
