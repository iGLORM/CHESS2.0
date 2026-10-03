import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Backdrop, BODY, C, CharCard, Fades, Flash, Footage, Grade, Kicker, ramp, sec, TITLE } from "../kit";
import { FULL, SHORT, World, WORLDS } from "../data";

// One guardian world: its live scene, its guardian, then its twist in play.
const Stop: React.FC<{ w: World; n: number; len: number; short?: boolean }> = ({ w, n, len, short }) => {
  const frame = useCurrentFrame();
  const inP = ramp(frame, 2, 16);
  const playAt = short ? len + 1 : 96;
  const play = ramp(frame, playAt, playAt + 18, Easing.inOut(Easing.cubic));
  const cardScale = short ? 5 : 6;
  return (
    <AbsoluteFill>
      <Backdrop id={w.id} t0={25 + n * 7} zoom={[1.14, 1.0]} dur={len} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, #080611ee 0%, #080611aa 38%, transparent 62%)" }} />
      <div style={{ position: "absolute", left: 110, top: short ? 330 : 120, width: short ? 1100 : 690, translate: `${Math.round((1 - inP) * -80)}px 0px`, opacity: inP }}>
        <Kicker color={w.accent}>GUARDIAN {n + 1} OF 9</Kicker>
        <div style={{ marginTop: 18, fontFamily: TITLE, fontSize: short ? 104 : 72, lineHeight: 1.08, color: C.ink, textShadow: "0 7px 0 #140c22" }}>
          {w.name.toUpperCase()}
        </div>
        <div style={{ marginTop: 24, fontFamily: BODY, fontSize: 42, color: w.accent, textShadow: "0 4px 0 #140c22" }}>
          {w.guardianName} <span style={{ color: C.soft, fontSize: 40 }}>· {w.guardianTitle}</span>
        </div>
      </div>
      {!short && (
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 560,
            width: 660,
            opacity: ramp(frame, playAt + 10, playAt + 24),
            translate: `0px ${Math.round((1 - ramp(frame, playAt + 10, playAt + 24)) * 30)}px`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: w.accent,
              color: "#140c22",
              fontFamily: TITLE,
              fontSize: 34,
              boxShadow: "6px 6px 0 #140c22",
            }}
          >
            TWIST · {w.twist.toUpperCase()}
          </div>
          <div style={{ marginTop: 26, fontFamily: BODY, fontSize: 42, lineHeight: 1.3, color: C.ink, textShadow: "0 4px 0 #140c22" }}>
            {w.line}
          </div>
        </div>
      )}
      <CharCard
        id={w.guardian}
        scale={cardScale}
        accent={w.accent}
        moods={[[0, w.moods[0]], [short ? 16 : 56, w.moods[1]]]}
        style={{
          left: interpolate(play, [0, 1], [1920 - 62 * cardScale - 200, 1920 - 62 * cardScale * 0.5 - 70]),
          top: interpolate(play, [0, 1], [short ? 200 : 150, 1080 - 80 * cardScale * 0.5 - 70]),
          scale: interpolate(play, [0, 1], [1, 0.5]),
          transformOrigin: "0 0",
          translate: `${Math.round((1 - ramp(frame, 0, 14)) * 500)}px 0px`,
          zIndex: 2,
        }}
      />
      {!short && frame >= playAt - 1 && (
        <Sequence from={playAt} layout="none">
          <Footage
            src={`fight_${w.guardian}`}
            trim={5.8}
            width={1000}
            accent={w.accent}
            style={{ left: 840, top: 190, translate: `${Math.round((1 - play) * 1200)}px 0px`, rotate: `${(1 - play) * 4}deg` }}
          />
        </Sequence>
      )}
      <Flash at={0} len={6} peak={0.45} />
    </AbsoluteFill>
  );
};

export const WorldsTour: React.FC<{ short?: boolean }> = ({ short }) => {
  const dur = sec(short ? SHORT.worlds : FULL.worlds);
  const per = Math.floor(dur / WORLDS.length);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {WORLDS.map((w, n) => {
        const len = n === WORLDS.length - 1 ? dur - per * n : per;
        return (
          <Sequence key={w.id} from={per * n} durationInFrames={len} name={w.name}>
            <Stop w={w} n={n} len={len} short={short} />
          </Sequence>
        );
      })}
      <Grade />
      <Fades dur={dur} fadeIn={6} fadeOut={short ? 3 : 10} />
    </AbsoluteFill>
  );
};
