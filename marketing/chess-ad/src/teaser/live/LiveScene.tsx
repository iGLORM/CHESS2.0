import { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { LiveScenes } from "./scenes.generated";

type SceneDef = {
  width: number;
  height: number;
  loop: number;
  moods?: string[];
  frames?: Record<string, [number, number, number, number]>;
  create: () => (t: number, buf: Uint32Array, state: object) => void;
};

export type MoodCue = [atFrame: number, mood: string];

// One of the game's live pixel scenes (src/themes/scenes), drawn for the current frame.
// t0: scene time (s) at frame 0; speed: scene seconds per video second; moods: [frame,
// mood] cues for characters; crop: a named frame of the scene (a character's 'face');
// state: extra scene state (the world map's `map`), may depend on the frame.
export const LiveScene: React.FC<{
  id: string;
  t0?: number;
  speed?: number;
  moods?: MoodCue[];
  crop?: string;
  state?: object | ((frame: number) => object);
  style?: React.CSSProperties;
}> = ({ id, t0 = 0, speed = 1, moods, crop, state, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const def = LiveScenes.get(id) as SceneDef | null;
  if (!def) throw new Error(`No live scene '${id}'`);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [cx, cy, cw, ch] = crop && def.frames?.[crop] ? def.frames[crop] : [0, 0, def.width, def.height];
  const draw = useMemo(() => {
    const paint = def.create();
    const buf = new Uint32Array(def.width * def.height);
    const img = new ImageData(new Uint8ClampedArray(buf.buffer), def.width, def.height);
    return { paint, buf, img };
  }, [def]);

  const time = (f: number) => (((t0 + (f / fps) * speed) % def.loop) + def.loop) % def.loop;
  let mood = def.moods ? def.moods[0] : null;
  let since = 0;
  for (const [at, m] of moods ?? []) {
    if (frame >= at) {
      mood = m;
      since = time(at);
    }
  }
  const extra = typeof state === "function" ? state(frame) : state;

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    draw.paint(time(frame), draw.buf, { mood, since, ...extra });
    ctx.putImageData(draw.img, -cx, -cy, cx, cy, cw, ch);
  });

  return (
    <canvas
      ref={canvas}
      width={cw}
      height={ch}
      style={{ imageRendering: "pixelated", display: "block", ...style }}
    />
  );
};

export const sceneSize = (id: string) => {
  const def = LiveScenes.get(id) as SceneDef;
  return { width: def.width, height: def.height };
};
