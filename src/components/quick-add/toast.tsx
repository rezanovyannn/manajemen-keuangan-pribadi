"use client";

import { CheckCircle2 } from "lucide-react";

export type ToastState = { message: string; undo?: () => void } | null;

// Toast di atas navigasi bawah (HP) / pojok kanan bawah (desktop), dengan tombol Batalkan.
export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:right-6 md:bottom-6 md:left-auto">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-elevated"
      >
        <CheckCircle2 className="size-5 shrink-0 text-sticker-green" aria-hidden />
        <span className="min-w-0 flex-1">{toast.message}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={() => {
              toast.undo?.();
              onClose();
            }}
            className="shrink-0 rounded-md px-2 py-1 font-semibold underline underline-offset-4 outline-none hover:bg-background/10 focus-visible:ring-2 focus-visible:ring-background"
          >
            Batalkan
          </button>
        )}
      </div>
    </div>
  );
}
