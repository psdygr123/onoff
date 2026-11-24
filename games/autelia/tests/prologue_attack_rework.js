// 습격 개편: 쓰러진 아이(B안) + 자동 이동 + 집 안에서 부하들이 주인공을 붙잡는 장면(1안)
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:8801';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fail = 0; const T = (n, ok, d) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
  const st = () => p.evaluate(() => ({ s: AU.G.S.prologue.state, map: AU.World.mapId, x: Math.round(AU.World.player.x), kid: !!AU.Prologue.ents.find(e => e.id === 'fallen_kid'), flag: !!AU.G.S.prologue.flags.fallen_kid_helped, plats: (AU.World.map.platforms || []).length, locked: AU.Prologue.locked && AU.Prologue.locked() }));
  await p.goto(URL + '/?dev=1&intro=cards'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#btn-start'); await p.click('#job-next'); await p.click('#job-next'); await p.fill('#sname', '테스트'); await p.click('#setup-ok'); await p.waitForTimeout(1500);
  await p.evaluate(() => AU.Prologue.devJump(4));
  // 명령 컷신 건너뛰기
  for (let i = 0; i < 40; i++) { const l = await p.evaluate(() => AU.Prologue.locked && AU.Prologue.locked()); if (!l) break; await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  const a = await st();
  T('광장에 쓰러진 아이가 있고 지형 장애물은 없음', a.s === 'SCENE_03_ATTACK' && a.kid, a);
  // 아이를 도움
  await p.evaluate(() => { const k = AU.Prologue.ents.find(e => e.id === 'fallen_kid'); AU.World.player.x = k.x + 80; k.interact.fn(); });
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(250); const l = await p.evaluate(() => AU.Prologue.locked && AU.Prologue.locked()); if (l) await p.keyboard.press('Space'); const s = await st(); if (s.map === 'pro_road') break; }
  const b1 = await st(); T('아이를 도우면 flag 기록 + 마을길로 자동 이동', b1.flag && b1.map === 'pro_road', b1);
  T('마을길은 장애물 없이 자동 달리기', b1.plats <= 1, b1);
  for (let i = 0; i < 160; i++) { await p.waitForTimeout(300); const l = await p.evaluate(() => AU.Prologue.locked && AU.Prologue.locked()); if (l) await p.keyboard.press('Space'); const s = await st(); if (s.s === 'SCENE_04_FATHER') break; }
  const c = await st(); T('집 앞 도착 → 아버지 장면 시작', c.s === 'SCENE_04_FATHER', c);
  // 집 안: 부하 위치(주인공 길목)
  const pos = await p.evaluate(() => { const E = AU.Prologue.ents, g = (id) => { const e = E.find(q => q.id === id); return e && Math.round(e.x); }; return { off: g('off'), rg1: g('rg1'), rg2: g('rg2'), father: g('father') }; });
  T('부하 둘은 아버지 왼쪽(주인공 길목), 간부는 오른쪽', pos.rg1 < pos.father && pos.rg2 < pos.father && pos.off > pos.father, pos);
  let hitGap = null;
  for (let i = 0; i < 90; i++) { await p.waitForTimeout(300); const l = await p.evaluate(() => AU.Prologue.locked && AU.Prologue.locked()); if (l) await p.keyboard.press('Space'); const gp = await p.evaluate(() => { const E = AU.Prologue.ents, o = E.find(q => q.id === 'off'), f = E.find(q => q.id === 'father'); return o && f && f.fpose ? Math.round(o.x - f.x) : null; }); if (gp != null && (hitGap == null || gp < hitGap)) hitGap = gp; const v = await p.evaluate(() => !!AU.Prologue.v.brawl); if (!v) break; }
  const d = await p.evaluate(() => ({ brawl: !!AU.Prologue.v.brawl, raiders: AU.Prologue.ents.filter(e => ['off', 'rg1', 'rg2'].includes(e.id)).length, pose: AU.World.player.pose && AU.World.player.pose.name }));
  T('아버지가 베이는 동안 간부가 검이 닿는 거리(60px 이내)에 있음', hitGap != null && hitGap <= 60, hitGap);
  T('장면 종료 후 습격자 퇴장·주인공 붙잡힘 해제', !d.brawl && d.raiders === 0 && !d.pose, d);
  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
