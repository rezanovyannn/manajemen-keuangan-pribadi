-- Fase 3: tabel transactions + RLS + fungsi transfer atomik.
--
-- Tipe: income, expense, transfer_out, transfer_in. Nominal selalu positif (bigint);
-- arah ditentukan oleh tipe. Saldo akun TIDAK disimpan, dihitung di src/lib/money/balance.ts:
--   saldo = opening_balance + income + transfer_in - expense - transfer_out
--
-- Transfer = dua baris (transfer_out di akun asal, transfer_in di akun tujuan) dengan
-- transfer_id yang sama. Baris transfer hanya bisa dibuat/diubah/dihapus lewat fungsi
-- create_transfer / update_transfer / delete_transfer agar kedua sisi selalu konsisten.

-- Target FK komposit: akun transaksi wajib milik pengguna yang sama.
alter table public.accounts add constraint accounts_id_user_key unique (id, user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  category_id uuid,
  type text not null check (type in ('income', 'expense', 'transfer_out', 'transfer_in')),
  -- Tipe kategori yang wajib cocok: income -> kategori income, expense -> kategori expense.
  category_type text generated always as (
    case when type in ('income', 'expense') then type end
  ) stored,
  amount bigint not null check (amount > 0),
  occurred_on date not null default ((now() at time zone 'Asia/Jakarta')::date),
  note text check (note is null or (char_length(note) between 1 and 200 and note = trim(note))),
  transfer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete restrict,
  foreign key (category_id, user_id, category_type)
    references public.categories (id, user_id, type) on delete restrict,
  -- Pemasukan/pengeluaran wajib berkategori; transfer tidak berkategori.
  check ((type in ('income', 'expense')) = (category_id is not null)),
  -- Hanya baris transfer yang punya transfer_id.
  check ((type in ('transfer_out', 'transfer_in')) = (transfer_id is not null)),
  -- Satu transfer tepat punya satu sisi keluar dan satu sisi masuk.
  unique (transfer_id, type)
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc, created_at desc);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_category_id_idx on public.transactions (category_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Akun/kategori yang diarsipkan tidak boleh dipakai untuk transaksi baru atau
-- saat memindahkan transaksi ke akun/kategori lain. Transaksi lama tetap utuh.
create or replace function public.check_transaction_refs_active()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.account_id is distinct from old.account_id)
     and exists (select 1 from public.accounts where id = new.account_id and archived_at is not null) then
    raise exception 'Akun sudah diarsipkan' using errcode = 'P0001';
  end if;
  if new.category_id is not null
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id)
     and exists (select 1 from public.categories where id = new.category_id and archived_at is not null) then
    raise exception 'Kategori sudah diarsipkan' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger transactions_check_refs_active
  before insert or update of account_id, category_id on public.transactions
  for each row execute function public.check_transaction_refs_active();

alter table public.transactions enable row level security;

create policy "transactions_select_own"
  on public.transactions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Insert/update/delete langsung hanya untuk pemasukan & pengeluaran.
-- Baris transfer wajib lewat fungsi di bawah.
create policy "transactions_insert_own"
  on public.transactions for insert
  to authenticated
  with check (user_id = (select auth.uid()) and type in ('income', 'expense'));

create policy "transactions_update_own"
  on public.transactions for update
  to authenticated
  using (user_id = (select auth.uid()) and type in ('income', 'expense'))
  with check (user_id = (select auth.uid()) and type in ('income', 'expense'));

create policy "transactions_delete_own"
  on public.transactions for delete
  to authenticated
  using (user_id = (select auth.uid()) and type in ('income', 'expense'));

-- ---------------------------------------------------------------------------
-- Fungsi transfer. security definer agar bisa menulis baris transfer meski RLS
-- membatasinya; setiap fungsi memakai auth.uid() sehingga hanya bisa menyentuh
-- data pemanggil. FK komposit memastikan kedua akun milik pemanggil.
-- Satu pemanggilan fungsi = satu transaksi database (atomik).
-- ---------------------------------------------------------------------------

create or replace function public.create_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount bigint,
  p_occurred_on date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_transfer_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception 'Akun asal dan tujuan harus berbeda' using errcode = 'P0001';
  end if;

  insert into public.transactions (user_id, account_id, type, amount, occurred_on, note, transfer_id)
  values
    (v_user_id, p_from_account_id, 'transfer_out', p_amount, p_occurred_on, p_note, v_transfer_id),
    (v_user_id, p_to_account_id, 'transfer_in', p_amount, p_occurred_on, p_note, v_transfer_id);

  return v_transfer_id;
end;
$$;

create or replace function public.update_transfer(
  p_transfer_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount bigint,
  p_occurred_on date,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows int;
begin
  if v_user_id is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception 'Akun asal dan tujuan harus berbeda' using errcode = 'P0001';
  end if;

  update public.transactions
  set
    account_id = case type when 'transfer_out' then p_from_account_id else p_to_account_id end,
    amount = p_amount,
    occurred_on = p_occurred_on,
    note = p_note
  where transfer_id = p_transfer_id and user_id = v_user_id;

  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Transfer tidak ditemukan' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows int;
begin
  if v_user_id is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;

  delete from public.transactions
  where transfer_id = p_transfer_id and user_id = v_user_id;

  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Transfer tidak ditemukan' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.create_transfer(uuid, uuid, bigint, date, text) from public, anon;
revoke execute on function public.update_transfer(uuid, uuid, uuid, bigint, date, text) from public, anon;
revoke execute on function public.delete_transfer(uuid) from public, anon;
grant execute on function public.create_transfer(uuid, uuid, bigint, date, text) to authenticated;
grant execute on function public.update_transfer(uuid, uuid, uuid, bigint, date, text) to authenticated;
grant execute on function public.delete_transfer(uuid) to authenticated;
