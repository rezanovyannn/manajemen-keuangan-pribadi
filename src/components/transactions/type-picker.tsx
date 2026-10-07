"use client";

import { cn } from "@/lib/utils";
import type { TransactionFormType } from "@/lib/validators/transaction";

export const JENIS_TRANSAKSI: { value: TransactionFormType; label: string }[] = [
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
  { value: "transfer", label: "Transfer" },
];

// Pilihan aktif: garis + latar tipis berwarna (bukan blok penuh) agar tetap tenang.
const WARNA_AKTIF: Record<TransactionFormType, string> = {
  expense: "has-checked:border-rose-500 has-checked:bg-rose-500/10 has-checked:text-rose-700 dark:has-checked:text-rose-300",
  income: "has-checked:border-emerald-600 has-checked:bg-emerald-500/10 has-checked:text-emerald-800 dark:has-checked:text-emerald-300",
  transfer: "has-checked:border-primary has-checked:bg-primary/10 has-checked:text-link",
};

export function TypePicker({
  value,
  onChange,
  allowed = ["expense", "income", "transfer"],
}: {
  value: TransactionFormType;
  onChange: (v: TransactionFormType) => void;
  allowed?: TransactionFormType[];
}) {
  const pilihan = JENIS_TRANSAKSI.filter((j) => allowed.includes(j.value));
  return (
    <fieldset>
      <legend className="sr-only">Jenis transaksi</legend>
      <div className={cn("grid gap-2", pilihan.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {pilihan.map((j) => (
          <label
            key={j.value}
            className={cn(
              "flex h-11 md:h-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-card text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              WARNA_AKTIF[j.value],
            )}
          >
            <input
              type="radio"
              name="type"
              value={j.value}
              checked={value === j.value}
              onChange={() => onChange(j.value)}
              className="sr-only"
            />
            {j.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
