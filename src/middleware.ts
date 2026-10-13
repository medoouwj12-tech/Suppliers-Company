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

    // إعادة التوجيه بعد تسجيل الدخول من الصفحة الرئيسية
    if (pathname === '/') {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      if (token.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      } else {
        return NextResponse.redirect(new URL('/rep/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    secret: process.env.NEXTAUTH_SECRET || 'supplypro-erp-super-secret-key-production-ready-2026-very-secure',
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        // السماح بالوصول لصفحة تسجيل الدخول ومسارات المصادقة دون حجب
        if (
          pathname === '/login' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/_next') ||
          pathname === '/favicon.ico'
        ) {
          return true
        }
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
  ],
}
