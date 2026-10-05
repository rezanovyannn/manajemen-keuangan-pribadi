import { describe, expect, it } from "vitest";

import {
  daysUntil,
  dueLabel,
  firstOccurrenceOnOrAfter,
  isFinished,
  isSuggested,
  nextOccurrenceAfter,
  occurrenceAt,
  type RuleSchedule,
} from "@/lib/recurring/schedule";

describe("occurrenceAt", () => {
  it("bulanan tanggal 31: jatuh ke akhir bulan pendek lalu kembali ke 31", () => {
    const urut = [0, 1, 2, 3, 4].map((n) => occurrenceAt("2026-01-31", "monthly", n));
    expect(urut).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  });

  it("tahun kabisat: 29 Februari", () => {
    expect(occurrenceAt("2028-01-31", "monthly", 1)).toBe("2028-02-29");
    expect(occurrenceAt("2028-02-29", "yearly", 1)).toBe("2029-02-28");
    expect(occurrenceAt("2028-02-29", "yearly", 4)).toBe("2032-02-29");
  });

  it("mingguan melewati pergantian bulan dan tahun", () => {
    expect(occurrenceAt("2026-12-28", "weekly", 1)).toBe("2027-01-04");
  });

  it("bulanan melewati pergantian tahun", () => {
    expect(occurrenceAt("2026-11-15", "monthly", 3)).toBe("2027-02-15");
  });

  it("menolak urutan atau tanggal tidak valid", () => {
    expect(() => occurrenceAt("2026-02-30", "monthly", 0)).toThrow(RangeError);
    expect(() => occurrenceAt("2026-01-01", "monthly", -1)).toThrow(RangeError);
  });
});

describe("nextOccurrenceAfter (setelah dicatat/dilewati)", () => {
  it("maju satu jadwal tanpa terseret", () => {
    expect(nextOccurrenceAfter("2026-01-31", "monthly", "2026-02-28")).toBe("2026-03-31");
    expect(nextOccurrenceAfter("2026-10-15", "monthly", "2026-10-15")).toBe("2026-11-15");
    expect(nextOccurrenceAfter("2026-10-05", "weekly", "2026-10-05")).toBe("2026-10-12");
    expect(nextOccurrenceAfter("2026-03-01", "yearly", "2026-03-01")).toBe("2027-03-01");
  });

  it("jadwal yang terlewat diproses satu per satu (tidak ada yang hilang)", () => {
    let due = "2026-07-15";
    const urut = [due];
    for (let i = 0; i < 3; i++) {
      due = nextOccurrenceAfter("2026-07-15", "monthly", due);
      urut.push(due);
    }
    expect(urut).toEqual(["2026-07-15", "2026-08-15", "2026-09-15", "2026-10-15"]);
  });
});

describe("firstOccurrenceOnOrAfter (setelah jadwal diubah)", () => {
  it("mengembalikan tanggal mulai jika belum dimulai", () => {
    expect(firstOccurrenceOnOrAfter("2026-12-01", "monthly", "2026-10-06")).toBe("2026-12-01");
  });

  it("mencari jadwal pertama pada/sesudah tanggal", () => {
    expect(firstOccurrenceOnOrAfter("2026-01-31", "monthly", "2026-10-06")).toBe("2026-10-31");
    expect(firstOccurrenceOnOrAfter("2026-01-15", "monthly", "2026-10-15")).toBe("2026-10-15");
    expect(firstOccurrenceOnOrAfter("2026-10-01", "weekly", "2026-10-06")).toBe("2026-10-08");
    expect(firstOccurrenceOnOrAfter("2020-03-01", "yearly", "2026-10-06")).toBe("2027-03-01");
  });
});

describe("saran pencatatan", () => {
  const today = "2026-10-06";
  const rule = (r: Partial<RuleSchedule>): RuleSchedule => ({
    frequency: "monthly",
    start_date: "2026-01-01",
    end_date: null,
    next_due_date: "2026-10-10",
    paused: false,
    ...r,
  });

  it("muncul jika jatuh tempo dalam 7 hari atau sudah lewat", () => {
    expect(isSuggested(rule({ next_due_date: "2026-10-13" }), today)).toBe(true);
    expect(isSuggested(rule({ next_due_date: "2026-10-14" }), today)).toBe(false);
    expect(isSuggested(rule({ next_due_date: "2026-08-01" }), today)).toBe(true);
  });

  it("tidak muncul jika dijeda atau jadwal sudah selesai", () => {
    expect(isSuggested(rule({ paused: true }), today)).toBe(false);
    expect(isSuggested(rule({ end_date: "2026-10-09" }), today)).toBe(false);
    expect(isFinished({ end_date: "2026-10-10", next_due_date: "2026-10-10" })).toBe(false);
  });

  it("label jatuh tempo", () => {
    expect(daysUntil("2026-10-03", today)).toBe(-3);
    expect(dueLabel("2026-10-03", today)).toBe("terlambat 3 hari");
    expect(dueLabel(today, today)).toBe("jatuh tempo hari ini");
    expect(dueLabel("2026-10-07", today)).toBe("jatuh tempo besok");
    expect(dueLabel("2026-10-11", today)).toBe("jatuh tempo dalam 5 hari");
  });
});
