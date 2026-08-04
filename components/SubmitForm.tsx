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
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
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
          <span className="mb-1 block font-medium">Who is the story about?</span>
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
          <span className="mb-1 block font-medium">What is your relationship with this person?</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            className="w-full rounded-md border bg-background px-3 py-2"
          >
            <option value="peer">I&apos;m a peer</option>
            <option value="manager">I&apos;m their manager</option>
            <option value="self">It&apos;s about me</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Describe a concrete situation</span>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="E.g.: During the Meridiano database migration cutover, she took over client communication and kept everyone calm until the rollback finished…"
        />
      </label>

      {state === "error" && <p className="text-sm text-rose-600">⚠️ {error}</p>}

      <Button type="submit" disabled={state === "sending" || !text.trim()} className="bg-violet-600 hover:bg-violet-700">
        {state === "sending" ? "Analyzing story…" : "Submit story"}
      </Button>
      {state === "sending" && (
        <p className="text-xs text-muted-foreground">
          The agent is reading the story, extracting culture evidence and updating the profile…
        </p>
      )}
    </form>
  );
}
