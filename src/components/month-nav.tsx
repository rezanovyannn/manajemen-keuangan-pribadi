import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatBulan, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Navigasi bulan ‹ Oktober 2026 ›. `href` membangun URL untuk bulan tertentu.
export function MonthNav({ month, href }: { month: string; href: (month: string) => string }) {
  const nav = cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-10");
  return (
    <div className="flex items-center justify-between gap-2 lg:max-w-sm">
      <Link href={href(shiftMonth(month, -1))} className={nav} aria-label="Bulan sebelumnya">
        <ChevronLeft aria-hidden />
      </Link>
      <p className="font-medium" aria-live="polite">
        {formatBulan(month)}
      </p>
      <Link href={href(shiftMonth(month, 1))} className={nav} aria-label="Bulan berikutnya">
        <ChevronRight aria-hidden />
      </Link>
    </div>
  );
}
