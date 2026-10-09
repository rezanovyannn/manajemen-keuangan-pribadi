"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState } from "react";

import { getQuickAddData, quickAddTransaction, undoQuickAdd } from "@/actions/quick-add";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { formatRupiah } from "@/lib/money";
import type { Favorite } from "@/lib/quick-add/learn";
import type { QuickAddData } from "@/lib/quick-add/query";

import { QuickAddPanel, type Tersimpan } from "./quick-add-panel";
import { Toast, type ToastState } from "./toast";

const Konteks = createContext<{ open: () => void }>({ open: () => {} });

// Buka panel Catat kilat dari mana saja (tombol tambah, sidebar, pintasan N).
export function useQuickAdd() {
  return useContext(Konteks);
}

const LAMA_TOAST = 6000;

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<QuickAddData | null | "gagal">(null);
  const [versi, setVersi] = useState(0); // remount panel (form kosong) tiap dibuka
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tampilkanToast = useCallback((t: ToastState) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), LAMA_TOAST);
  }, []);

  const buka = useCallback(() => {
    // Tanpa sinyal: pakai halaman tambah transaksi (service worker menampilkan form offline).
    if (!navigator.onLine) {
      router.push("/transaksi/baru");
      return;
    }
    setVersi((v) => v + 1);
    setOpen(true);
    // Muat data terbaru tiap dibuka (saran ikut belajar dari transaksi terakhir).
    getQuickAddData()
      .then((d) => setData(d ?? "gagal"))
      .catch(() => setData("gagal"));
  }, [router]);

  // Tutup panel saat pindah halaman (mis. lewat "Form lengkap").
  const [jalur, setJalur] = useState(pathname);
  if (jalur !== pathname) {
    setJalur(pathname);
    setOpen(false);
  }

  const batalkan = useCallback(
    (id: string) => async () => {
      const r = await undoQuickAdd(id);
      tampilkanToast({ message: r.ok ? "Transaksi dibatalkan." : "Gagal membatalkan. Hapus dari halaman Transaksi." });
      router.refresh();
    },
    [router, tampilkanToast],
  );

  const tersimpan = useCallback(
    (t: Tersimpan) => {
      setOpen(false);
      tampilkanToast({ message: t.message, undo: batalkan(t.id) });
      router.refresh();
    },
    [batalkan, router, tampilkanToast],
  );

  // Favorit: langsung simpan (tanggal hari ini), dengan toast Batalkan.
  const favorit = useCallback(
    async (f: Favorite) => {
      if (data === null || data === "gagal") return;
      const r = await quickAddTransaction({
        type: f.type,
        amount: String(f.amount),
        accountId: f.accountId,
        categoryId: f.categoryId,
        occurredOn: data.today,
        note: f.note,
      });
      if (!r.ok) {
        tampilkanToast({ message: r.error });
        return;
      }
      tersimpan({ id: r.id, message: `${f.note} ${formatRupiah(f.amount)} tersimpan` });
    },
    [data, tampilkanToast, tersimpan],
  );

  return (
    <Konteks.Provider value={{ open: buka }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] gap-4 overflow-x-hidden overflow-y-auto rounded-t-2xl px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg md:bottom-6 md:rounded-2xl"
        >
          <span aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="grid gap-0.5">
            <SheetTitle className="text-[17px] font-semibold tracking-tight">Catat kilat</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">Nominal, kategori, simpan. Selesai.</SheetDescription>
          </div>
          {data === null ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : data === "gagal" ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive">
              Data gagal dimuat. Tutup lalu coba lagi.
            </p>
          ) : data.accounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tambahkan akun dulu di menu Akun.</p>
          ) : (
            <QuickAddPanel key={versi} data={data} onSaved={tersimpan} onFavorite={favorit} />
          )}
        </SheetContent>
      </Sheet>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Konteks.Provider>
  );
}
