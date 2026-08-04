"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

const SUGGESTIONS = [
  "Build a team of 5 people where everyone is great at avoiding conflict",
  "Is there any employee who is a positive culture outlier?",
  "What profile is Engineering missing, thinking of a startup environment?",
  "Does anyone have a strength they can't see in themselves?",
];

const TOOL_LABELS: Record<string, string> = {
  list_directory: "querying directory",
  list_people_by_tag: "ranking people by tag",
  get_person_profile: "opening profile",
  get_team_profile: "aggregating team profile",
  find_outliers: "looking for outliers",
  gap_analysis: "analyzing gaps vs. archetype",
  compose_team: "assembling team",
  submit_story: "recording story",
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"insights" | "interview">("insights");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);

    const history = [...messages, { role: "user" as const, content }];
    setMessages([...history, { role: "assistant", content: "", toolCalls: [] }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const patch = (fn: (last: ChatMsg) => ChatMsg) =>
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = fn(next[next.length - 1]);
          return next;
        });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === "text") {
            patch((last) => ({ ...last, content: last.content + evt.delta }));
          } else if (evt.type === "tool_call") {
            patch((last) => ({ ...last, toolCalls: [...(last.toolCalls ?? []), { name: evt.name, input: evt.input }] }));
          } else if (evt.type === "error") {
            patch((last) => ({ ...last, content: last.content + `\n\n⚠️ ${evt.message}` }));
          }
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: `⚠️ Couldn't reach the agent: ${String(e)}. Check the API key in .env.local.`,
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-medium">Culture agent</span>
        <div className="ml-auto flex rounded-lg border p-0.5 text-xs">
          <button
            onClick={() => setMode("insights")}
            className={`rounded-md px-2.5 py-1 ${mode === "insights" ? "bg-violet-600 text-white" : "text-muted-foreground"}`}
          >
            Insights
          </button>
          <button
            onClick={() => setMode("interview")}
            className={`rounded-md px-2.5 py-1 ${mode === "interview" ? "bg-violet-600 text-white" : "text-muted-foreground"}`}
            title="The agent interviews you and records new stories — this is how the system bootstraps in a real company"
          >
            Interview
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg space-y-3 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "insights"
                ? "Ask what management usually can't see — every answer is grounded in the stories."
                : "Let the agent interview you: it collects a story of yours about a colleague and feeds the digital twin."}
            </p>
            {mode === "insights" && (
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-violet-400 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {mode === "interview" && (
              <Button variant="outline" onClick={() => send("Hi! I want to share a story about a colleague.")}>
                Start the interview
              </Button>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm text-white"
                  : "max-w-[85%] space-y-2"
              }
            >
              {m.role === "assistant" && (m.toolCalls?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.toolCalls!.map((t, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-mono text-[11px] text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300"
                      title={JSON.stringify(t.input)}
                    >
                      🔧 {TOOL_LABELS[t.name] ?? t.name}
                    </span>
                  ))}
                </div>
              )}
              {m.role === "assistant" ? (
                <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border bg-background px-4 py-2 text-sm leading-relaxed">
                  {m.content || (loading && i === messages.length - 1 ? "thinking…" : "")}
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t p-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={mode === "insights" ? "Ask about teams, profiles, gaps…" : "Reply to the interviewer…"}
          className="min-h-[44px] max-h-32 resize-none"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="self-end bg-violet-600 hover:bg-violet-700">
          Send
        </Button>
      </form>
    </div>
  );
}
