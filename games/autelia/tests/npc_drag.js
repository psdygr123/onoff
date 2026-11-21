/* NPC 배치 편집: 끌어서 옮기기·저장·새로고침 뒤 유지·편집 중 걷지 않음·초기화 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const note = (id, name, ok, ev) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ev ? ' :: ' + ev : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  const enter = async () => { await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300); for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); } await ev(() => AU.Prologue.debugComplete('porto')); await sleep(600); };
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await enter();
  const info = () => ev(() => { const n = AU.MAPS.porto.npcs.find((q) => q.id === 'porto_dock'); return { x: n.x, y: n.npcY || null, cam: AU.World.camX }; });
  const a0 = await info(); await ev((x) => { const P = AU.World.player; P.x = x; AU.World.camX = Math.max(0, x - 640); }, a0.x - 300); await sleep(400);
  await ev(() => { AU.World.npcEdit = true; });
  const a1 = await info(); const sx = (a1.x - a1.cam) / 1280 * 1280, box = await (await p.$('#cv')).boundingBox();
  const px = box.x + (a1.x - a1.cam) / 1280 * box.width, py = box.y + 520 / 720 * box.height;
  await p.mouse.move(px, py); await p.mouse.down(); await p.mouse.move(px + 120 * box.width / 1280, py - 20, { steps: 6 }); await p.mouse.up(); await sleep(200);
  const a2 = await info(); note('D1', 'NPC를 끌면 위치가 옮겨짐', a2.x > a1.x + 80, a1.x + ' → ' + a2.x);
  const saved = await ev(() => AU.Store.get('autelia.npcPos')); note('D2', '놓으면 저장됨', saved && Object.keys(saved).some((k) => k.startsWith('porto:') && k.endsWith(':porto_dock')), JSON.stringify(saved));
  const w0 = await ev(() => AU.MAPS.porto.npcs.filter((q) => q.patrol).map((q) => q.x).slice(0, 3)); await sleep(1500); const w1 = await ev(() => AU.MAPS.porto.npcs.filter((q) => q.patrol).map((q) => q.x).slice(0, 3));
  note('D3', '편집 중에는 걷는 주민도 멈춰 있음', JSON.stringify(w0) === JSON.stringify(w1), JSON.stringify(w0));
  await p.reload(); await enter(); const a3 = await info(); note('D4', '새로고침 뒤에도 옮긴 위치 유지', Math.abs(a3.x - a2.x) < 2, a3.x + ' vs ' + a2.x);
  await ev(() => AU.World.npcEdit = false); const w2 = await ev(() => { const q = AU.MAPS.porto.npcs.filter((n) => n.patrol); return q.map((n) => n.x); }); await ev((x) => { AU.World.player.x = x; }, 100); await sleep(5000);
  const w3 = await ev(() => AU.MAPS.porto.npcs.filter((n) => n.patrol).map((n) => n.x)); note('D5', '편집을 끄면 다시 걸어 다님', w3.some((x, i) => Math.abs(x - w2[i]) > 2), '');
  note('Z', '오류 없음', errs.length === 0, errs.slice(0, 2).join('|'));
  await b.close(); console.log('합계 ' + pass + '/' + (pass + fail) + ' 통과'); process.exit(fail ? 1 : 0);
})();
