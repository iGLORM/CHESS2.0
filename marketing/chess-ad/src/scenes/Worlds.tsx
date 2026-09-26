import { AbsoluteFill, Sequence } from "remotion";
import { Boss, Caption, Punch, Shot, Slash } from "../Motion";
export const Worlds = () => (
  <AbsoluteFill>
    <Sequence
      premountFor={12}
      durationInFrames={48}
      name="Fly across the story map"
    >
      <Shot
        file="world-map"
        trim={0}
        zoom={1.3}
        endZoom={1.6}
        y={70}
        length={48}
        shade={0.17}
      >
        <Punch size={104} top={730}>
          BEYOND THE BOARD.
        </Punch>
        <Caption top={930}>A story across 11 worlds.</Caption>
        <Slash />
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={48}
      durationInFrames={48}
      name="The map restores"
    >
      <Shot
        file="world-map"
        trim={85}
        zoom={1.7}
        endZoom={1.36}
        x={-130}
        y={100}
        length={48}
        shade={0.3}
      >
        <Punch size={130} top={140}>
          9 GUARDIANS.
        </Punch>
        <Caption top={930}>Each one changes the rules.</Caption>
      </Shot>
    </Sequence>
    <Sequence
      premountFor={12}
      from={96}
      durationInFrames={24}
      name="Mist guardian"
    >
      <Boss
        portrait="knightsade"
        world="mistymoors"
        name="THE MISTY MOORS"
        color="#a9dcff"
      />
    </Sequence>
    <Sequence premountFor={12} from={120} durationInFrames={24} name="Queenie">
      <Boss
        portrait="queenie"
        world="royalpalace"
        name="THE ROYAL PALACE"
        color="#ffb8df"
        direction={-1}
      />
    </Sequence>
    <Sequence
      premountFor={12}
      from={144}
      durationInFrames={24}
      name="Grandmaster X"
    >
      <Boss
        portrait="grandmasterx"
        world="crystal"
        name="GRANDMASTER X"
        color="#cda3ff"
      />
    </Sequence>
    <Sequence
      premountFor={12}
      from={168}
      durationInFrames={24}
      name="Final boss punch-in"
    >
      <Boss
        portrait="grandmasterx"
        world="crystal"
        name="RESTORE THE BOARD."
        color="#a6ffdb"
        direction={-1}
      />
    </Sequence>
  </AbsoluteFill>
);
