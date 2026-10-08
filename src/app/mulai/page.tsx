import type { Metadata } from "next";

import { FormAlert } from "@/components/auth/form-field";
import { IntroSlide } from "@/components/onboarding/intro";
import {
  LangkahAkun,
  LangkahBudget,
  LangkahNama,
  LangkahSelesai,
  LangkahTagihan,
  LangkahTujuan,
} from "@/components/onboarding/step-content";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { requireUser } from "@/lib/auth/session";
import { parseLangkah, parseLayar } from "@/lib/onboarding/steps";

export const metadata: Metadata = { title: "Mulai · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  "akun-ditambah": { tone: "success", text: "Akun ditambahkan. Tambah lagi atau lanjut." },
  "perlu-akun": { tone: "error", text: "Tambahkan minimal satu akun dulu." },
  "tagihan-ditambah": { tone: "success", text: "Jadwal ditambahkan. Tambah lagi atau lanjut." },
  gagal: { tone: "error", text: "Gagal memuat data. Silakan coba lagi." },
};

// Wizard pengguna baru. Tiap langkah halaman server + Server Action, jadi data yang sudah
// disimpan tidak hilang jika wizard ditutup di tengah jalan.
export default async function MulaiPage({ searchParams }: PageProps<"/mulai">) {
  const sp = await searchParams;
  const langkah = parseLangkah(sp.langkah);
  const pesan = typeof sp.status === "string" ? PESAN[sp.status] : undefined;
  const { supabase, user } = await requireUser();

  return (
    <WizardShell langkah={langkah}>
      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      {langkah === "intro" && <IntroSlide layar={parseLayar(sp.layar)} />}
      {langkah === "nama" && <LangkahNama supabase={supabase} userId={user.id} />}
      {langkah === "akun" && <LangkahAkun supabase={supabase} />}
      {langkah === "budget" && <LangkahBudget supabase={supabase} />}
      {langkah === "tagihan" && <LangkahTagihan supabase={supabase} />}
      {langkah === "tujuan" && <LangkahTujuan supabase={supabase} />}
      {langkah === "selesai" && <LangkahSelesai supabase={supabase} />}
    </WizardShell>
  );
}
