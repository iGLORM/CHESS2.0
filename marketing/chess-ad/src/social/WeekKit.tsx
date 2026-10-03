import { Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ramp, shown } from "../teaser/kit";
import { Wordmark } from "../teaser/scenes/TitleReveal";

// Shared pieces for the week-one reels (Code, Puzzle, Pawnie): a headline, the 1080x1350
// cover box and logo, and a chess board drawn from a FEN with the Chess 2.0 theme's art.

// A headline that rises in at `from` and, if `to` is set, fades out there. `pop` slams it in.
export const Head: React.FC<{
  name: string;
  top: number;
  from?: number;
  to?: number;
  size?: number;
  color?: string;
  font?: "Silkscreen" | "Pixelify";
  shadow?: string;
  pop?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ name, top, from = 0, to, size = 84, color = "#fff6e7", font = "Silkscreen", shadow, pop, style, children }) => {
  const frame = useCurrentFrame();
  const o = to === undefined ? ramp(frame, from, from + 8) : shown(frame, from, to, 8);
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top,
        textAlign: "center",
        fontFamily: font,
        fontSize: size,
        lineHeight: 1.18,
        color,
        textShadow: shadow ?? (font === "Silkscreen" ? "0 7px 0 #140c22" : "0 4px 0 #140c22"),
        opacity: o,
        scale: pop ? interpolate(frame, [from, from + 10], [2.2, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) }) : undefined,
        translate: pop ? undefined : interpolate(frame, [from, from + 12], ["0px 40px", "0px 0px"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
        ...style,
      }}
    >
      {children}
    </Interactive.Div>
  );
};

// Covers keep their design in the middle 1080x1350 so 9:16, 4:5 and the 3:4 grid crop all work.
export const Box: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { height } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: (height - 1350) / 2, width: 1080, height: 1350 }}>{children}</div>;
};

export const Logo: React.FC<{ top?: number }> = ({ top = 1210 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top }}>
    <Wordmark from={-60} size={70} />
  </div>
);

const NAMES: Record<string, string> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

// The board from a FEN, White at the bottom, with file and rank letters in the corners.
export const FenBoard: React.FC<{ fen: string; size: number; style?: React.CSSProperties; dim?: number }> = ({ fen, size, style, dim = 0 }) => {
  const sq = size / 8;
  const pieces: { x: number; y: number; src: string }[] = [];
  fen
    .split(" ")[0]
    .split("/")
    .forEach((row, y) => {
      let x = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) x += Number(ch);
        else {
          const color = ch === ch.toUpperCase() ? "white" : "black";
          pieces.push({ x, y, src: `social/puzzle/chess20_${color}_${NAMES[ch.toLowerCase()]}.png` });
          x++;
        }
      }
    });
  const label = { position: "absolute", fontFamily: "Pixelify", fontSize: sq * 0.2, opacity: 0.75 } as const;
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        border: "8px solid #ffcc58",
        outline: "8px solid #140c22",
        boxShadow: "16px 16px 0 #0a0612, 0 0 90px #ba85ff55",
        ...style,
      }}
    >
      <Img src={staticFile("social/puzzle/chess20_board.png")} style={{ position: "absolute", width: size, height: size, imageRendering: "pixelated" }} />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div style={{ ...label, left: i * sq + sq - sq * 0.2, top: size - sq * 0.27, color: i % 2 ? "#6a4a88" : "#efdfcc" }}>{"abcdefgh"[i]}</div>
          <div style={{ ...label, left: sq * 0.07, top: i * sq + sq * 0.02, color: i % 2 ? "#efdfcc" : "#6a4a88" }}>{8 - i}</div>
        </div>
      ))}
      {pieces.map((p, i) => (
        <Img
          key={i}
          src={staticFile(p.src)}
          style={{ position: "absolute", left: p.x * sq + sq * 0.06, top: p.y * sq + sq * 0.04, width: sq * 0.88, height: sq * 0.88, imageRendering: "pixelated" }}
        />
      ))}
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(8,6,17,${dim})` }} />}
    </div>
  );
};
