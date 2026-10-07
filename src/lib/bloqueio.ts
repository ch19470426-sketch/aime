// src/lib/bloqueio.ts
// AIMÊ — Bloqueio de conta (decisão de Celso, 07/10/2026).
//
// Quando bloquear:
//   - estorno ou chargeback de um pagamento: revoga o saldo restante dessa compra, esquece o que já
//     foi usado e bloqueia a conta;
//   - cartão da assinatura recusado em 3 cobranças SEGUIDAS: bloqueia a conta.
// Conta bloqueada: não inicia serviços e não contrata créditos; o menu mostra a tela "Conta bloqueada".
// Só o gestor desbloqueia (Painel do Gestor, aba "Contas bloqueadas"). Gestor nunca é bloqueado.
//
// Leitura NUNCA bloqueia por engano: se não der para consultar o banco, a conta é tratada como livre.

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { avisarInspetor } from '@/lib/assinaturas'
import { LIMITE_FALHAS_CARTAO, TEXTO_MOTIVO } from '@/lib/textosBloqueio'
import { EMAIL_SUPORTE, REMETENTE_SUPORTE, montarEmailSimples, type BlocoEmail } from '@/lib/emailSuporte'

export { LIMITE_FALHAS_CARTAO, TEXTO_MOTIVO }
export type MotivoBloqueio = 'estorno' | 'chargeback' | 'cartao_recusado'

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function contaBloqueada(cpf: string): Promise<{ bloqueada: boolean; motivo?: string }> {
  try {
    const { data, error } = await admin().from('inspetor').select('conta_bloqueada,bloqueio_motivo').eq('cpf_inspetor', cpf).maybeSingle()
    if (error || !data) return { bloqueada: false }
    return data.conta_bloqueada === true ? { bloqueada: true, motivo: data.bloqueio_motivo ?? undefined } : { bloqueada: false }
  } catch { return { bloqueada: false } }
}

/** Avisa a equipe (suporte@aime.eng.br). Melhor esforço: falha de e-mail nunca derruba o processamento. */
export async function avisarSuporte(assunto: string, blocos: BlocoEmail[]): Promise<void> {
  try {
    const email = montarEmailSimples({ blocos, assinatura: false })
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: REMETENTE_SUPORTE, to: EMAIL_SUPORTE, subject: assunto, html: email.html, text: email.text,
    })
    if (error) console.error('[bloqueio] o Resend recusou o aviso ao suporte:', error)
  } catch (e) { console.error('[bloqueio] falha ao avisar o suporte:', e) }
}

/**
 * Bloqueia a conta. Idempotente (só age se ainda não estava bloqueada) e nunca bloqueia gestor.
 * Avisa o inspetor e a equipe.
 */
export async function bloquearConta(cpf: string, motivo: MotivoBloqueio, detalhe = ''): Promise<{ bloqueou: boolean; gestor?: boolean }> {
  const supabase = admin()
  const { data: insp } = await supabase.from('inspetor').select('nome_inspetor,is_gestor').eq('cpf_inspetor', cpf).maybeSingle()
  if (insp?.is_gestor === true) {
    await avisarSuporte('AIMÊ — Estorno ou falha de pagamento em conta de gestor (NÃO bloqueada)', [
      { tipo: 'p', texto: `A conta de gestor ${insp.nome_inspetor ?? ''} (CPF ${cpf}) teve o motivo "${motivo}". Gestor não é bloqueado automaticamente.` },
      ...(detalhe ? [{ tipo: 'p' as const, texto: detalhe }] : []),
    ])
    return { bloqueou: false, gestor: true }
  }
  const { data: mudou, error } = await supabase.from('inspetor')
    .update({ conta_bloqueada: true, bloqueio_motivo: motivo, bloqueio_em: new Date().toISOString() })
    .eq('cpf_inspetor', cpf).eq('conta_bloqueada', false).select('cpf_inspetor')
  if (error) throw new Error(`não foi possível bloquear a conta: ${error.message}`)
  if (!mudou || mudou.length === 0) return { bloqueou: false }   // já estava bloqueada (ou o CPF não existe)

  await avisarInspetor(cpf, 'AIMÊ — Sua conta foi bloqueada', [
    { tipo: 'p', texto: `Sua conta no AIMÊ foi bloqueada. ${TEXTO_MOTIVO[motivo] ?? ''}` },
    { tipo: 'p', texto: 'Enquanto estiver bloqueada, não é possível iniciar serviços nem contratar créditos.' },
    { tipo: 'p', texto: `Para regularizar, fale com a nossa equipe: ${EMAIL_SUPORTE}.` },
  ])
  await avisarSuporte(`AIMÊ — Conta bloqueada: ${insp?.nome_inspetor ?? cpf}`, [
    { tipo: 'p', texto: `Conta bloqueada automaticamente: ${insp?.nome_inspetor ?? ''} (CPF ${cpf}).` },
    { tipo: 'p', texto: `Motivo: ${TEXTO_MOTIVO[motivo] ?? motivo}` },
    ...(detalhe ? [{ tipo: 'p' as const, texto: detalhe }] : []),
    { tipo: 'p', texto: 'Para liberar: Painel do Gestor, aba "Contas bloqueadas".' },
  ])
  return { bloqueou: true }
}

/** Desbloqueia (só o gestor chama). Zera as falhas de cartão das assinaturas, para começar do zero. */
export async function desbloquearConta(cpf: string): Promise<boolean> {
  const supabase = admin()
  const { data, error } = await supabase.from('inspetor')
    .update({ conta_bloqueada: false, bloqueio_motivo: null, bloqueio_em: null })
    .eq('cpf_inspetor', cpf).eq('conta_bloqueada', true).select('cpf_inspetor')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return false
  await supabase.from('assinaturas').update({ falhas_payment_ids: [] }).eq('cpf_inspetor', cpf)
  await avisarInspetor(cpf, 'AIMÊ — Sua conta foi liberada', [
    { tipo: 'p', texto: 'Sua conta no AIMÊ foi liberada e você já pode voltar a usar o aplicativo.' },
  ])
  return true
}
