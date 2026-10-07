"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { formatTanggal, formatTanggalPendek } from "@/lib/dates";
import { formatRupiah, formatRupiahRingkas } from "@/lib/money";

export type ChartPoint = { date: string; balance: number; count: number };

// Satu seri (perkiraan total saldo per hari): area bertangga karena saldo berubah
// hanya di tanggal jadwal. Garis nol muncul jika saldo diperkirakan minus.
export function ProjectionChart({ data }: { data: ChartPoint[] }) {
  const minus = data.some((d) => d.balance < 0);
  return (
    <div className="h-48 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="isi-proyeksi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-income)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--series-income)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatTanggalPendek}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => formatRupiahRingkas(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            width={44}
            allowDecimals={false}
            domain={["auto", "auto"]}
          />
          {minus && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />}
          <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} content={TooltipIsi} />
          <Area
            type="stepAfter"
            dataKey="balance"
            stroke="var(--series-income)"
            strokeWidth={2}
            fill="url(#isi-proyeksi)"
            activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TooltipIsi({ active, payload, label }: TooltipContentProps) {
  const p = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !p || typeof label !== "string") return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{formatTanggal(label)}</p>
      <p className="tabular-nums">Perkiraan saldo: {formatRupiah(p.balance)}</p>
      {p.count > 0 && <p className="text-muted-foreground">{p.count} jadwal</p>}
    </div>
  );
}
