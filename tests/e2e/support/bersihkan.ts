// Pembersih data akun uji E2E (E2E_EMAIL di .env.local).
//
// Login sebagai akun uji lalu memakai REST API Supabase biasa, sehingga RLS menjamin
// hanya data akun uji itu yang tersentuh. Tidak memakai service_role.
//
//   mode "e2e"   : hapus data bernama/berawalan "E2E" (dipakai otomatis setelah E2E)
//   mode "semua" : hapus semua data akun uji, sisakan profil + 15 kategori default
//   simulasi     : hanya hitung, tidak menghapus apa pun

type Mode = "e2e" | "semua";
type Row = Record<string, unknown> & { id: string };

const KATEGORI_DEFAULT = new Set([
  "expense:Makan & Minum", "expense:Transportasi", "expense:Belanja", "expense:Tagihan",
  "expense:Kesehatan", "expense:Hiburan", "expense:Pendidikan", "expense:Cicilan & Utang", "expense:Biaya Admin", "expense:Lainnya",
  "income:Gaji", "income:Bonus", "income:Hadiah", "income:Pelunasan Piutang", "income:Lainnya",
]);

const isE2E = (s: unknown) => typeof s === "string" && /^E2E\b/.test(s);

export async function bersihkanAkunUji(mode: Mode, opsi: { simulasi?: boolean; log?: boolean } = {}) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI tanpa .env.local: tidak ada akun uji, tidak ada yang dibersihkan.
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!url || !anon || !email || !password) return null;
  const log = (...a: unknown[]) => opsi.log && console.log(...a);

  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenRes.ok) throw new Error(`Login akun uji gagal: HTTP ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const h = { apikey: anon, Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };

  async function semuaBaris(tabel: string, kolom: string): Promise<Row[]> {
    const hasil: Row[] = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${url}/rest/v1/${tabel}?select=${kolom}&order=id&limit=1000&offset=${offset}`, { headers: h });
      if (!r.ok) throw new Error(`Baca ${tabel} gagal: HTTP ${r.status}`);
      const data = (await r.json()) as Row[];
      hasil.push(...data);
      if (data.length < 1000) return hasil;
    }
  }

  async function hapus(tabel: string, ids: string[]) {
    if (opsi.simulasi) return;
    for (let i = 0; i < ids.length; i += 100) {
      const r = await fetch(`${url}/rest/v1/${tabel}?id=in.(${ids.slice(i, i + 100).join(",")})`, { method: "DELETE", headers: h });
      if (!r.ok) throw new Error(`Hapus ${tabel} gagal: HTTP ${r.status} ${await r.text()}`);
    }
  }

  const [accounts, categories, txs, budgets, rules, goals, debts] = await Promise.all([
    semuaBaris("accounts", "id,name"),
    semuaBaris("categories", "id,name,type,parent_id,archived_at"),
    semuaBaris("transactions", "id,account_id,category_id,type,transfer_id,note,debt_id,recurring_rule_id"),
    semuaBaris("budgets", "id,category_id"),
    semuaBaris("recurring_rules", "id,name,account_id"),
    semuaBaris("goals", "id,name,account_id"),
    semuaBaris("debts", "id,name"),
  ]);

  const semua = mode === "semua";
  const akunHapus = new Set(accounts.filter((a) => semua || isE2E(a.name)).map((a) => a.id));
  const debtHapus = new Set(debts.filter((d) => semua || isE2E(d.name)).map((d) => d.id));
  const ruleHapus = new Set(rules.filter((r) => semua || isE2E(r.name) || akunHapus.has(r.account_id as string)).map((r) => r.id));
  const katHapus = new Set(
    categories
      .filter((c) => (semua ? !(c.parent_id === null && KATEGORI_DEFAULT.has(`${c.type}:${c.name}`)) : isE2E(c.name)))
      .map((c) => c.id),
  );
  // Sub-kategori dari kategori yang dihapus ikut terhapus.
  for (const c of categories) if (c.parent_id && katHapus.has(c.parent_id as string)) katHapus.add(c.id);

  const txHapus = txs.filter(
    (t) =>
      semua ||
      akunHapus.has(t.account_id as string) ||
      katHapus.has(t.category_id as string) ||
      debtHapus.has(t.debt_id as string) ||
      ruleHapus.has(t.recurring_rule_id as string) ||
      isE2E(t.note),
  );
  const transferIds = [...new Set(txHapus.filter((t) => t.transfer_id).map((t) => t.transfer_id as string))];
  const biasaIds = txHapus.filter((t) => !t.transfer_id).map((t) => t.id);

  const ringkasan = {
    transaksi: biasaIds.length,
    transfer: transferIds.length,
    budget: budgets.filter((b) => semua || katHapus.has(b.category_id as string)).length,
    jadwal: ruleHapus.size,
    tujuan: goals.filter((g) => semua || isE2E(g.name) || akunHapus.has(g.account_id as string)).length,
    utangPiutang: debtHapus.size,
    kategori: katHapus.size,
    akun: akunHapus.size,
  };
  log(`${opsi.simulasi ? "[SIMULASI] " : ""}akan dihapus:`, ringkasan);

  // Urutan mengikuti relasi (FK): yang merujuk dihapus lebih dulu.
  await hapus("transactions", biasaIds);
  for (const id of opsi.simulasi ? [] : transferIds) {
    const r = await fetch(`${url}/rest/v1/rpc/delete_transfer`, { method: "POST", headers: h, body: JSON.stringify({ p_transfer_id: id }) });
    if (!r.ok) throw new Error(`Hapus transfer gagal: HTTP ${r.status}`);
  }
  await hapus("budgets", budgets.filter((b) => semua || katHapus.has(b.category_id as string)).map((b) => b.id));
  await hapus("recurring_rules", [...ruleHapus]);
  await hapus("goals", goals.filter((g) => semua || isE2E(g.name) || akunHapus.has(g.account_id as string)).map((g) => g.id));
  await hapus("debts", [...debtHapus]);
  const anak = categories.filter((c) => c.parent_id && katHapus.has(c.id)).map((c) => c.id);
  await hapus("categories", anak);
  await hapus("categories", [...katHapus].filter((id) => !anak.includes(id)));
  await hapus("accounts", [...akunHapus]);

  // Mode semua: pulihkan kategori default yang sempat diarsipkan.
  if (semua && !opsi.simulasi) {
    const arsip = categories.filter((c) => c.archived_at && !katHapus.has(c.id)).map((c) => c.id);
    if (arsip.length > 0) {
      const r = await fetch(`${url}/rest/v1/categories?id=in.(${arsip.join(",")})`, {
        method: "PATCH",
        headers: h,
        body: JSON.stringify({ archived_at: null }),
      });
      if (!r.ok) throw new Error(`Pulihkan kategori gagal: HTTP ${r.status}`);
    }
  }
  return { ringkasan, h, url };
}
