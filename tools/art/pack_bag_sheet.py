"""마젠타 배경의 7칸 가로 시트(서기·걷기4·점프2) → 게임용 player_<g>_bag.webp(칸 210×310, 발 y=304, 칸 가운데 정렬)로 변환.
사용(games/autelia에서): python3 ../../tools/art/pack_bag_sheet.py <m|f> <새 시트.png>
키(키 295px 기준)는 서 있는 칸의 높이로 맞추고 모든 칸에 같은 배율을 씁니다."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
g, src = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert("RGB")).astype(float)
d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
alpha = np.clip((d - 70) / 60, 0, 1); m = ndi.binary_opening(d > 90, iterations=2)
lab, n = ndi.label(ndi.binary_dilation(m, iterations=12))
comps = []
for L in range(1, n + 1):
    ys, xs = np.where((lab == L) & m)
    if len(ys) > 2000: comps.append((xs.min(), xs.max(), ys.min(), ys.max(), L))
comps.sort(); assert len(comps) == 7, f"칸 {len(comps)}개 인식(7개여야 함)"
spill = np.clip(1 - d / 140, 0, 1)[..., None]
rgb = a - spill * np.stack([np.maximum(a[..., 0] - a[..., 1], 0) * .6, 0 * d, np.maximum(a[..., 2] - a[..., 1], 0) * .6], -1)
rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
S = 295.0 / (comps[0][3] - comps[0][2] + 1)
out = Image.new("RGBA", (210 * 7, 310), (0, 0, 0, 0))
for i, (x0, x1, y0, y1, L) in enumerate(comps):
    keep = ndi.binary_dilation(lab == L, iterations=3); crop = rgba[y0:y1 + 1, x0:x1 + 1].copy(); crop[..., 3] = (crop[..., 3] * keep[y0:y1 + 1, x0:x1 + 1]).astype(np.uint8)
    im = Image.fromarray(crop); w, h = max(1, round(im.width * S)), max(1, round(im.height * S)); im = im.resize((w, h), Image.LANCZOS)
    out.alpha_composite(im, (i * 210 + 105 - w // 2, 305 - h))
out.save(f"assets/prologue/ch/player_{g}_bag.webp", quality=95, method=6); print("ok", S)
