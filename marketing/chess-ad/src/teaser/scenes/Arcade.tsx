import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { BODY, C, Fades, Flash, Footage, Grade, ramp, sec, TITLE } from "../kit";
import { FULL, KIND_COLOR, MINIGAMES, SHORT } from "../data";

// One mini-game full frame, with its name and kind; cut on the beat.
const Shot: React.FC<{ i: number; total: number; len: number; counter?: boolean }> = ({ i, total, len, counter = true }) => {
  const frame = useCurrentFrame();
  const g = MINIGAMES[i];
  const col = KIND_COLOR[g.kind];
  const plate = ramp(frame, 2, 10, Easing.out(Easing.back(1.8)));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ scale: interpolate(frame, [0, 8, len], [1.1, 1.02, 1], { extrapolateRight: "clamp" }) }}>
        <Footage src={`mini_${g.cls}`} trim={1 + (i % 3) * 0.6} cover />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(0deg, #080611dd, transparent 38%)" }} />
      <div style={{ position: "absolute", left: 110, bottom: 96, translate: `${Math.round((1 - plate) * -120)}px 0px`, opacity: plate }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 18px",
            background: col,
            color: "#140c22",
            fontFamily: TITLE,
            fontSize: 30,
            letterSpacing: 3,
            boxShadow: "5px 5px 0 #140c22",
          }}
        >
          {g.kind.toUpperCase()}
        </div>
        <div style={{ marginTop: 14, fontFamily: TITLE, fontSize: 96, color: C.ink, textShadow: `0 6px 0 #140c22, 0 0 40px ${col}88` }}>
          {g.name.toUpperCase()}
        </div>
      </div>
      <div
        style={{
          display: counter ? "block" : "none",
          position: "absolute",
          right: 110,
          top: 80,
          fontFamily: TITLE,
          fontSize: 60,
          color: C.ink,
          textShadow: "0 5px 0 #140c22",
        }}
      >
        <span style={{ color: col }}>{String(i + 1).padStart(2, "0")}</span>
        <span style={{ opacity: 0.6 }}> / {total}</span>
      </div>
      <Flash at={0} len={5} peak={0.55} />
    </AbsoluteFill>
  );
};

// All eighteen at once, tiling in.
const Grid: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const tw = 290, th = 163, gap = 14, left = (1920 - (6 * tw + 5 * gap)) / 2;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, #2a1450, #080611 75%)" }}>
      {MINIGAMES.map((g, i) => {
        const at = (i % 6) * 2 + Math.floor(i / 6) * 3;
        const p = ramp(frame, at, at + 12, Easing.out(Easing.back(1.6)));
        return (
          <div
            key={g.cls}
            style={{
              position: "absolute",
              left: left + (i % 6) * (tw + gap),
              top: 330 + Math.floor(i / 6) * (th + gap),
              width: tw,
              height: th,
              border: `4px solid ${KIND_COLOR[g.kind]}`,
              boxShadow: "6px 6px 0 #0a0612",
              overflow: "hidden",
              scale: p,
              opacity: p > 0 ? 1 : 0,
            }}
          >
            <Footage src={`mini_${g.cls}`} trim={1.5} cover />
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 110,
          textAlign: "center",
          fontFamily: TITLE,
          fontSize: 124,
          color: C.ink,
          textShadow: `0 8px 0 #140c22, 0 0 60px ${C.magenta}88`,
          scale: ramp(frame, 10, 26, Easing.out(Easing.back(2))),
        }}
      >
        <span style={{ color: C.gold }}>18</span> MINI-GAMES
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 110,
          textAlign: "center",
          fontFamily: BODY,
          fontSize: 50,
          color: C.soft,
          opacity: ramp(frame, 24, Math.min(len, 40)),
        }}
      >
        {Object.keys(KIND_COLOR).map((k, i) => (
          <span key={k} style={{ color: KIND_COLOR[k] }}>
            {i ? <span style={{ color: C.soft }}> · </span> : null}
            {k}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Arcade: React.FC<{ short?: boolean }> = ({ short }) => {
  const dur = sec(short ? SHORT.arcade : FULL.arcade);
  const count = short ? 9 : MINIGAMES.length;
  const per = short ? 30 : 60;
  const gridAt = count * per;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {Array.from({ length: count }, (_, i) => (
        <Sequence key={i} from={i * per} durationInFrames={per}>
          <Shot i={short ? i * 2 : i} total={MINIGAMES.length} len={per} counter={!short} />
        </Sequence>
      ))}
      <Sequence from={gridAt}>
        <Grid len={dur - gridAt} />
        <Flash at={0} len={10} />
      </Sequence>
      <Grade />
      <Fades dur={dur} fadeIn={0} fadeOut={short ? 3 : 10} />
    </AbsoluteFill>
  );
};
