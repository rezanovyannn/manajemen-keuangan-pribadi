import "server-only";

import { addDays } from "@/lib/dates";
import type { createClient } from "@/lib/supabase/server";

import { HARI_SARAN, isSuggested } from "./schedule";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Jadwal yang perlu dicatat: jatuh tempo <= hari ini + 7 hari, aktif, belum selesai.
// Jadwal yang terlewat beberapa kali muncul satu per satu (tanggal tertua dulu).
export async function loadSuggestions(supabase: Supabase, today: string) {
  const { data, error } = await supabase
    .from("recurring_rules")
    .select("id, name, type, amount, frequency, start_date, end_date, next_due_date, paused")
    .eq("paused", false)
    .lte("next_due_date", addDays(today, HARI_SARAN))
    .order("next_due_date");
  if (error) console.error("[recurring] saran gagal", { code: error.code });
  return { items: (data ?? []).filter((r) => isSuggested(r, today)), error };
}
