import { z } from "zod";

import { isValidDateString } from "@/lib/dates";

import { rupiahInput } from "./money";

// Unit (gram, lembar, unit reksadana, koin) bukan uang: boleh desimal, koma atau titik
// sebagai pemisah desimal, maks. 10 angka di belakang koma. Disimpan sebagai string "2.5".
export const unitsInput = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const m = /^(\d{1,20})(?:[.,](\d{1,10}))?$/.exec(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Unit harus angka, contoh 2,5 atau 0,0132." });
      return z.NEVER;
    }
    const bulat = m[1]!.replace(/^0+(?=\d)/, "");
    const pecahan = (m[2] ?? "").replace(/0+$/, "");
    return pecahan ? `${bulat}.${pecahan}` : bulat;
  });

export const valuationSchema = z.object({
  marketValue: rupiahInput({ min: 0, label: "Nilai sekarang" }),
  valuedOn: z.string().trim().refine(isValidDateString, "Tanggal tidak valid."),
  units: unitsInput,
  note: z
    .string()
    .trim()
    .max(200, "Catatan maksimal 200 karakter.")
    .transform((v) => (v === "" ? null : v)),
});

// "2.5" → "2,5" untuk tampilan.
export const formatUnits = (u: string | null) => (u === null ? null : u.replace(".", ","));
