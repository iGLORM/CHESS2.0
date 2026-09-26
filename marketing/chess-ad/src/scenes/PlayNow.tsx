import {
  AbsoluteFill,
  CanvasImage,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Atmosphere } from "../Atmosphere";
export const PlayNow = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "#080611",
        color: "#fff6e7",
        fontFamily: "Pixelify",
        alignItems: "center",
      }}
    >
      <CanvasImage
        src={staticFile("art/crystal.png")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.65,
          scale: interpolate(frame, [110, 259], [1.04, 1.12])
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%,#41206066,transparent 65%)",
        }}
      />
      <CanvasImage
        src={staticFile("art/icon.png")}
        style={{
          position: "absolute",
          top: 102,
          width: 210,
          height: 210,
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: "drop-shadow(0 0 40px #9161a966)",
          scale: interpolate(frame, [110, 128], [0.75, 1], {
            extrapolateRight: "clamp"
          })
        }}
      />
      <Interactive.Div
        name="Game title"
        style={{
          position: "absolute",
          top: 325,
          fontFamily: "Silkscreen",
          fontSize: 170,
          letterSpacing: -9,
          color: "#f5e5ff",
          textShadow: "0 9px 0 #634b80, 0 18px 0 #271a3b",
          scale: interpolate(frame, [110, 132], [0.93, 1], {
            extrapolateRight: "clamp"
          })
        }}
      >
        CHESS 2.0
      </Interactive.Div>
      <Interactive.Div
        name="Tagline"
        style={{
          position: "absolute",
          top: 560,
          fontSize: 52,
          color: "#cfbbeb",
        }}
      >
        Every piece deserves a fighting chance.
      </Interactive.Div>
      <Interactive.Div
        name="Call to action"
        style={{
          position: "absolute",
          top: 691,
          padding: "20px 55px",
          background: "#acffdc",
          color: "#09251c",
          fontFamily: "Silkscreen",
          fontSize: 45,
          boxShadow: "8px 8px 0 #388d73",
          opacity: interpolate(frame, [130, 145], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          })
        }}
      >
        PLAY NOW
      </Interactive.Div>
      <Interactive.Div
        name="Game URL"
        style={{
          position: "absolute",
          top: 825,
          fontSize: 52,
          color: "#fff6e7",
          opacity: interpolate(frame, [135, 150], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          })
        }}
      >
        game.altobolt.com
      </Interactive.Div>
      <Atmosphere />
    </AbsoluteFill>
  );
};
