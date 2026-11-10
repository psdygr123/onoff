const { open, sleep } = require('./lib.js');
(async () => { const T = await open(); const { p, ev } = T; await T.fresh(); await T.start(); await T.idle(); await ev(() => AU.Prologue.devJump(1)); await T.idle();
  await T.walk(790); await p.keyboard.press('Space'); await sleep(300); await T.dialogs(); await T.idle(); await T.walk(1045, 10, 30000); await T.until(() => AU.Prologue.st().state === 'SCENE_03_ATTACK', 40000);
  const s = await T.P(); console.log('T07 장로·어린이 대화 없이 진행:', s.st === 'SCENE_03_ATTACK', s.flags.join(','), T.errs); await T.b.close(); })();
