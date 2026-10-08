import type { AccountType, InvestmentKind } from "@/lib/supabase/database.types";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Tunai" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-wallet" },
  { value: "investment", label: "Investasi" },
];

export const ACCOUNT_TYPE_VALUES = ["cash", "bank", "ewallet", "investment"] as const satisfies readonly AccountType[];

// Akun "siap pakai" (uang belanja). Akun investasi tidak termasuk total saldo,
// aman dibelanjakan, proyeksi, maupun catat kilat; tetap masuk net worth.
export const isSpendable = (type: AccountType) => type !== "investment";

export function accountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const INVESTMENT_KINDS: { value: InvestmentKind; label: string }[] = [
  { value: "reksadana", label: "Reksadana" },
  { value: "saham", label: "Saham" },
  { value: "emas", label: "Emas" },
  { value: "crypto", label: "Crypto" },
  { value: "obligasi", label: "Obligasi/SBN" },
  { value: "lainnya", label: "Lainnya" },
];

export const INVESTMENT_KIND_VALUES = ["reksadana", "saham", "emas", "crypto", "obligasi", "lainnya"] as const satisfies readonly InvestmentKind[];

export function investmentKindLabel(kind: InvestmentKind | null) {
  return INVESTMENT_KINDS.find((k) => k.value === kind)?.label ?? "Investasi";
}
