-- Fase 6: jadwal transaksi berulang (tagihan/pemasukan rutin) + RLS.
--
-- Aturan TIDAK mencatat transaksi otomatis. Aplikasi hanya menyarankan pencatatan
-- saat jatuh tempo; pengguna memilih "Catat" atau "Lewati".
-- Jadwal dihitung di src/lib/recurring/schedule.ts dari start_date + frequency.
-- next_due_date = jadwal berikutnya yang belum dicatat/dilewati.

-- Target FK komposit: transaksi hanya boleh menunjuk jadwal milik pengguna yang sama.
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50 and name = trim(name)),
  account_id uuid not null,
  category_id uuid not null,
  type text not null check (type in ('income', 'expense')),
  category_type text generated always as (type) stored,
  amount bigint not null check (amount > 0),
  note text check (note is null or (char_length(note) between 1 and 200 and note = trim(note))),
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  next_due_date date not null check (next_due_date >= start_date),
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (id, user_id),
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete restrict,
  foreign key (category_id, user_id, category_type)
    references public.categories (id, user_id, type) on delete restrict
);

create index recurring_rules_user_due_idx on public.recurring_rules (user_id, next_due_date);

create trigger recurring_rules_set_updated_at
  before update on public.recurring_rules
  for each row execute function public.set_updated_at();

alter table public.recurring_rules enable row level security;

create policy "recurring_rules_select_own"
  on public.recurring_rules for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "recurring_rules_insert_own"
  on public.recurring_rules for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "recurring_rules_update_own"
  on public.recurring_rules for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "recurring_rules_delete_own"
  on public.recurring_rules for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Penanda di transaksi: transaksi ini dicatat dari jadwal X untuk tanggal jadwal Y.
-- Unik per (jadwal, tanggal) -> jadwal yang sama tidak bisa tercatat dua kali.
-- Kolom baru boleh kosong; transaksi lama tidak terpengaruh.
alter table public.transactions
  add column recurring_rule_id uuid,
  add column recurring_date date,
  add constraint transactions_recurring_pair_check
    check ((recurring_rule_id is null) or (recurring_date is not null)),
  add constraint transactions_recurring_unique unique (recurring_rule_id, recurring_date),
  -- Jika jadwal dihapus, transaksinya tetap ada; hanya penanda jadwalnya dikosongkan.
  add constraint transactions_recurring_rule_fkey
    foreign key (recurring_rule_id, user_id)
    references public.recurring_rules (id, user_id) on delete set null (recurring_rule_id);
