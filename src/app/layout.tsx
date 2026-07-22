import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Sora } from "next/font/google";
import { LangProvider } from "@/components/LangProvider";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

const latin = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-latin",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "نتيجة — نتائج الباكالوريا والبريفيه والكونكور في موريتانيا",
    template: "%s · نتيجة",
  },
  description:
    "أسرع منصة لعرض نتائج الباكالوريا (BAC) والبريفيه (BEPC) ومسابقة الدخول (Concours) في موريتانيا.",
  applicationName: "Natija",
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#04180e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${latin.variable}`}>
      <body className="moorish-bg">
        <LangProvider>
          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </LangProvider>
      </body>
    </html>
  );
}
