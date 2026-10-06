import { z } from "zod";

import { isValidDateString } from "@/lib/dates";

import { rupiahInput } from "./money";

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Nama tujuan wajib diisi.").max(50, "Nama maksimal 50 karakter."),
  accountId: z.uuid({ error: "Pilih akun tabungan." }),
  targetAmount: rupiahInput({ min: 1, label: "Target" }),
  deadline: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidDateString(v), "Tenggat tidak valid.")
    .transform((v) => (v === "" ? null : v)),
});
