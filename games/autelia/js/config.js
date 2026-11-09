/* 아우텔리아 설정값 모음.
   밸런스 수치(경험치, 스탯 효과, 자원, 미션 한도)는 모두 여기서만 바꿉니다.
   표시 [임시] = 요청서가 "임시값·밸런스 검증 전"이라고 밝힌 값, [미정] = 아직 정하지 않은 규칙(기능만 열어 둠). */
window.AU = window.AU || {};
AU.VERSION = "0.1.0-proto";

AU.CONFIG = {
  W: 1280, H: 720, GROUND: 590,

  // 이동 수치: 이전 아스텔리아 시제품(speed 180, jump 520, gravity 1400)을 그대로 이어받음
  move: { speed: 180, jump: 520, gravity: 1400, ropeSpeed: 120, accel: 1900, decel: 2600, maxFall: 900 },
  player: { spriteHeight: 150, halfW: 22, height: 118 },

  combat: {
    attackCooldown: 0.45, attackRange: 105, attackHalfHeight: 80,
    invuln: 1.0,            // 피격 후 무적 시간(초): 연속 피격 방지
    knockback: 260, basePower: 8, baseHp: 60,
    baseCrit: 3, critMult: 1.5,
    respawnDelay: 1.8, safeRegenPerSec: 0.08,
    skillGlobalCooldown: 0.35
  },

  // [임시] 다음 레벨 필요 EXP = round(base × level^exponent). 요청서 6장 제안식
  exp: { base: 100, exponent: 1.5, maxLevel: 50, killMultiplier: 1 },

  levels: {
    jobLevels: [10, 30, 50],      // 1·2·3차 전직 레벨
    autoGrowthUntil: 10,          // 이 레벨까지는 기본 능력치가 자동 성장
    freePointsPerLevel: 3,        // 11레벨 이후 레벨업마다
    freePointsOnJobChange: 3,     // 10레벨 전직 시
    capWithoutJob: 10             // 전직 전에는 10레벨에서 멈춤
  },

  // [임시] 스탯 1점당 효과. 요청서 8장 가안
  stats: {
    base: { STR: 5, VIT: 5, AGI: 5, DEX: 5, WIL: 5 },
    perPoint: { STR: { atk: 2 }, VIT: { hp: 12 }, AGI: { dodge: 0.2 }, DEX: { crit: 0.25 }, WIL: { eff: 0.2 } },
    autoGrowth: { STR: 1, VIT: 1 }, autoGrowthRotating: ["AGI", "DEX", "WIL"], // 1~9레벨 자동 성장(임시)
    maxEfficiency: 50
  },

  // [미정] 회복 방법·회복량·PSS 환산은 정하지 않음. 모든 캐릭터에 같은 기본 자원을 줌
  resource: { name: "활력", max: 100, weeklyRefresh: true, weekStartsOn: 1 },

  // [미정] 지급 기준·주간 한도는 설정으로만 관리. 값은 임시
  missions: { weeklyPointCap: 6, partialPoints: 0 },

  save: { key: "autelia.save", settingsKey: "autelia.settings", version: 1, autosaveSec: 30 }
};

// 키 동작 목록. 물리 키(KeyboardEvent.code) 기준이라 한글 입력 상태에서도 동작함
AU.ACTIONS = [
  { id: "left", label: "왼쪽 이동", code: "ArrowLeft" },
  { id: "right", label: "오른쪽 이동", code: "ArrowRight" },
  { id: "up", label: "위(사다리·밧줄·포털)", code: "ArrowUp" },
  { id: "down", label: "아래(밧줄·아래 발판)", code: "ArrowDown" },
  { id: "interact", label: "대화·상호작용", code: "Space" },
  { id: "jump", label: "점프", code: "AltLeft" },
  { id: "attack", label: "기본 공격", code: "ControlLeft" },
  { id: "skill1", label: "스킬 1", code: "Digit1" },
  { id: "skill2", label: "스킬 2", code: "Digit2" },
  { id: "skill3", label: "스킬 3", code: "Digit3" },
  { id: "inventory", label: "인벤토리", code: "KeyI" },
  { id: "equipment", label: "장비창", code: "KeyE" },
  { id: "stats", label: "스탯창", code: "KeyS" },
  { id: "worldmap", label: "월드맵", code: "KeyW" },
  { id: "quests", label: "퀘스트창", code: "KeyQ" },
  { id: "skills", label: "스킬창", code: "KeyK" },
  { id: "journal", label: "모험일지·현실 미션", code: "KeyJ" },
  { id: "keysettings", label: "키보드 설정", code: "Backslash" }
];
// 오른쪽 Alt/Ctrl, 숫자패드도 같은 동작으로 인정
AU.ALIASES = { AltLeft: ["AltRight"], ControlLeft: ["ControlRight"], Digit1: ["Numpad1"], Digit2: ["Numpad2"], Digit3: ["Numpad3"], Backslash: ["IntlYen", "IntlBackslash"] };
AU.FIXED_KEYS = { menu: "Escape" };
