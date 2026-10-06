import { z } from "zod";

import { isValidDateString } from "@/lib/dates";
import { parseRupiah } from "@/lib/money";

import { rupiahInput } from "./money";

const uuid = (pesan: string) => z.uuid({ error: pesan });

const umum = {
  amount: rupiahInput({ min: 1, label: "Nominal" }),
  occurredOn: z
    .string()
    .trim()
    .refine(isValidDateString, "Tanggal tidak valid."),
  note: z
    .string()
    .trim()
    .max(200, "Catatan maksimal 200 karakter.")
    .transform((v) => (v === "" ? null : v)),
  // Biaya admin opsional: kosong / 0 berarti tanpa biaya.
  fee: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      const v = (raw ?? "").trim();
      if (v === "") return null;
      const n = parseRupiah(v);
      if (n === null || n < 0) {
        ctx.addIssue({ code: "custom", message: "Biaya admin harus angka bulat, contoh 2.500." });
        return z.NEVER;
      }
      return n === 0 ? null : n;
    }),
};

const pemasukanPengeluaran = {
  accountId: uuid("Pilih akun."),
  categoryId: uuid("Pilih kategori."),
  ...umum,
};

export const transactionSchema = z.discriminatedUnion(
  "type",
  [
    z.object({ type: z.literal("expense"), ...pemasukanPengeluaran }),
    z.object({ type: z.literal("income"), ...pemasukanPengeluaran }),
    z
      .object({
        type: z.literal("transfer"),
        fromAccountId: uuid("Pilih akun asal."),
        toAccountId: uuid("Pilih akun tujuan."),
        ...umum,
      })
      .refine((v) => v.fromAccountId !== v.toAccountId, {
        message: "Akun tujuan harus berbeda dari akun asal.",
        path: ["toAccountId"],
      }),
  ],
  { error: "Pilih jenis transaksi." },
);

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFormType = TransactionInput["type"];
