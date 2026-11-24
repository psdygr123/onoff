/* 나만의 공간 안내(투어): 첫 일상미션 완료 직후 "알려 드릴까요?"로 제안하고, 모험일지 투어와 같은 방식으로
   화면을 어둡게 하고 실제 요소(액자·오각형·토큰·버튼)를 하나씩 밝게 비추며 설명합니다.
   - 건너뛰기·나중에·끝내기 모두 flags.firstDoneGuideSeen을 저장해 다시 자동 제안하지 않습니다.
   - 나만의 공간의 '사용법 보기'로 언제든 다시 봅니다. 엔진은 journal_tour.js의 AU.JournalTour.start를 재사용합니다. */
window.AU = window.AU || {};
(function () {
  "use strict";
  const AU = window.AU;
  const find = (sel) => document.querySelector(".window " + sel);
  const keyJ = () => { try { return AU.keyLabel(AU.Input.bindings.journal); } catch (e) { return "J"; } };
  const G = "gallery", J = "journal", REC = { jg: "real", j: "record" };

  const STEPS = () => [
    { win: G, setup: { gal: "room" }, target: () => find(".room-tabs"), title: "여기가 '나만의 공간'이에요",
      lines: () => ["방금 남긴 활동이 이 공간에 쌓이기 시작해요.", "들어갈 때는 **[Esc]** 키로 메뉴를 열고 **나만의 공간**을 누르면 돼요. 위쪽에 **내 방 · 내 기록 · 내 변화** 세 칸이 있어요."] },
    { win: G, setup: { gal: "room" }, target: () => find(".room-center"), title: "내 방: 활동이 액자로 걸려요",
      lines: () => ["최근에 한 활동이 액자로 걸려요.", "해 본 활동이 늘수록 빈 액자가 채워져요. 조금만 해 본 활동도 경험으로 남아요."] },
    { win: G, setup: { gal: "room" }, target: () => find(".room-shop-panel"), title: "내 방: 토큰으로 꾸며요",
      lines: () => ["활동을 완료하면 **갤러리 토큰**을 받아요. 활동의 난이도·시간·기간에 따라 받는 양이 달라요.", "사진이나 기록으로 **인증**하면 전부 받고, 안 해도 일부는 받아요. 나중에 인증하면 나머지를 받아요.", "토큰으로 식물·등불 같은 장식을 얻어 전시할 수 있어요."] },
    { win: G, setup: { gal: "rec" }, target: () => find(".room-rec"), title: "내 기록: 영역별로 정리돼요",
      lines: () => ["한 활동이 **긍정정서(P) · 몰입(E) · 긍정적 관계(R) · 의미(M) · 성취(A)** 중 어느 영역인지에 따라 나뉘어 쌓여요.", "인증하지 않은 활동에는 **인증하기** 버튼이 있어요. 지금 눌러도, 나중에 눌러도 돼요."] },
    { win: G, setup: { gal: "change" }, target: () => find(".mrad") || find(".mindbox"), title: "내 변화: 오각형으로 봐요",
      lines: () => ["**실선**은 이번 주, **점선**은 지난주예요. 안쪽 색이 옅어서 두 모양이 겹쳐도 변화가 보여요.", "게임 속 활동 점수일 뿐, 행복이나 건강을 재는 검사 점수는 아니에요. 전투에도 영향을 주지 않아요."] },
    { win: J, setup: REC, target: () => find(".roomlink"), title: "모험일지에서도 바로 가요",
      lines: () => ["**모험일지[" + keyJ() + "] → 일상 활동 → 마음 기록** 맨 위에 **내 방** 바로가기가 있어요.", "내 방 · 내 기록 · 내 변화를 한 번에 열 수 있어요."] },
    { win: J, setup: REC, target: () => find(".roomlink"), title: "마지막으로 기억할 것",
      lines: () => ["활동은 선택이에요. 안 해도 불이익이 없어요.", "한 번 완료한 활동도 다시 기록할 수 있어요. 이때는 점수와 토큰 없이 기록만 쌓여요."] }
  ];

  const markSeen = () => { try { const F = AU.G.S.flags; if (!F.firstDoneGuideSeen) { F.firstDoneGuideSeen = true; AU.G.save("first-done-guide"); } } catch (e) { /* 저장 실패는 무시 */ } };

  const F = AU.FirstMissionGuide = {
    active: false,
    /* 투어 실행(첫 완료 제안·'사용법 보기' 공통). 끝나면 창을 닫고 게임으로 돌아갑니다. */
    async start() {
      const T = AU.JournalTour; if (!T || T.active || this.active) return "skip";
      this.active = true;
      try { const why = await T.start({ steps: STEPS(), closeAfter: true, onDone: markSeen }); markSeen(); return why; }
      finally { this.active = false; }
    },
    /* 첫 완료 직후에만 한 번 제안 */
    async maybeOffer() {
      try {
        const S = AU.G.S, RB = AU.RealBridge; if (!S || S.flags.firstDoneGuideSeen || !RB || this.active) return;
        const ans = await RB.prompt("나만의 공간을 보여 드릴까요?",
          "첫 활동이 '나만의 공간'에 기록됐어요. 보상이 어디에 쌓이는지, 마음 성장 오각형은 어떻게 보는지 알려 드릴게요.\n\n1분쯤 걸리고, 한 단계씩 천천히 알려 드릴게요.",
          [{ text: "천천히 알려 주세요", value: "tour", primary: true }, { text: "나중에", value: "later" }]);
        if (ans !== "tour") { markSeen(); return; }       // '나중에'를 고르면 자동 제안은 끝, 다시 보기는 '사용법 보기'
        await this.start();
      } catch (e) { /* 안내 실패가 기록을 막지 않음 */ }
    }
  };
})();
