-- Biaya admin opsional pada transaksi.
--
-- Biaya = transaksi pengeluaran terpisah (kategori "Biaya Admin") yang tertaut ke
-- transaksi utamanya lewat fee_for_id. Untuk transfer, induknya adalah baris transfer_out
-- (biaya dipotong dari akun asal). Aturan saldo tidak berubah: biaya hanyalah pengeluaran.
-- Induk dihapus -> biaya ikut terhapus (cascade).

alter table public.transactions add constraint transactions_id_user_key unique (id, user_id);

alter table public.transactions
  add column fee_for_id uuid,
  add constraint transactions_fee_is_expense check (fee_for_id is null or type = 'expense'),
  add constraint transactions_fee_not_self check (fee_for_id is null or fee_for_id <> id),
  -- Satu transaksi maksimal punya satu biaya admin.
  add constraint transactions_fee_unique unique (fee_for_id),
  add constraint transactions_fee_fkey
    foreign key (fee_for_id, user_id) references public.transactions (id, user_id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Kategori default "Biaya Admin"
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
    ('Biaya Admin', 'expense'),
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

-- Pengguna lama: tambahkan "Biaya Admin" jika belum ada kategori aktif bernama sama.
insert into public.categories (user_id, name, type)
select p.id, 'Biaya Admin', 'expense'
from public.profiles p
where not exists (
  select 1 from public.categories c
  where c.user_id = p.id and c.type = 'expense' and c.parent_id is null
    and c.archived_at is null and lower(c.name) = 'biaya admin'
);

-- ---------------------------------------------------------------------------
-- Fungsi biaya admin (security invoker: RLS tetap berlaku, hanya data pemanggil)
-- ---------------------------------------------------------------------------

-- Id kategori "Biaya Admin" aktif milik pemanggil; dibuat jika belum ada / diarsipkan.
create or replace function public.ensure_fee_category()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.categories
  where user_id = auth.uid() and type = 'expense' and parent_id is null
    and archived_at is null and lower(name) = 'biaya admin'
  limit 1;
  if v_id is null then
    insert into public.categories (user_id, name, type) values (auth.uid(), 'Biaya Admin', 'expense')
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Atur biaya admin untuk satu transaksi induk: buat / ubah / hapus (p_amount null atau 0).
-- Akun & tanggal biaya selalu disamakan dengan induknya.
create or replace function public.set_transaction_fee(p_parent_id uuid, p_amount bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_parent record;
begin
  select id, account_id, occurred_on, type into v_parent
  from public.transactions where id = p_parent_id;
  if v_parent.id is null then
    raise exception 'Transaksi tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_parent.type = 'transfer_in' then
    raise exception 'Biaya transfer dicatat di akun asal' using errcode = 'P0001';
  end if;

  if p_amount is null or p_amount = 0 then
    delete from public.transactions where fee_for_id = p_parent_id;
    return;
  end if;

  update public.transactions
  set amount = p_amount, account_id = v_parent.account_id, occurred_on = v_parent.occurred_on
  where fee_for_id = p_parent_id;
  if not found then
    insert into public.transactions (user_id, account_id, category_id, type, amount, occurred_on, note, fee_for_id)
    values (auth.uid(), v_parent.account_id, public.ensure_fee_category(), 'expense', p_amount,
            v_parent.occurred_on, 'Biaya admin', p_parent_id);
  end if;
end;
$$;

revoke execute on function public.ensure_fee_category() from public, anon;
revoke execute on function public.set_transaction_fee(uuid, bigint) from public, anon;
grant execute on function public.ensure_fee_category() to authenticated;
grant execute on function public.set_transaction_fee(uuid, bigint) to authenticated;

-- Transfer dengan biaya: satu panggilan fungsi = satu transaksi database (atomik).
create or replace function public.create_transfer_with_fee(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount bigint,
  p_occurred_on date,
  p_note text default null,
  p_fee bigint default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_transfer_id uuid;
  v_out_id uuid;
begin
  v_transfer_id := public.create_transfer(p_from_account_id, p_to_account_id, p_amount, p_occurred_on, p_note);
  if p_fee is not null and p_fee > 0 then
    select id into v_out_id from public.transactions where transfer_id = v_transfer_id and type = 'transfer_out';
    perform public.set_transaction_fee(v_out_id, p_fee);
  end if;
  return v_transfer_id;
end;
$$;

create or replace function public.update_transfer_with_fee(
  p_transfer_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount bigint,
  p_occurred_on date,
  p_note text default null,
  p_fee bigint default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_out_id uuid;
begin
  perform public.update_transfer(p_transfer_id, p_from_account_id, p_to_account_id, p_amount, p_occurred_on, p_note);
  select id into v_out_id from public.transactions where transfer_id = p_transfer_id and type = 'transfer_out';
  perform public.set_transaction_fee(v_out_id, p_fee);
end;
$$;

revoke execute on function public.create_transfer_with_fee(uuid, uuid, bigint, date, text, bigint) from public, anon;
revoke execute on function public.update_transfer_with_fee(uuid, uuid, uuid, bigint, date, text, bigint) from public, anon;
grant execute on function public.create_transfer_with_fee(uuid, uuid, bigint, date, text, bigint) to authenticated;
grant execute on function public.update_transfer_with_fee(uuid, uuid, uuid, bigint, date, text, bigint) to authenticated;
