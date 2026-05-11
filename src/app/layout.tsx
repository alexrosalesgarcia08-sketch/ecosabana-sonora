import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ECOSABANA Sonora 2027',
  description: 'Sistema de gestión de estructura PVEM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}