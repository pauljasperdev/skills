#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "mlx-whisper"]
# ///
"""Mechanics for the gemhog-edit-short skill: a hook take, a voiceover, graphic scenes, captions, the call to action.

Run with uv from the workspace root (it installs numpy and mlx-whisper on first use):

    uv run <skill>/scripts/short.py <command> "<folder>" [...]

    start    FOLDER [--take STEM]  project, transcripts, prep/plan.json, drafts of prep/edit.json and prep/captions.txt;
                                   without a take, a placeholder hook; with a take after a placeholder, the take goes in
    assemble FOLDER [--force]      plan.json + edit.json + captions.txt -> index.html, hook, board, call to action, captions, scene stubs
    sync     FOLDER                after clips were trimmed or moved in Studio: scenes, captions, call to action and sfx follow, in place
    sheet    FOLDER [T,T,...]      snapshots (default: hook, every scene just before it leaves, call to action) -> prep/sheet-N.jpg
    export   FOLDER [--draft]      render FOLDER/<name>.mp4 (or prep/draft.mp4) and measure it against the captions

The clock: root seconds = vo_start + (voiceover seconds - vo_in) / rate. Scene cues, sfx and captions are written in
voiceover seconds and mapped through it, so a trim or a new rate moves all of them together.

Without a take the short is built around a placeholder: the voiceover reads its own hook from the start over a dark slot where
the speaker will be, under the hook pills, the Beleg card and captions. plan.json keeps "vo_body", where the voiceover's own text begins, so
the take Paul records later replaces the placeholder however he words it: `start` puts it in, `assemble --force` rebuilds.

The call to action is fixed: templates/outro.html over assets/cta/cta.mp3, appended after the voiceover's last word. A voiceover
that still reads the old call to action („Kauf keine Aktien …") is cut before it.
"""
import difflib
import html
import json
import math
import os
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SKILL = Path(__file__).resolve().parents[1]
MODEL = "mlx-community/whisper-large-v3-mlx"
FPS = 30
RATE = 1.1  # voiceover speed, pitch kept
PRE, POST = 0.12, 0.28  # room kept before the hook's first sound and after its last
GAP = 0.25  # pause between the cut to the board and the voiceover
VO_PRE = 0.07  # room kept before the voiceover's first sound
OUTRO_DUR = 9.0  # the call to action, templates/outro.html
CTA_LEAD, CTA_LEN, CTA_URL = 0.3, 7.706, 5.44  # cta.mp3 (already at 1.1x) starts 0.3 s into the card; „gemhog.de" lands at 5.44 s
CTA_WORDS = ["kauf", "keine", "aktien"]  # how the call to action begins, in voiceovers that still read it
RESERVED = {"main", "root", "voice", "take-01", "backdrop", "hook", "outro", "cta", "captions", "voiceover", "placeholder", "proof"}
SOUNDS = {  # file in <workspace>/media/sound, lead-in to skip, duration, volume
    "pop": ("dragon-studio-pop-402324.mp3", 0.18, 0.35, 0.2),
    "swoosh": ("universfield-fast-swoosh-383967.mp3", 0.07, 0.45, 0.35),
}
HF_ENV = {**os.environ, "HYPERFRAMES_NO_TELEMETRY": "1"}


# --- small helpers -----------------------------------------------------------------
def num(value):
    return f"{value:.6f}".rstrip("0").rstrip(".")


def on_frame(t):
    """Snap to a frame, floored to 6 decimals so the frame at k/30 belongs to the clip starting there."""
    return int(round(t * FPS) / FPS * 1e6 + 1e-9) / 1e6


def attr(value):
    return html.escape(json.dumps(value, separators=(",", ":")), quote=True)


def norm(text):
    return re.sub(r"[^a-zäöüß0-9]", "", text.lower())


def joined(words):
    """The transcriber splits compounds ("KI", "-Agenten"); a label or quote wants them whole."""
    text = ""
    for w in words:
        text += w["word"] if w["word"].startswith("-") and text else (" " if text else "") + w["word"]
    return text


NUMBER_WORDS = {"null": "0", "ein": "1", "eine": "1", "eins": "1", "zwei": "2", "drei": "3", "vier": "4", "fünf": "5", "sechs": "6",
                "sieben": "7", "acht": "8", "neun": "9", "zehn": "10", "elf": "11", "zwölf": "12", "zwanzig": "20", "dreißig": "30",
                "vierzig": "40", "fünfzig": "50", "sechzig": "60", "siebzig": "70", "achtzig": "80", "neunzig": "90", "hundert": "100",
                "prozent": ""}


def spoken_key(word):
    """How a word is compared in the caption check: captions spell numbers as the Skript does, the transcriber writes digits."""
    w = norm(word)
    return NUMBER_WORDS.get(w, w)


def export_name(folder):
    return re.sub(r'[?:*"<>|/\\]', "", folder.name).strip()


def load(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1) + "\n")


def run(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def hyperframes(hf):
    version = re.search(r"hyperframes@([\d.]+)", (hf / "package.json").read_text()).group(1)
    return ["npx", "--yes", f"hyperframes@{version}"]


# --- audio -------------------------------------------------------------------------
def to_wav(src, dst):
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", dst])
    return dst


def read_wav(path):
    with wave.open(str(path)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768, w.getframerate()


def envelope(path):
    """Level in dB over 20 ms windows every 5 ms: the real edges of speech, which the transcriber only guesses."""
    x, sr = read_wav(path)
    hop, win = int(sr * 0.005), int(sr * 0.02)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    i = np.arange(0, len(x) - win, hop)
    return i / sr + win / 2 / sr, 10 * np.log10((c[i + win] - c[i]) / win + 1e-12)


def speech_level(path, a, b):
    t, db = envelope(path)
    loud = db[(t >= a) & (t <= b) & (db > -45)]
    return float(10 * np.log10(np.mean(10 ** (loud / 10)))) if len(loud) else -60.0


def transcribe(wav, fresh=False):
    out = wav.with_suffix(".words.json")
    if out.exists() and not fresh and out.stat().st_mtime >= wav.stat().st_mtime:
        return load(out)
    import mlx_whisper

    result = mlx_whisper.transcribe(str(wav), path_or_hf_repo=MODEL, language="de", word_timestamps=True,
                                    condition_on_previous_text=False, verbose=None)
    words = [{"word": w["word"].strip(), "start": round(float(w["start"]), 3), "end": round(float(w["end"]), 3)}
             for seg in result["segments"] for w in seg["words"] if w["word"].strip()]
    # after a pause the transcriber starts a word where the silence (or the last word's tail) starts; the waveform
    # knows where its sound starts: after the last stretch of at least 150 ms of quiet inside the word's span
    t, db = envelope(wav)
    for w in words:
        span = (t >= w["start"]) & (t <= w["end"] - 0.03)
        ts, quiet = t[span], db[span] < -45
        onset, run = None, 0
        for k in range(len(ts)):
            run = run + 1 if quiet[k] else 0
            if run >= 30 and k + 1 < len(ts) and not quiet[k + 1]:  # 30 hops of 5 ms
                onset = ts[k + 1]
        if onset is not None:
            w["start"] = round(float(onset) - 0.02, 3)
    save(out, words)
    return words


# --- the clock and the layout it gives ----------------------------------------------
def project(arg):
    folder = Path(arg).expanduser().resolve()
    if not folder.is_dir():
        sys.exit(f"no such folder: {folder}")
    return folder, folder / "prep", folder / "hyperframes"


def layout(plan, edit):
    root = lambda vo: plan["vo_start"] + (vo - plan["vo_in"]) / plan["rate"]  # noqa: E731
    outro_at = on_frame(math.ceil((root(plan["vo_end"]) + 0.03) * FPS) / FPS)
    scenes = edit["scenes"]
    if not scenes:
        sys.exit("edit.json has no scenes")
    for s in scenes:
        if not re.fullmatch(r"[a-z][a-z0-9-]*", s["id"]) or s["id"] in RESERVED:
            sys.exit(f'scene id "{s["id"]}": use lowercase letters, digits and "-", and none of {sorted(RESERVED)}')
    if len({s["id"] for s in scenes}) != len(scenes):
        sys.exit("scene ids must be unique")
    starts = [on_frame(plan["hook_dur"])] + [on_frame(root(s["from"])) for s in scenes[1:]]
    ends = starts[1:] + [outro_at]
    slots = []
    for s, a, b in zip(scenes, starts, ends):
        if b - a < 1:
            sys.exit(f'scene "{s["id"]}" would run {b - a:.2f} s: check its "from" and the one after it')
        slots.append({"id": s["id"], "label": s.get("label", s["id"]), "start": a, "dur": round(b - a, 6),
                      "vo0": round(plan["vo_in"] + (a - plan["vo_start"]) * plan["rate"], 6)})
    return {"root": root, "outro_at": outro_at, "total": round((outro_at + OUTRO_DUR) * FPS) / FPS, "scenes": slots}


def sfx_times(plan, edit, lay):
    out = []
    for s in edit.get("sfx", []):
        if s["sound"] not in SOUNDS:
            sys.exit(f'sfx sound "{s["sound"]}": use one of {sorted(SOUNDS)}')
        if s.get("at") == "cut":
            at, label = plan["hook_dur"] - 0.1, "Schnitt zur Tafel"
        elif s.get("at") == "outro":
            at, label = lay["outro_at"] + CTA_URL, "gemhog.de"
        else:
            at, label = lay["root"](s["vo"]), s.get("label", "")
        out.append((s["sound"], round(at, 3), s.get("label", label)))
    return out


# --- captions ------------------------------------------------------------------------
def draft_captions(prep, plan, hook_words, body_words):
    """One phrase per line. Times stay in source seconds: h = hook take, v = voiceover."""
    clean = lambda w: w.rstrip(".,")  # noqa: E731
    tokens = [{"t": w["word"], "c": "h", "s": w["start"], "e": w["end"]} for w in hook_words]
    if tokens:
        tokens[0]["s"], tokens[-1]["e"] = round(plan["hook_in"] + PRE, 2), round(plan["hook_in"] + plan["hook_dur"] - POST, 2)
    for w in body_words:
        text = w["word"]
        if text.startswith("-") and tokens and tokens[-1]["c"] == "v":  # "Neo -Cloud" is one word in two tokens
            text = text[1:]
            tokens[-1]["t"] += "-"
        tokens.append({"t": text, "c": "v", "s": w["start"], "e": w["end"]})
    groups, cur = [], []
    for i, tok in enumerate(tokens):
        cur.append(tok)
        nxt = tokens[i + 1] if i + 1 < len(tokens) else None
        length = sum(len(clean(x["t"])) + 1 for x in cur)
        if nxt is None or nxt["c"] != tok["c"] or (not tok["t"].endswith("-") and (
                tok["t"][-1] in ".,?!" or length + len(nxt["t"]) > 26 or nxt["s"] - tok["e"] > 0.45)):
            groups.append(cur)
            cur = []
    tidy = []
    for g in groups:  # a short last word left alone takes the word before it along
        if tidy and len(g) == 1 and len(clean(g[0]["t"])) <= 5 and len(tidy[-1]) > 1 and tidy[-1][0]["c"] == g[0]["c"]:
            g = [tidy[-1].pop()] + g
        tidy.append(g)
    lines = [" ".join(f'{clean(x["t"])}@{x["c"]}{x["s"]:.2f}' for x in g) + f' | {g[-1]["c"]}{g[-1]["e"] + 0.5:.2f}' for g in tidy]
    (prep / "captions.txt").write_text("\n".join(lines) + "\n")
    return len(lines)


def caption_groups(prep, plan, lay):
    def at(code):
        return float(code[1:]) - plan["hook_in"] if code[0] == "h" else max(plan["vo_start"], lay["root"](float(code[1:])))

    groups = []
    for n, line in enumerate((prep / "captions.txt").read_text().splitlines(), 1):
        if not line.strip():
            continue
        body, _, end = line.partition("|")
        try:
            words = [(w.rsplit("@", 1)[0], w.rsplit("@", 1)[1]) for w in body.split()]
            groups.append({"words": [w for w, _ in words], "w": [round(at(c), 2) for _, c in words], "src": words[0][1][0],
                           "e": round(at(end.strip()), 2) if end.strip() else None})
        except (IndexError, ValueError):
            sys.exit(f"captions.txt line {n}: write word@h1.23 or word@v1.23, and an optional end as | v4.56")
    for i, g in enumerate(groups):
        limit = plan["hook_dur"] if g["src"] == "h" else lay["outro_at"]
        nxt = groups[i + 1]["w"][0] if i + 1 < len(groups) else limit
        g["s"], g["e"] = g["w"][0], round(min(x for x in (g["e"], nxt, limit) if x is not None), 2)
    return groups


def write_captions(prep, hf, plan, lay):
    groups = caption_groups(prep, plan, lay)
    markup = []
    for gi, g in enumerate(groups):
        spans, i = [], 0
        while i < len(g["words"]):
            j = i
            while g["words"][j].endswith("-") and j + 1 < len(g["words"]):
                j += 1
            chunk = "".join(f'<span id="cw-{gi}-{k}" class="cw">{html.escape(g["words"][k])}</span>' for k in range(i, j + 1))
            spans.append(f'<span class="nb">{chunk}</span>' if j > i else chunk)
            i = j + 1
        markup.append(f'          <p id="cg-{gi}" class="cg"><span class="cb">{"".join(spans)}</span></p>')
    data = json.dumps([{"s": g["s"], "e": g["e"], "w": g["w"]} for g in groups], separators=(",", ":"))
    text = (SKILL / "templates" / "captions.html").read_text()
    (hf / "compositions" / "captions.html").write_text(
        text.replace("__TOTAL__", num(lay["total"])).replace("__MARKUP__", "\n".join(markup)).replace("__GROUPS__", data))
    return groups


def vo_clip_dur(folder, plan):
    """The voiceover clip runs to the file's end, or to vo_cut when the file still reads the old call to action."""
    end = plan.get("vo_cut") or float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                                        str(folder / plan["voiceover"])], capture_output=True, text=True).stdout) - 0.01
    return int((end - plan["vo_in"]) / plan["rate"] * 1000) / 1000


# --- files ---------------------------------------------------------------------------
def set_duration(path, comp_id, dur):
    text = path.read_text()
    text, n = re.subn(rf'(data-composition-id="{re.escape(comp_id)}"[^>]*?data-duration=")[^"]*"', rf'\g<1>{num(dur)}"', text, count=1)
    text = re.sub(r"const DUR = [\d.]+;", f"const DUR = {num(dur)};", text)
    if not n:
        sys.exit(f"{path.name}: its root needs data-composition-id=\"{comp_id}\" and a data-duration")
    path.write_text(text)


def write_parts(hf, plan, edit, lay, force):
    """Everything but index.html: scene stubs and clocks, hook, board, card."""
    comps, templates = hf / "compositions", SKILL / "templates"
    comps.mkdir(exist_ok=True)
    stubs = []
    for s in lay["scenes"]:
        path = comps / f'{s["id"]}.html'
        if not path.exists():
            path.write_text((templates / "scene.html").read_text().replace("@@", s["id"]).replace("__VO0__", "0").replace("__RATE__", "1").replace("__DUR__", "1"))
            stubs.append(s["id"])
        text = path.read_text()
        text = re.sub(r"const VO0 = [\d.]+;", f'const VO0 = {num(s["vo0"])};', text)
        text = re.sub(r"const RATE = [\d.]+;", f'const RATE = {num(plan["rate"])};', text)
        # every stroke that draws on needs pathLength="1"
        text = re.sub(r'<(path|rect|circle|ellipse|line|polyline|polygon)\b(?![^>]*pathLength)([^>]*class="ink\b)', r'<\1 pathLength="1"\2', text)
        path.write_text(text)
        set_duration(path, s["id"], s["dur"])
    hook = comps / "hook.html"
    if not hook.exists() or force:
        lines = [line for line in (edit.get("hook") or []) if line.strip()] or [""]
        pills = "\n          ".join(f'<p id="hook-line-{i}">{html.escape(line)}</p>' for i, line in enumerate(lines, 1))
        hook.write_text((templates / "hook.html").read_text().replace("__LINES__", pills).replace("__DUR__", num(plan["hook_dur"])))
    set_duration(hook, "hook", plan["hook_dur"])
    proof = comps / "proof.html"  # written by hand like a scene, so never rebuilt
    if not proof.exists():
        proof.write_text((templates / "proof.html").read_text().replace("__DUR__", num(plan["hook_dur"])))
    set_duration(proof, "proof", plan["hook_dur"])
    if 'id="proof-stub"' in proof.read_text():
        stubs.append("proof")
    parts = [("backdrop", lay["total"] - on_frame(plan["hook_dur"])), ("outro", OUTRO_DUR)]
    if plan.get("placeholder"):
        parts.append(("placeholder", plan["hook_dur"]))
    for name, dur in parts:
        path = comps / f"{name}.html"
        if not path.exists() or force:
            path.write_text((templates / f"{name}.html").read_text().replace("__DUR__", num(dur)))
        set_duration(path, name, dur)
    said = re.search(r"\b(\d+)\s*Sek", " ".join(re.findall(r'<p id="hook-line-\d">([^<]*)</p>', hook.read_text())))
    if said and abs(int(said.group(1)) - lay["outro_at"]) > 1.5:
        print(f'! the hook says {said.group(1)} Sek., the explanation runs {lay["outro_at"]:.1f} s before the call to action: correct the line in compositions/hook.html')
    return stubs


def copy_assets(folder, hf, plan, edit):
    assets = hf / "assets"
    (assets / "playback").mkdir(parents=True, exist_ok=True)
    (assets / "fonts").mkdir(exist_ok=True)
    (assets / "logos").mkdir(exist_ok=True)
    shutil.copy(SKILL / "assets" / "gsap.min.js", assets / "gsap.min.js")
    for font in (SKILL / "assets" / "fonts").iterdir():
        shutil.copy(font, assets / "fonts" / font.name)
    for part in ("brand", "cta"):  # the lockup on the board and the call to action's screens and recording
        shutil.copytree(SKILL / "assets" / part, assets / part, dirs_exist_ok=True)
    if not (hf / "design.md").exists():
        shutil.copy(SKILL / "assets" / "design.md", hf / "design.md")
    voiceover = folder / plan["voiceover"]
    shutil.copy(voiceover, assets / f"voiceover{voiceover.suffix.lower()}")
    for sound in sorted({s["sound"] for s in edit.get("sfx", [])}):
        src = folder.parent / "media" / "sound" / SOUNDS[sound][0]
        if not src.exists():
            sys.exit(f"missing {src}: the {sound} sound comes from the workspace's media/sound folder")
        shutil.copy(src, assets / src.name)
    if plan.get("placeholder"):
        return
    target = assets / "playback" / f'{plan["take"]}.mp4'
    if not target.exists():  # an H.264 copy with a keyframe where the clip starts, so Studio scrubs it cleanly
        run(["ffmpeg", "-v", "error", "-y", "-i", folder / f'{plan["take"]}.mp4', "-c:v", "libx264", "-preset", "medium", "-crf", "17",
             "-pix_fmt", "yuv420p", "-g", "30", "-force_key_frames", f'{plan["hook_in"]:.6f}', "-c:a", "copy", "-movflags", "+faststart", target])


def host_tag(s):
    return (f'      <div id="{s["id"]}" class="clip layer" data-label="{html.escape(s["label"], quote=True)}" data-composition-id="{s["id"]}"'
            f' data-composition-src="compositions/{s["id"]}.html" data-start="{num(s["start"])}" data-duration="{num(s["dur"])}"'
            f' data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1920"></div>')


def sfx_tag(i, sound, at, label):
    file, lead, dur, vol = SOUNDS[sound]
    return (f'      <audio id="sfx-{i:02d}" class="clip" data-label="{sound} · {html.escape(label, quote=True)}" src="assets/{file}" data-start="{at:g}"'
            f' data-duration="{dur}" data-media-start="{lead}" data-track-index="11" data-volume="{vol}"></audio>')


def write_index(folder, hf, plan, edit, lay):
    voice_chain = {"version": 1, "nodes": [
        {"id": "v1", "type": "highpass", "label": "Rumble cut", "params": {"frequency": 80, "q": 0.707, "poles": "2"}},
        {"id": "v3", "type": "gain", "label": "Voice boost", "params": {"gain": 6.5}},
        {"id": "v4", "type": "compressor", "label": "Even out the voice", "params": {"threshold": -26, "ratio": 4, "attack": 1, "release": 150, "knee": 4, "makeup": 11, "mix": 1}},
        # the renderer scales the mix to its loudest peak, so a low, fast ceiling with the gain back after it is what makes it loud;
        # -12/+11 since 2026-10-18: the ElevenLabs voiceovers measured -18.5 LUFS at -6/+5, and short 08 was approved at -12/+11
        {"id": "v5", "type": "limiter", "label": "Peak ceiling", "params": {"limit": -12, "attack": 0.1, "release": 60, "level_out": 0}},
        {"id": "v6", "type": "gain", "label": "Make-up after the ceiling", "params": {"gain": 11}},
    ]}
    hook_chain = {"version": 1, "nodes": [{"id": "h1", "type": "gain", "label": "Match the voiceover", "params": {"gain": plan["hook_gain"]}}]}
    voiceover = folder / plan["voiceover"]
    values = {
        "__TITLE__": html.escape(edit.get("title", folder.name)), "__TOTAL__": num(lay["total"]), "__VOICE_CHAIN__": attr(voice_chain),
        "__TAKE__": plan["take"] or "", "__HOOK_LABEL__": html.escape(plan.get("hook_text", "Hook"), quote=True), "__HOOK_DUR__": num(plan["hook_dur"]),
        "__HOOK_IN__": num(plan["hook_in"]), "__HOOK_CHAIN__": attr(hook_chain), "__BACK_DUR__": num(lay["total"] - on_frame(plan["hook_dur"])),
        "__HOSTS__": "\n".join(host_tag(s) for s in lay["scenes"]), "__OUTRO_AT__": num(lay["outro_at"]), "__OUTRO_DUR__": num(OUTRO_DUR),
        "__CTA_AT__": num(lay["outro_at"] + CTA_LEAD), "__CTA_LEN__": num(CTA_LEN),
        "__VO_FILE__": f"voiceover{voiceover.suffix.lower()}", "__VO_START__": num(plan["vo_start"]),
        "__VO_DUR__": num(vo_clip_dur(folder, plan)), "__VO_IN__": num(plan["vo_in"]), "__RATE__": num(plan["rate"]),
        "__SFX__": "\n".join(sfx_tag(i, *s) for i, s in enumerate(sfx_times(plan, edit, lay), 1)),
    }
    text = (SKILL / "templates" / "index.html").read_text()
    if plan.get("placeholder"):  # the slot the take will fill; it keeps the take's id, so sync reads it the same way
        text = re.sub(r'<video id="take-01"[^\n]*</video>', '<div id="take-01" class="clip layer" data-label="Platzhalter · __HOOK_LABEL__" '
                      'data-composition-id="placeholder" data-composition-src="compositions/placeholder.html" data-start="0" '
                      'data-duration="__HOOK_DUR__" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920"></div>', text)
    for key, value in values.items():
        text = text.replace(key, value)
    (hf / "index.html").write_text(text)


def report(prep, hf, plan, lay, stubs):
    shutil.copy(hf / "index.html", prep / "index.built.html")
    print(f'hook 0-{plan["hook_dur"]:g} s | voiceover from {plan["vo_start"]:g} s (source {plan["vo_in"]:g} s) at {plan["rate"]:g}x | call to action {lay["outro_at"]:.2f} s | total {lay["total"]:.2f} s')
    for s in lay["scenes"]:
        print(f'  {s["id"]:14s} {s["start"]:6.2f}-{s["start"] + s["dur"]:6.2f} s   voiceover {s["vo0"]:6.2f}-{s["vo0"] + s["dur"] * plan["rate"]:6.2f}')
    if stubs:
        print("still to illustrate in compositions/:", ", ".join(stubs) + ("  (proof: the Beleg under the speaker during the hook)" if "proof" in stubs else ""))


# --- commands ------------------------------------------------------------------------
def unstudio(text):
    """index.html as built: Studio stamps a data-hf-id on every element when it opens the project."""
    return re.sub(r'\s+data-hf-id="[^"]*"', "", text)


def start(folder, prep, hf, args):
    prep.mkdir(exist_ok=True)
    audio = sorted(p for p in folder.iterdir() if p.suffix.lower() in (".mp3", ".wav", ".m4a"))
    if len(audio) != 1:
        sys.exit(f"{folder.name} needs exactly one voiceover file (.mp3, .wav or .m4a), found {len(audio)}")
    takes = sorted(p for p in folder.glob("*.mp4") if p.stem != export_name(folder))
    wanted = args[args.index("--take") + 1] if "--take" in args else None
    take = next((p for p in takes if p.stem == wanted), None) if wanted else (takes[0] if takes else None)
    if wanted and take is None:
        sys.exit(f"no take named {wanted} in {folder.name}/ (found: {[p.stem for p in takes]})")
    old = load(prep / "plan.json") if (prep / "plan.json").exists() else None
    swap = take is not None and old is not None and old.get("placeholder")
    if not (hf / "hyperframes.json").exists():
        run(["npx", "--yes", "hyperframes@latest", "init", "hyperframes", "--resolution", "portrait", "--non-interactive", "--skip-transcribe",
             "--skill=general-video"], cwd=folder, env={**HF_ENV, "HYPERFRAMES_SKIP_SKILLS": "1"}, stdout=subprocess.DEVNULL)
    if not (hf / "BRIEF.md").exists():
        (hf / "BRIEF.md").write_text(
            "---\nworkflow: general-video\nflow: automation\nstoryboard: no\naspect: 1080x1920\nlanguage: de\n---\n\n## Intent\n\n"
            f"Gemhog short \"{folder.name}\", edited with the `gemhog-edit-short` skill: the speaker is on screen for the hook, the voiceover "
            "runs over graphic scenes in the gemhog.com look (`design.md`). Reviewed in Studio; export on request.\n")

    vo_wav = to_wav(audio[0], prep / "voiceover.wav")
    vo_words = transcribe(vo_wav)
    if not vo_words:
        sys.exit("the transcriber heard no words in " + audio[0].name)
    if take is None:
        return start_placeholder(folder, prep, audio[0], vo_wav, vo_words, args)
    take_wav = to_wav(take, prep / f"{take.stem}.wav")
    hook_words = transcribe(take_wav)
    if not hook_words:
        sys.exit("the transcriber heard no words in " + take.name)
    # hook: the real edges of its speech, from the waveform
    t, db = envelope(take_wav)
    active = t[(db > -45) & (t > hook_words[0]["start"] - 0.6) & (t < hook_words[-1]["end"] + 0.6)]
    hook_in = max(0.0, round((float(active[0]) - PRE) * FPS) / FPS)
    hook_dur = round((float(active[-1]) + POST - hook_in) * 10) / 10
    # voiceover: it usually says the hook question first; it joins at the first sound after that
    t, db = envelope(vo_wav)
    loud, n = db > -45, len(hook_words)
    said = lambda words: norm(" ".join(w["word"] for w in words))  # noqa: E731
    repeats = difflib.SequenceMatcher(None, said(hook_words), said(vo_words[:n])).ratio() >= 0.7 and len(vo_words) > n
    first = int(np.argmax(loud))
    if swap:  # the voiceover's own hook was the placeholder: it now joins where its text begins, whatever the take says
        repeats = True
        n = sum(1 for w in vo_words if w["end"] <= old["vo_body"])
        first = int(np.searchsorted(t, old["vo_body"] + VO_PRE))
    elif repeats:
        i = int(np.searchsorted(t, vo_words[n - 1]["start"]))
        quiet = next((k for k in range(i, len(loud) - 30) if not loud[k:k + 30].any()), None)  # 0.15 s of silence
        first = quiet + int(np.argmax(loud[quiet:])) if quiet is not None else first
    body = vo_words[n:] if repeats else vo_words
    # the old call to action read at the end of the voiceover: the clip stops before it, the fixed one follows
    said_words = [norm(w["word"]) for w in body]
    cta = next((i for i in range(len(body) - 2, 0, -1) if said_words[i:i + 3] == CTA_WORDS), None)
    vo_end = float(t[len(loud) - 1 - int(np.argmax(loud[::-1]))])
    vo_cut = None
    if cta is not None:
        before = np.nonzero(loud & (t < body[cta]["start"] - 0.05))[0]
        vo_end = float(t[before[-1]]) if len(before) else body[cta - 1]["end"]
        vo_cut = round(min(vo_end + 0.15, body[cta]["start"] - 0.02), 3)
        body = body[:cta]
    plan = {
        "take": take.stem, "voiceover": audio[0].name, "hook_text": joined(hook_words),
        "hook_in": round(hook_in, 6), "hook_dur": hook_dur, "vo_in": round(max(0.0, float(t[first]) - VO_PRE), 3), "vo_start": round(hook_dur + GAP, 3),
        "vo_end": round(vo_end, 2), "vo_cut": vo_cut, "rate": RATE,
        "hook_gain": round(min(12.0, max(0.0, speech_level(vo_wav, float(t[first]), 1e9) - speech_level(take_wav, float(active[0]), float(active[-1])))), 1),
    }
    if swap:
        plan["vo_body"], plan["vo_hook_end"] = old["vo_body"], old.get("vo_hook_end", old["vo_body"])
        save(prep / "plan.json", plan)
        swap_hook_captions(prep, plan, hook_words)
        print(f'the take replaces the placeholder: the voiceover now joins at {plan["vo_in"]:.2f} s; run `assemble --force` to rebuild index.html')
    elif (prep / "plan.json").exists() and "--force" not in args:
        plan = load(prep / "plan.json")
        print("plan.json kept (--force rewrites it)")
    else:
        save(prep / "plan.json", plan)
    sentences, cur = [], []
    for w in body:
        cur.append(w)
        if w["word"][-1:] in ".?!":
            sentences.append(cur)
            cur = []
    if cur:
        sentences.append(cur)
    total = plan["vo_start"] + (plan["vo_end"] - plan["vo_in"]) / plan["rate"]  # the explanation, without the call to action
    if not (prep / "edit.json").exists():
        save(prep / "edit.json", {
            "title": folder.name, "hook": ["HOOK ZEILE 1", f"In {round(total)} Sek. erklärt"],
            "scenes": [{"id": f"s{i:02d}", "label": " ".join(w["word"] for w in s[:4]), "from": s[0]["start"]} for i, s in enumerate(sentences, 1)],
            "sfx": [{"sound": "swoosh", "at": "cut"}, {"sound": "pop", "at": "outro"}]})
    if not (prep / "captions.txt").exists():
        draft_captions(prep, plan, hook_words, body)
    print(f'hook take {take.name}: "{plan["hook_text"]}", source {plan["hook_in"]:.2f}-{plan["hook_in"] + plan["hook_dur"]:.2f} s, +{plan["hook_gain"]} dB to match the voiceover')
    print(f'voiceover {audio[0].name}: ' + ("repeats the hook, joins" if repeats else "does not repeat the hook, starts") + f' at {plan["vo_in"]:.2f} s, last sound {plan["vo_end"]:.2f} s; '
          f'about {total:.0f} s at {plan["rate"]}x, then {OUTRO_DUR:g} s call to action')
    if plan.get("vo_cut"):
        print(f'  it still reads the old call to action: the clip stops at {plan["vo_cut"]:.2f} s, the fixed one follows')
    if wanted is None and len(takes) > 1:
        print(f"! {len(takes)} takes in the folder, used the first; pass --take STEM --force for another")
    print("\nvoiceover sentences (seconds in the voiceover file):")
    for s in sentences:
        print(f'  {s[0]["start"]:6.2f}-{s[-1]["end"]:6.2f}  ' + " ".join(w["word"] for w in s).replace(" -", "-"))
    print(f"\nReady: {prep / 'edit.json'} drafts one scene per sentence. Merge sentences that share a picture, name the scenes, write the hook, "
          "correct prep/captions.txt, then run `assemble`.")


def start_placeholder(folder, prep, audio, vo_wav, vo_words, args):
    """No take yet: the voiceover's first sentence is the hook, read over a dark slot until Paul's take replaces it."""
    n = next((i + 1 for i, w in enumerate(vo_words) if w["word"][-1:] in ".?!"), None)
    if n is None or n >= len(vo_words):
        sys.exit("the voiceover has no first sentence to stand in for the hook")
    t, db = envelope(vo_wav)
    loud = db > -45
    first = int(np.argmax(loud))
    i = int(np.searchsorted(t, vo_words[n - 1]["start"]))
    quiet = next((k for k in range(i, len(loud) - 30) if not loud[k:k + 30].any()), None)  # 0.15 s of silence after the hook
    body_first = quiet + int(np.argmax(loud[quiet:])) if quiet is not None else int(np.searchsorted(t, vo_words[n]["start"]))
    vo_in, vo_body = round(max(0.0, float(t[first]) - VO_PRE), 3), round(max(0.0, float(t[body_first]) - VO_PRE), 3)
    plan = {
        "take": None, "placeholder": True, "voiceover": audio.name, "hook_text": joined(vo_words[:n]),
        "hook_in": 0.0, "hook_dur": round((vo_body - vo_in) / RATE * 10) / 10, "vo_in": vo_in, "vo_start": 0.0, "vo_body": vo_body,
        "vo_hook_end": vo_words[n - 1]["end"],
        "vo_end": round(float(t[len(loud) - 1 - int(np.argmax(loud[::-1]))]), 2), "vo_cut": None, "rate": RATE, "hook_gain": 0.0,
    }
    if (prep / "plan.json").exists() and "--force" not in args:
        plan = load(prep / "plan.json")
        print("plan.json kept (--force rewrites it)")
    else:
        save(prep / "plan.json", plan)
    body = vo_words[n:]
    sentences, cur = [], []
    for w in body:
        cur.append(w)
        if w["word"][-1:] in ".?!":
            sentences.append(cur)
            cur = []
    if cur:
        sentences.append(cur)
    total = plan["vo_start"] + (plan["vo_end"] - plan["vo_in"]) / plan["rate"]
    if not (prep / "edit.json").exists():
        save(prep / "edit.json", {
            "title": folder.name, "hook": ["HOOK ZEILE 1", f"In {round(total)} Sek. erklärt"],
            "scenes": [{"id": f"s{i:02d}", "label": " ".join(w["word"] for w in s[:4]), "from": s[0]["start"]} for i, s in enumerate(sentences, 1)],
            "sfx": [{"sound": "swoosh", "at": "cut"}, {"sound": "pop", "at": "outro"}]})
    if not (prep / "captions.txt").exists():
        draft_captions(prep, plan, [], vo_words)
    print(f'no take: placeholder hook "{plan["hook_text"]}", voiceover {plan["vo_in"]:.2f}-{plan["vo_body"]:.2f} s, the board after {plan["hook_dur"]:g} s')
    print(f'voiceover {audio.name}: its text begins at {plan["vo_body"]:.2f} s, last sound {plan["vo_end"]:.2f} s; '
          f'about {total:.0f} s at {plan["rate"]}x, then {OUTRO_DUR:g} s call to action')
    print("\nvoiceover sentences (seconds in the voiceover file):")
    for s in sentences:
        print(f'  {s[0]["start"]:6.2f}-{s[-1]["end"]:6.2f}  ' + " ".join(w["word"] for w in s).replace(" -", "-"))
    print(f"\nReady: {prep / 'edit.json'} drafts one scene per sentence. Merge sentences that share a picture, name the scenes, write the hook, "
          "correct prep/captions.txt, then run `assemble`.")


def swap_hook_captions(prep, plan, hook_words):
    """The placeholder's caption lines (the voiceover's hook sentence, up to vo_hook_end) give way to the take's words."""
    path = prep / "captions.txt"
    if not path.exists():
        return
    lines = path.read_text().splitlines()
    first_code = lambda line: line.split("|")[0].split()[0].rsplit("@", 1)[1]  # noqa: E731
    keep = [ln for ln in lines if ln.strip() and not (first_code(ln)[0] == "v" and float(first_code(ln)[1:]) < plan["vo_hook_end"])]
    draft_captions(prep, plan, hook_words, [])
    hook_lines = [ln for ln in path.read_text().splitlines() if ln.strip()]
    path.write_text("\n".join(hook_lines + keep) + "\n")


def assemble(folder, prep, hf, args):
    plan, edit, force = load(prep / "plan.json"), load(prep / "edit.json"), "--force" in args
    index, built = hf / "index.html", prep / "index.built.html"
    if index.exists() and 'id="take-01"' in index.read_text() and not force and (not built.exists() or unstudio(built.read_text()) != unstudio(index.read_text())):
        sys.exit("index.html changed since the last build (Studio or by hand). `sync` keeps those edits and moves everything to follow; "
                 "`assemble --force` rebuilds over them.")
    lay = layout(plan, edit)
    copy_assets(folder, hf, plan, edit)
    stubs = write_parts(hf, plan, edit, lay, force=False)
    write_index(folder, hf, plan, edit, lay)
    groups = write_captions(prep, hf, plan, lay)
    report(prep, hf, plan, lay, stubs)
    print(f"captions.html: {len(groups)} phrases")


def sync(folder, prep, hf, args):
    plan, edit = load(prep / "plan.json"), load(prep / "edit.json")
    index = hf / "index.html"
    text = index.read_text()

    def tag(el_id):
        m = re.search(rf'<[a-zA-Z-]+\b[^>]*\bid="{re.escape(el_id)}"[^>]*>', text)
        return m.group(0) if m else None

    def get(el, name, default=None):
        m = re.search(rf'\s{name}="([^"]*)"', el)
        return float(m.group(1)) if m else default

    def put(el_id, **values):
        nonlocal text
        old = new = tag(el_id)
        for name, value in values.items():
            name = name.replace("_", "-")
            new, n = re.subn(rf'(\s{name}=")[^"]*"', rf'\g<1>{value}"', new, count=1)
            new = new if n else new[:-1] + f' {name}="{value}">'
        text = text.replace(old, new)

    take, voice = tag("take-01"), tag("voiceover")
    if not take or not voice:
        sys.exit("index.html has no #take-01 or #voiceover: run `assemble` first")
    was = dict(plan)
    plan.update(hook_dur=get(take, "data-duration"), hook_in=get(take, "data-media-start", 0.0), vo_start=get(voice, "data-start"),
                vo_in=get(voice, "data-media-start", 0.0), rate=get(voice, "data-playback-rate", 1.0))
    save(prep / "plan.json", plan)
    lay = layout(plan, edit)
    put("root", data_duration=num(lay["total"]))
    put("captions", data_duration=num(lay["total"]))
    put("hook", data_duration=num(plan["hook_dur"]))
    if tag("proof"):
        put("proof", data_duration=num(plan["hook_dur"]))
    board = get(tag("backdrop"), "data-start")
    board = on_frame(plan["hook_dur"]) if abs(board - was["hook_dur"]) < 0.01 else board  # the board follows the cut unless it was moved off it
    put("backdrop", data_start=num(board), data_duration=num(round(lay["total"] - board, 6)))  # and always reaches the last frame
    for s in lay["scenes"]:
        if tag(s["id"]):
            put(s["id"], data_start=num(s["start"]), data_duration=num(s["dur"]))
        else:
            text = text.replace(tag("outro"), host_tag(s).strip() + "\n      " + tag("outro"))
    wanted = {s["id"] for s in lay["scenes"]} | {"hook", "proof", "outro", "backdrop", "captions", "take-01"}  # take-01 is the placeholder slot before the take
    for gone in re.findall(r'\n[ \t]*<div id="([^"]+)" class="clip layer"[^>]*data-composition-src="[^"]*"[^>]*></div>', text):
        if gone not in wanted:  # a scene taken out of edit.json; its file stays in compositions/
            text = re.sub(rf'\n[ \t]*<div id="{re.escape(gone)}" class="clip layer"[^>]*></div>', "", text, count=1)
    put("outro", data_start=num(lay["outro_at"]))
    if tag("cta"):
        put("cta", data_start=num(lay["outro_at"] + CTA_LEAD))
    if abs(was["rate"] - plan["rate"]) > 1e-6 or abs(was["vo_in"] - plan["vo_in"]) > 1e-6:  # the clip still ends where the voiceover's own text ends
        put("voiceover", data_duration=num(vo_clip_dur(folder, plan)))
    # sound effects follow edit.json: existing clips keep their other attributes, new ones are added, dropped ones go
    sounds = sfx_times(plan, edit, lay)
    for i, (sound, at, label) in enumerate(sounds, 1):
        old = tag(f"sfx-{i:02d}")
        if old and f"assets/{SOUNDS[sound][0]}" in old:
            put(f"sfx-{i:02d}", data_start=f"{at:g}", data_duration=SOUNDS[sound][2], data_media_start=SOUNDS[sound][1],
                data_label=html.escape(f"{sound} · {label}", quote=True))  # the volume stays as set in Studio
        elif old:  # another sound took this place in the list
            text = text.replace(old, sfx_tag(i, sound, at, label).strip()[:-len("</audio>")])
        else:
            last = tag(f"sfx-{i - 1:02d}") if i > 1 else tag("voiceover")
            end = text.index(last) + len(last) + len("</audio>")
            text = text[:end] + "\n" + sfx_tag(i, sound, at, label) + text[end:]
    text = re.sub(r'\n[ \t]*<audio id="sfx-(\d+)"[^>]*></audio>', lambda m: m.group(0) if int(m.group(1)) <= len(sounds) else "", text)
    copy_assets(folder, hf, plan, edit)
    index.write_text(text)
    stubs = write_parts(hf, plan, edit, lay, force=False)
    write_captions(prep, hf, plan, lay)
    changed = [f"{k} {was[k]:g} -> {plan[k]:g}" for k in ("hook_dur", "hook_in", "vo_start", "vo_in", "rate") if abs(was[k] - plan[k]) > 1e-6]
    print("clips in index.html:", ", ".join(changed) if changed else "unchanged")
    report(prep, hf, plan, lay, stubs)


def sheet(folder, prep, hf, args):
    plan, edit = load(prep / "plan.json"), load(prep / "edit.json")
    lay = layout(plan, edit)
    times = [float(x) for x in args[0].split(",")] if args and not args[0].startswith("-") else (
        [min(1.0, plan["hook_dur"] / 2)] + [round(s["start"] + s["dur"] - 0.45, 2) for s in lay["scenes"]] + [round(lay["outro_at"] + 2.0, 2), round(lay["outro_at"] + 6.0, 2)])
    snaps = prep / "snaps"
    shutil.rmtree(snaps, ignore_errors=True)
    for old in prep.glob("sheet-*.jpg"):
        old.unlink()
    run(hyperframes(hf) + ["snapshot", "--at", ",".join(f"{t:g}" for t in times), "--no-end", "--describe", "false", "-o", snaps],
        cwd=hf, env=HF_ENV, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    run(["ffmpeg", "-v", "error", "-y", "-pattern_type", "glob", "-i", "frame-*.png", "-vf", "scale=540:-1,tile=3x2", "-q:v", "3", "../sheet-%d.jpg"], cwd=snaps)
    for i, path in enumerate(sorted(prep.glob("sheet-*.jpg"))):
        print(path, " <- ", ", ".join(f"{t:g} s" for t in times[i * 6:i * 6 + 6]))


def export(folder, prep, hf, args):
    plan, edit = load(prep / "plan.json"), load(prep / "edit.json")
    lay, draft = layout(plan, edit), "--draft" in args
    out = prep / "draft.mp4" if draft else folder / f"{export_name(folder)}.mp4"
    run(hyperframes(hf) + ["render", "--quality", "draft" if draft else "looks", "--skill=general-video", "--quiet", "--output", out],
        cwd=hf, env=HF_ENV, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    total = float(re.search(r'data-composition-id="main"[^>]*data-duration="([^"]*)"', (hf / "index.html").read_text()).group(1))
    got = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)], capture_output=True, text=True).stdout)
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(out), "-vf", "blackdetect=d=0.02:pix_th=0.08,signalstats,metadata=print:key=lavfi.signalstats.YAVG",
                            "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    luma = [float(x) for x in re.findall(r"signalstats\.YAVG=([\d.]+)", probe)][int((plan["hook_dur"] + 0.1) * FPS):int(lay["outro_at"] * FPS)]  # the teal card is darker on purpose
    dark, black = sum(y < 150 for y in luma), probe.count("black_start")
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", probe)[-1])
    ok = lambda good: "PASS" if good else "FAIL"  # noqa: E731
    print(f"{out}  {out.stat().st_size / 1e6:.0f} MB")
    print(f"{ok(abs(got - total) < 0.05)}  length {got:.2f} s (index.html says {total:.2f} s)")
    print(f"{ok(black == 0 and dark == 0)}  {black} black frame(s), {dark} frame(s) after the cut darker than the paper board"
          + ("" if dark == 0 else ": a clip ends before the video does, usually #backdrop; `sync` extends it"))
    print(f"{ok(-17.5 <= lufs <= -14.5)}  loudness {lufs:.1f} LUFS (aim for -16 to -15; the renderer scales the mix to its loudest peak, so when it is quiet "
          "lower the limiter's `limit` on the voice bus and raise the gain after it by the same amount, then measure again)")
    # what the render says against what the captions show: an audio check, not listening
    wav = prep / ("draft.wav" if draft else "export.wav")
    run(["ffmpeg", "-v", "error", "-y", "-i", out, "-ac", "1", "-ar", "16000", wav])
    heard = [(spoken_key(w["word"]), w["start"]) for w in transcribe(wav, fresh=True) if spoken_key(w["word"])]
    cta = next((i for i in range(len(heard) - 1) if heard[i][0].startswith("kauf") and heard[i + 1][0] == "keine"
                and heard[i][1] > lay["outro_at"] - 2), None)
    heard = [h for h in heard[:cta] if h[1] < lay["outro_at"] + CTA_LEAD]  # the call to action has no captions
    wav.unlink()
    shown = [(spoken_key(w), t) for g in caption_groups(prep, plan, lay) for w, t in zip(g["words"], g["w"]) if spoken_key(w)]
    h, c = "".join(w for w, _ in heard), "".join(w for w, _ in shown)
    match = difflib.SequenceMatcher(None, h, c, autojunk=False)
    print(f"{ok(match.ratio() >= 0.97)}  captions against the transcript of the render: {match.ratio():.3f}")
    for op, a, b, x, y in match.get_opcodes():
        if op != "equal":
            print(f'      heard "…{h[max(0, a - 10):b + 10]}…"  captions "…{c[max(0, x - 10):y + 10]}…"')
    offs = np.array([heard[a + i][1] - shown[x + i][1] for op, a, b, x, y in difflib.SequenceMatcher(None, [w for w, _ in heard], [w for w, _ in shown], autojunk=False).get_opcodes()
                     if op == "equal" for i in range(b - a) if shown[x + i][1] > plan["vo_start"] + 0.3])
    if len(offs):
        med, lo, hi = np.median(offs) * 1000, np.percentile(offs, 5) * 1000, np.percentile(offs, 95) * 1000
        # the transcriber of the render starts a word after a pause up to half a second early, so "heard" before "shown" is
        # allowed that far; captions ahead of the sound are not, and the median shows a voiceover clip that moved
        print(f"{ok(abs(med) <= 80 and lo >= -500 and hi <= 200)}  caption timing over {len(offs)} voiceover words: heard minus shown, median {med:+.0f} ms, 5% {lo:+.0f}, 95% {hi:+.0f}"
              + ("" if abs(med) <= 80 else ": the voiceover clip moved; run `sync`"))


COMMANDS = {"start": start, "assemble": assemble, "sync": sync, "sheet": sheet, "export": export}

if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in COMMANDS:
        sys.exit(__doc__)
    args = sys.argv[2:]
    at = next((i for i, a in enumerate(args) if not a.startswith("--") and not (i and args[i - 1] == "--take")), None)
    if at is None:
        sys.exit(__doc__)
    COMMANDS[sys.argv[1]](*project(args[at]), args[:at] + args[at + 1:])
