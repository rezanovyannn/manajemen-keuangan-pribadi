"use client";

import { Delete } from "lucide-react";

// Keypad angka besar untuk nominal (digit saja; nominal selalu bilangan bulat Rupiah).
export const MAKS_DIGIT = 13; // < Rp 10 triliun, jauh di bawah batas integer aman

export function tambahDigit(digits: string, d: string) {
  const hasil = (digits + d).replace(/^0+/, "");
  return hasil.length > MAKS_DIGIT ? digits : hasil;
}

const TOMBOL = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "hapus"] as const;

export function Keypad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Keypad nominal">
      {TOMBOL.map((t) =>
        t === "hapus" ? (
          <button
            key={t}
            type="button"
            onClick={onDelete}
            aria-label="Hapus angka"
            className="flex h-12 items-center justify-center rounded-xl bg-muted text-foreground outline-none active:scale-95 active:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Delete className="size-5" aria-hidden />
          </button>
        ) : (
          <button
            key={t}
            type="button"
            onClick={() => onDigit(t)}
            className="h-12 rounded-xl bg-muted text-xl font-semibold tabular-nums outline-none active:scale-95 active:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t}
          </button>
        ),
      )}
    </div>
  );
}
