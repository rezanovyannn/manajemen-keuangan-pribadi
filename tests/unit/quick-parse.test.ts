import { describe, expect, it } from "vitest";

import { parseAmountToken, parseQuickText } from "@/lib/quick-add/parse";

const AKUN = [
  { id: "gopay", name: "GoPay", type: "ewallet" as const },
  { id: "bca", name: "BCA", type: "bank" as const },
  { id: "cash", name: "Cash On Hand", type: "cash" as const },
  { id: "jago", name: "Bank Jago", type: "bank" as const },
];

describe("parseAmountToken", () => {
  it("satuan rb/ribu/k/jt/juta", () => {
    expect(parseAmountToken("25", "rb")).toBe(25_000);
    expect(parseAmountToken("25", "ribu")).toBe(25_000);
    expect(parseAmountToken("5", "k")).toBe(5_000);
    expect(parseAmountToken("8", "jt")).toBe(8_000_000);
    expect(parseAmountToken("2", "juta")).toBe(2_000_000);
  });

  it("pecahan dengan koma/titik tanpa float", () => {
    expect(parseAmountToken("1,5", "jt")).toBe(1_500_000);
    expect(parseAmountToken("1.25", "jt")).toBe(1_250_000);
    expect(parseAmountToken("2,5", "rb")).toBe(2_500);
    expect(parseAmountToken("0,1", "jt")).toBe(100_000);
    // Tidak bulat dalam Rupiah → ditolak, bukan dibulatkan diam-diam.
    expect(parseAmountToken("1,2345", "rb")).toBeNull();
  });

  it("tanpa satuan: angka biasa / pemisah ribuan; desimal ditolak", () => {
    expect(parseAmountToken("25000", undefined)).toBe(25_000);
    expect(parseAmountToken("1.250.000", undefined)).toBe(1_250_000);
    expect(parseAmountToken("1,5", undefined)).toBeNull();
    expect(parseAmountToken("0", undefined)).toBeNull();
  });
});

describe("parseQuickText", () => {
  it("contoh umum pengeluaran", () => {
    expect(parseQuickText("kopi 25rb gopay", AKUN)).toEqual({ amount: 25_000, accountId: "gopay", type: null, note: "Kopi" });
    expect(parseQuickText("parkir 5k", AKUN)).toEqual({ amount: 5_000, accountId: null, type: null, note: "Parkir" });
    expect(parseQuickText("Rp25.000 makan siang pakai BCA", AKUN)).toEqual({ amount: 25_000, accountId: "bca", type: null, note: "Makan siang" });
  });

  it("pemasukan dari kata kunci", () => {
    expect(parseQuickText("gaji 8jt bca", AKUN)).toEqual({ amount: 8_000_000, accountId: "bca", type: "income", note: "Gaji" });
    expect(parseQuickText("dapet cashback 12rb gopay", AKUN)).toMatchObject({ amount: 12_000, type: "income" });
  });

  it("nama akun multi-kata & sebutan tunai", () => {
    expect(parseQuickText("bensin 30rb bank jago", AKUN)).toMatchObject({ accountId: "jago", note: "Bensin" });
    expect(parseQuickText("bakso 15rb cash on hand", AKUN)).toMatchObject({ accountId: "cash", note: "Bakso" });
    expect(parseQuickText("bakso 15rb tunai", AKUN)).toMatchObject({ accountId: "cash", note: "Bakso" });
  });

  it("nominal di tengah/awal dan angka bukan nominal di catatan", () => {
    expect(parseQuickText("1,5jt sewa kos", AKUN)).toMatchObject({ amount: 1_500_000, note: "Sewa kos" });
    expect(parseQuickText("beli 2 kopi 40rb", AKUN)).toMatchObject({ amount: 40_000, note: "Beli 2 kopi" });
    expect(parseQuickText("token listrik 100000 meteran 2", AKUN)).toMatchObject({ amount: 100_000, note: "Token listrik meteran 2" });
  });

  it("tanpa nominal / teks kosong", () => {
    expect(parseQuickText("", AKUN)).toEqual({ amount: null, accountId: null, type: null, note: "" });
    expect(parseQuickText("ongkir gopay", AKUN)).toEqual({ amount: null, accountId: "gopay", type: null, note: "Ongkir" });
  });

  it("nama akun tidak cocok sebagian kata", () => {
    expect(parseQuickText("bcabc 10rb", AKUN)).toMatchObject({ accountId: null, note: "Bcabc" });
  });
});
