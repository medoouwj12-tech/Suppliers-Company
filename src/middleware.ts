import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // صفحات المندوب فقط
    const repOnlyPaths = ['/rep']
    // صفحات المدير فقط  
    const adminOnlyPaths = ['/admin', '/users', '/warehouses', '/suppliers', '/reports', '/settings']

    if (adminOnlyPaths.some(path => pathname.startsWith(path))) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/rep/dashboard', req.url))
      }
    }

    // إعادة التوجيه بعد تسجيل الدخول
    if (pathname === '/') {
      if (token?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      } else {
        return NextResponse.redirect(new URL('/rep/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        // السماح بالوصول لصفحة تسجيل الدخول دون تسجيل
        if (pathname === '/login') return true
        // باقي الصفحات تحتاج تسجيل دخول
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
  ],
}
