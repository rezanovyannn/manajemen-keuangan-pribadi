import type { Metadata } from "next";
import Link from "next/link";

import { FormAlert } from "@/components/auth/form-field";
import { StabilityCard } from "@/components/networth/stability";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { currentMonthInJakarta } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { loadNetWorth } from "@/lib/networth/query";

export const metadata: Metadata = { title: "Net Worth · Keuangan Pribadi" };

function bertanda(n: number) {
  return n < 0 ? `−${formatRupiah(-n)}` : formatRupiah(n);
}

export default async function NetWorthPage() {
  const { supabase } = await requireUser();
  const { data, error } = await loadNetWorth(supabase, currentMonthInJakarta());

  if (error || !data) {
    return (
      <div className="grid w-full grid-cols-1 gap-4 lg:gap-5">
        <PageHeader title="Net worth" />
        <FormAlert
          tone="error"
          message="Data gagal dimuat. Coba muat ulang halaman."
        />
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:gap-5">
      <PageHeader
        title="Net worth"
        description="Total aset dikurangi kewajiban."
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 lg:px-5 lg:py-4">
          <p className="text-xs text-muted-foreground">Kekayaan bersih</p>
          <p
            className="mt-1 text-3xl font-semibold tracking-tight tabular-nums"
            data-testid="net-worth"
          >
            {bertanda(data.netWorth)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-3">
          <div className="rounded-xl border border-border bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Aset</dt>
            <dd
              className="mt-1 truncate text-sm font-semibold tabular-nums"
              data-testid="aset"
            >
              {bertanda(data.assets)}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Kewajiban</dt>
            <dd
              className="mt-1 truncate text-sm font-semibold tabular-nums"
              data-testid="kewajiban"
            >
              {formatRupiah(data.liabilities)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <Bagian judul="Aset">
          {data.perJenis.map((g) => (
            <Baris
              key={g.type}
              label={g.label}
              sub={`${g.accounts.length} akun`}
              value={bertanda(g.total)}
              href="/akun"
            />
          ))}
          {data.investasi.items.map((i) => (
          <Baris
            key={i.id}
            label={i.name}
            sub={`Investasi · ${i.unrealized >= 0 ? "untung" : "rugi"} ${formatRupiah(Math.abs(i.unrealized))}`}
            value={bertanda(i.value)}
            href={`/akun/${i.id}`}
          />
        ))}
        {data.piutang.map((d) => (
            <Baris
              key={d.id}
              label={d.name}
              sub="Piutang"
              value={formatRupiah(d.status.remaining)}
              href={`/utang/${d.id}`}
            />
          ))}
          {data.perJenis.length === 0 && data.investasi.items.length === 0 && data.piutang.length === 0 && (
            <Kosong teks="Belum ada akun." />
          )}
        </Bagian>

        <Bagian judul="Kewajiban">
          {data.utang.map((d) => (
            <Baris
              key={d.id}
              label={d.name}
              sub="Utang"
              value={formatRupiah(d.status.remaining)}
              href={`/utang/${d.id}`}
            />
          ))}
          {data.utang.length === 0 && <Kosong teks="Tidak ada utang aktif." />}
        </Bagian>
      </div>

      <section
        aria-labelledby="judul-stabil"
        className="grid grid-cols-1 gap-3"
      >
        <h2 id="judul-stabil" className="px-1 font-medium">
          Stabilitas pendapatan
        </h2>
        <StabilityCard s={data.stabilitas} months={data.months} />
      </section>
    </div>
  );
}

function Bagian({
  judul,
  children,
}: {
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={judul} className="grid grid-cols-1 gap-2">
      <h2 className="px-1 font-medium">{judul}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {children}
      </ul>
    </section>
  );
}

function Baris({
  label,
  sub,
  value,
  href,
}: {
  label: string;
  sub: string;
  value: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        <p className="shrink-0 font-medium tabular-nums">{value}</p>
      </Link>
    </li>
  );
}

function Kosong({ teks }: { teks: string }) {
  return (
    <li className="px-4 py-4 text-center text-sm text-muted-foreground">
      {teks}
    </li>
  );
}
