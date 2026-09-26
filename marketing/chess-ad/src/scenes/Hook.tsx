import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Caption, Punch, Shot, clamp } from "../Motion";
const ThreatArrow = () => {
  const f = useCurrentFrame();
  return (
    <svg
      viewBox="0 0 1920 1080"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: interpolate(f, [8, 16], [0, 0.9], clamp),
        pointerEvents: "none",
      }}
    >
      <defs>
        <marker
          id="threat-arrow"
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
        >
          <path d="M0,0 L5,2.5 L0,5" fill="#ffb296" />
        </marker>
      </defs>
      <path
        d="M 585 578 L 685 680"
        fill="none"
        stroke="#ffb296"
        strokeWidth="7"
        strokeDasharray="12 9"
        strokeDashoffset={-f * 2}
        markerEnd="url(#threat-arrow)"
      />
      <circle
        cx="725"
        cy="720"
        r={65 + Math.sin(f * 0.15) * 5}
        fill="none"
        stroke="#ffb296"
        strokeWidth="4"
      />
    </svg>
  );
};
const Pause = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "#10091c",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Shot
        file="threat"
        trim={48}
        zoom={1.8}
        endZoom={1.83}
        shade={0.65}
        length={24}
      />
      <div
        style={{
          position: "absolute",
          width: 2400,
          height: 300,
          background: "#a6ffdb",
          rotate: "-7deg",
          scale: interpolate(f, [0, 6], [0, 1], clamp),
        }}
      />
      <Punch color="#0d1520" size={185} top={405} align="center">
        NOT YET.
      </Punch>
    </AbsoluteFill>
  );
};
export const Hook = () => (
  <AbsoluteFill>
    <Sequence
      premountFor={12}
      durationInFrames={48}
      name="The threatened knight"
    >
      <Shot file="threat" zoom={1.2} endZoom={1.37} tilt={-2} length={48}>
        <Punch size={120} top={130}>
          ONE WRONG MOVE.
        </Punch>
        <ThreatArrow />
        <Caption top={910}>Your knight is under attack.</Caption>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={48}
      durationInFrames={24}
      name="Snap in on the danger"
    >
      <Shot
        file="threat"
        trim={35}
        zoom={1.75}
        endZoom={1.9}
        x={170}
        y={-150}
        length={24}
        shade={0.25}
      >
        <Punch color="#ffb296" size={170} top={730}>
          PIECE LOST?
        </Punch>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={72}
      durationInFrames={24}
      name="Music stop — not yet"
    >
      <Pause />
    </Sequence>
  </AbsoluteFill>
);
