#!/usr/bin/env python3
"""척도 문항 데이터(js/scales/*.js)가 원본 PDF 텍스트와 글자 단위로 같은지 확인한다.
사용: python3 tools/verify_scale_text.py /경로/PSS10_Korean_Park_Seo.pdf   (pdftotext 필요)
공백·줄바꿈 차이는 무시하고, 글자·구두점은 정확히 비교한다."""
import re, subprocess, sys, json
pdf = sys.argv[1]
src = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
norm = lambda s: re.sub(r"\s+", "", s)
# 문항 행: 번호로 시작하고 끝에 0 1 2 3 4가 붙는 줄(두 줄에 걸친 문항 포함)
body = src.split("0=전혀 아니다")[1] if "0=전혀 아니다" in src else src
lines = body.split("\n"); rows = []; cur = None
SC = re.compile(r"\s{2,}0\s+1\s+2\s+3\s+4\s*$")
for ln in lines:
    m = re.match(r"^\s*(\d{1,2})\s{2,}(.*)$", ln)
    if m and int(m.group(1)) == len(rows) + 1 and cur is None:
        cur = [int(m.group(1)), SC.sub("", m.group(2)).strip()]
        if cur[1].endswith("?"): rows.append(cur); cur = None
    elif cur is not None and ln.strip():
        cur[1] += " " + SC.sub("", ln).strip()
        if cur[1].endswith("?"): rows.append(cur); cur = None
js = open("games/autelia/js/scales/pss10_ko_park_seo_2010.js", encoding="utf-8").read()
data = re.findall(r'n: (\d+), subscale: "\w+", reversed: (?:true|false), text: "([^"]+)"', js)
ok = True
if len(rows) != 10 or len(data) != 10: print("문항 수 불일치", len(rows), len(data)); ok = False
for (n, t), (pn, pt) in zip(data, rows):
    same = int(n) == pn and norm(t) == norm(pt)
    ok &= same; print(("OK  " if same else "DIFF"), n, "" if same else "\n  데이터: " + t + "\n  원본  : " + pt)
ins = re.search(r'instruction: "([^"]+)"', js).group(1)
ins_ok = norm(ins) in norm(src); ok &= ins_ok; print("지시문", "OK" if ins_ok else "DIFF")
for lab in ["전혀 아니다", "거의 아니다", "가끔", "꽤 자주", "매우 자주"]:
    ok &= lab in js and lab in src
print("RESULT", "전체 일치" if ok else "불일치 있음"); sys.exit(0 if ok else 1)

