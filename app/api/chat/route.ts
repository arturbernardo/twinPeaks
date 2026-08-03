import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { AGENT_TOOLS, SUBMIT_STORY_TOOL, runTool } from "@/lib/agent-tools";
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
- Interprete pedidos com lentes de teoria de gestão quando fizer sentido (Lencioni, Belbin, Edmondson) — a taxonomia: ${TAG_LIST}.`;

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

export async function POST(req: Request) {
  const { messages, mode = "insights" } = (await req.json()) as {
    messages: ChatMessage[];
    mode?: "insights" | "interview";
  };

  const client = getAnthropic();
  const tools = mode === "interview" ? [...AGENT_TOOLS, SUBMIT_STORY_TOOL] : AGENT_TOOLS;
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: mode === "interview" ? INTERVIEW_SYSTEM : INSIGHTS_SYSTEM,
      cache_control: { type: "ephemeral" },
    },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        let msgs: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));

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
            results.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(out),
            });
          }
          msgs = [...msgs, { role: "user", content: results }];
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
