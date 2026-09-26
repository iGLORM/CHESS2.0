import { AbsoluteFill, Sequence } from "remotion";
import { Punch, Shot, Slash } from "../Motion";
export const FinalRush = () => (
  <AbsoluteFill>
    <Sequence premountFor={12} durationInFrames={48} name="Strategy">
      <Shot
        file="chess"
        trim={52}
        zoom={1.18}
        endZoom={1.4}
        tilt={-2}
        length={48}
      >
        <Punch top={110}>OUTTHINK.</Punch>
        <Slash />
      </Shot>
    </Sequence>
    <Sequence premountFor={12} from={48} durationInFrames={48} name="Skill">
      <Shot
        file="cannon"
        rate={1.2}
        trim={80}
        zoom={1.12}
        endZoom={1.32}
        length={48}
      >
        <Punch>OUTPLAY.</Punch>
      </Shot>
    </Sequence>
    <Sequence premountFor={12} from={96} durationInFrames={24} name="Survival">
      <Shot
        file="lava"
        rate={1.2}
        trim={110}
        zoom={1.25}
        endZoom={1.1}
        tilt={2}
        length={24}
      >
        <Punch>OUTLAST.</Punch>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={120}
      durationInFrames={24}
      name="Final acceleration"
    >
      <Shot
        file="runner"
        rate={1.2}
        trim={145}
        zoom={1.17}
        endZoom={1.55}
        length={24}
      >
        <Punch color="#a6ffdb" top={130}>
          YOUR MOVE.
        </Punch>
      </Shot>
    </Sequence>
  </AbsoluteFill>
);
