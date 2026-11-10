#!/usr/bin/env python3
"""아우텔리아 프롤로그 정식 그림 변환 도구.
원화(Autelia_Prologue_Art_Pack)는 수정하지 않고, 게임용 변환본만 games/autelia/assets/prologue/ 에 만듭니다.
사용: python3 tools/build_prologue_art.py <원화 폴더> <출력 폴더>
 - 배경: 1280x720 기준 높이로 변환, 분할 원화는 이음새를 합성(좌우 가장자리 나무 제거·페더 블렌딩)
 - 인물·건물·소품: 마젠타(#FF00FF) 배경 제거(알파 + 가장자리 번짐 제거)
 - 인물 시트: 시트 격자 등분이 아니라 실루엣 경계(연결 성분)로 프레임을 찾고, 발 기준점에 맞춰 공통 캔버스 정렬
"""
import sys, os, json
import numpy as np, cv2
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/artpack/Autelia_Prologue_Art_Pack"
OUT = sys.argv[2] if len(sys.argv) > 2 else "games/autelia/assets/prologue"
os.makedirs(OUT + "/bg", exist_ok=True); os.makedirs(OUT + "/ch", exist_ok=True); os.makedirs(OUT + "/ob", exist_ok=True)
H = 720

def rgb(path): return Image.open(path).convert("RGB")
def bgr_from(name):
    im = rgb(f"{SRC}/backgrounds/{name}.png"); w = round(im.width * H / im.height)
    return cv2.cvtColor(np.array(im.resize((w, H), Image.LANCZOS)), cv2.COLOR_RGB2BGR)
def save_bg(arr, name, q=86):
    Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB)).save(f"{OUT}/bg/{name}.webp", quality=q, method=6)

# ---------- 배경 ----------
def clean_left_tree(B, clear_sky=True):
    """이어붙일 오른쪽 장의 왼쪽 가장자리 나무(잎·가지·줄기)를 하늘로 지움(집 지붕은 색(주황)으로 보호)."""
    hsv = cv2.cvtColor(B, cv2.COLOR_BGR2HSV); h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    m = np.zeros(B.shape[:2], np.uint8)
    reg = np.zeros_like(m); reg[:140, :380] = 1; m[((h >= 22) & (h <= 85) & (s > 70)) & (reg == 1)] = 255
    reg2 = np.zeros_like(m); reg2[:110, :380] = 1; reg2[:330, :115] = 1
    m[((h >= 5) & (h <= 22) & (s > 60) & (v < 200)) & (reg2 == 1)] = 255
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    out = cv2.inpaint(B, m, 7, cv2.INPAINT_TELEA)
    if clear_sky:
        col = np.median(out[:105, 420:470], axis=1).astype(np.float32)       # 상단 하늘 띠는 깨끗한 하늘 열로 덮음(맑은 하늘)
        for x in range(0, 345):
            a = 1.0 if x < 300 else max(0, (345 - x) / 45); out[:105, x] = (col * a + out[:105, x] * (1 - a)).astype(np.uint8)
    else:                                                                   # 연기 낀 하늘(습격 상태): 오른쪽 하늘 조각을 좌우 반전해 덮고 가장자리만 부드럽게
        patch = out[:122, 700:1050][:, ::-1].astype(np.float32); h_, w_ = patch.shape[:2]
        wy = np.clip((122 - np.arange(h_)) / 24.0, 0, 1)[:, None]; wx = np.clip((w_ - np.arange(w_)) / 40.0, 0, 1)[None, :]
        wgt = (wy * wx)[..., None]; out[:122, :350] = (patch * wgt + out[:122, :350] * (1 - wgt)).astype(np.uint8)
    m2 = np.zeros(B.shape[:2], np.uint8); m2[60:260, :78] = 255
    return cv2.inpaint(out, m2, 15, cv2.INPAINT_NS)

def join(a, b, f):
    """두 그림을 겹친 구간(f px)에서 '서로 가장 덜 다른' 세로 경로(DP 이음선)를 찾아 그 선을 따라 이음 → 겹쳐 비치는 유령 이미지를 줄임."""
    oa, ob = a[:, -f:].astype(np.float32), b[:, :f].astype(np.float32)
    cost = np.abs(oa - ob).sum(axis=2); cost = cv2.GaussianBlur(cost, (0, 0), 2.0)
    H_, W_ = cost.shape; acc = cost.copy(); back = np.zeros((H_, W_), np.int8)
    for y in range(1, H_):
        prev = acc[y - 1]; l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
        stack = np.stack([l, prev, r]); k = stack.argmin(0); acc[y] += stack.min(0); back[y] = k - 1
    x = int(acc[-1].argmin()); seam = np.zeros(H_, int)
    for y in range(H_ - 1, -1, -1): seam[y] = x; x += int(back[y, x]) if y > 0 else 0
    soft = 10; xs = np.arange(W_)[None, :]
    w = np.clip((xs - seam[:, None]) / soft + 0.5, 0, 1)[..., None]      # 이음선 왼쪽은 a, 오른쪽은 b(가장자리만 부드럽게)
    mix = (oa * (1 - w) + ob * w).astype(np.uint8)
    return np.concatenate([a[:, :-f], mix, b[:, f:]], axis=1)

def build_backgrounds():
    info = {}
    def reg(name, arr): save_bg(arr, name); info[name] = arr.shape[1]
    # 마을길(평화/습격 같은 구도): 왼쪽 장 1000px + 오른쪽 장 40px부터
    for tag, (a, b) in {"road": ("bg02_road_1", "bg02_road_2"), "road_atk": ("bg02_road_v01_1", "bg02_road_v01_2")}.items():
        A, B = bgr_from(a), bgr_from(b); reg(tag, join(A[:, :1000], clean_left_tree(B, tag == "road")[:, 40:], 90))
    A, B = bgr_from("bg01_temple_1"), bgr_from("bg01_temple_2"); reg("temple", join(A[:, :1010], B[:, 360 - 110:], 200))
    for tag, n in {"plaza": "bg03_plaza", "plaza_atk": "bg03_plaza_v02", "house_atk": "bg04_house_attack", "house": "bg04_house_peace", "temple_fire": "bg_v03_temple_fire"}.items():
        reg(tag, bgr_from(n))
    e = [bgr_from(f"bg05_escape_{i}") for i in (1, 2, 3)]
    o = join(e[0][:, :1282 - 120], e[1][:, 120:1282 - 120], 140); reg("escape", join(o, e[2][:, 120:], 140))
    A, B = bgr_from("bg06_port_view_1"), bgr_from("bg06_port_view_2"); reg("port", join(A[:, :1050], B[:, 360:], 200))
    return info

# ---------- 마젠타 제거 ----------
def key_magenta(path):
    """마젠타 배경 제거. 엄격한 마젠타는 몸 사이 구멍까지 모두 투명, 윤곽의 분홍 번짐은 알파·색 보정."""
    a = np.array(Image.open(path).convert("RGB")).astype(np.float32); R, G, B = a[..., 0], a[..., 1], a[..., 2]
    spill = np.minimum(R, B) - G
    strict = (R > 170) & (B > 170) & (G < 110)
    near = cv2.dilate(strict.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) > 0   # 마젠타 근처(윤곽)만 부드럽게 처리
    alpha = np.where(strict, 0.0, np.where(near, 1 - np.clip((spill - 40) / 110, 0, 1), 1.0))
    out = a.copy()
    fix = near & ~strict
    lim = G + 28
    out[..., 0] = np.where(fix, np.minimum(R, lim), R); out[..., 2] = np.where(fix, np.minimum(B, lim), B)
    alpha = cv2.GaussianBlur(alpha.astype(np.float32), (3, 3), 0.6) * (~strict)
    return np.dstack([out.clip(0, 255), (alpha * 255).clip(0, 255)]).astype(np.uint8)

def bbox(rgba, thr=20):
    ys, xs = np.where(rgba[..., 3] > thr); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def save_rgba(arr, path):
    Image.fromarray(arr, "RGBA").save(path, lossless=False, quality=90, method=6) if path.endswith(".webp") else Image.fromarray(arr, "RGBA").save(path)

def fit(arr, maxside):
    h, w = arr.shape[:2]; k = maxside / max(h, w)
    return arr if k >= 1 else np.array(Image.fromarray(arr, "RGBA").resize((round(w * k), round(h * k)), Image.LANCZOS))

def build_objects():
    meta = {}
    # 신전 3상태: 같은 합집합 상자로 잘라 위치가 어긋나지 않게
    st = {n: key_magenta(f"{SRC}/objects/{n}.png") for n in ("temple_frame", "temple_done", "temple_burn")}
    bb = [bbox(a) for a in st.values()]; x0 = min(b[0] for b in bb); y0 = min(b[1] for b in bb); x1 = max(b[2] for b in bb); y1 = max(b[3] for b in bb)
    for n, a in st.items():
        c = fit(a[y0:y1, x0:x1], 900); save_rgba(c, f"{OUT}/ob/{n}.webp"); meta[n] = {"w": c.shape[1], "h": c.shape[0]}
    for n, ms in {"metal_fragment_big": 1024, "metal_fragment_icon": 256, "bag_floor": 600, "bag_icon": 256, "plank_a": 600, "plank_b": 600, "nails": 400, "hammer": 500}.items():
        a = key_magenta(f"{SRC}/objects/{n}.png"); x0, y0, x1, y1 = bbox(a); pad = 6; a = a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]
        c = fit(a, ms); save_rgba(c, f"{OUT}/ob/{n}.webp"); meta[n] = {"w": c.shape[1], "h": c.shape[0]}
    a = np.array(Image.open(f"{SRC}/objects/bag_back.png").convert("RGBA")); x0, y0, x1, y1 = bbox(a); c = fit(a[y0:y1, x0:x1], 500); save_rgba(c, f"{OUT}/ob/bag_back.webp"); meta["bag_back"] = {"w": c.shape[1], "h": c.shape[0]}
    return meta

# ---------- 인물 시트 ----------
def split_frames(rgba, n_expected, min_area=4000):
    m = (rgba[..., 3] > 40).astype(np.uint8)
    for k in (41, 33, 25, 17, 11, 7, 3, 51, 61):   # 프레임 수가 맞을 때까지 병합 반경을 바꿔 시도
        d = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        cnt, lab, stats, cen = cv2.connectedComponentsWithStats(d, connectivity=8)
        comps = [(i, stats[i]) for i in range(1, cnt) if stats[i][4] >= min_area * 4]
        if len(comps) == n_expected: return lab, comps
    return lab, comps

def order_grid(boxes, rows):
    """시각적 순서: 위→아래, 왼→오른"""
    ys = sorted(b["cy"] for b in boxes)
    if rows == 1: return sorted(boxes, key=lambda b: b["cx"])
    mid = (ys[0] + ys[-1]) / 2; top = sorted([b for b in boxes if b["cy"] < mid], key=lambda b: b["cx"]); bot = sorted([b for b in boxes if b["cy"] >= mid], key=lambda b: b["cx"])
    return top + bot

SPLIT_OUT = {"down", "arm_reach", "arm_drop"}
SHEETS = {  # 시트: (행 수, 프레임 이름 순서, 기준 높이를 정할 프레임)
    "player_m_actions": (2, ["idle", "hammer1", "hammer2", "kneel", "shrug", "lookback"], "idle"),
    "player_f_actions": (2, ["idle", "hammer1", "hammer2", "kneel", "shrug", "lookback"], "idle"),
    "player_m_locomotion": (2, ["walk1", "walk2", "walk3", "walk4", "jump_up", "jump_down"], "walk1"),
    "player_f_locomotion": (2, ["walk1", "walk2", "walk3", "walk4", "jump_up", "jump_down"], "walk1"),
    "father_actions": (2, ["stand", "hammer1", "hammer2", "down", "arm_reach", "arm_drop"], "stand"),   # 아래 SPLIT_OUT 프레임은 시트에서 분리 저장
    "villager_a_actions": (2, ["cheer1", "cheer2", "run1", "run2"], "cheer1"),
    "villager_b_actions": (2, ["cheer1", "cheer2", "run1", "run2"], "cheer1"),
    "villager_c_actions": (2, ["cheer1", "cheer2", "run1", "run2"], "cheer1"),
    "raider_actions": (1, ["stand", "walk1", "walk2"], "stand"),
}

def build_character(name, rows, names, ref, target_h):
    rgba = key_magenta(f"{SRC}/characters/{name}.png")
    lab, comps = split_frames(rgba, len(names))
    boxes = []
    for i, st in comps:
        mask = (lab == i) & (rgba[..., 3] > 40); ys, xs = np.where(mask)
        if len(xs) < 3000: continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        fx = (x0 + x1) // 2
        boxes.append({"x0": x0, "x1": x1, "y0": y0, "y1": y1, "cx": (x0 + x1) / 2, "cy": (y0 + y1) / 2, "fx": fx, "mask": mask})
    if len(boxes) != len(names):
        raise SystemExit(f"[{name}] 프레임 {len(boxes)}개 검출(기대 {len(names)}) — 분리 규칙 조정 필요: " + str([(b['x0'], b['y0'], b['x1'], b['y1']) for b in boxes]))
    boxes = order_grid(boxes, rows)
    refb = boxes[names.index(ref)]; scale = target_h / (refb["y1"] - refb["y0"])
    frames = []
    for b, n in zip(boxes, names):
        sub = rgba[b["y0"]:b["y1"], b["x0"]:b["x1"]].copy(); sub[..., 3] = np.where(b["mask"][b["y0"]:b["y1"], b["x0"]:b["x1"]], sub[..., 3], 0)
        k = scale; sub = np.array(Image.fromarray(sub, "RGBA").resize((max(1, round(sub.shape[1] * k)), max(1, round(sub.shape[0] * k))), Image.LANCZOS))
        frames.append({"name": n, "img": sub, "fx": round((b["fx"] - b["x0"]) * k)})
    sep = {}
    for f in [f for f in frames if f["name"] in SPLIT_OUT]:           # 누운 몸·팔 조각은 따로 저장(캔버스를 키우지 않도록)
        save_rgba(f["img"], f"{OUT}/ch/{name.split('_')[0]}_{f['name']}.webp"); sep[f["name"]] = {"w": f["img"].shape[1], "h": f["img"].shape[0]}
    frames = [f for f in frames if f["name"] not in SPLIT_OUT]
    # 공통 캔버스: 발 기준점(fx) 가운데 정렬 → 모든 프레임의 접지점이 같은 줄
    half = max(max(f["fx"] for f in frames), max(f["img"].shape[1] - f["fx"] for f in frames)); left = half; ch = max(f["img"].shape[0] for f in frames); cw = 2 * half   # 접지점이 칸 가운데
    strip = np.zeros((ch, cw * len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        h, w = f["img"].shape[:2]; ox = i * cw + (left - f["fx"]); strip[ch - h:ch, ox:ox + w] = f["img"]
    save_rgba(strip, f"{OUT}/ch/{name}.webp")
    return {"frames": len(frames), "names": [f["name"] for f in frames], "separate": sep, "cw": cw, "ch": ch, "standH": target_h, "foot": left}

def build_characters():
    meta = {}
    for name, (rows, names, ref) in SHEETS.items():
        meta[name] = build_character(name, rows, names, ref, 300)  # 변환본은 높이 300px 기준(게임에서 150으로 표시 → 2배 해상도)
    a = key_magenta(f"{SRC}/characters/festival_child.png"); x0, y0, x1, y1 = bbox(a); a = a[y0:y1, x0:x1]; k = 236 / a.shape[0]   # 어린이: 한 장(표시 높이 118)
    a = np.array(Image.fromarray(a, "RGBA").resize((round(a.shape[1] * k), 236), Image.LANCZOS)); w = a.shape[1] + (a.shape[1] % 2); c = np.zeros((236, w, 4), np.uint8); c[:, :a.shape[1]] = a
    save_rgba(c, f"{OUT}/ch/festival_child.webp"); meta["festival_child"] = {"frames": 1, "names": ["stand"], "separate": {}, "cw": w, "ch": 236, "standH": 236, "foot": w // 2}
    return meta

if __name__ == "__main__":
    what = sys.argv[3] if len(sys.argv) > 3 else "all"
    meta = {}
    if what in ("all", "bg"): meta["bg"] = build_backgrounds()
    if what in ("all", "ob"): meta["ob"] = build_objects()
    if what in ("all", "ch"): meta["ch"] = build_characters()
    p = f"{OUT}/meta_{what}.json"; json.dump(meta, open(p, "w"), ensure_ascii=False, indent=1); print(json.dumps(meta, ensure_ascii=False)[:600])
    if what == "all":   # 게임이 읽는 메타(프레임 이름·캔버스 크기·배경 폭)
        js = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(OUT))), "js", "prologue", "artmeta.js")
        open(js, "w").write("/* tools/build_prologue_art.py가 만든 파일입니다. 직접 고치지 마세요. */\nwindow.AU = window.AU || {};\nAU.PRO_ART = " + json.dumps(meta, ensure_ascii=False) + ";\n")
