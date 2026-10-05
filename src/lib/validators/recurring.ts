import { z } from "zod";

import { isValidDateString } from "@/lib/dates";
import { FREQUENCY_VALUES } from "@/lib/recurring/schedule";

import { rupiahInput } from "./money";

const tanggal = (pesan: string) => z.string().trim().refine(isValidDateString, pesan);

export const recurringRuleSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi.").max(50, "Nama maksimal 50 karakter."),
    type: z.enum(["expense", "income"], { error: "Pilih jenis." }),
    accountId: z.uuid({ error: "Pilih akun." }),
    categoryId: z.uuid({ error: "Pilih kategori." }),
    amount: rupiahInput({ min: 1, label: "Nominal" }),
    frequency: z.enum(FREQUENCY_VALUES, { error: "Pilih frekuensi." }),
    startDate: tanggal("Tanggal mulai tidak valid."),
    endDate: z
      .string()
      .trim()
      .refine((v) => v === "" || isValidDateString(v), "Tanggal berakhir tidak valid.")
      .transform((v) => (v === "" ? null : v)),
    note: z
      .string()
      .trim()
      .max(200, "Catatan maksimal 200 karakter.")
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((v) => v.endDate === null || v.endDate >= v.startDate, {
    message: "Tanggal berakhir tidak boleh sebelum tanggal mulai.",
    path: ["endDate"],
  });

// Penanda jadwal yang ikut dikirim dari form transaksi saat menekan "Catat".
export const recurringMarkSchema = z.object({
  ruleId: z.uuid(),
  date: tanggal("Tanggal jadwal tidak valid."),
});

export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>;
