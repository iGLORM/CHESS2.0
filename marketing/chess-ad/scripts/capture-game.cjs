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
    await run(`window.adMoves = [[6,4,4,4],[1,4,3,4],[7,6,5,5],[0,1,2,2],[7,5,4,2],[0,6,2,5]];
      window.adMoveTimer = setInterval(()=>{ const p=window.adMoves.shift(); if(!p){clearInterval(window.adMoveTimer);return;} GameScreen.playMove({from:{row:p[0],col:p[1]},to:{row:p[2],col:p[3]}},false); },850);`);
    await record("chess", 6, false);
    await run(
      "store.set('miniGamesEnabled',true); miniGameManager.allGames=[{type:CheckmateRun,weight:1,needs3D:true}]; miniGameManager.startDefensiveMiniGame({attacker:{type:'rook',color:'black'},defender:{type:'knight',color:'white'},challengePlayerIsAI:true,botSkillLevel:10},()=>{});",
    );
    await wait(1500);
    await record("runner", 7, true);
    await run(
      "miniGameManager.hideOverlay(); miniGameManager.allGames=[{type:MeteorStorm,weight:1,needs3D:true}]; miniGameManager.startDefensiveMiniGame({attacker:{type:'queen',color:'black'},defender:{type:'rook',color:'white'},challengePlayerIsAI:true,botSkillLevel:10},()=>{});",
    );
    await wait(1300);
    await record("meteor", 5, true);
    await run("miniGameManager.hideOverlay()");
    const wav = await run(`(async()=>{
      const sampleRate=44100, seconds=25;
      const ctx=new OfflineAudioContext(2,sampleRate*seconds,sampleRate);
      const master=ctx.createGain(); master.gain.setValueAtTime(0,0); master.gain.linearRampToValueAtTime(0.58,0.3); master.gain.setValueAtTime(0.58,23.5); master.gain.linearRampToValueAtTime(0,25); master.connect(ctx.destination);
      const song=JSON.parse(JSON.stringify(Songs.suspense(Songs.THEMES.crystal))); song.bpm=120;
      const player=new MusicPlayer(ctx,master); player.play(song,0); player.scheduleUntil(25);
      const result=await ctx.startRendering();
      const bytes=new ArrayBuffer(44+result.length*4),v=new DataView(bytes);
      const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
      str(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,result.length*4,true);
      for(let i=0;i<result.length;i++)for(let c=0;c<2;c++)v.setInt16(44+(i*2+c)*2,Math.max(-1,Math.min(1,result.getChannelData(c)[i]))*32767,true);
      return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob([bytes]));});
    })()`);
    fs.writeFileSync(
      path.join(output, "soundtrack.wav"),
      Buffer.from(wav, "base64"),
    );
    console.log("Rendered original in-game soundtrack.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (win) win.destroy();
    app.quit();
  }
});
app.on("window-all-closed", () => {});
