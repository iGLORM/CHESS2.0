import {
  AbsoluteFill,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
import { Atmosphere } from "../Atmosphere";
export const FightBack = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "#0a0616",
        color: "#fff6e7",
        fontFamily: "Pixelify",
      }}
    >
      <Video
        objectFit="cover"
        src={staticFile("footage/runner.webm")}
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          scale: interpolate(frame, [0, 179], [1.16, 1.22]),
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg,rgba(8,4,18,.9),transparent 52%,rgba(8,4,18,.9))",
        }}
      />
      <Interactive.Div
        name="Capture question"
        style={{
          position: "absolute",
          left: 105,
          top: 94,
          fontFamily: "Silkscreen",
          fontSize: 58,
          color: "#ffcca2",
          translate: interpolate(frame, [0, 12], ["-90px 0px", "0px 0px"], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        CAPTURED?
      </Interactive.Div>
      <Interactive.Div
        name="Fight back headline"
        style={{
          position: "absolute",
          left: 98,
          top: 182,
          fontFamily: "Silkscreen",
          fontSize: 135,
          letterSpacing: -6,
          textShadow: "0 8px 0 #241339",
          opacity: interpolate(frame, [8, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [8, 22], ["0px 35px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        FIGHT BACK.
      </Interactive.Div>
      <Interactive.Div
        name="Mechanic explanation"
        style={{
          position: "absolute",
          left: 110,
          bottom: 105,
          fontSize: 54,
          color: "#caffea",
          textShadow: "0 3px 8px #000",
          opacity: interpolate(frame, [25, 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Win the minigame. Save your piece.
      </Interactive.Div>
      <Atmosphere />
    </AbsoluteFill>
  );
};
