import { AbsoluteFill, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { Hook } from "./scenes/Hook";
import { FightBack } from "./scenes/FightBack";
import { Arcade } from "./scenes/Arcade";
import { Worlds } from "./scenes/Worlds";
import { PlayNow } from "./scenes/PlayNow";
export const ChessAd = () => (
  <AbsoluteFill>
    <Audio src={staticFile("soundtrack.wav")} volume={0.85} />
    <TransitionSeries>
      <TransitionSeries.Sequence
        durationInFrames={120}
        name="01 — Second chance"
      >
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={180} name="02 — Fight back">
        <FightBack />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        durationInFrames={120}
        name="03 — Eighteen minigames"
      >
        <Arcade />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        durationInFrames={180}
        name="04 — The shattered board"
      >
        <Worlds />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={150} name="05 — Play now">
        <PlayNow />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
