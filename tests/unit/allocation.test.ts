import { describe, expect, it } from "vitest";

import {
  accountSplit,
  allocationLimit,
  allocationTotals,
  canRemoveAllocation,
  checkAllocation,
  coveredSavings,
} from "@/lib/money";

describe("allocationTotals", () => {
  it("menjumlahkan per tujuan, per akun, dan per tujuan+akun (ambil = negatif)", () => {
    const t = allocationTotals([
      { goal_id: "jepang", account_id: "bri", amount: 2_000_000 },
      { goal_id: "jepang", account_id: "bri", amount: -500_000 },
      { goal_id: "jepang", account_id: "mandiri", amount: 1_000_000 },
      { goal_id: "darurat", account_id: "bri", amount: 3_000_000 },
    ]);
    expect(t.byGoal.get("jepang")).toBe(2_500_000);
    expect(t.byGoal.get("darurat")).toBe(3_000_000);
    expect(t.byAccount.get("bri")).toBe(4_500_000);
    expect(t.byAccount.get("mandiri")).toBe(1_000_000);
    expect(t.goalAccount("jepang", "bri")).toBe(1_500_000);
    expect(t.goalAccount("darurat", "mandiri")).toBe(0);
  });

  it("menolak nominal bukan integer", () => {
    expect(() => allocationTotals([{ goal_id: "g", account_id: "a", amount: 1.5 }])).toThrow();
  });
});

describe("accountSplit & coveredSavings", () => {
  it("bebas dipakai = saldo - disisihkan", () => {
    expect(accountSplit(10_000_000, 5_000_000)).toEqual({ allocated: 5_000_000, free: 5_000_000, shortfall: 0 });
    expect(accountSplit(10_000_000, 0)).toEqual({ allocated: 0, free: 10_000_000, shortfall: 0 });
  });

  it("saldo turun di bawah tabungan: bebas dipakai minus + kekurangan", () => {
    expect(accountSplit(1_000_000, 3_000_000)).toEqual({ allocated: 3_000_000, free: -2_000_000, shortfall: 2_000_000 });
    expect(accountSplit(-50_000, 500_000)).toEqual({ allocated: 500_000, free: -550_000, shortfall: 500_000 });
  });

  it("tabungan yang masih tertutup saldo", () => {
    expect(coveredSavings(10_000_000, 5_000_000)).toBe(5_000_000);
    expect(coveredSavings(1_000_000, 3_000_000)).toBe(1_000_000);
    expect(coveredSavings(-50_000, 500_000)).toBe(0);
  });
});

describe("allocationLimit & checkAllocation", () => {
  const ctx = { balance: 10_000_000, accountAllocated: 6_000_000, goalAccountAllocated: 2_000_000 };

  it("sisihkan maksimal saldo bebas akun", () => {
    expect(allocationLimit({ kind: "sisihkan", ...ctx })).toBe(4_000_000);
    expect(checkAllocation(4_000_000, { kind: "sisihkan", ...ctx })).toBeNull();
    expect(checkAllocation(4_000_001, { kind: "sisihkan", ...ctx })).toBe("Melebihi saldo bebas di akun ini (maks. Rp 4.000.000).");
  });

  it("sisihkan saat tidak ada saldo bebas", () => {
    const habis = { kind: "sisihkan" as const, balance: 1_000_000, accountAllocated: 3_000_000, goalAccountAllocated: 0 };
    expect(allocationLimit(habis)).toBe(0);
    expect(checkAllocation(1, habis)).toBe("Tidak ada saldo bebas di akun ini untuk disisihkan.");
  });

  it("ambil maksimal tabungan tujuan dari akun itu", () => {
    expect(allocationLimit({ kind: "ambil", ...ctx })).toBe(2_000_000);
    expect(checkAllocation(2_000_000, { kind: "ambil", ...ctx })).toBeNull();
    expect(checkAllocation(2_000_001, { kind: "ambil", ...ctx })).toBe("Melebihi tabungan dari akun ini (maks. Rp 2.000.000).");
    expect(checkAllocation(1, { kind: "ambil", ...ctx, goalAccountAllocated: 0 })).toBe("Belum ada tabungan tujuan ini dari akun tersebut.");
  });

  it("nominal harus > 0 dan integer", () => {
    expect(checkAllocation(0, { kind: "sisihkan", ...ctx })).toBe("Nominal harus lebih dari 0.");
    expect(() => checkAllocation(1.5, { kind: "sisihkan", ...ctx })).toThrow();
  });
});

describe("canRemoveAllocation", () => {
  it("menghapus setoran tidak boleh membuat tabungan dari akun itu minus", () => {
    expect(canRemoveAllocation(1_500_000, 2_000_000)).toBe(false); // sisa 1,5jt setelah ambil 0,5jt
    expect(canRemoveAllocation(2_000_000, 2_000_000)).toBe(true);
    expect(canRemoveAllocation(1_500_000, -500_000)).toBe(true); // hapus "ambil" selalu boleh
  });
});
