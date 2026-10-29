"""Extract the length-prefixed name table from a Vegas .cmf scenario file.

Usage:
  python tools/re/cmf_strings.py "<game>/GAMEDATA/Scripts/SCENARIOS/Welcome to The Strip/WelcomeToTheStrip.cmf"

Writes .re-out/cmf-strings.json and prints prefix statistics. The file layout is
proprietary: strings are stored as uint32 length (including NUL) followed by the
NUL-terminated name, interleaved with binary record bytes. This script only
extracts names and their offsets; it does not interpret the binary records yet.
"""
import json
import pathlib
import struct
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / ".re-out"


def extract(data: bytes):
    names = []
    i = 0
    while i + 4 <= len(data):
        length = struct.unpack_from("<I", data, i)[0]
        if 1 <= length <= 128 and i + 4 + length <= len(data):
            chunk = data[i + 4:i + 4 + length]
            if chunk.endswith(b"\0") and all(32 <= c < 127 for c in chunk[:-1]):
                names.append({"offset": i, "length": length, "name": chunk[:-1].decode("ascii")})
                i += 4 + length
                continue
        i += 1
    return names


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    source = pathlib.Path(sys.argv[1])
    data = source.read_bytes()
    names = extract(data)
    OUT.mkdir(exist_ok=True)
    (OUT / "cmf-strings.json").write_text(json.dumps({
        "source": str(source),
        "bytes": len(data),
        "magic": data[:4].hex(),
        "header": data[:17].hex(),
        "count": len(names),
        "names": names,
    }, indent=1), encoding="utf-8")

    prefixes = Counter(entry["name"].split("_")[0] for entry in names)
    binary_gaps = [b["offset"] - a["offset"] for a, b in zip(names, names[1:])]
    print(f"file: {source}")
    print(f"bytes: {len(data)}  strings: {len(names)}")
    print(f"first: {names[0]['name']}")
    print(f"last:  {names[-1]['name']} @ {names[-1]['offset']}")
    print("prefixes:", ", ".join(f"{k}={v}" for k, v in prefixes.most_common(15)))
    print(f"name-to-name distance: min={min(binary_gaps)} max={max(binary_gaps)}")
    print(f"wrote {OUT / 'cmf-strings.json'}")


if __name__ == "__main__":
    main()
