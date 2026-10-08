import { describe, expect, it } from "vitest";

import {
  buildCategoryModel,
  favorites,
  guessCategory,
  lastAccountId,
  rankCategories,
  tokens,
  type HistoryRow,
} from "@/lib/quick-add/learn";

let n = 0;
function row(over: Partial<HistoryRow>): HistoryRow {
  n++;
  return {
    type: "expense",
    amount: 25_000,
    account_id: "gopay",
    category_id: "makan",
    note: null,
    occurred_on: "2026-10-01",
    created_at: `2026-10-01T00:00:${String(n % 60).padStart(2, "0")}Z`,
    ...over,
  };
}

describe("tokens", () => {
  it("huruf kecil, tanpa tanda baca/angka/kata umum, tanpa duplikat", () => {
    expect(tokens("Beli Kopi Kenangan, kopi! 2x")).toEqual(["kopi", "kenangan"]);
    expect(tokens("Gojek ke kantor")).toEqual(["gojek", "kantor"]);
    expect(tokens(null)).toEqual([]);
  });
});

describe("guessCategory", () => {
  const model = buildCategoryModel([
    row({ note: "Gojek kantor", category_id: "transport" }),
    row({ note: "gojek pulang", category_id: "transport" }),
    row({ note: "GoFood", category_id: "makan" }),
    row({ note: "Kopi kenangan", category_id: "makan" }),
    row({ note: "Indomaret sabun", category_id: "belanja" }),
    row({ type: "income", note: "Gaji kantor", category_id: "gaji" }),
  ]);

  it("menebak dari kata yang pernah dipakai, sesuai tipe", () => {
    expect(guessCategory("gojek ke mall", "expense", model)).toBe("transport");
    expect(guessCategory("kopi susu", "expense", model)).toBe("makan");
    expect(guessCategory("indomaret", "expense", model)).toBe("belanja");
    expect(guessCategory("gaji oktober", "income", model)).toBe("gaji");
    // "kantor" muncul di pengeluaran & pemasukan: tipe menentukan.
    expect(guessCategory("kantor", "income", model)).toBe("gaji");
    expect(guessCategory("kantor", "expense", model)).toBe("transport");
  });

  it("awalan kata sebagai cadangan; tidak dikenal → null", () => {
    expect(guessCategory("gojekk", "expense", model)).toBe("transport");
    expect(guessCategory("parkir", "expense", model)).toBeNull();
    expect(guessCategory("", "expense", model)).toBeNull();
  });
});

describe("rankCategories & lastAccountId", () => {
  it("kategori paling sering di depan, sisanya urutan asal", () => {
    const rows = [row({ category_id: "transport" }), row({ category_id: "transport" }), row({ category_id: "belanja" })];
    expect(rankCategories(rows, ["makan", "transport", "belanja", "lainnya"], "expense")).toEqual(["transport", "belanja", "makan", "lainnya"]);
  });

  it("akun transaksi terbaru yang masih aktif", () => {
    const rows = [
      row({ account_id: "bri", occurred_on: "2026-10-02" }),
      row({ account_id: "arsip", occurred_on: "2026-10-05" }),
      row({ account_id: "gopay", occurred_on: "2026-10-01" }),
    ];
    expect(lastAccountId(rows, new Set(["bri", "gopay"]))).toBe("bri");
    expect(lastAccountId([], new Set(["bri"]))).toBeNull();
  });
});

describe("favorites", () => {
  it("kombinasi yang sama >= 3 kali; paling sering di depan", () => {
    const kopi = [1, 2, 3, 4].map((d) => row({ note: "Kopi", occurred_on: `2026-10-0${d}` }));
    const parkir = [1, 2, 3].map((d) => row({ note: "Parkir", amount: 5_000, category_id: "transport", occurred_on: `2026-09-0${d}` }));
    const jarang = [1, 2].map((d) => row({ note: "Bakso", occurred_on: `2026-10-0${d}` }));
    const beda = [row({ note: "kopi", amount: 30_000 })]; // nominal beda: grup lain
    expect(favorites([...kopi, ...parkir, ...jarang, ...beda])).toEqual([
      { type: "expense", amount: 25_000, accountId: "gopay", categoryId: "makan", note: "Kopi", count: 4 },
      { type: "expense", amount: 5_000, accountId: "gopay", categoryId: "transport", note: "Parkir", count: 3 },
    ]);
  });

  it("tanpa catatan bukan favorit; jumlah sama → yang terbaru dulu", () => {
    const a = [1, 2, 3].map((d) => row({ note: "A", occurred_on: `2026-09-0${d}` }));
    const b = [1, 2, 3].map((d) => row({ note: "B", occurred_on: `2026-10-0${d}` }));
    const kosong = [1, 2, 3].map(() => row({ note: "" }));
    expect(favorites([...a, ...b, ...kosong]).map((f) => f.note)).toEqual(["B", "A"]);
  });
});
