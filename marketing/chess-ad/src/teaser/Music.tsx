import { interpolate, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { FPS } from "./kit";

// One song from public/teaser/music, played between `from` and `to` (seconds on the
// timeline), starting `trim` seconds into the song, with fades.
export type Cue = { song: string; from: number; to: number; trim?: number; fadeIn?: number; fadeOut?: number; vol?: number };

export const Music: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>
    {cues.map((c, i) => {
      const len = Math.round((c.to - c.from) * FPS);
      const fi = Math.max(1, Math.round((c.fadeIn ?? 0.5) * FPS));
      const fo = Math.max(1, Math.round((c.fadeOut ?? 0.5) * FPS));
      const vol = c.vol ?? 1;
      return (
        <Sequence key={i} from={Math.round(c.from * FPS)} durationInFrames={len} name={`♪ ${c.song}`} layout="none">
          <Audio
            src={staticFile(`teaser/music/${c.song}.m4a`)}
            trimBefore={Math.round((c.trim ?? 0) * FPS)}
            volume={(f) =>
              vol * Math.min(
                interpolate(f, [0, fi], [0, 1], { extrapolateRight: "clamp" }),
                interpolate(f, [len - fo, len], [1, 0], { extrapolateLeft: "clamp" }),
              )
            }
          />
        </Sequence>
      );
    })}
  </>
);
