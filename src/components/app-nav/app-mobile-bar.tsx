"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { currentNavLabel } from "./nav-items";
import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

// Bar atas di HP: tombol menu (membuka laci sidebar) + judul halaman.
export function AppMobileBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="size-10" aria-label="Buka menu" />}>
          <Menu className="size-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-5 overflow-y-auto border-sidebar-border bg-sidebar px-2.5 py-4 text-sidebar-foreground">
          <SheetTitle>
            <Brand asLink={false} />
          </SheetTitle>
          <NavLinks onNavigate={() => setOpen(false)} />
          <ThemeToggle className="mt-auto w-full" />
        </SheetContent>
      </Sheet>
      <p className="truncate text-[15px] font-semibold tracking-tight">{currentNavLabel(pathname)}</p>
    </header>
  );
}
