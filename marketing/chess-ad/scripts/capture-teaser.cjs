// Records the gameplay and music for the 5-minute teaser from an isolated, temporary
// Electron profile. It never reads or writes the player's save.
//
//   npm run teaser:capture                     everything
//   npm run teaser:capture -- home,fights      only some parts (home, story, fights,
//                                              capture, minigames, map, shop, tournament, music;
//                                              music120 only the 120 BPM versions)
//   npm run teaser:capture -- fights --shots   also saves a PNG at each step, to check a part
//
// Output: public/teaser/footage/*.webm (1280x800 screens, 1280x720 mini-games) and
// public/teaser/music/*.m4a. Needs ffmpeg on the PATH.
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "../../..");
const out = path.resolve(__dirname, "../public/teaser");
const footage = path.join(out, "footage");
const music = path.join(out, "music");
const shotsDir = path.join(os.tmpdir(), "chess2-teaser-shots");
for (const dir of [footage, music]) fs.mkdirSync(dir, { recursive: true });

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const only = args.length ? new Set(args.join(",").split(",")) : null;
const want = (part) => !only || only.has(part);
const shots = process.argv.includes("--shots");

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "chess2-teaser-"));
app.setPath("userData", profile);
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let win;
const run = (code) => win.webContents.executeJavaScript(code, true);
// For statements: returns nothing, so no uncloneable value comes back.
const exec = (code) => run(`(() => { ${code}\n })(); 0`);

async function shot(name) {
  if (!shots) return;
  fs.mkdirSync(shotsDir, { recursive: true });
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(shotsDir, name + ".png"), image.toPNG());
  console.log("  shot " + path.join(shotsDir, name + ".png"));
}

// Records the game's canvases (or just the mini-game area when `crop`) to a WebM.
async function record(name, seconds, crop = false) {
  const w = 1280, h = crop ? 720 : 800;
  const data = await run(`(async () => {
    const output = document.createElement('canvas'); output.width = ${w}; output.height = ${h};
    const out = output.getContext('2d'); out.imageSmoothingEnabled = false;
    let running = true;
    function draw() {
      out.fillStyle = '#090612'; out.fillRect(0, 0, ${w}, ${h});
      ${
        crop
          ? `const source = document.getElementById('miniGameOverlay');
      const sx = source.width / Layout.W, sy = source.height / Layout.H;
      out.drawImage(source, miniGameManager.gameX*sx, miniGameManager.gameY*sy, miniGameManager.gameW*sx, miniGameManager.gameH*sy, 0, 0, ${w}, ${h});`
          : `if (typeof PixiApp !== 'undefined' && PixiApp.app) PixiApp.app.renderer.render(PixiApp.app.stage);
      for (const id of ['pixiCanvas', 'gameCanvas', 'miniGameOverlay']) {
        const source = document.getElementById(id);
        if (!source || (id === 'miniGameOverlay' && !source.classList.contains('active'))) continue;
        out.drawImage(source, 0, 0, ${w}, ${h});
      }`
      }
      if (running) requestAnimationFrame(draw);
    }
    draw();
    const stream = output.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 10000000 });
    const chunks = []; rec.ondataavailable = e => chunks.push(e.data);
    const stopped = new Promise(resolve => rec.onstop = resolve);
    rec.start(); await new Promise(resolve => setTimeout(resolve, ${seconds * 1000})); rec.stop(); await stopped;
    running = false; stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, { type: 'video/webm' });
    return await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
  })()`);
  // The browser's recording is heavy (10 Mbit/s); re-encode it small, which pixel art survives unchanged.
  const raw = path.join(profile, name + ".raw.webm");
  fs.writeFileSync(raw, Buffer.from(data, "base64"));
  compress(raw, path.join(footage, name + ".webm"));
  console.log("Captured " + name);
}

function compress(from, to) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", from, "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0",
    "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-an", to]);
}

async function waitFor(expr, ms = 8000) {
  for (let t = 0; t < ms; t += 100) {
    if (await run(`(() => { try { return !!(${expr}); } catch (e) { return false; } })()`)) return true;
    await wait(100);
  }
  return false;
}

async function go(screen, data = "undefined") {
  await exec(`switchScreen(${JSON.stringify(screen)}, ${data}, { instant: true });`);
  await waitFor(`currentScreen === screens[${JSON.stringify(screen)}] || store.get('screen') === ${JSON.stringify(screen)}`, 4000);
  await wait(1200);
}

// A save far enough along that every place is open, with the plane bought.
const SAVE = `{ storyLevel: 10, maxUnlockedLevel: 10, selectedCharacter: 'queenie', difficultyTier: 'beginner',
  completed: false, stages: 15, plane: true, items: { rewind: 2, hint: 2, remove: 1 }, bonusStars: 12,
  stars: { pawnie: 3, sergeantsquare: 3, captaincapture: 2, joystick: 3, rulekeeper: 2, senseitactic: 3, bishbosh: 3, rokee: 2, knightsade: 3 },
  missions: { slantedsands: 7, ironkeep: 7, mistymoors: 7, royalpalace: 0 }, rivals: { saltbeard: true, frostbite: true, tidewitch: true },
  keepsakes: undefined, loreSeen: { pawnhollow: true, trainingcamp: true, slantedsands: true, ironkeep: true, mistymoors: true, royalpalace: true },
  seen: { prologue: true } }`;

// Plays quiet, non-capturing moves for the player while the guardian answers.
const AUTOPLAY = `window.teaserMoves = setInterval(() => {
  const g = GameScreen;
  if (currentScreen !== GameScreen || !g.board || g.gameOver || g.aiThinking || g.turn !== g.playerColor) return;
  if (typeof miniGameManager !== 'undefined' && miniGameManager.active) return;
  const moves = LegalFilter.filterMoves(g.board, MoveGen.generateMoves(g.board, g.playerColor), g.playerColor)
    .filter(m => !g.board.grid[m.to.row][m.to.col] && !(g.lockedTiles || []).some(t => t.row === m.from.row && t.col === m.from.col));
  if (!moves.length) return;
  const centre = m => -Math.abs(3.5 - m.to.col) - Math.abs(3.5 - m.to.row) + Math.random() * 2;
  moves.sort((a, b) => centre(b) - centre(a));
  g.playMove(moves[0], false);
}, 1500);`;

async function fight(id, seconds) {
  await exec(`(() => {
    const stage = STORY_STAGES.findIndex(c => c.id === '${id}') + 1;
    const ch = STORY_STAGES[stage - 1];
    store.setActiveSave({ ...${SAVE}, storyLevel: stage, maxUnlockedLevel: stage, selectedCharacter: '${id}' });
    store.update({ selectedCharacter: '${id}', storyLevel: stage, mode: 'story' });
    ThemeManager.useStoryTheme(ch.theme);
    switchScreen('game', undefined, { instant: true });
  })()`);
  await waitFor("currentScreen === GameScreen && GameScreen.board", 6000);
  await shot(`fight_${id}_0`);
  // The guardian walks on and its rule card shows for a moment, then play starts.
  const recording = record(`fight_${id}`, seconds);
  await wait(2600);
  await exec("GameScreen._dismissRulesIntro();");
  await wait(2200);   // the guardian's rule card
  await exec("GameScreen._dismissRulesIntro();");
  await waitFor("!GameScreen.introVisible", 1500);
  await exec("if (GameScreen.introVisible) GameScreen._dismissRulesIntro();");
  await exec(AUTOPLAY);
  await wait(Math.max(0, seconds * 500 - 5000));
  await shot(`fight_${id}_1`);
  await recording;
  await exec("clearInterval(window.teaserMoves); if (miniGameManager.active) miniGameManager.hideOverlay();");
}

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1280, height: 800, useContentSize: true, show: false,
    webPreferences: { partition: "teaser-capture", backgroundThrottling: false, contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) console.log("Game:", message);
  });
  try {
    await win.loadFile(path.join(root, "src/index.html"));
    await waitFor("typeof currentScreen !== 'undefined' && !!currentScreen && typeof miniGameManager !== 'undefined'", 15000);
    await exec(`store.update({ settings: { ...store.get('settings'), audioEnabled: false, seenRulesIntro: true } });
      store.setActiveSave(${SAVE}); ThemeManager.chooseTheme('chess20'); store.saveProgress = () => {};`);
    await wait(800);

    if (want("home")) {
      await go("home");
      await shot("home");
      await record("home", 9);
    }

    if (want("story")) {
      await exec("ThemeManager.useStoryTheme('pawnhollow')");
      await go("storyScene", "{ scene: 'prologue', next: 'home' }");
      const recording = record("prologue", 16);
      await wait(5000);
      await exec("currentScreen.advance()");
      await wait(5500);
      await exec("currentScreen.advance()");
      await shot("prologue");
      await recording;
    }

    if (want("fights")) {
      const list = [["queenie", 14], ["knightsade", 14], ["castle", 14], ["bishbosh", 12], ["rokee", 12],
        ["endgamer", 12], ["forkmaster", 12], ["checkmate", 12], ["grandmasterx", 16]];
      for (const [id, seconds] of list) await fight(id, seconds);
    }

    if (want("capture")) {
      // A capture on the board, then the challenge opening over it.
      await exec(`store.update({ mode: '1v1', miniGamesEnabled: false }); ThemeManager.chooseTheme('chess20');`);
      await go("game", "{ mode: '1v1' }");
      await exec(`window.teaserLine = [[6,4,4,4],[1,3,3,3],[7,6,5,5],[1,6,2,6],[4,4,3,3]];
        window.teaserTimer = setInterval(() => { const p = teaserLine.shift(); if (!p) { clearInterval(teaserTimer); return; }
          GameScreen.playMove({ from: { row: p[0], col: p[1] }, to: { row: p[2], col: p[3] } }, false); }, 900);`);
      const recording = record("capture", 9);
      await wait(4800);
      await exec(`store.set('miniGamesEnabled', true); miniGameManager.allGames = [{ type: KnightCollapse, weight: 1, needs3D: true }];
        miniGameManager.startDefensiveMiniGame({ attacker: { type: 'pawn', color: 'white' }, defender: { type: 'pawn', color: 'black' },
          challengePlayerIsAI: true, botSkillLevel: 10 }, () => {});`);
      await wait(1500);
      await shot("capture");
      await recording;
      await exec("miniGameManager.hideOverlay()");
    }

    if (want("minigames")) {
      await exec("store.set('miniGamesEnabled', true); ThemeManager.chooseTheme('chess20');");
      await go("game", "{ mode: '1v1' }");
      const games = await run("MiniGameManager.GAMES_3D().map(t => t.name)");
      const pieces = ["knight", "rook", "bishop", "queen", "pawn"];
      for (let i = 0; i < games.length; i++) {
        const name = games[i];
        await exec(`miniGameManager.allGames = [{ type: ${name}, weight: 1, needs3D: true }];
          miniGameManager.startDefensiveMiniGame({ attacker: { type: '${pieces[(i + 1) % 5]}', color: 'black' },
            defender: { type: '${pieces[i % 5]}', color: 'white' }, challengePlayerIsAI: true, botSkillLevel: 10 }, () => {});`);
        await wait(1400);
        await shot("mini_" + name);
        await record("mini_" + name, 5, true);
        await exec("miniGameManager.hideOverlay()");
        await wait(300);
      }
    }

    if (want("map")) {
      await exec(`store.setActiveSave(${SAVE}); store.update({ mode: 'story' });`);
      await go("worldMap");
      await wait(1500);
      await shot("map");
      await record("worldmap", 10);
      // Summon the plane and fly east, then north-east (steering as the arrow keys do).
      await exec("const s = currentScreen; if (s._summon) s._summon();");
      const recording = record("plane", 12);
      await wait(1800);
      await exec("currentScreen.flight && currentScreen.flight.keys.add('right');");
      await wait(4000);
      await exec("currentScreen.flight && currentScreen.flight.keys.add('up');");
      await wait(2200);
      await shot("plane");
      await exec("currentScreen.flight && currentScreen.flight.keys.delete('up');");
      await recording;
      await exec("currentScreen.flight && currentScreen.flight.keys.clear();");
    }

    if (want("shop")) {
      await go("shop", "{ from: 'worldMap' }");
      await shot("shop");
      await record("shop", 9);
    }

    if (want("tournament")) {
      await go("tournament", "{ world: 'royalpalace' }");
      await shot("tournament");
      await record("tournament", 7);
    }

    if (want("music") || want("music120")) {
      // Each song rendered on its own (60 s), so the edit can cut and cross-fade them.
      const songs = [["pawnhollow"], ["chess20"], ["trainingcamp"], ["crystal"], ["worldmap"], ["greatboard"],
        ["slantedsands"], ["ironkeep"], ["mistymoors"], ["royalpalace"], ["clockworkcitadel"], ["grandlibrary"],
        ["forkedgulch"], ["obsidiancourt"], ["crystal", true], ["chess20", true],
        // At 120 BPM a beat is 15 frames, so the montages cut on the beat.
        ["trainingcamp", false, 120], ["crystal", true, 120]];
      for (const [id, tense, bpm] of songs) {
        if (only && only.has("music120") && !bpm) continue;
        const name = id + (tense ? "_tense" : "") + (bpm ? "_" + bpm : "");
        const wav = await run(`(async () => {
          const sampleRate = 44100, seconds = 60;
          const ctx = new OfflineAudioContext(2, sampleRate * seconds, sampleRate);
          const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
          const song = JSON.parse(JSON.stringify(Songs.get('${id}', ${!!tense}))); ${bpm ? `song.bpm = ${bpm};` : ""}
          const player = new MusicPlayer(ctx, master); player.play(song, 0); player.scheduleUntil(seconds);
          const result = await ctx.startRendering();
          const bytes = new ArrayBuffer(44 + result.length * 4), v = new DataView(bytes);
          const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
          str(0, 'RIFF'); v.setUint32(4, bytes.byteLength - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
          v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true);
          v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, result.length * 4, true);
          for (let i = 0; i < result.length; i++) for (let c = 0; c < 2; c++)
            v.setInt16(44 + (i * 2 + c) * 2, Math.max(-1, Math.min(1, result.getChannelData(c)[i])) * 32767, true);
          return await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(new Blob([bytes])); });
        })()`);
        const tmp = path.join(profile, name + ".wav");
        fs.writeFileSync(tmp, Buffer.from(wav, "base64"));
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-c:a", "aac", "-b:a", "192k", path.join(music, name + ".m4a")]);
        console.log("Rendered song " + name);
      }
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (win) win.destroy();
    fs.rmSync(profile, { recursive: true, force: true });
    app.quit();
  }
});
app.on("window-all-closed", () => {});
