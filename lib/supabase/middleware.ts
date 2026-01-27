import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Missing Supabase environment variables")
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure cookies work across domains
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: true,
            })
          })
        },
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            signal: undefined,
          })
        },
      },
    })

    // Check if path requires authentication
    const requiresAuth = 
      request.nextUrl.pathname !== "/" &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/_next") &&
      !request.nextUrl.pathname.startsWith("/favicon") &&
      !request.nextUrl.pathname.startsWith("/api") &&
      !request.nextUrl.pathname.startsWith("/images") &&
      !request.nextUrl.pathname.startsWith("/manifest") &&
      !request.nextUrl.pathname.endsWith(".ico") &&
      !request.nextUrl.pathname.endsWith(".png") &&
      !request.nextUrl.pathname.endsWith(".svg")

    if (requiresAuth) {
      // Skip auth check for v0 preview
      const isV0Preview = request.nextUrl.hostname.includes("vusercontent.net")
      if (!isV0Preview) {
        try {
          // First try to get session from cookie (faster)
          const {
            data: { session },
          } = await supabase.auth.getSession()

          // If no session, try getUser as fallback
          if (!session) {
            const {
              data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
              const url = request.nextUrl.clone()
              url.pathname = "/auth/login"
              return NextResponse.redirect(url)
            }
          }
        } catch (authError: any) {
          // Handle AbortError silently - request was cancelled
          if (authError.name === "AbortError") {
            return supabaseResponse
          }
          
          // For network errors or timeouts, allow access to prevent blocking users
          if (authError.message?.includes("fetch") || authError.message?.includes("network")) {
            console.warn("[v0] Network error during auth check, allowing request to proceed")
            return supabaseResponse
          }
          
          // For other errors, redirect to login
          console.error("[v0] Auth error:", authError.message || authError)
          const url = request.nextUrl.clone()
          url.pathname = "/auth/login"
          return NextResponse.redirect(url)
        }
      }
    }

    return supabaseResponse
  } catch (error: any) {
    // Don't log AbortErrors
    if (error.name !== "AbortError") {
      console.error("[v0] Middleware error:", error.message || error)
    }
    // On any middleware error, allow request to proceed
    return NextResponse.next({
      request,
    })
  }
}
