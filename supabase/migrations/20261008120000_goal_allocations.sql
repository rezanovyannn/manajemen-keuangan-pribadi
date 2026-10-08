-- Tabungan disisihkan manual ("Sisihkan" / "Ambil").
--
-- Sebelumnya tabungan tujuan = saldo akun yang dihubungkan (maks. target).
-- Sekarang tabungan tujuan = jumlah baris goal_allocations-nya:
--   amount > 0  = sisihkan dari akun itu ke tujuan
--   amount < 0  = ambil kembali dari tujuan ke akun itu
-- Tidak ada uang yang berpindah: saldo akun tetap; yang berubah hanya bagian
-- "bebas dipakai" (saldo akun - total yang disisihkan dari akun itu).
-- Batas sisihkan/ambil divalidasi di server (src/lib/money/allocation.ts).

-- Dibutuhkan untuk foreign key komposit (kepemilikan tujuan).
alter table public.goals add constraint goals_id_user_key unique (id, user_id);

create table public.goal_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  account_id uuid not null,
  amount bigint not null check (amount <> 0),
  occurred_on date not null default ((now() at time zone 'Asia/Jakarta')::date),
  note text check (note is null or (char_length(note) between 1 and 200 and note = trim(note))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Tujuan dan akun harus milik pengguna yang sama dengan baris ini.
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade,
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict
);

create index goal_allocations_user_id_idx on public.goal_allocations (user_id);
create index goal_allocations_goal_id_idx on public.goal_allocations (goal_id);
create index goal_allocations_account_id_idx on public.goal_allocations (account_id);

create trigger goal_allocations_set_updated_at
  before update on public.goal_allocations
  for each row execute function public.set_updated_at();

alter table public.goal_allocations enable row level security;

create policy "goal_allocations_select_own" on public.goal_allocations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "goal_allocations_insert_own" on public.goal_allocations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "goal_allocations_update_own" on public.goal_allocations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goal_allocations_delete_own" on public.goal_allocations for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tujuan tidak lagi terikat ke satu akun. Kolom account_id dipertahankan (opsional)
-- agar tidak ada data yang hilang; aplikasi tidak memakainya lagi.
drop index public.goals_one_active_per_account;
alter table public.goals alter column account_id drop not null;

-- Pindahan data: tiap tujuan aktif mendapat satu setoran awal sebesar tabungan versi
-- aturan lama (saldo akun, dibatasi 0..target), dari akunnya, bertanggal hari ini.
insert into public.goal_allocations (user_id, goal_id, account_id, amount, occurred_on, note)
select g.user_id, g.id, g.account_id, least(s.saldo, g.target_amount), (now() at time zone 'Asia/Jakarta')::date, 'Saldo awal'
from public.goals g
join lateral (
  select a.opening_balance + coalesce(sum(case when t.type in ('income', 'transfer_in') then t.amount else -t.amount end), 0) as saldo
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  where a.id = g.account_id
  group by a.id, a.opening_balance
) s on true
where g.archived_at is null and g.account_id is not null and s.saldo > 0;
