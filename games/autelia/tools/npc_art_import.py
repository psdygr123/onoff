#!/usr/bin/env python3
"""NPC 그림 반영 도구: GPT가 준 마젠타(#FF00FF) 배경 그림을 게임용 투명 webp로 바꿉니다.

사용법
  python3 tools/npc_art_import.py walk  <원본.png> <이름>    -> assets/char/<이름>.webp      (세로 330px, 여백 없이 잘라냄)
  python3 tools/npc_art_import.py port  <원본.png> <이름>    -> assets/portrait/<이름>.webp  (512x600, 머리 위쪽 기준)
  python3 tools/npc_art_import.py obj   <원본.png> <이름>    -> assets/object/<이름>.webp    (가로 최대 640px, 조사 지점·소품 그림. 이름 예: spot_hide_gate)
  예) walk npc_peddler_gpt.png npc_peddler / port pt_npc_peddler_gpt.png npc_peddler

처리: 마젠타 제거(가장자리는 부드럽게, 마젠타 번짐은 제거), 걷는 그림은 내용물 경계로 자르기,
초상화는 가운데를 512:600 비율로 잘라 크기 맞춤. 결과는 /tmp/npc_art_preview_<이름>.png 에 회색 배경으로도 저장해 눈으로 확인합니다.
"""
import sys
import numpy as np
from PIL import Image

ROOT = __file__.rsplit("/tools/", 1)[0]


def key_out(im):
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # 마젠타 정도: 빨강·파랑이 초록보다 얼마나 큰가(둘 다 높고 초록이 낮을수록 1에 가까움)
    mag = np.minimum(r, b) - g
    mag = np.clip(mag, 0, 255)
    alpha = 1.0 - np.clip((mag - 70.0) / (150.0 - 70.0), 0, 1)
    out = a.copy()
    # 가장자리(반투명) 픽셀은 마젠타 번짐을 초록 쪽으로 눌러 제거
    edge = (alpha > 0) & (alpha < 1)
    spill = np.clip(np.minimum(r, b) - g, 0, None)
    for ch in (0, 2):
        out[..., ch] = np.where(edge | (mag > 40), out[..., ch] - spill * 0.85, out[..., ch])
    out = np.clip(out, 0, 255)
    rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def crop_content(im, pad=2):
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 24)
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad))
    return im.crop(box)


def preview(im, name):
    bg = Image.new("RGBA", im.size, (150, 150, 150, 255))
    bg.alpha_composite(im)
    bg.convert("RGB").save("/tmp/npc_art_preview_%s.png" % name)


def main():
    kind, src, name = sys.argv[1:4]
    im = key_out(Image.open(src))
    if kind == "walk":
        im = crop_content(im)
        h = 330
        im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
        out = "%s/assets/char/%s.webp" % (ROOT, name)
    elif kind == "obj":
        im = crop_content(im)
        if im.width > 640:
            im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
        out = "%s/assets/object/%s.webp" % (ROOT, name)
    else:
        w, h = 512, 600
        cw = round(im.height * w / h)
        # 인물이 가로 한쪽으로 치우쳐 있으면 내용물 중심에 맞춰 자르기
        a = np.asarray(im)[..., 3]
        xs = np.where((a > 24).sum(axis=0) > 0)[0]
        cx = (xs.min() + xs.max()) // 2
        x0 = int(min(max(0, cx - cw // 2), im.width - cw))
        im = im.crop((x0, 0, x0 + cw, im.height)).resize((w, h), Image.LANCZOS)
        out = "%s/assets/portrait/%s.webp" % (ROOT, name)
    im.save(out, "WEBP", quality=90, method=6)
    preview(im, name)
    print(out, im.size)


if __name__ == "__main__":
    main()
