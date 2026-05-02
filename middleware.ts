import { getPublicSupabaseConfig } from '@/lib/env'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const isBrowserAuthRequired = (pathname: string) =>
  pathname.startsWith('/dashboard') || pathname.startsWith('/holdings')

const isApiAuthRequired = (pathname: string) => pathname.startsWith('/api/')

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const config = getPublicSupabaseConfig()
  if (!config) {
    return supabaseResponse
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user) {
    if (isApiAuthRequired(pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (isBrowserAuthRequired(pathname)) {
      const login = new URL('/login', request.url)
      login.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(login)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
