-- Fase 7: tujuan tabungan, utang & piutang, penanda pembayaran, kategori default baru.
--
-- Tujuan tabungan: progress = saldo akun yang dihubungkan (dihitung di src/lib/money).
-- Utang/piutang: sisa = jumlah awal - total transaksi yang ditandai (debt_id).
--   Bayar utang      = transaksi pengeluaran (expense) bertanda utang itu.
--   Terima piutang   = transaksi pemasukan (income) bertanda piutang itu.

-- ---------------------------------------------------------------------------
-- Tujuan tabungan
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50 and name = trim(name)),
  account_id uuid not null,
  target_amount bigint not null check (target_amount > 0),
  deadline date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete restrict
);

-- Satu akun hanya untuk satu tujuan aktif, agar saldo yang sama tidak dihitung dua kali.
create unique index goals_one_active_per_account on public.goals (account_id) where archived_at is null;
create index goals_user_id_idx on public.goals (user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals for select to authenticated
  using (user_id = (select auth.uid()));
create policy "goals_insert_own" on public.goals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "goals_update_own" on public.goals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals_delete_own" on public.goals for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Utang & piutang
-- ---------------------------------------------------------------------------
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('utang', 'piutang')),
  name text not null check (char_length(name) between 1 and 50 and name = trim(name)),
  counterparty text check (counterparty is null or (char_length(counterparty) between 1 and 50 and counterparty = trim(counterparty))),
  principal bigint not null check (principal > 0),
  installment_amount bigint check (installment_amount is null or installment_amount > 0),
  start_date date not null,
  due_date date check (due_date is null or due_date >= start_date),
  note text check (note is null or (char_length(note) between 1 and 200 and note = trim(note))),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Target FK komposit dari transactions: utang hanya dibayar lewat pengeluaran,
  -- piutang hanya diterima lewat pemasukan, dan milik pengguna yang sama.
  unique (id, user_id, kind)
);

create index debts_user_id_idx on public.debts (user_id);

create trigger debts_set_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

alter table public.debts enable row level security;

create policy "debts_select_own" on public.debts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "debts_insert_own" on public.debts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "debts_update_own" on public.debts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "debts_delete_own" on public.debts for delete to authenticated
  using (user_id = (select auth.uid()));

-- Penanda di transaksi. Kolom baru boleh kosong; transaksi lama tidak terpengaruh.
alter table public.transactions
  add column debt_id uuid,
  add column debt_kind text generated always as (
    case type when 'expense' then 'utang' when 'income' then 'piutang' end
  ) stored,
  -- Utang/piutang yang sudah punya pembayaran tidak bisa dihapus (diarsipkan saja),
  -- agar riwayat pembayarannya tetap utuh.
  add constraint transactions_debt_fkey
    foreign key (debt_id, user_id, debt_kind)
    references public.debts (id, user_id, kind) on delete restrict;

create index transactions_debt_id_idx on public.transactions (debt_id) where debt_id is not null;

-- ---------------------------------------------------------------------------
-- Kategori default baru: "Cicilan & Utang" (pengeluaran), "Pelunasan Piutang" (pemasukan)
-- ---------------------------------------------------------------------------
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
    ('Cicilan & Utang', 'expense'),
    ('Lainnya', 'expense'),
    ('Gaji', 'income'),
    ('Bonus', 'income'),
    ('Hadiah', 'income'),
    ('Pelunasan Piutang', 'income'),
    ('Lainnya', 'income')
  ) as d (name, type);
end;
$$;

revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

-- Pengguna lama: tambahkan dua kategori baru jika belum ada kategori aktif bernama sama.
insert into public.categories (user_id, name, type)
select p.id, d.name, d.type
from public.profiles p
cross join (values ('Cicilan & Utang', 'expense'), ('Pelunasan Piutang', 'income')) as d (name, type)
where not exists (
  select 1 from public.categories c
  where c.user_id = p.id
    and c.type = d.type
    and c.parent_id is null
    and c.archived_at is null
    and lower(c.name) = lower(d.name)
);
