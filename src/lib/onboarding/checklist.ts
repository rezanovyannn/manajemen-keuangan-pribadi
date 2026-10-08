// Checklist "Mulai di sini" di Beranda. Status dihitung dari data, bukan disimpan.

export type ChecklistInput = {
  accounts: number;
  transactions: number;
  budgetsThisMonth: number;
  recurringRules: number;
  goals: number;
};

export type ChecklistItem = { id: string; label: string; href: string; done: boolean };

export function buildChecklist(d: ChecklistInput): ChecklistItem[] {
  return [
    { id: "akun", label: "Tambah akun atau dompet pertama", href: "/akun/baru", done: d.accounts > 0 },
    { id: "transaksi", label: "Catat transaksi pertama", href: "/transaksi/baru", done: d.transactions > 0 },
    { id: "budget", label: "Atur budget bulan ini", href: "/budget", done: d.budgetsThisMonth > 0 },
    { id: "tagihan", label: "Tambah tagihan atau pemasukan rutin", href: "/berulang/baru", done: d.recurringRules > 0 },
    { id: "tujuan", label: "Buat tujuan tabungan", href: "/tujuan/baru", done: d.goals > 0 },
  ];
}

export function checklistProgress(items: { done: boolean }[], extraDone = 0, extraTotal = 0) {
  const done = items.filter((i) => i.done).length + extraDone;
  const total = items.length + extraTotal;
  return { done, total, complete: done === total };
}
