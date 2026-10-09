import { describe, expect, it } from "vitest";

import { isSpendable } from "@/lib/accounts/types";
import {
  balanceAsOf,
  formatGainPercent,
  investmentLedger,
  multiplyPriceUnits,
  parseDecimal,
  type DatedTransaction,
} from "@/lib/money";

const beli = (amount: number, occurred_on: string): DatedTransaction => ({ account_id: "inv", type: "transfer_in", amount, occurred_on });
const jual = (amount: number, occurred_on: string): DatedTransaction => ({ account_id: "inv", type: "transfer_out", amount, occurred_on });
const nilai = (market_value: number, valued_on: string, created_at = "") => ({ market_value, valued_on, created_at });

describe("investmentLedger", () => {
  it("belum pernah dinilai: nilai = modal", () => {
    const l = investmentLedger({ openingBalance: 0, transactions: [beli(1_000_000, "2026-10-01")], valuations: [] });
    expect(l).toMatchObject({ value: 1_000_000, cost: 1_000_000, unrealized: 0, unrealizedTenths: 0, realized: 0, lastChange: null });
  });

  it("nilai naik = untung belum terealisasi; perubahan sejak pembaruan sebelumnya", () => {
    const l = investmentLedger({
      openingBalance: 0,
      transactions: [beli(1_000_000, "2026-10-01")],
      valuations: [nilai(1_100_000, "2026-10-03"), nilai(1_150_000, "2026-10-08")],
    });
    expect(l).toMatchObject({ value: 1_150_000, cost: 1_000_000, unrealized: 150_000, unrealizedTenths: 150, realized: 0 });
    expect(l.lastChange).toEqual({ date: "2026-10-08", value: 1_150_000, change: 50_000, changeTenths: 45 });
    expect(l.history.map((h) => h.change)).toEqual([100_000, 50_000]);
  });

  it("jual sebagian saat untung: modal berkurang proporsional, untung terealisasi", () => {
    // Modal 1jt, nilai 1,2jt, jual 600rb (separuh) → modal 500rb, untung terealisasi 100rb.
    const l = investmentLedger({
      openingBalance: 0,
      transactions: [beli(1_000_000, "2026-10-01"), jual(600_000, "2026-10-05")],
      valuations: [nilai(1_200_000, "2026-10-04")],
    });
    expect(l).toMatchObject({ value: 600_000, cost: 500_000, unrealized: 100_000, realized: 100_000 });
  });

  it("jual semua saat untung: nilai & modal 0, tidak ada modal minus", () => {
    const l = investmentLedger({
      openingBalance: 0,
      transactions: [beli(1_000_000, "2026-10-01"), jual(1_150_000, "2026-10-09")],
      valuations: [nilai(1_150_000, "2026-10-08")],
    });
    expect(l).toMatchObject({ value: 0, cost: 0, unrealized: 0, unrealizedTenths: null, realized: 150_000 });
  });

  it("jual saat rugi: rugi terealisasi negatif", () => {
    const l = investmentLedger({
      openingBalance: 0,
      transactions: [beli(2_000_000, "2026-10-01"), jual(800_000, "2026-10-05")],
      valuations: [nilai(1_600_000, "2026-10-04")],
    });
    // Jual separuh nilai 1,6jt → modal keluar 1jt, rugi terealisasi −200rb; sisa nilai 800rb, modal 1jt.
    expect(l).toMatchObject({ value: 800_000, cost: 1_000_000, unrealized: -200_000, realized: -200_000 });
  });

  it("nilai belum diperbarui lalu jual lebih dari nilai tercatat: seluruh modal keluar", () => {
    const l = investmentLedger({ openingBalance: 0, transactions: [beli(1_000_000, "2026-10-01"), jual(1_300_000, "2026-10-09")], valuations: [] });
    expect(l).toMatchObject({ value: 0, cost: 0, realized: 300_000 });
  });

  it("top up setelah naik menambah nilai & modal sebesar nominal", () => {
    const l = investmentLedger({
      openingBalance: 0,
      transactions: [beli(1_000_000, "2026-10-01"), beli(500_000, "2026-10-06")],
      valuations: [nilai(1_100_000, "2026-10-05")],
    });
    expect(l).toMatchObject({ value: 1_600_000, cost: 1_500_000, unrealized: 100_000 });
  });

  it("di hari yang sama: urut waktu dicatat (nilai pagi, jual sore); tanpa waktu: beli/jual dulu", () => {
    const pagiSore = investmentLedger({
      openingBalance: 0,
      transactions: [beli(1_000_000, "2026-10-01"), { ...jual(575_000, "2026-10-09"), created_at: "2026-10-09T15:00:00Z" }],
      valuations: [nilai(1_150_000, "2026-10-09", "2026-10-09T08:00:00Z")],
    });
    expect(pagiSore).toMatchObject({ value: 575_000, cost: 500_000, realized: 75_000 });

    const tanpaWaktu = investmentLedger({
      openingBalance: 0,
      transactions: [beli(1_000_000, "2026-10-01"), beli(500_000, "2026-10-05")],
      valuations: [nilai(1_700_000, "2026-10-05", "2026-10-05T10:00:00Z"), nilai(1_650_000, "2026-10-05", "2026-10-05T09:00:00Z")],
    });
    // Beli tanpa waktu lebih dulu (nilai 1,5jt), lalu nilai 09:00 dan 10:00.
    expect(tanpaWaktu.history.map((h) => [h.value, h.change])).toEqual([
      [1_650_000, 150_000],
      [1_700_000, 50_000],
    ]);
  });

  it("nilai turun ke 0 (rugi total) dan modal awal dari saldo awal", () => {
    const l = investmentLedger({ openingBalance: 3_000_000, transactions: [], valuations: [nilai(0, "2026-10-09")] });
    expect(l).toMatchObject({ value: 0, cost: 3_000_000, unrealized: -3_000_000, unrealizedTenths: -1000 });
    expect(l.lastChange?.changeTenths).toBe(-1000);
  });

  it("integer besar tetap tepat", () => {
    const l = investmentLedger({ openingBalance: 9_000_000_000_000, transactions: [], valuations: [nilai(9_000_000_000_001, "2026-10-09")] });
    expect(l.unrealized).toBe(1);
  });
});

describe("harga per unit × unit", () => {
  it("parseDecimal: format Indonesia & titik desimal", () => {
    expect(parseDecimal("1.523,4567", 6)).toEqual({ bulat: "1523", pecahan: "4567" });
    expect(parseDecimal("1523.45", 6)).toEqual({ bulat: "1523", pecahan: "45" });
    expect(parseDecimal("1.523", 6)).toEqual({ bulat: "1523", pecahan: "" });
    expect(parseDecimal("Rp 2.379.000", 6)).toEqual({ bulat: "2379000", pecahan: "" });
    expect(parseDecimal("1,2345678", 6)).toBeNull();
    expect(parseDecimal("abc", 6)).toBeNull();
  });

  it("dibulatkan ke bawah ke Rupiah, tanpa float", () => {
    expect(multiplyPriceUnits("1.523,4567", "650.25")).toBe(990_627); // 990.627,719… → 990.627
  });

  it("contoh emas & saham", () => {
    expect(multiplyPriceUnits("2.379.000", "2.5")).toBe(5_947_500);
    expect(multiplyPriceUnits("9875", "500")).toBe(4_937_500);
    expect(multiplyPriceUnits("1,5", "3")).toBe(4); // 4,5 → 4
    expect(multiplyPriceUnits("x", "1")).toBeNull();
  });
});

describe("balanceAsOf, formatGainPercent, isSpendable", () => {
  it("saldo per akhir tanggal", () => {
    expect(balanceAsOf(0, [beli(1_000_000, "2026-09-01"), jual(200_000, "2026-10-10")], "2026-10-05")).toBe(1_000_000);
  });

  it("format persen satu desimal", () => {
    expect(formatGainPercent(123)).toBe("+12,3%");
    expect(formatGainPercent(-40)).toBe("−4,0%");
    expect(formatGainPercent(0)).toBe("0,0%");
    expect(formatGainPercent(-5)).toBe("−0,5%");
  });

  it("akun investasi bukan uang siap pakai", () => {
    expect(isSpendable("investment")).toBe(false);
    expect(isSpendable("bank")).toBe(true);
  });
});

describe("unitsInput", () => {
  it("koma/titik desimal dinormalisasi; kosong = null; selain angka ditolak", async () => {
    const { unitsInput } = await import("@/lib/validators/investment");
    expect(unitsInput.parse("2,5")).toBe("2.5");
    expect(unitsInput.parse("0.01320")).toBe("0.0132");
    expect(unitsInput.parse("100")).toBe("100");
    expect(unitsInput.parse("007,50")).toBe("7.5");
    expect(unitsInput.parse(" ")).toBeNull();
    expect(unitsInput.safeParse("-1").success).toBe(false);
    expect(unitsInput.safeParse("1,2,3").success).toBe(false);
    expect(unitsInput.safeParse("0,12345678901").success).toBe(false);
  });
});
