import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

import { NavLinks } from "./nav-links";

// Sidebar desktop (md ke atas). Di HP, menu yang sama ada di laci (AppMobileBar).
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border px-3 py-6 md:flex">
      <Link href="/beranda" className="px-3 text-lg font-semibold tracking-tight">
        Keuangan Pribadi
      </Link>
      <NavLinks />
      <ThemeToggle className="mt-auto w-full" />
    </aside>
  );
}
