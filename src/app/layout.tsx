import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AIMÊ",
  description: "Sistema de gestão AIMÊ",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
