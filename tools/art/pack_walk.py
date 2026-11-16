#!/usr/bin/env python3
"""걷기 시트 패커: ChatGPT가 만든 가로 4칸 마젠타 시트 → 투명 webp(villager_<k>_walk.webp).
사용(games/autelia 에서): python3 ../../tools/art/pack_walk.py <입력.png> <k>
마젠타 제거(+가장자리 번짐 제거), 4칸 분리, 기존 대기 그림과 같은 키(303)로 맞춤, 머리 x·발 바닥선을 칸마다 고정."""
import sys, numpy as np
from PIL import Image
src, k = sys.argv[1], sys.argv[2]; H = int(sys.argv[3]) if len(sys.argv) > 3 else 303   # H: 서 있을 때 인물 키(대기·환호 시트의 ch와 같게)
im = np.array(Image.open(src).convert('RGB')).astype(float)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mag = np.clip((np.minimum(r, b) - g - 40) / 90.0, 0, 1)
alpha = 1 - mag
spill = np.maximum(0, np.minimum(r, b) - g) * mag
out = np.dstack([np.clip(r - spill * 0.9, 0, 255), g, np.clip(b - spill * 0.9, 0, 255), alpha * 255]).astype(np.uint8)
rgba = Image.fromarray(out, 'RGBA'); A = np.array(rgba)[..., 3] > 40
n = 4; cw = A.shape[1] // n; fr = []
for i in range(n):
    sub = A[:, i * cw:(i + 1) * cw]; ys, xs = np.where(sub)
    fr.append((xs.min() + i * cw, ys.min(), xs.max() + i * cw, ys.max()))
s = (H - 1) / (fr[1][3] - fr[1][1] + 1)
crops = []
for (x0, y0, x1, y1) in fr:
    c = rgba.crop((x0, y0, x1 + 1, y1 + 1)); c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
    a = np.array(c)[..., 3] > 40; top = a[: max(4, int(c.height * 0.14))]; hx = np.where(top.any(0))[0].mean()
    crops.append((c, hx, y1))
base = max(y1 for _, _, y1 in crops)
left = max(hx for _, hx, _ in crops); right = max(c.width - hx for c, hx, _ in crops)
W = int(round(left + right)) + 8
sheet = Image.new('RGBA', (W * n, H), (0, 0, 0, 0))
for i, (c, hx, y1) in enumerate(crops):
    ox = int(round(W / 2 - hx)); oy = H - c.height - 1 - int(round((base - y1) * s))
    sheet.alpha_composite(c, (i * W + max(0, ox), max(0, oy)))
sheet.save(f'assets/prologue/ch/villager_{k}_walk.webp', quality=92, method=6)
open('/tmp/walk_meta.txt', 'a').write(f'{k} {W} {H}\n'); print('frame', W, 'x', H, 'scale', round(s, 3), 'bbox', fr)
