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

  for (const r of rows) {
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
