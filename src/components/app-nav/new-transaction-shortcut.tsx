"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Pintasan keyboard desktop: tekan "N" untuk mencatat transaksi baru.
// Diabaikan saat sedang mengetik di input/textarea/select atau memakai tombol modifier.
export function NewTransactionShortcut() {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (window.location.pathname === "/transaksi/baru") return;
      e.preventDefault();
      router.push("/transaksi/baru");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
