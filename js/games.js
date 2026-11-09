/* 게임 목록 데이터. 게임을 추가할 때는 이 배열에 항목만 더하면 됩니다.
   id는 고유하며, 게임별 저장 데이터(State.saves)의 키로도 쓰입니다. */
window.OnOff = window.OnOff || {};
OnOff.GAMES = [
  {
    id: "maeum-moheomgi",
    title: "마음 모험기 (가칭)",
    genre: "2D 횡스크롤 스토리 RPG",
    status: "dev", // dev: 개발 중, soon: 출시 예정
    statusLabel: "개발 중",
    summary: "판타지 세계를 탐험하며 캐릭터를 키우는 스토리형 RPG입니다. 모험 속에서 내린 선택이 현실에서 해 보는 작은 실천으로 이어집니다.",
    audienceNote: "불편한 감정이나 상황을 피하게 되는 일이 잦은 청년을 위해 만든 게임입니다.",
    cover: "img/game-maeum.webp", // 이미지 교체 슬롯: 요청문의 H2 항목
    entry: "games/maeum-moheomgi/index.html", // 게임 파일 연결 위치
    intro: {
      who: "불편한 감정이나 상황을 피하게 되는 경험(경험회피: 불안·긴장·어색함 같은 내적 경험을 느끼지 않으려고 상황이나 생각을 피하는 것)이 잦거나, 그런 경험을 줄여 보고 싶은 청년",
      purpose: "청년의 행복과 자기성장에 도움이 되는 경험을 게임으로 제공하는 것",
      parts: [
        "판타지 세계를 탐험하는 스토리 모험",
        "이야기 속에서 불편한 상황을 만났을 때 피할지, 마주할지 고르는 장면",
        "현실에서 해 보는 작은 실천 과제",
        "게임 안에서 스트레스와 긍정 경험(PERMA)을 스스로 점검하고 변화를 살펴보는 기능"
      ],
      partsNote: "위 구성은 개발 중인 계획이며, 일부 기능은 아직 구현되지 않았습니다."
    }
  },
  { id: "soon-1", title: "다음 게임", genre: "준비 중", status: "soon", statusLabel: "출시 예정", summary: "새로운 게임을 준비하고 있습니다. 장르와 일정은 정해지면 안내합니다.", audienceNote: "", cover: null, entry: null },
  { id: "soon-2", title: "다음 게임", genre: "준비 중", status: "soon", statusLabel: "출시 예정", summary: "새로운 게임을 준비하고 있습니다. 장르와 일정은 정해지면 안내합니다.", audienceNote: "", cover: null, entry: null }
];

OnOff.GOALS = [
  { id: "happiness", label: "행복과 긍정적 경험" },
  { id: "stress", label: "스트레스 관리" },
  { id: "growth", label: "자기성장" },
  { id: "relation", label: "대인관계" },
  { id: "self", label: "자기이해" },
  { id: "fun", label: "게임을 통한 재미와 여가" }
];
OnOff.GENDERS = [
  { id: "f", label: "여성" }, { id: "m", label: "남성" },
  { id: "o", label: "기타" }, { id: "n", label: "응답하지 않음" }
];
