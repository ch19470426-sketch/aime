// src/app/api/gerar-laudo/route.ts
// AIMÊ — Gera HTML do Laudo Técnico (tipos 41-44)
// CSS idêntico à proposta | Anexo 2 idêntico ao formulário homologado

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Dados estáticos ──────────────────────────────────────────────────────────
const SISTEMAS: Record<string, string[]> = {
  '41': ['01_Sistema Estrutural','02_Fachadas, Empenas e Marquises','03_Cobertura e Telhados','04_Instalações Hidrossanitárias','05_Instalações Elétricas e SPDA','06_Instalações de Gás','07_Sistema de Prevenção e Combate a Incêndio','08_Elevadores e Equipamentos Eletromecânicos','09_Impermeabilização','10_Acessibilidade','11_Contenção de Encostas e Arrimos','12_Áreas Comuns e Infraestrutura','13_Documentação e Conformidade Legal'],
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns e Infraestrutura'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado','02_Revestimento Cerâmico de Fachada','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada','11_Segurança Contra Incêndio em Fachadas','12_Manutenção e Equipamentos de Acesso'],
}

const TITULO: Record<string, string> = {
  '41': 'Laudo de Autovistoria',
  '42': 'Laudo de Inspeção Predial',
  '43': 'Laudo de Imóvel Novo',
  '44': 'Laudo de Inspeção de Fachada',
}

const DOCS_ANEXO1 = [
  'Auto de Conclusão da Edificação (HABITE-SE)',
  'Convenção do Condomínio',
  'Alvará de Funcionamento de Elevadores',
  'Relatório de Inspeção Anual dos Elevadores (RIA)',
  'Apólice de Seguro da edificação',
  'Auto de Vistoria do Corpo de Bombeiros (AVCB)',
  'Atestado do Sistema de Proteção a Descarga Atmosférica (SPDA)',
  'Avaliação da Rede de Distribuição Interna de Gás',
  'Contrato de Manutenção de Elevadores',
  'Certificado de Desratização e Desinsetização',
  'Relatório de Manutenção e Limpeza das Caixas de Água',
  'Certificado do reservatório de GLP',
  'Laudo de autovistoria anterior',
  'Projeto Arquitetônico Aprovado na Prefeitura',
  'Projetos Elétrico e Hidrossanitário Aprovados na Prefeitura',
  'Manual de Uso, Operação e Manutenção da Edificação',
  'Plano de Manutenção Preventiva da Edificação',
  'Atestado de Brigada de Incêndio (Imóveis não Residenciais)',
  'Alvará de Funcionamento (Imóveis não Residenciais)',
  'Licenças Ambientais (Imóveis não Residenciais)',
  'Outorga e Licença de Estação de Tratamento de Efluentes',
  'Outorga e Licença de Poço Profundo de Captação de Água',
]

const DESC_SISTEMAS: Record<string, string> = {
  '01_Sistema Estrutural': 'Compreende os elementos de fundação, estrutura de concreto armado ou metálica, pilares, vigas e lajes, responsáveis pela sustentação e estabilidade da edificação.',
  '02_Fachadas, Empenas e Marquises': 'Inclui revestimentos externos, pintura de fachada, peitoris, pingadeiras, rufos, marquises e elementos ornamentais expostos ao intemperismo.',
  '03_Cobertura e Telhados': 'Composto por estrutura do telhado, telhas, calhas, rufos, impermeabilização da laje de cobertura e captação de águas pluviais.',
  '04_Instalações Hidrossanitárias': 'Abrange redes de água fria e quente, esgoto sanitário, drenagem pluvial, reservatórios, bombas e equipamentos hidráulicos.',
  '05_Instalações Elétricas e SPDA': 'Inclui quadros de distribuição, fiação, tomadas, iluminação, grupo gerador, SPDA e sistema de aterramento.',
  '06_Instalações de Gás': 'Compreende rede de distribuição de gás (GLP ou GN), central de gás, registros, medidores e ramais de consumo.',
  '07_Sistema de Prevenção e Combate a Incêndio': 'Inclui sprinklers, hidrantes, extintores, saídas de emergência, iluminação de emergência, alarme e sinalização de segurança.',
  '08_Elevadores e Equipamentos Eletromecânicos': 'Abrange elevadores, escadas rolantes, plataformas de acessibilidade, bombas, compressores e demais equipamentos eletromecânicos.',
  '09_Impermeabilização': 'Compreende sistemas de impermeabilização de coberturas, lajes, reservatórios, fundações, banheiros e áreas molhadas.',
  '10_Acessibilidade': 'Inclui rampas, corrimãos, pisos táteis, vagas para PCD, banheiros adaptados e demais elementos de acessibilidade conforme NBR 9050.',
  '11_Contenção de Encostas e Arrimos': 'Abrange muros de arrimo, taludes, cortinas de estacas, drenos e sistemas de contenção de solo.',
  '12_Áreas Comuns e Infraestrutura': 'Compreende hall, corredores, escadas, garagem, playground, salão de festas, guarita e demais áreas de uso coletivo.',
  '13_Documentação e Conformidade Legal': 'Inclui análise dos documentos técnicos e legais da edificação quanto à sua regularidade e conformidade normativa.',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function xe(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/@/g, '&#64;')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
}

function fmtDoc(v: string): string {
  const n = (v || '').replace(/\D/g, '')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}

function fmtData(): string {
  const d = new Date()
  const M = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`
}

function pct(v: number, t: number): string { return t ? Math.round(v * 100 / t) + '%' : '—' }
function nomeS(s: string): string { return s.slice(3).replace(/_/g, ' ') }
function descS(s: string): string { return DESC_SISTEMAS[s] || `Sistema: ${nomeS(s)}` }

function badgeP(p: string): string {
  const bg = p === 'Alta' ? '#fee2e2' : p === 'Média' ? '#fef9c3' : '#dcfce7'
  const fg = p === 'Alta' ? '#991b1b' : p === 'Média' ? '#854d0e' : '#166534'
  return `<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:7.5pt;font-weight:bold;background:${bg};color:${fg}">${xe(p)}</span>`
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
            estab, inspetor, ncs, nomeArquivo, complemento } = body

    if (!cpfInspetor || !tipoServico || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    const titulo   = TITULO[tipoServico] ?? 'Laudo Técnico'
    const sistemas = SISTEMAS[tipoServico] ?? []
    const dataHoje = fmtData()
    const cl       = complemento?.classificacao ?? {}
    const nivel    = complemento?.nivelInspecao ?? cl.nivel ?? ''
    const labelDoc = cnpjoucpf?.length === 11 ? 'CPF' : 'CNPJ'
    const labelEst = tipoServico === '43' ? 'Proprietário' : 'Condomínio / Empresa'

    // NCs por sistema
    const ncsPorSistema: Record<string, any[]> = {}
    sistemas.forEach(s => { ncsPorSistema[s] = [] })
    ;(ncs ?? []).forEach((nc: any) => {
      if (ncsPorSistema[nc.sistema] !== undefined) ncsPorSistema[nc.sistema].push(nc)
    })

    // Estatística
    const stat = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      const a = arr.filter((n: any) => n.prioridade === 'Alta').length
      const m = arr.filter((n: any) => n.prioridade === 'Média').length
      const b = arr.filter((n: any) => n.prioridade === 'Baixa').length
      return { s, a, m, b, t: a + m + b }
    })
    const totA = stat.reduce((t, s) => t + s.a, 0)
    const totM = stat.reduce((t, s) => t + s.m, 0)
    const totB = stat.reduce((t, s) => t + s.b, 0)
    const totT = totA + totM + totB

    // Buscar imagens do storage
    async function imgSrc(path: string): Promise<string> {
      if (!path) return ''
      try {
        const { data, error } = await supabase.storage.from('aime').download(path)
        if (error || !data) return ''
        const buf = Buffer.from(await data.arrayBuffer())
        const ext = path.split('.').pop()?.toLowerCase() ?? 'jpg'
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
        return `data:${mime};base64,${buf.toString('base64')}`
      } catch { return '' }
    }

    const [srcCroqui, srcFachada, srcArt] = await Promise.all([
      imgSrc(complemento?.pathCroqui ?? ''),
      imgSrc(complemento?.pathFoto   ?? ''),
      imgSrc(complemento?.pathArt    ?? ''),
    ])

    const cabInspetor = xe(inspetor?.cabecalho_documentos) || titulo
    const rodInspetor = xe(inspetor?.rodape_documentos) || `${xe(inspetor?.nome_inspetor)} — ${xe(inspetor?.titulo_profissional)} — CREA/CAU ${xe(inspetor?.inscricao_crea_cau)}`

    // ── CSS IDÊNTICO À PROPOSTA ───────────────────────────────────────────────
    const CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.6;
  color: #000;
  padding: 2cm 2cm 2cm 2.5cm;
}
.cab {
  text-align: center;
  margin-bottom: 10pt;
  padding-bottom: 4pt;
  border-bottom: 2px solid #1E3A8A;
  font-size: 12pt;
  color: #374151;
  white-space: pre-line;
}
.rod {
  margin-top: 10pt;
  padding-top: 4pt;
  border-top: 1px solid #ccc;
  font-size: 10pt;
  text-align: center;
  white-space: pre-line;
}
h1, h2 {
  font-size: 10pt;
  font-weight: bold;
  margin: 16pt 0 6pt;
}
h3 {
  font-size: 10pt;
  font-weight: bold;
  margin: 12pt 0 4pt;
}
p {
  margin: 6pt 0;
  text-align: justify !important;
}
ul {
  margin: 6pt 0 6pt 0.8cm;
  padding-left: 0;
  list-style: none;
}
li {
  margin-bottom: 4pt;
  text-align: justify !important;
  text-align-last: left !important;
  padding-left: 1.2em;
  text-indent: -1.2em;
}
li::before { content: "• "; }
b { font-weight: bold; }
i { font-style: italic; }
.ass { margin-top: 30pt; padding-top: 10pt; line-height: 1; }
.quebra { page-break-before: always; }
/* Tabelas de dados */
table { width: 100%; border-collapse: collapse; margin: 4pt 0; font-size: 8.5pt; page-break-inside: avoid; }
th { background: #1E3A8A; color: #fff; padding: 4pt 6pt; font-weight: bold; text-align: left; border-right: 1px solid #4a6fa5; font-size: 8pt; }
th:last-child { border-right: none; }
td { border-top: 1px solid #1E3A8A; border-right: 1px solid #1E3A8A; padding: 4pt 6pt; color: #222; vertical-align: top; }
td:last-child { border-right: none; }
tr:nth-child(even) td { background: #f7f9ff; }
.th-cab { background: #1E3A8A !important; color: #fff !important; font-weight: bold; font-size: 9pt; }
.lbl { font-size: 7pt; font-weight: bold; color: #1E3A8A; display: block; margin-bottom: 2pt; }
/* Formulários vistoria — IDÊNTICO ao CSS da rota homologar */
.hdr{background:#1E3A8A;padding:8px 16px;text-align:center}
.hdr h1{font-size:11pt;font-weight:700;color:#fff;margin:0}
.hdr p{font-size:7pt;color:#B5D4F4;margin:2px 0 0}
.div{height:2px;background:#1E3A8A}
.vbody{padding:10px 14px}
.blk{border:1px solid #c3d4f0;border-radius:6px;overflow:hidden;margin-bottom:5px;page-break-inside:avoid}
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
.vbadge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:99px;font-size:7.5pt;font-weight:700}
.stamp{background:#E6F5EE;border:2px solid #1A7A3C;border-radius:8px;padding:6px 12px;text-align:center;margin-top:8px}
.stamp span{color:#1A7A3C;font-weight:700;font-size:8pt}
.ph{display:flex;justify-content:space-between;margin-bottom:3px}`

    // ── Seção 1.1 — Características ───────────────────────────────────────────
    const S11 = `
<h2>1.1.- Características e localização ${tipoServico === '43' ? 'do Imóvel' : 'da Edificação'}.</h2>
<table>
  <tr><td colspan="6" class="th-cab">Características ${tipoServico === '43' ? 'do Imóvel' : 'da Edificação'}</td></tr>
  <tr>
    <td colspan="2"><span class="lbl">${labelEst}</span>${xe(estab?.razao_social_nome)}</td>
    <td><span class="lbl">${labelDoc}</span>${fmtDoc(cnpjoucpf)}</td>
    <td><span class="lbl">CEP</span>${xe(estab?.cep)}</td>
    <td colspan="2"></td>
  </tr>
  <tr>
    <td colspan="3"><span class="lbl">Endereço</span>${xe(estab?.logradouro)}${estab?.numero ? ', ' + xe(estab.numero) : ''}${estab?.complemento ? ' — ' + xe(estab.complemento) : ''}</td>
    <td colspan="2"><span class="lbl">Bairro</span>${xe(estab?.bairro)}</td>
    <td><span class="lbl">Cidade / UF</span>${xe(estab?.cidade)}/${xe(estab?.uf)}</td>
  </tr>
  <tr>
    <td colspan="2"><span class="lbl">Responsável</span>${xe(estab?.nome_responsavel)}</td>
    <td><span class="lbl">Função</span>${xe(estab?.funcao_responsavel)}</td>
    <td><span class="lbl">Tel / WhatsApp</span>${xe(estab?.whatsapp)}</td>
    <td colspan="2"><span class="lbl">e-Mail</span>${xe(estab?.email)}</td>
  </tr>
  <tr>
    <td><span class="lbl">Uso do Imóvel</span>${xe(estab?.uso_imovel)}</td>
    <td><span class="lbl">Tipo</span>${xe(estab?.tipo_imovel)}</td>
    <td><span class="lbl">Nº Pavimentos</span>${xe(estab?.numero_pavimentos)}</td>
    <td><span class="lbl">Nº Unidades/Salas</span>${xe(estab?.numero_unidades_salas)}</td>
    <td><span class="lbl">Área construída m²</span>${xe(estab?.area_construida)}</td>
    <td><span class="lbl">Área terreno m²</span>${xe(estab?.area_terreno)}</td>
  </tr>
  <tr><td colspan="6"><span class="lbl">Síntese da descrição da Edificação (Convenção ou Escritura)</span>${xe(complemento?.sinteseEdif)}</td></tr>
</table>
<table style="margin-top:6pt">
  <tr><td colspan="2" class="th-cab">Localização ${tipoServico === '43' ? 'do Imóvel' : 'da Edificação'}</td></tr>
  <tr>
    <td style="width:50%">
      <span class="lbl">Croqui de localização</span>
      ${srcCroqui
        ? `<img src="${srcCroqui}" style="width:100%;height:130px;object-fit:cover;border:1px solid #1E3A8A;display:block;margin-top:4pt">`
        : `<div style="border:1px solid #1E3A8A;height:130px;display:flex;align-items:center;justify-content:center;color:#9ab0d4;font-style:italic;font-size:8pt;margin-top:4pt">[Croqui — colar após baixar o documento]</div>`}
    </td>
    <td style="width:50%">
      <span class="lbl">Foto da fachada principal</span>
      ${srcFachada
        ? `<img src="${srcFachada}" style="width:100%;height:130px;object-fit:cover;border:1px solid #1E3A8A;display:block;margin-top:4pt">`
        : `<div style="border:1px solid #1E3A8A;height:130px;display:flex;align-items:center;justify-content:center;color:#9ab0d4;font-style:italic;font-size:8pt;margin-top:4pt">[Foto fachada — inserir pelo inspetor]</div>`}
    </td>
  </tr>
</table>`

    // ── Seção 3.3 — Classificação ─────────────────────────────────────────────
    const itens33 = tipoServico === '43' ? [
      ['a)', 'A execução da obra em relação à <b>CONFORMIDADE CONSTRUTIVA</b> foi classificada como:', xe(cl.nivel), '#dbeafe', '#1e40af'],
      ['b)', 'A <b>QUALIDADE DE ACABAMENTO</b> do imóvel é classificada como:', xe(cl.risco), '#fef9c3', '#854d0e'],
      ['c)', 'Quanto ao uso, a <b>FUNCIONALIDADE</b> do imóvel:', xe(cl.desempenho), '#dcfce7', '#166534'],
      ['d)', 'Quanto às condições de ocupação, a <b>HABITABILIDADE</b> pode ser considerada:', xe(cl.manut), '#f3e8ff', '#6b21a8'],
      ['e)', 'A análise do resultado consolidado sobre a <b>CLASSE DO IMÓVEL</b> resulta em:', xe(cl.uso), '#e0f2fe', '#0369a1'],
      ['f)', 'Qual o <b>GRAU DE SATISFAÇÃO NO RECEBIMENTO</b> do imóvel:', xe(cl.desempGeral), '#dcfce7', '#166534'],
    ] : tipoServico === '44' ? [
      ['a)', 'Quanto ao <b>ESTADO DE CONSERVAÇÃO</b> da fachada pode ser classificado como:', xe(cl.risco), '#fef9c3', '#854d0e'],
      ['b)', 'O histórico de <b>MANUTENÇÃO</b> da fachada:', xe(cl.manut), '#f3e8ff', '#6b21a8'],
      ['c)', 'A <b>AGRESSIVIDADE DO MEIO AMBIENTE</b> sobre a fachada é considerada:', xe(cl.desempenho), '#fef9c3', '#854d0e'],
      ['d)', 'O <b>RISCO DE QUEDA DE ELEMENTOS</b> da fachada é considerado:', xe(cl.uso), '#fee2e2', '#991b1b'],
      ['e)', 'O <b>DESEMPENHO TÉCNICO DO SISTEMA</b> da fachada:', xe(cl.desempGeral), '#dcfce7', '#166534'],
    ] : [
      ['a)', 'Quanto ao <b>NÍVEL</b> da inspeção efetuada o imóvel foi classificado como INSPEÇÃO PREDIAL NÍVEL:', xe(nivel), '#dbeafe', '#1e40af'],
      ['b)', 'Quanto ao <b>GRAU DE RISCO</b> o imóvel encontra-se classificado como de RISCO:', xe(cl.risco), '#fef9c3', '#854d0e'],
      ['c)', 'Quanto ao <b>DESEMPENHO</b> a classificação geral do imóvel foi classificada como:', xe(cl.desempenho), '#dcfce7', '#166534'],
      ['d)', 'Quanto à <b>QUALIDADE DA MANUTENÇÃO</b> a edificação foi classificada como QUALIDADE QUE:', xe(cl.manut), '#f3e8ff', '#6b21a8'],
      ['e)', 'Quanto às <b>CONDIÇÕES DE USO</b> a edificação foi classificada como EDIFICAÇÃO DE USO:', xe(cl.uso), '#e0f2fe', '#0369a1'],
      ['f)', 'Quanto ao <b>DESEMPENHO GERAL</b> a edificação foi classificada como:', xe(cl.desempGeral), '#dcfce7', '#166534'],
    ]

    const titulo33 = tipoServico === '43' ? 'Resultado da Classificação do Imóvel'
      : tipoServico === '44' ? 'Resultado da Classificação da Fachada'
      : 'Resultado da Classificação da Edificação'

    const S33 = `
<table>
  <tr><td colspan="2" class="th-cab">${titulo33}</td></tr>
  ${itens33.map(([letra, desc, val, bg, fg]) => `
  <tr>
    <td style="width:66%"><b>${letra}</b> ${desc}</td>
    <td style="text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:8pt;font-weight:bold;background:${bg};color:${fg}">${val || '—'}</span></td>
  </tr>`).join('')}
</table>`

    // ── Seção 4.1 — NCs por sistema ───────────────────────────────────────────
    const S41 = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      if (arr.length === 0) return ''
      const rec = xe(complemento?.recsSistema?.[s] ?? '')
      return `
<h3>${xe(nomeS(s))}</h3>
<table>
  <tr><td colspan="6" class="th-cab">Relação de Não Conformidades — ${xe(nomeS(s))}</td></tr>
  <tr><td colspan="6"><b>Descrição do sistema:</b> ${xe(descS(s))}</td></tr>
  ${rec ? `<tr><td colspan="6" style="background:#EEF2FF"><b>Recomendação:</b> ${rec}</td></tr>` : ''}
  <tr>
    <th style="width:6%;text-align:center">Foto</th>
    <th style="width:30%">Não Conformidade</th>
    <th style="width:18%">Local</th>
    <th style="width:8%;text-align:center">G.R.</th>
    <th style="width:10%;text-align:center">Prioridade</th>
    <th style="width:28%">Solução</th>
  </tr>
  ${arr.map((nc: any, i: number) => `
  <tr${i % 2 === 1 ? ' style="background:#f7f9ff"' : ''}>
    <td style="text-align:center">${xe(nc.fotoNr)}</td>
    <td>${xe(nc.nc || nc.anomalia)}</td>
    <td>${xe(nc.local)}${nc.complemento ? ' — ' + xe(nc.complemento) : ''}</td>
    <td style="text-align:center">${xe(nc.grauRisco)}</td>
    <td style="text-align:center">${badgeP(nc.prioridade)}</td>
    <td>${xe(nc.solucaoNC || nc.cp || '—')}</td>
  </tr>`).join('')}
</table>`
    }).join('')

    // ── Seção 4.2 — Estatística + Gráficos ────────────────────────────────────
    const maxT = Math.max(...stat.map(s => s.t), 1)
    const barras = stat.filter(s => s.t > 0).map(s => {
      const w = Math.round((s.t / maxT) * 300)
      return `<tr>
        <td style="width:160pt;font-size:7.5pt">${xe(nomeS(s.s))}</td>
        <td style="width:${w}pt;background:#1E3A8A;padding:3pt 0">&nbsp;</td>
        <td style="width:${300-w}pt;background:#EEF2FF;padding:3pt 0">&nbsp;</td>
        <td style="width:25pt;text-align:center;font-weight:bold;font-size:8pt">${s.t}</td>
      </tr>`
    }).join('')

    const pA = totT ? Math.round(totA * 100 / totT) : 0
    const pM = totT ? Math.round(totM * 100 / totT) : 0
    const pB = 100 - pA - pM

    const S42 = `
<table>
  <tr><td colspan="9" class="th-cab">Estatística de Manifestações Patológicas por Sistema Construtivo</td></tr>
  <tr>
    <th rowspan="2" style="width:25%">Sistemas Construtivos</th>
    <th colspan="7" style="text-align:center">Manifestações por Prioridades</th>
    <th rowspan="2" style="text-align:center">Total</th>
  </tr>
  <tr>
    <th style="text-align:center">A</th><th style="text-align:center">%</th>
    <th style="text-align:center">M</th><th style="text-align:center">%</th>
    <th style="text-align:center">B</th><th style="text-align:center">%</th>
    <th style="text-align:center">Total</th>
  </tr>
  ${stat.map(({ s, a, m, b, t }) => `
  <tr>
    <td>${xe(nomeS(s))}</td>
    <td style="text-align:center">${a || '—'}</td><td style="text-align:center">${a ? pct(a, t) : '—'}</td>
    <td style="text-align:center">${m || '—'}</td><td style="text-align:center">${m ? pct(m, t) : '—'}</td>
    <td style="text-align:center">${b || '—'}</td><td style="text-align:center">${b ? pct(b, t) : '—'}</td>
    <td style="text-align:center;font-weight:bold">${t || '—'}</td>
    <td style="text-align:center;font-weight:bold">${t || '—'}</td>
  </tr>`).join('')}
  <tr>
    <td style="font-weight:bold;background:#EEF2FF">Total de ocorrências</td>
    <td style="text-align:center;font-weight:bold;background:#fee2e2">${totA}</td><td style="text-align:center;background:#fee2e2">${pct(totA, totT)}</td>
    <td style="text-align:center;font-weight:bold;background:#fef9c3">${totM}</td><td style="text-align:center;background:#fef9c3">${pct(totM, totT)}</td>
    <td style="text-align:center;font-weight:bold;background:#dcfce7">${totB}</td><td style="text-align:center;background:#dcfce7">${pct(totB, totT)}</td>
    <td style="text-align:center;font-weight:bold;background:#EEF2FF">${totT}</td>
    <td style="text-align:center;font-weight:bold;background:#EEF2FF">${totT}</td>
  </tr>
  <tr><td colspan="9" style="font-style:italic;font-size:7.5pt">A = Alta prioridade (imediata); M = Média (curto prazo); B = Baixa (longo prazo)</td></tr>
</table>
<p style="font-weight:bold;margin:10pt 0 4pt">Nº de ocorrências por sistema construtivo</p>
<table style="width:auto;min-width:500pt">
  ${barras || '<tr><td style="font-style:italic">Nenhuma ocorrência registrada.</td></tr>'}
</table>
<p style="font-weight:bold;margin:10pt 0 4pt">Distribuição por Prioridade</p>
<table style="width:300pt">
  <tr>
    <th style="text-align:left">Prioridade</th>
    <th style="text-align:center">Qtd</th>
    <th style="text-align:center">%</th>
    <th style="text-align:center">Referência</th>
  </tr>
  <tr><td>Alta (Imediata)</td><td style="text-align:center;font-weight:bold">${totA}</td><td style="text-align:center">${pA}%</td><td style="background:#fee2e2">&nbsp;</td></tr>
  <tr><td>Média (Curto Prazo)</td><td style="text-align:center;font-weight:bold">${totM}</td><td style="text-align:center">${pM}%</td><td style="background:#fef9c3">&nbsp;</td></tr>
  <tr><td>Baixa (Longo Prazo)</td><td style="text-align:center;font-weight:bold">${totB}</td><td style="text-align:center">${pB}%</td><td style="background:#dcfce7">&nbsp;</td></tr>
  <tr><td style="font-weight:bold;background:#EEF2FF">Total</td><td style="text-align:center;font-weight:bold;background:#EEF2FF">${totT}</td><td style="text-align:center;background:#EEF2FF">100%</td><td style="background:#EEF2FF">&nbsp;</td></tr>
</table>`

    // ── Seção 5 — Recomendações ───────────────────────────────────────────────
    const S5 = `
<table>
  <tr><td colspan="2" class="th-cab">Recomendações sobre Manutenção, Uso, Sustentabilidade e Gerais</td></tr>
  <tr>
    <td style="width:5%;text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.1</td>
    <td><b>Avaliação e recomendações da manutenção.</b><br>${xe(complemento?.rec51) || '<i>[A ser preenchido pelo responsável técnico]</i>'}</td>
  </tr>
  <tr>
    <td style="text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.2</td>
    <td><b>Avaliação e recomendações do uso da edificação.</b><br>${xe(complemento?.rec52) || '<i>[A ser preenchido]</i>'}</td>
  </tr>
  <tr>
    <td style="text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.3</td>
    <td><b>Avaliação e recomendações da sustentabilidade.</b><br>${xe(complemento?.rec53) || '<i>[A ser preenchido]</i>'}</td>
  </tr>
  <tr>
    <td style="text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.4</td>
    <td><b>Outras avaliações e recomendações.</b><br>${xe(complemento?.rec54) || '<i>[A ser preenchido]</i>'}</td>
  </tr>
</table>`

    // ── Anexo 1 — Documentos ─────────────────────────────────────────────────
    const A1 = `
<table>
  <tr><td colspan="3" class="th-cab">Documentação da Edificação Solicitada para Análise e Avaliação</td></tr>
  <tr>
    <th style="width:60%;text-align:left">Documentos</th>
    <th style="width:20%;text-align:center">Situação</th>
    <th style="width:20%;text-align:left">Resultado</th>
  </tr>
  ${DOCS_ANEXO1.map(d => {
    const info = (complemento?.docsAnexo1 ?? {})[d] ?? { situacao: '', resultado: '' }
    const sit = info.situacao || '—'
    const res = info.resultado || '—'
    const cor = sit === 'Entregue' ? 'color:#166534;font-weight:bold'
      : sit === 'Pendente' ? 'color:#991b1b;font-weight:bold' : 'color:#6b7280'
    return `<tr><td>${d}</td><td style="text-align:center;${cor}">${sit}</td><td>${res}</td></tr>`
  }).join('')}
  <tr><td colspan="3" style="font-style:italic;font-size:7.5pt">Situação: Entregue / Pendente / Desnecessário — Resultado: Conforme / Não conforme / Não se aplica</td></tr>
</table>`

    // ── Anexo 2 — Formulários IDÊNTICOS aos da rota homologar ─────────────────
    const A2 = (ncs ?? []).length === 0
      ? '<p><i>Nenhuma vistoria homologada encontrada para este serviço.</i></p>'
      : (ncs ?? []).map((nc: any, idx: number) => {
          const ns = xe((nc.sistema || '').slice(3).replace(/_/g, ' '))
          const corGR = Number(nc.grauRisco) >= 64 ? '#DC2626'
            : Number(nc.grauRisco) >= 35 ? '#D97706' : '#059669'
          const fotoHtml = nc.fotoBase64 && nc.fotoBase64.startsWith('data:image')
            ? `<img src="${nc.fotoBase64}" class="foto" alt="Foto ${xe(nc.fotoNr)}">`
            : `<div style="height:90mm;background:#f1f5f9;border:2px dashed #c3d4f0;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:7.5pt">Sem foto</div>`
          return `${idx > 0 ? '<div style="page-break-before:always"></div>' : ''}
<div class="hdr"><h1>AIMÊ — Vistoria Homologada</h1><p>${xe(nc.tipoServico || tipoServico)}</p></div>
<div class="div"></div>
<div class="vbody">
<div class="blk"><div class="bt">Identificação</div><div class="bb">
<div class="g2">
<div class="f"><label>${xe(nc.cnpjoucpf || '').length === 11 ? 'CPF' : 'CNPJ'}</label><span>${xe(nc.cnpjDisplay || nc.cnpjoucpf)}</span></div>
<div class="f"><label>Razão Social / Nome</label><span>${xe(nc.razaoSocial || estab?.razao_social_nome)}</span></div>
</div>
<div class="g3">
<div class="f"><label>Tipo de serviço</label><span>${xe(nc.tipoServico || tipoServico)}</span></div>
<div class="f"><label>Data Vistoria</label><span>${xe(nc.dataVistoria)}</span></div>
<div class="f"><label>Chave Inspetor</label><span>${xe(nc.chaveInspetor || chaveInspetor)}</span></div>
</div>
</div></div>
<div class="blk"><div class="bt">Anomalia / Não Conformidade</div><div class="bb">
<div class="g2">
<div class="f"><label>Sistema</label><span>${ns}</span></div>
<div class="f"><label>Subsistema</label><span>${xe(nc.subsistema)}</span></div>
</div>
<div class="f"><label>Anomalia</label><span>${xe(nc.anomalia)}</span></div>
<div class="g3">
<div class="f"><label>Origem</label><span>${xe(nc.origem || nc.resultado)}</span></div>
<div class="f"><label>Local</label><span>${xe(nc.local)}</span></div>
<div class="f"><label>Complemento</label><span>${xe(nc.complemento)}</span></div>
</div>
</div></div>
<div class="blk"><div class="bt">Classificação de Risco</div><div class="bb">
<div class="g4">
<div class="f"><label>Gravidade</label><span>${xe(nc.gravidade)}</span></div>
<div class="f"><label>Urgência</label><span>${xe(nc.urgencia)}</span></div>
<div class="f"><label>Abrangência</label><span>${xe(nc.abrangencia)}</span></div>
<div class="f"><label>Exposição</label><span>${xe(nc.exposicao)}</span></div>
</div>
<div class="met">
<div class="m" style="border-color:${corGR}">
<span style="font-size:6.5pt;color:#4a6480;font-weight:600">Grau de Risco</span>
<span style="font-size:13pt;font-weight:700;color:${corGR}">${xe(nc.grauRisco)}</span>
</div>
<div class="m" style="border-color:${corGR};justify-content:center">
<span style="font-size:6.5pt;color:#4a6480;font-weight:600">Prioridade</span>
<span class="vbadge" style="color:${corGR};border:1.5px solid ${corGR}">${xe(nc.prioridade)}</span>
</div>
</div>
</div></div>
<div class="blk"><div class="bt">Evidência Fotográfica</div><div class="bb">
<div class="ph">
<div class="f" style="width:60px"><label>Foto Nº</label><span style="text-align:center;color:#1E3A8A;font-weight:700">${xe(nc.fotoNr)}</span></div>
<div class="f" style="width:80px"><label>Data Vistoria</label><span style="text-align:center">${xe(nc.dataVistoria)}</span></div>
</div>
${fotoHtml}
</div></div>
<div class="blk"><div class="bt">Não Conformidade (NC)</div><div class="bb">
<div class="f"><label>Não conformidade (NC)</label><span style="white-space:pre-wrap">${xe(nc.nc || nc.anomalia)}</span></div>
<div class="f"><label>Causa provável (CP)</label><span style="white-space:pre-wrap">${xe(nc.cp)}</span></div>
<div class="f"><label>Solução</label><span style="white-space:pre-wrap">${xe(nc.solucaoNC || nc.cp || '—')}</span></div>
</div></div>
<div class="stamp"><span>✓ Homologado — ${xe(nc.chaveInspetor || chaveInspetor)}</span></div>
</div>`
        }).join('\n')

    // ── HTML COMPLETO ─────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>${CSS}</style>
</head>
<body>
${cabInspetor ? `<div class="cab">${cabInspetor}</div>` : ''}
<p style="text-align:right;margin:0;line-height:1">${xe(estab?.cidade)}/${xe(estab?.uf)}, ${dataHoje}</p>
<p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p>

<h1>1.- Considerações Preliminares.</h1>
<p>Este ${titulo} é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da ABNT/NBR 16.747/2020 e legislação vigente.</p>
${S11}

<h2>1.2.- Objetivo.</h2>
<p>Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção ${tipoServico === '43' ? 'do imóvel' : 'da edificação'}, de acordo com os critérios da ABNT NBR 16.747/2020 e normas correlatas.</p>

<h2>1.3.- Plano de Trabalho.</h2>
<p>As etapas básicas desenvolvidas para a realização do presente trabalho constam na tabela que segue.</p>
<table>
  <tr>
    <th style="width:8%;text-align:center">Horas</th>
    <th style="width:10%;text-align:center">Dias Úteis</th>
    <th style="width:12%;text-align:center">Dt Início</th>
    <th style="width:12%;text-align:center">Dt Fim</th>
    <th>Atividades</th>
  </tr>
  <tr><td style="text-align:center">2</td><td style="text-align:center">1</td><td></td><td></td><td>Análise técnica inicial da edificação para conhecer as características e peculiaridades</td></tr>
  <tr><td style="text-align:center">3</td><td style="text-align:center">1</td><td></td><td></td><td>Entrevista inicial para coletar dados históricos do prédio e documentação necessária</td></tr>
  <tr><td style="text-align:center">3</td><td style="text-align:center">3</td><td></td><td></td><td>Entrega de documentos pelo síndico para o inspetor predial e análise</td></tr>
  <tr><td style="text-align:center">6</td><td style="text-align:center">5</td><td></td><td></td><td>Execução da vistoria com levantamento das anomalias e falhas nos sistemas construtivos</td></tr>
  <tr><td style="text-align:center">34</td><td style="text-align:center">6</td><td></td><td></td><td>Elaboração do laudo efetuando análise, classificação, recomendações e soluções</td></tr>
  <tr><td style="text-align:center">1</td><td style="text-align:center">1</td><td></td><td></td><td>Entrega do laudo ao síndico ou responsável</td></tr>
</table>

<h2>1.4.- Condições e limitações.</h2>
<p>O ${titulo} segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:</p>
<ul>
  <li>Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;</li>
  <li>O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho;</li>
  <li>O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos.</li>
</ul>

<div class="quebra">
<h1>2.- Metodologia adotada para o Trabalho.</h1>
<p>A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal.</p>

<h2>2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.</h2>
<p>A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos) da ABNT.</p>

<h2>2.2.- Norma de Inspeção Predial do IBAPE/2025.</h2>
<p>A Norma de Inspeção Predial do IBAPE fixa diretrizes, conceitos, terminologias, critérios e procedimentos relativos à atividade de Inspeção Predial, abrangendo os requisitos mínimos de:</p>
<ul>
  <li><b>Segurança:</b> segurança estrutural; segurança contra incêndio; segurança no uso e na operação;</li>
  <li><b>Habitabilidade:</b> estanqueidade; saúde, higiene e qualidade do ar; funcionalidade e acessibilidade;</li>
  <li><b>Sustentabilidade:</b> durabilidade e manutenibilidade.</li>
</ul>

<h2>2.3.- Critérios e Metodologia da Inspeção.</h2>
<p>O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio. A análise do risco consiste na classificação das anomalias e falhas identificadas nos sistemas construtivos, levando em consideração a Gravidade, a Urgência e a Tendência de evolução (metodologia GUT adaptada).</p>
<p>As Prioridades para efetuar as manutenções das não conformidades:</p>
<ul>
  <li><b>Prioridade 1 (Alta):</b> ações necessárias de imediato — prazo inferior a 8 meses;</li>
  <li><b>Prioridade 2 (Média):</b> ações corretivas a médio prazo — prazo inferior a 15 meses;</li>
  <li><b>Prioridade 3 (Baixa):</b> ações planejadas a longo prazo — prazo não superior a 30 meses.</li>
</ul>
</div>

<div class="quebra">
<h1>3.- Resultado da Vistoria Técnica e Classificação da Edificação.</h1>

<h2>3.1.- Descrição da Vistoria Técnica.</h2>
<table>
  <tr><td class="th-cab">Descrição da Realização da Vistoria — Nível da Inspeção: ${xe(nivel) || '—'}</td></tr>
  <tr><td style="min-height:50pt;padding:8pt">${xe(complemento?.descVistoria || complemento?.dadosVistoria)}</td></tr>
</table>
<p>Os sistemas construtivos e instalações vistoriadas, com as condições observadas e as respectivas recomendações são apresentadas nos Relatórios de Não Conformidades, item 4 deste documento.</p>

<h2>3.2.- Resultado da Vistoria.</h2>
<p>O resultado da vistoria, imagens dos formulários de coleta de dados, é apresentado no Anexo 2 deste documento.</p>

<h2>3.3.- Resultado da Classificação ${tipoServico === '43' ? 'do Imóvel' : tipoServico === '44' ? 'da Fachada' : 'da Edificação'}.</h2>
<p>O resultado da classificação foi efetuado seguindo a metodologia apresentada para execução deste trabalho.</p>
${S33}
</div>

<div class="quebra">
<h1>4.- Relação de Não Conformidades e Análise das Manifestações Patológicas.</h1>

<h2>4.1.- Relação de Não Conformidades e Soluções.</h2>
<p>A prioridade para manutenção de cada não conformidade foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: gravidade, urgência, tendência e exposição ao risco.</p>
${S41 || '<p><i>Nenhuma não conformidade registrada.</i></p>'}

<h2>4.2.- Análise Estatística das Manifestações Patológicas.</h2>
<p>A tabela que segue apresenta a estatística de ocorrências de manifestações patológicas por sistema construtivo e prioridade.</p>
${S42}
</div>

<div class="quebra">
<h1>5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais.</h1>
<p>A seguir estão registradas as recomendações para a manutenção, o uso, a sustentabilidade e outras consideradas pertinentes.</p>
${S5}
</div>

<div class="quebra">
<h1>6.- Conclusão.</h1>
<p>Diante do exposto neste documento, e após analisados todos os fatos observados que interferem com o assunto objeto deste laudo, concluímos que a edificação vistoriada apresenta ${totT > 0 ? `${totT} manifestações patológicas distribuídas nos sistemas construtivos, sendo ${totA} de prioridade Alta, ${totM} de prioridade Média e ${totB} de prioridade Baixa` : 'ausência de manifestações patológicas relevantes'}.</p>
<p>Recomendamos a execução de nova vistoria no prazo máximo de 5 anos para reavaliar as condições da edificação.</p>

<h1>7.- Encerramento.</h1>
<h2>7.1. Anexos:</h2>
<ul>
  <li>Anexo 1 – Relação de documentos solicitados e analisados;</li>
  <li>Anexo 2 – Resultado da Vistoria;</li>
  <li>Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.</li>
</ul>

<h2>7.2.- Declaração de conformidade com o Código de Ética.</h2>
<p>O signatário atesta que a presente vistoria segue criteriosamente os princípios dos Códigos de Ética Profissional do CONFEA e do IBAPE.</p>

<div class="ass">
  <p style="text-align:center">${xe(estab?.cidade)}/${xe(estab?.uf)}, ${dataHoje}</p>
  <br><br><br>
  <p style="text-align:center">_______________________________________________</p>
  <p style="text-align:center"><b>${xe(inspetor?.nome_inspetor)}</b> – Responsável Técnico</p>
  <p style="text-align:center">${xe(inspetor?.titulo_profissional)} – CREA/CAU ${xe(inspetor?.inscricao_crea_cau)}</p>
  ${inspetor?.especializacao ? `<p style="text-align:center">${xe(inspetor.especializacao)}</p>` : ''}
</div>
</div>

<div class="quebra">
<h1>Anexo 1 – Relação de Documentos Solicitados e Avaliados</h1>
${A1}
</div>

<div class="quebra">
<h1>Anexo 2 – Resultado da Vistoria</h1>
${A2}
</div>

<div class="quebra">
<h1>Anexo 3 – Anotações de Responsabilidade Técnica</h1>
<p>Inserir neste espaço a ART ou RRT devidamente registrada no CREA ou CAU.</p>
${srcArt
  ? `<div style="margin-top:8pt;text-align:center"><img src="${srcArt}" style="max-width:100%;border:1px solid #1E3A8A"></div>`
  : `<div style="margin-top:8pt;border:1px dashed #1E3A8A;padding:40pt;text-align:center;color:#9ab0d4;font-style:italic">[ART/RRT — inserir pelo responsável técnico após baixar o documento editável]</div>`}
</div>

${rodInspetor ? `<div class="rod">${rodInspetor}</div>` : ''}

</body>
</html>`

    // Salvar HTML
    const { error } = await supabase.storage
      .from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, Buffer.from(html, 'utf-8'), {
        contentType: 'text/html', upsert: true,
      })
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // Salvar JSON para gerar DOCX
    const nomeJson = nomeArquivo.replace(/\.html$/i, '_dados.json')
    await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeJson}`, Buffer.from(JSON.stringify({
        cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
        estab, inspetor, ncs, complemento,
      }), 'utf-8'), { contentType: 'application/json', upsert: true })

    return NextResponse.json({ ok: true, nomeArquivo })

  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
