"""주인공 동작 시트(player_m/f_actions.webp)의 한 칸을 새 그림으로 바꾸고, 그 칸의 색 마스크(05/06)도 새로 만듭니다.
사용(games/autelia 폴더에서): python3 ../../tools/art/swap_sheet_frame.py <m|f> <칸 번호 0부터> <새 그림(마젠타 배경)> [--dry]
  예) 탈출 뒤돌아보기(lookback=5번 칸): python3 ../../tools/art/swap_sheet_frame.py m 5 "충격과 슬픔의 눈물 어린 표정.png"
처리: 새 그림의 마젠타를 지우고, 기존 칸의 몸 크기(키)·발 위치·가운데에 맞춰 놓음 → 시트 갱신 → 그 칸만 마스크 초안(hero_mask.py)으로 다시 만들어 마스크에 끼움.
원본은 *_before.webp / *_before.png 로 한 번만 보관합니다. 결과는 눈으로 확인하세요(_vis.png)."""
import sys, os, subprocess, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
g, idx, src = sys.argv[1], int(sys.argv[2]), sys.argv[3]
dry = "--dry" in sys.argv
SHEET = f"assets/prologue/ch/player_{g}_actions.webp"; MASK = f"assets/mask/{'05_pro_player_m_actions' if g == 'm' else '06_pro_player_f_actions'}.png"
sh = Image.open(SHEET).convert("RGBA"); W, H = sh.size; N = 6; cw = W // N
old = np.array(sh.crop((idx * cw, 0, (idx + 1) * cw, H))); ys, xs = np.where(old[..., 3] > 128); ox0, ox1, oy0, oy1 = xs.min(), xs.max(), ys.min(), ys.max()
a = np.array(Image.open(src).convert("RGB")).astype(float)
r, gg, b = a[..., 0], a[..., 1], a[..., 2]
dist = np.sqrt((r - 255) ** 2 + gg ** 2 + (b - 255) ** 2)
alpha = np.clip((dist - 70) / 60, 0, 1)                                   # 마젠타에서 멀수록 불투명(가장자리 부드럽게)
lab, k = ndi.label(alpha > 0.5)
if k > 1: keep = np.argmax(ndi.sum(alpha > 0.5, lab, range(1, k + 1))) + 1; alpha = alpha * ndi.binary_dilation(lab == keep, iterations=3)   # 가장 큰 덩어리만
spill = np.clip(1 - dist / 140, 0, 1)[..., None]; rgb = a - spill * np.stack([np.maximum(r - gg, 0) * 0.6, 0 * r, np.maximum(b - gg, 0) * 0.6], -1)   # 마젠타 번짐 제거
new = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
ys, xs = np.where(new[..., 3] > 128); new = new[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
scale = (oy1 - oy0 + 1) / new.shape[0]; nw, nh = max(1, round(new.shape[1] * scale)), oy1 - oy0 + 1
im = Image.fromarray(new).resize((nw, nh), Image.LANCZOS)
cell = Image.new("RGBA", (cw, H), (0, 0, 0, 0)); px = int(round((ox0 + ox1) / 2 - nw / 2)); cell.paste(im, (px, oy0), im)
out = sh.copy(); out.paste(cell, (idx * cw, 0))
os.makedirs("/tmp/swap", exist_ok=True); cell.save("/tmp/swap/cell.png")
if dry: print("old bbox", (ox0, oy0, ox1, oy1), "new size", (nw, nh), "cell", cell.size); sys.exit(0)
for f in (SHEET, MASK):
    bk = f.replace(".webp", "_before.webp").replace(".png", "_before.png")
    if not os.path.exists(bk): shutil.copy(f, bk)
out.save(SHEET, quality=95, method=6)
subprocess.check_call([sys.executable, os.path.join(os.path.dirname(__file__), "hero_mask.py"), g, "/tmp/swap/cell.png", "/tmp/swap/cell_mask.png"])
m = np.array(Image.open(MASK)); cm = np.array(Image.open("/tmp/swap/cell_mask.png")); m[:, idx * cw:(idx + 1) * cw] = cm; Image.fromarray(m).save(MASK)
print("ok", SHEET, MASK, "칸", idx)
