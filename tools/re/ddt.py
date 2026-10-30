"""Decode Vegas .ddt textures (DXT5) to PNG.

Usage:
  python tools/re/ddt.py "<texture.ddt>" [out.png]
  python tools/re/ddt.py --scan "<GameData/GAMEART/DDT Files>"

Verified layout: a 312-byte header followed by a DXT5 mip chain.
The largest mip starts at byte 312; alpha is premultiplied onto RGB for preview.
"""
import pathlib
import struct
import sys
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / ".re-out"


def rgb565(value: int):
    return (((value >> 11) & 31) * 255 // 31,
            ((value >> 5) & 63) * 255 // 63,
            (value & 31) * 255 // 31)


def chain_size(width: int, height: int, mips: int, block_bytes: int = 16) -> int:
    total = 0
    w, h = width, height
    for _ in range(max(1, mips)):
        total += max(1, (w + 3) // 4) * max(1, (h + 3) // 4) * block_bytes
        w, h = max(1, w // 2), max(1, h // 2)
    return total


def decode_dxt5(data: bytes, offset: int, width: int, height: int):
    pixels = [(0, 0, 0)] * (width * height)
    bw, bh = (width + 3) // 4, (height + 3) // 4
    for by in range(bh):
        for bx in range(bw):
            p = offset + (by * bw + bx) * 16
            if p + 16 > len(data):
                return None
            a0, a1 = data[p], data[p + 1]
            abits = int.from_bytes(data[p + 2:p + 8], "little")
            alphas = [a0, a1]
            if a0 > a1:
                alphas += [((7 - i) * a0 + (i + 1) * a1) // 7 for i in range(6)]
            else:
                alphas += [((5 - i) * a0 + (i + 1) * a1) // 5 for i in range(4)] + [0, 255]
            c0, c1 = struct.unpack_from("<HH", data, p + 8)
            bits = struct.unpack_from("<I", data, p + 12)[0]
            r0, g0, b0 = rgb565(c0)
            r1, g1, b1 = rgb565(c1)
            colours = [(r0, g0, b0), (r1, g1, b1)]
            if c0 > c1:
                colours += [((2 * r0 + r1) // 3, (2 * g0 + g1) // 3, (2 * b0 + b1) // 3),
                            ((r0 + 2 * r1) // 3, (g0 + 2 * g1) // 3, (b0 + 2 * b1) // 3)]
            else:
                colours += [((r0 + r1) // 2, (g0 + g1) // 2, (b0 + b1) // 2), (0, 0, 0)]
            for y in range(4):
                for x in range(4):
                    gx, gy = bx * 4 + x, by * 4 + y
                    if gx >= width or gy >= height:
                        continue
                    i = y * 4 + x
                    r, g, b = colours[(bits >> (2 * i)) & 3]
                    a = alphas[(abits >> (3 * i)) & 7]
                    pixels[gy * width + gx] = (r * a // 255, g * a // 255, b * a // 255)
    return [c for pixel in pixels for c in pixel]


def write_png(path: pathlib.Path, width: int, height: int, pixels):
    values = [min(255, max(0, int(v))) for v in pixels[:width * height * 3]]
    raw = b"".join(b"\0" + bytes(values[y * width * 3:(y + 1) * width * 3]) for y in range(height))

    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xffffffff)

    path.write_bytes(b"\x89PNG\r\n\x1a\n" +
                     chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) +
                     chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def header_info(data: bytes):
    version, unknown, mips, format_id, kind, width, height = struct.unpack_from("<IIIIIII", data, 0)
    return {"version": version, "unknown": unknown, "mips": mips, "formatId": format_id,
            "kind": kind, "width": width, "height": height}


def decode_file(path: pathlib.Path, target: pathlib.Path | None = None):
    data = path.read_bytes()
    info = header_info(data)
    offset = 312  # verified DDT v1 header size (independent of dimensions for tested files)
    pixels = decode_dxt5(data, offset, info["width"], info["height"])
    if pixels is None:
        raise ValueError("payload shorter than the declared dimensions")
    if target is None:
        OUT.mkdir(exist_ok=True)
        target = OUT / (path.stem + ".png")
    write_png(target, info["width"], info["height"], pixels)
    return info, offset, target


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        raise SystemExit(1)
    if args[0] == "--scan":
        root = pathlib.Path(args[1])
        files = sorted(root.rglob("*.ddt"))
        ok = 0
        for file in files:
            try:
                info, offset, _ = decode_file(file)
                ok += 1
                if ok <= 5:
                    print(f"{file.name}: {info['width']}x{info['height']} mips={info['mips']} offset={offset}")
            except Exception as error:
                print(f"FAIL {file.name}: {error}")
        print(f"decoded {ok}/{len(files)}")
        return
    info, offset, target = decode_file(pathlib.Path(args[0]), pathlib.Path(args[1]) if len(args) > 1 else None)
    print(f"{info['width']}x{info['height']} mips={info['mips']} dataOffset={offset} -> {target}")


if __name__ == "__main__":
    main()
