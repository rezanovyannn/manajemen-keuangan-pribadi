import { z } from "zod";

import { ACCOUNT_TYPE_VALUES, INVESTMENT_KIND_VALUES } from "@/lib/accounts/types";

import { rupiahInput } from "./money";

export const accountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama akun wajib diisi.")
      .max(50, "Nama akun maksimal 50 karakter."),
    type: z.enum(ACCOUNT_TYPE_VALUES, { error: "Pilih jenis akun." }),
    openingBalance: rupiahInput({ label: "Saldo awal" }),
    // Jenis aset: wajib untuk akun investasi, diabaikan untuk akun lain.
    investmentKind: z.string().optional(),
  })
  .transform((v, ctx) => {
    if (v.type !== "investment") return { ...v, investmentKind: null };
    const k = INVESTMENT_KIND_VALUES.find((x) => x === v.investmentKind);
    if (!k) {
      ctx.addIssue({ code: "custom", path: ["investmentKind"], message: "Pilih jenis aset." });
      return z.NEVER;
    }
    return { ...v, investmentKind: k };
  });

export type AccountInput = z.infer<typeof accountSchema>;
