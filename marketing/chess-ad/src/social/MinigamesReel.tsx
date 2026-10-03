import { AbsoluteFill, Easing, Interactive, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import { Backdrop, Flash, Grade, Motes } from "../teaser/kit";
import { Music } from "../teaser/Music";
import { KIND_COLOR, MINIGAMES } from "../teaser/data";
import { EndCard } from "./EndCard";

// Reel 2: all 18 mini-games, one per two beats of the 120 BPM Training Camp song. 25 s.

// A 16:9 clip shown whole across the middle of a 9:16 frame, over a blurred, zoomed copy.
export const VerticalClip: React.FC<{ src: string; trim: number; top?: number }> = ({ src, trim, top = 640 }) => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <AbsoluteFill style={{ filter: "blur(28px) brightness(0.45)", scale: 1.15 }}>
      <Video src={staticFile(`teaser/footage/${src}.webm`)} trimBefore={Math.round(trim * 30)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
    <div style={{ position: "absolute", left: 0, top, width: 1080, height: 608, borderTop: "6px solid #140c22", borderBottom: "6px solid #140c22", boxShadow: "0 0 80px #000" }}>
      <Video src={staticFile(`teaser/footage/${src}.webm`)} trimBefore={Math.round(trim * 30)} muted objectFit="cover" style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </div>
  </AbsoluteFill>
);

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#080611" }}>
      <Backdrop id="trainingcamp" t0={20} zoom={[1.15, 1.05]} dur={60} dim={0.5} />
      <Motes count={20} colors={["#ff5fa8", "#72ffe0", "#ffcc58"]} />
      <Interactive.Div
        name="Eighteen"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 470,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 340,
          lineHeight: 1,
          letterSpacing: -44,
          color: "#ffcc58",
          textShadow: "0 16px 0 #5a3410, 0 0 90px #ffcc5888",
          scale: interpolate(frame, [0, 12], [2, 1], {
            easing: Easing.out(Easing.back(1.6)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        18
      </Interactive.Div>
      <Interactive.Div
        name="Mini-games"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 860,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 96,
          lineHeight: 1.15,
          color: "#fff6e7",
          textShadow: "0 7px 0 #140c22",
          opacity: interpolate(frame, [10, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        MINI-GAMES
      </Interactive.Div>
      <Interactive.Div
        name="Inside chess"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1010,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 60,
          color: "#cfbbeb",
          textShadow: "0 4px 0 #140c22",
          opacity: interpolate(frame, [18, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        hidden inside one chess game
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};

const Game: React.FC<{ i: number }> = ({ i }) => {
  const frame = useCurrentFrame();
  const g = MINIGAMES[i];
  return (
    <AbsoluteFill>
      <VerticalClip src={`mini_${g.cls}`} trim={1.2 + (i % 3) * 0.5} />
      <Interactive.Div
        name="Counter"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 330,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 110,
          color: "#fff6e7",
          textShadow: "0 8px 0 #140c22",
        }}
      >
        {String(i + 1).padStart(2, "0")}
        <span style={{ color: "#fff6e777", fontSize: 70 }}> / 18</span>
      </Interactive.Div>
      <Interactive.Div
        name="Kind"
        style={{
          position: "absolute",
          left: 390,
          width: 300,
          top: 1310,
          padding: "10px 0",
          textAlign: "center",
          background: KIND_COLOR[g.kind],
          color: "#140c22",
          fontFamily: "Silkscreen",
          fontSize: 38,
          boxShadow: "6px 6px 0 #140c22",
        }}
      >
        {g.kind.toUpperCase()}
      </Interactive.Div>
      <Interactive.Div
        name="Game name"
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 1400,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 84,
          color: "#fff6e7",
          textShadow: "0 7px 0 #140c22",
          scale: interpolate(frame, [0, 8], [1.25, 1], {
            easing: Easing.out(Easing.quad),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {g.name.toUpperCase()}
      </Interactive.Div>
      <Flash at={0} len={5} peak={0.45} />
      <Grade />
    </AbsoluteFill>
  );
};

export const MinigamesReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Series>
      <Series.Sequence durationInFrames={60} name="Hook">
        <Hook />
      </Series.Sequence>
      {MINIGAMES.map((g, i) => (
        <Series.Sequence key={g.cls} durationInFrames={30} name={g.name}>
          <Game i={i} />
        </Series.Sequence>
      ))}
      <Series.Sequence durationInFrames={150} name="End card">
        <EndCard />
      </Series.Sequence>
    </Series>
    <Music
      cues={[
        { song: "trainingcamp_120", from: 0, to: 20.3, trim: 4, fadeIn: 0.05, fadeOut: 0.4 },
        { song: "chess20", from: 20, to: 25, trim: 30, fadeIn: 0.2, fadeOut: 1.5 },
      ]}
    />
  </AbsoluteFill>
);
