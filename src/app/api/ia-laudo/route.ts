// src/app/api/ia-laudo/route.ts
// AIMÊ — Geração de textos do laudo via Claude API

import { NextRequest, NextResponse } from 'next/server'

const TIPO_LAUDO: Record<string, string> = {
  '41': 'Laudo de Autovistoria (NBR 16.747/2020)',
  '42': 'Laudo de Inspeção Predial (NBR 16.747/2020)',
  '43': 'Laudo de Imóvel Novo (NBR 15.575 + NBR 16.747)',
  '44': 'Laudo de Inspeção de Fachada (NBR 13.755)',
}

export async function POST(request: NextRequest) {
  try {
    const { tipo, dados } = await request.json()

    let prompt = ''

    // ── Prompt 1: Síntese da edificação ──────────────────────────────────────
    if (tipo === 'sintese_edificacao') {
      const d = dados
      const textoBase = d.texto_inspetor ? `

TEXTO DIGITADO PELO INSPETOR (use como base principal):
${d.texto_inspetor}` : ''

      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija uma síntese técnica da edificação/estabelecimento.${textoBase}

DADOS COMPLEMENTARES:
- Razão social / Nome: ${d.razao_social || 'não informado'}
- Denominação oficial: ${d.nome_convencao || 'não informado'}
- Uso do imóvel: ${d.uso || 'não informado'}
- Tipo do imóvel: ${d.tipo || 'não informado'}
- Número de pavimentos: ${d.pavimentos || 'não informado'}
- Número de unidades/salas: ${d.unidades || 'não informado'}
- Área construída: ${d.area_construida || 'não informada'} m²
- Área do terreno: ${d.area_terreno || 'não informada'} m²

INSTRUÇÕES:
- Se houver texto do inspetor, use-o como base principal e melhore a redação técnica mantendo o conteúdo original
- Se não houver texto do inspetor, gere a síntese com base nos dados complementares
- Linguagem técnica formal, terceira pessoa, texto corrido sem listas
- NÃO mencione datas, vistoria ou como o trabalho foi realizado
- NÃO inclua endereço
- Máximo de 900 caracteres`

    // ── Prompt 2: Descrição da vistoria ──────────────────────────────────────
    } else if (tipo === 'descricao_vistoria') {
      const d = dados
      const nomeLaudo = TIPO_LAUDO[d.tipo_servico] ?? 'Laudo Técnico'
      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija a descrição da realização da vistoria técnica para o item 3.1 de um ${nomeLaudo}.

NÍVEL DA INSPEÇÃO REALIZADA: ${d.nivel_inspecao || 'não informado'}

INFORMAÇÕES DO INSPETOR SOBRE A REALIZAÇÃO DA VISTORIA:
${d.informacoes}

INSTRUÇÕES:
- Redija em linguagem técnica formal, em primeira pessoa do plural (nós)
- Descreva APENAS como a vistoria foi realizada: metodologia, percurso, condições climáticas, acompanhantes, acesso às áreas, intercorrências
- NÃO descreva características da edificação — apenas a execução da vistoria
- Mencione o nível da inspeção realizada
- Máximo de 900 caracteres
- Texto corrido, sem marcadores ou listas
- Tom profissional e objetivo`

    // ── Prompt SNC: Solução Não Conformidade ────────────────────────────────
    } else if (tipo === 'solucao_nc') {
      const d = dados
      // Remove os 3 primeiros chars do sistema (ex: "01_")
      const sistemaLimpo = (d.sistema || '').slice(3).replace(/_/g,' ')
      prompt = `Você é um engenheiro diagnóstico especialista em patologia de edificações. Utilizando apenas critérios previstos em normas técnicas, descreva a "Solução Não Conformidade" correspondente às variáveis abaixo.

SISTEMA: ${sistemaLimpo}
SUBSISTEMA: ${d.subsistema || ''}
LOCAL / COMPLEMENTO: ${d.local || ''}${d.complemento ? ' — ' + d.complemento : ''}
NÃO CONFORMIDADE: ${d.nc || d.anomalia || ''}
CAUSA PROVÁVEL: ${d.cp || ''}

INSTRUÇÕES:
- A solução indica a medida técnica necessária para eliminar ou mitigar a origem da manifestação patológica
- Indique a ação corretiva e o insumo a utilizar, considerando a abrangência do dano
- Máximo de 200 caracteres, em até duas frases
- Linguagem técnica objetiva, sem justificativa
- Respeite as regras sintáticas do português, incluindo pontuação
- Não inclua prefixos como "Solução:" ou numeração`

    // ── Prompt 3: Recomendações ───────────────────────────────────────────────
    } else if (tipo === 'recomendacoes') {
      const d = dados
      const nomeLaudo = TIPO_LAUDO[d.tipo_servico] ?? 'Laudo Técnico'
      const ncsTexto = (d.ncs as any[] ?? []).map((nc: any) =>
        `Sistema: ${nc.sistema} | Anomalia: ${nc.anomalia} | Local: ${nc.local} | GR: ${nc.grauRisco} | Prioridade: ${nc.prioridade}`
      ).join('\n')
      const classif = d.classificacao
      const dataHab = d.data_habite_se
      const idadeAnos = dataHab
        ? Math.floor((Date.now() - new Date(dataHab).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null

      const ehNR_IA = ['45','46','47','48'].includes(d.tipo_servico ?? '')
      prompt = `Você é um engenheiro de inspeção técnica experiente. Redija as recomendações do item 5 de um ${nomeLaudo}.

CLASSIFICAÇÃO DA EDIFICAÇÃO:
- Nível da inspeção: ${classif?.nivel ?? 'não informado'}
- Grau de risco: ${classif?.risco ?? 'não informado'}
- Desempenho: ${classif?.desempenho ?? 'não informado'}
- Qualidade da manutenção: ${classif?.manut ?? 'não informado'}
- Condições de uso: ${classif?.uso ?? 'não informado'}
- Desempenho geral: ${classif?.desempGeral ?? 'não informado'}
${idadeAnos !== null ? `- Idade da edificação: aproximadamente ${idadeAnos} anos` : ''}

NÃO CONFORMIDADES (prioridade Alta e Média apenas):
${ncsTexto || 'Nenhuma NC de prioridade Alta ou Média identificada.'}

INSTRUÇÕES:
${ehNR_IA ? `Gere 5 textos em linguagem técnica formal para inspeção NR. Responda SOMENTE em JSON, sem markdown:
{"rec51":"recomendações sobre manutenção das instalações","rec52":"recomendações sobre operação segura","rec53":"recomendações sobre condições físicas dos equipamentos","rec54":"recomendações sobre segurança e dispositivos de proteção","rec55":"recomendações sobre documentação técnica e prontuários"}
Cada campo deve ter entre 150-500 chars. Baseie-se APENAS nos dados fornecidos.` : `Gere 4 textos em linguagem técnica formal. Responda SOMENTE em JSON, sem markdown:
{"rec51":"avaliação e recomendações da manutenção","rec52":"avaliação e recomendações do uso da edificação","rec53":"avaliação e recomendações da sustentabilidade","rec54":"outras avaliações e recomendações pertinentes"}
Cada campo deve ter entre 200-600 chars. Baseie-se APENAS nos dados fornecidos.`}`

    // ── Prompt 4: Recomendação por sistema (item 4.1) ─────────────────────────
    } else if (tipo === 'recomendacao_sistema') {
      const d = dados
      const ncsTexto = (d.ncs as any[] ?? []).map((nc: any) =>
        `Anomalia: ${nc.anomalia} | Local: ${nc.local} | GR: ${nc.grauRisco}`
      ).join('\n')
      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija uma recomendação técnica para o sistema construtivo indicado.

SISTEMA CONSTRUTIVO: ${d.sistema}
NÃO CONFORMIDADES IDENTIFICADAS:
${ncsTexto}

INSTRUÇÕES:
- Recomendação técnica objetiva para este sistema, baseada APENAS nas NCs listadas
- Linguagem técnica formal, texto corrido
- Máximo de 400 caracteres
- Não acrescente problemas não identificados na vistoria`

    } else {
      return NextResponse.json({ erro: 'Tipo de prompt inválido' }, { status: 400 })
    }

    // ── Chamada à API Claude ──────────────────────────────────────────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      })
    })

    const data = await response.json()
    // Verificar erro da API Anthropic
    if (data.error) {
      console.error('Anthropic API error:', JSON.stringify(data.error))
      return NextResponse.json({ erro: 'Erro da API IA: ' + (data.error.message || JSON.stringify(data.error)) }, { status: 500 })
    }
    if (!response.ok) {
      return NextResponse.json({ erro: 'API IA retornou status ' + response.status + ': ' + JSON.stringify(data) }, { status: 500 })
    }
    const textoRaw = data.content?.map((c: any) => c.text || '').join('') ?? ''
    // Remover formatação markdown que a IA pode incluir
    const texto = textoRaw
      .replace(/^#{1,6}\s+/gm, '')   // remove ## headings
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // remove **bold**
      .replace(/\*([^*]+)\*/g, '$1')      // remove *italic*
      .replace(/^[-•]\s+/gm, '')          // remove bullet points
      .trim()

    // Para recomendações, parsear JSON
    if (tipo === 'recomendacoes') {
      try {
        const clean = texto.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ erro: 'Erro ao parsear recomendações da IA.' }, { status: 500 })
      }
    }

    return NextResponse.json({ texto: texto.trim() })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
