import type { AccountType } from "@/lib/supabase/database.types";

// Pilihan cepat di wizard. Hanya mengisi form; pengguna tetap bisa mengubah nama/jenis.
export const PRESET_AKUN: { name: string; type: AccountType }[] = [
  { name: "BCA", type: "bank" },
  { name: "BRI", type: "bank" },
  { name: "Mandiri", type: "bank" },
  { name: "BNI", type: "bank" },
  { name: "GoPay", type: "ewallet" },
  { name: "OVO", type: "ewallet" },
  { name: "DANA", type: "ewallet" },
  { name: "ShopeePay", type: "ewallet" },
  { name: "Tunai", type: "cash" },
];

// Kategori default (lihat migrasi categories) yang ditawarkan di "Budget cepat".
export const KATEGORI_BUDGET_CEPAT = ["Makan & Minum", "Transportasi", "Belanja", "Tagihan"] as const;

// Contoh tagihan/pemasukan rutin; kategori dicocokkan dengan nama kategori default.
export const PRESET_TAGIHAN: { name: string; type: "expense" | "income"; category: string }[] = [
  { name: "Gaji", type: "income", category: "Gaji" },
  { name: "Listrik", type: "expense", category: "Tagihan" },
  { name: "Internet", type: "expense", category: "Tagihan" },
  { name: "Pulsa & data", type: "expense", category: "Tagihan" },
  { name: "Netflix", type: "expense", category: "Hiburan" },
  { name: "Spotify", type: "expense", category: "Hiburan" },
  { name: "Kos / sewa", type: "expense", category: "Tagihan" },
];
