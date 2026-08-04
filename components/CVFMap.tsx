import { TEAM_PALETTE } from "@/lib/palette";

export interface CVFPointData {
  teamIndex: number;
  teamName: string;
  x: number;
  y: number;
  dominant: string | null;
}

export interface CVFCentroidData {
  teamIndex: number;
  teamName: string;
  x: number;
  y: number;
}

// Classes estáticas (o JIT do Tailwind só gera o que está literal no código);
// mesma paleta validada de lib/palette.ts, na mesma ordem de setores.
const TEAM_FILL = [
  "fill-[#7c3aed] dark:fill-[#8b5cf6]",
  "fill-[#0ea5e9] dark:fill-[#0284c7]",
  "fill-[#f59e0b] dark:fill-[#c98500]",
  "fill-[#10b981] dark:fill-[#059669]",
  "fill-[#e11d48] dark:fill-[#e34948]",
];

const SIZE = 560;
const MARGIN = 64;
const HALF = SIZE / 2;
const PLOT = HALF - MARGIN;

// Mapa CVF (Cameron & Quinn): pontos anônimos no plano interno↔externo ×
// flexibilidade↔estabilidade. Server-rendered; tinta do chrome via CSS vars
// para acompanhar o tema.
export function CVFMap({
  points,
  centroids,
  company,
  teams,
}: {
  points: CVFPointData[];
  centroids: CVFCentroidData[];
  company: { x: number; y: number };
  teams: { id: string; name: string }[];
}) {
  const extent =
    Math.max(...points.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))), 0.05) * 1.25;
  const sx = (x: number) => HALF + (x / extent) * PLOT;
  const sy = (y: number) => HALF - (y / extent) * PLOT;

  const ink = { fill: "var(--muted-foreground)" };
  const line = { stroke: "var(--border)" };

  const quadrantLabel = (qx: number, qy: number, name: string, motto: string, anchor: "start" | "end") => (
    <text x={qx} y={qy} textAnchor={anchor} className="text-[13px] font-medium" style={ink}>
      {name} <tspan className="text-[11px] font-normal">· {motto}</tspan>
    </text>
  );

  return (
    <div>
      <div className="mx-auto max-w-[560px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full">
          {/* eixos */}
          <line x1={MARGIN} y1={HALF} x2={SIZE - MARGIN} y2={HALF} style={line} />
          <line x1={HALF} y1={MARGIN} x2={HALF} y2={SIZE - MARGIN} style={line} />
          <rect x={MARGIN} y={MARGIN} width={SIZE - 2 * MARGIN} height={SIZE - 2 * MARGIN} fill="none" style={line} rx={8} />

          {/* quadrantes */}
          {quadrantLabel(MARGIN + 8, MARGIN - 10, "Clan", "Collaborate", "start")}
          {quadrantLabel(SIZE - MARGIN - 8, MARGIN - 10, "Adhocracy", "Create", "end")}
          {quadrantLabel(MARGIN + 8, SIZE - MARGIN + 20, "Hierarchy", "Control", "start")}
          {quadrantLabel(SIZE - MARGIN - 8, SIZE - MARGIN + 20, "Market", "Compete", "end")}

          {/* rótulos dos eixos */}
          <text x={HALF} y={MARGIN - 34} textAnchor="middle" className="text-[11px]" style={ink}>
            flexibility
          </text>
          <text x={HALF} y={SIZE - MARGIN + 44} textAnchor="middle" className="text-[11px]" style={ink}>
            stability
          </text>
          <text x={MARGIN - 12} y={HALF} textAnchor="middle" className="text-[11px]" style={ink} transform={`rotate(-90 ${MARGIN - 12} ${HALF})`}>
            internal focus
          </text>
          <text x={SIZE - MARGIN + 12} y={HALF} textAnchor="middle" className="text-[11px]" style={ink} transform={`rotate(90 ${SIZE - MARGIN + 12} ${HALF})`}>
            external focus
          </text>

          {/* pontos anônimos */}
          {points.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={5} className={`${TEAM_FILL[p.teamIndex]} opacity-80`}>
              <title>
                {p.teamName}
                {p.dominant ? ` · leans ${p.dominant}` : " · no evidence yet"}
              </title>
            </circle>
          ))}

          {/* centróides por setor */}
          {centroids.map((c) => (
            <circle
              key={c.teamIndex}
              cx={sx(c.x)}
              cy={sy(c.y)}
              r={9}
              className={TEAM_FILL[c.teamIndex]}
              style={{ stroke: "var(--background)", strokeWidth: 2.5 }}
            >
              <title>{c.teamName} centroid</title>
            </circle>
          ))}

          {/* centróide da empresa */}
          <g style={{ stroke: "var(--foreground)", strokeWidth: 2 }}>
            <line x1={sx(company.x) - 7} y1={sy(company.y) - 7} x2={sx(company.x) + 7} y2={sy(company.y) + 7} />
            <line x1={sx(company.x) - 7} y1={sy(company.y) + 7} x2={sx(company.x) + 7} y2={sy(company.y) - 7} />
            <title>Company centroid</title>
          </g>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {teams.map((t, i) => (
          <span key={t.id} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full dark:hidden" style={{ backgroundColor: TEAM_PALETTE.light[i] }} />
            <span className="hidden h-2.5 w-2.5 rounded-full dark:inline-block" style={{ backgroundColor: TEAM_PALETTE.dark[i] }} />
            {t.name}
          </span>
        ))}
        <span className="ml-auto">small dot = one person (anonymous) · large ring = department centroid · ✕ = company</span>
      </div>
    </div>
  );
}
