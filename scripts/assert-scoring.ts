// Valida que as narrativas plantadas emergem dos dados reais (roda após build-data).
// Uso: npx tsx scripts/assert-scoring.ts

import { composeTeam, divergencesFor, findOutliers, gapAnalysis, scoresFor } from "../lib/scoring";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// 1. Outlier: Helena Fontes é a nº 1 em Vendas e aparece no top-3 da empresa
const vendasOutliers = findOutliers("vendas", 3);
check(
  "Helena é a outlier nº 1 de Vendas",
  vendasOutliers[0]?.employee.id === "helena-fontes",
  vendasOutliers.map((o) => `${o.employee.id}:${o.distance.toFixed(2)}`).join(", ")
);
const companyOutliers = findOutliers("company", 3);
check(
  "Helena está no top-3 de outliers da empresa",
  companyOutliers.some((o) => o.employee.id === "helena-fontes"),
  companyOutliers.map((o) => `${o.employee.id}:${o.distance.toFixed(2)}`).join(", ")
);

// 2. Lacuna: Engenharia não cobre customer_focus nem creative_innovation no arquétipo startup
const gaps = gapAnalysis("eng", "startup")!;
for (const tag of ["customer_focus", "creative_innovation"] as const) {
  const item = gaps.find((g) => g.tagId === tag);
  check(
    `Engenharia tem lacuna em ${tag} (startup)`,
    item?.status === "missing" || item?.status === "partial",
    `status=${item?.status}, teamMax=${item?.teamMax.toFixed(2)}, alvo=${item?.target}`
  );
}

// 3. Divergência do Rafael: pares veem diplomacy (ponto cego), self alega healthy_conflict
const div = divergencesFor("rafael-siqueira");
check(
  "Rafael: diplomacy é ponto cego (outros >> self)",
  div.some((d) => d.tagId === "diplomacy" && d.kind === "blind_spot"),
  div.map((d) => `${d.tagId}:${d.kind}:${d.delta.toFixed(2)}`).join(", ") || "nenhuma divergência"
);
check(
  "Rafael: healthy_conflict é gap de autopercepção (self >> outros)",
  div.some((d) => d.tagId === "healthy_conflict" && d.kind === "self_gap")
);

// 4. Montar time de diplomatas acha os plantados
const DIPLOMATS = new Set([
  "rafael-siqueira", "marina-duarte", "felipe-armond", "otavio-neves", "carolina-freire", "tania-quintela",
]);
const picks = composeTeam(["diplomacy"], 5);
const hits = picks.filter((p) => DIPLOMATS.has(p.employee.id)).length;
check(
  "composeTeam(diplomacy) escolhe ≥4 dos 6 diplomatas plantados",
  hits >= 4,
  picks.map((p) => p.employee.id).join(", ")
);

// 5. Sanidade dos scores da Helena
const helena = scoresFor("helena-fontes");
const mentorship = helena.find((s) => s.tagId === "mentorship")!;
check(
  "Helena: mentorship forte (>0.45, ≥3 histórias)",
  mentorship.strength > 0.45 && mentorship.supportingStories >= 3,
  `força=${mentorship.strength.toFixed(2)}, histórias=${mentorship.supportingStories}/${mentorship.totalStories}`
);

console.log(failures === 0 ? "\nTudo verde 🎉" : `\n${failures} asserções falharam`);
process.exit(failures === 0 ? 0 : 1);
