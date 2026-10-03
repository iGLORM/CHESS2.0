import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { LiveScene } from "../live/LiveScene";
import { Backdrop, BODY, C, Fades, Flash, Grade, Motes, ramp, sec, shake, TITLE } from "../kit";
import { FULL, SHORT } from "../data";

// The wordmark, the way the home screen draws it: cream letters on a stepped edge, "2.0" in gold.
export const Wordmark: React.FC<{ from: number; size?: number; stagger?: number }> = ({
  from,
  size = 190,
  stagger = 3,
}) => {
  const frame = useCurrentFrame();
  const letters = "CHESS 2.0".split("");
  return (
    <div style={{ display: "flex", justifyContent: "center", fontFamily: TITLE, fontSize: size, lineHeight: 1 }}>
      {letters.map((ch, i) => {
        const at = from + (i < 6 ? i * stagger : 6 * stagger + 6);
        const p = ramp(frame, at, at + 10, Easing.out(Easing.back(2.2)));
        const gold = i > 5;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: ch === " " ? size * 0.35 : undefined,
              color: gold ? C.gold : "#f7ecd8",
              // A dark outline, then the stepped edge below the letters.
              textShadow: [
                ...[[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(
                  ([x, y]) => `${x * size * 0.03}px ${y * size * 0.03}px 0 #140c22`,
                ),
                gold ? `0 ${size * 0.06}px 0 #b0781e` : `0 ${size * 0.06}px 0 #9b8dab`,
                gold ? `0 ${size * 0.11}px 0 #5a3410` : `0 ${size * 0.11}px 0 #3a2c50`,
                `0 ${size * 0.14}px 0 #140c22`,
                gold ? `0 0 ${size * 0.4}px #ffcc5866` : `0 0 ${size * 0.3}px #00000088`,
              ].join(", "),
              opacity: p > 0 ? 1 : 0,
              translate: `0px ${Math.round((1 - p) * -size * 1.2)}px`,
              scale: gold ? interpolate(p, [0, 1], [2.2, 1]) : 1,
              marginLeft: ch === "." ? -size * 0.12 : 0,
              marginRight: ch === "." ? -size * 0.12 : 0,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const TitleReveal: React.FC<{ short?: boolean }> = ({ short }) => {
  const frame = useCurrentFrame();
  const dur = sec(short ? SHORT.title : FULL.title);
  const k = short ? 0.45 : 1;
  const iconAt = Math.round(8 * k);
  const wordAt = Math.round(40 * k);
  const slam = wordAt + Math.round(6 * 3 * k) + 6;
  const tagAt = slam + Math.round(30 * k);
  return (
    <AbsoluteFill style={{ background: C.bg, translate: shake(frame, slam, 16, 22) }}>
      <Backdrop id="chess20" t0={30} zoom={[1.18, 1.04]} dur={dur} dim={0.25} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #2a145000, #080611cc 75%)" }} />
      <Motes count={30} colors={[C.magenta, C.cyan, C.gold]} />
      <div
        style={{
          position: "absolute",
          left: (1920 - 384) / 2,
          top: 60,
          width: 384,
          height: 384,
          scale: ramp(frame, iconAt, iconAt + 18, Easing.out(Easing.back(1.6))),
          filter: "drop-shadow(0 0 50px #ffcc5888)",
        }}
      >
        <LiveScene id="app_icon" style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470 }}>
        <Wordmark from={wordAt} stagger={short ? 1 : 3} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 720,
          textAlign: "center",
          fontFamily: BODY,
          fontSize: 60,
          color: C.soft,
          textShadow: "0 4px 0 #140c22",
          opacity: ramp(frame, tagAt, tagAt + 14),
          translate: `0px ${Math.round((1 - ramp(frame, tagAt, tagAt + 14)) * 30)}px`,
        }}
      >
        Chess, with a second chance.
      </div>
      {!short && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 830,
            textAlign: "center",
            fontFamily: TITLE,
            fontSize: 34,
            letterSpacing: 6,
            color: C.gold,
            opacity: ramp(frame, tagAt + 40, tagAt + 60),
          }}
        >
          ◆ A PIXEL CHESS ADVENTURE ◆
        </div>
      )}
      <Flash at={slam} len={14} color="#ffe9a0" />
      <Grade />
      <Fades dur={dur} fadeIn={short ? 3 : 8} fadeOut={short ? 4 : 12} />
    </AbsoluteFill>
  );
};
