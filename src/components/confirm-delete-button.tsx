"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

// Hapus dua langkah: klik tombol, lalu konfirmasi. Mencegah terhapus karena salah sentuh di HP.
export function ConfirmDeleteButton({
  action,
  label,
  message,
}: {
  action: () => Promise<void>;
  label: string;
  message: string;
}) {
  const [konfirmasi, setKonfirmasi] = useState(false);

  if (!konfirmasi) {
    return (
      <Button type="button" variant="destructive" size="lg" className="h-10 sm:justify-self-start" onClick={() => setKonfirmasi(true)}>
        <Trash2 aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-3" role="alertdialog" aria-labelledby="hapus-judul">
      <p id="hapus-judul" className="text-sm">
        {message} Tindakan ini tidak bisa dibatalkan.
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
