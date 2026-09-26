// Capture from an isolated, temporary Electron profile. Never reads the player's save.
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const root = path.resolve(__dirname, "../../..");
const output = path.resolve(__dirname, "../public");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "chess2-ad-"));
app.setPath("userData", profile);
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let win;
async function run(code) {
  return win.webContents.executeJavaScript(code, true);
}
async function record(name, seconds, crop) {
  const data = await run(`(async () => {
    const output = document.createElement('canvas'); output.width = ${crop ? 1280 : 1280}; output.height = ${crop ? 720 : 800};
    const out = output.getContext('2d'); out.imageSmoothingEnabled = false;
    let running = true;
    function draw() {
      if (${crop ? "true" : "false"} && !miniGameManager.active) { if(running) requestAnimationFrame(draw); return; }
      out.fillStyle = '#090612'; out.fillRect(0,0,output.width,output.height);
      ${
        crop
          ? `const source = document.getElementById('miniGameOverlay');
      const sx = source.width / Layout.W, sy = source.height / Layout.H;
      out.drawImage(source,miniGameManager.gameX*sx,miniGameManager.gameY*sy,miniGameManager.gameW*sx,miniGameManager.gameH*sy,0,0,1280,720);`
          : `if (typeof PixiApp !== 'undefined' && PixiApp.app) PixiApp.app.renderer.render(PixiApp.app.stage);
      for (const id of ['pixiCanvas','gameCanvas']) { const source = document.getElementById(id); if(source) out.drawImage(source,0,0,1280,800); }`
      }
      if(running) requestAnimationFrame(draw);
    }
    draw(); const stream = output.captureStream(30);
    const rec = new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:8000000});
    const chunks = []; rec.ondataavailable = e => chunks.push(e.data);
    const stopped = new Promise(resolve => rec.onstop=resolve);
    rec.start(); await new Promise(resolve=>setTimeout(resolve,${seconds * 1000})); rec.stop(); await stopped;
    running = false; stream.getTracks().forEach(track=>track.stop());
    const blob = new Blob(chunks,{type:'video/webm'});
    return await new Promise(resolve=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
  })()`);
  fs.writeFileSync(
    path.join(output, "footage", name + ".webm"),
    Buffer.from(data, "base64"),
  );
  console.log("Captured " + name);
}
app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    useContentSize: true,
    show: false,
    webPreferences: {
      partition: "ad-capture",
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) console.log("Game:", message);
  });
  try {
    await win.loadFile(path.join(root, "src/index.html"));
    for (let i = 0; i < 100; i++) {
      if (
        await run(
          "typeof currentScreen !== 'undefined' && !!currentScreen && !transition.active && typeof miniGameManager !== 'undefined'",
        )
      )
        break;
      await wait(100);
    }
    await run(
      "store.update({theme:'crystal', mode:'1v1', miniGamesEnabled:false, settings:{...store.get('settings'),audioEnabled:false,seenRulesIntro:true}}); TextureManager.preloadTheme('crystal'); switchScreen('game');",
    );
    await wait(1800);
    if (!(await run("!!GameScreen.board")))
      throw new Error("Game screen did not initialize");
    await run(`GameScreen.board=FEN.toBoard('r1bqk2r/pppp1ppp/2n2n2/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 4 4');
      GameScreen.turn='black'; GameScreen.selectedSquare={row:4,col:1};
      GameScreen.legalMoves=[{from:{row:4,col:1},to:{row:5,col:2}}];
      store.update({board:GameScreen.board,turn:'black'}); GameScreen.saveSnapshot();`);
    await wait(400);
    await record("threat", 3, false);
    await run(`store.set('miniGamesEnabled',true); miniGameManager.allGames=[{type:CheckmateRun,weight:1,needs3D:true}];
      GameScreen.playMove({from:{row:4,col:1},to:{row:5,col:2}},false);
      miniGameManager.currentGame.botControlled=true; miniGameManager.currentGame.botSkill=10;`);
    await record("defense-run", 15, true);
    console.log(
      "Defense outcome:",
      await run(
        "JSON.stringify(GameScreen.moveHistory.map(m=>({defended:m.defended,san:m.san})))",
      ),
    );
    await wait(1800);
    if (
      !(await run(
        "GameScreen.moveHistory.some(move => move.defended === true)",
      ))
    ) {
      throw new Error(
        "The defense was not won. Rerun the capture to record a real successful defense.",
      );
    }
    await record("saved-board", 3, false);
    for (const [name, type] of [
      ["lava", "LavaTilt"],
      ["cannon", "SiegeCannon"],
      ["shield", "ShieldBlock"],
      ["dodge", "UndertaleDodge"],
    ]) {
      await run(`if(miniGameManager.active)miniGameManager.hideOverlay(); miniGameManager.allGames=[{type:${type},weight:1,needs3D:true}];
        miniGameManager.startDefensiveMiniGame({attacker:{type:'rook',color:'black'},defender:{type:'knight',color:'white'},challengePlayerIsAI:true,botSkillLevel:10},()=>{});`);
      await wait(1600);
      await record(name, 6, true);
    }
    await run(`miniGameManager.hideOverlay(); const s=store.getActiveSave(); s.maxUnlockedLevel=15;s.storyLevel=10;s.stages=15;
      store.set('storyMapEvent',{stage:9}); switchScreen('worldMap');`);
    await wait(1100);
    await record("world-map", 7, false);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (win) win.destroy();
    app.quit();
  }
});
app.on("window-all-closed", () => {});
