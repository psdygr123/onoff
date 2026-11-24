/* 레벨별 몬스터 공격력은 레벨이 높을수록 커지고, 레벨업마다 최대 HP가 소폭씩(점점 커지게) 늘어남 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-start');
  const r = await p.evaluate(() => {
    const ms = Object.values(AU.MONSTERS).filter((m) => !m.boss && m.lv && m.atk).sort((a, c) => a.lv - c.lv);
    let mono = true, hpMono = true, expMono = true, maxStep = 0; for (let i = 1; i < ms.length; i++) { if (ms[i].atk < ms[i - 1].atk) mono = false; if (ms[i].hp < ms[i - 1].hp) hpMono = false; if (ms[i].lv <= 10 && ms[i].exp < ms[i - 1].exp) expMono = false; if (ms[i].lv > ms[i - 1].lv) maxStep = Math.max(maxStep, ms[i].atk - ms[i - 1].atk); }
    const gains = []; for (let l = 2; l <= 20; l++) gains.push(AU.levelHpBonus(l) - AU.levelHpBonus(l - 1));
    const grows = gains.every((g, i) => i === 0 || g >= gains[i - 1]) && gains[gains.length - 1] > gains[0];
    const hp = (lv) => AU.derive({ level: lv, stats: { STR: 5, VIT: 5, AGI: 5, DEX: 5, WIL: 5 }, equip: {} }, { stats: { STR: 5, VIT: 5, AGI: 5, DEX: 5, WIL: 5 } }).maxHp;
    return { mono, hpMono, expMono, maxStep, gains, grows, hp11: hp(11), hp15: hp(15), hp10: hp(10) };
  });
  const ok = r.mono && r.hpMono && r.expMono && r.maxStep <= 8 && r.grows && r.hp15 > r.hp11 && r.hp11 > r.hp10 && !errs.length; console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r), errs);
  await b.close(); process.exit(ok ? 0 : 1);
})();
