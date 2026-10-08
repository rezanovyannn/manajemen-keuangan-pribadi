"use client";

import { LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { isNavActive, NAV_BAWAH_KANAN, NAV_BAWAH_KIRI, NAV_LAINNYA, navItem, WARNA_LAINNYA, type NavItem } from "./nav-items";

const TAB = "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none focus-visible:text-link";

// Navigasi bawah di HP (md ke atas memakai sidebar): Beranda · Transaksi · ⊕ · Budget · Lainnya.
export function AppBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const lainnyaAktif = NAV_LAINNYA.some((i) => isNavActive(pathname, i.href));

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {NAV_BAWAH_KIRI.map((href) => (
          <Tab key={href} item={navItem(href)} active={isNavActive(pathname, href)} />
        ))}

        <div className="flex flex-1 items-start justify-center">
          <Link
            href="/transaksi/baru"
            aria-label="Tambah transaksi"
            className="-mt-5 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft ring-4 ring-background outline-none transition-transform active:scale-95 focus-visible:ring-ring/60"
          >
            <Plus className="size-7" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>

        {NAV_BAWAH_KANAN.map((href) => (
          <Tab key={href} item={navItem(href)} active={isNavActive(pathname, href)} />
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<button type="button" />}
            className={cn(TAB, lainnyaAktif || open ? "text-link" : "text-muted-foreground")}
            aria-current={lainnyaAktif ? "page" : undefined}
          >
            <LayoutGrid className="size-[22px]" aria-hidden />
            Lainnya
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="gap-5 rounded-t-2xl border-sidebar-border px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
            <SheetTitle className="text-[17px] font-semibold tracking-tight">Menu lainnya</SheetTitle>
            <nav aria-label="Menu lainnya">
              <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
                {NAV_LAINNYA.map((item) => (
                  <li key={item.href}>
                    <Lainnya item={item} active={isNavActive(pathname, item.href)} onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            </nav>
            <ThemeToggle className="w-full bg-card" />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, Icon } = item;
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(TAB, active ? "text-link" : "text-muted-foreground")}>
      <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 2} aria-hidden />
      {label}
    </Link>
  );
}

function Lainnya({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center gap-1.5 rounded-xl p-1 text-center text-[11px] leading-tight font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-2xl",
          WARNA_LAINNYA[href] ?? "bg-muted text-muted-foreground",
          active && "ring-2 ring-primary",
        )}
      >
        <Icon className="size-[22px]" />
      </span>
      <span className={cn(active && "text-link")}>{label}</span>
    </Link>
  );
}
