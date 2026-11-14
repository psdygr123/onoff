/* 효과음 연결: 게임 동작에 소리를 붙입니다. 기존 코드는 바꾸지 않고 함수를 감싸서 소리만 더합니다.
   (이 파일이 없어도 게임은 그대로 동작합니다. 소리 이름은 sfx.js의 AU.Sfx.CATALOG 참고) */
window.AU = window.AU || {};
(function () {
  const play = (n) => { try { if (AU.Sfx) AU.Sfx.play(n); } catch (e) { /* 소리 실패는 무시 */ } };
  const wrap = (obj, name, before, after) => {
    const orig = obj && obj[name]; if (typeof orig !== "function") return;
    obj[name] = function () {
      let ctx; try { ctx = before ? before.apply(this, arguments) : null; } catch (e) { /* 무시 */ }
      const r = orig.apply(this, arguments);
      try { if (after) after.call(this, ctx, r, arguments); } catch (e) { /* 무시 */ }
      return r;
    };
  };
  const W = AU.World, UI = AU.UI, G = AU.G, Ev = AU.Ev;
  let lastCrit = false;

  /* ---- 이동: 발걸음·착지 ---- */
  let stepAcc = 0;
  const surface = () => { const id = W && W.mapId || ""; if (/house|storage|dock|temple/.test(id)) return "step_wood"; if (/porto|plaza|town|port/.test(id)) return "step_stone"; return "step_dirt"; };
  wrap(W, "update", function () { const p = this.player; return p ? { og: p.onGround, vy: p.vy, x: p.x } : null; }, function (b) {
    const p = this.player; if (!b || !p || p.dead) return;
    if (!b.og && p.onGround && b.vy > 260) play("land");
    if (p.onGround && !p.rope) { stepAcc += Math.abs(p.x - b.x); if (stepAcc > 46) { stepAcc = 0; play(surface()); } } else stepAcc = 0;
  });
  wrap(W, "onAction", function (id) { const p = this.player; return p ? { id, og: p.onGround, vy: p.vy, rope: !!p.rope } : null; }, function (b) {
    const p = this.player; if (!b || !p || b.id !== "jump") return;
    if ((b.og || b.rope) && p.vy < -150) play("jump");
  });

  /* ---- 전투 ---- */
  wrap(W, "basicAttack", null, () => play("swing"));
  wrap(W, "rollDamage", null, (c, r) => { lastCrit = !!(r && r.crit); });
  wrap(W, "hurtMonster", function (m) { return m && m.alive ? m : null; }, function (m) {
    if (!m) return; play(lastCrit ? "crit" : "hit"); if (m.type) setTimeout(() => play("mon_" + m.type), 60);
  });
  wrap(W, "killMonster", null, () => play("kill"));
  wrap(W, "hurtPlayer", function () { const p = this.player; return p ? p.invuln : 0; }, function (b) { const p = this.player; if (p && b <= 0 && p.invuln > 0 && p.flash > 0.2) play("hurt"); });
  wrap(W, "useSkillSlot", function () { const p = this.player; return p ? p.atkT : 0; }, function (b) { const p = this.player; if (p && p.atkT > b + 0.05) play("skill"); });
  wrap(W, "travel", null, () => play("mapchange"));

  /* ---- 성장·아이템 ---- */
  if (Ev) {
    Ev.on("levelup", () => play("levelup")); Ev.on("jobchange", () => play("jobchange"));
    Ev.on("dead", () => play("death")); Ev.on("revive", () => play("revive"));
    Ev.on("toast", (d) => { if (d && d.kind === "warn") play("warn"); });
    Ev.on("saved", (d) => { if (d && d.reason === "manual") play("save"); });
  }
  wrap(G, "gainSilver", null, () => setTimeout(() => play("coin"), 120));
  wrap(G, "giveItem", null, (c, r, a) => { if (!a[2]) play("item"); });
  wrap(G, "useItem", null, (c, r) => { if (r) play("potion"); });
  wrap(G, "equip", null, (c, r) => { if (r) play("equip"); });
  wrap(G, "startQuest", null, () => play("accept"));
  wrap(G, "turnIn", null, () => play("complete"));

  /* ---- 메뉴·대화 ---- */
  wrap(UI, "open", null, () => play("menu_open"));
  wrap(UI, "close", function () { return !!UI.curName; }, (was) => { if (was) play("menu_close"); });
  let lastBlip = 0;
  const blip = () => { lastBlip = performance.now(); play("blip"); };
  wrap(UI, "say", null, blip);
  wrap(UI, "advanceDialog", null, blip);
  if (AU.Prologue) { wrap(AU.Prologue, "say", null, blip); }
  // 캐릭터 만들기의 카드·색 선택은 전용 소리(select_a/b/c 중 택1, 시험 페이지에서 비교). 나머지 버튼은 기존 click.
  const SELECT_SOUND = "select_a";
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest && e.target.closest("#ui button, #title button");
    if (!b || performance.now() - lastBlip <= 200) return;
    play(b.classList.contains("scard") || b.classList.contains("swatch") ? SELECT_SOUND : "click");
  }, true);
})();
