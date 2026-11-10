# 도구

## build_prologue_art.py — 프롤로그 정식 그림 변환
GPT가 만든 `Autelia_Prologue_Art_Pack`(원화)을 게임용으로 변환합니다. **원화는 수정하지 않고** 변환본만 `games/autelia/assets/prologue/`에 만듭니다. (원화 zip은 용량(약 80MB) 때문에 저장소에 넣지 않았습니다. 압축을 풀어 경로를 넘기세요.)

```bash
pip install pillow numpy opencv-python-headless
python3 tools/build_prologue_art.py <원화 폴더> games/autelia/assets/prologue all   # bg | ob | ch | all
```
- 배경: 높이 720 기준 변환. 분할 원화(신전 현장·마을길 평화/습격·탈출로·항구)는 겹친 구간에서 두 그림이 가장 덜 다른 세로 이음선(동적 계획법)을 찾아 합성하고, 이어 붙일 쪽의 가장자리 나무를 하늘로 지웁니다.
- 인물·소품: 마젠타(#FF00FF) 제거(몸 사이 구멍까지, 윤곽 번짐은 알파·색 보정). 신전 3상태는 같은 상자로 잘라 위치가 어긋나지 않습니다.
- 인물 시트: 시트 격자 등분이 아니라 실루엣 경계(연결 성분)로 프레임을 찾아 접지점(발) 기준 공통 캔버스로 정렬한 가로 스트립으로 저장합니다. 누운 아버지·팔 조각은 따로 저장합니다.
- `all`이면 게임이 읽는 `games/autelia/js/prologue/artmeta.js`(프레임 이름·캔버스 크기·배경 폭)도 갱신합니다. 이 파일은 직접 고치지 마세요.
- 장면별 배치 좌표(NPC·트리거·신전 위치)는 `games/autelia/js/prologue/data.js`의 `AU.PRO_LAY`에서 한곳에서 고칩니다.

## 추가 그림(2차 패키지) 변환: `build_prologue_art2.py`
```bash
python3 tools/build_prologue_art2.py <추가 원화 폴더> games/autelia/assets/prologue
```
장애물 3종·이음 골조(`ob/`), 초상화 8장(`pt/`, 512×512), 불꽃·연기 스트립(`fx/`)을 만듭니다. 마젠타 제거 도우미는 `build_prologue_art.py`를 가져다 씁니다. 불타는 신전(`temple_burn`)은 연기에 비친 마젠타 번짐을 `despill_all` 옵션으로 추가 보정합니다(`python3 tools/build_prologue_art.py <원화> <출력> ob`).
