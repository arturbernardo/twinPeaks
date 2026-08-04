// Núcleo do produto: scores transparentes e auditáveis.
// Força = (s + 1) / (n + 3) — média posterior de uma Beta(1,2): prior neutro em 1/3,
// converge para a razão simples conforme as evidências acumulam. Cada número é
// rastreável às histórias que o sustentam.

import {
  getActiveEmployees,
  getEvidenceFor,
  getStoriesFor,
  type Employee,
  type Source,
  type Story,
  type TagEvidence,
} from "./db";
import { ARCHETYPE_BY_ID, TAGS, type TagId } from "./taxonomy";

export const SOURCE_WEIGHTS: Record<Source, number> = {
  manager: 1.5,
  peer: 1.0,
  self: 0.5,
};

export const PRIOR = 1 / 3;

export interface TagScore {
  tagId: TagId;
  strength: number;
  supportingStories: number;
  totalStories: number;
  bySource: Record<Source, number>; // nº de histórias de cada fonte que sustentam a tag
  confidenceLabel: "sem evidência" | "emergente" | "sustentada" | "forte";
  evidence: TagEvidence[];
}

export function confidenceLabel(count: number): TagScore["confidenceLabel"] {
  if (count === 0) return "sem evidência";
  if (count === 1) return "emergente";
  if (count <= 3) return "sustentada";
  return "forte";
}

function computeScores(stories: Story[], evidence: TagEvidence[]): TagScore[] {
  const n = stories.reduce((acc, s) => acc + SOURCE_WEIGHTS[s.source], 0);
  const storyById = new Map(stories.map((s) => [s.id, s]));

  return TAGS.map((tag) => {
    // Por história, conta no máximo uma evidência da tag (a de maior confidence).
    const byStory = new Map<string, TagEvidence>();
    for (const ev of evidence) {
      if (ev.tagId !== tag.id) continue;
      const story = storyById.get(ev.storyId);
      if (!story) continue;
      const cur = byStory.get(ev.storyId);
      if (!cur || ev.confidence > cur.confidence) byStory.set(ev.storyId, ev);
    }
    let s = 0;
    const bySource: Record<Source, number> = { self: 0, peer: 0, manager: 0 };
    for (const [storyId, ev] of byStory) {
      const story = storyById.get(storyId)!;
      s += SOURCE_WEIGHTS[story.source] * ev.confidence;
      bySource[story.source]++;
    }
    return {
      tagId: tag.id,
      strength: (s + 1) / (n + 3),
      supportingStories: byStory.size,
      totalStories: stories.length,
      bySource,
      confidenceLabel: confidenceLabel(byStory.size),
      evidence: [...byStory.values()],
    };
  });
}

export function scoresFor(subjectId: string, sources?: Source[]): TagScore[] {
  let stories = getStoriesFor(subjectId);
  if (sources) stories = stories.filter((s) => sources.includes(s.source));
  const storyIds = new Set(stories.map((s) => s.id));
  const evidence = getEvidenceFor(subjectId).filter((e) => storyIds.has(e.storyId));
  return computeScores(stories, evidence);
}

export function vectorFor(subjectId: string): Record<TagId, number> {
  return Object.fromEntries(
    scoresFor(subjectId).map((s) => [s.tagId, s.strength])
  ) as Record<TagId, number>;
}

// ---------- Divergência (Janela de Johari) ----------

export interface Divergence {
  tagId: TagId;
  strengthSelf: number;
  strengthOthers: number;
  delta: number; // outros − self
  kind: "blind_spot" | "self_gap";
}

const DIVERGENCE_THRESHOLD = 0.22;

/** Requer ≥1 história self e ≥2 de outros para não reportar ruído. */
export function divergencesFor(subjectId: string): Divergence[] {
  const stories = getStoriesFor(subjectId);
  const selfCount = stories.filter((s) => s.source === "self").length;
  const otherCount = stories.length - selfCount;
  if (selfCount < 1 || otherCount < 2) return [];

  const selfScores = scoresFor(subjectId, ["self"]);
  const otherScores = scoresFor(subjectId, ["peer", "manager"]);
  const out: Divergence[] = [];
  for (const tag of TAGS) {
    const s = selfScores.find((x) => x.tagId === tag.id)!;
    const o = otherScores.find((x) => x.tagId === tag.id)!;
    const delta = o.strength - s.strength;
    // Só reporta se o lado "forte" tem evidência real (não é só efeito do prior).
    if (delta >= DIVERGENCE_THRESHOLD && o.supportingStories >= 2) {
      out.push({ tagId: tag.id, strengthSelf: s.strength, strengthOthers: o.strength, delta, kind: "blind_spot" });
    } else if (delta <= -DIVERGENCE_THRESHOLD && s.supportingStories >= 1) {
      out.push({ tagId: tag.id, strengthSelf: s.strength, strengthOthers: o.strength, delta, kind: "self_gap" });
    }
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// ---------- Outliers ----------

export interface Outlier {
  employee: Employee;
  distance: number; // norma L2 do desvio vs. média do grupo
  drivingTags: { tagId: TagId; deviation: number }[]; // o que a pessoa tem que o grupo não tem
}

export function findOutliers(scope: "company" | string, topK = 3): Outlier[] {
  const employees =
    scope === "company" ? getActiveEmployees() : getActiveEmployees().filter((e) => e.teamId === scope);
  if (employees.length < 3) return [];

  const vectors = new Map(employees.map((e) => [e.id, vectorFor(e.id)]));
  const mean: Record<string, number> = {};
  for (const tag of TAGS) {
    mean[tag.id] =
      employees.reduce((acc, e) => acc + vectors.get(e.id)![tag.id], 0) / employees.length;
  }

  const outliers = employees.map((e) => {
    const v = vectors.get(e.id)!;
    const deviations = TAGS.map((tag) => ({ tagId: tag.id, deviation: v[tag.id] - mean[tag.id] }));
    const distance = Math.sqrt(deviations.reduce((acc, d) => acc + d.deviation ** 2, 0));
    const drivingTags = deviations
      .filter((d) => d.deviation > 0.05)
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 4);
    return { employee: e, distance, drivingTags };
  });
  return outliers.sort((a, b) => b.distance - a.distance).slice(0, topK);
}

// ---------- Gap analysis vs. arquétipo ----------

export interface GapItem {
  tagId: TagId;
  target: number;
  teamMax: number;
  teamMean: number;
  status: "covered" | "partial" | "missing";
  closest: { employee: Employee; strength: number } | null;
}

export function gapAnalysis(scope: "company" | string, archetypeId: string): GapItem[] | null {
  const archetype = ARCHETYPE_BY_ID[archetypeId];
  if (!archetype) return null;
  const employees =
    scope === "company" ? getActiveEmployees() : getActiveEmployees().filter((e) => e.teamId === scope);
  if (employees.length === 0) return [];
  const vectors = new Map(employees.map((e) => [e.id, vectorFor(e.id)]));

  return Object.entries(archetype.targets)
    .map(([tagId, target]) => {
      const strengths = employees.map((e) => ({ employee: e, strength: vectors.get(e.id)![tagId as TagId] }));
      strengths.sort((a, b) => b.strength - a.strength);
      const teamMax = strengths[0]?.strength ?? 0;
      const teamMean = strengths.reduce((acc, s) => acc + s.strength, 0) / strengths.length;
      const status: GapItem["status"] =
        teamMax >= target! ? "covered" : teamMax >= target! - 0.07 ? "partial" : "missing";
      return { tagId: tagId as TagId, target: target!, teamMax, teamMean, status, closest: strengths[0] ?? null };
    })
    .sort((a, b) => a.teamMax - a.target - (b.teamMax - b.target));
}

// ---------- Perfil agregado de time/empresa ----------

export interface TeamTagAggregate {
  tagId: TagId;
  mean: number;
  max: number;
  top: { employee: Employee; strength: number } | null;
}

export function teamProfile(scope: "company" | string): TeamTagAggregate[] {
  const employees =
    scope === "company" ? getActiveEmployees() : getActiveEmployees().filter((e) => e.teamId === scope);
  if (employees.length === 0) return [];
  const vectors = new Map(employees.map((e) => [e.id, vectorFor(e.id)]));
  return TAGS.map((tag) => {
    const strengths = employees
      .map((e) => ({ employee: e, strength: vectors.get(e.id)![tag.id] }))
      .sort((a, b) => b.strength - a.strength);
    return {
      tagId: tag.id,
      mean: strengths.reduce((acc, s) => acc + s.strength, 0) / strengths.length,
      max: strengths[0].strength,
      top: strengths[0] ?? null,
    };
  }).sort((a, b) => b.mean - a.mean);
}

// ---------- Montagem de time ----------

export interface TeamPick {
  employee: Employee;
  rationale: { tagId: TagId; strength: number; raisedCoverage: boolean }[];
}

export function composeTeam(
  requiredTags: TagId[],
  size: number,
  excludeTeam?: string
): TeamPick[] {
  let pool = getActiveEmployees();
  if (excludeTeam) pool = pool.filter((e) => e.teamId !== excludeTeam);
  const vectors = new Map(pool.map((e) => [e.id, vectorFor(e.id)]));

  const picks: TeamPick[] = [];
  const coverage: Partial<Record<TagId, number>> = {};
  const picked = new Set<string>();

  for (let i = 0; i < size && picks.length < pool.length; i++) {
    let best: { e: Employee; gain: number; total: number } | null = null;
    for (const e of pool) {
      if (picked.has(e.id)) continue;
      const v = vectors.get(e.id)!;
      const gain = requiredTags.reduce(
        (acc, t) => acc + Math.max(0, v[t] - (coverage[t] ?? 0)),
        0
      );
      const total = requiredTags.reduce((acc, t) => acc + v[t], 0);
      if (!best || gain > best.gain || (gain === best.gain && total > best.total)) {
        best = { e, gain, total };
      }
    }
    if (!best) break;
    picked.add(best.e.id);
    const v = vectors.get(best.e.id)!;
    picks.push({
      employee: best.e,
      rationale: requiredTags.map((t) => ({
        tagId: t,
        strength: v[t],
        raisedCoverage: v[t] > (coverage[t] ?? 0),
      })),
    });
    for (const t of requiredTags) coverage[t] = Math.max(coverage[t] ?? 0, v[t]);
  }
  return picks;
}
