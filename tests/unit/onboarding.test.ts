import { describe, expect, it } from "vitest";

import { buildChecklist, checklistProgress } from "@/lib/onboarding/checklist";
import {
  BISA_DILEWATI,
  LANGKAH,
  langkahBerikutnya,
  langkahSebelumnya,
  parseLangkah,
  parseLayar,
  perluOnboarding,
} from "@/lib/onboarding/steps";

describe("langkah wizard", () => {
  it("urutan dan navigasi", () => {
    expect(LANGKAH).toEqual(["intro", "nama", "akun", "budget", "tagihan", "tujuan", "selesai"]);
    expect(langkahBerikutnya("akun")).toBe("budget");
    expect(langkahBerikutnya("selesai")).toBe("selesai");
    expect(langkahSebelumnya("intro")).toBeNull();
    expect(langkahSebelumnya("budget")).toBe("akun");
  });

  it("parameter URL tidak valid kembali ke awal", () => {
    expect(parseLangkah("tujuan")).toBe("tujuan");
    expect(parseLangkah("hapus-semua")).toBe("intro");
    expect(parseLangkah(undefined)).toBe("intro");
    expect(parseLayar("2")).toBe(2);
    expect(parseLayar("9")).toBe(1);
    expect(parseLayar("1.5")).toBe(1);
  });

  it("akun pertama dan nama tidak bisa dilewati", () => {
    expect(BISA_DILEWATI.has("akun")).toBe(false);
    expect(BISA_DILEWATI.has("nama")).toBe(false);
    expect(BISA_DILEWATI.has("budget")).toBe(true);
  });

  it("wizard hanya untuk pengguna yang belum menyelesaikan/melewatinya", () => {
    expect(perluOnboarding({ onboarding_completed_at: null })).toBe(true);
    expect(perluOnboarding({ onboarding_completed_at: "2026-10-08T00:00:00Z" })).toBe(false);
    expect(perluOnboarding(null)).toBe(false); // profil gagal dimuat: jangan kunci pengguna
  });
});

describe("checklist", () => {
  it("status dari data", () => {
    const items = buildChecklist({ accounts: 2, transactions: 0, budgetsThisMonth: 1, recurringRules: 0, goals: 0 });
    expect(items.map((i) => [i.id, i.done])).toEqual([
      ["akun", true],
      ["transaksi", false],
      ["budget", true],
      ["tagihan", false],
      ["tujuan", false],
    ]);
    expect(checklistProgress(items)).toEqual({ done: 2, total: 5, complete: false });
  });

  it("lengkap jika semua item (termasuk tambahan seperti pasang di HP) selesai", () => {
    const items = buildChecklist({ accounts: 1, transactions: 3, budgetsThisMonth: 1, recurringRules: 1, goals: 1 });
    expect(checklistProgress(items, 0, 1)).toEqual({ done: 5, total: 6, complete: false });
    expect(checklistProgress(items, 1, 1)).toEqual({ done: 6, total: 6, complete: true });
  });
});
