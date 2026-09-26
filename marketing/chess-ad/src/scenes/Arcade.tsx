import {
  AbsoluteFill,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
import { Atmosphere } from "../Atmosphere";
export const Arcade = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "#080712",
        color: "#fff6e7",
        fontFamily: "Pixelify",
      }}
    >
      <Video
        objectFit="cover"
        src={staticFile("footage/meteor.webm")}
        muted
        style={{
          position: "absolute",
          right: -210,
          top: 0,
          width: 1770,
          height: 1080,
          scale: 1.18,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg,#080712 8%,#080712dd 25%,transparent 68%)",
        }}
      />
      <Interactive.Div
        name="Minigame count"
        style={{
          position: "absolute",
          left: 93,
          top: 108,
          fontFamily: "Silkscreen",
          fontSize: 270,
          lineHeight: 1,
          color: "#acffdc",
          letterSpacing: -18,
          scale: interpolate(frame, [0, 16], [1.2, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        18
      </Interactive.Div>
      <Interactive.Div
        name="Minigames headline"
        style={{
          position: "absolute",
          left: 109,
          top: 423,
          fontFamily: "Silkscreen",
          fontSize: 78,
          lineHeight: 1.2,
        }}
      >
        MINI-GAMES.
        <br />
        ONE MORE
        <br />
        CHANCE.
      </Interactive.Div>
      <Interactive.Div
        name="Arcade verbs"
        style={{
          position: "absolute",
          left: 112,
          top: 830,
          fontSize: 48,
          color: "#c5b9d6",
          opacity: interpolate(frame, [22, 35], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Dodge. Aim. Survive.
      </Interactive.Div>
      <Atmosphere />
    </AbsoluteFill>
  );
};
