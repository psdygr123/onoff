#!/usr/bin/env python3
"""아우텔리아 도입 영상 시안 제작(정지 그림 + 코드 연출 + 자막). 힉스필드 없이 만드는 무음 시안입니다.
사용:
  python3 build_intro.py frames <출력폴더> <장면번호> <시각...>     # 확인용 프레임 PNG
  python3 build_intro.py scene  <작업폴더> <장면번호>               # 장면 1개를 mp4로(앞 장면과의 겹침 전환 포함)
  python3 build_intro.py all    <작업폴더> <출력.mp4>               # 전체(2개 프로세스 병렬) + 이어 붙이기
그림 위치와 자막 문장은 아래 SCENES 에서 고칩니다. 자막은 시험용으로 영상에 입히며, 게임 연결 때는 자막 문장만 게임이 띄웁니다.
"""
import sys, os, math, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
IMG = os.environ.get("INTRO_IMG", "/tmp/claude-0/intro_img")
W, H, FPS, OV = 1280, 720, 30, 0.9
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"
SCENES = [
 dict(img="N1_god_light", D=6.5, z=(1.0, 1.09), c=((.5, .5), (.5, .5)), drift=dict(kind="ring", amp=5), glow=[("ring", .5, .5, .168)], motes=70,
      sub=["처음에는 이름도 모양도 없는", "하나의 신만 있었다."]),
 dict(img="N2_split_light_dark", D=7.0, z=(1.0, 1.08), c=((.5, .5), (.5, .52)), drift=dict(kind="sky", frac=.8, amp=5), glow=[("ring", .5, .5, .16), ("thread", .5, .70, .86)], motes=60,
      sub=["신은 자신의 힘을 둘로 갈라,", "하나는 환하게 하나는 고요하게 빚었다."]),
 dict(img="01_creation_tapestry", D=6.0, z=(1.0, 1.07), c=((.5, .5), (.47, .52)), drift=dict(kind="sky", frac=.66, amp=5), glow=[("thread", .497, 0, .72)], motes=70,
      sub=["신은 둘 사이에 땅을 펼치고,", "‘서로의 것에 손대지 말라’는 약속만 남긴 채 잠들었다."]),
 dict(img="N3_desire", D=7.0, z=(1.0, 1.08), c=((.5, .5), (.5, .5)), drift=dict(kind="sky", frac=.66, amp=7), glow=[("thread", .497, 0, .72, "flicker")], motes=45,
      sub=["그러나 빛과 어둠은 서로의 것을 탐냈고,", "다툼은 천 년을 이어졌다."]),
 dict(img="N4_great_war", D=6.5, z=(1.0, 1.10), c=((.5, .5), (.5, .46)), drift=dict(kind="sky", frac=.7, amp=9), glow=[("thread", .5, 0, .72)], motes=90, flash=True,
      sub=["백 년 전, 어둠이 먼저 경계를 넘어", "대전쟁이 시작되었다."]),
 dict(img="N4b_five_heroes", D=5.5, z=(1.0, 1.13), c=((.5, .5), (.38, .66)), drift=dict(kind="sky", frac=.6, amp=5), glow=[("sun", .05, .62, .35)], motes=50,
      sub=["빛의 신 곁에 다섯 영웅이 나섰다."]),
 dict(img="02_light_and_darkness", D=6.5, z=(1.0, 1.07), c=((.5, .5), (.47, .51)), drift=dict(kind="sky", frac=.70, amp=5), glow=[("thread", .497, 0, .72)], motes=85, victory=(1.0, 5.2),
      sub=["마지막 새벽, 빛이 이겼다."]),
 dict(img="N5_erased_monument", D=6.0, z=(1.0, 1.08), c=((.5, .5), (.5, .56)), drift=dict(kind="sky", frac=.4, amp=4), glow=[("sun", .06, .32, .3)], motes=45,
      sub=["마을마다 비석이 세워졌다.", "이 평화를 잊지 말라고."]),
 dict(img="03_village_tapestry", D=5.5, z=(1.0, 1.10), c=((.5, .5), (.56, .58)), drift=dict(kind="sky", frac=.38, amp=4), glow=[("sun", .06, .36, .3)], motes=50,
      sub=["그로부터 백 년, 사람들은 다시 삶을 일구었다."]),
 dict(img="04_village_watercolor", D=7.0, z=(1.0, 1.08), c=((.5, .5), (.56, .56)), drift=dict(kind="sky", frac=.38, amp=3), glow=[("sun", .07, .48, .3)], motes=40, last=True,
      sub=["그리고 오늘, 아르케아 마을은", "빛의 승리 백 주년 축제를 맞이한다."]),
]
ease = lambda x: x * x * (3 - 2 * x)
_cache = {}

def subtitle_rgba(lines, size=34):
    font = ImageFont.truetype(FONT, size); im = Image.new("RGBA", (W, 170), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    y = 170 - len(lines) * (size + 14) - 20
    for ln in lines:
        x = (W - d.textlength(ln, font=font)) / 2
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2), (-2, 2), (2, -2), (0, 3), (3, 3)]: d.text((x + dx, y + dy), ln, font=font, fill=(20, 12, 5, 235))
        d.text((x, y), ln, font=font, fill=(255, 246, 225, 255)); y += size + 14
    return np.array(im).astype(np.float32) / 255

def noise(seed, gw, gh, sw, sh):
    return cv2.resize(np.random.default_rng(seed).standard_normal((gh, gw)).astype(np.float32), (sw, sh), interpolation=cv2.INTER_CUBIC)

def prep(i):
    if i in _cache: return _cache[i]
    s = SCENES[i]; img = cv2.cvtColor(cv2.imread(f"{IMG}/{s['img']}.png"), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    sh, sw = img.shape[:2]; yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32); d = s["drift"]
    if d["kind"] == "sky": mask = np.clip((d["frac"] - yy / sh) / 0.12, 0, 1)
    else: mask = np.clip((np.hypot(xx - sw / 2, yy - sh / 2) - sw * 0.2) / 140, 0, 1)
    c = dict(img=img, sw=sw, sh=sh, xx=xx, yy=yy, mask=mask, n=[noise(k, 10, 6, sw, sh) for k in (1, 2, 3, 4)], sub=subtitle_rgba(s["sub"]))
    rng = np.random.default_rng(5 + i); c["motes"] = [dict(x=rng.uniform(0, W), y=rng.uniform(0, H), s=rng.uniform(.8, 2.6), v=rng.uniform(6, 22), ph=rng.uniform(0, 6.28), sw=rng.uniform(8, 26)) for _ in range(s["motes"])]
    if s.get("victory"):
        L = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]; Lg = np.clip(L, 0, 1) ** 0.50
        lo = np.array([.38, .22, .09]); mid = np.array([.90, .60, .26]); hi = np.array([1., .90, .62]); t1 = np.clip(Lg * 2, 0, 1)[..., None]; t2 = np.clip(Lg * 2 - 1, 0, 1)[..., None]
        wm = lo * (1 - t1) + mid * t1; wm = wm * (1 - t2) + hi * t2; c["warm"] = np.clip(wm * .75 + img * .25 * np.array([1.1, 1., .8]), 0, 1).astype(np.float32)
        c["edge"] = cv2.resize(np.random.default_rng(11).standard_normal((9, 16)).astype(np.float32), (sw, sh), interpolation=cv2.INTER_CUBIC)
    _cache[i] = c; return c

def base_frame(i, t):
    s = SCENES[i]; c = prep(i); img, sw, sh, xx, yy = c["img"], c["sw"], c["sh"], c["xx"], c["yy"]; D = s["D"]; u = ease(min(1, t / D))
    pulse = .55 + .45 * math.sin(t * 1.7); add = np.zeros((sh, sw), np.float32); col = np.array([1., .82, .45], np.float32); p = 0.
    for g in s["glow"]:
        k = g[0]
        if k == "thread":
            tx, y0, y1 = g[1] * sw, g[2] * sh, g[3] * sh; v = np.exp(-((xx - tx) / (9 + 7 * pulse)) ** 2) * np.clip((yy - y0) / 40, 0, 1) * np.clip((y1 - yy) / 90, 0, 1)
            if len(g) > 4: v = v * np.clip(.5 + 1.4 * np.sin(yy * .035 + t * 2.3) * np.sin(yy * .011 - t * 1.1), 0, 1) * (.75 + .25 * math.sin(t * 9))
            add += v * (.14 + .22 * pulse)
        elif k == "ring":
            cx, cy, r = g[1] * sw, g[2] * sh, g[3] * sw; add += np.exp(-((np.hypot(xx - cx, yy - cy) - r) / (14 + 6 * pulse)) ** 2) * (.10 + .20 * pulse)
        elif k == "sun":
            cx, cy, r = g[1] * sw, g[2] * sh, g[3] * sw; add += np.exp(-(np.hypot(xx - cx, yy - cy) / r) ** 2) * (.10 + .10 * math.sin(t * 1.2 + 1))
    if s.get("flash"): add += np.exp(-((xx - sw * .5) / 260) ** 2) * np.clip(1 - yy / sh * 1.1, 0, 1) * (.06 + .05 * math.sin(t * 3.3))
    a = t * .35; amp = s["drift"]["amp"]; m = c["mask"]; n = c["n"]
    dx = (n[0] * math.cos(a) + n[1] * math.sin(a)) * amp * m; dy = (n[2] * math.cos(a) + n[3] * math.sin(a)) * amp * .55 * m
    src = img
    if s.get("victory"):
        t0, t1 = s["victory"]; p = ease(np.clip((t - t0) / (t1 - t0), 0, 1)); front = -.25 * sw + p * 1.5 * sw + 70 * c["edge"]
        mm = np.clip((front - xx) / (190 + 60 * (1 - p)), 0, 1); src = img * (1 - mm[..., None]) + c["warm"] * mm[..., None]
        add += np.exp(-((xx - (front - 60)) / 130) ** 2) * np.clip(1 - yy / sh * .9, 0, 1) * .22 * math.sin(math.pi * p)
    mix = cv2.remap(src, (xx + dx).astype(np.float32), (yy + dy).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT) + add[..., None] * col
    mix = np.clip(mix, 0, 1)
    z = s["z"][0] + (s["z"][1] - s["z"][0]) * u; (cx0, cy0), (cx1, cy1) = s["c"]; cx = (cx0 + (cx1 - cx0) * u); cy = (cy0 + (cy1 - cy0) * u)
    hx, hy = .5 / z, .5 / z; cx = min(max(cx, hx), 1 - hx) * sw; cy = min(max(cy, hy), 1 - hy) * sh
    M = np.array([[z * W / sw, 0, W / 2 - z * W / sw * cx], [0, z * H / sh, H / 2 - z * H / sh * cy]], np.float32)
    out = cv2.warpAffine(mix, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    layer = np.zeros((H, W, 3), np.float32); pp = float(p) if s.get("victory") else 1.
    for mo in c["motes"]:
        x = (mo["x"] + math.sin(t * .6 + mo["ph"]) * mo["sw"]) % W; y = (mo["y"] - mo["v"] * t) % H; tw = .45 + .55 * math.sin(t * 2.1 + mo["ph"] * 2); r = mo["s"]; al = tw * (.25 + .75 * min(1, t / 2.5)) * (.35 + .65 * pp)
        cv2.circle(layer, (int(x), int(y)), max(1, int(r + 1.5)), (al * .35, al * .28, al * .16), -1, cv2.LINE_AA); cv2.circle(layer, (int(x), int(y)), max(1, int(r * .7)), (al, .88 * al, .55 * al), -1, cv2.LINE_AA)
    out = np.clip(out + cv2.GaussianBlur(layer, (0, 0), 1.1) * .9, 0, 1)
    sa = np.clip((t - .7) / .5, 0, 1) * np.clip((D - .9 - t) / .4, 0, 1) if not s.get("last") else np.clip((t - .7) / .5, 0, 1)
    if sa > 0: y0 = H - 170; al = c["sub"][..., 3:4] * sa; out[y0:H] = out[y0:H] * (1 - al) + c["sub"][..., :3] * al
    return out

def frame(i, t):
    """장면 i의 로컬 시각 t. 앞 장면과의 겹침 구간(0~OV)은 앞 장면 끝 부분과 섞음."""
    out = base_frame(i, t)
    if i == 0: return out * np.clip(t / .8, 0, 1)
    if t < OV:
        prev = base_frame(i - 1, SCENES[i - 1]["D"] - OV + t); a = ease(t / OV); out = prev * (1 - a) + out * a
    return out

def length(i): return SCENES[i]["D"] if i == len(SCENES) - 1 else SCENES[i]["D"] - OV

def render_scene(i, work):
    final = f"{work}/s{i:02d}.mp4"; tmp = f"{work}/s{i:02d}.tmp.mp4"; n = int(round(length(i) * FPS))
    pr = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for k in range(n): pr.stdin.write((np.clip(frame(i, k / FPS), 0, 1) * 255 + .5).astype(np.uint8).tobytes())
    pr.stdin.close()
    if pr.wait() == 0: os.rename(tmp, final); print("scene", i, "ok", n, "frames", flush=True)
    else: sys.exit(1)

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "frames":
        out = sys.argv[2]; os.makedirs(out, exist_ok=True); i = int(sys.argv[3])
        for t in map(float, sys.argv[4:]): cv2.imwrite(f"{out}/s{i:02d}_{t:.1f}.png", cv2.cvtColor((np.clip(frame(i, t), 0, 1) * 255 + .5).astype(np.uint8), cv2.COLOR_RGB2BGR))
    elif mode == "scenes":
        for k in sys.argv[3:]: render_scene(int(k), sys.argv[2])
    elif mode == "scene": os.makedirs(sys.argv[2], exist_ok=True); render_scene(int(sys.argv[3]), sys.argv[2])
    else:
        work, outp = sys.argv[2], sys.argv[3]; os.makedirs(work, exist_ok=True); me = os.path.abspath(__file__); ps = []
        todo = [i for i in range(len(SCENES)) if not os.path.exists(f"{work}/s{i:02d}.mp4")]
        for grp in (todo[0::2], todo[1::2]): ps.append(subprocess.Popen(["python3", me, "scenes", work] + [str(x) for x in grp])) if grp else None
        for p in ps: p.wait()
        lst = f"{work}/list.txt"; open(lst, "w").write("".join(f"file 's{i:02d}.mp4'\n" for i in range(len(SCENES))))
        subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", outp]); print("ok", outp)
