"""아우텔리아 색 마스크 보정(1차 초안 → 보정본).
입력: 원본 그림(assets/…/*.webp), 초안 라벨 PNG(픽셀 값 0=그대로 1=머리 2=조끼 3=바지)
처리: 조끼·바지 라벨 주변에서, 라벨된 부분과 색이 비슷한 빈 자리(옷 옆 그림자 면 등)를 몇 픽셀 범위 안에서 채움.
      머리는 확장하면 귀·목 피부로 번져서 초안 그대로 둠.
사용: python3 tools/refine_masks.py <초안 라벨 폴더> <출력 폴더>   (Pillow, numpy, scipy 필요, 게임 폴더에서 실행)
"""
import sys, os, glob
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = {'01': 'assets/char/player_male.webp', '02': 'assets/char/player_female.webp',
       '03': 'assets/prologue/ch/player_m_locomotion.webp', '04': 'assets/prologue/ch/player_f_locomotion.webp',
       '05': 'assets/prologue/ch/player_m_actions.webp', '06': 'assets/prologue/ch/player_f_actions.webp',
       '07': 'assets/portrait/player_male.webp', '08': 'assets/portrait/player_female.webp',
       '09': 'assets/prologue/pt/pt_pro_hero_m.webp', '10': 'assets/prologue/pt/pt_pro_hero_f.webp',
       '11': 'assets/prologue/pt/pt_pro_hero_m_surprised.webp'}

def hsv(rgb):
    mx = rgb.max(2); mn = rgb.min(2); d = mx - mn; r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; dd = np.where(d == 0, 1, d)
    H = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    return np.where(d == 0, 0, H), np.where(mx == 0, 0, d / np.where(mx == 0, 1, mx)), mx

def refine(a, L, reach={2: 6, 3: 5}):
    alpha = a[..., 3] > 0.5; H, S, V = hsv(a[..., :3]); lum = a[..., :3].mean(2)
    free = alpha & (lum >= 0.20); out = L.copy()
    for l in (2, 3):
        m = (L == l)
        if m.sum() < 30: continue
        mh = np.median(H[m]); v1, v99 = np.percentile(V[m], [1, 99]); s1, s99 = np.percentile(S[m], [1, 99])
        if l == 3: near = (np.abs(H - mh) <= 5) & (S >= s1 - 0.06) & (S <= s99 + 0.06) & (V >= v1 - 0.08) & (V <= v99 + 0.06)
        else: near = (((H >= 60) & (H <= 260) & (S > 0.04)) | ((V < 0.38) & (S < 0.55) & ~((H >= 15) & (H <= 50) & (S > 0.45))) | ((H >= 38) & (H < 60) & (S > 0.1) & (V < 0.62)))
        out[free & near & ndi.binary_dilation(m, iterations=reach[l]) & (out == 0)] = l
    for l in (1, 2, 3):  # 작은 틈 메우기·고립 점 제거는 머리 포함
        m = out == l
        if not m.any(): continue
        out[ndi.binary_closing(m, structure=np.ones((3, 3))) & alpha & (out == 0) & (lum >= 0.20)] = l
        lab, k = ndi.label(out == l)
        for i, sv in enumerate(ndi.sum(out == l, lab, range(1, k + 1))):
            if sv < 5: out[lab == i + 1] = 0
    return out

if __name__ == '__main__':
    src_dir, dst_dir = sys.argv[1], sys.argv[2]; os.makedirs(dst_dir, exist_ok=True)
    for k, path in SRC.items():
        f = glob.glob(os.path.join(src_dir, k + '_*.png'))[0]
        a = np.array(Image.open(path).convert('RGBA')).astype(float) / 255
        R = refine(a, np.array(Image.open(f)))
        Image.fromarray(R.astype(np.uint8), 'L').save(os.path.join(dst_dir, os.path.basename(f)))
        print(k, 'ok')
