"use client";

import { useActionState, useState } from "react";

import { addQuickRule } from "@/actions/onboarding";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { SelectField } from "@/components/transactions/select-field";
import { Button } from "@/components/ui/button";
import type { CategoryOption } from "@/lib/categories/options";
import { PRESET_TAGIHAN } from "@/lib/onboarding/presets";
import { FREKUENSI } from "@/lib/recurring/schedule";
import { cn } from "@/lib/utils";

type Jenis = "expense" | "income";

const PILIHAN =
  "flex h-11 cursor-pointer items-center justify-center rounded-lg border border-input bg-card text-sm font-medium has-checked:border-primary has-checked:bg-primary/10 has-checked:text-link has-focus-visible:ring-3 has-focus-visible:ring-ring/50 md:h-10";
const CHIP =
  "h-9 rounded-full border border-input bg-card px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

// Tambah tagihan/pemasukan rutin satu per satu (jadi jadwal berulang; tidak dicatat otomatis).
export function RuleStepForm({
  accounts,
  categories,
  today,
}: {
  accounts: { value: string; label: string }[];
  categories: CategoryOption[];
  today: string;
}) {
  const [state, action, pending] = useActionState(addQuickRule, {});
  const v = state.values ?? {};
  const [nama, setNama] = useState(v.name ?? "");
  const [jenis, setJenis] = useState<Jenis>(v.type === "income" ? "income" : "expense");
  const [kategori, setKategori] = useState(v.categoryId ?? "");
  const err = state.fieldErrors ?? {};
  const pilihanKategori = categories.filter((c) => c.type === jenis);

  return (
    <form action={action} className="grid gap-4" noValidate key={JSON.stringify(state.values)}>
      <FormAlert tone="error" message={state.error} />
      <div className="grid gap-2">
        <p className="text-sm font-medium">Contoh</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_TAGIHAN.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={nama === p.name}
              onClick={() => {
                setNama(p.name);
                setJenis(p.type);
                setKategori(categories.find((c) => c.type === p.type && c.label === p.category)?.value ?? "");
              }}
              className={cn(CHIP, nama === p.name && "border-primary bg-primary/10 text-link")}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <FormField
        name="name"
        label="Nama"
        placeholder="Contoh: Listrik"
        maxLength={50}
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        errors={err.name}
      />
      <fieldset>
        <legend className="sr-only">Jenis</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((j) => (
            <label key={j} className={PILIHAN}>
              <input
                type="radio"
                name="type"
                value={j}
                checked={jenis === j}
                onChange={() => {
                  setJenis(j);
                  setKategori("");
                }}
                className="sr-only"
              />
              {j === "expense" ? "Tagihan" : "Pemasukan"}
            </label>
          ))}
        </div>
      </fieldset>
      <MoneyInput name="amount" label="Nominal perkiraan" defaultValue={v.amount} errors={err.amount} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="accountId"
          label="Akun"
          placeholder="Pilih akun"
          options={accounts}
          defaultValue={v.accountId ?? accounts[0]?.value ?? ""}
          errors={err.accountId}
        />
        <SelectField
          key={`${jenis}-${kategori}`}
          name="categoryId"
          label="Kategori"
          placeholder="Pilih kategori"
          options={pilihanKategori}
          defaultValue={kategori}
          errors={err.categoryId}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="frequency"
          label="Ulangi"
          placeholder="Pilih frekuensi"
          options={FREKUENSI}
          defaultValue={v.frequency ?? "monthly"}
          errors={err.frequency}
        />
        <FormField name="startDate" label="Jatuh tempo berikutnya" type="date" defaultValue={v.startDate ?? today} errors={err.startDate} />
      </div>
      <Button type="submit" variant="outline" size="lg" className="h-11 md:h-10" disabled={pending}>
        {pending ? "Menambahkan..." : "+ Tambah jadwal"}
      </Button>
    </form>
  );
}
