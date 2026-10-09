"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatTanggal, formatTanggalPendek } from "@/lib/dates";
import { formatRupiah, formatRupiahRingkas } from "@/lib/money";

type Titik = { date: string; value: number };

// Satu seri: nilai investasi pada tiap pembaruan. Tabel lengkapnya ada di "Riwayat nilai".
export function ValuationChart({ data }: { data: Titik[] }) {
  if (data.length < 2) return null;
  return (
    <figure className="grid gap-1">
      <figcaption className="text-xs text-muted-foreground">Nilai dari waktu ke waktu</figcaption>
      <div className="h-44 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} content={Isi} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--series-income)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--series-income)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function Isi({ active, payload, label }: TooltipContentProps) {
  const p = payload?.[0]?.payload as Titik | undefined;
  if (!active || !p || typeof label !== "string") return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{formatTanggal(label)}</p>
      <p className="tabular-nums">{formatRupiah(p.value)}</p>
    </div>
  );
}
