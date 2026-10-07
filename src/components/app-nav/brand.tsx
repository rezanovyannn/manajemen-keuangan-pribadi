import Link from "next/link";

import { cn } from "@/lib/utils";

// Logo kecil "Rp" + nama aplikasi (sidebar desktop dan laci HP).
export function Brand({ className, asLink = true }: { className?: string; asLink?: boolean }) {
  const isi = (
    <>
      <span
        aria-hidden
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold tracking-tight text-background"
      >
        Rp
      </span>
      <span className="truncate text-[15px] font-semibold tracking-tight">Keuangan Pribadi</span>
    </>
  );
  const kelas = cn("flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1", className);
  return asLink ? (
    <Link href="/beranda" className={cn(kelas, "outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50")}>
      {isi}
    </Link>
  ) : (
    <span className={kelas}>{isi}</span>
  );
}
