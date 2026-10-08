"use client";

import { useEffect } from "react";

import { useQuickAdd } from "@/components/quick-add/quick-add-provider";

// Pintasan keyboard desktop: tekan "N" untuk membuka Catat kilat.
// Diabaikan saat sedang mengetik di input/textarea/select atau memakai tombol modifier.
export function NewTransactionShortcut() {
  const { open } = useQuickAdd();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      open();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return null;
}
