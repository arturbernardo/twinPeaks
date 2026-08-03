"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Person {
  id: string;
  name: string;
  role: string;
}

export default function SubmitForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(people[0]?.id ?? "");
  const [source, setSource] = useState<"self" | "peer" | "manager">("peer");
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || state === "sending") return;
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, source, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
      router.push(`/people/${subjectId}?highlight=${data.storyId}`);
    } catch (err) {
      setState("error");
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Sobre quem é a história?</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.role}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Qual a sua relação com a pessoa?</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            className="w-full rounded-md border bg-background px-3 py-2"
          >
            <option value="peer">Sou colega</option>
            <option value="manager">Sou gestor(a)</option>
            <option value="self">É sobre mim</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Conte uma situação concreta</span>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Ex.: Na virada da migração do banco Meridiano, ela assumiu a comunicação com o cliente e manteve todo mundo calmo até o rollback terminar…"
        />
      </label>

      {state === "error" && <p className="text-sm text-rose-600">⚠️ {error}</p>}

      <Button type="submit" disabled={state === "sending" || !text.trim()} className="bg-violet-600 hover:bg-violet-700">
        {state === "sending" ? "Analisando história…" : "Enviar história"}
      </Button>
      {state === "sending" && (
        <p className="text-xs text-muted-foreground">
          O agente está lendo a história, extraindo evidências de cultura e atualizando o perfil…
        </p>
      )}
    </form>
  );
}
