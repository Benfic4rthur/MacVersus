import type { Metadata } from "next";
import "./globals.css";
import "../components/radar-profile.css";
import "./workbench.css";

export const metadata: Metadata = {
  title: "MacVersus | Compare Macs com dados reais",
  description: "Compare MacBooks em jogos, IA local e criação. Benchmarks publicados, configurações exatas e fontes para conferir cada resultado.",
  applicationName: "MacVersus",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
