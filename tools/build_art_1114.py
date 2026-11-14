#!/usr/bin/env python3
"""2026-11-14 추가 그림 변환: 선창 십장(초상화·전신), 퀘스트 사물(방책 2상태·검은 얼룩·부서진 상자·길드 꾸러미).
사용: python3 tools/build_art_1114.py <Autelia_1114_Additional_Art_10 폴더> games/autelia/assets
 - 십장: build_merchants 와 같은 규격(전신 220×330, 초상화 512×600).
 - 방책 2장: 두 그림의 범위를 합친 같은 틀로 잘라 같은 크기로 저장(상태가 바뀔 때 튀지 않도록 아래·가운데 기준이 같음).
 - 사물은 게임 표시 크기의 2배로 저장."""
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_prologue_art as B
import build_merchants as M
SRC, OUT = sys.argv[1], sys.argv[2]

def obj(a, w, path):
    h = max(1, round(a.shape[0] * w / a.shape[1])); r = np.array(Image.fromarray(a, "RGBA").resize((w, h), Image.LANCZOS)); B.save_rgba(r, path); print(os.path.basename(path), (w, h))

if __name__ == "__main__":
    M.SRC, M.OUT, M.NAMES = f"{SRC}/B_foreman", OUT, ["porto_foreman"]
    bg = M.bg_color(); M.body("porto_foreman"); M.face("porto_foreman", bg)
    os.makedirs(f"{OUT}/object", exist_ok=True); C = f"{SRC}/C_quest_objects"
    a, b = B.key_magenta(f"{C}/ob_fence_broken.png"), B.key_magenta(f"{C}/ob_fence_fixed.png")
    (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = B.bbox(a), B.bbox(b); x0, y0, x1, y1 = min(ax0, bx0), min(ay0, by0), max(ax1, bx1), max(ay1, by1)
    obj(a[y0:y1, x0:x1], 360, f"{OUT}/object/fence_broken.webp"); obj(b[y0:y1, x0:x1], 360, f"{OUT}/object/fence_fixed.webp")
    for n, w in [("ob_trace_stain", 340), ("ob_trace_crate", 240), ("it_guild_parcel", 192)]:
        k = B.key_magenta(f"{C}/{n}.png"); x0, y0, x1, y1 = B.bbox(k); obj(k[y0:y1, x0:x1], w, f"{OUT}/object/{n.split('_', 1)[1]}.webp")
