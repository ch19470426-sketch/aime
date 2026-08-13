export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapa tipo_servico (5x) → tipo_servico_apoio (3x)
const TIPO_APOIO: Record<string,string> = {
  '51':'31 Autovistoria','52':'32 Vistoria inspeção',
  '53':'33 Vistoria imóvel novo','54':'34 Vistoria fachada',
  '55':'35 Vistoria elevador','56':'36 Vistoria nr-10',
  '57':'37 Vistoria nr-12','58':'38 Vistoria nr-13'
}

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

// Objetivos específicos por grupo
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

// Base normativa por tipo (51-58)
const BASE_NORMATIVA: Record<string,string> = {
  '51': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16747; ABNT NBR 5674; ABNT NBR 14037; ABNT NBR 17170; ABNT NBR 16280; ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 6118; ABNT NBR 5410; ABNT NBR 5626; ABNT NBR 8160; projetos executivos, memoriais descritivos, manuais da edificação e documentação técnica disponível; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '52': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16747; ABNT NBR 5674; ABNT NBR 14037; ABNT NBR 17170; ABNT NBR 16280; ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 6118; ABNT NBR 5410; ABNT NBR 5626; ABNT NBR 8160; projetos executivos, memoriais descritivos, manuais da edificação e documentação técnica disponível; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '53': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza dos sistemas inspecionados: ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 5674; ABNT NBR 14037; ABNT NBR 16280; ABNT NBR 6118; ABNT NBR 5626; ABNT NBR 8160; ABNT NBR 5410; projetos executivos, memoriais descritivos, especificações técnicas e documentos de entrega da obra; manuais técnicos dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '54': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16747; ABNT NBR 13755; ABNT NBR 15575 (Partes 1 a 6); ABNT NBR 5674; ABNT NBR 6118; ABNT NBR 10821; ABNT NBR 7199; normas e recomendações do IBAPE; legislação estadual e municipal relativa à inspeção e manutenção de fachadas; projetos executivos e especificações técnicas; manuais de uso, operação e manutenção; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '55': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: ABNT NBR 16858 (Partes 1, 2 e 3); ABNT NBR 16083; ABNT NBR NM 207; ABNT NBR NM 267; ABNT NBR 9050; NR-10; NR-35; legislação estadual e municipal aplicável; contratos de manutenção vigentes; manuais técnicos do fabricante; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '56': 'Sem prejuízo de outras normas específicas, destacam-se: NR-10; NR-01; NR-06; NR-23; NR-26; NR-35; ABNT NBR 5410; ABNT NBR 14039; ABNT NBR 5419 (Partes 1 a 4); manuais técnicos e especificações dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '57': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: NR-12; NR-01; NR-06; NR-10; NR-17; NR-35; ABNT NBR ISO 12100; ABNT NBR IEC 60204-1; ABNT NBR ISO 13849 (Partes 1 e 2); manuais técnicos dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.',
  '58': 'Sem prejuízo de outras normas específicas, aplicam-se, conforme a natureza das intervenções: NR-13; NR-01; NR-06; NR-10; NR-20; NR-33; NR-35; ABNT NBR ISO 16528 (Partes 1 e 2); API 510; API 570; projetos executivos e prontuários dos equipamentos; manuais de operação e manutenção dos fabricantes; procedimentos internos do contratante; demais normas técnicas aplicáveis.'
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
  const n = (v||'').replace(/\D/g,'')
  if (n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  if (n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
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

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

export async function POST(request: NextRequest) {
  try {
    const {
      cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
      estab, inspetor, nomeArquivo, ncs
    } = await request.json()

    if (!cpfInspetor || !tipoServico || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    const ts = String(tipoServico)
    const titulo = TITULO_PLANO[ts] ?? 'Plano de Manutenção'
    const grupo5154 = ['51','52','53','54'].includes(ts)
    const tipoApoio = TIPO_APOIO[ts] ?? ''
    const objetivos = grupo5154 ? OBJETIVOS_51_54 : OBJETIVOS_55_58
    const baseNorm = BASE_NORMATIVA[ts] ?? ''

    // Dados do inspetor
    const nomeIns = xe(inspetor?.nome_inspetor || '')
    const tituloIns = xe(inspetor?.titulo_profissional || '')
    const siglaCrea = xe(inspetor?.sigla_conselho || '')
    const nrCrea = xe(inspetor?.nr_conselho || '')
    const espIns = inspetor?.especializacao ? xe(inspetor.especializacao) : ''

    // Data atual
    const hoje = new Date()
    const mesAno = `${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`
    const cidade = xe(estab?.cidade || '')
    const uf = xe(estab?.uf || '')

    // Tabela 1.2 — Ativos para manutenção
    let tabAtivos = ''
    if (grupo5154) {
      tabAtivos = `<table class="tbl-pm">
  <tr><th colspan="4" style="background:#1E3A8A;color:#fff">Ativos para Manutenção</th></tr>
  <tr><th>Tipo de ativo</th><th>Data Habite-se</th><th>Nº pavtos</th><th>Aptos/Salas</th></tr>
  ${(estab?.ativos ?? []).length > 0
    ? (estab.ativos as any[]).map((a:any) => `<tr>
      <td>${xe(a.tipo_ativo||a.tipo||'')}</td>
      <td style="text-align:center">${fmtData(a.data_inicio_operacao||a.data_habite_se)}</td>
      <td style="text-align:center">${xe(a.numero_pavimentos||estab?.numero_pavimentos||'')}</td>
      <td style="text-align:center">${xe(a.numero_unidades_salas||estab?.numero_unidades_salas||'')}</td>
    </tr>`).join('')
    : `<tr><td>${xe(estab?.tipo_imovel||'')}</td><td style="text-align:center">${fmtData(estab?.data_habite_se)}</td><td style="text-align:center">${xe(estab?.numero_pavimentos||'')}</td><td style="text-align:center">${xe(estab?.numero_unidades_salas||'')}</td></tr>`
  }
</table>`
    } else {
      tabAtivos = `<table class="tbl-pm">
  <tr><th colspan="4" style="background:#1E3A8A;color:#fff">Ativos para Manutenção</th></tr>
  <tr><th>Tipo de ativo</th><th>Tag/Nº Série</th><th>Início operação</th><th>Subtipo</th></tr>
  ${(estab?.ativos ?? []).length > 0
    ? (estab.ativos as any[]).map((a:any) => `<tr>
      <td>${xe(a.tipo_ativo||a.tipo||'')}</td>
      <td style="text-align:center">${xe(a.tag_ativo_nr_serie||a.tag||'')}</td>
      <td style="text-align:center">${fmtData(a.data_inicio_operacao)}</td>
      <td>${xe(a.subtipo||'')}</td>
    </tr>`).join('')
    : '<tr><td colspan="4" style="color:#9a3412;font-style:italic">Nenhum ativo cadastrado.</td></tr>'
  }
</table>`
    }

    // Anexo 1 — Tabela de NCs com Procedimento Corretivo
    const ncsArr = Array.isArray(ncs) ? ncs : []
    const anexo1Rows = ncsArr.map((nc: any, idx: number) => {
      const grNnr = Number(nc.grau_risco||nc.grauRisco)||0
      const corP = grNnr>80?'#CC0000':grNnr>=50?'#E8A000':grNnr>=30?'#EAB308':'#16A34A'
      const priP = grNnr>80?'Muito Alta':grNnr>=50?'Alta':grNnr>=30?'Média':'Baixa'
      return `<tr>
  <td style="text-align:center">${idx+1}</td>
  <td>${xe(nc.descricao_nao_conformidade||nc.nc||'')}</td>
  <td style="text-align:center;font-weight:700;color:${corP}">${grNnr}</td>
  <td style="text-align:center;font-weight:700;color:${corP}">${priP}</td>
  <td>${xe(nc.descricao_solucao_nc||nc.solucao||'')}</td>
  <td>${xe(nc.procedimento_corretivo||'')}</td>
  <td style="text-align:center">${xe(nc.numero_foto||nc.fotoNr||'')}</td>
  <td></td>
</tr>`
    }).join('')

    // Localização do texto dos parágrafos
    function paragrafo(txt: string): string {
      return txt.split('\n').map(l => l.trim()).filter(Boolean)
        .map(l => l.startsWith('-') ? `<li>${xe(l.slice(1).trim())}</li>` : `<p>${xe(l)}</p>`)
        .join('\n')
    }

    // HTML completo
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  @page { size: A4; margin: 20mm 15mm 20mm 20mm; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a2e; margin: 0; }
  h1, h2, h3 { color: #1E3A8A; }
  .capa { display: flex; flex-direction: column; height: 257mm; box-sizing: border-box; page-break-after: always; }
  .capa-topo { background: #1E3A8A; height: 8mm; }
  .capa-logo { text-align: center; padding: 10mm 0 6mm; flex-shrink: 0; }
  .capa-logo img { max-height: 30mm; }
  .capa-flex { flex: 1; }
  .capa-titulo { text-align: center; padding: 0 20mm; flex-shrink: 0; }
  .capa-rodape { flex-shrink: 0; }
  .secao { page-break-before: always; }
  .titulo-sec { font-size: 11pt; font-weight: 700; color: #1E3A8A; border-bottom: 2px solid #1E3A8A; padding-bottom: 3pt; margin: 12pt 0 6pt; }
  .titulo-sub { font-size: 10pt; font-weight: 700; color: #1E3A8A; margin: 8pt 0 4pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9pt; }
  table.tbl-pm th { background: #dbeafe; color: #1E3A8A; font-weight: 700; border: 1px solid #1E3A8A; padding: 3pt 5pt; text-align: left; }
  table.tbl-pm td { border: 1px solid #cbd5e1; padding: 3pt 5pt; vertical-align: top; }
  table.tbl-anx1 th { background: #1E3A8A; color: #fff; font-weight: 700; font-size: 8pt; border: 1px solid #1E3A8A; padding: 3pt 4pt; text-align: center; }
  table.tbl-anx1 td { border: 1px solid #cbd5e1; padding: 3pt 4pt; font-size: 8pt; vertical-align: top; }
  .bloco { border: 1px solid #c3d4f0; border-radius: 6px; overflow: hidden; margin: 6pt 0; }
  .bloco-header { background: #1E3A8A; color: #fff; font-weight: 700; padding: 3pt 8pt; font-size: 9.5pt; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 0; }
  .cell { border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; padding: 3pt 6pt; }
  .cell label { font-size: 7pt; font-weight: 600; color: #1E3A8A; display: block; }
  .cell .val { font-size: 9pt; min-height: 14px; }
  .cell-2 { grid-column: span 2; }
  .cell-3 { grid-column: span 3; }
  .assinatura { margin-top: 20pt; text-align: center; }
  ul { margin: 4pt 0 4pt 16pt; padding: 0; }
  li { margin-bottom: 2pt; }
  p { margin: 4pt 0; text-align: justify; }
</style>
</head>
<body>

<!-- CAPA -->
<div class="capa">
  <div class="capa-topo"></div>
  <div class="capa-logo">
    <img src="https://aime-7h4a.vercel.app/logo.png" alt="AIMÊ" onerror="this.style.display='none'">
  </div>
  <div class="capa-flex"></div>
  <div class="capa-titulo">
    <div style="font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:4pt">AIMÊ — Mapeamento Inteligente de Edificações e Equipamentos</div>
    <div style="font-size:20pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:6pt">PLANO DE MANUTENÇÃO</div>
    <div style="font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt">${xe(titulo)}</div>
    <div style="font-size:12pt;font-weight:600;color:#1E3A8A;margin-bottom:4pt">${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div>
  </div>
  <div class="capa-flex"></div>
  <div class="capa-rodape">
    <div style="border-top:2px solid #1E3A8A;margin:0 20mm"></div>
    <div style="padding:6mm 20mm;font-size:9.5pt;color:#222;line-height:1.9">
      <b style="color:#1E3A8A">Inspetor Responsável:</b> ${nomeIns}<br>
      <b style="color:#1E3A8A">Título Profissional:</b> ${tituloIns} — ${siglaCrea} ${nrCrea}${espIns?'<br><b style="color:#1E3A8A">Especialidade:</b> '+espIns:''}
    </div>
    <div style="background:#1E3A8A;height:8mm"></div>
    <div style="text-align:center;padding:4mm 0;font-size:9pt;color:#374151">${cidade}/${uf} — ${mesAno}</div>
  </div>
</div>

<!-- ÍNDICE -->
<div class="secao">
  <div style="border-bottom:2px solid #1E3A8A;padding-bottom:3pt;margin-bottom:8pt">
    <span style="font-size:12pt;font-weight:700;color:#1E3A8A">${xe(titulo)}</span>
  </div>
  <div style="font-size:9pt;line-height:1.8">
    <div><b>1. Identificação e Caracterização</b></div>
    <div style="padding-left:8pt">1.1.- Identificação da Edificação/Estabelecimento</div>
    <div style="padding-left:8pt">1.2.- Ativos para Manutenção</div>
    <div><b>2. Objetivos</b></div>
    <div><b>3. Base Normativa</b></div>
    <div><b>4. Responsabilidade da Contratada</b></div>
    <div><b>5. Exigências Mínimas para Execução dos Serviços</b></div>
    <div><b>6. Recebimento dos Serviços</b></div>
    <div><b>7. Apresentação da Proposta</b></div>
    <div><b>8. Critérios para Priorização das Intervenções</b></div>
    <div><b>9. Controle da Execução e Indicadores de Desempenho</b></div>
    <div><b>10. Considerações Finais</b></div>
    <div><b>Anexo 1 – Plano Executivo dos Serviços</b></div>
    <div><b>Anexo 2 – Modelo de Termo de Recebimento</b></div>
  </div>
</div>

<!-- CORPO -->
<div class="secao">

<div class="titulo-sec">1.- Considerações Preliminares.</div>
<p>A execução da manutenção representa uma das principais ações para garantir a continuidade operacional das edificações e dos processos, proteger pessoas e trabalhadores, preservar o patrimônio, e assegurar a conformidade com a legislação vigente.</p>
<p>O presente Plano de Manutenção foi elaborado a partir das informações constantes no Laudo Técnico de Inspeção, constituindo o principal documento de planejamento das ações corretivas e preventivas destinadas à eliminação ou mitigação das não conformidades identificadas durante a inspeção.</p>
<p>As intervenções previstas deverão ser executadas observando-se a criticidade atribuída às não conformidades, a probabilidade de ocorrência de falhas, os riscos à segurança das pessoas e trabalhadores, a conservação das edificações, os impactos sobre os equipamentos e as exigências legais e normativas aplicáveis.</p>
<p>Este documento deverá orientar a execução, o acompanhamento, a fiscalização, a homologação e o recebimento dos serviços de manutenção.</p>
<p>A execução dos serviços de manutenção deverá respeitar, além das recomendações das Normas Técnicas Brasileiras, as recomendações das concessionárias locais e da prefeitura municipal.</p>

<div class="titulo-sub">1.1.- Identificação da Edificação/Estabelecimento.</div>
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
</div>

<div class="titulo-sub">1.2.- Ativos para Manutenção.</div>
${tabAtivos}

<div class="titulo-sec">2.- Objetivos.</div>
${paragrafo(objetivos)}

<div class="titulo-sec">3.- Base Normativa.</div>
<p>${xe(baseNorm)}</p>

<div class="titulo-sec">4.- Responsabilidade da Contratada.</div>
<p>A responsabilidade pela execução dos serviços até a sua conclusão, formalizada pela assinatura do "Termo de Recebimento", é integralmente da contratada nos termos do Código Civil Brasileiro. Assim, quaisquer danos aos serviços já realizados, ou danos causados a terceiros, a reparação é de total responsabilidade da contratada.</p>
<p>A guarda e vigilância das ferramentas, equipamentos e dos materiais necessários à execução dos serviços são de inteira responsabilidade da contratada, sendo também deste a responsabilidade pela reposição integral de quaisquer materiais, ferramentas ou equipamentos extraviados ou danificados.</p>
<p>Compete-lhe:</p>
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

<div class="titulo-sec">5.- Exigências Mínimas para Execução dos Serviços.</div>
<p>Todas as intervenções deverão ser executadas mediante planejamento prévio, observando critérios técnicos, operacionais e de segurança.</p>
<div class="titulo-sub">5.1.- Planejamento.</div>
<p>Antes do início dos serviços deverão ser realizados: análise do laudo técnico; cronograma executivo seguindo a definição das prioridades; programação de desligamentos; levantamento dos recursos necessários.</p>
<div class="titulo-sub">5.2.- Segurança.</div>
<p>Toda intervenção deverá observar: análise preliminar de riscos; permissão de trabalho; bloqueio e etiquetagem; isolamento das áreas; utilização de EPI; utilização de EPC; sinalização da área.</p>
<div class="titulo-sub">5.3.- Recursos.</div>
<p>A contratada deverá disponibilizar: equipe qualificada; ferramentas adequadas; instrumentos calibrados; peças certificadas; documentação técnica.</p>
<div class="titulo-sub">5.4.- Execução.</div>
<p>Os serviços poderão compreender: demolição e desmontagem; limpeza técnica; lubrificação; reapertos; regulagens; calibrações; substituição de componentes; recuperação dos sistemas de proteção; ensaios; remoção de entulho; testes funcionais; atualização documental.</p>

<div class="titulo-sec">6.- Recebimento dos Serviços.</div>
<p>Concluídas as intervenções, será realizada inspeção técnica de recebimento para verificar a conformidade dos serviços executados.</p>
<p>O recebimento dependerá da comprovação de que: todas as não conformidades foram tratadas; as instalações e os equipamentos operam adequadamente; os testes apresentaram resultados satisfatórios; a documentação técnica foi atualizada; os registros de manutenção foram emitidos; foram entregues ART/TRT, quando exigidas.</p>

<div class="titulo-sec">7.- Apresentação da Proposta.</div>
<p>A proposta técnica deverá demonstrar a capacidade operacional da contratada e conter, no mínimo: identificação da empresa; responsável técnico; escopo dos serviços; metodologia; cronograma; equipe técnica; materiais; equipamentos; prazo; garantia; valor global; condições comerciais.</p>

<div class="titulo-sec">8.- Critérios para Priorização das Intervenções.</div>
<p>As intervenções deverão ser priorizadas conforme o grau de criticidade das não conformidades identificadas no Laudo Técnico de Inspeção, considerando os riscos à segurança das pessoas, à integridade dos equipamentos, à continuidade operacional e ao atendimento da legislação.</p>
<p>Como diretriz geral: criticidade muito alta: intervenção imediata; criticidade alta: atendimento prioritário; criticidade média: execução programada em curto prazo; criticidade baixa: inserção no plano periódico de manutenção.</p>

<div class="titulo-sec">9.- Controle da Execução e Indicadores de Desempenho.</div>
<p>O acompanhamento da execução será realizado durante toda a vigência deste Plano de Manutenção, permitindo verificar o cumprimento dos prazos, a qualidade das intervenções e a eficácia das ações implementadas.</p>
<p>O monitoramento poderá adotar os seguintes indicadores: percentual de serviços concluídos; percentual de pendências; prazo médio de atendimento; índice de reincidência de falhas; disponibilidade dos equipamentos; percentual de conformidade alcançado após a execução das intervenções.</p>

<div class="titulo-sec">10.- Considerações Finais.</div>
<p>A execução das ações de manutenção previstas neste Plano contribui para a preservação das condições de segurança, confiabilidade e desempenho dos ativos, reduzindo a ocorrência de falhas e riscos operacionais. Sua implementação contínua favorece a proteção da vida e da integridade das pessoas, a preservação do patrimônio, a continuidade das atividades e o aumento da vida útil dos sistemas e equipamentos. Recomenda-se que este Plano seja periodicamente revisado e atualizado, assegurando a melhoria contínua dos processos de manutenção e da gestão dos ativos.</p>

<div class="assinatura">
  <p>${cidade}/${uf}, ${hoje.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}.</p>
  <br><br>
  <p>______________________________</p>
  <p>${nomeIns}</p>
  <p>${tituloIns} — ${siglaCrea} ${nrCrea}${espIns?'<br>'+espIns:''}</p>
</div>

</div>

<!-- ANEXO 1 -->
<div class="secao">
<div class="titulo-sec">Anexo 1 – Plano Executivo dos Serviços</div>
<table class="tbl-anx1">
  <tr><th colspan="8" style="background:#1E3A8A;color:#fff;text-align:left;font-size:9.5pt">Plano Executivo para os Serviços de Manutenção</th></tr>
  <tr>
    <th style="width:4%">ID</th>
    <th style="width:28%;text-align:left">Não Conformidade</th>
    <th style="width:6%">G Risco</th>
    <th style="width:8%">Prioridade</th>
    <th style="width:18%;text-align:left">Solução sugerida</th>
    <th style="width:22%;text-align:left">Procedimento corretivo</th>
    <th style="width:5%">Foto</th>
    <th style="width:9%">Responsável</th>
  </tr>
  ${anexo1Rows || '<tr><td colspan="8" style="color:#9a3412;font-style:italic;padding:8pt">Nenhuma não conformidade registrada.</td></tr>'}
</table>
</div>

<!-- ANEXO 2 -->
<div class="secao">
<div class="titulo-sec">Anexo 2 – Modelo de Termo de Recebimento de Serviços</div>
<p>Documento destinado ao aceite formal dos serviços executados, mediante confirmação da conformidade técnica, operacional e documental.</p>
<div style="border:1px solid #1E3A8A;border-radius:6px;padding:12pt;margin-top:8pt">
  <div style="font-weight:700;color:#1E3A8A;font-size:11pt;text-align:center;margin-bottom:8pt">Termo de Recebimento dos Serviços</div>
  <p>Declaro que os serviços previstos neste plano de manutenção foram executados em conformidade com as especificações técnicas estabelecidas, tendo sido verificadas as condições de segurança, funcionamento e desempenho dos equipamentos, bem como a eliminação das não conformidades constantes do laudo técnico de inspeção.</p>
  <br>
  <table style="width:100%;border:none">
    <tr>
      <td style="border:none;padding:4pt">Contratante: ________________________________</td>
      <td style="border:none;padding:4pt">Data: _____ / _____ / _____</td>
    </tr>
    <tr>
      <td style="border:none;padding:4pt">Responsável técnico: _________________________</td>
      <td style="border:none;padding:4pt">CREA/CFT: _______________</td>
    </tr>
  </table>
</div>
</div>

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
