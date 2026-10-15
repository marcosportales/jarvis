"""Probe Nan for streaming / realtime transcription.

Usage: python3 -I probe.py AUDIO_DIR
Respects Whisper's 10 req/min by sleeping between calls.
"""
import asyncio
import json
import subprocess
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import nan  # noqa: E402

D = sys.argv[1]


def clip(start, dur, ext="webm"):
    out = f"{D}/probe-{start}-{dur}.{ext}"
    codec = ["-c:a", "libopus", "-b:a", "32k"] if ext in ("webm", "ogg") else []
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(start), "-t", str(dur), "-i", f"{D}/long.wav", *codec, out], check=True)
    return open(out, "rb").read()


def transcribe(audio, name, fields):
    body, ctype = nan.multipart({"model": "whisper", "language": "es", **fields}, {"file": (name, audio, "audio/webm")})
    t = time.time()
    s, h, b = nan.req("/audio/transcriptions", body, {"Content-Type": ctype})
    return s, h.get("Content-Type"), time.time() - t, b


def show(label, r):
    s, ct, dt, b = r
    print(f"\n## {label}: HTTP {s} {ct} {dt:.2f}s")
    print(b[:1500].decode(errors="replace"))


a = clip(0.13, 6.1)
show("stream=true", transcribe(a, "a.webm", {"stream": "true"}))
time.sleep(7)
a = clip(0.17, 6.2)
show("verbose_json + word timestamps", transcribe(a, "a.webm", {"response_format": "verbose_json", "timestamp_granularities[]": "word"}))
time.sleep(7)

for path, method in [("/realtime", "GET"), ("/realtime/sessions", "POST"), ("/realtime/transcription_sessions", "POST"), ("/realtime/client_secrets", "POST")]:
    data = json.dumps({"model": "whisper"}).encode() if method == "POST" else None
    s, h, b = nan.req(path, data, {"Content-Type": "application/json"}, method)
    print(f"\n## {method} {path}: HTTP {s} {h.get('Content-Type')}\n{b[:400].decode(errors='replace')}")


async def ws():
    import websockets
    for q in ["?model=whisper", "?intent=transcription"]:
        url = "wss://api.nan.builders/v1/realtime" + q
        try:
            async with websockets.connect(url, additional_headers={"Authorization": f"Bearer {nan.key()}", "OpenAI-Beta": "realtime=v1", "User-Agent": "curl/8.10.1"}, open_timeout=10) as c:
                msg = await asyncio.wait_for(c.recv(), 5)
                print(f"\n## WS {q}: connected, first message: {str(msg)[:300]}")
        except Exception as e:
            print(f"\n## WS {q}: {type(e).__name__}: {str(e)[:300]}")


asyncio.run(ws())
