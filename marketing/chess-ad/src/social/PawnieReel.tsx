import { AbsoluteFill, useCurrentFrame } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Backdrop, Flash, Grade, Motes, shake } from "../teaser/kit";
import { LiveScene, MoodCue } from "../teaser/live/LiveScene";
import { Music } from "../teaser/Music";
import { EndCard } from "./EndCard";
import { VerticalClip } from "./MinigamesReel";
import { Head } from "./WeekKit";

// Week 1, day 6: "I gave a pawn feelings." Pawnie, the first opponent in Story Mode, reacting
// to chess moments with the moods of his live character scene (src/themes/scenes/char_pawnie.js).

const Pawnie: React.FC<{ moods?: MoodCue[]; t0?: number; kick?: number; scale?: number; top?: number }> = ({
  moods,
  t0 = 3,
  kick,
  scale = 10, // the 62x80 scene at 620x800
  top = 440,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - 62 * scale) / 2,
        top,
        width: 62 * scale,
        height: 80 * scale,
        border: "10px solid #ffcc58",
        outline: "10px solid #140c22",
        boxShadow: "20px 20px 0 #0a0612, 0 0 120px #ffcc5855",
        translate: kick === undefined ? undefined : shake(frame, kick, 12, 22),
      }}
    >
      <LiveScene id="char_pawnie" t0={t0} moods={moods} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

const Intro: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="pawnhollow" t0={40} zoom={[1.1, 1.02]} dur={120} dim={0.55} />
    <Motes count={16} colors={["#ffcc58", "#ff5fa8"]} />
    <Head name="Gave a pawn feelings" top={235} size={74}>
      I GAVE A PAWN FEELINGS.
    </Head>
    <Pawnie top={470} />
    <Head name="Meet Pawnie" top={1320} from={30} size={48} font="Pixelify" color="#cfbbeb">
      Meet Pawnie, your first opponent in Story Mode
    </Head>
    <Grade />
  </AbsoluteFill>
);

// One meme beat: the situation on top, Pawnie switching mood as it lands.
const Beat: React.FC<{ line: string; mood: string; color: string; bg: string }> = ({ line, mood, color, bg }) => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id={bg} t0={30} zoom={[1.06, 1.0]} dur={80} dim={0.6} />
    <Head name="Pawnie when" top={235} size={46} font="Pixelify" color="#cfbbeb">
      Pawnie when
    </Head>
    <Head name="Situation" top={300} size={line.length > 20 ? 58 : 70} color={color}>
      {line}
    </Head>
    <Pawnie moods={[[6, mood]]} t0={5} kick={6} scale={9} top={line.length > 20 ? 580 : 520} />
    <Flash at={6} len={6} peak={0.25} />
    <Grade />
  </AbsoluteFill>
);

const BEATS = [
  { line: "THE GAME STARTS", mood: "nervous", color: "#fff6e7", bg: "pawnhollow" },
  { line: "YOU HANG YOUR QUEEN", mood: "happy", color: "#acffdc", bg: "chess20" },
  { line: "YOU TAKE HIS KNIGHT", mood: "scared", color: "#ff5b5b", bg: "trainingcamp" },
  { line: "THE CAPTURE BECOMES A MINI-GAME", mood: "surprised", color: "#ffcc58", bg: "chess20" },
];

// The last beat's payoff: yes, that really happens.
const Payoff: React.FC = () => (
  <AbsoluteFill>
    <VerticalClip src="mini_CheckmateRun" trim={1} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611f2 0%, #08061199 20%, transparent 34%)" }} />
    <Head name="Yes really" top={290} size={70} color="#acffdc">
      (YES, THAT HAPPENS)
    </Head>
    <Grade />
  </AbsoluteFill>
);

// Intro 105 + 4 beats of 75 + Payoff 75 + End 165, minus six 8-frame transitions = 597.
export const PAWNIE_REEL_LEN = 597;
export const PawnieReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={105} name="Intro">
        <Intro />
      </TransitionSeries.Sequence>
      {BEATS.flatMap((b) => [
        <TransitionSeries.Transition key={`t-${b.mood}`} presentation={wipe({ direction: "from-left" })} timing={linearTiming({ durationInFrames: 8 })} />,
        <TransitionSeries.Sequence key={b.mood} durationInFrames={75} name={b.line}>
          <Beat {...b} />
        </TransitionSeries.Sequence>,
      ])}
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 8 })} />
      <TransitionSeries.Sequence durationInFrames={75} name="Payoff">
        <Payoff />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 8 })} />
      <TransitionSeries.Sequence durationInFrames={165} name="End card">
        <EndCard />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Music
      cues={[
        { song: "pawnhollow", from: 0, to: 12.4, fadeIn: 0.3, fadeOut: 0.4 },
        { song: "trainingcamp_120", from: 12.17, to: 14.6, fadeIn: 0.05, fadeOut: 0.3 },
        { song: "chess20", from: 14.2, to: 19.9, trim: 30, fadeIn: 0.4, fadeOut: 1.5 },
      ]}
    />
  </AbsoluteFill>
);
