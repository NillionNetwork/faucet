import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/app/globals.css";
import ClientProviders from "./components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nillion Faucet",
  description: "Get NIL for development and testing.",
  icons: {
    icon: "/nillion.jpg",
    apple: "/nillion.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
