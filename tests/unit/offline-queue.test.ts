import { describe, expect, it } from "vitest";

import { parseAntrean, parseOpsi, tambahItem, terapkanHasil, type ItemOffline } from "@/lib/offline/queue";

const item = (id: string, extra: Partial<ItemOffline> = {}): ItemOffline => ({
  id,
  type: "expense",
  amount: "35.000",
  accountId: "a1",
  categoryId: "k1",
  occurredOn: "2026-10-07",
  note: "makan",
  createdAt: "2026-10-07T05:00:00Z",
  ...extra,
});

describe("parseAntrean", () => {
  it("membaca antrean valid", () => {
    expect(parseAntrean(JSON.stringify([item("1")]))).toEqual([item("1")]);
  });

  it("aman untuk data kosong, rusak, atau asing", () => {
    expect(parseAntrean(null)).toEqual([]);
    expect(parseAntrean("{bukan json")).toEqual([]);
    expect(parseAntrean(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(parseAntrean(JSON.stringify([item("1"), { id: "2", type: "transfer" }, 5]))).toEqual([item("1")]);
  });
});

describe("parseOpsi", () => {
  it("membaca opsi akun & kategori, menolak data rusak", () => {
    const opsi = { accounts: [{ value: "a1", label: "BRI" }], categories: [], savedAt: "2026-10-07" };
    expect(parseOpsi(JSON.stringify(opsi))).toEqual(opsi);
    expect(parseOpsi("x")).toBeNull();
    expect(parseOpsi(JSON.stringify({ accounts: [] }))).toBeNull();
  });
});

describe("tambahItem", () => {
  it("tidak menambah id yang sama dua kali", () => {
    const a = tambahItem([], item("1"));
    expect(tambahItem(a, item("1"))).toHaveLength(1);
    expect(tambahItem(a, item("2"))).toHaveLength(2);
  });
});

describe("terapkanHasil", () => {
  it("membuang yang terkirim dan menandai yang gagal", () => {
    const antrean = [item("1"), item("2"), item("3")];
    const sisa = terapkanHasil(antrean, { terkirim: ["1", "3"], gagal: [{ id: "2", pesan: "Akun sudah diarsipkan." }] });
    expect(sisa).toEqual([item("2", { error: "Akun sudah diarsipkan." })]);
  });
});
