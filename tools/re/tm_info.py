"""Inspect a Vegas .tm model scene (header, strings, float runs).

Usage:
  python tools/re/tm_info.py "<model.tm>" [more.tm ...]

Writes .re-out/tm-info.json and prints structure clues. TM files share the
engine's scene container: a 96-byte header with a 4x4 matrix, length-prefixed
strings (material DDT paths, node names such as SceneRoot), and binary mesh
data. The geometry encoding is not decoded yet.
"""
import json
import math
import pathlib
import re
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / ".re-out"


def read_strings(data: bytes):
    strings = []
    i = 0
    while i + 4 <= len(data):
        length = struct.unpack_from("<I", data, i)[0]
        if 1 <= length <= 260 and i + 4 + length <= len(data):
            chunk = data[i + 4:i + 4 + length]
            if chunk.endswith(b"\0") and all(32 <= c < 127 for c in chunk[:-1]):
                strings.append({"offset": i, "length": length, "text": chunk[:-1].decode("ascii")})
                i += 4 + length
                continue
        i += 1
    return strings


def float_runs(data: bytes, minimum: int = 8):
    runs = []

    def plausible(value: float) -> bool:
        return math.isfinite(value) and 1e-6 < abs(value) < 10000

    i = 0
    while i + 4 <= len(data):
        if plausible(struct.unpack_from("<f", data, i)[0]):
            j, count = i, 0
            while j + 4 <= len(data) and plausible(struct.unpack_from("<f", data, j)[0]):
                count += 1
                j += 4
            if count >= minimum:
                runs.append({"offset": i, "count": count,
                             "first": [round(struct.unpack_from("<f", data, i + 4 * k)[0], 3)
                                       for k in range(min(12, count))]})
            i = j
        else:
            i += 4
    return runs


def inspect(path: pathlib.Path):
    data = path.read_bytes()
    matrix = [round(struct.unpack_from("<f", data, 24 + 4 * k)[0], 3) for k in range(16)]
    return {
        "file": str(path), "bytes": len(data), "header": data[:16].hex(),
        "matrix": matrix,
        "strings": read_strings(data),
        "floatRuns": float_runs(data),
    }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    results = []
    for raw in sys.argv[1:]:
        info = inspect(pathlib.Path(raw))
        results.append(info)
        ddt = [s["text"] for s in info["strings"] if s["text"].upper().endswith(".DDT")]
        nodes = [s["text"] for s in info["strings"] if not s["text"].upper().endswith(".DDT")][-8:]
        print(f"\n{pathlib.Path(raw).name}: {info['bytes']} bytes")
        print("  matrix:", info["matrix"])
        print(f"  strings={len(info['strings'])} ddt={len(ddt)} floatRuns={len(info['floatRuns'])}")
        print("  materials:", ", ".join(pathlib.Path(p).name for p in ddt[:6]))
        print("  nodes:", ", ".join(nodes))
        for run in info["floatRuns"][:3]:
            print(f"  floats @{run['offset']} n={run['count']} {run['first'][:6]}")
    OUT.mkdir(exist_ok=True)
    (OUT / "tm-info.json").write_text(json.dumps(results, indent=1), encoding="utf-8")
    print(f"\nwrote {OUT / 'tm-info.json'}")


if __name__ == "__main__":
    main()
