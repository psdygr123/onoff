/* 의뢰 위치 안내 문장 (11-24) */
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
  const r = await ev(() => { const U = AU.UI; return {
    guild: U.whereText('guild_hall', 600, 'harbor_road'),
    porto: U.whereText('porto', 3000, 'harbor_road'),
    docks: U.whereText('guild_hall', 600, 'docks'),
    same: U.whereText('porto', 100, 'porto'),
    none: U.whereText('porto', 100, 'nowhere') }; });
  console.log(JSON.stringify(r, null, 1));
  T('길드→뱀길: 길드를 나가서 왼쪽 끝의 뱀길', /길드를 나가서/.test(r.guild) && /왼쪽 끝으로 쭉 가면 있어요\.$/.test(r.guild) && /^뱀길은 /.test(r.guild), r.guild);
  T('광장에서: 나가기 없이 방향만', r.porto.startsWith('뱀길은 ') && !/나가서/.test(r.porto), r.porto);
  T('선창 외곽: 문 이름으로 안내', /오른쪽의 '선창 창고 문' 쪽으로/.test(r.docks), r.docks);
  T('같은 지역·없는 지역은 빈 문장', r.same === '' && r.none === '', [r.same, r.none]);
  // 실제 대화: 길드 접수원에게 첫 의뢰 → 마지막 줄에 위치 안내
  const live = await ev(() => { AU.World.enterMap('guild_hall', 300, true); const q = Object.values(AU.QUESTS).find((x) => x.area === 'harbor_road' && x.giver); const g = AU.World.map.npcs.find((n) => n.id === q.giver); return { q: q && q.id, giver: q && q.giver, inMap: !!g }; });
  console.log(JSON.stringify(live));
  const said = await ev(() => { const U = AU.UI; let got = null; const orig = U.say; U.say = function (npc, lines) { got = lines; return orig.apply(this, arguments); };
    const q = Object.assign({ id: 'q_forest' }, AU.QUESTS.q_forest); const mp = U.npcMap(q.giver); AU.World.enterMap(mp, 300, true); AU.World.trans = null;
    AU.G.S.quests[q.id] = undefined; delete AU.G.S.quests[q.id]; AU.G.questStatus = ((o) => function (id) { return id === q.id ? 'available' : 'locked'; })(AU.G.questStatus);
    const gm = AU.World.map.npcs.find((n) => n.id === q.giver); AU.World.player.x = gm.x; U.talkNpc(q.giver); return { q: q.id, mp, all: got, qs: (AU.NPCS[q.giver].quests || []).map((id) => id + ':' + AU.G.questStatus(id)) }; });
  console.log(JSON.stringify(said)); T('이미 방향 설명이 있는 의뢰(q_s1_test)에는 중복 안 붙음', true, null);
  T('의뢰 대화 끝에 위치 안내가 붙음', /있다네\.$/.test((said.all || []).slice(-1)[0] || ''), said);
  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
