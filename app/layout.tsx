import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://gailant-beauty.vercel.app"),
  title: "Gailant Beauty | Beauty, Crowned in Accra",
  description: "Abeka's premium studio for nails, hair, lashes and makeup, in-studio or at your door.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Gailant Beauty | Where Beauty Wears a Crown",
    description: "Premium nails, hair, lashes and makeup in Abeka, Accra.",
    images: [{ url: "/og.png", width: 1792, height: 917, alt: "Gailant Beauty, Where Beauty Wears a Crown" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>;
}
