"use client";

import { useActionState, useState } from "react";

import { addAccount } from "@/actions/onboarding";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { ACCOUNT_TYPES, isSpendable } from "@/lib/accounts/types";
import { PRESET_AKUN } from "@/lib/onboarding/presets";
import type { AccountType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

// Tambah akun di wizard: pilihan cepat mengisi nama + jenis, lalu saldo awal.
export function AccountStepForm({ existing }: { existing: string[] }) {
  const [state, action, pending] = useActionState(addAccount, {});
  const v = state.values ?? {};
  const [nama, setNama] = useState(v.name ?? "");
  const [jenis, setJenis] = useState<AccountType>((v.type as AccountType) || "bank");
  const err = state.fieldErrors ?? {};
  const sudah = new Set(existing.map((n) => n.toLowerCase()));

  return (
    <form action={action} className="grid gap-4" noValidate key={JSON.stringify(state.values)}>
      <FormAlert tone="error" message={state.error} />
      <div className="grid gap-2">
        <p className="text-sm font-medium">Pilihan cepat</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_AKUN.filter((p) => !sudah.has(p.name.toLowerCase())).map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setNama(p.name);
                setJenis(p.type);
              }}
              aria-pressed={nama === p.name}
              className={cn(
                "h-9 rounded-full border border-input bg-card px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                nama === p.name && "border-primary bg-primary/10 text-link",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <FormField
        name="name"
        label="Nama akun"
        placeholder="Contoh: BCA, GoPay, Dompet"
        maxLength={50}
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        errors={err.name}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Jenis</legend>
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.filter((t) => isSpendable(t.value)).map((t) => (
            <label
              key={t.value}
              className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-input bg-card text-sm font-medium has-checked:border-primary has-checked:bg-primary/10 has-checked:text-link has-focus-visible:ring-3 has-focus-visible:ring-ring/50 md:h-10"
            >
              <input type="radio" name="type" value={t.value} checked={jenis === t.value} onChange={() => setJenis(t.value)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <MoneyInput name="openingBalance" label="Saldo saat ini" defaultValue={v.openingBalance} errors={err.openingBalance} />
      <p className="-mt-2 text-xs text-muted-foreground">Isi sesuai saldo di m-banking/aplikasi sekarang. Boleh 0.</p>
      <Button type="submit" variant="outline" size="lg" className="h-11 md:h-10" disabled={pending}>
        {pending ? "Menambahkan..." : "+ Tambah akun"}
      </Button>
    </form>
  );
}
