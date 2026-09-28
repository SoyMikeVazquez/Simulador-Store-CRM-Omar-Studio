import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omar labs studio | Simulador de Mockups Premium",
  description: "Visualizador interactivo 3D para etiquetas y envases de cosmética y ceras para cabello.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={outfit.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
