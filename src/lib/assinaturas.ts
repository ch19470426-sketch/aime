// src/lib/assinaturas.ts
// AIMÊ — Apoio às assinaturas mensais (PLANO MENSAL / PLANO ESCRITÓRIO).
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { REMETENTE_SUPORTE, montarEmailSimples, type BlocoEmail } from '@/lib/emailSuporte'

/** Só estes planos podem ser assinados; Serviço e Avulso são sempre compra única. */
export const TIPOS_ASSINAVEIS = ['PLANO MENSAL', 'PLANO ESCRITÓRIO']
export const STATUS_EM_ANDAMENTO = ['aguardando_primeiro_pagamento', 'ativa', 'inadimplente']

/** Data de hoje em Brasília, 'AAAA-MM-DD' (o Asaas conta o vencimento nesse fuso). */
export function hojeBrasilia(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/** 'AAAA-MM-DD' -> mesmo dia do mês seguinte (31/01 -> 28 ou 29/02). */
export function somarUmMes(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const alvoMes = m === 12 ? 1 : m + 1
  const alvoAno = m === 12 ? a + 1 : a
  const ultimoDia = new Date(alvoAno, alvoMes, 0).getDate()
  return `${alvoAno}-${String(alvoMes).padStart(2, '0')}-${String(Math.min(d, ultimoDia)).padStart(2, '0')}`
}

/** 'AAAA-MM-DD' -> 'DD/MM/AAAA'. */
export function dataBR(iso?: string | null): string {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/**
 * Avisa o inspetor por e-mail (texto simples, assinatura da equipe). Melhor
 * esforço: falha de e-mail NUNCA derruba o processamento do pagamento.
 */
export async function avisarInspetor(cpf: string, assunto: string, blocos: BlocoEmail[]): Promise<void> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await supabase.from('inspetor').select('inspetor_email').eq('cpf_inspetor', cpf).maybeSingle()
    const para = String(data?.inspetor_email ?? '').trim()
    if (!para) return
    const email = montarEmailSimples({ blocos, assinatura: true })
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: REMETENTE_SUPORTE, to: para, subject: assunto, html: email.html, text: email.text,
    })
    if (error) console.error('[assinatura] o Resend recusou o aviso ao inspetor:', error)
  } catch (e) {
    console.error('[assinatura] falha ao avisar o inspetor:', e)
  }
}
