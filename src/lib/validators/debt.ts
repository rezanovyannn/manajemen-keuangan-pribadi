import { z } from "zod";

import { isValidDateString } from "@/lib/dates";
import { parseRupiah } from "@/lib/money";

import { rupiahInput } from "./money";

const opsional = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter.`)
    .transform((v) => (v === "" ? null : v));

export const debtSchema = z
  .object({
    kind: z.enum(["utang", "piutang"], { error: "Pilih jenis." }),
    name: z.string().trim().min(1, "Nama wajib diisi.").max(50, "Nama maksimal 50 karakter."),
    counterparty: opsional(50, "Nama pihak"),
    principal: rupiahInput({ min: 1, label: "Jumlah" }),
    installmentAmount: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null;
        const n = parseRupiah(v);
        if (n === null || n < 1) {
          ctx.addIssue({ code: "custom", message: "Cicilan harus angka bulat lebih dari 0." });
          return z.NEVER;
        }
        return n;
      }),
    startDate: z.string().trim().refine(isValidDateString, "Tanggal mulai tidak valid."),
    dueDate: z
      .string()
      .trim()
      .refine((v) => v === "" || isValidDateString(v), "Tenggat tidak valid.")
      .transform((v) => (v === "" ? null : v)),
    note: opsional(200, "Catatan"),
  })
  .refine((v) => v.dueDate === null || v.dueDate >= v.startDate, {
    message: "Tenggat tidak boleh sebelum tanggal mulai.",
    path: ["dueDate"],
  });
