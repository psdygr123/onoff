/* 캐릭터 색 바꾸기: 머리·조끼·바지만 색을 바꿉니다(피부·눈·셔츠·벨트·장갑·장화·윤곽선은 그대로).
   원본 그림은 그대로 두고, 부위 표시 그림(assets/mask/*.png, 픽셀 값 0=그대로 1=머리 2=조끼 3=바지)을 이용해
   브라우저에서 색을 입힌 사본을 만들어 원래 그림 대신 사용합니다. 마스크가 없거나 읽지 못하면 원본 그림을 그대로 씁니다.
   마스크는 1차 초안이라 일부 가장자리에 원래 색이 남을 수 있습니다(assets/mask 만 교체하면 코드 수정 없이 개선됩니다). */
window.AU = window.AU || {};
(function () {
  "use strict";
  const AU = window.AU;

  /* 그림 이름 → 마스크 파일 */
  const MASKS = {
    player_male: "01_char_player_male", player_female: "02_char_player_female",
    pc_player_m_locomotion: "03_pro_player_m_locomotion", pc_player_f_locomotion: "04_pro_player_f_locomotion",
    pc_player_m_actions: "05_pro_player_m_actions", pc_player_f_actions: "06_pro_player_f_actions",
    pt_player_male: "07_portrait_player_male", pt_player_female: "08_portrait_player_female",
    pt_pro_hero_m: "09_pt_pro_hero_m", pt_pro_hero_f: "10_pt_pro_hero_f", pt_pro_hero_m_surprised: "11_pt_pro_hero_m_surprised"
  };
  /* 색 후보: 첫 칸(null)은 원본색. h=색상(0~360), s=채도, v=밝기 배율. sw=견본 색 */
  const PALETTE = {
    hair: [null,
      { n: "검정", h: 25, s: 0.30, v: 0.35, sw: "#2b2420" }, { n: "금발", h: 48, s: 0.55, v: 1.45, sw: "#e0c458" },
      { n: "은청", h: 215, s: 0.25, v: 1.4, sw: "#a9bcd8" }, { n: "적갈", h: 8, s: 0.75, v: 1.0, sw: "#b5452c" }, { n: "연보라", h: 270, s: 0.35, v: 1.3, sw: "#b9a3d6" }],
    vest: [null,
      { n: "진홍", h: 350, s: 0.60, v: 1.0, sw: "#a5304a" }, { n: "보라", h: 280, s: 0.50, v: 1.0, sw: "#6a3d8f" },
      { n: "갈색", h: 30, s: 0.65, v: 1.1, sw: "#8a5a34" }, { n: "남색", h: 225, s: 0.60, v: 0.8, sw: "#33468a" }, { n: "초록", h: 130, s: 0.45, v: 0.9, sw: "#3f7a48" }],
    pants: [null,
      { n: "남청", h: 215, s: 0.35, v: 0.9, sw: "#4f6f9a" }, { n: "초록", h: 130, s: 0.40, v: 0.8, sw: "#3f7a48" },
      { n: "검정", h: 30, s: 0.15, v: 0.45, sw: "#3a3530" }, { n: "회색", h: 30, s: 0.08, v: 0.75, sw: "#8d8a85" }]
  };
  const PARTS = ["hair", "vest", "pants"], LABEL = { hair: 1, vest: 2, pants: 3 };

  function hsv(r, g, b) { // 0~1
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d > 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx === 0 ? 0 : d / mx, mx];
  }
  function rgb(h, s, v) {
    h = ((h % 360) + 360) % 360 / 60; const i = Math.floor(h) % 6, f = h - Math.floor(h), p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
    return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i];
  }

  const T = AU.Tint = {
    MASKS, PALETTE, PARTS, look: { hair: 0, vest: 0, pants: 0 }, maskCache: {}, stats: { tinted: 0, failed: 0 },
    clean(l) {
      const o = l && typeof l === "object" ? l : {}, r = {};
      for (const p of PARTS) { const n = Number(o[p]); r[p] = Number.isInteger(n) && n >= 0 && n < PALETTE[p].length ? n : 0; }
      return r;
    },
    isDefault(l) { return PARTS.every((p) => !l[p]); },
    sig(l) { return PARTS.map((p) => l[p] | 0).join("-"); },
    mask(key) { // 마스크를 한 번만 읽어 라벨 배열로 보관
      if (this.maskCache[key]) return this.maskCache[key];
      return (this.maskCache[key] = new Promise((res) => {
        const im = new Image(); im.onload = () => {
          try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
            const d = x.getImageData(0, 0, c.width, c.height).data, L = new Uint8Array(c.width * c.height); for (let i = 0; i < L.length; i++) L[i] = d[i * 4]; res({ w: c.width, h: c.height, L }); } catch (e) { res(null); }
        };
        im.onerror = () => res(null); im.src = "assets/mask/" + MASKS[key] + ".png";
      }));
    },
    /* 그림 1장에 색 적용(완료되면 AU.Img의 그림과 AU.ASSETS 경로를 교체) */
    async tint(key, look) {
      const rec = AU.Img && AU.Img.map[key], spec = AU.ASSETS && AU.ASSETS[key];
      if (!rec || !rec.orig || !spec || !MASKS[key]) return false;
      const sg = this.sig(look); if (rec.tsig === sg) return true;
      const ver = (rec.tver = (rec.tver || 0) + 1);
      if (!spec.origPath) spec.origPath = spec.path;
      if (this.isDefault(look)) { rec.image = rec.orig; spec.path = spec.origPath; rec.tsig = sg; return true; }
      const m = await this.mask(key), o = rec.orig;
      if (!m || m.w !== o.naturalWidth || m.h !== o.naturalHeight) { this.stats.failed++; return false; } // 크기가 다르면 쓰지 않음
      const c = document.createElement("canvas"); c.width = m.w; c.height = m.h; const x = c.getContext("2d"); x.drawImage(o, 0, 0);
      const id = x.getImageData(0, 0, m.w, m.h), d = id.data, N = m.w * m.h;
      for (const p of PARTS) {
        const pal = look[p] ? PALETTE[p][look[p]] : null; if (!pal) continue; const lab = LABEL[p], hist = new Uint32Array(101); let cnt = 0;
        for (let i = 0; i < N; i++) if (m.L[i] === lab && d[i * 4 + 3] > 0) { hist[Math.round(hsv(d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255)[1] * 100)]++; cnt++; }
        if (!cnt) continue; let acc = 0, med = 0.05; for (let k = 0; k <= 100; k++) { acc += hist[k]; if (acc >= cnt / 2) { med = Math.max(k / 100, 0.05); break; } }
        for (let i = 0; i < N; i++) {
          if (m.L[i] !== lab || d[i * 4 + 3] === 0) continue;
          const [, s, v] = hsv(d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255);
          const s2 = Math.min(1, pal.s * (0.55 + 0.45 * Math.min(s / med, 1.6))), v2 = Math.min(1, v * pal.v), q = rgb(pal.h, s2, v2);
          d[i * 4] = Math.round(q[0] * 255); d[i * 4 + 1] = Math.round(q[1] * 255); d[i * 4 + 2] = Math.round(q[2] * 255);
        }
      }
      x.putImageData(id, 0, 0);
      const blob = await new Promise((r) => c.toBlob(r, "image/png")); if (!blob) { this.stats.failed++; return false; }
      if (ver !== rec.tver) return false; // 그 사이 더 새로운 요청이 있으면 버림
      const url = URL.createObjectURL(blob), im = new Image();
      await new Promise((r) => { im.onload = r; im.onerror = r; im.src = url; });
      if (ver !== rec.tver) { URL.revokeObjectURL(url); return false; }
      const old = spec.path; rec.image = im; spec.path = url; rec.tsig = sg; this.stats.tinted++;
      if (old && old.indexOf("blob:") === 0) setTimeout(() => URL.revokeObjectURL(old), 4000);
      return true;
    },
    /* 현재 모습을 정함. keys를 주면 그 그림만(설정 화면 미리보기용), 없으면 전부. 아직 읽히지 않은 그림은 읽히는 대로 적용됨 */
    async setLook(look, keys) {
      this.look = this.clean(look);
      const list = keys || Object.keys(MASKS), L = this.look;
      await Promise.all(list.map((k) => this.tint(k, L)));
      if (AU.Ev && AU.Ev.emit && !keys) { /* 필요 시 화면이 다시 그리도록 알림 자리 */ }
    },
    onLoaded(key) { if (MASKS[key]) this.tint(key, this.look); }
  };
})();
