"""전투 동작 시트(6칸) -> 게임용 가로 시트. 사용: python3 combat_sheet.py 원본.png 출력.webp"""
import sys, numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from magenta import key
src, out = sys.argv[1], sys.argv[2]
SCALE = float(sys.argv[3]) if len(sys.argv) > 3 else 0.82
im = key(Image.open(src)); W, H = im.size; cw0 = W / 6
frames = []
from scipy import ndimage as ndi
A = np.array(im.getchannel("A")) > 40
lab, n = ndi.label(ndi.binary_dilation(A, iterations=4))
areas = ndi.sum(A, lab, range(1, n + 1)); top = sorted(np.argsort(areas)[-6:] + 1, key=lambda L: np.where(lab == L)[1].mean())
for L in top:
    m = (lab == L) & A; ys, xs = np.where(m); t, b, l, r = ys.min(), ys.max(), xs.min(), xs.max()
    low = m[max(b - 40, 0):b + 1]; fx = np.where(low.any(0))[0]; foot = (fx.min() + fx.max()) / 2 - l
    c = im.copy(); al = np.array(c.getchannel("A")); al[~ndi.binary_dilation(lab == L, iterations=4)] = 0; c.putalpha(Image.fromarray(al))
    c = c.crop((l, t, r + 1, b + 1)); k = SCALE
    c = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS); frames.append((c, foot * k))
cw = int(2 * max(max(f, c.width - f) for c, f in frames)) + 8; ch = max(c.height for c, _ in frames) + 4
sheet = Image.new("RGBA", (cw * 6, ch), (0, 0, 0, 0))
for i, (c, f) in enumerate(frames): sheet.alpha_composite(c, (round(i * cw + cw / 2 - f), ch - c.height))
sheet.save(out, quality=92); print(cw, ch, [c.size for c, _ in frames])
