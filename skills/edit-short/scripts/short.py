#!/usr/bin/env python3
"""Mechanics for the edit-short skill: analyze takes, build the tight cut, assemble the project, verify it.

Run with the workspace's transcription venv (numpy + mlx_whisper):

    .venv-transcribe/bin/python .agents/skills/edit-short/scripts/short.py <command> <NNN> [...]

    start   NNN [TAKE.mp4 ...]   jump start: folder, takes, HyperFrames project, brief, analysis, draft cutlist and edit.json
    analyze NNN                  wav, transcript and speech regions for every take in NNN/
    window  NNN STEM A:B [...]   transcribe source windows of one take on their own
    cut     NNN                  NNN/prep/cutlist.json -> segments.json, cut.wav, captions.draft.txt
    assemble NNN [--force]       segments.json + captions.txt + edit.json -> hyperframes/index.html, captions.html
    retime  NNN                  after a changed cut: move captions.txt, edit.json and graphic cues onto it
    sync    NNN                  after clips were trimmed or moved in Studio: captions, graphics, sfx, music follow
    verify  NNN                  rebuild the dialogue from index.html, re-transcribe, compare with the captions
    export  NNN                  render NNN/NNN.mp4 and measure it: length, black frames, loudness
"""
import html
import json
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np


def workspace():
    """The Shorts workspace. The skill is symlinked into it, so it is found from where the command runs, not from this file."""
    here = Path.cwd()
    for folder in (here, *here.parents):
        if (folder / ".venv-transcribe").is_dir() and (folder / "sound").is_dir():
            return folder
    sys.exit("Run this from the Shorts workspace: the folder that holds .venv-transcribe and sound/.")


ROOT = workspace()
MODEL = "mlx-community/whisper-large-v3-mlx"
FPS = 30
PRE, POST = 0.12, 0.28  # room left before the first onset / after the last audible syllable: 0.4 s at every cut
MIN_PAUSE = 0.8  # only a pause this long is cut; the user trims further in Studio
MUSIC = "alex-morgan-boom-bap-old-school-groove-573879.mp3"
SOUNDS = {  # file, lead-in to skip, duration, volume
    "pop": ("dragon-studio-pop-402324.mp3", 0.18, 0.35, 0.2),
    "swoosh": ("universfield-fast-swoosh-383967.mp3", 0.07, 0.45, 0.22),
}


# --- audio helpers ---------------------------------------------------------------
def read_wav(path):
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16), sr


def write_wav(path, samples, sr):
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(samples.astype(np.int16).tobytes())


def transcribe_window(path):
    import mlx_whisper

    result = mlx_whisper.transcribe(
        str(path), path_or_hf_repo=MODEL, language="de", word_timestamps=True,
        condition_on_previous_text=False, verbose=None,
    )
    return [
        {"word": w["word"].strip(), "start": float(w["start"]), "end": float(w["end"])}
        for seg in result["segments"] for w in seg["words"]
    ]


def transcribe(path):
    """Whisper decodes 30 s windows and garbles a sentence that straddles one, so longer audio is
    transcribed in parts of at most 26 s, each split at the quietest point of its last 11 s."""
    path = Path(path)
    samples, sr = read_wav(path)
    if len(samples) / sr <= 28.0:
        return transcribe_window(path)
    x = samples.astype(np.float32) / 32768
    hop = int(sr * 0.01)
    words, start = [], 0
    while start < len(samples):
        end = len(samples)
        if (end - start) / sr > 28.0:
            a, b = (start + 15 * sr) // hop, (start + 26 * sr) // hop
            energy = [float(np.mean(x[i * hop:(i + 10) * hop] ** 2)) for i in range(a, b)]  # 100 ms frames
            end = (a + int(np.argmin(energy)) + 5) * hop
        tmp = path.with_name("_part.wav")
        write_wav(tmp, samples[start:end], sr)
        words += [{"word": w["word"], "start": w["start"] + start / sr, "end": w["end"] + start / sr} for w in transcribe_window(tmp)]
        tmp.unlink()
        start = end
    return words


def regions(samples, sr, threshold=-45.0, min_gap=0.18):
    x = samples.astype(np.float32) / 32768
    hop, win = int(sr * 0.005), int(sr * 0.02)
    n = (len(x) - win) // hop
    rms = np.array([np.sqrt(np.mean(x[i * hop:i * hop + win] ** 2) + 1e-12) for i in range(n)])
    t = np.arange(n) * hop / sr + win / 2 / sr
    active = 20 * np.log10(rms + 1e-9) > threshold
    out, start = [], None
    for i, a in enumerate(active):
        if a and start is None:
            start = i
        if not a and start is not None:
            out.append([float(t[start]), float(t[i - 1])])
            start = None
    if start is not None:
        out.append([float(t[start]), float(t[-1])])
    merged = out[:1]
    for r in out[1:]:
        if r[0] - merged[-1][1] < min_gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [r for r in merged if r[1] - r[0] > 0.04]


def speech_level(samples):
    x = samples.astype(np.float32) / 32768
    n = len(x) // 320
    if n == 0:
        return -60.0
    r = np.sqrt((x[:n * 320].reshape(n, 320) ** 2).mean(axis=1) + 1e-12)
    active = r[r > r.max() * 0.1]
    return float(20 * np.log10(np.sqrt((active ** 2).mean())))


def silences(path, seconds=0.3):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", f"silencedetect=noise=-45dB:d={seconds}", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    return [(float(a), float(b)) for a, b in re.findall(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", out)]


def takes(project):
    return sorted(p for p in project.glob("*.mp4"))


ALIASES = {"cloud": "claude", "gbt": "gpt", "gbd": "gpt"}  # heard -> meant; a project adds its own in prep/aliases.json


def normal(words):
    text = "".join(words).lower()
    for heard, meant in ALIASES.items():
        text = text.replace(heard, meant)
    text = re.sub(r"[^a-zäöüß0-9]", "", text).replace("ß", "ss")
    return re.sub(r"(.)\1+", r"\1", text)  # das/dass, Model/Modell: spelling the ear cannot tell apart


def disputes(wav, heard, expected):
    """Differences between what was heard in `wav` and the `expected` text that survive a second opinion.

    A whole-file pass sometimes drops or mangles a word that is plainly there. Each difference is
    therefore re-checked by transcribing 8 s around it on its own; it stands only if that window
    does not contain the expected words either."""
    import difflib

    spans, said = [], ""
    for w in heard:  # character position in the normalised text -> start time of the word it came from
        piece = normal([w["word"]])
        spans.append((len(said), w["start"]))
        said += piece
    said, wanted = normal([w["word"] for w in heard]), normal(expected)
    samples, sr = read_wav(wav)
    left = []
    for op, a1, a2, b1, b2 in difflib.SequenceMatcher(None, said, wanted).get_opcodes():
        if op == "equal":
            continue
        at = max((t for pos, t in spans if pos <= a1), default=0.0)
        tmp = Path(wav).with_name("_dispute.wav")
        write_wav(tmp, samples[int(max(0.0, at - 4) * sr):int((at + 4) * sr)], sr)
        window = normal([w["word"] for w in transcribe_window(tmp)])
        tmp.unlink()
        if wanted[max(0, b1 - 10):b2 + 10] not in window:
            left.append(f"   {op} near {at:.1f} s: heard '{said[a1:a2]}' | expected '{wanted[b1:b2]}'")
    return left


# --- analyze ---------------------------------------------------------------------
def analyze(project):
    prep = project / "prep"
    prep.mkdir(exist_ok=True)
    for take in takes(project):
        stem = take.stem
        wav = prep / f"{stem}.wav"
        if not wav.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(take), "-vn", "-ac", "1", "-ar", "16000", str(wav)], check=True)
        words_file = prep / f"{stem}.words.json"
        if not words_file.exists():
            words_file.write_text(json.dumps(transcribe(wav), ensure_ascii=False))
        words = json.loads(words_file.read_text())
        samples, sr = read_wav(wav)
        regs = regions(samples, sr)
        (prep / f"{stem}.regions.json").write_text(json.dumps(regs))
        print(f"\n=== {stem}  ({len(samples) / sr:.1f} s, speech level {speech_level(samples):.1f} dBFS)")
        print("speech regions (onset - offset, gap before):")
        prev = 0.0
        for a, b in regs:
            said = " ".join(w["word"] for w in words if a - 0.15 <= (w["start"] + w["end"]) / 2 <= b + 0.15)
            print(f"  {a:7.3f} - {b:7.3f}  gap {a - prev:5.2f}  {said[:90]}")
            prev = b
        long_words = [w for w in words if w["end"] - w["start"] > 1.2]
        for w in long_words:
            print(f"  ! '{w['word']}' lasts {w['end'] - w['start']:.1f} s ({w['start']:.2f}-{w['end']:.2f}): dropped speech likely, "
                  f"run: window {project.name} {stem} {max(0, w['start'] - 0.3):.1f}:{w['end'] + 0.3:.1f}")


def window(project, stem, spans):
    samples, sr = read_wav(project / "prep" / f"{stem}.wav")
    for span in spans:
        a, b = (float(v) for v in span.split(":"))
        tmp = project / "prep" / "_window.wav"
        write_wav(tmp, samples[int(a * sr):int(b * sr)], sr)
        print(f"=== {stem} [{a}-{b}]")
        print(" ".join(f"{w['word']}({w['start'] + a:.2f}-{w['end'] + a:.2f})" for w in transcribe(tmp)))
        tmp.unlink()


# --- cut -------------------------------------------------------------------------
def join_tokens(words):
    out = []
    for w in words:
        token = w["word"]
        if out and (token.startswith("-") or re.match(r"^[.,]\d", token)):
            out[-1]["word"] += token
            out[-1]["end"] = w["end"]
        else:
            out.append(dict(w))
    return out


def merge_short_pauses(cutlist, prep):
    """Join neighbouring passages that are separated by nothing but a pause shorter than MIN_PAUSE."""
    regs = {}
    out = [dict(cutlist[0])]
    for c in cutlist[1:]:
        last = out[-1]
        if c["take"] == last["take"] and 0 <= c["on"] - last["off"] < MIN_PAUSE:
            if c["take"] not in regs:
                path = prep / f"{c['take']}.regions.json"
                regs[c["take"]] = json.loads(path.read_text()) if path.exists() else regions(*read_wav(prep / f"{c['take']}.wav"), min_gap=0.05)
            # speech inside the gap means something was removed there on purpose: that cut stays
            removed = any(last["off"] + 0.03 < a and b < c["on"] - 0.03 for a, b in regs[c["take"]])
            if not removed and "post" not in last and "pre" not in c:
                last["off"], last["text"] = c["off"], f"{last['text']} {c['text']}"
                if "post" in c:
                    last["post"] = c["post"]
                continue
        out.append(dict(c))
    return out


def cut(project):
    prep = project / "prep"
    authored = json.loads((prep / "cutlist.json").read_text())
    cutlist = merge_short_pauses(authored, prep)
    on_cut = prep / "segments.captions.json"  # the cut that captions.txt and edit.json currently sit on, for `retime`
    if (prep / "segments.json").exists() and (prep / "captions.txt").exists() and not on_cut.exists():
        shutil.copy(prep / "segments.json", on_cut)
    audio, fine = {}, {}
    cuts, frame, pieces, sr = [], 0, [], 16000
    for i, c in enumerate(cutlist):
        if c["take"] not in audio:
            audio[c["take"]] = read_wav(prep / f"{c['take']}.wav")
        samples, sr = audio[c["take"]]
        # padding stops short of the neighbouring sound (a removed filler, the next word); an entry may set its own
        if c["take"] not in fine:
            fine[c["take"]] = regions(samples, sr, min_gap=0.05)
        before = [b for a, b in fine[c["take"]] if b < c["on"] - 0.005]
        after = [a for a, b in fine[c["take"]] if a > c["off"] + 0.005]
        pre = c.get("pre", max(0.02, min(PRE, c["on"] - max(before) - 0.02)) if before else PRE)
        post = c.get("post", max(0.03, min(POST, min(after) - c["off"] - 0.02)) if after else POST)
        media_start = round((c["on"] - pre) * 60) / 60
        frames = round((c["off"] + post - media_start) * FPS)
        duration = frames / FPS
        piece = samples[int(media_start * sr):int((media_start + duration) * sr)]
        pieces.append(piece)
        for label, a, b in (("pre", media_start, c["on"] - 0.02), ("post", c["off"] + 0.03, media_start + duration)):
            pad = samples[int(a * sr):int(b * sr)].astype(np.float32) / 32768
            level = 20 * np.log10(np.sqrt(np.mean(pad ** 2)) + 1e-9) if len(pad) else -120
            if level > -42:
                print(f"  ! clip {i + 1:02d}: the {label} padding holds sound at {level:.0f} dBFS; if that is a neighbouring word, set \"{label}\" on this entry")
        cuts.append({
            "id": f"{i + 1:02d}", "take": c["take"], "mediaStart": round(media_start, 6), "duration": round(duration, 6),
            "start": round(frame / FPS, 6), "role": c["role"], "text": c["text"], "on": c["on"], "off": c["off"],
            "level_db": round(speech_level(piece), 2),
        })
        frame += frames
    print(f"{len(authored)} passages -> {len(cuts)} clips (pauses under {MIN_PAUSE} s stay in)")
    speech = round(speech_level(np.concatenate(pieces)), 2)  # one level for the whole track; the bus sets the gain
    total = round(frame / FPS, 6)
    (prep / "segments.json").write_text(json.dumps({"fps": FPS, "duration": total, "speech_db": speech, "cuts": cuts}, ensure_ascii=False, indent=1))
    write_wav(prep / "cut.wav", np.concatenate(pieces), sr)

    heard = transcribe(prep / "cut.wav")
    print(f"cut: {len(cuts)} clips, {total:.2f} s")
    print("heard:", " ".join(w["word"] for w in heard))
    left = disputes(prep / "cut.wav", heard, [c["text"] for c in cuts])
    if not left:
        print("PASS  the cut says exactly what the cut list says")
    else:
        print("FAIL  the cut and the cut list differ:")
        print("\n".join(left))
    gaps = silences(prep / "cut.wav", MIN_PAUSE + 0.05)
    print(f"PASS  no pause of {MIN_PAUSE} s or more" if not gaps else f"FAIL  pauses of {MIN_PAUSE} s or more end at: {[round(e, 2) for e, _ in gaps]}")
    print(f"speech level {speech:.1f} dBFS; per clip:", " ".join(f"{c['id']}:{c['level_db']:.1f}" for c in cuts))

    # word times per clip (each clip transcribed alone, first word clamped to the speech onset) -> caption draft
    lines = []
    for c, piece in zip(cuts, pieces):
        tmp = prep / "_clip.wav"
        write_wav(tmp, piece, sr)
        words = join_tokens(transcribe(tmp))
        tmp.unlink()
        if not words:
            continue
        words[0]["start"] = PRE
        phrase = []
        for k, w in enumerate(words):
            phrase.append(f"{w['word']}@{c['start'] + w['start']:.2f}")
            text = " ".join(p.rsplit("@", 1)[0] for p in phrase)
            last = k == len(words) - 1
            upcoming = words[k + 1]["word"] if not last else ""
            if last or (re.search(r"[.,?!:]$", w["word"]) and len(phrase) >= 2) or len(phrase) >= 4 or len(text) + 1 + len(upcoming) > 26:
                end = f" | {min(c['start'] + c['duration'] - 0.02, c['start'] + w['end'] + 0.15):.2f}" if last else ""
                lines.append(" ".join(phrase) + end)
                phrase = []
    (prep / "captions.draft.txt").write_text("\n".join(lines) + "\n")
    print(f"wrote {prep / 'captions.draft.txt'}: copy to captions.txt, fix spellings and phrase breaks")


# --- assemble --------------------------------------------------------------------
def attr(value):
    return html.escape(json.dumps(value, separators=(",", ":")), quote=True)


def num(value):
    return f"{value:.6f}".rstrip("0").rstrip(".")


def floor6(value):
    return int(value * 1e6 + 1e-9) / 1e6


HOOK = """<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <style>
        @font-face {
          font-family: Oswald;
          src: url("assets/Oswald.ttf") format("truetype");
          font-weight: 200 700;
          font-display: block;
        }
        #hook-root {
          position: absolute;
          inset: 0;
        }
        /* the band: visual centre (540, 640); raise `top` when the block reaches the eyes */
        #hook-art {
          position: absolute;
          left: 70px;
          top: __TOP__px;
          width: 940px;
          height: __HEIGHT__px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: Oswald, sans-serif;
          font-weight: 700;
          font-size: 100px;
          line-height: 1.15;
          text-transform: uppercase;
          letter-spacing: -0.012em;
          text-align: center;
          color: #ffffff;
          filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.85)) drop-shadow(0 5px 14px rgba(0, 0, 0, 0.6));
        }
        #hook-art p {
          display: block;
          white-space: nowrap;
        }
      </style>

      <div id="hook-root" data-composition-id="hook" data-width="1080" data-height="1920" data-duration="__DURATION__">
        <div id="hook-art">
__LINES__
        </div>
      </div>

      <script>
        {
          const tl = gsap.timeline({ paused: true });
          // visible from the first frame; settles in, leaves before the next sentence
          tl.fromTo("#hook-art", { scale: 0.9 }, { scale: 1, duration: 0.3, ease: "back.out(2)" }, 0);
          tl.to("#hook-art", { opacity: 0, duration: 0.2, ease: "power1.in" }, __EXIT__);
          window.__timelines["hook"] = tl;
        }
      </script>
    </template>
  </body>
</html>
"""


def write_captions(prep, hf, total):
    nl = "\n"
    # captions: one phrase per line, words as text@start, optional "| end"; a trailing "-" joins a word to the next
    groups = []
    for line in (prep / "captions.txt").read_text().splitlines():
        if not line.strip():
            continue
        body, _, end = line.partition("|")
        words = [(w.rsplit("@", 1)[0], float(w.rsplit("@", 1)[1])) for w in body.split()]
        groups.append({"words": words, "end": float(end) if end.strip() else None})
    for i, g in enumerate(groups):
        if g["end"] is None:
            g["end"] = groups[i + 1]["words"][0][1] if i + 1 < len(groups) else total
    markup, data = [], []
    for gi, g in enumerate(groups):
        spans = []
        for wi, (text, _) in enumerate(g["words"]):
            joined = text.endswith("-") and wi + 1 < len(g["words"])
            spans.append(f'<span id="cw-{gi}-{wi}" class="cw{" joined" if joined else ""}">{html.escape(text)}</span>')
        markup.append(f'          <p id="cg-{gi}" class="cg">{"".join(spans)}</p>')
        data.append({"s": g["words"][0][1], "e": g["end"], "w": [t for _, t in g["words"]]})
    (hf / "compositions" / "captions.html").write_text(f"""<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <style>
        #captions-root {{
          position: absolute;
          inset: 0;
        }}
        /* caption box: x 100, y 1360, 880 x 180 */
        #captions-box {{
          position: absolute;
          left: 100px;
          top: 1360px;
          width: 880px;
          height: 180px;
        }}
        #captions-box .cg {{
          position: absolute;
          inset: 0;
          display: flex;
          flex-wrap: wrap;
          align-content: center;
          justify-content: center;
          column-gap: 0.26em;
          opacity: 0;
          font-family: Inter, sans-serif;
          font-weight: 700;
          font-size: 64px;
          line-height: 1.22;
          letter-spacing: -0.01em;
          text-align: center;
          color: #ffffff;
          -webkit-text-stroke: 9px #000000;
          paint-order: stroke fill;
          text-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
        }}
        #captions-box .cw {{
          display: block;
          color: #ffffff;
        }}
        #captions-box .cw.joined {{
          margin-right: -0.26em;
        }}
      </style>

      <div id="captions-root" data-composition-id="captions" data-width="1080" data-height="1920" data-duration="{num(floor6(total))}">
        <div id="captions-box">
{nl.join(markup)}
        </div>
      </div>

      <script>
        {{
          // one entry per phrase: s = start, e = end, w = start of each word (root seconds)
          const GROUPS = {json.dumps(data, separators=(",", ":"))};
          const WHITE = "#ffffff";
          const YELLOW = "#FFE500";
          const tl = gsap.timeline({{ paused: true }});
          GROUPS.forEach((g, gi) => {{
            const el = document.getElementById("cg-" + gi);
            tl.set(el, {{ opacity: 1, visibility: "visible" }}, g.s);
            g.w.forEach((t, wi) => {{
              const word = document.getElementById("cw-" + gi + "-" + wi);
              tl.set(word, {{ color: YELLOW }}, t);
              if (wi + 1 < g.w.length) tl.set(word, {{ color: WHITE }}, g.w[wi + 1]);
            }});
            tl.set(el, {{ opacity: 0, visibility: "hidden" }}, g.e);
          }});
          window.__timelines["captions"] = tl;
        }}
      </script>
    </template>
  </body>
</html>
""")
    return len(groups)


def assemble(project, force):
    prep, hf = project / "prep", project / "hyperframes"
    if not (hf / "hyperframes.json").exists():
        sys.exit(f"{hf} is not initialised: run `npx hyperframes init hyperframes --resolution portrait --non-interactive --skip-transcribe --skill=general-video` in {project}")
    index = hf / "index.html"
    if "take-01" in index.read_text() and not force:
        sys.exit("index.html already holds an assembly. Edit the HTML for changes; --force overwrites it and every later edit.")
    built = prep / "segments.captions.json"
    if "take-01" in index.read_text() and built.exists() and "--discard-studio-edits" not in sys.argv:
        was = json.loads(built.read_text())["cuts"]
        now = sorted((float(re.search(r' data-start="([^"]*)"', t).group(1)), float(re.search(r' data-duration="([^"]*)"', t).group(1)),
                      float(re.search(r' data-media-start="([^"]*)"', t).group(1)))
                     for t in re.findall(r'<video [^>]*class="clip take"[^>]*>', index.read_text()))
        same = len(now) == len(was) and all(
            abs(n[0] - c["start"]) < 0.003 and abs(n[1] - c["duration"]) < 0.003 and abs(n[2] - c["mediaStart"]) < 0.003 for n, c in zip(now, was))
        if not same:
            sys.exit("The clips in index.html were changed in Studio since the last build. Run `sync` to keep those edits; "
                     "`assemble --force --discard-studio-edits` throws them away.")
    seg = json.loads((prep / "segments.json").read_text())
    edit = json.loads((prep / "edit.json").read_text())
    shutil.copy(prep / "segments.json", prep / "segments.captions.json")  # captions.txt is written against this cut
    cuts, total = seg["cuts"], seg["duration"]

    # assets: originals, house font/music/sfx, and a playback copy of each take with a keyframe where each clip starts
    (hf / "assets" / "playback").mkdir(parents=True, exist_ok=True)
    (hf / "compositions").mkdir(exist_ok=True)
    for name in ("Oswald.ttf", "Unbounded.ttf", "gsap.min.js"):  # hook, graphics
        shutil.copy(Path(__file__).resolve().parents[1] / "assets" / name, hf / "assets" / name)
    for name in [MUSIC] + [s[0] for s in SOUNDS.values()]:
        shutil.copy(ROOT / "sound" / name, hf / "assets" / name)
    for stem in sorted({c["take"] for c in cuts}):
        shutil.copy2(project / f"{stem}.mp4", hf / "assets" / f"{stem}.mp4")
        keys = sorted({c["mediaStart"] for c in cuts if c["take"] == stem})
        target = hf / "assets" / "playback" / f"{stem}.mp4"
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", str(project / f"{stem}.mp4"), "-c:v", "libx264", "-preset", "medium", "-crf", "17",
            "-pix_fmt", "yuv420p", "-g", "30", "-force_key_frames", ",".join(f"{k:.6f}" for k in keys), "-c:a", "copy",
            "-movflags", "+faststart", str(target),
        ], check=True)

    # voice bus: bring the (level-matched) speech to about -14.7 dBFS ahead of the compressor
    gain = max(0.0, min(24.0, -14.7 - seg["speech_db"]))
    voice_chain = {"version": 1, "nodes": [
        {"id": "v1", "type": "highpass", "label": "Rumble cut", "params": {"frequency": 80, "q": 0.707, "poles": "2"}},
        {"id": "v2", "type": "peaking", "label": "Gentle mud cut", "params": {"frequency": 250, "gain": -2, "q": 0.8}},
        {"id": "v3", "type": "gain", "label": "Voice boost", "params": {"gain": round(min(gain, 12.0), 1)}},
        {"id": "v3b", "type": "gain", "label": "Voice boost 2", "params": {"gain": round(max(0.0, gain - 12.0), 1)}},
        {"id": "v4", "type": "compressor", "label": "Even out the voice", "params": {"threshold": -26, "ratio": 4, "attack": 1, "release": 150, "knee": 4, "makeup": 11, "mix": 1}},
        {"id": "v5", "type": "limiter", "label": "Peak ceiling", "params": {"limit": -1, "attack": 3, "release": 60, "level_out": 0}},
    ]}
    music_chain = {"version": 1, "nodes": [
        {"id": "m1", "type": "peaking", "label": "Room for the voice", "params": {"frequency": 750, "gain": -8, "q": 0.65}},
        {"id": "m2", "type": "lowpass", "label": "Soften top", "params": {"frequency": 9500, "q": 0.707, "poles": "2"}},
    ]}
    music_volume = edit.get("music_volume", 0.056)

    # clips: starts floored to 6 decimals so the frame at k/30 belongs to the clip starting there
    bounds, frame = [], 0
    for c in cuts:
        bounds.append(floor6(frame / FPS))
        frame += round(c["duration"] * FPS)
    bounds.append(floor6(frame / FPS))
    # one track, clips end to end, no fades and no overlaps, so each clip can be trimmed in Studio
    videos = []
    for i, c in enumerate(cuts):
        start, dur = bounds[i], round(bounds[i + 1] - bounds[i] - 1e-6, 6)  # 1 µs short of the next clip's start
        videos.append(
            f'      <video id="take-{c["id"]}" class="clip take" src="assets/playback/{c["take"]}.mp4"'
            f' data-label="{html.escape(c["text"][:40], quote=True)}" data-start="{num(start)}" data-duration="{num(dur)}"'
            f' data-media-start="{num(c["mediaStart"])}" data-track-index="0" playsinline data-has-audio="true" data-volume="1"'
            f' data-audio-group="voice"></video>'
        )

    hosts = [
        f'      <div id="{g["id"]}" class="clip layer" data-label="{html.escape(g.get("label", g["id"]), quote=True)}" data-composition-id="{g["id"]}"'
        f' data-composition-src="compositions/{g["id"]}.html" data-start="{num(g["start"])}" data-duration="{num(g["duration"])}"'
        f' data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>'
        for g in edit.get("graphics", [])
    ]
    sfx = []
    for s in edit.get("sfx", []):
        file, lead, dur, vol = SOUNDS[s["sound"]]
        sfx.append(
            f'      <audio id="{s["id"]}" class="clip" src="assets/{file}" data-start="{num(s["at"])}" data-duration="{num(dur)}"'
            f' data-media-start="{num(lead)}" data-track-index="11" data-volume="{vol}"></audio>'
        )
    music_lane = {"version": 1, "lanes": [{"target": "volume", "points": [
        {"t": 0, "v": 0}, {"t": 0.3, "v": music_volume}, {"t": round(total - 1.2, 6), "v": music_volume}, {"t": total, "v": 0}]}]}
    nl = "\n"
    index.write_text(f"""<!doctype html>
<html lang="de" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>{html.escape(edit.get("title", project.name))}</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      * {{
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }}
      html,
      body {{
        width: 1080px;
        height: 1920px;
        overflow: hidden;
        background: #0a0a0a;
      }}
      #root {{
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }}
      .take {{
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }}
      .layer {{
        position: absolute;
        inset: 0;
        z-index: 100;
      }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{num(floor6(total))}" data-width="1080" data-height="1920" data-fps="{FPS}">
      <!-- voice: every clip carries its own sound and feeds this bus -->
      <hf-audio-group id="voice" data-label="Stimme" data-volume="1" data-fx-chain="{attr(voice_chain)}"></hf-audio-group>

      <!-- a-roll: one clip per kept passage, end to end on one track -->
{nl.join(videos)}

      <!-- graphics: hook and illustrations, on the band centred on (540, 640) -->
{nl.join(hosts)}

      <!-- captions: the single caption track -->
      <div id="captions" class="clip layer" data-label="Captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{num(floor6(total))}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920"></div>

      <!-- music and sfx -->
      <audio id="music" class="clip" data-label="Alex Morgan · Musik" src="assets/{MUSIC}" data-start="0" data-duration="{num(floor6(total))}" data-media-start="0" data-track-index="10" data-volume="{music_volume}" data-fx-chain="{attr(music_chain)}" data-automation="{attr(music_lane)}"></audio>
{nl.join(sfx)}
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
""")

    phrases = write_captions(prep, hf, total)

    # hook: written once from edit.json, then edited as HTML
    hook = next((g for g in edit.get("graphics", []) if g["id"] == "hook"), None)
    hook_file = hf / "compositions" / "hook.html"
    if hook and edit.get("hook") and not hook_file.exists():
        height = 115 * len(edit["hook"])
        lines = nl.join(f'          <p id="hook-line-{i + 1}">{html.escape(t)}</p>' for i, t in enumerate(edit["hook"]))
        hook_file.write_text(
            HOOK.replace("__TOP__", str(636 - height // 2)).replace("__HEIGHT__", str(height))
            .replace("__DURATION__", num(hook["duration"])).replace("__EXIT__", num(hook["duration"] - 0.2)).replace("__LINES__", lines)
        )
    missing = [g["id"] for g in edit.get("graphics", []) if not (hf / "compositions" / f"{g['id']}.html").exists()]
    print(f"index.html: {len(cuts)} clips, {total:.2f} s, voice gain {gain:.1f} dB; captions.html: {phrases} phrases")
    if missing:
        print("graphics still to write in compositions/:", ", ".join(missing))


# --- retime ----------------------------------------------------------------------
def mover(old, new):
    """Map a root time on the `old` cut to the root time of the same source instant on the `new` cut."""
    total = sum(c["duration"] for c in new)

    def move(t, keep_gone=False, hold=False):
        clip = next((c for c in old if c["start"] - 1e-6 <= t < c["start"] + c["duration"] + 1e-6), old[-1])
        source = clip["mediaStart"] + (t - clip["start"])
        tail = 0.12 if keep_gone else 0.0  # a word needs that long before its clip ends to be heard
        for c in new:
            if c["take"] == clip["take"] and c["mediaStart"] - 1e-6 <= source <= c["mediaStart"] + c["duration"] - tail + 1e-6:
                return c["start"] + (source - c["mediaStart"])
        if keep_gone:
            return None
        same = [c for c in new if c["take"] == clip["take"]]
        if hold:  # that instant is not on the new cut: stay at the end of what came before it
            before = [c for c in same if c["mediaStart"] + c["duration"] <= source]
            if before:
                last = max(before, key=lambda c: c["mediaStart"])
                return last["start"] + last["duration"]
        later = [c for c in same if c["mediaStart"] > source]
        return min(later, key=lambda c: c["mediaStart"])["start"] if later else total

    return move


WARP_START, WARP_END = "// retime:start", "// retime:end"


def warp(comp, gid, points, duration):
    """Keep a graphic's cues on their words after a recut without rewriting the cues.

    The cues stay on the clock they were written on. `points` are [new local time, authored local time]
    pairs; the registered timeline plays the authored one through that map, holding still across a
    restored pause and skipping what was cut."""
    text = comp.read_text()
    plain = f'window.__timelines["{gid}"] = tl;'
    if WARP_START in text:
        a, b = text.index(WARP_START), text.index(WARP_END) + len(WARP_END)
        text = text[:a] + plain + text[b:]
    identity = all(abs(n - o) < 0.04 for n, o in points)
    if not identity:
        pairs = ", ".join(f"[{n:.3f}, {o:.3f}]" for n, o in points)
        block = (
            f"{WARP_START} (written by short.py retime: [time on the current cut, time the cues above were written on])\n"
            f"          const map = [{pairs}];\n"
            f"          const retimed = gsap.timeline({{ paused: true }});\n"
            f"          tl.pause(0);\n"
            f"          for (let i = 1; i < map.length; i++) {{\n"
            f"            retimed.fromTo(tl, {{ time: map[i - 1][1] }}, {{ time: map[i][1], duration: map[i][0] - map[i - 1][0], ease: \"none\", immediateRender: false }}, map[i - 1][0]);\n"
            f"          }}\n"
            f'          window.__timelines["{gid}"] = retimed;\n'
            f"          {WARP_END}"
        )
        assert plain in text, f"{comp.name}: timeline registration not found"
        text = text.replace(plain, block)
    text = re.sub(rf'(data-composition-id="{gid}"[^>]*data-duration=")[\d.]+(")', lambda m: m.group(1) + num(duration) + m.group(2), text, count=1)
    comp.write_text(text)
    return not identity


def retime(project):
    """Move captions, graphic windows, sound effects and the cues inside each graphic onto the current cut."""
    prep, hf = project / "prep", project / "hyperframes"
    new = json.loads((prep / "segments.json").read_text())["cuts"]
    total = sum(c["duration"] for c in new)

    # captions: from the cut they sit on
    on_cut = json.loads((prep / "segments.captions.json").read_text())["cuts"]
    move = mover(on_cut, new)
    lines = []
    for line in (prep / "captions.txt").read_text().splitlines():
        if not line.strip():
            continue
        body, _, end = line.partition("|")
        words = []
        for w in body.split():
            text, t = w.rsplit("@", 1)
            at = move(float(t), keep_gone=True)
            if at is not None:
                words.append(f"{text}@{at:.2f}")
        if words:
            lines.append(" ".join(words) + (f" | {move(float(end)):.2f}" if end.strip() else ""))
    (prep / "captions.txt").write_text("\n".join(lines) + "\n")

    # graphics and sfx: always from the cut they were written on, so repeated recuts never stack up
    if not (prep / "segments.authored.json").exists():
        shutil.copy(prep / "segments.captions.json", prep / "segments.authored.json")
        shutil.copy(prep / "edit.json", prep / "edit.authored.json")
    authored_cut = json.loads((prep / "segments.authored.json").read_text())["cuts"]
    authored = json.loads((prep / "edit.authored.json").read_text())
    forward, back = mover(authored_cut, new), mover(new, authored_cut)
    edit = json.loads((prep / "edit.json").read_text())
    edit["graphics"], edit["sfx"] = [], []
    for g in authored.get("graphics", []):
        a, b = g["start"], g["start"] + g["duration"]
        # anchor on the first cue (0.15 s in), so a pause restored just before the graphic does not open it early
        na = 0.0 if a < 0.02 else round(max(0.0, forward(min(a + 0.15, b)) - 0.15), 2)
        nb = round(min(total, forward(b, hold=True)), 2)
        points, step = [], 1 / FPS
        n = 0.0
        while n <= nb - na + 1e-6:
            o = min(max(back(na + n, hold=True) - a, 0.0), g["duration"])
            if len(points) >= 2:
                (n1, o1), (n2, o2) = points[-2], points[-1]
                same_slope = abs((o - o2) / (n - n2) - (o2 - o1) / (n2 - n1)) < 1e-3
            else:
                same_slope = False
            if same_slope:
                points[-1] = [n, o]  # still on the same straight stretch: extend it
            else:
                points.append([n, o])
            n += step
        mapped = warp(hf / "compositions" / f"{g['id']}.html", g["id"], points, round(nb - na, 2))
        edit["graphics"].append({**g, "start": na, "duration": round(nb - na, 2)})
        print(f"  {g['id']}: {a:.2f}-{b:.2f} -> {na:.2f}-{nb:.2f}" + ("  (cues retimed through a map)" if mapped else ""))
    for x in authored.get("sfx", []):
        edit["sfx"].append({**x, "at": round(forward(x["at"]), 2)})
    (prep / "edit.json").write_text(json.dumps(edit, ensure_ascii=False, indent=1))
    shutil.copy(prep / "segments.json", prep / "segments.captions.json")
    print(f"captions.txt: {len(lines)} phrases moved. Now run assemble --force.")


# --- sync ------------------------------------------------------------------------
def set_attrs(text, element_id, values):
    tag = re.search(rf'<(?:video|audio|div) [^>]*\bid="{re.escape(element_id)}"[^>]*>', text).group(0)
    new = tag
    for name, value in values.items():
        new = re.sub(rf' {name}="[^"]*"', f' {name}="{value}"', new, count=1)
    return text.replace(tag, new)


def sync(project):
    """After clips were trimmed or moved in Studio: snap them to frames, close the gaps, and move captions,
    graphics, sound effects and music to follow. Only timing attributes in index.html are rewritten."""
    prep, hf = project / "prep", project / "hyperframes"
    index = hf / "index.html"
    text = index.read_text()
    previous = json.loads((prep / "segments.json").read_text())
    known = {c["id"]: c for c in previous["cuts"]}
    clips = []
    for tag in re.findall(r'<video [^>]*class="clip take"[^>]*>', text):
        get = lambda name: re.search(rf' {name}="([^"]*)"', tag).group(1)
        clips.append({"el": get("id"), "take": Path(get("src")).stem, "start": float(get("data-start")),
                      "duration": float(get("data-duration")), "mediaStart": float(get("data-media-start"))})
    clips.sort(key=lambda c: c["start"])
    cuts, frame, frame_starts = [], 0, []
    for c in clips:  # end to end on the frame grid
        frames = max(1, round(c["duration"] * FPS))
        frame_starts.append(frame)
        cid = c["el"].removeprefix("take-")
        cuts.append({"id": cid, "take": c["take"], "mediaStart": round(c["mediaStart"], 6), "duration": round(frames / FPS, 6),
                     "start": round(frame / FPS, 6), "role": known.get(cid, {}).get("role", ""), "text": known.get(cid, {}).get("text", ""), "el": c["el"]})
        frame += frames
    total = round(frame / FPS, 6)
    (prep / "segments.json").write_text(json.dumps({**previous, "duration": total, "cuts": cuts}, ensure_ascii=False, indent=1))
    retime(project)
    edit = json.loads((prep / "edit.json").read_text())

    text = index.read_text()
    # floored from the exact frame time, so the frame at k/30 always falls inside the clip that starts there
    bounds = [floor6(f / FPS) for f in frame_starts] + [floor6(frame / FPS)]
    for i, c in enumerate(cuts):
        text = set_attrs(text, c["el"], {"data-start": num(bounds[i]), "data-duration": num(round(bounds[i + 1] - bounds[i] - 1e-6, 6))})
    for g in edit.get("graphics", []):
        text = set_attrs(text, g["id"], {"data-start": num(g["start"]), "data-duration": num(g["duration"])})
    for x in edit.get("sfx", []):
        text = set_attrs(text, x["id"], {"data-start": num(x["at"])})
    text = set_attrs(text, "captions", {"data-duration": num(floor6(total))})
    music = re.search(r'<audio [^>]*\bid="music"[^>]*>', text).group(0)
    volume = float(re.search(r' data-volume="([^"]*)"', music).group(1))
    lane = {"version": 1, "lanes": [{"target": "volume", "points": [
        {"t": 0, "v": 0}, {"t": 0.3, "v": volume}, {"t": round(total - 1.2, 6), "v": volume}, {"t": total, "v": 0}]}]}
    text = set_attrs(text, "music", {"data-duration": num(floor6(total)), "data-automation": attr(lane)})
    root = re.search(r'<div [^>]*data-composition-id="main"[^>]*>', text).group(0)
    text = text.replace(root, re.sub(r' data-duration="[^"]*"', f' data-duration="{num(floor6(total))}"', root, count=1))
    index.write_text(text)
    phrases = write_captions(prep, hf, total)
    print(f"index.html: {len(cuts)} clips, {total:.2f} s, timing follows the Studio edits; captions.html: {phrases} phrases")


# --- start -----------------------------------------------------------------------
HF = ["npx", "--yes", "hyperframes@latest"]
HF_ENV = {"HYPERFRAMES_NO_TELEMETRY": "1", "HYPERFRAMES_SKIP_SKILLS": "1"}


def start(project, files):
    """Everything up to the first editorial decision: folder, takes, project, brief, analysis, drafts."""
    import os

    project.mkdir(exist_ok=True)
    for f in files:
        src = Path(f).expanduser()
        if not (project / src.name).exists():
            shutil.copy2(src, project / src.name)
    if not takes(project):
        sys.exit(f"no .mp4 takes in {project}: pass them, e.g. start {project.name} ~/Movies/rec/2026-10-03_16-43-12.mp4")
    hf = project / "hyperframes"
    if not (hf / "hyperframes.json").exists():
        subprocess.run(HF + ["init", "hyperframes", "--resolution", "portrait", "--non-interactive", "--skip-transcribe", "--skill=general-video"],
                       cwd=project, env={**os.environ, **HF_ENV}, check=True, stdout=subprocess.DEVNULL)
    brief = hf / "BRIEF.md"
    if not brief.exists():
        brief.write_text(
            "---\nworkflow: general-video\nflow: automation\nstoryboard: no\naspect: 1080x1920\nlanguage: de\n---\n\n"
            f"## Intent\n\nDaily short {project.name}, edited with the workspace `edit-short` skill. Reviewed in Studio; export on request.\n")
    analyze(project)
    prep = project / "prep"
    if not (prep / "cutlist.json").exists():  # one passage per speech region; the editor merges, drops and corrects
        draft = []
        for take in takes(project):
            words = json.loads((prep / f"{take.stem}.words.json").read_text())
            for a, b in json.loads((prep / f"{take.stem}.regions.json").read_text()):
                said = " ".join(w["word"] for w in words if a - 0.15 <= (w["start"] + w["end"]) / 2 <= b + 0.15)
                if said:
                    draft.append({"take": take.stem, "on": round(a, 3), "off": round(b, 3), "role": "point", "text": said})
        if draft:
            draft[0]["role"], draft[-1]["role"] = "hook", "ending"
        (prep / "cutlist.json").write_text(json.dumps(draft, ensure_ascii=False, indent=1))
    if not (prep / "edit.json").exists():
        (prep / "edit.json").write_text(json.dumps({
            "title": project.name, "hook": ["HOOK ZEILE 1", "HOOK ZEILE 2"],
            "graphics": [{"id": "hook", "start": 0, "duration": 3.0, "label": "Hook"}], "sfx": []}, ensure_ascii=False, indent=1))
    print(f"\nReady: {prep / 'cutlist.json'} is a draft with one passage per speech region and the text as transcribed. "
          "Remove abandoned starts and duplicate takes, fix the text, then run `cut`.")


# --- export ----------------------------------------------------------------------
def export(project):
    import os

    hf, out = project / "hyperframes", project / f"{project.name}.mp4"
    version = re.search(r"hyperframes@([\d.]+)", (hf / "package.json").read_text()).group(1)
    subprocess.run(["npx", "--yes", f"hyperframes@{version}", "render", "--quality", "looks", "--quiet", "--output", str(out)],
                   cwd=hf, env={**os.environ, **HF_ENV}, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    want = json.loads((project / "prep" / "segments.json").read_text())["duration"]
    got = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)],
                               capture_output=True, text=True).stdout)
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(out), "-vf", "blackdetect=d=0.02:pix_th=0.08", "-af", "ebur128", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    black = probe.count("black_start")
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", probe)[-1])
    print(f"{out}  {out.stat().st_size / 1e6:.0f} MB")
    print(("PASS" if abs(got - want) < 0.05 else "FAIL") + f"  length {got:.2f} s (cut is {want:.2f} s)")
    print(("PASS" if black == 0 else "FAIL") + f"  {black} black frame(s)")
    print(("PASS" if -17.5 <= lufs <= -14.5 else "FAIL") + f"  loudness {lufs:.1f} LUFS (aim for -16; the renderer scales the mix to its loudest peak, "
          "so a quiet result means one peak dominates: tame it in the voice chain, more gain does nothing)")


# --- verify ----------------------------------------------------------------------
def verify(project):
    prep, hf = project / "prep", project / "hyperframes"
    src = (hf / "index.html").read_text()
    clips = []
    for tag in re.findall(r"<video [^>]*>", src):
        get = lambda name: re.search(rf' {name}="([^"]*)"', tag).group(1)
        clips.append({"stem": Path(get("src")).stem, "start": float(get("data-start")),
                      "end": float(get("data-start")) + float(get("data-duration")), "media": float(get("data-media-start"))})
    clips.sort(key=lambda c: c["start"])
    ok = True
    for a, b in zip(clips, clips[1:]):
        if abs(b["start"] - a["end"]) > 1e-4:
            ok = False
            print(f"FAIL  audible windows not contiguous at {a['end']:.4f} -> {b['start']:.4f}")
    audio, pieces, sr = {}, [], 16000
    for c in clips:
        if c["stem"] not in audio:
            audio[c["stem"]] = read_wav(prep / f"{c['stem']}.wav")
        samples, sr = audio[c["stem"]]
        pieces.append(samples[int(c["media"] * sr):int((c["media"] + c["end"] - c["start"]) * sr)])
    write_wav(prep / "final.wav", np.concatenate(pieces), sr)
    heard = transcribe(prep / "final.wav")
    captions = (hf / "compositions" / "captions.html").read_text()
    shown = [html.unescape(x) for x in re.findall(r'class="cw(?: joined)?"[^>]*>([^<]+)<', captions)]
    left = disputes(prep / "final.wav", heard, shown)
    if not left:
        print(f"PASS  {len(clips)} clips, {clips[-1]['end']:.2f} s: re-transcribed dialogue matches the captions word for word")
    else:
        ok = False
        print("FAIL  dialogue and captions differ:")
        print("\n".join(left))
    gaps = silences(prep / "final.wav", MIN_PAUSE + 0.05)
    print(f"PASS  no pause of {MIN_PAUSE} s or more" if not gaps else f"FAIL  pauses of {MIN_PAUSE} s or more end at: {[round(e, 2) for e, _ in gaps]}")
    sys.exit(0 if ok and not gaps else 1)


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("start", "analyze", "window", "cut", "retime", "sync", "assemble", "verify", "export"):
        sys.exit(__doc__)
    command, project = sys.argv[1], (ROOT / sys.argv[2]).resolve()
    aliases = project / "prep" / "aliases.json"
    if aliases.exists():
        ALIASES.update(json.loads(aliases.read_text()))
    if command == "start":
        start(project, [a for a in sys.argv[3:] if not a.startswith("--")])
    elif command == "export":
        export(project)
    elif command == "analyze":
        analyze(project)
    elif command == "window":
        window(project, sys.argv[3], sys.argv[4:])
    elif command == "cut":
        cut(project)
    elif command == "sync":
        sync(project)
    elif command == "retime":
        retime(project)
    elif command == "assemble":
        assemble(project, "--force" in sys.argv)
    else:
        verify(project)
