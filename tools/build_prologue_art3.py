#!/usr/bin/env python3
"""아우텔리아 프롤로그 NPC 다양화 패키지(주민 10종) 변환 도구.
사용: python3 tools/build_prologue_art3.py <NPC 원화 폴더(Autelia_NPC_Diversity)> <출력 폴더(games/autelia/assets/prologue)>
 - 시트(2열×2행: 환호1·환호2·도주1·도주2)의 마젠타 배경을 제거하고 프레임을 분리, 발 기준으로 정렬해 ch/villager_?_actions.webp 로 저장
 - 크기: 환호 때 팔·모자까지 포함한 높이가 아니라 '도주1 프레임의 몸높이'를 기준으로 맞춤.
   기존 성인 주민(a·b·c)의 도주1 몸높이는 시트 기준 약 282px(환호1을 300px로 맞춘 결과)이므로, 각 인물의 몸높이 = 282 × manifest 의 relative_height
 - 게임이 읽는 메타(js/prologue/artmeta.js)에 시트 정보를 덧붙입니다(기존 항목은 유지). build_prologue_art.py all 을 다시 돌렸다면 이 도구도 다시 실행하세요.
"""
import sys, os, json, re
SRC = sys.argv[1]; OUT = sys.argv[2]
sys.argv = [sys.argv[0], SRC, OUT]            # build_prologue_art 의 SRC(= {SRC}/characters/*.png)·OUT 을 이 도구의 인자로 맞춤
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_prologue_art as B

ADULT_BODY = 282
NAMES = ["cheer1", "cheer2", "run1", "run2"]
man = json.load(open(f"{SRC}/manifest.json", encoding="utf-8"))
meta = {}
for m in man:
    name = os.path.basename(m["file"]).replace(".png", "")
    meta[name] = B.build_character(name, 2, NAMES, "run1", round(ADULT_BODY * m["relative_height"]))
    print(name, m["character"], meta[name]["cw"], meta[name]["ch"])
js = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(OUT))), "js", "prologue", "artmeta.js")
txt = open(js, encoding="utf-8").read(); mm = re.search(r"AU\.PRO_ART = (\{.*\});", txt, re.S); art = json.loads(mm.group(1)); art["ch"].update(meta)
open(js, "w", encoding="utf-8").write("/* tools/build_prologue_art.py(+ build_prologue_art3.py)가 만든 파일입니다. 직접 고치지 마세요. */\nwindow.AU = window.AU || {};\nAU.PRO_ART = " + json.dumps(art, ensure_ascii=False) + ";\n")
