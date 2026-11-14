"""마젠타(#FF00FF) 배경 제거 + 초상화/전신/몬스터 규격 변환 (GPT 그림 -> 게임 에셋)"""
import numpy as np
from PIL import Image, ImageFilter

def key(img):
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g                    # 마젠타 정도
    alpha = 1 - np.clip((m - 50) / 90, 0, 1)    # 50 이하 완전 불투명 · 140 이상 투명
    # 가장자리 번짐 제거(despill): 남은 R/B 초과분을 G 기준으로 눌러줌
    spill = np.clip(np.minimum(r, b) - g, 0, None) * (alpha < 0.999) * 0.9
    r2 = r - spill * (r >= b); b2 = b - spill * (b > r)
    r2 = np.where(alpha < 0.999, np.minimum(r2, np.maximum(g * 1.15, g + 8)), r2)
    b2 = np.where(alpha < 0.999, np.minimum(b2, np.maximum(g * 1.15, g + 8)), b2)
    # 전체 보라 번짐(머리카락 끝 등) 약하게 제거
    m2 = np.clip(np.minimum(r2, b2) - g - 6, 0, None) * 0.85
    r2 = r2 - m2; b2 = b2 - m2
    out = np.dstack([r2, g, b2, alpha * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    # 작은 구멍·잔점 정리: 알파 약간 수축 후 부드럽게
    al = im.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    im.putalpha(al)
    return im

def bbox_crop(im, pad=0):
    bb = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    l, t, r, b = bb
    return im.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, im.width), min(b + pad, im.height)))

def portrait(src, out, bg=(233, 204, 157), size=(512, 600)):
    im = key(Image.open(src))
    w, h = size
    s = Image.new("RGB", im.size, bg); s.paste(im, (0, 0), im)
    # 정사각 원본을 가로폭에 맞춰 전체가 보이게 축소하고 아래에 붙임(위 남는 부분은 배경색)
    k = w / s.width; sc = s.resize((w, round(s.height * k)), Image.LANCZOS)
    canvas = Image.new("RGB", size, bg); canvas.paste(sc, (0, h - sc.height))
    s = canvas
    s.save(out, quality=90)
    return s

def sprite(src, out, box):
    im = bbox_crop(key(Image.open(src)), 2)
    bw, bh = box
    k = min(bw / im.width, bh / im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    canvas = Image.new("RGBA", box, (0, 0, 0, 0))
    canvas.paste(im, ((bw - im.width) // 2, bh - im.height), im)   # 발끝 정렬
    canvas.save(out, quality=90)
    return canvas
