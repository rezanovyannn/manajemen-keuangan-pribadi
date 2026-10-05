import { AppBottomNav } from "@/components/app-nav/app-bottom-nav";
import { AppSidebar } from "@/components/app-nav/app-sidebar";

// Layout halaman setelah login: sidebar di desktop, bottom bar di HP.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-8">
        {children}
      </main>
      <AppBottomNav />
    </div>
  );
}
