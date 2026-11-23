#!/usr/bin/env python3
"""몬스터 걷기 시트 패커: 가로 4프레임 마젠타 시트 → assets/monster/<name>_w1..w4.webp (같은 칸 크기, 발바닥선·몸 중심 고정).
사용(games/autelia 에서): python3 ../../tools/art/pack_mwalk.py <시트.png> <name> <기준그림 폭> [기준그림 높이]
기준그림(대기 스프라이트)과 같은 크기감이 되도록 4프레임 평균 폭을 기준 폭에 맞춤."""
import sys, numpy as np
from PIL import Image
src, name, refw = sys.argv[1], sys.argv[2], float(sys.argv[3])
im = np.array(Image.open(src).convert('RGB')).astype(float)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mag = np.clip((np.minimum(r, b) - g - 40) / 90.0, 0, 1); alpha = 1 - mag
spill = np.maximum(0, np.minimum(r, b) - g) * mag
out = np.dstack([np.clip(r - spill * .9, 0, 255), g, np.clip(b - spill * .9, 0, 255), alpha * 255]).astype(np.uint8)
rgba = Image.fromarray(out, 'RGBA'); A = out[..., 3] > 40
col = A.sum(0) > 0
# 열 점유 → 연속 구간 4개
segs = []; s = None
for x, v in enumerate(col):
    if v and s is None: s = x
    if not v and s is not None:
        if x - s > 20: segs.append([s, x - 1])
        s = None
if s is not None: segs.append([s, len(col) - 1])
while len(segs) > 4:  # 가장 가까운 구간끼리 병합
    gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]; i = int(np.argmin(gaps)); segs[i][1] = segs[i + 1][1]; del segs[i + 1]
assert len(segs) == 4, segs
boxes = []
for x0, x1 in segs:
    ys = np.where(A[:, x0:x1 + 1].any(1))[0]; boxes.append((x0, ys.min(), x1, ys.max()))
sc = refw / np.mean([b[2] - b[0] + 1 for b in boxes])
crops = [rgba.crop((x0, y0, x1 + 1, y1 + 1)) for x0, y0, x1, y1 in boxes]
crops = [c.resize((max(1, round(c.width * sc)), max(1, round(c.height * sc))), Image.LANCZOS) for c in crops]
W = max(c.width for c in crops) + 8; H = max(c.height for c in crops) + 4
for i, c in enumerate(crops):
    f = Image.new('RGBA', (W, H), (0, 0, 0, 0)); f.alpha_composite(c, ((W - c.width) // 2, H - c.height - 1))
    f.save(f'assets/monster/{name}_w{i+1}.webp', quality=92, method=6)
print(name, 'cell', W, 'x', H, 'scale', round(sc, 3), 'segs', segs)
