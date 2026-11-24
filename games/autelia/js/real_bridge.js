/* 메인 스토리와 연결하는 선택형 현실 활동 안내. 프롤로그 전개 조건과 무관. */
window.AU = window.AU || {};
(function () {
  "use strict";
  const R = AU.RealBridge = {
    active: false,
    dismiss: null,
    // 프롤로그 처음부터 기록할 수 있게 기존 미션 시스템만 조기에 공개한다.
    activate() {
      const G = AU.G, S = G && G.S;
      if (!G || !S) return false;
      if (!S.flags.missionsUnlocked) G.unlockRealMissions(false);
      if (!S.flags.guideMet) G.discoverMissions();
      return true;
    },
    // 이야기의 특정 지점을 현실 활동과 연결하되 스토리 완료 조건에 영향을 주지 않습니다.
    PLACEMENTS: Object.freeze({
      "prologue-temple-complete": { missionId: "m_a3", moment: "신전 건축 완료", mode: "journal", story: "신전을 완성하고 작업을 마무리했습니다." },
      "prologue-banners": { missionId: "m_a4", moment: "축제 깃발 설치 시작", mode: "prompt", story: "축제를 위해 깃발 세 개를 달기로 했습니다." },
      "prologue-festival": { missionId: "m_r3", moment: "축제 주민과 대화", mode: "journal", story: "축제에서 주민들과 이야기를 나누었습니다." },
      "prologue-arrival": { missionId: "m_p5", moment: "포르투 노바 도착", mode: "journal", story: "긴 여정 끝에 포르투 노바에 도착했습니다." },
      "act1-q_s1_silver-start": {"missionId":"m_m3","moment":"항구도시의 첫걸음","story":"새로운 도시에서 모험의 첫걸음을 내디뎠습니다.","mode":"journal","questId":"q_s1_silver","phase":"start"},
      "act1-q_guild_talk-done": {"missionId":"m_e6","moment":"길드 정식 등록","story":"입단 시험을 마치고 정식 모험가가 되었습니다.","mode":"journal","questId":"q_guild_talk","phase":"done"},
      "act1-q_a1_variant-start": {"missionId":"m_e4","moment":"변형의 흔적","story":"검은 결정의 정체를 알아보기로 했습니다.","mode":"journal","questId":"q_a1_variant","phase":"start"},
      "act1-q_a2_secret-done": {"missionId":"m_m6","moment":"바르샤의 전언","story":"새로운 정보를 얻고 앞으로 나아갈 방향을 찾았습니다.","mode":"journal","questId":"q_a2_secret","phase":"done"},
      "act1-q_a3_jepeto-start": {"missionId":"m_m1","moment":"제페토의 부탁","story":"제페토의 부탁을 받아 새로운 조사에 나섭니다.","mode":"journal","questId":"q_a3_jepeto","phase":"start"},
      "act1-q_h1f-done": {"missionId":"m_m4","moment":"1막 완료 · 제페토에게 보고","story":"긴 조사를 마치고 다음 여정을 준비할 시간이 되었습니다.","mode":"journal","questId":"q_h1f","phase":"done"}
    }),
    suggestions() {
      const flags = AU.G && AU.G.S && AU.G.S.flags;
      return flags && flags.realBridgeSuggestions && typeof flags.realBridgeSuggestions === "object" ? flags.realBridgeSuggestions : {};
    },
    queue(key, missionId) {
      const P = AU.Prologue;
      const cfg = this.PLACEMENTS[key], G = AU.G, S = G && G.S;
      if (!S || !cfg || cfg.missionId !== missionId || !G.mission(missionId)) return false;
      if (cfg.questId) {
        if (P && P.on || !S.prologue || S.prologue.state !== "COMPLETED") return false;
        const q = AU.QUESTS[cfg.questId], rec = G.qs(cfg.questId);
        if (!q || q.type !== "main" || !rec || (cfg.phase === "done" ? rec.state !== "done" : !["active","ready","done"].includes(rec.state))) return false;
      } else if (!P || !P.on || P.replay) return false;
      if (!this.activate()) return false;
      if (!S.flags.realBridgeSuggestions || typeof S.flags.realBridgeSuggestions !== "object") S.flags.realBridgeSuggestions = {};
      if (S.flags.realBridgeSuggestions[key]) return false;
      G.revealMission(missionId);   // 스토리와 연결된 활동은 슬롯과 무관하게 열어 수락할 수 있게 함
      S.flags.realBridgeSuggestions[key] = { missionId, moment: cfg.moment, story: cfg.story };
      AU.G.save("real-bridge-queue");
      return true;
    },
    questEvent(id, phase) {
      const key = "act1-" + id + "-" + phase, cfg = this.PLACEMENTS[key];
      if (!cfg) return false;
      const added = this.queue(key, cfg.missionId);
      if (added && AU.G.ms(cfg.missionId).state === "available") {
        AU.G.toast("모험일지에 선택형 현실 활동을 추천했습니다.", "info");
      }
      return added;
    },
    acceptSuggested(key) {
      const s = this.suggestions()[key];
      if (!s || !this.activate()) return false;
      const state = AU.G.ms(s.missionId).state;
      if (state !== "available") return false;
      return AU.G.setMissionState(s.missionId, "accept");
    },
    visibleInDev() { return !/[?&]dev=1(?:&|$)/.test(location.search) || /[?&]realguide=1(?:&|$)/.test(location.search); },
    prompt(title, description, options, extra) {
      const UI = AU.UI;
      if (!UI || !UI.modalEl) return Promise.resolve("later");
      return new Promise(resolve => {
        const wrap = UI.modalEl, wasModal = UI.modal;
        const P = AU.Prologue, oldFrozen = P && P.frozen;
        UI.modal = true;
        if (P) P.frozen = true;
        wrap.classList.remove("hidden");
        wrap.innerHTML = "";
        const card = document.createElement("div");
        card.className = "panel modal restnote" + (extra && extra.cls ? " " + extra.cls : "");
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");
        card.setAttribute("aria-label", title);
        const heading = document.createElement("h3"); heading.textContent = title;
        const body = document.createElement("div"); body.className = "note";
        for (const paragraph of description.split("\\n\\n")) {
          const p = document.createElement("p");
          paragraph.split(/\*\*(.+?)\*\*/).forEach((part, i) => { if (!part) return; if (i % 2) { const em = document.createElement("b"); em.className = "rb-em"; em.textContent = part; p.append(em); } else p.append(document.createTextNode(part)); });   // **강조**: 현실 미션 이름이 눈에 띄게
          body.append(p);
        }
        if (extra && extra.blocks) { // 11-24: 게임 미션 / 현실 미션을 나란히 보여 주고, 핵심 안내는 큰 띠로 강조
          const grid = document.createElement("div"); grid.className = "rb-cards";
          for (const [kind, name, text] of extra.blocks) { const c = document.createElement("div"); c.className = "rb-card " + kind; const h = document.createElement("b"); h.textContent = name; const t = document.createElement("p"); t.textContent = text; c.append(h, t); grid.append(c); }
          body.append(grid);
        }
        if (extra && extra.item && AU.ITEMS[extra.item] && AU.UI.itemIcon) { // 아이템 그림 + 이름 + 효과 한 줄
          const it = AU.ITEMS[extra.item], row = document.createElement("div"); row.className = "rb-item";
          const txt = document.createElement("div"); const nm = document.createElement("b"); nm.textContent = it.name; const ef = document.createElement("span"); ef.textContent = it.relieve ? "피로도 " + it.relieve + " 회복 · 잡화상점 · 은화 " + it.buy : it.desc; txt.append(nm, ef);
          row.append(AU.UI.itemIcon(extra.item, 84), txt); body.append(row);
        }
        if (extra && extra.notice) { const n = document.createElement("div"); n.className = "rb-notice"; n.textContent = extra.notice; body.append(n); }
        const actions = document.createElement("div"); actions.className = "choices";
        const finish = (value) => {
          R.dismiss = null;
          wrap.classList.add("hidden"); wrap.innerHTML = "";
          UI.modal = wasModal;
          if (P) P.frozen = oldFrozen;
          AU.Input.held.clear();
          resolve(value);
        };
        for (const option of options) {
          const b = document.createElement("button"); b.type="button";
          b.className = "btn " + (option.primary ? "primary" : "");
          b.textContent = option.text;
          b.onclick = () => finish(option.value);
          actions.append(b);
        }
        R.dismiss = () => finish("cancelled");
        card.append(heading, body, actions); wrap.append(card);
        const first = actions.querySelector("button"); if(first) first.focus();
      });
    },
    async intro() {
      if (!AU.Prologue || !AU.Prologue.on) return false;
      if (!this.activate()) return false;
      const S = AU.G.S;
      if (S.flags.realBridgeIntroSeen || (AU.Prologue && AU.Prologue.replay)) return false;
      if (this.visibleInDev()) {
        await this.prompt("모험과 일상을 함께 이어나가 보세요",
          "게임 속 이야기를 따라가며 일상 속 작은 미션을 완수해 보세요.\\n\\n모험의 발걸음을 이어가다 보면, 나의 하루도 한 걸음씩 돌아보게 되는 성장형 RPG예요.",
          [{text:"시작하기",value:"start",primary:true}], { cls: "rb-intro" });
      }
      if (!AU.Prologue || !AU.Prologue.on) return false;
      S.flags.realBridgeIntroSeen = true;
      AU.G.save("real-bridge-intro");
      return true;
    },
    async offer(key, missionId) {
      if (!AU.Prologue || !AU.Prologue.on) return "inactive";
      if (!this.activate()) return "later";
      const S = AU.G.S, P = AU.Prologue;
      if (P && P.replay) return "replay";
      if (!S.flags.realBridgeOffers || typeof S.flags.realBridgeOffers !== "object") S.flags.realBridgeOffers = {};
      if (S.flags.realBridgeOffers[key]) return "seen";
      const m = AU.G.mission(missionId);
      if (!m) return "missing";
      this.queue(key, missionId);
      AU.G.revealMission(missionId);   // 제안을 보여주는 활동은 슬롯과 무관하게 열어 둠
      let answer = "later";
      if (this.visibleInDev()) {
        answer = await this.prompt("메인 퀘스트와 함께하는 현실 활동",
          (this.PLACEMENTS[key] ? this.PLACEMENTS[key].story : "메인 스토리 퀘스트를 시작했습니다.") + "\n\n함께 해볼 수 있는 선택형 현실 미션: **" + m.title + " (약 " + m.minutes + "분)** " + m.desc + "\n\n현실 미션을 하지 않아도 메인 스토리는 그대로 진행됩니다.",
          [{text:"현실 미션도 수락",value:"accept",primary:true},{text:"게임만 진행하기",value:"later"}]);
      }
      if (answer === "accept") {
        const r = AU.G.ms(missionId);
        if (r.state === "available") AU.G.setMissionState(missionId,"accept");
      }
      S.flags.realBridgeOffers[key] = true;
      AU.G.save("real-bridge-offer");
      return answer;
    }
  };
})();
