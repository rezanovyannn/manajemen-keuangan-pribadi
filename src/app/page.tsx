import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Keuangan Pribadi</h1>
      <p className="max-w-md text-base text-muted-foreground">
        Catat transaksi, kelola dompet, dan pantau budget bulanan. Aplikasi sedang dalam
        pengembangan.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:flex-row">
        <Link href="/masuk" className={buttonVariants({ size: "lg", className: "h-11 md:h-10 flex-1" })}>
          Masuk
        </Link>
        <Link
          href="/daftar"
          className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 md:h-10 flex-1" })}
        >
          Daftar
        </Link>
      </div>
    </main>
  );
}
