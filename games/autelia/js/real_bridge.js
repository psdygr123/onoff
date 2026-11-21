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
    visibleInDev() { return !/[?&]dev=1(?:&|$)/.test(location.search) || /[?&]realguide=1(?:&|$)/.test(location.search); },
    prompt(title, description, options) {
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
        card.className = "panel modal restnote";
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");
        card.setAttribute("aria-label", title);
        const heading = document.createElement("h3"); heading.textContent = title;
        const body = document.createElement("p"); body.className = "note"; body.textContent = description;
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
        await this.prompt("모험과 일상을 함께 기록해 보세요",
          "아우텔리아의 메인 스토리에는 선택형 현실 활동이 함께 소개됩니다. 실제 활동은 원할 때만 진행하고, 모험일지(J)의 '현실 활동'에서 수락·시도·완료를 기록할 수 있습니다. 하지 않아도 모든 메인 스토리를 진행할 수 있습니다.",
          [{text:"조작법 알아보기",value:"next",primary:true},{text:"안내 건너뛰기",value:"skip"}]);
        if (!AU.Prologue || !AU.Prologue.on) return false;
        await this.prompt("기본 조작 안내",
          "좌우 방향키로 이동하고 Space로 NPC와 상호작용합니다. J를 누르면 모험일지가 열립니다. 안내받은 현실 활동은 언제든 모험일지에서 확인하고, '조금 해봤어요' 또는 '완료했어요'로 기록할 수 있습니다.",
          [{text:"모험 시작하기",value:"start",primary:true}]);
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
      let answer = "later";
      if (this.visibleInDev()) {
        answer = await this.prompt("메인 퀘스트와 함께하는 현실 활동",
          "게임 목표: 축제 깃발 3개를 달아 마을의 축제 준비를 돕습니다.\n\n함께 해볼 수 있는 선택형 현실 미션: " + m.title + " (약 " + m.minutes + "분). " + m.desc + "\n\n현실 미션을 하지 않아도 깃발 올리기와 이후 메인 스토리는 그대로 진행됩니다.",
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
