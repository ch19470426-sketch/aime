export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIPO_APOIO: Record<string,string> = {
  '51':'31 Autovistoria','52':'32 Vistoria inspeção',
  '53':'33 Vistoria imóvel novo','54':'34 Vistoria fachada',
  '55':'35 Vistoria elevador','56':'36 Vistoria nr-10',
  '57':'37 Vistoria nr-12','58':'38 Vistoria nr-13',
}

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

const OBJETIVOS_51_54 = `Este Plano de Manutenção tem por objetivo estabelecer as diretrizes, ações e periodicidades necessárias para a conservação dos sistemas e componentes da edificação, assegurando a manutenção de suas condições de segurança, habitabilidade, funcionalidade, desempenho e durabilidade ao longo de sua vida útil.

Constituem seus principais objetivos específicos:
- eliminar as não conformidades identificadas na inspeção técnica;
- reduzir os riscos operacionais;
- preservar a integridade física das pessoas;
- reduzir intervenções corretivas emergenciais;
- ampliar a vida útil da edificação;
- mitigar danos causados por manifestações patológicas com base em critérios técnicos;
- preservar o patrimônio;
- definir responsabilidades para execução, fiscalização e recebimento dos serviços.`

const OBJETIVOS_55_58 = `Este Plano de Manutenção estabelece as diretrizes técnicas necessárias para restabelecer, preservar e monitorar as condições de segurança, desempenho e confiabilidade dos ativos inspecionados.

Constituem seus principais objetivos específicos:
- eliminar as não conformidades identificadas na inspeção técnica;
- reduzir os riscos operacionais;
- preservar a integridade física dos trabalhadores;
- aumentar a disponibilidade dos equipamentos;
- reduzir intervenções corretivas emergenciais;
- ampliar a vida útil dos ativos;
- estabelecer prioridades técnicas de intervenção;
- definir responsabilidades para execução, fiscalização e recebimento dos serviços.`

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
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico, nomeArquivo, ncs } = await request.json()
    if (!cpfInspetor || !tipoServico || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    // Modo info — apenas retorna dados sem gerar HTML
    if (nomeArquivo === '_info_') {
      const { data: eArr } = await supabase.from('estabelecimento').select('*').eq('cnpjoucpf', cnpjoucpf).limit(1)
      const { data: iArr } = await supabase.from('inspetor').select('cabecalho_documentos,nome_inspetor').eq('cpf_inspetor', cpfInspetor).limit(1)
      const e = eArr && eArr.length > 0 ? eArr[0] : {}
      const i = iArr && iArr.length > 0 ? iArr[0] : {}
      const estabNomeVal = (e as any).razao_social_nome || (e as any).razao_social || (e as any).nome || Object.values(e as any).find((v:any)=>typeof v==='string'&&v.length>5) || ''
      const cabInsVal = (i as any).cabecalho_documentos || (i as any).nome_inspetor || ''
      return NextResponse.json({ estabNome: estabNomeVal, cabInspetor: cabInsVal, _debug: { e, i } })
    }

    const ts = String(tipoServico)
    const tsApoio = TIPO_APOIO[ts] ?? ''
    const titulo = TITULO_PLANO[ts] ?? 'Plano de Manutenção'
    const grupo5154 = ['51','52','53','54'].includes(ts)

    // ── Buscar dados do BD (igual aos laudos 41-44) ────────────────────────
    // Estabelecimento
    const { data: estabArr } = await supabase
      .from('estabelecimento').select('*').eq('cnpjoucpf', cnpjoucpf).limit(1)
    let estab: Record<string,any> = estabArr && estabArr.length > 0 ? estabArr[0] : {}

    // Contato cliente (tipo_servico apoio)
    const { data: ccDB } = await supabase
      .from('contato_cliente').select('*')
      .eq('cpf_inspetor', cpfInspetor).eq('cnpjoucpf', cnpjoucpf)
      .order('data_cadastro', { ascending: false }).limit(1)
    if (ccDB && ccDB.length > 0) estab = { ...estab, ...ccDB[0] }

    // Ativos
    const { data: ativosDB } = await supabase
      .from('ativos_a_vistoriar').select('*')
      .eq('cpf_inspetor', cpfInspetor).eq('cnpjoucpf', cnpjoucpf)
      .eq('tipo_servico', tsApoio)
    estab.ativos = ativosDB ?? []

    // CEP → endereço (igual aos laudos)
    if (estab?.cep_estabelecimento || estab?.cep) {
      try {
        const cepNum = String(estab.cep_estabelecimento || estab.cep || '').replace(/\D/g,'')
        if (cepNum.length === 8) {
          const vr = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`)
          const vd = await vr.json()
          if (!vd.erro) {
            estab = { ...estab,
              logradouro: vd.logradouro || estab.logradouro || '',
              bairro:     vd.bairro || estab.bairro || '',
              cidade:     vd.localidade || estab.cidade || '',
              uf:         vd.uf || estab.uf || '',
            }
          }
        }
      } catch { /* ignora */ }
    }

    // Inspetor
    const { data: insArr } = await supabase
      .from('inspetor').select('*').eq('cpf_inspetor', cpfInspetor).limit(1)
    const inspetor: Record<string,any> = insArr && insArr.length > 0 ? insArr[0] : {}

    // ── Dados inspetor ─────────────────────────────────────────────────────
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
    const razaoSocialIns = xe(inspetor?.razao_social||inspetor?.nome_inspetor||'')

    // Data
    const hoje = new Date()
    const dataHoje = hoje.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})
    const mesAno = `${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`
    const cidade = xe(estab?.cidade||'')
    const uf     = xe(estab?.uf||'')
    const labelDoc = (cnpjoucpf||'').replace(/\D/g,'').length === 11 ? 'CPF' : 'CNPJ'

    // ── CSS idêntico aos laudos 41-44 ─────────────────────────────────────
    const CSS = `
@page {
  size: A4; margin: 25mm 20mm 20mm 25mm;
  @top-center {
    content: ${JSON.stringify(cabIns)};
    font-family: Arial, sans-serif; font-size: 13pt; font-weight: bold; color: #1E3A8A;
    border-bottom: 1.5px solid #1E3A8A; padding-bottom: 4pt; width: 100%; text-align: center;
  }
  @bottom-left {
    content: ${JSON.stringify(rodIns)};
    font-family: Arial, sans-serif; font-size: 7.5pt; color: #374151;
    border-top: 1px solid #ccc; padding-top: 3pt;
  }
  @bottom-center { content: ''; border-top: 1px solid #ccc; padding-top: 3pt; }
  @bottom-right {
    content: "Pág. " counter(page);
    font-family: Arial, sans-serif; font-size: 7.5pt; color: #374151;
    border-top: 1px solid #ccc; padding-top: 3pt;
  }
}
@page :first {
  margin: 8mm 20mm 8mm 25mm;
  counter-reset: page 0;
  @top-left-corner  { content: ''; background: #1E3A8A; }
  @top-left         { content: ''; background: #1E3A8A; }
  @top-center       { content: ''; background: #1E3A8A; }
  @top-right        { content: ''; background: #1E3A8A; }
  @top-right-corner { content: ''; background: #1E3A8A; }
  @bottom-left-corner  { content: ''; background: #1E3A8A; }
  @bottom-left         { content: ''; background: #1E3A8A; }
  @bottom-center       { content: ''; background: #1E3A8A; }
  @bottom-right        { content: ''; background: #1E3A8A; }
  @bottom-right-corner { content: ''; background: #1E3A8A; }
}
@media print {
  head, title { display: none; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; color: #000; background: #fff; font-size: 9pt; line-height: 1.5; }
p { margin: 4pt 0; text-align: justify; color: #000; }
h1, h2, h3 { font-weight: bold; color: #000; margin: 10pt 0 4pt; }
ul, ol { margin: 4pt 0 4pt 1cm; padding: 0; }
li { margin-bottom: 2pt; text-align: justify; }
b, strong { font-weight: bold; }
.section { page-break-before: always; counter-increment: page; }
.no-break { page-break-inside: avoid; }
.ass { margin-top: 40pt; text-align: center; }
@media print { body { font-size: 9pt; } .section { page-break-before: always; counter-increment: page; } table { page-break-inside: auto; outline: 1.5px solid #1E3A8A; } p { page-break-inside: avoid; orphans: 4; widows: 4; } }
.cab { text-align: center; font-weight: bold; font-size: 10pt; color: #1E3A8A; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; margin-bottom: 6pt; }
.rod { margin-top: 10pt; padding-top: 4pt; border-top: 1px solid #ccc; font-size: 8pt; text-align: center; white-space: pre-line; color: #374151; }
.pag-num { font-size: 7.5pt; color: #374151; text-align: right; margin-top: 4pt; }
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
.pg-indice { page-break-after: always; padding-top: 10mm; }
.indice-titulo { font-size: 14pt; font-weight: 900; color: #1E3A8A; text-align: center; margin-bottom: 16pt; border-bottom: 2px solid #1E3A8A; padding-bottom: 6pt; }
.indice-item { display: flex; align-items: baseline; padding: 3pt 0; font-size: 9pt; }
.indice-num { min-width: 40pt; font-weight: 700; color: #1E3A8A; flex-shrink: 0; }
.indice-dots { flex: 1; border-bottom: 1px dotted #aaa; margin: 0 4pt 2pt; }
`

    // ── Tabela 1.2 ────────────────────────────────────────────────────────
    const ativos: any[] = estab?.ativos ?? []
    let tabAtivos = ''
    if (grupo5154) {
      const rowsAtivos = ativos.length > 0
        ? ativos.map((a:any) => `<tr>
<td>${xe(a.tipo_ativo||a.tipo||'')}</td>
<td style="text-align:center">${fmtData(a.data_inicio_operacao||a.data_habite_se)}</td>
<td style="text-align:center">${xe(a.numero_pavimentos||estab?.numero_pavimentos||'')}</td>
<td style="text-align:center">${xe(a.numero_unidades_salas||estab?.numero_unidades_salas||'')}</td>
</tr>`).join('')
        : `<tr><td>${xe(estab?.tipo_imovel||'—')}</td><td style="text-align:center">${fmtData(estab?.data_habite_se)}</td><td style="text-align:center">${xe(estab?.numero_pavimentos||'')}</td><td style="text-align:center">${xe(estab?.numero_unidades_salas||'')}</td></tr>`
      tabAtivos = `<div class="titulo">1.2.- Ativos para Manutenção.</div>
<div class="bloco"><div class="bloco-header">Ativos para Manutenção</div><table><tr><th style="text-align:left;width:40%">Tipo de ativo</th><th style="width:20%">Data Habite-se</th><th style="width:20%">Nº pavtos</th><th style="width:20%">Aptos/Salas</th></tr>${rowsAtivos}</table></div>`
    } else {
      const rowsAtivos = ativos.length > 0
        ? ativos.map((a:any) => `<tr>
<td>${xe(a.tipo_ativo||a.tipo||'')}</td>
<td style="text-align:center">${xe(a.tag_ativo_nr_serie||a.tag||'')}</td>
<td style="text-align:center">${fmtData(a.data_inicio_operacao)}</td>
<td>${xe(a.subtipo||'')}</td>
</tr>`).join('')
        : '<tr><td colspan="4" style="color:#9a3412;font-style:italic">Nenhum ativo cadastrado.</td></tr>'
      tabAtivos = `<div class="titulo">1.2.- Ativos para Manutenção.</div>
<div class="bloco"><div class="bloco-header">Ativos para Manutenção</div><table><tr><th style="text-align:left;width:30%">Tipo de ativo</th><th style="width:25%">Tag/Nº Série</th><th style="width:25%">Início operação</th><th style="width:20%">Subtipo</th></tr>${rowsAtivos}</table></div>`
    }

    // ── Item 1.1 ──────────────────────────────────────────────────────────
    const S11 = `<div class="titulo">1.1.- Identificação da Edificação/Estabelecimento.</div>
<div class="bloco">
<div class="bloco-header">Identificação da Edificação/Estabelecimento</div>
<div class="row">
  <div class="cell cell-3"><label>Razão Social / Nome</label><div class="val">${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div></div>
  <div class="cell"><label>${labelDoc}</label><div class="val">${fmtDoc(cnpjoucpf||'')}</div></div>
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

    // ── Índice ─────────────────────────────────────────────────────────────
    const indiceItens = [
      {n:'1.',      t:'Considerações Preliminares', n1:true},
      {n:'1.1.-',   t:'Identificação da Edificação/Estabelecimento', n1:false},
      {n:'1.2.-',   t:'Ativos para Manutenção', n1:false},
      {n:'2.',      t:'Objetivos', n1:true},
      {n:'3.',      t:'Base Normativa', n1:true},
      {n:'4.',      t:'Responsabilidade da Contratada', n1:true},
      {n:'5.',      t:'Exigências Mínimas para Execução dos Serviços', n1:true},
      {n:'5.1.-',   t:'Planejamento', n1:false},
      {n:'5.2.-',   t:'Segurança', n1:false},
      {n:'5.3.-',   t:'Recursos', n1:false},
      {n:'5.4.-',   t:'Execução', n1:false},
      {n:'6.',      t:'Recebimento dos Serviços', n1:true},
      {n:'7.',      t:'Apresentação da Proposta', n1:true},
      {n:'8.',      t:'Critérios para Priorização das Intervenções', n1:true},
      {n:'9.',      t:'Controle da Execução e Indicadores de Desempenho', n1:true},
      {n:'10.',     t:'Considerações Finais', n1:true},
      {n:'Anexo 1', t:'Plano Executivo dos Serviços de Manutenção', n1:true},

    ]
    const pags: Record<string,string> = {
      '1.':      '3', '1.1.-': '3', '1.2.-': '3',
      '2.':      '4', '3.':    '4', '4.':    '4',
      '5.':      '5', '5.1.-': '5', '5.2.-': '5', '5.3.-': '5', '5.4.-': '5',
      '6.':      '6', '7.':    '6', '8.':    '6', '9.':    '6', '10.':   '6',
      'Anexo 1': '7',
    }
        const indiceHtml = indiceItens.map(it =>
      `<div style="display:flex;align-items:baseline;padding:3pt 0;font-family:Arial,sans-serif;font-size:9pt;color:#000">` +
      `<span style="min-width:40pt;flex-shrink:0;color:#000">${it.n}</span>` +
      `<span style="flex:1;color:#000">${xe(it.t)}</span>` +
      `<span style="min-width:24pt;text-align:right;color:#000">${pags[it.n]||''}</span>` +
      `</div>`
    ).join('')

    // ── Anexo 1 (formato aba Excel) ────────────────────────────────────────
    // solução vem do nc.solucaoNC (AIME-NC-DATA)

    // Mapa de ativos por tipo_ativo (de ativos_a_vistoriar, que já tem dados)
    const ativosPorTipo: Record<string,any> = {}
    ;(estab.ativos as any[] ?? []).forEach((a:any) => {
      const k = String(a.tipo_ativo||'').toLowerCase().trim()
      if (k) ativosPorTipo[k] = a
    })

    // Ordenar por: Local ocorrência → Tag/Série → Grau risco DESC
    const ncsArr: any[] = [...(Array.isArray(ncs) ? ncs : [])].sort((a:any,b:any) => {
      const la = String(a.local_ocorrencia||a.local||''), lb = String(b.local_ocorrencia||b.local||'')
      if (la !== lb) return la.localeCompare(lb, 'pt-BR')
      const ta = String(a.tagNrSerie||a.tag_ativo_nr_serie||a.tag||''), tb = String(b.tagNrSerie||b.tag_ativo_nr_serie||b.tag||'')
      if (ta !== tb) return ta.localeCompare(tb, 'pt-BR')
      const gra = Number(a.grau_risco||a.grauRisco||0), grb = Number(b.grau_risco||b.grauRisco||0)
      return grb - gra  // DESC: maior grau primeiro
    })
    let anx1Rows = ''

    let curLocal = '', curCompl = '', curTag = ''
    ncsArr.forEach((nc:any, idx:number) => {
      const local = xe(nc.local_ocorrencia||nc.local||'')
      const compl = xe(nc.complemento_local||nc.complemento||'')
      // Cruzar NC com ativo: por tagNrSerie → tipo_ativo → sequência por fotoNr
      const ncTag   = String(nc.tagNrSerie||nc.tag_ativo_nr_serie||'').trim()
      const ncTipo  = String(nc.tipoAtivo||nc.tipo_ativo||'').toLowerCase().trim()
      const fotoSeq = (Number(nc.fotoNr||nc.numero_foto||idx+1)||idx+1) - 1
      const ativoByTag  = ncTag ? (estab.ativos as any[]).find((a:any)=>String(a.tag_ativo_nr_serie||'').trim()===ncTag) : null
      const ativoByTipo = ncTipo ? ativosPorTipo[ncTipo] : null
      const ativoBySeq  = (estab.ativos as any[])[fotoSeq % Math.max((estab.ativos as any[]).length,1)]
      const ativoRow    = ativoByTag || ativoByTipo || ativoBySeq || {}
      const tag   = xe((ativoRow as any).tag_ativo_nr_serie||ncTag||'')
      const ativo = xe((ativoRow as any).tipo_ativo||ncTipo||'')
      const gr  = Number(nc.grau_risco||nc.grauRisco)||0
      const cor = gr>80?'#CC0000':gr>=50?'#E8A000':gr>=30?'#EAB308':'#16A34A'
      const pri = gr>80?'Muito Alta':gr>=50?'Alta':gr>=30?'Média':'Baixa'
      // Novo bloco quando muda local OU tag (2.9.2-n)
      if (local !== curLocal || tag !== curTag) {
        anx1Rows += `<tr style="background:#dbeafe">
<td colspan="2" style="font-size:6.5pt;color:#1E3A8A;padding:1pt 5pt"><b>Local ocorrência:</b></td>
<td colspan="2" style="font-size:6.5pt;color:#1E3A8A;padding:1pt 5pt"><b>Tag/Nº Série — Ativo:</b></td>
<td rowspan="2" style="font-size:8pt;font-weight:700;color:#1E3A8A;padding:3pt;text-align:center;vertical-align:middle;border:1px solid #1E3A8A">Foto Laudo</td>
</tr>
<tr style="background:#eff6ff">
<td colspan="2" style="font-size:7.5pt;padding:2pt 5pt">${local}${compl ? ' / ' + compl : ''}</td>
<td colspan="2" style="font-size:7.5pt;padding:2pt 5pt">${tag} — ${ativo}</td>

</tr>`
        curLocal = local; curTag = tag
      }
      anx1Rows += `<tr>
<td style="text-align:center">${idx+1}</td>
<td>${xe(nc.descricao_nao_conformidade||nc.nc||'')}</td>
<td style="text-align:center;font-weight:700;color:${cor}">${pri}</td>
<td>${xe(nc.procedimento_corretivo||'')}</td>
<td style="text-align:center;border:1px solid #1E3A8A">${xe(String(nc.fotoNr||nc.numero_foto||""))}</td>
</tr>`
    })

    // ── HTML completo ─────────────────────────────────────────────────────
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${xe(titulo)}</title><style>${CSS}</style></head><body>


${(() => {
  const capaEnderecoPM = [xe(estab?.logradouro||''), estab?.cidade && estab?.uf ? `${xe(estab.cidade)}/${xe(estab.uf)}` : xe(estab?.cidade||estab?.uf||'')].filter(Boolean).join(' — ')
  const capaLogoTagPM = logoB64
    ? `<img src="${logoB64}" style="max-height:28mm;max-width:95mm">`
    : (cabIns ? `<div style="font-family:Arial,sans-serif;font-size:18pt;font-weight:900;color:#1E3A8A;line-height:1.3">${cabIns}</div>` : '')
  return `
<div class="pg-capa" style="page-break-after:always;position:relative;height:281mm;font-family:Arial,sans-serif">
  ${capaLogoTagPM ? `<div style="position:absolute;top:16mm;left:0;right:0;text-align:center">${capaLogoTagPM}</div>` : ''}
  <div style="position:absolute;top:120mm;left:0;right:0;text-align:center">
    <div style="font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:8pt">PLANO DE MANUTENÇÃO</div>
    <div style="font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:8pt">${xe(titulo)}</div>
    <div style="font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt">${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div>
    ${capaEnderecoPM ? `<div style="font-size:9pt;color:#374151">${capaEnderecoPM}</div>` : ''}
  </div>
  <div style="position:absolute;top:238mm;left:0;right:0">
    <div style="border-top:2px solid #1E3A8A;margin:0"></div>
    <div style="padding:3mm 0 1mm;font-size:9.5pt;color:#222;line-height:1.9">
      <b style="color:#1E3A8A">Inspetor Respons&aacute;vel:</b> ${nomeIns}<br>
      ${tituloIns ? `<b style="color:#1E3A8A">T&iacute;tulo Profissional:</b> ${xe(tituloIns)}${siglaIns||numIns ? ' &mdash; ' + xe(siglaIns + ' ' + numIns) : ''}<br>` : ''}
      ${inspetor?.especializacao ? `<b style="color:#1E3A8A">Especialidade:</b> Especialista ${xe(inspetor.especializacao)}<br>` : ''}
      <b style="color:#1E3A8A">Data:</b> ${xe(new Date().toLocaleDateString('pt-BR'))}
    </div>
  </div>
</div>
`
})()}


<div class="section"><div class="pg-indice">

  <div class="indice-titulo">ÍNDICE</div>
  ${indiceHtml}
  <br>
  <p style="text-align:center;font-size:8pt;color:#6B7280">${cidade}/${uf} — ${mesAno}</p>
</div></div>


<div>
<div style="height:80pt"></div>
<div class="titulo">1.- Considerações Preliminares.</div>
<p>&nbsp;</p>
<p>A execução da manutenção representa uma das principais ações para garantir a continuidade operacional das edificações e dos processos, proteger pessoas e trabalhadores, preservar o patrimônio, e assegurar a conformidade com a legislação vigente.</p>
<p>O presente Plano de Manutenção foi elaborado a partir das informações constantes no Laudo Técnico de Inspeção, constituindo o principal documento de planejamento das ações corretivas e preventivas destinadas à eliminação ou mitigação das não conformidades identificadas durante a inspeção.</p>
<p>As intervenções previstas deverão ser executadas observando-se a criticidade atribuída às não conformidades, a probabilidade de ocorrência de falhas, os riscos à segurança das pessoas e trabalhadores, a conservação das edificações, os impactos sobre os equipamentos e as exigências legais e normativas aplicáveis.</p>
<p>Este documento deverá orientar a execução, o acompanhamento, a fiscalização, a homologação e o recebimento dos serviços de manutenção.</p>

${S11}

${tabAtivos}

</div>


<div class="titulo">2.- Objetivos.</div>
${paragrafoHtml(grupo5154?OBJETIVOS_51_54:OBJETIVOS_55_58)}

<div class="titulo">3.- Base normativa.</div>
<p>&nbsp;</p>
<p>Os serviços previstos neste plano deverão ser executados em conformidade com a legislação vigente, observando as normas regulamentadoras, normas técnicas brasileiras, normas internacionais, manuais dos fabricantes e equipamentos, procedimentos internos do contratante e demais dispositivos legais aplicáveis à atividade.</p>
<p>${xe(BASE_NORMATIVA[ts]||'')}</p>

<div class="titulo">4.- Responsabilidade da Contratada.</div>
<p>&nbsp;</p>
<p>A responsabilidade pela execução dos serviços até a sua conclusão, formalizada pela assinatura do "Termo de Recebimento", é integralmente da contratada nos termos do Código Civil Brasileiro. Assim, quaisquer danos aos serviços já realizados, ou danos causados a terceiros, a reparação é de total responsabilidade da contratada.</p>
<p>A guarda e vigilância das ferramentas, equipamentos e dos materiais necessários à execução dos serviços são de inteira responsabilidade da contratada.</p>
<p>Compete-lhe:</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;fornecer profissionais legalmente habilitados;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;designar responsável técnico e emitir ART/RRT quando aplicável;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;fornecer materiais certificados e utilizar equipamentos calibrados;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;cumprir integralmente as normas de segurança;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;preservar a limpeza das áreas e registrar todas as intervenções;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;comunicar imediatamente situações de risco grave;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;responder pela qualidade técnica dos serviços.</p>

</div>


<div class="titulo">5.- Exigências Mínimas para Execução dos Serviços.</div>
<p>&nbsp;</p>
<p>Todas as intervenções deverão ser executadas mediante planejamento prévio, observando critérios técnicos, operacionais e de segurança.</p>
<div class="titulo">5.1.- Planejamento.</div>
<p>Antes do início dos serviços deverão ser realizados: análise do laudo técnico; cronograma executivo seguindo a definição das prioridades; programação de desligamentos; levantamento dos recursos necessários.</p>
<div class="titulo">5.2.- Segurança.</div>
<p>Toda intervenção deverá observar: análise preliminar de riscos; permissão de trabalho; bloqueio e etiquetagem; isolamento das áreas; utilização de EPI; utilização de EPC; sinalização da área.</p>
<div class="titulo">5.3.- Recursos.</div>
<p>A contratada deverá disponibilizar: equipe qualificada; ferramentas adequadas; instrumentos calibrados; peças certificadas; documentação técnica.</p>
<div class="titulo">5.4.- Execução.</div>
<p>Os serviços poderão compreender: demolição e desmontagem controlada; limpeza técnica; lubrificação; reapertos; regulagens; calibrações; substituição de componentes; recuperação dos sistemas de proteção; ensaios e testes funcionais; remoção de entulho; atualização documental.</p>

<div class="titulo">6.- Recebimento dos Serviços.</div>
<p>&nbsp;</p>
<p>Concluídas as intervenções, será realizada inspeção técnica de recebimento para verificar a conformidade dos serviços executados em relação às especificações técnicas, normativas e legais aplicáveis.</p>
<p>O recebimento dependerá da comprovação de que:</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;todas as não conformidades foram devidamente tratadas;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;as instalações e os equipamentos operam adequadamente;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;os testes e ensaios apresentaram resultados satisfatórios;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;a documentação técnica foi atualizada;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;os registros de manutenção foram emitidos;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;foram emitidos registros e documentação técnica dos serviços executados.</p>
<p>O recebimento dos serviços será formalizado pela assinatura do documento Termo de Recebimento.</p>

<div class="titulo">7.- Apresentação da Proposta.</div>
<p>&nbsp;</p>
<p>A proposta técnica deverá demonstrar a capacidade operacional da contratada para a execução dos serviços de manutenção e conter, no mínimo: identificação da empresa e responsável técnico; escopo detalhado dos serviços; metodologia de execução; cronograma; equipe técnica habilitada; materiais e equipamentos; prazo de execução e garantia; valor global e condições comerciais.</p>

<div class="titulo">8.- Critérios para priorização das intervenções.</div>
<p>&nbsp;</p>
<p>As intervenções deverão ser priorizadas conforme o grau de criticidade das não conformidades identificadas no Laudo Técnico de Inspeção, considerando os riscos à segurança das pessoas, à integridade dos equipamentos, à continuidade operacional e ao atendimento da legislação.</p>
<p>Como diretriz geral:</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;criticidade muito alta: intervenção imediata;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;criticidade alta: atendimento prioritário;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;criticidade média: execução programada em curto prazo;</p>
<p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;criticidade baixa: inserção no plano periódico de manutenção.</p>

<div class="titulo">9.- Controle da execução e indicadores de desempenho.</div>
<p>&nbsp;</p>
<p>O acompanhamento da execução será realizado durante toda a vigência deste Plano de Manutenção, permitindo verificar o cumprimento dos prazos, a qualidade das intervenções e a eficácia das ações implementadas.</p>
<p>O monitoramento poderá adotar os seguintes indicadores: percentual de serviços concluídos; percentual de pendências; prazo médio de atendimento; índice de reincidência de falhas; disponibilidade dos equipamentos; percentual de conformidade alcançado após a execução das intervenções.</p>

<div class="titulo">10.- Considerações Finais.</div>
<p>&nbsp;</p>
<p>A execução das ações de manutenção previstas neste Plano contribui para a preservação das condições de segurança, confiabilidade e desempenho dos ativos, reduzindo a ocorrência de falhas e riscos operacionais.</p>
<p>Sua implementação contínua favorece a proteção da vida e da integridade das pessoas, a preservação do patrimônio, a continuidade das atividades e o aumento da vida útil dos sistemas e equipamentos.</p>
<p>Recomenda-se que este Plano seja periodicamente revisado e atualizado, assegurando a melhoria contínua dos processos de manutenção e da gestão dos ativos.</p>

<div style="margin-top:40pt">
  <p style="text-align:right">${cidade}/${uf}, ${dataHoje}.</p>
  <br><br><br>
  <p>${nomeIns}</p>
  <p>${xe(inspetor?.titulo_profissional||tituloIns)} — ${siglaIns} ${xe(numIns)}</p>
  ${espIns?`<p>${espIns}</p>`:''}
</div>

</div>
<div class="section" style="page-break-before:always">
<div style="text-align:center;font-size:11pt;font-weight:700;margin:4pt 0 6pt;color:#1E3A8A">Anexo 1 – Plano Executivo dos Serviços de Manutenção</div>
<table style="font-size:7.5pt;width:100%;border-collapse:collapse;border:1.5px solid #1E3A8A">
<tr>
  <th colspan="5" style="text-align:center;font-size:10pt;font-weight:700;background:#1E3A8A;color:#fff;padding:6pt;border-bottom:2px solid #fff">Plano Executivo para os Serviços de Manutenção</th>
</tr>
<tr>
  <th style="width:4%">ID</th>
  <th style="width:35%;text-align:left">Não Conformidade</th>
  <th style="width:5%;text-align:center">Prior.</th>
  <th style="width:50%;text-align:left">Intervenção sugerida</th>
  <th style="width:6%;text-align:center">Foto Nº</th>
</tr>
${anx1Rows||'<tr><td colspan="5" style="text-align:center;color:#9a3412;font-style:italic;padding:12pt">Nenhuma não conformidade registrada.</td></tr>'}
</table>
</div>


</body></html>`

    // Salvar
    await supabase.storage.from('aime').remove([`documentos_inspetor/${nomeArquivo}`])
    const { error } = await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, new Blob([html], { type: 'text/html' }), { upsert: true, contentType: 'text/html' })
    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    return NextResponse.json({ sucesso: true, nome: nomeArquivo, html })

  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 })
  }
}
