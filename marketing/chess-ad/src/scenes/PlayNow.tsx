import {
  AbsoluteFill,
  CanvasImage,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Burst, Shot, clamp } from "../Motion";
export const PlayNow = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "#080510",
        alignItems: "center",
        color: "#fff5dd",
        fontFamily: "Pixelify",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -400,
          top: -80,
          width: 2700,
          height: 1300,
          rotate: "-12deg",
          opacity: 0.22,
          translate: `${-f * 2}px 0px`,
        }}
      >
        {["runner", "cannon", "meteor", "lava"].map((file, i) => (
          <div
            key={file}
            style={{
              position: "absolute",
              left: i * 700,
              top: 0,
              width: 690,
              height: 1300,
              overflow: "hidden",
            }}
          >
            <Shot file={file} trim={0} zoom={1.5} endZoom={1.65} length={144} />
          </div>
        ))}
      </div>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%,#3e205966,#080510bb 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          top: -10,
          border: "2px solid #a6ffdb33",
          rotate: `${45 + f * 0.17}deg`,
          scale: interpolate(f, [0, 144], [0.8, 1.12]),
        }}
      />
      <CanvasImage
        src={staticFile("art/icon.png")}
        style={{
          position: "absolute",
          width: 170,
          height: 170,
          top: 135,
          objectFit: "contain",
          imageRendering: "pixelated",
          translate: `0px ${interpolate(f, [0, 18], [-300, 0], clamp)}px`,
          rotate: `${interpolate(f, [0, 18], [-35, 0], clamp)}deg`,
        }}
      />
      <Interactive.Div
        name="Assembling game title"
        style={{
          position: "absolute",
          top: 325,
          fontFamily: "Silkscreen",
          fontSize: 180,
          letterSpacing: -10,
          whiteSpace: "nowrap",
          textShadow: "0 10px 0 #78518d, 0 18px 0 #22152e",
          color: "#f2dbff",
        }}
      >
        {"CHESS 2.0".split("").map((letter, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              translate: `${interpolate(f, [i * 2, i * 2 + 13], [(i - 4) * 90, 0], clamp)}px ${interpolate(f, [i * 2, i * 2 + 13], [i % 2 ? -380 : 380, 0], clamp)}px`,
              rotate: `${interpolate(f, [i * 2, i * 2 + 13], [(i - 4) * 9, 0], clamp)}deg`,
              opacity: interpolate(f, [i * 2, i * 2 + 5], [0, 1], clamp),
            }}
          >
            {letter}
          </span>
        ))}
      </Interactive.Div>
      <Interactive.Div
        name="Positioning"
        style={{
          position: "absolute",
          top: 576,
          fontSize: 54,
          opacity: interpolate(f, [22, 35], [0, 1], clamp),
          translate: `0px ${interpolate(f, [22, 35], [25, 0], clamp)}px`,
        }}
      >
        Chess. With a fighting chance.
      </Interactive.Div>
      <Interactive.Div
        name="Call to action"
        style={{
          position: "absolute",
          top: 700,
          padding: "19px 48px",
          background: "#a6ffdb",
          color: "#081d18",
          fontFamily: "Silkscreen",
          fontSize: 44,
          boxShadow: "8px 8px 0 #42886f",
          overflow: "hidden",
          scale: interpolate(f, [28, 40, 46], [0.4, 1.08, 1], clamp),
          opacity: interpolate(f, [28, 35], [0, 1], clamp),
        }}
      >
        PLAY CHESS 2.0
        <div
          style={{
            position: "absolute",
            top: -100,
            width: 50,
            height: 330,
            background: "#fff8",
            rotate: "25deg",
            left: (((f - 45) * 13) % 1400) - 200,
          }}
        />
      </Interactive.Div>
      <Interactive.Div
        name="Destination"
        style={{
          position: "absolute",
          top: 835,
          fontSize: 49,
          letterSpacing: 2,
          color: "#cbd2e4",
          opacity: interpolate(f, [35, 45], [0, 1], clamp),
        }}
      >
        game.altobolt.com
      </Interactive.Div>
      <Burst color="#be96ff" />
    </AbsoluteFill>
  );
};
