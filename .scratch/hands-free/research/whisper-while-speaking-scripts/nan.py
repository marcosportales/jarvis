"""Shared helper: reads NAN_API_KEY from the main checkout's apps/web/.env.local (never printed)."""
import json
import os
import urllib.request

ENV = "/home/marcosportales/Devs/my-new-assistant/apps/web/.env.local"
BASE = "https://api.nan.builders/v1"


def key():
    if os.environ.get("NAN_API_KEY"):
        return os.environ["NAN_API_KEY"]
    for line in open(ENV):
        if line.startswith("NAN_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("NAN_API_KEY not found")


def req(path, data=None, headers=None, method=None):
    h = {"Authorization": f"Bearer {key()}", "User-Agent": "curl/8.10.1"}
    h.update(headers or {})
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=300) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def multipart(fields, files):
    boundary = "----nanbench" + os.urandom(8).hex()
    out = b""
    for k, v in fields.items():
        out += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    for k, (name, data, ctype) in files.items():
        out += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{name}\"\r\nContent-Type: {ctype}\r\n\r\n".encode() + data + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return out, f"multipart/form-data; boundary={boundary}"


if __name__ == "__main__":
    s, h, b = req("/models")
    print(s)
    print(json.dumps(json.loads(b), indent=1))
