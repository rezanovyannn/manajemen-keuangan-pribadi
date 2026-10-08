import { ArrowRight, Lightbulb, PiggyBank, Zap } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { hrefLangkah, JUMLAH_LAYAR_INTRO } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";

const LAYAR = [
  {
    Icon: Zap,
    warna: "bg-sticker-sky/15 text-sticker-sky",
    judul: "Catat dalam hitungan detik",
    isi: "Catat pemasukan, pengeluaran, dan transfer antar akun. Bisa dipasang di HP dan tetap bisa mencatat saat offline.",
  },
  {
    Icon: PiggyBank,
    warna: "bg-sticker-green/15 text-sticker-green",
    judul: "Budget & tabungan terkendali",
    isi: "Atur batas belanja per kategori dan sisihkan tabungan untuk tiap tujuan, tanpa memindahkan uang dari rekeningmu.",
  },
  {
    Icon: Lightbulb,
    warna: "bg-sticker-purple/20 text-sticker-purple",
    judul: "Tahu berapa yang aman dibelanjakan",
    isi: "Proyeksi saldo sampai akhir bulan, pengingat tagihan rutin, dan insight pengeluaran yang tidak biasa.",
  },
] as const;

// Intro 3 layar sebelum wizard.
export function IntroSlide({ layar }: { layar: number }) {
  const s = LAYAR[layar - 1]!;
  const terakhir = layar === JUMLAH_LAYAR_INTRO;
  return (
    <section aria-label={`Pengenalan ${layar} dari ${JUMLAH_LAYAR_INTRO}`} className="grid gap-6 pt-6">
      <span aria-hidden className={cn("inline-flex size-16 items-center justify-center rounded-2xl", s.warna)}>
        <s.Icon className="size-8" />
      </span>
      <div className="grid gap-2">
        <h1 className="text-[30px] leading-tight font-bold">{s.judul}</h1>
        <p className="text-[16px] text-muted-foreground">{s.isi}</p>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {LAYAR.map((_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-all", i + 1 === layar ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30")} />
        ))}
      </div>
      <div className="grid gap-2">
        <Link
          href={terakhir ? hrefLangkah("nama") : hrefLangkah("intro", layar + 1)}
          className={cn(buttonVariants({ size: "lg" }), "h-12 text-base")}
        >
          {terakhir ? "Mulai atur" : "Lanjut"}
          <ArrowRight aria-hidden />
        </Link>
        {!terakhir && (
          <Link href={hrefLangkah("nama")} className={cn(buttonVariants({ variant: "ghost" }), "h-11 text-muted-foreground")}>
            Lewati pengenalan
          </Link>
        )}
      </div>
    </section>
  );
}
