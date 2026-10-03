import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { LiveScene } from "../live/LiveScene";
import { Backdrop, C, Caption, CharCard, Fades, Flash, Footage, Grade, Motes, ramp, sec, shake, TITLE } from "../kit";
import { FULL, MINIGAMES, SHORT, WORLDS } from "../data";

// Clips for the montage, alternating fights and mini-games.
const MONTAGE = Array.from({ length: 40 }, (_, i) =>
  i % 2 === 0
    ? { src: `fight_${WORLDS[(i / 2) % WORLDS.length].guardian}`, trim: 6 + (i % 5) }
    : { src: `mini_${MINIGAMES[(i * 7) % MINIGAMES.length].cls}`, trim: 1.2 + (i % 3) * 0.8 },
);

// Cuts that get faster: `lens` frames each, filling `total`.
const Montage: React.FC<{ total: number; lens: number[] }> = ({ total, lens }) => {
  const frame = useCurrentFrame();
  const cuts: { from: number; len: number }[] = [];
  let t = 0;
  for (let i = 0; t < total; i++) {
    const len = Math.min(lens[Math.min(i, lens.length - 1)], total - t);
    cuts.push({ from: t, len });
    t += len;
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {cuts.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.len}>
          <AbsoluteFill style={{ scale: 1.04 + (i % 2) * 0.04, rotate: `${((i % 3) - 1) * 0.6}deg` }}>
            <Footage src={MONTAGE[i % MONTAGE.length].src} trim={MONTAGE[i % MONTAGE.length].trim} cover />
          </AbsoluteFill>
          <Flash at={0} len={4} peak={0.35} color={i % 2 ? "#fff" : C.violet} />
        </Sequence>
      ))}
      <AbsoluteFill style={{ background: "#3a0f5a", mixBlendMode: "multiply", opacity: 0.35 + ramp(frame, 0, total) * 0.25 }} />
    </AbsoluteFill>
  );
};

const Waiting: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 90,
          width: 620,
          height: 620,
          opacity: ramp(frame, 0, 30),
          scale: interpolate(frame, [0, len], [1, 1.12]),
          filter: `drop-shadow(0 0 60px ${C.violet})`,
          maskImage: "radial-gradient(circle, #000 55%, transparent 72%)",
        }}
      >
        <LiveScene id="char_grandmasterx" crop="face" moods={[[0, "fury"]]} t0={5} style={{ width: "100%", height: "100%" }} />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 130,
          fontFamily: TITLE,
          fontSize: 80,
          color: C.ink,
          textShadow: `0 6px 0 #140c22, 0 0 50px ${C.violet}`,
          opacity: ramp(frame, 24, 44),
        }}
      >
        THE ABSOLUTE IS WAITING.
      </div>
    </AbsoluteFill>
  );
};

export const Absolute: React.FC<{ short?: boolean }> = ({ short }) => {
  const frame = useCurrentFrame();
  const dur = sec(short ? SHORT.absolute : FULL.absolute);
  if (short) {
    const cut = sec(2.5);
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <Sequence durationInFrames={cut}>
          <Footage src="fight_grandmasterx" trim={2.9} cover />
          <Caption from={4} to={cut} style={{ bottom: 60 }} size={72} color={C.violet}>
            The final guardian is waiting.
          </Caption>
        </Sequence>
        <Sequence from={cut}>
          <Montage total={dur - cut} lens={[10]} />
        </Sequence>
        <Grade />
        <Fades dur={dur} fadeIn={0} fadeOut={3} />
      </AbsoluteFill>
    );
  }
  const exam = sec(6), montage = sec(12), end = sec(26);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={exam}>
        <AbsoluteFill style={{ translate: shake(frame, 4, 20, 14) }}>
          <Backdrop id="crystal" t0={70} zoom={[1.0, 1.15]} dur={exam} dim={0.55} />
          <Motes count={30} colors={[C.violet, C.magenta]} />
          <CharCard id="grandmasterx" scale={7} accent={C.violet} moods={[[0, "contempt"], [sec(3.4), "fury"]]}
            style={{ left: (1920 - 434) / 2, top: 70, scale: interpolate(frame, [0, exam], [1, 1.1]) }} />
        </AbsoluteFill>
        <Caption from={10} to={exam} style={{ bottom: 60 }} size={60}>
          He plays every challenge at <span style={{ color: C.violet }}>full strength.</span>
        </Caption>
      </Sequence>
      <Sequence from={exam} durationInFrames={montage - exam}>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #2a1450, #000 70%)" }} />
        <Footage src="fight_grandmasterx" trim={2.4} width={1440} style={{ left: 240, top: 170 }} />
        <Caption from={8} to={montage - exam} style={{ top: 40 }} size={66}>
          Checkmate him... <span style={{ color: C.violet }}>and time rewinds.</span>
        </Caption>
        <Flash at={0} len={10} color={C.violet} />
      </Sequence>
      <Sequence from={montage} durationInFrames={end - montage}>
        <Montage total={end - montage} lens={[30, 30, 30, 30, 30, 30, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 8]} />
        <Caption from={6} to={sec(5)} style={{ top: 420 }} size={110} color={C.ink}>
          CRACK HIS CRYSTAL.
        </Caption>
        <Caption from={sec(5)} to={sec(9)} style={{ top: 420 }} size={130} color={C.violet} rise={0}>
          THREE TIMES.
        </Caption>
      </Sequence>
      <Sequence from={end}>
        <Waiting len={dur - end} />
      </Sequence>
      <Flash at={end} len={20} peak={1} />
      <Grade />
      <Fades dur={dur} fadeIn={6} fadeOut={14} />
    </AbsoluteFill>
  );
};
