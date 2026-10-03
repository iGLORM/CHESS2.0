import { AbsoluteFill, useCurrentFrame } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Backdrop, Flash, Grade, Motes, shake } from "../teaser/kit";
import { Music } from "../teaser/Music";
import { EndCard } from "./EndCard";
import { FenBoard, Head } from "./WeekKit";

// Week 1, day 3: a mate-in-one with a ten-second clock, then "comment your move". The answer
// (Nf7#, a smothered mate, the only mate) is left for a pinned comment the next day.
// The position is Sergeant Square's last drill in src/engine/BossRules.js.
export const PUZZLE_FEN = "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1";
const CLOCK = 300; // ten seconds

const Hook: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="trainingcamp" t0={40} zoom={[1.15, 1.04]} dur={75} dim={0.55} />
    <Motes count={18} colors={["#ffcc58", "#72ffe0"]} />
    <Head name="Only 1 move" top={520} size={78}>
      ONLY ONE MOVE WINS.
    </Head>
    <Head name="Ten seconds" top={760} from={18} size={150} color="#ffcc58" shadow="0 12px 0 #5a3410, 0 0 80px #ffcc5899" pop>
      10 SEC.
    </Head>
    <Head name="Go" top={1000} from={36} size={60} font="Pixelify" color="#cfbbeb">
      Can you find it?
    </Head>
    <Flash at={18} len={10} color="#ffcc58" peak={0.4} />
    <Grade />
  </AbsoluteFill>
);

const Puzzle: React.FC = () => {
  const frame = useCurrentFrame();
  const left = Math.max(0, CLOCK - frame);
  const secs = Math.ceil(left / 30);
  const urgent = secs <= 3 && left > 0;
  const pulse = urgent ? 1 + 0.08 * Math.max(0, 1 - (frame % 30) / 10) : 1;
  const done = left === 0;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, #2a1450, #080611 75%)", translate: shake(frame, CLOCK, 14, 16) }}>
      <Motes count={12} colors={["#ba85ff", "#ffcc58"]} />
      <Head name="Mate in one" top={215} size={100} color="#ffcc58" shadow="0 8px 0 #5a3410">
        MATE IN ONE
      </Head>
      <Head name="White to move" top={335} size={46} font="Pixelify" color="#cfbbeb">
        White to move
      </Head>
      <FenBoard fen={PUZZLE_FEN} size={920} style={{ left: 80, top: 420 }} dim={done ? 0.45 : 0} />
      {/* the clock: a draining bar under the board with the seconds left in it */}
      <div style={{ position: "absolute", left: 72, top: 1372, width: 936, height: 64, background: "#140c22", outline: "4px solid #140c22" }}>
        <div style={{ width: `${(left / CLOCK) * 100}%`, height: "100%", background: urgent || done ? "#ff5b5b" : "#acffdc" }} />
        {!done && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              textAlign: "center",
              fontFamily: "Silkscreen",
              fontSize: 52,
              lineHeight: "64px",
              color: "#fff6e7",
              textShadow: "0 4px 0 #140c22, 0 0 12px #140c22",
              scale: pulse,
            }}
          >
            {secs}
          </div>
        )}
      </div>
      {done && (
        <>
          <Head name="Time" top={740} from={CLOCK} size={150} color="#ff5b5b" shadow="0 12px 0 #5a1020, 0 0 80px #ff5b5b99" pop>
            TIME!
          </Head>
          <Flash at={CLOCK} len={10} color="#ff5b5b" peak={0.5} />
        </>
      )}
      <Grade />
    </AbsoluteFill>
  );
};

const Answer: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, #2a1450, #080611 75%)" }}>
    <FenBoard fen={PUZZLE_FEN} size={920} style={{ left: 80, top: 420 }} dim={0.7} />
    <Head name="Comment" top={560} size={92} color="#acffdc">
      COMMENT YOUR MOVE
    </Head>
    <Head name="Answer tomorrow" top={900} from={14} size={54} font="Pixelify">
      Answer pinned tomorrow.
    </Head>
    <Head name="Training" top={1010} from={26} size={46} font="Pixelify" color="#cfbbeb">
      30 more puzzles like this in Chess 2.0's Training mode
    </Head>
    <Grade />
  </AbsoluteFill>
);

// Hook 75 + Puzzle 330 + Answer 105 + End 165, minus three 10-frame transitions = 645.
export const PUZZLE_REEL_LEN = 645;
export const PuzzleReel: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={75} name="Hook">
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={CLOCK + 30} name="Puzzle">
        <Puzzle />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={105} name="Comment">
        <Answer />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence durationInFrames={165} name="End card">
        <EndCard />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Music
      cues={[
        { song: "trainingcamp", from: 0, to: 2.4, fadeIn: 0.1, fadeOut: 0.3 },
        { song: "chess20_tense", from: 2.2, to: 14.5, fadeIn: 0.3, fadeOut: 0.4 },
        { song: "chess20", from: 14.2, to: 21.5, trim: 30, fadeIn: 0.5, fadeOut: 1.5 },
      ]}
    />
  </AbsoluteFill>
);
