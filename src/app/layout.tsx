import type { Metadata, Viewport } from "next";
import { Fraunces, Cormorant_Garamond, Jost, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--f-serif", axes: ["opsz"] });
const disp = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--f-disp" });
const sans = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--f-sans" });
const hi = Tiro_Devanagari_Hindi({ subsets: ["devanagari", "latin"], weight: "400", variable: "--f-hi" });

export const metadata: Metadata = {
  title: { default: "AyurKesha — Herbal hair colour", template: "%s · AyurKesha" },
  description: "AyurKesha herbal hair colour. Ten Ayurvedic botanicals that turn grey hair natural black — no chemical ingredients.",
};

export const viewport: Viewport = { themeColor: "#12100d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${disp.variable} ${sans.variable} ${hi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
