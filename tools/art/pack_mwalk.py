#!/usr/bin/env python3
"""몬스터 걷기 시트 패커: 가로 4프레임 마젠타 시트 → assets/monster/<name>_w1..w4.webp (같은 칸 크기, 발바닥선·몸 중심 고정).
사용(games/autelia 에서): python3 ../../tools/art/pack_mwalk.py <시트.png> <name> <기준 크기> [h|-] [칸 수]   (h 를 주면 기준 크기를 '높이'로 보고 맞춤: 서 있는 2족 몬스터용)
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
NF = int(sys.argv[5]) if len(sys.argv) > 5 else 4   # 5번째 인자: 시트 칸 수(걷기 4 + 준비·공격 2 = 6 등)
while len(segs) > NF:  # 가장 가까운 구간끼리 병합
    gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]; i = int(np.argmin(gaps)); segs[i][1] = segs[i + 1][1]; del segs[i + 1]
masks = None
if len(segs) != NF:   # 칸끼리 가로로 겹칠 때(창 등): 연결된 덩어리 NF개로 분할
    from scipy import ndimage
    lab, nlab = ndimage.label(ndimage.binary_dilation(A, iterations=8))
    sizes = ndimage.sum(A, lab, range(1, nlab + 1)); keep = sorted(np.argsort(sizes)[::-1][:NF] + 1, key=lambda i: np.where(lab == i)[1].min())
    assert len(keep) == NF, (nlab, segs)
    masks = [(lab == i) & A for i in keep]
    boxes = [(np.where(m.any(0))[0].min(), np.where(m.any(1))[0].min(), np.where(m.any(0))[0].max(), np.where(m.any(1))[0].max()) for m in masks]
else:
    boxes = []
    for x0, x1 in segs:
        ys = np.where(A[:, x0:x1 + 1].any(1))[0]; boxes.append((x0, ys.min(), x1, ys.max()))
byh = len(sys.argv) > 4 and sys.argv[4] == 'h'
ATK = len(sys.argv) > 6 and sys.argv[6] == 'a'   # 'a' 모드: 3칸 시트(기본 자세 + 준비 + 공격). 기본 자세 칸으로 크기를 맞추고 준비·공격만 <name>_a1,_a2 로 저장
sc = refw / np.mean([(b[3] - b[1] if byh else b[2] - b[0]) + 1 for b in (boxes[:1] if ATK else boxes[:4])])   # 크기 기준은 앞 4칸(걷기)만: 늘어난·솟은 동작 칸이 기준을 흔들지 않게
def _crop(i):
    x0, y0, x1, y1 = boxes[i]; c = rgba.crop((x0, y0, x1 + 1, y1 + 1))
    if masks is not None:   # 다른 칸에서 넘어온 부분은 지움
        a = np.array(c); a[..., 3] = np.where(masks[i][y0:y1 + 1, x0:x1 + 1], a[..., 3], 0); c = Image.fromarray(a, 'RGBA')
    return c
crops = [_crop(i) for i in range(len(boxes))]
crops = [c.resize((max(1, round(c.width * sc)), max(1, round(c.height * sc))), Image.LANCZOS) for c in crops]
if ATK: crops = crops[1:]
def _cx(c):   # 알파 무게중심 x: 창·꼬리처럼 길게 뻗은 부분이 아니라 '몸' 기준으로 가운데를 맞춤
    a = np.array(c)[..., 3].astype(float); xs = np.arange(a.shape[1]); return float((a.sum(0) * xs).sum() / max(1.0, a.sum()))
if ATK:
    cxs = [_cx(c) for c in crops]; half = max(max(cx, c.width - cx) for c, cx in zip(crops, cxs)); W = int(half * 2) + 8
else:
    cxs = [c.width / 2 for c in crops]; W = max(c.width for c in crops) + 8
H = max(c.height for c in crops) + 4
for i, c in enumerate(crops):
    f = Image.new('RGBA', (W, H), (0, 0, 0, 0)); f.alpha_composite(c, (int(round(W / 2 - cxs[i])), H - c.height - 1))
    f.save(f'assets/monster/{name}_{"a" if ATK else "w"}{i+1}.webp', quality=92, method=6)
print(name, 'cell', W, 'x', H, 'scale', round(sc, 3), 'segs', segs if masks is None else 'components')
