-- Fase 1: tabel profiles + RLS + trigger pembuatan profil otomatis.
-- profiles.id sama dengan auth.users.id (satu profil per pengguna),
-- sehingga tidak perlu kolom user_id terpisah.

-- Helper updated_at, dipakai ulang oleh tabel-tabel berikutnya.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 100),
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS: pengguna hanya bisa membaca dan mengubah profilnya sendiri.
-- Insert dilakukan oleh trigger di bawah; delete ikut terhapus (cascade)
-- saat akun auth dihapus, jadi tidak ada policy insert/delete untuk klien.
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Buat profil otomatis setiap ada pengguna baru di auth.users.
-- security definer agar bisa menulis ke public.profiles meski RLS aktif.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 100), '')
  );
  return new;
end;
$$;

-- Fungsi trigger tidak perlu bisa dipanggil langsung lewat API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
