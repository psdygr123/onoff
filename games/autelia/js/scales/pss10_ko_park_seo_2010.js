/* 한국판 지각된 스트레스 척도(PSS-10) — 문항 데이터 (코드와 분리된 데이터 파일)
   문항·지시문·응답 선택지는 원본 PDF(CMU 공개본, 박준호·서영석 2010)를 그대로 옮긴 것입니다. 단어·순서·회상기간을 바꾸지 마세요.
   바꿔야 하면 version을 새로 발급하고 기존 응답은 덮어쓰지 않습니다. file://로 열어도 동작하도록 JSON 대신 스크립트로 둡니다.
   원본 대조: tools/verify_scale_text.py (원본 PDF 경로를 인자로 주면 이 파일의 문항과 글자 단위로 비교) */
window.AU = window.AU || {};
AU.SCALES = AU.SCALES || {};
AU.SCALES.pss10_ko = {
  id: "pss10_ko_park_seo_2010_cmu",
  instrumentVersion: "pss10_ko_park_seo_2010_cmu@1",
  scoringVersion: "pss10_ko_rev4-8_park_seo_2010@1",
  title: "한국판 지각된 스트레스 척도",
  shortName: "PSS",
  itemCount: 10,
  recall: "지난 한 달",
  min: 0, max: 4,
  instruction: "이 척도는 지난 한 달 동안 어떤 감정과 생각이 들었는지 물어보는 것입니다. 각 질문에 대해 당신이 얼마나 자주 느끼거나 생각했는지를 “V” 표시해 주시기 바랍니다.",
  choices: [
    { v: 0, label: "전혀 아니다" }, { v: 1, label: "거의 아니다" }, { v: 2, label: "가끔" }, { v: 3, label: "꽤 자주" }, { v: 4, label: "매우 자주" }
  ],
  // 응답 방향 설명(원본 PDF 화살표): 0쪽 '전혀 아니다' ← → '매우 자주' 4쪽
  items: [
    { itemId: "pss10_01", n: 1, subscale: "neg", reversed: false, text: "지난 한 달 동안, 예상치 못한 일이 생겨서 기분 나빠진 적이 얼마나 있었나요?" },
    { itemId: "pss10_02", n: 2, subscale: "neg", reversed: false, text: "지난 한 달 동안, 중요한 일들을 통제할 수 없다고 느낀 적은 얼마나 있었나요?" },
    { itemId: "pss10_03", n: 3, subscale: "neg", reversed: false, text: "지난 한 달 동안, 초조하거나 스트레스가 쌓인다고 느낀 적은 얼마나 있었나요?" },
    { itemId: "pss10_04", n: 4, subscale: "pos", reversed: true, text: "지난 한 달 동안, 짜증나고 성가신 일들을 성공적으로 처리한 적이 얼마나 있었나요?" },
    { itemId: "pss10_05", n: 5, subscale: "pos", reversed: true, text: "지난 한 달 동안, 생활 속에서 일어난 중요한 변화들을 효과적으로 대처한 적이 얼마나 있었나요?" },
    { itemId: "pss10_06", n: 6, subscale: "pos", reversed: true, text: "지난 한 달 동안, 개인적인 문제를 처리하는 능력에 대해 자신감을 느낀 적은 얼마나 있었나요?" },
    { itemId: "pss10_07", n: 7, subscale: "pos", reversed: true, text: "지난 한 달 동안, 자신의 뜻대로 일이 진행된다고 느낀 적은 얼마나 있었나요?" },
    { itemId: "pss10_08", n: 8, subscale: "pos", reversed: true, text: "지난 한 달 동안, 매사를 잘 컨트롤하고 있다고 느낀 적이 얼마나 있었나요?" },
    { itemId: "pss10_09", n: 9, subscale: "neg", reversed: false, text: "지난 한 달 동안, 당신이 통제할 수 없는 범위에서 발생한 일 때문에 화가 난 적이 얼마나 있었나요?" },
    { itemId: "pss10_10", n: 10, subscale: "neg", reversed: false, text: "지난 한 달 동안, 어려운 일이 너무 많이 쌓여서 극복할 수 없다고 느낀 적이 얼마나 있었나요?" }
  ],
  source: {
    citation: "박준호, 서영석 (2010). 대학생을 대상으로 한 한국판 지각된 스트레스 척도 타당화 연구. 한국심리학회지: 일반, 29(3), 611-629. (원척도: Cohen, Kamarck, & Mermelstein, 1983)",
    sourceUrl: "https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/pdf/pss_10_korean.pdf",
    sourceFile: "PSS10_Korean_Park_Seo.pdf",
    sourceSha256: "aafb467fe21efe83a1e0d885eebb4291ec8d784b0cea1ddd58849cc10e332a9f",
    sourceYear: 2010,
    validatedSample: "한국 대학생(연구 1 N=312, 연구 2 N=368)"
  },
  scoring: {
    note: "논문 표 1 기준 최종 10문항. 긍정적 지각(역채점 R) 5문항 = 원본 PDF 4~8번, 부정적 지각 5문항 = 1·2·3·9·10번. 논문은 하위척도를 따로 쓰기를 권하며, 총점은 '부정적 지각 + 긍정적 지각의 결여'로 해석하라고 설명합니다. 점수 기준선(절단점)은 없습니다.",
    negItems: [1, 2, 3, 9, 10], posItems: [4, 5, 6, 7, 8], reverseItems: [4, 5, 6, 7, 8],
    paperPage: "611-629, 표 1(616-617쪽)과 논의(624-625쪽)"
  },
  review: {
    rightsStatus: "permission_not_recorded",           // 사용 허가 확인 전(ePROVIDE·번역자 확인 필요)
    wordingReviewStatus: "matched_to_source_pdf_2026-11-14",
    scoringReviewStatus: "verified_against_paper_table1_2026-11-14",
    notes: [
      "원본 PDF의 응답 선택지 표기('전혀 아니다/거의 아니다/가끔/꽤 자주/매우 자주')는 논문 본문의 표기('전혀 없었다/거의 없었다/가끔 있었다/꽤 자주 있었다/매우 자주 있었다')와 다름. PDF 표기를 따름.",
      "원본 PDF 지시문의 '“V” 표시'는 종이용 표현. 지시문은 원문 그대로 두고 화면 안내는 별도 문구로 구분함."
    ]
  }
};
