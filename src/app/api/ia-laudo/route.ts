export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { tipo, dados } = await request.json()
    let prompt = ''
    const d = dados ?? {}

    if (tipo === 'sintese_edificacao') {
      const textoBase = d.texto_inspetor ? `\n\nTEXTO DIGITADO PELO INSPETOR (use como base principal):\n${d.texto_inspetor}` : ''
      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija uma síntese técnica da edificação/estabelecimento.${textoBase}\n\nDADOS DO ESTABELECIMENTO/EDIFICAÇÃO:\n- Razão social / Nome: ${d.razao_social || 'não informado'}\n- Denominação oficial: ${d.nome_convencao || 'não informado'}\n- Uso do imóvel/estabelecimento: ${d.uso_estabelecimento || d.uso || 'não informado'}\n- Tipo do imóvel: ${d.tipo_imovel || d.tipo || 'não informado'}\n- Número de pavimentos: ${d.pavimentos || 'não informado'}\n- Número de unidades/salas: ${d.unidades || 'não informado'}\n- Área construída: ${d.area_construida || 'não informada'} m²\n- Área do terreno: ${d.area_terreno || 'não informada'} m²\n- Fabricante/marca: ${d.fabricante || 'não informado'}\n- Subtipo: ${d.subtipo || 'não informado'}\n- Capacidade/potência: ${d.capacidade || 'não informado'}\n\nINSTRUÇÕES:\n- Se houver texto do inspetor, use-o como base principal e melhore a redação técnica mantendo o conteúdo original\n- Se não houver texto do inspetor, gere a síntese com base nos dados complementares\n- Linguagem técnica formal, terceira pessoa, texto corrido sem listas\n- NÃO mencione datas, vistoria ou como o trabalho foi realizado\n- NÃO inclua endereço\n- Máximo de 900 caracteres\n- NÃO inclua título, cabeçalho ou prefixo como 'SÍNTESE TÉCNICA DA EDIFICAÇÃO' — apenas o texto da síntese diretamente`

    } else if (tipo === 'descricao_vistoria') {
      prompt = `Você é um engenheiro técnico especialista em inspeção predial. Redija a descrição da realização da vistoria técnica com base nos dados fornecidos.\n\nDADOS:\n- Tipo de serviço: ${d.tipo_servico || ''}\n- Edificação/Estabelecimento: ${d.razao_social || ''}\n- Data da vistoria: ${d.data_vistoria || ''}\n- Nível de inspeção: ${d.nivel_inspecao || ''}\n- Sistemas vistoriados: ${d.sistemas || ''}\n- Inspetor: ${d.nome_inspetor || ''}\n\nINSTRUÇÕES:\n- Máximo 600 caracteres\n- Linguagem técnica formal, terceira pessoa\n- Não inclua o prefixo '3.1 Realização da Vistoria Técnica' — apenas o texto`

    } else if (tipo === 'solucao_nc') {
      const sistemaLimpo = (d.sistema || '').slice(3).replace(/_/g,' ')
      prompt = `Você é um engenheiro diagnóstico especialista em patologia de edificações. Utilizando critérios previstos em normas técnicas brasileiras, proponha uma solução técnica objetiva para a seguinte não conformidade:\n\nSISTEMA: ${sistemaLimpo}\nSUBSISTEMA: ${d.subsistema || ''}\nANOMALIA: ${d.anomalia || d.nc || ''}\nLOCAL: ${d.local || ''}\nCOMPLEMENTO: ${d.complemento || ''}\nGRAU DE RISCO: ${d.grauRisco || ''}\nPRIORIDADE: ${d.prioridade || ''}\n\nRESPOSTA: Apresente a solução técnica em até 3 frases objetivas, máximo 320 caracteres, sem título ou prefixo.`

    } else if (tipo === 'procedimento_corretivo') {
      // Prompt PC — Plano de Manutenção
      const sistemaLimpo = (d.sistema_vistoria || d.sistema || '').replace(/^\d+[-_]/,'').replace(/_/g,' ').trim()
      const focoNR = ['55','56','57','58'].includes(String(d.tipo_servico || ''))
      const foco = focoNR
        ? 'segurança do trabalho e conformidade regulatória, correção ou eliminação da não conformidade do requisito regulatório'
        : 'patologia construtiva, correção física do dano apurado na vistoria'
      prompt = `Como engenheiro diagnóstico, especialista em patologia e atuando na área de edificações, utilizando apenas critérios previstos em normas técnicas e ao conteúdo das variáveis apresentadas a seguir, descreva com linguagem técnica o "Procedimento corretivo" correspondente à combinação das variáveis abaixo. O foco deve ser em ${foco}.\n\nSISTEMA: ${sistemaLimpo}\nSUBSISTEMA: ${d.subsistema_vistoria || d.subsistema || ''}\nLOCAL + COMPLEMENTO: ${d.local_ocorrencia || ''} ${d.complemento_local || ''}\nNÃO CONFORMIDADE: ${d.descricao_nao_conformidade || d.nc || ''}\nCAUSA PROVÁVEL: ${d.descricao_causa_provavel || d.cp || ''}\nSOLUÇÃO NÃO CONFORMIDADE: ${d.descricao_solucao_nc || d.solucao || ''}\n\nRESPOSTA: Descreva resumidamente os serviços técnicos necessários para correção da não conformidade. Máximo 3 frases, 320 caracteres, sem título ou prefixo, respeitando as regras sintáticas do português.`

    } else if (tipo === 'recomendacoes') {
      const nomeLaudo = d.tipo_servico ? `Laudo tipo ${d.tipo_servico}` : 'Laudo Técnico'
      const ncsTexto = (d.ncs as any[] ?? []).map((nc: any) =>
        `Sistema: ${nc.sistema} | Anomalia: ${nc.anomalia} | Local: ${nc.local} | GR: ${nc.grauRisco} | Prior: ${nc.prioridade}`
      ).join('\n')
      const ehNR_IA = ['45','46','47','48'].includes(d.tipo_servico ?? '')
      prompt = `Você é um engenheiro especialista. Com base nas não conformidades listadas do ${nomeLaudo}, redija recomendações técnicas para: 5.1 Manutenção preventiva; 5.2 Uso e operação; 5.3 Sustentabilidade; 5.4 Outras recomendações. ${ehNR_IA ? 'Foco em segurança do trabalho e NRs.' : 'Foco em desempenho e durabilidade.'}\n\nNÃO CONFORMIDADES:\n${ncsTexto}\n\nResponda em 4 parágrafos objetivos (um por item), sem títulos, máximo 200 caracteres cada.`

    } else if (tipo === 'recomendacao_sistema') {
      const sistemaLimpo = (d.sistema || '').slice(3).replace(/_/g,' ')
      const ncsTexto = (d.ncs as any[] ?? []).map((nc: any) =>
        `Anomalia: ${nc.anomalia} | Local: ${nc.local} | GR: ${nc.grauRisco}`
      ).join('\n')
      prompt = `Você é um engenheiro especialista. Redija uma recomendação técnica para o sistema ${sistemaLimpo} com base nas não conformidades identificadas:\n\n${ncsTexto}\n\nResponda em até 3 frases objetivas, máximo 400 caracteres, sem título ou prefixo.`
    } else {
      return NextResponse.json({ erro: 'Tipo de prompt não reconhecido.' }, { status: 400 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await res.json()
    const texto = data.content?.find((b: any) => b.type === 'text')?.text ?? ''
    return NextResponse.json({ texto })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}
