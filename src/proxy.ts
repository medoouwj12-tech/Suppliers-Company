import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    if (token?.role === 'SUPPLIER') {
      const supplierArea = pathname.startsWith('/supplier')
      const supplierApi = pathname.startsWith('/api/supplier-portal')
      const authApi = pathname.startsWith('/api/auth')

      if (!supplierArea && !supplierApi && !authApi) {
        return NextResponse.redirect(new URL('/supplier/dashboard', req.url))
      }
    } else if (pathname.startsWith('/supplier')) {
      return NextResponse.redirect(new URL(token ? '/dashboard' : '/login', req.url))
    }

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
      } else if (token.role === 'SUPPLIER') {
        return NextResponse.redirect(new URL('/supplier/dashboard', req.url))
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
