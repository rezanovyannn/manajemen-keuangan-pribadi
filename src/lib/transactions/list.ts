import type { TransactionType } from "@/lib/money";

// Baris mentah dari tabel transactions (kolom yang dipakai daftar).
export type TransactionRowLite = {
  id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  occurred_on: string;
  note: string | null;
  transfer_id: string | null;
  created_at: string;
  fee_for_id?: string | null; // baris ini biaya admin untuk transaksi lain
};

export type TransactionListItem =
  | {
      kind: "income" | "expense";
      id: string;
      amount: number;
      occurredOn: string;
      note: string | null;
      accountId: string;
      accountName: string;
      categoryLabel: string;
      createdAt: string;
      fee?: number; // biaya admin yang menempel
    }
  | {
      kind: "transfer";
      id: string; // id baris transfer_out (dipakai untuk halaman edit)
      transferId: string;
      amount: number;
      occurredOn: string;
      note: string | null;
      fromAccountId: string;
      fromName: string;
      toAccountId: string;
      toName: string;
      createdAt: string;
      fee?: number; // biaya admin (dari akun asal)
    };

const TANPA_NAMA = "(tidak ditemukan)";

// Gabungkan dua baris transfer menjadi satu item, lalu urutkan terbaru di atas.
export function toListItems(
  rows: TransactionRowLite[],
  accountNames: Map<string, string>,
  categoryLabels: Map<string, string>,
): TransactionListItem[] {
  const items: TransactionListItem[] = [];
  const transfers = new Map<string, { out?: TransactionRowLite; in?: TransactionRowLite }>();

  // Biaya admin menempel ke induknya; jika induk tidak ada di daftar, tampil sendiri.
  const ids = new Set(rows.map((r) => r.id));
  const biaya = new Map(rows.filter((r) => r.fee_for_id && ids.has(r.fee_for_id)).map((r) => [r.fee_for_id!, r.amount]));

  for (const r of rows) {
    if (r.fee_for_id && ids.has(r.fee_for_id)) continue;
    if (r.type === "income" || r.type === "expense") {
      items.push({
        kind: r.type,
        id: r.id,
        amount: r.amount,
        occurredOn: r.occurred_on,
        note: r.note,
        accountId: r.account_id,
        accountName: accountNames.get(r.account_id) ?? TANPA_NAMA,
        categoryLabel: (r.category_id && categoryLabels.get(r.category_id)) || TANPA_NAMA,
        createdAt: r.created_at,
        ...(biaya.has(r.id) ? { fee: biaya.get(r.id) } : {}),
      });
    } else if (r.transfer_id) {
      const pair = transfers.get(r.transfer_id) ?? {};
      pair[r.type === "transfer_out" ? "out" : "in"] = r;
      transfers.set(r.transfer_id, pair);
    }
  }

  for (const [transferId, pair] of transfers) {
    const out = pair.out;
    const masuk = pair.in;
    if (!out || !masuk) continue; // seharusnya tidak terjadi: transfer selalu berpasangan
    items.push({
      kind: "transfer",
      id: out.id,
      transferId,
      amount: out.amount,
      occurredOn: out.occurred_on,
      note: out.note,
      fromAccountId: out.account_id,
      fromName: accountNames.get(out.account_id) ?? TANPA_NAMA,
      toAccountId: masuk.account_id,
      toName: accountNames.get(masuk.account_id) ?? TANPA_NAMA,
      createdAt: out.created_at,
      ...(biaya.has(out.id) ? { fee: biaya.get(out.id) } : {}),
    });
  }

  return items.sort(
    (a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt),
  );
}

// Filter akun: transfer ikut tampil jika akun asal ATAU tujuannya cocok.
export function filterByAccount(items: TransactionListItem[], accountId: string | undefined) {
  if (!accountId) return items;
  return items.filter((i) =>
    i.kind === "transfer" ? i.fromAccountId === accountId || i.toAccountId === accountId : i.accountId === accountId,
  );
}

// Kelompokkan per tanggal (urutan dipertahankan).
export function groupByDate(items: TransactionListItem[]) {
  const groups: { date: string; items: TransactionListItem[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.date === item.occurredOn) last.items.push(item);
    else groups.push({ date: item.occurredOn, items: [item] });
  }
  return groups;
}

// Escape karakter wildcard ILIKE agar pencarian "50%" tidak dianggap pola.
export function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Baris untuk ringkasan pemasukan/pengeluaran: biaya admin dihitung sebagai pengeluaran.
export function summaryRows(items: TransactionListItem[]) {
  return items.flatMap((i) => [
    { type: i.kind, amount: i.amount },
    ...(i.fee ? [{ type: "expense" as const, amount: i.fee }] : []),
  ]);
}
