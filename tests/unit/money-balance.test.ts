import { describe, expect, it } from "vitest";

import {
  addAmounts,
  computeBalance,
  computeBalances,
  signedAmount,
  totalBalance,
  type BalanceTransaction,
} from "@/lib/money";

const tx = (account_id: string, type: BalanceTransaction["type"], amount: number): BalanceTransaction => ({
  account_id,
  type,
  amount,
});

// Transfer = dua baris dengan nominal sama: keluar di akun asal, masuk di akun tujuan.
const transfer = (from: string, to: string, amount: number) => [
  tx(from, "transfer_out", amount),
  tx(to, "transfer_in", amount),
];

describe("signedAmount", () => {
  it("menambah untuk pemasukan dan transfer masuk, mengurangi untuk lainnya", () => {
    expect(signedAmount("income", 5_000)).toBe(5_000);
    expect(signedAmount("transfer_in", 5_000)).toBe(5_000);
    expect(signedAmount("expense", 5_000)).toBe(-5_000);
    expect(signedAmount("transfer_out", 5_000)).toBe(-5_000);
  });

  it("menolak nominal nol, negatif, atau desimal", () => {
    expect(() => signedAmount("income", 0)).toThrow(RangeError);
    expect(() => signedAmount("expense", -100)).toThrow(RangeError);
    expect(() => signedAmount("income", 10.5)).toThrow(RangeError);
  });
});

describe("computeBalance", () => {
  it("saldo awal saja jika belum ada transaksi", () => {
    expect(computeBalance(150_000, [])).toBe(150_000);
  });

  it("saldo = saldo awal + pemasukan + transfer masuk - pengeluaran - transfer keluar", () => {
    const rows = [
      tx("a", "income", 5_000_000),
      tx("a", "expense", 35_000),
      tx("a", "expense", 1_250_000),
      tx("a", "transfer_out", 500_000),
      tx("a", "transfer_in", 200_000),
    ];
    expect(computeBalance(1_000_000, rows)).toBe(4_415_000);
  });

  it("boleh minus jika pengeluaran melebihi saldo", () => {
    expect(computeBalance(10_000, [tx("a", "expense", 25_000)])).toBe(-15_000);
  });

  it("menolak hasil di luar batas aman integer", () => {
    expect(() => computeBalance(Number.MAX_SAFE_INTEGER, [tx("a", "income", 1)])).toThrow(RangeError);
  });
});

describe("computeBalances", () => {
  const accounts = [
    { id: "dompet", opening_balance: 100_000 },
    { id: "bca", opening_balance: 2_000_000 },
  ];

  it("menghitung saldo per akun", () => {
    const balances = computeBalances(accounts, [
      tx("dompet", "expense", 35_000),
      tx("bca", "income", 500_000),
      tx("akun-lain", "income", 999), // bukan akun di daftar: diabaikan
    ]);
    expect(balances.get("dompet")).toBe(65_000);
    expect(balances.get("bca")).toBe(2_500_000);
    expect(balances.has("akun-lain")).toBe(false);
  });

  it("transfer: kedua sisi konsisten dan total saldo tidak berubah", () => {
    const before = computeBalances(accounts, []);
    const after = computeBalances(accounts, transfer("bca", "dompet", 300_000));

    expect(after.get("bca")).toBe(1_700_000);
    expect(after.get("dompet")).toBe(400_000);
    expect(totalBalance(after.values())).toBe(totalBalance(before.values()));
  });

  it("edit transaksi: saldo mengikuti nominal baru", () => {
    const rows = [tx("dompet", "expense", 35_000)];
    expect(computeBalances(accounts, rows).get("dompet")).toBe(65_000);
    rows[0] = tx("dompet", "expense", 50_000);
    expect(computeBalances(accounts, rows).get("dompet")).toBe(50_000);
  });

  it("hapus transaksi: saldo kembali seperti semula", () => {
    const rows = [tx("dompet", "expense", 35_000), ...transfer("bca", "dompet", 300_000)];
    expect(computeBalances(accounts, rows).get("dompet")).toBe(365_000);
    // Hapus transfer = hapus kedua barisnya sekaligus.
    const tanpaTransfer = rows.filter((r) => r.type !== "transfer_out" && r.type !== "transfer_in");
    expect(computeBalances(accounts, tanpaTransfer).get("dompet")).toBe(65_000);
    expect(computeBalances(accounts, tanpaTransfer).get("bca")).toBe(2_000_000);
  });
});

describe("addAmounts / totalBalance", () => {
  it("menjumlahkan bilangan bulat dan menolak float", () => {
    expect(addAmounts(1_250_000, -250_000)).toBe(1_000_000);
    expect(() => addAmounts(0.1, 0.2)).toThrow(RangeError);
    expect(totalBalance([100, -50, 25])).toBe(75);
    expect(totalBalance([])).toBe(0);
  });
});
