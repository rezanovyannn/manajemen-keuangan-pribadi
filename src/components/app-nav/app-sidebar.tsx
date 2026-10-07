import { Plus } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

// Sidebar desktop (md ke atas). Di HP, menu yang sama ada di laci (AppMobileBar).
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-sidebar-border bg-sidebar px-2.5 py-4 text-sidebar-foreground md:flex lg:w-64">
      <Brand />
      <Link
        href="/transaksi/baru"
        className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-soft outline-none hover:bg-[color-mix(in_oklch,var(--primary),black_12%)] focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Plus className="size-4" aria-hidden />
        <span className="flex-1">Tambah transaksi</span>
        <kbd aria-hidden className="rounded border border-white/30 px-1.5 text-[11px] leading-4 font-medium text-white/80">
          N
        </kbd>
      </Link>
      <NavLinks />
      <ThemeToggle className="mt-auto w-full bg-card" />
    </aside>
  );
}
