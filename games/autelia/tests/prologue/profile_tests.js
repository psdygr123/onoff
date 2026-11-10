// 캐릭터 설정(닉네임·모습) 시험: 신규 시작 화면, 검사, 저장·복원, 대사 호칭(조사), 기존 저장 보존, 본편 주인공 그림
const { open, sleep, SH } = require('./lib.js');
const R = []; const ok = (n, c, d) => { R.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  ' + d : '')); };
(async () => {
  const T = await open(); const { p, ev } = T;
  await T.fresh();
  // P01 신규 시작: 시작 버튼 → 캐릭터 설정(프롤로그는 아직 시작 전)
  await p.click('#btn-start'); await sleep(250);
  ok('P01a 신규 시작 시 캐릭터 설정 화면', !!(await p.$('#charsetup')));
  let s = await ev(() => ({ on: AU.Prologue.on, st: AU.G.S.prologue.state, set: AU.Profile.isSet() }));
  ok('P01b 설정 전에는 프롤로그가 시작되지 않음', !s.on && s.st === 'NOT_STARTED' && !s.set, JSON.stringify(s));
  await T.shot('profile_setup_default');
  // P02 닉네임 검사
  const okDis = async (v) => { await p.fill('#sname', v); return p.$eval('#setup-ok', (b) => b.disabled); };
  const cases = [['', true], ['가', true], ['하늘', false], ['abcdefghi', true], ['열두글자열두글자열두', true], ['하 늘', true], ['하늘!', true], ['ㄱㄴ', true], ['Sky99', false], ['여덟글자이름입니다', true], ['여덟글자이름입니', false]];
  for (const [v, dis] of cases) ok('P02 닉네임 "' + v + '" ' + (dis ? '불가' : '가능'), (await okDis(v)) === dis);
  await p.fill('#sname', 'a b'); ok('P02z 오류 안내 문구 표시', /띄어쓰기/.test(await p.textContent('#shint')));
  // P03 뒤로 → 제목 화면
  await p.click('#setup-back'); await sleep(200);
  ok('P03 뒤로 누르면 제목 화면으로 복귀(저장 없음)', !!(await p.$('#btn-start')) && !(await p.$('#charsetup')) && !(await ev(() => AU.Profile.isSet())));
  // P04 모습 선택(마우스·키보드)
  await p.click('#btn-start'); await sleep(200);
  ok('P04a 기본 선택은 남성형', (await p.getAttribute('#sg-m', 'aria-checked')) === 'true');
  await p.click('#sg-f'); ok('P04b 여성형 클릭', (await p.getAttribute('#sg-f', 'aria-checked')) === 'true' && (await p.getAttribute('#sg-m', 'aria-checked')) === 'false');
  await p.focus('#sg-f'); await p.keyboard.press('ArrowLeft'); ok('P04c 방향키로 남성형 복귀', (await p.getAttribute('#sg-m', 'aria-checked')) === 'true');
  await p.click('#sg-f'); await p.fill('#sname', '하늘'); await T.shot('profile_setup_filled');
  // P05 확정(Enter) → 저장 + 프롤로그 시작 + 여성형 그림
  await p.press('#sname', 'Enter'); await sleep(500);
  s = await ev(() => ({ on: AU.Prologue.on, st: AU.G.S.prologue.state, pr: AU.G.S.profile, g: AU.PRO_GENDER, hk: AU.Prologue.heroKey('actions'), has: AU.Img.has(AU.Prologue.heroKey('actions')), saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /autelia\.save/.test(k)))).profile }));
  ok('P05a Enter로 확정하면 프롤로그 시작', s.on && /SCENE_00/.test(s.st), JSON.stringify(s));
  ok('P05b 프로필 저장(메모리·저장소 모두)', s.pr.name === '하늘' && s.pr.gender === 'f' && s.saved.name === '하늘' && s.saved.gender === 'f', JSON.stringify(s.saved));
  ok('P05c 여성 주인공 그림 사용', s.g === 'f' && s.hk === 'pc_player_f_actions' && s.has, s.hk);
  await sleep(1500); await T.shot('profile_f_prologue');
  // P06 대사 호칭·화자 이름·초상화
  const talk = await ev(() => { const sp = AU.PRO_SPEAKERS.hero; AU.UI.say(sp, [{ npc: sp, t: '{이름은} 괜찮아. {이름아}, {이름이} {이름을} {이름과} 함께.' }]); return { name: document.querySelector('.dname').textContent, line: document.querySelector('.dline').textContent, img: (document.querySelector('.dlgbox .pt img') || {}).src || '' }; });
  ok('P06a 화자 이름이 닉네임', talk.name === '하늘', talk.name);
  ok('P06b 조사 자동(받침 있는 이름)', talk.line === '하늘은 괜찮아. 하늘아, 하늘이 하늘을 하늘과 함께.', talk.line);
  ok('P06c 여성 초상화', /pt_pro_hero_f|player_female/.test(talk.img), talk.img);
  const f2 = await ev(() => { AU.G.S.profile.name = '나무'; return AU.Profile.fmt('{이름은} {이름아} {이름이} {이름을} {이름과}'); });
  ok('P06d 조사 자동(받침 없는 이름)', f2 === '나무는 나무야 나무가 나무를 나무와', f2);
  ok('P06e {이름} 없는 문장은 그대로', (await ev(() => AU.Profile.fmt('...여기서부터 시작이야.'))) === '...여기서부터 시작이야.');
  await ev(() => { AU.G.S.profile.name = '하늘'; AU.UI.finishDialog && AU.UI.finishDialog(null); });
  // P07 저장 후 새로고침: 설정 화면 없이 이어하기, 설정 유지
  await ev(() => AU.G.save('test')); await p.reload(); await p.waitForSelector('#btn-start');
  const lab = await p.textContent('#btn-start'); await p.click('#btn-start'); await sleep(400);
  ok('P07a 이어하기는 설정 화면을 다시 묻지 않음', /프롤로그 이어하기/.test(lab) && !(await p.$('#charsetup')), lab);
  s = await ev(() => ({ n: AU.Profile.name(), g: AU.Profile.gender(), pg: AU.PRO_GENDER, sp: AU.PRO_SPEAKERS.hero.name }));
  ok('P07b 새로고침 후에도 닉네임·모습 유지', s.n === '하늘' && s.g === 'f' && s.pg === 'f' && s.sp === '하늘', JSON.stringify(s));
  // P08 제목 화면의 '캐릭터 설정'으로 변경
  await ev(() => { AU.main.running = false; }); await p.reload(); await p.waitForSelector('#btn-profile');
  ok('P08a 제목 화면에 캐릭터 설정 버튼(닉네임 표기)', /하늘/.test(await p.textContent('#btn-profile')));
  await p.click('#btn-profile'); await sleep(200); await p.fill('#sname', '바다'); await p.click('#setup-back'); await sleep(200);
  ok('P08b 취소하면 바뀌지 않음', (await ev(() => AU.Profile.name())) === '하늘');
  await p.click('#btn-profile'); await sleep(200); ok('P08c 설정을 열면 현재 값이 채워짐', (await p.inputValue('#sname')) === '하늘' && (await p.getAttribute('#sg-f', 'aria-checked')) === 'true');
  await p.fill('#sname', '바다'); await p.click('#sg-m'); await p.click('#setup-ok'); await sleep(300);
  ok('P08d 저장하면 제목 화면 복귀 + 값 반영', (await p.textContent('#btn-profile')).includes('바다') && (await ev(() => AU.Profile.gender())) === 'm' && (await ev(() => AU.PRO_GENDER)) === 'm');
  // P09 본편 주인공 그림(여성형 선택 시 옛 player_female 시트)
  await p.click('#btn-profile'); await sleep(200); await p.click('#sg-f'); await p.fill('#sname', '바다'); await p.click('#setup-ok'); await sleep(200);
  await p.click('#btn-start'); await sleep(400); await ev(() => AU.Prologue.debugComplete('arche')); await sleep(300);
  const keys = await ev(async () => { const w = AU.World, o = w.sprite, seen = new Set(); w.sprite = function (c, k) { seen.add(k); return o.apply(this, arguments); }; await new Promise((r) => setTimeout(r, 400)); w.sprite = o; return [...seen]; });
  ok('P09a 본편에서 여성형 주인공 시트 사용', keys.includes('player_female') && !keys.includes('player_male'), keys.join(','));
  await T.shot('profile_f_main');
  // P10 기존(프로필 없는) 저장: 설정 화면 없이 기본값
  await ev(() => { AU.main.running = false; }); await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => /autelia\.save/.test(x)); const o = JSON.parse(localStorage.getItem(k)); delete o.profile; localStorage.setItem(k, JSON.stringify(o)); });
  await p.reload(); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  s = await ev(() => ({ n: AU.Profile.name(), g: AU.Profile.gender(), set: AU.Profile.isSet(), on: AU.World && AU.Prologue.on }));
  ok('P10 프로필 없는 기존 저장: 설정 화면 없이 기본값(주인공·남성형)', !(await p.$('#charsetup')) && s.n === '주인공' && s.g === 'm' && !s.set, JSON.stringify(s));
  // P11 망가진 값 정리
  const c = await ev(() => [AU.Profile.clean({ name: '<b>', gender: 'x' }), AU.Profile.clean(null), AU.Profile.clean({ name: '하늘', gender: 'f' })]);
  ok('P11 잘못된 저장값은 비움', c[0].name === '' && c[0].gender === '' && c[1].name === '' && c[2].name === '하늘' && c[2].gender === 'f', JSON.stringify(c));
  ok('오류 없음', T.errs.length === 0, T.errs.join('|'));
  await T.b.close();
  const bad = R.filter((r) => !r[1]); console.log('\n합계 ' + (R.length - bad.length) + '/' + R.length + ' 통과'); process.exit(bad.length ? 1 : 0);
})();
