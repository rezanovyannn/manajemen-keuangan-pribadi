// Tipe skema database. Ditulis manual mengikuti supabase/migrations/.
// Jika Supabase CLI sudah login, bisa diganti hasil:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
// Setiap migrasi yang mengubah tabel wajib memperbarui file ini.

import type { TransactionType } from "@/lib/money/balance";

export type AccountType = "cash" | "bank" | "ewallet";
export type CategoryType = "income" | "expense";
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
} & Timestamps;

type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  category_type: "expense";
  month: string; // YYYY-MM-01
  amount: number;
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
          Partial<Omit<TransactionRow, "id" | "category_type" | "account_id" | "type" | "amount">>;
        Update: Partial<Omit<TransactionRow, "id" | "user_id" | "category_type" | "transfer_id">>;
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
