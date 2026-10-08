import { addAmounts, signedAmount, type BalanceTransaction } from "./balance";
import { assertAmount } from "./rupiah";

// Investasi = akun berjenis investment.
// - Modal (cost)  = saldo akun investasi (saldo awal + beli − jual, dari transaksi).
// - Nilai sekarang = nilai pasar terakhir yang diisi pengguna + perubahan modal SETELAH
//   tanggal nilai itu (beli/jual susulan). Nilai pada tanggal yang sama dianggap akhir hari,
//   jadi transaksi di tanggal itu sudah termasuk. Belum pernah diisi → nilai = modal.
// - Untung/rugi = nilai − modal. Semua integer Rupiah; persen dalam persepuluhan (BigInt).

export type DatedTransaction = BalanceTransaction & { occurred_on: string };

// Saldo akun per akhir tanggal `date` (inklusif).
export function balanceAsOf(openingBalance: number, rows: DatedTransaction[], date: string): number {
  return rows
    .filter((r) => r.occurred_on <= date)
    .reduce((s, r) => addAmounts(s, signedAmount(r.type, r.amount)), assertAmount(openingBalance));
}

export type InvestmentStatus = {
  cost: number;
  value: number;
  gain: number; // bisa minus
  gainTenths: number | null; // persen × 10 dibulatkan menuju nol; null jika modal <= 0
};

export function investmentStatus(input: {
  cost: number; // saldo akun sekarang
  lastValuation: { marketValue: number; costAtValuation: number } | null;
}): InvestmentStatus {
  const cost = assertAmount(input.cost);
  const v = input.lastValuation;
  // Jual setelah penilaian bisa membuat hasil < 0 (data tidak konsisten): batasi ke 0.
  const value = v ? Math.max(0, addAmounts(assertAmount(v.marketValue), addAmounts(cost, -assertAmount(v.costAtValuation)))) : Math.max(0, cost);
  const gain = addAmounts(value, -cost);
  const gainTenths = cost > 0 ? Number((BigInt(gain) * BigInt(1000)) / BigInt(cost)) : null;
  return { cost, value, gain, gainTenths };
}

// "+12,3%" / "−4,0%" dari persepuluhan persen.
export function formatGainPercent(tenths: number): string {
  const tanda = tenths > 0 ? "+" : tenths < 0 ? "−" : "";
  const abs = Math.abs(tenths);
  return `${tanda}${Math.floor(abs / 10)},${abs % 10}%`;
}
