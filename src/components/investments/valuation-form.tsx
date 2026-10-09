"use client";

import { useActionState, useState } from "react";

import type { ValuationFormState } from "@/actions/investments";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { formatRupiah, multiplyPriceUnits } from "@/lib/money";
import { cn } from "@/lib/utils";

type Mode = "total" | "harga";

// Perbarui nilai pasar sesuai platform: isi nilai total, atau harga per unit × unit.
export function ValuationForm({
  action,
  today,
  returnTo = "detail",
  lastUnits = null,
}: {
  action: (prev: ValuationFormState, formData: FormData) => Promise<ValuationFormState>;
  today: string;
  returnTo?: "akun" | "detail";
  lastUnits?: string | null; // unit terakhir (mis. "2.5"), sebagai isian awal
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  const [mode, setMode] = useState<Mode>(v.mode === "harga" ? "harga" : "total");
  const [harga, setHarga] = useState(v.pricePerUnit ?? "");
  const [unit, setUnit] = useState(v.units ?? (lastUnits ? lastUnits.replace(".", ",") : ""));
  const unitNormal = unit.trim().replace(",", ".");
  const pratinjau = mode === "harga" && harga && /^\d+(\.\d+)?$/.test(unitNormal) ? multiplyPriceUnits(harga, unitNormal) : null;

  return (
    <form action={formAction} className="grid gap-4" noValidate key={JSON.stringify(state.values)}>
      <FormAlert tone="error" message={state.error} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="mode" value={mode} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Cara mengisi nilai">
        {(
          [
            ["total", "Nilai total"],
            ["harga", "Harga × unit"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "total" ? (
        <MoneyInput name="marketValue" label="Nilai sekarang (sesuai platform)" defaultValue={v.marketValue} errors={err.marketValue} />
      ) : (
        <>
          <input type="hidden" name="marketValue" value="" />
          <FormField
            name="pricePerUnit"
            label="Harga per unit"
            placeholder="Contoh: NAB 1.523,45 atau harga/gram"
            inputMode="decimal"
            autoComplete="off"
            value={harga}
            onChange={(e) => setHarga(e.target.value)}
            errors={err.pricePerUnit}
          />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="units"
          label={mode === "harga" ? "Jumlah unit" : "Unit (opsional)"}
          placeholder="Contoh: 2,5 atau 650,25"
          inputMode="decimal"
          autoComplete="off"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          errors={err.units}
        />
        <FormField name="valuedOn" label="Tanggal" type="date" defaultValue={v.valuedOn ?? today} errors={err.valuedOn} />
      </div>
      {mode === "harga" && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm" aria-live="polite">
          Nilai sekarang: <span className="font-semibold tabular-nums">{pratinjau === null ? "—" : formatRupiah(pratinjau)}</span>
        </p>
      )}
      <FormField name="note" label="Catatan (opsional)" maxLength={200} autoComplete="off" defaultValue={v.note} errors={err.note} />
      <p className="text-xs text-muted-foreground">
        Naik/turun nilai dicatat sebagai untung/rugi belum terealisasi: tidak masuk pemasukan, pengeluaran, maupun budget.
      </p>
      <Button type="submit" size="lg" className="h-11 md:h-10" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan nilai"}
      </Button>
    </form>
  );
}
