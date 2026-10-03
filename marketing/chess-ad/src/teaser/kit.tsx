// Shared pieces for the teaser: backdrops from the live scenes, framed game footage,
// captions, character cards and flashes. All motion is driven by the frame.
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";
import { LiveScene, MoodCue, sceneSize } from "./live/LiveScene";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const C = {
  bg: "#080611",
  ink: "#fff6e7",
  soft: "#cfbbeb",
  gold: "#ffcc58",
  mint: "#acffdc",
  violet: "#ba85ff",
  magenta: "#ff5fa8",
  cyan: "#72ffe0",
  red: "#ff5b5b",
};
export const TITLE = "Silkscreen";
export const BODY = "Pixelify";
export const sec = (s: number) => Math.round(s * FPS);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);

// 0 -> 1 over [a, b] frames, eased.
export const ramp = (frame: number, a: number, b: number, easing = OUT) =>
  interpolate(frame, [a, b], [0, 1], { ...clamp, easing });

// Visible between `from` and `to` (frames) with fades of `fade` frames.
export const shown = (frame: number, from: number, to: number, fade = 8) =>
  Math.min(ramp(frame, from, from + fade), 1 - ramp(frame, to - fade, to, Easing.in(Easing.quad)));

// A camera shake that dies out over `len` frames after `at`.
export const shake = (frame: number, at: number, len = 14, amp = 18) => {
  const d = frame - at;
  if (d < 0 || d > len) return "0px 0px";
  const k = (1 - d / len) * amp;
  return `${Math.round(Math.sin(d * 2.7) * k)}px ${Math.round(Math.cos(d * 3.9) * k)}px`;
};

// A live world scene filling the frame (320x200 art is cropped top and bottom), slowly zooming.
export const Backdrop: React.FC<{
  id: string;
  t0?: number;
  zoom?: [number, number];
  dur?: number;
  dim?: number;
  origin?: string;
  state?: object | ((frame: number) => object);
  style?: React.CSSProperties;
}> = ({ id, t0 = 10, zoom = [1.08, 1], dur = 300, dim = 0, origin = "50% 50%", state, style }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const { width, height } = sceneSize(id);
  const s = Math.max(W / width, H / height);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.bg, ...style }}>
      <div
        style={{
          position: "absolute",
          left: (W - width * s) / 2,
          top: (H - height * s) / 2,
          width: width * s,
          height: height * s,
          transformOrigin: origin,
          scale: interpolate(frame, [0, dur], zoom, clamp),
        }}
      >
        <LiveScene id={id} t0={t0} state={state} style={{ width: "100%", height: "100%" }} />
      </div>
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(8,6,17,${dim})` }} />}
    </AbsoluteFill>
  );
};

// Recorded game footage. `cover` fills the frame; otherwise it sits in a framed screen.
export const Footage: React.FC<{
  src: string;
  trim?: number;
  cover?: boolean;
  width?: number;
  aspect?: number;
  style?: React.CSSProperties;
  accent?: string;
  loop?: boolean;
}> = ({ src, trim = 0, cover = false, width = 1280, aspect = 800 / 1280, style, accent = C.violet, loop }) => {
  const video = (
    <Video
      src={staticFile(`teaser/footage/${src}.webm`)}
      trimBefore={Math.round(trim * FPS)}
      loop={loop}
      muted
      objectFit="cover"
      style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
  if (cover) return <AbsoluteFill style={{ overflow: "hidden", ...style }}>{video}</AbsoluteFill>;
  return (
    <div
      style={{
        position: "absolute",
        width,
        height: Math.round(width * aspect),
        border: `6px solid ${accent}`,
        outline: "6px solid #140c22",
        boxShadow: `12px 12px 0 #0a0612, 0 0 60px ${accent}55`,
        overflow: "hidden",
        background: C.bg,
        ...style,
      }}
    >
      {video}
    </div>
  );
};

// A character's live portrait on a card with a name plate.
export const CharCard: React.FC<{
  id: string;
  scale?: number;
  moods?: MoodCue[];
  name?: string;
  title?: string;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ id, scale = 6, moods, name, title, accent = C.gold, style }) => {
  const { width, height } = sceneSize(`char_${id}`);
  return (
    <div style={{ position: "absolute", width: width * scale, ...style }}>
      <div
        style={{
          width: width * scale,
          height: height * scale,
          border: `${Math.max(4, scale)}px solid ${accent}`,
          outline: `${Math.max(4, scale)}px solid #140c22`,
          boxShadow: `${scale * 2}px ${scale * 2}px 0 #0a0612, 0 0 ${scale * 12}px ${accent}66`,
          background: C.bg,
        }}
      >
        <LiveScene id={`char_${id}`} t0={3} moods={moods} style={{ width: "100%", height: "100%" }} />
      </div>
      {name && (
        <div
          style={{
            marginTop: scale * 4,
            textAlign: "center",
            fontFamily: TITLE,
            fontSize: Math.max(26, scale * 7),
            color: C.ink,
            textShadow: "0 4px 0 #140c22",
            whiteSpace: "nowrap",
          }}
        >
          {name}
          {title && (
            <div style={{ fontFamily: BODY, fontSize: Math.max(22, scale * 5), color: accent, marginTop: 6 }}>
              {title}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// A line of text that pops in and fades out between frames `from` and `to`.
export const Caption: React.FC<{
  from: number;
  to: number;
  children: React.ReactNode;
  size?: number;
  font?: string;
  color?: string;
  style?: React.CSSProperties;
  rise?: number;
}> = ({ from, to, children, size = 84, font = TITLE, color = C.ink, style, rise = 40 }) => {
  const frame = useCurrentFrame();
  const o = shown(frame, from, to, 10);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 120,
        right: 120,
        textAlign: "center",
        fontFamily: font,
        fontSize: size,
        lineHeight: 1.2,
        color,
        textShadow: "0 6px 0 #140c22, 0 0 40px #000c",
        opacity: o,
        translate: `0px ${Math.round((1 - ramp(frame, from, from + 14)) * rise)}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Text typed out letter by letter (the story's narrator), in a dark band.
export const Typed: React.FC<{
  from: number;
  to: number;
  text: string;
  cps?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({ from, to, text, cps = 38, size = 52, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = shown(frame, from, to, 10);
  if (o <= 0) return null;
  const n = Math.floor(Math.max(0, frame - from) * (cps / fps));
  return (
    <div
      style={{
        position: "absolute",
        left: 200,
        right: 200,
        bottom: 150,
        textAlign: "center",
        fontFamily: BODY,
        fontSize: size,
        lineHeight: 1.35,
        color: C.ink,
        textShadow: "0 4px 0 #140c22, 0 0 30px #000",
        opacity: o,
        ...style,
      }}
    >
      {text.slice(0, n)}
      <span style={{ opacity: 0 }}>{text.slice(n)}</span>
    </div>
  );
};

// A small label over a headline.
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = C.gold,
  style,
}) => (
  <div
    style={{
      fontFamily: TITLE,
      fontSize: 34,
      letterSpacing: 4,
      color,
      textShadow: "0 3px 0 #140c22",
      ...style,
    }}
  >
    {children}
  </div>
);

// A white (or coloured) flash that fades over `len` frames from `at`.
export const Flash: React.FC<{ at: number; len?: number; color?: string; peak?: number }> = ({
  at,
  len = 10,
  color = "#fff",
  peak = 0.85,
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 1, at + len], [0, peak, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: "none" }} />;
};

// Fades from and to black at the edges of a scene of `dur` frames.
export const Fades: React.FC<{ dur: number; fadeIn?: number; fadeOut?: number }> = ({
  dur,
  fadeIn = 10,
  fadeOut = 10,
}) => {
  const frame = useCurrentFrame();
  const o = Math.max(
    fadeIn ? 1 - ramp(frame, 0, fadeIn, Easing.linear) : 0,
    fadeOut ? ramp(frame, dur - fadeOut, dur, Easing.linear) : 0,
  );
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: "#000", opacity: o, pointerEvents: "none" }} />;
};

// Cinema bars, scanlines and a vignette over everything.
export const Grade: React.FC<{ bars?: number }> = ({ bars = 0 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background:
          "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.06) 3px,rgba(0,0,0,.06) 4px)",
      }}
    />
    <AbsoluteFill style={{ boxShadow: "inset 0 0 220px 40px rgba(4,2,10,.55)" }} />
    {bars > 0 && (
      <>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bars, background: "#000" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bars, background: "#000" }} />
      </>
    )}
  </AbsoluteFill>
);

// Drifting motes of light.
export const Motes: React.FC<{ count?: number; colors?: string[] }> = ({
  count = 28,
  colors = [C.violet, C.cyan, C.gold],
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const size = i % 3 === 0 ? 8 : 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (i * 293 + Math.sin(frame / 40 + i) * 20) % W,
              top: (((i * 167 - frame * (0.3 + (i % 4) * 0.15)) % H) + H) % H,
              width: size,
              height: size,
              background: colors[i % colors.length],
              opacity: 0.25 + (i % 4) * 0.1,
              boxShadow: `0 0 16px ${colors[i % colors.length]}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
