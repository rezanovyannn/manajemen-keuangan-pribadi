import { describe, expect, it } from "vitest";

import type { BalanceTransaction } from "@/lib/money";
import { loadAccountBalances, loadAllBalanceRows } from "@/lib/transactions/balances";

type Supabase = Parameters<typeof loadAllBalanceRows>[0];

// Klien palsu yang meniru batas 1.000 baris per permintaan dari Supabase.
function fakeSupabase(rows: BalanceTransaction[], opts: { failAt?: number } = {}) {
  const calls: [number, number][] = [];
  const client = {
    from: () => ({
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => {
            calls.push([from, to]);
            if (opts.failAt === from) return { data: null, error: { code: "57014" } };
            return { data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null };
          },
        }),
      }),
    }),
  };
  return { client: client as unknown as Supabase, calls };
}

const banyak = (n: number): BalanceTransaction[] =>
  Array.from({ length: n }, () => ({ account_id: "dompet", type: "expense", amount: 1_000 }));

describe("loadAllBalanceRows", () => {
  it("mengambil semua halaman, tidak berhenti di 1.000 baris", async () => {
    const { client, calls } = fakeSupabase(banyak(2_500));
    const { rows, error } = await loadAllBalanceRows(client);
    expect(error).toBeNull();
    expect(rows).toHaveLength(2_500);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("tepat kelipatan 1.000: ambil satu halaman kosong lalu berhenti", async () => {
    const { client, calls } = fakeSupabase(banyak(1_000));
    expect((await loadAllBalanceRows(client)).rows).toHaveLength(1_000);
    expect(calls).toHaveLength(2);
  });

  it("mengembalikan error tanpa data sebagian", async () => {
    const { client } = fakeSupabase(banyak(1_500), { failAt: 1000 });
    const { rows, error } = await loadAllBalanceRows(client);
    expect(rows).toEqual([]);
    expect(error).toEqual({ code: "57014" });
  });
});

describe("loadAccountBalances", () => {
  it("saldo memperhitungkan semua 2.500 transaksi", async () => {
    const { client } = fakeSupabase(banyak(2_500));
    const { balances } = await loadAccountBalances(client, [{ id: "dompet", opening_balance: 3_000_000 }]);
    expect(balances?.get("dompet")).toBe(500_000);
  });

  it("saldo null jika gagal dimuat (bukan angka yang salah)", async () => {
    const { client } = fakeSupabase(banyak(10), { failAt: 0 });
    const { balances, error } = await loadAccountBalances(client, [{ id: "dompet", opening_balance: 0 }]);
    expect(balances).toBeNull();
    expect(error).not.toBeNull();
  });
});
