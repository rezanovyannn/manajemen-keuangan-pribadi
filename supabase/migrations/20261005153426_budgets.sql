-- Fase 4: tabel budgets + RLS.
-- Satu budget = batas pengeluaran satu kategori pengeluaran untuk satu bulan.
-- Budget pada kategori utama ikut menghitung sub-kategorinya (dihitung di src/lib/money/budget.ts).
-- Pemakaian TIDAK disimpan; selalu dihitung dari transaksi bulan tersebut.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  -- Hanya kategori pengeluaran yang boleh diberi budget (dijaga lewat FK komposit).
  category_type text not null default 'expense' check (category_type = 'expense'),
  -- Hari pertama bulan, misal 2026-10-01 untuk Oktober 2026.
  month date not null check (extract(day from month) = 1),
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (category_id, user_id, category_type)
    references public.categories (id, user_id, type) on delete restrict,
  unique (user_id, category_id, month)
);

create index budgets_user_month_idx on public.budgets (user_id, month);
create index budgets_category_id_idx on public.budgets (category_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- Kategori yang diarsipkan tidak bisa diberi budget baru.
create or replace function public.check_budget_category_active()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.category_id is distinct from old.category_id)
     and exists (select 1 from public.categories where id = new.category_id and archived_at is not null) then
    raise exception 'Kategori sudah diarsipkan' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger budgets_check_category_active
  before insert or update of category_id on public.budgets
  for each row execute function public.check_budget_category_active();

alter table public.budgets enable row level security;

create policy "budgets_select_own"
  on public.budgets for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "budgets_insert_own"
  on public.budgets for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "budgets_update_own"
  on public.budgets for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "budgets_delete_own"
  on public.budgets for delete
  to authenticated
  using (user_id = (select auth.uid()));
