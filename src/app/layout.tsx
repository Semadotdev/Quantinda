import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Quantinda — Sari-Sari Store POS & Inventory",
  description:
    "A smart sari-sari store inventory and POS system for modern store operations.",
  icons: { icon: "/logo-icon.png" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `try{let t=JSON.parse(localStorage.getItem("quantinda-theme"));if(t&&t.state&&t.state.dark)document.documentElement.classList.add("dark")}catch(e){}`,
        }} />
      </head>
      <body className="min-h-full font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
