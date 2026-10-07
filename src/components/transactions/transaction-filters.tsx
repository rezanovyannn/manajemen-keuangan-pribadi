import { Search } from "lucide-react";
import Link from "next/link";

import type { SelectOption } from "@/components/transactions/select-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TransactionFilters } from "@/lib/transactions/query";
import { cn } from "@/lib/utils";

const SELECT =
  "h-10 w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

export function hrefBulan(filters: TransactionFilters, month: string) {
  const p = new URLSearchParams({ bulan: month });
  if (filters.accountId) p.set("akun", filters.accountId);
  if (filters.categoryId) p.set("kategori", filters.categoryId);
  if (filters.search) p.set("cari", filters.search);
  return `/transaksi?${p}`;
}

// Form GET biasa: filter tersimpan di URL dan tetap jalan tanpa JavaScript.
export function TransactionFiltersForm({
  filters,
  accounts,
  categories,
}: {
  filters: TransactionFilters;
  accounts: SelectOption[];
  categories: SelectOption[];
}) {
  const aktif = Boolean(filters.accountId || filters.categoryId || filters.search);
  return (
    <details open={aktif} className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        Filter & cari{aktif ? " (aktif)" : ""}
      </summary>
      <form action="/transaksi" className="grid gap-3 border-t border-border p-4">
        <input type="hidden" name="bulan" value={filters.month} />
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden />
          <Input name="cari" type="search" aria-label="Cari catatan" placeholder="Cari catatan..." defaultValue={filters.search} className="h-10 pl-9" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="akun" aria-label="Filter akun" defaultValue={filters.accountId ?? ""} className={SELECT}>
            <option value="">Semua akun</option>
            {accounts.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <select name="kategori" aria-label="Filter kategori" defaultValue={filters.categoryId ?? ""} className={SELECT}>
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 sm:justify-end">
          {aktif && (
            <Link href={`/transaksi?bulan=${filters.month}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 flex-1 sm:flex-none")}>
              Reset
            </Link>
          )}
          <Button type="submit" size="lg" className="h-10 flex-1 sm:flex-none">
            Terapkan
          </Button>
        </div>
      </form>
    </details>
  );
}
