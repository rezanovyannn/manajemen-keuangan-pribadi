import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { keluar } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { HALAMAN_MASUK } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Beranda · Keuangan Pribadi" };

export default async function BerandaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy sudah melindungi halaman ini; cek ulang di sini sebagai lapisan kedua.
  if (!user) redirect(HALAMAN_MASUK);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {profile?.display_name ?? "pengguna baru"}!
        </h1>
        <p className="text-muted-foreground">Dashboard akan hadir di fase berikutnya.</p>
      </div>
      <form action={keluar}>
        <Button type="submit" variant="outline" size="lg" className="h-10 px-6">
          Keluar
        </Button>
      </form>
    </main>
  );
}
