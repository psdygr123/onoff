/* 게임 목록 데이터. 게임을 추가할 때는 이 배열에 항목만 더하면 됩니다.
   id는 고유하며, 게임별 저장 데이터(State.saves)의 키로도 쓰입니다. */
window.OnOff = window.OnOff || {};
OnOff.GAMES = [
  {
    id: "autelia",
    title: "아우텔리아",
    genre: "2D 횡스크롤 스토리 RPG",
    status: "dev", // dev: 개발 중, soon: 출시 예정
    statusLabel: "시제품 체험",
    summary: "판타지 세계를 탐험하며 캐릭터를 키우는 스토리형 RPG입니다. 이야기의 갈림길에서 내린 선택이 현실에서 해 보는 작은 실천으로 이어집니다.",
    audienceNote: "정신건강에 관심을 가진 성인이라면 누구나 즐길 수 있습니다.",
    cover: "img/game-maeum.webp", // 이미지 교체 슬롯: 요청문의 H2 항목
    entry: "games/autelia/index.html", // 게임 파일 연결 위치 (1~10레벨 시제품, 임시 콘텐츠 포함)
    intro: {
      who: "정신건강에 관심을 가진 성인",
      purpose: "이야기를 즐기는 동안 행복과 성장에 도움이 되는 경험을 자연스럽게 쌓도록 하는 것",
      parts: [
        "판타지 세계를 탐험하는 스토리 모험",
        "이야기의 갈림길에서 나만의 선택을 해 보는 장면",
        "현실에서 해 보는 작은 실천 과제",
        "게임 안에서 나의 컨디션과 긍정 경험을 스스로 돌아보고, 변화를 살펴보는 기능"
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
  { id: "f", label: "여성" }, { id: "m", label: "남성" }
];
