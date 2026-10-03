import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { BODY, C, Caption, Fades, Flash, Footage, Grade, ramp, sec, shake, TITLE } from "../kit";
import { FULL, SHORT } from "../data";

// The core idea: normal chess, until a capture turns into a mini-game.
const CAPTURE_AT = 4.5; // exd5 in footage/capture.webm

const Step: React.FC<{ n: number; label: string; clip: string; trim: number; at: number; cover?: boolean }> = ({
  n,
  label,
  clip,
  trim,
  at,
}) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, at, at + 16, Easing.out(Easing.back(1.4)));
  const x = 110 + (n - 1) * 580;
  return (
    <div style={{ position: "absolute", left: x, top: 330, width: 540, opacity: p > 0 ? 1 : 0, scale: 0.8 + 0.2 * p }}>
      <Sequence from={at} layout="none">
        <Footage src={clip} trim={trim} width={540} aspect={clip.startsWith("mini") ? 720 / 1280 : 800 / 1280}
          accent={[C.red, C.violet, C.mint][n - 1]} style={{ position: "relative" }} loop />
      </Sequence>
      <div style={{ marginTop: 40, fontFamily: TITLE, fontSize: 44, color: [C.red, C.violet, C.mint][n - 1], textAlign: "center" }}>
        {n}. {["CAPTURE", "CHALLENGE", "SAVED"][n - 1]}
      </div>
      <div style={{ marginTop: 12, fontFamily: BODY, fontSize: 38, color: C.ink, textAlign: "center", lineHeight: 1.25 }}>
        {label}
      </div>
    </div>
  );
};

export const TheTwist: React.FC<{ short?: boolean }> = ({ short }) => {
  const frame = useCurrentFrame();
  const dur = sec(short ? SHORT.twist : FULL.twist);
  if (short) {
    const cut = sec(3.4);
    return (
      <AbsoluteFill style={{ background: C.bg, translate: shake(frame, cut, 12) }}>
        <Sequence durationInFrames={cut}>
          <Footage src="capture" trim={1.6} cover />
        </Sequence>
        <Sequence from={cut}>
          <Footage src="mini_CheckmateRun" trim={0.6} cover />
        </Sequence>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611f0, transparent 26%, transparent 70%, #080611f0)" }} />
        <Caption from={4} to={cut} style={{ top: 60 }} size={72}>It starts like chess...</Caption>
        <Caption from={cut + 2} to={dur} style={{ bottom: 80 }} size={64} color={C.mint}>
          ...until a capture becomes a fight.
        </Caption>
        <Flash at={cut} color={C.red} />
        <Grade />
        <Fades dur={dur} fadeIn={0} fadeOut={3} />
      </AbsoluteFill>
    );
  }
  const hit = sec(CAPTURE_AT);
  const fight = sec(9);
  const steps = sec(17);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence durationInFrames={fight}>
        <AbsoluteFill style={{ translate: shake(frame, hit, 16, 20) }}>
          <Footage src="capture" width={1344} style={{ left: 288, top: 190, scale: 1 + ramp(frame, 0, fight) * 0.06 }} />
        </AbsoluteFill>
        <Caption from={6} to={hit} style={{ top: 50 }} size={78}>It starts like chess.</Caption>
        <Caption from={hit + 4} to={fight} style={{ top: 50 }} size={78} color={C.red}>Then a piece is taken...</Caption>
        <Flash at={hit} color={C.red} peak={0.5} />
      </Sequence>
      <Sequence from={fight} durationInFrames={steps - fight}>
        <Sequence durationInFrames={sec(4.4)}>
          <Footage src="mini_CheckmateRun" trim={0.4} cover />
        </Sequence>
        <Sequence from={sec(4.4)}>
          <Footage src="mini_SiegeCannon" trim={0.6} cover />
        </Sequence>
        <Flash at={0} len={8} />
        <Flash at={sec(4.4)} len={6} peak={0.5} />
      </Sequence>
      <Sequence from={fight} durationInFrames={steps - fight} layout="none">
        <AbsoluteFill style={{ background: "linear-gradient(0deg, #080611f0, #08061188 24%, transparent 40%)" }} />
      </Sequence>
      <Caption from={fight + 6} to={steps} style={{ bottom: 80 }} size={70} color={C.mint}>
        ...and the capture becomes a fight.
      </Caption>
      <Sequence from={steps}>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #2a1450, #080611 70%)" }} />
        <Caption from={4} to={dur - steps} style={{ top: 110 }} size={72}>
          Win the challenge. Save your piece.
        </Caption>
        <Step n={1} label="A capture can start a challenge" clip="fight_queenie" trim={6} at={20} />
        <Step n={2} label="18 mini-games, a few seconds each" clip="mini_MeteorStorm" trim={0.8} at={20 + sec(2.5)} />
        <Step n={3} label="Win, and the capture is cancelled" clip="mini_ShieldBlock" trim={0.8} at={20 + sec(5)} />
      </Sequence>
      <Grade />
      <Fades dur={dur} fadeIn={6} fadeOut={10} />
    </AbsoluteFill>
  );
};
