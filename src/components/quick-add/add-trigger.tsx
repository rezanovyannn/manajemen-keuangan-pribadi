"use client";

import { Plus } from "lucide-react";

import { useQuickAdd } from "./quick-add-provider";

// Tombol "Tambah transaksi" di sidebar desktop: membuka Catat kilat.
export function SidebarAddButton() {
  const { open } = useQuickAdd();
  return (
    <button
      type="button"
      onClick={open}
      className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-soft outline-none hover:bg-[color-mix(in_oklch,var(--primary),black_12%)] focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Plus className="size-4" aria-hidden />
      <span className="flex-1 text-left">Tambah transaksi</span>
      <kbd aria-hidden className="rounded border border-white/30 px-1.5 text-[11px] leading-4 font-medium text-white/80">
        N
      </kbd>
    </button>
  );
}
