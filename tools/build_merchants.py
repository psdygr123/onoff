#!/usr/bin/env python3
"""포르투 노바 상인 NPC 2명(잡화상인·무기상인) 그림 변환 도구.
사용: python3 tools/build_merchants.py <Autelia_Porto_Merchants 폴더> games/autelia/assets
 - 전신(porto_*.png, 마젠타 배경) → char/porto_*.webp : 마젠타 제거, 220×330 캔버스(발 아래 맞춤, 가로 가운데). 기존 NPC 그림과 같은 규격.
 - 초상화(pt_porto_*.png) → portrait/porto_*.webp : 마젠타 제거 후 기존 초상화와 같은 베이지 바탕에 얹어 512×600(위쪽 기준, 좌우 가운데 자름).
"""
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_prologue_art as B
SRC, OUT = sys.argv[1], sys.argv[2]
NAMES = ["porto_general", "porto_smith"]

def bg_color():
    im = np.array(Image.open(f"{OUT}/portrait/smith.webp").convert("RGB")); return tuple(int(v) for v in np.median(im[:20, :20].reshape(-1, 3), axis=0))

def body(name):
    a = B.key_magenta(f"{SRC}/{name}.png"); x0, y0, x1, y1 = B.bbox(a); c = a[y0:y1, x0:x1]
    k = 330 / c.shape[0]; w = max(1, round(c.shape[1] * k)); sc = k
    if w > 220: sc = 220 / c.shape[1]; w = 220
    h = max(1, round(c.shape[0] * sc)); r = np.array(Image.fromarray(c, "RGBA").resize((w, h), Image.LANCZOS))
    canvas = np.zeros((330, 220, 4), np.uint8); ox = (220 - w) // 2; canvas[330 - h:, ox:ox + w] = r
    B.save_rgba(canvas, f"{OUT}/char/{name}.webp"); print("char", name, "scale", round(sc, 3), "size", w, h)

def face(name, bg):
    a = B.key_magenta(f"{SRC}/pt_{name}.png"); x0, y0, x1, y1 = B.bbox(a)
    im = Image.fromarray(a, "RGBA"); base = Image.new("RGBA", im.size, bg + (255,)); base.alpha_composite(im)
    s = base.convert("RGB").resize((600, 600), Image.LANCZOS); left = (600 - 512) // 2
    out = s.crop((left, 0, left + 512, 600)); out.save(f"{OUT}/portrait/{name}.webp", quality=90, method=6); print("portrait", name, out.size, "bbox", (x0, y0, x1, y1))

if __name__ == "__main__":
    bg = bg_color(); print("bg", bg)
    for n in NAMES: body(n); face(n, bg)
