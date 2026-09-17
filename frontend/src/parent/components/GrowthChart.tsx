import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { GrowthStandardPoint } from "../../lib/api";
import { num } from "../../lib/id";

export interface ChartPoint {
  ageMonths: number;
  value: number;
  label: string;
}

export function GrowthChart({ standards, points, unit }: { standards: GrowthStandardPoint[]; points: ChartPoint[]; unit: string }) {
  const maxAge = useMemo(() => Math.min(60, Math.max(24, Math.ceil((Math.max(12, ...points.map((p) => p.ageMonths)) + 3) / 6) * 6)), [points]);
  const data = useMemo(
    () =>
      standards
        .filter((s) => s.age_months <= maxAge)
        .map((s) => ({ age: s.age_months, wide: [s.p3, s.p97], inner: [s.p15, s.p85], median: s.p50 })),
    [standards, maxAge],
  );
  const child = useMemo(() => points.map((p) => ({ age: +p.ageMonths.toFixed(2), value: p.value, label: p.label })), [points]);
  const ys = [...data.flatMap((d) => d.wide), ...child.map((c) => c.value)];
  const domain: [number, number] = [Math.floor(Math.min(...ys) * 0.95), Math.ceil(Math.max(...ys) * 1.04)];
  if (!data.length) return null;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--track)" vertical={false} />
          <XAxis dataKey="age" type="number" domain={[0, maxAge]} ticks={Array.from({ length: maxAge / 6 + 1 }, (_, i) => i * 6)} tick={{ fontSize: 12, fontWeight: 700, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
          <YAxis domain={domain} tick={{ fontSize: 12, fontWeight: 700, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={44} />
          <Area type="monotone" dataKey="wide" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="4 4" fill="var(--green-soft)" fillOpacity={1} isAnimationActive={false} />
          <Area type="monotone" dataKey="inner" stroke="none" fill="#B9EBCF" fillOpacity={1} isAnimationActive={false} />
          <Line type="monotone" dataKey="median" stroke="var(--green)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line data={child} type="linear" dataKey="value" stroke="var(--coral)" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Scatter data={child} dataKey="value" fill="var(--coral)" stroke="var(--ink)" strokeWidth={2} shape={(props: any) => <circle cx={props.cx} cy={props.cy} r={props.index === child.length - 1 ? 8 : 6} fill={props.index === child.length - 1 ? "var(--yellow)" : "var(--coral)"} stroke="var(--ink)" strokeWidth={2} />} isAnimationActive={false} />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              const c = payload?.find((p) => p.dataKey === "value")?.payload as { label?: string; value?: number } | undefined;
              if (!c?.label) return null;
              return (
                <div className="sb-hard-sm rounded-xl bg-white px-3 py-2 text-[13px] font-bold">
                  {c.label} · {num(c.value ?? 0)} {unit}
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-2 text-[13px] font-bold text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded-[3px] bg-[#B9EBCF] border border-[var(--ink)]" /> Rentang sehat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-1 rounded bg-[var(--green)]" /> Rata-rata anak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-1 rounded bg-[var(--coral)]" /> Anak Anda ({unit})
        </span>
      </div>
    </div>
  );
}
