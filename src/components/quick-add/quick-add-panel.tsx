"use client";

import { Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { quickAddTransaction } from "@/actions/quick-add";
import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/dates";
import { formatRupiah, formatRupiahRingkas } from "@/lib/money";
import { guessCategory, type Favorite } from "@/lib/quick-add/learn";
import { parseQuickText } from "@/lib/quick-add/parse";
import type { QuickAddData } from "@/lib/quick-add/query";
import { cn } from "@/lib/utils";

import { Keypad, tambahDigit } from "./keypad";

type Jenis = "expense" | "income";

const CHIP =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-input bg-card px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9";
const CHIP_AKTIF = "border-primary bg-primary/10 text-link";
const TAMPIL_AWAL = 8;

export type Tersimpan = { id: string; message: string };

// Isi panel Catat kilat: nominal lewat keypad, kategori & akun lewat chip, catatan
// (menebak kategori), tanggal cepat, dan favorit 1 ketukan.
export function QuickAddPanel({
  data,
  onSaved,
  onFavorite,
}: {
  data: QuickAddData;
  onSaved: (t: Tersimpan) => void;
  onFavorite: (f: Favorite) => void;
}) {
  const [jenis, setJenis] = useState<Jenis>("expense");
  const [digits, setDigits] = useState("");
  const [kategori, setKategori] = useState<string | null>(null);
  const [kategoriManual, setKategoriManual] = useState(false);
  const [akun, setAkun] = useState(data.lastAccountId ?? "");
  const [tanggal, setTanggal] = useState(data.today);
  const [catatan, setCatatan] = useState("");
  const [semuaKategori, setSemuaKategori] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ketik, setKetik] = useState("");
  const [pending, startTransition] = useTransition();

  const pilihanKategori = useMemo(() => data.categories.filter((c) => c.type === jenis), [data.categories, jenis]);
  const ditebak = useMemo(
    () => (kategoriManual || catatan.trim() === "" ? null : guessCategory(catatan, jenis, data.model)),
    [catatan, jenis, kategoriManual, data.model],
  );
  const kategoriAktif = kategoriManual ? kategori : (ditebak ?? kategori);
  const nominal = digits === "" ? 0 : Number(digits);
  const nama = (id: string | null) => data.categories.find((c) => c.id === id);

  // Keyboard fisik (desktop): angka & Backspace mengisi nominal saat tidak mengetik di input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (/^\d$/.test(e.key)) setDigits((d) => tambahDigit(d, e.key));
      else if (e.key === "Backspace") setDigits((d) => d.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Kategori yang ditampilkan: beberapa teratas + yang sedang dipilih.
  const tampil = semuaKategori ? pilihanKategori : pilihanKategori.slice(0, TAMPIL_AWAL);
  if (kategoriAktif && !tampil.some((c) => c.id === kategoriAktif)) {
    const k = pilihanKategori.find((c) => c.id === kategoriAktif);
    if (k) tampil.push(k);
  }

  // Ketik bebas: isi nominal, akun, jenis, dan catatan dari satu kalimat.
  function ketikBebas(v: string) {
    setKetik(v);
    const p = parseQuickText(v, data.accounts);
    setDigits(p.amount !== null ? String(p.amount) : "");
    if (p.accountId) setAkun(p.accountId);
    // Hanya beralih ke "Masuk" bila ada kata pemasukan; pilihan pengguna tidak ditimpa.
    if (p.type === "income" && jenis !== "income") {
      setJenis("income");
      setKategori(null);
      setKategoriManual(false);
    }
    setCatatan(p.note);
  }

  function simpan() {
    setError(null);
    startTransition(async () => {
      const r = await quickAddTransaction({
        type: jenis,
        amount: String(nominal),
        accountId: akun,
        categoryId: kategoriAktif ?? "",
        occurredOn: tanggal,
        note: catatan,
      });
      if (!r.ok) {
        setError(Object.values(r.fieldErrors ?? {}).flat()[0] ?? r.error);
        return;
      }
      onSaved({ id: r.id, message: `${jenis === "income" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(nominal)} tersimpan` });
    });
  }

  const favorit = data.favorites;
  const siap = nominal > 0 && Boolean(kategoriAktif) && Boolean(akun);

  return (
    <div className="grid gap-4">
      {/* Jenis */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Jenis transaksi">
        {(["expense", "income"] as const).map((j) => (
          <button
            key={j}
            type="button"
            role="radio"
            aria-checked={jenis === j}
            onClick={() => {
              setJenis(j);
              setKategori(null);
              setKategoriManual(false);
            }}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              jenis === j ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
            )}
          >
            {j === "expense" ? "Keluar" : "Masuk"}
          </button>
        ))}
      </div>

      {/* Ketik bebas */}
      <label className="grid gap-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Wand2 className="size-3.5 text-link" aria-hidden />
          Ketik cepat
        </span>
        <input
          value={ketik}
          onChange={(e) => ketikBebas(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && siap && !pending) {
              e.preventDefault();
              simpan();
            }
          }}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="kopi 25rb gopay · gaji 8jt bca"
          className="h-11 rounded-md border border-input bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:text-sm"
        />
      </label>

      {/* Favorit 1 ketukan */}
      {favorit.length > 0 && (
        <section aria-label="Sering dicatat" className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Sering dicatat · ketuk untuk langsung simpan</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {favorit.map((f) => (
              <button
                key={`${f.type}-${f.note}-${f.amount}-${f.accountId}`}
                type="button"
                onClick={() => onFavorite(f)}
                className={CHIP}
                aria-label={`Catat ${f.note} ${formatRupiah(f.amount)}`}
              >
                <span aria-hidden>{nama(f.categoryId)?.emoji ?? "•"}</span>
                {f.note}
                <span className={cn("tabular-nums", f.type === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                  {f.type === "income" ? "+" : ""}
                  {formatRupiahRingkas(f.amount)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Nominal + keypad */}
      <div className="grid gap-3">
        <p
          aria-live="polite"
          aria-label={`Nominal ${formatRupiah(nominal)}`}
          className={cn(
            "text-center text-4xl font-bold tracking-tight tabular-nums",
            nominal === 0 && "text-muted-foreground/60",
            jenis === "income" && nominal > 0 && "text-emerald-700 dark:text-emerald-400",
          )}
          data-testid="kilat-nominal"
        >
          {formatRupiah(nominal)}
        </p>
        <Keypad onDigit={(d) => setDigits((x) => tambahDigit(x, d))} onDelete={() => setDigits((x) => x.slice(0, -1))} />
      </div>

      {/* Kategori */}
      <section aria-label="Kategori" className="grid gap-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          Kategori
          {ditebak && !kategoriManual && (
            <span className="inline-flex items-center gap-1 text-link">
              <Sparkles className="size-3.5" aria-hidden />
              ditebak dari catatan
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {tampil.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={kategoriAktif === c.id}
              onClick={() => {
                setKategori(c.id);
                setKategoriManual(true);
              }}
              className={cn(CHIP, kategoriAktif === c.id && CHIP_AKTIF)}
            >
              <span aria-hidden>{c.emoji}</span>
              {c.label}
            </button>
          ))}
          {!semuaKategori && pilihanKategori.length > TAMPIL_AWAL && (
            <button type="button" onClick={() => setSemuaKategori(true)} className={cn(CHIP, "text-muted-foreground")}>
              Semua kategori
            </button>
          )}
        </div>
      </section>

      {/* Catatan */}
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Catatan (opsional)</span>
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          maxLength={200}
          autoComplete="off"
          placeholder="Contoh: kopi, gojek, indomaret"
          className="h-11 rounded-md border border-input bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:text-sm"
        />
      </label>

      {/* Akun */}
      <section aria-label="Akun" className="grid gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Akun</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {data.accounts.map((a) => (
            <button key={a.id} type="button" aria-pressed={akun === a.id} onClick={() => setAkun(a.id)} className={cn(CHIP, akun === a.id && CHIP_AKTIF)}>
              {a.name}
            </button>
          ))}
        </div>
      </section>

      {/* Tanggal */}
      <section aria-label="Tanggal" className="flex flex-wrap items-center gap-2">
        {[
          { label: "Hari ini", v: data.today },
          { label: "Kemarin", v: addDays(data.today, -1) },
        ].map((t) => (
          <button key={t.label} type="button" aria-pressed={tanggal === t.v} onClick={() => setTanggal(t.v)} className={cn(CHIP, tanggal === t.v && CHIP_AKTIF)}>
            {t.label}
          </button>
        ))}
        <input
          type="date"
          aria-label="Tanggal lain"
          value={tanggal}
          max={addDays(data.today, 365)}
          onChange={(e) => e.target.value && setTanggal(e.target.value)}
          className="h-10 rounded-full border border-input bg-card px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
        />
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Link href="/transaksi/baru" className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Form lengkap (transfer, biaya admin)
      </Link>
      {/* Tombol simpan menempel di bawah panel agar tidak perlu menggulir. */}
      <div className="sticky -bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 border-t border-border bg-popover pt-3 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
        <Button type="button" size="lg" className="h-12 w-full text-base" disabled={!siap || pending} onClick={simpan}>
          {pending ? "Menyimpan..." : nominal > 0 ? `Simpan ${formatRupiah(nominal)}` : "Simpan"}
        </Button>
      </div>
    </div>
  );
}
