// Grafo social da cultura: cada história peer/manager é uma aresta autor → sujeito.
// Restrição de anonimato (promessa do produto: autoria anônima no perfil): arestas são
// agregadas por setor; no nível individual expomos apenas grau de entrada — quantos
// autores/setores distintos observam a pessoa, nunca quem escreveu sobre quem.
// Histórias live (authorId null) ficam de fora das arestas por não terem autor conhecido.

import { getActiveEmployees, getEmployees, getStories, type Employee } from "./db";

export interface GroupEdge {
  fromTeamId: string; // setor do autor
  toTeamId: string; // setor do sujeito
  stories: number;
}

export interface EchoChamber {
  teamId: string;
  internal: number; // histórias sobre o setor escritas pelo próprio setor
  total: number; // todas as histórias peer/manager sobre o setor
  internalRatio: number;
}

export interface PersonVisibility {
  employee: Employee;
  distinctAuthors: number; // autores distintos que já escreveram sobre a pessoa
  observedByTeams: string[]; // setores distintos de onde vêm os autores
  externalTeams: string[]; // observedByTeams sem o próprio setor da pessoa
}

export interface Reciprocity {
  teamA: string;
  teamB: string;
  aAboutB: number;
  bAboutA: number;
}

export interface CultureGraph {
  edges: GroupEdge[];
  echoChambers: EchoChamber[];
  visibility: PersonVisibility[]; // todas as pessoas ativas, com seu grau de entrada
  bridges: PersonVisibility[]; // observadas por ≥2 setores além do próprio
  onlyInternal: PersonVisibility[]; // nunca observadas de fora do próprio setor
  lowVisibility: PersonVisibility[]; // ≤1 autor distinto — onde o gêmeo está cego
  reciprocity: Reciprocity[]; // pares de setores com fluxo em cada direção
}

// Grafo pessoa-a-pessoa SEM direção: aresta = nº de histórias conectando o par
// (em qualquer direção). Não expõe quem escreveu sobre quem — a direção é descartada
// na agregação, preservando o anonimato de autoria prometido no perfil.
export interface PersonNode {
  id: string;
  name: string;
  role: string;
  teamId: string;
  status: Employee["status"];
  storiesCount: number; // histórias em que a pessoa participa (como autor ou sujeito)
}

export interface PersonLink {
  source: string;
  target: string;
  stories: number;
}

export function buildPersonGraph(): { nodes: PersonNode[]; links: PersonLink[] } {
  const byId = new Map(getEmployees().map((e) => [e.id, e]));
  const stories = getStories().filter(
    (s) =>
      s.source !== "self" &&
      s.authorId &&
      s.authorId !== s.subjectId &&
      byId.has(s.authorId) &&
      byId.has(s.subjectId)
  );

  const pairCount = new Map<string, number>();
  const involvement = new Map<string, number>();
  for (const s of stories) {
    const key = [s.authorId!, s.subjectId].sort().join("|");
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    involvement.set(s.authorId!, (involvement.get(s.authorId!) ?? 0) + 1);
    involvement.set(s.subjectId, (involvement.get(s.subjectId) ?? 0) + 1);
  }

  const links: PersonLink[] = [...pairCount.entries()].map(([key, stories]) => {
    const [source, target] = key.split("|");
    return { source, target, stories };
  });

  const nodes: PersonNode[] = [...new Set(links.flatMap((l) => [l.source, l.target]))].map((id) => {
    const e = byId.get(id)!;
    return {
      id,
      name: e.name,
      role: e.role,
      teamId: e.teamId,
      status: e.status,
      storiesCount: involvement.get(id) ?? 0,
    };
  });

  return { nodes, links };
}

export function buildCultureGraph(): CultureGraph {
  const byId = new Map(getEmployees().map((e) => [e.id, e]));
  const stories = getStories().filter(
    (s) => s.source !== "self" && s.authorId && byId.has(s.authorId) && byId.has(s.subjectId)
  );

  const edgeCount = new Map<string, number>();
  const authorsBySubject = new Map<string, Set<string>>();
  const teamsBySubject = new Map<string, Set<string>>();

  for (const s of stories) {
    const author = byId.get(s.authorId!)!;
    const subject = byId.get(s.subjectId)!;
    const key = `${author.teamId}→${subject.teamId}`;
    edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);

    if (!authorsBySubject.has(s.subjectId)) authorsBySubject.set(s.subjectId, new Set());
    authorsBySubject.get(s.subjectId)!.add(author.id);
    if (!teamsBySubject.has(s.subjectId)) teamsBySubject.set(s.subjectId, new Set());
    teamsBySubject.get(s.subjectId)!.add(author.teamId);
  }

  const edges: GroupEdge[] = [...edgeCount.entries()].map(([key, stories]) => {
    const [fromTeamId, toTeamId] = key.split("→");
    return { fromTeamId, toTeamId, stories };
  });

  const inbound = new Map<string, { internal: number; total: number }>();
  for (const e of edges) {
    const acc = inbound.get(e.toTeamId) ?? { internal: 0, total: 0 };
    acc.total += e.stories;
    if (e.fromTeamId === e.toTeamId) acc.internal += e.stories;
    inbound.set(e.toTeamId, acc);
  }
  const echoChambers: EchoChamber[] = [...inbound.entries()]
    .map(([teamId, { internal, total }]) => ({ teamId, internal, total, internalRatio: internal / total }))
    .sort((a, b) => b.internalRatio - a.internalRatio);

  const visibility: PersonVisibility[] = getActiveEmployees().map((employee) => {
    const observedByTeams = [...(teamsBySubject.get(employee.id) ?? [])];
    return {
      employee,
      distinctAuthors: authorsBySubject.get(employee.id)?.size ?? 0,
      observedByTeams,
      externalTeams: observedByTeams.filter((t) => t !== employee.teamId),
    };
  });

  const bridges = visibility
    .filter((v) => v.externalTeams.length >= 2)
    .sort(
      (a, b) => b.externalTeams.length - a.externalTeams.length || b.distinctAuthors - a.distinctAuthors
    );

  const onlyInternal = visibility.filter((v) => v.externalTeams.length === 0);

  const lowVisibility = visibility
    .filter((v) => v.distinctAuthors <= 1)
    .sort((a, b) => a.distinctAuthors - b.distinctAuthors);

  const reciprocity: Reciprocity[] = [];
  const teams = [...new Set(edges.flatMap((e) => [e.fromTeamId, e.toTeamId]))].sort();
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const aAboutB = edgeCount.get(`${teams[i]}→${teams[j]}`) ?? 0;
      const bAboutA = edgeCount.get(`${teams[j]}→${teams[i]}`) ?? 0;
      if (aAboutB + bAboutA > 0) {
        reciprocity.push({ teamA: teams[i], teamB: teams[j], aAboutB, bAboutA });
      }
    }
  }

  return { edges, echoChambers, visibility, bridges, onlyInternal, lowVisibility, reciprocity };
}
