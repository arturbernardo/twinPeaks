"use client";

import { useEffect, useRef } from "react";
import type ForceGraphType from "force-graph";

export interface TagGraphNode {
  id: string;
  label: string;
  theory: string;
  people: number;
}

export interface TagGraphLink {
  source: string;
  target: string;
  both: number;
  jaccard: number;
}

import { THEORY_ORDER as THEORIES, THEORY_PALETTE as PALETTE } from "@/lib/palette";

export default function TagGraph({ nodes, links }: { nodes: TagGraphNode[]; links: TagGraphLink[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const palette = isDark ? PALETTE.dark : PALETTE.light;
  const colorOf = (theory: string) => palette[THEORIES.indexOf(theory as (typeof THEORIES)[number])] ?? "#94a3b8";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let disposed = false;
    let graph: ForceGraphType | null = null;
    const ink = isDark ? "#e4e4e7" : "#27272a";
    const radius = (n: TagGraphNode) => 3 + Math.sqrt(n.people) * 2;

    (async () => {
      const { default: ForceGraph } = await import("force-graph");
      if (disposed) return;
      graph = new ForceGraph(el)
        .width(el.clientWidth)
        .height(el.clientHeight)
        .graphData({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) })
        .nodeLabel((n) => {
          const g = n as TagGraphNode;
          return `${g.label} · ${g.theory} · evidenced in ${g.people} people`;
        })
        .nodeCanvasObject((node, ctx, globalScale) => {
          const g = node as TagGraphNode & { x: number; y: number };
          const r = radius(g);
          ctx.beginPath();
          ctx.arc(g.x, g.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = colorOf(g.theory);
          ctx.fill();
          const fontSize = Math.max(11 / globalScale, 2.5);
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = ink;
          ctx.fillText(g.label, g.x, g.y + r + 2 / globalScale);
        })
        .nodePointerAreaPaint((node, color, ctx) => {
          const g = node as TagGraphNode & { x: number; y: number };
          ctx.beginPath();
          ctx.arc(g.x, g.y, radius(g) + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        })
        .linkWidth((l) => (l as TagGraphLink).jaccard * 8)
        .linkColor(() => (isDark ? "rgba(161,161,170,0.4)" : "rgba(113,113,122,0.4)"))
        .linkLabel((l) => {
          const g = l as TagGraphLink;
          return `${g.both} people show both (Jaccard ${g.jaccard.toFixed(2)})`;
        });
    })();

    const onResize = () => {
      if (el) graph?.width(el.clientWidth).height(el.clientHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      graph?._destructor();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links]);

  return (
    <div>
      <div ref={ref} className="h-[440px] w-full overflow-hidden rounded-lg" />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {THEORIES.map((t, i) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[i] }} />
            {t}
          </span>
        ))}
        <span className="ml-auto">node size = people with evidence · edge = tags co-occurring in the same people</span>
      </div>
    </div>
  );
}
