"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatBulan, formatBulanPendek } from "@/lib/dates";
import { formatRupiah, formatRupiahRingkas, type TrendPoint } from "@/lib/money";

const SERI = [
  { key: "income", label: "Pemasukan", color: "var(--series-income)" },
  { key: "expense", label: "Pengeluaran", color: "var(--series-expense)" },
] as const;

// Tren 6 bulan: batang berkelompok, satu sumbu (Rupiah), legenda + tooltip + tabel.
export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <figure className="grid grid-cols-1 gap-3">
      <figcaption className="sr-only">Pemasukan dan pengeluaran per bulan, {data.length} bulan terakhir</figcaption>

      <ul className="flex gap-4 text-xs text-muted-foreground" aria-label="Legenda">
        {SERI.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="h-56 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatBulanPendek}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              interval={0}
            />
            <YAxis
              tickFormatter={(v: number) => formatRupiahRingkas(v)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={44}
              allowDecimals={false}
            />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={TooltipIsi} />
            {SERI.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Bulan</th>
              <th className="py-1 text-right font-medium">Pemasukan</th>
              <th className="py-1 text-right font-medium">Pengeluaran</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-t border-border">
                <td className="py-1">{formatBulan(d.month)}</td>
                <td className="py-1 text-right">{formatRupiah(d.income)}</td>
                <td className="py-1 text-right">{formatRupiah(d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function TooltipIsi({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length || typeof label !== "string") return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{formatBulan(label)}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-1.5 tabular-nums">
          <span aria-hidden className="size-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: {formatRupiah(Number(p.value))}
        </p>
      ))}
    </div>
  );
}
