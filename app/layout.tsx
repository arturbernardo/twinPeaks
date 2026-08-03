import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumina · Gêmeo Digital de Cultura",
  description: "O que a gestão não consegue ver: cultura como evidência, não como opinião.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b bg-card">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
              Gêmeo Digital de Cultura
            </Link>
            <div className="ml-auto flex items-center gap-5 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Dashboard</Link>
              <Link href="/chat" className="hover:text-foreground">Agente</Link>
              <Link
                href="/submit"
                className="rounded-md bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700"
              >
                Contar uma história
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          Lumina (empresa fictícia) · mapa de forças, não sistema de nota · toda inferência é rastreável às histórias
        </footer>
      </body>
    </html>
  );
}
