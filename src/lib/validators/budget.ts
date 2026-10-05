import { z } from "zod";

import { isValidMonthString } from "@/lib/dates";

import { rupiahInput } from "./money";

export const monthSchema = z.string().refine(isValidMonthString, "Bulan tidak valid.");

export const budgetSchema = z.object({
  categoryId: z.uuid({ error: "Pilih kategori." }),
  month: monthSchema,
  amount: rupiahInput({ min: 1, label: "Batas budget" }),
});

export const budgetAmountSchema = z.object({
  amount: rupiahInput({ min: 1, label: "Batas budget" }),
});
