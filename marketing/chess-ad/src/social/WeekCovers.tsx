import { AbsoluteFill } from "remotion";
import { Backdrop, Grade, Motes } from "../teaser/kit";
import { LiveScene } from "../teaser/live/LiveScene";
import { PUZZLE_FEN } from "./PuzzleReel";
import { Box, FenBoard, Head, Logo } from "./WeekKit";

// Covers for the week-one reels, drawn as still frames (every Head is fully shown at frame 0
// because `from` is negative). Same 1080x1350 box rule as Covers.tsx.

export const CodeCover: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="pawnhollow" t0={23} zoom={[2.4, 2.4]} origin="62.5% 51.5%" dim={0.3} />
    <Box>
      <Head name="This is" top={90} from={-60} size={96}>
        THIS IS
      </Head>
      <Head name="Code" top={230} from={-60} size={250} color="#ffcc58" shadow="0 16px 0 #5a3410, 0 0 90px #ffcc5899">
        CODE
      </Head>
      <Head name="No images" top={560} from={-60} size={60} font="Pixelify" style={{ textShadow: "0 4px 0 #140c22, 0 0 30px #000" }}>
        not one image file
      </Head>
      <div style={{ position: "absolute", left: 140, top: 700, width: 800, height: 500, border: "8px solid #ffcc58", outline: "8px solid #140c22", boxShadow: "14px 14px 0 #0a0612" }}>
        <LiveScene id="pawnhollow" t0={26} style={{ width: "100%", height: "100%" }} />
      </div>
      <Logo top={1235} />
    </Box>
    <Grade />
  </AbsoluteFill>
);

export const PuzzleCover: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, #2a1450, #080611 75%)" }}>
    <Motes count={12} colors={["#ba85ff", "#ffcc58"]} />
    <Box>
      <Head name="Mate in one" top={50} from={-60} size={112} color="#ffcc58" shadow="0 9px 0 #5a3410">
        MATE IN ONE
      </Head>
      <Head name="Ten seconds" top={190} from={-60} size={54} font="Pixelify" color="#cfbbeb">
        White to move · 10 seconds
      </Head>
      <FenBoard fen={PUZZLE_FEN} size={880} style={{ left: 100, top: 290 }} />
      <Logo top={1225} />
    </Box>
    <Grade />
  </AbsoluteFill>
);

export const PawnieCover: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="pawnhollow" t0={40} zoom={[1.05, 1.05]} dim={0.55} />
    <Motes count={16} colors={["#ffcc58", "#ff5fa8"]} />
    <Box>
      <Head name="Gave a pawn" top={50} from={-60} size={88}>
        I GAVE A PAWN
      </Head>
      <Head name="Feelings" top={160} from={-60} size={150} color="#ff5fa8" shadow="0 12px 0 #5a1040, 0 0 80px #ff5fa888">
        FEELINGS
      </Head>
      <div style={{ position: "absolute", left: 60, top: 370, width: 450, height: 580, border: "8px solid #ffcc58", outline: "8px solid #140c22", boxShadow: "14px 14px 0 #0a0612", rotate: "-3deg" }}>
        <LiveScene id="char_pawnie" t0={5} moods={[[0, "happy"]]} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ position: "absolute", left: 570, top: 400, width: 450, height: 580, border: "8px solid #ff5b5b", outline: "8px solid #140c22", boxShadow: "14px 14px 0 #0a0612", rotate: "3deg" }}>
        <LiveScene id="char_pawnie" t0={5} moods={[[0, "scared"]]} style={{ width: "100%", height: "100%" }} />
      </div>
      <Head name="Queen hung" top={1025} from={-60} size={42} font="Pixelify" color="#acffdc" style={{ left: 20, right: 540 }}>
        you hang your queen
      </Head>
      <Head name="Knight taken" top={1025} from={-60} size={42} font="Pixelify" color="#ff5b5b" style={{ left: 540, right: 20 }}>
        you take his knight
      </Head>
      <Logo top={1225} />
    </Box>
    <Grade />
  </AbsoluteFill>
);
