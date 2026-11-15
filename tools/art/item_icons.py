"""아이템 아이콘 시트(마젠타 배경) -> 개별 128x128 WebP (assets/item/<id>.webp)"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, "tools/art")
from magenta import key

D = "/mnt/user-data/uploads/autelia_img/"
SHEETS = [
    (D + "마젠타 배경의 판타지 아이템 6종 세트.png", 3, ["sword_a", "cloth_a", "charm_a", "fox_scarf", "snake_ring", "crab_vest"]),
    (D + "판타지 제작 재료 9종 세트.png", 3, ["fur", "fox_tail", "snake_skin", "snake_fang", "rat_tooth", "crab_claw", "crab_shell", "iron_scrap", "wolf_pelt"]),
    (D + "판타지 RPG 인벤토리 아이콘 시트.png", 4, ["potion", "guild_token", "guild_parcel", "barsha_map", "jepeto_blueprint", "metal_fragment", "carpenter_bag"]),
]
OUT = "games/autelia/assets/item/"
import os; os.makedirs(OUT, exist_ok=True)
S = 128
for path, cols, ids in SHEETS:
    im = key(Image.open(path)); al = np.asarray(im.getchannel("A")) > 40
    lab, n = ndi.label(ndi.binary_dilation(al, iterations=14))
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where((lab == i) & al)
        if len(ys) < 3000: continue
        comps.append((ys.min(), ys.max(), xs.min(), xs.max(), len(ys)))
    comps.sort(key=lambda c: (c[0] + c[1]) / 2)
    rows = [comps[i:i + cols] for i in range(0, len(comps), cols)]
    ordered = [c for r in rows for c in sorted(r, key=lambda c: (c[2] + c[3]) / 2)]
    print(path.split("/")[-1], "components", len(ordered), "expected", len(ids))
    if len(ordered) != len(ids): sys.exit("count mismatch")
    for c, id_ in zip(ordered, ids):
        t, b, l, r = c[0], c[1], c[2], c[3]; pad = 6
        crop = im.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad + 1, im.width), min(b + pad + 1, im.height)))
        k = (S * 0.9) / max(crop.size); crop = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
        cv = Image.new("RGBA", (S, S), (0, 0, 0, 0)); cv.paste(crop, ((S - crop.width) // 2, (S - crop.height) // 2), crop)
        cv.save(OUT + id_ + ".webp", quality=92); 
print("done")
