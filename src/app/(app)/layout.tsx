import { AppMobileBar } from "@/components/app-nav/app-mobile-bar";
import { AppSidebar } from "@/components/app-nav/app-sidebar";

// Layout halaman setelah login: sidebar di desktop, bar atas + menu laci di HP.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBar />
        <main className="flex min-w-0 flex-1 flex-col px-4 pt-4 pb-8 md:px-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
