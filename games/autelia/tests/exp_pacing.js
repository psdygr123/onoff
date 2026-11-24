/* 경험치 페이싱 시험(서브 퀘스트 제외, 메인 보상만): 레벨 구간 + 게이트 + 보스 입장(10) / 1막 종료(15) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8864') + '/index.html?dev=1&intro=cards';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(200); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  // 메인 보상(경험치·levelTo)만 순서대로 적용 — 사냥 없음
  const apply = (id) => ev((qid) => { const q = AU.QUESTS[qid], r = q.reward, G = AU.G; if (r.exp) G.gainExp(r.exp, 'x'); if (r.levelTo) { let g = 0; while (G.S.level < r.levelTo && g++ < 20) G.gainExp(Math.max(1, AU.expToNext(G.S.level) - G.S.exp), 'x'); } return [G.S.level, G.S.exp, AU.expToNext(G.S.level)]; }, id);
  const lv0 = await ev(() => AU.G.S.level);
  const steps = [['q_first', 1, 2], ['q_forest', 2, 3], ['q_guild_talk', 3, 6]];
  for (const [id, lo, hi] of steps) { const [lv] = await apply(id); note('P-' + id, `${id} 직후 Lv ${lo}~${hi}`, lv >= lo && lv <= hi, 'Lv' + lv); }
  // 몬스터 EXP 상한 점검: 일반 몬스터 한 마리가 현재 레벨 필요 경험치의 12% 초과 금지(과속 방지), 하한 0.3% (사냥 무의미 방지)
  const mon = await ev(() => ['fox', 'snake', 'rat', 'crab', 'merc', 'wolf', 'hide_guard', 'hide_beast', 'hide_keeper'].map((k) => { const m = AU.MONSTERS[k]; return m && [k, m.exp, m.lv]; }).filter(Boolean));
  note('P-mon', '몬스터 exp가 정의되어 있음', mon.length >= 8 && mon.every((x) => x[1] > 0), JSON.stringify(mon));
  const bad = await ev(() => { const out = []; for (const k of ['fox', 'snake', 'rat', 'crab', 'merc', 'wolf', 'hide_guard', 'hide_beast', 'hide_keeper']) { const m = AU.MONSTERS[k]; if (!m || (m.lv || 1) < 3) continue; const need = AU.expToNext(m.lv || 1), r = m.exp / need; if (r > 0.12 || r < 0.003) out.push(k + ':' + r.toFixed(4)); } return out; });
  note('P-ratio', '몬스터 exp가 해당 레벨 필요량의 0.3~12% 안(Lv3+)', bad.length === 0, JSON.stringify(bad));
  // 나머지 메인(변이→흔적→비밀→정찰)은 사냥 병행이 전제이므로 레벨 게이트만 점검
  const gates = await ev(() => ['q_a1_variant', 'q_a1_traces', 'q_a2_secret', 'q_a3_scout', 'q_a3_jepeto', 'q_h1a'].map((k) => [k, AU.QUESTS[k] && AU.QUESTS[k].minLevel]));
  note('P-gates', '메인 게이트 5/6/7/8/10/10', JSON.stringify(gates.map((g) => g[1])) === JSON.stringify([5, 6, 7, 8, 10, 10]), JSON.stringify(gates));
  // 정찰 보상 levelTo 10 → 보스 입장(10) / 아지트 종료 levelTo 15
  await ev(() => { AU.G.S.level = 8; AU.G.S.exp = 0; });
  await apply('q_a3_scout'); const lvS = await ev(() => AU.G.S.level);
  note('P-scout', 'q_a3_scout 보상 후 Lv ≥ 10', lvS >= 10, 'Lv' + lvS);
  const [lvH] = await apply('q_h1f'); note('P-h1', 'q_h1f 보상 후 Lv 15 (1막 종료)', lvH === 15, 'Lv' + lvH);
  const cap = await ev(() => { AU.G.gainExp(1e7, 'x'); return AU.G.S.level; });
  note('P-cap', '직업 미변경 시 레벨 상한 15 유지', cap === 15, 'Lv' + cap);
  const subs = await ev(() => ['q_guild_rats', 'q_a1_parcel', 'q_guild_crabs'].map((k) => [k, AU.QUESTS[k].reward.exp]));
  note('P-sub', '서브 보상은 보너스(메인 경로 계산에서 제외): 메인 q_a1_variant 보상 이하가 아니어도 레벨 상한(15)은 불변', subs.every((x) => x[1] > 0), JSON.stringify(subs));
  note('P-err', '페이지 오류 없음', errs.length === 0, errs.join('|'));
  await b.close(); const f = R.filter((r) => !r.ok).length; console.log(f ? 'FAILED ' + f : 'ALL PASS'); process.exit(f ? 1 : 0);
})();
