import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email wajib diisi.")
  .pipe(z.email("Format email tidak valid."));

export const masukSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi."),
});

export const daftarSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  email,
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(72, "Password maksimal 72 karakter."),
});

export type MasukInput = z.infer<typeof masukSchema>;
export type DaftarInput = z.infer<typeof daftarSchema>;
