"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isNavActive, NAV_GROUPS } from "./nav-items";

// Daftar menu berkelompok, dipakai di sidebar desktop dan menu laci HP.
// Baris ringkas; menu aktif ditandai latar tipis + ikon biru (satu-satunya aksen).
// `onNavigate` dipanggil saat menu diklik (menutup laci di HP).
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi utama" className="grid gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-px">
          <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
          {group.items.map(({ href, label, Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-link" : "text-muted-foreground")} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
