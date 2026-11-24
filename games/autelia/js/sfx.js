/* 효과음·환경음 합성기(임시). 외부 음원 없이 브라우저(Web Audio)가 소리를 직접 만듭니다.
   - AU.Sfx.play("이름") : 효과음 한 번 재생 / AU.Sfx.loop("이름", true|false) : 환경음 반복
   - 모든 소리는 제한기(compressor)를 거쳐 갑자기 커지지 않게 하고, 설정의 "소리 끄기"를 따릅니다.
   - 정식 음원이 들어오면 AU.Sfx.files 표에 파일명을 적어 바꿉니다(같은 이름의 합성음 대신 파일을 재생).
   - 소리 목록·설명은 AU.Sfx.CATALOG (시험 페이지 soundtest.html이 사용). */
window.AU = window.AU || {};
(function () {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const S = AU.Sfx = { ctx: null, files: {}, loops: {}, last: {}, cache: {}, master: null, reverb: null, bus: null };

  /* ---------- 기반: 소리 그래프 만들기 ---------- */
  /* 마스터 음량 = 기본 0.7 × 설정의 효과음 음량. "소리 끄기"면 0 */
  /* 전투음(공격·스킬·타격·피격·몬스터 소리)은 효과음과 따로 음량을 조절함(설정의 volCombat). 마스터는 둘 중 큰 값에 맞추고, 소리마다 자기 종류의 비율을 곱합니다. */
  const isCombat = (n) => /^(swing|skill|skill_.*|hit|hit_spark|crit|hurt|kill|mon_.*)$/.test(n);
  const volOf = (key) => { const st = AU.UI && AU.UI.settings; const v = st && typeof st[key] === "number" && isFinite(st[key]) ? st[key] : 1; return Math.max(0, Math.min(1, v)); };
  const peak = () => Math.max(volOf("volSfx"), volOf("volCombat"), 0.0001);
  S.catScale = (n) => (isCombat(n) ? volOf("volCombat") : volOf("volSfx")) / peak();
  S.applyVolume = function () {
    if (!S.master) return;
    const st = AU.UI && AU.UI.settings;
    S.master.gain.value = (st && st.mute) ? 0 : 0.7 * peak();
    const amb = volOf("volSfx") / peak(); Object.keys(S.loops || {}).forEach((k) => { const o = S.loops[k]; if (o && o.amb !== amb) { o.amb = amb; try { o.vg.gain.value = amb; } catch (e) { /* 무시 */ } } });
  };
  S.ensure = function () {
    if (AU.UI && AU.UI.settings && AU.UI.settings.mute) return null;
    try {
      if (!S.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        S.ctx = new AC(); S.build(S.ctx);
      }
      if (S.ctx.state === "suspended") S.ctx.resume().catch(() => {});
      return S.ctx;
    } catch (e) { return null; }
  };
  /* ctx(실시간 또는 오프라인)에 마스터 체인을 만들고 {out, wet}을 돌려줌 */
  S.build = function (ctx) {
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
    const master = ctx.createGain(); master.gain.value = 0.7; master.connect(comp); comp.connect(ctx.destination);
    const dry = ctx.createGain(); dry.connect(master);
    const conv = ctx.createConvolver(); const len = Math.floor(ctx.sampleRate * 1.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    conv.buffer = buf; const wet = ctx.createGain(); wet.gain.value = 0.32; conv.connect(wet); wet.connect(master);
    const bus = { out: dry, rev: conv };
    if (ctx === S.ctx) { S.master = master; S.bus = bus; }
    return bus;
  };
  function noiseBuf(ctx) {
    if (ctx.__nb) return ctx.__nb;
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = w * 0.6 + last * 8; } // 약간 어두운 노이즈
    return (ctx.__nb = b);
  }
  /* 노이즈 한 번: 필터 주파수가 f→f2로 움직이며 a초에 커졌다가 dur초에 걸쳐 사라짐 */
  function N(ctx, bus, t, o) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf(ctx);
    f.type = o.type || "bandpass"; f.Q.value = o.q || 0.8; f.frequency.setValueAtTime(o.f || 1000, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const a = o.a || 0.003, v = o.vol || 0.2; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(bus.out); if (o.rev) { const r = ctx.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(bus.rev); }
    s.start(t, rnd(0, 1.5)); s.stop(t + o.dur + 0.05);
  }
  /* 톤 한 번: 음높이 f→f2 */
  function T(ctx, bus, t, o) {
    const os = ctx.createOscillator(), g = ctx.createGain(); os.type = o.type || "sine"; os.frequency.setValueAtTime(o.f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const a = o.a || 0.004, v = o.vol || 0.2; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let n = os; if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; os.connect(f); n = f; }
    n.connect(g); g.connect(bus.out); if (o.rev) { const r = ctx.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(bus.rev); }
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibD || o.f * 0.03; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + o.dur + 0.05); }
    os.start(t); os.stop(t + o.dur + 0.05);
  }
  /* 종(맑은 울림): 배음 여러 개 */
  function bell(ctx, bus, t, f, vol, dur, rev) {
    [[1, 1], [2.01, 0.45], [2.76, 0.28], [4.2, 0.12], [5.4, 0.07]].forEach(([m, a], i) => T(ctx, bus, t, { f: f * m, dur: dur / (1 + i * 0.55), vol: vol * a, a: 0.003, rev: rev === undefined ? 0.5 : rev }));
  }
  const arp = (ctx, bus, t, notes, gap, vol, dur) => notes.forEach((f, i) => bell(ctx, bus, t + i * gap, f, vol, dur || 0.9));

  /* ---------- 소리 정의 ---------- */
  /* 각 항목: [설명, 재생 함수(ctx, bus, t)]  — 같은 이름은 재생할 때마다 음높이를 살짝 바꿔 단조롭지 않게 함 */
  const D = {};
  const def = (name, desc, fn) => { D[name] = { desc, fn }; };
  const v = () => rnd(0.93, 1.07);

  // --- 프롤로그 컷신용 ---
  def("hammer", "망치로 못을 박는 소리(둔탁한 철과 철이 맞닿는 소리)", (c, b, t) => { const k = v(); N(c, b, t, { f: 2200 * k, q: 0.8, dur: 0.018, a: 0.0008, vol: 0.34 });   // 맞닿는 순간의 짧은 충격
    [[340, 14, 0.13, 1.5], [870, 16, 0.1, 1.3], [1480, 14, 0.075, 1.0], [2310, 12, 0.05, 0.6]].forEach(([f, q, d, a2]) => N(c, b, t, { f: f * k, q, dur: d, a: 0.001, vol: a2 }));   // 철이 울리는 중저음 공명(짧게 끊겨 둔탁함)
    T(c, b, t, { f: 140 * k, f2: 80 * k, dur: 0.1, vol: 0.3, a: 0.001 }); T(c, b, t, { f: 610 * k, dur: 0.07, vol: 0.06, a: 0.001, type: "square", lp: 900 }); });
  /* 나무 소리(11-24): 속이 찬 나무토막이 울리는 낮은 몸통 소리 + 짧은 딱 소리. 유리 같은 높은 톤은 쓰지 않음 */
  const woodKnock = (c, b, t, k, vol) => { // 한 번 부딪힘: 아주 짧은 딱(노이즈) + 노이즈로 울린 나무 공명 4개(높은 Q 대역통과, 빨리 사라짐) — 순수 음이 아니라 나무토막 특유의 '탁'
    N(c, b, t, { f: 3200 * k, q: 0.9, dur: 0.012, a: 0.0008, vol: 0.28 * vol });
    [[210, 20, 0.16, 2.6], [520, 22, 0.1, 2.2], [930, 18, 0.07, 1.7], [1540, 16, 0.05, 1.2]].forEach(([f, q, d, a]) => N(c, b, t, { f: f * k, q, dur: d, a: 0.0012, vol: a * vol }));
    T(c, b, t, { f: 150 * k, f2: 105 * k, dur: 0.09, vol: 0.18 * vol, a: 0.001 });   // 속 빈 몸통의 둔한 울림
  };
  def("plank", "목재를 내려놓는 소리(나무가 바닥·받침에 닿는 딱, 한 번 튕김)", (c, b, t) => { const k = v(); woodKnock(c, b, t, k, 1); woodKnock(c, b, t + 0.115, k * 1.12, 0.38); N(c, b, t, { type: "lowpass", f: 500, dur: 0.12, vol: 0.14 }); });
  def("wood_lift", "목재를 들어 올리는 소리(나무결이 쓸리는 소리 + 손에 쥐는 작은 탁)", (c, b, t) => { const k = v(); for (let i = 0; i < 6; i++) N(c, b, t + i * 0.034, { f: rnd(850, 1700) * k, q: 3.5, dur: 0.045, a: 0.006, vol: 0.075 + i * 0.006 }); woodKnock(c, b, t + 0.23, k * 1.04, 0.5); });
  def("door", "나무 문이 닫히는 소리", (c, b, t) => { T(c, b, t, { f: 100, f2: 46, dur: 0.34, vol: 0.45 }); N(c, b, t, { type: "lowpass", f: 500, dur: 0.2, vol: 0.2 }); N(c, b, t + 0.13, { type: "highpass", f: 3200, dur: 0.03, vol: 0.18 }); });
  def("stone", "무거운 돌이 제자리에 끼워지는 소리", (c, b, t) => { N(c, b, t, { type: "lowpass", f: 520, f2: 240, dur: 0.55, a: 0.12, vol: 0.2 }); T(c, b, t + 0.5, { f: 62, f2: 34, dur: 0.45, vol: 0.5 }); N(c, b, t + 0.5, { type: "lowpass", f: 350, dur: 0.3, vol: 0.28 }); });
  // 신전 완공: 종 대신 '신비로운 울림'. 천천히 차오르고(약 1.6초) 길게 사라지는 지속음(드론). 따뜻하고 낮은 울림으로 확정(사용자 선택)
  def("temple_glow", "신전 완공: 따뜻하고 낮은 신비로운 울림이 서서히 차오름", (c, b, t) => { [[146.8, 0.06], [220, 0.05], [293.7, 0.04], [329.6, 0.025], [440, 0.018]].forEach(([f, vol], i) => { T(c, b, t + i * 0.12, { f, dur: 6.2, vol, a: 1.7, rev: 0.6, vib: 0.22 + i * 0.05, vibD: f * 0.004 }); T(c, b, t + i * 0.12, { f: f * 1.005, dur: 6.2, vol: vol * 0.7, a: 1.9, rev: 0.6 }); }); T(c, b, t + 0.9, { f: 987.8, dur: 4.6, vol: 0.012, a: 1.4, rev: 0.7, vib: 5.2, vibD: 3 }); N(c, b, t + 0.6, { type: "highpass", f: 5200, dur: 4.6, a: 1.6, vol: 0.012, rev: 0.5 }); });
  def("boom", "멀리서 울리는 폭발과 진동(날카롭지 않게)", (c, b, t) => { N(c, b, t, { type: "lowpass", f: 420, f2: 70, dur: 2.2, a: 0.05, vol: 0.55 }); T(c, b, t, { f: 64, f2: 26, dur: 1.7, vol: 0.4, a: 0.03 }); for (let i = 0; i < 9; i++) N(c, b, t + 0.35 + i * rnd(0.12, 0.2), { type: "highpass", f: rnd(1500, 3000), dur: 0.06, vol: rnd(0.02, 0.08) }); });
  def("collapse", "나무 기둥이 무너져 내리는 소리", (c, b, t) => { N(c, b, t, { f: 1800, q: 1.5, dur: 0.06, vol: 0.3 }); T(c, b, t, { f: 85, f2: 38, dur: 0.6, vol: 0.45 }); N(c, b, t + 0.08, { type: "lowpass", f: 800, f2: 200, dur: 0.7, vol: 0.25 }); for (let i = 0; i < 6; i++) N(c, b, t + 0.2 + i * 0.1, { f: rnd(900, 2500), dur: 0.05, vol: 0.06 }); });
  def("cloth", "현수막·천이 펄럭이는 소리", (c, b, t) => { N(c, b, t, { f: 1000, f2: 2000, q: 0.6, dur: 1.2, a: 0.25, vol: 0.12 }); N(c, b, t + 0.15, { f: 600, f2: 1400, q: 0.6, dur: 0.9, a: 0.2, vol: 0.08 }); });
  def("flag_flap", "깃발이 바람에 부드럽게 펄럭이는 소리(천이 바람을 타고 '후우—ㅍ' 부풀었다 잦아듦, 날카로운 타격음 없음)", (c, b, t) => { const k = v(); [0, 0.2, 0.44, 0.72, 1.04, 1.4].forEach((d, i) => { const g = 1 - i * 0.14; N(c, b, t + d, { f: rnd(650, 1250) * k, q: 0.6, dur: 0.34, a: 0.09, vol: 0.085 * g }); N(c, b, t + d + 0.03, { type: "lowpass", f: rnd(260, 420), dur: 0.3, a: 0.1, vol: 0.06 * g }); });   // 천이 바람을 받아 부풀었다 가라앉는 느낌(부드러운 시작·긴 여운)
    N(c, b, t, { f: 900, f2: 1500, q: 0.6, dur: 0.9, a: 0.1, vol: 0.05 }); });   // 바람에 쓸리는 바탕 소리
  def("pick", "작은 물건을 집는 소리", (c, b, t) => { N(c, b, t, { f: 2200, q: 0.7, dur: 0.12, vol: 0.13 }); T(c, b, t + 0.03, { f: 2800 * v(), dur: 0.09, vol: 0.05 }); });
  def("item", "아이템 획득(작게 반짝, 한 음)", (c, b, t) => { bell(c, b, t, 1319, 0.07, 0.55, 0.3); N(c, b, t, { type: "highpass", f: 6500, dur: 0.12, vol: 0.012 }); });
  def("keyitem", "중요한 물건 획득(따뜻한 두 음이 겹쳐 울림)", (c, b, t) => { bell(c, b, t, 523, 0.09, 1.8, 0.5); bell(c, b, t + 0.14, 784, 0.07, 1.8, 0.5); T(c, b, t, { f: 262, dur: 1.6, vol: 0.04, a: 0.25, rev: 0.5 }); });
  def("slump", "사람이 천천히 무릎 꿇고 쓰러지는 부드러운 소리", (c, b, t) => { N(c, b, t, { type: "lowpass", f: 320, dur: 0.3, vol: 0.28 }); T(c, b, t, { f: 72, f2: 44, dur: 0.35, vol: 0.28 }); N(c, b, t + 0.02, { f: 1500, f2: 700, q: 0.5, dur: 0.45, a: 0.08, vol: 0.06 }); });
  def("fragment", "금속 조각을 집는 소리(은은한 울림)", (c, b, t) => { T(c, b, t, { f: 3200, dur: 0.2, vol: 0.07, rev: 0.4 }); T(c, b, t, { f: 5100, dur: 0.12, vol: 0.04, rev: 0.4 }); T(c, b, t + 0.05, { f: 220, dur: 1.0, vol: 0.05, vib: 5, vibD: 4, a: 0.2, rev: 0.5 }); });
  def("bag", "가죽 도구 가방을 드는 소리", (c, b, t) => { N(c, b, t, { f: 700, q: 0.7, dur: 0.22, vol: 0.2 }); for (let i = 0; i < 3; i++) { N(c, b, t + 0.06 + i * 0.07, { f: rnd(3000, 4500), q: 2, dur: 0.04, vol: 0.08 }); T(c, b, t + 0.06 + i * 0.07, { f: rnd(2500, 3800), dur: 0.1, vol: 0.03 }); } });
  def("gull", "먼 곳의 갈매기 울음", (c, b, t) => { const k = v(); T(c, b, t, { f: 1350 * k, f2: 1900 * k, dur: 0.2, vol: 0.06, vib: 22, vibD: 40, a: 0.03, rev: 0.7 }); T(c, b, t + 0.2, { f: 1900 * k, f2: 1050 * k, dur: 0.4, vol: 0.06, vib: 22, vibD: 40, a: 0.03, rev: 0.7 }); T(c, b, t + 0.2, { f: 3800 * k, f2: 2100 * k, dur: 0.3, vol: 0.015, rev: 0.7 }); });

  // --- 발걸음 ---
  def("step_dirt", "흙길 발걸음(마른 흙·잔돌이 밟히는 질감)", (c, b, t) => { const k = v(); N(c, b, t, { type: "lowpass", f: 520 * k, f2: 260, q: 0.4, dur: 0.07, a: 0.004, vol: 0.09 }); for (let i = 0; i < 4; i++) N(c, b, t + 0.006 + i * rnd(0.008, 0.016), { f: rnd(2200, 4800), q: 1.4, dur: 0.018, vol: rnd(0.012, 0.03) }); });
  def("step_wood", "나무 바닥 발걸음(속이 빈 나무가 울리는 톡)", (c, b, t) => { const k = v(); N(c, b, t, { f: 900 * k, q: 1.6, dur: 0.045, a: 0.003, vol: 0.1 }); T(c, b, t, { f: 240 * k, f2: 200 * k, dur: 0.05, vol: 0.05, type: "sine", a: 0.003 }); N(c, b, t + 0.012, { f: 2200, q: 2, dur: 0.02, vol: 0.025 }); });
  def("step_stone", "돌길 발걸음(딱딱한 바닥에 닿는 또각)", (c, b, t) => { const k = v(); N(c, b, t, { type: "highpass", f: 2200 * k, dur: 0.02, a: 0.002, vol: 0.08 }); N(c, b, t, { f: 1500 * k, q: 3, dur: 0.04, a: 0.002, vol: 0.08, rev: 0.2 }); N(c, b, t + 0.004, { type: "lowpass", f: 380, dur: 0.045, vol: 0.05 }); });

  // --- 본편: 이동·전투 ---
  def("jump", "점프(천이 스치고 숨을 들이쉬는 가벼운 소리)", (c, b, t) => { N(c, b, t, { f: 420, f2: 1500, q: 0.5, dur: 0.14, a: 0.05, vol: 0.09 }); N(c, b, t + 0.02, { type: "highpass", f: 2600, dur: 0.1, a: 0.04, vol: 0.02 }); });
  def("land", "착지(가볍게 내딛는 소리 + 천 스침)", (c, b, t) => { N(c, b, t, { type: "lowpass", f: 480, f2: 250, q: 0.4, dur: 0.1, a: 0.004, vol: 0.12 }); N(c, b, t + 0.008, { f: 1800, q: 0.8, dur: 0.05, vol: 0.04 }); N(c, b, t + 0.02, { f: 700, f2: 450, q: 0.5, dur: 0.12, a: 0.03, vol: 0.03 }); });
  def("blade_swish", "칼을 크게 휘두르는 소리(묵직하게 바람을 가르며 스치는 쉭)", (c, b, t) => { const k = v(); N(c, b, t, { f: 450 * k, f2: 2600 * k, q: 1.0, dur: 0.3, a: 0.09, vol: 0.2 }); N(c, b, t + 0.12, { f: 1800 * k, f2: 900 * k, q: 0.8, dur: 0.18, a: 0.02, vol: 0.12 }); N(c, b, t, { type: "lowpass", f: 300, dur: 0.28, a: 0.1, vol: 0.1 }); });
  def("swing", "공격 휘두름(날이 바람을 가르는 소리)", (c, b, t) => { const k = v(); N(c, b, t, { f: 700 * k, f2: 2800 * k, q: 1.2, dur: 0.16, a: 0.06, vol: 0.17 }); N(c, b, t + 0.05, { type: "highpass", f: 3500, dur: 0.09, a: 0.03, vol: 0.03 }); });
  def("skill", "스킬 사용", (c, b, t) => { N(c, b, t, { f: 500, f2: 3200, q: 1, dur: 0.3, a: 0.1, vol: 0.2 }); bell(c, b, t + 0.12, 1047, 0.05, 0.5); });
  def("hit", "몬스터를 맞힘(둔탁한 타격 + 짧은 스침)", (c, b, t) => { const k = v(); N(c, b, t, { type: "lowpass", f: 700 * k, f2: 250, q: 0.5, dur: 0.1, a: 0.002, vol: 0.3 }); N(c, b, t, { f: 1900, q: 0.9, dur: 0.045, vol: 0.18 }); T(c, b, t, { f: 150 * k, f2: 80, dur: 0.07, vol: 0.12 }); });
  def("crit", "강한 일격", (c, b, t) => { D.hit.fn(c, b, t); bell(c, b, t, 1760, 0.08, 0.35); N(c, b, t, { type: "highpass", f: 4000, dur: 0.12, vol: 0.12 }); });
  def("mon_fox", "들여우 울음", (c, b, t) => { T(c, b, t, { f: 900, f2: 1400, dur: 0.1, vol: 0.12, type: "triangle", a: 0.02 }); T(c, b, t + 0.1, { f: 1400, f2: 700, dur: 0.14, vol: 0.12, type: "triangle", a: 0.01 }); });
  def("mon_snake", "뱀의 쉭 소리", (c, b, t) => N(c, b, t, { type: "highpass", f: 4200, dur: 0.38, a: 0.06, vol: 0.14 }));
  def("mon_rat", "부두 쥐의 찍찍 소리", (c, b, t) => { T(c, b, t, { f: 2200, f2: 3000, dur: 0.07, vol: 0.08 }); T(c, b, t + 0.1, { f: 2400, f2: 3200, dur: 0.07, vol: 0.08 }); });
  def("mon_crab", "게 집게가 부딪히는 소리", (c, b, t) => { N(c, b, t, { f: 3000, q: 3, dur: 0.025, vol: 0.2 }); N(c, b, t + 0.07, { f: 2800, q: 3, dur: 0.025, vol: 0.18 }); T(c, b, t + 0.15, { f: 400, f2: 900, dur: 0.06, vol: 0.05 }); });
  def("mon_merc", "갑옷이 부딪히는 소리", (c, b, t) => { N(c, b, t, { f: 1800, q: 2, dur: 0.05, vol: 0.2 }); T(c, b, t + 0.05, { f: 180, f2: 120, dur: 0.12, vol: 0.14, type: "square", lp: 500 }); });
  def("mon_mutfox", "변형된 여우의 쉰 울음", (c, b, t) => { T(c, b, t, { f: 520, f2: 760, dur: 0.12, vol: 0.14, type: "sawtooth", lp: 1400, a: 0.02 }); T(c, b, t + 0.12, { f: 760, f2: 330, dur: 0.2, vol: 0.14, type: "sawtooth", lp: 1100, a: 0.01 }); });
  def("mon_wolf", "늑대의 낮은 으르렁", (c, b, t) => { T(c, b, t, { f: 150, f2: 110, dur: 0.3, vol: 0.18, type: "sawtooth", lp: 420 }); });
  def("mon_bat", "안개 박쥐의 날카로운 울음", (c, b, t) => { T(c, b, t, { f: 2200, f2: 3100, dur: 0.08, vol: 0.1, type: "triangle", a: 0.01 }); T(c, b, t + 0.09, { f: 3000, f2: 1800, dur: 0.1, vol: 0.08, type: "triangle", a: 0.01 }); });
  def("mon_beetle", "결정 갑충의 딱딱한 소리", (c, b, t) => { N(c, b, t, { f: 2600, q: 3, dur: 0.04, vol: 0.18 }); T(c, b, t + 0.03, { f: 260, f2: 190, dur: 0.1, vol: 0.12, type: "square", lp: 900 }); });
  def("mon_cutter", "깎는 자의 묵직한 숨", (c, b, t) => { N(c, b, t, { f: 1500, q: 2, dur: 0.05, vol: 0.2 }); T(c, b, t + 0.05, { f: 130, f2: 90, dur: 0.18, vol: 0.16, type: "sawtooth", lp: 500 }); });
  def("mon_trial_boss", "시험 대상의 낮은 울림", (c, b, t) => { T(c, b, t, { f: 110, f2: 70, dur: 0.5, vol: 0.3, type: "sawtooth", lp: 300 }); });
  def("hurt", "플레이어가 맞음(부드럽게)", (c, b, t) => { T(c, b, t, { f: 210, f2: 105, dur: 0.2, vol: 0.24 }); N(c, b, t, { type: "lowpass", f: 900, dur: 0.14, vol: 0.15 }); });
  def("kill", "몬스터가 사라짐", (c, b, t) => { N(c, b, t, { f: 1500, f2: 400, q: 0.6, dur: 0.35, vol: 0.18 }); T(c, b, t + 0.05, { f: 1800, f2: 2700, dur: 0.16, vol: 0.04, rev: 0.4 }); });

  // --- 성장·보상 ---
  def("levelup", "레벨 업(신나는 팡파레: 빠른 상승 아르페지오 + 큰 화음 + 반짝 폭죽)", (c, b, t) => {
    const up = [523, 659, 784, 1047, 1319, 1568];   // 도-미-솔-높은도-미-솔
    up.forEach((f, i) => { T(c, b, t + i * 0.075, { f, dur: 0.16, vol: 0.11, type: "square", lp: 3800, a: 0.004, rev: 0.25 }); T(c, b, t + i * 0.075, { f: f / 2, dur: 0.16, vol: 0.07, type: "triangle", a: 0.004 }); });
    const t2 = t + 0.5;   // 마지막 큰 화음(도·미·솔·도) + 아래 받침음
    [1047, 1319, 1568, 2093].forEach((f) => { T(c, b, t2, { f, dur: 1.1, vol: 0.07, type: "square", lp: 4200, a: 0.006, rev: 0.45 }); bell(c, b, t2, f, 0.05, 1.6, 0.5); });
    T(c, b, t2, { f: 262, dur: 1.1, vol: 0.12, type: "triangle", a: 0.01 }); T(c, b, t2, { f: 131, dur: 1.1, vol: 0.1, type: "triangle", a: 0.01 });
    for (let k = 0; k < 7; k++) T(c, b, t2 + 0.1 + k * 0.08, { f: 2400 + (k % 3) * 700, f2: 3600 + (k % 3) * 700, dur: 0.09, vol: 0.04, type: "triangle", a: 0.003, rev: 0.4 });   // 반짝 폭죽
    N(c, b, t2, { type: "highpass", f: 6000, dur: 0.9, a: 0.02, vol: 0.03, rev: 0.4 });
  });
  def("jobchange", "전직(하프처럼 오음 음계가 올라가 큰 화음으로 끝남)", (c, b, t) => { [330, 392, 440, 523, 587, 784].forEach((f, i) => bell(c, b, t + i * 0.1, f, 0.065, 1.2, 0.5)); [523, 659, 784].forEach((f) => bell(c, b, t + 0.85, f, 0.08, 3.0, 0.65)); T(c, b, t + 0.85, { f: 131, dur: 3.0, vol: 0.07, a: 0.4, rev: 0.6 }); });
  def("potion", "물약을 마시는 소리(꿀꺽 세 번 + 병 닿는 소리)", (c, b, t) => { for (let i = 0; i < 3; i++) { N(c, b, t + i * 0.13, { f: 420 - i * 40, f2: 220, q: 2.2, dur: 0.09, a: 0.015, vol: 0.12 }); T(c, b, t + i * 0.13, { f: 180, f2: 110, dur: 0.07, vol: 0.05, a: 0.01 }); } T(c, b, t + 0.5, { f: 3100, dur: 0.1, vol: 0.03, rev: 0.4 }); });
  def("coin", "은화 소리", (c, b, t) => { bell(c, b, t, 2200, 0.07, 0.3, 0.2); bell(c, b, t + 0.07, 3300, 0.06, 0.3, 0.2); });
  def("drop", "물건이 튀어나옴(작게 통통)", (c, b, t) => { N(c, b, t, { f: 1400, f2: 2200, q: 1.2, dur: 0.05, vol: 0.07 }); T(c, b, t, { f: 700, f2: 1000, dur: 0.05, vol: 0.04, type: "triangle" }); });
  def("equip", "장비 착용(가죽·천이 걸리는 소리 + 작은 쇳소리)", (c, b, t) => { N(c, b, t, { f: 900, f2: 1600, q: 0.8, dur: 0.1, a: 0.03, vol: 0.09 }); N(c, b, t + 0.07, { f: 3200, q: 3, dur: 0.03, vol: 0.06 }); });

  // --- 메뉴·대화 ---
  def("click", "버튼 클릭", (c, b, t) => { T(c, b, t, { f: 700, type: "triangle", dur: 0.045, vol: 0.07 }); N(c, b, t, { f: 2600, dur: 0.02, vol: 0.05 }); });
  // 선택 전용(캐릭터 만들기의 카드·색 고르기): 잡음 틱 없이 부드럽게. 셋 중 하나를 sfx_wire.js의 SELECT_SOUND로 고릅니다.
  def("select_a", "선택(A) 부드러운 '뽁' · 낮고 둥근 한 음", (c, b, t) => T(c, b, t, { f: 520, f2: 400, dur: 0.09, vol: 0.06, a: 0.008, lp: 1400 }));
  def("select_b", "선택(B) 맑은 두 음 · 아주 작은 종소리", (c, b, t) => { T(c, b, t, { f: 660, dur: 0.16, vol: 0.035, a: 0.006, rev: 0.3 }); T(c, b, t + 0.06, { f: 990, dur: 0.2, vol: 0.03, a: 0.006, rev: 0.3 }); });
  def("select_c", "선택(C) 거의 안 들리는 숨소리 · 종이 스침", (c, b, t) => N(c, b, t, { type: "lowpass", f: 900, f2: 500, q: 0.5, dur: 0.07, a: 0.015, vol: 0.05 }));
  def("menu_open", "메뉴 열기(종이 소리)", (c, b, t) => N(c, b, t, { f: 1400, f2: 3000, q: 0.6, dur: 0.18, a: 0.05, vol: 0.09 }));
  def("menu_close", "메뉴 닫기", (c, b, t) => N(c, b, t, { f: 3000, f2: 1300, q: 0.6, dur: 0.16, a: 0.04, vol: 0.08 }));
  def("blip", "대화 넘김(아주 작은 틱)", (c, b, t) => T(c, b, t, { f: rnd(470, 560), dur: 0.055, vol: 0.045, a: 0.006 }));
  def("accept", "퀘스트 수락(낮고 짧은 종 한 번)", (c, b, t) => { bell(c, b, t, 440, 0.08, 0.9, 0.35); });
  def("complete", "퀘스트 완료(한 칸 올라가는 두 음, 길게 여운)", (c, b, t) => { bell(c, b, t, 523, 0.09, 1.4, 0.5); bell(c, b, t + 0.18, 784, 0.09, 2.0, 0.55); T(c, b, t + 0.1, { f: 262, dur: 1.8, vol: 0.035, a: 0.3, rev: 0.5 }); });
  def("warn", "할 수 없음(부드러운 낮은 음)", (c, b, t) => T(c, b, t, { f: 190, f2: 150, dur: 0.16, vol: 0.12, lp: 600 }));
  def("save", "저장됨", (c, b, t) => bell(c, b, t, 1047, 0.05, 0.7));

  // --- 장면·상태 ---
  def("boss", "보스 등장(낮은 울림이 부풀어 오름)", (c, b, t) => { T(c, b, t, { f: 55, f2: 62, dur: 2.6, vol: 0.25, a: 1.4, type: "sawtooth", lp: 180 }); T(c, b, t + 1.4, { f: 70, f2: 38, dur: 0.6, vol: 0.4 }); N(c, b, t + 1.4, { type: "lowpass", f: 300, dur: 0.4, vol: 0.2 }); });
  def("death", "쓰러짐(차분하게 내려가는 음)", (c, b, t) => { T(c, b, t, { f: 400, f2: 150, dur: 1.0, vol: 0.14, a: 0.05, rev: 0.5 }); });
  def("revive", "되살아남(따뜻한 울림이 서서히 차오름)", (c, b, t) => { T(c, b, t, { f: 262, dur: 2.0, vol: 0.06, a: 0.7, rev: 0.6 }); T(c, b, t, { f: 392, dur: 2.0, vol: 0.035, a: 0.9, rev: 0.6 }); bell(c, b, t + 0.7, 784, 0.05, 1.6, 0.6); });
  def("mapchange", "지도 이동", (c, b, t) => N(c, b, t, { f: 500, f2: 1700, q: 0.5, dur: 0.5, a: 0.18, vol: 0.1 }));
  // 옛 이름 호환
  def("cheer", "축제 광장 사람들의 함성(음원 파일 사용)", () => {});
  S.files.cheer = "assets/audio/cheer.mp3";
  def("thud", "쿵(범용)", (c, b, t) => { T(c, b, t, { f: 95, f2: 38, dur: 0.3, vol: 0.45 }); N(c, b, t, { type: "lowpass", f: 500, dur: 0.2, vol: 0.22 }); });
  def("step", "발걸음(범용)", (c, b, t) => D.step_dirt.fn(c, b, t));

  /* 소리마다 크기를 맞춘 보정값(작은 소리는 키우고 큰 소리는 줄임). 시험으로 측정한 최대 크기를 목표 크기에 맞춘 값 */
  const GAIN = {"hammer": 1.66, "plank": 1.0, "wood_lift": 1.3, "door": 1.1, "stone": 0.69, "temple_glow": 1, "boom": 0.69, "collapse": 0.87, "cloth": 0.87, "pick": 2.07, "item": 2.33, "keyitem": 1.16, "slump": 1.12, "fragment": 1.88, "bag": 1.85, "gull": 1.35, "step_dirt": 2.56, "step_wood": 3.93, "step_stone": 3.55, "jump": 1.91, "land": 3.08, "swing": 1.95, "skill": 1.07, "hit": 1.99, "crit": 1.6, "mon_fox": 1.32, "mon_mutfox": 1.3, "mon_snake": 1.15, "mon_rat": 1.94, "mon_crab": 2.9, "mon_trial_boss": 1.65, "hurt": 1.46, "kill": 2.63, "levelup": 0.8, "jobchange": 0.72, "potion": 1.71, "coin": 1.38, "drop": 5.0, "equip": 2.5, "click": 3.7, "menu_open": 1.54, "menu_close": 1.85, "blip": 3.89, "accept": 1.85, "complete": 1.2, "warn": 2.35, "save": 2.45, "death": 1.45, "revive": 1.04, "mapchange": 0.92, "boss": 0.86, "thud": 1.49, "step": 2.14, "select_a": 3.57, "select_b": 3.12, "select_c": 2.22};
  ["step_dirt", "step_wood", "step_stone", "jump", "land"].forEach((k) => { GAIN[k] = (GAIN[k] || 1) * 0.5; }); // 이동 소리(걷기·점프·착지)는 계속 들리므로 절반으로 낮춤(11-17 사용자 요청)
  S.DEFS = D; S.GAIN = GAIN;
  // 정식 음원(2026-11-16 받음) — 같은 이름의 합성음 대신 파일을 재생. [이름, 설명, 파일, 기본 음량]
  [["skill_strike", "스킬① 스매시 크러셔(묵직한 베기)", "skill_strike2", 0.75], ["skill_strike_alt", "스킬① 스매시 크러셔 — 다른 버전(비교용)", "skill_strike", 0.75],
   ["skill_spin", "스킬② 크로스 슬래시", "skill_spin", 0.75], ["skill_focus", "스킬③ 버스트", "skill_focus", 0.6],
   ["hit_spark", "타격 불꽃(맞힐 때 번쩍)", "hit_spark", 0.4], ["scroll_return", "마을 귀환 주문서(종이 찢김)", "scroll_return", 0.7],
   ["inn_blanket", "여관 휴식 — 이불 소리", "inn_blanket", 0.6], ["inn_fire", "여관 휴식 — 따뜻한 난로", "inn_fire", 1],
   ["breath_wave", "호흡 안내음 — 물결 소리(반복용)", "breath_wave", 0.35], ["timer_start", "명상·쉼 타이머 시작(작은 종)", "timer_start", 0.6],
   ["escort_start", "상인 호위 시작(출발 호각)", "escort_start", 0.7], ["escort_success", "상인 호위 성공(팡파르)", "escort_success", 0.65],
   ["escort_fail", "상인 호위 실패", "escort_fail", 0.7], ["gull", "갈매기 울음(실제 녹음, 약 8초)", "gull", 0.5], ["escort_hit", "상인 호위 장애물 충돌", "escort_hit", 0.7]
  ].forEach(([n, d, f, g]) => { def(n, d, () => {}); S.files[n] = "assets/audio/sfx/" + f + ".mp3"; GAIN[n] = g; });
  S.CATALOG = Object.keys(D).map((k) => ({ id: k, desc: D[k].desc }));

  /* ---------- 재생 ---------- */
  S.play = function (name) {
    const d = D[name]; if (!d) return false;
    const now = performance.now(); if (S.last[name] && now - S.last[name] < 70) return true; S.last[name] = now; // 같은 소리가 한꺼번에 겹치는 것을 막음
    if (S.files[name]) { return S.playFile(name); }
    const c = S.ensure(); if (!c) return true;
    try {
      const g = c.createGain(), rg = c.createGain(); g.gain.value = rg.gain.value = (GAIN[name] || 1) * S.catScale(name); g.connect(S.bus.out); rg.connect(S.bus.rev);
      d.fn(c, { out: g, rev: rg }, c.currentTime + 0.005);
      setTimeout(() => { try { g.disconnect(); rg.disconnect(); } catch (e) { /* 무시 */ } }, 4500);
    } catch (e) { /* 소리 실패는 무시 */ }
    return true;
  };
  S.playFile = function (name) {
    try { const st = AU.UI && AU.UI.settings; if (st && st.mute) return true; const vs = isCombat(name) ? volOf("volCombat") : volOf("volSfx"); const a = new Audio(S.files[name]); a.volume = Math.min(1, (GAIN[name] || 0.7) * vs); a.play().catch(() => {}); return true; } catch (e) { return false; }
  };
  /* 오프라인 렌더(시험용): 소리를 3초 분량으로 계산해 최대 크기·평균 크기를 돌려줌 */
  S.measure = async function (name, secs, opts) {
    const d = D[name]; if (!d) return null; secs = secs || 3;
    const oc = new OfflineAudioContext(1, 44100 * secs, 44100); const b0 = S.build(oc); const g = oc.createGain(), rg = oc.createGain(); g.gain.value = rg.gain.value = (opts && opts.raw) ? 1 : (GAIN[name] || 1); g.connect(b0.out); rg.connect(b0.rev); d.fn(oc, { out: g, rev: rg }, 0.01);
    const buf = await oc.startRendering(); const x = buf.getChannelData(0); let pk = 0, sum = 0, last = 0;
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; sum += x[i] * x[i]; if (a > 0.002) last = i; }
    return { peak: +pk.toFixed(3), rms: +Math.sqrt(sum / x.length).toFixed(4), tail: +(last / 44100).toFixed(2), nan: x.some((v) => v !== v) };
  };

  /* ---------- 환경음(반복) ---------- */
  const L = {}; // 이름: (ctx, bus) => { nodes:[], timers:[], gain }
  function noiseSrc(c) { const s = c.createBufferSource(); s.buffer = noiseBuf(c); s.loop = true; s.start(0, rnd(0, 1.5)); return s; }
  function lfo(c, f, depth, target) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o; }
  function chain(c, bus, type, freq, q, vol) { const s = noiseSrc(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(bus.out); return { s, f, g }; }
  function birdChirp(c, bus, t, vol) {
    const base = rnd(2400, 4200), n = Math.floor(rnd(2, 5));
    for (let i = 0; i < n; i++) T(c, bus, t + i * rnd(0.09, 0.13), { f: base * rnd(0.9, 1.1), f2: base * rnd(1.1, 1.4), dur: 0.08, vol, a: 0.01, rev: 0.4 });
  }
  L.fire = (c, bus, o) => {   // 불 타는 소리: 낮고 부드러운 '화르륵' 바탕 + 아주 드문 작은 탁탁(높은 치직 소리는 빗소리처럼 들려 줄임, 11-24 사용자 지시)
    const a = chain(c, bus, "bandpass", 650, 0.6, 0.03), b = chain(c, bus, "lowpass", 240, 0.7, 0.1);
    o.nodes.push(a.s, b.s, lfo(c, 0.35, 0.03, b.g.gain), lfo(c, 0.9, 0.012, a.g.gain));   // 불길이 일렁이듯 크기가 천천히 오르내림
    o.timers.push(setInterval(() => { if (Math.random() < 0.22) N(c, bus, c.currentTime, { type: "bandpass", f: rnd(700, 1500), q: 1.6, dur: rnd(0.03, 0.07), vol: rnd(0.03, 0.08) }); }, 170));
  };
  /* 습격 환경음(코드로 합성한 임시 소리): 불 타는 소리 위에 비명·고함, 나무 부서지는 소리, 쇠붙이 부딪는 소리, 무너지는 둔탁한 소리를 드문드문 얹음.
     실제 녹음 파일이 오면 같은 이름의 파일로 바꿔 끼우면 됨. far=true는 멀리서 들리는 작은 버전(집 안 장면: 아버지 유언을 가리지 않게) */
  function shout(c, bus, t, o) { // 사람이 놀라 내지르는 짧은 비명/당황한 소리("앗!", "어!", "으악!"): 빠른 어택·짧은 길이·급히 치솟았다 떨어지는 음높이 + 숨소리(귀신처럼 길게 끄는 소리가 아님)
    const dur = Math.min(o.dur || 0.25, 0.42), os = c.createOscillator(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
    os.type = "sawtooth"; os.frequency.setValueAtTime(o.f * 0.95, t); os.frequency.exponentialRampToValueAtTime(o.f * 1.4, t + dur * 0.18); os.frequency.exponentialRampToValueAtTime(o.f * 0.82, t + dur);   // 놀란 순간 확 올라갔다 내려옴
    vib.frequency.value = rnd(6, 9); vg.gain.value = o.f * 0.012; vib.connect(vg); vg.connect(os.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + 0.012); g.gain.exponentialRampToValueAtTime(o.vol * 0.35, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const F = o.vowel || [[760, 4], [1250, 5]]; for (const [ff, q] of F) { const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(ff * rnd(0.95, 1.05) * 0.9, t); f.frequency.linearRampToValueAtTime(ff * 1.08, t + dur * 0.3); f.Q.value = q * 0.7; os.connect(f); f.connect(g); }
    g.connect(bus.out); if (o.rev) { const r = c.createGain(); r.gain.value = o.rev * 0.4; g.connect(r); r.connect(bus.rev); }
    N(c, bus, t, { f: rnd(1800, 2800), q: 0.7, dur: dur * 0.7, a: 0.01, vol: o.vol * 0.35 });   // 숨 섞인 거친 질감(사람 목소리 느낌)
    os.start(t); vib.start(t); os.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  }
  function woodCrack(c, bus, t, vol, far) { // 나무가 갈라지는 딱 소리 + 부서진 조각이 떨어지는 달그락
    N(c, bus, t, { type: "bandpass", f: rnd(1400, 2400), q: 1.4, dur: 0.05, a: 0.001, vol, rev: far ? 0.5 : 0.2 }); N(c, bus, t + 0.01, { type: "lowpass", f: 420, dur: 0.18, a: 0.002, vol: vol * 0.9, rev: far ? 0.5 : 0.25 });
    for (let i = 0; i < 4; i++) N(c, bus, t + 0.08 + i * rnd(0.04, 0.09), { type: "highpass", f: rnd(1800, 3600), dur: 0.025, a: 0.001, vol: vol * rnd(0.25, 0.5), rev: 0.2 });
  }
  function clang(c, bus, t, vol, far) { // 쇠붙이 부딪는 소리
    const f = rnd(900, 1700); N(c, bus, t, { type: "highpass", f: 3000, dur: 0.04, a: 0.001, vol, rev: far ? 0.5 : 0.3 });
    [1, 2.76, 5.4].forEach((m, i) => T(c, bus, t, { f: f * m, dur: 0.35 / (1 + i), vol: vol * [0.7, 0.35, 0.18][i], a: 0.001, rev: far ? 0.6 : 0.35 }));
  }
  function rumble(c, bus, t, vol) { N(c, bus, t, { type: "lowpass", f: 180, dur: 0.9, a: 0.02, vol, rev: 0.4 }); T(c, bus, t, { f: 70, f2: 38, dur: 0.7, vol: vol * 0.8, a: 0.01 }); }
  const VOW = { a: [[800, 5], [1200, 6]], o: [[500, 5], [900, 6]], i: [[350, 5], [2300, 7]] };
  function raidLoop(far) {
    return (c, bus, o) => {
      L.fire(c, bus, o);
      const k = far ? 0.45 : 1, rv = far ? 0.6 : 0.25;
      o.timers.push(setInterval(() => { // 사람 외침: 남성(낮음)·여성·아이(높음), 가끔 둘이 겹침
        const n = Math.random() < (far ? 0.2 : 0.3) ? 2 : 1;
        for (let i = 0; i < n; i++) { const kind = Math.random(), f0 = kind < 0.4 ? rnd(120, 170) : kind < 0.8 ? rnd(230, 330) : rnd(380, 520), v = [VOW.a, VOW.o, VOW.i][Math.floor(rnd(0, 3))];
          shout(c, bus, c.currentTime + i * rnd(0.1, 0.4), { f: f0, vol: rnd(0.09, 0.17) * k * (far ? 1 : 1.0), dur: rnd(0.16, 0.38), vowel: v, rev: rv }); }   // 비명 크기: 가까운 습격 장면 1.0배(11-24 사용자 지시: 배경음과 비율 맞춤, 이전 1.9배)
      }, far ? 2300 : 950));
      o.timers.push(setInterval(() => { if (Math.random() < 0.45) woodCrack(c, bus, c.currentTime, rnd(0.1, 0.18) * k, far); }, far ? 2700 : 1600));
      o.timers.push(setInterval(() => { if (Math.random() < 0.35) clang(c, bus, c.currentTime, rnd(0.07, 0.13) * k, far); }, far ? 3100 : 1900));
      o.timers.push(setInterval(() => { if (Math.random() < 0.18) rumble(c, bus, c.currentTime, rnd(0.1, 0.18) * k); }, 3500));
    };
  }
  S.raidParts = { shout, woodCrack, clang, rumble };   // 시험용(오프라인 렌더로 크기 확인)
  L.raid = raidLoop(false);
  L.raid_far = raidLoop(true);
  L.wind_soft = (c, bus, o) => { const a = chain(c, bus, "bandpass", 450, 0.6, 0.04); o.nodes.push(a.s, lfo(c, 0.11, 260, a.f.frequency), lfo(c, 0.07, 0.015, a.g.gain)); };   // 탈출 장면용: 바람 소리를 훨씬 작게
  L.wind = (c, bus, o) => { const a = chain(c, bus, "bandpass", 450, 0.6, 0.13); o.nodes.push(a.s, lfo(c, 0.11, 260, a.f.frequency), lfo(c, 0.07, 0.05, a.g.gain)); };
  L.waves = (c, bus, o) => {
    const a = chain(c, bus, "lowpass", 560, 0.5, 0.1), b = chain(c, bus, "highpass", 2200, 0.5, 0.025);
    o.nodes.push(a.s, b.s, lfo(c, 0.17, 0.085, a.g.gain), lfo(c, 0.17, 0.02, b.g.gain));
  };
  L.hush = (c, bus, o) => { const a = chain(c, bus, "lowpass", 210, 0.5, 0.06); o.nodes.push(a.s); };
  L.birds = (c, bus, o) => { const a = chain(c, bus, "bandpass", 500, 0.5, 0.025); o.nodes.push(a.s, lfo(c, 0.09, 0.012, a.g.gain)); o.timers.push(setInterval(() => { if (Math.random() < 0.55) birdChirp(c, bus, c.currentTime, 0.035); }, 900)); };
  L.crowd = (c, bus, o) => {
    const a = chain(c, bus, "bandpass", 420, 0.5, 0.08), b = chain(c, bus, "bandpass", 1100, 0.9, 0.035);
    o.nodes.push(a.s, b.s, lfo(c, 0.23, 0.03, a.g.gain), lfo(c, 0.37, 0.015, b.g.gain));
    o.timers.push(setInterval(() => { if (Math.random() < 0.25) N(c, bus, c.currentTime, { f: rnd(500, 900), q: 0.7, dur: rnd(0.5, 1.1), a: 0.25, vol: 0.09 }); }, 1500));
  };
  L.forest = (c, bus, o) => { L.wind(c, bus, o); L.birds(c, bus, o); const ins = chain(c, bus, "highpass", 5500, 0.7, 0.008); o.nodes.push(ins.s, lfo(c, 0.4, 0.006, ins.g.gain)); };
  L.harbor = (c, bus, o) => { L.waves(c, bus, o); const m = chain(c, bus, "bandpass", 500, 0.7, 0.03); o.nodes.push(m.s); o.timers.push(setInterval(() => { const t = performance.now(); if (Math.random() < 0.25 && t - (S.lastGull || 0) > 24000) { S.lastGull = t; S.play("gull"); } }, 3000)); };
  S.L = L; S.AMBIENCE = Object.keys(L);

  S.loop = function (name, on) {
    try {
      const old = S.loops[name];
      if (old) { delete S.loops[name]; old.timers.forEach(clearInterval); old.g.gain.cancelScheduledValues(old.c.currentTime); old.g.gain.linearRampToValueAtTime(0, old.c.currentTime + 0.7); setTimeout(() => { old.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); try { old.g.disconnect(); } catch (e) {} }, 900); }
      if (on === false) return true;
      if (!L[name]) return false;
      const c = S.ensure(); if (!c) return true;
      const g = c.createGain(); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.45, c.currentTime + 1.2); const vg = c.createGain(); vg.gain.value = volOf("volSfx") / peak(); g.connect(vg); vg.connect(S.master); // 환경음은 효과음 아래에 깔리도록 낮게(효과음 음량 반영)
      const o = { nodes: [], timers: [], g, c, vg, amb: vg.gain.value }, bus = { out: g, rev: S.bus.rev }; L[name](c, bus, o); S.loops[name] = o; return true;
    } catch (e) { return false; }
  };
  /* 음원 파일 반복 재생(호흡 안내 물결 소리 등): S.loopFile("breath_wave", true|false). 켤 때 서서히 커지고, 끌 때 서서히 줄어듦 */
  S.fileLoops = {};
  S.loopFile = function (name, on) {
    try {
      const old = S.fileLoops[name];
      if (old) { delete S.fileLoops[name]; clearInterval(old.iv); const a = old.a, iv = setInterval(() => { a.volume = Math.max(0, a.volume - 0.04); if (a.volume <= 0) { clearInterval(iv); a.pause(); } }, 60); }
      if (on === false || !S.files[name]) return on === false;
      const st = AU.UI && AU.UI.settings; if (st && st.mute) return true;
      const a = new Audio(S.files[name]); a.loop = true; a.volume = 0; const o = { a, iv: null };
      const tgt = () => { const s2 = AU.UI && AU.UI.settings, v = s2 && typeof s2.volSfx === "number" && isFinite(s2.volSfx) ? Math.max(0, Math.min(1, s2.volSfx)) : 1; return (s2 && s2.mute) ? 0 : Math.min(1, (GAIN[name] || 0.5) * v); };
      o.iv = setInterval(() => { const t = tgt(); a.volume = a.volume < t ? Math.min(t, a.volume + 0.03) : t; }, 80);
      S.fileLoops[name] = o; a.play().catch(() => {}); return true;
    } catch (e) { return false; }
  };
  S.stopAll = function () { Object.keys(S.loops).forEach((n) => S.loop(n, false)); Object.keys(S.fileLoops).forEach((n) => S.loopFile(n, false)); };
  /* 탭이 숨겨지면 소리를 멈췄다가 돌아오면 이어서 재생 */
  document.addEventListener("visibilitychange", () => { try { if (!S.ctx) return; if (document.hidden) S.ctx.suspend(); else S.ctx.resume(); } catch (e) { /* 무시 */ } });
})();
