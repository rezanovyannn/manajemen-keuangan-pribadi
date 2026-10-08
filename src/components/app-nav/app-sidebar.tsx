import { SidebarAddButton } from "@/components/quick-add/add-trigger";
import { ThemeToggle } from "@/components/theme-toggle";

import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

// Sidebar desktop (md ke atas). Di HP, menu yang sama ada di laci (AppMobileBar).
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-sidebar-border bg-sidebar px-2.5 py-4 text-sidebar-foreground md:flex lg:w-64">
      <Brand />
      <SidebarAddButton />
      <NavLinks />
      <ThemeToggle className="mt-auto w-full bg-card" />
    </aside>
  );
}
