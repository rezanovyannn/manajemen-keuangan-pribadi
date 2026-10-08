import Link from "next/link";

import { skipOnboarding } from "@/actions/onboarding";
import { Brand } from "@/components/app-nav/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { JUDUL_LANGKAH, LANGKAH, type Langkah } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";

// Langkah yang ditampilkan di indikator progress (intro tidak dihitung).
const BERNOMOR = LANGKAH.filter((l) => l !== "intro");

// Kerangka wizard /mulai: logo, tombol "Nanti saja", dan progress langkah.
export function WizardShell({ langkah, children }: { langkah: Langkah; children: React.ReactNode }) {
  const i = BERNOMOR.indexOf(langkah as (typeof BERNOMOR)[number]);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 pt-4">
        <Brand asLink={false} />
        {langkah !== "selesai" && (
          <form action={skipOnboarding}>
            <Button type="submit" variant="ghost" className="h-11 text-muted-foreground md:h-9">
              Nanti saja
            </Button>
          </form>
        )}
      </header>
      <main className="mx-auto grid w-full max-w-lg flex-1 grid-cols-1 content-start gap-5 px-4 pt-6 pb-10">
        {i >= 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Langkah {i + 1} dari {BERNOMOR.length} · {JUDUL_LANGKAH[langkah]}
            </p>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${BERNOMOR.length}, minmax(0, 1fr))` }} aria-hidden>
              {BERNOMOR.map((l, j) => (
                <span key={l} className={cn("h-1.5 rounded-full", j <= i ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

// Judul + penjelasan langkah.
export function StepHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="grid gap-1.5">
      <h1 className="text-[26px] leading-tight font-bold">{title}</h1>
      {description && <p className="text-[15px] text-muted-foreground">{description}</p>}
    </div>
  );
}

// Navigasi bawah: kembali / lewati (opsional) + aksi utama (children).
export function WizardNav({ back, skip, children }: { back?: string | null; skip?: string | null; children?: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      {children}
      <div className="flex items-center justify-between gap-2">
        {back ? (
          <Link href={back} className={cn(buttonVariants({ variant: "ghost" }), "h-11 md:h-9")}>
            Kembali
          </Link>
        ) : (
          <span />
        )}
        {skip && (
          <Link href={skip} className={cn(buttonVariants({ variant: "ghost" }), "h-11 text-muted-foreground md:h-9")}>
            Lewati
          </Link>
        )}
      </div>
    </div>
  );
}
