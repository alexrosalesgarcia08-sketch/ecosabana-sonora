import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const isProtected =
    req.nextUrl.pathname.startsWith('/admin') ||
    req.nextUrl.pathname.startsWith('/usuario')

  if (!isProtected) return NextResponse.next()

  // Buscar cualquier cookie de sesión de Supabase
  const cookies = req.cookies.getAll()
  const hasSession = cookies.some(c => c.name.startsWith('sb-'))

  if (!hasSession) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/usuario/:path*']
}