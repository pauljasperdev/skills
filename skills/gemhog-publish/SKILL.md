---
name: gemhog-publish
description: Queue a Gemhog short for publishing. Uploads the exported video to the content bucket and adds it to the Buffer queue of the Gemhog YouTube, TikTok and Instagram channels, with texts built from the video's Videobeschreibung, for one named video or with no topic for every video in the Videos board's Ready to post column. Use only when Paul asks to publish, post, queue or schedule a Gemhog short.
---

# Publish a Gemhog short

The **export** is `<folder>/<folder name>.mp4`, rendered by `gemhog-edit-short`. Publishing puts it in the **queue**: one Buffer post per channel, each on that channel's next free slot. Buffer publishes from there on its own.

Where things live in Notion is in the `gemhog-content` skill next to this one: [SKILL.md](../gemhog-content/SKILL.md).

## Buffer

- **Connector:** the `claude.ai Buffer` tools. When they are missing from the session, say so; a new session loads them.
- **Account:** Paul's own, `mail@pauljasper.dev`, with one organisation (since 2026-10-15). `get_account` gives its ID and the plan's limit of scheduled posts, `list_channels` its channels. Gemhog's three are YouTube `Gemhog`, TikTok `gemhog_com` and Instagram `gemhog_com`; the others (`powlymoli`, YouTube `Paul Jasper`) are Paul's personal channels and never get a Gemhog post.
- **Slots:** the queue fills each channel's posting schedule, which Paul keeps in Buffer. With equal schedules a short goes out on all three channels at the same time.
- **The video** reaches Buffer as a public URL only, and Buffer reads it from there. The file stays in the bucket until Paul orders it removed.

## The bucket

A Cloudflare R2 bucket, written through its S3 API with the `aws` CLI. The profile `content-r2-bucket` on Paul's Mac carries the keys, the endpoint and the region; the token reaches this one bucket only.

- **Bucket:** `content`
- **Public base:** `https://pub-2f7ca5b9d68f4d7f9290627dc9b471e7.r2.dev`
- **Key:** `gemhog/<slug>.mp4`, the slug being the folder name in ASCII with hyphens for spaces: `gemhog/02-was-macht-eigentlich-broadcom.mp4`.

When the profile is refused, tell Paul; he issues a new token in the Cloudflare dashboard and enters it with `aws configure --profile content-r2-bucket`.

## Working with Paul

Publishing leaves the house. His order to publish covers the shorts he named, and the texts go out only after he has seen them (step 4). A post is changed or deleted on his order alone.

## Steps

### 1. Load

With no video named, take every video in **Ready to post** on the Videos board, a News one first, then in folder order.

For each, fetch the video's page and read the **Videobeschreibung**. Then ask Buffer whether the short is already there: `list_posts` over every status, looking for the short's public URL among the assets.

Done when each short has an export newer than every file in its `hyperframes/compositions/`, a Videobeschreibung, and no post in Buffer. Name the shorts that fail one of the three and leave them out.

### 2. Upload

```sh
aws --profile content-r2-bucket s3 cp "<folder>/<folder name>.mp4" \
  "s3://content/gemhog/<slug>.mp4" --content-type video/mp4
```

Done when a `HEAD` request on the public URL returns 200 and the local file's exact size.

### 3. Write the texts

Both texts are the Videobeschreibung as plain text: the line that marks it a draft dropped, bold marks removed, every link written out as its URL, each source on a line of its own, a blank line between blocks.

**The sources go out on every channel, complete.** Paul calls them the most important part of a description (2026-10-10), so the source list is the one block that is never shortened.

- **Long,** for YouTube: all of it, with `#Shorts` first among the hashtags.
- **Short,** for Instagram and TikTok, which take 2,200 characters: the same text. When it is longer, drop whole sentences from the market-data paragraph until it fits, wording untouched: the Stichtag sentence stays, then what the spoken market figures measure, in the order the short says them.

The YouTube title is the hook, the Skript's first line.

Done when both texts hold every source of the Videobeschreibung, the short one is under 2,200 characters, and both carry „Keine Anlageberatung." and „Voiceover mit KI-generierter Stimme.".

### 4. Show Paul

Give him, per short, the title, the slot it would take, and the sentences the short text leaves out; the texts themselves are his Videobeschreibung. Wait for his go; a correction changes the Videobeschreibung on the video's page first and the texts from it.

### 5. Queue

One short after the other, so the queue keeps the folder order. Three `create_post` calls per short, each with `schedulingType: "automatic"`, `mode: "addToQueue"`, the text, `assets: [{"video": {"url": "<public URL>"}}]` and the channel's metadata:

| Channel | Text | `metadata` |
| --- | --- | --- |
| YouTube | long | `youtube: {title, categoryId: "27", privacy: "public", madeForKids: false, isAiGenerated: true}` |
| TikTok | short | `tiktok: {isAiGenerated: true}` |
| Instagram | short | `instagram: {type: "reel", shouldShareToFeed: true, isAiGenerated: true}` |

`isAiGenerated` is each platform's own label for the cloned voice; it goes with the notice `KI-generiert` in the picture.

When a call fails, stop there: report the error and which posts are in. A refused post at the plan's limit means the queue is full; the remaining shorts wait for a free slot.

Done when each `create_post` answer shows the metadata as sent, and `list_posts` shows three posts per short in status `scheduled`, each with its video, its `dueAt` and the text as written. `list_posts` returns no metadata; `get_post` does.

### 6. Record and report

Set the video's `Status` to **Queued**. Tell Paul which short goes out when on which channel.

## Other orders

- **Reword a queued post:** bring the Videobeschreibung in line, then `edit_post` with the new text on each channel that carries it.
- **A queued short was exported again:** upload it over the same key, then `edit_post` on its three posts with the URL plus a new query (`…mp4?v=2`), so Buffer reads the file afresh.
- **Every `edit_post`** is checked as a whole post: send `postId`, what changes, and the channel's full `metadata` again. Leaving out `text`, `mode` and `dueAt` keeps the text and the slot.
- **Take a short out:** `delete_post` on its three posts, the `Status` back to **Ready to post**. The file in the bucket stays.
- **Empty the bucket:** delete the files whose three posts Buffer shows as `sent`.
