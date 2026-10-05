import { ArrowLeftRight, CircleUser, House, PiggyBank, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; Icon: LucideIcon };

// Urutan juga dipakai untuk bottom bar di HP; jaga maksimal 5 item.
export const NAV_ITEMS: NavItem[] = [
  { href: "/beranda", label: "Beranda", Icon: House },
  { href: "/transaksi", label: "Transaksi", Icon: ArrowLeftRight },
  { href: "/budget", label: "Budget", Icon: PiggyBank },
  { href: "/profil", label: "Profil", Icon: CircleUser },
];

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
