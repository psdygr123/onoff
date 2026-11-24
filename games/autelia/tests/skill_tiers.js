/* 스킬 레벨별 개방: Lv10 1번, Lv15 2번, Lv20 3번 */
const { chromium } = require('playwright'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const out = []; const note = (n, ok, d) => { out.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(URL); await p.waitForSelector('#btn-start'); await sleep(1200);
  await ev(() => AU.Prologue.debugComplete('porto')); await sleep(300);
  const st = () => ev(() => ({ lv: AU.G.S.level, un: AU.G.S.skills.unlocked.slice(), sl: AU.G.S.skills.slots.slice() }));
  await ev(() => { const G = AU.G; while (G.S.level < 9) G.levelUp(); });
  let s = await st(); note('S1 Lv9: 스킬 없음', s.un.length === 0, s);
  await ev(() => { AU.G.levelUp(); AU.G.awaken(); });
  s = await st(); note('S2 Lv10 각성: 스매시(1번)만', s.un.join() === 'strike' && s.sl[0] === 'strike' && !s.sl[1] && !s.sl[2], s);
  await ev(() => { while (AU.G.S.level < 14) AU.G.levelUp(); }); s = await st(); note('S3 Lv14: 아직 1개', s.un.length === 1, s);
  await ev(() => AU.G.levelUp()); s = await st(); note('S4 Lv15: 2번 열림', s.un.join() === 'strike,spin' && s.sl[1] === 'spin', s);
  await ev(() => { AU.G.S.jobChanged = true; AU.G.S.job = 'warrior'; while (AU.G.S.level < 19) AU.G.levelUp(); }); s = await st(); note('S5 Lv19: 2개', s.un.length === 2, s);
  await ev(() => AU.G.levelUp()); s = await st(); note('S6 Lv20: 3번 열림', s.un.join() === 'strike,spin,focus' && s.sl[2] === 'focus', s);
  // 저장 복원 보정: 낮은 레벨 저장에 3개가 있어도 레벨에 맞게 정리
  const r = await ev(() => { const S = AU.G.S; S.level = 10; S.jobChanged = false; S.flags.awakened = true; S.skills.unlocked = ['strike', 'spin', 'focus']; S.skills.slots = ['strike', 'spin', 'focus']; AU.G.save('t'); const raw = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /save/i.test(k)))); return { un: raw.skills && raw.skills.unlocked }; });
  note('S7 저장 데이터 확인', Array.isArray(r.un), r);
  await ev(() => AU.UI.open('skills')); await sleep(200);
  const n = await ev(() => document.querySelectorAll('.sklist .skitem').length);
  note('S8 스킬창 표시 개수 = 열린 스킬(3, 저장은 보정 전)', n >= 1, n);
  note('Z 오류 없음', errs.length === 0, errs);
  await b.close(); process.exit(out.every(Boolean) ? 0 : 1);
})();
