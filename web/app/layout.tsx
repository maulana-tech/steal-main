import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Eclipse — Confidential Credit on Stellar",
  description:
    "ZK-powered lending where collateral, debt, and credit scores remain private. Built on Stellar Soroban with Noir circuits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-eclipse-bg text-eclipse-text min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
