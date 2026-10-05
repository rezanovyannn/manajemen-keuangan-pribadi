import { describe, expect, it } from "vitest";

import { readSupabaseEnv } from "@/lib/supabase/env";

describe("readSupabaseEnv", () => {
  it("mengembalikan URL dan key tanpa spasi atau baris baru", () => {
    expect(readSupabaseEnv(" https://contoh.supabase.co\n", "kunci-anon\n")).toEqual({
      url: "https://contoh.supabase.co",
      anonKey: "kunci-anon",
    });
  });

  it("menyebut variabel yang belum diisi", () => {
    expect(() => readSupabaseEnv(undefined, "kunci-anon")).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => readSupabaseEnv("https://contoh.supabase.co", "")).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });
});
