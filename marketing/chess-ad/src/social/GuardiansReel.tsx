import { AbsoluteFill, Easing, Interactive, interpolate, Series, useCurrentFrame } from "remotion";
import { Backdrop, CharCard, Flash, Grade, Motes } from "../teaser/kit";
import { Music } from "../teaser/Music";
import { WORLDS } from "../teaser/data";
import { EndCard } from "./EndCard";

// Reel 3: the eight guardians and the rule each one breaks, four beats each. 23 s.
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#080611" }}>
      <Backdrop id="obsidiancourt" t0={40} zoom={[1.2, 1.05]} dur={60} dim={0.5} />
      <Motes count={20} colors={["#ff5b5b", "#ba85ff"]} />
      <Interactive.Div
        name="Eight guardians"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 560,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 110,
          lineHeight: 1.1,
          color: "#fff6e7",
          textShadow: "0 8px 0 #140c22",
          scale: interpolate(frame, [0, 12], [1.6, 1], {
            easing: Easing.out(Easing.back(1.4)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        8 GUARDIANS
      </Interactive.Div>
      <Interactive.Div
        name="Each breaks the rules"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 760,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 72,
          lineHeight: 1.2,
          color: "#ff5b5b",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [14, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        EACH ONE BREAKS THE RULES OF CHESS
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};

const Guardian: React.FC<{ n: number }> = ({ n }) => {
  const frame = useCurrentFrame();
  const w = WORLDS[n];
  return (
    <AbsoluteFill>
      <Backdrop id={w.id} t0={25 + n * 7} zoom={[1.12, 1.02]} dur={60} dim={0.25} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611dd 0%, transparent 25%, transparent 50%, #080611ee 72%)" }} />
      <Interactive.Div
        name="World name"
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 280,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 64,
          lineHeight: 1.1,
          color: "#fff6e7",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {w.name.toUpperCase()}
      </Interactive.Div>
      <CharCard
        id={w.guardian}
        scale={8}
        accent={w.accent}
        moods={[[0, w.moods[0]], [26, w.moods[1]]]}
        style={{
          left: 292,
          top: 450,
          scale: interpolate(frame, [0, 10], [0.6, 1], {
            easing: Easing.out(Easing.back(1.8)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Interactive.Div
        name="Guardian name"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1140,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 60,
          color: w.accent,
          textShadow: "0 5px 0 #140c22",
        }}
      >
        {w.guardianName.toUpperCase()}
      </Interactive.Div>
      <Interactive.Div
        name="Twist"
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 1240,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 48,
          lineHeight: 1.25,
          color: "#fff6e7",
          textShadow: "0 4px 0 #140c22",
          opacity: interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {w.line}
      </Interactive.Div>
      <Flash at={0} len={5} peak={0.4} />
      <Grade />
    </AbsoluteFill>
  );
};

export const GuardiansReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Series>
      <Series.Sequence durationInFrames={60} name="Hook">
        <Hook />
      </Series.Sequence>
      {WORLDS.map((w, n) => (
        <Series.Sequence key={w.id} durationInFrames={60} name={w.guardianName}>
          <Guardian n={n} />
        </Series.Sequence>
      ))}
      <Series.Sequence durationInFrames={150} name="End card">
        <EndCard />
      </Series.Sequence>
    </Series>
    <Music
      cues={[
        { song: "crystal_tense_120", from: 0, to: 18.3, fadeIn: 0.05, fadeOut: 0.4 },
        { song: "chess20", from: 18, to: 23, trim: 30, fadeIn: 0.2, fadeOut: 1.5 },
      ]}
    />
  </AbsoluteFill>
);
