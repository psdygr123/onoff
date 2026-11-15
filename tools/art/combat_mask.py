"""전투 시트용 색 마스크 자동 생성: 기존 마스크가 있는 이동·동작 시트의 (색→부위)를 학습해 새 시트에 적용(1차 초안)"""
import sys, numpy as np
from PIL import Image
from sklearn.neighbors import KNeighborsClassifier
g, sheet, out = sys.argv[1], sys.argv[2], sys.argv[3]
N = {"m": ("03_pro_player_m_locomotion", "player_m_locomotion", "05_pro_player_m_actions", "player_m_actions"), "f": ("04_pro_player_f_locomotion", "player_f_locomotion", "06_pro_player_f_actions", "player_f_actions")}[g]
X = []; Y = []
for mk, im in ((N[0], N[1]), (N[2], N[3])):
    a = np.array(Image.open(f"assets/prologue/ch/{im}.webp").convert("RGBA")); m = np.array(Image.open(f"assets/mask/{mk}.png"))
    sel = (a[..., 3] > 200); X.append(a[sel][:, :3]); Y.append(m[sel])
X = np.vstack(X); Y = np.concatenate(Y); idx = np.random.RandomState(0).choice(len(X), min(60000, len(X)), replace=False)
knn = KNeighborsClassifier(15).fit(X[idx], Y[idx])
s = np.array(Image.open(sheet).convert("RGBA")); res = np.zeros(s.shape[:2], np.uint8); sel = s[..., 3] > 128
res[sel] = knn.predict(s[sel][:, :3])
import colorsys
from scipy import ndimage as ndi
rgb = s[..., :3].astype(float) / 255; mx = rgb.max(2); mn = rgb.min(2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
res[(res == 2) & (sat < 0.45) & (mx > 0.62)] = 0                      # 칼날(회색 초록)은 조끼가 아님
res[res == 1] = 0
v = res == 2; vo = ndi.binary_opening(v, iterations=5); res[v & ~vo] = 0          # 얇은 칼날 조각 제거
lab0, n0 = ndi.label(ndi.binary_dilation(sel, iterations=4))
for L in range(1, n0 + 1):
    comp = lab0 == L; ys, xs = np.where(comp & sel)
    if len(ys) > 3000 and (ys.max() - ys.min()) > 200: res[comp & (res == 3) & (np.arange(s.shape[0])[:, None] < ys.min() + 0.45 * (ys.max() - ys.min()))] = 0
pm = ndi.binary_closing(res == 3, iterations=3) & sel & (res != 2); res[pm] = 3
r, gg, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hairlike = sel & (res == 0) & (r > gg) & (gg > b) & (sat > 0.5) & (mx > 0.45) & ((gg - b) / np.maximum(r - b, 1e-6) < 0.75)
lab, n = ndi.label(ndi.binary_dilation(sel, iterations=4)); 
for L in range(1, n + 1):
    comp = lab == L; ys, xs = np.where(comp & sel)
    if len(ys) < 3000: continue
    t, bt = ys.min(), ys.max(); hmask = hairlike & comp & (np.arange(s.shape[0])[:, None] < t + 0.42 * (bt - t)) if (bt - t) > 200 else hairlike & comp
    lb, m2 = ndi.label(hmask)
    if m2: sizes = ndi.sum(hmask, lb, range(1, m2 + 1)); res[lb == (np.argmax(sizes) + 1)] = 1; Image.fromarray(res).save(out)
vis = np.zeros(s.shape[:2] + (3,), np.uint8) + 90; vis[res == 1] = (230, 60, 60); vis[res == 2] = (60, 200, 90); vis[res == 3] = (70, 90, 230); vis[res == 0] = np.where(sel[..., None], s[..., :3], 90)[res == 0]
Image.fromarray(vis).save(out.replace(".png", "_vis.png"))
