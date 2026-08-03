// Camada de dados: JSON commitado em data/ + arquivos "live" para submissões do demo.
// Dados minúsculos (~36 pessoas, ~250 histórias) — ler do disco a cada request é barato
// e garante que submissões ao vivo apareçam imediatamente em todas as páginas.

import fs from "node:fs";
import path from "node:path";
import type { TagId } from "./taxonomy";

export type Source = "self" | "peer" | "manager";

export interface Team {
  id: string;
  name: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  teamId: string;
  seniority: string;
}

export interface Story {
  id: string;
  subjectId: string;
  authorId: string | null;
  source: Source;
  text: string;
  createdAt: string;
}

export interface TagEvidence {
  id: string;
  storyId: string;
  subjectId: string;
  tagId: TagId;
  quote: string;
  confidence: number;
}

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string, fallback: T): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

export function getTeams(): Team[] {
  return readJson<{ teams: Team[] }>("company.json", { teams: [] }).teams;
}

export function getEmployees(): Employee[] {
  return readJson<{ employees: Employee[] }>("company.json", { employees: [] }).employees;
}

export function getStories(): Story[] {
  return [
    ...readJson<Story[]>("stories.json", []),
    ...readJson<Story[]>("live-stories.json", []),
  ];
}

export function getEvidence(): TagEvidence[] {
  return [
    ...readJson<TagEvidence[]>("evidence.json", []),
    ...readJson<TagEvidence[]>("live-evidence.json", []),
  ];
}

export function getEmployee(id: string): Employee | undefined {
  return getEmployees().find((e) => e.id === id);
}

export function getTeam(id: string): Team | undefined {
  return getTeams().find((t) => t.id === id);
}

export function getStoriesFor(subjectId: string): Story[] {
  return getStories().filter((s) => s.subjectId === subjectId);
}

export function getEvidenceFor(subjectId: string): TagEvidence[] {
  return getEvidence().filter((e) => e.subjectId === subjectId);
}

// Persistência das submissões ao vivo (form /submit e modo entrevistador do chat).
export function addLiveStory(story: Story, evidence: TagEvidence[]): void {
  const stories = readJson<Story[]>("live-stories.json", []);
  stories.push(story);
  fs.writeFileSync(path.join(DATA_DIR, "live-stories.json"), JSON.stringify(stories, null, 2));

  const all = readJson<TagEvidence[]>("live-evidence.json", []);
  all.push(...evidence);
  fs.writeFileSync(path.join(DATA_DIR, "live-evidence.json"), JSON.stringify(all, null, 2));
}
