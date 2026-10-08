import type { AccountType } from "@/lib/supabase/database.types";

import { isValidAmount, parseRupiah } from "@/lib/money";

// "Ketik bebas" untuk Catat kilat: "kopi 25rb gopay", "gaji 8jt bca", "parkir 5k".
// Berbasis aturan (tanpa AI). Nominal selalu bilangan bulat Rupiah; pecahan seperti
// "1,5jt" dihitung dengan string digit, bukan float.

export type ParsedQuick = {
  amount: number | null;
  accountId: string | null;
  type: "expense" | "income" | null; // null = tidak ada petunjuk (pakai pilihan sekarang)
  note: string;
};

const PENGALI: Record<string, number> = { rb: 1_000, ribu: 1_000, k: 1_000, jt: 1_000_000, juta: 1_000_000 };

// Angka + satuan opsional. Contoh: 25rb, 25 rb, 1,5jt, 1.5 juta, 1.250.000, Rp25.000, 25000.
const NOMINAL = /(?<![\p{L}\d])(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(ribu|rb|juta|jt|k)?(?![\p{L}\d])/giu;

// Ubah "1,5" + pengali 1.000.000 → 1.500.000 tanpa float. null jika tidak bulat/terlalu besar.
function kali(angka: string, pengali: number): number | null {
  const [bulat, pecahan = ""] = angka.split(/[.,]/);
  if (angka.split(/[.,]/).length > 2) return null;
  const skala = 10 ** pecahan.length;
  const total = BigInt(bulat!) * BigInt(pengali) * BigInt(skala) + BigInt(pecahan || "0") * BigInt(pengali);
  if (total % BigInt(skala) !== BigInt(0)) return null;
  const n = Number(total / BigInt(skala));
  return isValidAmount(n) && n > 0 ? n : null;
}

export function parseAmountToken(angka: string, satuan: string | undefined): number | null {
  if (satuan) return kali(angka, PENGALI[satuan.toLowerCase()]!);
  // Tanpa satuan: angka biasa atau pemisah ribuan titik ("1.250.000"); "1,5" ditolak.
  const n = parseRupiah(angka);
  return n !== null && n > 0 ? n : null;
}

// Kata yang menandakan pemasukan.
const KATA_MASUK = /(?<![\p{L}])(gaji|gajian|bonus|thr|terima|diterima|dapat|dapet|cashback|refund|jual|hadiah|transferan|untung|komisi|freelance|honor)(?![\p{L}])/iu;
// Kata penghubung yang dibuang dari catatan bila tertinggal.
const PENGHUBUNG = /(?<![\p{L}])(pakai|pake|via|dari|ke|pakek|dgn|dengan|bayar pakai)(?![\p{L}])/giu;
// Sebutan umum untuk akun tunai.
const KATA_TUNAI = /(?<![\p{L}])(cash|tunai|dompet|uang tunai)(?![\p{L}])/iu;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parseQuickText(text: string, accounts: { id: string; name: string; type: AccountType }[]): ParsedQuick {
  let sisa = ` ${text.trim()} `;

  // Nominal: utamakan angka bersatuan ("40rb"), lalu yang terbesar; angka kecil seperti
  // "2" di "beli 2 kopi 40rb" tetap menjadi bagian catatan.
  const kandidat = [...sisa.matchAll(NOMINAL)]
    .map((m) => ({ m, n: parseAmountToken(m[1]!, m[2]), bersatuan: Boolean(m[2]) }))
    .filter((k): k is { m: RegExpExecArray; n: number; bersatuan: boolean } => k.n !== null)
    .sort((x, y) => Number(y.bersatuan) - Number(x.bersatuan) || y.n - x.n);
  const pilih = kandidat[0];
  const amount = pilih?.n ?? null;
  if (pilih) sisa = sisa.slice(0, pilih.m.index) + " " + sisa.slice(pilih.m.index + pilih.m[0].length);

  // Akun: nama akun (yang terpanjang lebih dulu, mis. "Cash On Hand" sebelum "Cash").
  let accountId: string | null = null;
  for (const a of [...accounts].sort((x, y) => y.name.length - x.name.length)) {
    const re = new RegExp(`(?<![\\p{L}\\d])${escape(a.name)}(?![\\p{L}\\d])`, "iu");
    if (re.test(sisa)) {
      accountId = a.id;
      sisa = sisa.replace(re, " ");
      break;
    }
  }
  if (!accountId && KATA_TUNAI.test(sisa)) {
    const tunai = accounts.find((a) => a.type === "cash");
    if (tunai) {
      accountId = tunai.id;
      sisa = sisa.replace(KATA_TUNAI, " ");
    }
  }

  const type = KATA_MASUK.test(sisa) ? "income" : null;
  const note = sisa.replace(PENGHUBUNG, " ").replace(/\s+/g, " ").trim();
  return { amount, accountId, type, note: note ? note[0]!.toUpperCase() + note.slice(1) : "" };
}
