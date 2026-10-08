import { z } from "zod";

import { isValidDateString } from "@/lib/dates";

import { rupiahInput } from "./money";

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Nama tujuan wajib diisi.").max(50, "Nama maksimal 50 karakter."),
  targetAmount: rupiahInput({ min: 1, label: "Target" }),
  deadline: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidDateString(v), "Tenggat tidak valid.")
    .transform((v) => (v === "" ? null : v)),
});

// Sisihkan / Ambil tabungan (batas nominal dicek di server terhadap saldo; lihat
// checkAllocation di src/lib/money/allocation.ts).
export const goalAllocationSchema = z.object({
  kind: z.enum(["sisihkan", "ambil"], { error: "Pilih sisihkan atau ambil." }),
  accountId: z.uuid({ error: "Pilih akun." }),
  amount: rupiahInput({ min: 1, label: "Nominal" }),
  occurredOn: z.string().trim().refine(isValidDateString, "Tanggal tidak valid."),
  note: z
    .string()
    .trim()
    .max(200, "Catatan maksimal 200 karakter.")
    .transform((v) => (v === "" ? null : v)),
});
