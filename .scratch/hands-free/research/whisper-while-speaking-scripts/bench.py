"""How does Whisper-on-Nan latency grow with audio length, and does the upload format matter?

Every timed request is unique: each clip starts at a random offset (0-300 ms) into the source,
so Nan's identical-request cache cannot answer it. One deliberate repeat at the end shows the cache.

Usage: python3 -I bench.py AUDIO_DIR > results.tsv
"""
import random
import subprocess
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import nan  # noqa: E402

D = sys.argv[1]
LENGTHS = [2, 5, 10, 20, 40, 60, 75]
FORMATS = {"webm": (["-c:a", "libopus", "-b:a", "32k"], "audio/webm"), "wav": ([], "audio/wav")}
GAP = 6.5  # Whisper is limited to 10 req/min per key


def clip(start, dur, ext):
    out = f"{D}/bench.{ext}"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{start:.3f}", "-t", str(dur), "-i", f"{D}/long.wav", *FORMATS[ext][0], out], check=True)
    return open(out, "rb").read()


def run(audio, ext):
    body, ctype = nan.multipart({"model": "whisper", "language": "es"}, {"file": (f"a.{ext}", audio, FORMATS[ext][1])})
    t = time.time()
    s, h, b = nan.req("/audio/transcriptions", body, {"Content-Type": ctype})
    return s, time.time() - t, b


print("rep\tseconds\tformat\tbytes\thttp\tlatency_s\trtf\ttext")
last = None
for rep in range(2):
    for L in LENGTHS:
        for ext in FORMATS:
            a = clip(random.uniform(0, 0.3), L, ext)
            s, dt, b = run(a, ext)
            last = (a, ext)
            print(f"{rep}\t{L}\t{ext}\t{len(a)}\t{s}\t{dt:.2f}\t{dt/L:.3f}\t{b[:120].decode(errors='replace')}", flush=True)
            time.sleep(GAP)

# Cache check: send the last request again, byte for byte.
s, dt, b = run(*last)
print(f"cache-repeat\t{LENGTHS[-1]}\t{last[1]}\t{len(last[0])}\t{s}\t{dt:.2f}\t{dt/LENGTHS[-1]:.3f}\tidentical repeat", flush=True)
