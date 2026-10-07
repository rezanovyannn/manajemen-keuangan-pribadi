"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { pesanErrorTransaksi } from "@/lib/transactions/errors";
import { idSchema } from "@/lib/validators/common";
import { transactionSchema } from "@/lib/validators/transaction";

export type HasilSinkron = {
  perluMasuk?: boolean;
  terkirim: string[];
  gagal: { id: string; pesan: string }[];
};

const itemSchema = z.object({ id: idSchema, type: z.enum(["expense", "income"]) }).passthrough();
const MAKS_PER_KIRIM = 100;

// Kirim antrean transaksi offline. Setiap item divalidasi ulang di server (Zod) dan
// disimpan dengan id dari HP: jika id sudah ada (pernah terkirim), dianggap terkirim.
export async function syncOfflineTransactions(items: unknown): Promise<HasilSinkron> {
  const daftar = Array.isArray(items) ? items.slice(0, MAKS_PER_KIRIM) : [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Tidak memakai requireUser(): redirect di tengah sinkron di latar belakang tidak diinginkan.
  if (!user) return { perluMasuk: true, terkirim: [], gagal: [] };

  const hasil: HasilSinkron = { terkirim: [], gagal: [] };
  for (const raw of daftar) {
    const dasar = itemSchema.safeParse(raw);
    if (!dasar.success) continue; // item asing/rusak: abaikan, jangan kirim
    const id = dasar.data.id;
    const r = raw as Record<string, unknown>;
    const parsed = transactionSchema.safeParse({
      type: dasar.data.type,
      amount: r.amount,
      accountId: r.accountId,
      categoryId: r.categoryId,
      occurredOn: r.occurredOn,
      note: r.note,
    });
    if (!parsed.success || parsed.data.type === "transfer") {
      const pesan = parsed.success ? "Transfer harus dicatat saat online." : (parsed.error.issues[0]?.message ?? "Data tidak valid.");
      hasil.gagal.push({ id, pesan });
      continue;
    }

    const d = parsed.data;
    const { error } = await supabase.from("transactions").insert({
      id,
      user_id: user.id,
      type: d.type,
      account_id: d.accountId,
      category_id: d.categoryId,
      amount: d.amount,
      occurred_on: d.occurredOn,
      note: d.note,
    });
    // 23505 pada primary key: sudah pernah terkirim (pengiriman ulang) -> anggap berhasil.
    if (!error || (error.code === "23505" && error.message.includes("transactions_pkey"))) {
      hasil.terkirim.push(id);
    } else {
      console.error("[offline] kirim gagal", { code: error.code });
      hasil.gagal.push({ id, pesan: pesanErrorTransaksi(error) });
    }
  }

  if (hasil.terkirim.length > 0) {
    revalidatePath("/transaksi");
    revalidatePath("/akun");
    revalidatePath("/beranda");
  }
  return hasil;
}
