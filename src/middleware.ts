import { NextRequest, NextResponse } from 'next/server'

const BETA_EXPIRA = new Date('2026-09-30T23:59:59-03:00') // 30/09/2026 meia-noite horário de Brasília

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Não bloquear: a própria tela de expiração, assets e APIs internas
  if (
    pathname === '/beta-encerrado' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/capa')
  ) {
    return NextResponse.next()
  }

  if (new Date() > BETA_EXPIRA) {
    return NextResponse.redirect(new URL('/beta-encerrado', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
