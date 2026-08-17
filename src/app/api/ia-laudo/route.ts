export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { tipo, dados } = await request.json()
    let prompt = ''
    const d = dados ?? {}

    if (tipo === 'sintese_edificacao') {
      const textoBase = d.texto_inspetor ? `\n\nTEXTO DIGITADO PELO INSPETOR (use como base principal):\n${d.texto_inspetor}` : ''
      prompt = `Você é um engenheiro civil experiente em inspeção predial. Redija uma síntese técnica da edificação/estabelecimento.${textoBase}\n\nDADOS DO ESTABELECIMENTO/EDIFICAÇÃO:\n- Razão social / Nome: ${d.razao_social || 'não informado'}\n- Denominação oficial: ${d.nome_convencao || 'não informado'}\n- Uso do imóvel/estabelecimento: ${d.uso_estabelecimento || d.uso || 'não informado'}\n- Tipo do imóvel: ${d.tipo_imovel || d.tipo || 'não informado'}\n- Número de pavimentos: ${d.pavimentos || 'não informado'}\n- Número de unidades/salas: ${d.unidades || 'não informado'}\n- Área construída: ${d.area_construida || 'não informada'} m²\n- Área do terreno: ${d.area_terreno || 'não informada'} m²\n- Fabricante/marca: ${d.fabricante || 'não informado'}\n- Subtipo: ${d.subtipo || 'não informado'}\n- Capacidade/potência: ${d.capacidade || 'não informado'}\n\nINSTRUÇÕES:\n- Se houver texto do inspetor, use-o como base principal e melhore a redação técnica mantendo o conteúdo original\n- Se não houver texto do inspetor, gere a síntese com base nos dados complementares\n- Linguagem técnica formal, terceira pessoa, texto corrido sem listas\n- NÃO mencione datas, vistoria ou como o trabalho foi realizado\n- NÃO inclua endereço\n- Máximo de 900 caracteres\n- NÃO inclua título, cabeçalho ou prefixo — apenas o texto da síntese diretamente
- Sem markdown, sem asteriscos, sem listas, apenas texto corrido em parágrafo único`

    } else if (tipo === 'descricao_vistoria') {
      prompt = `Você é um engenheiro técnico especialista em inspeção predial. Redija a descrição da realização da vistoria técnica com base nos dados fornecidos.\n\nDADOS:\n- Tipo de serviço: ${d.tipo_servico || ''}\n- Edificação/Estabelecimento: ${d.razao_social || ''}\n- Data da vistoria: ${d.data_vistoria || ''}\n- Nível de inspeção: ${d.nivel_inspecao || ''}\n- Sistemas vistoriados: ${d.sistemas || ''}\n- Inspetor: ${d.nome_inspetor || ''}\n\nINSTRUÇÕES:\n- Máximo 600 caracteres\n- Linguagem técnica formal, terceira pessoa\n- Não inclua o prefixo '3.1 Realização da Vistoria Técnica' — apenas o texto
- Sem markdown, sem asteriscos, sem listas, apenas texto corrido`

    } else if (tipo === 'solucao_nc') {
      const sistemaLimpo = (d.sistema_vistoria||d.sistema||'').replace(/^\d+[-_]/,'').replace(/_/g,' ').trim()
      prompt = `Você é um engenheiro diagnóstico especialista em patologia de edificações. Utilizando critérios previstos em normas técnicas brasileiras, proponha uma solução técnica objetiva para a seguinte não conformidade:\n\nSISTEMA: ${sistemaLimpo}\nSUBSISTEMA: ${d.subsistema_vistoria||d.subsistema||''}\nANOMALIA: ${d.anomalia_requisito_vistoria||d.anomalia||d.nc||''}\nNÃO CONFORMIDADE: ${d.descricao_nao_conformidade||d.nc||''}\nLOCAL: ${d.local_ocorrencia||d.local||''}\nCOMPLEMENTO: ${d.complemento_local||d.complemento||''}\nGRAU DE RISCO: ${d.grau_risco||d.grauRisco||''}\nPRIORIDADE: ${d.prioridade||''}\n\nRESPOSTA: Apresente a solução técnica em até 3 frases objetivas, máximo 320 caracteres, sem título ou prefixo.`

    } else if (tipo === 'procedimento_corretivo') {
      // Prompt PC — Plano de Manutenção
      const sistemaLimpo = (d.sistema_vistoria || d.sistema || '').replace(/^\d+[-_]/,'').replace(/_/g,' ').trim()
      const focoNR = ['55','56','57','58'].includes(String(d.tipo_servico || ''))
      const foco = focoNR
        ? 'segurança do trabalho e conformidade regulatória, correção ou eliminação da não conformidade do requisito regulatório'
        : 'patologia construtiva, correção física do dano apurado na vistoria'
      prompt = `Como engenheiro diagnóstico, especialista em patologia e atuando na área de edificações, utilizando apenas critérios previstos em normas técnicas e ao conteúdo das variáveis apresentadas a seguir, descreva com linguagem técnica o "Procedimento corretivo" correspondente à combinação das variáveis abaixo. O foco deve ser em ${foco}.\n\nSISTEMA: ${sistemaLimpo}\nSUBSISTEMA: ${d.subsistema_vistoria || d.subsistema || ''}\nLOCAL + COMPLEMENTO: ${d.local_ocorrencia || ''} ${d.complemento_local || ''}\nNÃO CONFORMIDADE: ${d.descricao_nao_conformidade || d.nc || ''}\nCAUSA PROVÁVEL: ${d.descricao_causa_provavel || d.cp || ''}\nSOLUÇÃO NÃO CONFORMIDADE: ${d.descricao_solucao_nc || d.solucao || ''}\n\nRESPOSTA: Descreva resumidamente os serviços técnicos necessários para correção da não conformidade. Máximo 3 frases, 320 caracteres, sem título ou prefixo, respeitando as regras sintáticas do português.`

    } else if (tipo === 'recomendacoes') {
      const ehNR = ['45','46','47','48'].includes(d?.tipo_servico ?? '')
      // Preparar dados da tabela auxiliar
      const ncsTexto = (d.ncs as any[] ?? []).map((nc: any) => {
        const sistema = String(nc.sistema||nc.sistema_vistoria||'').replace(/^\d+[-_.\s]+/,'').trim()
        const nc_desc = nc.descricao_nao_conformidade||nc.nc||nc.anomalia||nc.anomalia_requisito_vistoria||''
        const gr = nc.grau_risco||nc.grauRisco||0
        return `Sistema: ${sistema} | NC: ${nc_desc} | GR: ${gr}`
      }).join('\n')

      if (ehNR) {
        // Laudos 45-48: foco em segurança do trabalho e conformidade regulatória
        prompt = `Você é um engenheiro diagnóstico especialista em segurança do trabalho e conformidade regulatória (NR-10, NR-12, NR-13). Com base nas não conformidades abaixo, redija até 15 recomendações técnicas objetivas, organizadas nos seguintes subitens do item 5 do laudo: 5.1 Manutenção; 5.2 Operação; 5.3 Condições físicas; 5.4 Segurança; 5.5 Documentação. Cada subitem pode ter até 3 recomendações. Cada recomendação deve ter no máximo 400 caracteres, até 3 frases, sem justificativa, com linguagem técnica e pontuação correta em português.\n\nNÃO CONFORMIDADES:\n${ncsTexto}\n\nResponda APENAS com 5 parágrafos separados por linha em branco, um por subitem (5.1 a 5.5), sem títulos ou prefixos.`
      } else {
        // Laudos 41-44: foco em patologia construtiva
        prompt = `Você é um engenheiro diagnóstico especialista em patologia construtiva e desempenho de edificações. Com base nas não conformidades abaixo, redija até 15 recomendações técnicas objetivas, organizadas nos seguintes subitens do item 5 do laudo: 5.1 Manutenção; 5.2 Uso; 5.3 Sustentabilidade; 5.4 Outras recomendações. Cada subitem pode ter até 3 recomendações. Cada recomendação deve ter no máximo 400 caracteres, até 3 frases, sem justificativa, com linguagem técnica e pontuação correta em português.\n\nNÃO CONFORMIDADES:\n${ncsTexto}\n\nResponda APENAS com 4 parágrafos separados por linha em branco, um por subitem (5.1 a 5.4), sem títulos ou prefixos.`
      }

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
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ erro: data.error?.message || JSON.stringify(data) }, { status: 500 })
    const texto = data.content?.find((b: any) => b.type === 'text')?.text ?? ''
    // Para recomendacoes: dividir em 4 partes e retornar rec51-54
    if (tipo === 'recomendacoes') {
      const partes = texto.split(/\n\n+/).map((p:string) => p.trim()).filter(Boolean)
      const ehNR = ['45','46','47','48'].includes(d?.tipo_servico ?? '')
      return NextResponse.json({
        texto,
        rec51: partes[0] ?? '',
        rec52: partes[1] ?? '',
        rec53: partes[2] ?? '',
        rec54: partes[3] ?? '',
        rec55: ehNR ? (partes[4] ?? '') : '',
      })
    }
    return NextResponse.json({ texto })
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}
