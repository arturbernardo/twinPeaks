import { Card, CardContent } from "@/components/ui/card";
import { SourceBadge, TagBadge } from "@/components/TagBadge";
import type { Story, TagEvidence } from "@/lib/db";

// Renderiza a história com as quotes que geraram evidência destacadas.
function highlight(text: string, quotes: string[]) {
  if (quotes.length === 0) return [text];
  let parts: (string | { mark: string })[] = [text];
  for (const q of quotes) {
    parts = parts.flatMap((p) => {
      if (typeof p !== "string") return [p];
      const idx = p.toLowerCase().indexOf(q.toLowerCase());
      if (idx === -1) return [p];
      return [p.slice(0, idx), { mark: p.slice(idx, idx + q.length) }, p.slice(idx + q.length)];
    });
  }
  return parts;
}

export function EvidenceCard({
  story,
  evidence,
  authorName,
  highlighted = false,
}: {
  story: Story;
  evidence: TagEvidence[];
  authorName?: string;
  highlighted?: boolean;
}) {
  const parts = highlight(story.text, evidence.map((e) => e.quote));
  return (
    <Card className={highlighted ? "border-violet-500 ring-2 ring-violet-300 dark:ring-violet-800" : ""}>
      <CardContent className="space-y-2 pt-4">
        <p className="text-sm leading-relaxed">
          {parts.map((p, i) =>
            typeof p === "string" ? (
              <span key={i}>{p}</span>
            ) : (
              <mark key={i} className="rounded bg-violet-100 px-0.5 text-violet-900 dark:bg-violet-900 dark:text-violet-100">
                {p.mark}
              </mark>
            )
          )}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge source={story.source} />
          {evidence.map((e) => (
            <TagBadge key={e.id} tagId={e.tagId} />
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {authorName ?? (story.source === "self" ? "a própria pessoa" : "autoria anônima")} ·{" "}
            {new Date(story.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
