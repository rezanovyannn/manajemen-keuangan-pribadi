"use client";

import { Check, ChevronRight, Rocket, X } from "lucide-react";
import Link from "next/link";

import { dismissChecklist } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { checklistProgress, type ChecklistItem } from "@/lib/onboarding/checklist";
import { cn } from "@/lib/utils";

import { useInstalled } from "./install-item";

// Kartu "Mulai di sini" di Beranda. Hilang otomatis jika semua selesai, atau ditutup.
export function ChecklistCard({ items }: { items: ChecklistItem[] }) {
  const installed = useInstalled();
  const semua: ChecklistItem[] = [...items, { id: "pasang", label: "Pasang aplikasi di HP", href: "/profil#pasang", done: installed }];
  const { done, total, complete } = checklistProgress(items, installed ? 1 : 0, 1);
  if (complete) return null;

  return (
    <section aria-labelledby="judul-mulai" className="grid gap-3 rounded-xl border border-border bg-card p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id="judul-mulai" className="flex items-center gap-2 font-semibold">
            <Rocket className="size-4 text-link" aria-hidden />
            Mulai di sini
          </h2>
          <p className="text-xs text-muted-foreground">
            {done} dari {total} selesai
          </p>
        </div>
        <form action={dismissChecklist}>
          <Button type="submit" variant="ghost" size="icon" className="size-11 md:size-8" aria-label="Tutup checklist">
            <X aria-hidden />
          </Button>
        </form>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((done / total) * 100)}%` }} />
      </div>
      <ul className="grid gap-1">
        {semua.map((i) => (
          <li key={i.id}>
            <Link
              href={i.href}
              className={cn(
                "-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted md:min-h-9",
                i.done && "text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                  i.done ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {i.done && <Check className="size-3" />}
              </span>
              <span className={cn("flex-1", i.done && "line-through")}>
                {i.label}
                <span className="sr-only">{i.done ? " (selesai)" : " (belum)"}</span>
              </span>
              {!i.done && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/mulai?langkah=nama" className="text-sm font-medium text-link underline-offset-4 hover:underline">
        Buka panduan awal
      </Link>
    </section>
  );
}
