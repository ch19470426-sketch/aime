export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/auth-criar-conta/route.ts
// AIMÊ — Cria a conta de autenticação (Supabase Auth) já confirmada, via API
// administrativa (service role). Evita depender do toggle "Confirm email" do
// painel e não dispara nenhum e-mail — resolve o rate limit de e-mails também.
//
// SEGURANÇA (corrigido em 28/09/2026)
// Esta rota é pública por natureza (o primeiro acesso ainda não tem sessão).
// Antes, quando a conta já existia, ela TROCAVA A SENHA pela enviada — e a
// tela de login a chamava toda vez que a senha digitada estava errada. Na
// prática, quem soubesse o CPF de um usuário entrava como ele com uma senha
// qualquer (inclusive gestor). Agora:
//   * conta ATIVA (existe no Auth E tem cadastro em `inspetor`): nunca tem a
//     senha alterada por aqui — devolve 409. Quem esqueceu a senha usa a
//     recuperação por e-mail (/api/recuperar-senha).
//   * conta ÓRFÃ (existe no Auth, mas o cadastro nunca foi concluído): a senha
//     pode ser redefinida, para quem abandonou o primeiro acesso poder retomar.
//     Não é ganho novo para um invasor: registrar um CPF livre já é possível.
//   * sem conta no Auth: cria (inclusive o caso de conta apagada no painel).
//   * o e-mail precisa ser "<11 dígitos>@aime-app.com.br" (o formato que o
//     login usa); antes aceitava qualquer e-mail.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL_TECNICO = /^(\d{11})@aime-app\.com\.br$/

// Senha segura: mínimo 8 caracteres, pelo menos 1 letra, 1 número e 1 caractere especial
function senhaForte(p: string): boolean {
  return p.length >= 8 && /[A-Za-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)
}

function contaJaExiste(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const code = String(error.code ?? '')
  const msg = String(error.message ?? '').toLowerCase()
  return code === 'email_exists' || code === 'user_already_exists' ||
    msg.includes('already been registered') || msg.includes('already exists')
}

/** Procura o usuário do Auth pelo e-mail, percorrendo todas as páginas. */
async function acharUsuarioAuth(email: string): Promise<{ id: string } | null> {
  const porPagina = 1000
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: porPagina })
    if (error) return null
    const usuarios = data?.users ?? []
    const achado = usuarios.find((u: { email?: string }) => (u.email ?? '').toLowerCase() === email)
    if (achado) return { id: (achado as { id: string }).id }
    if (usuarios.length < porPagina) return null
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { email: emailBruto, password } = await request.json()
    if (!emailBruto || !password) {
      return NextResponse.json({ erro: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }
    const email = String(emailBruto).trim().toLowerCase()
    const formato = EMAIL_TECNICO.exec(email)
    if (!formato) {
      return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 })
    }
    const cpf = formato[1]

    if (!senhaForte(String(password))) {
      return NextResponse.json({ erro: 'A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra, um número e um caractere especial.' }, { status: 400 })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // já nasce confirmada, sem precisar de link por e-mail
    })

    if (!error) {
      return NextResponse.json({ ok: true, id: data.user?.id })
    }

    if (!contaJaExiste(error)) {
      return NextResponse.json({ erro: error.message }, { status: 400 })
    }

    // A conta já existe no Auth. Só uma conta ÓRFÃ (sem cadastro concluído)
    // pode ter a senha redefinida por esta rota pública.
    const { data: cadastro, error: errCadastro } = await supabase
      .from('inspetor').select('cpf_inspetor').eq('cpf_inspetor', cpf).maybeSingle()

    // Na dúvida, NÃO mexe na senha (o inverso significaria entregar a conta).
    if (errCadastro) {
      return NextResponse.json({ erro: 'Não foi possível concluir agora. Tente novamente.' }, { status: 503 })
    }
    if (cadastro) {
      return NextResponse.json(
        { erro: 'Esta conta já existe. Se esqueceu a senha, use "Esqueci minha senha".', codigo: 'conta_existente' },
        { status: 409 }
      )
    }

    const existente = await acharUsuarioAuth(email)
    if (!existente) {
      return NextResponse.json({ erro: 'Não foi possível concluir agora. Tente novamente.' }, { status: 503 })
    }
    const { error: errUpdate } = await supabase.auth.admin.updateUserById(existente.id, { password })
    if (errUpdate) return NextResponse.json({ erro: errUpdate.message }, { status: 400 })
    return NextResponse.json({ ok: true, id: existente.id, retomada: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
