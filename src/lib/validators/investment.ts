import { z } from "zod";

import { isValidDateString } from "@/lib/dates";

import { multiplyPriceUnits } from "@/lib/money";

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

// Perbarui nilai: isi nilai total, ATAU harga per unit × unit (NAB × unit, harga/gram × gram).
export const valuationSchema = z
  .object({
    mode: z.enum(["total", "harga"]).catch("total"),
    marketValue: z.string(),
    pricePerUnit: z.string(),
    units: unitsInput,
    valuedOn: z.string().trim().refine(isValidDateString, "Tanggal tidak valid."),
    note: z
      .string()
      .trim()
      .max(200, "Catatan maksimal 200 karakter.")
      .transform((v) => (v === "" ? null : v)),
    // Setelah simpan: kembali ke halaman Akun (perbarui cepat) atau detail akun.
    returnTo: z.enum(["akun", "detail"]).catch("detail"),
  })
  .transform((v, ctx) => {
    let marketValue: number | null = null;
    if (v.mode === "total") {
      const r = rupiahInput({ min: 0, label: "Nilai sekarang" }).safeParse(v.marketValue);
      if (!r.success) ctx.addIssue({ code: "custom", path: ["marketValue"], message: r.error.issues[0]?.message ?? "Nilai tidak valid." });
      else marketValue = r.data;
    } else {
      if (!v.units) ctx.addIssue({ code: "custom", path: ["units"], message: "Isi jumlah unit." });
      const total = v.units ? multiplyPriceUnits(v.pricePerUnit, v.units) : null;
      if (v.pricePerUnit.trim() === "" || (v.units && total === null)) {
        ctx.addIssue({ code: "custom", path: ["pricePerUnit"], message: "Harga per unit harus angka, contoh 1.523,45." });
      }
      marketValue = total;
    }
    if (marketValue === null) return z.NEVER;
    return { marketValue, units: v.units, valuedOn: v.valuedOn, note: v.note, returnTo: v.returnTo };
  });

// "2.5" → "2,5" untuk tampilan.
export const formatUnits = (u: string | null) => (u === null ? null : u.replace(".", ","));
