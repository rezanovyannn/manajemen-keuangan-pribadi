"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { TransactionFormState, TransactionFormValues } from "@/actions/transactions";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CategoryOption } from "@/lib/categories/options";
import { cn } from "@/lib/utils";
import type { TransactionFormType } from "@/lib/validators/transaction";

import { SelectField, type SelectOption } from "./select-field";
import { TypePicker } from "./type-picker";

type TransactionFormProps = {
  action: (prev: TransactionFormState, formData: FormData) => Promise<TransactionFormState>;
  accounts: SelectOption[];
  categories: CategoryOption[];
  initial: TransactionFormValues & { type: TransactionFormType; occurredOn: string };
  submitLabel: string;
  cancelHref: string;
  // Tampilkan tombol "Simpan & tambah lagi" (hanya untuk transaksi baru).
  allowContinue?: boolean;
  // Saat edit: transfer tidak bisa diganti jenis; pemasukan/pengeluaran hanya bisa saling tukar.
  allowedTypes?: TransactionFormType[];
  notice?: string;
};

function asType(v: string | undefined, fallback: TransactionFormType): TransactionFormType {
  return v === "income" || v === "expense" || v === "transfer" ? v : fallback;
}

export function TransactionForm(props: TransactionFormProps) {
  const [state, formAction, pending] = useActionState(props.action, {});
  // key: pasang ulang form saat server mengembalikan nilai agar defaultValue terpakai.
  return <FormBody key={JSON.stringify(state.values)} {...props} state={state} formAction={formAction} pending={pending} />;
}

function FormBody({
  accounts,
  categories,
  initial,
  submitLabel,
  cancelHref,
  allowContinue,
  allowedTypes,
  notice,
  state,
  formAction,
  pending,
}: TransactionFormProps & {
  state: TransactionFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const values = { ...initial, ...state.values };
  const [type, setType] = useState<TransactionFormType>(asType(values.type, initial.type));
  const err = state.fieldErrors ?? {};
  const kategoriTipe = categories.filter((c) => c.type === type);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert message={state.error} tone="error" />
      <FormAlert message={state.error ? undefined : notice} tone="success" />

      {allowedTypes?.length === 1 ? (
        <input type="hidden" name="type" value={type} />
      ) : (
        <TypePicker value={type} onChange={setType} allowed={allowedTypes} />
      )}

      <MoneyInput
        name="amount"
        label="Nominal"
        defaultValue={values.amount}
        errors={err.amount}
        autoFocus
        className="h-12 text-xl md:text-xl"
      />

      {type === "transfer" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="fromAccountId" label="Dari akun" placeholder="Pilih akun asal" options={accounts} defaultValue={values.fromAccountId || values.accountId} errors={err.fromAccountId} />
          <SelectField name="toAccountId" label="Ke akun" placeholder="Pilih akun tujuan" options={accounts} defaultValue={values.toAccountId} errors={err.toAccountId} />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="accountId" label="Akun" placeholder="Pilih akun" options={accounts} defaultValue={values.accountId || values.fromAccountId} errors={err.accountId} />
          <SelectField key={type} name="categoryId" label="Kategori" placeholder="Pilih kategori" options={kategoriTipe} defaultValue={values.categoryId} errors={err.categoryId} />
        </div>
      )}

      <FormField name="occurredOn" label="Tanggal" type="date" required defaultValue={values.occurredOn} errors={err.occurredOn} />
      <FormField name="note" label="Catatan (opsional)" placeholder="Contoh: makan siang" maxLength={200} autoComplete="off" defaultValue={values.note} errors={err.note} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
          Batal
        </Link>
        {allowContinue && (
          <Button type="submit" name="lanjut" value="1" variant="secondary" size="lg" className="h-10" disabled={pending}>
            Simpan & tambah lagi
          </Button>
        )}
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
