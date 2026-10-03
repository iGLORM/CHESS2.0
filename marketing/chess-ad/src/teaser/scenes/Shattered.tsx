import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { LiveScene } from "../live/LiveScene";
import { Backdrop, C, Caption, CharCard, Fades, Flash, Grade, Motes, ramp, sec, shake } from "../kit";
import { FULL, SHORT } from "../data";

const WORLD_IDS = [
  "pawnhollow", "trainingcamp", "slantedsands", "ironkeep", "mistymoors", "royalpalace",
  "clockworkcitadel", "grandlibrary", "forkedgulch", "obsidiancourt", "soulboundpixel",
];

// The world map, grey until each world's colour wave runs (heal: world -> [start, end] frames).
const WorldMap: React.FC<{ heal?: Record<string, [number, number]>; pan?: [number, number]; len: number }> = ({
  heal = {},
  pan = [0, -200],
  len,
}) => {
  const frame = useCurrentFrame();
  const state = (f: number) => ({
    map: {
      heal: Object.fromEntries(
        WORLD_IDS.map((id) => [id, id === "pawnhollow" ? 1 : heal[id] ? ramp(f, heal[id][0], heal[id][1], Easing.inOut(Easing.quad)) : 0]),
      ),
      fuse: 0,
    },
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#0b1a2e" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          width: 2160,
          height: 1080,
          translate: `${Math.round(interpolate(frame, [0, len], pan))}px 0px`,
        }}
      >
        <LiveScene id="worldmap" t0={20} state={state} style={{ width: "100%", height: "100%" }} />
      </div>
    </AbsoluteFill>
  );
};

// Cracks spreading from the centre, then the flash.
const Cracks: React.FC<{ from: number; len: number }> = ({ from, len }) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, from, from + len, Easing.in(Easing.quad));
  if (p <= 0) return null;
  const rays = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2 + 0.3;
    const pts = [0, 1, 2, 3, 4].map((k) => {
      const r = k * 260 * p;
      const j = Math.sin(i * 7.3 + k * 3.1) * 60 * (k / 4);
      return `${960 + Math.cos(a) * r + Math.cos(a + 1.57) * j},${540 + Math.sin(a) * r + Math.sin(a + 1.57) * j}`;
    });
    return <polyline key={i} points={pts.join(" ")} fill="none" stroke="#fff" strokeWidth={10 - p * 4} strokeLinejoin="bevel" />;
  });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 18px ${C.violet})` }}>
      {rays}
    </svg>
  );
};

const Fragments: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center", gap: 90 }}>
      {[0, 1, 2, 3].map((i) => {
        const p = ramp(frame, from + i * 8, from + i * 8 + 14, Easing.out(Easing.back(2)));
        return (
          <div
            key={i}
            style={{
              width: 110,
              height: 110,
              rotate: "45deg",
              scale: p,
              translate: `0px ${Math.round(Math.sin((frame + i * 20) / 14) * 10)}px`,
              background: `repeating-conic-gradient(${C.mint} 0 25%, #3c8d74 0 50%) 0 0 / 55px 55px`,
              border: `6px solid ${C.ink}`,
              boxShadow: `0 0 50px ${C.mint}, 8px 8px 0 #0a0612`,
              opacity: i === 0 ? 1 : 0.9,
            }}
          />
        );
      })}
    </div>
  );
};

const Villain: React.FC<{ len: number; crackAt: number; short?: boolean }> = ({ len, crackAt, short }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ translate: shake(frame, crackAt + 20, 24, 30) }}>
      <Backdrop id="crystal" t0={40} zoom={[1.2, 1.05]} dur={len} dim={0.45} />
      <Motes count={24} colors={[C.violet, C.magenta]} />
      <CharCard
        id="grandmasterx"
        scale={short ? 6 : 7}
        accent={C.violet}
        moods={short ? [[0, "contempt"], [40, "fury"]] : [[0, "cold"], [sec(3), "contempt"], [sec(6.5), "fury"]]}
        style={{
          left: (1920 - 62 * (short ? 6 : 7)) / 2,
          top: short ? 120 : 90,
          scale: interpolate(frame, [0, len], [0.92, 1.06]),
        }}
      />
      <Cracks from={crackAt} len={20} />
      <Flash at={crackAt + 20} len={16} peak={1} />
    </AbsoluteFill>
  );
};

export const Shattered: React.FC<{ short?: boolean }> = ({ short }) => {
  const dur = sec(short ? SHORT.shattered : FULL.shattered);
  if (short) {
    const cut = sec(3.5);
    return (
      <AbsoluteFill style={{ background: C.bg }}>
        <Sequence durationInFrames={cut}>
          <Villain len={cut} crackAt={cut - 22} short />
          <Caption from={6} to={cut - 4} style={{ bottom: 80 }} size={72} color={C.violet}>
            Grandmaster X broke the world.
          </Caption>
        </Sequence>
        <Sequence from={cut}>
          <WorldMap len={dur - cut} pan={[-80, -180]} heal={{ trainingcamp: [4, 40], slantedsands: [14, 60], ironkeep: [30, 80] }} />
          <Caption from={6} to={dur - cut} style={{ top: 90 }} size={80} color={C.gold}>
            Win it back.
          </Caption>
        </Sequence>
        <Grade />
        <Fades dur={dur} fadeIn={0} fadeOut={3} />
      </AbsoluteFill>
    );
  }
  const villainAt = sec(8), mapAt = sec(18), healAt = sec(30);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence durationInFrames={villainAt}>
        <Backdrop id="greatboard" t0={15} zoom={[1.02, 1.16]} dur={villainAt} />
        <Motes count={20} colors={[C.gold, "#ffe9a0"]} />
        <Caption from={10} to={villainAt} style={{ top: 90 }} size={76}>
          Once, every world stood on
          <br />
          <span style={{ color: C.gold }}>one Great Board.</span>
        </Caption>
      </Sequence>
      <Sequence from={villainAt} durationInFrames={mapAt - villainAt}>
        <Villain len={mapAt - villainAt} crackAt={mapAt - villainAt - 36} />
        <Caption from={20} to={mapAt - villainAt - 30} style={{ bottom: 70 }} size={80}>
          Then <span style={{ color: C.violet }}>Grandmaster X</span> broke it.
        </Caption>
      </Sequence>
      <Sequence from={mapAt}>
        <WorldMap
          len={dur - mapAt}
          pan={[0, -240]}
          heal={{
            trainingcamp: [healAt - mapAt + 10, healAt - mapAt + 70],
            slantedsands: [healAt - mapAt + 40, healAt - mapAt + 110],
            ironkeep: [healAt - mapAt + 80, healAt - mapAt + 150],
            mistymoors: [healAt - mapAt + 110, healAt - mapAt + 190],
          }}
        />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #080611cc, transparent 30%, transparent 70%, #080611aa)" }} />
        <Caption from={14} to={sec(6)} style={{ top: 80 }} size={80}>
          Eleven worlds, torn apart.
        </Caption>
        <Caption from={sec(6)} to={healAt - mapAt} style={{ top: 80 }} size={80}>
          Four fragments, <span style={{ color: C.mint }}>scattered.</span>
        </Caption>
        <Sequence from={sec(6)} durationInFrames={healAt - mapAt - sec(6)}>
          <Fragments from={10} />
        </Sequence>
        <Caption from={healAt - mapAt + 6} to={dur - mapAt} style={{ top: 80 }} size={68} color={C.gold}>
          Win them back, one world at a time.
        </Caption>
      </Sequence>
      <Grade />
      <Fades dur={dur} fadeIn={6} fadeOut={10} />
    </AbsoluteFill>
  );
};
