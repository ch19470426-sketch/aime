import { NextRequest, NextResponse } from 'next/server'
import { exigirGestor } from '@/lib/autorizacao'
import { concederCreditos } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const acesso = await exigirGestor(request)
    if (acesso.ok === false) return acesso.resposta

    const { cpf, qde } = await request.json()
    if (!cpf || !qde || qde % 600 !== 0) {
      return NextResponse.json({ erro: 'Quantidade deve ser múltiplo de 600.' }, { status: 400 })
    }

    // Mesma regra de qualquer avulso (src/lib/creditos.ts): vai para o contrato CORRENTE, acumula num
    // saldo só e vale 90 dias a partir desta entrada. Antes esta rota tinha uma cópia da lógica, com o
    // mesmo problema de escolher "o mais recente" só pela data de início.
    const r = await concederCreditos(cpf, 'AVULSO', qde)
    if (!r.ok) return NextResponse.json({ erro: r.erro ?? 'Não foi possível adicionar o avulso.' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
