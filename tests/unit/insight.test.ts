import { describe, expect, it } from "vitest";

import {
  categoryChanges,
  medianAmount,
  nextMonthlyDate,
  percentChange,
  subscriptionCandidates,
  unusualExpenses,
  type InsightRow,
} from "@/lib/money";

let seq = 0;
function tx(over: Partial<InsightRow>): InsightRow {
  seq++;
  return {
    id: `t${String(seq).padStart(4, "0")}`,
    account_id: "a1",
    category_id: "makan",
    amount: 50_000,
    occurred_on: "2026-10-05",
    note: null,
    recurring_rule_id: null,
    debt_id: null,
    fee_for_id: null,
    ...over,
  };
}

const kategori = [
  { id: "makan", parent_id: null },
  { id: "kopi", parent_id: "makan" },
  { id: "belanja", parent_id: null },
];

describe("percentChange & medianAmount", () => {
  it("persen dibulatkan menuju nol, tanpa float", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(1, 3)).toBe(-66);
    expect(percentChange(0, 100)).toBe(-100);
    expect(() => percentChange(1, 0)).toThrow();
  });

  it("median ganjil/genap (genap dibulatkan ke bawah)", () => {
    expect(medianAmount([5, 1, 3])).toBe(3);
    expect(medianAmount([1, 2])).toBe(1);
    expect(medianAmount([10_000, 20_001])).toBe(15_000);
  });

  it("tanggal bulan depan: 31 → akhir bulan pendek", () => {
    expect(nextMonthlyDate("2026-10-05")).toBe("2026-11-05");
    expect(nextMonthlyDate("2026-01-31")).toBe("2026-02-28");
    expect(nextMonthlyDate("2026-12-15")).toBe("2027-01-15");
  });
});

describe("categoryChanges", () => {
  const today = "2026-10-08";
  // Tiga bulan pembanding: s.d. tanggal 8 masing-masing Rp 100.000 untuk makan.
  const dasar = ["2026-07-03", "2026-08-03", "2026-09-03"].map((d) => tx({ occurred_on: d, amount: 100_000 }));

  it("naik >= 40% dibanding rata-rata periode yang sama; sub-kategori ikut induk", () => {
    const rows = [
      ...dasar,
      tx({ occurred_on: "2026-10-02", amount: 100_000 }),
      tx({ occurred_on: "2026-10-06", category_id: "kopi", amount: 60_000 }),
    ];
    expect(categoryChanges({ rows, categories: kategori, today, firstDate: "2026-07-01" })).toEqual([
      { categoryId: "makan", current: 160_000, average: 100_000, percent: 60, baselineMonths: 3 },
    ]);
  });

  it("transaksi setelah tanggal hari ini di bulan lalu tidak ikut pembanding", () => {
    const rows = [...dasar, tx({ occurred_on: "2026-09-20", amount: 900_000 }), tx({ occurred_on: "2026-10-02", amount: 100_000 })];
    expect(categoryChanges({ rows, categories: kategori, today, firstDate: "2026-07-01" })).toEqual([]);
  });

  it("turun drastis juga dilaporkan (persen negatif)", () => {
    const rows = [...dasar, tx({ occurred_on: "2026-10-02", amount: 20_000 })];
    expect(categoryChanges({ rows, categories: kategori, today, firstDate: "2026-07-01" })[0]).toMatchObject({ percent: -80 });
  });

  it("perubahan di bawah Rp 50.000 diabaikan walau persennya besar", () => {
    const rows = [tx({ occurred_on: "2026-09-02", amount: 10_000 }), tx({ occurred_on: "2026-10-02", amount: 30_000 })];
    expect(categoryChanges({ rows, categories: kategori, today, firstDate: "2026-09-01" })).toEqual([]);
  });

  it("bulan sebelum mulai mencatat tidak dihitung (rata-rata hanya dari bulan yang ada)", () => {
    const rows = [tx({ occurred_on: "2026-09-02", amount: 100_000 }), tx({ occurred_on: "2026-10-02", amount: 200_000 })];
    const [c] = categoryChanges({ rows, categories: kategori, today, firstDate: "2026-09-01" });
    expect(c).toMatchObject({ average: 100_000, percent: 100, baselineMonths: 1 });
  });

  it("belum ada riwayat: tidak ada insight; kategori baru tanpa pembanding diabaikan", () => {
    expect(categoryChanges({ rows: [tx({})], categories: kategori, today, firstDate: "2026-10-01" })).toEqual([]);
    expect(categoryChanges({ rows: [tx({})], categories: kategori, today, firstDate: null })).toEqual([]);
    const rows = [
      ...dasar,
      tx({ occurred_on: "2026-10-02", amount: 100_000 }),
      tx({ occurred_on: "2026-10-03", category_id: "belanja", amount: 900_000 }),
    ];
    expect(categoryChanges({ rows, categories: kategori, today, firstDate: "2026-07-01" })).toEqual([]);
  });

  it("tanggal 31: bulan pembanding yang lebih pendek dihitung sampai akhir bulannya", () => {
    const rows = [tx({ occurred_on: "2026-09-30", amount: 100_000 }), tx({ occurred_on: "2026-10-31", amount: 200_000 })];
    const [c] = categoryChanges({ rows, categories: kategori, today: "2026-10-31", firstDate: "2026-09-01" });
    expect(c).toMatchObject({ average: 100_000, current: 200_000 });
  });
});

describe("unusualExpenses", () => {
  const today = "2026-10-08";
  const riwayat = ["2026-08-01", "2026-08-15", "2026-09-01"].map((d) => tx({ occurred_on: d, amount: 40_000 }));

  it("> 3× median kategori dan >= Rp 100.000", () => {
    const besar = tx({ occurred_on: "2026-10-04", amount: 130_000, note: "Traktir" });
    const r = unusualExpenses({ rows: [...riwayat, besar, tx({ occurred_on: "2026-10-05", amount: 120_000 })], today });
    expect(r).toEqual([
      { id: besar.id, categoryId: "makan", amount: 130_000, median: 40_000, times: 3, occurredOn: "2026-10-04", note: "Traktir" },
    ]);
  });

  it("tepat 3× median tidak dihitung; di bawah Rp 100.000 tidak dihitung", () => {
    const kecil = ["2026-08-01", "2026-08-15", "2026-09-01"].map((d) => tx({ occurred_on: d, category_id: "kopi", amount: 20_000 }));
    const r = unusualExpenses({
      rows: [
        ...riwayat,
        ...kecil,
        tx({ occurred_on: "2026-10-04", amount: 120_000 }),
        tx({ occurred_on: "2026-10-04", category_id: "kopi", amount: 90_000 }),
      ],
      today,
    });
    expect(r).toEqual([]);
  });

  it("butuh minimal 3 transaksi pembanding dalam 3 bulan terakhir", () => {
    const r = unusualExpenses({ rows: [riwayat[0]!, riwayat[1]!, tx({ occurred_on: "2026-10-04", amount: 500_000 })], today });
    expect(r).toEqual([]);
    const lama = ["2026-05-01", "2026-05-02", "2026-05-03"].map((d) => tx({ occurred_on: d, amount: 40_000 }));
    expect(unusualExpenses({ rows: [...lama, tx({ occurred_on: "2026-10-04", amount: 500_000 })], today })).toEqual([]);
  });

  it("biaya admin diabaikan", () => {
    const r = unusualExpenses({ rows: [...riwayat, tx({ occurred_on: "2026-10-04", amount: 500_000, fee_for_id: "x" })], today });
    expect(r).toEqual([]);
  });
});

describe("subscriptionCandidates", () => {
  const today = "2026-10-08";
  const bulanan = (note: string, amount: number, dates: string[], over: Partial<InsightRow> = {}) =>
    dates.map((d) => tx({ occurred_on: d, note, amount, category_id: "hiburan", ...over }));

  it("catatan + nominal sama 3 bulan berturut-turut, belum dijadwalkan", () => {
    const rows = bulanan("Spotify ", 54_990, ["2026-08-12", "2026-09-12", "2026-10-02"]);
    expect(subscriptionCandidates({ rows, rules: [], today })).toEqual([
      {
        latestId: rows[2]!.id,
        note: "Spotify",
        amount: 54_990,
        categoryId: "hiburan",
        accountId: "a1",
        months: 3,
        lastDate: "2026-10-02",
        nextDate: "2026-11-02",
      },
    ]);
  });

  it("boleh berakhir bulan lalu; catatan beda huruf besar/spasi tetap dianggap sama", () => {
    const rows = [
      ...bulanan("youtube premium", 59_000, ["2026-07-20", "2026-08-20"]),
      ...bulanan("YouTube  Premium", 59_000, ["2026-09-20"]),
    ];
    expect(subscriptionCandidates({ rows, rules: [], today })[0]).toMatchObject({ months: 3, lastDate: "2026-09-20" });
  });

  it("tidak berturut-turut, sudah berhenti, atau nominal beda → bukan langganan", () => {
    const putus = bulanan("Gym", 300_000, ["2026-06-01", "2026-07-01", "2026-09-01", "2026-10-01"]);
    const berhenti = bulanan("iCloud", 15_000, ["2026-05-03", "2026-06-03", "2026-07-03", "2026-08-03"]);
    const beda = [...bulanan("Pulsa", 50_000, ["2026-08-01", "2026-09-01"]), ...bulanan("Pulsa", 100_000, ["2026-10-01"])];
    expect(subscriptionCandidates({ rows: [...putus, ...berhenti, ...beda], rules: [], today })).toEqual([]);
  });

  it("sudah ada jadwal, dari jadwal, cicilan utang, atau tanpa catatan → diabaikan", () => {
    const rows = [
      ...bulanan("Netflix", 186_000, ["2026-08-08", "2026-09-08", "2026-10-06"]),
      ...bulanan("Internet", 350_000, ["2026-08-03", "2026-09-03", "2026-10-03"], { recurring_rule_id: "r1" }),
      ...bulanan("Paylater", 250_000, ["2026-08-28", "2026-09-28", "2026-10-01"], { debt_id: "d1" }),
      ...bulanan("", 10_000, ["2026-08-01", "2026-09-01", "2026-10-01"]),
    ];
    const rules = [{ name: "netflix", note: null, amount: 186_000 }];
    expect(subscriptionCandidates({ rows, rules, today })).toEqual([]);
  });
});
