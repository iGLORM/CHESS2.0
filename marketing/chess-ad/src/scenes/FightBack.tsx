import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Burst, Caption, Punch, Shot, Slash, clamp } from "../Motion";
const Saved = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Shot
        file="saved-board"
        zoom={1.42}
        endZoom={1.19}
        length={48}
        shade={0.28}
      />
      <div
        style={{
          position: "absolute",
          left: 610,
          top: 605,
          width: 230,
          height: 230,
          border: "8px solid #a6ffdb",
          borderRadius: "50%",
          scale: interpolate(f, [0, 28], [0.6, 1.5], clamp),
          opacity: interpolate(f, [0, 10, 36], [0, 1, 0], clamp),
          boxShadow: "0 0 60px #a6ffdb",
        }}
      />
      <Punch color="#a6ffdb" size={180} top={135}>
        SAVED.
      </Punch>
      <Caption color="#a6ffdb" top={910}>
        Win the minigame. Keep your piece.
      </Caption>
      <Burst cx={725} cy={720} />
    </AbsoluteFill>
  );
};
export const FightBack = () => (
  <AbsoluteFill>
    <Sequence
      premountFor={12}
      durationInFrames={48}
      name="Drop into the defense challenge"
    >
      <Shot
        file="defense-run"
        trim={105}
        zoom={1.17}
        endZoom={1.27}
        tilt={1.2}
        length={48}
      >
        <Punch size={125} top={100}>
          DEFEND IT.
        </Punch>
        <Slash />
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={48}
      durationInFrames={48}
      name="Jump to the finish"
    >
      <Shot
        file="defense-run"
        trim={275}
        zoom={1.31}
        endZoom={1.17}
        x={40}
        length={48}
      >
        <Punch size={93} top={820}>
          WIN THE CHALLENGE.
        </Punch>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={96}
      durationInFrames={48}
      name="The knight survives"
    >
      <Saved />
    </Sequence>
  </AbsoluteFill>
);
