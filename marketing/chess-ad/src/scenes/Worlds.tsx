import {
  AbsoluteFill,
  CanvasImage,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Atmosphere } from "../Atmosphere";
export const Worlds = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "#0b0815",
        color: "#fff6e7",
        fontFamily: "Pixelify",
      }}
    >
      {["mistymoors", "crystal", "royalpalace"].map((world, i) => (
        <div
          key={world}
          style={{
            position: "absolute",
            left: i * 640,
            top: 0,
            width: 640,
            height: 1080,
            overflow: "hidden",
            borderRight: "3px solid #a278c94d",
            translate: `0px ${interpolate(frame, [i * 5, 25 + i * 5], [130, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px`,
          }}
        >
          <CanvasImage
            src={staticFile(`art/${world}.png`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              scale: interpolate(frame, [0, 179], [1.15, 1.03]),
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg,#090613cc,transparent 55%,#090613)",
            }}
          />
        </div>
      ))}
      <CanvasImage
        src={staticFile("art/knightsade.png")}
        style={{
          position: "absolute",
          left: 180,
          top: 370,
          width: 360,
          height: 360,
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: "drop-shadow(0 20px 32px #000)",
          translate: interpolate(frame, [0, 179], ["0px 22px", "0px -15px"]),
        }}
      />
      <CanvasImage
        src={staticFile("art/grandmasterx.png")}
        style={{
          position: "absolute",
          left: 710,
          top: 330,
          width: 500,
          height: 500,
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: "drop-shadow(0 0 55px #9663ffc0)",
          translate: interpolate(frame, [0, 179], ["0px 20px", "0px -20px"]),
        }}
      />
      <CanvasImage
        src={staticFile("art/queenie.png")}
        style={{
          position: "absolute",
          left: 1370,
          top: 355,
          width: 390,
          height: 390,
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: "drop-shadow(0 20px 32px #000)",
          translate: interpolate(frame, [0, 179], ["0px 15px", "0px -15px"]),
        }}
      />
      <Interactive.Div
        name="Story headline"
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 94,
          textAlign: "center",
          fontFamily: "Silkscreen",
          fontSize: 81,
          lineHeight: 1.22,
          textShadow: "0 5px 20px #000",
        }}
      >
        A SHATTERED WORLD.
        <br />
        <span style={{ color: "#acffdc" }}>YOUR NEXT MOVE.</span>
      </Interactive.Div>
      <Interactive.Div
        name="Story promise"
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          bottom: 107,
          textAlign: "center",
          fontSize: 54,
          textShadow: "0 5px 20px #000",
          opacity: interpolate(frame, [35, 55], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Face nine guardians. Restore the Great Board.
      </Interactive.Div>
      <Atmosphere />
    </AbsoluteFill>
  );
};
