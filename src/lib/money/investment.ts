import { addAmounts, signedAmount, type BalanceTransaction } from "./balance";
import { assertAmount } from "./rupiah";

// Investasi = akun berjenis investment. Aturan (disetujui 9 Okt 2026):
// - Nilai sekarang mengikuti platform: setiap "perbarui nilai" menetapkan nilai pasar.
//   Naik/turun nilai = untung/rugi BELUM terealisasi (bukan pemasukan/pengeluaran).
// - Beli/top up (uang masuk ke akun investasi): nilai & modal bertambah sebesar nominal.
// - Jual (uang keluar): nilai berkurang sebesar nominal; modal berkurang PROPORSIONAL
//   (metode harga rata-rata): modal_keluar = modal × porsi_jual / nilai_sebelum_jual.
//   Selisih nominal jual − modal_keluar = untung/rugi TERREALISASI.
// - Kejadian diproses urut tanggal; di tanggal yang sama urut WAKTU DICATAT (created_at),
//   mis. nilai diperbarui pagi lalu dijual sore. Tanpa waktu: beli/jual dulu, lalu nilai.
//   Semua integer Rupiah (BigInt untuk pembagian).

export type DatedTransaction = BalanceTransaction & { occurred_on: string; created_at?: string };
export type Valuation = { valued_on: string; market_value: number; created_at?: string };

export type ValuationPoint = {
  date: string;
  value: number;
  change: number; // perubahan pasar sejak posisi sebelumnya (setelah beli/jual)
  changeTenths: number | null; // persen × 10 terhadap nilai sebelumnya
};

export type InvestmentLedger = {
  value: number; // nilai sekarang (sesuai platform)
  cost: number; // modal yang masih tertanam
  unrealized: number; // value − cost
  unrealizedTenths: number | null; // persen × 10 terhadap modal; null jika modal 0
  realized: number; // akumulasi untung/rugi dari penjualan
  history: ValuationPoint[]; // urut tanggal naik
  lastChange: ValuationPoint | null; // perubahan pada pembaruan nilai terakhir
};

const persenTenths = (part: number, base: number) => (base > 0 ? Number((BigInt(part) * BigInt(1000)) / BigInt(base)) : null);

export function investmentLedger(input: { openingBalance: number; transactions: DatedTransaction[]; valuations: Valuation[] }): InvestmentLedger {
  type Kejadian = { date: string; urut: number; sub: string; jalan: () => void };
  let value = assertAmount(input.openingBalance);
  let cost = value;
  let realized = 0;
  const history: ValuationPoint[] = [];

  const arus = (signed: number) => {
    if (signed >= 0) {
      value = addAmounts(value, signed);
      cost = addAmounts(cost, signed);
      return;
    }
    const keluar = -signed;
    // Porsi yang benar-benar tercatat; jika nilai belum diperbarui dan jual > nilai, seluruh modal keluar.
    const porsi = Math.min(keluar, value);
    const modalKeluar = value > 0 ? Number((BigInt(cost) * BigInt(porsi)) / BigInt(value)) : 0;
    cost = addAmounts(cost, -modalKeluar);
    realized = addAmounts(realized, addAmounts(keluar, -modalKeluar));
    value = Math.max(0, addAmounts(value, -keluar));
  };

  const kejadian: Kejadian[] = [
    ...input.transactions.map((t) => ({ date: t.occurred_on, urut: 0, sub: t.created_at ?? "", jalan: () => arus(signedAmount(t.type, t.amount)) })),
    ...input.valuations.map((v) => ({
      date: v.valued_on,
      urut: 1,
      sub: v.created_at ?? "",
      jalan: () => {
        const baru = assertAmount(v.market_value);
        const change = addAmounts(baru, -value);
        history.push({ date: v.valued_on, value: baru, change, changeTenths: persenTenths(change, value) });
        value = baru;
      },
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.sub && b.sub ? a.sub.localeCompare(b.sub) : 0) || a.urut - b.urut);
  for (const k of kejadian) k.jalan();

  const unrealized = addAmounts(value, -cost);
  return {
    value,
    cost,
    unrealized,
    unrealizedTenths: persenTenths(unrealized, cost),
    realized,
    history,
    lastChange: history.at(-1) ?? null,
  };
}

// "+12,3%" / "−4,0%" dari persepuluhan persen.
export function formatGainPercent(tenths: number): string {
  const tanda = tenths > 0 ? "+" : tenths < 0 ? "−" : "";
  const abs = Math.abs(tenths);
  return `${tanda}${Math.floor(abs / 10)},${abs % 10}%`;
}

// --- Harga per unit × unit -------------------------------------------------------------

// Angka desimal dari input pengguna → { bulat, pecahan } (string digit), atau null.
// "1.523,45" → koma desimal, titik ribuan. "1523.45" → titik desimal. "1.523" → ribuan
// (lazim untuk Rupiah). Unit memakai unitsInput di validator (titik/koma = desimal).
export function parseDecimal(input: string, maxDecimals: number): { bulat: string; pecahan: string } | null {
  const v = input.trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  let bulat: string;
  let pecahan = "";
  if (v.includes(",")) {
    const m = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d+)$/.exec(v);
    if (!m) return null;
    [bulat, pecahan] = [m[1]!.replace(/\./g, ""), m[2]!];
  } else if (/^\d{1,3}(\.\d{3})+$/.test(v)) {
    bulat = v.replace(/\./g, "");
  } else {
    const m = /^(\d+)(?:\.(\d+))?$/.exec(v);
    if (!m) return null;
    [bulat, pecahan] = [m[1]!, m[2] ?? ""];
  }
  pecahan = pecahan.replace(/0+$/, "");
  if (pecahan.length > maxDecimals || bulat.length > 15) return null;
  return { bulat: bulat.replace(/^0+(?=\d)/, ""), pecahan };
}

// Nilai total = harga per unit × unit, dibulatkan ke bawah ke Rupiah (BigInt, tanpa float).
// `price` & `units` berupa string desimal ("1523.4567", "650.25"). null jika tidak valid/terlalu besar.
export function multiplyPriceUnits(price: string, units: string): number | null {
  const p = parseDecimal(price, 6);
  const u = /^(\d+)(?:\.(\d+))?$/.exec(units);
  if (!p || !u) return null;
  const skalaP = BigInt(10) ** BigInt(p.pecahan.length);
  const pecahanU = u[2] ?? "";
  const skalaU = BigInt(10) ** BigInt(pecahanU.length);
  const total = (BigInt(p.bulat + p.pecahan) * BigInt(u[1]! + pecahanU)) / (skalaP * skalaU);
  const n = Number(total);
  return Number.isSafeInteger(n) ? n : null;
}

// Masih dipakai untuk pengujian & kompatibilitas: saldo akun per akhir tanggal.
export function balanceAsOf(openingBalance: number, rows: DatedTransaction[], date: string): number {
  return rows
    .filter((r) => r.occurred_on <= date)
    .reduce((s, r) => addAmounts(s, signedAmount(r.type, r.amount)), assertAmount(openingBalance));
}
