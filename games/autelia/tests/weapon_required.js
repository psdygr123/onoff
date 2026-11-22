/* 무기를 장착하지 않으면 공격 불가 + 장비 장착 안내 투어 */
const { chromium } = require('playwright'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const out = []; const note = (n, ok, d) => { out.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(URL); await p.waitForSelector('#btn-start'); await sleep(1200);
  await ev(() => AU.Prologue.debugComplete('porto')); await sleep(300);
  await ev(() => { const G = AU.G; G.S.flags.equipTourSeen = true; G.S.inv.sword_a = 1; G.S.equip.weapon = null; G.S.map = 'harbor_road'; });
  await ev(() => AU.World.setMap && AU.World.setMap('harbor_road'));
  await sleep(300);
  // 1) 무기 없음: 기본 공격이 나가지 않음
  const r1 = await ev(() => { const W = AU.World, p = W.player; p.atkCD = 0; const n0 = W.fx.length; W.basicAttack(); return { fx: W.fx.length - n0, cd: p.atkCD }; });
  note('W1 무기 없이 기본 공격 불가', r1.fx === 0 && r1.cd === 0, r1);
  // 2) 스킬도 불가(슬롯에 스킬이 있어도)
  const r2 = await ev(() => { const S = AU.G.S, W = AU.World; S.skills.slots = ['strike', 'spin', 'focus']; const cd0 = JSON.stringify(S.skills.cd || {}); const f0 = S.fatigue || 0; W.useSkillSlot(0); return { f: (S.fatigue || 0) - f0 }; });
  note('W2 무기 없이 스킬 불가(피로도 증가 없음)', r2.f === 0, r2);
  // 3) 장착하면 공격 가능
  const r3 = await ev(() => { AU.G.equip('sword_a'); const W = AU.World, p = W.player; p.atkCD = 0; const n0 = W.fx.length; W.basicAttack(); return { fx: W.fx.length - n0, w: AU.G.S.equip.weapon }; });
  note('W3 장착하면 기본 공격 가능', r3.fx > 0 && r3.w === 'sword_a', r3);
  // 4) 해제하면 다시 불가
  const r4 = await ev(() => { AU.G.unequip('weapon'); const W = AU.World, p = W.player; p.atkCD = 0; const n0 = W.fx.length; W.basicAttack(); return { fx: W.fx.length - n0 }; });
  note('W4 해제하면 다시 공격 불가', r4.fx === 0, r4);
  // 5) 투어: 시작→5단계→완료 시 플래그 저장
  await ev(() => { AU.G.S.flags.equipTourSeen = false; AU.UI.close && AU.UI.close(); });
  await ev(() => { window.__tour = AU.EquipTour.start().then((r) => (window.__tourRes = r)); }); await sleep(500);
  const s1 = await ev(() => ({ card: !!document.querySelector('.jt-card'), prog: (document.querySelector('.jt-prog') || {}).textContent, win: AU.UI.curName }));
  note('W5 장비 안내 투어 시작(1/5, 장비창 열림)', s1.card && s1.prog === '1 / 5' && s1.win === 'equipment', s1);
  for (let k = 0; k < 4; k++) { await p.keyboard.press('ArrowRight'); await sleep(250); }
  const s2 = await ev(() => ({ prog: (document.querySelector('.jt-prog') || {}).textContent, title: (document.querySelector('.jt-title') || {}).textContent }));
  note('W6 마지막 단계에서 무기 없으면 공격 불가를 안내', s2.prog === '5 / 5' && /공격할 수 없어요/.test(s2.title), s2);
  await p.keyboard.press('ArrowRight'); await sleep(300);
  const s3 = await ev(() => ({ res: window.__tourRes, seen: AU.G.S.flags.equipTourSeen, card: !!document.querySelector('.jt-card') }));
  note('W7 완료 시 안내 저장·카드 제거', s3.res === 'done' && s3.seen === true && !s3.card, s3);
  // 6) 무기를 처음 얻으면 한가할 때 제안(모달) 표시
  await ev(() => { AU.G.S.flags.equipTourSeen = false; AU.UI.close && AU.UI.close(); AU.G.S.equip.weapon = null; AU.G.giveItem('sword_a', 1); }); await sleep(1500);
  const s4 = await ev(() => ({ modal: !document.querySelector('.modalwrap').classList.contains('hidden'), h: (document.querySelector('.modalwrap h3') || {}).textContent }));
  note('W8 첫 무기 획득 시 장착 안내 제안', s4.modal && /장착/.test(s4.h || ''), s4);
  note('Z 페이지 오류 없음', errs.length === 0, errs);
  await b.close(); process.exit(out.every(Boolean) ? 0 : 1);
})();
