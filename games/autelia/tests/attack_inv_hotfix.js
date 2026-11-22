// 회귀: (1) 기본 공격이 공격 모션 타이머·쿨다운을 설정한다  (2) 알 수 없는 아이템이 든 저장을 불러와도 E/I 창이 열린다
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 850 } }), errs = []; let fail = 0;
  p.on("pageerror", (e) => errs.push(e.message));
  const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
  await p.goto("http://localhost:8801/index.html"); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click("#btn-start"); for (let i = 0; i < 2; i++) { try { await p.click("#job-next", { timeout: 1500 }); } catch (e) {} }
  await p.fill("#sname", "시험용"); await p.click("#setup-ok");
  await p.evaluate(() => AU.Prologue.debugComplete("porto")); await p.waitForTimeout(2000);
  const wid = await p.evaluate(() => { const id = Object.keys(AU.ITEMS).find((k) => AU.ITEMS[k].type === "equip" && AU.ITEMS[k].slot === "weapon"); AU.G.giveItem(id, 1); AU.G.equip(id); return id; });
  const r = await p.evaluate(() => { const W = AU.World, pl = W.player; pl.atkCD = 0; pl.atkT = 0; W.basicAttack(); return { cd: pl.atkCD, t: pl.atkT }; });
  ok(r.cd > 0 && r.t > 0, "기본 공격 시 atkCD/atkT 설정 " + JSON.stringify(r));
  // 저장에 없는 아이템을 심고 저장 → 다시 불러오기
  await p.evaluate(() => { AU.G.S.inv.zz_removed_item = 2; AU.G.S.equip.accessory = "zz_removed_equip"; AU.Store.set(AU.CONFIG.save.key, AU.G.S); });
  const loaded = await p.evaluate(() => { const s = AU.G.load(); AU.G.S = s; return { inv: !!s.inv.zz_removed_item, eq: s.equip.accessory }; });
  ok(!loaded.inv && loaded.eq === null, "알 수 없는 아이템 정리 " + JSON.stringify(loaded));
  for (const k of ["KeyE", "KeyI"]) { await p.keyboard.press(k); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.querySelectorAll(".window").length === 1), k + " 창 열림");
    await p.keyboard.press("Escape"); await p.waitForTimeout(200); }
  ok(errs.length === 0, "페이지 예외 없음 " + errs.slice(0, 2).join("|"));
  await b.close(); process.exit(fail ? 1 : 0);
})();
