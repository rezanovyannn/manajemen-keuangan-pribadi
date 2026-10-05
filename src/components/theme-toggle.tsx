"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const PILIHAN = [
  { value: "light", label: "Terang", Icon: Sun },
  { value: "dark", label: "Gelap", Icon: Moon },
  { value: "system", label: "Sistem", Icon: Monitor },
] as const;

const subscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // Tema baru diketahui di browser; sebelum itu jangan tandai pilihan apa pun
  // agar HTML server dan klien sama (menghindari hydration mismatch).
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const aktif = mounted ? theme : undefined;

  return (
    <div
      role="radiogroup"
      aria-label="Tema tampilan"
      className={cn("inline-flex rounded-lg border border-border p-0.5", className)}
    >
      {PILIHAN.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={aktif === value}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            aktif === value && "bg-muted text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
