import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { LiveScene } from "../teaser/live/LiveScene";
import { Backdrop, CharCard, Flash, Grade, Motes, shake } from "../teaser/kit";
import { Music } from "../teaser/Music";
import { EndCard } from "./EndCard";

// Reel 4: the story's setup, no spoilers. You wake with no memory; the Great Board was
// shattered by Grandmaster X; eleven worlds to win back. 25.5 s.
const Wake: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Backdrop id="pawnhollow" t0={4} zoom={[1.25, 1.05]} dur={150} origin="40% 60%" />
      <Motes count={16} colors={["#ffcc58", "#ffe9a0"]} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611cc, transparent 35%)" }} />
      <Interactive.Div
        name="Wake line"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 330,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 78,
          lineHeight: 1.2,
          color: "#fff6e7",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        YOU WAKE UP IN A VILLAGE.
      </Interactive.Div>
      <Interactive.Div
        name="Remember nothing"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 560,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 78,
          lineHeight: 1.2,
          color: "#ffcc58",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [60, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        YOU REMEMBER NOTHING.
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};

const Pawnie: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Backdrop id="pawnhollow" t0={9} zoom={[1.1, 1.05]} dur={105} dim={0.35} origin="60% 60%" />
      <CharCard
        id="pawnie"
        scale={9}
        accent="#ffcc58"
        moods={[[0, "surprised"], [45, "happy"]]}
        style={{
          left: 261,
          top: 560,
          translate: interpolate(frame, [0, 14], ["0px 700px", "0px 0px"], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Interactive.Div
        name="Pawnie bubble"
        style={{
          position: "absolute",
          left: 190,
          top: 330,
          width: 700,
          padding: "26px 0",
          textAlign: "center",
          background: "#fff3d6",
          color: "#2a1a10",
          fontFamily: "Silkscreen",
          fontSize: 60,
          border: "7px solid #2a1a10",
          boxShadow: "9px 9px 0 #0a0612",
          scale: interpolate(frame, [16, 26], [0, 1], {
            easing: Easing.out(Easing.back(2)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        YOU&apos;RE AWAKE!
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};

const GreatBoard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Backdrop id="greatboard" t0={15} zoom={[1.02, 1.15]} dur={120} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611dd, transparent 38%)" }} />
      <Interactive.Div
        name="Great Board line"
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 320,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 76,
          lineHeight: 1.2,
          color: "#fff6e7",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [6, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        ONE GREAT BOARD HELD EVERY WORLD TOGETHER.
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};

const Villain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000", translate: shake(frame, 118, 24, 34) }}>
      <Backdrop id="crystal" t0={40} zoom={[1.2, 1.05]} dur={150} dim={0.45} />
      <Motes count={22} colors={["#ba85ff", "#ff5fa8"]} />
      <CharCard
        id="grandmasterx"
        scale={9}
        accent="#ba85ff"
        moods={[[0, "cold"], [50, "contempt"], [95, "fury"]]}
        style={{ left: 261, top: 560, scale: interpolate(frame, [0, 150], [0.94, 1.06]) }}
      />
      <Interactive.Div
        name="Villain line"
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 300,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 76,
          lineHeight: 1.2,
          color: "#fff6e7",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [8, 20, 110, 118], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        UNTIL <span style={{ color: "#ba85ff" }}>GRANDMASTER X</span> SHATTERED IT.
      </Interactive.Div>
      <Interactive.Svg name="Cracks" width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: interpolate(frame, [100, 102], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <Interactive.Path
          name="Crack"
          d="M 540 900 L 470 700 L 520 520 L 430 300 M 540 900 L 700 760 L 780 560 L 1000 420 M 540 900 L 360 980 L 180 900 L 40 1060 M 540 900 L 640 1120 L 600 1340 L 760 1620 M 540 900 L 420 1180 L 260 1300 L 200 1600 M 540 900 L 820 980 L 1060 1180"
          fill="none"
          stroke="#ffffff"
          strokeWidth={9}
          strokeLinejoin="bevel"
          strokeDasharray={2400}
          strokeDashoffset={interpolate(frame, [100, 118], [2400, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      </Interactive.Svg>
      <Flash at={118} len={18} peak={1} />
      <Grade />
    </AbsoluteFill>
  );
};

const WORLD_IDS = ["trainingcamp", "slantedsands", "ironkeep", "mistymoors", "royalpalace", "clockworkcitadel", "grandlibrary", "forkedgulch", "obsidiancourt", "soulboundpixel"];

const WinBack: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0b1a2e", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          width: 3840,
          height: 1920,
          translate: interpolate(frame, [0, 165], ["-900px 0px", "-1500px 0px"]),
        }}
      >
        <LiveScene
          id="worldmap"
          t0={20}
          state={(f: number) => ({
            map: {
              fuse: 0,
              heal: Object.fromEntries(
                [["pawnhollow", 1] as [string, number]].concat(
                  WORLD_IDS.map((id, i) => [id, interpolate(f, [70 + i * 8, 110 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })]),
                ),
              ),
            },
          })}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611ee, transparent 30%, transparent 75%, #080611cc)" }} />
      <Interactive.Div
        name="Eleven worlds"
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 300,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 76,
          lineHeight: 1.2,
          color: "#fff6e7",
          textShadow: "0 6px 0 #140c22",
          opacity: interpolate(frame, [4, 16, 62, 70], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        ELEVEN WORLDS TORN APART.
      </Interactive.Div>
      <Interactive.Div
        name="Win them back"
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 300,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 96,
          lineHeight: 1.15,
          color: "#ffcc58",
          textShadow: "0 7px 0 #140c22, 0 0 60px #ffcc5866",
          opacity: interpolate(frame, [74, 86], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        WIN THEM BACK.
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};

export const StoryReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={150} name="Wake">
        <Wake />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence durationInFrames={105} name="Pawnie">
        <Pawnie />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence durationInFrames={120} name="Great Board">
        <GreatBoard />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence durationInFrames={150} name="Grandmaster X">
        <Villain />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence durationInFrames={165} name="Win them back">
        <WinBack />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence durationInFrames={150} name="End card">
        <EndCard />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Music
      cues={[
        { song: "pawnhollow", from: 0, to: 8.2, fadeIn: 1.5, fadeOut: 1 },
        { song: "greatboard", from: 7.4, to: 11.6, fadeIn: 0.8, fadeOut: 0.8 },
        { song: "crystal", from: 11, to: 15.6, trim: 8, fadeIn: 0.8, fadeOut: 0.3 },
        { song: "worldmap", from: 15.5, to: 21, trim: 4, fadeIn: 1, fadeOut: 0.8 },
        { song: "chess20", from: 20.5, to: 25.5, trim: 30, fadeIn: 0.4, fadeOut: 1.5 },
      ]}
    />
  </AbsoluteFill>
);
