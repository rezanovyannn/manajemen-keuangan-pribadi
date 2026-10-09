"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { addValuation } from "@/actions/investments";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { ValuationForm } from "./valuation-form";

// Tombol "Perbarui" di kartu investasi (halaman Akun): form nilai di panel bawah.
export function QuickValuationButton({ accountId, name, today, lastUnits }: { accountId: string; name: string; today: string; lastUnits: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button type="button" variant="outline" size="sm" className="h-9 md:h-8" aria-label={`Perbarui nilai ${name}`} />}>
        <RefreshCw aria-hidden />
        Perbarui
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92dvh] gap-4 overflow-x-hidden overflow-y-auto rounded-t-2xl px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg md:bottom-6 md:rounded-2xl">
        <div className="grid gap-0.5">
          <SheetTitle className="text-[17px] font-semibold tracking-tight">Perbarui nilai · {name}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">Samakan dengan nilai di aplikasi platform investasimu.</SheetDescription>
        </div>
        <ValuationForm action={addValuation.bind(null, accountId)} today={today} returnTo="akun" lastUnits={lastUnits} />
      </SheetContent>
    </Sheet>
  );
}
