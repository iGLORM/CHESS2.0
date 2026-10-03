#!/usr/bin/env node
// Walks a running test copy of the game through its screens in each language,
// checks every text with scripts/i18n-audit.js and saves a screenshot of each.
//
//   CHESS2_HEADLESS=1 CHESS2_USER_DATA=/tmp/chess2-i18n npx electron . --remote-debugging-port=9345
//   node scripts/i18n-check.mjs --port 9345 --out /tmp/i18n --langs fr,de --only home,settings
//   node scripts/i18n-check.mjs --portrait ...   (phone layout, 800x1280)
//
// Never point it at the owner's own copy: it creates a story save, turns on
// Super User and plays moves. Writes <out>/report.json and <out>/<lang>/<step>.png.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => {
  if (x.startsWith('--')) a.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
const PORT = +(args.port || 9345);
const OUT = args.out || '/tmp/chess2-i18n';
const LANGS = (args.langs || 'en,fr,es,pt,it,de').split(',');
const ONLY = args.only ? new Set(String(args.only).split(',')) : null;

const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = list.find(p => p.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = {};
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
await new Promise(r => { ws.onopen = r; });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed');
  return r.result && r.result.result && r.result.result.value;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (file) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
};

if (args.portrait) {
  await send('Emulation.setDeviceMetricsOverride', { width: 450, height: 800, deviceScaleFactor: 2, mobile: true });
  await sleep(1500);
}

await evaluate(fs.readFileSync(path.join(here, 'i18n-audit.js'), 'utf8'));

// A story save with everything open, so every screen can be reached.
const SETUP = `(() => {
  store.set('superUser', true);
  if (!store.getActiveSave || !store.getActiveSave()) { CharacterSelect.chooseSlot && CharacterSelect.chooseSlot(0); }
  return true;
})()`;

const go = (name, data = {}) => `switchScreen(${JSON.stringify(name)}, ${JSON.stringify(data)}, { instant: true })`;
const key = (k) => `(store.get('screen') && window.__screens && 0, document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, code: ${JSON.stringify(k)} })))`;

// Each step: [name, javascript to get there, ms to wait].
const STEPS = [
  ['home', go('home'), 1800],
  ['playMenu', go('playMenu'), 1500],
  ['trainingHub', go('trainingHub'), 1500],
  ['settings-display', go('settings', { tab: 'display' }), 1500],
  ['settings-graphics', go('settings', { tab: 'graphics' }), 1200],
  ['settings-audio', go('settings', { tab: 'audio' }), 1200],
  ['settings-game', go('settings', { tab: 'game' }), 1200],
  ['settings-reset', `${go('settings', { tab: 'game' })}; setTimeout(() => { SettingsScreen.confirmReset = true; SettingsScreen._refresh(); }, 300)`, 1500],
  ['settings-feedback', `${go('settings', { tab: 'game' })}; setTimeout(() => SettingsScreen._openFeedback(), 300)`, 1500],
  ['howto-basics', go('howToPlay', { topic: 'basics' }), 1300],
  ['howto-captures', go('howToPlay', { topic: 'captures' }), 1200],
  ['howto-story', go('howToPlay', { topic: 'story' }), 1200],
  ['howto-training', go('howToPlay', { topic: 'training' }), 1200],
  ['howto-controls', go('howToPlay', { topic: 'controls' }), 1200],
  ['stats', go('stats'), 1500],
  ['themeSelect', go('themeSelect'), 1800],
  ['miniGamePractice', go('miniGamePractice'), 2500],
  ['botSelect', go('botSelect'), 1300],
  ['customGame', go('customGame'), 1500],
  ['modeSelect', go('modeSelect'), 1300],
  ['controls', go('controls'), 1300],
  ['credits', go('credits'), 2500],
  ['credits-later', `${go('credits')}; setTimeout(() => { if (CreditsScreen.scroll !== undefined) CreditsScreen.scroll += 900; }, 200)`, 3000],
  ['levelSelect', go('levelSelect'), 1500],
  ['puzzle', go('puzzle', { levelId: (typeof TRAINING_LEVELS !== 'undefined' ? 1 : 1) }), 2500],
  ['boardEditor', go('boardEditor'), 1800],
  ['characterSelect', go('characterSelect'), 1500],
  ['difficulty', `${go('characterSelect')}; setTimeout(() => CharacterSelect.chooseSlot(2), 300)`, 1500],
  ['worldMap', go('worldMap'), 4000],
  ['worldMissions-sands', go('worldMissions', { world: 'slantedsands' }), 3500],
  ['worldMissions-camp', go('worldMissions', { world: 'trainingcamp' }), 3500],
  ['worldMissions-library', go('worldMissions', { world: 'grandlibrary' }), 3500],
  ['tournament-palace', go('tournament', { world: 'royalpalace' }), 3000],
  ['tournament-gulch', go('tournament', { world: 'forkedgulch' }), 3000],
  ['shop-stars', go('shop', { tab: 'stars', quiet: true }), 2500],
  ['shop-coins', go('shop', { tab: 'coins', quiet: true }), 2000],
  ['shop-chars', go('shop', { tab: 'tokens', quiet: true }), 2000],
  ['shop-themes', go('shop', { tab: 'themes', quiet: true }), 2000],
  ['story-prologue', `${go('storyScene', { scene: 'prologue', next: 'home' })}; setTimeout(() => StoryScene.handleKeyDown({ key: 'Enter', code: 'Enter', preventDefault() {} }), 300)`, 4000],
  ['story-handover', `${go('storyScene', { scene: 'handover', next: 'home' })}; setTimeout(() => { for (let i = 0; i < 3; i++) StoryScene.handleKeyDown({ key: 'Enter', code: 'Enter', preventDefault() {} }); }, 300)`, 4000],
  ['classic-game', `store.set('mode', 'classic'); store.set('miniGamesEnabled', false); store.set('p1IsWhite', true); ${go('game')}`, 3000],
  ['classic-pause', `PauseMenu && (PauseMenu.open ? PauseMenu.open() : (GameScreen.paused = true))`, 1500],
  ['classic-over', `PauseMenu && PauseMenu.close && PauseMenu.close(); GameScreen.superWin()`, 3000],
  ['minigame', `${go('miniGamePractice')}; setTimeout(() => miniGameManager.startPracticeMiniGame('CheckmateRun', () => {}), 600)`, 4500],
];

fs.mkdirSync(OUT, { recursive: true });
const report = {};
await evaluate(SETUP);
for (const lang of LANGS) {
  fs.mkdirSync(path.join(OUT, lang), { recursive: true });
  await evaluate(`I18n.set(${JSON.stringify(lang)})`);
  report[lang] = {};
  for (const [name, js, wait] of STEPS) {
    if (ONLY && !ONLY.has(name)) continue;
    try {
      await evaluate(`(() => { I18n.missing.clear(); try { if (miniGameManager && miniGameManager.active && miniGameManager.forceEnd) miniGameManager.forceEnd(); } catch (_) {} ${js}; return 1; })()`);
    } catch (e) {
      report[lang][name] = { error: String(e.message).slice(0, 300) };
      continue;
    }
    await sleep(wait);
    await shot(path.join(OUT, lang, `${name}.png`));
    try {
      report[lang][name] = await evaluate('window.__i18nAudit()');
    } catch (e) {
      report[lang][name] = { error: String(e.message).slice(0, 300) };
    }
    const r = report[lang][name];
    const n = r.issues ? r.issues.length : 'ERR';
    const miss = r.missing ? r.missing.length : 0;
    console.log(`${lang} ${name.padEnd(22)} issues ${String(n).padStart(3)}  untranslated ${miss}`);
  }
}
// Issues English has too are the layout's own, not the translation's: mark them.
const same = (a, b) => a.kind === b.kind && Math.abs(a.box.x - b.box.x) < 10 && Math.abs(a.box.y - b.box.y) < 10;
let fresh = 0;
for (const lang of Object.keys(report)) {
  if (lang === 'en') continue;
  for (const [name, r] of Object.entries(report[lang])) {
    const base = (report.en && report.en[name] && report.en[name].issues) || [];
    for (const i of r.issues || []) {
      i.baseline = base.some(b => same(i, b));
      if (!i.baseline) {
        fresh++;
        console.log(`NEW ${lang} ${name}: ${i.kind} ${JSON.stringify(i.text)}${i.other ? ' <> ' + JSON.stringify(i.other) : ''} ${i.by || i.size || i.squeezed || ''}`);
      }
    }
  }
}
console.log(`${fresh} issue(s) not in English`);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log('report:', path.join(OUT, 'report.json'));
ws.close();
process.exit(0);
