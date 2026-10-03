import { AbsoluteFill, Series } from "remotion";
import { FULL, SceneName, SHORT, WORLDS } from "./data";
import { sec } from "./kit";
import { Cue, Music } from "./Music";
import { Awakening } from "./scenes/Awakening";
import { TitleReveal } from "./scenes/TitleReveal";
import { TheTwist } from "./scenes/TheTwist";
import { Arcade } from "./scenes/Arcade";
import { Shattered } from "./scenes/Shattered";
import { WorldsTour } from "./scenes/WorldsTour";
import { Journey } from "./scenes/Journey";
import { Absolute } from "./scenes/Absolute";
import { Finale } from "./scenes/Finale";

const ORDER: SceneName[] = ["awakening", "title", "twist", "arcade", "shattered", "worlds", "journey", "absolute", "finale"];
const SCENES: Record<SceneName, React.FC<{ short?: boolean }>> = {
  awakening: Awakening,
  title: TitleReveal,
  twist: TheTwist,
  arcade: Arcade,
  shattered: Shattered,
  worlds: WorldsTour,
  journey: Journey,
  absolute: Absolute,
  finale: Finale,
};

// Start time (s) of each scene.
const starts = (lens: Record<SceneName, number>) => {
  const at = {} as Record<SceneName, number>;
  let t = 0;
  for (const s of ORDER) {
    at[s] = t;
    t += lens[s];
  }
  return { at, total: t };
};
export const FULL_LEN = starts(FULL).total;
export const SHORT_LEN = starts(SHORT).total;

const fullCues = (): Cue[] => {
  const { at } = starts(FULL);
  return [
    { song: "pawnhollow", from: 0, to: at.title + 0.5, fadeIn: 3, fadeOut: 1.5 },
    { song: "chess20", from: at.title - 0.3, to: at.arcade + 0.3, trim: 6, fadeIn: 1, fadeOut: 0.6 },
    { song: "trainingcamp_120", from: at.arcade, to: at.shattered + 0.5, trim: 4, fadeIn: 0.1, fadeOut: 1.2 },
    { song: "greatboard", from: at.shattered, to: at.shattered + 8.5, fadeIn: 1, fadeOut: 1.5 },
    { song: "crystal", from: at.shattered + 8, to: at.shattered + 18.2, fadeIn: 1.5, fadeOut: 0.3 },
    { song: "worldmap", from: at.shattered + 18, to: at.worlds + 0.5, trim: 2, fadeIn: 2.5, fadeOut: 1 },
    ...WORLDS.map((w, n) => ({
      song: w.id,
      from: at.worlds + n * 8 - 0.4,
      to: at.worlds + (n + 1) * 8 + 0.4,
      trim: 10,
      fadeIn: 0.6,
      fadeOut: 0.8,
    })),
    { song: "worldmap", from: at.journey, to: at.absolute + 0.5, trim: 12, fadeIn: 1, fadeOut: 1.5 },
    { song: "crystal_tense_120", from: at.absolute, to: at.absolute + 26.4, fadeIn: 0.6, fadeOut: 0.5 },
    { song: "crystal", from: at.absolute + 25.8, to: at.finale + 0.3, trim: 20, fadeIn: 0.2, fadeOut: 0.4, vol: 0.8 },
    { song: "chess20", from: at.finale, to: at.finale + FULL.finale, trim: 30, fadeIn: 0.2, fadeOut: 3 },
  ];
};

const shortCues = (): Cue[] => {
  const { at, total } = starts(SHORT);
  return [
    { song: "chess20", from: 0, to: at.arcade + 0.3, trim: 6, fadeIn: 0.8, fadeOut: 0.3 },
    { song: "trainingcamp_120", from: at.arcade, to: at.shattered + 0.3, trim: 4, fadeIn: 0.1, fadeOut: 0.4 },
    { song: "crystal_tense_120", from: at.shattered, to: at.finale + 0.3, fadeIn: 0.2, fadeOut: 0.5 },
    { song: "chess20", from: at.finale, to: total, trim: 30, fadeIn: 0.2, fadeOut: 2 },
  ];
};

const Cut: React.FC<{ short?: boolean }> = ({ short }) => {
  const lens = short ? SHORT : FULL;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Series>
        {ORDER.filter((s) => lens[s] > 0).map((s) => {
          const Scene = SCENES[s];
          return (
            <Series.Sequence key={s} durationInFrames={sec(lens[s])} name={s}>
              <Scene short={short} />
            </Series.Sequence>
          );
        })}
      </Series>
      <Music cues={short ? shortCues() : fullCues()} />
    </AbsoluteFill>
  );
};

export const Teaser: React.FC = () => <Cut />;
export const TeaserShort: React.FC = () => <Cut short />;
export { SCENES, ORDER };
