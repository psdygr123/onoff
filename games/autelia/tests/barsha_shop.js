/* 정보상 공방(jandari_shop) 시험: 골목 문 → 공방 안 → 대화·조사 → 문으로 복귀, 문 소리·지도·BGM·안내 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  const key = async (k, ms = 60) => { await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); };
  await ev(() => { const G = AU.G; G.S.level = 10; for (const id of ['q_s1_silver', 'q_s1_test', 'q_first', 'q_forest', 'q_guild_talk', 'q_a1_fence', 'q_a1_parcel', 'q_a1_traces']) G.S.quests[id] = { state: 'done', prog: [], spots: {} }; G.save('t'); });
  // 소리 기록: Sfx.play 호출을 가로채 이름을 모은다
  await ev(() => { window.__sfx = []; const o = AU.Sfx.play; AU.Sfx.play = function (n) { window.__sfx.push(n); return o.apply(this, arguments); }; });
  const sfxs = () => ev(() => window.__sfx.slice());
  // 데이터
  const d = await ev(() => { const j = AU.MAPS.jandari, s = AU.MAPS.jandari_shop; return { npcOut: j.npcs.length, spotsOut: j.spots.length, door: j.portals.find((x) => x.to === 'jandari_shop'), npcIn: s.npcs.map((n) => n.id), spotsIn: s.spots.map((x) => x.id), back: s.portals[0], bgm: AU.Bgm.pickGroup && 'ok', interior: s.interior, parent: s.parent, link: AU.AREA_LINKS.some((l) => l.includes('jandari_shop')), region: AU.WORLD_REGIONS.find((r) => r.id === 'south').maps.includes('jandari_shop'), bgAsset: !!AU.ASSETS.bg_barsha_shop }; });
  note('S1', '골목에는 바르샤·조사 지점이 없고 공방 문 포털(x960, door)만 있음', d.npcOut === 0 && d.spotsOut === 0 && d.door && d.door.x === 960 && d.door.door === true, JSON.stringify({ n: d.npcOut, s: d.spotsOut, door: d.door && d.door.x }));
  note('S2', '공방 안: 바르샤와 조사 지점 2곳, 나가기 포털은 문 앞(960)으로', d.npcIn.join() === 'barsha' && d.spotsIn.join() === 'barsha_lens,barsha_map' && d.back.toX === 960 && d.back.door === true, JSON.stringify(d.npcIn) + JSON.stringify(d.spotsIn) + d.back.toX);
  note('S3', '실내 맵·부모 지역·권역·지역 연결·배경 그림 키 등록', d.interior === true && d.parent === 'jandari' && d.link && d.region && d.bgAsset, JSON.stringify({ i: d.interior, p: d.parent, l: d.link, r: d.region, a: d.bgAsset }));
  // 배경음: 골목·공방 모두 마을 묶음(끊기지 않음)
  const bg = await ev(() => { const g = (m) => { AU.World.enterMap(m, AU.MAPS[m].start || 200, true); return AU.Bgm.pickGroup(); }; return [g('jandari'), g('jandari_shop')]; });
  note('S4', '잔다리 골목과 공방은 골목 묶음 곡(alley)', bg[0] === 'alley' && bg[1] === 'alley', bg.join());
  // 흐름: 문 앞 ↑ → 공방
  await ev(() => AU.World.enterMap('jandari', 960, true)); await sleep(200); await ev(() => AU.World.scan());
  const pr = await ev(() => AU.World.prompt);
  note('S5', '문 앞에서 이동 안내가 나옴', /정보상의 공방/.test(pr), pr);
  await ev(() => { window.__sfx.length = 0; }); await key('ArrowUp'); await sleep(1500);
  const names = await sfxs();
  note('S6', '문을 열고 들어가면 문 소리(door)가 남', names.includes('door'), names.join());
  note('S7', '정보상의 공방 안에 도착(문 안쪽)', (await ev(() => AU.World.mapId)) === 'jandari_shop', await ev(() => AU.World.mapId));
  // 대사: 첫 줄은 짧게, 야외 표현 없음
  const first = await ev(() => AU.QUESTS.q_a2_secret.offer[0]);
  note('S8', '첫 대사는 "카시안이 보냈군."만 나오고 문 소리·이쪽으로·들어오게 표현 없음', /카시안이 보냈군/.test(first) && !/문 닫히는 소리|이쪽으로|들어오게/.test(first), first);
  const all = await ev(() => JSON.stringify([AU.QUESTS.q_a2_secret.offer, AU.QUESTS.q_a2_secret.reminder, AU.QUESTS.q_a2_secret.desc]));
  note('S9', '"탁자" 표현은 작업대로 정리됨', !/탁자/.test(all), all.slice(0, 120));
  // 퀘스트 안내: 수락 전에는 공방 위치로, 수락 후 안 → 이 지역에서 진행
  await ev(() => AU.World.enterMap('jandari', 300, true)); await sleep(200);
  await ev(() => { AU.UI.talkNpc && 0; });
  const guideOut = await ev(() => { AU.G.S.quests.q_a2_secret = { state: 'active', prog: [0], spots: {} }; return AU.UI.questGuide('q_a2_secret'); });
  note('S10', '골목에서 퀘스트 안내가 공방 문 쪽을 가리킴', /정보상의 공방/.test(guideOut), guideOut);
  await ev(() => AU.World.enterMap('jandari_shop', 300, true)); await sleep(200);
  const guideIn = await ev(() => AU.UI.questGuide('q_a2_secret'));
  note('S11', '공방 안에서는 "이 지역에서 진행하세요"', /이 지역/.test(guideIn), guideIn);
  // 작업대 앞 조사 → 나가기 → 골목 복귀(문 앞)
  await ev(() => { AU.World.player.x = 730; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const ns = await ev(() => AU.World.nearSpot && AU.World.nearSpot.id);
  note('S12', '작업대 앞에서 조사 가능', ns === 'barsha_lens', String(ns));
  await ev(() => { AU.World.player.x = 70; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await ev(() => { window.__sfx.length = 0; }); await key('ArrowUp'); await sleep(1500);
  const pos = await ev(() => AU.World.mapId + ':' + Math.round(AU.World.player.x));
  note('S13', '나가기(문): 골목의 문 앞으로 돌아오며 문 소리', pos === 'jandari:960' && (await sfxs()).includes('door'), pos + ' ' + (await sfxs()).join());
  // 일반 이동은 문 소리가 아니라 지도 이동음
  await ev(() => AU.World.enterMap('jandari', 40, true)); await sleep(100); await ev(() => AU.World.scan()); await ev(() => { window.__sfx.length = 0; }); await key('ArrowUp'); await sleep(900);
  const n2 = await sfxs();
  note('S14', '문이 아닌 포털은 지도 이동음(mapchange)', n2.includes('mapchange') && !n2.includes('door'), n2.join());
  // 월드맵: 공방에 있어도 현재 위치는 잔다리 골목
  await ev(() => AU.World.enterMap('jandari_shop', 200, true)); await sleep(100);
  const lbl = await ev(() => (AU.MAPS[AU.World.mapId].parent) + '|' + AU.World.map.name);
  note('S15', '월드맵 현재 지역은 부모(잔다리 골목), 맵 이름은 정보상의 공방', lbl === 'jandari|정보상의 공방', lbl);
  // 저장·복원: 공방 안에서 저장 후 새로고침하면 공방에서 재개
  await ev(() => AU.G.save('t')); await p.reload(); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(600);
  const rm = await ev(() => AU.World.mapId);
  note('S16', '공방 안에서 저장 후 새로고침해도 공방에서 이어짐', rm === 'jandari_shop', rm);
  note('Z', '페이지 오류 없음', errs.length === 0, errs.slice(0, 3).join(' || ') || '0건');
  await b.close();
  const f = R.filter((x) => !x.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' PASS'); process.exit(f.length ? 1 : 0);
})();
