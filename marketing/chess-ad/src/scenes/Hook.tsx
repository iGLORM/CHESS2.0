import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";
import { Video } from "@remotion/media";
import { Atmosphere } from "../Atmosphere";

export const Hook = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "#090612",
        color: "#fff6e7",
        fontFamily: "Pixelify",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 78% 50%,#55248966,transparent 65%)",
        }}
      />
      <Interactive.Div
        name="Chess footage"
        style={{
          position: "absolute",
          left: 790,
          top: 80,
          width: 1110,
          height: 940,
          overflow: "hidden",
          border: "2px solid #af7fd34d",
          boxShadow: "0 30px 100px #000",
          rotate: interpolate(frame, [0, 119], ["4deg", "-2deg"]),
          scale: interpolate(frame, [0, 119], [0.92, 1.04]),
        }}
      >
        <Video
          objectFit="cover"
          src={staticFile("footage/chess.webm")}
          muted
          style={{ height: "100%", width: "100%" }}
        />
      </Interactive.Div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg,#090612 30%,#090612ee 38%,transparent 66%)",
        }}
      />
      <Interactive.Div
        name="Brand"
        style={{
          position: "absolute",
          left: 110,
          top: 100,
          fontFamily: "Silkscreen",
          fontSize: 35,
          color: "#b994ec",
          letterSpacing: 3,
        }}
      >
        CHESS 2.0
      </Interactive.Div>
      <Interactive.Div
        name="Hook headline"
        style={{
          position: "absolute",
          left: 104,
          top: 262,
          fontFamily: "Silkscreen",
          fontSize: 112,
          lineHeight: 1.13,
          letterSpacing: -5,
          translate: interpolate(frame, [0, 18], ["0px 55px", "0px 0px"], {
            extrapolateRight: "clamp",
          }),
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        CHESS.
        <br />
        WITH A<br />
        <span style={{ color: "#acffdc" }}>
          SECOND
          <br />
          CHANCE.
        </span>
      </Interactive.Div>
      <Interactive.Div
        name="Opening caption"
        style={{
          position: "absolute",
          left: 112,
          top: 848,
          fontSize: 39,
          color: "#c5b9d6",
          opacity: interpolate(frame, [40, 58], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Your next move changes everything.
      </Interactive.Div>
      <Atmosphere />
    </AbsoluteFill>
  );
};
