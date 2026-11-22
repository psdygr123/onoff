/* 월드: 캐릭터 이동(점프·발판·밧줄), 적 AI, 전투, 포털, 카메라, 그리기.
   이동 수치와 밧줄·발판 방식은 이전 아스텔리아 시제품의 규칙을 이어받았습니다. */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG, W = C.W, H = C.H, GROUND = C.GROUND;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);

  const World = AU.World = {
    mapId: null, map: null, player: null, monsters: [], fx: [], floaters: [], drops: [], nearDrop: null, camX: 0, time: 0,
    vis: "rim", trans: null, deadT: 0, prompt: "", nearNpc: null, nearPortal: null, nearSpot: null, work: null, bossCheckT: 0, blockedFn: () => false,

    init() {
      const S = AU.G.S;
      this.player = { x: S.x, y: GROUND, vx: 0, vy: 0, onGround: true, rope: null, dir: 1, invuln: 0, atkT: 0, atkCD: 0, gcd: 0, cd: {}, dashN: AU.CONFIG.dash.max, dashRt: 0, dashT: 0, dashDir: 1, flash: 0, dead: false, drop: 0, anim: 0 };
      this.enterMap(S.map, S.x, true);
      AU.Ev.on("floater", (f) => { if (f.onPlayer) this.floater(this.player.x, this.player.y - 130, f.text, f.color); });
    },
    isBlocked() { return this.blockedFn() || !!this.trans || this.player.dead || !!(AU.Prologue && AU.Prologue.on && AU.Prologue.locked()); },

    /* ---------- 맵 입장 ---------- */
    enterMap(id, x, silent) { this.bindClick();
      const S = AU.G.S, m = AU.MAPS[id]; this.mapId = id; this.map = m;
      S.map = id; S.x = x; S.visited[id] = true; if (id === "porto" && AU.UI && AU.UI.openHelpOnce) AU.UI.openHelpOnce(); // 이동 직후 저장해도 새 위치가 기록되도록
      const p = this.player; p.x = x; p.y = GROUND; p.vx = 0; p.vy = 0; p.rope = null; p.onGround = true;
      this.camX = Math.max(0, Math.min(m.width - W, x - W / 2));
      if (m.stealth && this.mapId !== this._lastStealth) this.spotted = false; this._lastStealth = m.stealth ? this.mapId : null;
      this.monsters = []; this.projs = []; this.fx = []; this.floaters = []; this.drops = []; this.nearDrop = null; this.work = null; this.nearSpot = null;
      (m.spawns || []).forEach((sp, i) => this.spawn(sp.type, sp.x, sp.y, sp.min, sp.max, "s" + i));
      this.bossCheckT = 0; this.syncBoss();
      if (!silent) { AU.G.save("map"); AU.Ev.emit("mapchange", { id }); }
    },
    travel(to, x) {
      if (this.trans) return;
      if (AU.Hideout && AU.Hideout.onTravel) AU.Hideout.onTravel(this, to);
      this.trans = { t: 0, dur: 0.55, to, x, swapped: false };
    },
    syncBoss() {
      const m = this.map; if (!m.boss) return;
      const has = this.monsters.some((q) => q.type === m.boss.type && q.alive);
      // 보스 등장 조건: 기본은 전직 시험 중. quest(+afterSpot)가 있으면 그 퀘스트가 진행 중이고 지정 지점을 마쳤을 때
      const on = m.boss.quest ? (AU.G.questStatus(m.boss.quest) === "active" && (!m.boss.afterSpot || AU.G.spotDone(m.boss.afterSpot)) && !(AU.G.S.flags["boss_" + m.boss.type])) : false;
      if (on && !has) this.spawn(m.boss.type, m.boss.x, undefined, undefined, undefined, "boss");
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
    askDeathNote() {
      this.deathAsk = true;
      const S = AU.G.S, C0 = C;
      const opts = ["여기까지 오느라 수고했어. 잠시 쉬어도 괜찮아.", "다음엔 다르게 해 볼 수 있어. 천천히 해 보자.", "지금은 숨 한 번 고르는 것만으로 충분해."];
      const st = document.getElementById("stage") || document.body;
      const box = document.createElement("div"); box.className = "death-note";
      box.innerHTML = '<div class="dn-card"><h3>잘 해내려고 애썼어요</h3><p>쓰러지는 일은 누구에게나 있어요.<br>지금 나에게 건네고 싶은 말을 하나 골라 보세요.</p></div>';
      const card = box.firstChild;
      const done = (txt) => {
        box.remove();
        try { const m = S.mind || (S.mind = {}); (m.deathNotes = m.deathNotes || []).push({ t: new Date().toISOString(), text: txt }); if (m.deathNotes.length > 50) m.deathNotes.shift(); } catch (e) {}
        const p = this.player;
        p.dead = false; this.deadT = 0; this.deathAsk = false;
        const dest = S.visited.porto ? "porto" : "arche";
        p.invuln = 1.5; S.hp = AU.G.d().maxHp;
        this.enterMap(dest, AU.MAPS[dest].start || 200);
        const loss = Math.floor((S.exp || 0) * (C0.combat.deathExpLoss || 0)); if (loss > 0) S.exp -= loss;
        AU.G.save && AU.G.save("mind");
        AU.G.toast("안전한 곳에서 다시 일어났습니다." + (loss > 0 ? " (경험치 -" + loss + ")" : ""), "info"); AU.Ev.emit("revive");
      };
      opts.forEach((t, i) => { const b = document.createElement("button"); b.className = "dn-opt"; b.textContent = t; b.dataset.i = i; b.onclick = () => done(t); card.appendChild(b); });
      const f = document.createElement("div"); f.className = "dn-foot"; f.textContent = "고른 문장은 모험일지의 '마음 기록'에 남아요."; card.appendChild(f);
      st.appendChild(box);
    },
    update(dt) {
      this.time += dt;
      const S = AU.G.S, p = this.player;
      S.playSec += dt;
      // 전환 연출
      if (this.trans) {
        const t = this.trans; t.t += dt;
        if (!t.swapped && t.t >= t.dur / 2) { t.swapped = true; this.enterMap(t.to, t.x); if (t.caught) this.onCaught(); }
        if (t.t >= t.dur) this.trans = null;
      }
      // 사망 처리
      if (p.dead) {
        this.deadT += dt;
        if (this.deadT >= C.combat.respawnDelay && !this.deathAsk) this.askDeathNote();
      }
      for (const f of this.floaters) f.t += dt; this.floaters = this.floaters.filter((f) => f.t < 0.9);
      this.updateDrops(dt);
      for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < f.dur);

      const blocked = this.isBlocked();
      this.updatePlayer(dt, blocked);
      this.updateMonsters(dt); this.updateNpcs(dt);
      // 쿨다운
      p.invuln = Math.max(0, p.invuln - dt); p.flash = Math.max(0, p.flash - dt); p.atkT = Math.max(0, p.atkT - dt); if (p.sk) { p.sk.t += dt; if (p.sk.t >= p.sk.dur) p.sk = null; }
      p.atkCD = Math.max(0, p.atkCD - dt); p.gcd = Math.max(0, p.gcd - dt);
      { const D = AU.CONFIG.dash; p.dashT = Math.max(0, p.dashT - dt); if (p.dashN < D.max) { p.dashRt += dt; if (p.dashRt >= D.recharge) { p.dashRt = 0; p.dashN++; } } else p.dashRt = 0; }
      for (const k of Object.keys(p.cd)) p.cd[k] = Math.max(0, p.cd[k] - dt);
      // 안전 지역에서도 체력은 저절로 회복되지 않습니다(회복약·휴식 연출 등으로만 회복)
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
      if (p.hidden) { p.hideT -= dt; if (mv !== 0 || p.hideT <= 0 || blocked || p.dead) p.hidden = false; else p.vx = 0; } // 숨는 중: 움직이면 풀림, 최대 시간 뒤 자동 해제
      this.nearNpc = null; this.nearHide = null; this.nearPortal = null; if (this.work) this.updateWork(dt, blocked);

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
      if (p.dashT > 0 && !p.dead) { p.vx = p.dashDir * AU.CONFIG.dash.speed; p.vy = Math.min(p.vy, 0) * 0.3; p.anim += dt * 14; }
      else if (mv) { p.dir = mv; p.vx += Math.sign(target - p.vx) * M.accel * dt; if (Math.abs(p.vx) > sp) p.vx = target; }
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
      const p = this.player, map = this.map; this.nearNpc = null; this.nearPortal = null; this.nearDrop = null; this.nearSpot = null;
      for (const d of this.drops) if (Math.abs(p.x - d.x) < 64 && Math.abs(p.y - d.y) < 110 && d.vy > -50) { if (!this.nearDrop || Math.abs(p.x - d.x) < Math.abs(p.x - this.nearDrop.x)) this.nearDrop = d; }
      for (const n of map.npcs || []) if (Math.abs(p.x - n.x) < 90) { if (!this.nearNpc || Math.abs(p.x - n.x) < Math.abs(p.x - this.nearNpc.x)) this.nearNpc = n; }
      for (const pt of map.portals || []) if (Math.abs(p.x - pt.x) < 70 && p.onGround) this.nearPortal = pt;
      if (this.stealthOn()) for (const hs of map.hideSpots || []) if (Math.abs(p.x - hs.x) < 60 && p.onGround) this.nearHide = hs;
      for (const sp of map.spots || []) if (Math.abs(p.x - sp.x) < 70 && p.onGround && AU.G.spotObjective(sp.id) && (!sp.needFlag || AU.G.S.flags[sp.needFlag])) this.nearSpot = sp;   // 진행 중인 조사·수리 목표가 있는 지점만
      this.prompt = this.work ? "수리 중… (움직이면 멈춥니다)" : this.nearDrop ? "Space 줍기: " + AU.ITEMS[this.nearDrop.id].name.replace(" (임시)", "") + (this.nearDrop.n > 1 ? " ×" + this.nearDrop.n : "") : this.nearSpot ? "Space " + (this.nearSpot.kind === "repair" ? "수리" : "조사") + ": " + this.nearSpot.label : this.nearNpc ? "Space 대화: " + AU.NPCS[this.nearNpc.id].name : this.nearPortal ? "↑ 이동: " + this.nearPortal.label : "";
      if (this.nearHide && !this.work && !p.dead) this.prompt = p.hidden ? "숨는 중… (움직이거나 Space로 나오기)" : "Space 숨기"; else if (p.hidden) this.prompt = "숨는 중… (움직이거나 Space로 나오기)";
      if (AU.Prologue && AU.Prologue.on) AU.Prologue.scan(this);
    },

    /* ---------- 잠입 임무(map.stealthMission): 들키면 구역 입구에서 다시 시작. 숨는 상자(hideSpots)·시야를 막는 구조물(blockers) ---------- */
    stealthOn() { const sm = this.map && this.map.stealthMission; if (!sm || AU.G.S.flags[sm.flag]) return false; const st = AU.G.questStatus(sm.quest); return st === "active" || st === "ready" || (st === "done" && !!sm.next && AU.G.questStatus(sm.next) === "active"); },
    stealthTries() { const sm = this.map && this.map.stealthMission; return sm ? (AU.G.S.flags["stealth_tries_" + this.mapId] || 0) : 0; },
    sightMul() { return this.stealthOn() && this.stealthTries() >= 3 ? 0.8 : 1; }, // 3번 이상 들키면 경비 시야가 조금 약해짐(도움)
    sightBlocked(gx, px) { const lo = Math.min(gx, px), hi = Math.max(gx, px); return (this.map.blockers || []).some((b) => b.x > lo && b.x < hi); },
    caught(m) {
      if (this.trans || this.player.dead) return;
      this.floater(m.x, m.y - m.d.h - 30, "!", "#FF5A4D");
      this.trans = { t: 0, dur: 1.0, to: this.mapId, x: this.map.stealthMission.start, swapped: false, caught: true };
    },
    onCaught() {
      const S = AU.G.S, k = "stealth_tries_" + this.mapId, n = (S.flags[k] || 0) + 1; S.flags[k] = n;
      S.hp = AU.G.d().maxHp; this.player.hidden = false; this.player.invuln = 1;
      AU.G.toast("들켰습니다! 입구에서 다시 시도합니다. (" + n + "번째 도전, 불이익 없음)", "warn");
      if (n === 3) AU.G.toast("도움: 경비의 시야가 조금 약해졌습니다. 상자 앞에서 Space로 숨을 수 있어요.", "info");
      AU.G.save && AU.G.save("map");
    },
    drawStealthProps(ctx) {
      const m = this.map; if (!m || (!m.hideSpots && !m.blockers)) return; const y = GROUND, on = this.stealthOn();
      const pic = (key, x, h) => { const im = AU.Img.has(key) ? AU.Img.get(key) : null; if (!im) return false; const w = h * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, x - w / 2, y - h + 6, w, h); return true; };
      for (const b of m.blockers || []) { if (pic("ob_hide_pillar", b.x, 270)) continue; ctx.fillStyle = "#2F2B27"; ctx.fillRect(b.x - 20, y - 230, 40, 230); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(b.x - 20, y - 230, 7, 230); ctx.fillStyle = "#3F3934"; ctx.fillRect(b.x - 26, y - 238, 52, 12); }
      for (const hs of m.hideSpots || []) {
        if (!pic("ob_hide_crate", hs.x, 150)) {
          ctx.fillStyle = "#5B4632"; ctx.fillRect(hs.x - 38, y - 66, 76, 66); ctx.strokeStyle = "#2E2216"; ctx.lineWidth = 3; ctx.strokeRect(hs.x - 38, y - 66, 76, 66);
          ctx.beginPath(); ctx.moveTo(hs.x - 38, y - 44); ctx.lineTo(hs.x + 38, y - 44); ctx.moveTo(hs.x - 38, y - 22); ctx.lineTo(hs.x + 38, y - 22); ctx.stroke();
        }
        if (on && this.player && !this.player.hidden) { ctx.fillStyle = "rgba(255,243,205,.9)"; ctx.font = "700 13px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.fillText("숨는 곳", hs.x, y - 160); }
      }
    },
    /* ---------- 이동기: Lv.5부터. 충전 최대 3, 대기시간 없이 연속 사용, 10초마다 1충전 ---------- */
    dash() {
      const p = this.player, D = AU.CONFIG.dash, S = AU.G.S;
      if (p.dead || p.rope || this.isBlocked()) return false;
      if (S.level < D.level) { AU.G.toast("이동기는 Lv." + D.level + "에 배웁니다.", "warn"); return false; }
      if (p.dashN < 1) { AU.G.toast("이동기 충전 중입니다. (" + Math.ceil(D.recharge - p.dashRt) + "초)", "warn"); return false; }
      const I = AU.Input, h = (I.isHeld("right") ? 1 : 0) - (I.isHeld("left") ? 1 : 0);
      p.dashN--; p.dashT = D.dur; p.dashDir = h || p.dir || 1; p.dir = p.dashDir; p.invuln = Math.max(p.invuln, D.dur);
      return true;
    },
    /* ---------- 입력 이벤트(눌렀을 때 한 번) ---------- */
    onAction(id) {
      if (this.isBlocked()) return;
      if (this.player.hidden && id !== "interact") this.player.hidden = false; // 숨은 채로 다른 행동을 하면 먼저 나옴
      const PR = AU.Prologue;
      if (PR && PR.on) { if (id === "interact") { PR.interactNear(); return; } if (id === "attack" || id.startsWith("skill")) return; } // 프롤로그에서는 전투·스킬 없음
      if (id === "potion" || id === "scroll") { AU.G.quickUse(id); return; }
      if (id === "dash") { this.dash(); return; }
      const p = this.player; if (id === "interact" || id === "up") this.scan();
      if (id === "jump") {
        if (p.rope) { p.rope = null; p.vy = -C.move.jump * 0.85; p.vx = p.dir * 160; p.onGround = false; return; }
        if (p.onGround) {
          if (AU.Input.isHeld("down") && p.platform && p.platform.thin) { p.drop = 0.35; p.y += 3; p.onGround = false; return; } // 아래 발판으로 내려가기
          p.vy = -C.move.jump; p.onGround = false;
        }
      } else if (id === "attack") { p.atkBuf = 0.15;
      } else if (id === "interact") {
        if (this.nearDrop) { this.pickupNear(); return; }
        if (this.nearSpot) { this.useSpot(this.nearSpot); return; }
        if (this.nearNpc) { AU.UI.talkNpc(this.nearNpc.id); return; }
        if (p.hidden) { p.hidden = false; return; }
        if (this.nearHide) { p.hidden = true; p.hideT = 8; p.vx = 0; }
      } else if (id === "up") {
        if (this.nearPortal && !p.rope) { const pt = this.nearPortal; if (pt.lock) { AU.UI.toast(pt.lock, "info"); return; } if (!this.portalOpen(pt)) { AU.UI.toast(pt.reqText || "아직 갈 수 없습니다.", "warn"); return; } this.travel(pt.to, pt.toX); }
      } else if (id.startsWith("skill")) this.useSkillSlot(+id.slice(5) - 1);
    },

    // 포털이 열려 있는지: reqQuest(+reqIn 상태 목록) 또는 reqSpot(조사·수리 지점 완료) 조건이 있으면 확인
    portalOpen(pt) {
      if (pt.reqQuest && !(pt.reqIn || ["done"]).includes(AU.G.questStatus(pt.reqQuest))) return false;
      if (pt.reqSpot && !AU.G.spotDone(pt.reqSpot)) return false;
      return true;
    },
    /* ---------- 조사·수리 지점 ---------- */
    useSpot(sp) {
      if (this.work) return;
      if (sp.kind === "investigate") { AU.UI.say({ name: sp.label, portrait: "" }, sp.lines || ["살펴보았습니다."], { end: () => { AU.G.completeSpot(sp.id); if (sp.onDone) sp.onDone(this); } }); return; }
      this.work = { sp, t: 0, dur: sp.dur || 1.5, x0: this.player.x };   // 목공 수리: 제자리에서 잠깐 작업. 움직이거나 맞으면 멈춤
      if (AU.Sfx && AU.Sfx.play) { try { AU.Sfx.play("hit"); } catch (e) { /* 소리 없음 */ } }
    },
    updateWork(dt, blocked) {
      const w = this.work, p = this.player; if (!w) return;
      if (blocked || p.dead || !p.onGround || Math.abs(p.x - w.x0) > 24 || AU.UI.anyOpen()) { this.work = null; return; }
      const prev = w.t; w.t += dt;
      if (Math.floor(prev / 0.5) !== Math.floor(w.t / 0.5) && AU.Sfx && AU.Sfx.play) { try { AU.Sfx.play("hit"); } catch (e) { /* 소리 없음 */ } }   // 탕, 탕
      if (w.t >= w.dur) { const sp = w.sp; this.work = null; if (AU.G.completeSpot(sp.id)) { AU.G.toast(sp.done || "수리했습니다.", "good"); this.floaters.push({ x: sp.x, y: GROUND - 120, t: 0, text: "수리 완료", color: "#9BE0B4" }); } }
    },

    /* ---------- 전투 ---------- */
    rollDamage(mult) {
      const S = AU.G.S, d = AU.G.d(); let dmg = d.atk * (mult || 1) * rnd(0.9, 1.1), crit = false;
      if (Math.random() * 100 < d.crit) { dmg *= C.combat.critMult; crit = true; }
      return { dmg: Math.max(1, Math.round(dmg)), crit };
    },
    hurtMonster(m, mult, kbDir, kb) {
      if (!m.alive) return;
      const r = this.rollDamage(mult); m.hp -= r.dmg; m.flash = 0.18;
      // 공격 중(준비·돌진·타격)인 몬스터는 맞아도 동작이 끊기거나 밀려나지 않고 그대로 진행한다(예전에는 맞을 때마다 준비가 취소돼 영원히 공격이 안 나갔음). 걷는 중일 때만 밀려남, 보스는 거의 밀리지 않음.
      const busy = m.state === "windup" || m.state === "lunge" || m.state === "strike";
      m.kb = busy ? 0 : (kbDir || this.player.dir) * (kb || 120) * (m.d.boss ? 0.15 : 1);
      this.floater(m.x, m.y - m.d.h - 10, String(r.dmg), r.crit ? "#FFD23F" : "#FFFFFF");
      if (m.hp <= 0) this.killMonster(m);
    },
    killMonster(m) {
      m.alive = false; m.respawnT = m.d.boss ? -1 : 8; m.hp = 0;
      if (m.d.sprite && AU.Img.has(m.d.sprite)) this.fx.push({ kind: "ghost", img: (m.d.poses && m.d.poses.down) || m.d.sprite, sw: m.d.sw, refW: m.d.refW, still: !!m.d.poses, x: m.x, y: m.y, dir: m.dir, t: 0, dur: 0.55 });
      const S = AU.G.S, mult = C.exp.killMultiplier;
      const gap = S.level - (m.d.lv || S.level), gm = m.d.boss ? 1 : gap <= 0 ? Math.min(1.3, 1 - gap * 0.1) : gap <= 2 ? 1 : gap === 3 ? 0.7 : gap === 4 ? 0.45 : gap === 5 ? 0.25 : 0.1; // 몬스터 레벨 기준: 높은 상대는 보너스, 한참 낮은 상대는 경험치 급감
      const exp = Math.max(1, Math.round(m.d.exp * mult * gm));
      this.floater(m.x, m.y - m.d.h - 34, "+" + exp + " EXP", "#9FE870");
      this.spawnDrops(m); // 아이템·은화 모두 바닥에 떨어지고 직접 주움(은화는 확률로 떨어짐)
      if (m.d.boss) S.flags["boss_" + m.type] = true;
      if (AU.Hideout && AU.Hideout.onKill) AU.Hideout.onKill(this, m);
      AU.G.onKill(m.type);
      AU.G.gainExp(exp, m.d.name);
      AU.G.toast(m.d.name + " 처치: 경험치 +" + exp, "kill");
    },
    /* ---------- 드롭: 떨어진 아이템을 직접 줍기 ---------- */
    // 드롭 표 한 줄: [아이템, 확률, 최소 개수(기본 1), 최대 개수(기본 최소와 같음)]
    spawnDrops(m) {
      let k = 0;
      const sv = m.d.silver; if (sv && Math.random() < (m.d.silverRate == null ? 0.5 : m.d.silverRate)) { // 은화: 몬스터마다 정해진 확률(silverRate)로 떨어짐
        const n = sv[0] + Math.floor(Math.random() * (sv[1] - sv[0] + 1)); this.drops.push({ id: "silver_coin", n, x: m.x - 8, y: m.y - m.d.h * 0.5, vx: -(40 + Math.random() * 50), vy: -(280 + Math.random() * 80), gy: m.y, age: 0, onGround: false }); k++;
      }
      for (const row of m.d.drops || []) {
        const [id, rate, lo = 1, hi = lo, need] = row; if (!AU.ITEMS[id] || Math.random() >= rate) continue; if (need && AU.G.questStatus(need) !== "active") continue;
        const n = Math.round(lo + Math.random() * (hi - lo)); const dir = (k % 2 ? -1 : 1) * (0.7 + 0.5 * Math.floor(k / 2) + Math.random() * 0.4); k++;
        this.drops.push({ id, n, x: m.x + (k - 1) * 6, y: m.y - m.d.h * 0.5, vx: dir * (50 + Math.random() * 70), vy: -(260 + Math.random() * 120), gy: m.y, age: 0, onGround: false });
      }
      if (this.drops.length && AU.Sfx) { try { AU.Sfx.play("drop"); } catch (e) { /* 무시 */ } }
    },
    updateDrops(dt) {
      for (const d of this.drops) {
        d.age += dt;
        if (!d.onGround) {
          d.vy += 1100 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.vx *= 0.96;
          if (d.y >= d.gy) { d.y = d.gy; if (d.vy > 160) { d.vy *= -0.32; } else { d.vy = 0; d.onGround = true; } }
        }
      }
      this.drops = this.drops.filter((d) => d.age < 90); // 90초 지나면 사라짐(마지막 10초는 깜빡임)
    },
    pickupNear() {
      const d = this.nearDrop; if (!d || !this.drops.includes(d)) return false;
      this.drops = this.drops.filter((x) => x !== d); this.nearDrop = null;
      if (d.id === "silver_coin") { AU.G.gainSilver(d.n); AU.Ev.emit && 0; this.floater(d.x, d.y - 40, "은화 +" + d.n, "#E8E4D8"); return true; }
      AU.G.giveItem(d.id, d.n); this.floater(d.x, d.y - 40, "+" + AU.ITEMS[d.id].name.replace(" (임시)", "") + (d.n > 1 ? " ×" + d.n : ""), (AU.RARITY[AU.ITEMS[d.id].rarity] || {}).color || "#fff");
      return true;
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
      if (!id) { AU.G.toast(AU.G.awakened() ? "빈 슬롯입니다. K 키에서 스킬을 배치하세요." : "아직 스킬이 열리지 않았습니다. 10레벨에 힘이 깨어나면 사용할 수 있습니다.", "warn"); return; }
      const sk = AU.SKILLS[id];
      if ((p.cd[id] || 0) > 0 || p.gcd > 0) return;
      if (!AU.G.canSpend(id)) { AU.G.toast("피로도가 가득 차 스킬을 쓸 수 없습니다. 기본 공격은 가능하며, 휴식(스킬 창)이나 쉼 미션으로 줄일 수 있습니다.", "warn"); this.floater(p.x, p.y - 140, "피로도 가득", "#FF9AA2"); return; }
      AU.G.spend(id); if (!S.flags.fatigueTip) { S.flags.fatigueTip = true; AU.G.toast("피로도가 쌓였습니다. 스킬을 쓸 때마다 쌓이며, 가득 차면 스킬을 쓸 수 없습니다(기본 공격은 가능). 휴식이나 쉼 미션으로 줄일 수 있습니다.", "info"); } p.cd[id] = sk.cd; p.gcd = C.combat.skillGlobalCooldown; p.atkT = 0.3; p.sk = { id, t: 0, dur: id === "spin" ? 0.45 : id === "focus" ? 0.6 : 0.34 };
      if (id === "strike") {
        const x0 = p.dir > 0 ? p.x : p.x - sk.range, x1 = x0 + sk.range;
        this.fx.push({ kind: "slash", x: p.x + p.dir * 70, y: p.y - 64, dir: p.dir, t: 0, dur: 0.3, r: 90, color: "#FFD36B" });
        this.fx.push({ kind: "slash", x: p.x + p.dir * 84, y: p.y - 58, dir: p.dir, t: -0.06, dur: 0.3, r: 118, color: "#FFF1B8", thin: true });
        this.fx.push({ kind: "sparks", x: p.x + p.dir * (sk.range - 10), y: p.y - 60, dir: p.dir, t: -0.08, dur: 0.4, n: 9, color: "#FFD36B", spread: 70 });
        this.fx.push({ kind: "wave", x: p.x + p.dir * (sk.range - 20), y: p.y - 6, t: -0.08, dur: 0.35, r: 54, color: "#FFE9A8" });
        for (const m of this.monsters) if (m.alive && m.x + m.d.w / 2 > x0 && m.x - m.d.w / 2 < x1 && Math.abs(m.y - p.y) < 100) this.hurtMonster(m, sk.mult, p.dir, 220);
      } else if (id === "spin") {
        this.fx.push({ kind: "ring", x: p.x, y: p.y - 50, t: 0, dur: 0.35, r: sk.radius, color: "#9FD6F5" });
        this.fx.push({ kind: "whirl", x: p.x, y: p.y - 58, t: 0, dur: 0.45, r: sk.radius, color: "#CFEAFB" });
        this.fx.push({ kind: "wave", x: p.x, y: p.y - 4, t: 0.05, dur: 0.4, r: sk.radius * 0.9, color: "#BFE3F7" });
        for (const m of this.monsters) if (m.alive && Math.abs(m.x - p.x) < sk.radius + m.d.w / 2 && Math.abs(m.y - p.y) < 100) this.hurtMonster(m, sk.mult, sign(m.x - p.x) || p.dir, 200);
      } else if (id === "focus") {
        const max = AU.G.d().maxHp, v = Math.round(max * sk.heal); S.hp = Math.min(max, S.hp + v);
        this.fx.push({ kind: "ring", x: p.x, y: p.y - 50, t: 0, dur: 0.5, r: 60, color: "#A6E3C9" });
        this.fx.push({ kind: "motes", x: p.x, y: p.y, t: 0, dur: 0.9, n: 14, color: "#B9F0D3" });
        this.fx.push({ kind: "pillar", x: p.x, y: p.y, t: 0, dur: 0.6, color: "#A6E3C9" });
        this.floater(p.x, p.y - 140, "+" + v, "#6BCB77");
      }
      AU.G.changed();
    },
    hurtPlayer(m, pm) {
      const p = this.player, S = AU.G.S; if (p.invuln > 0 || p.dead) return;
      this.work = null;
      const d = AU.G.d();
      p.invuln = C.combat.invuln;
      if (Math.random() * 100 < d.dodge) { this.floater(p.x, p.y - 130, "MISS", "#9FD6F5"); return; }
      let dmg = Math.max(1, Math.round(m.d.atk * (pm || 1) * rnd(0.9, 1.1)));
      if (m.d.boss) dmg = Math.min(dmg, Math.round(d.maxHp * 0.4)); // 보스 한 방에 쓰러지지 않도록 최대 HP의 40%로 제한
      S.hp -= dmg; p.flash = 0.25; p.vx = sign(p.x - m.x) * C.combat.knockback; p.vy = -180; p.onGround = false; p.rope = null;
      this.floater(p.x, p.y - 130, "-" + dmg, "#FF6B6B");
      if (S.hp <= 0) { S.hp = 0; p.dead = true; this.deadT = 0; AU.Ev.emit("dead"); }
    },

    /* ---------- 적 AI: 순찰 → 추적 → 준비 동작(!) → 돌진 ---------- */
    updateNpcs(dt) { // 오가는 주민: patrol:[왼끝,오른끝] 안에서 목적지를 골라 천천히 가속·감속하며 걷고, 도착하면 잠시 쉬며 가끔 반대쪽을 둘러본다. 플레이어가 가까우면 멈춰 선다
      const map = AU.MAPS[AU.G.S.map]; if (!map || !map.npcs) return; const px = this.player.x;
      map.npcs.forEach((n, i) => {
        if (!n.patrol || this.npcEdit) { if (n.patrol) n._walk = false; return; } n._f = n._f || 1; n._t = (n._t || 0) + dt;
        if (n._v == null) { n._v = 0; n._go = false; n._wt = 0.5 + ((i * 7) % 5); n._step = 0; n._sp = (n.speed || 38) * (0.8 + ((i * 3) % 5) * 0.1); }   // 걷는 속도는 주민마다 조금씩 다르게
        const near = Math.abs(px - n.x) < 130, lo = n.patrol[0], hi = n.patrol[1];
        if (near) { n._walk = false; n._v = 0; return; }
        if (n._go) {
          const d = n._tx - n.x, ad = Math.abs(d), want = n._sp * Math.min(1, 0.3 + ad / 60);   // 출발·도착 때 느리게
          n._v += (want - n._v) * Math.min(1, dt * 3.5); const st = Math.min(ad, n._v * dt); n.x += Math.sign(d) * st; n._step += st; n._f = Math.sign(d) || n._f;
          if (ad <= 1.5) { n._go = false; n._v = 0; n._wt = 2 + Math.random() * 5; }
        } else {
          n._wt -= dt; if (Math.random() < dt * 0.12) n._f = -n._f;   // 쉬는 동안 가끔 반대쪽을 봄
          if (n._wt <= 0) { let t = lo + Math.random() * (hi - lo); if (Math.abs(t - n.x) < 80) t = n.x < (lo + hi) / 2 ? hi - Math.random() * 60 : lo + Math.random() * 60; n._tx = Math.max(lo, Math.min(hi, t)); n._go = true; }
        }
        n._walk = n._go && n._v > 3;
      });
    },
    updateMonsters(dt) {
      const p = this.player;
      for (const m of this.monsters) {
        if (!m.alive) { if (m.respawnT > 0) { m.respawnT -= dt; if (m.respawnT <= 0) { m.alive = true; m.hp = m.maxHp; m.x = m.home; m.state = "patrol"; m.flash = 0; } } continue; }
        m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt);
        if (Math.abs(m.kb) > 4) { m.x += m.kb * dt; m.kb *= Math.pow(0.02, dt); } else m.kb = 0;
        const dx = p.x - m.x, dist = Math.abs(dx);
        let near = !p.dead && dist < m.d.chase && Math.abs(p.y - m.y) < 160;
        if (m.d.sight && m.state === "chase" && this.stealthOn()) { this.caught(m); return; } // 잠입 임무 중에는 경비가 쫓아오는 일 자체가 실패
        if (m.d.sight && m.state === "patrol") { // 경비: 바라보는 쪽 시야 안에 들어왔을 때만 발견(등 뒤·시야 밖·숨은 상태·시야를 막는 구조물 뒤는 못 봄)
          near = !p.dead && !p.hidden && dist < m.d.sight * this.sightMul() && sign(dx) === m.dir && Math.abs(p.y - m.y) < 160 && !this.sightBlocked(m.x, p.x);
          if (near) { this.spotted = true; if (this.stealthOn()) { this.caught(m); return; } this.floater(m.x, m.y - m.d.h - 30, "!", "#FF5A4D"); }
        } else if (m.d.sight && m.state === "chase") near = !p.dead && dist < m.d.chase * 1.3 && Math.abs(p.y - m.y) < 160;
        if (m.state === "patrol" || m.state === "chase") {
          if (near) { m.state = "chase"; m.dir = sign(dx) || m.dir; }
          else { m.state = "patrol"; }
          if (m.state === "chase") {
            if (dist > m.d.w / 2 + 40) m.x += m.dir * m.d.speed * dt;
            else if (m.cd <= 0) this.startAttack(m);
          } else if (m.pause > 0) m.pause -= dt;
          else {
            m.x += m.dir * m.d.speed * 0.5 * dt;
            if (m.x < m.min) { m.x = m.min; m.dir = 1; m.pause = rnd(0.3, 1.2); }
            if (m.x > m.max) { m.x = m.max; m.dir = -1; m.pause = rnd(0.3, 1.2); }
          }
        } else if (m.state === "windup") {
          m.st += dt; if (m.pat !== "wave" && m.pat !== "slam") m.dir = sign(dx) || m.dir; else if (m.st < 0.2) m.dir = sign(dx) || m.dir; // 내려치기·충격파는 시작 직후에만 방향을 잡음
          if (m.st >= (m.wt || 0.5)) { if (m.pat === "slam" || m.pat === "wave") { m.state = "strike"; m.st = 0; m.did = false; } else { m.state = "lunge"; m.st = 0; } }
        } else if (m.state === "strike") {
          m.st += dt;
          if (!m.did) { m.did = true; this.bossStrike(m); }
          if (m.st >= (m.pat === "wave" && m.rage ? 0.75 : 0.4)) { m.state = "chase"; m.cd = this.attackCd(m); m.st = 0; }
          if (m.pat === "wave" && m.rage && !m.did2 && m.st >= 0.35) { m.did2 = true; this.bossStrike(m); }
        } else if (m.state === "recover") {
          m.st += dt; // 돌진 직후 제자리에서 멈춤: 공격할 틈
          if (m.st >= m.d.recoverT) { m.state = "chase"; m.cd = this.attackCd(m); m.st = 0; }
        } else if (m.state === "lunge") {
          m.st += dt; m.x += m.dir * m.d.speed * (m.d.chargeSpd || 3) * dt;
          if (Math.abs(p.x - m.x) < m.d.w / 2 + C.player.halfW && Math.abs(p.y - m.y) < m.d.h + 30) this.hurtPlayer(m, m.pat === "chain" ? 0.9 : 1);
          if (m.st >= (m.d.chargeT || 0.28)) {
            if (m.d.recoverT) { m.state = "recover"; m.st = 0; this.floater(m.x, m.y - m.d.h - 30, "헉헉…", "#FFE9A8"); } // 멧돼지: 전력 돌진 뒤 숨을 고르는 빈틈
            else if (m.pat === "chain" && m.chain < 1) { m.chain++; m.state = "windup"; m.wt = 0.4; m.st = 0; m.dir = sign(dx) || m.dir; } // 연속 돌진: 두 번째는 짧은 예고
            else { m.state = "chase"; m.cd = this.attackCd(m); m.st = 0; }
          }
        }
        m.x = Math.max(m.d.w / 2, Math.min(this.map.width - m.d.w / 2, m.x));
      }
      this.updateProjs(dt);
    },
    /* ---------- 보스 패턴: 돌진(lunge) · 내려치기(slam, 바닥 경고 후 범위 타격) · 충격파(wave, 바닥을 훑고 옴 → 점프로 회피) · 연속 돌진(chain, 체력 50% 이하) ---------- */
    attackCd(m) { return m.d.boss ? (m.rage ? (m.d.cdRage || 1.5) : (m.d.cd || 2.2)) : 1.3; }, // 보스 공격 사이 대기(초): 2페이즈에서 짧아짐
    startAttack(m) {
      const d = m.d, rage = !!(d.boss && m.hp <= m.maxHp * 0.5); let pat = "lunge";
      if (d.patterns) { const pool = d.patterns.filter((k) => k !== m.lastPat || d.patterns.length === 1); if (rage && d.ragePatterns) pool.push(...d.ragePatterns, ...d.ragePatterns); pat = pool[Math.floor(Math.random() * pool.length)]; }
      const W = { lunge: 0.5, chain: 0.6, slam: 0.8, wave: 0.7 }; // 모든 패턴은 0.5초 이상 예고
      m.lastPat = pat; m.pat = pat; m.rage = rage; m.chain = 0; m.did2 = false;
      m.wt = Math.max(0.5, (W[pat] || 0.5) * (rage ? 0.85 : 1), d.windT || 0);
      m.state = "windup"; m.st = 0;
    },
    slamRadius(m) { return m.d.slamR || 190; },
    bossStrike(m) {
      const p = this.player;
      if (m.pat === "slam") {
        const R = this.slamRadius(m);
        this.fx.push({ kind: "ring", x: m.x, y: m.y - 4, t: 0, dur: 0.45, r: R, color: "#C9A7F5" }, { kind: "wave", x: m.x, y: m.y - 6, t: 0, dur: 0.4, r: R, color: "#EBD9FF" });
        if (Math.abs(p.x - m.x) < R + C.player.halfW && p.y >= m.y - 70) this.hurtPlayer(m, 1.2); // 높이 점프하면 피함
      } else if (m.pat === "wave") {
        this.projs.push({ x: m.x + m.dir * (m.d.w / 2), y: m.y, dir: m.dir, vx: m.dir * 330, t: 0, life: 2.0, owner: m, mult: 0.75 });
      }
    },
    updateProjs(dt) {
      const p = this.player;
      for (const q of this.projs) {
        q.t += dt; q.x += q.vx * dt;
        if (!p.dead && Math.abs(p.x - q.x) < 34 + C.player.halfW && p.y >= q.y - 60) { this.hurtPlayer(q.owner, q.mult); q.t = q.life; }
        if (q.x < 0 || q.x > this.map.width) q.t = q.life;
      }
      this.projs = this.projs.filter((q) => q.t < q.life);
    },
    drawBossWarn(ctx, m) {
      if (m.state !== "windup" || !m.d.boss) return;
      const k = Math.min(1, m.st / (m.wt || 0.5)), pulse = 0.5 + 0.5 * Math.sin(m.st * 28);
      ctx.save();
      if (m.pat === "slam") { const R = this.slamRadius(m); ctx.fillStyle = "rgba(255,70,60," + (0.14 + 0.2 * k * pulse) + ")"; ctx.strokeStyle = "rgba(255,120,100,.85)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(m.x, m.y - 4, R, 26, 0, 0, 7); ctx.fill(); ctx.stroke(); }
      else if (m.pat === "wave") { const L = 420; ctx.fillStyle = "rgba(255,70,60," + (0.12 + 0.18 * pulse) + ")"; ctx.fillRect(m.dir > 0 ? m.x : m.x - L, m.y - 26, L, 30); }
      else { const L = 230; ctx.fillStyle = "rgba(255,70,60," + (0.12 + 0.18 * pulse) + ")"; ctx.fillRect(m.dir > 0 ? m.x : m.x - L, m.y - 14, L, 16); }
      ctx.restore();
    },
    drawProjs(ctx) {
      for (const q of this.projs) {
        ctx.save(); ctx.translate(q.x, q.y - 6); ctx.scale(q.dir, 1);
        ctx.fillStyle = "rgba(190,150,245,.85)"; ctx.strokeStyle = "#EBD9FF"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-8, -58, 26, -4); ctx.quadraticCurveTo(0, -18, -26, 0); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    },

    /* ---------- 그리기 ---------- */
    draw(ctx) {
      const PR = AU.Prologue, pro = !!(PR && PR.on);
      if (pro && PR.shotFn) { PR.shotFn(ctx); PR.drawOverlay(ctx); return; } // 시간 경과 연출처럼 화면 전체를 직접 그리는 컷
      const cx = Math.round(this.camX), map = this.map, p = this.player;
      ctx.save(); if (pro) PR.beginFrame(ctx);
      this.drawBackground(ctx, cx);
      if (this.vis === "dim" && !pro) { ctx.fillStyle = "rgba(20,12,4,.34)"; ctx.fillRect(0, 0, W, H); } // 시안 A: 배경만 살짝 어둡게(인물은 그 위에 그려 또렷해짐)
      ctx.save(); ctx.translate(-cx, 0);
      if (pro) PR.drawLayer(ctx, "back");
      this.drawStructures(ctx);
      if (this.vis === "rim" && !pro) { ctx.save(); ctx.shadowColor = "rgba(255,244,214,.6)"; ctx.shadowBlur = 6; }
      for (const n of map.npcs || []) this.drawNpc(ctx, n);
      if (this.vis === "rim" && !pro) ctx.restore();
      if (map.fgSlice && AU.Img.has(map.bg)) { // 계산대 등 배경 일부를 NPC 앞에 다시 그려 NPC가 뒤에 서 있는 것처럼 보이게 함
        const im = AU.Img.get(map.bg), k = H / im.naturalHeight, f = map.fgSlice; ctx.drawImage(im, f[0], f[1], f[2], f[3], f[0] * k, f[1] * k, f[2] * k, f[3] * k);
      }
      for (const n of map.npcs || []) this.drawNpcOverlay(ctx, n);
      this.drawSpots(ctx); this.drawStealthProps(ctx);
      for (const m of this.monsters) if (m.alive && m.d.sight && m.state === "patrol") { // 경비 시야(붉은 부채꼴)
        const L = m.d.sight, g = ctx.createLinearGradient(m.x, 0, m.x + m.dir * L, 0); g.addColorStop(0, "rgba(255,70,60,.32)"); g.addColorStop(1, "rgba(255,70,60,0)");
        ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(m.x, m.y - 70); ctx.lineTo(m.x + m.dir * L, m.y - 4); ctx.lineTo(m.x + m.dir * L, m.y + 6); ctx.lineTo(m.x, m.y - 40); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      for (const m of this.monsters) if (m.alive) this.drawBossWarn(ctx, m);
      for (const m of this.monsters) if (m.alive) this.drawMonster(ctx, m);
      this.drawProjs(ctx);
      this.drawDrops(ctx);
      if (pro) PR.drawLayer(ctx, "mid");
      if (this.vis === "rim" && !pro) { ctx.save(); ctx.shadowColor = "rgba(255,244,214,.6)"; ctx.shadowBlur = 6; }
      this.drawPlayer(ctx, p);
      if (this.vis === "rim" && !pro) ctx.restore();
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
        ctx.fillStyle = (t.caught ? "rgba(110,22,22," : "rgba(255,248,232,") + Math.max(0, Math.min(1, a)) + ")"; ctx.fillRect(0, 0, W, H);
        if (t.caught) { ctx.font = "800 44px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,225,200," + Math.max(0, Math.min(1, a * 1.4)) + ")"; ctx.fillText("들켰다!", W / 2, H / 2); }
      }
    },
    drawBackground(ctx, cx) {
      const PR = AU.Prologue, key = (PR && PR.on && PR.variant === "attack" && this.map.bgAtk) || this.map.bg;   // 프롤로그: 습격 상태는 같은 구도의 별도 그림
      if (this.map.bgs && this.map.bgs.every((k) => AU.Img.has(k))) { // 여러 장을 가로로 이어 붙이는 맵(검은 아지트 외곽·실험 구역)
        let ox = 0; for (const k of this.map.bgs) { const im = AU.Img.get(k), sw = im.naturalWidth * (H / im.naturalHeight); if (ox + sw > cx && ox < cx + W) ctx.drawImage(im, Math.round(ox - cx), 0, Math.ceil(sw) + 1, H); ox += sw - 1; }
      } else if (AU.Img.has(key)) {
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
      for (const pl of map.platforms) if (pl.h && pl.img && AU.Img.has(pl.img)) { // 막히는 바위·턱: 그림으로 보이게(높이가 그림보다 크면 위로 쌓아 올림)
        const im = AU.Img.get(pl.img), rw = pl.w * 1.12, rh = rw * im.naturalHeight / im.naturalWidth, bottom = pl.y + pl.h + 4, cx = pl.x + pl.w / 2;
        const rows = Math.max(1, Math.ceil((pl.h - rh * 0.25) / (rh * 0.72)));
        for (let k = 0; k < rows; k++) {
          const sc = 1 - 0.1 * k, w2 = rw * sc, h2 = rh * sc; let yb = bottom - k * rh * 0.72; if (k === rows - 1 && rows > 1) yb = pl.y + h2 * 0.92;
          ctx.drawImage(im, cx - w2 / 2 + (k % 2 ? 6 : 0), yb - h2, w2, h2);
        }
      }
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
    nameTag(ctx, text, x, y, color) { // 유리 느낌의 알약형 이름표(배경이 복잡해도 읽히도록 어둡고 반투명)
      text = String(text).replace(/\s*\((임시|임시 명칭)\)/g, "");
      ctx.font = "600 14px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center";
      const w = ctx.measureText(text).width + 22, h = 24, x0 = x - w / 2, y0 = y - 17;
      ctx.save(); ctx.fillStyle = color || "rgba(20,28,40,.62)"; this.rr(ctx, x0, y0, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#FFFFFF"; ctx.fillText(text, x, y);
    },
    // 조사·수리 지점: 목표가 진행 중이면 눈에 띄게, 수리를 마친 곳은 고쳐진 모습으로 남김(그림이 오기 전 임시 도형)
    drawSpots(ctx) {
      const y = GROUND;
      for (const sp of this.map.spots || []) {
        const act = AU.G.spotObjective(sp.id), done = !act && AU.G.spotDone(sp.id);
        if (!act && !(done && sp.kind === "repair")) continue;
        const x = sp.x;
        // 정식 그림이 있으면 그림으로(방책은 고치기 전·후 두 장이 같은 틀), 없으면 아래 임시 도형
        const key = sp.img === "fence" ? (done ? "ob_fence_fixed" : "ob_fence_broken") : sp.img, im = key && AU.Img.has(key) ? AU.Img.get(key) : null;
        if (im) { const w = sp.w || (sp.kind === "repair" ? 170 : sp.img === "ob_trace_crate" ? 112 : 160), h = w * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, x - w / 2, y - h + 6, w, h); }
        else if (sp.kind === "repair") {
          ctx.save(); ctx.lineCap = "round";
          if (done) { ctx.strokeStyle = "#8A6B46"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x - 44, y - 70); ctx.moveTo(x + 44, y); ctx.lineTo(x + 44, y - 70); ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = "#A88358"; ctx.beginPath(); ctx.moveTo(x - 50, y - 56); ctx.lineTo(x + 50, y - 56); ctx.moveTo(x - 50, y - 30); ctx.lineTo(x + 50, y - 30); ctx.stroke(); }
          else { ctx.strokeStyle = "#6E563A"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x - 50, y - 62); ctx.moveTo(x + 44, y); ctx.lineTo(x + 58, y - 24); ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = "#8C714D"; ctx.beginPath(); ctx.moveTo(x - 48, y - 52); ctx.lineTo(x + 6, y - 28); ctx.stroke(); }
          ctx.restore();
        } else { ctx.save(); ctx.fillStyle = "rgba(40,30,34,.5)"; ctx.beginPath(); ctx.ellipse(x, y - 8, 34, 11, 0, 0, 7); ctx.fill(); ctx.restore(); }
        if (act) {
          const by = y - 120 + Math.sin(this.time * 4) * 3;
          ctx.beginPath(); ctx.arc(x, by, 14, 0, 7); ctx.fillStyle = sp.kind === "repair" ? "#4F7D6E" : "#B98B45"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
          ctx.font = "700 18px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#FFFFFF"; ctx.fillText(sp.kind === "repair" ? "⚒" : "?", x, by + 1); ctx.textBaseline = "alphabetic";
          this.nameTag(ctx, sp.label, x, y - 92);
        }
      }
      const w = this.work; if (w) { // 작업 진행 막대
        const p = this.player, bw = 90, k = Math.min(1, w.t / w.dur);
        ctx.fillStyle = "rgba(30,22,15,.7)"; this.rr(ctx, p.x - bw / 2 - 3, p.y - 176, bw + 6, 16, 8); ctx.fill(); ctx.fillStyle = "#9BE0B4"; this.rr(ctx, p.x - bw / 2, p.y - 173, Math.max(6, bw * k), 10, 5); ctx.fill();
      }
    },
    /* NPC 위치 덮어쓰기: 키 = 맵:순번:NPC id. 원래 위치(data)는 건드리지 않고 이 브라우저에만 저장 */
    npcKey(mid, i, n) { return mid + ":" + i + ":" + n.id; },
    applyNpcPos() {
      const o = AU.Store.get("autelia.npcPos") || {};
      for (const mid of Object.keys(AU.MAPS)) (AU.MAPS[mid].npcs || []).forEach((n, i) => { const v = o[this.npcKey(mid, i, n)]; if (!v) return; const dx = v.x - n.x; n.x = v.x; if (v.y != null) n.npcY = v.y; if (n.patrol) n.patrol = [n.patrol[0] + dx, n.patrol[1] + dx]; });
    },
    saveNpcPos(n) {
      const mid = this.mapId, i = (AU.MAPS[mid].npcs || []).indexOf(n); if (i < 0) return;
      const o = AU.Store.get("autelia.npcPos") || {}; o[this.npcKey(mid, i, n)] = { x: n.x, y: n.npcY }; AU.Store.set("autelia.npcPos", o);
    },
    npcPosReport() { const o = AU.Store.get("autelia.npcPos") || {}; return JSON.stringify(o, null, 1); },
    resetNpcPos() { AU.Store.set("autelia.npcPos", {}); location.reload(); },
    bindClick() { // 마우스 클릭으로 NPC와 대화
      if (this._clickBound) return; const cv = document.getElementById("cv"); if (!cv) return; this._clickBound = true;
      cv.style.cursor = "default";
      const hit = (e) => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 1280 + Math.round(this.camX), y = (e.clientY - r.top) / r.height * 720;
        for (const n of (this.map && this.map.npcs) || []) { const ny = n.npcY || GROUND; if (Math.abs(x - n.x) < 55 && y > ny - 190 && y < ny + 30) return n; } return null; };
      this.applyNpcPos();
      // NPC 배치 편집(개발 도구 → "NPC 배치 편집"): 끌어서 위치를 옮기면 이 브라우저에 저장되고, "좌표 복사"로 데이터에 반영할 값을 뽑을 수 있다
      let drag = null; const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 1280 + this.camX, y: (e.clientY - r.top) / r.height * 720 }; };
      cv.addEventListener("pointerdown", (e) => { if (!this.npcEdit || AU.UI.anyOpen() || (AU.Prologue && AU.Prologue.on)) return; const n = hit(e); if (!n) return; const q = pos(e); drag = { n, gx: n.x - q.x, gy: (n.npcY || GROUND) - q.y }; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
      cv.addEventListener("pointermove", (e) => { if (!drag) return; const q = pos(e), n = drag.n, nx = Math.round(q.x + drag.gx), ny = Math.max(GROUND - 150, Math.min(GROUND + 20, Math.round(q.y + drag.gy))), dx = nx - n.x;
        n.x = nx; n.npcY = ny; if (n.patrol) n.patrol = [n.patrol[0] + dx, n.patrol[1] + dx]; n._go = false; });
      const endDrag = () => { if (drag) { this.saveNpcPos(drag.n); drag = null; } }; cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
      cv.addEventListener("mousemove", (e) => { cv.style.cursor = (!AU.UI.anyOpen() && hit(e)) ? (this.npcEdit ? "grab" : "pointer") : "default"; });
      cv.addEventListener("click", (e) => {
        if (this.npcEdit || AU.UI.anyOpen() || (AU.Prologue && AU.Prologue.on)) return; const n = hit(e); if (!n) return;
        if (Math.abs(this.player.x - n.x) < 160) AU.UI.talkNpc(n.id); else AU.UI.toast(AU.NPCS[n.id].name + "에게 조금 더 가까이 가세요.", "info");
      });
    },
    drawNpc(ctx, n) {
      if (this.npcEdit) { const ny = n.npcY || GROUND; ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = "#FFE08A"; ctx.strokeRect(n.x - 55, ny - 190, 110, 220); ctx.setLineDash([]); ctx.font = "700 14px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(30,22,15,.8)"; ctx.fillRect(n.x - 52, ny + 34, 104, 20); ctx.fillStyle = "#FFE08A"; ctx.fillText(Math.round(n.x) + " , " + Math.round(ny), n.x, ny + 49); ctx.restore(); }
      const d = AU.NPCS[n.id], y = n.npcY || GROUND, face = n.patrol && n._walk ? n._f : (this.player.x < n.x ? -1 : 1), bob = n.patrol && n._walk ? Math.abs(Math.sin((n._step || 0) * 0.11)) * 3 * Math.min(1, n._v / 20) : 0;
      if (!this.sprite(ctx, d.sprite, n.x, y - bob, 150 * (d.scale || 1), face, 0)) { ctx.fillStyle = "#C9B8A0"; this.rr(ctx, n.x - 30, y - 130, 60, 130, 20); ctx.fill(); ctx.fillStyle = "#5B4636"; ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("이미지 없음", n.x, y - 60); }
    },
    npcRole(id) { // 역할별 구분(글자·색): 상점/전직/안내/의뢰
      const d = AU.NPCS[id];
      if (d.shop) return { t: "상점", c: "#C58A1E", bg: "rgba(120,80,10,.78)" };
            if (d.special === "missionGuide") return { t: "안내", c: "#2F8F83", bg: "rgba(20,84,78,.78)" };
      if ((d.quests || []).length) return { t: "의뢰", c: "#3F6FB5", bg: "rgba(28,56,110,.78)" };
      return { t: d.title || "주민", c: "#7A7A72", bg: "rgba(62,62,58,.78)", plain: true };
    },
    drawNpcOverlay(ctx, n) { // 이름표·퀘스트 표시: 계산대 등 전경 조각보다 위에 그려 가려지지 않게 함
      const d = AU.NPCS[n.id], y = n.npcY || GROUND;
      const role = this.npcRole(n.id), far = Math.abs(this.player.x - n.x) > 80, st = "C";
      if (st === "C" && role) { ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = role.c; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(n.x, y + 2, 38, 9, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      if (far) {
        if (st === "A" && role) this.nameTag(ctx, role.t + " · " + d.name, n.x, y + 17, role.bg);
        else if (st === "C" && role) this.nameTag(ctx, role.plain ? role.t + " · " + d.name : d.name, n.x, y + 17, role.bg);
        else this.nameTag(ctx, d.name, n.x, y + 17);
      }
      if (st === "B" && role) { const by = y - 172; ctx.font = "700 13px 'Noto Sans KR', sans-serif"; const w = ctx.measureText(role.t).width + 16; ctx.save(); ctx.fillStyle = role.c; ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2; this.rr(ctx, n.x - w / 2, by - 11, w, 22, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(role.t, n.x, by + 1); ctx.restore(); }
      // 퀘스트 표시: 받을 수 있으면 !, 완료 가능하면 ?
      const qm = AU.npcQuestMark(n.id); let mark = qm ? qm.mark : "", kind = qm ? qm.kind : "main"; // 메인=금색 ★, 서브=파란 !, 완료 가능=같은 색의 ?
      if (!mark && d.special === "missionGuide" && AU.G.S.flags.missionsUnlocked && !AU.G.S.flags.guideMet) { mark = AU.QKIND.real.icon; kind = "real"; }
      if (mark) { // 둥근 배지: 배경이 복잡해도 눈에 띄게
        const by = y - 200 + Math.sin(this.time * 4) * 3;
        ctx.beginPath(); ctx.arc(n.x, by, 15, 0, 7); ctx.fillStyle = AU.QKIND[kind].color; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
        ctx.font = "700 20px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#FFFFFF"; ctx.fillText(mark, n.x, by + 2); ctx.textBaseline = "alphabetic";
      }
    },
    drawHeroArt(ctx, p, lean, moving) { // 프롤로그 주인공 시트(성별 따라 m/f, 색은 Tint가 입힘). 그림이 없으면 false
      const g = AU.Profile.gender(), loco = "pc_player_" + g + "_locomotion", act = "pc_player_" + g + "_actions";
      const PA = AU.PArt, spr = PA && PA.spr; if (!spr || !AU.Img.has(loco) || !AU.Img.has(act)) return false;
      if (p.rope) return false;
      const cb = "pc_player_" + g + "_combat", hasCb = AU.Img.has(cb);
      if (hasCb) {
        const sk = p.sk && p.sk.id; let cf = null;
        if (p.dead) cf = "down"; else if (p.flash > 0) cf = "hurt";
        else if (sk === "strike") cf = "strike"; else if (sk === "spin") cf = "spin";
        else if (p.atkT > 0) cf = p.atkT > 0.11 ? "attack1" : "attack2";
        if (cf) return PA.spr(ctx, cb, cf, p.x, p.y, p.dir);
      }
      let key = act, fr = "idle";
      if (!p.onGround) { key = loco; fr = p.vy < 0 ? "jump_up" : "jump_down"; } else if (moving) { key = loco; fr = "walk" + (1 + (Math.floor(this.time * 9) % 4)); }
      return PA.spr(ctx, key, fr, p.x + lean, p.y, p.dir);
    },
    drawPlayer(ctx, p) {
      if (p.invuln > 0 && Math.floor(this.time * 20) % 2 === 0 && !p.dead) ctx.globalAlpha = 0.45;
      if (p.hidden) ctx.globalAlpha = 0.3;
      if (p.dead) ctx.globalAlpha = 0.5;
      const gk = AU.Profile.gender() === "f" ? ["player_female", "player_male"] : ["player_male", "player_female"], key = AU.Img.has(gk[0]) ? gk[0] : gk[1], moving = Math.abs(p.vx) > 20 && p.onGround;
      const frame = moving ? Math.floor(p.anim * 9 * 22 / C.move.speed) % 4 : (p.rope ? Math.floor(p.anim) % 2 : 0);
      const lean = p.atkT > 0 ? p.dir * 6 : 0, PR = AU.Prologue, pro = !!(PR && PR.on), pose = pro ? PR.poseOf(p) : null;
      let skm = null; if (p.sk && !pro && !AU.Img.has("pc_player_" + AU.Profile.gender() + "_combat")) { const q = p.sk.t / p.sk.dur, e = Math.sin(Math.min(1, q) * Math.PI); skm = p.sk.id === "strike" ? { dx: p.dir * 16 * e, rot: p.dir * (q < 0.35 ? -0.1 * (q / 0.35) : 0.2 * e), sx: 1 + 0.06 * e, sy: 1 - 0.04 * e } : p.sk.id === "spin" ? { dx: 0, rot: 0, sx: Math.cos(q * Math.PI * 4), sy: 1 + 0.03 * e } : { dx: 0, rot: 0, sx: 1 + 0.03 * e, sy: 1 - 0.07 * e }; if (Math.abs(skm.sx) < 0.12) skm.sx = skm.sx < 0 ? -0.12 : 0.12; }
      if (skm) { ctx.save(); ctx.translate(p.x + skm.dx, p.y); ctx.rotate(skm.rot); ctx.scale(skm.sx, skm.sy); ctx.translate(-p.x, -p.y); }
      if (pose) { ctx.save(); ctx.translate(p.x + (pose.dx || 0), p.y + (pose.dy || 0)); ctx.rotate(pose.rot || 0); ctx.scale(pose.sx || 1, pose.sy || 1); ctx.translate(-p.x, -p.y); }
      if (pro && PR.drawHero(ctx, p, pose, moving)) { /* 프롤로그 정식 그림 */ }
      else if (!pro && this.drawHeroArt(ctx, p, lean, moving)) { /* 프롤로그와 같은 주인공 그림 */ }
      else if (!this.sprite(ctx, key, p.x + lean, p.y, C.player.spriteHeight, p.dir, frame)) { ctx.fillStyle = "#FFB3C7"; this.rr(ctx, p.x - 22, p.y - 118, 44, 118, 16); ctx.fill(); }
      if (pose) ctx.restore();
      if (!pro && AU.Profile.name()) { ctx.globalAlpha = 1; this.nameTag(ctx, AU.Profile.name(), p.x, p.y + 17, "rgba(70,52,20,.7)"); }
      if (skm) ctx.restore();
      ctx.globalAlpha = 1;
      if (pro) PR.drawPlayerExtras(ctx, p, pose); // 들고 있는 목재·망치·등에 멘 가방
      if (p.flash > 0) { ctx.fillStyle = "rgba(255,90,90," + (p.flash * 2) + ")"; this.rr(ctx, p.x - 26, p.y - 124, 52, 124, 18); ctx.fill(); }
    },
    drawFx(ctx, f) {
      if (f.t < 0) return; // 지연 시작 이펙트
      const k = f.t / f.dur; ctx.save(); ctx.globalAlpha = 1 - k;
      if (f.kind === "slash") {
        ctx.translate(f.x, f.y); ctx.scale(f.dir, 1); ctx.strokeStyle = f.color; ctx.lineWidth = (f.thin ? 6 : 12) * (1 - k * 0.6); ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(-20, 0, f.r * (0.7 + k * 0.4), -1.1, 1.1); ctx.stroke();
      } else if (f.kind === "ring") {
        ctx.strokeStyle = f.color; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.3 + k * 0.7), f.r * (0.2 + k * 0.4), 0, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === "wave") { // 바닥을 훑는 충격파
        ctx.strokeStyle = f.color; ctx.lineWidth = 5 * (1 - k); ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.2 + k * 0.8), 9 * (0.5 + k * 0.7), 0, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === "whirl") { // 몸을 도는 칼날 궤적(크로스 슬래시)
        ctx.translate(f.x, f.y); ctx.scale(1, 0.55); ctx.strokeStyle = f.color; ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) { const a0 = k * 9 + i * 2.094; ctx.lineWidth = 9 * (1 - k * 0.7); ctx.beginPath(); ctx.arc(0, 0, f.r * (0.55 + k * 0.45), a0, a0 + 1.5); ctx.stroke(); }
      } else if (f.kind === "sparks") { // 사방으로 튀는 불꽃
        ctx.fillStyle = f.color;
        for (let i = 0; i < f.n; i++) { const a = -1.2 + (i / (f.n - 1)) * 2.4 + (i % 2 ? 0.15 : -0.1), d = f.spread * (0.3 + k) * (0.6 + (i % 3) * 0.25); ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d * f.dir, f.y + Math.sin(a) * d * 0.8 + k * 20, 4 * (1 - k * 0.7), 0, 7); ctx.fill(); }
      } else if (f.kind === "motes") { // 떠오르는 빛 알갱이(버스트)
        ctx.fillStyle = f.color;
        for (let i = 0; i < f.n; i++) { const ox = Math.sin(i * 12.9) * 46, sp = 0.6 + (i % 4) * 0.2; ctx.beginPath(); ctx.arc(f.x + ox + Math.sin(this.time * 5 + i) * 5, f.y - 20 - k * 120 * sp, 3.5 * (1 - k * 0.5), 0, 7); ctx.fill(); }
      } else if (f.kind === "pillar") { // 은은한 빛기둥
        const g = ctx.createLinearGradient(0, f.y - 150, 0, f.y); g.addColorStop(0, "rgba(166,227,201,0)"); g.addColorStop(1, "rgba(166,227,201,.55)"); ctx.fillStyle = g; ctx.fillRect(f.x - 34, f.y - 150, 68, 150);
      } else if (f.kind === "runner") { // 도주하는 인물(걷기 시트 4프레임): 오른쪽으로 달려 사라짐
        const x = f.x + f.vx * f.t; this.sprite(ctx, f.img, x, f.y, f.h, 1, Math.floor(f.t * 9) % 4);
      } else if (f.kind === "ghost") { // 쓰러지는 적: 기울며 가라앉고 사라짐
        const im = AU.Img.get(f.img); if (im) { const dw = f.refW ? f.sw * im.naturalWidth / f.refW : f.sw, dh = dw * im.naturalHeight / im.naturalWidth; ctx.translate(f.x, f.y + k * (f.still ? 6 : 14)); ctx.scale(f.dir < 0 ? -1 : 1, f.still ? 1 : 1 - k * 0.35); if (!f.still) ctx.rotate(-0.5 * k); if ("filter" in ctx) ctx.filter = "brightness(" + (1.8 - k * 0.8) + ")"; ctx.drawImage(im, -dw / 2, -dh, dw, dh); }
      }
      ctx.restore();
    },
    // 적 그래픽은 임시(캔버스 도형). 정식 그림이 오면 sprite()로 교체
    // 바닥 아이템: 그림이 아직 없어 모양과 색으로 구분(흔함=베이지, 드묾=청록, 희귀=금색+빛기둥). 희귀는 이름이 항상 보임
    dropArt(id) { // assets/item/<id>.webp 를 처음 쓸 때 불러 둠. 없거나 아직 불러오는 중이면 null(임시 도형으로 표시)
      const c = this._dropArt || (this._dropArt = {}); let e = c[id];
      if (!e) { const it = AU.ITEMS[id] || {}, src = it.img || "assets/item/" + id + ".webp", im = new Image(); e = c[id] = { im, ok: false }; im.onload = () => { e.ok = true; }; im.src = src; }
      return e.ok ? e.im : null;
    },
    drawDrops(ctx) {
      const p = this.player, placed = []; // 글자가 겹치지 않게 위로 쌓아 올림
      for (const d of this.drops) {
        const it = AU.ITEMS[d.id], rar = AU.RARITY[it.rarity] || AU.RARITY.common, left = 90 - d.age;
        if (left < 10 && Math.floor(left * 4) % 2 === 0) continue; // 사라지기 전 깜빡임
        const bob = d.onGround ? Math.sin(this.time * 3 + d.x) * 3 : 0, x = d.x, y = d.y - 10 + bob;
        ctx.save();
        if (it.rarity === "rare") { const a = 0.18 + 0.1 * Math.sin(this.time * 4); const g = ctx.createLinearGradient(0, y - 120, 0, y); g.addColorStop(0, "rgba(242,193,78,0)"); g.addColorStop(1, "rgba(242,193,78," + a + ")"); ctx.fillStyle = g; ctx.fillRect(x - 14, y - 120, 28, 120); }
        ctx.fillStyle = "rgba(40,30,20,.25)"; ctx.beginPath(); ctx.ellipse(x, d.gy + 2, 11, 4, 0, 0, 7); ctx.fill();
        ctx.translate(x, y); ctx.fillStyle = rar.color; ctx.strokeStyle = "#5A4630"; ctx.lineWidth = 2;
        const art = this.dropArt(d.id);
        if (art) { // 정식 아이템 그림: 희귀도 색 원 위에 그림(인벤토리와 같은 그림)
          ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
          const sz = 34; ctx.drawImage(art, -sz / 2, -sz / 2, sz, sz);
        } else if (d.id === "silver_coin") { // 은화: 은빛 동전(액수가 크면 2~3개가 겹쳐 보임). 정식 그림은 assets/item/silver_coin.webp 로 오면 위쪽 분기가 자동으로 대신함
          const cnt = Math.min(3, 1 + Math.floor(d.n / 7));
          for (let i = 0; i < cnt; i++) { const cx = (i - (cnt - 1) / 2) * 12, cy = -i * 3 + (i % 2) * 2, ph = this.time * 2.2 + d.x * 0.05 + i, sx = 0.5 + 0.5 * Math.abs(Math.cos(ph)); ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
            const R = 10.5, g = ctx.createLinearGradient(-R, -R, R, R); g.addColorStop(0, "#F4F7FA"); g.addColorStop(0.45, "#C9D0D8"); g.addColorStop(1, "#8E98A4");
            ctx.fillStyle = g; ctx.strokeStyle = "#5F6873"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke();            // 동전 몸통
            ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(0, 0, R - 2, 0, 7); ctx.stroke();                              // 안쪽 테두리(밀링)
            ctx.strokeStyle = "rgba(95,104,115,.55)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, R - 3.6, 0, 7); ctx.stroke();
            ctx.fillStyle = "rgba(95,104,115,.7)"; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 1.9 : 4.4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();   // 가운데 별 문양
            ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.ellipse(-4, -5, 3.2, 1.5, -0.7, 0, 7); ctx.fill();                                        // 반사광
            ctx.restore(); }
        } else {
        ctx.beginPath();
        if (it.type === "equip") { ctx.moveTo(0, -12); ctx.lineTo(11, 0); ctx.lineTo(0, 12); ctx.lineTo(-11, 0); } else if (it.type === "use") { ctx.arc(0, 0, 9, 0, 7); } else if (ctx.roundRect) { ctx.roundRect(-9, -8, 18, 16, 5); } else { ctx.rect(-9, -8, 18, 16); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        const near = Math.abs(p.x - d.x) < 140 && Math.abs(p.y - d.y) < 160;
        if (near || it.rarity === "rare") {
          ctx.font = "600 13px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round"; ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(30,22,15,.75)";
          const t = it.name.replace(" (임시)", "") + (d.n > 1 ? " ×" + d.n : ""), w = ctx.measureText(t).width; let ly = y - 22;
          while (placed.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 4 && Math.abs(q.y - ly) < 16)) ly -= 16;
          placed.push({ x, y: ly, w }); ctx.strokeText(t, x, ly); ctx.fillStyle = rar.color; ctx.fillText(t, x, ly);
        }
      }
    },
    drawMonster(ctx, m) {
      const d = m.d, x = m.x, y = m.y, mo0 = d.motion || "";
      let hop = m.state === "lunge" ? -10 : Math.abs(Math.sin(this.time * 6 + x)) * (m.state === "chase" ? 5 : 2);
      if (mo0 === "coil") hop = 0;                                                            // 뱀: 바닥을 미끄러짐(통통 튀지 않음)
      else if (mo0 === "scurry") hop = m.state === "lunge" ? 0 : Math.abs(Math.sin(this.time * 18 + x)) * 2.5; // 쥐: 잔걸음
      else if (mo0 === "sidestep") hop = m.state === "lunge" ? 0 : Math.abs(Math.sin(this.time * 5 + x)) * 1.5; // 게: 낮게 옆걸음
      const sp = !!(d.sprite && AU.Img.has(d.sprite)); let th = d.h;
      if (sp && d.poses) { // 여러 동작 그림(보스): 상태에 맞는 그림을 골라 그림. 코드 늘림 없이 그림 자체가 동작
        const P = d.poses, step = Math.floor(this.time / 0.22 + x * 0.01) % 2 === 0 ? "walkA" : "walkB";
        let key = P.idle; if (m.flash > 0) key = P.hurt; else if (m.state === "lunge" || m.state === "strike") key = P.attack; else if (m.state === "windup") key = P.windup; else if (m.state === "chase" || m.state === "patrol") key = P[step];
        const im = AU.Img.get(AU.Img.has(key) ? key : d.sprite), dw = d.sw * im.naturalWidth / (d.refW || im.naturalWidth), dh = dw * im.naturalHeight / im.naturalWidth;
        const lunge = m.state === "lunge" ? Math.min(1, m.st / (m.d.chargeT || 0.28)) : 0;
        ctx.save(); ctx.translate(x + (m.dir < 0 ? -1 : 1) * 14 * lunge, y - (m.state === "chase" || m.state === "patrol" ? Math.abs(Math.sin(this.time * 7)) * 3 : 0)); ctx.scale(m.dir < 0 ? -1 : 1, 1);
        ctx.drawImage(im, -dw / 2, -dh, dw, dh); ctx.restore(); th = dh * 0.92;
      } else if (sp) { // 정식 그림: 한 장을 코드로 움직임(걷기 통통, 준비 동작 웅크림, 돌진 늘어남, 피격 번쩍임)
        const im = AU.Img.get(d.sprite), dw = d.sw, dh = dw * im.naturalHeight / im.naturalWidth; let sx = 1, sy = 1, rot = 0;
        const mo = d.motion || "", tt = this.time, ph = x * 0.013; let ox = 0, up = 0;
        sy += 0.018 * Math.sin(tt * 3 + ph); sx -= 0.01 * Math.sin(tt * 3 + ph); // 숨쉬기
        if (m.state === "chase" || m.state === "patrol") {
          const f = m.state === "chase" ? 1 : 0.5;
          if (mo === "coil") { sx += 0.09 * f * Math.sin(tt * 9 + ph); rot += 0.07 * f * Math.sin(tt * 7 + ph); }                 // 뱀: 몸을 S자로 꿈틀
          else if (mo === "scurry") { ox += 3 * f * Math.sin(tt * 34 + ph); rot += 0.025 * Math.sin(tt * 34 + ph); sy -= 0.03 * f; } // 쥐: 잔떨림 잔걸음
          else if (mo === "sidestep") { ox += 6 * f * Math.sin(tt * 6 + ph); rot += 0.04 * f * Math.sin(tt * 12 + ph); sy -= 0.04; } // 게: 낮게 옆으로 뒤뚱
          else if (mo === "leap") { up += Math.abs(Math.sin(tt * 5 + ph)) * 9 * f; rot += 0.05 * Math.sin(tt * 10 + ph); }       // 늑대: 크게 성큼성큼
          else if (mo === "swing") { rot += 0.025 * f * Math.sin(tt * 6 + ph); ox += 2 * Math.sin(tt * 6 + ph); }                 // 용병: 묵직한 걸음
          else if (m.state === "chase") { rot += 0.035 * Math.sin(tt * 13 + ph); sy += 0.025 * Math.sin(tt * 13 + ph + 1); }     // 기본: 달려드는 흔들림
        }
        if (m.state === "recover") { sy = 0.93 + 0.03 * Math.sin(m.st * 14); sx = 1.04; rot = -0.05; up = -1; } // 숨을 몰아쉬며 멈춤
        if (m.state === "windup") {
          const k = Math.min(1, m.st / (m.wt || 0.5));
          if (mo === "coil") { sy = 1 + 0.18 * k; sx = 1 - 0.12 * k; rot = -0.28 * k; ox = -10 * k; }                              // 뱀: 머리를 뒤로 쳐듦
          else if (mo === "scurry") { sx = 1 + 0.04 * Math.sin(m.st * 60); sy = 1 - 0.1 * k; ox = -5 * k + 2.5 * Math.sin(m.st * 70); } // 쥐: 몸을 떨며 움츠림
          else if (mo === "sidestep") { sy = 1 + 0.12 * k; sx = 1 + 0.1 * k; rot = -0.08 * k; up = 4 * k; }                          // 게: 집게를 번쩍 들어 올림
          else if (mo === "leap") { sy = 1 - 0.16 * k; sx = 1 + 0.1 * k; rot = 0.14 * k; ox = -16 * k; up = -2 * k; }               // 늑대: 몸을 깊이 낮추고 으르렁
          else if (mo === "pounce") { sy = 1 - 0.22 * k; sx = 1 + 0.14 * k; rot = -0.06 * k; ox = -12 * k; }                 // 낮게 웅크리고 뒤로 물러남
          else if (mo === "swing") { sy = 1 + 0.05 * k; sx = 1 - 0.04 * k; rot = -0.3 * k; ox = -6 * k; up = 6 * k; }   // 철퇴를 뒤로 들어 올림
          else { sy = 1 - 0.14 * k; sx = 1 + 0.08 * k; rot = -0.12 * k; }
        } else if (m.state === "lunge") {
          const q = Math.min(1, m.st / (m.d.chargeT || 0.28));
          if (mo === "coil") { sx = 1.28; sy = 0.82; rot = 0.12 - 0.12 * q; ox = 26 * q; }                                    // 뱀: 쭉 뻗으며 물기
          else if (mo === "scurry") { sx = 1.3; sy = 0.78; rot = 0.04; ox = 30 * q; }                                           // 쥐: 낮게 돌진해 들이받음
          else if (mo === "sidestep") { const sn = Math.sin(q * Math.PI * 3); sx = 1.05 + 0.08 * sn; sy = 0.96 - 0.06 * sn; rot = 0.03 * sn; ox = 8 * q; } // 게: 집게를 딱딱 여닫음
          else if (mo === "leap") { sx = 1.24; sy = 0.82; rot = 0.2; up = Math.sin(q * Math.PI) * 48; ox = 30 * q; }            // 늑대: 높고 멀리 도약
          else if (mo === "pounce") { sx = 1.2; sy = 0.84; rot = 0.16; up = Math.sin(q * Math.PI) * 30; ox = 14 * q; }       // 도약해서 덮침
          else if (mo === "swing") { sx = 1.06; sy = 0.96; rot = -0.3 + 0.62 * q; ox = 18 * q; }                        // 위에서 아래로 내려침
          else { sx = 1.14; sy = 0.9; rot = 0.1; }
        }
        if (m.flash > 0) { sx *= 0.92; sy *= 1.07; rot -= 0.1; ox -= 6; } // 맞았을 때 움찔
        ctx.save(); ctx.translate(x + ox * (m.dir < 0 ? -1 : 1), y - hop - up); ctx.scale(m.dir < 0 ? -1 : 1, 1); ctx.rotate(rot); ctx.scale(sx, sy);
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
