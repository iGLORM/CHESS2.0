import React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
export const Shot: React.FC<{
  file: string;
  trim?: number;
  rate?: number;
  zoom?: number;
  endZoom?: number;
  x?: number;
  y?: number;
  tilt?: number;
  shade?: number;
  length?: number;
  children?: React.ReactNode;
}> = ({
  file,
  trim = 0,
  rate = 1,
  zoom = 1.12,
  endZoom = 1.2,
  x = 0,
  y = 0,
  tilt = 0,
  shade = 0.15,
  length = 48,
  children,
}) => {
  const f = useCurrentFrame();
  const entry = interpolate(f, [0, 7], [1.08, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#080510" }}>
      <AbsoluteFill
        style={{
          scale: interpolate(f, [0, length], [zoom, endZoom], clamp) * entry,
          translate: `${x + Math.exp(-f / 5) * 6 * Math.sin(f * 2)}px ${y}px`,
          rotate: `${interpolate(f, [0, length], [tilt, -tilt * 0.35], clamp)}deg`,
        }}
      >
        <Video
          src={staticFile(`footage/${file}.webm`)}
          trimBefore={trim}
          playbackRate={rate}
          muted
          objectFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg,rgba(5,3,13,${shade + 0.18}),transparent 38%,rgba(5,3,13,${shade + 0.36}))`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
export const Punch: React.FC<{
  children: string;
  color?: string;
  size?: number;
  top?: number;
  align?: "left" | "center";
  delay?: number;
}> = ({
  children,
  color = "#fff5dd",
  size = 135,
  top = 700,
  align = "left",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={children}
      style={{
        position: "absolute",
        left: 110,
        right: 110,
        top,
        fontFamily: "Silkscreen",
        fontSize: size,
        lineHeight: 1.03,
        letterSpacing: -4,
        textAlign: align,
        color,
        textShadow: "0 8px 0 #130d25,0 12px 45px #000",
        zIndex: 4,
      }}
    >
      {children.split(" ").map((word, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            marginRight: size * 0.26,
            opacity: interpolate(
              frame,
              [delay + i * 3, delay + i * 3 + 3],
              [0, 1],
              clamp,
            ),
            translate: `0px ${interpolate(frame, [delay + i * 3, delay + i * 3 + 9], [90, 0], { ...clamp, easing: Easing.out(Easing.back(1.4)) })}px`,
            scale: interpolate(
              frame,
              [delay + i * 3, delay + i * 3 + 10],
              [1.22, 1],
              clamp,
            ),
            rotate: `${interpolate(frame, [delay + i * 3, delay + i * 3 + 9], [-7, 0], clamp)}deg`,
          }}
        >
          {word}
        </span>
      ))}
    </Interactive.Div>
  );
};
export const Caption: React.FC<{
  children: React.ReactNode;
  top?: number;
  color?: string;
}> = ({ children, top = 945, color = "#d9cee6" }) => (
  <Interactive.Div
    name="Supporting caption"
    style={{
      position: "absolute",
      left: 114,
      right: 114,
      top,
      fontFamily: "Pixelify",
      fontSize: 42,
      color,
      letterSpacing: 1,
      textShadow: "0 3px 10px #000",
      zIndex: 5,
    }}
  >
    {children}
  </Interactive.Div>
);
export const Burst: React.FC<{ color?: string; cx?: number; cy?: number }> = ({
  color = "#a6ffdb",
  cx = 960,
  cy = 540,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2,
          distance = interpolate(frame, [0, 38], [30, 420 + (i % 4) * 90], {
            ...clamp,
            easing: Easing.out(Easing.cubic),
          });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx + Math.cos(angle) * distance,
              top: cy + Math.sin(angle) * distance,
              width: 5 + (i % 3) * 5,
              height: 12 + (i % 5) * 9,
              rotate: `${i * 43 + frame * 3}deg`,
              background: color,
              boxShadow: `0 0 22px ${color}`,
              opacity: interpolate(
                frame,
                [0, 4, 24, 40],
                [0, 1, 0.7, 0],
                clamp,
              ),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
export const EditTexture = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 9 }}>
      <AbsoluteFill style={{ boxShadow: "inset 0 0 180px 25px #03020a80" }} />
      <AbsoluteFill
        style={{
          opacity: 0.065,
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,#000 3px,#000 5px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1920 * (f / 960),
          height: 4,
          background: "#a6ffdb",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
export const Slash = () => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: -400,
        left: interpolate(f, [0, 9], [-1300, 2400], clamp),
        height: 1900,
        width: 150,
        rotate: "-22deg",
        background: "#a6ffdb",
        boxShadow: "40px 0 0 #9975ff",
        opacity: f < 10 ? 1 : 0,
        zIndex: 8,
      }}
    />
  );
};
export const Boss: React.FC<{
  portrait: string;
  world: string;
  name: string;
  color: string;
  direction?: number;
}> = ({ portrait, world, name, color, direction = 1 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#090513", overflow: "hidden" }}>
      <CanvasImage
        src={staticFile(`art/${world}.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale: interpolate(f, [0, 24], [1.25, 1.08]),
          translate: `${interpolate(f, [0, 24], [-direction * 90, direction * 45])}px 0px`,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          left: 560,
          top: 130,
          border: `4px solid ${color}`,
          rotate: `${f * 2}deg`,
          scale: interpolate(f, [0, 24], [0.75, 1.2]),
          opacity: 0.4,
        }}
      />
      <CanvasImage
        src={staticFile(`art/${portrait}.png`)}
        style={{
          position: "absolute",
          left: 540,
          top: 90,
          width: 840,
          height: 840,
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: `drop-shadow(0 0 65px ${color})`,
          translate: `${interpolate(f, [0, 7, 24], [direction * 800, 0, -direction * 90], clamp)}px 0px`,
          scale: interpolate(f, [0, 24], [0.8, 1.13]),
          rotate: `${interpolate(f, [0, 24], [direction * 6, -direction * 2])}deg`,
        }}
      />
      <Punch size={78} top={870} align="center" color={color}>
        {name}
      </Punch>
      <Burst color={color} />
    </AbsoluteFill>
  );
};
