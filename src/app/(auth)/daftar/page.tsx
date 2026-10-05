import type { Metadata } from "next";
import Link from "next/link";

import { DaftarForm } from "@/components/auth/daftar-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Daftar · Keuangan Pribadi" };

export default function DaftarPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Daftar</h1>
        </CardTitle>
        <CardDescription>Buat akun untuk mulai mencatat keuangan.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <DaftarForm />
        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-medium text-foreground underline underline-offset-4">
            Masuk
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
