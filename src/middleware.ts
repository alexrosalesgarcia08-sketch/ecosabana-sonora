import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
 
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )
 
  const { data: { user } } = await supabase.auth.getUser()
 
  const isProtected =
    req.nextUrl.pathname.startsWith('/admin') ||
    req.nextUrl.pathname.startsWith('/usuario')
 
  // Sin sesión → al login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/', req.url))
  }
 
  // Con sesión en login → redirigir a su panel
  if (user && req.nextUrl.pathname === '/') {
    const { data: u } = await supabase
      .from('usuarios').select('rol').eq('id', user.id).single()
    const dest = u?.rol === 'admin' ? '/admin' : '/usuario'
    return NextResponse.redirect(new URL(dest, req.url))
  }
 
  return res
}
 
export const config = {
  matcher: ['/', '/admin/:path*', '/usuario/:path*']
}
 