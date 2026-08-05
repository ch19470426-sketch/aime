// src/app/api/gerar-laudo/route.ts
// AIMÊ — Gera HTML do Laudo Técnico (tipos 41-44)
// CSS EXATO do Design System Brief §2–4

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
  // 45-48: sistemas vêm dos dados de vistoria NR
  '41': ['01_Sistema Estrutural','02_Fachadas, Empenas e Marquises','03_Cobertura e Telhados','04_Instalações Hidrossanitárias','05_Instalações Elétricas e SPDA','06_Instalações de Gás','07_Sistema de Prevenção e Combate a Incêndio','08_Elevadores e Equipamentos Eletromecânicos','09_Impermeabilização','10_Acessibilidade','11_Contenção de Encostas e Arrimos','12_Áreas Comuns e Infraestrutura','13_Documentação e Conformidade Legal'],
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado','02_Revestimento Cerâmico de Fachada','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada','11_Segurança Contra Incêndio','12_Manutenção e Equipamentos de Acesso'],
}

const TITULO: Record<string, string> = {
  '41':'Laudo de Autovistoria Predial',
  '42':'Laudo de Inspeção Predial',
  '43':'Laudo de Vistoria de Imóvel Novo',
  '44':'Laudo de Inspeção de Fachada',
  '45':'Laudo de Inspeção de Elevadores',
  '46':'Laudo de Inspeção das Instalações Elétricas — NR-10',
  '47':'Laudo de Inspeção de Máquinas e Equipamentos — NR-12',
  '48':'Laudo de Inspeção de Caldeiras, Vasos de Pressão e Tubulações — NR-13',
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
  '10_Acessibilidade': 'Inclui rampas, corrimãos, pisos táteis, vagas para PCD, banheiros adaptados e demais elementos conforme NBR 9050.',
  '11_Contenção de Encostas e Arrimos': 'Abrange muros de arrimo, taludes, cortinas de estacas, drenos e sistemas de contenção de solo.',
  '12_Áreas Comuns e Infraestrutura': 'Compreende hall, corredores, escadas, garagem, playground, salão de festas, guarita e demais áreas de uso coletivo.',
  '13_Documentação e Conformidade Legal': 'Inclui análise dos documentos técnicos e legais da edificação quanto à sua regularidade e conformidade normativa.',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function xe(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/@/g,'&#64;')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'')
}
function fmtDoc(v: string): string {
  const n=(v||'').replace(/\D/g,'')
  if(n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  if(n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
  return v
}
function fmtData(): string {
  const d=new Date()
  const M=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`
}
function pct(v:number,t:number): string { return t ? Math.round(v*100/t)+'%' : '—' }
function nomeS(s:string): string { return s.slice(3).replace(/_/g,' ') }
function descS(s:string): string { return DESC_SISTEMAS[s]||`Sistema: ${nomeS(s)}` }

// ─── CSS — Design System Brief §2–4 (copiado literalmente) ───────────────────
const CSS = `
/* Impressão A4 */
@page {
  size: A4; margin: 25mm 20mm 20mm 25mm;
  @bottom-right {
    content: "Pág. " counter(page);
    font-family: Arial, sans-serif;
    font-size: 7.5pt;
    color: #374151;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; color: #000; background: #fff; font-size: 9pt; line-height: 1.4; }

p { margin: 4pt 0; text-align: justify; color: #000; }
h1, h2, h3 { font-weight: bold; color: #000; margin: 10pt 0 4pt; }
ul, ol { margin: 4pt 0 4pt 1cm; padding: 0; }
li { margin-bottom: 2pt; text-align: justify; }
b, strong { font-weight: bold; }
i, em { font-style: italic; }
.section { page-break-before: always; }
.no-break { page-break-inside: avoid; }
.ass { margin-top: 40pt; text-align: center; }

/* Print */
@media print {
  body { font-size: 9pt; }
  .section { page-break-before: always; }
  .no-break { page-break-inside: avoid; }
  table { page-break-inside: auto; outline: 1.5px solid #1E3A8A; }
  .bloco { page-break-inside: auto; }
  p { page-break-inside: avoid; orphans: 4; widows: 4; }
  p + .bloco { page-break-before: avoid; }
  .titulo + p + .bloco { page-break-before: avoid; }
  .titulo + .bloco { page-break-before: avoid; }
}

table.tbl-plano { border: 1.5px solid #1E3A8A !important; }
/* Cabeçalho/rodapé do inspetor */
.cab { text-align: center; font-weight: bold; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; margin-bottom: 10pt; font-size: 9pt; color: #374151; white-space: pre-line; }
.rod { margin-top: 10pt; padding-top: 4pt; border-top: 1px solid #ccc; font-size: 8pt; text-align: center; white-space: pre-line; color: #374151; }

/* §3.1 — Título de seção */
.titulo {
  font-size: 10pt; font-weight: 700; color: #000;
  margin: 12pt 0 4pt; padding: 0;
}

/* §3.2 — Bloco com cabeçalho */
.bloco        { border: 1.5px solid #1E3A8A; overflow: hidden; margin-bottom: 14px; page-break-inside: auto; outline: 1.5px solid #1E3A8A; }
.bloco-header { background: #1E3A8A; color: #fff; font-size: 9pt; font-weight: 700; padding: 6px 10px; }

/* §3.3 — Grade de campos */
.row  { display: flex; border-top: 1px solid #1E3A8A; }
.row:first-of-type { border-top: none; }
.cell { flex: 1; border-right: 1px solid #1E3A8A; padding: 5px 8px; min-height: 42px; }
.cell:last-child { border-right: none; }
.cell label { display: block; font-size: 7pt; font-weight: 700; color: #1E3A8A; margin-bottom: 3px; }
.cell .val  { font-size: 8.5pt; color: #222; line-height: 1.4; }
.cell-2 { flex: 2; }
.cell-3 { flex: 3; }
.cell-4 { flex: 4; }

/* §3.4 — Tabela de dados */
table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: auto; outline: 1.5px solid #1E3A8A; }
th { background: #1E3A8A; color: #fff; font-size: 8pt; font-weight: 700;
     padding: 5px 8px; border-right: 1px solid #4a6fa5; text-align: center; }
th:last-child { border-right: none; }
td { border-top: 1px solid #1E3A8A; border-right: 1px solid #1E3A8A;
     padding: 6px 8px; font-size: 8pt; color: #222; vertical-align: middle; }
td:last-child { border-right: none; }
tr:nth-child(even) td { background: #f7f9ff; }
.th-cab { background: #1E3A8A !important; color: #fff !important; font-weight: 700; font-size: 9pt; }
.th-sub { background: #2a52a8 !important; color: #fff !important; font-weight: 700; }

.s41-bloco { page-break-before: avoid !important; }
/* Capa */
.pg-capa { page-break-after:always; display:flex; flex-direction:column; height:297mm; box-sizing:border-box; }
@page :first { margin:0 !important; }
.pg-capa { counter-reset: page 0; }
.capa-barra { background: #1E3A8A; height: 8mm; width: 100%; margin-bottom: 0; }
.capa-logo  { text-align: center; padding: 20mm 0 10mm; }
.capa-logo img { max-height: 30mm; }
.capa-titulo { text-align: center; margin-top: auto; padding: 0 20mm; }
.capa-titulo h1 { font-size: 18pt; font-weight: 900; color: #1E3A8A; line-height: 1.2; margin-bottom: 6pt; }
.capa-titulo h2 { font-size: 13pt; font-weight: 700; color: #374151; margin-bottom: 20pt; }
.capa-linha { border-top: 2px solid #1E3A8A; margin: 0 20mm; }
.capa-dados { padding: 10mm 20mm; font-size: 9.5pt; color: #222; line-height: 1.8; }
.capa-dados b { color: #1E3A8A; }
.capa-rodape { margin-top: auto; padding: 8mm 20mm; text-align: center; font-size: 8pt; color: #6B7280; border-top: 1px solid #ddd; }

/* Índice */
.pg-indice { page-break-after: always; padding-top: 10mm; }
.indice-titulo { font-size: 14pt; font-weight: 900; color: #1E3A8A; text-align: center; margin-bottom: 12mm; letter-spacing: 2px; }

.indice-item { display: flex; align-items: baseline; padding: 3pt 0; font-size: 9pt; }
.indice-num  { min-width: 30pt; font-weight: 700; color: #1E3A8A; flex-shrink: 0; }
.indice-dots { flex: 1; }

/* §3.5 — Item classificado */
.item-row     { display: flex; align-items: stretch; border-top: 1px solid #1E3A8A; min-height: 48px; }
.item-row:first-of-type { border-top: none; }
.item-letra   { background: #1E3A8A; color: #fff; font-size: 10pt; font-weight: 700;
                min-width: 32px; display: flex; align-items: center; justify-content: center; }
.item-criterio{ flex: 1; padding: 7px 10px; font-size: 8pt; color: #000;
                font-weight: 600; border-right: 1px solid #1E3A8A; }
.item-valor   { width: 34%; padding: 7px 10px; font-size: 8.5pt; font-weight: 700;
                display: flex; align-items: center; justify-content: center; }

/* §3.6 — Item de recomendação numerado */
.item-rec  { display: flex; border-top: 1px solid #1E3A8A; min-height: 56px; }
.item-rec:first-of-type { border-top: none; }
.item-num  { background: #EEF2FF; border-right: 1px solid #1E3A8A;
             min-width: 30px; display: flex; align-items: center;
             justify-content: center; font-size: 9pt; font-weight: 700; color: #1E3A8A; }
.item-texto{ padding: 7px 10px; font-size: 8.5pt; color: #333; line-height: 1.5; flex: 1; }

/* §3.7 — Foto/mapa */
.foto-box { border: 1px solid #1E3A8A; height: 195px;
            display: flex; align-items: center; justify-content: center;
            color: #9ab0d4; font-size: 8pt; font-style: italic; margin-top: 4px; overflow: hidden; }
.foto-box img { width: 100%; height: 130px; object-fit: cover; display: block; }

/* §4 — Badges */
.badge { display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: 7.5pt; font-weight: 700; }
.b-alto    { background: #fee2e2; color: #991b1b; }
.b-medio   { background: #fef9c3; color: #854d0e; }
.b-baixo   { background: #dcfce7; color: #166534; }
.b-entregue { background: #dcfce7; color: #166534; }
.b-pendente { background: #fee2e2; color: #991b1b; }
.b-desn     { background: #f3f4f6; color: #6b7280; }
.b-conforme { background: #dcfce7; color: #166534; }
.b-nconfo   { background: #fee2e2; color: #991b1b; }
.b-na       { background: #f3f4f6; color: #6b7280; }
.bc-nivel   { background: #dbeafe; color: #1e40af; }
.bc-risco   { background: #fef9c3; color: #854d0e; }
.bc-desemp  { background: #dcfce7; color: #166534; }
.bc-manut   { background: #f3e8ff; color: #6b21a8; }
.bc-uso     { background: #e0f2fe; color: #0369a1; }
.bc-global  { background: #dcfce7; color: #166534; }

/* Texto corrido — parágrafos e listas */
p  { font-size: 8.5pt; color: #222; margin: 4pt 0; text-align: justify; line-height: 1.5; }
ul { margin: 4pt 0 4pt 0.8cm; padding-left: 0; list-style: none; }
li { font-size: 8.5pt; color: #222; margin-bottom: 3pt; padding-left: 1.2em; text-indent: -1.2em; text-align: justify; }
li::before { content: "• "; }
b { font-weight: bold; }
i { font-style: italic; }

/* Quebra de página */
.section { page-break-before: always; }
.no-page-break { page-break-before: auto !important; }
.section:first-child { page-break-before: auto; }
.no-break { page-break-inside: avoid; }

/* Assinatura */
.ass { margin-top: 30pt; text-align: center; line-height: 1; }

/* CSS idêntico ao formulário homologado (rota homologar) */
.vhdr{background:#1E3A8A;padding:8px 16px;text-align:center}
.vhdr h1{font-size:11pt;font-weight:700;color:#fff;margin:0}
.vhdr p{font-size:7pt;color:#B5D4F4;margin:2px 0 0}
.vdiv{height:2px;background:#1E3A8A}
.vbody{padding:10px 14px}
.vblk{border:1px solid #c3d4f0;border-radius:6px;overflow:hidden;margin-bottom:5px;page-break-inside:avoid}
.vbt{background:#1E3A8A;color:#fff;font-size:7.5pt;font-weight:700;padding:3px 10px}
.vbb{padding:5px 10px}
.vg2{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.vg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}
.vg4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px}
.vf{display:flex;flex-direction:column;gap:1px;margin-bottom:3px}
.vf label{font-size:6.5pt;font-weight:600;color:#4a6480}
.vf span{border:1px solid #c3d4f0;border-radius:4px;padding:2px 5px;font-size:7.5pt;background:#f1f5f9;color:#222}
.vfoto{width:100%;height:90mm;object-fit:cover;border-radius:5px;border:2px solid #1E3A8A;display:block}
.vmet{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px}
.vm{background:#E8EEF7;border:2px solid #c3d4f0;border-radius:5px;padding:3px 8px;display:flex;align-items:center;gap:8px}
.vstamp{background:#E6F5EE;border:2px solid #1A7A3C;border-radius:8px;padding:6px 12px;text-align:center;margin-top:8px}
.vstamp span{color:#1A7A3C;font-weight:700;font-size:8pt}
.vph{display:flex;justify-content:space-between;margin-bottom:3px}
`

// ─── POST ─────────────────────────────────────────────────────────────────────
const DOCS_45 = [
  'Auto de Conclusão da Edificação (HABITE-SE)',
  'Alvará de Funcionamento de Elevadores',
  'Relatório de Inspeção Anual dos Elevadores (RIA)',
  'Contrato de Manutenção de Elevadores',
  'Laudo de inspeção de elevador anterior',
  'Projeto de instalação dos elevadores aprovado',
  'Convenção do Condomínio',
]
const DOCS_46 = [
  'Prontuário das Instalações Elétricas (PIE)',
  'Alvará de Funcionamento da Instituição',
  'Contrato de Manutenção das Instalações Elétricas',
  'Laudo de inspeção das instalações anterior',
]
const DOCS_47 = [
  'Inventário de máquinas e equipamentos',
  'Planta baixa do estabelecimento',
  'Manuais de operação e segurança das máquinas',
  'Laudo da última inspeção realizada',
  'Alvará de funcionamento da instituição',
]
const DOCS_48 = [
  'Inventário de caldeiras, vasos e tubulações',
  'Planta baixa do estabelecimento',
  'Manuais de operação e segurança dos equipamentos',
  'Laudo da última inspeção realizada',
  'Alvará de funcionamento da instituição',
  'Prontuário das caldeiras (NR-13)',
]
const DOCS_NR_MAP: Record<string,string[]> = {
  '45': DOCS_45, '46': DOCS_46, '47': DOCS_47, '48': DOCS_48,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
            estab: estabRaw, inspetor, ncs, nomeArquivo, complemento } = body
    let estab = estabRaw

    if (!cpfInspetor || !tipoServico || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    // Rotear para gerador específico se for laudo NR (45-48)
    const ehNR = ['45','46','47','48'].includes(tipoServico)

    // ── GERADOR PARA LAUDOS NR (45-48) ──────────────────────────────────────────
    if (ehNR) {
      // Dados específicos NR
      const clNR = complemento?.classificacao ?? {}
      const nrManut   = clNR.nrManut   ?? ''
      const nrOp      = clNR.nrOp      ?? ''
      const nrFisico  = clNR.nrFisico  ?? ''
      const nrSeg     = clNR.nrSeg     ?? ''
      const nrDoc     = clNR.nrDoc     ?? ''
      const docsAnexo = DOCS_NR_MAP[tipoServico] ?? []

      // Objetivos individualizados por norma
      const OBJETIVO: Record<string,string> = {
        '45': `O presente laudo tem por objetivo avaliar as condições de manutenção, operação, estado físico, segurança e documentação dos elevadores do ${xe(estab?.razao_social_nome||'')} , com base na ABNT NBR 16.858-1 e NR-12, visando garantir a proteção aos usuários e assegurar a confiabilidade operacional das instalações.`,
        '46': `O presente laudo tem por objetivo avaliar a conformidade das instalações elétricas do ${xe(estab?.razao_social_nome||'')} com os requisitos da NR-10 e NBR 5410, verificando as condições de manutenção, operação, estado físico, segurança e documentação, visando garantir a proteção ao trabalhador e a integridade das instalações.`,
        '47': `O presente laudo tem por objetivo avaliar a conformidade das máquinas e equipamentos do ${xe(estab?.razao_social_nome||'')} com os requisitos da NR-12 e NBR/ISO 12100, verificando as condições de manutenção, operação, estado físico, segurança e documentação, visando garantir a segurança dos trabalhadores e a confiabilidade operacional.`,
        '48': `O presente laudo tem por objetivo avaliar a conformidade das caldeiras, vasos de pressão e tubulações do ${xe(estab?.razao_social_nome||'')} com os requisitos da NR-13 e normas ASME aplicáveis, verificando as condições de manutenção, operação, estado físico, segurança e documentação, visando prevenir acidentes e assegurar a integridade dos equipamentos.`,
      }

      // Metodologias individualizadas por norma
      const METODOLOGIA: Record<string,string> = {
        '45': `A inspeção foi realizada seguindo os procedimentos estabelecidos pela ABNT NBR 16.858-1 (Elevadores de Passageiros e Monta-Cargas), complementada pela NR-12. A metodologia incluiu inspeção visual e funcional dos componentes, verificação de documentação técnica e análise das condições de manutenção e segurança, com classificação das não conformidades por grau de prioridade (A+, A, M, B).`,
        '46': `A inspeção foi realizada seguindo os procedimentos estabelecidos pela NR-10 (Segurança em Instalações e Serviços em Eletricidade), complementada pela NBR 5410. A metodologia incluiu análise documental, inspeção visual das instalações, verificação de dispositivos de proteção e medições elétricas quando aplicável, com classificação das não conformidades por grau de prioridade.`,
        '47': `A inspeção foi realizada seguindo os procedimentos estabelecidos pela NR-12 (Segurança no Trabalho em Máquinas e Equipamentos), complementada pela NBR/ISO 12100. A metodologia incluiu análise de riscos, inspeção visual e funcional das máquinas, verificação de dispositivos de segurança, proteções e documentação técnica, com classificação das não conformidades por grau de prioridade.`,
        '48': `A inspeção foi realizada seguindo os procedimentos estabelecidos pela NR-13 (Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos de Armazenamento), complementada por normas ASME aplicáveis. A metodologia incluiu inspeção visual e instrumental dos equipamentos, verificação de válvulas de segurança, instrumentação, documentação técnica e condições de operação, com classificação das não conformidades por grau de prioridade.`,
      }

      // Nomenclatura do ativo por tipo
      const NOME_ATIVO: Record<string,string> = {
        '45': 'Elevadores', '46': 'Instalações Elétricas',
        '47': 'Máquinas e Equipamentos', '48': 'Caldeiras, Vasos e Tubulações',
      }

      const nomeAtivo = NOME_ATIVO[tipoServico] ?? 'Ativos'
      const objTexto  = OBJETIVO[tipoServico] ?? ''
      const metTexto  = METODOLOGIA[tipoServico] ?? ''

      // ── Bloco 1.1 Características (Estabelecimento + Ativos) ──────────────
      const S11NR = '<div class="titulo">1.1.- Características e Localização do Estabelecimento.</div>
<div class="bloco">
  <div class="bloco-header">Características do Estabelecimento e \'+nomeAtivo+'</div>
  <div class="row">
    <div class="cell cell-2"><label>Razão Social</label><div class="val">\'+xe(estab?.razao_social_nome)+'</div></div>
    <div class="cell"><label>\'+labelDoc+'</label><div class="val">\'+xe(cnpjoucpf)+'</div></div>
    <div class="cell"><label>CEP</label><div class="val">\'+xe(estab?.cep_estabelecimento||estab?.cep)+'</div></div>
  </div>
  <div class="row">
    <div class="cell cell-3"><label>Endereço</label><div class="val">\'+xe(estab?.logradouro)+'\'+estab?.numero_imovel?', '+xe(estab.numero_imovel):''+'\'+estab?.complemento?' — '+xe(estab.complemento):''+'</div></div>
    <div class="cell"><label>Bairro</label><div class="val">\'+xe(estab?.bairro)+'</div></div>
  </div>
  <div class="row">
    <div class="cell"><label>Cidade / UF</label><div class="val">\'+xe(estab?.cidade)+'/\'+xe(estab?.uf)+'</div></div>
    <div class="cell cell-2"><label>Responsável</label><div class="val">\'+xe(estab?.nome_responsavel)+'</div></div>
    <div class="cell"><label>Função</label><div class="val">\'+xe(estab?.funcao_responsavel)+'</div></div>
  </div>
  <div class="row">
    <div class="cell cell-2"><label>Telefone / WhatsApp</label><div class="val">\'+xe(estab?.whatsapp)+'</div></div>
    <div class="cell cell-2"><label>e-Mail</label><div class="val">\'+xe(estab?.email)+'</div></div>
  </div>
  <div class="row">
    <div class="cell"><label>Tipo do Ativo</label><div class="val">\'+xe(estab?.tipo_imovel)+'</div></div>
    <div class="cell"><label>Finalidade</label><div class="val">\'+xe(estab?.finalidade_vistoria||'—')+'</div></div>
  </div>
</div>'

      // ── Bloco 3.3 Classificação NR (5 critérios) ──────────────────────────
      const CRITERIOS_NR = [
        { nome: 'Manutenção',        questao: 'A manutenção garante a confiabilidade?', val: nrManut },
        { nome: 'Operação',          questao: 'A instalação pode operar com segurança?', val: nrOp },
        { nome: 'Condições Físicas', questao: 'Os ativos apresentam boas condições físicas?', val: nrFisico },
        { nome: 'Segurança',         questao: 'Os dispositivos de proteção atendem à NR?', val: nrSeg },
        { nome: 'Documentação',      questao: 'A documentação técnica está em conformidade?', val: nrDoc },
      ]
      const cor33 = (v:string) => v==='Garante'||v==='Plena'||v==='Excelente'||v==='Plenamente'||v==='Completa' ? '#16A34A'
        : v==='Não garante'||v==='Interditada'||v==='Péssima'||v==='Não atende'||v==='Inexistente' ? '#CC0000' : '#E8A000'

      const S33NR = '<div class="titulo">3.3.- Resultado da Classificação da Instalação / Equipamento.</div>
<div class="bloco">
  <div class="bloco-header">Classificação por Critério Normativo</div>
  <table style="width:100%;border-collapse:collapse;font-size:8.5pt">
    <tr style="background:#1E3A8A;color:#fff">
      <th style="padding:5px 8px;text-align:left;width:20%">Critério</th>
      <th style="padding:5px 8px;text-align:left;width:40%">Questão Norteadora</th>
      <th style="padding:5px 8px;text-align:center;width:20%">Parâmetros de Avaliação</th>
      <th style="padding:5px 8px;text-align:center;width:20%">Resultado</th>
    </tr>
    \${CRITERIOS_NR.map(c => '<tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:4px 8px;font-weight:bold">\${c.nome}</td>
      <td style="padding:4px 8px">\${c.questao}</td>
      <td style="padding:4px 8px;text-align:center">\${c.val||'—'}</td>
      <td style="padding:4px 8px;text-align:center;font-weight:bold;color:\${cor33(c.val)}">\${c.val||'—'}</td>
    </tr>').join('')}
  </table>
</div>'

      // ── Recomendações 5. (5 itens NR) ─────────────────────────────────────
      const rec = complemento?.recomendacoes ?? {}
      const S5NR = '<div class="titulo">5.- Recomendações sobre Manutenção, Operação, Condições Físicas, Segurança e Documentação.</div>
<div class="bloco">
  <div class="bloco-header">Recomendações Técnicas</div>
  <div class="item-row"><div class="item-num">5.1</div><div class="item-criterio">Manutenção</div><div class="item-val">\'+xe(rec.rec51||'—')+'</div></div>
  <div class="item-row"><div class="item-num">5.2</div><div class="item-criterio">Operação</div><div class="item-val">\'+xe(rec.rec52||'—')+'</div></div>
  <div class="item-row"><div class="item-num">5.3</div><div class="item-criterio">Condições Físicas</div><div class="item-val">\'+xe(rec.rec53||'—')+'</div></div>
  <div class="item-row"><div class="item-num">5.4</div><div class="item-criterio">Segurança</div><div class="item-val">\'+xe(rec.rec54||'—')+'</div></div>
  <div class="item-row"><div class="item-num">5.5</div><div class="item-criterio">Documentação</div><div class="item-val">\'+xe(rec.rec55||'—')+'</div></div>
</div>'

      // ── Anexo 1 — Documentos ───────────────────────────────────────────────
      const docsA1 = Object.keys(complemento?.docsAnexo1??{}).length > 0
        ? Object.keys(complemento.docsAnexo1) : docsAnexo
      const A1NR = '<div class="titulo" style="text-align:center">Anexo 1 – Documentação Solicitada</div>
<br>
<div class="bloco">
  <table style="width:100%;border-collapse:collapse;font-size:8.5pt">
    <tr style="background:#1E3A8A;color:#fff">
      <th style="padding:5px 8px;text-align:left;width:58%">Documento</th>
      <th style="padding:5px 8px;text-align:center;width:21%">Situação</th>
      <th style="padding:5px 8px;text-align:left;width:21%">Resultado</th>
    </tr>
    \'+docsA1.map((d:string) => {
      const info=(complemento?.docsAnexo1??{+')[d]??{situacao:'',resultado:''}
      return '<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:3px 8px;word-break:break-word">\${d}</td>
        <td style="padding:3px 8px;text-align:center">\${info.situacao||'—'}</td>
        <td style="padding:3px 8px">\${info.resultado||'—'}</td>
      </tr>'
    }).join('')}
  </table>
</div>'

      // ── Montar HTML completo NR ─────────────────────────────────────────────
      // Reutilizar: CAPA, ÍNDICE, CSS, A2 (formulários), A3, assinatura
      // do gerador 41-44 — diferenças apenas nos blocos S11, 3.3, 5, A1

      // Buscar plano de trabalho (mesmo padrão 41-44)
      const slugPlano: Record<string,string> = {
        '45':'plano_elevador','46':'plano_nr10','47':'plano_nr12','48':'plano_nr13'
      }
      const nomePlano = '\'+chaveInspetor+'_\'+cnpjoucpf+'_\'+slugPlano[tipoServico]??'plano'+'.html'

      // Texto do plano (buscar do storage igual 41-44)
      let tabelaPlano = '<p><i>Plano de trabalho não encontrado.</i></p>'
      let tabelaDocs  = A1NR
      try {
        const { data: blobP } = await supabase.storage.from('aime')
          .download('documentos_inspetor/\'+nomePlano+'')
        if (blobP) {
          const htmlP = await blobP.text()
          const idxTb = htmlP.indexOf('id="tbAtiv"')
          if (idxTb >= 0) tabelaPlano = htmlP.slice(idxTb, htmlP.indexOf('</table>', idxTb)+8)
        }
      } catch { /* sem plano */ }

      // NCs homologadas (igual 41-44)
      const ncsComFoto = await Promise.all((ncs??[]).map(async (nc:any) => {
        if (nc.fotoBase64?.startsWith('data:image')) return nc
        if (!nc._arquivo) return nc
        try {
          const { data: blob } = await supabase.storage.from('aime')
            .download('vistorias_homologadas/\'+nc._arquivo+'')
          if (!blob) return nc
          const htmlNc = await blob.text()
          const mImg = htmlNc.match(/<img[^>]+src="(data:image[^"]+)"/)
          if (mImg) return { ...nc, fotoBase64: mImg[1] }
        } catch { }
        return nc
      }))

      const A2NR = (ncsComFoto??[]).length===0
        ? '<p><i>Nenhuma vistoria homologada encontrada.</i></p>'
        : (ncsComFoto??[]).map((nc:any,idx:number)=>{
          const grN=Number(nc.grauRisco)||0
          const cor=grN>80?'#CC0000':grN>=50?'#E8A000':'#16A34A'
          const bg =grN>80?'#FEE2E2':grN>=50?'#FEF9C3':'#DCFCE7'
          const pri=grN>80?'▲ Muito Alta':grN>=50?'▲ Alta':grN>=30?'■ Média':'▼ Baixa'
          const foto=nc.fotoBase64?.startsWith('data:image')
            ?'<img src="'+nc.fotoBase64+'" style="max-width:100%;max-height:115mm;object-fit:contain;display:block;margin:0 auto">'
            :'<div style="height:70mm;background:#f1f5f9;border:1px dashed #c3d4f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:7pt">[Sem foto]</div>'
          const LBL='font-size:5.5pt;color:#4a6480;font-weight:700;display:block;text-transform:uppercase;margin-bottom:1px'
          const TD ='border:1px solid #dde5f0;padding:3px 6px;vertical-align:top'
          const TH ='background:#1E3A8A;color:#fff;font-weight:700;padding:4px 6px;font-size:7.5pt;text-transform:uppercase'
          const pb =idx>0?'<div style="page-break-before:always"></div>':''
          // Nomes de campo NR
          const gv=String(nc.gravidade||'')
          const GRAV_MAP:Record<string,string>={'1':'Estética','2':'Leve','3':'Moderada','4':'Alta','5':'Crítica'}
          const URG_MAP:Record<string,string>={'1':'Pode aguardar','2':'Pode aguardar','3':'Planejar','4':'Planejar','5':'Imediata'}
          const ABR_MAP:Record<string,string>={'1':'Ponto isolado','2':'Ponto isolado','3':'Vários pontos','4':'Vários pontos','5':'Sistema completo'}
          const EXP_MAP:Record<string,string>={'1':'Baixa','2':'Baixa','3':'Média','4':'Média','5':'Alta'}
          return pb+
            '<table style="width:100%;border-collapse:collapse;font-size:7.5pt;outline:1px solid #1E3A8A">'+
            '<tr><td colspan="4" style="'+TH+'">Identificação</td></tr>'+
            '<tr>'+
              '<td style="'+TD+';width:32%"><span style="'+LBL+'">CNPJ/CPF</span>'+xe(nc.cnpjoucpf||'')+'</td>'+
              '<td colspan="3" style="'+TD+'"><span style="'+LBL+'">Razão Social</span>'+xe(nc.razaoSocial||estab?.razao_social_nome||'')+'</td>'+
            '</tr>'+
            '<tr><td colspan="4" style="'+TH+'">Requisito Normativo — Não Conformidade</td></tr>'+
            '<tr>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Sistema</span>'+xe((nc.sistema||'').slice(3).replace(/_/g,' '))+'</td>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Subsistema</span>'+xe(nc.subsistema||'')+'</td>'+
              '<td colspan="2" style="'+TD+'"><span style="'+LBL+'">Item Normativo / Anomalia</span>'+xe(nc.anomalia||nc.nc||'')+'</td>'+
            '</tr>'+
            '<tr>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Resultado</span>'+xe(nc.resultado||nc.origem||'')+'</td>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Local de Ocorrência</span>'+xe(nc.local||'')+'</td>'+
              '<td colspan="2" style="'+TD+'"><span style="'+LBL+'">Complemento</span>'+xe(nc.complemento||'')+'</td>'+
            '</tr>'+
            '<tr><td colspan="4" style="'+TH+'">Classificação de Risco</td></tr>'+
            '<tr>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Gravidade</span>'+(GRAV_MAP[gv]||gv||'—')+'</td>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Urgência</span>'+(URG_MAP[String(nc.urgencia||'')]||xe(nc.urgencia||'')||'—')+'</td>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Abrangência</span>'+(ABR_MAP[String(nc.abrangencia||'')]||xe(nc.abrangencia||'')||'—')+'</td>'+
              '<td style="'+TD+'"><span style="'+LBL+'">Exposição</span>'+(EXP_MAP[String(nc.exposicao||'')]||xe(nc.exposicao||'')||'—')+'</td>'+
            '</tr>'+
            '<tr>'+
              '<td colspan="2" style="'+TD+';background:'+bg+';border-color:'+cor+'"><span style="'+LBL+'">Grau de Risco</span><span style="font-size:16pt;font-weight:700;color:'+cor+'">'+grN+'</span></td>'+
              '<td colspan="2" style="'+TD+';background:'+bg+';border-color:'+cor+';text-align:center"><span style="'+LBL+'">Prioridade</span><span style="font-size:11pt;font-weight:700;color:'+cor+'">'+pri+'</span></td>'+
            '</tr>'+
            '<tr><td colspan="4" style="'+TH+'">Evidência Fotográfica</td></tr>'+
            '<tr>'+
              '<td style="'+TD+';width:40%"><span style="'+LBL+'">Foto Nº</span>'+xe(nc.fotoNr||'')+'</td>'+
              '<td colspan="3" style="'+TD+';text-align:right"><span style="'+LBL+'">Data da Vistoria</span>'+xe(nc.dataVistoria||nc.data||'')+'</td>'+
            '</tr>'+
            '<tr><td colspan="4" style="'+TD+';padding:4px 2px">'+foto+'</td></tr>'+
            '<tr><td colspan="4" style="'+TH+'">Resultado da Análise</td></tr>'+
            '<tr><td colspan="4" style="'+TD+'"><span style="'+LBL+'">Descrição da Não Conformidade (NC)</span>'+xe(nc.nc||nc.anomalia||'')+'</td></tr>'+
            '<tr><td colspan="4" style="'+TD+'"><span style="'+LBL+'">Causa Provável (CP)</span>'+xe(nc.cp||'')+'</td></tr>'+
            '</table>'
        }).join('\n')

      // ── Montar CAPA, ÍNDICE e CORPO NR ────────────────────────────────────
      // Reutilizar helpers já existentes no escopo (logoTag, CAPA_HTML, INDICE_HTML, CSS, rodapé)
      const siglaInsCurrent = (inspetor?.titulo_profissional||'').toLowerCase().includes('arquitet') ? 'CAU'
        : (inspetor?.titulo_profissional||'').toLowerCase().includes('corretor') ? 'CRECI' : 'CREA'
      const tituloInsCurrent = (inspetor?.titulo_profissional||'').replace(/(CREA|CAU|CRECI)[\s-]*/gi,'').trim()
      const numInsCurrent = (inspetor?.inscricao_crea_cau||'').replace(/^(CREA|CAU|CRECI)[\s-]*/gi,'').trim()
      const cabInspetor = xe(inspetor?.cabecalho_documentos||'')
      const rodInspetor = xe(inspetor?.rodape_documentos||'Mapeamento Inteligente de Edificações e Equipamentos')
      const logoB64NR = inspetor?.logo_base64||''
      const logoTagNR = logoB64NR
        ? '<img src="\'+logoB64NR+'" style="max-height:28mm;max-width:80mm">'
        : '<div style="font-size:14pt;font-weight:900;color:#1E3A8A">\'+xe(inspetor?.cabecalho_documentos||'AIMÊ')+'</div>'

      const htmlNR = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>\'+titulo+'</title>
<style>\'+CSS+'</style>
</head>
<body>
<div class='pg-capa' style='counter-reset:page 0'>
  <div style='height:1cm;background:#fff;flex-shrink:0'></div>
  <div style='background:#1E3A8A;height:8mm;flex-shrink:0'></div>
  <div style='text-align:center;padding:10mm 0 0;flex-shrink:0;margin-bottom:16mm'>\'+logoTagNR+'</div>
  <div style='flex:1'></div>
  <div style='text-align:center;padding:0 20mm;flex-shrink:0'>
    <div style='font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:6pt'>LAUDO TÉCNICO</div>
    <div style='font-size:18pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:2pt'>\'+titulo+'</div>
    <div style='font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt'>\'+xe(estab?.razao_social_nome||'')+'</div>
    <div style='font-size:9pt;color:#374151;text-align:center'>\'+xe(estab?.logradouro||'')+'\'+estab?.numero_imovel?', '+xe(estab.numero_imovel):''+' &mdash; \'+xe(estab?.cidade||'')+'/\'+xe(estab?.uf||'')+'</div>
  </div>
  <div style='flex:2'></div>
  <div style='border-top:2px solid #1E3A8A;margin:0 20mm;flex-shrink:0'></div>
  <div style='padding:8mm 20mm;font-size:9.5pt;color:#222;line-height:1.9;flex-shrink:0'>
    <b style='color:#1E3A8A'>Inspetor Responsável:</b> \'+xe(inspetor?.nome_inspetor)+'<br>
    <b style='color:#1E3A8A'>Título Profissional:</b> \'+tituloInsCurrent+' &mdash; \'+siglaInsCurrent+' \'+numInsCurrent+'<br>
    \'+inspetor?.especializacao?'<b style="color:#1E3A8A">Especialidade:</b> Especialista '+xe(inspetor.especializacao)+'<br>':''+'
    <b style='color:#1E3A8A'>Data:</b> \'+dataHoje+'
  </div>
  <div style='background:#1E3A8A;height:8mm;flex-shrink:0'></div>
  <div style='height:1cm;background:#fff;flex-shrink:0'></div>
</div>

<div class="section">
<div class="pg-indice">
<div class="indice-titulo">ÍNDICE</div>
\'+[
  {n:'1.',pg:'2',t:'Considerações Preliminares',nivel:1+',
  {n:'1.1.-',pg:'2',t:'Características e Localização do Estabelecimento',nivel:2},
  {n:'1.2.-',pg:'3',t:'Objetivo',nivel:2},
  {n:'1.3.-',pg:'3',t:'Plano de Trabalho',nivel:2},
  {n:'1.4.-',pg:'4',t:'Condições e Limitações',nivel:2},
  {n:'2.',pg:'4',t:'Metodologia Adotada',nivel:1},
  {n:'3.',pg:'5',t:'Resultado da Vistoria e Classificação',nivel:1},
  {n:'3.1.-',pg:'5',t:'Descrição da Realização da Vistoria',nivel:2},
  {n:'3.2.-',pg:'6',t:'Resultado da Vistoria',nivel:2},
  {n:'3.3.-',pg:'7',t:'Resultado da Classificação',nivel:2},
  {n:'4.',pg:'8',t:'Relação de Não Conformidades e Soluções',nivel:1},
  {n:'4.1.-',pg:'8',t:'Relação de Não Conformidades por Sistema',nivel:2},
  {n:'4.2.-',pg:'10',t:'Análise Estatística das Não Conformidades',nivel:2},
  {n:'5.',pg:'11',t:'Recomendações',nivel:1},
  {n:'6.',pg:'12',t:'Conclusão',nivel:1},
  {n:'7.',pg:'13',t:'Encerramento',nivel:1},
  {n:'Anexo 1',pg:'14',t:'Documentação Solicitada',nivel:1},
  {n:'Anexo 2',pg:'15',t:'Resultado da Vistoria (Formulários)',nivel:1},
  {n:'Anexo 3',pg:'17',t:'ART / RRT',nivel:1},
].map(it=>
  '<div class="indice-item'+(it.nivel===2?' nivel2':'')+'">'+
  '<span class="indice-num">'+xe(it.n)+'</span>'+
  '<span>'+xe(it.t)+'</span>'+
  '<span class="indice-dots"></span>'+
  '<span style="min-width:24pt;text-align:right;color:#1E3A8A;font-weight:700">'+it.pg+'</span>'+
  '</div>'
).join('')}
</div>
</div>

<div class="section">
\'+cabInspetor?'<div class="cab">'+cabInspetor+'</div>':''+'
<br><br><br><br><br>

<div class="titulo">1.- Considerações Preliminares.</div>
<p>Este Laudo de Inspeção é o documento técnico resultante da inspeção realizada nos \'+nomeAtivo+' do estabelecimento, com análise, classificação e priorização das não conformidades identificadas com base nos requisitos normativos aplicáveis.</p>
<p>A inspeção abrangeu verificação documental, inspeção visual e funcional dos equipamentos/instalações, com emissão de relatório técnico conforme os critérios estabelecidos pelas normas vigentes.</p>

\'+S11NR+'

<div class="titulo">1.2.- Objetivo.</div>
<p>\'+objTexto+'</p>

<div class="titulo">1.3.- Plano de Trabalho.</div>
<p>As etapas desenvolvidas para a realização do presente trabalho constam na tabela que segue.</p>
\'+tabelaPlano+'

<div class="titulo">1.4.- Condições e Limitações.</div>
<p>A inspeção foi realizada nas condições de acesso disponibilizadas pelo responsável do estabelecimento. Equipamentos em operação ou com acesso restrito foram classificados como "Não Avaliado" (NA). O presente laudo se refere exclusivamente às condições encontradas na data da vistoria.</p>

<div class="titulo">2.- Metodologia Adotada para o Trabalho de Inspeção.</div>
<p>\'+metTexto+'</p>

<div class="titulo">3.- Resultado da Vistoria Técnica e Classificação.</div>
<p>Neste capítulo é apresentado o resultado da vistoria técnica realizada, incluindo a descrição do caminhamento, os resultados individuais de cada requisito verificado e a classificação geral da instalação/equipamento.</p>

<div class="titulo">3.1.- Descrição da Realização da Vistoria Técnica.</div>
<p>\'+xe(complemento?.descVistoria||complemento?.dadosVistoria||'—')+'</p>

<div class="titulo">3.2.- Resultado da Vistoria.</div>
<p>O resultado detalhado da inspeção, com registro fotográfico e classificação de cada não conformidade identificada, encontra-se no Anexo 2 deste laudo, na forma dos formulários de vistoria homologados.</p>

\'+S33NR+'

<div class="titulo">4.- Relação de Não Conformidades e Soluções.</div>
<p>Neste item é apresentado o conjunto de não conformidades identificadas na inspeção, classificadas por sistema e prioridade (A+, A, M, B), com sugestões de solução para cada item.</p>
<p>Prioridade: <b>A+</b> = Grau de risco > 80; <b>A</b> = Grau de risco 50-80; <b>M</b> = Grau de risco 30-49; <b>B</b> = Grau de risco < 30.</p>

<div class="titulo">4.1.- Relação de Não Conformidades por Sistema.</div>
<p><i>Ver Anexo 2 — formulários de vistoria homologados com descrição detalhada de cada não conformidade.</i></p>

<div class="titulo">4.2.- Análise Estatística das Não Conformidades.</div>
<p>A análise estatística das não conformidades identificadas por sistema e por prioridade apresenta-se a seguir.</p>

<div class="titulo">5.- Recomendações.</div>
\'+S5NR+'

<div class="titulo">6.- Conclusão.</div>
<p>Com base na inspeção realizada e nas não conformidades identificadas, recomenda-se a adoção das medidas corretivas descritas neste laudo, priorizando os itens de prioridade A+ e A, que representam risco imediato à segurança dos trabalhadores e à integridade dos equipamentos.</p>
<p>O presente laudo tem validade técnica conforme as normas aplicáveis e deve ser reavaliado a cada ciclo de inspeção previsto na legislação vigente.</p>

<div class="titulo">7.- Encerramento.</div>
<div class="titulo">7.1.- Anexos.</div>
<p>Os anexos deste laudo integram o documento técnico e devem ser considerados em conjunto com o texto principal.</p>
<div class="titulo">7.2.- Declaração de Conformidade com o Código de Ética.</div>
<p>O responsável técnico pela elaboração deste laudo declara que o trabalho foi realizado com independência técnica, imparcialidade e estrita observância aos princípios éticos da profissão e às normas técnicas e regulamentadoras aplicáveis.</p>
<div class="titulo">7.3.- Termo de Encerramento.</div>
<p style="text-align:right;font-size:9pt;font-weight:bold;color:#000;margin-top:20px">\'+estab?.cidade?xe(estab.cidade)+'/'+xe(estab?.uf||'')+', ':''+''+dataHoje+'</p>
<p style="line-height:1;margin:0">&nbsp;</p>
<p style="line-height:1;margin:0">&nbsp;</p>
<p style="font-size:8pt;line-height:1;margin:0">[Assinatura digital]</p>
<p style="line-height:1;margin:0">&nbsp;</p>
<p style="line-height:1;margin:0"><strong>\'+xe(inspetor?.nome_inspetor)+'</strong></p>
<p style="line-height:1;margin:0">\'+tituloInsCurrent+' — \'+siglaInsCurrent+' \'+numInsCurrent+'</p>
\'+inspetor?.especializacao?'<p style="line-height:1;margin:0">Especialista '+xe(inspetor.especializacao)+'</p>':''+'
</div>

<div class="section">
\'+tabelaDocs+'
</div>

<div class="section">
<div class="titulo" style="text-align:center">Anexo 2 – Resultado da Vistoria</div>
<br>
\'+A2NR+'
</div>

<div class="section">
<div class="titulo" style="text-align:center">Anexo 3 – ART / RRT</div>
<br>
<p>Inserir neste espaço a ART (Anotação de Responsabilidade Técnica) registrada no CREA ou RRT (Registro de Responsabilidade Técnica) registrada no CAU, referente a este serviço.</p>
</div>

</body>
</html>'

      // Salvar no storage
      const { error: errSave } = await supabase.storage.from('aime')
        .upload('documentos_inspetor/\'+nomeArquivo+'', new Blob([htmlNR], { type:'text/html' }), { upsert: true })
      if (errSave) throw new Error('Erro ao salvar: ' + errSave.message)

      return NextResponse.json({ sucesso: true, nome: nomeArquivo })
    }
    // ── FIM GERADOR NR (45-48) ────────────────────────────────────────────────

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
      const a = arr.filter((n:any) => n.prioridade==='Alta').length
      const m = arr.filter((n:any) => n.prioridade==='Média').length
      const b = arr.filter((n:any) => n.prioridade==='Baixa').length
      return { s, a, m, b, t: a+m+b }
    })
    const totA = stat.reduce((t,s)=>t+s.a,0)
    const totM = stat.reduce((t,s)=>t+s.m,0)
    const totB = stat.reduce((t,s)=>t+s.b,0)
    const totT = totA+totM+totB

    // Imagens do storage
    async function imgSrc(path: string): Promise<string> {
      if (!path) return ''
      try {
        const { data, error } = await supabase.storage.from('aime').download(path)
        if (error || !data) return ''
        const buf = Buffer.from(await data.arrayBuffer())
        const ext = path.split('.').pop()?.toLowerCase() ?? 'jpg'
        const mime = ext==='png' ? 'image/png' : 'image/jpeg'
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

    // ── Buscar endereço por CEP se logradouro vazio ─────────────────────────
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
      } catch (_e) { /* segue sem endereço */ }
    }

    // ── §3.3 Grade de campos — seção 1.1 ─────────────────────────────────────
    const S11 = `
<div class="titulo">1.1 – Características e Localização ${tipoServico==='43'?'do Imóvel':'da Edificação'}</div>
<div class="bloco">
  <div class="bloco-header">Características da Edificação</div>
  <div class="row">
    <div class="cell cell-3"><label>${labelEst}</label><div class="val">${xe(estab?.razao_social_nome)}</div></div>
    <div class="cell"><label>${labelDoc}</label><div class="val">${fmtDoc(cnpjoucpf)}</div></div>
    <div class="cell"><label>CEP</label><div class="val">${xe(estab?.cep_estabelecimento||estab?.cep)}</div></div>
  </div>
  <div class="row">
    <div class="cell cell-3"><label>Endereço</label><div class="val">${xe(estab?.logradouro)}${estab?.numero_imovel?', '+xe(estab.numero_imovel):''}${estab?.complemento?' — '+xe(estab.complemento):''}</div></div>
    <div class="cell cell-2"><label>Bairro</label><div class="val">${xe(estab?.bairro)}</div></div>
    <div class="cell"><label>Cidade / UF</label><div class="val">${xe(estab?.cidade)}/${xe(estab?.uf)}</div></div>
  </div>
  <div class="row">
    <div class="cell cell-2"><label>Responsável</label><div class="val">${xe(estab?.nome_responsavel)}</div></div>
    <div class="cell"><label>Função</label><div class="val">${xe(estab?.funcao_responsavel)}</div></div>
    <div class="cell"><label>Tel / WhatsApp</label><div class="val">${xe(estab?.whatsapp)}</div></div>
    <div class="cell cell-2"><label>e-Mail</label><div class="val">${xe(estab?.email)}</div></div>
  </div>
  <div class="row">
    <div class="cell"><label>Uso do Imóvel</label><div class="val">${xe(estab?.uso_imovel)}</div></div>
    <div class="cell"><label>Tipo</label><div class="val">${xe(estab?.tipo_imovel)}</div></div>
    <div class="cell"><label>Nº Pavimentos</label><div class="val">${xe(estab?.numero_pavimentos)}</div></div>
    <div class="cell"><label>Nº Unidades/Salas</label><div class="val">${xe(estab?.numero_unidades_salas)}</div></div>
    <div class="cell"><label>Área construída m²</label><div class="val">${xe(estab?.area_construida)}</div></div>
    <div class="cell"><label>Área terreno m²</label><div class="val">${xe(estab?.area_terreno)}</div></div>
  </div>
  <div class="row">
    <div class="cell"><label>Síntese da descrição da Edificação (Convenção ou Escritura)</label><div class="val">${xe(complemento?.sinteseEdif)}</div></div>
  </div>
</div>
<div class="bloco">
  <div class="bloco-header">Localização ${tipoServico==='43'?'do Imóvel':'da Edificação'}</div>
  <div class="row">
    <div class="cell">
      <label>Croqui de localização</label>
      <div class="foto-box">${srcCroqui?'<img src="'+srcCroqui+'" style="width:100%;height:100%;object-fit:cover">'  :'[ croqui de localização ]'}</div>
    </div>
    <div class="cell">
      <label>Foto da fachada principal</label>
      <div class="foto-box">${srcFachada?'<img src="'+srcFachada+'" style="width:100%;height:100%;object-fit:cover">':'[ foto da fachada principal ]'}</div>
    </div>
  </div>
</div>`

    // ── §3.4 — Seção 1.3 Plano de Trabalho (REGISTRADO: sempre 3 colunas) ──────
    // Buscar atividades do plano de trabalho homologado
    let ativPlano: {descricao:string; ini:string; fim:string}[] = []
    try {
      // Nome real do plano: chaveInspetor_cnpjoucpf_slug.html
      const SLUG_PLANO: Record<string,string> = {"41":"plano_autovistoria","42":"plano_inspecao","43":"plano_imovel_novo","44":"plano_fachada"}
      const slugPlano = SLUG_PLANO[String(tipoServico)] ?? "plano_autovistoria"
      const nomePlanoReal = `${chaveInspetor}_${cnpjoucpf}_${slugPlano}.html`
      let blobPlano = null
      const { data: bP } = await supabase.storage.from("aime").download(`documentos_inspetor/${nomePlanoReal}`)
      if (bP) blobPlano = bP
      if (blobPlano) {
        const htmlPlano = await (blobPlano as Blob).text()
        // Extrair linhas da tabela: <td style="text-align:justify...">DESC</td><td>INI</td><td>FIM</td>
        // Extrair atividades com datas do HTML do plano
        // Padrão: <td text-align:justify>DESC</td> seguido de 2 tds com data ou input
        const rgxRow = /<tr[^>]*>([\s\S]*?)<\/tr>/g
        let mRow: RegExpExecArray | null
        while ((mRow = rgxRow.exec(htmlPlano)) !== null) {
          const rowHtml = mRow[1]
          if (!rowHtml.includes('text-align:justify')) continue
          const tds = [...rowHtml.matchAll(/<td[^>]*>(.*?)<\/td>/gs)]
          if (tds.length < 3) continue
          const desc = tds[0][1].replace(/<[^>]+>/g,'').trim()
          const getV = (s: string) => {
            const v = s.match(/value="([^"]*)"/); 
            const raw = v ? v[1].trim() : s.replace(/<[^>]+>/g,'').trim()
            // Converter YYYY-MM-DD para DD/MM/AAAA
            const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
            return iso ? iso[3]+'/'+iso[2]+'/'+iso[1] : raw
          }
          const ini = getV(tds[1][1])
          const fim = getV(tds[2][1])
          // Aceitar linhas com descrição (com ou sem datas)
          if (desc && desc.length > 5) ativPlano.push({ descricao: desc, ini, fim })
        }
      }
    } catch (_e) { /* usa atividades padrão */ }

    // Atividades padrão (fallback quando plano não encontrado)
    const ATIV_DEFAULT = [
      'Análise técnica inicial da edificação para conhecer as características básicas da edificação a ser estudada.',
      'Entrevista Inicial para coletar dados históricos do prédio e pedido de documentos legais.',
      'Entrega documentos pelo síndico para o inspetor predial e análise pelo inspetor.',
      'Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas.',
      'Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento.',
      'Entrega do Laudo ao Síndico.',
    ]
    const atividadesFinais = ativPlano.length > 0 ? ativPlano
      : ATIV_DEFAULT.map(d => ({ descricao: d, ini: '', fim: '' }))

    const S13 = `<table class="tbl-plano">
  <tr>
    <th style="text-align:left;width:70%">Atividade</th>
    <th style="width:15%;text-align:center">Dt. Início</th>
    <th style="width:15%;text-align:center">Dt. Fim</th>
  </tr>
  ${atividadesFinais.map(a =>
    '<tr><td style="text-align:justify">' + xe(a.descricao) + '</td>' +
    '<td style="text-align:center">' + xe(a.ini) + '</td>' +
    '<td style="text-align:center">' + xe(a.fim) + '</td></tr>'
  ).join('\n  ')}
</table>`

    // ── §3.5 — Seção 3.3 Classificação ───────────────────────────────────────
    const itens33 = tipoServico==='43' ? [
      ['a)','A execução da obra em relação à <b>CONFORMIDADE CONSTRUTIVA</b> foi classificada como:',xe(cl.nivel),'bc-nivel'],
      ['b)','A <b>QUALIDADE DE ACABAMENTO</b> do imóvel é classificada como:',xe(cl.risco),'bc-risco'],
      ['c)','Quanto ao uso, a <b>FUNCIONALIDADE</b> do imóvel:',xe(cl.desempenho),'bc-desemp'],
      ['d)','Quanto às condições de ocupação, a <b>HABITABILIDADE</b> pode ser considerada:',xe(cl.manut),'bc-manut'],
      ['e)','A análise do resultado consolidado sobre a <b>CLASSE DO IMÓVEL</b> resulta em:',xe(cl.uso),'bc-uso'],
      ['f)','Qual o <b>GRAU DE SATISFAÇÃO NO RECEBIMENTO</b> do imóvel:',xe(cl.desempGeral),'bc-global'],
    ] : tipoServico==='44' ? [
      ['a)','Quanto ao <b>ESTADO DE CONSERVAÇÃO</b> da fachada pode ser classificado como:',xe(cl.risco),'bc-risco'],
      ['b)','O histórico de <b>MANUTENÇÃO</b> da fachada:',xe(cl.manut),'bc-manut'],
      ['c)','A <b>AGRESSIVIDADE DO MEIO AMBIENTE</b> sobre a fachada é considerada:',xe(cl.desempenho),'bc-risco'],
      ['d)','O <b>RISCO DE QUEDA DE ELEMENTOS</b> da fachada é considerado:',xe(cl.uso),'b-alto'],
      ['e)','O <b>DESEMPENHO TÉCNICO DO SISTEMA</b> da fachada:',xe(cl.desempGeral),'bc-desemp'],
    ] : [
      ['a)','Quanto ao <b>NÍVEL</b> da inspeção efetuada o imóvel foi classificado como INSPEÇÃO PREDIAL NÍVEL:',xe(nivel),'bc-nivel'],
      ['b)','Quanto ao <b>GRAU DE RISCO</b> o imóvel encontra-se classificado como de RISCO:',xe(cl.risco),'bc-risco'],
      ['c)','Quanto ao <b>DESEMPENHO</b> a classificação geral do imóvel foi classificada como:',xe(cl.desempenho),'bc-desemp'],
      ['d)','Quanto à <b>QUALIDADE DA MANUTENÇÃO</b> a edificação foi classificada como QUALIDADE QUE:',xe(cl.manut),'bc-manut'],
      ['e)','Quanto às <b>CONDIÇÕES DE USO</b> a edificação foi classificada como EDIFICAÇÃO DE USO:',xe(cl.uso),'bc-uso'],
      ['f)','Quanto ao <b>DESEMPENHO GERAL</b> a edificação foi classificada como:',xe(cl.desempGeral),'bc-global'],
    ]

    const titulo33 = tipoServico==='43' ? 'Resultado da Classificação do Imóvel'
      : tipoServico==='44' ? 'Resultado da Classificação da Fachada'
      : 'Resultado da Classificação da Edificação'

    const S33 = `
<div class="bloco">
  ${itens33.map(([letra,desc,val,cls])=>`
  <div class="item-row">
    <div class="item-letra">${letra}</div>
    <div class="item-criterio">${desc}</div>
    <div class="item-valor"><span class="badge ${cls}">${val||'—'}</span></div>
  </div>`).join('')}
</div>`

    // ── §3.4 — Seção 4.1 NCs por sistema ─────────────────────────────────────
    const S41 = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      if (arr.length===0) return ''
      const rec = xe(complemento?.recsSistema?.[s] ?? '')
      const badgeP = (p:string) => {
        const cls = p==='Alta'?'b-alto':p==='Média'?'b-medio':'b-baixo'
        return `<span class="badge ${cls}">${xe(p)}</span>`
      }
      return `
<div class="bloco s41-bloco">
  <div class="bloco-header">${xe(nomeS(s))}</div>
  <div style="padding:5px 8px;border-bottom:1px solid #1E3A8A">
    <span style="font-size:7pt;font-weight:700;color:#1E3A8A">Descrição do sistema construtivo</span><br>
    <span style="font-size:8pt;color:#222">${xe(descS(s))}</span>
  </div>
  ${rec?`<div style="padding:5px 8px;border-bottom:1px solid #1E3A8A;background:#EEF2FF">
    <span style="font-size:7pt;font-weight:700;color:#1E3A8A">Recomendação para o sistema</span><br>
    <span style="font-size:8pt;color:#222">${rec}</span>
  </div>`:''}
  <table>
    <tr>
      <th style="width:6%">Foto</th>
      <th style="width:30%;text-align:left">Não Conformidade</th>
      <th style="width:18%;text-align:left">Local</th>
      <th style="width:8%">G.R.</th>
      <th style="width:10%">Prioridade</th>
      <th style="width:28%;text-align:left">Solução</th>
    </tr>
    ${arr.map((nc:any,i:number)=>`
    <tr${i%2===1?' style="background:#f7f9ff"':''}>
      <td style="text-align:center">${xe(nc.fotoNr)}</td>
      <td>${xe(nc.nc||nc.anomalia)}</td>
      <td>${xe(nc.local)}${nc.complemento?' — '+xe(nc.complemento):''}</td>
      <td style="text-align:center">${xe(nc.grauRisco)}</td>
      <td style="text-align:center">${badgeP(nc.prioridade)}</td>
      <td>${xe(nc.solucaoNC||nc.cp||'—')}</td>
    </tr>`).join('')}
  </table>
</div>`
    }).join('')

    // ── §3.4 — Seção 4.2 Estatística + gráficos ──────────────────────────────
    const maxT = Math.max(...stat.map(s=>s.t),1)
    const S42 = `
<div class="titulo">4.2.- Análise Estatística das Manifestações Patológicas.</div>
<p>A tabela que segue apresenta a estatística de ocorrências de manifestações patológicas por sistema construtivos e prioridades, onde se pode observar o comprometimento de cada um dos sistemas construtivos, possibilitando uma clara compreensão do estado da edificação e um adequado planejamento para execução das atividades de manutenções corretivas.</p>
<div class="bloco">
  <div class="bloco-header">Estatística por Sistema Construtivo e Prioridade</div>
  <table>
    <tr>
      <th rowspan="2" style="text-align:left;width:25%">Sistema Construtivo</th>
      <th colspan="2">Alta</th><th colspan="2">Média</th><th colspan="2">Baixa</th>
      <th colspan="2">Total</th>
    </tr>
    <tr>
      <th>Nº</th><th>%</th><th>Nº</th><th>%</th><th>Nº</th><th>%</th>
      <th>Nº</th><th>%</th>
    </tr>
    ${stat.map(({s,a,m,b,t})=>`
    <tr>
      <td>${xe(nomeS(s))}</td>
      <td style="text-align:center">${a||'—'}</td><td style="text-align:center">${a?pct(a,t):'—'}</td>
      <td style="text-align:center">${m||'—'}</td><td style="text-align:center">${m?pct(m,t):'—'}</td>
      <td style="text-align:center">${b||'—'}</td><td style="text-align:center">${b?pct(b,t):'—'}</td>
      <td style="text-align:center;font-weight:700">${t||'—'}</td>
      <td style="text-align:center">${t?pct(t,totT):'—'}</td>
    </tr>`).join('')}
    <tr style="background:#EEF2FF">
      <td style="font-weight:700">Total</td>
      <td style="text-align:center;font-weight:700">${totA}</td><td style="text-align:center">${pct(totA,totT)}</td>
      <td style="text-align:center;font-weight:700">${totM}</td><td style="text-align:center">${pct(totM,totT)}</td>
      <td style="text-align:center;font-weight:700">${totB}</td><td style="text-align:center">${pct(totB,totT)}</td>
      <td style="text-align:center;font-weight:700">${totT}</td><td style="text-align:center">100%</td>
    </tr>
  </table>
</div>
<div class="bloco">
  <div class="bloco-header">Ocorrências por Sistema Construtivo</div>
  <div style="padding:8px">
    ${stat.filter(s=>s.t>0).map(({s,t})=>{
      const w=Math.round((t/maxT)*420)
      return `<div style="display:flex;align-items:center;margin-bottom:4px;gap:6px">
        <span style="font-size:7pt;color:#222;width:140px;flex-shrink:0">${xe(nomeS(s))}</span>
        <div style="width:${w}px;height:14px;background:#1E3A8A;border-radius:2px"></div>
        <span style="font-size:8pt;font-weight:700;color:#1E3A8A">${t}</span>
      </div>`
    }).join('')||'<p style="font-style:italic">Nenhuma ocorrência registrada.</p>'}
  </div>
</div>
<div class="bloco">
  <div class="bloco-header">Distribuição de Anomalias por Prioridade</div>
  <div style="display:flex;align-items:center;justify-content:center;gap:32px;padding:16px">
    <svg width="160" height="160" viewBox="0 0 160 160" style="flex-shrink:0">
      ${(()=>{
        if(totT===0) return '<text x="80" y="85" text-anchor="middle" font-size="11" fill="#666">Sem dados</text>'
        const r=70,cx=80,cy=80
        function arc(s:number,e:number,col:string):string{
          if(e-s<=0)return ''
          if(e-s>=1)return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'"/>'
          const a1=(s*2-0.5)*Math.PI,a2=(e*2-0.5)*Math.PI
          const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1)
          const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2)
          return '<path d="M'+cx+','+cy+' L'+x1+','+y1+' A'+r+','+r+' 0 '+(e-s>0.5?1:0)+',1 '+x2+','+y2+' Z" fill="'+col+'"/>'
        }
        const pA=totA/totT,pM=totM/totT
        return arc(0,pA,"#CC0000")+arc(pA,pA+pM,"#E8A000")+arc(pA+pM,1,"#16A34A")
      })()}
    </svg>
    <div style="font-size:8.5pt;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:14px;height:14px;background:#CC0000;border-radius:2px"></span><span><b>Alta:</b> ${totA} (${pct(totA,totT)})</span></div>
      <div style="display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:14px;height:14px;background:#E8A000;border-radius:2px"></span><span><b>Média:</b> ${totM} (${pct(totM,totT)})</span></div>
      <div style="display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:14px;height:14px;background:#16A34A;border-radius:2px"></span><span><b>Baixa:</b> ${totB} (${pct(totB,totT)})</span></div>
      <div style="border-top:1px solid #e5e7eb;padding-top:6px;margin-top:4px"><b>Total: ${totT} manifestações</b></div>
    </div>
  </div>
</div>`

    // ── §3.6 — Seção 5 Recomendações ─────────────────────────────────────────
    const S5 = `
<div class="titulo">5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais.</div>
<p>No decorrer do processo de autovistoria foi efetuada a análise da documentação, a vistoria na edificação, a classificação da edificação e das anomalias e falhas identificadas, o que possibilitou uma completa avaliação dos sistemas construtivos da edificação.</p>
<p>A seguir estão registradas as recomendações para a manutenção, o uso, a sustentabilidade e outras consideradas pertinentes para este trabalho.</p>
<div class="bloco">
  <div class="bloco-header">Recomendações Técnicas</div>
  <div class="item-rec">
    <div class="item-num">5.1</div>
    <div class="item-texto"><b>Avaliação e recomendações da manutenção.</b><br>${xe(complemento?.rec51)||'<i>A ser preenchido pelo responsável técnico.</i>'}</div>
  </div>
  <div class="item-rec">
    <div class="item-num">5.2</div>
    <div class="item-texto"><b>Avaliação e recomendações do uso da edificação.</b><br>${xe(complemento?.rec52)||'<i>A ser preenchido pelo responsável técnico.</i>'}</div>
  </div>
  <div class="item-rec">
    <div class="item-num">5.3</div>
    <div class="item-texto"><b>Avaliação e recomendações da sustentabilidade.</b><br>${xe(complemento?.rec53)||'<i>A ser preenchido pelo responsável técnico.</i>'}</div>
  </div>
  <div class="item-rec">
    <div class="item-num">5.4</div>
    <div class="item-texto"><b>Outras avaliações e recomendações.</b><br>${xe(complemento?.rec54)||'<i>A ser preenchido pelo responsável técnico.</i>'}</div>
  </div>
</div>`

    // ── Anexo 1 — Documentos ─────────────────────────────────────────────────
    const A1 = `
<div class="titulo" style="text-align:center">Anexo 1 – Documentação da Edificação Solicitada</div>
<br>
<div class="bloco">
  <div class="bloco-header">Relação de Documentos Solicitados para Análise e Avaliação</div>
  <table>
    <tr>
      <th style="text-align:left;width:58%;word-break:break-word">Documento</th>
      <th style="width:21%">Situação</th>
      <th style="text-align:left;width:21%">Resultado</th>
    </tr>
    ${Object.keys(complemento?.docsAnexo1??{}).length>0
      ? Object.keys(complemento.docsAnexo1).map(d=>{
      const info=(complemento.docsAnexo1??{})[d]??{situacao:'',resultado:''}
      const sit=info.situacao||'—'
      const res=info.resultado||'—'
      const cls=sit==='Entregue'?'b-entregue':sit==='Pendente'?'b-pendente':'b-desn'
      const clsR=res==='Conforme'?'b-conforme':res==='Não conforme'?'b-nconfo':res==='Não se aplica'?'b-na':''
      return `<tr><td style="word-break:break-word;white-space:normal">${d}</td><td style="text-align:center"><span class="badge ${cls}">${sit}</span></td><td><span class="${clsR?'badge '+clsR:''}">${res}</span></td></tr>`
    }).join('')
      : DOCS_ANEXO1.map(d=>{
      const info=(complemento?.docsAnexo1??{})[d]??{situacao:'',resultado:''}
      const sit=info.situacao||'—'
      const res=info.resultado||'—'
      return `<tr><td style="word-break:break-word;white-space:normal;max-width:200px">${d}</td><td style="text-align:center">${sit}</td><td>${res}</td></tr>`
    }).join('')}
  </table>
</div>`

    // ── Anexo 2 — buscar fotos faltantes das vistorias homologadas ────────────
    const ncsComFoto = await Promise.all((ncs??[]).map(async (nc:any) => {
      if (nc.fotoBase64?.startsWith('data:image')) return nc
      if (!nc._arquivo) return nc
      try {
        const { data: blob } = await supabase.storage.from('aime')
          .download(`vistorias_homologadas/${nc._arquivo}`)
        if (!blob) return nc
        const html = await blob.text()
        const m = html.match(/<img[^>]+src="(data:image[^"]+)"/)
        if (m) return { ...nc, fotoBase64: m[1] }
      } catch { /* sem foto */ }
      return nc
    }))

    // ── Anexo 2 — Formulários idênticos ao HTML homologado ────────────────────
    // Descrições dos parâmetros: valores salvos como número (1-5) pelo hook da vistoria
    // Gravidade: 1=Estética, 2=Leve, 3=Moderada, 4=Alta, 5=Crítica
    // Urgência: 1=Pode aguardar, 3=Planejar, 5=Imediata
    // Abrangência: 1=Ponto isolado, 3=Vários pontos, 5=Sistema completo
    // Exposição: 1=Baixa, 3=Média, 5=Alta
    const GRAV_MAP: Record<string,string> = {
      '1':'Estética','2':'Leve','3':'Moderada','4':'Alta','5':'Crítica',
    }
    const URG_MAP: Record<string,string> = {
      '1':'Pode aguardar','2':'Pode aguardar','3':'Planejar','4':'Planejar','5':'Imediata',
    }
    const ABR_MAP: Record<string,string> = {
      '1':'Ponto isolado','2':'Ponto isolado','3':'Vários pontos','4':'Vários pontos','5':'Sistema completo',
    }
    const EXP_MAP: Record<string,string> = {
      '1':'Baixa','2':'Baixa','3':'Média','4':'Média','5':'Alta',
    }

    const A2 = (ncsComFoto??[]).length===0
      ? '<p><i>Nenhuma vistoria homologada encontrada para este serviço.</i></p>'
      : (ncsComFoto??[]).map((nc:any,idx:number)=>{
          const ns   = xe((nc.sistema||'').slice(3).replace(/_/g,' '))
          const grN  = Number(nc.grauRisco)||0
          const cor  = grN>=64?'#CC0000':grN>=35?'#E8A000':'#16A34A'
          const bg   = grN>=64?'#FEE2E2':grN>=35?'#FEF9C3':'#DCFCE7'
          const pri  = grN>=64?'▲ Alta':grN>=35?'■ Média':'▼ Baixa'
          const gv = String(nc.gravidade||'')
          const gDesc = GRAV_MAP[gv] || gv || '—'
          const uv = String(nc.urgencia||'')
          const uDesc = URG_MAP[uv] || uv || '—'
          const av = String(nc.abrangencia||'')
          const aDesc = ABR_MAP[av] || av || '—'
          const ev = String(nc.exposicao||'')
          const eDesc = EXP_MAP[ev] || ev || '—'
          const foto  = nc.fotoBase64?.startsWith('data:image')
            ? '<img src="'+nc.fotoBase64+'" style="width:100%;max-height:130mm;object-fit:contain;display:block">'
            : '<div style="height:60mm;background:#f1f5f9;border:1px dashed #c3d4f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:7pt">[Sem foto]</div>'
          const LBL = 'font-size:5.5pt;color:#4a6480;font-weight:700;display:block;text-transform:uppercase;margin-bottom:1px'
          const TD  = 'border:1px solid #dde5f0;padding:3px 6px;vertical-align:top'
          const TH  = 'background:#1E3A8A;color:#fff;font-weight:700;padding:4px 6px;font-size:7.5pt;text-transform:uppercase'
          const pb  = idx>0?'<div style="page-break-before:always"></div>':''
          const bar = '<div style="height:3px;background:#e2e8f0;margin-top:2px;border-radius:1px"><div style="height:3px;background:'+cor+';width:'+Math.min(100,grN)+'%;border-radius:1px"></div></div>'
          return pb +
            '<table style="width:100%;border-collapse:collapse;font-size:7.5pt;margin-bottom:0;outline:1px solid #1E3A8A">' +
            '<tr><td colspan="4" style="'+TH+'">Identificação</td></tr>' +
            '<tr>' +
              '<td style="'+TD+';width:32%"><span style="'+LBL+'">CNPJ/CPF</span>'+xe(nc.cnpjoucpf||'')+'</td>' +
              '<td colspan="3" style="'+TD+'"><span style="'+LBL+'">Razão Social / Nome</span>'+xe(nc.razaoSocial||estab?.razao_social_nome||'')+'</td>' +
            '</tr>' +
            '<tr><td colspan="4" style="'+TH+'">Manifestação Patológica</td></tr>' +
            '<tr>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Sistema</span>'+xe((nc.sistema||'').slice(3).replace(/_/g,' '))+'</td>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Subsistema</span>'+xe(nc.subsistema||'')+'</td>' +
              '<td colspan="2" style="'+TD+'"><span style="'+LBL+'">Anomalia / Falha</span>'+xe(nc.anomalia||nc.nc||'')+'</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Origem</span>'+xe(nc.origem||nc.resultado||'')+'</td>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Local de Ocorrência</span>'+xe(nc.local||'')+'</td>' +
              '<td colspan="2" style="'+TD+'"><span style="'+LBL+'">Complemento do Local</span>'+xe(nc.complemento||'')+'</td>' +
            '</tr>' +
            '<tr><td colspan="4" style="'+TH+'">Classificação de Risco</td></tr>' +
            '<tr>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Gravidade</span>'+gDesc+'</td>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Urgência</span>'+uDesc+'</td>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Abrangência</span>'+aDesc+'</td>' +
              '<td style="'+TD+'"><span style="'+LBL+'">Exposição</span>'+eDesc+'</td>' +
            '</tr>' +
            '<tr>' +
              '<td colspan="2" style="'+TD+';background:'+bg+';border-color:'+cor+'">' +
                '<span style="'+LBL+'">Grau de Risco</span>' +
                '<span style="font-size:16pt;font-weight:700;color:'+cor+'">'+grN+'</span>' +
                bar +
              '</td>' +
              '<td colspan="2" style="'+TD+';background:'+bg+';border-color:'+cor+';text-align:center">' +
                '<span style="'+LBL+'">Prioridade</span>' +
                '<span style="font-size:11pt;font-weight:700;color:'+cor+'">'+pri+'</span>' +
              '</td>' +
            '</tr>' +
            '<tr><td colspan="4" style="'+TH+'">Evidência Fotográfica</td></tr>' +
            '<tr>' +
              '<td style="'+TD+';width:40%"><span style="'+LBL+'">Foto Nº</span>'+xe(nc.fotoNr||'')+'</td>' +
              '<td colspan="3" style="'+TD+';text-align:right"><span style="'+LBL+'">Data da Vistoria</span>'+xe(nc.dataVistoria||nc.data||'')+'</td>' +
            '</tr>' +
            '<tr><td colspan="4" style="'+TD+';padding:4px 2px">'+foto+'</td></tr>' +
            '<tr><td colspan="4" style="'+TH+'">Resultado da Análise e Avaliação</td></tr>' +
            '<tr><td colspan="4" style="'+TD+'"><span style="'+LBL+'">Descrição da Não Conformidade (NC)</span>'+xe(nc.nc||nc.anomalia||'')+'</td></tr>' +
            '<tr><td colspan="4" style="'+TD+'"><span style="'+LBL+'">Descrição da Causa Provável (CP)</span>'+xe(nc.cp||'')+'</td></tr>' +
            '</table>'
        }).join('\n')

    // ── HTML COMPLETO ─────────────────────────────────────────────────────────
    // Helpers para assinatura (igual ao gerar-plano)
    const siglaIns = (inspetor?.titulo_profissional||'').toLowerCase().includes('arquitet') ? 'CAU'
      : (inspetor?.titulo_profissional||'').toLowerCase().includes('corretor') ? 'CRECI' : 'CREA'
    const tituloIns = (inspetor?.titulo_profissional||'').replace(/(CREA|CAU|CRECI)[\s-]*/gi,'').trim()
    const numIns = (inspetor?.inscricao_crea_cau||'').replace(/^(CREA|CAU|CRECI)[\s-]*/gi,'').trim()

    // ── CAPA ─────────────────────────────────────────────────────────────────
    const logoB64 = inspetor?.logo_base64 || ''
    const logoTag = logoB64 ? `<img src="${logoB64}" style="max-height:28mm;max-width:80mm">` : `<div style="font-size:14pt;font-weight:900;color:#1E3A8A">${xe(inspetor?.cabecalho_documentos||'AIMÊ')}</div>`
    const CAPA_HTML = `
<div class='pg-capa' style='counter-reset:page 0'>
  <div style='height:1cm;background:#fff;flex-shrink:0'></div>
  <div style='background:#1E3A8A;height:8mm;flex-shrink:0'></div>
  <div style='text-align:center;padding:10mm 0 0;flex-shrink:0;margin-bottom:16mm'>${logoTag}</div>
  <div style='flex:1'></div>
  <div style='text-align:center;padding:0 20mm;flex-shrink:0'>
    <div style='font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:6pt'>LAUDO T&Eacute;CNICO</div>
    <div style='font-size:18pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:2pt'>${titulo}</div>
    <div style='font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt'>${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div>
    <div style='font-size:9pt;color:#374151;text-align:center'>${xe(estab?.logradouro||'')}${estab?.numero_imovel?', '+xe(estab.numero_imovel):''} &mdash; ${xe(estab?.cidade||'')}/${xe(estab?.uf||'')}</div>
  </div>
  <div style='flex:2'></div>
  <div style='border-top:2px solid #1E3A8A;margin:0 20mm;flex-shrink:0'></div>
  <div style='padding:8mm 20mm;font-size:9.5pt;color:#222;line-height:1.9;flex-shrink:0'>
    <b style='color:#1E3A8A'>Inspetor Respons&aacute;vel:</b> ${xe(inspetor?.nome_inspetor)}<br>
    <b style='color:#1E3A8A'>T&iacute;tulo Profissional:</b> ${tituloIns} &mdash; ${siglaIns} ${numIns}<br>
    ${inspetor?.especializacao ? '<b style="color:#1E3A8A">Especialidade:</b> Especialista ' + xe(inspetor.especializacao) + '<br>' : ''}
    <b style='color:#1E3A8A'>Data:</b> ${dataHoje}
  </div>
  <div style='background:#1E3A8A;height:8mm;flex-shrink:0'></div>
  <div style='height:1cm;background:#fff;flex-shrink:0'></div>
</div>`

    // ── ÍNDICE ───────────────────────────────────────────────────────────────
    const INDICE_ITENS = [
      {n:'1.', pg:'2',    t:'Considerações Preliminares',                                   nivel:1},
      {n:'1.1.-', pg:'2', t:'Características e Localização da Edificação',                  nivel:2},
      {n:'1.2.-', pg:'3', t:'Objetivo',                                                      nivel:2},
      {n:'1.3.-', pg:'3', t:'Plano de Trabalho',                                             nivel:2},
      {n:'1.4.-', pg:'4', t:'Condições e limitações',                                        nivel:2},
      {n:'2.', pg:'4',    t:'Metodologia adotada para o Trabalho de Autovistoria',           nivel:1},
      {n:'2.1.-', pg:'4', t:'Norma Brasileira para Inspeção Predial — NBR-16.747/2020',     nivel:2},
      {n:'2.2.-', pg:'5', t:'Norma de Inspeção Predial do IBAPE/2025',                      nivel:2},
      {n:'2.3.-', pg:'5', t:'Critérios e Metodologia da Inspeção',                          nivel:2},
      {n:'3.', pg:'6',    t:'Resultado da Vistoria Técnica e Classificação da Edificação',  nivel:1},
      {n:'3.1.-', pg:'6', t:'Descrição da Vistoria Técnica',                                nivel:2},
      {n:'3.2.-', pg:'7', t:'Resultado da Vistoria',                                        nivel:2},
      {n:'3.3.-', pg:'8', t:'Resultado da Classificação da Edificação',                     nivel:2},
      {n:'4.', pg:'9',    t:'Relação de Não Conformidades e Soluções',                      nivel:1},
      {n:'4.1.-', pg:'9', t:'Relação de Não Conformidades e Soluções por Sistema',          nivel:2},
      {n:'4.2.-', pg:'11', t:'Análise Estatística das Manifestações Patológicas',            nivel:2},
      {n:'5.', pg:'12',    t:'Recomendações sobre a Manutenção, Uso, Sustentabilidade',      nivel:1},
      {n:'6.', pg:'13',    t:'Conclusão',                                                     nivel:1},
      {n:'7.', pg:'14',    t:'Encerramento',                                                  nivel:1},
      {n:'7.1.-', pg:'14', t:'Anexos',                                                             nivel:2},
      {n:'7.2.-', pg:'14', t:'Declaração de Conformidade com o Código de Ética',                  nivel:2},
      {n:'7.3.-', pg:'15', t:'Termo de Encerramento',                                             nivel:2},
      {n:'Anexo 1', pg:'16', t:'Documentação da Edificação Solicitada',                      nivel:1},
      {n:'Anexo 2', pg:'17', t:'Resultado da Vistoria',                                      nivel:1},
      {n:'Anexo 3', pg:'19', t:'Anotações de Responsabilidade Técnica',                      nivel:1},
    ]
    const INDICE_HTML = '<div class="pg-indice">' +
      '<div class="indice-titulo">ÍNDICE</div>' +
      INDICE_ITENS.map(it =>
        '<div class="indice-item' + (it.nivel===2?' nivel2':'') + '">' +
        '<span class="indice-num">' + xe(it.n) + '</span>' +
        '<span>' + xe(it.t) + '</span>' +
        '<span class="indice-dots"></span>' +
        '<span style="min-width:24pt;text-align:right;color:#1E3A8A;font-weight:700">' + (it.pg||'') + '</span>' +
        '</div>'
      ).join('') +
      '</div>'

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>${CSS}</style>
</head>
<body>
${CAPA_HTML}
<div class="section">
${INDICE_HTML}
</div>
<div class="section">
${cabInspetor?`<div class="cab">${cabInspetor}</div>`:''}
<br><br><br><br><br>





<div class="titulo">1.- Considerações Preliminares.</div>
<p>Este ${titulo} é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da <i>ABNT NBR 16.747/2020 e NBR 15.575</i>, recomendações da <i>Norma de Inspeção Predial do IBAPE de 2025</i> e legislação vigente.</p>
<p>A inspeção apresentada neste laudo é o resultado de um exame "clínico geral" que avalia as condições globais do objeto em estudo e detecta a existência de problemas de conservação ou funcionamento, com base em uma análise fundamentalmente sensorial e efetuada por um profissional habilitado. Com base nesta análise, pode ocorrer a recomendação de contratação de ensaios especializadas ou outras ações para que se possa aprofundar e refinar o diagnóstico.</p>
<p>A documentação da edificação solicitada pelo inspetor na reunião inicial foi analisada e avaliada, e o resultado fica registrado na planilha apresentada no Anexo 1 deste laudo.</p>


${S11}

<div class="titulo">1.2.- Objetivo.</div>
<p>Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção ${tipoServico==='43'?'do imóvel':'da edificação'}, de acordo com os critérios da ABNT NBR 16.747/2020 e normas correlatas.</p>

<div class="titulo">1.3.- Plano de Trabalho.</div>
<p>As etapas básicas desenvolvidas para a realização do presente trabalho constam na tabela que segue.</p>
${S13}

<div class="titulo">1.4.- Condições e limitações.</div>
<p>O ${titulo} segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:</p>
<ul>
  <li>Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;</li>
  <li>O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para contratação dos serviços de manutenção;</li>
  <li>O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos.</li>
</ul>

<div class="titulo">2.- Metodologia adotada para o Trabalho de Autovistoria.</div>
<p>A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal que regulamentam a autovistoria.</p>

<div class="titulo">2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.</div>
<p>A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos) da Associação Brasileira de Normas Técnicas — ABNT.</p>
<p><i><b>"Abrangências da análise</b></i></p>
<p><i>A inspeção predial baseia-se na constatação e análise do estado aparente de desempenho dos sistemas construtivos na fase de uso, operação e manutenção, considerando os requisitos dos usuários.</i></p>
<p><i>A análise consiste na constatação da situação da edificação quanto à sua capacidade de atender às suas funções segundo os requisitos dos usuários, com base na análise fundamentalmente sensorial e efetuada por um profissional habilitado."</i></p>

<div class="titulo">2.2.- Norma de Inspeção Predial do IBAPE/2025.</div>
<p>A Norma de Inspeção Predial do IBAPE fixa diretrizes, conceitos, terminologias, critérios e procedimentos relativos à atividade de Inspeção Predial, abrangendo os requisitos mínimos de:</p>
<ul>
  <li><i>Segurança: segurança estrutural; segurança contra incêndio; segurança no uso e na operação;</i></li>
  <li><i>Habitabilidade: estanqueidade; saúde, higiene e qualidade do ar; funcionalidade e acessibilidade;</i></li>
  <li><i>Sustentabilidade: durabilidade e manutenibilidade.</i></li>
</ul>
<p>A norma se aplica a todas as tipologias de edificações, sendo elas públicas ou privadas, devendo ser observadas as características técnicas e complexidades dos sistemas construtivos.</p>
<p><i>As normas ABNT apresentadas a seguir são referências auxiliares e complementares à aplicação da norma IBAPE: NBR 16747: Inspeção Predial; NBR 5674: Manutenção de Edificações; NBR 15575: Desempenho; NBR 14037: Manual de Operação, Uso e Manutenção; NBR 16280: Reforma em Edificações.</i></p>

<div class="titulo">2.3.- Critérios e Metodologia da Inspeção.</div>
<p><b>2.3.1.- Critérios.</b></p>
<p>O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio, diante as condições observadas nos sistemas construtivos durante a vistoria.</p>
<p>A análise do risco consiste na classificação das anomalias e falhas identificadas nos diversos sistemas construtivos e instalações de uma edificação, levando em consideração: a Gravidade, a Urgência e a Tendência de evolução, usando a metodologia GUT adaptado.</p>
<p><b>2.3.2.- Método.</b></p>
<p>O método empregado consiste em: determinar o nível da inspeção predial (NBR 16.747); verificar e analisar a documentação; obter informações com responsáveis pela edificação; vistoriar os sistemas construtivos e instalações; classificar e priorizar as manifestações patológicas; e elaborar o laudo técnico.</p>
<p>O planejamento da vistoria inclui uma entrevista com o responsável pela edificação, abordando características técnicas e aspectos cotidianos da manutenção do prédio, de forma a antecipar as dificuldades do trabalho.</p>
<p><b>2.3.3.- Classificação das Inspeções Prediais (NBR 16.747) e Edificações.</b></p>
<p>A classificação das inspeções prediais e edificações devem ser efetuadas segundo critérios definidos em normas técnicas, conforme segue:</p>
<p>Quanto ao NÍVEL de inspeção predial as edificações são classificadas quanto a sua complexidade e elaboração de laudo:</p>
<ul>
  <li><b>NÍVEL 1:</b> Edificações mais simples, sem necessidade de equipe multidisciplinar, necessário somente um profissional: Engenheiro Civil ou Arquiteto;</li>
  <li><b>NÍVEL 2:</b> Edifícios multifamiliares ou comerciais sem sistemas construtivos mais complexos como climatização, automação, etc, somente com elevadores. Requer Engenheiro Civil ou Arquiteto e Engenheiro Elétrico;</li>
  <li><b>NÍVEL 3:</b> Edificações complexas onde há sistemas implantados com manutenção regulamentada pela NBR 5674 da ABNT. Requer equipe multidisciplinar composta por Engenheiro Civil ou Arquiteto, Engenheiro Elétrico e Engenheiro Mecânico.</li>
</ul>
<p><b>Quanto ao RISCO</b> as edificações são classificadas considerando o risco oferecido aos usuários, ao meio ambiente e ao patrimônio:</p>
<ul>
  <li><b>CRÍTICO:</b> Relativo ao risco que pode provocar danos contra a saúde e segurança das pessoas e/ou meio ambiente, perda excessiva de desempenho causando possível interdição. Recomenda-se intervenção imediata;</li>
  <li><b>REGULAR:</b> Relativo ao risco que pode provocar a perda de funcionalidade sem prejuízo à operação direta de sistemas, perda pontual de desempenho. Recomenda-se intervenção a curto prazo;</li>
  <li><b>MÍNIMO:</b> Relativo a pequenos prejuízos à estética ou atividade programável e planejada. Recomenda-se programar intervenção a médio prazo.</li>
</ul>
<p>As Prioridades para efetuar as manutenções das não conformidades são apuradas por metodologias técnicas como a GUT adaptado (Gravidade, Urgência e Tendência):</p>
<ul>
  <li><b>Prioridade 1 (Alta):</b> ações necessárias de imediato — prazo inferior a 8 meses;</li>
  <li><b>Prioridade 2 (Média):</b> ações corretivas a médio prazo — prazo inferior a 15 meses;</li>
  <li><b>Prioridade 3 (Baixa):</b> ações planejadas a longo prazo — prazo não superior a 30 meses.</li>
</ul>
<p><b>2.3.4.- Critérios para avaliação da manutenção, uso da edificação e do desempenho.</b></p>
<p>As recomendações quanto a manutenção, uso da edificação e sustentabilidade serão efetuadas segundo os critérios que seguem.</p>
<p><b>Quanto a MANUTENÇÃO</b> da edificação será avaliada a coerência entre o plano de manutenção apresentado e o recomendado, classificando como: Totalmente atende; Parcialmente atende; Não atende.</p>
<p><b>Quanto as CONDIÇÕES DE USO</b> a análise de cada um dos sistemas construtivos será efetuada em relação ao tipo de uso previsto em projeto:</p>
<ul>
  <li><b>USO REGULAR</b> é aquele onde a edificação é ocupada e utilizada dentro dos parâmetros previstos no projeto;</li>
  <li><b>USO IRREGULAR</b> quando a edificação se encontra ocupada e utilizada de forma irregular, com o uso divergente do previsto no projeto.</li>
</ul>
<p><b>Quanto a DESEMPENHO</b> a edificação é classificada por níveis:</p>
<ul>
  <li><b>BOM,</b> anomalias inexistentes ou leves, sem impacto relevante no desempenho;</li>
  <li><b>REGULAR,</b> anomalias leves a moderadas, com impactos pontuais. Exige manutenções corretivas programáveis;</li>
  <li><b>RUIM,</b> anomalias significativas, com prejuízo ao desempenho, durabilidade ou segurança. Requer intervenções corretivas prioritárias;</li>
  <li><b>CRÍTICO,</b> anomalias graves, com risco à segurança, à saúde ou à funcionalidade. Demanda intervenção imediata.</li>
</ul>
</div>

<div class="titulo">3.- Resultado da Vistoria Técnica e Classificação da Edificação.</div>

<div class="titulo">3.1.- Descrição da Vistoria Técnica.</div>
<div class="bloco">
  <div class="bloco-header">Descrição da Realização da Vistoria — Nível da Inspeção: ${xe(nivel)||'—'}</div>
  <div style="padding:8px 10px">
    <p>${xe(complemento?.descVistoria||complemento?.dadosVistoria)||'<i>Descrição da vistoria a ser preenchida.</i>'}</p>
  </div>
</div>

<div class="titulo">3.2.- Resultado da Vistoria.</div>
<p>O resultado da vistoria, com imagens dos formulários de coleta de dados, é apresentado no Anexo 2 deste documento.</p>

<div class="titulo">3.3.- Resultado da Classificação da Edificação.</div>
<p>O resultado da classificação da edificação quanto ao nível de inspeção, grau de risco, desempenho, manutenção e uso foi efetuada seguindo a metodologia apresentada para execução deste trabalho e apresentada a seguir.</p>
${S33}
<p>As Prioridades para aplicar as soluções de manutenção constam na relação apresentada no item 4. deste documento.</p>
</div>

<div class="titulo">4.- Relação de Não Conformidades e Análise das Manifestações Patológicas.</div>

<div class="titulo">4.1.- Relação de Não Conformidades e Soluções.</div>
<p>Neste item é apresentado, de forma clara e concisa, o conjunto de manifestações patológicas identificadas na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria.</p>
<p>Salientamos, também, a importância do condomínio documentar as manutenções corretivas realizadas no pós inspeção, indicando a solução aplicada, local, data e responsável técnico pela execução.</p>
<p>A prioridade para manutenção de cada uma das não conformidades foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: gravidade, urgência, tendência e exposição ao risco.</p>
<p>Quanto a definição das prioridades foi adotado o critério: grau de risco superior a 64 pontos, prioridade ALTA; grau de risco menor que 65 pontos e maior que 34 pontos, prioridade MÉDIA; grau de risco menor que 35 pontos, prioridade BAIXA.</p>
${S41||'<p><i>Nenhuma não conformidade registrada.</i></p>'}
</div>

${S42}

${S5}

<div class="titulo">6.- Conclusão.</div>
<p>Diante do exposto neste documento, e após analisados todos os fatos observados que interferem ou possam vir a interferir com o assunto objeto deste laudo, concluímos:</p>
<ul>
  <li>A vistoria proporcionou a constatação de que, considerando a idade da construção, o imóvel ${totT>0?'<b>apresenta danos que requerem intervenção corretiva</b> segundo as prioridades definidas neste laudo':'<b>não apresenta</b> nenhum dano aparente que represente ameaça à sua solidez, no que se refere ao aspecto estrutural e contenções, pois não foram verificadas manifestações patológicas que possam vir a comprometer a sua estabilidade'}.</li>
  <li>Verificou-se a ${totT>0?'<b>existência</b> de diversas anomalias como documentado neste laudo, as quais necessitam de intervenções corretivas a serem executadas segundo as prioridades definidas':'<b>não existência</b> de danos que possam comprometer a segurança da edificação'}.</li>
  <li>Com o intuito de melhor orientar futuras ações de manutenção e conservação do imóvel, recomendamos a execução de nova autovistoria no prazo máximo de 5 anos, para reavaliar e atuar preventivamente na situação construtiva da edificação.</li>
</ul>

<div class="titulo">7.- Encerramento.</div>
<p><b>7.1. Anexos:</b></p>
<ul>
  <li>Anexo 1 – Relação de documentos solicitados e analisados;</li>
  <li>Anexo 2 – Resultado da Vistoria;</li>
  <li>Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.</li>
</ul>

<p><b>7.2.- Declaração de conformidade com o Código de Ética.</b></p>
<p>O signatário atesta que a presente autovistoria segue criteriosamente os seguintes princípios:</p>
<ul>
  <li>Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o Laudo Autovistoria;</li>
  <li>O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;</li>
  <li>O responsável técnico não tem inclinações nem interesse em relação a finalidade deste trabalho, tão pouco em relação a solicitação;</li>
  <li>O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros quanto às razões que motivaram a presente contratação, bem como aos resultados alcançados;</li>
  <li>Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA-Conselho Federal de Engenharia, Arquitetura e Agronomia e do IBAPE - Instituto Brasileiro de Avaliações e Perícias de Engenharia.</li>
</ul>

<p><b>7.3.- Termo de encerramento:</b></p>
<p>O responsável técnico pela execução deste trabalho coloca-se ao inteiro dispor para esclarecimentos adicionais, caso necessários.</p>
<p>O documento é entregue em mídia magnética.</p>
<p style="border:1px solid #999;padding:6px;font-size:7.5pt;background:#f9f9f9"><b>Atenção:</b> O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio ou represente utilização dos direitos exclusivos do autor, sendo que sua violação acarretará as penalidades civis e criminais previstas no art.184 do Código Penal Brasileiro e Lei nº 9.610.</p>

  <p style="text-align:right;font-size:9pt;font-weight:bold;color:#000;margin-top:20px">${estab?.cidade?xe(estab.cidade)+'/'+xe(estab?.uf||'')+', ':''}${dataHoje}</p>
<p style="line-height:1;margin:0">&nbsp;</p>
<p style="line-height:1;margin:0">&nbsp;</p>
<p style="font-size:8pt;line-height:1;margin:0">[Assinatura digital]</p>
<p style="line-height:1;margin:0">&nbsp;</p>
<p style="line-height:1;margin:0"><strong>${xe(inspetor?.nome_inspetor)}</strong></p>
<p style="line-height:1;margin:0">${tituloIns} — ${siglaIns} ${numIns}</p>
${inspetor?.especializacao ? '<p style="line-height:1;margin:0">Especialista ' + xe(inspetor.especializacao) + '</p>' : ''}

</div>

<div class="section">
${A1}
</div>

<div class="section">
<div class="titulo" style="text-align:center">Anexo 2 – Resultado da Vistoria</div>
<br>
${A2}
</div>

<div class="section">
<div class="titulo" style="text-align:center">Anexo 3 – Anotações de Responsabilidade Técnica</div>
<br>

${srcArt
  ?`<div style="margin-top:8px;text-align:center"><img src="${srcArt}" style="max-width:100%;border:1.5px solid #1E3A8A"></div>`
  :`<div class="foto-box" style="height:200px;margin-top:8px">[ ART / RRT — inserir pelo responsável técnico ]</div>`}
</div>

${rodInspetor?`<div class="rod">${rodInspetor}</div>`:''}

</body>
</html>`

    // ── Salvar ────────────────────────────────────────────────────────────────
    const { error } = await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, Buffer.from(html,'utf-8'), {
        contentType:'text/html', upsert:true,
      })
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    const nomeJson = nomeArquivo.replace(/\.html$/i,'_dados.json')
    await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeJson}`, Buffer.from(JSON.stringify({
        cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
        estab, inspetor, ncs, complemento,
      }),'utf-8'), { contentType:'application/json', upsert:true })

    return NextResponse.json({ ok:true, nomeArquivo })

  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
