import type { Metadata } from "next";

import { OfflineForm } from "@/components/offline/offline-form";
import { OfflineSync } from "@/components/offline/offline-sync";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Catat Offline · Keuangan Pribadi" };

// Halaman statis (tanpa data server) yang disimpan service worker dan ditampilkan saat
// tidak ada sinyal. Tidak berisi data pengguna; akun/kategori dibaca dari HP.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-6">
      <div className="grid w-full max-w-xl grid-cols-1">
        <PageHeader title="Catat offline" description="Tidak ada koneksi. Transaksi disimpan di HP dulu." />
        <OfflineSync />
        <OfflineForm />
      </div>
    </main>
  );
}
