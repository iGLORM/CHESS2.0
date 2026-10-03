import { AbsoluteFill, Series, useCurrentFrame } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Backdrop, Flash, Grade, Motes } from "../teaser/kit";
import { LiveScene } from "../teaser/live/LiveScene";
import { Music } from "../teaser/Music";
import { EndCard } from "./EndCard";
import { Head } from "./WeekKit";

// Week 1, day 2: "Every background in my game is drawn in code." The Pawn Hollow sunset,
// zoomed down to its pixels, the code that paints its sky, then all eleven worlds on the beat.

// Pawn Hollow's sky, from src/themes/scenes/pawnhollow.js (lightly trimmed to fit).
const CODE = [
  "// the sun, setting into a valley",
  "const SX = 200, SY = 103, SR = 11;",
  "",
  "for (let y = 0; y < H; y++)",
  "  for (let x = 0; x < W; x++) {",
  "    const d = Math.hypot(x - SX,",
  "                   (y - SY) * 1.25);",
  "    const t = y / 118",
  "      + 0.28 * Math.exp(-sq(d / 75));",
  "    SKY[y * W + x] = ramp(SUNSET, t);",
  "  }",
];

const WORLDS = [
  { id: "pawnhollow", name: "Pawn Hollow" },
  { id: "trainingcamp", name: "The Training Camp" },
  { id: "slantedsands", name: "The Slanted Sands" },
  { id: "ironkeep", name: "The Iron Keep" },
  { id: "mistymoors", name: "The Misty Moors" },
  { id: "royalpalace", name: "The Royal Palace" },
  { id: "clockworkcitadel", name: "The Clockwork Citadel" },
  { id: "grandlibrary", name: "The Grand Library" },
  { id: "forkedgulch", name: "Forked Gulch" },
  { id: "obsidiancourt", name: "The Obsidian Court" },
  { id: "crystal", name: "Soulbound Pixel" },
];
const BEAT = 15; // 120 BPM at 30 fps

const Hook: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="pawnhollow" t0={20} zoom={[1.12, 1.02]} dur={90} dim={0.35} />
    <Head name="Every background" top={560} size={80}>
      EVERY BACKGROUND IN MY GAME IS
    </Head>
    <Head name="Code" top={820} from={20} size={190} color="#ffcc58" shadow="0 12px 0 #5a3410, 0 0 80px #ffcc5899" pop>
      CODE.
    </Head>
    <Flash at={20} len={10} color="#ffcc58" peak={0.45} />
    <Grade />
  </AbsoluteFill>
);

// The same scene zooming into the setting sun until single pixels fill the screen.
const Zoom: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="pawnhollow" t0={23} zoom={[1, 7]} dur={110} origin="62.5% 51.5%" />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611dd 0%, #08061155 25%, transparent 38%)" }} />
    <Head name="No image files" top={290} size={78} to={62}>
      NOT ONE IMAGE FILE.
    </Head>
    <Head name="Every pixel" top={290} from={62} size={78} color="#acffdc">
      EVERY PIXEL IS MATH, 30 TIMES A SECOND.
    </Head>
    <Grade />
  </AbsoluteFill>
);

// The sky's code typing out above the scene it draws.
const Code: React.FC = () => {
  const frame = useCurrentFrame();
  const text = CODE.join("\n");
  const n = Math.floor(Math.max(0, frame - 10) * 2.6);
  const lines = text.slice(0, n).split("\n");
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #2a1450, #080611 75%)" }}>
      <Head name="The sunset" top={260} size={62} color="#ffcc58">
        THE WHOLE SUNSET:
      </Head>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 360,
          width: 960,
          height: 500,
          padding: "26px 30px",
          boxSizing: "border-box",
          background: "#120c20",
          border: "6px solid #ba85ff",
          outline: "6px solid #140c22",
          boxShadow: "12px 12px 0 #0a0612",
          fontFamily: "Menlo, Consolas, monospace",
          fontSize: 31,
          lineHeight: 1.42,
          whiteSpace: "pre",
          color: "#fff6e7",
        }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ minHeight: "1.42em", color: l.startsWith("//") ? "#8f7cb3" : "#fff6e7" }}>
            {l.replace(/(\d+(\.\d+)?)/g, "\u0000$1\u0000")
              .split("\u0000")
              .map((part, j) => (
                <span key={j} style={{ color: j % 2 && !l.startsWith("//") ? "#ffcc58" : undefined }}>
                  {part}
                </span>
              ))}
            {i === lines.length - 1 && <span style={{ background: "#acffdc", opacity: Math.floor(frame / 8) % 2 ? 1 : 0 }}> </span>}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 905,
          width: 896,
          height: 560,
          border: "6px solid #ffcc58",
          outline: "6px solid #140c22",
          boxShadow: "12px 12px 0 #0a0612, 0 0 60px #ffcc5855",
        }}
      >
        <LiveScene id="pawnhollow" t0={26} style={{ width: "100%", height: "100%" }} />
      </div>
      <Grade />
    </AbsoluteFill>
  );
};

// Eleven worlds, one per beat, under a fixed headline.
const Worlds: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Series>
      {WORLDS.map((w, i) => (
        <Series.Sequence key={w.id} durationInFrames={i === WORLDS.length - 1 ? BEAT * 2 : BEAT} name={w.name}>
          <Backdrop id={w.id} t0={15 + i * 7} zoom={[1.1, 1.02]} dur={BEAT} />
          <Head
            name="World name"
            top={1330}
            size={52}
            font="Pixelify"
            color="#fff6e7"
            style={{ translate: "0px 0px", opacity: 1, textShadow: "0 4px 0 #140c22, 0 0 24px #000" }}
          >
            {w.name}
          </Head>
          <Flash at={0} len={5} peak={0.25} />
        </Series.Sequence>
      ))}
    </Series>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611ee 0%, #08061188 20%, transparent 32%)" }} />
    <Head name="Eleven worlds" top={270} size={96} color="#ffcc58" shadow="0 8px 0 #5a3410">
      11 WORLDS.
    </Head>
    <Head name="All alive" top={390} size={64}>
      ALL DRAWN IN CODE.
    </Head>
    <Motes count={16} colors={["#ffcc58", "#72ffe0"]} />
    <Grade />
  </AbsoluteFill>
);

// Hook 90 + Zoom 120 + Code 165 + Worlds 180 + End 165, minus four 10-frame transitions = 680.
export const CODE_REEL_LEN = 680;
export const CodeReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={90} name="Hook">
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={120} name="Zoom">
        <Zoom />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={165} name="Code">
        <Code />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={180} name="Worlds">
        <Worlds />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={165} name="End card">
        <EndCard />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Music
      cues={[
        { song: "pawnhollow", from: 0, to: 11.7, fadeIn: 0.6, fadeOut: 0.5 },
        { song: "trainingcamp_120", from: 11.5, to: 17.8, fadeIn: 0.05, fadeOut: 0.5 },
        { song: "chess20", from: 17.3, to: 22.67, trim: 30, fadeIn: 0.4, fadeOut: 1.5 },
      ]}
    />
  </AbsoluteFill>
);
