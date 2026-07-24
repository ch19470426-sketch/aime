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
      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija uma síntese objetiva da edificação para o item 1.1 de um laudo técnico.

DADOS DA EDIFICAÇÃO:
- Razão social / Nome: ${d.razao_social || 'não informado'}
- Denominação oficial (convenção/escritura): ${d.nome_convencao || 'não informado'}
- Uso do imóvel: ${d.uso || 'não informado'}
- Tipo do imóvel: ${d.tipo || 'não informado'}
- Número de pavimentos: ${d.pavimentos || 'não informado'}
- Número de unidades/salas: ${d.unidades || 'não informado'}
- Área construída: ${d.area_construida || 'não informada'} m²
- Área do terreno: ${d.area_terreno || 'não informada'} m²
- Nome do responsável: ${d.responsavel || 'não informado'}
- Função do responsável: ${d.funcao || 'não informada'}
- Nível da inspeção: ${d.nivel_inspecao || 'não informado'}

INSTRUÇÕES:
- Redija em linguagem técnica formal, em terceira pessoa
- Use a denominação oficial quando informada, caso contrário use a razão social
- Descreva obrigatoriamente: uso, tipo, número de pavimentos, quantidade de unidades/salas, área construída e área do terreno — mesmo que sejam os únicos dados disponíveis
- Se algum dado não foi informado, omita esse item da síntese
- Máximo de 900 caracteres
- Não inclua endereço
- Não use marcadores ou listas — texto corrido`

    // ── Prompt 2: Descrição da vistoria ──────────────────────────────────────
    } else if (tipo === 'descricao_vistoria') {
      const d = dados
      const nomeLaudo = TIPO_LAUDO[d.tipo_servico] ?? 'Laudo Técnico'
      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija a descrição da realização da vistoria técnica para o item 3.1 de um ${nomeLaudo}.

NÍVEL DA INSPEÇÃO: ${d.nivel_inspecao || 'não informado'}

INFORMAÇÕES FORNECIDAS PELO INSPETOR:
${d.informacoes}

INSTRUÇÕES:
- Redija em linguagem técnica formal, em primeira pessoa do plural (nós)
- Descreva como foi realizada a vistoria: condições, metodologia empregada, acompanhantes, acesso
- Máximo de 900 caracteres
- Texto corrido, sem marcadores ou listas
- Tom profissional e objetivo`

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

      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija as recomendações do item 5 de um ${nomeLaudo}.

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
Gere 4 textos independentes em linguagem técnica formal. Responda SOMENTE em JSON válido, sem markdown:
{
  "rec51": "Avaliação e recomendações da manutenção (baseadas nas NCs e na qualidade de manutenção classificada)",
  "rec52": "Avaliação e recomendações do uso da edificação (baseadas nas condições de uso classificadas)",
  "rec53": "Avaliação e recomendações da sustentabilidade (baseadas no desempenho e nas NCs identificadas)",
  "rec54": "Outras avaliações e recomendações pertinentes (considerações finais adicionais)"
}
Cada texto deve ter entre 200 e 600 caracteres. Base-se APENAS nos dados fornecidos.`

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
    const texto = data.content?.map((c: any) => c.text || '').join('') ?? ''

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
