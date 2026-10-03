import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { LiveScene } from "../teaser/live/LiveScene";
import { Backdrop, Grade, Motes } from "../teaser/kit";
import { Wordmark } from "../teaser/scenes/TitleReveal";

// The last beat of every reel: logo, one line, where to play. 1080x1920, key content
// between y 300 and 1450 so TikTok's and Instagram's buttons never cover it.
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#080611" }}>
      <Backdrop id="chess20" t0={60} zoom={[1.02, 1.1]} dur={150} dim={0.4} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #41206044, #080611dd 75%)" }} />
      <Motes count={24} colors={["#ffcc58", "#ff5fa8", "#72ffe0"]} />
      <Interactive.Div
        name="App icon"
        style={{
          position: "absolute",
          left: 360,
          top: 300,
          width: 360,
          height: 360,
          filter: "drop-shadow(0 0 50px #ffcc5888)",
          scale: interpolate(frame, [0, 16], [0, 1], {
            easing: Easing.out(Easing.back(1.8)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <LiveScene id="app_icon" t0={8} style={{ width: "100%", height: "100%" }} />
      </Interactive.Div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 730 }}>
        <Wordmark from={4} size={124} stagger={1} />
      </div>
      <Interactive.Div
        name="Tagline"
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 920,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 54,
          lineHeight: 1.25,
          color: "#cfbbeb",
          textShadow: "0 4px 0 #140c22",
          opacity: interpolate(frame, [24, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Chess, with a second chance.
      </Interactive.Div>
      <Interactive.Div
        name="Play now"
        style={{
          position: "absolute",
          left: 290,
          top: 1080,
          width: 500,
          padding: "24px 0",
          textAlign: "center",
          background: "#acffdc",
          color: "#09251c",
          fontFamily: "Silkscreen",
          fontSize: 62,
          boxShadow: "10px 10px 0 #388d73",
          scale: interpolate(frame, [36, 50], [0, 1], {
            easing: Easing.out(Easing.back(2.4)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        PLAY NOW
      </Interactive.Div>
      <Interactive.Div
        name="Website"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1270,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 60,
          color: "#fff6e7",
          textShadow: "0 4px 0 #140c22",
          opacity: interpolate(frame, [48, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        game.altobolt.com
      </Interactive.Div>
      <Interactive.Div
        name="Telegram"
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1370,
          textAlign: "center",
          fontFamily: "Pixelify",
          fontSize: 44,
          color: "#72ffe0",
          textShadow: "0 4px 0 #140c22",
          opacity: interpolate(frame, [56, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Telegram: @iglorm_chess_bot
      </Interactive.Div>
      <Grade />
    </AbsoluteFill>
  );
};
