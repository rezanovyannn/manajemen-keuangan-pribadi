"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isNavActive, NAV_GROUPS } from "./nav-items";

// Daftar menu berkelompok, dipakai di sidebar desktop dan menu laci HP.
// `onNavigate` dipanggil saat menu diklik (menutup laci di HP).
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi utama" className="grid gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-1">
          <p className="px-3 text-xs font-medium text-muted-foreground">{group.label}</p>
          {group.items.map(({ href, label, Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
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
        </div>
      ))}
    </nav>
  );
}
