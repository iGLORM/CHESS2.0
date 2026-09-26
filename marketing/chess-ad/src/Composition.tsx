import { AbsoluteFill, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { Hook } from "./scenes/Hook";
import { FightBack } from "./scenes/FightBack";
import { Arcade } from "./scenes/Arcade";
import { Worlds } from "./scenes/Worlds";
import { FinalRush } from "./scenes/FinalRush";
import { PlayNow } from "./scenes/PlayNow";
import { EditTexture } from "./Motion";
export const ChessAd = () => (
  <AbsoluteFill>
    <Audio src={staticFile("trailer-mix.wav")} />
    <TransitionSeries>
      <TransitionSeries.Sequence
        premountFor={24}
        durationInFrames={96}
        name="01 — The capture / music stop"
      >
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        premountFor={24}
        durationInFrames={144}
        name="02 — Fight for it / save it"
      >
        <FightBack />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        premountFor={24}
        durationInFrames={240}
        name="03 — Six-game beat montage"
      >
        <Arcade />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        premountFor={24}
        durationInFrames={192}
        name="04 — World map and guardians"
      >
        <Worlds />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        premountFor={24}
        durationInFrames={144}
        name="05 — Accelerating finale"
      >
        <FinalRush />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        premountFor={24}
        durationInFrames={144}
        name="06 — Animated logo and CTA"
      >
        <PlayNow />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <EditTexture />
  </AbsoluteFill>
);
