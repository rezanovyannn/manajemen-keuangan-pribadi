"use client";

import { useEffect } from "react";

import type { OpsiOffline } from "@/lib/offline/queue";

import { simpanOpsi } from "./storage";

// Simpan daftar akun & kategori aktif di HP, agar form offline bisa dipakai tanpa sinyal.
export function SaveOfflineOptions({ accounts, categories }: Omit<OpsiOffline, "savedAt">) {
  useEffect(() => {
    simpanOpsi({ accounts, categories, savedAt: new Date().toISOString() });
  }, [accounts, categories]);
  return null;
}
