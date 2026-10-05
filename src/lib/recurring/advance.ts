import "server-only";

import type { createClient } from "@/lib/supabase/server";

import { nextOccurrenceAfter } from "./schedule";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Majukan jadwal ke kemunculan berikutnya setelah `date` dicatat/dilewati.
// Hanya berlaku jika jatuh tempo saat ini memang `date` (update bersyarat),
// sehingga aman jika ditekan dua kali atau dari dua perangkat sekaligus.
export async function advanceRule(supabase: Supabase, ruleId: string, date: string) {
  const { data: rule, error } = await supabase
    .from("recurring_rules")
    .select("start_date, frequency, next_due_date")
    .eq("id", ruleId)
    .maybeSingle();
  if (error || !rule) return { error: error ?? { code: "not_found" } };
  if (rule.next_due_date !== date) return { error: null }; // sudah dimajukan sebelumnya

  const next = nextOccurrenceAfter(rule.start_date, rule.frequency, date);
  const res = await supabase
    .from("recurring_rules")
    .update({ next_due_date: next })
    .eq("id", ruleId)
    .eq("next_due_date", date);
  return { error: res.error };
}
