import { Plus } from "lucide-react";
import Link from "next/link";

// Tombol tambah transaksi melayang di pojok kanan bawah.
export function AddTransactionButton() {
  return (
    <Link
      href="/transaksi/baru"
      aria-label="Tambah transaksi"
      className="fixed right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft outline-none hover:bg-[color-mix(in_oklch,var(--primary),black_12%)] active:scale-95 transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 md:right-8 md:bottom-8"
    >
      <Plus className="size-6" aria-hidden />
    </Link>
  );
}
