import type { Metadata } from "next";
import { Inter, Luckiest_Guy } from "next/font/google";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Luckiest_Guy({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-poke",
});

export const metadata: Metadata = {
  title: "PokéDealRadar",
  description: "Finde aktuelle Pokémon-Karten-Angebote aus verschiedenen Quellen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
