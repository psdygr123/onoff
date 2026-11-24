/* 칸 확장 B안: 스킬 5칸 + 아이템 Z X C V (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fail = 0;
const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await sleep(300);
  await ev(() => { AU.G.S.level = 20; AU.G.S.inv.fatigue_tonic = 2; AU.G.S.inv.potion = 3; AU.G.S.inv.town_scroll = 1; AU.G.changed(); }); await sleep(400);
  const L = await ev(() => { const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width) }; };
    const rows = [...document.querySelectorAll('.slots .srow')]; const panel = document.querySelector('.panel.hudpanel, #hud-panel, .hp') ;
    return { rows: rows.map((rw) => [...rw.children].map((c) => ({ k: c.querySelector('.skey').textContent, t: c.querySelector('.sk').textContent, c: (c.querySelector('.scost') || {}).textContent }))), pos: rows.map(r) }; });
  console.log(JSON.stringify(L));
  T('윗줄 스킬 1~5', L.rows[0].map((s) => s.k).join('') === '12345', L.rows[0].map((s) => s.k));
  T('아랫줄 이동기 + Z X C V', L.rows[1].map((s) => s.k).join(',') === 'Shift,Z,X,C,V', L.rows[1].map((s) => s.k));
  T('피로약 칸에 개수 ×2', L.rows[1][2].c === '×2', L.rows[1][2]);
  const act = await ev(() => { const G = AU.G, before = { f: G.S.fatigue, t: G.count('fatigue_tonic'), p: G.count('potion'), sc: G.count('town_scroll') }; G.S.fatigue = 50; G.S.hp = 10; const blocked = AU.World.isBlocked(); AU.World.trans = null; G.quickUse('tonic'); G.quickUse('potion'); return { blocked, before, f: G.S.fatigue, t: G.count('fatigue_tonic'), p: G.count('potion'), hp: G.S.hp }; });
  T('X: 피로회복제 사용(피로도 감소·개수 감소)', act.t === 1 && act.f < 50, act);
  T('Z: 물약 사용', act.p === 2 && act.hp > 10, act);
  const key = await ev(() => { const W = AU.World, G = AU.G, o = W.isBlocked; W.isBlocked = () => false; const b = G.count('fatigue_tonic'), pb = G.count('potion'); G.S.hp = 10; W.onAction('tonic'); W.onAction('potion'); W.isBlocked = o; return { t: [b, G.count('fatigue_tonic')], p: [pb, G.count('potion')] }; });
  T('키 동작(onAction)으로도 X·Z 사용됨', key.t[1] === key.t[0] - 1 && key.p[1] === key.p[0] - 1, key);
  const mig = await ev(() => { AU.Input.load({ potion: 'Digit4', scroll: 'Digit5' }); const B = AU.Input.bindings; return { potion: B.potion, scroll: B.scroll, s4: B.skill4, s5: B.skill5 }; });
  T('예전 저장 키(물약 4·귀환 5)는 Z·C로 이전', mig.potion === 'KeyZ' && mig.scroll === 'KeyC' && mig.s4 === 'Digit4' && mig.s5 === 'Digit5', mig);
  const sl = await ev(() => AU.G.S.skills.slots.length); T('스킬 슬롯 5칸 저장', sl === 5, sl);
  await ev(() => { AU.UI.open('inventory'); }); await sleep(300);
  await ev(() => { AU.G.S.hp = AU.G.d().maxHp; AU.G.changed(); }); await sleep(500);
  await p.screenshot({ path: '/tmp/hotbar_real.png' });
  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
