"use client";

import { KUNCI_ANTREAN, KUNCI_OPSI, parseAntrean, parseOpsi, type ItemOffline, type OpsiOffline } from "@/lib/offline/queue";

// Event agar komponen lain (banner, form) tahu antrean berubah.
export const EVENT_ANTREAN = "keuangan:antrean-berubah";

// localStorage bisa tidak tersedia (mode privat, diblokir): selalu aman, tidak melempar error.
function baca(kunci: string): string | null {
  try {
    return window.localStorage.getItem(kunci);
  } catch {
    return null;
  }
}

function tulis(kunci: string, nilai: string) {
  try {
    window.localStorage.setItem(kunci, nilai);
    return true;
  } catch {
    return false;
  }
}

export const bacaAntrean = () => parseAntrean(baca(KUNCI_ANTREAN));
export const bacaOpsi = () => parseOpsi(baca(KUNCI_OPSI));

export function simpanAntrean(antrean: ItemOffline[]) {
  const ok = antrean.length === 0 ? hapusKunci(KUNCI_ANTREAN) : tulis(KUNCI_ANTREAN, JSON.stringify(antrean));
  window.dispatchEvent(new Event(EVENT_ANTREAN));
  return ok;
}

export function simpanOpsi(opsi: OpsiOffline) {
  return tulis(KUNCI_OPSI, JSON.stringify(opsi));
}

function hapusKunci(kunci: string) {
  try {
    window.localStorage.removeItem(kunci);
    return true;
  } catch {
    return false;
  }
}
