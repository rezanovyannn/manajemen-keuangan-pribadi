import { AppMobileBar } from "@/components/app-nav/app-mobile-bar";
import { AppSidebar } from "@/components/app-nav/app-sidebar";
import { NewTransactionShortcut } from "@/components/app-nav/new-transaction-shortcut";
import { OfflineSync } from "@/components/offline/offline-sync";

// Layout halaman setelah login: sidebar di desktop, bar atas + menu laci di HP.
// Konten dibatasi ±1120px dan ditengahkan agar nyaman di layar lebar.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBar />
        <main className="mx-auto flex w-full max-w-[1120px] min-w-0 flex-1 flex-col px-4 pt-4 pb-8 md:px-8 md:pt-8 lg:px-10 lg:pt-10">
          <div className="w-full max-w-xl empty:hidden">
            <OfflineSync />
          </div>
          {children}
        </main>
      </div>
      <NewTransactionShortcut />
    </div>
  );
}
