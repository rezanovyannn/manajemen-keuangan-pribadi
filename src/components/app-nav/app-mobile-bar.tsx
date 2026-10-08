"use client";

import { usePathname } from "next/navigation";

import { currentNavLabel } from "./nav-items";

// Bar atas di HP: logo kecil + judul halaman. Menu ada di navigasi bawah (AppBottomNav).
export function AppMobileBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-2.5 border-b border-border bg-background/90 px-4 backdrop-blur-md md:hidden">
      <span
        aria-hidden
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-bold tracking-tight text-background"
      >
        Rp
      </span>
      <p className="truncate text-[15px] font-semibold tracking-tight">{currentNavLabel(pathname)}</p>
    </header>
  );
}
