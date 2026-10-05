"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

import { isNavActive, NAV_ITEMS } from "./nav-items";

// Navigasi samping, hanya tampil di layar md ke atas.
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border px-3 py-6 md:flex">
      <Link href="/beranda" className="mb-6 px-3 text-lg font-semibold tracking-tight">
        Keuangan Pribadi
      </Link>
      <nav aria-label="Navigasi utama" className="grid gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                active && "bg-muted text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <ThemeToggle className="mt-auto w-full" />
    </aside>
  );
}
