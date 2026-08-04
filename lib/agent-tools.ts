// Ferramentas do agente de chat: consultas auditáveis sobre o gêmeo digital.
// Cada resultado carrega evidências/contagens para o agente citar — nada de caixa-preta.

import type Anthropic from "@anthropic-ai/sdk";
import {
  addLiveStory,
  getEmployee,
  getEmployees,
  getStories,
  getStoriesFor,
  getTeams,
  type Source,
} from "./db";
import {
  composeTeam,
  divergencesFor,
  findOutliers,
  gapAnalysis,
  scoresFor,
  teamProfile,
} from "./scoring";
import { ARCHETYPES, TAG_BY_ID, TAGS, TAG_IDS, type TagId } from "./taxonomy";
import { extractTags } from "./extraction";

const r2 = (x: number) => Math.round(x * 100) / 100;

function personLabel(id: string) {
  const e = getEmployee(id);
  return e ? { id: e.id, name: e.name, role: e.role, teamId: e.teamId } : { id };
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_directory",
    description:
      "Lista todos os times e colaboradores (id, nome, cargo, time) e as tags e arquétipos disponíveis. Use para resolver nomes citados pelo usuário para ids.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_people_by_tag",
    description:
      "Ranqueia colaboradores por força em uma tag de cultura. Use para achar quem é forte em determinado atributo.",
    input_schema: {
      type: "object",
      properties: {
        tag_id: { type: "string", enum: TAG_IDS, description: "Tag da taxonomia" },
        team_id: { type: "string", description: "Opcional: restringe a um time" },
        min_strength: { type: "number", description: "Opcional: força mínima (0-1)" },
        limit: { type: "number", description: "Máximo de resultados (default 8)" },
      },
      required: ["tag_id"],
    },
  },
  {
    name: "get_person_profile",
    description:
      "Perfil completo de um colaborador: scores por tag com evidências (citações), divergências self vs. outros (Janela de Johari).",
    input_schema: {
      type: "object",
      properties: { person_id: { type: "string", description: "Id do colaborador (use list_directory para resolver nomes)" } },
      required: ["person_id"],
    },
  },
  {
    name: "get_team_profile",
    description: "Perfil agregado de um time (ou da empresa): força média e máxima por tag e quem puxa cada tag.",
    input_schema: {
      type: "object",
      properties: { team_id: { type: "string", description: 'Id do time ou "company" para a empresa toda' } },
      required: ["team_id"],
    },
  },
  {
    name: "find_outliers",
    description:
      "Encontra outliers positivos de cultura: pessoas cujo perfil mais destoa da média do time ou da empresa, com as tags que explicam o desvio.",
    input_schema: {
      type: "object",
      properties: {
        scope: { type: "string", description: 'Id do time ou "company"' },
        top_k: { type: "number", description: "Quantos retornar (default 3)" },
      },
      required: ["scope"],
    },
  },
  {
    name: "gap_analysis",
    description:
      "Compara um time (ou a empresa) com um arquétipo cultural (startup, enterprise_delivery, innovation_lab) e aponta tags descobertas, parciais e faltantes.",
    input_schema: {
      type: "object",
      properties: {
        scope: { type: "string", description: 'Id do time ou "company"' },
        archetype_id: { type: "string", enum: ARCHETYPES.map((a) => a.id) },
      },
      required: ["scope", "archetype_id"],
    },
  },
  {
    name: "compose_team",
    description:
      "Monta um time cross-funcional maximizando a cobertura das tags pedidas (greedy, com justificativa por escolha).",
    input_schema: {
      type: "object",
      properties: {
        required_tags: { type: "array", items: { type: "string", enum: TAG_IDS } },
        size: { type: "number", description: "Tamanho do time (default 5)" },
        exclude_team: { type: "string", description: "Opcional: exclui membros deste time" },
      },
      required: ["required_tags"],
    },
  },
];

export const SUBMIT_STORY_TOOL: Anthropic.Tool = {
  name: "submit_story",
  description:
    "Registra uma história/feedback colhida na entrevista sobre um colaborador e extrai as tags de cultura dela. Use apenas depois de confirmar com o usuário o texto final e sobre quem é.",
  input_schema: {
    type: "object",
    properties: {
      subject_id: { type: "string", description: "Id do colaborador sobre quem é a história" },
      source: { type: "string", enum: ["self", "peer", "manager"], description: "Relação de quem conta com o sujeito" },
      text: { type: "string", description: "A história, no texto final confirmado" },
    },
    required: ["subject_id", "source", "text"],
  },
};

// Converte as definições (formato Anthropic) para o formato de tools da OpenAI.
export function toOpenAITools(tools: Anthropic.Tool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));
}

export async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_directory":
      return {
        teams: getTeams(),
        people: getEmployees().map((e) => ({ id: e.id, name: e.name, role: e.role, teamId: e.teamId })),
        tags: TAGS.map((t) => ({ id: t.id, labelPt: t.labelPt, theory: t.theory })),
        archetypes: ARCHETYPES.map((a) => ({ id: a.id, labelPt: a.labelPt, description: a.description })),
      };

    case "list_people_by_tag": {
      const tagId = input.tag_id as TagId;
      const limit = (input.limit as number) ?? 8;
      const minStrength = (input.min_strength as number) ?? 0;
      let people = getEmployees();
      if (input.team_id) people = people.filter((e) => e.teamId === input.team_id);
      const ranked = people
        .map((e) => {
          const score = scoresFor(e.id).find((s) => s.tagId === tagId)!;
          return {
            ...personLabel(e.id),
            strength: r2(score.strength),
            supportingStories: score.supportingStories,
            totalStories: score.totalStories,
            bySource: score.bySource,
            confidence: score.confidenceLabel,
            sampleQuote: score.evidence[0]?.quote ?? null,
          };
        })
        .filter((p) => p.strength >= minStrength && p.supportingStories > 0)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, limit);
      return { tag: TAG_BY_ID[tagId].labelPt, ranked };
    }

    case "get_person_profile": {
      const id = input.person_id as string;
      const e = getEmployee(id);
      if (!e) return { error: `Colaborador não encontrado: ${id}. Use list_directory.` };
      const scores = scoresFor(id)
        .filter((s) => s.supportingStories > 0)
        .sort((a, b) => b.strength - a.strength)
        .map((s) => ({
          tag: s.tagId,
          labelPt: TAG_BY_ID[s.tagId].labelPt,
          strength: r2(s.strength),
          supportingStories: s.supportingStories,
          totalStories: s.totalStories,
          bySource: s.bySource,
          confidence: s.confidenceLabel,
          quotes: s.evidence.slice(0, 3).map((ev) => ev.quote),
        }));
      const divergences = divergencesFor(id).map((d) => ({
        tag: d.tagId,
        labelPt: TAG_BY_ID[d.tagId].labelPt,
        kind: d.kind === "blind_spot" ? "ponto cego (outros veem, a pessoa não)" : "gap de autopercepção (a pessoa alega, outros não confirmam)",
        strengthSelf: r2(d.strengthSelf),
        strengthOthers: r2(d.strengthOthers),
      }));
      return { person: personLabel(id), storiesCount: getStoriesFor(id).length, scores, divergences };
    }

    case "get_team_profile": {
      const scope = input.team_id as string;
      const profile = teamProfile(scope === "company" ? "company" : scope);
      if (profile.length === 0) return { error: `Time não encontrado: ${scope}` };
      return {
        scope,
        members:
          scope === "company"
            ? getEmployees().length
            : getEmployees().filter((e) => e.teamId === scope).map((e) => personLabel(e.id)),
        tags: profile.map((t) => ({
          tag: t.tagId,
          labelPt: TAG_BY_ID[t.tagId].labelPt,
          mean: r2(t.mean),
          max: r2(t.max),
          topPerson: t.top ? { ...personLabel(t.top.employee.id), strength: r2(t.top.strength) } : null,
        })),
      };
    }

    case "find_outliers": {
      const scope = input.scope as string;
      const outliers = findOutliers(scope === "company" ? "company" : scope, (input.top_k as number) ?? 3);
      return {
        scope,
        outliers: outliers.map((o) => ({
          ...personLabel(o.employee.id),
          distance: r2(o.distance),
          drivingTags: o.drivingTags.map((d) => ({
            tag: d.tagId,
            labelPt: TAG_BY_ID[d.tagId].labelPt,
            deviation: r2(d.deviation),
          })),
        })),
      };
    }

    case "gap_analysis": {
      const scope = input.scope as string;
      const items = gapAnalysis(scope === "company" ? "company" : scope, input.archetype_id as string);
      if (!items) return { error: `Arquétipo não encontrado: ${input.archetype_id}` };
      return {
        scope,
        archetype: input.archetype_id,
        gaps: items.map((g) => ({
          tag: g.tagId,
          labelPt: TAG_BY_ID[g.tagId].labelPt,
          status: g.status,
          target: r2(g.target),
          teamMax: r2(g.teamMax),
          teamMean: r2(g.teamMean),
          closestPerson: g.closest ? { ...personLabel(g.closest.employee.id), strength: r2(g.closest.strength) } : null,
        })),
      };
    }

    case "compose_team": {
      const picks = composeTeam(
        input.required_tags as TagId[],
        (input.size as number) ?? 5,
        input.exclude_team as string | undefined
      );
      return {
        picks: picks.map((p) => ({
          ...personLabel(p.employee.id),
          rationale: p.rationale.map((ra) => ({
            tag: ra.tagId,
            labelPt: TAG_BY_ID[ra.tagId].labelPt,
            strength: r2(ra.strength),
            raisedCoverage: ra.raisedCoverage,
          })),
        })),
      };
    }

    case "submit_story": {
      const subjectId = input.subject_id as string;
      const subject = getEmployee(subjectId);
      if (!subject) return { error: `Colaborador não encontrado: ${subjectId}` };
      const text = (input.text as string).trim();
      const source = input.source as Source;
      const extracted = await extractTags(text);
      const storyId = `live-${getStories().length + 1}-${subjectId}`;
      addLiveStory(
        { id: storyId, subjectId, authorId: null, source, text, createdAt: new Date().toISOString() },
        extracted.map((t, i) => ({
          id: `${storyId}-ev${i + 1}`,
          storyId,
          subjectId,
          tagId: t.tagId,
          quote: t.quote,
          confidence: t.confidence,
        }))
      );
      return {
        saved: true,
        storyId,
        subject: personLabel(subjectId),
        extractedTags: extracted.map((t) => ({ tag: t.tagId, labelPt: TAG_BY_ID[t.tagId].labelPt, quote: t.quote, confidence: t.confidence })),
      };
    }

    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}
