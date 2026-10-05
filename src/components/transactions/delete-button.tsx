"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

// Hapus dua langkah: klik "Hapus", lalu konfirmasi. Mencegah terhapus karena salah sentuh di HP.
export function DeleteTransactionButton({ action, isTransfer }: { action: () => Promise<void>; isTransfer: boolean }) {
  const [konfirmasi, setKonfirmasi] = useState(false);

  if (!konfirmasi) {
    return (
      <Button type="button" variant="destructive" size="lg" className="h-10 sm:justify-self-start" onClick={() => setKonfirmasi(true)}>
        <Trash2 aria-hidden />
        Hapus transaksi
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-3" role="alertdialog" aria-labelledby="hapus-judul">
      <p id="hapus-judul" className="text-sm">
        Yakin hapus transaksi ini?{isTransfer ? " Kedua sisi transfer akan ikut terhapus." : ""} Tindakan ini tidak bisa dibatalkan.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" variant="outline" size="lg" className="h-10" onClick={() => setKonfirmasi(false)} autoFocus>
          Batal
        </Button>
        <Button type="submit" variant="destructive" size="lg" className="h-10">
          Ya, hapus
        </Button>
      </div>
    </form>
  );
}
