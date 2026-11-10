/* Firebase 연결 설정 (프로젝트 onandoffdb, 데이터베이스 위치: 서울 asia-northeast3).
   - 이 값은 비밀번호가 아니라 사이트가 서버를 찾아가는 공개 주소입니다. 데이터 보호는 firestore.rules(보안 규칙)가 담당합니다.
   - enabled 를 false 로 바꾸면 서버 없이 이 탭 메모리에만 저장하는 시제품 방식으로 동작합니다.
   - 분석(Analytics)은 사용하지 않습니다. */
window.ONOFF_FIREBASE = {
  enabled: true,
  config: {
    apiKey: "AIzaSyCKKGdFseHttQJgahruJhd93vGmlIKDuSw",
    authDomain: "onandoffdb.firebaseapp.com",
    projectId: "onandoffdb",
    appId: "1:777653738105:web:b487854dce9a206f8fd2a8"
  }
};
