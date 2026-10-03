import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { Backdrop, BODY, C, Caption, CharCard, Fades, Flash, Footage, Grade, Kicker, ramp, sec, TITLE } from "../kit";
import { FULL, TRAINERS } from "../data";

const TRAINER_MOODS: Record<string, [string, string]> = {
  sergeantsquare: ["stern", "barking"],
  captaincapture: ["jolly", "laughing"],
  joystick: ["hyped", "highscore"],
  rulekeeper: ["calm", "knowing"],
  senseitactic: ["serene", "approving"],
};

const Camp: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop id="trainingcamp" t0={30} zoom={[1.1, 1.0]} dur={len} dim={0.35} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 80, textAlign: "center" }}>
        <Kicker color={C.cyan}>THE TRAINING CAMP</Kicker>
      </div>
      {TRAINERS.map((t, i) => {
        const at = 16 + i * 7;
        const p = ramp(frame, at, at + 16, Easing.out(Easing.back(1.8)));
        return (
          <CharCard
            key={t.id}
            id={t.id}
            scale={4}
            name={t.name}
            accent={C.cyan}
            moods={[[0, TRAINER_MOODS[t.id][0]], [sec(3.5) + i * 6, TRAINER_MOODS[t.id][1]]]}
            style={{ left: 110 + i * 350, top: 250, scale: p, opacity: p > 0 ? 1 : 0 }}
          />
        );
      })}
      <Caption from={40} to={len} style={{ bottom: 80 }} size={60} font={BODY}>
        Five holographic masters train you for the road.
      </Caption>
    </AbsoluteFill>
  );
};

// Game footage filling the frame, with a line of text on a dark band.
const Feature: React.FC<{ clip: string; trim: number; len: number; text: React.ReactNode; top?: boolean; loop?: boolean }> = ({
  clip,
  trim,
  len,
  text,
  top,
  loop,
}) => (
  <AbsoluteFill>
    <Footage src={clip} trim={trim} cover loop={loop} />
    <AbsoluteFill
      style={{ background: `linear-gradient(${top ? 180 : 0}deg, #080611f0, #08061188 22%, transparent 36%)` }}
    />
    <Caption from={8} to={len} style={top ? { top: 60 } : { bottom: 60 }} size={56}>
      {text}
    </Caption>
    <Flash at={0} len={6} peak={0.4} />
  </AbsoluteFill>
);

const More: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const items: [string, string][] = [
    ["Keepsakes with real powers", C.gold],
    ["Wandering rivals on the roads", C.magenta],
    ["The Arena: how long can you last?", C.cyan],
    ["Stars, coins, a shop and a last stand", C.mint],
  ];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 50%, #2a1450, #080611 70%)" }}>
      <Footage src="worldmap" trim={0.5} width={1000} accent={C.gold} style={{ left: 90, top: 250, rotate: "-3deg" }} />
      <div style={{ position: "absolute", left: 1160, top: 180, width: 700 }}>
        <div style={{ fontFamily: TITLE, fontSize: 64, color: C.ink, textShadow: "0 6px 0 #140c22", opacity: ramp(frame, 4, 16) }}>
          AND THERE&apos;S MORE
        </div>
        {items.map(([t, col], i) => {
          const at = 20 + i * 22;
          const p = ramp(frame, at, at + 12);
          return (
            <div
              key={t}
              style={{
                marginTop: 42,
                fontFamily: BODY,
                fontSize: 48,
                color: C.ink,
                opacity: p,
                translate: `${Math.round((1 - p) * 60)}px 0px`,
                textShadow: "0 4px 0 #140c22",
              }}
            >
              <span style={{ color: col }}>◆ </span>
              {t}
            </div>
          );
        })}
      </div>
      <Fades dur={len} fadeIn={0} fadeOut={0} />
    </AbsoluteFill>
  );
};

export const Journey: React.FC = () => {
  const dur = sec(FULL.journey);
  const cuts = [0, sec(9), sec(17), sec(25), sec(33), dur];
  const len = (i: number) => cuts[i + 1] - cuts[i];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence durationInFrames={len(0)} name="Training Camp">
        <Camp len={len(0)} />
      </Sequence>
      <Sequence from={cuts[1]} durationInFrames={len(1)} name="Plane">
        <Feature clip="plane" trim={1.4} len={len(1)} text={<>Buy a plane. <span style={{ color: C.gold }}>Fly anywhere.</span></>} />
      </Sequence>
      <Sequence from={cuts[2]} durationInFrames={len(2)} name="Shop">
        <Feature clip="shop" trim={0.2} len={len(2)} top text={<>Spend your stars at the <span style={{ color: C.gold }}>Crossroads Bazaar.</span></>} />
      </Sequence>
      <Sequence from={cuts[3]} durationInFrames={len(3)} name="Tournaments">
        <Feature clip="tournament" trim={0} len={len(3)} loop text={<>Win the <span style={{ color: "#ff8fc8" }}>Queen&apos;s Cup.</span> Survive the <span style={{ color: "#ff9a4a" }}>Gulch Shootout.</span></>} />
      </Sequence>
      <Sequence from={cuts[4]} name="More">
        <More len={len(4)} />
      </Sequence>
      <Grade />
      <Fades dur={dur} fadeIn={6} fadeOut={10} />
    </AbsoluteFill>
  );
};
