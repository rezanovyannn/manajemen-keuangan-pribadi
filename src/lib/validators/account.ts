import { z } from "zod";

import { ACCOUNT_TYPE_VALUES } from "@/lib/accounts/types";

import { rupiahInput } from "./money";

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama akun wajib diisi.")
    .max(50, "Nama akun maksimal 50 karakter."),
  type: z.enum(ACCOUNT_TYPE_VALUES, { error: "Pilih jenis akun." }),
  openingBalance: rupiahInput({ label: "Saldo awal" }),
});

export type AccountInput = z.infer<typeof accountSchema>;
