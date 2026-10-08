import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-field";
import { GoalCard } from "@/components/goals/goal-card";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { loadGoals } from "@/lib/goals/query";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tujuan Tabungan · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  tersimpan: { tone: "success", text: "Tujuan tersimpan." },
  diubah: { tone: "success", text: "Perubahan tersimpan." },
  dihapus: { tone: "success", text: "Tujuan dihapus. Tabungannya kembali menjadi saldo bebas." },
  gagal: { tone: "error", text: "Perubahan gagal disimpan. Silakan coba lagi." },
};

export default async function TujuanPage({ searchParams }: PageProps<"/tujuan">) {
  const { status } = await searchParams;
  const { supabase } = await requireUser();
  const { items, error } = await loadGoals(supabase, todayInJakarta());
  const pesan = typeof status === "string" ? PESAN[status] : undefined;

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:gap-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Tujuan tabungan" description="Sisihkan tabungan dari akun mana saja; saldo akunnya tetap." />
        <Link href="/tujuan/baru" className={cn(buttonVariants({ size: "lg" }), "h-11 md:h-10 shrink-0")}>
          <Plus aria-hidden />
          Tambah
        </Link>
      </div>
      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      <FormAlert tone="error" message={error ? "Tujuan gagal dimuat." : undefined} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Belum ada tujuan. Buat tujuan, lalu sisihkan tabungan dari akun mana saja.
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          {items.map((g) => (
            <li key={g.id}>
              <GoalCard goal={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
