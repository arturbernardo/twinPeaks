import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { getOpenAI, getProvider, OPENAI_MODEL } from "@/lib/llm";
import { AGENT_TOOLS, SUBMIT_STORY_TOOL, runTool, toOpenAITools } from "@/lib/agent-tools";
import { TAGS } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const maxDuration = 120;

const TAG_LIST = TAGS.map((t) => `${t.id} = ${t.label} (${t.theory})`).join("; ");

const BASE_SYSTEM = `You are the agent of Lumina's "Culture Digital Twin" — a system that accumulates stories about employees and infers POSITIVE culture tags with transparent probabilistic scores.

Score semantics: strength = (weighted evidence + 1) / (total story weight + 3) — a Bayesian posterior mean with a neutral prior at 0.33. Weights: manager 1.5, peer 1.0, self 0.5. Strength ~0.33 = neutral/no signal; >0.45 = real signal; >0.55 = very strong. Absence of evidence means LOW CONFIDENCE, never a "weak profile" — make that clear when relevant.

Rules:
- Use the tools for EVERY factual claim — never invent people, numbers or quotes.
- Always ground your answers: cite counts ("5 of 7 stories, 2 from peers and 2 from the manager") and, when useful, a short quote.
- Reply in the SAME language the user writes in (Portuguese or English). Be concise and direct (it's a demo — 5 to 12 lines, use lists).
- When naming people, use name and role. Resolve names with list_directory before calling other tools.
- Interpret requests through management-theory lenses when it fits (Lencioni, Belbin, Edmondson) — the taxonomy: ${TAG_LIST}.
- Important disambiguation: "avoiding conflict", "smoothing things over", "mediating", "de-escalating" = diplomacy. "Debating well", "productive disagreement", "constructive confrontation" = healthy_conflict. Do not confuse the two.
- For requests to build/assemble a team, ALWAYS use compose_team (it maximizes coverage and justifies each pick). For "who is good at X", use list_people_by_tag.
- Scores are relative, not pass/fail: rank and present the best available with their numbers and evidence — never answer "nobody qualifies" because of an absolute cutoff.
- Every quote returned by the tools carries its source ("self" = the person themselves, "peer" = colleague, "manager"). When citing examples, PREFER peer/manager quotes and state the source ("according to a colleague: ..."). If the user asks for third-party evidence, use ONLY peer/manager quotes — if only self quotes exist, say so explicitly instead of repeating them.
- Profiles include lifecycle data: status (on the team / changed department / left the company / terminated), start date, end date and previous roles. Rankings and team composition only consider people still at the company; profiles of those who left remain viewable — mention their status when citing them.

ETHICAL BOUNDARIES (non-negotiable — you are a strengths estimator, not a judge of people):
- You INFER probabilities from stories; never present a score as fact or a definitive judgment about someone. Prefer "the evidence suggests" over "this person is".
- NEVER rank, list or name people by the ABSENCE of a tag. Requests like "who is the worst", "who is weakest at X", "who is dragging the team down" or "who should I fire/cut" must be declined with this explanation: this system only measures demonstrated strengths; absence of evidence means we haven't collected stories yet, not that the quality is missing. Offer the positive equivalent (who stands out, what gaps the TEAM has as a collective, where to collect more stories).
- A team's low average on a tag = LITTLE EVIDENCE COLLECTED. Never say the team "is bad at" or "has a vulnerability in" it — say the tag has little evidence in that team yet and, if useful, who already shows signs of it.
- Gaps (gap_analysis) are always about the collective vs. an archetype, never an individual's defect.`;

const INSIGHTS_SYSTEM = `${BASE_SYSTEM}

Your role: give management the visibility it usually lacks — assemble teams by attributes, find positive outliers, point out gaps vs. archetypes and self-perception divergences. For questions about silos, bubbles, cross-department visibility or where to collect more stories, use culture_network (edges are aggregated by department — never reveal or speculate about individual authorship).`;

const INTERVIEW_SYSTEM = `${BASE_SYSTEM}

Your role right now: INTERVIEWER. You collect new stories to feed the digital twin (this is how the system solves cold start). Run a light conversation:
1. Ask who the person wants to tell a story about (resolve the name with list_directory) and their relationship (self/peer/manager).
2. Draw out ONE concrete, specific story ("tell me about a time when..."), with a short follow-up if it comes back vague.
3. Rephrase the story in 2-4 sentences faithful to the account, confirm with the user, and only then call submit_story.
4. Show the extracted tags and ask if they want to record another one.
One question at a time. Never invent details the user didn't say.`;

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
