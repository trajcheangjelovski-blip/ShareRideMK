// Stylised map of North Macedonia's intercity network. City positions are the
// real coordinates from supabase/seed.sql, projected (equirectangular with a
// cos(lat) correction), so the shape is geographically true.

const CITIES: Record<string, [lat: number, lng: number]> = {
  Скопје: [41.9981, 21.4254], Велес: [41.7172, 21.7758], Куманово: [42.1322, 21.7144],
  Тетово: [42.0106, 20.9714], Гостивар: [41.7967, 20.9089], Охрид: [41.1231, 20.8016],
  Битола: [41.0297, 21.3292], Прилеп: [41.3464, 21.555], Штип: [41.7459, 22.1958],
  Кочани: [41.9167, 22.4122], Струмица: [41.4378, 22.6433], Кавадарци: [41.4331, 22.0117],
  Неготино: [41.4828, 22.0894], Гевгелија: [41.1417, 22.5025], Струга: [41.1775, 20.6781],
  Ресен: [41.0894, 21.0117], Кичево: [41.5142, 20.9631], Дебар: [41.5247, 20.5275],
  Радовиш: [41.6383, 22.4642], "Свети Николе": [41.8669, 21.9436], Делчево: [41.9678, 22.7747],
  Берово: [41.7072, 22.8569],
};

const ROADS: [string, string][] = [
  ["Скопје", "Тетово"], ["Тетово", "Гостивар"], ["Гостивар", "Кичево"], ["Кичево", "Охрид"],
  ["Охрид", "Струга"], ["Гостивар", "Дебар"], ["Дебар", "Струга"], ["Охрид", "Ресен"],
  ["Ресен", "Битола"], ["Битола", "Прилеп"], ["Прилеп", "Велес"], ["Велес", "Скопје"],
  ["Скопје", "Куманово"], ["Велес", "Штип"], ["Штип", "Кочани"], ["Кочани", "Делчево"],
  ["Делчево", "Берово"], ["Штип", "Радовиш"], ["Радовиш", "Струмица"], ["Велес", "Неготино"],
  ["Неготино", "Гевгелија"], ["Неготино", "Кавадарци"], ["Кавадарци", "Прилеп"],
  ["Велес", "Свети Николе"], ["Свети Николе", "Штип"], ["Струмица", "Гевгелија"], ["Куманово", "Свети Николе"],
];

// The animated ride: Skopje to Ohrid over Pelagonia.
const RIDE = ["Скопје", "Велес", "Прилеп", "Битола", "Ресен", "Охрид"];

// Labelled cities and which side of the dot the label sits on.
const LABELS: Record<string, "r" | "l" | "t" | "b"> = {
  Скопје: "t", Тетово: "l", Куманово: "r", Велес: "r", Штип: "r", Прилеп: "r",
  Битола: "b", Охрид: "l", Струмица: "r", Гевгелија: "b", Кочани: "r",
};

const W = 520, H = 350, PAD = 28;
const K = Math.cos((41.6 * Math.PI) / 180);
const lngs = Object.values(CITIES).map((c) => c[1]);
const lats = Object.values(CITIES).map((c) => c[0]);
const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const S = Math.min((W - 2 * PAD) / ((maxLng - minLng) * K), (H - 2 * PAD) / (maxLat - minLat));
const OX = (W - (maxLng - minLng) * K * S) / 2, OY = (H - (maxLat - minLat) * S) / 2;

function xy(name: string): [number, number] {
  const [lat, lng] = CITIES[name];
  return [OX + (lng - minLng) * K * S, OY + (maxLat - lat) * S];
}

// Gentle curve between two cities (deterministic bend so roads look organic).
function road(a: string, b: string, i: number) {
  const [x1, y1] = xy(a), [x2, y2] = xy(b);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const bend = ((i % 3) - 1) * 0.12 * len;
  const cx = mx - ((y2 - y1) / len) * bend, cy = my + ((x2 - x1) / len) * bend;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

const ridePath = RIDE.map((c, i) => `${i === 0 ? "M" : "L"}${xy(c).map((n) => n.toFixed(1)).join(",")}`).join(" ");

export function RouteNetwork({ className, id = "rn" }: { className?: string; id?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Мапа на меѓуградски рути низ Македонија">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-ride`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0ea5a4" />
          <stop offset="100%" stopColor="#155e75" />
        </linearGradient>
      </defs>

      {/* road network */}
      <g fill="none" stroke="#0f766e" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round">
        {ROADS.map(([a, b], i) => <path key={`${a}-${b}`} d={road(a, b, i)} />)}
      </g>

      {/* highlighted ride */}
      <path d={ridePath} fill="none" stroke={`url(#${id}-ride)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
      <path d={ridePath} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" className="route-dash" />

      {/* cities */}
      {Object.keys(CITIES).map((name) => {
        const [x, y] = xy(name);
        const big = name === "Скопје";
        const onRide = RIDE.includes(name);
        return (
          <g key={name}>
            <circle cx={x} cy={y} r={big ? 7 : onRide ? 5 : 3.5} fill="#fff" stroke={onRide ? "#0f766e" : "#5eead4"} strokeWidth={onRide ? 3 : 2} />
          </g>
        );
      })}
      <g fontSize="12.5" fontWeight="600" fill="#0b1f2a" fillOpacity="0.75" style={{ fontFamily: "var(--font-sans)" }}>
        {Object.entries(LABELS).map(([name, side]) => {
          const [x, y] = xy(name);
          const pos = { r: [x + 10, y + 4, "start"], l: [x - 10, y + 4, "end"], t: [x, y - 13, "middle"], b: [x, y + 21, "middle"] }[side];
          return (
            <text key={name} x={pos[0]} y={pos[1]} textAnchor={pos[2] as "start" | "end" | "middle"} paintOrder="stroke" stroke="#fff" strokeWidth="4" strokeLinejoin="round">
              {name}
            </text>
          );
        })}
      </g>

      {/* moving car */}
      <g className="motion-car">
        <circle r="16" fill={`url(#${id}-glow)`}>
          <animateMotion dur="9s" repeatCount="indefinite" path={ridePath} rotate="auto" />
        </circle>
        <circle r="6.5" fill="#f59e0b" stroke="#fff" strokeWidth="3">
          <animateMotion dur="9s" repeatCount="indefinite" path={ridePath} rotate="auto" />
        </circle>
      </g>
    </svg>
  );
}
