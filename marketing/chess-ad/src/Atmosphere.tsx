import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const Atmosphere = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 32 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (i * 293) % 1920,
            top: (i * 167 - frame * (0.18 + (i % 4) * 0.09) + 2160) % 1080,
            width: i % 3 === 0 ? 7 : 3,
            height: i % 3 === 0 ? 7 : 3,
            background: i % 2 ? "#ba85ff" : "#72ffe0",
            opacity: 0.18 + (i % 4) * 0.08,
            boxShadow: "0 0 16px currentColor",
          }}
        />
      ))}
      <AbsoluteFill
        style={{
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.07) 3px,rgba(0,0,0,.07) 4px)",
          opacity: 0.65,
        }}
      />
      <AbsoluteFill
        style={{ boxShadow: "inset 0 0 160px 35px rgba(4,2,10,.5)" }}
      />
      <AbsoluteFill
        style={{
          background: "#e5d2ff",
          opacity: interpolate(frame, [0, 5, 10], [0.2, 0.05, 0], {
            extrapolateRight: "clamp"
          })
        }}
      />
    </AbsoluteFill>
  );
};
