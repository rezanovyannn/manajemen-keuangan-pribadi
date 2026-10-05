import { z } from "zod";

import { CATEGORY_TYPE_VALUES } from "@/lib/categories/tree";

const name = z
  .string()
  .trim()
  .min(1, "Nama kategori wajib diisi.")
  .max(50, "Nama kategori maksimal 50 karakter.");

export const categorySchema = z.object({
  name,
  type: z.enum(CATEGORY_TYPE_VALUES, { error: "Pilih tipe kategori." }),
  // "" dari <select> berarti kategori utama (tanpa induk).
  parentId: z
    .union([z.literal(""), z.uuid({ error: "Induk kategori tidak valid." })])
    .transform((v) => (v === "" ? null : v)),
});

export const categoryNameSchema = z.object({ name });

export type CategoryInput = z.infer<typeof categorySchema>;
