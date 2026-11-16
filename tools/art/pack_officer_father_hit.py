"""마젠타 배경 2줄×3칸 시트 → raider_officer.webp(간부: 준비·치켜듦·내리침) + father_hit.webp(아버지: 막아섬·맞음·쓰러짐).
사용(games/autelia에서): python3 ../../tools/art/pack_officer_father_hit.py <시트.png>
- 시트 그림은 오른쪽을 보고 있어 가로로 뒤집어 게임 기본 방향(왼쪽)에 맞춤. 두 줄에 같은 배율을 씀(아버지 '막아섬' 칸 키를 275px로)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
src = sys.argv[1]
a = np.array(Image.open(src).convert("RGB")).astype(float)
d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
alpha = np.clip((d - 70) / 60, 0, 1); m = ndi.binary_opening(d > 90, iterations=2)
lab, n = ndi.label(ndi.binary_dilation(m, iterations=5))
comps = []
for L in range(1, n + 1):
    ys, xs = np.where((lab == L) & m)
    if len(ys) > 6000: comps.append([xs.min(), xs.max(), ys.min(), ys.max(), L])
assert len(comps) == 6, f"칸 {len(comps)}개 인식(6개여야 함)"
comps.sort(key=lambda c: (c[2] + c[3]) / 2); rows = [sorted(comps[i * 3:(i + 1) * 3]) for i in range(2)]
spill = np.clip(1 - d / 140, 0, 1)[..., None]
rgb = a - spill * np.stack([np.maximum(a[..., 0] - a[..., 1], 0) * .6, 0 * d, np.maximum(a[..., 2] - a[..., 1], 0) * .6], -1)
rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
g = rows[1][0]; S = 275.0 / (g[3] - g[2] + 1)
def cells(row):
    ims = []
    for x0, x1, y0, y1, L in row:
        keep = ndi.binary_dilation(lab == L, iterations=3); crop = rgba[y0:y1 + 1, x0:x1 + 1].copy(); crop[..., 3] = (crop[..., 3] * keep[y0:y1 + 1, x0:x1 + 1]).astype(np.uint8)
        im = Image.fromarray(crop).transpose(Image.FLIP_LEFT_RIGHT); im = im.resize((max(1, round(im.width * S)), max(1, round(im.height * S))), Image.LANCZOS); ims.append(im)
    return ims
for nm, row in (("raider_officer", rows[0]), ("father_hit", rows[1])):
    ims = cells(row); CW = max(i.width for i in ims) + 12; CH = max(i.height for i in ims) + 5
    out = Image.new("RGBA", (CW * 3, CH), (0, 0, 0, 0))
    for i, im in enumerate(ims): out.alpha_composite(im, (i * CW + (CW - im.width) // 2, CH - 5 - im.height))
    out.save(f"assets/prologue/ch/{nm}.webp", quality=95, method=6); print(nm, "cw", CW, "ch", CH, [i.size for i in ims])
