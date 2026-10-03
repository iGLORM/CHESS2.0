import { AbsoluteFill, Easing, Interactive, interpolate, Sequence, useCurrentFrame } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Backdrop, Flash, Footage, Grade, Motes, shake } from "../teaser/kit";
import { Music } from "../teaser/Music";
import { EndCard } from "./EndCard";

// Reel 1: "What if every capture was a fight?" Chess, a capture, the mini-game. 18 s.
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#080611" }}>
      <Backdrop id="chess20" t0={30} zoom={[1.2, 1.05]} dur={75} dim={0.45} />
      <Motes count={20} colors={["#ff5fa8", "#72ffe0"]} />
      <Interactive.Div
        name="Hook line 1"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 520,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 92,
          lineHeight: 1.15,
          color: "#fff6e7",
          textShadow: "0 7px 0 #140c22",
          translate: interpolate(frame, [0, 12], ["0px 60px", "0px 0px"], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        WHAT IF EVERY CAPTURE WAS A
      </Interactive.Div>
      <Interactive.Div
        name="Hook fight"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 820,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 200,
          color: "#ff5b5b",
          textShadow: "0 12px 0 #5a1020, 0 0 80px #ff5b5b99",
          scale: interpolate(frame, [22, 32], [2.4, 1], {
            easing: Easing.out(Easing.back(1.6)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          opacity: interpolate(frame, [22, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        FIGHT?
      </Interactive.Div>
      <Flash at={24} len={10} color="#ff5b5b" peak={0.6} />
      <Grade />
    </AbsoluteFill>
  );
};

const Board: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #2a1450, #080611 75%)", translate: shake(frame, 81, 16, 20) }}>
      <Footage src="capture" trim={1.8} width={1000} style={{ left: 40, top: 620 }} />
      <Interactive.Div
        name="Normal chess"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 330,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 76,
          lineHeight: 1.2,
          color: "#fff6e7",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [4, 14, 76, 82], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        IT STARTS LIKE NORMAL CHESS...
      </Interactive.Div>
      <Interactive.Div
        name="Piece taken"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 330,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 76,
          lineHeight: 1.2,
          color: "#ff5b5b",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [84, 94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [84, 96], ["0px 40px", "0px 0px"], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        ...UNTIL A PIECE IS TAKEN.
      </Interactive.Div>
      <Flash at={81} len={12} color="#ff5b5b" peak={0.55} />
      <Grade />
    </AbsoluteFill>
  );
};

const Fight: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={90} name="Checkmate Run">
        <Footage src="mini_CheckmateRun" trim={0.5} cover />
      </Sequence>
      <Sequence from={90} name="Shield Wall">
        <Footage src="mini_ShieldBlock" trim={0.8} cover />
      </Sequence>
      <Flash at={90} len={6} peak={0.5} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611f2 0%, #08061199 22%, transparent 36%)" }} />
      <Interactive.Div
        name="Becomes a game"
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 280,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 70,
          lineHeight: 1.2,
          color: "#acffdc",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [4, 14, 84, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        THE CAPTURE BECOMES A MINI-GAME
      </Interactive.Div>
      <Interactive.Div
        name="Win it"
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 280,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 70,
          lineHeight: 1.2,
          color: "#ffcc58",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [94, 104], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        WIN IT. SAVE YOUR PIECE.
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};

export const CaptureReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={75} name="Hook">
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={150} name="Board">
        <Board />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={180} name="Fight">
        <Fight />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={165} name="End card">
        <EndCard />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Music
      cues={[
        { song: "chess20_tense", from: 0, to: 13.2, trim: 0, fadeIn: 0.2, fadeOut: 0.6 },
        { song: "chess20", from: 12.6, to: 18, trim: 30, fadeIn: 0.4, fadeOut: 1.5 },
      ]}
    />
  </AbsoluteFill>
);
