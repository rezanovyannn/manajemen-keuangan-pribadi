// Tipe skema database. Ditulis manual mengikuti supabase/migrations/.
// Jika Supabase CLI sudah login, bisa diganti hasil:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
// Setiap migrasi yang mengubah tabel wajib memperbarui file ini.

import type { TransactionType } from "@/lib/money/balance";

export type AccountType = "cash" | "bank" | "ewallet";
export type CategoryType = "income" | "expense";
export type DebtKind = "utang" | "piutang";
export type { TransactionType };

type Timestamps = { created_at: string; updated_at: string };

type ProfileRow = {
  id: string;
  display_name: string | null;
  currency: string;
} & Timestamps;

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  archived_at: string | null;
} & Timestamps;

type CategoryRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  type: CategoryType;
  archived_at: string | null;
} & Timestamps;

type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  category_type: CategoryType | null;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  transfer_id: string | null;
  recurring_rule_id: string | null;
  recurring_date: string | null;
  debt_id: string | null;
  debt_kind: DebtKind | null;
  fee_for_id: string | null; // terisi jika baris ini biaya admin untuk transaksi lain
} & Timestamps;

type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  category_type: "expense";
  month: string; // YYYY-MM-01
  amount: number;
} & Timestamps;

type RecurringRuleRow = {
  id: string;
  user_id: string;
  name: string;
  account_id: string;
  category_id: string;
  type: "income" | "expense";
  category_type: "income" | "expense";
  amount: number;
  note: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  paused: boolean;
} & Timestamps;

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  account_id: string | null; // tidak dipakai lagi sejak goal_allocations
  target_amount: number;
  deadline: string | null;
  archived_at: string | null;
} & Timestamps;

type GoalAllocationRow = {
  id: string;
  user_id: string;
  goal_id: string;
  account_id: string;
  amount: number; // > 0 sisihkan, < 0 ambil
  occurred_on: string;
  note: string | null;
} & Timestamps;

type DebtRow = {
  id: string;
  user_id: string;
  kind: DebtKind;
  name: string;
  counterparty: string | null;
  principal: number;
  installment_amount: number | null;
  start_date: string;
  due_date: string | null;
  note: string | null;
  archived_at: string | null;
} & Timestamps;

type TransferArgs = {
  p_from_account_id: string;
  p_to_account_id: string;
  p_amount: number;
  p_occurred_on: string;
  p_note?: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<Omit<ProfileRow, "id">>;
        Relationships: [];
      };
      accounts: {
        Row: AccountRow;
        Insert: Pick<AccountRow, "name" | "type"> &
          Partial<Omit<AccountRow, "name" | "type">>;
        Update: Partial<Omit<AccountRow, "id" | "user_id">>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Pick<CategoryRow, "name" | "type"> &
          Partial<Omit<CategoryRow, "name" | "type">>;
        Update: Partial<Omit<CategoryRow, "id" | "user_id">>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        // Insert/update langsung hanya untuk income/expense (RLS); transfer lewat Functions.
        Insert: Pick<TransactionRow, "account_id" | "type" | "amount"> &
          Partial<Omit<TransactionRow, "category_type" | "debt_kind" | "account_id" | "type" | "amount">>;
        Update: Partial<Omit<TransactionRow, "id" | "user_id" | "category_type" | "debt_kind" | "transfer_id">>;
        Relationships: [];
      };
      recurring_rules: {
        Row: RecurringRuleRow;
        Insert: Omit<RecurringRuleRow, "id" | "user_id" | "category_type" | "created_at" | "updated_at" | "paused" | "note" | "end_date"> &
          Partial<Pick<RecurringRuleRow, "id" | "user_id" | "paused" | "note" | "end_date">>;
        Update: Partial<Omit<RecurringRuleRow, "id" | "user_id" | "category_type" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      goals: {
        Row: GoalRow;
        Insert: Pick<GoalRow, "name" | "target_amount"> & Partial<Pick<GoalRow, "id" | "user_id" | "account_id" | "deadline" | "archived_at">>;
        Update: Partial<Pick<GoalRow, "name" | "account_id" | "target_amount" | "deadline" | "archived_at">>;
        Relationships: [];
      };
      goal_allocations: {
        Row: GoalAllocationRow;
        Insert: Pick<GoalAllocationRow, "goal_id" | "account_id" | "amount"> &
          Partial<Pick<GoalAllocationRow, "id" | "user_id" | "occurred_on" | "note">>;
        Update: Partial<Pick<GoalAllocationRow, "amount" | "occurred_on" | "note">>;
        Relationships: [];
      };
      debts: {
        Row: DebtRow;
        Insert: Pick<DebtRow, "kind" | "name" | "principal" | "start_date"> &
          Partial<Pick<DebtRow, "id" | "user_id" | "counterparty" | "installment_amount" | "due_date" | "note" | "archived_at">>;
        Update: Partial<Omit<DebtRow, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      budgets: {
        Row: BudgetRow;
        Insert: Pick<BudgetRow, "category_id" | "month" | "amount"> & Partial<Pick<BudgetRow, "id" | "user_id">>;
        Update: Partial<Pick<BudgetRow, "category_id" | "month" | "amount">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_transfer: { Args: TransferArgs; Returns: string };
      update_transfer: { Args: TransferArgs & { p_transfer_id: string }; Returns: undefined };
      delete_transfer: { Args: { p_transfer_id: string }; Returns: undefined };
      ensure_fee_category: { Args: Record<string, never>; Returns: string };
      set_transaction_fee: { Args: { p_parent_id: string; p_amount: number | null }; Returns: undefined };
      create_transfer_with_fee: { Args: TransferArgs & { p_fee?: number | null }; Returns: string };
      update_transfer_with_fee: { Args: TransferArgs & { p_transfer_id: string; p_fee?: number | null }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
