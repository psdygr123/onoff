/* 나만의 공간 안내(투어): 첫 현실미션 완료 직후 "알려 드릴까요?"로 제안하고, 모험일지 투어와 같은 방식으로
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
    { win: G, target: () => find(".room-a-heading"), title: "여기가 '나만의 공간'이에요",
      lines: () => ["방금 남긴 활동 기록이 이 공간에 쌓이기 시작해요.", "들어갈 때는 **[Esc]** 키로 메뉴를 열고 **나만의 공간**을 누르면 돼요."] },
    { win: G, target: () => find(".room-center"), title: "활동은 액자로 걸려요",
      lines: () => ["최근에 한 활동이 액자로 걸려요.", "해 본 활동이 늘수록 빈 액자가 채워져요. 조금만 해 본 활동도 경험으로 남아요."] },
    { win: G, target: () => find(".room-growth"), title: "오각형은 마음 성장을 보여줘요",
      lines: () => ["활동을 완료하면 그 활동이 속한 영역의 점수가 쌓이고, 오각형의 해당 꼭짓점이 바깥으로 넓어져요.", "영역은 **긍정정서(P) · 몰입(E) · 긍정적 관계(R) · 의미(M) · 성취(A)** 다섯 가지예요. 모양이 한쪽으로 치우쳐도 괜찮아요.", "게임 속 활동 기록일 뿐, 행복이나 건강을 재는 검사 점수는 아니에요. 전투에도 영향을 주지 않아요."] },
    { win: G, target: () => find(".room-counter-grid"), title: "토큰과 방문 기록이에요",
      lines: () => ["**갤러리 토큰**은 공간을 꾸미는 재화예요. 활동을 처음 완료할 때 +1을 받고, 사진이나 시간 기록이 없어도 똑같아요.", "'오늘 방문 기록'을 누르면 하루 한 번 토큰을 받아요."] },
    { win: G, target: () => find(".room-a-actions"), title: "공간 꾸미기는 여기서 해요",
      lines: () => ["**'공간 꾸미기'**에서 토큰으로 식물·등불 같은 장식을 얻고 전시할 수 있어요.", "이 안내는 **'사용법 보기'**로 언제든 다시 볼 수 있어요."] },
    { win: J, setup: REC, target: () => find(".mrad") || find(".mindbox"), title: "변화 추이는 '마음 기록'에서 봐요",
      lines: () => ["**모험일지[" + keyJ() + "] → 현실 활동 → 마음 기록** 탭이에요.", "**초록 면**은 지금, **회색 점선**은 이번 주를 시작할 때의 기록이에요. 영역별 '이전 → 지금'이 얼마나 달라졌는지 함께 보여 줘요.", "한 주에 올릴 수 있는 점수에는 상한이 있어서, 많이 해도 일정 점수까지만 올라요. 그래도 활동 기록은 그대로 남아요."] },
    { win: J, setup: REC, target: () => find(".mindbox"), title: "마지막으로 기억할 것",
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
