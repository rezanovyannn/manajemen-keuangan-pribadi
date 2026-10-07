import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Period, PeriodKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

const PILIHAN: { key: Exclude<PeriodKey, "kustom">; label: string }[] = [
  { key: "bulan-ini", label: "Bulan ini" },
  { key: "bulan-lalu", label: "Bulan lalu" },
];

// Pilih periode lewat URL (?periode=...), tetap jalan tanpa JavaScript.
export function PeriodPicker({ period }: { period: Period }) {
  const kustom = period.key === "kustom" || period.invalid;
  return (
    <div className="grid grid-cols-1 gap-2">
      <nav aria-label="Periode" className="grid grid-cols-3 rounded-lg border border-border p-0.5">
        {PILIHAN.map((p) => (
          <Link
            key={p.key}
            href={`/beranda?periode=${p.key}`}
            aria-current={period.key === p.key && !period.invalid ? "page" : undefined}
            className={cn(
              "flex h-9 items-center justify-center rounded-md text-sm font-medium text-muted-foreground",
              period.key === p.key && !period.invalid && "bg-muted text-foreground",
            )}
          >
            {p.label}
          </Link>
        ))}
        <Link
          href={`/beranda?periode=kustom&dari=${period.from}&sampai=${period.to}`}
          aria-current={kustom ? "page" : undefined}
          className={cn(
            "flex h-9 items-center justify-center rounded-md text-sm font-medium text-muted-foreground",
            kustom && "bg-muted text-foreground",
          )}
        >
          Kustom
        </Link>
      </nav>

      {kustom && (
        <form action="/beranda" className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="periode" value="kustom" />
          <div className="grid gap-2">
            <Label htmlFor="periode-dari">Dari</Label>
            <Input id="periode-dari" name="dari" type="date" required defaultValue={period.from} className="h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="periode-sampai">Sampai</Label>
            <Input id="periode-sampai" name="sampai" type="date" required defaultValue={period.to} className="h-10" />
          </div>
          <Button type="submit" size="lg" className="h-10">
            Terapkan
          </Button>
          {period.invalid && (
            <p role="alert" className="text-sm text-destructive sm:col-span-3">
              Rentang tanggal tidak valid (maksimal 366 hari, tanggal awal tidak boleh setelah tanggal akhir). Menampilkan bulan ini.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
