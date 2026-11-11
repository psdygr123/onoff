const { chromium } = require('playwright');
const fs = require('fs');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1', SH = (process.env.SHOTS || '/tmp/claude-0/shots') + '/';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, name, ok, ev }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  p.on('dialog', (d) => d.accept());
  const ev = (fn, arg) => p.evaluate(fn, arg);
  const S = () => ev(() => { const g = AU.G.S, w = AU.World, d = AU.G.d(); return { lv: g.level, exp: g.exp, hp: Math.round(g.hp * 10) / 10, maxHp: d.maxHp, atk: d.atk, res: g.resource, x: Math.round(w.player.x), y: Math.round(w.player.y), map: w.mapId, stats: JSON.stringify(g.stats), silver: g.silver, tp: g.trainingPoints, fp: g.freePoints, job: g.job, ui: AU.UI.curName, dlg: !!AU.UI.dialog }; });
  const win = () => ev(() => { const t = document.querySelector('.window .wtitle span'); return t ? t.textContent : null; });
  const fresh = async () => { await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300); if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); } await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200); };
  const holdUntil = async (key, cond, max = 6000, step = 80) => { await p.keyboard.down(key); const t0 = Date.now(); let ok = false; while (Date.now() - t0 < max) { if (await ev(cond)) { ok = true; break; } await sleep(step); } await p.keyboard.up(key); return ok; };
  // 가까이 붙여 놓고 Ctrl로 때려서 처치(체력이 위험하면 테스트 쪽에서 HP만 보충: 전투 결과가 아니라 시험 안정성 목적)
  const kill = async (type, max = 14000) => {
    const ok = await ev((type) => { const W = AU.World, pl = W.player; const m = W.monsters.find((q) => q.alive && q.type === type); if (!m) return false; W.__t = m; m.x = pl.x + 70; m.y = pl.y; m.state = 'patrol'; m.cd = 2; pl.dir = 1; return true; }, type);
    if (!ok) return false;
    await p.keyboard.down('Control'); const t0 = Date.now(); let dead = false;
    while (Date.now() - t0 < max) { dead = await ev(() => { const W = AU.World, m = W.__t, pl = W.player; if (AU.G.S.hp < AU.G.d().maxHp * 0.4) AU.G.S.hp = AU.G.d().maxHp; if (m.alive) { m.x = pl.x + 70; m.y = pl.y; pl.dir = 1; } return !m.alive; }); if (dead) break; await sleep(60); }
    await p.keyboard.up('Control'); return dead;
  };
  const goto = (m, x) => ev(([m, x]) => { AU.World.enterMap(m, x, true); AU.World.trans = null; }, [m, x]);

  // ===== 1. 이동·점프 =====
  await fresh();
  let s0 = await S();
  await p.keyboard.down('ArrowRight'); await sleep(500); await p.keyboard.up('ArrowRight'); let s1 = await S();
  await p.keyboard.down('ArrowLeft'); await sleep(600); await p.keyboard.up('ArrowLeft'); let s2 = await S();
  await p.keyboard.down('Alt'); await sleep(180); const air = await S(); await sleep(1200); await p.keyboard.up('Alt'); const landed = await S();
  // 점프키를 계속 누르고 있어도 한 번만 점프(착지 후 다시 뜨지 않음)
  const dir = await ev(() => AU.World.player.dir);
  note('1', '방향키 이동·Alt 점프', s1.x > s0.x + 60 && s2.x < s1.x - 30 && air.y < 580 && landed.y === 590, `→ ${s0.x}→${s1.x}, ← ${s1.x}→${s2.x}, 점프 중 y=${air.y}, 착지 y=${landed.y}(Alt를 계속 누르고 있어도 착지 상태 유지)`);

  // ===== 6. NPC 대화 (Space) + 대화 중 입력 차단 =====
  await holdUntil('ArrowRight', () => AU.World.player.x >= 560, 5000);
  const near = await ev(() => AU.World.prompt);
  await p.keyboard.press('Space'); await sleep(150);
  const d1 = await S(); const line1 = await ev(() => document.querySelector('.dline') && document.querySelector('.dline').textContent);
  // 대화 중 Alt/Ctrl/I 입력이 게임에 새지 않는지
  const hpAtkBefore = await ev(() => AU.World.player.atkCD);
  await p.keyboard.down('Alt'); await sleep(120); const ydlg = (await S()).y; await p.keyboard.up('Alt');
  await p.keyboard.down('Control'); await sleep(150); const atkDlg = await ev(() => AU.World.player.atkCD); await p.keyboard.up('Control');
  await p.keyboard.press('i'); const winDlg = await win();
  await p.keyboard.press('Space'); await sleep(100); await p.keyboard.press('Space'); await sleep(150); // 두 번째 줄 → 수락
  const q1 = await ev(() => AU.G.S.quests.q_first && AU.G.S.quests.q_first.state);
  note('6', 'Space로 NPC 대화·퀘스트 수락', /대화/.test(near) && d1.dlg && !!line1 && q1 === 'active', `안내문="${near}", 대화 열림=${d1.dlg}, 첫 줄="${line1}", 수락 후 q_first=${q1}`);
  note('16a', '대화 중 점프·공격·메뉴키 차단', ydlg === 590 && atkDlg === 0 && winDlg === null, `대화 중 Alt 후 y=${ydlg}(590=점프 안 함), Ctrl 후 공격쿨=${atkDlg}, I키 창=${winDlg}`);

  // ===== 2·3·4·5. 전투·경험치·레벨업 =====
  await goto('forest', 480);
  const pre = await S();
  // 2: 피해
  const hpBefore = await ev(() => { const W = AU.World, pl = W.player, m = W.monsters.find((q) => q.alive && q.type === 'fox'); m.x = pl.x + 70; m.y = pl.y; m.state = 'patrol'; m.cd = 5; pl.dir = 1; W.__t = m; return m.hp; });
  await p.keyboard.press('Control'); await sleep(200);
  const hpAfter = await ev(() => AU.World.__t.hp);
  note('2', 'Ctrl 기본 공격 피해', hpAfter < hpBefore, `들여우 HP ${hpBefore} → ${hpAfter} (키 입력은 실제 Ctrl)`);
  // 3: 처치→경험치
  const exp0 = (await S()).exp;
  const k1 = await kill('fox'); const afterK = await S();
  const expGain = (afterK.lv - pre.lv) * 0 + (afterK.exp - exp0);
  note('3', '적 처치 시 경험치 획득', k1 && afterK.exp === exp0 + 34, `처치=${k1}, EXP ${exp0} → ${afterK.exp} (들여우 EXP 34), 은화 ${pre.silver}→${afterK.silver}`);
  // 4: 레벨업(실전)
  await kill('fox'); await kill('fox');
  const afterLv = await S(); const hud = await ev(() => document.querySelector('.lvbadge').textContent);
  const qstate = await ev(() => AU.G.S.quests.q_first.state);
  note('4', '경험치 충족 시 레벨업', afterLv.lv === 2 && hud === 'Lv.2', `Lv ${pre.lv} → ${afterLv.lv}, 남은 EXP ${afterLv.exp}, HUD="${hud}"`);
  note('5', '레벨업 후 능력치·HP 갱신', afterLv.maxHp > pre.maxHp && afterLv.atk > pre.atk && afterLv.hp === afterLv.maxHp && afterLv.stats !== pre.stats, `최대HP ${pre.maxHp}→${afterLv.maxHp}, 공격력 ${pre.atk}→${afterLv.atk}, 현재HP=${afterLv.hp}(전부 회복), 스탯 ${pre.stats}→${afterLv.stats}`);
  await p.screenshot({ path: SH + 'combat.png' });

  // 퀘스트 반납 + 장비
  await goto('arche', 580); await sleep(100);
  await p.keyboard.press('Space'); await sleep(120); await p.keyboard.press('Space'); await sleep(150);
  const swordCount = await ev(() => AU.G.count('sword_a')), qdone = await ev(() => AU.G.S.quests.q_first.state);

  // ===== 7. 창 열기 =====
  const map = [['i', '인벤토리'], ['e', '장비'], ['s', '스탯'], ['q', '퀘스트'], ['k', '스킬'], ['j', '모험일지'], ['w', '월드맵'], ['\\', '설정 (소리·키보드)']];
  const got = [];
  for (const [k, t] of map) { await p.keyboard.press(k); await sleep(120); const w = await win(); got.push(w === t); if (k === 's' || k === 'i' || k === 'w') await p.screenshot({ path: SH + 'win_' + t + '.png' }); await p.keyboard.press('Escape'); await sleep(80); }
  note('7', 'I·E·S 및 Q·K·J·W·\\ 창 열림', got.every(Boolean), map.map(([k, t], i) => `${k}→${t}:${got[i] ? 'O' : 'X'}`).join(' ') + ` / 퀘스트 반납=${qdone}, 검 획득=${swordCount}`);
  // 8: W 토글
  await p.keyboard.press('w'); await sleep(100); const w1 = await win(); await p.keyboard.press('w'); await sleep(100); const w2 = await win();
  note('8', 'W로 월드맵 열기·닫기', w1 === '월드맵' && w2 === null, `첫 입력=${w1}, 다시 입력=${w2}`);

  // ===== 장비 장착이 전투 능력치에 반영 =====
  const a0 = (await S()).atk;
  await p.keyboard.press('e'); await sleep(100); await p.click('.window .detail .btn.primary'); await sleep(150); await p.keyboard.press('Escape'); const a1 = (await S()).atk;
  note('7b', '장비 장착 → 공격력 반영', a1 === a0 + 4, `공격력 ${a0} → ${a1} (견습용 검 +4)`);

  // ===== 10. 10레벨 전 현실 미션 잠김 =====
  await ev(() => { AU.G.gainExp(AU.expToNext(AU.G.S.level) * 3, 'dev'); }); // 레벨 4~5 정도
  const lvMid = await S();
  await p.keyboard.press('j'); await sleep(150);
  const jtxt = await ev(() => document.querySelector('.window').textContent);
  const tabsCount = await ev(() => document.querySelectorAll('.window .tabs').length);
  await p.keyboard.press('Escape');
  await p.keyboard.press('q'); await sleep(100); const qtxt = await ev(() => document.querySelector('.window').textContent); await p.keyboard.press('Escape');
  await p.keyboard.press('Escape'); await sleep(100); const mtxt = await ev(() => document.querySelector('.window').textContent); await p.keyboard.press('Escape');
  const apiLocked = await ev(() => { AU.G.S.flags.missionsUnlocked = false; return [AU.G.discoverMissions(), AU.G.setMissionState('m_p1', 'accept')]; });
  note('10', '10레벨 이전 현실 미션 잠김', !/현실/.test(jtxt + qtxt + mtxt) && tabsCount === 0 && apiLocked[0] === false && apiLocked[1] === false && !lvMid.job.includes('warrior'), `Lv.${lvMid.lv}: 일지·퀘스트·메뉴 화면에 '현실' 문구 없음=${!/현실/.test(jtxt + qtxt + mtxt)}, 일지 탭 수=${tabsCount}, 강제 호출 discover=${apiLocked[0]}, accept=${apiLocked[1]}`);

  // ===== 11. 10레벨 도달 → 아직 미해금 → 전직 후 해금 =====
  await ev(() => { AU.G.gainExp(1e6, 'dev'); });
  const lv10 = await S(); const unl10 = await ev(() => AU.G.S.flags.missionsUnlocked);
  const capBefore = lv10.lv; await ev(() => AU.G.gainExp(5000, 'dev')); const lvStill = (await S()).lv;
  await goto('porto', 860); await sleep(100);
  await p.keyboard.press('Space'); await sleep(120); await p.keyboard.press('Space'); await sleep(120); await p.keyboard.press('Space'); await sleep(150); // 열기→다음→수락
  const qj = await ev(() => AU.G.S.quests.q_job && AU.G.S.quests.q_job.state);
  await goto('docks', 700); await sleep(1300); // 보스 등장 확인
  const bossThere = await ev(() => AU.World.monsters.some((m) => m.type === 'trial_boss' && m.alive));
  const bossDead = await kill('trial_boss', 40000);
  await ev(() => { AU.G.S.hp = AU.G.d().maxHp; });
  const qj2 = await ev(() => AU.G.S.quests.q_job.state);
  const unlBefore = await ev(() => AU.G.S.flags.missionsUnlocked);
  await goto('porto', 860); await sleep(100);
  await p.keyboard.press('Space'); await sleep(150); await p.keyboard.press('Space'); await sleep(300);
  const post = await S(); const unlAfter = await ev(() => AU.G.S.flags.missionsUnlocked); const jobcard = await win();
  await p.screenshot({ path: SH + 'jobcard.png' });
  const slots = await ev(() => JSON.stringify(AU.G.S.skills.slots));
  note('11', '10레벨 도달만으론 미해금, 전직 후 해금', lv10.lv === 10 && unl10 === false && lvStill === 10 && qj === 'active' && bossThere && bossDead && qj2 === 'ready' && unlBefore === false && post.job === 'warrior' && unlAfter === true && jobcard === '전직',
    `Lv=${lv10.lv}(10에서 정지 ${lvStill}), 해금(전직 전)=${unl10}, 시험 수락=${qj}, 시험대상 등장=${bossThere}, 처치=${bossDead}, 반납 전 해금=${unlBefore}, 전직 후 직업=${post.job}, 해금=${unlAfter}, 전직 안내창="${jobcard}", 스킬슬롯=${slots}, 자유 포인트=${post.fp}`);
  await p.keyboard.press('Escape'); await sleep(100);

  // ===== 현실 미션 흐름 / 13. 중복 지급 방지 =====
  await p.keyboard.press('j'); await sleep(100);
  const lockedMsg = await ev(() => document.querySelector('.window .lockbox') ? document.querySelector('.window .lockbox').textContent : '');
  await p.keyboard.press('Escape');
  await goto('porto', 1200); await sleep(100); for (let i = 0; i < 4; i++) { await p.keyboard.press('Space'); await sleep(120); }
  const guideMet = await ev(() => AU.G.S.flags.guideMet);
  await p.keyboard.press('j'); await sleep(150); await p.screenshot({ path: SH + 'missions.png' });
  const cardCount = await ev(() => document.querySelectorAll('.window .mission').length);
  // 화면 버튼으로 수락 → 해 봤어요 → 완료했어요
  const tp0 = (await S()).tp;
  const clickBtn = async (txt) => { await p.locator('.window .mission:has-text("좋아하는 노래") .btn', { hasText: txt }).first().click(); await sleep(120); };
  await clickBtn('수락'); await clickBtn('해 봤어요'); await clickBtn('완료했어요');
  const tp1 = (await S()).tp;
  const again = await ev(() => [AU.G.setMissionState('m_p1', 'done'), AU.G.setMissionState('m_p1', 'accept'), AU.G.setMissionState('m_p1', 'retry'), AU.G.ms('m_p1').rewarded]);
  const tp2 = (await S()).tp;
  // 한도 검사
  await ev(() => { for (const id of ['m_e1', 'm_r1', 'm_m1', 'm_a1']) { AU.G.setMissionState(id, 'accept'); AU.G.setMissionState(id, 'attempt'); AU.G.setMissionState(id, 'done'); } });
  const tp3 = (await S()).tp, wk3 = await ev(() => AU.G.S.missions.weekPoints);
  await ev(() => { for (const id of ['m_p2', 'm_e2']) { AU.G.setMissionState(id, 'accept'); AU.G.setMissionState(id, 'attempt'); AU.G.setMissionState(id, 'done'); } });
  const tp4 = (await S()).tp, wk4 = await ev(() => AU.G.S.missions.weekPoints);
  await p.keyboard.press('Escape');
  note('13', '훈련 포인트 중복 지급 방지·주간 한도', tp1 === tp0 + 1 && tp2 === tp1 && again[0] === false && again[1] === false && again[2] === false && wk4 === 6 && tp4 === tp3 + 1,
    `완료 1회 +${tp1 - tp0}, 같은 미션 재완료 시도 후 ${tp2}(변화 없음), 5개 완료 후 주간 ${wk3}/6, 2단계 2개 추가 후 주간 ${wk4}/6(한도), 포인트 ${tp3}→${tp4}`);
  note('11b', '전직 후 현실 미션 화면(발견 전 안내 → 안내인 대화 후 목록)', /기다리고/.test(lockedMsg) && guideMet === true && cardCount >= 5, `발견 전 안내문="${lockedMsg.slice(0, 30)}…", 안내인 대화 후 guideMet=${guideMet}, 표시된 카드=${cardCount}`);

  // ===== 12. 현실 미션 없이도 진행 =====
  // 새 상태에서 현실 미션을 전혀 건드리지 않고 전직 이후 11레벨 + 스탯 분배까지 가능한지 별도 검증은 아래 'noMission' 페이지에서
  // ===== 스탯 분배 미리보기 → 적용 / 미적용 취소 =====
  const st0 = await S(); await p.keyboard.press('s'); await sleep(120);
  await p.locator('.statrow').nth(0).locator('.plus').click(); await p.locator('.statrow').nth(0).locator('.plus').click(); await p.locator('.statrow').nth(1).locator('.plus').click(); await sleep(100);
  const prevTxt = await ev(() => document.querySelector('.derived').textContent);
  await p.keyboard.press('Escape'); await sleep(100); const stCancel = await S(); // 적용 없이 닫음
  await p.keyboard.press('s'); await sleep(120);
  await p.locator('.statrow').nth(0).locator('.plus').click(); await p.locator('.statrow').nth(4).locator('.plus').click(); await p.locator('.statrow').nth(4).locator('.plus').click();
  await p.locator('.statactions .primary').click(); await sleep(150); await p.screenshot({ path: SH + 'stats_applied.png' }); await p.keyboard.press('Escape');
  const st1 = await S();
  note('8b', '스탯 분배: 미리보기·미적용 취소·적용·전투 반영', /→/.test(prevTxt) && stCancel.stats === st0.stats && stCancel.fp === st0.fp && st1.atk === st0.atk + 2 && st1.fp + st1.tp === st0.fp + st0.tp - 3, `미리보기 문구="${prevTxt.replace(/\s+/g, ' ').slice(0, 60)}", 미적용 닫기 후 포인트 ${stCancel.fp}+${stCancel.tp}(변화 없음), 적용 후 공격력 ${st0.atk}→${st1.atk}, 포인트 ${st0.fp + st0.tp}→${st1.fp + st1.tp}`);

  // ===== 14. 스킬 자원 =====
  await goto('porto', 300); await sleep(100);
  await ev(() => { AU.G.setResource(100); AU.G.S.hp = 10; AU.G.changed(); });
  const c1 = await ev(() => [AU.G.skillCost('strike'), AU.G.skillCost('spin'), AU.G.skillCost('focus')]);
  const rA = (await S()).res; await p.keyboard.press('Control'); await sleep(150); const rBasic = (await S()).res; // 기본 공격은 소모 없음
  await p.keyboard.press('1'); await sleep(150); const rB = (await S()).res;
  await p.keyboard.press('1'); await sleep(100); const rC = (await S()).res; // 쿨다운 중
  await sleep(500); await p.keyboard.press('2'); await sleep(150); const rD = (await S()).res;
  await sleep(500); await p.keyboard.press('3'); await sleep(150); const sE = await S();
  await ev(() => AU.G.setResource(5)); await sleep(3200); await p.keyboard.press('1'); await sleep(150); const rF = (await S()).res;
  const round1 = (n) => Math.round(n * 10) / 10;
  note('14', '스킬 사용 시 자원 비용·부족 제한', rBasic === rA && round1(rA - rB) === c1[0] && rC === rB && round1(rB - rD) === c1[1] && round1(100 - c1[0] - c1[1] - sE.res) === c1[2] - 0 + 0 && sE.hp > 10 && rF === 5,
    `실제 비용(의지 효율 적용) 강타=${c1[0]}, 회전 베기=${c1[1]}, 숨 고르기=${c1[2]} / 기본공격 후 ${rA}→${rBasic}(소모 없음), 강타 ${rA}→${rB}, 쿨다운 중 재입력 ${rB}→${rC}, 회전 베기 →${rD}, 숨 고르기 후 자원 ${sE.res}·HP 10→${sE.hp}, 자원 5일 때 강타 입력 후 ${rF}(차감 없음)`);

  // ===== 9. 키보드 설정 =====
  await p.keyboard.press('\\'); await sleep(120);
  await p.locator('.keyrow:has-text("점프") .keycap').click(); await p.keyboard.press('z'); await sleep(120);
  const bz = await ev(() => AU.Input.bindings.jump); const savedSet = await ev(() => JSON.parse(localStorage.getItem('autelia.settings:local')).bindings.jump);
  await p.keyboard.press('Escape'); await sleep(80);
  await goto('porto', 400); await p.keyboard.down('Alt'); await sleep(150); const yAlt = (await S()).y; await p.keyboard.up('Alt'); await sleep(900);
  await p.keyboard.down('z'); await sleep(150); const yZ = (await S()).y; await p.keyboard.up('z'); await sleep(900);
  // 중복 키 → 교체 확인
  await p.keyboard.press('\\'); await sleep(100);
  await p.locator('.keyrow:has-text("기본 공격") .keycap').click(); await p.keyboard.press('z'); await sleep(150);
  const modalTxt = await ev(() => document.querySelector('.modal') ? document.querySelector('.modal').textContent : ''); await p.screenshot({ path: SH + 'keyconflict.png' });
  await p.locator('.modal .btn.primary').click(); await sleep(120);
  const bd = await ev(() => [AU.Input.bindings.attack, AU.Input.bindings.jump]);
  // 새로고침 후에도 유지
  await p.keyboard.press('Escape'); await sleep(80); await p.reload(); await p.waitForSelector('#btn-start'); const bAfter = await ev(() => [AU.Input.bindings.attack, AU.Input.bindings.jump]);
  // 기본값 복원
  await p.click('#btn-start'); await sleep(200); await p.keyboard.press('\\'); await sleep(100); await p.locator('.keyfoot .btn', { hasText: '기본값' }).click(); await sleep(100);
  const bDef = await ev(() => [AU.Input.bindings.attack, AU.Input.bindings.jump]); await p.keyboard.press('Escape');
  note('9', '키 설정 변경·중복 감지·저장·복원', bz === 'KeyZ' && savedSet === 'KeyZ' && yAlt === 590 && yZ < 585 && /이미 ‘점프’/.test(modalTxt) && bd[0] === 'KeyZ' && bd[1] === 'ControlLeft' && bAfter[0] === 'KeyZ' && bDef[0] === 'ControlLeft' && bDef[1] === 'AltLeft',
    `점프를 Z로 변경=${bz}(저장=${savedSet}), 변경 후 Alt 점프 y=${yAlt}(안 뜀), Z 점프 y=${yZ}(뜸), 중복 안내="${modalTxt.slice(0, 34)}…", 교체 후 [공격,점프]=${bd}, 새로고침 후=${bAfter}, 기본값 복원=${bDef}`);

  // ===== 15. 저장/복원 =====
  await goto('porto', 900); await ev(() => { AU.G.save('test'); });
  const before = await ev(() => { const g = AU.G.S; return JSON.stringify({ lv: g.level, exp: g.exp, job: g.job, equip: g.equip, quests: Object.fromEntries(Object.entries(g.quests).map(([k, v]) => [k, v.state])), map: g.map, res: g.resource, alloc: g.alloc, inv: g.inv, ms: g.flags.missionsUnlocked, mst: g.missions.states.m_p1, tp: g.trainingPoints }); });
  await p.reload(); await p.waitForSelector('#btn-start'); const btnTxt = await p.textContent('#btn-start'); await p.click('#btn-start'); await sleep(300);
  const after = await ev(() => { const g = AU.G.S; return JSON.stringify({ lv: g.level, exp: g.exp, job: g.job, equip: g.equip, quests: Object.fromEntries(Object.entries(g.quests).map(([k, v]) => [k, v.state])), map: g.map, res: g.resource, alloc: g.alloc, inv: g.inv, ms: g.flags.missionsUnlocked, mst: g.missions.states.m_p1, tp: g.trainingPoints }); });
  const posAfter = await S();
  note('15', '저장 후 재실행 시 복원(레벨·장비·퀘스트·전직·미션·자원)', before === after && posAfter.map === 'porto' && Math.abs(posAfter.x - 900) < 40, `이어하기 버튼="${btnTxt}", 저장값=복원값 일치=${before === after}, 복원 위치=${posAfter.map}/${posAfter.x}`);

  // ===== 16. 메뉴와 플레이 충돌 =====
  await p.keyboard.down('ArrowRight'); await sleep(100); await p.keyboard.press('i'); await sleep(100); await p.keyboard.up('ArrowRight'); const xw0 = (await S()).x;
  await p.keyboard.down('ArrowRight'); await sleep(300); await p.keyboard.up('ArrowRight'); const xw1 = (await S()).x; // 창 열린 동안 이동 안 함
  await p.keyboard.down('Control'); await sleep(200); await p.keyboard.up('Control'); const atkCDwin = await ev(() => AU.World.player.atkCD);
  await p.keyboard.press('Escape'); await sleep(100); const xr0 = (await S()).x; await sleep(400); const xr1 = (await S()).x; // 닫은 뒤 유령 이동 없음
  await p.keyboard.press('Escape'); await sleep(100); const menuOpen = await win(); await p.keyboard.press('w'); await sleep(100); const switched = await win(); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await sleep(80);
  note('16b', '메뉴 열림 중 입력 차단·닫은 뒤 입력 정상', xw1 === xw0 && atkCDwin === 0 && xr1 === xr0 && menuOpen === '메뉴' && switched === '월드맵', `창 열린 채 → 키 이동 ${xw0}→${xw1}, Ctrl 공격쿨=${atkCDwin}, 닫은 뒤 유령 이동 ${xr0}→${xr1}, Esc=${menuOpen}, 메뉴에서 W=${switched}`);

  // ===== 12. 현실 미션 없이 진행(새 저장) =====
  await fresh();
  await ev(() => { AU.G.gainExp(1e6, 'dev'); AU.G.S.quests.q_job = { state: 'ready', prog: [1] }; });
  await goto('porto', 860); await p.keyboard.press('Space'); await sleep(150); await p.keyboard.press('Space'); await sleep(250); await p.keyboard.press('Escape'); await sleep(100);
  const nm0 = await S(); await ev(() => { AU.G.gainExp(AU.expToNext(AU.G.S.level), 'dev'); });
  const nm1 = await S(); const msUntouched = await ev(() => Object.values(AU.G.S.missions.states).every((s) => s.state === 'locked'));
  await goto('docks', 400); const killed = await kill('crab'); const nm2 = await S();
  note('12', '현실 미션 없이 메인 RPG 계속 진행', nm0.job === 'warrior' && nm1.lv === 11 && nm1.fp === 3 + 3 && msUntouched && killed && nm2.exp > nm1.exp, `전직 직후 직업=${nm0.job}, 미션 전부 미해금 상태(건드리지 않음)=${msUntouched}, 그 상태로 11레벨 도달=${nm1.lv}(자유 포인트 ${nm1.fp}), 전투 경험치 ${nm1.exp}→${nm2.exp}`);

  const errs1 = errs.slice();
  fs.writeFileSync((process.env.SHOTS || '/tmp') + '/results_part1.json', JSON.stringify({ R, errs: errs1 }, null, 1));
  console.log('ERRORS (part1):', JSON.stringify(errs1));
  await b.close();
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
