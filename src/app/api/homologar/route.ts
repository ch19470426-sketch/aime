// src/app/api/homologar/route.ts
// AIMÊ — Homologa vistoria: lê JSON, gera HTML, salva em vistorias_homologadas/, exclui JSON

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nomeArquivo, dadosVistoria } = body

    if (!nomeArquivo || !dadosVistoria) {
      return NextResponse.json({ erro: 'nomeArquivo e dadosVistoria são obrigatórios' }, { status: 400 })
    }

    // 1. Ler JSON original do Storage para obter fotoBase64
    const { data: fileData, error: readError } = await supabase.storage
      .from('aime')
      .download(`vistorias/${nomeArquivo}`)

    if (readError || !fileData) {
      return NextResponse.json({ erro: 'Arquivo não encontrado: ' + readError?.message }, { status: 404 })
    }

    const jsonOriginal = JSON.parse(await fileData.text())
    const fotoBase64 = jsonOriginal.fotoBase64 ?? ''

    // 2. Gerar HTML
    const {
      cnpjoucpf, cnpjDisplay, razaoSocial, tipoServico, tipoAtivo, tagNrSerie,
      sistema, subsistema, anomalia, origem, resultado, local, complemento,
      gravidade, urgencia, abrangencia, exposicao, grauRisco, prioridade,
      fotoNr, dataVistoria, nc, cp, dataHomologacao, chaveInspetor, isNR
    } = dadosVistoria

    const corGR = grauRisco >= (isNR ? 75 : 64) ? '#E24B4A'
      : grauRisco >= (isNR ? 50 : 35) ? '#E8A000' : '#1A7A3C'

    const labelDoc = cnpjoucpf?.length === 11 ? 'CPF' : 'CNPJ'
    const labelNome = cnpjoucpf?.length === 11 ? 'Nome' : 'Razão social'
    const labelBloco = isNR ? 'Apuração da Conformidade Regulatória' : 'Manifestação Patológica'
    const labelAnomalia = isNR ? 'Requisito Normativo' : 'Anomalia / Falha'
    const labelOrigem = isNR ? 'Resultado' : 'Origem'
    const labelLocal = isNR ? 'Local/Instalação/Setor/Área' : 'Local de ocorrência'
    const labelAbr = isNR ? 'Probabilidade' : 'Abrangência'
    const labelExp = isNR ? 'Exposição risco' : 'Exposição'
    const labelNC = isNR ? 'Não Conformidade / Observações' : 'Resultado da Análise e Avaliação'

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:10px;background:#fff;font-size:7.5pt;color:#1a1a2e}
  .hdr{background:#1E3A8A;padding:8px 16px;text-align:center}
  .hdr h1{font-size:11pt;font-weight:700;color:#fff;margin:0}
  .hdr p{font-size:7pt;color:#B5D4F4;margin:2px 0 0}
  .div{height:2px;background:#1E3A8A}
  .body{padding:10px 14px}
  .blk{border:1px solid #c3d4f0;border-radius:6px;overflow:hidden;margin-bottom:5px}
  .bt{background:#1E3A8A;color:#fff;font-size:7.5pt;font-weight:700;padding:3px 10px}
  .bb{padding:5px 10px}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}
  .g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px}
  .f{display:flex;flex-direction:column;gap:1px;margin-bottom:3px}
  .f label{font-size:6.5pt;font-weight:600;color:#4a6480}
  .f span{border:1px solid #c3d4f0;border-radius:4px;padding:2px 5px;font-size:7.5pt;background:#f1f5f9}
  .foto{width:100%;height:90mm;object-fit:cover;border-radius:5px;border:2px solid #1E3A8A;display:block}
  .met{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px}
  .m{background:#E8EEF7;border:2px solid #c3d4f0;border-radius:5px;padding:3px 8px;display:flex;align-items:center;gap:8px}
  .badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:99px;font-size:7.5pt;font-weight:700}
  .stamp{background:#E6F5EE;border:2px solid #1A7A3C;border-radius:8px;padding:6px 12px;text-align:center;margin-top:8px}
  .stamp span{color:#1A7A3C;font-weight:700;font-size:8pt}
  .ph{display:flex;justify-content:space-between;margin-bottom:3px}
</style>
</head>
<body>
<div class="hdr"><h1>AIMÊ — Vistoria Homologada</h1><p>${tipoServico || ''}</p></div>
<div class="div"></div>
<div class="body">
<div class="blk"><div class="bt">Identificação</div><div class="bb">
<div class="g2">
<div class="f"><label>${labelDoc}</label><span>${cnpjDisplay || cnpjoucpf || ''}</span></div>
<div class="f"><label>${labelNome}</label><span>${razaoSocial || ''}</span></div>
</div>
<div class="g3">
<div class="f"><label>Tipo de serviço</label><span>${tipoServico || ''}</span></div>
<div class="f"><label>Ativo</label><span>${tipoAtivo || ''}</span></div>
<div class="f"><label>TAG / Nº Série</label><span>${tagNrSerie || ''}</span></div>
</div>
</div></div>

<div class="blk"><div class="bt">${labelBloco}</div><div class="bb">
<div class="g2">
<div class="f"><label>Sistema</label><span>${sistema || ''}</span></div>
<div class="f"><label>Subsistema</label><span>${subsistema || ''}</span></div>
</div>
<div class="f"><label>${labelAnomalia}</label><span>${anomalia || ''}</span></div>
<div class="g3">
<div class="f"><label>${labelOrigem}</label><span>${resultado || origem || ''}</span></div>
<div class="f"><label>${labelLocal}</label><span>${local || ''}</span></div>
<div class="f"><label>Complemento</label><span>${complemento || ''}</span></div>
</div>
</div></div>

<div class="blk"><div class="bt">Classificação de Risco</div><div class="bb">
<div class="g4">
<div class="f"><label>Gravidade</label><span>${gravidade || ''}</span></div>
<div class="f"><label>Urgência</label><span>${urgencia || ''}</span></div>
<div class="f"><label>${labelAbr}</label><span>${abrangencia || ''}</span></div>
<div class="f"><label>${labelExp}</label><span>${exposicao || ''}</span></div>
</div>
<div class="met">
<div class="m" style="border-color:${corGR}">
<span style="font-size:6.5pt;color:#4a6480;font-weight:600">Grau de Risco</span>
<span style="font-size:13pt;font-weight:700;color:${corGR}">${grauRisco || ''}</span>
</div>
<div class="m" style="border-color:${corGR};justify-content:center">
<span style="font-size:6.5pt;color:#4a6480;font-weight:600">Prioridade</span>
<span class="badge" style="color:${corGR}">${prioridade || ''}</span>
</div>
</div>
</div></div>

<div class="blk"><div class="bt">Evidência Fotográfica</div><div class="bb">
<div class="ph">
<div class="f" style="width:60px"><label>Foto Nº</label><span style="text-align:center;color:#1E3A8A;font-weight:700">${fotoNr || ''}</span></div>
<div class="f" style="width:80px"><label>Data Vistoria</label><span style="text-align:center">${dataVistoria || ''}</span></div>
</div>
${fotoBase64 ? `<img src="${fotoBase64}" class="foto" alt="Foto" />` : '<div style="height:90mm;background:#f1f5f9;border:2px dashed #c3d4f0;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:7.5pt">Sem foto</div>'}
</div></div>

<div class="blk"><div class="bt">${labelNC}</div><div class="bb">
<div class="f"><label>Não conformidade (NC)</label><span style="white-space:pre-wrap">${nc || ''}</span></div>
${!isNR ? `<div class="f"><label>Causa provável (CP)</label><span style="white-space:pre-wrap">${cp || ''}</span></div>` : ''}
</div></div>

<div class="stamp"><span>✓ Homologado em ${dataHomologacao || ''} — ${chaveInspetor || ''}</span></div>
</div>
<!-- AIME-NC-DATA:${JSON.stringify({
  chaveInspetor, cpfInspetor: dadosVistoria.cpfInspetor, cnpjoucpf, tipoServico: dadosVistoria.tipoServico,
  sistema: dadosVistoria.sistema, subsistema: dadosVistoria.subsistema, anomalia: dadosVistoria.anomalia,
  origem: dadosVistoria.origem, local: dadosVistoria.local, complemento: dadosVistoria.complemento,
  grauRisco: dadosVistoria.grauRisco, prioridade: dadosVistoria.prioridade,
  fotoNr: dadosVistoria.fotoNr, dataVistoria: dadosVistoria.dataVistoria,
  nc: dadosVistoria.nc, cp: dadosVistoria.cp,
  fotoBase64: dadosVistoria.fotoBase64 ?? ''
})} -->
</body>
</html>`

    // 3. Salvar HTML em vistorias_homologadas/
    const nomeHtml = nomeArquivo.replace(/\.json$/, '.html')
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8')
    
    const { error: uploadError } = await supabase.storage
      .from('aime')
      .upload(`vistorias_homologadas/${nomeHtml}`, htmlBuffer, {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ erro: 'Erro ao salvar HTML: ' + uploadError.message }, { status: 500 })
    }

    // 4. Excluir JSON de vistorias/
    const { error: deleteError } = await supabase.storage
      .from('aime')
      .remove([`vistorias/${nomeArquivo}`])

    if (deleteError) {
      return NextResponse.json({ erro: 'Erro ao excluir JSON: ' + deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true, html: `vistorias_homologadas/${nomeHtml}` })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
