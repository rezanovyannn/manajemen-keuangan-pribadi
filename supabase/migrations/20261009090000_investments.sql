-- Pelacakan investasi manual.
--
-- Investasi = akun berjenis 'investment' (satu akun = satu aset, mis. "Emas Antam", "BBCA").
--   Beli  = transfer dari rekening ke akun investasi (bukan pengeluaran).
--   Jual  = transfer dari akun investasi ke rekening.
--   Modal = saldo akun investasi (dihitung dari transaksi, seperti akun lain).
-- Nilai pasar diisi manual lewat investment_valuations (tanpa API harga).
-- Nilai sekarang = nilai terakhir + beli/jual setelah tanggal nilai itu (src/lib/money/investment.ts).

-- Jenis akun baru + jenis aset (wajib untuk akun investasi, kosong untuk akun lain).
alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts add constraint accounts_type_check check (type in ('cash', 'bank', 'ewallet', 'investment'));
alter table public.accounts
  add column investment_kind text check (investment_kind in ('reksadana', 'saham', 'emas', 'crypto', 'obligasi', 'lainnya'));
alter table public.accounts add constraint accounts_investment_kind_required
  check ((type = 'investment') = (investment_kind is not null));

-- Untuk foreign key yang memastikan nilai hanya untuk akun investasi milik sendiri.
alter table public.accounts add constraint accounts_id_user_type_key unique (id, user_id, type);

create table public.investment_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  account_type text not null generated always as ('investment') stored,
  valued_on date not null default ((now() at time zone 'Asia/Jakarta')::date),
  market_value bigint not null check (market_value >= 0),
  -- Unit bukan uang (gram, lembar, unit reksadana, koin): boleh desimal.
  units numeric(30, 10) check (units is null or units >= 0),
  note text check (note is null or (char_length(note) between 1 and 200 and note = trim(note))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Akun harus milik pengguna yang sama DAN berjenis investment (jenis akun tidak bisa
  -- diubah selama masih punya riwayat nilai).
  foreign key (account_id, user_id, account_type)
    references public.accounts (id, user_id, type) on delete cascade
);

create index investment_valuations_user_id_idx on public.investment_valuations (user_id);
create index investment_valuations_account_idx on public.investment_valuations (account_id, valued_on desc);

create trigger investment_valuations_set_updated_at
  before update on public.investment_valuations
  for each row execute function public.set_updated_at();

alter table public.investment_valuations enable row level security;

create policy "investment_valuations_select_own" on public.investment_valuations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "investment_valuations_insert_own" on public.investment_valuations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "investment_valuations_update_own" on public.investment_valuations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "investment_valuations_delete_own" on public.investment_valuations for delete to authenticated
  using (user_id = (select auth.uid()));
