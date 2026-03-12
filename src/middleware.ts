import { NextRequest, NextResponse } from "next/server"

const PROTECTED = ["/dashboard", "/reward"]
const AUTH_ONLY = ["/login"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  const isAuthPage  = AUTH_ONLY.some((p) => pathname.startsWith(p))

  // Baca cookie session yang kita set sendiri
  const session = req.cookies.get("grdystem_session")?.value

  // Kalau akses halaman protected tanpa session → redirect ke /login
  if (isProtected && !session) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Kalau sudah punya session tapi buka /login → redirect ke /dashboard
  if (isAuthPage && session) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/reward/:path*", "/login"],
}