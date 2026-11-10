#!/usr/bin/env python3
"""아우텔리아 프롤로그 추가 그림(2차 패키지) 변환 도구.
사용: python3 tools/build_prologue_art2.py <추가 원화 폴더> <출력 폴더(games/autelia/assets/prologue)>
 - 장애물·골조: 마젠타 제거 후 여백을 잘라 ob/ 에 저장
 - 초상화: 마젠타 제거 후 머리·어깨가 원형 틀 안에 들어오도록 정사각형으로 잘라 512x512, pt/ 에 저장
 - 효과 시트(fx_fire_sheet·fx_smoke_sheet): 가로 한 줄 스트립으로 fx/fire.webp(6프레임)·fx/smoke.webp(4프레임)
"""
import sys, os
SRC = sys.argv[1]; OUT = sys.argv[2]
sys.argv = [sys.argv[0], "/nonexistent", OUT]          # build_prologue_art 의 도우미 함수만 사용
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import build_prologue_art as B

os.makedirs(OUT + "/pt", exist_ok=True); os.makedirs(OUT + "/ob", exist_ok=True)

def crop(a, pad=6):
    x0, y0, x1, y1 = B.bbox(a); return a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]

def objects():
    for sub, name, ms in [("obstacles", "obst_rock", 640), ("obstacles", "obst_log", 760), ("obstacles", "obst_burnt_beams", 700), ("objects", "joint_frame", 600)]:
        a = crop(B.key_magenta(f"{SRC}/{sub}/{name}.png")); c = B.fit(a, ms); B.save_rgba(c, f"{OUT}/ob/{name}.webp"); print(name, c.shape[1], c.shape[0])

def portraits(size=512):
    for name in ["pt_pro_hero_m", "pt_pro_hero_f", "pt_pro_father", "pt_pro_elder", "pt_pro_baker", "pt_pro_child", "pt_pro_hero_m_surprised", "pt_pro_father_smile"]:
        a = B.key_magenta(f"{SRC}/portraits/{name}.png"); x0, y0, x1, y1 = B.bbox(a)
        side = int(max(x1 - x0, (y1 - y0) * 0.92)); cx = (x0 + x1) // 2
        sx0 = cx - side // 2; sy0 = y0                                     # 머리 위끝을 기준으로 정사각형(원형 틀에서 얼굴이 가운데 위쪽에 오도록)
        canvas = np.zeros((side, side, 4), np.uint8)
        xs0, xs1 = max(0, sx0), min(a.shape[1], sx0 + side); ys0, ys1 = max(0, sy0), min(a.shape[0], sy0 + side)
        canvas[ys0 - sy0:ys1 - sy0, xs0 - sx0:xs1 - sx0] = a[ys0:ys1, xs0:xs1]
        c = np.array(Image.fromarray(canvas, "RGBA").resize((size, size), Image.LANCZOS)); B.save_rgba(c, f"{OUT}/pt/{name}.webp"); print(name, size)

def fx():
    """효과 시트(불 6프레임 3x2, 연기 4프레임 2x2)를 가로 한 줄 스트립으로 변환. 프레임마다 아래·가운데 기준으로 정렬."""
    os.makedirs(OUT + "/fx", exist_ok=True)
    for name, cols, rows, n, outh, out in [("fx_fire_sheet", 3, 2, 6, 256, "fire"), ("fx_smoke_sheet", 2, 2, 4, 256, "smoke")]:
        im = np.array(Image.open(f"{SRC}/effects/{name}.png").convert("RGBA")); H_, W_ = im.shape[:2]; cw, ch = W_ // cols, H_ // rows
        cells = []
        for i in range(n):
            r, c = divmod(i, cols); cell = im[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]; x0, y0, x1, y1 = B.bbox(cell, 12); cells.append(cell[y0:y1, x0:x1])
        mw, mh = max(c.shape[1] for c in cells), max(c.shape[0] for c in cells); strip = np.zeros((mh, mw * n, 4), np.uint8)
        for i, c in enumerate(cells):
            h_, w_ = c.shape[:2]; strip[mh - h_:, i * mw + (mw - w_) // 2:i * mw + (mw - w_) // 2 + w_] = c      # 아래 가운데 정렬
        k = outh / mh; strip = np.array(Image.fromarray(strip, "RGBA").resize((round(mw * n * k) // n * n, round(mh * k)), Image.LANCZOS))
        B.save_rgba(strip, f"{OUT}/fx/{out}.webp"); print(out, strip.shape[1] // n, "x", strip.shape[0], "x", n)

if __name__ == "__main__":
    objects(); portraits(); fx()
