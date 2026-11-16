/* 주인공 색 반영 점검: 캐릭터 생성에서 고른 성별·색이 주인공이 나오는 모든 그림과 프롤로그 모든 장면에 입혀지는지 확인.
   1) 주인공 그림(js/tint.js HERO_RE 규칙)마다 마스크가 있고 크기가 맞는지  2) 색을 바꾼 뒤 모든 그림이 색이 입혀진 사본으로 바뀌는지
   3) 프롤로그 8장면을 돌리며 색이 입혀지지 않은 주인공 그림이 화면에 그려진 적이 있는지(남·여 둘 다). 새 주인공 그림을 넣고 마스크를 빠뜨리면 여기서 실패합니다. */
const { open, sleep } = require('./prologue/lib.js');
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const SCENES = ['SCENE_00_MORNING', 'SCENE_01_TEMPLE', 'SCENE_01B_BANNERS', 'SCENE_02_FESTIVAL', 'SCENE_03_ATTACK', 'SCENE_04_FATHER', 'SCENE_05_ESCAPE', 'SCENE_06_PORT_VIEW'];
(async () => {
  for (const g of ['m', 'f']) {
    const T = await open(); const { p, ev } = T;
    await p.addInitScript(() => { window.__scene = ''; window.__bad = {}; const o = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (im) { try { const s = im && im.src ? im.src : ''; if (window.__scene && !s.startsWith('blob:') && /assets\/(char|portrait)\/player_|prologue\/ch\/player_|prologue\/pt\/pt_pro_hero_/.test(s)) { const k = window.__scene + ' :: ' + s.split('/').slice(-2).join('/'); window.__bad[k] = (window.__bad[k] || 0) + 1; } } catch (e) {} return o.apply(this, arguments); }; });
    await T.fresh(); await p.click('#btn-start'); await sleep(300);
    for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
    await p.click('#sg-' + g); await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(600);
    const look = { hair: 2, vest: 3, pants: 1 };
    await ev(async (l) => { await AU.Tint.setLook(l); AU.G.S.profile.look = l; }, look);
    await sleep(2500);
    const st = await ev(() => { const keys = AU.Tint.heroKeys(), loaded = keys.filter((k) => AU.Img.map[k] && AU.Img.map[k].done && AU.Img.map[k].ok); return { n: keys.length, loaded: loaded.length, untinted: loaded.filter((k) => AU.Img.map[k].image === AU.Img.map[k].orig), missing: AU.Tint.missingMasks(), miss: AU.Tint.stats.missing }; });
    note(g + '1', '주인공 그림 전부 마스크 있음(없으면 tools/art/hero_mask.py 로 만들어 assets/mask 에 넣기)', st.missing.length === 0, JSON.stringify({ n: st.n, loaded: st.loaded, miss: st.miss }));
    note(g + '2', '색을 고르면 읽힌 주인공 그림이 모두 색이 입혀진 사본으로 바뀜', st.untinted.length === 0, st.untinted.join(',') || (st.loaded + '장'));
    for (const s of SCENES) { await ev((s) => { window.__scene = s; AU.Prologue.devJump(s); }, s); await sleep(3500); for (let k = 0; k < 5; k++) { await p.keyboard.press('Space'); await sleep(700); } }
    const bad = await ev(() => window.__bad);
    note(g + '3', '프롤로그 8장면에서 색이 안 입혀진 주인공 그림이 그려진 적 없음', Object.keys(bad).length === 0, JSON.stringify(bad));
    note(g + 'Z', '페이지 오류 없음', T.errs.length === 0, T.errs.slice(0, 2).join('||') || '0건');
    await T.b.close();
  }
  const f = R.filter((x) => !x.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' PASS'); process.exit(f.length ? 1 : 0);
})();
