// src/proxy.ts (no Next 16 o antigo middleware.ts se chama proxy.ts)
// AIMÊ — Compatibilidade da URL antiga do cadastro: /inspetor?cpf=<CPF>&aba=plano. O CPF não pode ficar na URL (histórico do navegador, registros do servidor e
// ferramentas de análise guardam o endereço inteiro). O redirecionamento é feito aqui, NO SERVIDOR, antes de a tela carregar, e o CPF informado é IGNORADO:
// a tela identifica o usuário pela sessão. O gestor vendo o cadastro de outro inspetor (visualizar=1) não passa por aqui (Fase 2).
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  if (pathname === '/inspetor' && searchParams.has('cpf') && searchParams.get('visualizar') !== '1') {
    const destino = req.nextUrl.clone()
    destino.search = ''
    if (searchParams.get('aba') === 'plano') {
      destino.pathname = '/meu-plano'
    } else {
      destino.pathname = '/meu-cadastro'
      if (searchParams.get('novo') === '1') destino.searchParams.set('novo', '1')
      if (searchParams.get('gestor') === '1') destino.searchParams.set('gestor', '1')
    }
    return NextResponse.redirect(destino)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/inspetor'] }
