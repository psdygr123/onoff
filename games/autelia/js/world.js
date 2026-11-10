/* 월드: 캐릭터 이동(점프·발판·밧줄), 적 AI, 전투, 포털, 카메라, 그리기.
   이동 수치와 밧줄·발판 방식은 이전 아스텔리아 시제품의 규칙을 이어받았습니다. */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG, W = C.W, H = C.H, GROUND = C.GROUND;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);

  const World = AU.World = {
    mapId: null, map: null, player: null, monsters: [], fx: [], floaters: [], camX: 0, time: 0,
    trans: null, deadT: 0, prompt: "", nearNpc: null, nearPortal: null, bossCheckT: 0, blockedFn: () => false,

    init() {
      const S = AU.G.S;
      this.player = { x: S.x, y: GROUND, vx: 0, vy: 0, onGround: true, rope: null, dir: 1, invuln: 0, atkT: 0, atkCD: 0, gcd: 0, cd: {}, flash: 0, dead: false, drop: 0, anim: 0 };
      this.enterMap(S.map, S.x, true);
      AU.Ev.on("floater", (f) => { if (f.onPlayer) this.floater(this.player.x, this.player.y - 130, f.text, f.color); });
    },
    isBlocked() { return this.blockedFn() || !!this.trans || this.player.dead || !!(AU.Prologue && AU.Prologue.on && AU.Prologue.locked()); },

    /* ---------- 맵 입장 ---------- */
    enterMap(id, x, silent) {
      const S = AU.G.S, m = AU.MAPS[id]; this.mapId = id; this.map = m;
      S.map = id; S.x = x; S.visited[id] = true; // 이동 직후 저장해도 새 위치가 기록되도록
      const p = this.player; p.x = x; p.y = GROUND; p.vx = 0; p.vy = 0; p.rope = null; p.onGround = true;
      this.camX = Math.max(0, Math.min(m.width - W, x - W / 2));
      this.monsters = []; this.fx = []; this.floaters = [];
      (m.spawns || []).forEach((sp, i) => this.spawn(sp.type, sp.x, sp.y, sp.min, sp.max, "s" + i));
      this.bossCheckT = 0; this.syncBoss();
      if (!silent) { AU.G.save("map"); AU.Ev.emit("mapchange", { id }); }
    },
    travel(to, x) {
      if (this.trans) return;
      this.trans = { t: 0, dur: 0.55, to, x, swapped: false };
    },
    syncBoss() {
      const m = this.map; if (!m.boss) return;
      const has = this.monsters.some((q) => q.type === m.boss.type && q.alive);
      if (AU.G.bossActive() && !has) this.spawn(m.boss.type, m.boss.x, undefined, undefined, undefined, "boss");
    },
    spawn(type, x, y, min, max, tag) {
      const d = AU.MONSTERS[type];
      const m = { type, d, tag, x, y: y || GROUND, hp: d.hp, maxHp: d.hp, alive: true, dir: Math.random() < 0.5 ? -1 : 1, vx: 0, state: "patrol", st: 0, cd: rnd(0.5, 2),
        flash: 0, home: x, min: min != null ? min : Math.max(40, x - 220), max: max != null ? max : Math.min(this.map.width - 40, x + 220), respawnT: 0, pause: 0, kb: 0 };
      this.monsters.push(m); return m;
    },

    /* ---------- 표시용 텍스트 ---------- */
    floater(x, y, text, color) { this.floaters.push({ x, y, text, color: color || "#fff", t: 0 }); },

    /* ---------- 갱신 ---------- */
    update(dt) {
      this.time += dt;
      const S = AU.G.S, p = this.player;
      S.playSec += dt;
      // 전환 연출
      if (this.trans) {
        const t = this.trans; t.t += dt;
        if (!t.swapped && t.t >= t.dur / 2) { t.swapped = true; this.enterMap(t.to, t.x); }
        if (t.t >= t.dur) this.trans = null;
      }
      // 사망 처리
      if (p.dead) {
        this.deadT += dt;
        if (this.deadT >= C.combat.respawnDelay) {
          p.dead = false; this.deadT = 0;
          const dest = S.visited.porto ? "porto" : "arche";
          p.invuln = 1.5; S.hp = AU.G.d().maxHp;
          this.enterMap(dest, AU.MAPS[dest].start || 200);
          AU.G.toast("안전한 곳에서 다시 일어났습니다.", "info"); AU.Ev.emit("revive");
        }
      }
      for (const f of this.floaters) f.t += dt; this.floaters = this.floaters.filter((f) => f.t < 0.9);
      for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < f.dur);

      const blocked = this.isBlocked();
      this.updatePlayer(dt, blocked);
      this.updateMonsters(dt);
      // 쿨다운
      p.invuln = Math.max(0, p.invuln - dt); p.flash = Math.max(0, p.flash - dt); p.atkT = Math.max(0, p.atkT - dt);
      p.atkCD = Math.max(0, p.atkCD - dt); p.gcd = Math.max(0, p.gcd - dt);
      for (const k of Object.keys(p.cd)) p.cd[k] = Math.max(0, p.cd[k] - dt);
      // 안전 지역 자연 회복
      if (this.map.safe && !p.dead) { const mx = AU.G.d().maxHp; if (S.hp < mx) S.hp = Math.min(mx, S.hp + mx * C.combat.safeRegenPerSec * dt); }
      this.bossCheckT += dt; if (this.bossCheckT > 1) { this.bossCheckT = 0; this.syncBoss(); }
      this.updateCam(dt);
      S.x = p.x;
    },
    // 카메라: 평소에는 플레이어를 따라가고, 프롤로그 컷신 중에는 엔진이 지정한 위치로 고정
    updateCam(dt) {
      const P = AU.Prologue, p = this.player, mw = this.map.width;
      if (P && P.on && P.cam.mode === "fixed") { this.camX = Math.max(0, Math.min(mw - W, P.cam.x - W / 2)); return; }
      const target = Math.max(0, Math.min(mw - W, p.x - W / 2));
      this.camX += (target - this.camX) * Math.min(1, dt * 6);
    },

    updatePlayer(dt, blocked) {
      const p = this.player, I = AU.Input, M = C.move, map = this.map;
      const virt = this.virt; // 컷신이 주인공을 걷게 할 때(프롤로그)는 키 입력 대신 가상 입력을 씀
      const left = virt ? virt.dir < 0 : !blocked && I.isHeld("left"), right = virt ? virt.dir > 0 : !blocked && I.isHeld("right"), up = !blocked && I.isHeld("up"), down = !blocked && I.isHeld("down");
      const mv = (right ? 1 : 0) - (left ? 1 : 0);
      this.nearNpc = null; this.nearPortal = null;

      if (p.rope) {
        const r = p.rope; p.x = r.x; p.vx = 0; p.vy = 0;
        const vv = (down ? 1 : 0) - (up ? 1 : 0);
        p.y += vv * M.ropeSpeed * dt; p.anim += Math.abs(vv) * dt * 8;
        if (p.y >= r.bottom) { p.y = r.bottom; p.rope = null; p.onGround = true; }
        else if (p.y <= r.top) { p.y = r.top; p.rope = null; p.vy = -300; p.vx = (r.exitDir || 1) * 170; p.onGround = false; }
        return;
      }
      // 좌우 이동: 부드러운 가속·감속
      const sp = M.speed * (virt && virt.k || 1), target = mv * sp;
      if (mv) { p.dir = mv; p.vx += Math.sign(target - p.vx) * M.accel * dt; if (Math.abs(p.vx) > sp) p.vx = target; }
      else { const dv = M.decel * dt; p.vx = Math.abs(p.vx) <= dv ? 0 : p.vx - Math.sign(p.vx) * dv; }
      if (p.dead) p.vx = 0;
      // 밧줄 잡기
      if (!blocked && (up || down) && (map.ropes || []).length) {
        for (const r of map.ropes) {
          if (Math.abs(p.x - r.x) < 32 && p.y > r.top + 8 && p.y <= r.bottom + 2 && ((up && p.y > r.top + 20) || (down && p.y < r.bottom - 4))) { p.rope = r; p.vy = 0; p.vx = 0; p.onGround = false; return; }
        }
      }
      // 중력·충돌
      const prevY = p.y;
      p.vy = Math.min(M.maxFall, p.vy + M.gravity * dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = Math.max(24, Math.min(map.width - 24, p.x));
      if (AU.Prologue && AU.Prologue.on) AU.Prologue.clampLimits(p); // 장면 진행 조건을 채우기 전에는 출구를 막음
      p.drop = Math.max(0, p.drop - dt);
      // 단단한 바위·턱: 옆에서 막음
      for (const pl of map.platforms) {
        if (!pl.h) continue;
        if (p.y > pl.y + 4 && prevY > pl.y + 1 && p.y - C.player.height < pl.y + pl.h && p.x + C.player.halfW > pl.x && p.x - C.player.halfW < pl.x + pl.w) {   // prevY 조건: 위에서 내려오다 윗면에 닿는 프레임은 옆 충돌로 보지 않음(빠르게 떨어질 때 윗면 대신 옆으로 튕겨 나가던 문제)
          const fromLeft = (p.x - pl.x) < pl.w / 2; p.x = fromLeft ? pl.x - C.player.halfW : pl.x + pl.w + C.player.halfW; p.vx = 0;
        }
      }
      p.onGround = false;
      for (const pl of map.platforms) {
        const isGround = !pl.h && !pl.thin && pl.y >= GROUND;
        if (p.vy >= 0 && prevY <= pl.y + 1 && p.y >= pl.y && p.x >= pl.x && p.x <= pl.x + pl.w) {
          if (pl.thin && p.drop > 0) continue;
          p.y = pl.y; p.vy = 0; p.onGround = true; p.platform = pl;
        }
      }
      if (p.onGround) p.anim += Math.abs(p.vx) * dt / 22; else p.anim = 0;
      if (blocked) return;

      this.scan();

      // 기본 공격(누르고 있으면 공격 속도에 맞춰 반복)
      p.atkBuf = Math.max(0, (p.atkBuf || 0) - dt); // 짧게 눌렀다 뗀 입력도 0.15초간 기억(프레임 사이에 사라지는 것 방지)
      if ((I.isHeld("attack") || p.atkBuf > 0) && p.atkCD <= 0 && !p.dead && !(AU.Prologue && AU.Prologue.on)) { p.atkBuf = 0; this.basicAttack(); }
    },

    // 근처 NPC·포털 찾기(매 프레임 + 입력 순간에도 다시 계산)
    scan() {
      const p = this.player, map = this.map; this.nearNpc = null; this.nearPortal = null;
      for (const n of map.npcs || []) if (Math.abs(p.x - n.x) < 90) { if (!this.nearNpc || Math.abs(p.x - n.x) < Math.abs(p.x - this.nearNpc.x)) this.nearNpc = n; }
      for (const pt of map.portals || []) if (Math.abs(p.x - pt.x) < 70 && p.onGround) this.nearPortal = pt;
      this.prompt = this.nearNpc ? "Space 대화: " + AU.NPCS[this.nearNpc.id].name : this.nearPortal ? "↑ 이동: " + this.nearPortal.label : "";
      if (AU.Prologue && AU.Prologue.on) AU.Prologue.scan(this);
    },

    /* ---------- 입력 이벤트(눌렀을 때 한 번) ---------- */
    onAction(id) {
      if (this.isBlocked()) return;
      const PR = AU.Prologue;
      if (PR && PR.on) { if (id === "interact") { PR.interactNear(); return; } if (id === "attack" || id.startsWith("skill")) return; } // 프롤로그에서는 전투·스킬 없음
      const p = this.player; if (id === "interact" || id === "up") this.scan();
      if (id === "jump") {
        if (p.rope) { p.rope = null; p.vy = -C.move.jump * 0.85; p.vx = p.dir * 160; p.onGround = false; return; }
        if (p.onGround) {
          if (AU.Input.isHeld("down") && p.platform && p.platform.thin) { p.drop = 0.35; p.y += 3; p.onGround = false; return; } // 아래 발판으로 내려가기
          p.vy = -C.move.jump; p.onGround = false;
        }
      } else if (id === "attack") { p.atkBuf = 0.15;
      } else if (id === "interact") {
        if (this.nearNpc) { AU.UI.talkNpc(this.nearNpc.id); }
      } else if (id === "up") {
        if (this.nearPortal && !p.rope) { const pt = this.nearPortal; this.travel(pt.to, pt.toX); }
      } else if (id.startsWith("skill")) this.useSkillSlot(+id.slice(5) - 1);
    },

    /* ---------- 전투 ---------- */
    rollDamage(mult) {
      const S = AU.G.S, d = AU.G.d(); let dmg = d.atk * (mult || 1) * rnd(0.9, 1.1), crit = false;
      if (Math.random() * 100 < d.crit) { dmg *= C.combat.critMult; crit = true; }
      return { dmg: Math.max(1, Math.round(dmg)), crit };
    },
    hurtMonster(m, mult, kbDir, kb) {
      if (!m.alive) return;
      const r = this.rollDamage(mult); m.hp -= r.dmg; m.flash = 0.18; m.kb = (kbDir || this.player.dir) * (kb || 120);
      this.floater(m.x, m.y - m.d.h - 10, String(r.dmg), r.crit ? "#FFD23F" : "#FFFFFF");
      if (m.state === "windup") { m.state = "chase"; m.st = 0; } // 맞으면 준비 동작이 끊김
      if (m.hp <= 0) this.killMonster(m);
    },
    killMonster(m) {
      m.alive = false; m.respawnT = m.d.boss ? -1 : 8; m.hp = 0;
      const S = AU.G.S, mult = C.exp.killMultiplier;
      const exp = Math.round(m.d.exp * mult), silver = Math.round(rnd(m.d.silver[0], m.d.silver[1]));
      AU.G.gainSilver(silver);
      this.floater(m.x, m.y - m.d.h - 34, "+" + exp + " EXP", "#9FE870");
      for (const [it, rate] of m.d.drops) if (Math.random() < rate) AU.G.giveItem(it, 1);
      AU.G.onKill(m.type);
      AU.G.gainExp(exp, m.d.name);
      AU.G.toast(m.d.name + " 처치: 경험치 +" + exp + ", 은화 +" + silver, "kill");
    },
    basicAttack() {
      const p = this.player; p.atkCD = C.combat.attackCooldown; p.atkT = 0.22;
      const x0 = p.dir > 0 ? p.x + 8 : p.x - 8 - C.combat.attackRange, x1 = x0 + C.combat.attackRange;
      this.fx.push({ kind: "slash", x: p.x + p.dir * 56, y: p.y - 64, dir: p.dir, t: 0, dur: 0.2, r: 60, color: "#FFF6CF" });
      for (const m of this.monsters) {
        if (!m.alive) continue;
        if (m.x + m.d.w / 2 > x0 && m.x - m.d.w / 2 < x1 && Math.abs(m.y - p.y) < C.combat.attackHalfHeight + 20) this.hurtMonster(m, 1, p.dir, 120);
      }
    },
    useSkillSlot(i) {
      const S = AU.G.S, p = this.player, id = S.skills.slots[i];
      if (p.dead) return;
      if (!id) { AU.G.toast(S.jobChanged ? "빈 슬롯입니다. K 키에서 스킬을 배치하세요." : "아직 배운 스킬이 없습니다. 전직 후 사용할 수 있습니다.", "warn"); return; }
      const sk = AU.SKILLS[id];
      if ((p.cd[id] || 0) > 0 || p.gcd > 0) return;
      if (!AU.G.canSpend(id)) { AU.G.toast("활력이 부족합니다. (필요 " + AU.G.skillCost(id) + ")", "warn"); this.floater(p.x, p.y - 140, "활력 부족", "#FF9AA2"); return; }
      AU.G.spend(id); p.cd[id] = sk.cd; p.gcd = C.combat.skillGlobalCooldown; p.atkT = 0.3;
      if (id === "strike") {
        const x0 = p.dir > 0 ? p.x : p.x - sk.range, x1 = x0 + sk.range;
        this.fx.push({ kind: "slash", x: p.x + p.dir * 70, y: p.y - 64, dir: p.dir, t: 0, dur: 0.3, r: 90, color: "#FFD36B" });
        for (const m of this.monsters) if (m.alive && m.x + m.d.w / 2 > x0 && m.x - m.d.w / 2 < x1 && Math.abs(m.y - p.y) < 100) this.hurtMonster(m, sk.mult, p.dir, 220);
      } else if (id === "spin") {
        this.fx.push({ kind: "ring", x: p.x, y: p.y - 50, t: 0, dur: 0.35, r: sk.radius, color: "#9FD6F5" });
        for (const m of this.monsters) if (m.alive && Math.abs(m.x - p.x) < sk.radius + m.d.w / 2 && Math.abs(m.y - p.y) < 100) this.hurtMonster(m, sk.mult, sign(m.x - p.x) || p.dir, 200);
      } else if (id === "focus") {
        const max = AU.G.d().maxHp, v = Math.round(max * sk.heal); S.hp = Math.min(max, S.hp + v);
        this.fx.push({ kind: "ring", x: p.x, y: p.y - 50, t: 0, dur: 0.5, r: 60, color: "#A6E3C9" });
        this.floater(p.x, p.y - 140, "+" + v, "#6BCB77");
      }
      AU.G.changed();
    },
    hurtPlayer(m) {
      const p = this.player, S = AU.G.S; if (p.invuln > 0 || p.dead) return;
      const d = AU.G.d();
      p.invuln = C.combat.invuln;
      if (Math.random() * 100 < d.dodge) { this.floater(p.x, p.y - 130, "MISS", "#9FD6F5"); return; }
      const dmg = Math.max(1, Math.round(m.d.atk * rnd(0.9, 1.1)));
      S.hp -= dmg; p.flash = 0.25; p.vx = sign(p.x - m.x) * C.combat.knockback; p.vy = -180; p.onGround = false; p.rope = null;
      this.floater(p.x, p.y - 130, "-" + dmg, "#FF6B6B");
      if (S.hp <= 0) { S.hp = 0; p.dead = true; this.deadT = 0; AU.Ev.emit("dead"); }
    },

    /* ---------- 적 AI: 순찰 → 추적 → 준비 동작(!) → 돌진 ---------- */
    updateMonsters(dt) {
      const p = this.player;
      for (const m of this.monsters) {
        if (!m.alive) { if (m.respawnT > 0) { m.respawnT -= dt; if (m.respawnT <= 0) { m.alive = true; m.hp = m.maxHp; m.x = m.home; m.state = "patrol"; m.flash = 0; } } continue; }
        m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt);
        if (Math.abs(m.kb) > 4) { m.x += m.kb * dt; m.kb *= Math.pow(0.02, dt); } else m.kb = 0;
        const dx = p.x - m.x, dist = Math.abs(dx), near = !p.dead && dist < m.d.chase && Math.abs(p.y - m.y) < 160;
        if (m.state === "patrol" || m.state === "chase") {
          if (near) { m.state = "chase"; m.dir = sign(dx) || m.dir; }
          else { m.state = "patrol"; }
          if (m.state === "chase") {
            if (dist > m.d.w / 2 + 40) m.x += m.dir * m.d.speed * dt;
            else if (m.cd <= 0) { m.state = "windup"; m.st = 0; }
          } else if (m.pause > 0) m.pause -= dt;
          else {
            m.x += m.dir * m.d.speed * 0.5 * dt;
            if (m.x < m.min) { m.x = m.min; m.dir = 1; m.pause = rnd(0.3, 1.2); }
            if (m.x > m.max) { m.x = m.max; m.dir = -1; m.pause = rnd(0.3, 1.2); }
          }
        } else if (m.state === "windup") {
          m.st += dt; m.dir = sign(dx) || m.dir;
          if (m.st >= 0.5) { m.state = "lunge"; m.st = 0; }
        } else if (m.state === "lunge") {
          m.st += dt; m.x += m.dir * m.d.speed * 3 * dt;
          if (Math.abs(p.x - m.x) < m.d.w / 2 + C.player.halfW && Math.abs(p.y - m.y) < m.d.h + 30) this.hurtPlayer(m);
          if (m.st >= 0.28) { m.state = "chase"; m.cd = m.d.boss ? 1.6 : 1.3; m.st = 0; }
        }
        m.x = Math.max(m.d.w / 2, Math.min(this.map.width - m.d.w / 2, m.x));
      }
    },

    /* ---------- 그리기 ---------- */
    draw(ctx) {
      const PR = AU.Prologue, pro = !!(PR && PR.on);
      if (pro && PR.shotFn) { PR.shotFn(ctx); PR.drawOverlay(ctx); return; } // 시간 경과 연출처럼 화면 전체를 직접 그리는 컷
      const cx = Math.round(this.camX), map = this.map, p = this.player;
      ctx.save(); if (pro) PR.beginFrame(ctx);
      this.drawBackground(ctx, cx);
      ctx.save(); ctx.translate(-cx, 0);
      if (pro) PR.drawLayer(ctx, "back");
      this.drawStructures(ctx);
      for (const n of map.npcs || []) this.drawNpc(ctx, n);
      for (const m of this.monsters) if (m.alive) this.drawMonster(ctx, m);
      if (pro) PR.drawLayer(ctx, "mid");
      this.drawPlayer(ctx, p);
      if (pro) PR.drawLayer(ctx, "front");
      for (const f of this.fx) this.drawFx(ctx, f);
      for (const f of this.floaters) {
        ctx.globalAlpha = Math.max(0, 1 - f.t / 0.9); ctx.font = "700 22px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(30,22,15,.7)"; ctx.strokeText(f.text, f.x, f.y - f.t * 50); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 50); ctx.globalAlpha = 1;
      }
      ctx.restore(); ctx.restore();
      if (pro) PR.drawOverlay(ctx);
      if (this.trans) {
        const t = this.trans, a = t.t < t.dur / 2 ? t.t / (t.dur / 2) : 1 - (t.t - t.dur / 2) / (t.dur / 2);
        ctx.fillStyle = "rgba(255,248,232," + Math.max(0, Math.min(1, a)) + ")"; ctx.fillRect(0, 0, W, H);
      }
    },
    drawBackground(ctx, cx) {
      const PR = AU.Prologue, key = (PR && PR.on && PR.variant === "attack" && this.map.bgAtk) || this.map.bg;   // 프롤로그: 습격 상태는 같은 구도의 별도 그림
      if (AU.Img.has(key)) {
        const im = AU.Img.get(key), sw = im.naturalWidth * (H / im.naturalHeight);
        if (this.map.bgFlip) { ctx.save(); ctx.translate(sw - cx, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, sw, H); ctx.restore(); } // 좌우 반전(임시 배경 재사용)
        else ctx.drawImage(im, -cx, 0, sw, H);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#BFE6F7"); g.addColorStop(1, "#FFE9B8");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#C9E2A0"; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = "#8A6F57"; ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("배경 이미지 없음: " + key + " (대체 그래픽)", W / 2, 80);
      }
    },
    drawStructures(ctx) {
      const map = this.map;
      for (const pl of map.platforms) if (pl.thin) { // 얇은 발판(임시 그래픽)
        ctx.fillStyle = "#C99B5C"; this.rr(ctx, pl.x, pl.y, pl.w, 14, 6); ctx.fill(); ctx.strokeStyle = "#7A5530"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#E7C48C"; this.rr(ctx, pl.x + 6, pl.y + 2, pl.w - 12, 4, 2); ctx.fill();
      }
      for (const r of map.ropes || []) { // 밧줄(임시 그래픽)
        ctx.strokeStyle = "#8B5E34"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(r.x, r.top - 8); ctx.lineTo(r.x, r.bottom); ctx.stroke();
        ctx.strokeStyle = "#D9A566"; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(r.x, r.top - 8); ctx.lineTo(r.x, r.bottom); ctx.stroke(); ctx.setLineDash([]);
      }
      for (const pt of map.portals || []) { // 포털 표시(임시 그래픽)
        const near = this.nearPortal === pt, bob = Math.sin(this.time * 3) * 4;
        ctx.globalAlpha = near ? 1 : 0.8; ctx.fillStyle = "#F4E7C8"; ctx.strokeStyle = "rgba(50,38,26,.75)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(pt.x, GROUND - 150 + bob); ctx.lineTo(pt.x + 22, GROUND - 118 + bob); ctx.lineTo(pt.x + 9, GROUND - 118 + bob); ctx.lineTo(pt.x + 9, GROUND - 96 + bob);
        ctx.lineTo(pt.x - 9, GROUND - 96 + bob); ctx.lineTo(pt.x - 9, GROUND - 118 + bob); ctx.lineTo(pt.x - 22, GROUND - 118 + bob); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.font = "500 16px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(30,22,15,.75)"; ctx.strokeText(pt.label, pt.x, GROUND - 160 + bob); ctx.fillStyle = "#FFFFFF"; ctx.fillText(pt.label, pt.x, GROUND - 160 + bob);
      }
    },
    rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },
    sprite(ctx, key, x, y, height, dir, frame) {
      if (!AU.Img.has(key)) return false;
      const rec = AU.Img.map[key], im = rec.image, fr = rec.frames, fw = im.naturalWidth / fr, fh = im.naturalHeight, dw = height * fw / fh;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -1 : 1, 1);
      ctx.drawImage(im, Math.max(0, Math.min(fr - 1, frame)) * fw, 0, fw, fh, -dw / 2, -height, dw, height); ctx.restore(); return true;
    },
    nameTag(ctx, text, x, y, color) { // 어두운 반투명 이름표(배경이 복잡해도 읽히도록)
      ctx.font = "500 14px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center";
      const w = ctx.measureText(text).width + 16; ctx.fillStyle = color || "rgba(30,24,18,.68)"; this.rr(ctx, x - w / 2, y - 16, w, 23, 6); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.fillText(text, x, y);
    },
    drawNpc(ctx, n) {
      const d = AU.NPCS[n.id], y = GROUND, face = this.player.x < n.x ? -1 : 1;
      if (!this.sprite(ctx, d.sprite, n.x, y, 150, face, 0)) { ctx.fillStyle = "#C9B8A0"; this.rr(ctx, n.x - 30, y - 130, 60, 130, 20); ctx.fill(); ctx.fillStyle = "#5B4636"; ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("이미지 없음", n.x, y - 60); }
      this.nameTag(ctx, d.name, n.x, y - 160);
      // 퀘스트 표시: 받을 수 있으면 !, 완료 가능하면 ?
      let mark = "";
      for (const id of d.quests || []) { const s = AU.G.questStatus(id); if (s === "ready" && AU.QUESTS[id].giver === n.id) { mark = "?"; break; } if (s === "available" && !mark) mark = "!"; }
      if (d.special === "missionGuide" && AU.G.S.flags.missionsUnlocked && !AU.G.S.flags.guideMet) mark = "!";
      if (mark) { // 둥근 배지: 배경이 복잡해도 눈에 띄게
        const by = y - 200 + Math.sin(this.time * 4) * 3;
        ctx.beginPath(); ctx.arc(n.x, by, 15, 0, 7); ctx.fillStyle = mark === "?" ? "#4F7D6E" : "#B98B45"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
        ctx.font = "700 20px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#FFFFFF"; ctx.fillText(mark, n.x, by + 2); ctx.textBaseline = "alphabetic";
      }
    },
    drawPlayer(ctx, p) {
      if (p.invuln > 0 && Math.floor(this.time * 20) % 2 === 0 && !p.dead) ctx.globalAlpha = 0.45;
      if (p.dead) ctx.globalAlpha = 0.5;
      const gk = AU.Profile.gender() === "f" ? ["player_female", "player_male"] : ["player_male", "player_female"], key = AU.Img.has(gk[0]) ? gk[0] : gk[1], moving = Math.abs(p.vx) > 20 && p.onGround;
      const frame = moving ? Math.floor(this.time * 9) % 4 : (p.rope ? Math.floor(p.anim) % 2 : 0);
      const lean = p.atkT > 0 ? p.dir * 6 : 0, PR = AU.Prologue, pro = !!(PR && PR.on), pose = pro ? PR.poseOf(p) : null;
      if (pose) { ctx.save(); ctx.translate(p.x + (pose.dx || 0), p.y); ctx.rotate(pose.rot || 0); ctx.scale(pose.sx || 1, pose.sy || 1); ctx.translate(-p.x, -p.y); }
      if (pro && PR.drawHero(ctx, p, pose, moving)) { /* 프롤로그 정식 그림 */ }
      else if (!this.sprite(ctx, key, p.x + lean, p.y, C.player.spriteHeight, p.dir, frame)) { ctx.fillStyle = "#FFB3C7"; this.rr(ctx, p.x - 22, p.y - 118, 44, 118, 16); ctx.fill(); }
      if (pose) ctx.restore();
      ctx.globalAlpha = 1;
      if (pro) PR.drawPlayerExtras(ctx, p, pose); // 들고 있는 목재·망치·등에 멘 가방
      if (p.flash > 0) { ctx.fillStyle = "rgba(255,90,90," + (p.flash * 2) + ")"; this.rr(ctx, p.x - 26, p.y - 124, 52, 124, 18); ctx.fill(); }
    },
    drawFx(ctx, f) {
      const k = f.t / f.dur; ctx.save(); ctx.globalAlpha = 1 - k;
      if (f.kind === "slash") {
        ctx.translate(f.x, f.y); ctx.scale(f.dir, 1); ctx.strokeStyle = f.color; ctx.lineWidth = 12 * (1 - k * 0.6); ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(-20, 0, f.r * (0.7 + k * 0.4), -1.1, 1.1); ctx.stroke();
      } else if (f.kind === "ring") {
        ctx.strokeStyle = f.color; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.3 + k * 0.7), f.r * (0.2 + k * 0.4), 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    },
    // 적 그래픽은 임시(캔버스 도형). 정식 그림이 오면 sprite()로 교체
    drawMonster(ctx, m) {
      const d = m.d, x = m.x, y = m.y, hop = m.state === "lunge" ? -10 : Math.abs(Math.sin(this.time * 6 + x)) * (m.state === "chase" ? 5 : 2);
      const sp = !!(d.sprite && AU.Img.has(d.sprite)); let th = d.h;
      if (sp) { // 정식 그림: 한 장을 코드로 움직임(걷기 통통, 준비 동작 웅크림, 돌진 늘어남, 피격 번쩍임)
        const im = AU.Img.get(d.sprite), dw = d.sw, dh = dw * im.naturalHeight / im.naturalWidth; let sx = 1, sy = 1, rot = 0;
        if (m.state === "windup") { const k = Math.min(1, m.st / 0.5); sy = 1 - 0.14 * k; sx = 1 + 0.08 * k; rot = -0.12 * k; } else if (m.state === "lunge") { sx = 1.14; sy = 0.9; rot = 0.1; }
        ctx.save(); ctx.translate(x, y - hop); ctx.scale(m.dir < 0 ? -1 : 1, 1); ctx.rotate(rot); ctx.scale(sx, sy);
        if (m.flash > 0 && "filter" in ctx) ctx.filter = "brightness(2.2)";
        ctx.drawImage(im, -dw / 2, -dh, dw, dh); ctx.restore(); th = dh * sy;
      } else {
      ctx.save(); ctx.translate(x, y - hop); ctx.scale(m.dir < 0 ? -1 : 1, 1);
      const flash = m.flash > 0, body = flash ? "#FFFFFF" : d.color, line = "#5B4636";
      ctx.lineWidth = 4; ctx.strokeStyle = line; ctx.fillStyle = body;
      if (d.snake) {
        ctx.lineCap = "round"; ctx.lineWidth = 20; ctx.strokeStyle = body; ctx.beginPath(); ctx.moveTo(-40, -14); ctx.bezierCurveTo(-20, -40, -5, 6, 14, -18); ctx.bezierCurveTo(26, -32, 36, -26, 42, -30); ctx.stroke();
        ctx.fillStyle = body; ctx.beginPath(); ctx.arc(44, -30, 13, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = line; ctx.stroke();
      } else if (d.crab) {
        ctx.beginPath(); ctx.ellipse(0, -26, 40, 26, 0, 0, 7); ctx.fill(); ctx.stroke();
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 46, -40, 12, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * 36, -30); ctx.lineTo(s * 46, -40); ctx.stroke(); }
      } else if (d.boss) {
        ctx.beginPath(); ctx.ellipse(0, -96, 74, 56, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.fillRect(-74, -96, 148, 40);
        ctx.strokeStyle = line; ctx.strokeRect(-74, -96, 148, 40);
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 22, -56); ctx.quadraticCurveTo(i * 26 + Math.sin(this.time * 3 + i) * 12, -20, i * 24, 0); ctx.lineWidth = 14; ctx.strokeStyle = flash ? "#fff" : d.color; ctx.lineCap = "round"; ctx.stroke(); }
      } else {
        ctx.beginPath(); ctx.ellipse(0, -d.h / 2, d.w / 2, d.h / 2, 0, 0, 7); ctx.fill(); ctx.stroke();
        if (d.ear) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8 + 14, -d.h + 6); ctx.lineTo(s * 14 + 20, -d.h - 14); ctx.lineTo(s * 22 + 10, -d.h + 8); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
      }
      if (!d.snake) { ctx.fillStyle = "#3B2A1E"; ctx.beginPath(); ctx.arc(d.w * 0.2, -d.h * (d.boss ? 0.62 : 0.6), d.boss ? 7 : 4, 0, 7); ctx.fill(); }
      ctx.restore();
      }
      // 준비 동작 표시와 체력 바
      if (m.state === "windup") { ctx.font = "700 30px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeStyle = "#6E1D1D"; ctx.strokeText("!", x, y - th - 24); ctx.fillStyle = "#FFD36B"; ctx.fillText("!", x, y - th - 24); }
      if (m.hp < m.maxHp || d.boss) {
        const bw = d.boss ? 160 : 60, by = y - th - (d.boss ? 18 : 12);
        ctx.fillStyle = "rgba(60,40,30,.8)"; this.rr(ctx, x - bw / 2 - 2, by - 2, bw + 4, 11, 5); ctx.fill();
        ctx.fillStyle = "#FF7B7B"; this.rr(ctx, x - bw / 2, by, Math.max(0, bw * m.hp / m.maxHp), 7, 3); ctx.fill();
      }
      this.nameTag(ctx, "Lv." + d.lv + " " + d.name, x, y - th - (d.boss ? 40 : 30), "rgba(120,40,40,.7)");
    }
  };
})();
