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

// Navigasi bawah (HP): 4 menu utama + tombol tambah di tengah; sisanya di panel "Lainnya".
export const NAV_BAWAH_KIRI = ["/beranda", "/transaksi"] as const;
export const NAV_BAWAH_KANAN = ["/budget"] as const;
const DI_BAWAH = new Set<string>([...NAV_BAWAH_KIRI, ...NAV_BAWAH_KANAN]);
export const navItem = (href: string) => NAV_ITEMS.find((i) => i.href === href)!;
export const NAV_LAINNYA: NavItem[] = NAV_ITEMS.filter((i) => !DI_BAWAH.has(i.href));

// Warna stiker (dekorasi) untuk ikon di panel "Lainnya".
export const WARNA_LAINNYA: Record<string, string> = {
  "/akun": "bg-sticker-sky/15 text-sticker-sky",
  "/insight": "bg-sticker-purple/20 text-sticker-purple",
  "/net-worth": "bg-sticker-teal/15 text-sticker-teal",
  "/tujuan": "bg-sticker-green/15 text-sticker-green",
  "/utang": "bg-sticker-orange/15 text-sticker-orange",
  "/berulang": "bg-sticker-pink/15 text-sticker-pink",
  "/kategori": "bg-sticker-sky/15 text-sticker-sky",
  "/profil": "bg-muted text-muted-foreground",
};

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Judul halaman untuk bar atas di HP (menu yang paling cocok dengan path saat ini).
export function currentNavLabel(pathname: string) {
  return NAV_ITEMS.find((i) => isNavActive(pathname, i.href))?.label ?? "Keuangan Pribadi";
}
