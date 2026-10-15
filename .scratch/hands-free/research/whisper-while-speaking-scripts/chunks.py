"""Does transcribing a 76 s Spanish Utterance in pieces (as it is spoken) hurt accuracy?

Compares word error rate (vs the text Kokoro was given) for:
  full        one request for the whole Utterance (the baseline)
  fixed5      blind 5 s chunks, words get cut at the edges
  fixed10     blind 10 s chunks
  fixed10+p   blind 10 s chunks, previous chunk's text passed as `prompt`
  pause+p     chunks cut in the pauses between sentences (what a VAD would give), with `prompt`
Each run shifts the whole audio by a random 0-300 ms so no request hits Nan's cache.

Usage: python3 -I chunks.py AUDIO_DIR
"""
import json
import random
import re
import subprocess
import sys
import time
import unicodedata

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import nan  # noqa: E402

D = sys.argv[1]
GAP = 6.5
PARAS = json.load(open(f"{D}/PARAS.json"))
REF = " ".join(PARAS)


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout)


TOTAL = dur(f"{D}/long.wav")
pauses, t = [], 0.0
for i in range(len(PARAS)):
    t += dur(f"{D}/p{i}.wav")
    pauses.append(t + 0.2)  # middle of the 0.4 s gap
    t += 0.4


def norm(s):
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.findall(r"[a-z0-9]+", s)


def wer(hyp, ref=REF):
    h, r = norm(hyp), norm(ref)
    prev = list(range(len(h) + 1))
    for i, rw in enumerate(r, 1):
        cur = [i]
        for j, hw in enumerate(h, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (rw != hw)))
        prev = cur
    return prev[-1] / len(r)


def transcribe(start, end, prompt=None):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", f"{D}/long.wav", "-c:a", "libopus", "-b:a", "32k", f"{D}/chunk.webm"], check=True)
    fields = {"model": "whisper", "language": "es"}
    if prompt:
        fields["prompt"] = prompt[-400:]
    body, ctype = nan.multipart(fields, {"file": ("a.webm", open(f"{D}/chunk.webm", "rb").read(), "audio/webm")})
    t0 = time.time()
    s, h, b = nan.req("/audio/transcriptions", body, {"Content-Type": ctype})
    dt = time.time() - t0
    time.sleep(GAP)
    if s != 200:
        print("HTTP", s, b[:200])
        return "", dt
    return json.loads(b)["text"].strip(), dt


def run(name, cuts, use_prompt):
    shift = random.uniform(0, 0.3)
    edges = [0.0] + [min(c, TOTAL) for c in cuts if c < TOTAL - 0.5] + [TOTAL]
    texts, times = [], []
    for a, b in zip(edges, edges[1:]):
        text, dt = transcribe(max(0, a - shift), b - shift if b < TOTAL else TOTAL, " ".join(texts) if use_prompt else None)
        texts.append(text)
        times.append(dt)
    joined = " ".join(texts)
    print(f"\n## {name}: {len(texts)} requests, WER {wer(joined):.1%}, last chunk {edges[-1]-edges[-2]:.1f}s took {times[-1]:.2f}s, mean {sum(times)/len(times):.2f}s")
    for t in texts:
        print("  |", t)
    return joined


print(f"audio {TOTAL:.1f}s, pauses at {[round(p, 1) for p in pauses]}")
run("full", [], False)
run("fixed5", [5 * k for k in range(1, 16)], False)
run("fixed10", [10 * k for k in range(1, 8)], False)
run("fixed10+p", [10 * k for k in range(1, 8)], True)
run("pause+p", pauses[:-1], True)
run("pause", pauses[:-1], False)
