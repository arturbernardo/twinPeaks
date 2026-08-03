// Ficha de personas escrita à mão — fonte de verdade da empresa fictícia "Lumina"
// (SaaS B2B, ~36 pessoas). As narrativas do demo são plantadas aqui:
//   • OUTLIER: helena-fontes (Vendas) — mentora/segurança psicológica num time de energia+resultado
//   • LACUNA: Engenharia sem customer_focus/creative_innovation (gap vs. arquétipo startup)
//   • DIVERGÊNCIA: rafael-siqueira se vê como "conflito saudável", pares veem "diplomacia"
//   • DIPLOMATAS: 6 pessoas cross-time fortes em diplomacy (query de montar time)

import type { TagId } from "../lib/taxonomy";

export interface Persona {
  id: string;
  name: string;
  role: string;
  teamId: string;
  seniority: "júnior" | "pleno" | "sênior" | "liderança";
  tags: TagId[]; // tags dominantes que as histórias de pares/gestor devem evidenciar
  selfClaim?: TagId; // tag que a pessoa alega sobre si (para o caso de divergência)
  note?: string; // instrução extra para o gerador de histórias
}

export const TEAMS = [
  { id: "eng", name: "Engenharia", description: "Constrói e opera a plataforma Lumina." },
  { id: "produto", name: "Produto & Design", description: "Descobre e desenha o que vale a pena construir." },
  { id: "vendas", name: "Vendas", description: "Leva a Lumina a novos clientes." },
  { id: "cs", name: "Customer Success", description: "Garante que clientes tenham sucesso e renovem." },
  { id: "ops", name: "Operações", description: "Financeiro, pessoas, jurídico e o que faz a empresa rodar." },
];

export const MANAGERS: Record<string, string> = {
  eng: "sofia-brandao",
  produto: "isabela-franco",
  vendas: "ricardo-bastos",
  cs: "juliana-peixoto",
  ops: "patricia-lemos",
};

export const PERSONAS: Persona[] = [
  // ---------- Engenharia (10) — forte em execução/qualidade, SEM customer_focus nem creative_innovation ----------
  { id: "sofia-brandao", name: "Sofia Brandão", role: "Gerente de Engenharia", teamId: "eng", seniority: "liderança", tags: ["facilitation", "trust_building", "accountability"] },
  { id: "marina-duarte", name: "Marina Duarte", role: "Engenheira de Software Sênior", teamId: "eng", seniority: "sênior", tags: ["diplomacy", "execution_reliability", "supportiveness"], note: "diplomata: media conflitos técnicos entre colegas sem deixar escalar" },
  { id: "caio-teixeira", name: "Caio Teixeira", role: "Tech Lead", teamId: "eng", seniority: "sênior", tags: ["critical_evaluation", "accountability", "mentorship"] },
  { id: "bruno-carvalho", name: "Bruno Carvalho", role: "Engenheiro Backend Pleno", teamId: "eng", seniority: "pleno", tags: ["execution_reliability", "attention_to_detail"] },
  { id: "leticia-ramos", name: "Letícia Ramos", role: "Engenheira Frontend Pleno", teamId: "eng", seniority: "pleno", tags: ["attention_to_detail", "supportiveness"] },
  { id: "andre-nogueira", name: "André Nogueira", role: "SRE Sênior", teamId: "eng", seniority: "sênior", tags: ["calm_under_pressure", "ownership", "execution_reliability"] },
  { id: "paula-vidal", name: "Paula Vidal", role: "Engenheira de Dados Pleno", teamId: "eng", seniority: "pleno", tags: ["critical_evaluation", "learning_agility"] },
  { id: "diego-fagundes", name: "Diego Fagundes", role: "Engenheiro Backend Júnior", teamId: "eng", seniority: "júnior", tags: ["learning_agility", "drive_energy"] },
  { id: "renata-luz", name: "Renata Luz", role: "QA Sênior", teamId: "eng", seniority: "sênior", tags: ["attention_to_detail", "accountability"] },
  { id: "tomas-ribeiro", name: "Tomás Ribeiro", role: "Engenheiro de Software Sênior", teamId: "eng", seniority: "sênior", tags: ["execution_reliability", "results_focus"] },

  // ---------- Produto & Design (7) ----------
  { id: "isabela-franco", name: "Isabela Franco", role: "Head de Produto", teamId: "produto", seniority: "liderança", tags: ["results_focus", "critical_evaluation", "healthy_conflict"] },
  { id: "rafael-siqueira", name: "Rafael Siqueira", role: "Product Manager Sênior", teamId: "produto", seniority: "sênior", tags: ["diplomacy", "facilitation"], selfClaim: "healthy_conflict", note: "DIVERGÊNCIA: nas histórias self ele se descreve comprando brigas e debatendo duro (healthy_conflict); nas histórias de pares/gestora o que aparece é ele apaziguando, contornando e evitando o embate direto (diplomacy)" },
  { id: "gustavo-lins", name: "Gustavo Lins", role: "Product Designer Sênior", teamId: "produto", seniority: "sênior", tags: ["creative_innovation", "customer_focus"] },
  { id: "clara-menezes", name: "Clara Menezes", role: "UX Researcher Pleno", teamId: "produto", seniority: "pleno", tags: ["customer_focus", "critical_evaluation", "psych_safety"] },
  { id: "joao-prado", name: "João Prado", role: "Product Manager Pleno", teamId: "produto", seniority: "pleno", tags: ["ownership", "learning_agility"] },
  { id: "beatriz-tavares", name: "Beatriz Tavares", role: "Product Designer Júnior", teamId: "produto", seniority: "júnior", tags: ["creative_innovation", "learning_agility"] },
  { id: "felipe-armond", name: "Felipe Armond", role: "Product Ops", teamId: "produto", seniority: "pleno", tags: ["attention_to_detail", "diplomacy"], note: "diplomata: desarma tensões entre produto e engenharia" },

  // ---------- Vendas (7) — cultura dominante: energia + resultado ----------
  { id: "ricardo-bastos", name: "Ricardo Bastos", role: "Head de Vendas", teamId: "vendas", seniority: "liderança", tags: ["drive_energy", "results_focus", "accountability"] },
  { id: "helena-fontes", name: "Helena Fontes", role: "Executiva de Contas Sênior", teamId: "vendas", seniority: "sênior", tags: ["mentorship", "psych_safety", "facilitation"], note: "OUTLIER cultural: num time agressivo de metas, ela é quem forma os novatos, acolhe erro e organiza o time — as histórias devem contrastar com a cultura de energia/resultado ao redor" },
  { id: "camila-arruda", name: "Camila Arruda", role: "SDR", teamId: "vendas", seniority: "júnior", tags: ["drive_energy", "learning_agility"] },
  { id: "pedro-galvao", name: "Pedro Galvão", role: "Executivo de Contas Pleno", teamId: "vendas", seniority: "pleno", tags: ["results_focus", "customer_focus"] },
  { id: "luana-cardoso", name: "Luana Cardoso", role: "Executiva de Contas Pleno", teamId: "vendas", seniority: "pleno", tags: ["drive_energy", "results_focus"] },
  { id: "mateus-vilela", name: "Mateus Vilela", role: "SDR", teamId: "vendas", seniority: "júnior", tags: ["drive_energy", "ownership"] },
  { id: "fernanda-said", name: "Fernanda Said", role: "Sales Ops", teamId: "vendas", seniority: "pleno", tags: ["attention_to_detail", "execution_reliability"] },

  // ---------- Customer Success (6) ----------
  { id: "juliana-peixoto", name: "Juliana Peixoto", role: "Head de Customer Success", teamId: "cs", seniority: "liderança", tags: ["customer_focus", "facilitation", "trust_building"] },
  { id: "otavio-neves", name: "Otávio Neves", role: "CSM Sênior", teamId: "cs", seniority: "sênior", tags: ["diplomacy", "customer_focus", "supportiveness"], note: "diplomata: segura clientes irritados e conflitos internos com a mesma calma" },
  { id: "aline-serra", name: "Aline Serra", role: "CSM Pleno", teamId: "cs", seniority: "pleno", tags: ["customer_focus", "psych_safety"] },
  { id: "vitor-camargo", name: "Vítor Camargo", role: "Analista de Suporte Sênior", teamId: "cs", seniority: "sênior", tags: ["calm_under_pressure", "ownership"] },
  { id: "natalia-brito", name: "Natália Brito", role: "CSM Júnior", teamId: "cs", seniority: "júnior", tags: ["learning_agility", "supportiveness"] },
  { id: "eduardo-sales", name: "Eduardo Sales", role: "Analista de Suporte Pleno", teamId: "cs", seniority: "pleno", tags: ["execution_reliability", "customer_focus"] },

  // ---------- Operações (6) ----------
  { id: "patricia-lemos", name: "Patrícia Lemos", role: "Head de Operações", teamId: "ops", seniority: "liderança", tags: ["accountability", "results_focus", "critical_evaluation"] },
  { id: "henrique-dias", name: "Henrique Dias", role: "Analista Financeiro Sênior", teamId: "ops", seniority: "sênior", tags: ["attention_to_detail", "accountability"] },
  { id: "carolina-freire", name: "Carolina Freire", role: "People Ops", teamId: "ops", seniority: "pleno", tags: ["psych_safety", "supportiveness", "diplomacy"], note: "diplomata: é quem os times procuram quando uma conversa difícil precisa acontecer" },
  { id: "lucas-macedo", name: "Lucas Macedo", role: "Analista de Operações Pleno", teamId: "ops", seniority: "pleno", tags: ["execution_reliability", "ownership"] },
  { id: "tania-quintela", name: "Tânia Quintela", role: "Jurídico & Compliance", teamId: "ops", seniority: "sênior", tags: ["attention_to_detail", "critical_evaluation", "diplomacy"], note: "diplomata: transforma 'não pode' em acordo que todo mundo aceita" },
  { id: "rodrigo-antunes", name: "Rodrigo Antunes", role: "Facilities & Admin", teamId: "ops", seniority: "pleno", tags: ["supportiveness", "execution_reliability", "calm_under_pressure"] },
];
