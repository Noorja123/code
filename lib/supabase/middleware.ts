// File: lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. Initialize the response
  // We will attach cookies to THIS response object and return it.
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
        setAll(cookiesToSet) {
          // Update request cookies (for the immediate request)
          cookiesToSet.forEach(({ name, value, options }) => 
            request.cookies.set({ name, value, ...options })
          )
          // Update response cookies (for the browser)
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

  // 2. Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 3. Handle Protected Routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    // We must return a redirect, but we CANNOT lose the cookies!
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    
    // Create the redirect response
    const redirectResponse = NextResponse.redirect(url)
    
    // COPY the cookies from supabaseResponse to the redirectResponse
    const allCookies = supabaseResponse.cookies.getAll()
    allCookies.forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return redirectResponse
  }

  // 4. Handle Auth Routes (Redirect logged-in users away from login page)
  if ((request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname === '/') && user) {
     const url = request.nextUrl.clone()
     url.pathname = '/dashboard'
     const redirectResponse = NextResponse.redirect(url)
     
     // COPY cookies here too
     const allCookies = supabaseResponse.cookies.getAll()
     allCookies.forEach((cookie) => {
       redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
     })
     
     return redirectResponse
  }

  // 5. Return the original response (which contains the session cookies)
  return supabaseResponse
}