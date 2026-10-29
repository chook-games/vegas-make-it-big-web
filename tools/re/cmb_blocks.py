"""Split a Vegas .cmb city file into its named GameMap blocks.

Usage:
  python tools/re/cmb_blocks.py "<game>/.../Welcome to The Strip/WelcomeToTheStrip.cmb"
  python tools/re/cmb_blocks.py <file.cmb> --render 0 48 24 4 0

Findings so far (see docs/reverse-engineering.md):
  [u32 ?][NUL-terminated name][u32 a][u32 b][f32 scale][u32 width][u32 height][payload]
The payload size varies per block; its exact encoding is still being reversed.
The optional --render writes a debug grayscale PNG of payload bytes interpreted
as width*height cells with the given stride and byte offset.
"""
import json
import pathlib
import re
import struct
import sys
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / ".re-out"


def write_png(path: pathlib.Path, width: int, height: int, pixels: list[int]):
    raw = b"".join(b"\0" + bytes(pixels[y * width * 3:(y + 1) * width * 3]) for y in range(height))

    def chunk(tag: bytes, data: bytes):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    path.write_bytes(b"\x89PNG\r\n\x1a\n" +
                     chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) +
                     chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def find_blocks(data: bytes):
    blocks = []
    for match in re.finditer(rb"[A-Za-z0-9_]+_\d+\0", data):
        start = match.start()
        if start < 4:
            continue
        name = match.group()[:-1].decode("ascii")
        header_start = match.end()
        if header_start + 18 > len(data):
            continue
        a, b, scale, width, height = struct.unpack_from("<IHfII", data, header_start)
        blocks.append({
            "name": name,
            "offset": start - 4,
            "prefix": struct.unpack_from("<I", data, start - 4)[0],
            "header_offset": header_start,
            "a": a, "b": b, "scale": scale, "width": width, "height": height,
        })
    for index, block in enumerate(blocks):
        end = blocks[index + 1]["offset"] if index + 1 < len(blocks) else len(data)
        block["payload_offset"] = block["header_offset"] + 18
        block["payload_size"] = end - block["payload_offset"]
    return blocks


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    source = pathlib.Path(sys.argv[1])
    data = source.read_bytes()
    blocks = find_blocks(data)
    OUT.mkdir(exist_ok=True)
    (OUT / "cmb-blocks.json").write_text(json.dumps({
        "source": str(source), "bytes": len(data), "blocks": blocks,
    }, indent=1), encoding="utf-8")
    print(f"file: {source}  blocks: {len(blocks)}")
    for block in blocks[:12]:
        print(f"  {block['name']:12s} prefix={block['prefix']:4d} a={block['a']:12d} "
              f"b={block['b']:4d} scale={block['scale']:.3f} dims={block['width']}x{block['height']} "
              f"payload={block['payload_size']}")

    if "--render" in sys.argv:
        index = int(sys.argv[sys.argv.index("--render") + 1])
        width = int(sys.argv[sys.argv.index("--render") + 2])
        height = int(sys.argv[sys.argv.index("--render") + 3])
        stride = int(sys.argv[sys.argv.index("--render") + 4])
        offset = int(sys.argv[sys.argv.index("--render") + 5])
        block = blocks[index]
        payload = data[block["payload_offset"]:block["payload_offset"] + block["payload_size"]]
        pixels = []
        for cell in range(width * height):
            start = cell * stride + offset
            pixels.extend([payload[start] if start < len(payload) else 0] * 3)
        target = OUT / f"{block['name']}_{width}x{height}_s{stride}_o{offset}.png"
        write_png(target, width, height, pixels)
        print(f"wrote {target}")


if __name__ == "__main__":
    main()
