import "./index.css";
import { Composition, Folder, Still } from "remotion";
import { ChessAd } from "./Composition";
import { Hook } from "./scenes/Hook";
import { FightBack } from "./scenes/FightBack";
import { Arcade } from "./scenes/Arcade";
import { Worlds } from "./scenes/Worlds";
import { PlayNow } from "./scenes/PlayNow";
import { FULL_LEN, ORDER, SCENES, SHORT_LEN, Teaser, TeaserShort } from "./teaser/Teaser";
import { FULL } from "./teaser/data";
import { CaptureReel } from "./social/CaptureReel";
import { MinigamesReel } from "./social/MinigamesReel";
import { GuardiansReel } from "./social/GuardiansReel";
import { StoryReel } from "./social/StoryReel";
import { CaptureCover, GuardiansCover, MinigamesCover, StoryCover } from "./social/Covers";
import { CODE_REEL_LEN, CodeReel } from "./social/CodeReel";
import { PUZZLE_REEL_LEN, PuzzleReel } from "./social/PuzzleReel";
import { PAWNIE_REEL_LEN, PawnieReel } from "./social/PawnieReel";
import { CodeCover, PawnieCover, PuzzleCover } from "./social/WeekCovers";
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
    <Composition id="Chess2-Teaser" component={Teaser} durationInFrames={FULL_LEN * 30} fps={30} width={1920} height={1080} />
    <Composition id="Chess2-Teaser-60s" component={TeaserShort} durationInFrames={SHORT_LEN * 30} fps={30} width={1920} height={1080} />
    <Folder name="Teaser-Scenes">
      {ORDER.map((s) => (
        <Composition key={s} id={`Teaser-${s}`} component={SCENES[s]} durationInFrames={FULL[s] * 30} fps={30} width={1920} height={1080} />
      ))}
    </Folder>
    <Folder name="Social">
      <Folder name="Reels">
        <Composition id="Reel-1-Capture" component={CaptureReel} durationInFrames={540} fps={30} width={1080} height={1920} />
        <Composition id="Reel-2-MiniGames" component={MinigamesReel} durationInFrames={750} fps={30} width={1080} height={1920} />
        <Composition id="Reel-3-Guardians" component={GuardiansReel} durationInFrames={690} fps={30} width={1080} height={1920} />
        <Composition id="Reel-4-Story" component={StoryReel} durationInFrames={765} fps={30} width={1080} height={1920} />
        <Composition id="Reel-5-Code" component={CodeReel} durationInFrames={CODE_REEL_LEN} fps={30} width={1080} height={1920} />
        <Composition id="Reel-6-Puzzle" component={PuzzleReel} durationInFrames={PUZZLE_REEL_LEN} fps={30} width={1080} height={1920} />
        <Composition id="Reel-7-Pawnie" component={PawnieReel} durationInFrames={PAWNIE_REEL_LEN} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Covers-9x16">
        <Still id="Cover-1-Capture" component={CaptureCover} width={1080} height={1920} />
        <Still id="Cover-2-MiniGames" component={MinigamesCover} width={1080} height={1920} />
        <Still id="Cover-3-Guardians" component={GuardiansCover} width={1080} height={1920} />
        <Still id="Cover-4-Story" component={StoryCover} width={1080} height={1920} />
        <Still id="Cover-5-Code" component={CodeCover} width={1080} height={1920} />
        <Still id="Cover-6-Puzzle" component={PuzzleCover} width={1080} height={1920} />
        <Still id="Cover-7-Pawnie" component={PawnieCover} width={1080} height={1920} />
      </Folder>
      <Folder name="Posts-4x5">
        <Still id="Post-1-Capture" component={CaptureCover} width={1080} height={1350} />
        <Still id="Post-2-MiniGames" component={MinigamesCover} width={1080} height={1350} />
        <Still id="Post-3-Guardians" component={GuardiansCover} width={1080} height={1350} />
        <Still id="Post-4-Story" component={StoryCover} width={1080} height={1350} />
        <Still id="Post-5-Code" component={CodeCover} width={1080} height={1350} />
        <Still id="Post-6-Puzzle" component={PuzzleCover} width={1080} height={1350} />
        <Still id="Post-7-Pawnie" component={PawnieCover} width={1080} height={1350} />
      </Folder>
    </Folder>
  </>
);
