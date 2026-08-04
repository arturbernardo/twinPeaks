// Hand-written persona sheet — source of truth for the fictional company "Lumina"
// (B2B SaaS, ~36 people). The demo narratives are planted here:
//   • OUTLIER: helena-fontes (Sales) — mentor/psychological safety in an energy+results team
//   • GAP: Engineering lacks customer_focus/creative_innovation (gap vs. the startup archetype)
//   • DIVERGENCE: rafael-siqueira sees himself as "healthy conflict", peers see "diplomacy"
//   • DIPLOMATS: 6 people across teams strong in diplomacy (team-assembly query)
//   • LIFECYCLE: tomas-ribeiro resigned, luana-cardoso was terminated, felipe-armond came from Engineering

import type { TagId } from "../lib/taxonomy";
import type { EmployeeStatus, RoleHistory } from "../lib/db";

export interface Persona {
  id: string;
  name: string;
  role: string;
  teamId: string;
  seniority: "junior" | "mid-level" | "senior" | "leadership";
  startDate: string; // "YYYY-MM"
  status?: EmployeeStatus; // default: "active"
  endDate?: string; // when resigned/terminated
  previousRoles?: RoleHistory[];
  tags: TagId[]; // dominant tags that peer/manager stories should evidence
  selfClaim?: TagId; // tag the person claims about themselves (for the divergence case)
  note?: string; // extra instruction for the story generator
}

export const TEAMS = [
  { id: "eng", name: "Engineering", description: "Builds and operates the Lumina platform." },
  { id: "produto", name: "Product & Design", description: "Discovers and designs what is worth building." },
  { id: "vendas", name: "Sales", description: "Brings Lumina to new customers." },
  { id: "cs", name: "Customer Success", description: "Ensures customers succeed and renew." },
  { id: "ops", name: "Operations", description: "Finance, people, legal and everything that keeps the company running." },
];

// Teams (squads) within each department. Department heads belong to no squad (squadId null).
export const SQUADS = [
  { id: "eng-plataforma", name: "Platform & Reliability", teamId: "eng" },
  { id: "eng-produto-core", name: "Core Product", teamId: "eng" },
  { id: "produto-pm", name: "Product Management", teamId: "produto" },
  { id: "produto-design", name: "Design & Research", teamId: "produto" },
  { id: "vendas-enterprise", name: "Enterprise Accounts", teamId: "vendas" },
  { id: "vendas-geracao", name: "Pipeline & Revenue Ops", teamId: "vendas" },
  { id: "cs-sucesso", name: "Customer Success", teamId: "cs" },
  { id: "cs-suporte", name: "Support", teamId: "cs" },
  { id: "ops-financeiro", name: "Finance & Operations", teamId: "ops" },
  { id: "ops-pessoas-juridico", name: "People, Legal & Facilities", teamId: "ops" },
];

export const SQUAD_OF: Record<string, string> = {
  // eng
  "andre-nogueira": "eng-plataforma",
  "bruno-carvalho": "eng-plataforma",
  "renata-luz": "eng-plataforma",
  "paula-vidal": "eng-plataforma",
  "caio-teixeira": "eng-produto-core",
  "marina-duarte": "eng-produto-core",
  "leticia-ramos": "eng-produto-core",
  "diego-fagundes": "eng-produto-core",
  "tomas-ribeiro": "eng-produto-core",
  // produto
  "rafael-siqueira": "produto-pm",
  "joao-prado": "produto-pm",
  "felipe-armond": "produto-pm",
  "gustavo-lins": "produto-design",
  "beatriz-tavares": "produto-design",
  "clara-menezes": "produto-design",
  // vendas
  "helena-fontes": "vendas-enterprise",
  "pedro-galvao": "vendas-enterprise",
  "luana-cardoso": "vendas-enterprise",
  "camila-arruda": "vendas-geracao",
  "mateus-vilela": "vendas-geracao",
  "fernanda-said": "vendas-geracao",
  // cs
  "otavio-neves": "cs-sucesso",
  "aline-serra": "cs-sucesso",
  "natalia-brito": "cs-sucesso",
  "vitor-camargo": "cs-suporte",
  "eduardo-sales": "cs-suporte",
  // ops
  "henrique-dias": "ops-financeiro",
  "lucas-macedo": "ops-financeiro",
  "carolina-freire": "ops-pessoas-juridico",
  "tania-quintela": "ops-pessoas-juridico",
  "rodrigo-antunes": "ops-pessoas-juridico",
};

export const MANAGERS: Record<string, string> = {
  eng: "sofia-brandao",
  produto: "isabela-franco",
  vendas: "ricardo-bastos",
  cs: "juliana-peixoto",
  ops: "patricia-lemos",
};

export const PERSONAS: Persona[] = [
  // ---------- Engineering (10) — strong in execution/quality, WITHOUT customer_focus or creative_innovation ----------
  { id: "sofia-brandao", name: "Sofia Brandão", role: "Engineering Manager", teamId: "eng", seniority: "leadership", startDate: "2021-05", tags: ["facilitation", "trust_building", "accountability"] },
  { id: "marina-duarte", name: "Marina Duarte", role: "Senior Software Engineer", teamId: "eng", seniority: "senior", startDate: "2021-11", previousRoles: [{ role: "Mid-level Software Engineer", from: "2021-11", to: "2023-06" }], tags: ["diplomacy", "execution_reliability", "supportiveness"], note: "diplomat: mediates technical conflicts between colleagues without letting them escalate" },
  { id: "caio-teixeira", name: "Caio Teixeira", role: "Tech Lead", teamId: "eng", seniority: "senior", startDate: "2021-08", previousRoles: [{ role: "Senior Software Engineer", from: "2021-08", to: "2024-01" }], tags: ["critical_evaluation", "accountability", "mentorship"] },
  { id: "bruno-carvalho", name: "Bruno Carvalho", role: "Mid-level Backend Engineer", teamId: "eng", seniority: "mid-level", startDate: "2023-02", tags: ["execution_reliability", "attention_to_detail"] },
  { id: "leticia-ramos", name: "Letícia Ramos", role: "Mid-level Frontend Engineer", teamId: "eng", seniority: "mid-level", startDate: "2023-07", tags: ["attention_to_detail", "supportiveness"] },
  { id: "andre-nogueira", name: "André Nogueira", role: "Senior SRE", teamId: "eng", seniority: "senior", startDate: "2022-03", tags: ["calm_under_pressure", "ownership", "execution_reliability"] },
  { id: "paula-vidal", name: "Paula Vidal", role: "Mid-level Data Engineer", teamId: "eng", seniority: "mid-level", startDate: "2023-09", tags: ["critical_evaluation", "learning_agility"] },
  { id: "diego-fagundes", name: "Diego Fagundes", role: "Junior Backend Engineer", teamId: "eng", seniority: "junior", startDate: "2024-06", previousRoles: [{ role: "Engineering Intern", from: "2024-06", to: "2025-01" }], tags: ["learning_agility", "drive_energy"] },
  { id: "renata-luz", name: "Renata Luz", role: "Senior QA", teamId: "eng", seniority: "senior", startDate: "2022-06", previousRoles: [{ role: "Mid-level QA Analyst", from: "2022-06", to: "2024-03" }], tags: ["attention_to_detail", "accountability"] },
  { id: "tomas-ribeiro", name: "Tomás Ribeiro", role: "Senior Software Engineer", teamId: "eng", seniority: "senior", startDate: "2021-09", status: "resigned", endDate: "2026-06", tags: ["execution_reliability", "results_focus"] },

  // ---------- Product & Design (7) ----------
  { id: "isabela-franco", name: "Isabela Franco", role: "Head of Product", teamId: "produto", seniority: "leadership", startDate: "2021-04", tags: ["results_focus", "critical_evaluation", "healthy_conflict"] },
  { id: "rafael-siqueira", name: "Rafael Siqueira", role: "Senior Product Manager", teamId: "produto", seniority: "senior", startDate: "2022-01", tags: ["diplomacy", "facilitation"], selfClaim: "healthy_conflict", note: "DIVERGENCE: in his self stories he describes himself as picking fights and debating hard (healthy_conflict); in peer/manager stories what shows up is him smoothing things over, working around issues and avoiding direct confrontation (diplomacy)" },
  { id: "gustavo-lins", name: "Gustavo Lins", role: "Senior Product Designer", teamId: "produto", seniority: "senior", startDate: "2022-08", tags: ["creative_innovation", "customer_focus"] },
  { id: "clara-menezes", name: "Clara Menezes", role: "Mid-level UX Researcher", teamId: "produto", seniority: "mid-level", startDate: "2023-05", tags: ["customer_focus", "critical_evaluation", "psych_safety"] },
  { id: "joao-prado", name: "João Prado", role: "Mid-level Product Manager", teamId: "produto", seniority: "mid-level", startDate: "2023-11", previousRoles: [{ role: "Product Analyst", from: "2023-11", to: "2025-02" }], tags: ["ownership", "learning_agility"] },
  { id: "beatriz-tavares", name: "Beatriz Tavares", role: "Junior Product Designer", teamId: "produto", seniority: "junior", startDate: "2025-03", tags: ["creative_innovation", "learning_agility"] },
  { id: "felipe-armond", name: "Felipe Armond", role: "Product Ops", teamId: "produto", seniority: "mid-level", startDate: "2022-05", status: "moved_team", previousRoles: [{ role: "Mid-level Backend Engineer", teamId: "eng", from: "2022-05", to: "2024-08" }], tags: ["attention_to_detail", "diplomacy"], note: "diplomat: defuses tensions between product and engineering (he came from engineering, knows both sides)" },

  // ---------- Sales (7) — dominant culture: energy + results ----------
  { id: "ricardo-bastos", name: "Ricardo Bastos", role: "Head of Sales", teamId: "vendas", seniority: "leadership", startDate: "2021-06", tags: ["drive_energy", "results_focus", "accountability"] },
  { id: "helena-fontes", name: "Helena Fontes", role: "Senior Account Executive", teamId: "vendas", seniority: "senior", startDate: "2021-10", previousRoles: [{ role: "Mid-level Account Executive", from: "2021-10", to: "2023-08" }], tags: ["mentorship", "psych_safety", "facilitation"], note: "Cultural OUTLIER: in an aggressive quota-driven team, she is the one who trains the newcomers, welcomes mistakes and keeps the team organized — the stories should contrast with the surrounding energy/results culture" },
  { id: "camila-arruda", name: "Camila Arruda", role: "SDR", teamId: "vendas", seniority: "junior", startDate: "2025-02", tags: ["drive_energy", "learning_agility"] },
  { id: "pedro-galvao", name: "Pedro Galvão", role: "Mid-level Account Executive", teamId: "vendas", seniority: "mid-level", startDate: "2023-04", tags: ["results_focus", "customer_focus"] },
  { id: "luana-cardoso", name: "Luana Cardoso", role: "Mid-level Account Executive", teamId: "vendas", seniority: "mid-level", startDate: "2022-11", status: "terminated", endDate: "2026-04", tags: ["drive_energy", "results_focus"] },
  { id: "mateus-vilela", name: "Mateus Vilela", role: "SDR", teamId: "vendas", seniority: "junior", startDate: "2024-09", tags: ["drive_energy", "ownership"] },
  { id: "fernanda-said", name: "Fernanda Said", role: "Sales Ops", teamId: "vendas", seniority: "mid-level", startDate: "2022-09", tags: ["attention_to_detail", "execution_reliability"] },

  // ---------- Customer Success (6) ----------
  { id: "juliana-peixoto", name: "Juliana Peixoto", role: "Head of Customer Success", teamId: "cs", seniority: "leadership", startDate: "2021-07", tags: ["customer_focus", "facilitation", "trust_building"] },
  { id: "otavio-neves", name: "Otávio Neves", role: "Senior CSM", teamId: "cs", seniority: "senior", startDate: "2022-02", previousRoles: [{ role: "Mid-level CSM", from: "2022-02", to: "2024-05" }], tags: ["diplomacy", "customer_focus", "supportiveness"], note: "diplomat: handles angry customers and internal conflicts with the same calm" },
  { id: "aline-serra", name: "Aline Serra", role: "Mid-level CSM", teamId: "cs", seniority: "mid-level", startDate: "2023-08", tags: ["customer_focus", "psych_safety"] },
  { id: "vitor-camargo", name: "Vítor Camargo", role: "Senior Support Analyst", teamId: "cs", seniority: "senior", startDate: "2022-04", tags: ["calm_under_pressure", "ownership"] },
  { id: "natalia-brito", name: "Natália Brito", role: "Junior CSM", teamId: "cs", seniority: "junior", startDate: "2024-11", tags: ["learning_agility", "supportiveness"] },
  { id: "eduardo-sales", name: "Eduardo Sales", role: "Mid-level Support Analyst", teamId: "cs", seniority: "mid-level", startDate: "2023-01", tags: ["execution_reliability", "customer_focus"] },

  // ---------- Operations (6) ----------
  { id: "patricia-lemos", name: "Patrícia Lemos", role: "Head of Operations", teamId: "ops", seniority: "leadership", startDate: "2021-03", tags: ["accountability", "results_focus", "critical_evaluation"] },
  { id: "henrique-dias", name: "Henrique Dias", role: "Senior Financial Analyst", teamId: "ops", seniority: "senior", startDate: "2021-12", tags: ["attention_to_detail", "accountability"] },
  { id: "carolina-freire", name: "Carolina Freire", role: "People Ops", teamId: "ops", seniority: "mid-level", startDate: "2022-07", tags: ["psych_safety", "supportiveness", "diplomacy"], note: "diplomat: the person teams seek out when a difficult conversation needs to happen" },
  { id: "lucas-macedo", name: "Lucas Macedo", role: "Mid-level Operations Analyst", teamId: "ops", seniority: "mid-level", startDate: "2023-06", tags: ["execution_reliability", "ownership"] },
  { id: "tania-quintela", name: "Tânia Quintela", role: "Legal & Compliance", teamId: "ops", seniority: "senior", startDate: "2022-10", tags: ["attention_to_detail", "critical_evaluation", "diplomacy"], note: "diplomat: turns 'not allowed' into an agreement everyone accepts" },
  { id: "rodrigo-antunes", name: "Rodrigo Antunes", role: "Facilities & Admin", teamId: "ops", seniority: "mid-level", startDate: "2023-03", tags: ["supportiveness", "execution_reliability", "calm_under_pressure"] },
];
