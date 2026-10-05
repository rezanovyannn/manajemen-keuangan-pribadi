import type { AccountType } from "@/lib/supabase/database.types";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Tunai" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-wallet" },
];

export const ACCOUNT_TYPE_VALUES = ["cash", "bank", "ewallet"] as const satisfies readonly AccountType[];

export function accountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}
