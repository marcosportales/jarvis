"""Side check: does `prompt: "Jarvis"` stop Whisper hearing "Harviss"/"Harveys"? (4 runs, random offsets)

Usage: python3 -I prompt_name.py AUDIO_DIR
"""
import random
import subprocess
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import nan  # noqa: E402

D = sys.argv[1]
for i in range(4):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{random.uniform(0, 0.3):.3f}", "-t", "4", "-i", f"{D}/long.wav", "-c:a", "libopus", "-b:a", "32k", f"{D}/name.webm"], check=True)
    body, ctype = nan.multipart({"model": "whisper", "language": "es", "prompt": "Jarvis"}, {"file": ("a.webm", open(f"{D}/name.webm", "rb").read(), "audio/webm")})
    s, h, b = nan.req("/audio/transcriptions", body, {"Content-Type": ctype})
    print(s, b[:90].decode(errors="replace"))
    time.sleep(6.5)
