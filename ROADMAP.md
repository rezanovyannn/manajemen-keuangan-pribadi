# ROADMAP — Aplikasi Manajemen Keuangan Pribadi

Kerjakan berurutan. Satu fase dianggap selesai jika semua checklist-nya tercentang
dan Definition of Done di `AGENTS.md` terpenuhi. Estimasi usaha hanya perkiraan kasar
untuk satu orang yang bekerja bersama AI agent.

Legenda: ⬜ belum · 🟦 sedang dikerjakan · ✅ selesai

---

## Fase 0 — Fondasi (±1 hari)

Tujuan: kerangka proyek hidup di internet.

- [x] Buat repo GitHub, tambahkan `AGENTS.md`, `ROADMAP.md`, `.gitignore`
- [x] Scaffold Next.js (App Router, TypeScript, Tailwind) + shadcn/ui
- [x] Buat proyek Supabase, hubungkan ke Vercel (env vars)
- [x] Deploy pertama ke Vercel dari branch `main`
- [x] Setup GitHub Actions: lint, typecheck, test
- [x] Setup Vitest dan Playwright (satu test contoh)

**Selesai jika:** halaman awal tampil di URL Vercel dan CI hijau.

---

## Fase 1 — Auth dan profil (±1–2 hari)

- [x] Registrasi, login, logout (Supabase Auth)
- [x] Middleware untuk melindungi halaman yang butuh login
- [x] Tabel `profiles` + RLS
- [x] Layout aplikasi: navigasi (bottom bar di HP, sidebar di desktop), mode gelap

**Selesai jika:** pengguna bisa daftar, login, dan hanya melihat halaman miliknya.
Tes manual: dua akun berbeda tidak bisa saling melihat data.

---

## Fase 2 — Akun/dompet dan kategori (±2 hari)

- [x] Tabel `accounts` + RLS, CRUD akun (tunai, bank, e-wallet), saldo awal
- [x] Tabel `categories` + RLS, CRUD kategori dan sub-kategori
- [x] Seed kategori default untuk pengguna baru (makan, transportasi, tagihan, gaji, dll)
- [x] Modul `src/lib/money/` + helper `formatRupiah` + unit test

**Selesai jika:** pengguna bisa membuat akun dan kategori, dan nominal tampil dalam format Rupiah.

---

## Fase 3 — Transaksi (inti aplikasi) (±3–4 hari)

- [x] Tabel `transactions` + RLS
- [x] Form tambah transaksi (income, expense) yang cepat di HP
- [x] Transfer antar akun secara atomik
- [x] Daftar transaksi: filter (tanggal, akun, kategori), pencarian, edit, hapus
- [x] Perhitungan saldo akun dari transaksi
- [x] Unit test: saldo, transfer, edit/hapus transaksi

**Selesai jika:** saldo setiap akun selalu konsisten dengan riwayat transaksi, termasuk setelah edit dan hapus.

---

## Fase 4 — Budget (±2 hari)

- [ ] Tabel `budgets` + RLS
- [ ] Atur budget bulanan per kategori
- [ ] Progress bar pemakaian budget
- [ ] Peringatan saat budget hampir habis (contoh: 80%) dan saat terlampaui
- [ ] Unit test pemakaian budget dan ambang peringatan

**Selesai jika:** budget terhitung otomatis dari transaksi bulan berjalan.

---

## Fase 5 — Dashboard dan laporan (±2–3 hari)

- [ ] Ringkasan bulanan: total pemasukan, pengeluaran, selisih
- [ ] Grafik pengeluaran per kategori (donut/bar)
- [ ] Grafik tren bulanan
- [ ] Pilih periode (bulan ini, bulan lalu, kustom)
- [ ] Export laporan ke CSV

**Selesai jika:** angka di dashboard cocok dengan hitungan manual dari daftar transaksi.

---

## 🎯 Milestone MVP (akhir Fase 5)

Aplikasi sudah bisa dipakai harian. **Pakai sendiri minimal 2 minggu** sebelum lanjut,
catat apa yang mengganggu, lalu sesuaikan prioritas fase berikutnya.

---

## Fase 6 — Transaksi berulang dan tagihan (±2–3 hari)

- [ ] Tabel `recurring_rules` + RLS
- [ ] Atur transaksi berulang (gaji, langganan, cicilan, sewa)
- [ ] Job terjadwal (Vercel Cron atau Supabase Scheduled Functions) untuk membuat transaksi otomatis
- [ ] Daftar tagihan yang akan jatuh tempo + pengingat
- [ ] Unit test pembuatan transaksi berulang (tanpa duplikasi)

---

## Fase 7 — Tujuan tabungan, utang, net worth (±3–4 hari)

- [ ] Tabel `goals`: target tabungan, progress, tenggat
- [ ] Pencatatan utang dan cicilan
- [ ] Halaman net worth: total aset dikurangi kewajiban
- [ ] Dukungan pendapatan tidak tetap (rata-rata, buffer)

---

## Fase 8 — Import dan input cepat (±3–4 hari)

- [ ] Import CSV mutasi bank/e-wallet dengan pemetaan kolom
- [ ] Deteksi duplikat saat import
- [ ] Aturan kategori otomatis (contoh: "Indomaret" → Belanja harian)
- [ ] Input bahasa natural, contoh "makan siang 35rb gopay" (memakai LLM API)
- [ ] Upload foto struk ke Supabase Storage (private bucket)

---

## Fase 9 — PWA dan kolaborasi (±3–4 hari)

- [ ] PWA: bisa di-install di HP, ikon, tampilan layar penuh
- [ ] Dukungan offline sederhana untuk input transaksi (sinkron saat online)
- [ ] Shared budget untuk pasangan (anggota dengan izin terbatas)
- [ ] Notifikasi (email via Resend atau push)

---

## Fase 10 — Insight dan investasi (opsional)

- [ ] Insight AI: ringkasan pengeluaran, deteksi anomali, langganan tersembunyi
- [ ] Indikator "aman dibelanjakan" (safe to spend)
- [ ] Proyeksi arus kas
- [ ] Pelacakan investasi manual: reksadana, saham, emas, crypto

---

## Backlog ide (belum dijadwalkan)

- Bot Telegram/WhatsApp untuk catat transaksi
- Multi-currency dan kurs
- Laporan tahunan dan ringkasan pajak
- Integrasi bank otomatis lewat agregator (butuh penyedia berbayar, evaluasi dulu biayanya)
- Backup dan ekspor semua data pengguna

---

## Risiko dan catatan

| Risiko | Mitigasi |
|---|---|
| Bug perhitungan uang | Semua kalkulasi di `src/lib/money/`, wajib unit test |
| Kebocoran data antar pengguna | RLS di semua tabel, uji dengan dua akun |
| AI menulis kode terlalu besar dan berantakan | Satu fitur per sesi, commit kecil, review tiap diff |
| Scope melebar | Ikuti urutan fase, fitur baru masuk backlog dulu |
| Secret ter-commit | `.gitignore`, env hanya di Vercel dan `.env.local` |
| Batas free tier | Pantau pemakaian Supabase dan Vercel, upgrade hanya jika perlu |
