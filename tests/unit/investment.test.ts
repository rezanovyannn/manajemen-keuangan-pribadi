import { describe, expect, it } from "vitest";

import { isSpendable } from "@/lib/accounts/types";
import { balanceAsOf, formatGainPercent, investmentStatus, type DatedTransaction } from "@/lib/money";

const tx = (type: DatedTransaction["type"], amount: number, occurred_on: string): DatedTransaction => ({
  account_id: "emas",
  type,
  amount,
  occurred_on,
});

describe("balanceAsOf", () => {
  const rows = [tx("transfer_in", 1_000_000, "2026-09-01"), tx("transfer_in", 500_000, "2026-10-05"), tx("transfer_out", 200_000, "2026-10-10")];
  it("saldo awal + transaksi sampai akhir tanggal (inklusif)", () => {
    expect(balanceAsOf(0, rows, "2026-08-31")).toBe(0);
    expect(balanceAsOf(0, rows, "2026-10-05")).toBe(1_500_000);
    expect(balanceAsOf(250_000, rows, "2026-12-31")).toBe(1_550_000);
  });
});

describe("investmentStatus", () => {
  it("belum pernah dinilai: nilai = modal, untung 0", () => {
    expect(investmentStatus({ cost: 1_000_000, lastValuation: null })).toEqual({ cost: 1_000_000, value: 1_000_000, gain: 0, gainTenths: 0 });
  });

  it("untung dari nilai pasar terakhir", () => {
    expect(investmentStatus({ cost: 1_000_000, lastValuation: { marketValue: 1_123_000, costAtValuation: 1_000_000 } })).toEqual({
      cost: 1_000_000,
      value: 1_123_000,
      gain: 123_000,
      gainTenths: 123,
    });
  });

  it("beli/jual setelah tanggal nilai ikut menggeser nilai sekarang", () => {
    // Dinilai 1,1jt saat modal 1jt; lalu beli 500rb dan jual 200rb → modal 1,3jt, nilai 1,4jt.
    const s = investmentStatus({ cost: 1_300_000, lastValuation: { marketValue: 1_100_000, costAtValuation: 1_000_000 } });
    expect(s).toEqual({ cost: 1_300_000, value: 1_400_000, gain: 100_000, gainTenths: 76 });
  });

  it("rugi: persen negatif dibulatkan menuju nol", () => {
    const s = investmentStatus({ cost: 3_000_000, lastValuation: { marketValue: 2_000_000, costAtValuation: 3_000_000 } });
    expect(s.gain).toBe(-1_000_000);
    expect(s.gainTenths).toBe(-333);
  });

  it("modal 0 (mis. semua sudah dijual dengan untung): persen tidak dihitung; nilai tidak pernah minus", () => {
    expect(investmentStatus({ cost: 0, lastValuation: null }).gainTenths).toBeNull();
    expect(investmentStatus({ cost: -200_000, lastValuation: { marketValue: 0, costAtValuation: 1_000_000 } }).value).toBe(0);
  });

  it("integer besar tetap tepat", () => {
    const s = investmentStatus({ cost: 9_000_000_000_000, lastValuation: { marketValue: 9_000_000_000_001, costAtValuation: 9_000_000_000_000 } });
    expect(s.gain).toBe(1);
    expect(s.gainTenths).toBe(0);
  });
});

describe("formatGainPercent & isSpendable", () => {
  it("format persen satu desimal", () => {
    expect(formatGainPercent(123)).toBe("+12,3%");
    expect(formatGainPercent(-40)).toBe("−4,0%");
    expect(formatGainPercent(0)).toBe("0,0%");
    expect(formatGainPercent(-5)).toBe("−0,5%");
  });

  it("akun investasi bukan uang siap pakai", () => {
    expect(isSpendable("investment")).toBe(false);
    expect(isSpendable("bank")).toBe(true);
    expect(isSpendable("cash")).toBe(true);
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
