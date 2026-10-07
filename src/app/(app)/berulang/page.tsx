import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-field";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatTanggal } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { frequencyLabel, isFinished } from "@/lib/recurring/schedule";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transaksi Berulang · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  tersimpan: { tone: "success", text: "Jadwal tersimpan." },
  diubah: { tone: "success", text: "Perubahan tersimpan." },
  dijeda: { tone: "success", text: "Jadwal dijeda. Saran pencatatan tidak akan muncul." },
  dilanjutkan: { tone: "success", text: "Jadwal dilanjutkan." },
  dihapus: { tone: "success", text: "Jadwal dihapus. Transaksi yang sudah tercatat tetap ada." },
  gagal: { tone: "error", text: "Perubahan gagal disimpan. Silakan coba lagi." },
};

export default async function BerulangPage({ searchParams }: PageProps<"/berulang">) {
  const { status } = await searchParams;
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("recurring_rules")
    .select("id, name, type, amount, frequency, end_date, next_due_date, paused")
    .order("next_due_date");
  if (error) console.error("[recurring] daftar gagal", { code: error.code });
  const pesan = typeof status === "string" ? PESAN[status] : undefined;

  return (
    <div className="grid max-w-xl grid-cols-1 gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Transaksi berulang" description="Tagihan dan pemasukan rutin. Aplikasi menyarankan, Anda yang mencatat." />
        <Link href="/berulang/baru" className={cn(buttonVariants({ size: "lg" }), "h-10 shrink-0")}>
          <Plus aria-hidden />
          Tambah
        </Link>
      </div>

      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      <FormAlert tone="error" message={error ? "Daftar jadwal gagal dimuat." : undefined} />

      {(data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Belum ada jadwal. Tambahkan gaji, langganan, cicilan, atau sewa.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {(data ?? []).map((r) => {
            const selesai = isFinished(r);
            return (
              <li key={r.id}>
                <Link href={`/berulang/${r.id}`} className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {frequencyLabel(r.frequency)} ·{" "}
                      {r.paused ? "Dijeda" : selesai ? "Selesai" : `berikutnya ${formatTanggal(r.next_due_date)}`}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">
                    {r.type === "income" ? "+" : "−"}
                    {formatRupiah(r.amount)}
                  </p>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
