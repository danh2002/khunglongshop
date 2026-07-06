import type { Metadata } from "next";
import { Be_Vietnam_Pro, Saira_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import SessionProvider from "@/utils/SessionProvider";
import Providers from "@/Providers";
import StyledComponentsRegistry from "@/lib/registry";

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-body",
});

const displayFont = Saira_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Khủng Long Shop",
  description: "Cửa hàng phụ kiện và merch khủng long.",
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <StyledComponentsRegistry>
          <SessionProvider session={null}>
            <Providers>{children}</Providers>
          </SessionProvider>
        </StyledComponentsRegistry>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
