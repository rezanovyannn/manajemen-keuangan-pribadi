-- Fase 2: tabel accounts (dompet/rekening) + RLS.
-- Saldo TIDAK disimpan di sini; saldo = opening_balance + transaksi (Fase 3).
-- Akun tidak dihapus, melainkan diarsipkan (archived_at), agar riwayat transaksi tetap utuh.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50 and name = trim(name)),
  type text not null check (type in ('cash', 'bank', 'ewallet')),
  opening_balance bigint not null default 0 check (opening_balance >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

-- Nama akun aktif tidak boleh kembar (tanpa membedakan huruf besar/kecil).
create unique index accounts_user_active_name_key
  on public.accounts (user_id, lower(name))
  where archived_at is null;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

create policy "accounts_select_own"
  on public.accounts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "accounts_insert_own"
  on public.accounts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "accounts_update_own"
  on public.accounts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "accounts_delete_own"
  on public.accounts for delete
  to authenticated
  using (user_id = (select auth.uid()));
