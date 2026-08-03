"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export interface RadarPoint {
  label: string;
  strength: number;
  reference?: number; // opcional: média do time/empresa para comparação
}

export default function TagRadar({ data, referenceLabel }: { data: RadarPoint[]; referenceLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis domain={[0, 0.7]} tick={false} axisLine={false} />
        {data.some((d) => d.reference !== undefined) && (
          <Radar
            name={referenceLabel ?? "referência"}
            dataKey="reference"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.15}
          />
        )}
        <Radar name="força" dataKey="strength" stroke="#7c3aed" fill="#8b5cf6" fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
