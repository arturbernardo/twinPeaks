// Ferramentas do agente de chat: consultas auditáveis sobre o gêmeo digital.
// Cada resultado carrega evidências/contagens para o agente citar — nada de caixa-preta.

import type Anthropic from "@anthropic-ai/sdk";
import {
  addLiveStory,
  getActiveEmployees,
  getEmployee,
  getEmployees,
  getSquad,
  getSquads,
  getStories,
  getStoriesFor,
  getTeams,
  STATUS_LABELS,
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
  if (!e) return { id };
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    teamId: e.teamId,
    ...(e.status !== "active" ? { situacao: STATUS_LABELS[e.status] } : {}),
  };
}

// Resolve "eng", "Engenharia", "Plataforma" etc. para o id canônico de um SETOR ou TIME (squad).
// Evita que um chute de id do modelo vire resultado vazio silencioso.
function resolveScope(raw: string): "company" | string | null {
  const q = raw.trim().toLowerCase();
  if (q === "company" || q === "empresa" || q === "todos") return "company";
  const team = getTeams().find(
    (t) => t.id.toLowerCase() === q || t.name.toLowerCase() === q || t.name.toLowerCase().includes(q)
  );
  if (team) return team.id;
  const squad = getSquads().find(
    (s) => s.id.toLowerCase() === q || s.name.toLowerCase() === q || s.name.toLowerCase().includes(q)
  );
  return squad?.id ?? null;
}

const SCOPE_ERROR = (raw: string) => ({
  error: `Setor/time não encontrado: "${raw}". Setores: ${getTeams()
    .map((t) => `${t.id} (${t.name})`)
    .join(", ")}. Times: ${getSquads()
    .map((s) => `${s.id} (${s.name})`)
    .join(", ")} — ou "company" para a empresa toda.`,
});

// Anexa a fonte (self/peer/manager) a cada citação — sem isso o agente não
// consegue distinguir auto-relato de evidência de terceiros.
function quotesWithSource(subjectId: string, evidence: { storyId: string; quote: string }[]) {
  const srcByStory = new Map(getStoriesFor(subjectId).map((s) => [s.id, s.source]));
  return evidence.map((ev) => ({ quote: ev.quote, source: srcByStory.get(ev.storyId) ?? "peer" }));
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
        team_id: { type: "string", description: "Opcional: id ou nome de um setor ou time (squad)" },
        min_strength: { type: "number", description: "Opcional: força mínima (0-1)" },
        limit: { type: "number", description: "Máximo de resultados (default 8)" },
      },
      required: ["tag_id"],
    },
  },
  {
    name: "get_person_profile",
    description:
      "Perfil completo de um colaborador: scores por tag com evidências (citações), divergências self vs. outros (Janela de Johari), situação (ativo/saiu/desligado/mudou de setor), datas de entrada e saída e trajetória de cargos anteriores. Use SEMPRE que a pergunta for sobre uma pessoa específica — inclusive histórico e tempo de casa.",
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
      properties: { team_id: { type: "string", description: 'Id ou nome de um setor ou time (squad), ou "company" para a empresa toda' } },
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
        scope: { type: "string", description: 'Id ou nome de um setor ou time (squad), ou "company"' },
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
        scope: { type: "string", description: 'Id ou nome de um setor ou time (squad), ou "company"' },
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
        setores: getTeams(),
        times: getSquads(),
        people: getEmployees().map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          teamId: e.teamId,
          squadId: e.squadId,
          situacao: STATUS_LABELS[e.status],
          desde: e.startDate,
        })),
        tags: TAGS.map((t) => ({ id: t.id, label: t.label, theory: t.theory })),
        archetypes: ARCHETYPES.map((a) => ({ id: a.id, label: a.label, description: a.description })),
      };

    case "list_people_by_tag": {
      const tagId = input.tag_id as TagId;
      const limit = (input.limit as number) ?? 8;
      const minStrength = (input.min_strength as number) ?? 0;
      // Só quem está na empresa — ranking serve para staffing.
      let people = getActiveEmployees();
      if (input.team_id) {
        const scope = resolveScope(input.team_id as string);
        if (!scope) return SCOPE_ERROR(input.team_id as string);
        if (scope !== "company") people = people.filter((e) => e.teamId === scope);
      }
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
            quotes: quotesWithSource(e.id, score.evidence).slice(0, 3),
          };
        })
        .filter((p) => p.strength >= minStrength && p.supportingStories > 0)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, limit);
      return { tag: TAG_BY_ID[tagId].label, ranked };
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
          label: TAG_BY_ID[s.tagId].label,
          strength: r2(s.strength),
          supportingStories: s.supportingStories,
          totalStories: s.totalStories,
          bySource: s.bySource,
          confidence: s.confidenceLabel,
          quotes: quotesWithSource(id, s.evidence).slice(0, 4),
        }));
      const divergences = divergencesFor(id).map((d) => ({
        tag: d.tagId,
        label: TAG_BY_ID[d.tagId].label,
        kind: d.kind === "blind_spot" ? "ponto cego (outros veem, a pessoa não)" : "gap de autopercepção (a pessoa alega, outros não confirmam)",
        strengthSelf: r2(d.strengthSelf),
        strengthOthers: r2(d.strengthOthers),
      }));
      return {
        person: personLabel(id),
        setor: getTeams().find((t) => t.id === e.teamId)?.name,
        time: e.squadId ? getSquad(e.squadId)?.name : "liderança do setor",
        situacao: STATUS_LABELS[e.status],
        naEmpresaDesde: e.startDate,
        ...(e.endDate ? { saiuEm: e.endDate } : {}),
        cargoAtual: e.role,
        cargosAnteriores: e.previousRoles.map((r) => ({
          cargo: r.role,
          ...(r.teamId ? { time: r.teamId } : {}),
          periodo: `${r.from} a ${r.to}`,
        })),
        storiesCount: getStoriesFor(id).length,
        scores,
        divergences,
      };
    }

    case "get_team_profile": {
      const scope = resolveScope(input.team_id as string);
      if (!scope) return SCOPE_ERROR(input.team_id as string);
      const profile = teamProfile(scope);
      return {
        scope,
        members:
          scope === "company"
            ? getEmployees().length
            : getEmployees().filter((e) => e.teamId === scope || e.squadId === scope).map((e) => personLabel(e.id)),
        tags: profile.map((t) => ({
          tag: t.tagId,
          label: TAG_BY_ID[t.tagId].label,
          mean: r2(t.mean),
          max: r2(t.max),
          topPerson: t.top ? { ...personLabel(t.top.employee.id), strength: r2(t.top.strength) } : null,
        })),
      };
    }

    case "find_outliers": {
      const scope = resolveScope(input.scope as string);
      if (!scope) return SCOPE_ERROR(input.scope as string);
      const outliers = findOutliers(scope, (input.top_k as number) ?? 3);
      return {
        scope,
        outliers: outliers.map((o) => ({
          ...personLabel(o.employee.id),
          distance: r2(o.distance),
          drivingTags: o.drivingTags.map((d) => ({
            tag: d.tagId,
            label: TAG_BY_ID[d.tagId].label,
            deviation: r2(d.deviation),
          })),
        })),
      };
    }

    case "gap_analysis": {
      const scope = resolveScope(input.scope as string);
      if (!scope) return SCOPE_ERROR(input.scope as string);
      const items = gapAnalysis(scope, input.archetype_id as string);
      if (!items) return { error: `Arquétipo não encontrado: ${input.archetype_id}` };
      if (items.length === 0) return SCOPE_ERROR(input.scope as string);
      return {
        scope,
        archetype: input.archetype_id,
        gaps: items.map((g) => ({
          tag: g.tagId,
          label: TAG_BY_ID[g.tagId].label,
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
            label: TAG_BY_ID[ra.tagId].label,
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
        extractedTags: extracted.map((t) => ({ tag: t.tagId, label: TAG_BY_ID[t.tagId].label, quote: t.quote, confidence: t.confidence })),
      };
    }

    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}
