import { Banknote, Landmark, Smartphone } from "lucide-react";

import type { AccountType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

// Ikon "stiker" per jenis akun. Warna hanya dekorasi (jenis juga tertulis sebagai teks).
const GAYA: Record<AccountType, { Icon: typeof Landmark; kelas: string }> = {
  bank: { Icon: Landmark, kelas: "bg-sticker-sky/15 text-sticker-sky" },
  ewallet: { Icon: Smartphone, kelas: "bg-sticker-purple/20 text-sticker-purple" },
  cash: { Icon: Banknote, kelas: "bg-sticker-green/15 text-sticker-green" },
};

export function AccountIcon({ type, className }: { type: AccountType; className?: string }) {
  const { Icon, kelas } = GAYA[type];
  return (
    <span aria-hidden className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", kelas, className)}>
      <Icon className="size-[18px]" />
    </span>
  );
}
