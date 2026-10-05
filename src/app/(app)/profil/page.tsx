import { ChevronRight, LogOut, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { keluar } from "@/actions/auth";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profil · Keuangan Pribadi" };

export default async function ProfilPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, currency")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="grid max-w-xl gap-4">
      <PageHeader title="Profil" />

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Akun</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm">
            <Baris label="Nama" value={profile?.display_name ?? "-"} />
            <Baris label="Email" value={user.email ?? "-"} />
            <Baris label="Mata uang" value={profile?.currency ?? "IDR"} />
          </dl>
        </CardContent>
      </Card>

      <Link
        href="/kategori"
        className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Tags className="size-4 text-muted-foreground" aria-hidden />
        <span className="flex-1">Kategori</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Tampilan</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle className="w-full" />
        </CardContent>
      </Card>

      <form action={keluar}>
        <Button type="submit" variant="outline" size="lg" className="h-10 w-full">
          <LogOut aria-hidden />
          Keluar
        </Button>
      </form>
    </div>
  );
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
