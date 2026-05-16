import type { Metadata } from 'next'
import './globals.css'
 
export const metadata: Metadata = {
  title: 'ECOSABANA Sonora 2027',
  description: 'Sistema de gestión de estructura PVEM',
}
 
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      </head>
      <body>{children}</body>
    </html>
  )
}
 