import { AbsoluteFill, Img, Interactive, staticFile, useVideoConfig } from "remotion";
import { Backdrop, CharCard, Grade, Motes } from "../teaser/kit";
import { MINIGAMES, WORLDS } from "../teaser/data";
import { Wordmark } from "../teaser/scenes/TitleReveal";

// Cover images for the four reels. Each design sits in a 1080x1350 box in the middle of the
// frame, so the same cover works as a 9:16 reel cover (1080x1920) and as a 4:5 feed post
// (1080x1350), and survives Instagram's 3:4 grid crop.
const Box: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { height } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: (height - 1350) / 2, width: 1080, height: 1350 }}>{children}</div>;
};

const Logo: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 1210 }}>
    <Wordmark from={-60} size={70} />
  </div>
);

export const CaptureCover: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="chess20" t0={30} zoom={[1.05, 1.05]} dim={0.55} />
    <Motes count={20} colors={["#ff5fa8", "#72ffe0"]} />
    <Box>
      <Interactive.Div
        name="Every capture"
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 70,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 100,
          color: "#fff6e7",
          textShadow: "0 8px 0 #140c22",
        }}
      >
        EVERY CAPTURE
      </Interactive.Div>
      <Img
        name="Board"
        src={staticFile("social/frames/board.png")}
        style={{ position: "absolute", left: 50, top: 250, width: 720, rotate: "-5deg", border: "8px solid #ba85ff", boxShadow: "14px 14px 0 #0a0612" }}
      />
      <Img
        name="Challenge"
        src={staticFile("social/frames/challenge.png")}
        style={{ position: "absolute", left: 310, top: 560, width: 720, rotate: "4deg", border: "8px solid #ff5b5b", boxShadow: "14px 14px 0 #0a0612, 0 0 80px #ff5b5b88" }}
      />
      <Interactive.Div
        name="Is a fight"
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: 1035,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 124,
          color: "#ff5b5b",
          textShadow: "0 10px 0 #5a1020, 0 0 60px #ff5b5b88",
        }}
      >
        IS A FIGHT.
      </Interactive.Div>
      <Logo />
    </Box>
    <Grade />
  </AbsoluteFill>
);

export const MinigamesCover: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="trainingcamp" t0={20} zoom={[1.05, 1.05]} dim={0.6} />
    <Box>
      <Interactive.Div
        name="Eighteen"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 30,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 300,
          lineHeight: 1,
          letterSpacing: -40,
          color: "#ffcc58",
          textShadow: "0 16px 0 #5a3410, 0 0 90px #ffcc5888",
        }}
      >
        18
      </Interactive.Div>
      <Interactive.Div
        name="Mini-games"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 350,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 100,
          color: "#fff6e7",
          textShadow: "0 8px 0 #140c22",
        }}
      >
        MINI-GAMES
      </Interactive.Div>
      {MINIGAMES.slice(0, 9).map((g, i) => (
        <Img
          key={g.cls}
          src={staticFile(`social/frames/mini_${g.cls}.png`)}
          style={{
            position: "absolute",
            left: 40 + (i % 3) * 340,
            top: 520 + Math.floor(i / 3) * 200,
            width: 320,
            height: 180,
            objectFit: "cover",
            border: "5px solid #ba85ff",
            boxShadow: "7px 7px 0 #0a0612",
          }}
        />
      ))}
      <Interactive.Div
        name="Inside chess"
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 1130,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 54,
          color: "#cfbbeb",
          textShadow: "0 4px 0 #140c22",
        }}
      >
        hidden inside one chess game
      </Interactive.Div>
      <Logo />
    </Box>
    <Grade />
  </AbsoluteFill>
);

export const GuardiansCover: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="obsidiancourt" t0={40} zoom={[1.05, 1.05]} dim={0.6} />
    <Motes count={16} colors={["#ff5b5b", "#ba85ff"]} />
    <Box>
      <Interactive.Div
        name="Meet the guardians"
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: 30,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 72,
          lineHeight: 1.1,
          color: "#fff6e7",
          textShadow: "0 7px 0 #140c22",
        }}
      >
        MEET THE
        <br />
        <span style={{ fontSize: 112, color: "#ff5b5b" }}>GUARDIANS</span>
      </Interactive.Div>
      {[...WORLDS.map((w) => [w.guardian, w.accent, w.moods[1]]), ["grandmasterx", "#ba85ff", "fury"]].map(([id, accent, mood], i) => (
        <CharCard
          key={id}
          id={id}
          scale={3}
          accent={accent}
          moods={[[0, mood]]}
          style={{ left: 208 + (i % 3) * 234, top: 285 + Math.floor(i / 3) * 278 }}
        />
      ))}
      <Interactive.Div
        name="Breaks the rules"
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 1130,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 54,
          color: "#ff8f8f",
          textShadow: "0 4px 0 #140c22",
        }}
      >
        each one breaks the rules of chess
      </Interactive.Div>
      <Logo />
    </Box>
    <Grade />
  </AbsoluteFill>
);

export const StoryCover: React.FC = () => (
  <AbsoluteFill style={{ background: "#080611" }}>
    <Backdrop id="pawnhollow" t0={4} zoom={[1.1, 1.1]} origin="40% 60%" />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611dd, transparent 40%, transparent 70%, #080611dd)" }} />
    <Box>
      <Interactive.Div
        name="You woke up"
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 60,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 82,
          lineHeight: 1.2,
          color: "#fff6e7",
          textShadow: "0 8px 0 #140c22",
        }}
      >
        YOU WOKE UP
        <br />
        <span style={{ color: "#ffcc58" }}>WITH NO MEMORY</span>
      </Interactive.Div>
      <CharCard id="pawnie" scale={8} accent="#ffcc58" moods={[[0, "surprised"]]} style={{ left: 292, top: 380 }} />
      <Interactive.Div
        name="Pawnie bubble"
        style={{
          position: "absolute",
          left: 90,
          top: 330,
          padding: "18px 28px",
          background: "#fff3d6",
          color: "#2a1a10",
          fontFamily: "Silkscreen",
          fontSize: 44,
          border: "6px solid #2a1a10",
          boxShadow: "8px 8px 0 #0a0612",
          rotate: "-4deg",
        }}
      >
        YOU&apos;RE AWAKE!
      </Interactive.Div>
      <Interactive.Div
        name="Restore"
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 1110,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 54,
          color: "#fff6e7",
          textShadow: "0 4px 0 #140c22",
        }}
      >
        Restore the Great Board.
      </Interactive.Div>
      <Logo />
    </Box>
    <Grade />
  </AbsoluteFill>
);
