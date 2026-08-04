import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { getOpenAI, getProvider, OPENAI_MODEL } from "@/lib/llm";
import { AGENT_TOOLS, SUBMIT_STORY_TOOL, runTool, toOpenAITools } from "@/lib/agent-tools";
import { TAGS } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const maxDuration = 120;

const TAG_LIST = TAGS.map((t) => `${t.id} = ${t.labelPt} (${t.theory})`).join("; ");

const BASE_SYSTEM = `Você é o agente do "Gêmeo Digital de Cultura" da empresa Lumina — um sistema que acumula histórias sobre colaboradores e infere tags POSITIVAS de cultura com scores probabilísticos transparentes.

Semântica dos scores: força = (evidência ponderada + 1) / (peso total de histórias + 3) — uma média posterior bayesiana com prior neutro em 0.33. Pesos: gestor 1.5, par 1.0, self 0.5. Força ~0.33 = neutro/sem sinal; >0.45 = sinal real; >0.55 = muito forte. Ausência de evidência significa BAIXA CONFIANÇA, nunca "perfil fraco" — deixe isso claro quando relevante.

Regras:
- Use as ferramentas para TODA afirmação factual — nunca invente pessoas, números ou citações.
- Sempre fundamente: cite contagens ("5 de 7 histórias, 2 de pares e 2 do gestor") e, quando útil, uma citação curta.
- Responda em português brasileiro, conciso e direto (é um demo — respostas de 5 a 12 linhas, use listas).
- Ao citar pessoas, use nome e cargo. Resolva nomes com list_directory antes de chamar outras ferramentas.
- Interprete pedidos com lentes de teoria de gestão quando fizer sentido (Lencioni, Belbin, Edmondson) — a taxonomia: ${TAG_LIST}.
- Desambiguação importante: "evitar conflitos", "apaziguar", "mediar", "desescalar" = diplomacy. "Debater bem", "discordância produtiva", "bater de frente construtivamente" = healthy_conflict. Não confunda as duas.
- Para pedidos de montar/formar time, SEMPRE use compose_team (ela maximiza cobertura e justifica cada escolha). Para "quem é bom em X", use list_people_by_tag.
- Os scores são relativos, não passa/reprova: ranqueie e apresente os melhores disponíveis com seus números e evidências — nunca responda "ninguém atende" por causa de um corte absoluto.
- Toda citação retornada pelas ferramentas vem com a fonte ("self" = a própria pessoa, "peer" = colega, "manager" = gestão). Ao citar exemplos, PREFIRA quotes de peer/manager e diga a fonte ("segundo um colega: ..."). Se o usuário pedir evidência de terceiros, use APENAS quotes peer/manager — se só houver self, diga isso explicitamente em vez de repetir as mesmas quotes.`;

const INSIGHTS_SYSTEM = `${BASE_SYSTEM}

Seu papel: dar à gestão a visão que ela normalmente não tem — montar times por atributos, achar outliers positivos, apontar lacunas vs. arquétipos e divergências de autopercepção.`;

const INTERVIEW_SYSTEM = `${BASE_SYSTEM}

Seu papel agora: ENTREVISTADOR. Você colhe histórias novas para alimentar o gêmeo digital (é assim que o sistema resolve o cold start). Conduza uma conversa leve:
1. Pergunte sobre quem a pessoa quer contar uma história (resolva o nome com list_directory) e qual a relação (self/par/gestor).
2. Puxe UMA história concreta e específica ("me conta uma situação em que..."), com follow-up curto se vier vaga.
3. Reformule a história em 2-4 frases fiéis ao relato, confirme com o usuário e só então chame submit_story.
4. Mostre as tags extraídas e pergunte se quer registrar outra.
Uma pergunta por vez. Nunca invente detalhes que o usuário não disse.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Emit = (obj: object) => void;

async function anthropicLoop(
  emit: Emit,
  history: ChatMessage[],
  systemText: string,
  tools: Anthropic.Tool[]
) {
  const client = getAnthropic();
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: systemText, cache_control: { type: "ephemeral" } },
  ];
  let msgs: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 8; i++) {
    const s = client.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "medium" },
      system,
      tools,
      messages: msgs,
    });
    s.on("text", (delta) => emit({ type: "text", delta }));
    const msg = await s.finalMessage();
    if (msg.stop_reason !== "tool_use") break;

    msgs = [...msgs, { role: "assistant", content: msg.content }];
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      emit({ type: "tool_call", name: block.name, input: block.input });
      let out: unknown;
      try {
        out = await runTool(block.name, block.input as Record<string, unknown>);
      } catch (e) {
        out = { error: String(e) };
      }
      results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
    }
    msgs = [...msgs, { role: "user", content: results }];
  }
}

async function openaiLoop(
  emit: Emit,
  history: ChatMessage[],
  systemText: string,
  tools: Anthropic.Tool[]
) {
  const client = getOpenAI();
  const oaTools = toOpenAITools(tools);
  const msgs: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemText },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let i = 0; i < 8; i++) {
    const stream = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: msgs,
      tools: oaTools,
      stream: true,
    });

    let content = "";
    const calls: { id: string; name: string; args: string }[] = [];
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        content += delta.content;
        emit({ type: "text", delta: delta.content });
      }
      for (const tc of delta.tool_calls ?? []) {
        calls[tc.index] ??= { id: "", name: "", args: "" };
        if (tc.id) calls[tc.index].id = tc.id;
        if (tc.function?.name) calls[tc.index].name += tc.function.name;
        if (tc.function?.arguments) calls[tc.index].args += tc.function.arguments;
      }
    }

    const toolCalls = calls.filter(Boolean);
    if (toolCalls.length === 0) break;

    msgs.push({
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls.map((t) => ({
        id: t.id,
        type: "function" as const,
        function: { name: t.name, arguments: t.args },
      })),
    });
    for (const t of toolCalls) {
      let input: Record<string, unknown> = {};
      try {
        input = t.args ? JSON.parse(t.args) : {};
      } catch {
        // argumentos malformados seguem como objeto vazio; a ferramenta responde com erro legível
      }
      emit({ type: "tool_call", name: t.name, input });
      let out: unknown;
      try {
        out = await runTool(t.name, input);
      } catch (e) {
        out = { error: String(e) };
      }
      msgs.push({ role: "tool", tool_call_id: t.id, content: JSON.stringify(out) });
    }
  }
}

export async function POST(req: Request) {
  const { messages, mode = "insights" } = (await req.json()) as {
    messages: ChatMessage[];
    mode?: "insights" | "interview";
  };

  const tools = mode === "interview" ? [...AGENT_TOOLS, SUBMIT_STORY_TOOL] : AGENT_TOOLS;
  const systemText = mode === "interview" ? INTERVIEW_SYSTEM : INSIGHTS_SYSTEM;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        if (getProvider() === "anthropic") {
          await anthropicLoop(emit, messages, systemText, tools);
        } else {
          await openaiLoop(emit, messages, systemText, tools);
        }
        emit({ type: "done" });
      } catch (e) {
        emit({ type: "error", message: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
