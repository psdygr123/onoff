#!/usr/bin/env python3
"""아우텔리아 도입 영상 8컷판(기록관판) 조립.
- 기존 영상(intro.mp4, 13장면)에서 그대로 쓸 장면은 잘라서 쓰고, 그림을 새로 그린 장면은 build_intro.py 의 연출로 새로 렌더링한 뒤 0.9초 겹침 전환으로 이어 붙입니다.
- 자막은 영상에 입히지 않고 intro_timeline.js(게임이 띄움)에만 씁니다.
사용:
  python3 assemble_intro_v2.py <작업폴더> <기존intro.mp4> <새그림폴더> <출력폴더> [--placeholder]
    --placeholder: 새 그림이 아직 없을 때 기존 장면으로 대신 채워 조립·타이밍만 시험(최종본 아님)
"""
import sys, os, json, subprocess, shutil
os.environ.setdefault("INTRO_NOSUB", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_intro as B

OV, FPS, TEMPO = 0.9, 30, 1.35
BASE_D = [6.5, 7, 6, 7, 6.5, 5.5, 6.5, 6.5, 7, 7, 6, 5.5, 7]          # 기존 13장면의 길이(배율 적용 전)
OLD_D = [round(d * TEMPO, 2) for d in BASE_D]
OLD_T0 = [sum(OLD_D[j] - OV for j in range(i)) for i in range(13)]       # 기존 영상에서 장면 i의 시작 시각

def old_range(a, b, trim_head):
    """기존 영상의 장면 a..b(0부터, 포함) 구간. 앞 장면과 섞인 첫 0.9초는 trim_head 이면 잘라 냄."""
    s = OLD_T0[a] + (OV if trim_head else 0)
    e = OLD_T0[b] + (OLD_D[b] - OV if b < 12 else OLD_D[b])
    return s, e

# 새로 그리는 장면(그림 파일명, 연출 값은 기존 장면에서 가져옴). 달·별 없이, 어둠 쪽에 검은 고리(확정 33)
NEW = {
 "war":     dict(img="V2_great_war",   D=6.5, z=(1.0, 1.10), c=((.5, .5), (.5, .46)), drift=dict(kind="sky", frac=.7, amp=9), glow=[("thread", .5, 0, .72)], motes=90, flash=True, sub=[]),
 "heroes":  dict(img="V2_five_heroes", D=5.5, z=(1.0, 1.13), c=((.5, .5), (.38, .66)), drift=dict(kind="sky", frac=.6, amp=5), glow=[("sun", .05, .62, .35)], motes=50, sub=[]),
 "advance": dict(img="V2_advance",     D=6.5, z=(1.0, 1.10), c=((.5, .5), (.46, .68)), drift=dict(kind="sky", frac=.66, amp=7), glow=[("sun", .04, .62, .3)], motes=80, sub=[]),
 "victory": dict(img="V2_victory",     D=6.5, z=(1.0, 1.07), c=((.5, .5), (.47, .51)), drift=dict(kind="sky", frac=.70, amp=5), glow=[("thread", .497, 0, .72)], motes=85, victory=(1.0, 5.2), sub=[]),
 "brand":   dict(img="V2_brand",       D=7.0, z=(1.0, 1.08), c=((.5, .5), (.5, .55)), drift=dict(kind="sky", frac=.6, amp=5), glow=[("sun", .5, .35, .25)], motes=50, sub=[]),
}
# 자막 8컷(확정 17:21). 5번의 "기록은"은 뺌
CUTS = [
 ["하나의 신이 세상을 만들었다고 전해진다."],
 ["신은 세상에 빛과 어둠을 두었다."],
 ["어느 날 어둠이 신을 죽이고", "빛마저 삼키려 했다."],
 ["빛은 사람들에게 힘을 나누어 주었고,", "다섯 용사가 앞장섰다."],
 ["다섯 용사가 어둠을 물리쳤다고 전해진다."],
 ["어둠이 사라지기 전, 용사들에게 낙인이 남았고", "그들의 힘은 봉인되었다."],
 ["세상은 빛으로 덮였고,", "용사들은 잊혀 갔다."],
 ["그로부터 천 년, 아르케아 마을에서는", "빛의 승리를 기리는 신전을 짓고 있다."],
]
# 조립 순서: (종류, 이름/범위, 속하는 자막 컷 번호들)
PARTS = [
 ("old", (0, 1, False), [0, 1]),
 ("new", "war", [2]),
 ("new", "heroes", [3]),
 ("new", "advance", [4]),
 ("new", "victory", [4]),
 ("new", "brand", [5]),
 ("old", (8, 8, True), [6]),
 ("old", (11, 12, True), [7]),
]
PLACEHOLDER = {"war": (4, 4), "heroes": (5, 5), "advance": (6, 6), "victory": (7, 7), "brand": (3, 3)}

def run(cmd): subprocess.check_call(cmd)
def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).decode())

def cut_old(src, a, b, trim, out):
    s, e = old_range(a, b, trim)
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{s:.3f}", "-to", f"{e:.3f}", "-i", src, "-an", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS), out])

def render_new(name, imgdir, out, work):
    spec = dict(NEW[name]); spec["D"] = round(spec["D"] * TEMPO, 2)
    if spec.get("victory"): spec["victory"] = (spec["victory"][0] * TEMPO, spec["victory"][1] * TEMPO)
    B.IMG = imgdir; B.SCENES = [spec]; B._cache.clear()
    B.frame = lambda i, t: B.base_frame(i, t)          # 이어 붙일 때 겹침 전환을 하므로 장면 단독 렌더(검은 화면에서 시작하지 않음)
    B.length = lambda i: B.SCENES[i]["D"]
    B.render_scene(0, work)
    shutil.move(f"{work}/s00.mp4", out)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]; ph = "--placeholder" in sys.argv
    work, src, imgdir, outdir = args[:4]; os.makedirs(work, exist_ok=True); os.makedirs(outdir, exist_ok=True)
    files = []
    for k, (kind, v, _) in enumerate(PARTS):
        f = f"{work}/p{k:02d}.mp4"; files.append(f)
        if os.path.exists(f): continue
        if kind == "old": cut_old(src, v[0], v[1], v[2], f)
        elif ph: cut_old(src, *PLACEHOLDER[v], True, f)
        else: render_new(v, imgdir, f, work)
    d = [dur(f) for f in files]
    # 겹침 전환으로 이어 붙임
    inputs = sum([["-i", f] for f in files], []); flt = []; cur = "0:v"; total = d[0]; offs = [0.0]
    for k in range(1, len(files)):
        off = total - OV; offs.append(off); flt.append(f"[{cur}][{k}:v]xfade=transition=fade:duration={OV}:offset={off:.3f}[x{k}]"); cur = f"x{k}"; total = off + d[k]
    out_mp4 = f"{outdir}/intro.mp4"; out_webm = f"{outdir}/intro.webm"
    run(["ffmpeg", "-y", "-loglevel", "error"] + inputs + ["-filter_complex", ";".join(flt), "-map", f"[{cur}]", "-an", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-profile:v", "baseline", "-level", "3.0", "-movflags", "+faststart", out_mp4])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", out_mp4, "-an", "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1", out_webm])
    # 자막 타이밍: 장면 시작 +0.7초에 나타나 다음 장면 겹침 직전(−0.9−0.3)에 사라짐. 첫 컷은 1.3초, 마지막은 영상 끝 +0.2초
    cuts = [None] * len(CUTS)
    for k, (_, _, cs) in enumerate(PARTS):
        for c in cs:
            a = offs[k] + (1.3 if k == 0 else 0.7) if cuts[c] is None else cuts[c]["start"]
            b = (total + 0.2) if k == len(PARTS) - 1 else offs[k] + d[k] - OV - 0.3
            cuts[c] = dict(start=round(a, 2), end=round(b, 2), lines=CUTS[c])
    # 조각 0 = 기존 장면 0·1 이라 컷 0·1 의 시작·끝을 장면 경계에 맞춰 따로 잡음
    cuts[0]["end"] = round(OLD_T0[1] - 0.3, 2)
    cuts[1]["start"] = round(OLD_T0[1] + 0.7, 2)
    js = "/* 도입 영상 자막 타이밍(tools/intro_video/assemble_intro_v2.py 가 만든 값). 자막 8컷(기록관판 공식 역사, 확정 17:21) */\nwindow.AU = window.AU || {};\nAU.INTRO = " + json.dumps(dict(total=round(total, 2), cuts=cuts), ensure_ascii=False, indent=1) + ";\n"
    open(f"{outdir}/intro_timeline.js", "w", encoding="utf-8").write(js)
    print("parts", [round(x, 2) for x in d], "offs", [round(x, 2) for x in offs], "total", round(total, 2))

if __name__ == "__main__": main()
