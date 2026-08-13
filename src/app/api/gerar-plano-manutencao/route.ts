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
  '58':'Plano de Manutenção — Caldeiras e Vasos de Pressão NR-13'
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
  '51': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16747 – Inspeção Predial; ABNT NBR 5674 – Manutenção de Edificações; ABNT NBR 14037 – Manual de Uso, Operação e Manutenção das Edificações; ABNT NBR 17170; ABNT NBR 16280 – Reforma em Edificações; ABNT NBR 15575 (Partes 1 a 6) – Edificações Habitacionais; ABNT NBR 6118 – Projeto de Estruturas de Concreto; ABNT NBR 5410 – Instalações Elétricas de Baixa Tensão; ABNT NBR 5626 – Sistemas Prediais de Água Fria; ABNT NBR 8160 – Sistemas Prediais de Esgoto Sanitário; projetos executivos, memoriais descritivos, manuais da edificação e documentação técnica disponível; procedimentos internos do contratante; demais normas técnicas aplicáveis aos sistemas e subsistemas construtivos existentes.',
  '52': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16747 – Inspeção Predial; ABNT NBR 5674 – Manutenção de Edificações; ABNT NBR 14037 – Manual de Uso, Operação e Manutenção das Edificações; ABNT NBR 17170; ABNT NBR 16280 – Reforma em Edificações; ABNT NBR 15575 (Partes 1 a 6) – Edificações Habitacionais; ABNT NBR 6118 – Projeto de Estruturas de Concreto; ABNT NBR 5410 – Instalações Elétricas de Baixa Tensão; ABNT NBR 5626 – Sistemas Prediais de Água Fria; ABNT NBR 8160 – Sistemas Prediais de Esgoto Sanitário; projetos executivos, memoriais descritivos, manuais da edificação e documentação técnica disponível; procedimentos internos do contratante; demais normas técnicas aplicáveis aos sistemas e subsistemas construtivos existentes.',
  '53': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza dos sistemas inspecionados: ABNT NBR 15575 (Partes 1 a 6) – Edificações Habitacionais – Desempenho; ABNT NBR 5674 – Manutenção de Edificações; ABNT NBR 14037 – Manual de Uso, Operação e Manutenção das Edificações; ABNT NBR 16280 – Reforma em Edificações; ABNT NBR 6118 – Projeto de Estruturas de Concreto; ABNT NBR 5626 – Sistemas Prediais de Água Fria; ABNT NBR 8160 – Sistemas Prediais de Esgoto Sanitário; ABNT NBR 5410 – Instalações Elétricas de Baixa Tensão; projetos executivos, memoriais descritivos, especificações técnicas e documentos de entrega da obra; manuais técnicos dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '54': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16747 – Inspeção Predial; ABNT NBR 13755 – Revestimentos de Paredes Externas e Fachadas; ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 5674 – Manutenção de Edificações; ABNT NBR 6118 – Projeto de Estruturas de Concreto; ABNT NBR 10821 – Esquadrias; ABNT NBR 7199 – Vidros; normas e recomendações do IBAPE; legislação estadual e municipal relativa à inspeção e manutenção de fachadas; projetos executivos e especificações técnicas; manuais de uso, operação e manutenção; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '55': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16858 (Partes 1, 2 e 3) – Inspeção de Segurança em Elevadores; ABNT NBR 16083 – Manutenção de Elevadores; ABNT NBR NM 207 – Elevadores Elétricos de Passageiros; ABNT NBR NM 267 – Elevadores Hidráulicos; ABNT NBR 9050 – Acessibilidade; NR-10 – Segurança em Eletricidade; NR-35 – Trabalho em Altura; legislação estadual e municipal aplicável; contratos de manutenção vigentes; manuais técnicos do fabricante; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '56': 'Sem prejuízo de outras normas específicas, destacam-se: NR-10 – Segurança em Instalações e Serviços em Eletricidade; NR-01 – Disposições Gerais e Gerenciamento de Riscos; NR-06 – EPI; NR-23 – Proteção Contra Incêndios; NR-26 – Sinalização de Segurança; NR-35 – Trabalho em Altura; ABNT NBR 5410 – Instalações Elétricas de Baixa Tensão; ABNT NBR 14039 – Instalações Elétricas de Média Tensão; ABNT NBR 5419 (Partes 1 a 4) – Proteção contra Descargas Atmosféricas; manuais técnicos dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '57': 'Sem prejuízo de outras normas específicas, aplicam-se: NR-12 – Segurança no Trabalho em Máquinas e Equipamentos; NR-01 – Disposições Gerais e Gerenciamento de Riscos; NR-06 – EPI; NR-10 – Segurança em Eletricidade; NR-17 – Ergonomia; NR-35 – Trabalho em Altura; ABNT NBR ISO 12100 – Segurança de Máquinas; ABNT NBR IEC 60204-1 – Equipamento Elétrico de Máquinas; ABNT NBR ISO 13849 (Partes 1 e 2) – Sistemas de Comando Relacionados à Segurança; manuais técnicos dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '58': 'Sem prejuízo de outras normas específicas, aplicam-se: NR-13 – Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos; NR-01 – Disposições Gerais e Gerenciamento de Riscos; NR-06 – EPI; NR-10 – Segurança em Eletricidade; NR-20 – Inflamáveis e Combustíveis; NR-33 – Espaços Confinados; NR-35 – Trabalho em Altura; ABNT NBR ISO 16528 (Partes 1 e 2) – Caldeiras e Vasos de Pressão; API 510 – Pressure Vessel Inspection Code; API 570 – Piping Inspection Code; projetos executivos e prontuários dos equipamentos; manuais dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.'
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
  const n=(v||'').replace(/\D/g,'')
  return n.length>=8?n.slice(0,5)+'-'+n.slice(5,8):v||''
}
function fmtTel(v: string): string {
  const n=(v||'').replace(/\D/g,'')
  if(n.length===11) return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7)
  if(n.length===10) return '('+n.slice(0,2)+') '+n.slice(2,6)+'-'+n.slice(6)
  return v||''
}

// Título limpo do inspetor (sem prefixo numérico se houver)
function tituloLimpo(v: string): string {
  return (v||'').replace(/^\d+\s*[-–]\s*/,'').trim()
}
// Conselho (CREA/CAU) baseado no título
function conselho(titulo: string): string {
  const t = (titulo||'').toLowerCase()
  if (t.includes('arquiteto') || t.includes('arquitetura')) return 'CAU'
  return 'CREA'
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function listaHtml(txt: string): string {
  const linhas = txt.split('\n').map(l => l.trim()).filter(Boolean)
  let html = ''
  let emLista = false
  for (const l of linhas) {
    if (l.startsWith('-')) {
      if (!emLista) { html += '<ul>'; emLista = true }
      html += `<li>${xe(l.slice(1).trim())}</li>`
    } else {
      if (emLista) { html += '</ul>'; emLista = false }
      html += `<p>${xe(l)}</p>`
    }
  }
  if (emLista) html += '</ul>'
  return html
}

export async function POST(request: NextRequest) {
  try {
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico, estab, inspetor, nomeArquivo, ncs } = await request.json()

    if (!cpfInspetor || !tipoServico || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    const ts = String(tipoServico)
    const titulo = TITULO_PLANO[ts] ?? 'Plano de Manutenção'
    const grupo5154 = ['51','52','53','54'].includes(ts)
    const objetivos = grupo5154 ? OBJETIVOS_51_54 : OBJETIVOS_55_58
    const baseNorm  = BASE_NORMATIVA[ts] ?? ''

    // Dados do inspetor — buscar cabecalho do BD se não veio no payload
    let inspFull = inspetor ?? {}
    if (cpfInspetor && !inspFull.nome_inspetor) {
      const { data } = await supabase.from('inspetor')
        .select('nome_inspetor,titulo_profissional,inscricao_crea_cau,especializacao,cabecalho_documentos,rodape_documentos')
        .eq('cpf_inspetor', cpfInspetor).single()
      if (data) inspFull = data
    }

    const nomeIns   = xe(inspFull.nome_inspetor || '')
    const titIns    = tituloLimpo(inspFull.titulo_profissional || '')
    const conselhoS = conselho(inspFull.titulo_profissional || '')
    const nrCrea    = xe(inspFull.inscricao_crea_cau || '')
    const espIns    = inspFull.especializacao ? xe(inspFull.especializacao) : ''
    const cabDoc    = inspFull.cabecalho_documentos || `${titIns} — ${conselhoS} ${nrCrea}`
    const rodDoc    = inspFull.rodape_documentos || 'Mapeamento Inteligente de Edificações e Equipamentos'

    // Data e localização
    const hoje   = new Date()
    const mesAno = `${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`
    const cidade  = xe(estab?.cidade || '')
    const uf      = xe(estab?.uf || '')
    const dataExtenso = hoje.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})

    // Tabela 1.2
    const ativos: any[] = estab?.ativos ?? []
    let tabAtivos = ''
    if (grupo5154) {
      const rows = ativos.length > 0
        ? ativos.map((a:any) => `<tr>
            <td>${xe(a.tipo_ativo||a.tipo||'')}</td>
            <td style="text-align:center">${fmtData(a.data_inicio_operacao||a.data_habite_se)}</td>
            <td style="text-align:center">${xe(a.numero_pavimentos||estab?.numero_pavimentos||'')}</td>
            <td style="text-align:center">${xe(a.numero_unidades_salas||estab?.numero_unidades_salas||'')}</td>
          </tr>`).join('')
        : `<tr><td>${xe(estab?.tipo_imovel||'Edificação')}</td><td style="text-align:center">${fmtData(estab?.data_habite_se)}</td><td style="text-align:center">${xe(estab?.numero_pavimentos||'')}</td><td style="text-align:center">${xe(estab?.numero_unidades_salas||'')}</td></tr>`
      tabAtivos = `<table class="tbl-pm">
        <tr><th>Tipo de ativo</th><th>Data Habite-se</th><th>Nº pavtos</th><th>Aptos/Salas</th></tr>
        ${rows}
      </table>`
    } else {
      const rows = ativos.length > 0
        ? ativos.map((a:any) => `<tr>
            <td>${xe(a.tipo_ativo||a.tipo||'')}</td>
            <td style="text-align:center">${xe(a.tag_ativo_nr_serie||a.tag||'')}</td>
            <td style="text-align:center">${fmtData(a.data_inicio_operacao)}</td>
            <td>${xe(a.subtipo||'')}</td>
          </tr>`).join('')
        : '<tr><td colspan="4" style="color:#9a3412;font-style:italic">Nenhum ativo cadastrado.</td></tr>'
      tabAtivos = `<table class="tbl-pm">
        <tr><th>Tipo de ativo</th><th>Tag/Nº Série</th><th>Início operação</th><th>Subtipo</th></tr>
        ${rows}
      </table>`
    }

    // Anexo 1 — formato exato da aba Anexo 1_pl_manutenção
    const ncsArr: any[] = Array.isArray(ncs) ? ncs : []
    // Ordenar por local + complemento
    ncsArr.sort((a,b) => {
      const la = (a.local_ocorrencia||'')+(a.complemento_local||'')
      const lb = (b.local_ocorrencia||'')+(b.complemento_local||'')
      return la.localeCompare(lb)
    })

    // Agrupar por local+complemento+tag+ativo
    type GrupoAnx1 = { local: string; complemento: string; tag: string; ativo: string; ncs: any[] }
    const grupos: GrupoAnx1[] = []
    for (const nc of ncsArr) {
      const local = nc.local_ocorrencia || ''
      const comp  = nc.complemento_local || ''
      const tag   = nc.tag_ativo_nr_serie || ''
      const ativo = nc.tipo_ativo || ''
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && ultimo.local === local && ultimo.complemento === comp && ultimo.tag === tag && ultimo.ativo === ativo) {
        ultimo.ncs.push(nc)
      } else {
        grupos.push({ local, complemento: comp, tag, ativo, ncs: [nc] })
      }
    }

    const anexo1Rows = grupos.map((g, gi) => {
      const grNnrMax = Math.max(...g.ncs.map((nc:any) => Number(nc.grau_risco||0)))
      const corMax   = grNnrMax>80?'#CC0000':grNnrMax>=50?'#E8A000':grNnrMax>=30?'#EAB308':'#16A34A'
      // Linha de cabeçalho do grupo
      const headerRow = `<tr style="background:#dbeafe">
        <td colspan="2" style="border:1px solid #1E3A8A;padding:4pt 6pt;font-size:8pt"><b>Local ocorrência:</b> ${xe(g.local)}</td>
        <td colspan="2" style="border:1px solid #1E3A8A;padding:4pt 6pt;font-size:8pt"><b>Complemento local:</b> ${xe(g.complemento)}</td>
        <td colspan="2" style="border:1px solid #1E3A8A;padding:4pt 6pt;font-size:8pt"><b>Tag/Nº Série:</b> ${xe(g.tag)}</td>
        <td colspan="1" style="border:1px solid #1E3A8A;padding:4pt 6pt;font-size:8pt"><b>Ativo:</b> ${xe(g.ativo)}</td>
        <td style="border:1px solid #1E3A8A;padding:4pt 6pt;font-size:8pt;text-align:center"><b>Conclusão</b><br><span style="font-size:7pt">Rubrica</span></td>
      </tr>`
      // Linhas de NCs
      const ncRows = g.ncs.map((nc:any, idx:number) => {
        const grNnr = Number(nc.grau_risco||0)
        const corP  = grNnr>80?'#CC0000':grNnr>=50?'#E8A000':grNnr>=30?'#EAB308':'#16A34A'
        const priP  = grNnr>80?'Muito Alta':grNnr>=50?'Alta':grNnr>=30?'Média':'Baixa'
        return `<tr>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt;text-align:center">${gi*100+idx+1}</td>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt">${xe(nc.descricao_nao_conformidade||nc.nc||'')}</td>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt;text-align:center;font-weight:700;color:${corP}">${grNnr}</td>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt;text-align:center;font-weight:700;color:${corP}">${priP}</td>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt">${xe(nc.descricao_solucao_nc||nc.solucao||'')}</td>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt">${xe(nc.procedimento_corretivo||'')}</td>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt;text-align:center">${xe(nc.numero_foto||nc.fotoNr||'')}</td>
          <td style="border:1px solid #cbd5e1;padding:3pt 4pt;font-size:7.5pt"></td>
        </tr>`
      }).join('')
      return headerRow + ncRows
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  @page { size: A4; margin: 20mm 15mm 20mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a2e; margin: 0; padding: 2cm 2cm 2cm 2.5cm; line-height: 1.6; }
  .cab { text-align: center; margin-bottom: 10pt; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; font-size: 10pt; font-weight: bold; color: #374151; white-space: pre-line; }
  .rod { margin-top: 10pt; padding-top: 4pt; border-top: 1px solid #ccc; font-size: 8pt; text-align: center; white-space: pre-line; color: #6B7280; }
  h1 { font-size: 13pt; font-weight: 900; color: #1E3A8A; margin: 8pt 0 4pt; }
  h2 { font-size: 10pt; font-weight: bold; color: #1E3A8A; border-bottom: 1px solid #1E3A8A; padding-bottom: 2pt; margin: 14pt 0 6pt; }
  h3 { font-size: 10pt; font-weight: bold; color: #1E3A8A; margin: 10pt 0 4pt; }
  p { margin: 6pt 0; text-align: justify; }
  ul { margin: 4pt 0 4pt 1cm; padding: 0; list-style: none; }
  li::before { content: "- "; }
  li { margin-bottom: 2pt; text-align: justify; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9pt; }
  table.tbl-pm th { background: #1E3A8A; color: #fff; font-weight: 700; border: 1px solid #1E3A8A; padding: 4pt 6pt; text-align: center; }
  table.tbl-pm td { border: 1px solid #cbd5e1; padding: 3pt 6pt; vertical-align: middle; }
  table.tbl-id th { background: #1E3A8A; color: #fff; font-weight: 700; font-size: 9pt; padding: 4pt 8pt; text-align: left; }
  table.tbl-id td { border: 1px solid #cbd5e1; padding: 3pt 8pt; vertical-align: middle; font-size: 9pt; }
  table.tbl-id .lbl { font-size: 7pt; font-weight: 700; color: #1E3A8A; display: block; }
  .secao { page-break-before: always; }
  .capa { page-break-after: always; }
  @media print { .secao { page-break-before: always; } }
</style>
</head>
<body>

<!-- CABEÇALHO DO INSPETOR -->
<div class="cab">${xe(cabDoc)}</div>

<!-- CAPA -->
<div class="capa" style="display:flex;flex-direction:column;min-height:240mm">
  <div style="flex:1"></div>
  <div style="text-align:center;padding:0 20mm">
    <div style="font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:8pt">AIMÊ — Mapeamento Inteligente de Edificações e Equipamentos</div>
    <h1 style="font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:8pt">PLANO DE MANUTENÇÃO</h1>
    <div style="font-size:13pt;font-weight:700;color:#374151;margin-bottom:6pt">${xe(titulo)}</div>
    <div style="font-size:12pt;font-weight:600;color:#1E3A8A">${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div>
  </div>
  <div style="flex:1"></div>
  <div>
    <div style="border-top:2px solid #1E3A8A;margin:0 20mm"></div>
    <div style="padding:6mm 20mm;font-size:9.5pt;color:#222;line-height:1.9">
      <b style="color:#1E3A8A">Inspetor Responsável:</b> ${nomeIns}<br>
      <b style="color:#1E3A8A">Título Profissional:</b> ${xe(titIns)} — ${conselhoS} ${nrCrea}${espIns?'<br><b style="color:#1E3A8A">Especialidade:</b> Especialista '+espIns:''}
    </div>
    <div style="background:#1E3A8A;height:8mm"></div>
    <div style="text-align:center;padding:4mm 0;font-size:9pt;color:#374151">${cidade}/${uf} — ${mesAno}</div>
  </div>
</div>

<!-- ÍNDICE -->
<div class="secao">
  <h1 style="border-bottom:2px solid #1E3A8A;padding-bottom:4pt">${xe(titulo)}</h1>
  <div style="font-size:9pt;line-height:2">
    <p style="margin:0"><b>1.- Identificação e Caracterização da Edificação/Estabelecimento</b></p>
    <p style="margin:0;padding-left:12pt">1.1.- Identificação da Edificação/Estabelecimento</p>
    <p style="margin:0;padding-left:12pt">1.2.- Ativos para Manutenção</p>
    <p style="margin:0"><b>2.- Objetivos</b></p>
    <p style="margin:0"><b>3.- Base Normativa</b></p>
    <p style="margin:0"><b>4.- Responsabilidade da Contratada</b></p>
    <p style="margin:0"><b>5.- Exigências Mínimas para Execução dos Serviços</b></p>
    <p style="margin:0"><b>6.- Recebimento dos Serviços</b></p>
    <p style="margin:0"><b>7.- Apresentação da Proposta</b></p>
    <p style="margin:0"><b>8.- Critérios para Priorização das Intervenções</b></p>
    <p style="margin:0"><b>9.- Controle da Execução e Indicadores de Desempenho</b></p>
    <p style="margin:0"><b>10.- Considerações Finais</b></p>
    <p style="margin:0"><b>Anexo 1 – Plano Executivo dos Serviços</b></p>
    <p style="margin:0"><b>Anexo 2 – Modelo de Termo de Recebimento de Serviços</b></p>
  </div>
</div>

<!-- CORPO -->
<div class="secao">

<h2>1.- Considerações Preliminares.</h2>
<p>A execução da manutenção representa uma das principais ações para garantir a continuidade operacional das edificações e dos processos, proteger pessoas e trabalhadores, preservar o patrimônio, e assegurar a conformidade com a legislação vigente.</p>
<p>O presente Plano de Manutenção foi elaborado a partir das informações constantes no Laudo Técnico de Inspeção, constituindo o principal documento de planejamento das ações corretivas e preventivas destinadas à eliminação ou mitigação das não conformidades identificadas durante a inspeção.</p>
<p>As intervenções previstas deverão ser executadas observando-se a criticidade atribuída às não conformidades, a probabilidade de ocorrência de falhas, os riscos à segurança das pessoas e trabalhadores, a conservação das edificações, os impactos sobre os equipamentos e as exigências legais e normativas aplicáveis.</p>
<p>Este documento deverá orientar a execução, o acompanhamento, a fiscalização, a homologação e o recebimento dos serviços de manutenção.</p>
<p>A execução dos serviços de manutenção deverá respeitar, além das recomendações das Normas Técnicas Brasileiras, as recomendações das concessionárias locais e da prefeitura municipal.</p>

<h3>1.1.- Identificação da Edificação/Estabelecimento.</h3>
<table class="tbl-id">
  <tr><th colspan="5">Identificação da Edificação/Estabelecimento:</th></tr>
  <tr>
    <td colspan="2"><span class="lbl">Razão Social / Nome</span>${xe(estab?.razao_social_nome||estab?.razao_social||'')}</td>
    <td><span class="lbl">CNPJ/CPF</span>${fmtDoc(cnpjoucpf||'')}</td>
    <td colspan="2"><span class="lbl">CEP</span>${fmtCep(estab?.cep_estabelecimento||estab?.cep||'')}</td>
  </tr>
  <tr>
    <td colspan="3"><span class="lbl">Endereço</span>${xe(estab?.logradouro||'')}${estab?.numero_imovel?', '+xe(estab.numero_imovel):''}</td>
    <td colspan="2"><span class="lbl">Bairro</span>${xe(estab?.bairro||'')}</td>
  </tr>
  <tr>
    <td colspan="2"><span class="lbl">Cidade e UF</span>${xe(estab?.cidade||'')}/${xe(estab?.uf||'')}</td>
    <td colspan="2"><span class="lbl">Nome do responsável</span>${xe(estab?.nome_responsavel||'')}</td>
    <td><span class="lbl">Função</span>${xe(estab?.funcao_responsavel||'')}</td>
  </tr>
  <tr>
    <td><span class="lbl">Telefone contato</span>${fmtTel(estab?.whatsapp_responsavel||estab?.whatsapp||'')}</td>
    <td colspan="2"><span class="lbl">eMail contato</span>${xe(estab?.email_responsavel||estab?.email||'')}</td>
    <td colspan="2"><span class="lbl">Finalidade da vistoria</span>${xe(estab?.finalidade_vistoria||'')}</td>
  </tr>
  <tr>
    <td><span class="lbl">Uso imóvel</span>${xe(estab?.uso_estabelecimento||estab?.uso_imovel||'')}</td>
    <td><span class="lbl">Tipo imóvel</span>${xe(estab?.tipo_imovel||'')}</td>
    <td style="text-align:center"><span class="lbl">Nr pavimentos</span>${xe(estab?.numero_pavimentos||'')}</td>
    <td style="text-align:center"><span class="lbl">Nr unidades/salas</span>${xe(estab?.numero_unidades_salas||'')}</td>
    <td style="text-align:center"><span class="lbl">Área construída m²</span>${xe(estab?.area_construida||'')}</td>
  </tr>
</table>

<h3>1.2.- Ativos para Manutenção.</h3>
${tabAtivos}

<h2>2.- Objetivos.</h2>
${listaHtml(objetivos)}

<h2>3.- Base Normativa.</h2>
<p>Os serviços previstos neste plano deverão ser executados em conformidade com a legislação vigente, observando as normas regulamentadoras, normas técnicas brasileiras, normas internacionais, manuais dos fabricantes e demais documentos técnicos aplicáveis, sempre prevalecendo a norma tecnicamente mais restritiva.</p>
<p>${xe(baseNorm)}</p>

<h2>4.- Responsabilidade da Contratada.</h2>
<p>A responsabilidade pela execução dos serviços até a sua conclusão, formalizada pela assinatura do "Termo de Recebimento", é integralmente da contratada nos termos do Código Civil Brasileiro. Assim, quaisquer danos aos serviços já realizados, ou danos causados a terceiros, a reparação é de total responsabilidade da contratada.</p>
<p>A guarda e vigilância das ferramentas, equipamentos e dos materiais necessários à execução dos serviços são de inteira responsabilidade da contratada, sendo também deste a responsabilidade pela reposição integral de quaisquer materiais, ferramentas ou equipamentos extraviados ou danificados.</p>
<p>A contratada deverá, ainda, providenciar, além do material de boa qualidade e da mão de obra capacitada, tudo o mais que for necessário, inclusive o pagamento de taxas, emolumentos, e custeio, junto aos órgãos competentes, para que façam as ligações provisórias e definitivas de água, luz e esgotos, se necessário. Deverá também providenciar todas as instalações físicas necessárias ao seu pessoal e guarda de material, ferramentas e equipamentos, em espaço a ser liberado pelo contratante, mediante entendimentos. Também é responsável pela correta identificação da obra com placas, tapumes, etc. conforme exigências do CREA e demais órgãos competentes.</p>
<p>Durante e ao término dos serviços a contratada é responsável por manter a organização e limpeza da obra, retirando todo o entulho gerado, mantendo as instalações em perfeitas condições de asseio e segurança aos funcionários e condôminos.</p>
<p>O acompanhamento e fiscalização da execução dos serviços terá como referência as especificações contidas neste documento.</p>
<p>A contratada será integralmente responsável pela execução técnica dos serviços previstos neste plano. Compete-lhe:</p>
<ul>
  <li>fornecer profissionais legalmente habilitados;</li>
  <li>designar responsável técnico;</li>
  <li>emitir ART/TRT quando aplicável;</li>
  <li>fornecer materiais certificados;</li>
  <li>utilizar equipamentos calibrados;</li>
  <li>cumprir integralmente as normas de segurança;</li>
  <li>preservar a limpeza das áreas;</li>
  <li>registrar todas as intervenções;</li>
  <li>comunicar imediatamente situações de risco grave;</li>
  <li>responder pela qualidade técnica dos serviços.</li>
</ul>

<h2>5.- Exigências Mínimas para Execução dos Serviços.</h2>
<p>Todas as intervenções deverão ser executadas mediante planejamento prévio, observando critérios técnicos, operacionais e de segurança.</p>
<h3>5.1.- Planejamento.</h3>
<p>Antes do início dos serviços deverão ser realizados: análise do laudo técnico; cronograma executivo seguindo a definição das prioridades; programação de desligamentos; levantamento dos recursos necessários.</p>
<h3>5.2.- Segurança.</h3>
<p>Toda intervenção deverá observar: análise preliminar de riscos; permissão de trabalho; bloqueio e etiquetagem; isolamento das áreas; utilização de EPI; utilização de EPC; sinalização da área.</p>
<h3>5.3.- Recursos.</h3>
<p>A contratada deverá disponibilizar: equipe qualificada; ferramentas adequadas; instrumentos calibrados; peças certificadas; documentação técnica.</p>
<h3>5.4.- Execução.</h3>
<p>Os serviços poderão compreender: demolição e desmontagem; limpeza técnica; lubrificação; reapertos; regulagens; calibrações; substituição de componentes; recuperação dos sistemas de proteção; ensaios; remoção de entulho; testes funcionais; atualização documental.</p>

<h2>6.- Recebimento dos Serviços.</h2>
<p>Concluídas as intervenções, será realizada inspeção técnica de recebimento para verificar a conformidade dos serviços executados.</p>
<p>O recebimento dependerá da comprovação de que:</p>
<ul>
  <li>todas as não conformidades foram tratadas;</li>
  <li>as instalações e os equipamentos operam adequadamente;</li>
  <li>os testes apresentaram resultados satisfatórios;</li>
  <li>a documentação técnica foi atualizada;</li>
  <li>os registros de manutenção foram emitidos;</li>
  <li>foram entregues ART/TRT, quando exigidas.</li>
</ul>
<p>Persistindo pendências, será emitida relação de serviços complementares com definição dos respectivos prazos para execução.</p>

<h2>7.- Apresentação da Proposta.</h2>
<p>A proposta técnica deverá demonstrar a capacidade operacional da contratada e conter, no mínimo o seguinte: identificação da empresa; responsável técnico; escopo dos serviços; metodologia; cronograma; equipe técnica; materiais; equipamentos; prazo; garantia; valor global; condições comerciais.</p>

<h2>8.- Critérios para Priorização das Intervenções.</h2>
<p>As intervenções deverão ser priorizadas conforme o grau de criticidade das não conformidades identificadas no Laudo Técnico de Inspeção, considerando os riscos à segurança das pessoas, à integridade dos equipamentos, à continuidade operacional e ao atendimento da legislação.</p>
<p>Como diretriz geral:</p>
<ul>
  <li>criticidade muito alta: intervenção imediata;</li>
  <li>criticidade alta: atendimento prioritário;</li>
  <li>criticidade média: execução programada em curto prazo;</li>
  <li>criticidade baixa: inserção no plano periódico de manutenção.</li>
</ul>

<h2>9.- Controle da Execução e Indicadores de Desempenho.</h2>
<p>O acompanhamento da execução será realizado durante toda a vigência deste Plano de Manutenção, permitindo verificar o cumprimento dos prazos, a qualidade das intervenções e a eficácia das ações implementadas.</p>
<p>O monitoramento poderá adotar os seguintes indicadores: percentual de serviços concluídos; percentual de pendências; prazo médio de atendimento; índice de reincidência de falhas; disponibilidade dos equipamentos; percentual de conformidade alcançado após a execução das intervenções.</p>

<h2>10.- Considerações Finais.</h2>
<p>A execução das ações de manutenção previstas neste Plano contribui para a preservação das condições de segurança, confiabilidade e desempenho dos ativos, reduzindo a ocorrência de falhas e riscos operacionais. Sua implementação contínua favorece a proteção da vida e da integridade das pessoas, a preservação do patrimônio, a continuidade das atividades e o aumento da vida útil dos sistemas e equipamentos. Recomenda-se que este Plano seja periodicamente revisado e atualizado, assegurando a melhoria contínua dos processos de manutenção e da gestão dos ativos.</p>

<p style="text-align:right;margin-top:16pt">${cidade}/${uf}, ${dataExtenso}.</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p style="margin:0;line-height:1;font-size:8pt">[Assinatura digital]</p>
<p>&nbsp;</p>
<p style="margin:0;line-height:1"><b>${nomeIns}</b></p>
<p style="margin:0;line-height:1">${xe(titIns)} — ${conselhoS} ${nrCrea}</p>
${espIns?`<p style="margin:0;line-height:1">Especialista ${espIns}</p>`:''}

</div>

<!-- ANEXO 1 -->
<div class="secao">
<h2>Anexo 1 – Plano Executivo dos Serviços</h2>
<table style="border-collapse:collapse;width:100%;font-size:8pt">
  <tr>
    <th colspan="8" style="background:#1E3A8A;color:#fff;padding:5pt 6pt;text-align:left;font-size:9.5pt;border:1px solid #1E3A8A">Plano Executivo para os Serviços de Manutenção</th>
  </tr>
  <tr style="background:#dbeafe">
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:4%">ID</th>
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:26%;text-align:left">Não Conformidade</th>
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:6%">G Risco</th>
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:8%">Prioridade</th>
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:18%;text-align:left">Solução sugerida</th>
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:22%;text-align:left">Intervenção sugerida</th>
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:5%">Foto Nº</th>
    <th style="border:1px solid #1E3A8A;padding:3pt 4pt;width:11%">Responsável</th>
  </tr>
  ${anexo1Rows || '<tr><td colspan="8" style="border:1px solid #cbd5e1;padding:8pt;color:#9a3412;font-style:italic">Nenhuma não conformidade registrada.</td></tr>'}
</table>
</div>

<!-- ANEXO 2 -->
<div class="secao">
<h2>Anexo 2 – Modelo de Termo de Recebimento de Serviços</h2>
<p>Documento destinado ao aceite formal dos serviços executados, mediante confirmação da conformidade técnica, operacional e documental.</p>
<div style="border:1px solid #1E3A8A;border-radius:6px;padding:12pt;margin-top:8pt">
  <p style="font-weight:700;color:#1E3A8A;font-size:11pt;text-align:center;margin-bottom:8pt">Termo de Recebimento dos Serviços</p>
  <p>Declaro que os serviços previstos neste plano de manutenção foram executados em conformidade com as especificações técnicas estabelecidas, tendo sido verificadas as condições de segurança, funcionamento e desempenho dos equipamentos, bem como a eliminação das não conformidades constantes do laudo técnico de inspeção.</p>
  <p>&nbsp;</p>
  <p style="margin:0">Contratante: _________________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Data: _____ / _____ / _____</p>
  <p>&nbsp;</p>
  <p style="margin:0">Responsável técnico: _________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CREA/CFT: _______________</p>
</div>
</div>

<!-- RODAPÉ DO INSPETOR -->
<div class="rod">${xe(rodDoc)}</div>

</body>
</html>`

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
