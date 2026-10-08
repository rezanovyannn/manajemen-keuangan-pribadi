-- Onboarding: wizard pengguna baru (/mulai) + checklist "Mulai di sini" di Beranda.
--   onboarding_completed_at : wizard selesai atau dilewati ("Nanti saja"); null = pengguna
--                             baru, Beranda mengarahkan ke /mulai.
--   checklist_dismissed_at  : checklist di Beranda ditutup.
-- RLS profiles yang sudah ada (select/update milik sendiri) tetap berlaku.

alter table public.profiles
  add column onboarding_completed_at timestamptz,
  add column checklist_dismissed_at timestamptz;

-- Pengguna yang sudah ada sebelum fitur ini tidak perlu wizard maupun checklist.
update public.profiles set onboarding_completed_at = now(), checklist_dismissed_at = now();
