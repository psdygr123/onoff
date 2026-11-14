/* NPC 성별 일치 시험: 같은 사람의 몸 그림·초상화·이름·대사 성별이 서로 어긋나지 않는지 확인.
   정상 접속과 "느린 접속"(그림이 늦게 도착) 두 경우를 모두 검사한다. (느린 접속에서 옛 주민 그림으로 대체되어 성별이 틀어지던 문제 재발 방지) */
const { open, sleep } = require('./lib');
const R = []; const note = (id, name, ok, ev) => { R.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
// M 남 / F 여 / C 어린이·무관. 몸 그림 열쇠(앞부분 일치) → 성별
const SPRITE = [['pc_villager_b', 'F'], ['pc_villager_c', 'M'], ['pc_villager_d', 'M'], ['pc_villager_f', 'M'], ['pc_villager_g', 'F'], ['pc_villager_j', 'F'], ['pc_villager_k', 'M'], ['pc_villager_l', 'M'], ['pc_festival_child', 'C'], ['smith', 'M'], ['baker', 'F'], ['villager_a', 'F'], ['villager_b', 'M'], ['player_male', 'M'], ['player_female', 'F']];
// 말하는 사람(PRO_SPEAKERS 열쇠) → 성별 (초상화·대사와 같아야 함)
const SPEAKER = { vendor: 'F', elder: 'M', farmer: 'M', priest: 'F', musician: 'M', scribe: 'M', traveler: 'F', florist: 'M', child: 'C', father: 'M' };
const sg = (key) => { const e = SPRITE.find(([p]) => String(key).startsWith(p)); return e ? e[1] : '?'; };
async function check(label, slow) {
  const T = await open(); const { p, ev } = T;
  if (slow) await p.route('**/assets/**', async (r) => { await sleep(900); r.continue(); });
  await T.fresh(); await T.start(); if (!slow) await sleep(3000);
  for (const sc of ['SCENE_00_MORNING', 'SCENE_02_FESTIVAL']) {
    await ev((s) => AU.Prologue.devJump(s), sc); await sleep(slow ? 14000 : 3000);
    const list = await ev(() => { const sp = AU.PRO_SPEAKERS, byName = {}; for (const k of Object.keys(sp)) byName[sp[k].name] = k; return (AU.Prologue.ents || []).map((n) => ({ name: n.name, sprite: n.sprite, spk: byName[n.name] || null })); });
    const bad = list.filter((n) => n.spk && SPEAKER[n.spk] && SPEAKER[n.spk] !== 'C' && sg(n.sprite) !== '?' && sg(n.sprite) !== SPEAKER[n.spk]);
    const unknown = list.filter((n) => n.spk && SPEAKER[n.spk] && sg(n.sprite) === '?');
    note(label + '·' + sc, '몸 그림 성별 = 말하는 사람 성별 (' + list.length + '명)', bad.length === 0 && list.length > 0, bad.length ? JSON.stringify(bad) : list.map((n) => n.name + ':' + n.sprite).join(' | '));
    if (unknown.length) console.log('  (표에 없는 그림) ' + JSON.stringify(unknown));
  }
  note(label + '·오류', '오류 없음', T.errs.length === 0, T.errs.join('|')); await T.b.close();
}
(async () => { await check('정상', false); await check('느린접속', true); const n = R.filter(Boolean).length; console.log('합계 ' + n + '/' + R.length + ' 통과'); process.exit(n === R.length ? 0 : 1); })();
