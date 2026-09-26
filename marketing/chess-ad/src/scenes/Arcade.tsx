import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Caption, Punch, Shot, Slash, clamp } from "../Motion";
const Triptych = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#080510" }}>
      {["runner", "cannon", "meteor"].map((file, i) => (
        <div
          key={file}
          style={{
            position: "absolute",
            left: i * 650 - 15,
            top: 0,
            width: 670,
            height: 1080,
            overflow: "hidden",
            borderRight: "8px solid #090613",
            translate: `0px ${interpolate(f, [i * 2, 10 + i * 2], [i % 2 ? 1080 : -1080, 0], clamp)}px`,
          }}
        >
          <Shot
            file={file}
            trim={35}
            zoom={1.28}
            endZoom={1.42}
            length={48}
            shade={0.35}
          />
        </div>
      ))}
      <Punch size={270} top={200} align="center" color="#a6ffdb">
        18
      </Punch>
      <Punch size={95} top={545} align="center" delay={7}>
        MINI-GAMES.
      </Punch>
      <Caption top={925}>
        Your strategy. Your reflexes. Your second chance.
      </Caption>
    </AbsoluteFill>
  );
};
export const Arcade = () => (
  <AbsoluteFill>
    <Sequence premountFor={12} durationInFrames={24} name="Dodge the lava">
      <Shot
        file="lava"
        rate={1.2}
        trim={30}
        zoom={1.1}
        endZoom={1.2}
        tilt={-2}
        length={24}
      >
        <Punch>DODGE.</Punch>
        <Slash />
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={24}
      durationInFrames={24}
      name="Fire the siege cannon"
    >
      <Shot
        file="cannon"
        rate={1.2}
        trim={45}
        zoom={1.2}
        endZoom={1.08}
        length={24}
      >
        <Punch>STRIKE.</Punch>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={48}
      durationInFrames={24}
      name="Shoot the meteors"
    >
      <Shot
        file="meteor"
        rate={1.2}
        trim={42}
        zoom={1.1}
        endZoom={1.25}
        length={24}
      >
        <Punch>AIM.</Punch>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={72}
      durationInFrames={24}
      name="Block the attack"
    >
      <Shot
        file="shield"
        rate={1.2}
        trim={35}
        zoom={1.2}
        endZoom={1.1}
        tilt={2}
        length={24}
      >
        <Punch>BLOCK.</Punch>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={96}
      durationInFrames={24}
      name="Survive the barrage"
    >
      <Shot
        file="dodge"
        rate={1.2}
        trim={75}
        zoom={1.09}
        endZoom={1.25}
        length={24}
      >
        <Punch>SURVIVE.</Punch>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={120}
      durationInFrames={24}
      name="Runner snap cut"
    >
      <Shot
        file="runner"
        rate={1.2}
        trim={90}
        zoom={1.2}
        endZoom={1.36}
        tilt={-2}
        length={24}
      >
        <Punch color="#a6ffdb" size={126}>
          FIGHT BACK.
        </Punch>
      </Shot>
    </Sequence>
    <Sequence
      from={144}
      durationInFrames={48}
      name="Three moving worlds, eighteen challenges"
    >
      <Triptych />
    </Sequence>
    <Sequence
      premountFor={12}
      from={192}
      durationInFrames={48}
      name="Comeback payoff"
    >
      <Shot
        file="cannon"
        rate={1.2}
        trim={92}
        zoom={1.1}
        endZoom={1.2}
        length={48}
        shade={0.4}
      >
        <Punch size={112} top={270}>
          TURN A CAPTURE INTO A COMEBACK.
        </Punch>
      </Shot>
    </Sequence>
  </AbsoluteFill>
);
