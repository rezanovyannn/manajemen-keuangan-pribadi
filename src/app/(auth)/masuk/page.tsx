import type { Metadata } from "next";
import Link from "next/link";

import { MasukForm } from "@/components/auth/masuk-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Masuk · Keuangan Pribadi" };

export default async function MasukPage({ searchParams }: PageProps<"/masuk">) {
  const { next, konfirmasi } = await searchParams;
  const notice =
    konfirmasi === "gagal"
      ? "Link konfirmasi tidak valid atau sudah kedaluwarsa. Coba masuk atau daftar ulang."
      : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Masuk</h1>
        </CardTitle>
        <CardDescription>Masuk untuk mengelola keuangan Anda.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <MasukForm next={typeof next === "string" ? next : undefined} notice={notice} />
        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-medium text-link underline underline-offset-4">
            Daftar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
