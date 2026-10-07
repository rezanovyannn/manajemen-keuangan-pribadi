import { renderAppIcon } from "@/lib/pwa/icon";

// Favicon tab browser.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(32, { rounded: true });
}
