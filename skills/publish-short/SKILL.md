---
name: publish-short
description: Publish exported shorts. Uploads each export to the content bucket and adds it to the Buffer queue of the powlymoli TikTok, Instagram and YouTube channels. Use only when the user asks to publish, post, schedule or draft shorts.
---

# Publish a short

Turns each exported `<NNN>/<NNN>.mp4` into three posts in the Buffer **queue**, one per channel, each on that channel's next free slot. Buffer publishes from there on its own. The user moved here from Publer on 2026-10-15.

## Buffer

- **Connector:** the `buffer` tools (`create_post`, `list_posts` and their siblings). When they are missing from the session, say so; a new session loads them.
- **Account:** the user's own, with one organisation, "My organization". `get_account` gives its ID, `list_channels` the channel IDs.
- **Channels:** TikTok `powlymoli`, Instagram `powlymoli`, YouTube `Paul Jasper`. The same organisation holds X `powlymoli` and Gemhog's three channels (`Gemhog`, `gemhog_com`); a short goes to none of them.
- **Slots:** the user keeps each channel's posting schedule in Buffer: one slot a day at 19:00 Europe/Berlin on all three. The queue fills the next free slot, so shorts go out in the order they are queued. A date the user names outranks the queue: `mode: "customScheduled"` with `dueAt` in Berlin time with its offset (`2026-10-20T19:00:00+02:00`).

## The bucket

Buffer takes a video as a public URL only and reads it from there. The bucket is the one the `gemhog-publish` skill uses: Cloudflare R2, written through its S3 API with the `aws` CLI profile `content-r2-bucket`.

- **Bucket:** `content`
- **Public base:** `https://pub-2f7ca5b9d68f4d7f9290627dc9b471e7.r2.dev`
- **Key:** `shorts/<NNN>.mp4`

When the profile is refused, tell the user; they issue a new token in the Cloudflare dashboard and enter it with `aws configure --profile content-r2-bucket`.

## Steps

### 1. Upload

```sh
aws --profile content-r2-bucket s3 cp "<NNN>/<NNN>.mp4" "s3://content/shorts/<NNN>.mp4" --content-type video/mp4
```

Done when a `HEAD` request on the public URL returns 200 and the local file's exact size.

### 2. Write the copy

German, in the speaker's voice, drawn from what the short says: one or two sentences, then the music credit, then four or five hashtags. The YouTube title is the hook in sentence case; its description is the caption with `#shorts` first among the hashtags.

**Layout:** the caption is plain text broken into short lines. The opening sentence stands alone; each further sentence starts its own line; a blank line separates the text, the music credit and the hashtags.

**Music credit:** a short with music carries it on every channel. Music means an `<audio id="music">` in `<NNN>/hyperframes/index.html` with a `data-volume` above 0. The credit is `Musik: „<title>“ von <artist>`, read from that element's file name (`<artist>-<title>-<id>.mp3`); the house track gives `Musik: „Boom Bap Old School Groove“ von Alex Morgan`.

### 3. Queue

One short after the other, in folder order. Three `create_post` calls per short, each with `schedulingType: "automatic"`, `mode: "addToQueue"`, the caption and `assets: [{"video": {"url": "<public URL>"}}]`:

| Channel | `metadata` |
| --- | --- |
| TikTok | `tiktok: {isAiGenerated: false}` |
| Instagram | `instagram: {type: "reel", shouldShareToFeed: true, isAiGenerated: false}` |
| YouTube | `youtube: {title, categoryId: "22", privacy: "public", madeForKids: false, isAiGenerated: false}` |

Category 22 is People & Blogs. For drafts, when the user asks for them: `saveToDraft: true`.

When a call fails, stop there: report the error and which posts are in, and check `list_posts` before sending it again.

Done when `list_posts` shows the short once per channel in status `scheduled`, all three with the same `dueAt` and the video. `list_posts` returns no metadata; `get_post` does.

### 4. Report

Tell the user which short goes out when and on which channels.

## Other orders

- **Reword a queued post:** `edit_post` with the new text.
- **A queued short was exported again:** upload it over the same key, then `edit_post` on its three posts with the URL plus a new query (`…/<NNN>.mp4?v=2`), so Buffer reads the file afresh.
- **Every `edit_post`** is checked as a whole post: send `postId`, what changes, and the channel's full `metadata` again. Leaving out `mode` and `dueAt` keeps the slot.
- **Take a short out:** `delete_post` on its three posts, on the user's order. The file in the bucket stays.
