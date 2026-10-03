import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { LiveScene } from "../live/LiveScene";
import { Backdrop, BODY, C, Fades, Flash, Grade, Motes, ramp, sec, TITLE } from "../kit";
import { FULL, SHORT } from "../data";
import { Wordmark } from "./TitleReveal";

// The logo and where to play.
export const Finale: React.FC<{ short?: boolean }> = ({ short }) => {
  const frame = useCurrentFrame();
  const dur = sec(short ? SHORT.finale : FULL.finale);
  const k = short ? 0.6 : 1;
  const tag = Math.round(40 * k), cta = Math.round(70 * k), url = Math.round(86 * k);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop id="chess20" t0={60} zoom={[1.04, 1.14]} dur={dur} dim={0.35} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #41206055, #080611dd 72%)" }} />
      <Motes count={30} colors={[C.gold, C.magenta, C.cyan]} />
      <div
        style={{
          position: "absolute",
          left: (1920 - 256) / 2,
          top: 60,
          width: 256,
          height: 256,
          scale: ramp(frame, 0, 16, Easing.out(Easing.back(1.8))),
          filter: "drop-shadow(0 0 40px #ffcc5888)",
        }}
      >
        <LiveScene id="app_icon" t0={8} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330 }}>
        <Wordmark from={4} size={160} stagger={1} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 540,
          textAlign: "center",
          fontFamily: BODY,
          fontSize: 58,
          color: C.soft,
          opacity: ramp(frame, tag, tag + 14),
        }}
      >
        Restore the Great Board. <span style={{ color: C.gold }}>Remember who you are.</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 660, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            padding: "22px 64px",
            background: C.mint,
            color: "#09251c",
            fontFamily: TITLE,
            fontSize: 56,
            boxShadow: "9px 9px 0 #388d73",
            scale: ramp(frame, cta, cta + 14, Easing.out(Easing.back(2.4))) * (1 + 0.025 * Math.sin(frame / 6)),
          }}
        >
          PLAY NOW
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 830,
          textAlign: "center",
          fontFamily: BODY,
          fontSize: 56,
          color: C.ink,
          textShadow: "0 4px 0 #140c22",
          opacity: ramp(frame, url, url + 12),
        }}
      >
        game.altobolt.com
      </div>
      <Flash at={0} len={14} color="#ffe9a0" peak={0.7} />
      <Grade />
      <Fades dur={dur} fadeIn={0} fadeOut={short ? 12 : 30} />
    </AbsoluteFill>
  );
};
