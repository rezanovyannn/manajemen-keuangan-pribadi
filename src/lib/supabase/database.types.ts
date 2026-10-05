// Tipe skema database. Ditulis manual mengikuti supabase/migrations/.
// Jika Supabase CLI sudah login, bisa diganti hasil:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
// Setiap migrasi yang mengubah tabel wajib memperbarui file ini.

export type AccountType = "cash" | "bank" | "ewallet";
export type CategoryType = "income" | "expense";

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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
