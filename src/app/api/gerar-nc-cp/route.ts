// src/app/api/gerar-nc-cp/route.ts
// AIMÊ — Geração de NC e CP por IA conforme especificação 2.6

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { GerarNcCpRequest, GerarNcCpResponse } from '@/types/vistoria-types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

function limparSistema(sistema: string): string {
  return sistema.replace(/^\d{2,3}[_\s\-]+/, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body: GerarNcCpRequest = await request.json()
    const { sistema, subsistema, anomalia, local, complemento, origem, abrangencia } = body

    if (!sistema || !subsistema || !anomalia || !local || !origem || !abrangencia) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios ausentes: sistema, subsistema, anomalia, local, origem, abrangencia' },
        { status: 400 }
      )
    }

    const sistemaLimpo  = limparSistema(sistema)
    const localCompleto = complemento ? `${local} – ${complemento}` : local

    const promptNC = `Como engenheiro diagnóstico especialista em patologia e atuando nas áreas de edificações; elétrica; máquinas e equipamentos; caldeiras, vasos sob pressão e tubulações, que utilizará apenas critérios previstos em normas técnicas e ao conteúdo das variáveis apresentadas a seguir, descreva, com linguagem técnica a "Não conformidade" correspondente a combinação das variáveis: "Sistema", "Subsistema", "Anomalia", e "Local + Complemento". Entenda que "Não conformidade" descreve objetivamente a manifestação patológica identificada durante a vistoria, sem indicar causa provável, solução ou recomendação. A descrição da "Não conformidade" deve ser objetiva, em até duas frases com o máximo de 200 caracteres, sem justificativa e respeitando as regras sintáticas de português, incluindo pontuação. A resposta deverá ser apresentada na variável "Não conformidade", e esta será revisada por um engenheiro, antes de ser inserida no laudo final.

Sistema: ${sistemaLimpo}
Subsistema: ${subsistema}
Anomalia: ${anomalia}
Local + Complemento: ${localCompleto}

Responda APENAS com JSON válido, sem markdown, sem texto adicional:
{"nao_conformidade": "texto aqui"}`

    const promptCP = `Como engenheiro diagnóstico especialista em patologia e atuando nas áreas de edificações; elétrica; máquinas e equipamentos; caldeiras, vasos sob pressão e tubulações, que utilizará apenas critérios previstos em normas técnicas e ao conteúdo das variáveis apresentadas a seguir, descreva, com linguagem técnica a "Causa provável" correspondente a combinação das variáveis: "Sistema", "Subsistema", "Anomalia", "Origem" e "Abrangência". Entenda que "Causa provável" descreve o mecanismo, agente ou condição que provavelmente originou a manifestação patológica identificada na vistoria, evitando descrever a Não conformidade. A descrição da "Causa provável" deve ser objetiva, em até duas frases com o máximo de 200 caracteres, sem justificativa e respeitando as regras sintáticas de português, incluindo pontuação. A resposta deverá ser apresentada na variável "Causa provável", e esta será revisada por um engenheiro, antes de ser inserida no laudo final.

Sistema: ${sistemaLimpo}
Subsistema: ${subsistema}
Anomalia: ${anomalia}
Origem: ${origem}
Abrangência: ${abrangencia}

Responda APENAS com JSON válido, sem markdown, sem texto adicional:
{"causa_provavel": "texto aqui"}`

    const [resNC, resCP] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: promptNC }],
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: promptCP }],
      }),
    ])

    const extrairTexto = (blocks: Anthropic.ContentBlock[]): string =>
      blocks
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('')
        .replace(/```json|```/g, '')
        .trim()

    let nc = ''
    let cp = ''

    try { nc = JSON.parse(extrairTexto(resNC.content)).nao_conformidade ?? '' }
    catch { nc = extrairTexto(resNC.content) }

    try { cp = JSON.parse(extrairTexto(resCP.content)).causa_provavel ?? '' }
    catch { cp = extrairTexto(resCP.content) }

    return NextResponse.json({ nc, cp } as GerarNcCpResponse)

  } catch (error) {
    console.error('[gerar-nc-cp] Erro:', error)
    return NextResponse.json(
      { erro: 'Erro interno ao gerar NC/CP. Verifique a chave ANTHROPIC_API_KEY.' } as GerarNcCpResponse,
      { status: 500 }
    )
  }
}
