import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const isProtected =
    req.nextUrl.pathname.startsWith('/admin') ||
    req.nextUrl.pathname.startsWith('/usuario')

  // Verificar si hay cookie de sesión de Supabase
  const hasSession = req.cookies.getAll().some(c => 
    c.name.includes('sb-') && c.name.includes('-auth-token')
  )

  if (!hasSession && isProtected) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/usuario/:path*']
}