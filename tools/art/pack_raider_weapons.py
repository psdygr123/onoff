"""마젠타 배경의 3줄×3칸 시트(줄=무기 종류, 칸=서기·걷기1·걷기2) → 게임용 raider_<무기>.webp 3장.
사용(games/autelia에서): python3 ../../tools/art/pack_raider_weapons.py <새 시트.png> axe spear mace
- 모든 줄에 같은 배율을 씀: 첫 줄(머리 위로 솟는 무기가 없는 줄)의 서 있는 칸 높이를 295px로 맞춤.
- 칸 폭 240, 칸 높이 = 300(창은 창끝 때문에 더 큼), 발바닥은 칸 아래에서 5px 위, 가로는 몸통 가운데 정렬."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, names = sys.argv[1], sys.argv[2:]
a = np.array(Image.open(src).convert("RGB")).astype(float)
d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
alpha = np.clip((d - 70) / 60, 0, 1); m = ndi.binary_opening(d > 90, iterations=2)
lab, n = ndi.label(ndi.binary_dilation(m, iterations=5))
comps = []
for L in range(1, n + 1):
    ys, xs = np.where((lab == L) & m)
    if len(ys) > 4000: comps.append([xs.min(), xs.max(), ys.min(), ys.max(), L])
assert len(comps) == 9, f"칸 {len(comps)}개 인식(9개여야 함)"
comps.sort(key=lambda c: (c[2] + c[3]) / 2); rows = [sorted(comps[i * 3:(i + 1) * 3]) for i in range(3)]
spill = np.clip(1 - d / 140, 0, 1)[..., None]
rgb = a - spill * np.stack([np.maximum(a[..., 0] - a[..., 1], 0) * .6, 0 * d, np.maximum(a[..., 2] - a[..., 1], 0) * .6], -1)
rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
S = 295.0 / (rows[0][0][3] - rows[0][0][2] + 1)
CW = 240
for row, nm in zip(rows, names):
    ims = []
    for x0, x1, y0, y1, L in row:
        keep = ndi.binary_dilation(lab == L, iterations=3); crop = rgba[y0:y1 + 1, x0:x1 + 1].copy(); crop[..., 3] = (crop[..., 3] * keep[y0:y1 + 1, x0:x1 + 1]).astype(np.uint8)
        im = Image.fromarray(crop); im = im.resize((max(1, round(im.width * S)), max(1, round(im.height * S))), Image.LANCZOS); ims.append(im)
    CH = max(300, max(i.height for i in ims) + 5)
    out = Image.new("RGBA", (CW * 3, CH), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        assert im.width <= CW, f"{nm} 칸 {i} 폭 {im.width} > {CW}"
        out.alpha_composite(im, (i * CW + (CW - im.width) // 2, CH - 5 - im.height))
    out.save(f"assets/prologue/ch/raider_{nm}.webp", quality=95, method=6); print(nm, out.size, "ok")
