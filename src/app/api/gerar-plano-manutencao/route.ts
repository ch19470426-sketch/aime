export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TITULO_PLANO: Record<string,string> = {
  '51':'Plano de Manutenção — Autovistoria',
  '52':'Plano de Manutenção — Inspeção Predial',
  '53':'Plano de Manutenção — Imóvel Novo',
  '54':'Plano de Manutenção — Inspeção de Fachada',
  '55':'Plano de Manutenção — Elevadores',
  '56':'Plano de Manutenção — Instalações Elétricas NR-10',
  '57':'Plano de Manutenção — Máquinas e Equipamentos NR-12',
  '58':'Plano de Manutenção — Caldeiras e Vasos de Pressão NR-13',
}

const OBJETIVOS_51_54 = `Este Plano de Manutenção tem por objetivo estabelecer as diretrizes, ações e periodicidades necessárias para a conservação dos sistemas e componentes da edificação, assegurando a manutenção de suas condições de segurança, habitabilidade, funcionalidade, desempenho e durabilidade ao longo de sua vida útil.\n\nConstituem seus principais objetivos específicos:\n- eliminar as não conformidades identificadas na inspeção técnica;\n- reduzir os riscos operacionais;\n- preservar a integridade física das pessoas;\n- reduzir intervenções corretivas emergenciais;\n- ampliar a vida útil da edificação;\n- mitigar danos causados por manifestações patológicas com base em critérios técnicos;\n- preservar o patrimônio;\n- definir responsabilidades para execução, fiscalização e recebimento dos serviços.`

const OBJETIVOS_55_58 = `Este Plano de Manutenção estabelece as diretrizes técnicas necessárias para restabelecer, preservar e monitorar as condições de segurança, desempenho e confiabilidade dos ativos inspecionados.\n\nConstituem seus principais objetivos específicos:\n- eliminar as não conformidades identificadas na inspeção técnica;\n- reduzir os riscos operacionais;\n- preservar a integridade física dos trabalhadores;\n- aumentar a disponibilidade dos equipamentos;\n- reduzir intervenções corretivas emergenciais;\n- ampliar a vida útil dos ativos;\n- estabelecer prioridades técnicas de intervenção;\n- definir responsabilidades para execução, fiscalização e recebimento dos serviços.`

const BASE_NORMATIVA: Record<string,string> = {
  '51':'Sem prejuízo de outras normas específicas, aplicam-se: ABNT NBR 16747; ABNT NBR 5674; ABNT NBR 14037; ABNT NBR 17170; ABNT NBR 16280; ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 6118; ABNT NBR 5410; ABNT NBR 5626; ABNT NBR 8160; projetos executivos, memoriais descritivos, manuais da edificação e documentação técnica disponível; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '52':'Sem prejuízo de outras normas específicas, aplicam-se: ABNT NBR 16747; ABNT NBR 5674; ABNT NBR 14037; ABNT NBR 17170; ABNT NBR 16280; ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 6118; ABNT NBR 5410; ABNT NBR 5626; ABNT NBR 8160; projetos executivos, memoriais descritivos, manuais da edificação e documentação técnica disponível; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '53':'Sem prejuízo de outras normas específicas, aplicam-se: ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 5674; ABNT NBR 14037; ABNT NBR 16280; ABNT NBR 6118; ABNT NBR 5626; ABNT NBR 8160; ABNT NBR 5410; projetos executivos, memoriais descritivos, especificações técnicas e documentos de entrega da obra; manuais técnicos dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '54':'Sem prejuízo de outras normas específicas, aplicam-se: ABNT NBR 16747; ABNT NBR 13755; ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 5674; ABNT NBR 6118; ABNT NBR 10821; ABNT NBR 7199; normas do IBAPE; legislação estadual e municipal sobre fachadas; projetos executivos e especificações técnicas; manuais de uso, operação e manutenção; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '55':'Sem prejuízo de outras normas específicas, aplicam-se: ABNT NBR 16858 (Partes 1, 2 e 3); ABNT NBR 16083; ABNT NBR NM 207; ABNT NBR NM 267; ABNT NBR 9050; NR-10; NR-35; legislação estadual e municipal aplicável; contratos de manutenção vigentes; manuais técnicos do fabricante; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '56':'Sem prejuízo de outras normas específicas: NR-10; NR-01; NR-06; NR-23; NR-26; NR-35; ABNT NBR 5410; ABNT NBR 14039; ABNT NBR 5419 (Partes 1 a 4); manuais técnicos e especificações dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '57':'Sem prejuízo de outras normas específicas, aplicam-se: NR-12; NR-01; NR-06; NR-10; NR-17; NR-35; ABNT NBR ISO 12100; ABNT NBR IEC 60204-1; ABNT NBR ISO 13849 (Partes 1 e 2); manuais técnicos dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '58':'Sem prejuízo de outras normas específicas, aplicam-se: NR-13; NR-01; NR-06; NR-10; NR-20; NR-33; NR-35; ABNT NBR ISO 16528 (Partes 1 e 2); API 510; API 570; projetos executivos e prontuários dos equipamentos; manuais de operação e manutenção dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
}

function xe(v: any): string {
  if (!v) return ''
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
function fmtData(v: any): string {
  if (!v) return ''
  try { return new Date(v).toLocaleDateString('pt-BR') } catch { return String(v) }
}
function fmtDoc(v: string): string {
  const n=(v||'').replace(/\D/g,'')
  if(n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  if(n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
  return v||''
}
function fmtCep(v: string): string {
  const n=(v||'').replace(/\D/g,''); return n.length>=8?n.slice(0,5)+'-'+n.slice(5,8):v||''
}
function fmtTel(v: string): string {
  const n=(v||'').replace(/\D/g,'')
  if(n.length===11) return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7)
  if(n.length===10) return '('+n.slice(0,2)+') '+n.slice(2,6)+'-'+n.slice(6)
  return v||''
}
function paragrafoHtml(txt: string): string {
  return txt.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>
    l.startsWith('-')
      ? `<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;${xe(l.slice(1).trim())}</p>`
      : `<p style="text-align:justify">${xe(l)}</p>`
  ).join('\n')
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

export async function POST(request: NextRequest) {
  try {
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico, estab, inspetor, nomeArquivo, ncs } = await request.json()
    if (!cpfInspetor || !tipoServico || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    const ts = String(tipoServico)
    const titulo = TITULO_PLANO[ts] ?? 'Plano de Manutenção'
    const grupo5154 = ['51','52','53','54'].includes(ts)
    const objetivos = grupo5154 ? OBJETIVOS_51_54 : OBJETIVOS_55_58
    const baseNorm = BASE_NORMATIVA[ts] ?? ''

    // Dados inspetor
    const tituloIns = (inspetor?.titulo_profissional||'').replace(/(CREA|CAU|CRECI)[\s-]*/gi,'').trim()
    const siglaIns  = (inspetor?.titulo_profissional||'').toLowerCase().includes('arquitet') ? 'CAU' : 'CREA'
    const numIns    = (inspetor?.inscricao_crea_cau||'').replace(/^(CREA|CAU|CRECI)[\s-]*/gi,'').trim()
    const nomeIns   = xe(inspetor?.nome_inspetor||'')
    const espIns    = inspetor?.especializacao ? xe(inspetor.especializacao) : ''
    const cabIns    = xe(inspetor?.cabecalho_documentos||'')
    const rodIns    = xe(inspetor?.rodape_documentos||`${xe(inspetor?.nome_inspetor||'')} — ${tituloIns} — ${siglaIns} ${numIns}`)
    const logoB64   = inspetor?.logo_base64 || ''
    const logoTag   = logoB64
      ? `<img src="${logoB64}" style="max-height:30mm;filter:brightness(0) invert(1)" alt="Logo">`
      : `<img src="/logo.png" style="max-height:30mm;filter:brightness(0) invert(1)" alt="AIMÊ">`

    // Data
    const hoje = new Date()
    const dataHoje = hoje.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})
    const mesAno = `${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`
    const cidade = xe(estab?.cidade||'')
    const uf     = xe(estab?.uf||'')

    // Tabela 1.2
    const ativos: any[] = estab?.ativos ?? []
    let tabAtivos = ''
    if (grupo5154) {
      tabAtivos = `<div class="titulo">1.2.- Ativos para Manutenção.</div>
<table>
<tr><th style="text-align:left;width:40%">Tipo de ativo</th><th style="width:20%">Data Habite-se</th><th style="width:20%">Nº pavtos</th><th style="width:20%">Aptos/Salas</th></tr>
${ativos.length>0
  ? ativos.map((a:any)=>`<tr><td>${xe(a.tipo_ativo||a.tipo||'')}</td><td style="text-align:center">${fmtData(a.data_inicio_operacao||a.data_habite_se)}</td><td style="text-align:center">${xe(a.numero_pavimentos||estab?.numero_pavimentos||'')}</td><td style="text-align:center">${xe(a.numero_unidades_salas||estab?.numero_unidades_salas||'')}</td></tr>`).join('')
  : `<tr><td>${xe(estab?.tipo_imovel||'')}</td><td style="text-align:center">${fmtData(estab?.data_habite_se)}</td><td style="text-align:center">${xe(estab?.numero_pavimentos||'')}</td><td style="text-align:center">${xe(estab?.numero_unidades_salas||'')}</td></tr>`
}
</table>`
    } else {
      tabAtivos = `<div class="titulo">1.2.- Ativos para Manutenção.</div>
<table>
<tr><th style="text-align:left;width:30%">Tipo de ativo</th><th style="width:25%">Tag/Nº Série</th><th style="width:25%">Início operação</th><th style="width:20%">Subtipo</th></tr>
${ativos.length>0
  ? ativos.map((a:any)=>`<tr><td>${xe(a.tipo_ativo||a.tipo||'')}</td><td style="text-align:center">${xe(a.tag_ativo_nr_serie||a.tag||'')}</td><td style="text-align:center">${fmtData(a.data_inicio_operacao)}</td><td>${xe(a.subtipo||'')}</td></tr>`).join('')
  : '<tr><td colspan="4" style="color:#9a3412;font-style:italic">Nenhum ativo cadastrado.</td></tr>'
}
</table>`
    }

    // Item 1.1
    const S11 = `<div class="titulo">1.1.- Identificação da Edificação/Estabelecimento.</div>
<div class="bloco">
  <div class="bloco-header">Identificação da Edificação/Estabelecimento</div>
  <div class="row">
    <div class="cell cell-3"><label>Razão Social / Nome</label><div class="val">${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div></div>
    <div class="cell"><label>CNPJ/CPF</label><div class="val">${fmtDoc(cnpjoucpf||'')}</div></div>
    <div class="cell"><label>CEP</label><div class="val">${fmtCep(estab?.cep_estabelecimento||estab?.cep||'')}</div></div>
  </div>
  <div class="row">
    <div class="cell cell-3"><label>Endereço</label><div class="val">${xe(estab?.logradouro||'')}${estab?.numero_imovel?', '+xe(estab.numero_imovel):''}</div></div>
    <div class="cell cell-2"><label>Bairro</label><div class="val">${xe(estab?.bairro||'')}</div></div>
  </div>
  <div class="row">
    <div class="cell cell-2"><label>Cidade e UF</label><div class="val">${xe(estab?.cidade||'')}/${xe(estab?.uf||'')}</div></div>
    <div class="cell cell-2"><label>Nome do Responsável</label><div class="val">${xe(estab?.nome_responsavel||'')}</div></div>
    <div class="cell"><label>Função</label><div class="val">${xe(estab?.funcao_responsavel||'')}</div></div>
  </div>
  <div class="row">
    <div class="cell"><label>Telefone contato</label><div class="val">${fmtTel(estab?.whatsapp_responsavel||estab?.whatsapp||'')}</div></div>
    <div class="cell cell-2"><label>eMail contato</label><div class="val">${xe(estab?.email_responsavel||estab?.email||'')}</div></div>
    <div class="cell cell-2"><label>Finalidade da vistoria</label><div class="val">${xe(estab?.finalidade_vistoria||'')}</div></div>
  </div>
</div>`

    // Anexo 1 — NCs
    const ncsArr: any[] = Array.isArray(ncs) ? ncs : []
    const anx1Rows = ncsArr.map((nc:any, idx:number)=>{
      const gr = Number(nc.grau_risco||nc.grauRisco)||0
      const cor = gr>80?'#CC0000':gr>=50?'#E8A000':gr>=30?'#EAB308':'#16A34A'
      const pri = gr>80?'Muito Alta':gr>=50?'Alta':gr>=30?'Média':'Baixa'
      return `<tr>
<td style="text-align:center">${idx+1}</td>
<td>${xe(nc.descricao_nao_conformidade||nc.nc||'')}</td>
<td style="text-align:center;font-weight:700;color:${cor}">${gr}</td>
<td style="text-align:center;font-weight:700;color:${cor}">${pri}</td>
<td>${xe(nc.descricao_solucao_nc||nc.solucao||'')}</td>
<td>${xe(nc.procedimento_corretivo||'')}</td>
<td style="text-align:center">${xe(nc.numero_foto||nc.fotoNr||'')}</td>
<td></td></tr>`
    }).join('')

    // Índice
    const indiceItens = [
      {n:'1.',    t:'Considerações Preliminares'},
      {n:'1.1.-', t:'Identificação da Edificação/Estabelecimento'},
      {n:'1.2.-', t:'Ativos para Manutenção'},
      {n:'2.',    t:'Objetivos'},
      {n:'3.',    t:'Base Normativa'},
      {n:'4.',    t:'Responsabilidade da Contratada'},
      {n:'5.',    t:'Exigências Mínimas para Execução dos Serviços'},
      {n:'5.1.-', t:'Planejamento'},
      {n:'5.2.-', t:'Segurança'},
      {n:'5.3.-', t:'Recursos'},
      {n:'5.4.-', t:'Execução'},
      {n:'6.',    t:'Recebimento dos Serviços'},
      {n:'7.',    t:'Apresentação da Proposta'},
      {n:'8.',    t:'Critérios para Priorização das Intervenções'},
      {n:'9.',    t:'Controle da Execução e Indicadores de Desempenho'},
      {n:'10.',   t:'Considerações Finais'},
      {n:'Anx.1', t:'Plano Executivo dos Serviços'},
      {n:'Anx.2', t:'Modelo de Termo de Recebimento'},
    ]
    const indiceHtml = indiceItens.map(it=>
      `<div class="indice-item"><span class="indice-num">${it.n}</span><span>${xe(it.t)}</span><span class="indice-dots"></span></div>`
    ).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${xe(titulo)}</title><style>
@page { size: A4; margin: 25mm 20mm 20mm 25mm; @bottom-right { content: "Pág. " counter(page); font-family: Arial, sans-serif; font-size: 7.5pt; color: #374151; } }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; color: #000; background: #fff; font-size: 9pt; line-height: 1.5; }
p { margin: 4pt 0; text-align: justify; color: #000; }
h1, h2, h3 { font-weight: bold; color: #000; margin: 10pt 0 4pt; }
ul, ol { margin: 4pt 0 4pt 1cm; padding: 0; }
li { margin-bottom: 2pt; text-align: justify; }
b, strong { font-weight: bold; }
.section { page-break-before: always; }
.no-break { page-break-inside: avoid; }
.ass { margin-top: 40pt; text-align: center; }
@media print { body { font-size: 9pt; } .section { page-break-before: always; } table { page-break-inside: auto; outline: 1.5px solid #1E3A8A; } p { page-break-inside: avoid; orphans: 4; widows: 4; } }
.cab { text-align: center; font-weight: bold; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; margin-bottom: 6pt; font-size: 8.5pt; }
.rod { margin-top: 10pt; padding-top: 4pt; border-top: 1px solid #ccc; font-size: 8pt; text-align: center; white-space: pre-line; color: #374151; }
.titulo { font-size: 10pt; font-weight: 700; color: #000; margin: 12pt 0 4pt; padding: 0; }
.bloco { border: 1.5px solid #1E3A8A; overflow: hidden; margin-bottom: 14px; page-break-inside: avoid; }
.bloco-header { background: #1E3A8A; color: #fff; font-size: 9pt; font-weight: 700; padding: 6px 10px; }
.row { display: flex; border-top: 1px solid #1E3A8A; }
.row:first-of-type { border-top: none; }
.cell { flex: 1; border-right: 1px solid #1E3A8A; padding: 5px 8px; min-height: 42px; }
.cell:last-child { border-right: none; }
.cell label { display: block; font-size: 7pt; font-weight: 700; color: #1E3A8A; margin-bottom: 3px; }
.cell .val { font-size: 8.5pt; color: #222; line-height: 1.4; }
.cell-2 { flex: 2; }
.cell-3 { flex: 3; }
.cell-4 { flex: 4; }
table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: auto; outline: 1.5px solid #1E3A8A; }
th { background: #1E3A8A; color: #fff; font-size: 8pt; font-weight: 700; padding: 5px 8px; border-right: 1px solid #4a6fa5; text-align: center; }
th:last-child { border-right: none; }
td { border-top: 1px solid #1E3A8A; border-right: 1px solid #1E3A8A; padding: 6px 8px; font-size: 8pt; color: #222; vertical-align: middle; }
td:last-child { border-right: none; }
tr:nth-child(even) td { background: #f7f9ff; }
.pg-capa { page-break-after:always; display:flex; flex-direction:column; height:297mm; box-sizing:border-box; overflow:hidden; }
@page :first { margin:0 !important; }
.pg-capa { counter-reset: page 0; }
.capa-barra { background: #1E3A8A; height: 8mm; width: 100%; }
.capa-logo { text-align: center; padding: 20mm 0 10mm; }
.capa-logo img { max-height: 30mm; }
.capa-titulo { text-align: center; margin-top: auto; padding: 0 20mm; }
.capa-titulo h1 { font-size: 18pt; font-weight: 900; color: #1E3A8A; line-height: 1.2; margin-bottom: 6pt; }
.capa-titulo h2 { font-size: 13pt; font-weight: 700; color: #374151; margin-bottom: 4pt; }
.capa-titulo h3 { font-size: 12pt; font-weight: 600; color: #1E3A8A; margin-bottom: 20pt; }
.capa-linha { border-top: 2px solid #1E3A8A; margin: 0 20mm; }
.capa-dados { padding: 10mm 20mm; font-size: 9.5pt; color: #222; line-height: 1.8; }
.capa-dados b { color: #1E3A8A; }
.capa-rodape { margin-top: auto; padding: 8mm 20mm; text-align: center; font-size: 8pt; color: #6B7280; }
.pg-indice { page-break-after: always; padding-top: 10mm; }
.indice-titulo { font-size: 14pt; font-weight: 900; color: #1E3A8A; text-align: center; margin-bottom: 16pt; }
.indice-item { display: flex; align-items: baseline; padding: 3pt 0; font-size: 9pt; }
.indice-num { min-width: 40pt; font-weight: 700; color: #1E3A8A; flex-shrink: 0; }
.indice-dots { flex: 1; border-bottom: 1px dotted #999; margin: 0 4pt 2pt; }
</style></head><body>

<!-- CAPA -->
<div class="pg-capa" style="counter-reset:page 0">
  <div style="height:1cm;background:#fff;flex-shrink:0"></div>
  <div style="background:#1E3A8A;height:8mm;flex-shrink:0"></div>
  <div style="text-align:center;padding:6mm 0 0;flex-shrink:0">${logoTag}</div>
  <div style="flex:1"></div>
  <div style="text-align:center;padding:0 20mm;flex-shrink:0">
    <div style="font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:6pt">PLANO DE MANUTENÇÃO</div>
    <div style="font-size:18pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:2pt">${xe(titulo)}</div>
    <div style="font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt">${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div>
  </div>
  <div style="flex:1"></div>
  <div style="flex-shrink:0">
    <div style="border-top:2px solid #1E3A8A;margin:0 20mm"></div>
    <div style="padding:8mm 20mm;font-size:9.5pt;color:#222;line-height:1.9;flex-shrink:0">
      <b style="color:#1E3A8A">Inspetor Responsável:</b> ${nomeIns}<br>
      <b style="color:#1E3A8A">Título Profissional:</b> ${xe(tituloIns)} — ${siglaIns} ${xe(numIns)}${espIns?`<br><b style="color:#1E3A8A">Especialidade:</b> Especialista ${espIns}`:''}
    </div>
    <div style="background:#1E3A8A;height:8mm"></div>
    <div style="height:1cm;background:#fff"></div>
  </div>
</div>

<!-- ÍNDICE -->
<div class="section"><div class="pg-indice">
  <div class="indice-titulo">ÍNDICE</div>
  ${indiceHtml}
  <br>
  <p style="text-align:center;font-size:8pt;color:#6B7280">${cidade}/${uf} — ${mesAno}</p>
</div></div>

<!-- CORPO -->
<div>
${cabIns?`<div class="cab">${cabIns}</div>`:''}
<br><br><br><br><br>

<div class="titulo">1.- Considerações Preliminares.</div>
<p>A execução da manutenção representa uma das principais ações para garantir a continuidade operacional das edificações e dos processos, proteger pessoas e trabalhadores, preservar o patrimônio, e assegurar a conformidade com a legislação vigente.</p>
<p>O presente Plano de Manutenção foi elaborado a partir das informações constantes no Laudo Técnico de Inspeção, constituindo o principal documento de planejamento das ações corretivas e preventivas destinadas à eliminação ou mitigação das não conformidades identificadas durante a inspeção.</p>
<p>As intervenções previstas deverão ser executadas observando-se a criticidade atribuída às não conformidades, a probabilidade de ocorrência de falhas, os riscos à segurança das pessoas e trabalhadores, a conservação das edificações, os impactos sobre os equipamentos e as exigências legais e normativas aplicáveis.</p>
<p>Este documento deverá orientar a execução, o acompanhamento, a fiscalização, a homologação e o recebimento dos serviços de manutenção.</p>
<p>A execução dos serviços de manutenção deverá respeitar, além das recomendações das Normas Técnicas Brasileiras, as recomendações das concessionárias locais e da prefeitura municipal.</p>

${S11}

${tabAtivos}

<div class="section">
${cabIns?`<div class="cab">${cabIns}</div>`:''}

<div class="titulo">2.- Objetivos.</div>
${paragrafoHtml(objetivos)}

<div class="titulo">3.- Base Normativa.</div>
<p>${xe(baseNorm)}</p>

<div class="titulo">4.- Responsabilidade da Contratada.</div>
<p>A responsabilidade pela execução dos serviços até a sua conclusão, formalizada pela assinatura do "Termo de Recebimento", é integralmente da contratada nos termos do Código Civil Brasileiro.</p>
<p>A guarda e vigilância das ferramentas, equipamentos e dos materiais necessários à execução dos serviços são de inteira responsabilidade da contratada.</p>
<p>Compete-lhe:</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;fornecer profissionais legalmente habilitados;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;designar responsável técnico;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;emitir ART/TRT quando aplicável;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;fornecer materiais certificados;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;utilizar equipamentos calibrados;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;cumprir integralmente as normas de segurança;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;preservar a limpeza das áreas;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;registrar todas as intervenções;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;comunicar imediatamente situações de risco grave;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;responder pela qualidade técnica dos serviços.</p>
</div>

<div class="section">
${cabIns?`<div class="cab">${cabIns}</div>`:''}

<div class="titulo">5.- Exigências Mínimas para Execução dos Serviços.</div>
<p>Todas as intervenções deverão ser executadas mediante planejamento prévio, observando critérios técnicos, operacionais e de segurança.</p>
<div class="titulo">5.1.- Planejamento.</div>
<p>Antes do início dos serviços deverão ser realizados: análise do laudo técnico; cronograma executivo seguindo a definição das prioridades; programação de desligamentos; levantamento dos recursos necessários.</p>
<div class="titulo">5.2.- Segurança.</div>
<p>Toda intervenção deverá observar: análise preliminar de riscos; permissão de trabalho; bloqueio e etiquetagem; isolamento das áreas; utilização de EPI; utilização de EPC; sinalização da área.</p>
<div class="titulo">5.3.- Recursos.</div>
<p>A contratada deverá disponibilizar: equipe qualificada; ferramentas adequadas; instrumentos calibrados; peças certificadas; documentação técnica.</p>
<div class="titulo">5.4.- Execução.</div>
<p>Os serviços poderão compreender: demolição e desmontagem; limpeza técnica; lubrificação; reapertos; regulagens; calibrações; substituição de componentes; recuperação dos sistemas de proteção; ensaios; remoção de entulho; testes funcionais; atualização documental.</p>

<div class="titulo">6.- Recebimento dos Serviços.</div>
<p>Concluídas as intervenções, será realizada inspeção técnica de recebimento para verificar a conformidade dos serviços executados.</p>
<p>O recebimento dependerá da comprovação de que: todas as não conformidades foram tratadas; as instalações e os equipamentos operam adequadamente; os testes apresentaram resultados satisfatórios; a documentação técnica foi atualizada; os registros de manutenção foram emitidos; foram entregues ART/TRT, quando exigidas.</p>

<div class="titulo">7.- Apresentação da Proposta.</div>
<p>A proposta técnica deverá demonstrar a capacidade operacional da contratada e conter, no mínimo: identificação da empresa; responsável técnico; escopo dos serviços; metodologia; cronograma; equipe técnica; materiais; equipamentos; prazo; garantia; valor global; condições comerciais.</p>

<div class="titulo">8.- Critérios para Priorização das Intervenções.</div>
<p>As intervenções deverão ser priorizadas conforme o grau de criticidade das não conformidades, considerando os riscos à segurança das pessoas, à integridade dos equipamentos, à continuidade operacional e ao atendimento da legislação.</p>
<p>Como diretriz geral: criticidade muito alta: intervenção imediata; criticidade alta: atendimento prioritário; criticidade média: execução programada em curto prazo; criticidade baixa: inserção no plano periódico de manutenção.</p>

<div class="titulo">9.- Controle da Execução e Indicadores de Desempenho.</div>
<p>O acompanhamento da execução será realizado durante toda a vigência deste Plano, permitindo verificar o cumprimento dos prazos, a qualidade das intervenções e a eficácia das ações implementadas.</p>
<p>Indicadores: percentual de serviços concluídos; percentual de pendências; prazo médio de atendimento; índice de reincidência de falhas; disponibilidade dos equipamentos; percentual de conformidade alcançado.</p>

<div class="titulo">10.- Considerações Finais.</div>
<p>A execução das ações de manutenção previstas neste Plano contribui para a preservação das condições de segurança, confiabilidade e desempenho dos ativos, reduzindo a ocorrência de falhas e riscos operacionais. Sua implementação contínua favorece a proteção da vida e da integridade das pessoas, a preservação do patrimônio, a continuidade das atividades e o aumento da vida útil dos sistemas e equipamentos. Recomenda-se que este Plano seja periodicamente revisado e atualizado.</p>

<div class="ass">
  <p>${cidade}/${uf}, ${dataHoje}.</p>
  <br><br>
  <p>______________________________</p>
  <p>${nomeIns}</p>
  <p>${xe(tituloIns)} — ${siglaIns} ${xe(numIns)}${espIns?`<br>${espIns}`:''}</p>
</div>

${rodIns?`<div class="rod">${rodIns}</div>`:''}
</div>

<!-- ANEXO 1 -->
<div class="section">
${cabIns?`<div class="cab">${cabIns}</div>`:''}
<div class="titulo">Anexo 1 – Plano Executivo dos Serviços</div>
<table>
<tr><th colspan="8" style="text-align:left;font-size:9.5pt">Plano Executivo para os Serviços de Manutenção</th></tr>
<tr>
  <th style="width:4%">ID</th>
  <th style="width:26%;text-align:left">Não Conformidade</th>
  <th style="width:6%">G Risco</th>
  <th style="width:8%">Prioridade</th>
  <th style="width:18%;text-align:left">Solução sugerida</th>
  <th style="width:22%;text-align:left">Procedimento corretivo</th>
  <th style="width:6%">Foto</th>
  <th style="width:10%">Responsável</th>
</tr>
${anx1Rows||'<tr><td colspan="8" style="color:#9a3412;font-style:italic;padding:8pt">Nenhuma não conformidade registrada.</td></tr>'}
</table>
${rodIns?`<div class="rod">${rodIns}</div>`:''}
</div>

<!-- ANEXO 2 -->
<div class="section">
${cabIns?`<div class="cab">${cabIns}</div>`:''}
<div class="titulo">Anexo 2 – Modelo de Termo de Recebimento de Serviços</div>
<p>Documento destinado ao aceite formal dos serviços executados, mediante confirmação da conformidade técnica, operacional e documental.</p>
<div class="bloco" style="margin-top:8pt">
  <div class="bloco-header">Termo de Recebimento dos Serviços</div>
  <div style="padding:12pt">
    <p>Declaro que os serviços previstos neste plano de manutenção foram executados em conformidade com as especificações técnicas estabelecidas, tendo sido verificadas as condições de segurança, funcionamento e desempenho dos equipamentos, bem como a eliminação das não conformidades constantes do laudo técnico de inspeção.</p>
    <br>
    <table style="border:none;outline:none">
      <tr><td style="border:none">Contratante: ________________________________</td><td style="border:none">Data: _____ / _____ / _____</td></tr>
      <tr><td style="border:none">Responsável técnico: _________________________</td><td style="border:none">CREA/CFT: _______________</td></tr>
    </table>
  </div>
</div>
${rodIns?`<div class="rod">${rodIns}</div>`:''}
</div>

</body></html>`

    // Salvar no Storage
    await supabase.storage.from('aime').remove([`documentos_inspetor/${nomeArquivo}`])
    const { error } = await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, new Blob([html], { type: 'text/html' }), { upsert: true, contentType: 'text/html' })

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json({ sucesso: true, nome: nomeArquivo, html })

  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}
