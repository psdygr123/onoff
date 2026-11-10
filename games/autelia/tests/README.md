# 아우텔리아 자동 시험(Playwright)

실제 키보드 입력(방향키·Alt·Space·Enter)을 보내는 브라우저 시험입니다. **사람이 직접 하는 플레이 시험을 대신하지 않습니다.**

## 준비
```bash
cd games/autelia
python3 -m http.server 8801 &                    # 게임 서버
python3 -m http.server 8802 --directory tests/prologue &   # 플랫폼 연동(T22) 시험용 부모 페이지
npm i playwright && npx playwright install chromium
mkdir -p /tmp/shots
```
환경 변수: `GAME_URL`(기본 http://localhost:8801), `SHOTS`(스크린샷 폴더, 기본 /tmp/claude-0/shots)

## 실행
| 파일 | 내용 |
|---|---|
| `prologue/playthrough.js` | 프롤로그 처음→끝 실제 키 플레이 + 본편 진입 확인 (T01~T17). `SKIP=1`이면 모든 컷신을 Enter로 건너뛰며 같은 결과가 나오는지 확인 (T19) |
| `prologue/state_tests.js` | 장면 도중 저장·재개(T18), 기존(v1) 저장 보존·다시 보기 비파괴(T20), 컷신 중 키 잠금, 플랫폼 postMessage(T22), 창 크기(T23) |
| `prologue/profile_tests.js` | 캐릭터 설정(닉네임·모습): 신규 시작 화면, 닉네임 검사, 저장·복원, 조사 자동 선택, 여성형 그림, 제목 화면에서 변경, 기존 저장 보존 |
| `prologue/skip_tests.js` | 컷신 건너뛰기: 일반 주소(처음 하는 사람)에는 없고 '프롤로그 다시 보기'에서만 동작 |
| `prologue/obstacle_tests.js` | 폭이 넓은 장애물에 점프로 올라서서 건너기(옆으로 튕겨 나가던 충돌 버그 회귀 시험) |
| `prologue/optional_npc.js` | 선택 NPC와 대화하지 않아도 진행(T07) |
| `regression_main.js` | 본편 회귀 18항목(이동·전투·레벨·스탯·전직·저장·키 설정 등, T21) |

`playthrough.js`는 상단 `walkJ` 보조 함수가 막힌 곳에서 점프하며 이동합니다. 스크린샷은 눈으로 직접 확인해야 합니다.
