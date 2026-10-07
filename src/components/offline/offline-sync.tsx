"use client";

import { CloudOff, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { syncOfflineTransactions } from "@/actions/offline-sync";
import { Button } from "@/components/ui/button";
import { formatRupiah, parseRupiah } from "@/lib/money";
import { terapkanHasil, type ItemOffline } from "@/lib/offline/queue";

import { bacaAntrean, EVENT_ANTREAN, simpanAntrean } from "./storage";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT_ANTREAN, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT_ANTREAN, cb);
    window.removeEventListener("storage", cb);
  };
}
// Snapshot berupa string agar perbandingan useSyncExternalStore stabil.
const snapshot = () => JSON.stringify(bacaAntrean());

// Banner antrean offline + pengiriman otomatis saat online.
export function OfflineSync() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const antrean: ItemOffline[] = JSON.parse(raw);
  const [status, setStatus] = useState<"diam" | "mengirim" | "perlu-masuk">("diam");
  const [terkirim, setTerkirim] = useState(0);
  const sedangKirim = useRef(false);

  const kirim = useCallback(async () => {
    const daftar = bacaAntrean();
    if (sedangKirim.current || daftar.length === 0 || !navigator.onLine) return;
    sedangKirim.current = true;
    setStatus("mengirim");
    try {
      const hasil = await syncOfflineTransactions(daftar);
      if (hasil.perluMasuk) {
        setStatus("perlu-masuk");
        return;
      }
      simpanAntrean(terapkanHasil(bacaAntrean(), hasil));
      setTerkirim((n) => n + hasil.terkirim.length);
      setStatus("diam");
    } catch {
      setStatus("diam"); // jaringan putus di tengah: coba lagi saat online berikutnya
    } finally {
      sedangKirim.current = false;
    }
  }, []);

  useEffect(() => {
    // Kirim saat halaman dibuka, saat kembali online, dan saat antrean bertambah.
    const t = window.setTimeout(kirim, 0);
    window.addEventListener("online", kirim);
    window.addEventListener(EVENT_ANTREAN, kirim);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("online", kirim);
      window.removeEventListener(EVENT_ANTREAN, kirim);
    };
  }, [kirim]);

  if (antrean.length === 0) {
    return terkirim > 0 ? (
      <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        {terkirim} transaksi offline sudah terkirim.
      </p>
    ) : null;
  }

  const hapus = (id: string) => simpanAntrean(bacaAntrean().filter((i) => i.id !== id));

  return (
    <section aria-label="Transaksi offline" className="mb-4 grid gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <CloudOff className="size-4 shrink-0" aria-hidden />
        <p className="flex-1 font-medium" role="status">
          {status === "mengirim"
            ? "Mengirim transaksi offline..."
            : status === "perlu-masuk"
              ? `${antrean.length} transaksi offline menunggu. Masuk untuk mengirimnya.`
              : `${antrean.length} transaksi offline menunggu dikirim`}
        </p>
        {status === "perlu-masuk" ? (
          <Link href="/masuk" className="text-sm font-medium underline underline-offset-4">
            Masuk
          </Link>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={kirim} disabled={status === "mengirim"}>
            <RefreshCw aria-hidden />
            Kirim
          </Button>
        )}
      </div>
      <ul className="grid gap-1">
        {antrean.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate">
              {i.type === "income" ? "+" : "−"}
              {formatRupiah(parseRupiah(i.amount) ?? 0)} · {i.note || "(tanpa catatan)"} · {i.occurredOn}
              {i.error && <span className="block text-rose-700 dark:text-rose-400">{i.error}</span>}
            </span>
            {i.error && (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Hapus dari antrean" onClick={() => hapus(i.id)}>
                <Trash2 aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
