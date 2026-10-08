"use client";

import { useSyncExternalStore } from "react";

// Item checklist "Pasang di HP": selesai jika aplikasi dibuka sebagai aplikasi terpasang.
function terpasang() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
const subscribe = () => () => {};

export function useInstalled() {
  return useSyncExternalStore(subscribe, terpasang, () => false);
}
