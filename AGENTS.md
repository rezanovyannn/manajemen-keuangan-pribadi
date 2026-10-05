# AGENTS.md — Aplikasi Manajemen Keuangan Pribadi

Panduan untuk AI coding agent (Claude Code, Cursor, Codex, dll). Baca seluruh file ini
sebelum menulis kode. Rujukan lain: `ROADMAP.md` (urutan kerja) dan `PRD.md` (spesifikasi fitur, jika ada).
Jika instruksi pengguna bertentangan dengan file ini, tanyakan dulu sebelum lanjut.

## 1. Gambaran proyek

Web app manajemen keuangan pribadi untuk pengguna Indonesia: catat transaksi, kelola
banyak akun/dompet, budget per kategori, dashboard dan laporan bulanan.

- Bahasa antarmuka: Bahasa Indonesia
- Mata uang default: IDR (Rupiah)
- Prioritas UX: input transaksi harus cepat, terutama dari HP

## 2. Tech stack (jangan diganti tanpa izin)

| Area | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui |
| Database, Auth, Storage | Supabase (Postgres) |
| Validasi | Zod |
| Grafik | Recharts |
| Hosting | Vercel (auto-deploy dari `main`, preview per branch) |
| Testing | Vitest (logika), Playwright (alur utama) |
| CI | GitHub Actions: lint, typecheck, test |

## 3. Perintah umum

Sesuaikan jika script di `package.json` berbeda.

```bash
npm install          # pasang dependency
npm run dev          # jalankan lokal
npm run lint         # lint
npm run typecheck    # cek tipe (tsc --noEmit)
npm run test         # unit test (Vitest)
npm run test:e2e     # E2E (Playwright)
npm run build        # build produksi
```

Sebelum menyatakan tugas selesai, jalankan: `lint`, `typecheck`, `test`.

## 4. Struktur folder

```
src/
  app/                # route Next.js (App Router)
  components/         # komponen UI (shadcn di components/ui)
  lib/
    money/            # SEMUA kalkulasi uang ada di sini
    supabase/         # client server/browser
    validators/       # skema Zod
  actions/            # Server Actions (mutasi data)
supabase/
  migrations/         # satu-satunya sumber perubahan skema
tests/                # unit dan e2e
```

## 5. Cara kerja

- Kerjakan **satu fitur kecil per sesi**. Jangan ubah banyak hal sekaligus.
- Sebelum fitur baru: jelaskan rencana singkat (file yang disentuh, perubahan tabel), lalu tunggu persetujuan.
- Jaga file kecil. Pecah komponen/fungsi yang melebihi ~200 baris.
- Setelah selesai: jalankan lint, typecheck, test, dan laporkan hasilnya apa adanya, termasuk yang gagal.
- Sarankan commit per fitur dengan pesan jelas (contoh: `feat: tambah form transaksi`).
- Jangan menghapus atau menulis ulang kode yang tidak berkaitan dengan tugas.
- Ikuti urutan di `ROADMAP.md`. Jangan lompat fase sebelum fase sekarang lulus kriteria selesai.

## 6. Data model (draf awal)

Semua tabel punya `id uuid`, `user_id uuid`, `created_at`, `updated_at`.

- `profiles`: data pengguna, mata uang default
- `accounts`: dompet/rekening (tunai, bank, e-wallet), saldo awal
- `categories`: kategori dan sub-kategori, tipe (income/expense)
- `transactions`: akun, kategori, tipe (income/expense/transfer), nominal, tanggal, catatan
- `budgets`: kategori, periode (bulan), batas nominal
- `recurring_rules`: transaksi/tagihan berulang, interval, tanggal berikutnya
- `goals`: target tabungan, nominal target, tenggat

Perubahan skema hanya lewat file migrasi di `supabase/migrations/`. Jangan ubah skema langsung dari dashboard.

## 7. Aturan uang (KRITIS)

- Simpan nominal sebagai **integer** (`bigint`). Rupiah tanpa desimal.
  Untuk multi-currency nanti, simpan dalam satuan terkecil mata uang tersebut.
- **Dilarang memakai float** untuk kalkulasi uang.
- Semua perhitungan saldo, budget, dan transfer ditaruh di `src/lib/money/` agar mudah diuji.
- Transfer antar akun harus atomik: dua catatan (keluar dan masuk) dibuat dalam satu transaksi database.
- Format tampilan lewat satu helper `formatRupiah`, contoh: `Rp 1.250.000`.
- Saldo akun dihitung dari saldo awal ditambah transaksi. Jangan simpan saldo sebagai angka yang diedit manual.

## 8. Keamanan

- **Aktifkan Row Level Security (RLS) di semua tabel sejak awal.**
  Policy dasar: pengguna hanya boleh select/insert/update/delete baris dengan `user_id = auth.uid()`.
- Tabel baru tanpa RLS dianggap belum selesai. Sertakan policy di migrasi yang sama.
- Jangan pernah memakai `service_role` key di kode klien atau variabel `NEXT_PUBLIC_*`.
- Secret hanya di `.env.local` dan Environment Variables Vercel. Pastikan `.env*` ada di `.gitignore`.
- Jangan commit key, token, atau data keuangan asli (termasuk di seed dan test).
- Validasi semua input di server dengan Zod, bukan hanya di form klien.
- Jangan taruh data sensitif (nominal, nama akun) di log atau URL.

## 9. Testing

Wajib ada unit test (Vitest) untuk:
- perhitungan saldo akun
- transfer antar akun (kedua sisi konsisten)
- pemakaian budget dan batas peringatan
- pembuatan transaksi berulang
- format Rupiah dan pembulatan

E2E (Playwright) minimal untuk: login, tambah transaksi, lihat dashboard.
Jangan tandai tugas selesai jika test terkait belum ada atau gagal.

## 10. Konvensi kode

- TypeScript strict, tanpa `any`.
- Nama file `kebab-case`, komponen React `PascalCase`.
- Mutasi data lewat Server Actions dengan validasi Zod dan penanganan error jelas.
- Pesan error ke pengguna dalam Bahasa Indonesia yang ramah; detail teknis hanya di log server.
- UI responsif (mobile-first) dan mendukung mode gelap.
- Aksesibilitas dasar: label form, kontras warna, navigasi keyboard.

## 11. Tanyakan dulu, jangan berasumsi

- Perubahan skema yang menghapus kolom atau mengubah tipe kolom
- Menambah dependency baru
- Mengubah aturan perhitungan uang
- Fitur yang belum ada di `PRD.md` atau `ROADMAP.md`
- Apa pun yang menyentuh auth, RLS, atau data pengguna secara massal

## 12. Definition of Done (berlaku untuk tiap fitur)

- [ ] Fitur berjalan sesuai deskripsi di roadmap
- [ ] Ada migrasi dan RLS untuk tabel yang disentuh
- [ ] Unit test terkait ada dan lulus
- [ ] `lint`, `typecheck`, `test` lulus
- [ ] Tampilan nyaman di layar HP
- [ ] Tidak ada secret atau data asli yang ikut ter-commit

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
