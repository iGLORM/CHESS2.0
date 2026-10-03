import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, C, CharCard, Fades, Grade, Motes, ramp, sec, TITLE, Typed } from "../kit";
import { FULL, SHORT } from "../data";

// You wake in Pawn Hollow with no memory; Pawnie finds you. Lines from the prologue.
export const Awakening: React.FC<{ short?: boolean }> = ({ short }) => {
  const frame = useCurrentFrame();
  const dur = sec(short ? SHORT.awakening : FULL.awakening);
  const pawnieAt = short ? sec(1.6) : sec(17);
  const bubbleAt = pawnieAt + 12;
  const light = ramp(frame, 0, short ? 12 : sec(4));
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: light }}>
        <Backdrop id="pawnhollow" t0={4} zoom={short ? [1.12, 1.04] : [1.35, 1.02]} dur={dur} origin="30% 60%" />
      </AbsoluteFill>
      <Motes count={18} colors={[C.gold, "#ffe9a0"]} />
      {short ? (
        <Typed from={4} to={dur} text="You wake with no memory of who you are." size={56} style={{ bottom: 170 }} />
      ) : (
        <>
          <Typed from={sec(1.2)} to={sec(8)} text="For as long as anyone can remember, the world has been coming apart." />
          <Typed from={sec(8.4)} to={sec(13.2)} text="You wake in the hay behind a windmill." />
          <Typed from={sec(13.4)} to={sec(17)} text="You do not remember your name." />
          <Typed from={pawnieAt + 20} to={dur} text="In your hand: a shard of glowing board." size={44} style={{ bottom: 90 }} />
        </>
      )}
      {frame >= pawnieAt && (
        <CharCard
          id="pawnie"
          scale={short ? 5 : 6}
          moods={[[0, "surprised"], [pawnieAt + (short ? 40 : 70), "happy"]]}
          accent={C.gold}
          style={{
            right: 170,
            top: short ? 150 : 170,
            translate: `${Math.round((1 - ramp(frame, pawnieAt, pawnieAt + 18)) * 700)}px 0px`,
            rotate: `${interpolate(ramp(frame, pawnieAt, pawnieAt + 18), [0, 1], [8, -2])}deg`,
          }}
        />
      )}
      {frame >= bubbleAt && (
        <div
          style={{
            position: "absolute",
            right: short ? 520 : 590,
            top: 200,
            padding: "22px 34px",
            background: "#fff3d6",
            color: "#2a1a10",
            fontFamily: TITLE,
            fontSize: 44,
            border: "6px solid #2a1a10",
            boxShadow: "8px 8px 0 #0a0612",
            scale: ramp(frame, bubbleAt, bubbleAt + 10),
            transformOrigin: "100% 50%",
          }}
        >
          You&apos;re awake!
        </div>
      )}
      <Grade bars={short ? 0 : 90} />
      <Fades dur={dur} fadeIn={0} fadeOut={short ? 4 : 12} />
    </AbsoluteFill>
  );
};
