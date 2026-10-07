import {
  ArrowLeftRight,
  CircleUser,
  HandCoins,
  Lightbulb,
  House,
  PiggyBank,
  Repeat,
  Scale,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; Icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

// Menu dikelompokkan; dipakai sidebar desktop dan menu laci di HP.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Utama",
    items: [
      { href: "/beranda", label: "Beranda", Icon: House },
      { href: "/transaksi", label: "Transaksi", Icon: ArrowLeftRight },
      { href: "/akun", label: "Akun", Icon: Wallet },
      { href: "/budget", label: "Budget", Icon: PiggyBank },
    ],
  },
  {
    label: "Perencanaan",
    items: [
      { href: "/insight", label: "Insight & proyeksi", Icon: Lightbulb },
      { href: "/net-worth", label: "Net worth", Icon: Scale },
      { href: "/tujuan", label: "Tujuan tabungan", Icon: Target },
      { href: "/utang", label: "Utang & piutang", Icon: HandCoins },
      { href: "/berulang", label: "Transaksi berulang", Icon: Repeat },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { href: "/kategori", label: "Kategori", Icon: Tags },
      { href: "/profil", label: "Profil", Icon: CircleUser },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Judul halaman untuk bar atas di HP (menu yang paling cocok dengan path saat ini).
export function currentNavLabel(pathname: string) {
  return NAV_ITEMS.find((i) => isNavActive(pathname, i.href))?.label ?? "Keuangan Pribadi";
}
