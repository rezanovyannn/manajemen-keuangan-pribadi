import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { RegisterServiceWorker } from "@/components/offline/register-sw";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Warna bar status/browser di HP mengikuti tema terang/gelap.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

export const metadata: Metadata = {
  title: "Keuangan Pribadi",
  description: "Aplikasi manajemen keuangan pribadi",
  applicationName: "Keuangan Pribadi",
  // iPhone: buka layar penuh saat dipasang lewat "Add to Home Screen".
  appleWebApp: { capable: true, title: "Keuangan", statusBarStyle: "default" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
