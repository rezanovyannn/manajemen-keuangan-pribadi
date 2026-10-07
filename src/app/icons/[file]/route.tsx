import { renderAppIcon } from "@/lib/pwa/icon";

// Ikon PWA untuk manifest. Nama berakhiran .png agar dilewati proxy (src/proxy.ts).
const IKON: Record<string, { size: number; maskable?: boolean }> = {
  "icon-192.png": { size: 192 },
  "icon-512.png": { size: 512 },
  "maskable-512.png": { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(IKON).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: RouteContext<"/icons/[file]">) {
  const { file } = await params;
  const ikon = IKON[file];
  if (!ikon) return new Response("Tidak ditemukan", { status: 404 });
  return renderAppIcon(ikon.size, { maskable: ikon.maskable });
}
