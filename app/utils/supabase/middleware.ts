import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  const isPublicRoute = pathname.startsWith('/login') ||
                        pathname.startsWith('/registrati') ||
                        pathname.startsWith('/password-dimenticata') ||
                        pathname.startsWith('/reimposta-password') ||
                        pathname.startsWith('/auth') ||
                        pathname.startsWith('/api') ||
                        pathname.startsWith('/_next') ||
                        pathname.startsWith('/favicon.ico') ||
                        pathname.startsWith('/manifest.json')

  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/registrati')) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
