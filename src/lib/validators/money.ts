import { z } from "zod";

import { formatRupiah, parseRupiah } from "@/lib/money";

// Input nominal dari form (teks seperti "1.250.000") menjadi bilangan bulat Rupiah.
export function rupiahInput({ min = 0, label = "Nominal" }: { min?: number; label?: string } = {}) {
  return z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .transform((v, ctx) => {
      const n = parseRupiah(v);
      if (n === null) {
        ctx.addIssue({ code: "custom", message: `${label} harus angka bulat, contoh 1.250.000.` });
        return z.NEVER;
      }
      if (n < min) {
        ctx.addIssue({ code: "custom", message: `${label} minimal ${formatRupiah(min)}.` });
        return z.NEVER;
      }
      return n;
    });
}
