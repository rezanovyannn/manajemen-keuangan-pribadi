"use client";

import { CloudOff } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { SelectField } from "@/components/transactions/select-field";
import { TypePicker } from "@/components/transactions/type-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { todayInJakarta } from "@/lib/dates";
import { tambahItem } from "@/lib/offline/queue";
import { cn } from "@/lib/utils";
import { transactionSchema } from "@/lib/validators/transaction";

import { bacaAntrean, bacaOpsi, simpanAntrean } from "./storage";

const subscribe = () => () => {};

// Form tambah transaksi tanpa sinyal: disimpan di HP, dikirim otomatis saat online.
export function OfflineForm() {
  // Opsi akun/kategori dibaca dari HP (tersimpan saat terakhir membuka form online).
  const opsiRaw = useSyncExternalStore(subscribe, () => JSON.stringify(bacaOpsi()), () => "null");
  const opsi = JSON.parse(opsiRaw) as ReturnType<typeof bacaOpsi>;
  const [type, setType] = useState<"expense" | "income">("expense");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pesan, setPesan] = useState<string>();
  const [formKey, setFormKey] = useState(0);

  if (!opsi || opsi.accounts.length === 0) {
    return (
      <div className="grid gap-3 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        <CloudOff className="mx-auto size-6" aria-hidden />
        <p>Daftar akun belum tersimpan di HP ini. Buka halaman Tambah transaksi sekali saat online, lalu form offline siap dipakai.</p>
      </div>
    );
  }

  function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nilai = {
      type,
      amount: String(fd.get("amount") ?? ""),
      accountId: String(fd.get("accountId") ?? ""),
      categoryId: String(fd.get("categoryId") ?? ""),
      occurredOn: String(fd.get("occurredOn") ?? ""),
      note: String(fd.get("note") ?? ""),
    };
    // Validasi yang sama dengan server, agar kesalahan ketahuan sebelum masuk antrean.
    const parsed = transactionSchema.safeParse(nilai);
    if (!parsed.success) {
      const flat: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) (flat[String(issue.path[0])] ??= []).push(issue.message);
      setErrors(flat);
      setPesan(undefined);
      return;
    }
    const ok = simpanAntrean(tambahItem(bacaAntrean(), { id: crypto.randomUUID(), ...nilai, createdAt: new Date().toISOString() }));
    setErrors({});
    setPesan(ok ? "Tersimpan di HP. Akan dikirim otomatis saat online." : undefined);
    if (ok) setFormKey((k) => k + 1); // kosongkan form untuk transaksi berikutnya
    else setErrors({ amount: ["Penyimpanan HP penuh atau diblokir browser."] });
  }

  return (
    <form key={formKey} onSubmit={simpan} className="grid gap-5" noValidate>
      <FormAlert message={pesan} tone="success" />
      <TypePicker value={type} onChange={(t) => t !== "transfer" && setType(t)} allowed={["expense", "income"]} />
      <MoneyInput name="amount" label="Nominal" errors={errors.amount} autoFocus className="h-12 text-xl md:text-xl" />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField name="accountId" label="Akun" placeholder="Pilih akun" options={opsi.accounts} defaultValue={opsi.accounts[0]?.value} errors={errors.accountId} />
        <SelectField
          key={type}
          name="categoryId"
          label="Kategori"
          placeholder="Pilih kategori"
          options={opsi.categories.filter((c) => c.type === type)}
          errors={errors.categoryId}
        />
      </div>
      <FormField name="occurredOn" label="Tanggal" type="date" defaultValue={todayInJakarta()} errors={errors.occurredOn} />
      <FormField name="note" label="Catatan (opsional)" maxLength={200} autoComplete="off" errors={errors.note} />
      <p className="text-xs text-muted-foreground">Transfer dan biaya admin hanya bisa dicatat saat online.</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/beranda" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
          Ke Beranda
        </Link>
        <Button type="submit" size="lg" className="h-10">
          Simpan offline
        </Button>
      </div>
    </form>
  );
}
