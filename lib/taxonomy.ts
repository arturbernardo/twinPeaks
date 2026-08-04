// Fixed taxonomy of positive culture tags, grounded in management theory.
// Everything (extraction, scoring, agent, UI) imports from here — single source of truth.

export type Theory = "Lencioni" | "Edmondson" | "Belbin" | "Practice";

export interface TagDef {
  id: string;
  label: string;
  definition: string;
  theory: Theory;
}

export const TAGS = [
  // Lencioni (5 dysfunctions, inverted) + Edmondson
  { id: "trust_building", label: "Trust building", definition: "Builds vulnerability-based trust: admits mistakes, asks for help, is transparent.", theory: "Lencioni" },
  { id: "healthy_conflict", label: "Healthy conflict", definition: "Disagrees directly and productively; debates ideas without attacking people.", theory: "Lencioni" },
  { id: "diplomacy", label: "Diplomacy", definition: "De-escalates tension, mediates disagreements and avoids unnecessary conflict.", theory: "Lencioni" },
  { id: "accountability", label: "Accountability", definition: "Holds self and peers to commitments; doesn't let agreements slip.", theory: "Lencioni" },
  { id: "results_focus", label: "Results focus", definition: "Puts collective outcomes above ego, turf or personal comfort.", theory: "Lencioni" },
  { id: "psych_safety", label: "Psychological safety", definition: "Makes others feel safe to speak up, make mistakes and propose ideas.", theory: "Edmondson" },
  // Belbin (team roles, as positive behavioral evidence)
  { id: "execution_reliability", label: "Reliable execution", definition: "Turns plans into deliveries; consistently does what they promise.", theory: "Belbin" },
  { id: "attention_to_detail", label: "Attention to detail", definition: "Hunts down errors and loose ends; ensures quality and polish.", theory: "Belbin" },
  { id: "creative_innovation", label: "Creative innovation", definition: "Generates original ideas and non-obvious solutions to hard problems.", theory: "Belbin" },
  { id: "critical_evaluation", label: "Critical evaluation", definition: "Analyzes options with logic and impartiality before deciding.", theory: "Belbin" },
  { id: "facilitation", label: "Facilitation", definition: "Coordinates people, aligns goals and makes meetings and decisions flow.", theory: "Belbin" },
  { id: "drive_energy", label: "Drive & energy", definition: "Sets pace and urgency; unblocks stalled teams.", theory: "Belbin" },
  { id: "supportiveness", label: "Supportiveness", definition: "Notices overloaded colleagues and helps without being asked.", theory: "Belbin" },
  // Modern practice
  { id: "mentorship", label: "Mentorship", definition: "Actively develops colleagues: teaches, gives feedback and opens doors.", theory: "Practice" },
  { id: "ownership", label: "Ownership", definition: "Owns problems end to end, even outside their own scope.", theory: "Practice" },
  { id: "customer_focus", label: "Customer focus", definition: "Brings the customer's perspective into the team's decisions.", theory: "Practice" },
  { id: "learning_agility", label: "Learning agility", definition: "Learns new things fast and changes course when evidence demands it.", theory: "Practice" },
  { id: "calm_under_pressure", label: "Calm under pressure", definition: "Keeps clarity and composure through crises and tight deadlines.", theory: "Practice" },
] as const satisfies readonly TagDef[];

export type TagId = (typeof TAGS)[number]["id"];

export const TAG_IDS = TAGS.map((t) => t.id) as [TagId, ...TagId[]];

export const TAG_BY_ID: Record<TagId, TagDef> = Object.fromEntries(
  TAGS.map((t) => [t.id, t])
) as Record<TagId, TagDef>;

// Culture archetypes: minimum target strength per tag for gap analysis.
// Scale is compatible with the smoothed score (strength ~0.33 is the neutral prior).
export interface Archetype {
  id: string;
  label: string;
  description: string;
  targets: Partial<Record<TagId, number>>;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "startup",
    label: "Startup",
    description: "High-uncertainty, high-speed environment: ownership, fast learning and customer obsession.",
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
    label: "Enterprise delivery",
    description: "Mature operation focused on predictability, quality and kept commitments.",
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
    label: "Innovation lab",
    description: "Exploration and experimentation: creativity, psychological safety and open debate.",
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
