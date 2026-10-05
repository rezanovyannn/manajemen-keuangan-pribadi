"use client";

import { cn } from "@/lib/utils";
import type { TransactionFormType } from "@/lib/validators/transaction";

export const JENIS_TRANSAKSI: { value: TransactionFormType; label: string }[] = [
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
  { value: "transfer", label: "Transfer" },
];

const WARNA_AKTIF: Record<TransactionFormType, string> = {
  expense: "has-checked:bg-rose-600 has-checked:text-white has-checked:border-rose-600",
  income: "has-checked:bg-emerald-600 has-checked:text-white has-checked:border-emerald-600",
  transfer: "has-checked:bg-primary has-checked:text-primary-foreground has-checked:border-primary",
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
              "flex h-10 cursor-pointer items-center justify-center rounded-lg border border-input text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
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
