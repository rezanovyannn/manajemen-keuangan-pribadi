-- Fase 2: tabel categories + RLS + kategori default untuk pengguna baru dan lama.
-- Sub-kategori hanya satu tingkat (induk -> anak). Kategori diarsipkan, tidak dihapus.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(name) between 1 and 50 and name = trim(name)),
  type text not null check (type in ('income', 'expense')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target FK komposit di bawah: induk wajib milik pengguna yang sama dan bertipe sama.
  unique (id, user_id, type),
  foreign key (parent_id, user_id, type)
    references public.categories (id, user_id, type) on delete restrict,
  check (parent_id is null or parent_id <> id)
);

create index categories_user_id_idx on public.categories (user_id);
create index categories_parent_id_idx on public.categories (parent_id);

-- Nama kategori aktif tidak boleh kembar di induk dan tipe yang sama.
create unique index categories_user_active_name_key
  on public.categories (
    user_id,
    type,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  where archived_at is null;

-- Batasi kedalaman satu tingkat: induk harus kategori utama,
-- dan kategori yang punya anak tidak boleh dijadikan sub-kategori.
create or replace function public.check_category_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.categories where id = new.parent_id and parent_id is not null) then
      raise exception 'Induk kategori harus kategori utama' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.categories where parent_id = new.id) then
      raise exception 'Kategori yang punya sub-kategori tidak bisa dijadikan sub-kategori' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_check_depth
  before insert or update of parent_id on public.categories
  for each row execute function public.check_category_depth();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy "categories_select_own"
  on public.categories for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "categories_insert_own"
  on public.categories for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "categories_update_own"
  on public.categories for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories_delete_own"
  on public.categories for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Kategori default. Hanya mengisi jika pengguna belum punya kategori sama sekali,
-- sehingga aman dipanggil berulang.
create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.categories where user_id = p_user_id) then
    return;
  end if;

  insert into public.categories (user_id, name, type)
  select p_user_id, d.name, d.type
  from (values
    ('Makan & Minum', 'expense'),
    ('Transportasi', 'expense'),
    ('Belanja', 'expense'),
    ('Tagihan', 'expense'),
    ('Kesehatan', 'expense'),
    ('Hiburan', 'expense'),
    ('Pendidikan', 'expense'),
    ('Lainnya', 'expense'),
    ('Gaji', 'income'),
    ('Bonus', 'income'),
    ('Hadiah', 'income'),
    ('Lainnya', 'income')
  ) as d (name, type);
end;
$$;

revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

-- Pengguna baru: profil dibuat oleh trigger on_auth_user_created, lalu kategori default diisi.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_profile() from public, anon, authenticated;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- Pengguna lama (sudah daftar sebelum migrasi ini): isi kategori default sekali.
select public.seed_default_categories(id) from public.profiles;
