const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(), pg = await b.newPage(), errs = []; let ok = 0, n = 0;
  pg.on("pageerror", (e) => errs.push(String(e)));
  const T = (name, c, d) => { n++; if (c) ok++; console.log((c ? "PASS " : "FAIL ") + name + " :: " + JSON.stringify(d)); };
  const URL = "http://localhost:8801/index.html", sleep = (ms) => pg.waitForTimeout(ms);
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.goto(URL); await pg.waitForSelector("#btn-start"); await pg.click("#btn-start"); await sleep(300);
  for (let i = 0; i < 2 && await pg.$("#job-next"); i++) { await pg.click("#job-next"); await sleep(200); }
  if (await pg.$("#charsetup")) { await pg.fill("#sname", "시험용"); await pg.click("#setup-ok"); await sleep(300); }
  await pg.evaluate(() => AU.Prologue.debugComplete("arche")); await sleep(300);
  const r = await pg.evaluate(async () => {
    const W = AU.World; W.enterMap("forest", 400, true); W.trans = null;
    await new Promise((r) => setTimeout(r, 300));
    const m = W.monsters.find((x) => x.alive && x.type === "wild_boar") || null; if (!m) return { none: true };
    const p = W.player; p.hp = 9999; m.state = "patrol"; m.cd = 0; p.x = m.x - 120; p.y = m.y;
    const seen = []; let last = ""; const t0 = performance.now();
    while (performance.now() - t0 < 9000) { if (last !== m.state) { last = m.state; seen.push(m.state + "@" + Math.round(performance.now() - t0)); } p.hp = 9999; if (m.state === "chase" || m.state === "patrol") p.x = m.x - 100; await new Promise((r) => setTimeout(r, 30)); }
    return { seen, drops: ["fox", "snake", "crab"].map((k) => AU.MONSTERS[k].drops.filter((d) => /scarf|ring|vest/.test(d[0])).map((d) => d[1])) };
  });
  T("멧돼지 windup→lunge→recover→chase 순서", !r.none && r.seen.map((x) => x.split("@")[0]).join(",").includes("windup,lunge,recover,chase"), r);
  T("장비 드롭 확률 설정", r.drops && r.drops.every((a) => a[0] > 0), r.drops);
  T("페이지 오류 없음", errs.length === 0, errs);
  console.log(`\n${ok}/${n} PASS`); await b.close();
})();
