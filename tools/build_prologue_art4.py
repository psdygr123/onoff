#!/usr/bin/env python3
"""아우텔리아 프롤로그 NPC 초상화 4장 + 대기 자세 시트 6장 변환 도구.
사용: python3 tools/build_prologue_art4.py <Autelia_NPC_Portraits_Idle 폴더> <출력 폴더(games/autelia/assets/prologue)>
 - portraits/*.png → pt/pt_pro_*.webp (512×512). 마젠타 제거 후 머리 위끝 기준 정사각형(build_prologue_art2.py 의 초상화와 같은 규칙)
 - idle/villager_?_idle.png (1열×2행: 정지·작은 자세 변화) → ch/villager_?_idle.webp (가로 2프레임 스트립). 두 프레임의 발 위치를 같은 점에 맞춤.
 - 크기: 같은 인물의 기존 달리기1(run1) 프레임 높이 × RUN_TO_STAND(달리기는 무릎이 굽고 몸이 기울어 서 있을 때보다 낮음)로 맞춥니다.
   run1·idle 모두 모자·소품을 포함한 전체 높이이므로 모자·소품 때문에 크기가 달라지지 않습니다.
 - 게임이 읽는 js/prologue/artmeta.js 에 시트 정보를 덧붙입니다(기존 항목 유지). build_prologue_art.py all 을 다시 돌렸다면 이 도구도 다시 실행하세요.
"""
import sys, os, json, re
import numpy as np
from PIL import Image
SRC = sys.argv[1]; OUT = sys.argv[2]
sys.argv = [sys.argv[0], SRC, OUT]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_prologue_art as B

RUN_TO_STAND = 1.04
PORTRAITS = ["pt_pro_farmer", "pt_pro_priest", "pt_pro_musician", "pt_pro_scribe"]
IDLES = ["b", "c", "d", "f", "j", "k"]
# 일부 인물만 새로 변환할 때(예: 광장 신규 NPC): ART4_PORTRAITS="pt_pro_traveler,pt_pro_florist" ART4_IDLES="g,l" python3 tools/build_prologue_art4.py ...
if os.environ.get("ART4_PORTRAITS") is not None: PORTRAITS = [x for x in os.environ["ART4_PORTRAITS"].split(",") if x]
if os.environ.get("ART4_IDLES") is not None: IDLES = [x for x in os.environ["ART4_IDLES"].split(",") if x]

def portrait(name, size=512):
    a = B.key_magenta(f"{SRC}/portraits/{name}.png"); x0, y0, x1, y1 = B.bbox(a)
    side = int(max(x1 - x0, (y1 - y0) * 0.92)); cx = (x0 + x1) // 2; sx0 = cx - side // 2; sy0 = y0
    canvas = np.zeros((side, side, 4), np.uint8)
    xs0, xs1 = max(0, sx0), min(a.shape[1], sx0 + side); ys0, ys1 = max(0, sy0), min(a.shape[0], sy0 + side)
    canvas[ys0 - sy0:ys1 - sy0, xs0 - sx0:xs1 - sx0] = a[ys0:ys1, xs0:xs1]
    c = np.array(Image.fromarray(canvas, "RGBA").resize((size, size), Image.LANCZOS)); B.save_rgba(c, f"{OUT}/pt/{name}.webp"); print(name, size)

def run1_height(k):
    """기존 actions 스트립에서 run1(3번째 칸)의 실루엣 높이"""
    meta = json.load(open(ART_JS_META))["ch"][f"villager_{k}_actions"]
    im = np.array(Image.open(f"{OUT}/ch/villager_{k}_actions.webp").convert("RGBA")); cw = meta["cw"]; i = meta["names"].index("run1")
    cell = im[:, i * cw:(i + 1) * cw]; ys, xs = np.where(cell[..., 3] > 40); return ys.max() - ys.min() + 1

def idle(k):
    rgba = B.key_magenta(f"{SRC}/idle/villager_{k}_idle.png")
    h = rgba.shape[0]; halves = [rgba[:h // 2], rgba[h // 2:]]; frames = []
    for part in halves:
        m = part[..., 3] > 40; ys, xs = np.where(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        low = np.where(m[y1 - max(6, (y1 - y0) // 14):y1])[1]; fx = int(low.mean()) - x0          # 발(맨 아래 약 7%)의 가운데 = 접지 기준
        sub = part[y0:y1, x0:x1].copy(); sub[..., 3] = np.where(m[y0:y1, x0:x1], sub[..., 3], 0); frames.append({"img": sub, "fx": fx})
    target = round(run1_height(k) * RUN_TO_STAND); scale = target / frames[0]["img"].shape[0]
    for f in frames:
        s = f["img"]; f["img"] = np.array(Image.fromarray(s, "RGBA").resize((max(1, round(s.shape[1] * scale)), max(1, round(s.shape[0] * scale))), Image.LANCZOS)); f["fx"] = round(f["fx"] * scale)
    half = max(max(f["fx"] for f in frames), max(f["img"].shape[1] - f["fx"] for f in frames)); ch = max(f["img"].shape[0] for f in frames); cw = 2 * half
    strip = np.zeros((ch, cw * 2, 4), np.uint8)
    for i, f in enumerate(frames):
        hh, ww = f["img"].shape[:2]; ox = i * cw + (half - f["fx"]); strip[ch - hh:ch, ox:ox + ww] = f["img"]
    B.save_rgba(strip, f"{OUT}/ch/villager_{k}_idle.webp"); print(f"villager_{k}_idle", cw, ch, "target", target)
    return {"frames": 2, "names": ["idle1", "idle2"], "separate": {}, "cw": cw, "ch": ch, "standH": target, "foot": half}

if __name__ == "__main__":
    js = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(OUT))), "js", "prologue", "artmeta.js")
    txt = open(js, encoding="utf-8").read(); art = json.loads(re.search(r"AU\.PRO_ART = (\{.*\});", txt, re.S).group(1))
    ART_JS_META = OUT + "/_artmeta_tmp.json"; json.dump(art, open(ART_JS_META, "w"))
    try:
        for p in PORTRAITS: portrait(p)
        for k in IDLES: art["ch"][f"villager_{k}_idle"] = idle(k)
    finally:
        os.remove(ART_JS_META)
    open(js, "w", encoding="utf-8").write("/* tools/build_prologue_art.py(+ build_prologue_art3.py, build_prologue_art4.py)가 만든 파일입니다. 직접 고치지 마세요. */\nwindow.AU = window.AU || {};\nAU.PRO_ART = " + json.dumps(art, ensure_ascii=False) + ";\n")
