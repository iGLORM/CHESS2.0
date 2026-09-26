import "./index.css";
import { Composition, Folder } from "remotion";
import { ChessAd } from "./Composition";
import { Hook } from "./scenes/Hook";
import { FightBack } from "./scenes/FightBack";
import { Arcade } from "./scenes/Arcade";
import { Worlds } from "./scenes/Worlds";
import { PlayNow } from "./scenes/PlayNow";
export const RemotionRoot = () => (
  <>
    <Composition
      id="Chess2-Ad"
      component={ChessAd}
      durationInFrames={750}
      fps={30}
      width={1920}
      height={1080}
    />
    <Folder name="Scenes">
      <Composition
        id="Hook"
        component={Hook}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FightBack"
        component={FightBack}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Arcade"
        component={Arcade}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Worlds"
        component={Worlds}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PlayNow"
        component={PlayNow}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
  </>
);
