import { NextResponse } from "next/server";
import { addLiveStory, getEmployee, getStories, type Source } from "@/lib/db";
import { extractTags } from "@/lib/extraction";
import { TAG_BY_ID } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { subjectId, source, text } = (await req.json()) as {
    subjectId: string;
    source: Source;
    text: string;
  };

  if (!getEmployee(subjectId)) {
    return NextResponse.json({ error: "Employee not found" }, { status: 400 });
  }
  if (!text?.trim() || !["self", "peer", "manager"].includes(source)) {
    return NextResponse.json({ error: "Invalid story or source" }, { status: 400 });
  }

  const extracted = await extractTags(text.trim());
  const storyId = `live-${getStories().length + 1}-${subjectId}`;
  addLiveStory(
    {
      id: storyId,
      subjectId,
      authorId: null,
      source,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    },
    extracted.map((t, i) => ({
      id: `${storyId}-ev${i + 1}`,
      storyId,
      subjectId,
      tagId: t.tagId,
      quote: t.quote,
      confidence: t.confidence,
    }))
  );

  return NextResponse.json({
    storyId,
    tags: extracted.map((t) => ({
      tagId: t.tagId,
      label: TAG_BY_ID[t.tagId].label,
      quote: t.quote,
      confidence: t.confidence,
    })),
  });
}
