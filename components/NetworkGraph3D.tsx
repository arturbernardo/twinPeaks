"use client";

import { useEffect, useRef, useState } from "react";
import type { ForceGraph3DInstance } from "3d-force-graph";
import type ForceGraph2DType from "force-graph";

export interface GraphNode {
  id: string;
  name: string;
  role: string;
  teamId: string;
  teamName: string;
  statusLabel: string | null; // preenchido quando a pessoa não está mais ativa
  storiesCount: number;
}

export interface GraphLink {
  source: string;
  target: string;
  stories: number;
}

interface TeamRef {
  id: string;
  name: string;
}

import { TEAM_PALETTE as PALETTE } from "@/lib/palette";

// WebGL pode estar indisponível (aceleração de hardware desligada, GPU bloqueada);
// nesse caso o grafo cai para o renderer 2D em canvas, com a mesma física e dados.
function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function NetworkGraph3D({
  nodes,
  links,
  teams,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  teams: TeamRef[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  // Dark é classe .dark no root (shadcn); o app não tem toggle, então ler no mount basta.
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const palette = isDark ? PALETTE.dark : PALETTE.light;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let disposed = false;
    let graph: ForceGraph3DInstance | ForceGraph2DType | null = null;

    const colorOf = (teamId: string) => palette[teams.findIndex((t) => t.id === teamId)] ?? "#94a3b8";
    // a lib muta os objetos (posições) — passa cópias, não as props
    const data = { nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) };
    const nodeTooltip = (n: object) => {
      const g = n as GraphNode;
      return `<div style="text-align:center"><b>${g.name}</b><br/>${g.role} · ${g.teamName}${
        g.statusLabel ? ` · ${g.statusLabel}` : ""
      }<br/>${g.storiesCount} stories</div>`;
    };
    const linkTooltip = (l: object) => {
      const g = l as GraphLink;
      return `${g.stories} ${g.stories === 1 ? "story" : "stories"} between this pair`;
    };

    (async () => {
      if (hasWebGL()) {
        try {
          const { default: ForceGraph3D } = await import("3d-force-graph");
          if (disposed) return;
          graph = new ForceGraph3D(el)
            .width(el.clientWidth)
            .height(el.clientHeight)
            .backgroundColor("rgba(0,0,0,0)")
            .graphData(data)
            .nodeColor((n) => colorOf((n as GraphNode).teamId))
            .nodeVal((n) => (n as GraphNode).storiesCount)
            .nodeOpacity(0.85)
            .nodeLabel(nodeTooltip)
            .linkWidth((l) => Math.sqrt((l as GraphLink).stories))
            .linkOpacity(0.3)
            .linkColor(() => (isDark ? "#a1a1aa" : "#71717a"))
            .linkLabel(linkTooltip);
          return;
        } catch {
          // o probe passou mas o contexto falhou — segue para o 2D
        }
      }
      const { default: ForceGraph } = await import("force-graph");
      if (disposed) return;
      setMode("2d");
      graph = new ForceGraph(el)
        .width(el.clientWidth)
        .height(el.clientHeight)
        .graphData(data)
        .nodeColor((n) => colorOf((n as GraphNode).teamId))
        .nodeVal((n) => (n as GraphNode).storiesCount)
        .nodeLabel(nodeTooltip)
        .linkWidth((l) => Math.sqrt((l as GraphLink).stories))
        .linkColor(() => (isDark ? "rgba(161,161,170,0.35)" : "rgba(113,113,122,0.35)"))
        .linkLabel(linkTooltip);
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
  }, [nodes, links, teams]);

  return (
    <div>
      <div ref={ref} className="h-[520px] w-full overflow-hidden rounded-lg" />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {teams.map((t, i) => (
          <span key={t.id} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[i] }} />
            {t.name}
          </span>
        ))}
        <span className="ml-auto">
          {mode === "3d"
            ? "drag to rotate · scroll to zoom · hover for details"
            : "2D mode (WebGL unavailable) · drag to pan · scroll to zoom · hover for details"}
        </span>
      </div>
    </div>
  );
}
