import { describe, expect, it } from "vitest";

import { currentMonthInJakarta, formatBulan, isValidMonthString, monthRange, shiftMonth } from "@/lib/dates";
import { summarizeIncomeExpense } from "@/lib/money";
import {
  escapeLike,
  filterByAccount,
  groupByDate,
  toListItems,
  type TransactionRowLite,
} from "@/lib/transactions/list";

const row = (r: Partial<TransactionRowLite> & Pick<TransactionRowLite, "id" | "type" | "amount">): TransactionRowLite => ({
  account_id: "dompet",
  category_id: null,
  occurred_on: "2026-10-05",
  note: null,
  transfer_id: null,
  created_at: "2026-10-05T10:00:00Z",
  ...r,
});

const akun = new Map([
  ["dompet", "Dompet"],
  ["bca", "BCA"],
]);
const kategori = new Map([
  ["makan", "Makan & Minum"],
  ["gaji", "Gaji"],
]);

const rows: TransactionRowLite[] = [
  row({ id: "e1", type: "expense", amount: 35_000, category_id: "makan", note: "siang" }),
  row({ id: "i1", type: "income", amount: 5_000_000, account_id: "bca", category_id: "gaji", occurred_on: "2026-10-01" }),
  row({ id: "t-in", type: "transfer_in", amount: 300_000, transfer_id: "T1", occurred_on: "2026-10-03", created_at: "2026-10-03T08:00:00Z" }),
  row({ id: "t-out", type: "transfer_out", amount: 300_000, account_id: "bca", transfer_id: "T1", occurred_on: "2026-10-03", created_at: "2026-10-03T08:00:00Z" }),
  row({ id: "e2", type: "expense", amount: 20_000, category_id: "makan", created_at: "2026-10-05T12:00:00Z" }),
];

describe("toListItems", () => {
  const items = toListItems(rows, akun, kategori);

  it("menggabungkan dua baris transfer menjadi satu item asal → tujuan", () => {
    const t = items.filter((i) => i.kind === "transfer");
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ id: "t-out", transferId: "T1", fromName: "BCA", toName: "Dompet", amount: 300_000 });
  });

  it("mengurutkan terbaru di atas (tanggal, lalu waktu dibuat)", () => {
    expect(items.map((i) => i.id)).toEqual(["e2", "e1", "t-out", "i1"]);
  });

  it("memberi nama akun dan label kategori", () => {
    expect(items.find((i) => i.id === "i1")).toMatchObject({ accountName: "BCA", categoryLabel: "Gaji" });
  });

  it("mengabaikan transfer yang tidak lengkap", () => {
    const setengah = toListItems([row({ id: "x", type: "transfer_out", amount: 1, transfer_id: "T9" })], akun, kategori);
    expect(setengah).toEqual([]);
  });
});

describe("filterByAccount", () => {
  const items = toListItems(rows, akun, kategori);

  it("transfer tampil di akun asal maupun tujuan", () => {
    expect(filterByAccount(items, "bca").map((i) => i.id)).toEqual(["t-out", "i1"]);
    expect(filterByAccount(items, "dompet").map((i) => i.id)).toEqual(["e2", "e1", "t-out"]);
  });

  it("tanpa filter mengembalikan semua", () => {
    expect(filterByAccount(items, undefined)).toHaveLength(4);
  });
});

describe("groupByDate", () => {
  it("mengelompokkan per tanggal sesuai urutan", () => {
    const groups = groupByDate(toListItems(rows, akun, kategori));
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([
      ["2026-10-05", 2],
      ["2026-10-03", 1],
      ["2026-10-01", 1],
    ]);
  });
});

describe("summarizeIncomeExpense", () => {
  it("transfer tidak dihitung sebagai pemasukan/pengeluaran", () => {
    const items = toListItems(rows, akun, kategori);
    expect(summarizeIncomeExpense(items.map((i) => ({ type: i.kind, amount: i.amount })))).toEqual({
      income: 5_000_000,
      expense: 55_000,
      net: 4_945_000,
    });
  });

  it("selisih bisa minus", () => {
    expect(summarizeIncomeExpense([{ type: "expense", amount: 10_000 }]).net).toBe(-10_000);
  });
});

describe("helper bulan", () => {
  it("validasi format YYYY-MM", () => {
    expect(isValidMonthString("2026-10")).toBe(true);
    for (const bad of ["2026-13", "2026-1", "202610", ""]) expect(isValidMonthString(bad)).toBe(false);
  });

  it("geser bulan melewati pergantian tahun", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });

  it("rentang bulan setengah terbuka", () => {
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });

  it("bulan berjalan memakai WIB", () => {
    expect(currentMonthInJakarta(new Date("2026-10-31T18:00:00Z"))).toBe("2026-11");
  });

  it("format Bahasa Indonesia", () => {
    expect(formatBulan("2026-10")).toBe("Oktober 2026");
  });
});

describe("escapeLike", () => {
  it("meng-escape wildcard ILIKE", () => {
    expect(escapeLike("diskon 50%_a\\b")).toBe("diskon 50\\%\\_a\\\\b");
  });
});
