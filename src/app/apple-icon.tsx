import { renderAppIcon } from "@/lib/pwa/icon";

// Ikon layar utama iPhone/iPad (iOS membulatkan sudutnya sendiri).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
