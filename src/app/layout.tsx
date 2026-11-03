import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const bronco = localFont({
  src: "../../public/fonts/BroncoPersonalUse.ttf",
  variable: "--font-bronco",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Omar Studio | Barber Shop & Store CRM",
  description: "Visualizador interactivo 3D, Tienda de Mayoreo y CRM para Omar Studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.variable} ${bronco.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#0b0b0b] text-white selection:bg-[#eedfc6] selection:text-black antialiased">
        {children}
      </body>
    </html>
  );
}
