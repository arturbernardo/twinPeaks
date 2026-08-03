// Taxonomia fixa de tags positivas de cultura, ancorada em teorias de gestão.
// Tudo (extração, scoring, agente, UI) importa daqui — fonte única de verdade.

export type Theory = "Lencioni" | "Edmondson" | "Belbin" | "Prática";

export interface TagDef {
  id: string;
  labelPt: string;
  definition: string;
  theory: Theory;
}

export const TAGS = [
  // Lencioni (5 disfunções, invertidas) + Edmondson
  { id: "trust_building", labelPt: "Construção de confiança", definition: "Constrói confiança baseada em vulnerabilidade: admite erros, pede ajuda, é transparente.", theory: "Lencioni" },
  { id: "healthy_conflict", labelPt: "Conflito saudável", definition: "Discorda de forma direta e produtiva; debate ideias sem atacar pessoas.", theory: "Lencioni" },
  { id: "diplomacy", labelPt: "Diplomacia", definition: "Desescala tensões, media desentendimentos e evita conflitos desnecessários.", theory: "Lencioni" },
  { id: "accountability", labelPt: "Responsabilização", definition: "Cobra compromissos de si e dos pares; não deixa combinados caírem no vazio.", theory: "Lencioni" },
  { id: "results_focus", labelPt: "Foco em resultados", definition: "Prioriza o resultado coletivo acima de ego, território ou conforto pessoal.", theory: "Lencioni" },
  { id: "psych_safety", labelPt: "Segurança psicológica", definition: "Faz os outros se sentirem seguros para falar, errar e propor ideias.", theory: "Edmondson" },
  // Belbin (papéis de time, como evidência comportamental positiva)
  { id: "execution_reliability", labelPt: "Execução confiável", definition: "Transforma planos em entregas; cumpre o que promete com consistência.", theory: "Belbin" },
  { id: "attention_to_detail", labelPt: "Atenção a detalhes", definition: "Caça erros e pontas soltas; garante qualidade e acabamento no trabalho.", theory: "Belbin" },
  { id: "creative_innovation", labelPt: "Inovação criativa", definition: "Gera ideias originais e soluções não óbvias para problemas difíceis.", theory: "Belbin" },
  { id: "critical_evaluation", labelPt: "Avaliação crítica", definition: "Analisa opções com lógica e imparcialidade antes de decidir.", theory: "Belbin" },
  { id: "facilitation", labelPt: "Facilitação", definition: "Coordena pessoas, alinha objetivos e faz reuniões e decisões fluírem.", theory: "Belbin" },
  { id: "drive_energy", labelPt: "Energia e impulso", definition: "Imprime ritmo e senso de urgência; destrava times parados.", theory: "Belbin" },
  { id: "supportiveness", labelPt: "Suporte ao time", definition: "Percebe colegas sobrecarregados e ajuda sem que peçam.", theory: "Belbin" },
  // Prática moderna
  { id: "mentorship", labelPt: "Mentoria", definition: "Desenvolve colegas ativamente: ensina, dá feedback e abre caminhos.", theory: "Prática" },
  { id: "ownership", labelPt: "Dono do problema", definition: "Assume problemas de ponta a ponta, mesmo fora do próprio escopo.", theory: "Prática" },
  { id: "customer_focus", labelPt: "Foco no cliente", definition: "Traz a perspectiva do cliente para dentro das decisões do time.", theory: "Prática" },
  { id: "learning_agility", labelPt: "Agilidade de aprendizado", definition: "Aprende rápido coisas novas e muda de rota diante de evidências.", theory: "Prática" },
  { id: "calm_under_pressure", labelPt: "Calma sob pressão", definition: "Mantém clareza e serenidade em crises e prazos apertados.", theory: "Prática" },
] as const satisfies readonly TagDef[];

export type TagId = (typeof TAGS)[number]["id"];

export const TAG_IDS = TAGS.map((t) => t.id) as [TagId, ...TagId[]];

export const TAG_BY_ID: Record<TagId, TagDef> = Object.fromEntries(
  TAGS.map((t) => [t.id, t])
) as Record<TagId, TagDef>;

// Arquétipos de cultura: alvo mínimo de força por tag para a análise de lacunas.
// Escala compatível com o score suavizado (força ~0.33 é o prior neutro).
export interface Archetype {
  id: string;
  labelPt: string;
  description: string;
  targets: Partial<Record<TagId, number>>;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "startup",
    labelPt: "Startup",
    description: "Ambiente de alta incerteza e velocidade: ownership, aprendizado rápido e obsessão por cliente.",
    targets: {
      ownership: 0.5,
      drive_energy: 0.45,
      creative_innovation: 0.45,
      customer_focus: 0.45,
      learning_agility: 0.45,
      results_focus: 0.45,
      calm_under_pressure: 0.4,
      healthy_conflict: 0.4,
    },
  },
  {
    id: "enterprise_delivery",
    labelPt: "Entrega enterprise",
    description: "Operação madura com foco em previsibilidade, qualidade e compromissos cumpridos.",
    targets: {
      execution_reliability: 0.5,
      attention_to_detail: 0.45,
      accountability: 0.45,
      results_focus: 0.45,
      critical_evaluation: 0.4,
      trust_building: 0.4,
    },
  },
  {
    id: "innovation_lab",
    labelPt: "Laboratório de inovação",
    description: "Exploração e experimentação: criatividade, segurança psicológica e debate aberto.",
    targets: {
      creative_innovation: 0.5,
      learning_agility: 0.45,
      psych_safety: 0.45,
      healthy_conflict: 0.4,
      critical_evaluation: 0.4,
      facilitation: 0.35,
    },
  },
];

export const ARCHETYPE_BY_ID = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));
