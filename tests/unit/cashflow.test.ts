import { describe, expect, it } from "vitest";

import { budgetTimeline, cashflowByAccount, type CashflowRow } from "@/lib/money";

describe("cashflowByAccount", () => {
  const rows: CashflowRow[] = [
    { account_id: "bca", type: "income", amount: 5_000_000 },
    { account_id: "bca", type: "expense", amount: 1_250_000 },
    { account_id: "bca", type: "transfer_out", amount: 300_000 },
    { account_id: "dompet", type: "transfer_in", amount: 300_000 },
    { account_id: "dompet", type: "expense", amount: 35_000 },
  ];
  const cf = cashflowByAccount(rows);

  it("memisahkan transfer dari pemasukan/pengeluaran", () => {
    expect(cf.get("bca")).toEqual({ income: 5_000_000, expense: 1_250_000, transferIn: 0, transferOut: 300_000, transferNet: -300_000, net: 3_450_000 });
    expect(cf.get("dompet")).toEqual({ income: 0, expense: 35_000, transferIn: 300_000, transferOut: 0, transferNet: 300_000, net: 265_000 });
  });

  it("total perubahan saldo semua akun = pemasukan - pengeluaran (transfer saling meniadakan)", () => {
    const totalNet = [...cf.values()].reduce((s, c) => s + c.net, 0);
    expect(totalNet).toBe(5_000_000 - 1_250_000 - 35_000);
  });

  it("akun tanpa transaksi tidak muncul", () => {
    expect(cf.has("gopay")).toBe(false);
  });
});

describe("budgetTimeline", () => {
  const t = (id: string, amount: number) => ({ id, amount });

  it("total berjalan dan penanda 80% lalu terlampaui", () => {
    const { items, warnId, overId } = budgetTimeline(100_000, [t("a", 50_000), t("b", 30_000), t("c", 15_000), t("d", 10_000)]);
    expect(items.map((i) => [i.id, i.cumulative, i.marker])).toEqual([
      ["a", 50_000, null],
      ["b", 80_000, "hampir"], // tepat 80%
      ["c", 95_000, null],
      ["d", 105_000, "terlampaui"],
    ]);
    expect([warnId, overId]).toEqual(["b", "d"]);
  });

  it("tepat 100% belum terlampaui", () => {
    const { overId } = budgetTimeline(100_000, [t("a", 100_000)]);
    expect(overId).toBeNull();
  });

  it("satu transaksi yang melompati 80% dan 100% sekaligus hanya ditandai terlampaui", () => {
    const { items, warnId, overId } = budgetTimeline(100_000, [t("a", 10_000), t("b", 200_000)]);
    expect(items.map((i) => i.marker)).toEqual([null, "terlampaui"]);
    expect([warnId, overId]).toEqual(["b", "b"]);
  });

  it("kosong jika belum ada transaksi", () => {
    expect(budgetTimeline(100_000, [])).toEqual({ items: [], warnId: null, overId: null });
  });
});
