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
  // 41/42: sistemas do banco agosto/2026
  '41': ['01-Fundações','02-Estrutura','03-Vedações','04-Revestimentos','05-Instalações hidrossanitárias','06-Impermeabilização','07-Instalações elétricas','08-Combate a Incêndio','09-Climatização','10-Acessibilidade/elvadores','11-Instalações de gás','12-Coberturas','13-Áreas externas','14-Contenção de Encostas e Arrimos'],
  '42': ['01-Fundações','02-Estrutura','03-Vedações','04-Revestimentos','05-Instalações hidrossanitárias','06-Impermeabilização','07-Instalações elétricas','08-Combate a Incêndio','09-Climatização','10-Acessibilidade/elvadores','11-Instalações de gás','12-Coberturas','13-Áreas externas','14-Contenção de Encostas e Arrimos'],
  '43': ['01-Fundações','02-Estrutura','03-Vedações','04-Revestimentos','05-Instalações hidrossanitárias','06-Impermeabilização','07-Instalações elétricas','08-Combate a Incêndio','09-Climatização','10-Acessibilidade/elvadores','11-Instalações de gás','12-Coberturas','13-Áreas externas','14-Contenção de Encostas e Arrimos'],
  '44': ['01-Fundações','02-Estrutura','03-Vedações','04-Revestimentos','05-Instalações hidrossanitárias','06-Impermeabilização','07-Instalações elétricas','08-Combate a Incêndio','09-Climatização','10-Acessibilidade/elvadores','11-Instalações de gás','12-Coberturas','13-Áreas externas','14-Contenção de Encostas e Arrimos'],
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
  // Sistemas novos (agosto/2026)
  "01-Fundações": "Conjunto de elementos estruturais destinados a receber e transmitir ao solo as cargas provenientes da edificação.",
  "02-Estrutura": "Conjunto de elementos estruturais que compõem o sistema resistente da edificação e suportam as ações atuantes.",
  "03-Vedações": "Conjunto de elementos destinados ao fechamento e à compartimentação dos ambientes da edificação.",
  "04-Revestimentos": "Conjunto de camadas e materiais aplicados sobre superfícies da edificação para proteção e acabamento.",
  "05-Instalações hidrossanitárias": "Conjunto de componentes destinados ao abastecimento de água, à distribuição, ao esgotamento sanitário e ao encaminhamento de águas servidas e pluviais.",
  "06-Impermeabilização": "Conjunto de materiais e sistemas aplicados para impedir ou reduzir a passagem de água e a ação da umidade sobre elementos da edificação.",
  "07-Instalações elétricas": "Conjunto de componentes destinados à entrada, distribuição, comando, proteção e utilização da energia elétrica na edificação.",
  "08-Combate a Incêndio": "Conjunto de sistemas, equipamentos e dispositivos destinados à prevenção, detecção, alarme e combate a incêndios.",
  "09-Climatização": "Conjunto de equipamentos, componentes e redes destinados ao controle das condições de temperatura, umidade e qualidade do ar nos ambientes.",
  "10-Acessibilidade/elvadores": "Conjunto de elementos e equipamentos destinados à acessibilidade, circulação e transporte vertical de pessoas na edificação.",
  "11-Instalações de gás": "Conjunto de tubulações, equipamentos, dispositivos de controle e componentes destinados ao recebimento, armazenamento, distribuição e utilização de gases combustíveis.",
  "12-Coberturas": "Conjunto de elementos que constitui o fechamento superior da edificação, destinado à proteção dos ambientes contra as intempéries e ao encaminhamento das águas pluviais.",
  "13-Áreas externas": "Conjunto de elementos construtivos e componentes localizados nas áreas externas e nos espaços de uso comum do empreendimento.",
  "14-Contenção de Encostas e Arrimos": "Conjunto de elementos estruturais destinados à contenção de solos e à estabilidade de taludes, encostas e desníveis do terreno.",
  // Sistemas antigos (compatibilidade)
  "01_Sistema Estrutural": "Elementos de fundação, estrutura de concreto armado, pilares, vigas e lajes.",
  "02_Fachadas, Empenas e Marquises": "Revestimentos externos, pintura de fachada, peitoris e rufos.",
  "03_Cobertura e Telhados": "Estrutura do telhado, telhas, calhas, rufos e impermeabilização.",
  "04_Instalações Hidrossanitárias": "Redes de água fria e quente, esgoto sanitário e reservatórios.",
  "05_Instalações Elétricas e SPDA": "Quadros de distribuição, fiação, tomadas, iluminação e SPDA.",
  "06_Instalações de Gás": "Rede de distribuição de gás, central, registros e medidores.",
  "07_Sistema de Prevenção e Combate a Incêndio": "Hidrantes, extintores, saídas de emergência e alarme.",
  "08_Elevadores e Equipamentos Eletromecânicos": "Elevadores, escadas rolantes e plataformas.",
  "09_Impermeabilização": "Sistemas de impermeabilização de coberturas e lajes.",
  "10_Acessibilidade": "Rampas, corrimãos, pisos táteis e vagas para PCD.",
  "11_Contenção de Encostas e Arrimos": "Muros de arrimo, taludes e contenção geotécnica.",
  "12_Áreas Comuns e Infraestrutura": "Hall, corredores, garagem e áreas de uso coletivo.",
  "13_Documentação e Conformidade Legal": "Documentos técnicos e legais da edificação.",
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
function fmtCep(v: string): string {
  const n = (v||'').replace(/\D/g, '')
  return n.length >= 8 ? n.slice(0,5) + '-' + n.slice(5,8) : v || ''
}
function fmtTel(v: string): string {
  const n = (v||'').replace(/\D/g, '')
  if (n.length === 11) return '(' + n.slice(0,2) + ') ' + n.slice(2,7) + '-' + n.slice(7)
  if (n.length === 10) return '(' + n.slice(0,2) + ') ' + n.slice(2,6) + '-' + n.slice(6)
  return v || ''
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

table.tbl-plano { border: 1.5px solid #1E3A8A !important; margin: 0 auto; width: 80%; }
/* Cabeçalho/rodapé do inspetor */
.cab { text-align: center; font-weight: bold; font-size: 9pt; color: #1E3A8A; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; margin-bottom: 10pt; white-space: pre-line; }
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
.pg-capa { page-break-after:always; box-sizing:border-box; }
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
'.indice-num  { min-width: 30pt; font-weight: 400; color: #000; flex-shrink: 0; }'
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
              '<div style="background:#E8EEF7;border:1px solid #c3d4f0;border-radius:5px;padding:3px 8px;display:inline-flex;align-items:center;gap:8px">' +
              '<span style="font-size:6.5pt;color:#4a6480;font-weight:600;white-space:nowrap">Prioridade</span>' +
              '<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:99px;font-size:7.5pt;font-weight:700;color:#fff;background:' + cornr + '">' + prinr + '</span>' +
              '</div>'

      const S41nr =
        '<div class="titulo">4.1.- Relação de Não Conformidades e Soluções.</div>' +
        '<div>' +
        '<p style="text-align:justify">Neste item é apresentado, de forma clara e concisa, o conjunto de requisitos normativos identificados na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria. Na tabela constam as prioridades para retificação dos problemas de cada um dos componentes, visando mitigar os riscos e garantir a conformidade e eficiência dos equipamentos, segundo normas técnicas vigentes.</p>' +
        '<p style="text-align:justify">A prioridade para manutenção de cada uma das não conformidades foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: gravidade (40%); abrangência (30%); urgência (20%); e exposição (10%); observado no requisito normativo.</p>' +
        '<p style="text-align:justify">Quanto à definição das prioridades foi adotado o critério: grau de risco superior a 80 pontos, prioridade Muito Alta; grau de risco menor que 80 pontos e maior que 49 pontos, prioridade Alta; grau de risco menor que 50 pontos e maior que 29 pontos, prioridade Média; grau de risco inferior a 30 pontos, prioridade Baixa.</p>' +
        '<p style="text-align:justify">A Relação de Não Conformidades com o resultado da análise e da classificação é apresentada a seguir.</p>' +
        A3nr +
        '</div>'

      const S42nr =
        '<div class="titulo">4.2.- Análise Estatística das Manifestações Patológicas.</div>' +
        '<div>' +
        '<p style="text-align:justify">A tabela que segue apresenta a estatística de ocorrências de requisitos normativos não conformes identificados na instalação, e classificados por sistema e prioridades, onde se pode observar a situação de cada um dos sistemas, possibilitando uma clara compreensão do estado das instalações e um adequado planejamento para execução das atividades corretivas.</p>' +
        '<table style="width:100%;border-collapse:collapse">' +
        '<tr>' +
          '<td colspan="11" style="' + TH42 + ';text-align:center;font-weight:700"><b>Estatística de Requisitos Normativos por Sistema e Prioridade</b></td>' +
        '</tr>' +
        '<tr>' +
          '<td style="' + TH42 + ';text-align:left;width:28%">Sistema</td>' +
          '<td colspan="8" style="' + TH42 + '">Requisitos Normativos Não Conformes</td>' +
          '<td style="' + TH42 + '">Sub total</td>' +
          '<td style="' + TH42 + '">%</td>' +
        '</tr>' +
        '<tr>' +
          '<td style="' + TH42 + ';text-align:left">&nbsp;</td>' +
          '<td style="' + TH42 + '">A+</td><td style="' + TH42 + '">%</td>' +
          '<td style="' + TH42 + '">A</td><td style="' + TH42 + '">%</td>' +
          '<td style="' + TH42 + '">M</td><td style="' + TH42 + '">%</td>' +
          '<td style="' + TH42 + '">B</td><td style="' + TH42 + '">%</td>' +
          '<td style="' + TH42 + '">&nbsp;</td><td style="' + TH42 + '">&nbsp;</td>' +
        '</tr>' +
        stat42.map(r =>
          '<tr>' +
          '<td style="' + TD42 + ';text-align:left">' + r.s + '</td>' +
          '<td style="' + TD42 + '">' + (r.aM||'') + '</td><td style="' + TD42 + '">' + pct(r.aM,r.t) + '</td>' +
          '<td style="' + TD42 + '">' + (r.aA||'') + '</td><td style="' + TD42 + '">' + pct(r.aA,r.t) + '</td>' +
          '<td style="' + TD42 + '">' + (r.mM||'') + '</td><td style="' + TD42 + '">' + pct(r.mM,r.t) + '</td>' +
          '<td style="' + TD42 + '">' + (r.bB||'') + '</td><td style="' + TD42 + '">' + pct(r.bB,r.t) + '</td>' +
          '<td style="' + TD42 + ';font-weight:700">' + (r.t||'') + '</td>' +
          '<td style="' + TD42 + '">' + pct(r.t,tot42.t) + '</td>' +
          '</tr>'
        ).join('') +
        '<tr style="background:#f1f5f9;font-weight:700">' +
          '<td style="' + TD42 + ';text-align:left">Total de ocorrências</td>' +
          '<td style="' + TD42 + '">' + tot42.aM + '</td><td style="' + TD42 + '">' + pct(tot42.aM,tot42.t) + '</td>' +
          '<td style="' + TD42 + '">' + tot42.aA + '</td><td style="' + TD42 + '">' + pct(tot42.aA,tot42.t) + '</td>' +
          '<td style="' + TD42 + '">' + tot42.mM + '</td><td style="' + TD42 + '">' + pct(tot42.mM,tot42.t) + '</td>' +
          '<td style="' + TD42 + '">' + tot42.bB + '</td><td style="' + TD42 + '">' + pct(tot42.bB,tot42.t) + '</td>' +
          '<td style="' + TD42 + '">' + tot42.t + '</td><td style="' + TD42 + '">100%</td>' +
        '</tr>' +
        '<tr><td colspan="11" style="' + TD42 + ';text-align:left;font-size:7.5pt"><b>A+</b> = Muito Alta &nbsp;|&nbsp; <b>A</b> = Alta &nbsp;|&nbsp; <b>M</b> = Média &nbsp;|&nbsp; <b>B</b> = Baixa</td></tr>' +
        '</table>' +
        '</div>' +
        (svgBarH ? '<div class="bloco" style="margin:8pt auto"><div class="bloco-header">Distribuição de Ocorrências por Sistema</div>' + svgBarH + '</div>' : '') +
        (svgPieH ? '<div class="bloco" style="margin:8pt auto"><div class="bloco-header">Distribuição por Prioridade</div>' + svgPieH + '</div>' : '') +
        '</div>'

      // ── BLOCO 5 — Recomendações ────────────────────────────────────────────
      const S5nr =
        '<div class="titulo">5.- Recomendações Gerais.</div>' +
        '<div>' +
        '<p style="text-align:justify">No decorrer do processo de inspeção foi efetuada a análise da documentação, a vistoria nas instalações e a classificação das anomalias e dos requisitos normativos, o que possibilitou uma completa avaliação que possibilita apresentar as recomendações que seguem, considerando a manutenção, operação, condições físicas, segurança e documentação.</p>' +
        '<table style="width:100%;border-collapse:collapse">' +
        '<tr><td style="' + TH11 + '">5.1.- Recomendações sobre manutenção:</td></tr>' +
        '<tr><td style="' + TD11 + ';min-height:16mm"><div style="min-height:14mm;text-align:justify">' + (xe(rec51NR||'') || 'Nada a registrar para este item.') + '</div></td></tr>' +
        '<tr><td style="' + TH11 + '">5.2.- Recomendações sobre operação:</td></tr>' +
        '<tr><td style="' + TD11 + ';min-height:16mm"><div style="min-height:14mm;text-align:justify">' + (xe(rec52NR||'') || 'Nada a registrar para este item.') + '</div></td></tr>' +
        '<tr><td style="' + TH11 + '">5.3.- Recomendações sobre condições físicas:</td></tr>' +
        '<tr><td style="' + TD11 + ';min-height:16mm"><div style="min-height:14mm;text-align:justify">' + (xe(rec53NR||'') || 'Nada a registrar para este item.') + '</div></td></tr>' +
        '<tr><td style="' + TH11 + '">5.4.- Recomendações sobre segurança:</td></tr>' +
        '<tr><td style="' + TD11 + ';min-height:16mm"><div style="min-height:14mm;text-align:justify">' + (xe(rec54NR||'') || 'Nada a registrar para este item.') + '</div></td></tr>' +
        '<tr><td style="' + TH11 + '">5.5.- Recomendações sobre documentação:</td></tr>' +
        '<tr><td style="' + TD11 + ';min-height:16mm"><div style="min-height:14mm;text-align:justify">' + (xe(rec55NR||'') || 'Nada a registrar para este item.') + '</div></td></tr>' +
        '</table>'

      // ── TABELA AGENDA (plano de trabalho) ──────────────────────────────────
      const slugPlanoNR: Record<string,string> = { '45':'plano_elevador','46':'plano_nr10','47':'plano_nr12','48':'plano_nr13' }
      const nomePlano = chaveInspetor + '_' + cnpjoucpf + '_' + (slugPlanoNR[tipoServico]??'plano') + '.html'
      let tabelaPlano = '<table style="width:100%;border-collapse:collapse"><tr><td style="' + TH11 + '">Agenda de Trabalho – ' + agendaLabel + '</td></tr><tr><td style="' + TD11 + ';color:#9a3412;font-style:italic">Plano de trabalho não encontrado. Gere e salve o plano de trabalho deste serviço primeiro.</td></tr></table>'
      try {
        const { data: blobP } = await supabase.storage.from('aime').download('documentos_inspetor/' + nomePlano)
        if (blobP) {
          const htmlP = await blobP.text()
          // Buscar tabela de ATIVIDADES (agenda) — não a tabela de ativos
          const idxHead = htmlP.indexOf('>Atividades<')
          if (idxHead >= 0) {
            const idxTb = htmlP.lastIndexOf('<table', idxHead)
            if (idxTb >= 0) {
              tabelaPlano = htmlP.slice(idxTb, htmlP.indexOf('</table>', idxTb) + 8)
            }
          } else {
            const idxAgenda = htmlP.indexOf('id="tbAgenda"')
            if (idxAgenda >= 0) {
              tabelaPlano = htmlP.slice(idxAgenda, htmlP.indexOf('</table>', idxAgenda) + 8)
            }
          }
        }
      } catch { /* sem plano */ }

      // ── ANEXO 1 ────────────────────────────────────────────────────────────
      const A1_TITULO: Record<string,string> = {
        '45': 'Documentação da Edificação e Elevadores Solicitada',
        '46': 'Documentação das Instalações Elétricas para Análise',
        '47': 'Documentação das Máquinas e Equipamentos para Análise',
        '48': 'Documentação das Máquinas e Equipamentos para Análise',
      }
      const docsAnexo = DOCS_NR_MAP[tipoServico] ?? []
      const docsA1 = Object.keys(complemento?.docsAnexo1 ?? {}).length > 0
        ? Object.keys(complemento.docsAnexo1) : docsAnexo
      const A1nr =
        '<div class="titulo" style="text-align:center">Anexo 1 — ' + (A1_TITULO[tipoServico]??'Documentação Solicitada') + '</div>' +
        '<div>' +
        '<table style="width:100%;border-collapse:collapse">' +
        '<tr>' +
          '<td style="' + TH11 + ';width:58%">Documentos</td>' +
          '<td style="' + TH11 + ';width:21%;text-align:center">Situação</td>' +
          '<td style="' + TH11 + ';width:21%">Resultado</td>' +
        '</tr>' +
        docsA1.map((d:string) => {
          const infonr = (complemento?.docsAnexo1 ?? {})[d] ?? {situacao:'',resultado:''}
          return '<tr>' +
            '<td style="' + TDS + '">' + d + '</td>' +
            '<td style="' + TDS + ';text-align:center">' + (infonr.situacao||'—') + '</td>' +
            '<td style="' + TDS + '">' + (infonr.resultado||'—') + '</td>' +
            '</tr>'
        }).join('') +
        '</table>'

      // ── ANEXO 2 — Formulários homologados ──────────────────────────────────
      // Buscar dados_vistoria para tag/série e tipo ativo por foto_nr
      let dvA2: Record<string,any> = {}
      try {
        const { data: dvRows } = await supabase
          .from('dados_vistoria').select('numero_foto,tipo_ativo,tag_ativo_nr_serie,finalidade_vistoria')
          .eq('cpf_inspetor', cpfInspetor).eq('cnpjoucpf', cnpjoucpf)
        if (dvRows) dvRows.forEach((r:any) => {
          const k = String(r.numero_foto ?? '').replace(/^0+/,'') || '0'
          dvA2[k] = r
          dvA2[k.padStart(3,'0')] = r
          dvA2[k.padStart(2,'0')] = r
        })
      } catch {}

            // Helper para extrair valor de campo do HTML homologado
      const extrHtml = (h:string, lbl:string) => {
        const m = h.match(new RegExp('<label>' + lbl + '<\\/label><span>([^<]*)<\\/span>'))
        return m ? m[1].trim() : ''
      }
      const extrGUT = (h:string, lbl:string) => {
        const m = h.match(new RegExp('<label>' + lbl + '<\\/label><span>([^<]+)<\\/span>'))
        return m ? m[1].trim() : ''
      }

      const ncsComFotoNR = await Promise.all((ncs ?? []).map(async (nc:any) => {
        const fkRaw = String(nc.fotoNr ?? '').replace(/^0+/,'') || '0'
        const dvNC = dvA2[fkRaw] ?? dvA2[fkRaw.padStart(3,'0')] ?? dvA2[fkRaw.padStart(2,'0')] ?? {}
        if (nc.fotoBase64?.startsWith('data:image')) return { ...dvNC, ...nc }
        if (!nc._arquivo) return { ...dvNC, ...nc }
        try {
          const { data: blob } = await supabase.storage.from('aime').download('vistorias_homologadas/' + nc._arquivo)
          if (!blob) return nc
          const h = await blob.text()
          // Extrair foto
          const mImg = h.match(/<img[^>]+src="(data:image[^"]+)"/)
          // Extrair campos do HTML
          const extra: Record<string,string> = {
            tipoAtivo:   nc.tipoAtivo   || extrHtml(h, 'Ativo')   || dvNC.tipo_ativo || '',
            tagNrSerie:  nc.tagNrSerie  || extrHtml(h, 'TAG \/ Nº Série') || dvNC.tag_ativo_nr_serie || '',
            finalidade:  estab?.finalidade_vistoria || nc.finalidade || extrHtml(h, 'Finalidade') || dvNC.finalidade_vistoria || '',
            finalidade_vistoria: estab?.finalidade_vistoria || nc.finalidade || dvNC.finalidade_vistoria || '',
            fotoNrHtml:  extrHtml(h, 'Foto Nº') || extrHtml(h, 'Foto nº'),
            dataVistoria: nc.dataVistoria || extrHtml(h, 'Data Vistoria') || extrHtml(h, 'Data da vistoria') || '',
            resultado:   nc.resultado   || extrHtml(h, 'Resultado') || extrHtml(h, 'Resultado da Análise'),
            gravidade:   nc.gravidade   || extrGUT(h, 'Gravidade'),
            urgencia:    nc.urgencia    || extrGUT(h, 'Urgência'),
            abrangencia: nc.abrangencia || extrGUT(h, 'Probabilidade') || extrGUT(h, 'Abrangência'),
            exposicao:   nc.exposicao   || extrGUT(h, 'Exposição risco') || extrGUT(h, 'Exposição'),
          }
          if (mImg) return { ...dvNC, ...nc, ...extra, fotoBase64: mImg[1] }
          return { ...dvNC, ...nc, ...extra }
        } catch {}
        return { ...dvNC, ...nc }
      }))


      const A2nr = (ncsComFotoNR ?? []).length === 0
        ? '<p style="color:#9a3412;font-style:italic">Nenhuma vistoria homologada encontrada.</p>'
        : (ncsComFotoNR ?? []).map((nc:any, idx:number) => {
          const grNnr = Number(nc.grauRisco)||0
          const cornr = grNnr > 80 ? '#CC0000' : grNnr >= 50 ? '#E8A000' : grNnr >= 30 ? '#EAB308' : '#16A34A'
          const bgnr  = grNnr > 80 ? '#FEE2E2' : grNnr >= 50 ? '#FEF3CD' : grNnr >= 30 ? '#FEF9C3' : '#DCFCE7'
          const prinr = grNnr > 80 ? 'Muito Alta' : grNnr >= 50 ? 'Alta' : grNnr >= 30 ? 'Média' : 'Baixa'
          const fotonr = nc.fotoBase64?.startsWith('data:image')
            ? '<img src="' + nc.fotoBase64 + '" style="width:85%;max-height:100mm;object-fit:cover;border-radius:5px;border:2px solid #1E3A8A;display:block;margin:0 auto">'
            : '<div style="border:1.5px dashed #c3d4f0;border-radius:5px;background:#E8EEF7;height:90mm;display:flex;align-items:center;justify-content:center;color:#8aa3c4;font-size:8pt">Foto não disponível</div>'
          const pb = idx > 0 ? '<div style="page-break-before:always"></div>' : ''
          const GMAP:Record<string,string> = {'1':'Sem risco','2':'Lesão/dano baixo','3':'Lesão/dano moderado','4':'Lesão/dano grave','5':'Lesão/dano fatal','Sem risco':'Sem risco','Lesão/dano baixo':'Lesão/dano baixo','Lesão/dano moderado':'Lesão/dano moderado','Lesão/dano grave':'Lesão/dano grave','Lesão/dano fatal':'Lesão/dano fatal'}
          const UMAP:Record<string,string> = {'1':'Pode aguardar','3':'Planejar','5':'Imediata','Pode aguardar':'Pode aguardar','Planejar':'Planejar','Imediata':'Imediata'}
          const AMAP:Record<string,string> = {'1':'Improvável','3':'Possível','5':'Provável/eminente','Improvável':'Improvável','Possível':'Possível','Provável/eminente':'Provável/eminente'}
          const EMAP:Record<string,string> = {'1':'Eventual','3':'Frequente','5':'Muitas pessoas','Eventual':'Eventual','Frequente':'Frequente','Muitas pessoas':'Muitas pessoas'}
          const gv=String(nc.gravidade??''), uv=String(nc.urgencia??''), av=String(nc.abrangencia??''), ev=String(nc.exposicao??'')
          const fld = (lbl:string, val:string) =>
            '<div>' +
            '<div style="font-size:6pt;font-weight:600;color:#4a6480">' + lbl + '</div>' +
            '<div style="border:1px solid #c3d4f0;border-radius:3px;padding:1px 4px;font-size:7pt;color:#1a1a2e;background:#f5f7fc;min-height:15px">' + (val||'&nbsp;') + '</div>' +
            '</div>'
          const card = (title:string, body:string) =>
            '<div style="border:1px solid #c3d4f0;border-radius:6px;overflow:hidden">' +
            '<div style="background:#1E3A8A;color:#fff;font-size:7pt;font-weight:700;padding:2px 8px">' + title + '</div>' +
            '<div style="padding:5px 10px;display:flex;flex-direction:column;gap:4px">' + body + '</div>' +
            '</div>'
          const gN = (...items:string[]) => '<div style="display:grid;gap:4px;grid-template-columns:' + items.map(()=>'1fr').join(' ') + '">' + items.join('') + '</div>'
          const sisNome = xe((nc.sistema||'').slice(3).replace(/_/g,' '))
          return pb +
            '<div style="width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">' +
            '<div style="background:#1E3A8A;padding:3px 10px;text-align:center">' +
            '<div style="font-size:10pt;font-weight:700;color:#fff">' + xe(inspetor?.cabecalho_documentos||'AIME') + '</div>' +
            '<div style="font-size:6.5pt;color:#B5D4F4;margin-top:1px">Formulário de Registro de Conformidade Regulatória</div>' +
            '</div>' +
            '<div style="height:2px;background:#1E3A8A"></div>' +
            '<div style="padding:4px 8px;display:flex;flex-direction:column;gap:3px">' +
            card('Identificação',
              gN(fld('CNPJ/CPF', xe(nc.cnpjoucpf||'')), fld('Razão Social', xe(nc.razaoSocial||estab?.razao_social_nome||''))) +
              gN(fld('Ativo a vistoriar', xe(nc.tipoAtivo||nc.tipo_ativo||nc.tipo_ativo||'')), fld('Tag / Nº série', xe(nc.tagNrSerie||nc.tag_ativo_nr_serie||nc.tag_ativo_nr_serie||'')), fld('Finalidade da vistoria', xe(nc.finalidade||nc.finalidade_vistoria||nc.finalidade_vistoria||'')))
            ) +
            card('Apuração da Conformidade Regulatória',
              gN(fld('Sistema', sisNome), fld('Subsistema / Componente', xe(nc.subsistema||''))) +
              fld('Requisito Normativo', xe(nc.nc||nc.anomalia||'')) +
              gN(fld('Resultado', xe([nc.resultado, nc.origem_resultado, nc.origem_resultado, nc.origem].find((v:any) => v && v !== 'Funcional') || '')),   fld('Local/Instalação/Setor/Área', xe(nc.local||'')), fld('Complemento', xe(nc.complemento||'')))
            ) +
            card('Classificação de Risco',
              gN(fld('Gravidade', GMAP[gv]||(gv||'—')), fld('Urgência', UMAP[uv]||(uv||'—')), fld('Probabilidade', AMAP[av]||(av||'—')), fld('Exposição risco', EMAP[ev]||(ev||'—'))) +
              '<div style="background:#E8EEF7;border:1px solid #c3d4f0;border-radius:5px;padding:3px 8px;display:inline-flex;align-items:center;gap:8px">' +
              '<span style="font-size:6.5pt;color:#4a6480;font-weight:600;white-space:nowrap">Prioridade</span>' +
              '<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:99px;font-size:7.5pt;font-weight:700;color:#fff;background:' + cornr + '">' + prinr + '</span>' +
              '</div>'
            ) +
            card('Evidência Fotográfica',
              '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:4px">' +
              '<div style="width:100px">' + fld('Foto nº', xe(nc.fotoNrHtml||nc.fotoNr||'')) + '</div>' +
              '<div>' + fld('Data da vistoria', xe(nc.dataVistoria||nc.data||'')) + '</div>' +
              '</div>' + fotonr
            ) +
            card('Não Conformidade / Observações', fld('Observações', xe(nc.nc||nc.anomalia||''))) +
            card('Causa Provável (CP)', fld('Causa provável (CP)', xe(nc.cp||''))) +
            '</div></div>'
        }).join('\n')

      // ── Helpers assinatura ──────────────────────────────────────────────────
      const siglaInsNR  = (inspetor?.titulo_profissional||'').toLowerCase().includes('arquitet') ? 'CAU' : (inspetor?.titulo_profissional||'').toLowerCase().includes('corretor') ? 'CRECI' : 'CREA'
      const tituloInsNR = (inspetor?.titulo_profissional||'').replace(/(CREA|CAU|CRECI)[\s-]*/gi,'').trim()
      const numInsNR    = (inspetor?.inscricao_crea_cau||'').replace(/^(CREA|CAU|CRECI)[\s-]*/gi,'').trim()
      const cabNR       = xe(inspetor?.cabecalho_documentos||'')
      const logoB64NR   = inspetor?.logo_base64 || ''
      const logoTagNR   = logoB64NR
        ? '<img src="' + logoB64NR + '" style="max-height:28mm;max-width:80mm">'
        : '<div style="font-size:14pt;font-weight:900;color:#1E3A8A">' + xe(inspetor?.cabecalho_documentos||'AIMÊ') + '</div>'
      const cidadeNR = estab?.cidade ? xe(estab.cidade) + '/' + xe(estab?.uf||'') + ', ' : ''

      // ── Índice ─────────────────────────────────────────────────────────────
      const indiceNR = [
        {n:'1.',pg:'3',t:'Considerações Preliminares',nivel:1},
        {n:'1.1.-',pg:'3',t:titulo11.replace(/^\s*\d+(\.\d+)*\s*\.?-?\s*/,''),nivel:2},
        {n:'1.2.-',pg:'4',t:titulo12.replace(/^\s*\d+(\.\d+)*\s*\.?-?\s*/,''),nivel:2},
        {n:'1.3.-',pg:'4',t:'Plano de Trabalho — Agenda de Trabalho, ' + agendaLabel,nivel:2},
        {n:'1.4.-',pg:'5',t:'Condições e Limitações',nivel:2},
        {n:'2.',pg:'5',t:'Metodologia adotada para o desenvolvimento do Trabalho',nivel:1},
        {n:'2.1.-',pg:'5',t:'Base normativa e legal aplicável',nivel:2},
        {n:'2.2.-',pg:'5',t:'Metodologia',nivel:2},
        {n:'2.3.-',pg:'6',t:'Critérios',nivel:2},
        {n:'3.',pg:'7',t:'Resultado da Vistoria Técnica e Classificação',nivel:1},
        {n:'3.1.-',pg:'7',t:'Descrição da Vistoria Técnica',nivel:2},
        {n:'3.2.-',pg:'8',t:'Resultado da Vistoria',nivel:2},
        {n:'3.3.-',pg:'8',t:'Resultado da Classificação da Instalação',nivel:2},
        {n:'4.',pg:'9',t:'Relação de Não Conformidades e Análise das Não Conformidades',nivel:1},
        {n:'4.1.-',pg:'9',t:'Relação de Não Conformidades e Soluções',nivel:2},
        {n:'4.2.-',pg:'11',t:'Análise Estatística das Manifestações Patológicas',nivel:2},
        {n:'5.',pg:'12',t:'Recomendações Gerais',nivel:1},
        {n:'6.',pg:'13',t:'Conclusão',nivel:1},
        {n:'7.',pg:'14',t:'Encerramento',nivel:1},
        {n:'7.1.-',pg:'14',t:'Anexos',nivel:2},
        {n:'7.2.-',pg:'14',t:'Declaração de Conformidade com o Código de Ética',nivel:2},
        {n:'7.3.-',pg:'15',t:'Termo de Encerramento',nivel:2},
        {n:'Anexo 1',pg:'16',t:A1_TITULO[tipoServico]??'Documentação Solicitada',nivel:1},
        {n:'Anexo 2',pg:'17',t:'Resultado da Vistoria',nivel:1},
        {n:'Anexo 3',pg:'19',t:'Relação de Não Conformidades e Soluções',nivel:1},
        {n:'Anexo 4',pg:'20',t:'Anotação de Responsabilidade Técnica',nivel:1},
      ]
      const indiceHtmlNR = indiceNR.map(it =>
        '<div class="indice-item' + (it.nivel===2?' nivel2':'') + '">' +
        '<span class="indice-num">' + xe(it.n) + '</span>' +
        '<span style="flex:1;min-width:0">' + xe(it.t) + '</span>' +
        '<span class="indice-dots"></span>' +
        '<span style="min-width:24pt;flex-shrink:0;margin-left:auto;text-align:right;color:#000;font-weight:400">' + it.pg + '</span>' +
        '</div>'
      ).join('')

      // ── HTML FINAL ─────────────────────────────────────────────────────────
      const partsNR: string[] = []
      partsNR.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>' + titulo + '</title><style>' + CSS + '</style></head><body>')

      // CAPA
      partsNR.push('<div class="pg-capa" style="counter-reset:page 0;display:flex;flex-direction:column;height:297mm">')
      partsNR.push('<div style="height:1cm;background:#fff;flex-shrink:0"></div>')
      partsNR.push('<div style="background:#1E3A8A;height:8mm;flex-shrink:0"></div>')
      partsNR.push('<div style="text-align:center;padding:6mm 0 0;flex-shrink:0;margin-bottom:0">' + logoTagNR + '</div>')
      partsNR.push('<div style="flex:1 1 0"></div>')
      partsNR.push('<div style="text-align:center;padding:0 20mm;flex-shrink:0">')
      partsNR.push('<div style="font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:6pt">LAUDO TÉCNICO</div>')
      partsNR.push('<div style="font-size:18pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:2pt">' + TITULO_DOC[tipoServico] + '</div>')
      partsNR.push('<div style="font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt">' + xe(estab?.razao_social_nome||'') + '</div>')
      partsNR.push('</div>')
      partsNR.push('<div style="flex:1 1 0"></div>')
      partsNR.push('<div style="flex-shrink:0">')
      partsNR.push('<div style="border-top:2px solid #1E3A8A;margin:0 20mm"></div>')
      partsNR.push('<div style="padding:8mm 20mm;font-size:9.5pt;color:#222;line-height:1.9;flex-shrink:0">')
      partsNR.push('<b style="color:#1E3A8A">Inspetor Responsável:</b> ' + xe(inspetor?.nome_inspetor) + '<br>')
      partsNR.push('<b style="color:#1E3A8A">Título Profissional:</b> ' + tituloInsNR + ' — ' + siglaInsNR + ' ' + numInsNR + '<br>')
      if (inspetor?.especializacao) partsNR.push('<b style="color:#1E3A8A">Especialidade:</b> Especialista ' + xe(inspetor.especializacao) + '<br>')
      partsNR.push('<b style="color:#1E3A8A">Data:</b> ' + dataHojeNR)
      partsNR.push('</div>')
      partsNR.push('<div style="background:#1E3A8A;height:8mm"></div>')
      partsNR.push('</div>')
      partsNR.push('</div>')

      // ÍNDICE
      partsNR.push('<div class="section"><div class="pg-indice"><div class="indice-titulo">ÍNDICE</div>' + indiceHtmlNR + '</div></div>')

      // CORPO
      partsNR.push('<div>')
      if (cabNR) partsNR.push('<div class="cab">' + cabNR + '</div>')
      partsNR.push('<br><br><br><br><br>')

      // 1. Considerações Preliminares
      partsNR.push('<div class="titulo">1.- Considerações Preliminares.</div>')
      partsNR.push('<p style="text-align:justify">' + xe(ITEM1nr[tipoServico]||'').replace(/\n\n/g,'</p><p style="text-align:justify">') + '</p>')

      // 1.1
      partsNR.push(S11nr)

      // 1.2
      partsNR.push('<div class="titulo">' + titulo12 + '</div>')
      {
        const objTxt = (OBJETIVO[tipoServico]||'')
        const objHtml = '<p style="text-align:justify">' +
          objTxt.replace(/\n- /g, '</p><p style="margin:2pt 0 2pt 10pt">&#8226;&nbsp;')
                .replace(/\n\n/g, '</p><p style="margin:4pt 0">')
                .replace(/\n/g, ' ') +
          '</p>'
        partsNR.push(objHtml)
      }

      // 1.3
      partsNR.push('<div class="titulo">1.3.- Plano de Trabalho.</div>')
      partsNR.push('<p style="text-align:justify">As etapas básicas desenvolvidas para a realização do presente trabalho de inspeção constam na tabela que segue:</p>')
      partsNR.push('<div style="display:flex;justify-content:center;width:100%">' + tabelaPlano + '</div>')

      // 1.4
      partsNR.push('<div class="titulo">1.4.- Condições e Limitações.</div>')
      partsNR.push('<p style="text-align:justify">Este laudo segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:</p>')
      partsNR.push('<ul style="text-align:justify"><li>Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;</li><li>O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para execução dos serviços de manutenção;</li><li>O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos próprios.</li></ul>')
      partsNR.push('<p style="text-align:justify">Conforme normas e regulamentos, esta inspeção não inclui avaliação de melhorias públicas, infraestrutura urbana ou obras na região. Serão observadas apenas condições externas que, eventualmente, possam influenciar o desempenho, a segurança ou a manutenção, sem caracterizar análise do poder público ou de serviços urbanos.</p>')

      // 2. Metodologia
      partsNR.push('<div class="titulo">2.- Metodologia adotada para o desenvolvimento do Trabalho.</div>')
      partsNR.push('<div class="titulo">2.1.- Base normativa e legal aplicável.</div>')
      partsNR.push('<ul>' + NORMA21[tipoServico] + '</ul>')
      partsNR.push('<div class="titulo">2.2.- Metodologia.</div>')
      partsNR.push('<p style="text-align:justify">' + METODOLOGIA22[tipoServico] + '</p>')
      partsNR.push('<div class="titulo">2.3.- Critérios.</div>')
      partsNR.push('<p style="text-align:justify">O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio, diante das condições técnicas, de manutenção, operação, e segurança, bem como das condições físicas e documental.</p>')
      partsNR.push('<p style="text-align:justify">A análise do risco consiste na classificação dos requisitos normativos, quanto a sua gravidade, urgência e tendência, relacionado com fatores de conservação, depreciação, saúde, segurança, funcionalidade, comprometimento de vida útil e perda de desempenho.</p>')
      partsNR.push('<p style="text-align:justify">As recomendações quanto a manutenção, operação, condições físicas, segurança e documentação serão efetuadas segundo as questões e parâmetros de avaliação que seguem:</p>')
      partsNR.push('<table style="width:100%;border-collapse:collapse">')
      partsNR.push('<tr><td style="' + TH11 + ';width:18%">Critério</td><td style="' + TH11 + ';width:47%">Questão Norteadora</td><td style="' + TH11 + ';width:35%">Parâmetros de Avaliação</td></tr>')
      partsNR.push('<tr><td style="' + TD11 + '">Manutenção</td><td style="' + TD11 + '">A manutenção garante a confiabilidade nas instalações?</td><td style="' + TD11 + '">Garante; Programada; Atrasada; Inexistente</td></tr>')
      partsNR.push('<tr><td style="' + TD11 + '">Operação</td><td style="' + TD11 + '">A instalação pode operar com segurança?</td><td style="' + TD11 + '">Plena; Restrita; Insegura; Interditada</td></tr>')
      partsNR.push('<tr><td style="' + TD11 + '">Condições Físicas</td><td style="' + TD11 + '">As máquinas apresentam condições físicas adequadas para operação segura?</td><td style="' + TD11 + '">Excelente; Boa; Regular; Deficiente; Crítica</td></tr>')
      partsNR.push('<tr><td style="' + TD11 + '">Segurança</td><td style="' + TD11 + '">Os dispositivos de proteção atendem aos requisitos normativos?</td><td style="' + TD11 + '">Plenamente; Parcialmente; Inexistentes</td></tr>')
      partsNR.push('<tr><td style="' + TD11 + '">Documentação</td><td style="' + TD11 + '">A documentação técnica atende à NR?</td><td style="' + TD11 + '">Completa; Parcial; Incompleta; Ausente</td></tr>')
      partsNR.push('</table>')
      partsNR.push('<p style="text-align:justify;margin-top:6pt">O grau de risco para efetuar as correções das não conformidades são apuradas pela metodologia <b>GUT</b> adaptado (<b>G</b>ravidade, <b>U</b>rgência e <b>T</b>endência - abrangência e exposição). Qualquer item marcado como <b>Não Conforme [NC]</b> dispara uma classificação de risco específica que indica a prioridade para correção.</p>')
      partsNR.push('<ul>')
      partsNR.push('<li><b>Prioridade 4 Baixa:</b> Desvios documentais secundários ou ausência de etiquetas de identificação simples que não geram risco de contato direto. (Correção: ' + prazos[0] + ').</li>')
      partsNR.push('<li><b>Prioridade 3 Média:</b> Falha de organização interna em painéis, ausência de diagramas locais. (Correção: ' + prazos[1] + ').</li>')
      partsNR.push('<li><b>Prioridade 2 Alta:</b> Ausência de equipamentos de proteção coletiva (EPCs), falta de testes de continuidade de aterramento. (Correção: ' + prazos[2] + ').</li>')
      partsNR.push('<li><b>Prioridade 1 Muito Alta:</b> Condutores energizados expostos e sem isolamento, ausência de aterramento. ' + prazos[3] + '.</li>')
      partsNR.push('</ul>')

      // 3. Resultados
      partsNR.push('<div class="titulo">3.- Resultado da Vistoria Técnica e Classificação.</div>')
      partsNR.push(S31)
      partsNR.push('<div class="titulo">3.2.- Resultado da Vistoria.</div>')
      partsNR.push('<p style="text-align:justify">O resultado da vistoria, imagens dos formulários da coleta de dados, é apresentado no <b>Anexo 2</b> deste documento e representa, fielmente, dados, informações e fotos coletadas durante a realização da vistoria.</p>')
      partsNR.push(S33nr)

      // 4. NCs
      partsNR.push('<div class="titulo">4.- Relação de Não Conformidades e Análise das Não Conformidades.</div>')
      partsNR.push(S41nr)
      partsNR.push(S42nr)

      // 5. Recomendações
      partsNR.push(S5nr)

      // 6. Conclusão
      partsNR.push('<div class="titulo">6.- Conclusão.</div>')
      partsNR.push('<p style="text-align:justify">' + CONCLUSAO[tipoServico] + '</p>')

      // 7. Encerramento
      partsNR.push('<div class="titulo">7.- Encerramento.</div>')
      partsNR.push('<div class="titulo">7.1.- Anexos:</div>')
      partsNR.push('<ul><li>Anexo 1 – Relação de documentos solicitados e analisados;</li><li>Anexo 2 – Resultado da Vistoria;</li><li>Anexo 3 – Anotação de Responsabilidade Técnica.</li></ul>')
      partsNR.push('<div class="titulo">7.2.- Declaração de Conformidade com o Código de Ética.</div>')
      partsNR.push('<p style="text-align:justify">O signatário atesta que a presente inspeção segue criteriosamente os seguintes princípios:</p>')
      partsNR.push('<ul><li>Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico;</li><li>O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;</li><li>O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros;</li><li>Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA e do IBAPE.</li></ul>')
      partsNR.push('<div class="titulo">7.3.- Termo de Encerramento.</div>')
      partsNR.push('<p style="text-align:justify">O responsável técnico pela execução deste trabalho coloca-se ao inteiro dispor para esclarecimentos adicionais, caso necessários. O documento é entregue em mídia magnética, acompanhado dos arquivos pertinentes.</p>')
      partsNR.push('<p style="font-size:8pt;font-style:italic;text-align:justify">Atenção: O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio.</p>')
      partsNR.push('<p style="text-align:right;font-size:9pt;font-weight:bold;margin-top:20px">' + cidadeNR + dataHojeNR + '</p>')
      partsNR.push('<p style="line-height:1;margin:0">&nbsp;</p><p style="line-height:1;margin:0">&nbsp;</p>')
      partsNR.push('<p style="font-size:8pt;line-height:1;margin:0">[Assinatura digital]</p>')
      partsNR.push('<p style="line-height:1;margin:0">&nbsp;</p>')
      partsNR.push('<p style="line-height:1;margin:0"><strong>' + xe(inspetor?.nome_inspetor) + '</strong> – Responsável Técnico</p>')
      partsNR.push('<p style="line-height:1;margin:0">' + tituloInsNR + ' – ' + siglaInsNR + ' - ' + numInsNR + '</p>')
      if (inspetor?.especializacao) partsNR.push('<p style="line-height:1;margin:0">' + xe(inspetor.especializacao) + '</p>')
      partsNR.push('</div>')

      // ANEXOS
      partsNR.push('<div class="section">' + A1nr + '</div>')
      partsNR.push('<div class="section"><div class="titulo" style="text-align:center">Anexo 2 – Resultado da Vistoria</div><br>' + A2nr + '</div>')
      // Tabela NCs foi movida para o item 4.1
      partsNR.push('<div class="section"><div class="titulo" style="text-align:center">Anexo 3 – Anotação de Responsabilidade Técnica</div>' +
        (srcArt
          ? '<div style="page-break-inside:avoid;text-align:center">' + artTag(srcArt) + '</div>'
          : '<div style="border:2px dashed #1E3A8A;min-height:260mm;margin:10mm 0;display:flex;align-items:center;justify-content:center"><p style="color:#6b7280;font-size:8.5pt;text-align:center">ART / RRT não anexada.<br>Inserir a ART ou RRT na tela de coleta de dados.</p></div>'
        ) +
        '</div>')
      const rodNR = xe(inspetor?.rodape_documentos) || (xe(inspetor?.nome_inspetor||'') + ' — ' + xe(inspetor?.titulo_profissional||'') + ' — ' + xe(inspetor?.sigla_conselho||'') + ' ' + xe(inspetor?.numero_registro||''))
      if (rodNR) partsNR.push('<div class="rod">' + rodNR + '</div>')
      partsNR.push('</body></html>')

      const htmlNR = partsNR.join('\n')
      // Deletar arquivo anterior para forçar bypass do CDN cache
      await supabase.storage.from('aime').remove(['documentos_inspetor/' + nomeArquivo])
      const { error: errSave } = await supabase.storage.from('aime')
        .upload('documentos_inspetor/' + nomeArquivo, new Blob([htmlNR], { type:'text/html' }), { upsert: true })
      if (errSave) throw new Error('Erro ao salvar: ' + errSave.message)
      return NextResponse.json({ sucesso: true, nome: nomeArquivo, html: htmlNR })
    }
    // ── FIM GERADOR NR (45-48) ────────────────────────────────────────────────


    const sistemas = SISTEMAS[tipoServico] ?? []
    const dataHoje = fmtData()
    // cl já declarado acima
    const labelEst = tipoServico === '43' ? 'Proprietário' : 'Condomínio / Empresa'

    // NCs ordenadas por sistema → grau risco DESC
    const ncsOrd41 = [...(ncs ?? [])].sort((a:any, b:any) => {
      const sa = String(a.sistema||''), sb = String(b.sistema||'')
      if (sa !== sb) return sa.localeCompare(sb)
      return (Number(b.grauRisco)||0) - (Number(a.grauRisco)||0)
    })
    const ncsPorSistema: Record<string, any[]> = {}
    sistemas.forEach(s => { ncsPorSistema[s] = [] })
    ncsOrd41.forEach((nc: any) => {
      const sistNC = String(nc.sistema||'').trim()
      if (ncsPorSistema[sistNC] !== undefined) {
        // Chave exata
        ncsPorSistema[sistNC].push(nc)
      } else {
        // Normalizar: tentar com hífen ou underscore trocado
        const sistAlt = sistNC.includes('-') ? sistNC.replace(/-/g, '_') : sistNC.replace(/_/g, '-')
        if (ncsPorSistema[sistAlt] !== undefined) {
          ncsPorSistema[sistAlt].push(nc)
        } else {
          // Buscar por prefixo numérico (ex: '04' encontra '04-Revestimentos')
          const numPart = (sistNC.match(/^(\d+)/) || [])[1] || ''
          if (numPart) {
            const chave = Object.keys(ncsPorSistema).find(k =>
              k.startsWith(numPart + '-') || k.startsWith(numPart + '_')
            )
            if (chave) ncsPorSistema[chave].push(nc)
          }
        }
      }
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
    <div class="cell"><label>CEP</label><div class="val">${fmtCep(estab?.cep_estabelecimento||estab?.cep||"")}</div></div>
  </div>
  <div class="row">
    <div class="cell cell-3"><label>Endereço</label><div class="val">${xe(estab?.logradouro)}${estab?.numero_imovel?', '+xe(estab.numero_imovel):''}</div></div>
    <div class="cell cell-2"><label>Bairro</label><div class="val">${xe(estab?.bairro)}</div></div>
  </div>
  <div class="row">
    <div class="cell cell-2"><label>Cidade e UF</label><div class="val">${xe(estab?.cidade)}/${xe(estab?.uf)}</div></div>
    <div class="cell cell-2"><label>Nome do responsável</label><div class="val">${xe(estab?.nome_responsavel)}</div></div>
    <div class="cell"><label>Função do responsável</label><div class="val">${xe(estab?.funcao_responsavel)}</div></div>
  </div>
  <div class="row">
    <div class="cell"><label>Telefone contato</label><div class="val">${fmtTel(estab?.whatsapp_responsavel||estab?.whatsapp||"")}</div></div>
    <div class="cell cell-2"><label>eMail contato</label><div class="val">${xe(estab?.email_responsavel||estab?.email||"")}</div></div>
    <div class="cell cell-2"><label>Finalidade da vistoria</label><div class="val">${xe(estab?.finalidade_vistoria||"")}</div></div>
  </div>
  <div class="row">
    <div class="cell"><label>Uso imóvel</label><div class="val">${xe(estab?.uso_estabelecimento||"")}</div></div>
    <div class="cell"><label>Tipo imóvel</label><div class="val">${xe(estab?.tipo_imovel||"")}</div></div>
    <div class="cell"><label>Nr pavimentos</label><div class="val" style="text-align:center">${xe(estab?.numero_pavimentos||"")}</div></div>
    <div class="cell"><label>Nr unidades/salas</label><div class="val" style="text-align:center">${xe(estab?.numero_unidades_salas||"")}</div></div>
    ${tipoServico==='44'?`
    <div class="cell"><label>Nº Fachadas</label><div class="val" style="text-align:center">${xe(estab?.numero_fachadas||"")}</div></div>
    <div class="cell"><label>Per. Fachadas (m)</label><div class="val" style="text-align:center">${xe(estab?.perimetro_fachadas||"")}</div></div>
    `:`
    <div class="cell"><label>Área construída m²</label><div class="val" style="text-align:center">${xe(estab?.area_construida||"")}</div></div>
    <div class="cell"><label>Área do terreno m²</label><div class="val" style="text-align:center">${xe(estab?.area_terreno||"")}</div></div>
    `}
  </div>
  <div class="row">
    <div class="cell"><label>Síntese da descrição da edificação seguindo a convenção do condomínio:</label><div class="val" style="min-height:30px">${xe(complemento?.sinteseEdif||"")}</div></div>
  </div>
</div>
<div class="bloco">
  <div class="bloco-header">Localização ${tipoServico==='43'?'do Imóvel':'da Edificação'}</div>
  <div class="row">
    <div class="cell">
      <label>Croqui de localização</label>
      <div class="foto-box">${srcCroqui?'<img src="'+srcCroqui+'" style="width:100%;height:auto">':'<span class="sem-foto">Sem croqui</span>'}</div>
    </div>
    <div class="cell">
      <label>Foto da fachada principal</label>
      <div class="foto-box">${srcFachada?'<img src="'+srcFachada+'" style="width:100%;height:auto">':'<span class="sem-foto">Sem foto</span>'}</div>
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
      // Buscar recomendação: tentar chave exata, depois normalizada (hifen/underscore/prefixo)
      const _recsMap = complemento?.recsSistema ?? {}
      let _recTexto = _recsMap[s] ?? ''
      if (!_recTexto) {
        const sAlt = s.includes('-') ? s.replace(/-/g, '_') : s.replace(/_/g, '-')
        _recTexto = _recsMap[sAlt] ?? ''
      }
      if (!_recTexto) {
        const numPart = (s.match(/^(\d+)/) || [])[1] || ''
        if (numPart) {
          const chaveRec = Object.keys(_recsMap).find(k =>
            k.startsWith(numPart + '-') || k.startsWith(numPart + '_')
          )
          if (chaveRec) _recTexto = _recsMap[chaveRec] ?? ''
        }
      }
      const rec = xe((_recTexto)
        .replace(/^Recomenda[çc][ãa]o T[eé]cnica[\s\S]*?\n+/im, '')
        .replace(/^Recomenda[çc][ãa]o T[eé]cnica[^:]*:[\s]*/im, '')
        .trim())
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
      <th style="width:4%">Foto</th>
      <th style="width:28%;text-align:left">Não Conformidade</th>
      <th style="width:16%;text-align:left">Local</th>
      <th style="width:8%">Prioridade</th>
      <th style="width:38%;text-align:left">Solução</th>
    </tr>
    ${arr.map((nc:any,i:number)=>`
    <tr${i%2===1?' style="background:#f7f9ff"':''}>
      <td style="text-align:center">${xe(nc.fotoNr)}</td>
      <td>${xe(nc.nc||nc.anomalia)}</td>
      <td>${xe(nc.local)}${nc.complemento?' — '+xe(nc.complemento):''}</td>
      <td style="text-align:center">${badgeP(nc.prioridade)}</td>
      <td>${xe(nc.solucaoNC||nc.descricao_solucao_nc||'—')}</td>
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
<div class='pg-capa' style='counter-reset:page 0;display:flex;flex-direction:column;height:297mm'>
<div style='height:1cm;background:#fff;flex-shrink:0'></div>
<div style='background:#1E3A8A;height:8mm;flex-shrink:0'></div>
<div style='text-align:center;padding:6mm 0 0;flex-shrink:0'>${inspetor?.cabecalho_documentos ? `<div style='font-size:14pt;font-weight:900;color:#1E3A8A;padding:0 20mm;line-height:1.3'>${xe(inspetor.cabecalho_documentos)}</div>` : logoTag}</div>
<div style='flex:1 1 0'></div>
<div style='text-align:center;padding:0 20mm;flex-shrink:0'>
<div style='font-size:8pt;color:#6B7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:6pt'>LAUDO T&Eacute;CNICO</div>
<div style='font-size:18pt;font-weight:900;color:#1E3A8A;line-height:1.2;margin-bottom:2pt'>${titulo}</div>
<div style='font-size:13pt;font-weight:700;color:#374151;margin-bottom:4pt'>${xe(estab?.razao_social_nome||estab?.razao_social||'')}</div>
<div style='font-size:9pt;color:#374151'>${xe(estab?.logradouro||'')}${estab?.numero_imovel?', '+xe(estab.numero_imovel):''} &mdash; ${xe(estab?.cidade||'')}/${xe(estab?.uf||'')}</div>
</div>
<div style='flex:1 1 0'></div>
<div style='flex-shrink:0'>
<div style='border-top:2px solid #1E3A8A;margin:0 20mm'></div>
<div style='padding:8mm 20mm;font-size:9.5pt;color:#222;line-height:1.9;flex-shrink:0'>
<b style='color:#1E3A8A'>Inspetor Respons&aacute;vel:</b> ${xe(inspetor?.nome_inspetor)}<br>
<b style='color:#1E3A8A'>T&iacute;tulo Profissional:</b> ${tituloIns} &mdash; ${siglaIns} ${numIns}<br>
${inspetor?.especializacao ? '<b style="color:#1E3A8A">Especialidade:</b> Especialista ' + xe(inspetor.especializacao) + '<br>' : ''}
<b style='color:#1E3A8A'>Data:</b> ${dataHoje}
</div>
<div style='background:#1E3A8A;height:8mm'></div>
</div>
</div>`

    // ── ÍNDICE ───────────────────────────────────────────────────────────────
    const INDICE_ITENS = [
      {n:'1.', pg:'3',    t:'Considerações Preliminares',                                   nivel:1},
      {n:'1.1.-', pg:'3', t:'Características e Localização da Edificação',                  nivel:2},
      {n:'1.2.-', pg:'4', t:'Objetivo',                                                      nivel:2},
      {n:'1.3.-', pg:'4', t:'Plano de Trabalho',                                             nivel:2},
      {n:'1.4.-', pg:'5', t:'Condições e limitações',                                        nivel:2},
      {n:'2.', pg:'5',    t:'Metodologia adotada para o Trabalho de Autovistoria',           nivel:1},
      {n:'2.1.-', pg:'5', t:'Norma Brasileira para Inspeção Predial — NBR-16.747/2020',     nivel:2},
      {n:'2.2.-', pg:'6', t:'Norma de Inspeção Predial do IBAPE/2025',                      nivel:2},
      {n:'2.3.-', pg:'6', t:'Critérios e Metodologia da Inspeção',                          nivel:2},
      {n:'3.', pg:'7',    t:'Resultado da Vistoria Técnica e Classificação da Edificação',  nivel:1},
      {n:'3.1.-', pg:'7', t:'Descrição da Vistoria Técnica',                                nivel:2},
      {n:'3.2.-', pg:'8', t:'Resultado da Vistoria',                                        nivel:2},
      {n:'3.3.-', pg:'9', t:'Resultado da Classificação da Edificação',                     nivel:2},
      {n:'4.', pg:'10',    t:'Relação de Não Conformidades e Soluções',                      nivel:1},
      {n:'4.1.-', pg:'10', t:'Relação de Não Conformidades e Soluções por Sistema',          nivel:2},
      {n:'4.2.-', pg:'12', t:'Análise Estatística das Manifestações Patológicas',            nivel:2},
      {n:'5.', pg:'13',    t:'Recomendações sobre a Manutenção, Uso, Sustentabilidade',      nivel:1},
      {n:'6.', pg:'14',    t:'Conclusão',                                                     nivel:1},
      {n:'7.', pg:'15',    t:'Encerramento',                                                  nivel:1},
      {n:'7.1.-', pg:'15', t:'Anexos',                                                             nivel:2},
      {n:'7.2.-', pg:'15', t:'Declaração de Conformidade com o Código de Ética',                  nivel:2},
      {n:'7.3.-', pg:'16', t:'Termo de Encerramento',                                             nivel:2},
      {n:'Anexo 1', pg:'17', t:'Documentação da Edificação Solicitada',                      nivel:1},
      {n:'Anexo 2', pg:'18', t:'Resultado da Vistoria',                                      nivel:1},
      {n:'Anexo 3', pg:'20', t:'Anotações de Responsabilidade Técnica',                      nivel:1},
    ]
    const INDICE_HTML = '<div class="pg-indice">' +
      '<div class="indice-titulo">ÍNDICE</div>' +
      INDICE_ITENS.map(it =>
        '<div class="indice-item' + (it.nivel===2?' nivel2':'') + '">' +
        '<span class="indice-num">' + xe(it.n) + '</span>' +
        '<span style="flex:1;min-width:0">' + xe(it.t) + '</span>' +
        '<span class="indice-dots"></span>' +
        '<span style="min-width:24pt;flex-shrink:0;margin-left:auto;text-align:right;color:#000;font-weight:400">' + it.pg + '</span>' +
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
    <p>${(xe(complemento?.descVistoria||complemento?.dadosVistoria)||'').replace(/^3\.1[^\n]*\n+/im,'').replace(/^Realiza[çc][^\n]*\n+/im,'')||'<i>Descrição da vistoria a ser preenchida.</i>'}</p>
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
  <li>Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o Laudo;</li>
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
  ?`<div style="page-break-inside:avoid;text-align:center">${artTag(srcArt)}</div>`
  :`<div class="foto-box" style="height:560px;margin-top:8px">[ ART / RRT — inserir pelo responsável técnico ]</div>`}
</div>

${rodInspetor?`<div class="rod">${rodInspetor}</div>`:''}

</body>
</html>`

    // Laudo gerado — salvo em documentos_inspetor somente via upload-pdf-assinado







    const nomeJson = nomeArquivo.replace(/\.html$/i,'_dados.json')
    await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeJson}`, Buffer.from(JSON.stringify({
        cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
        estab, inspetor, ncs, complemento,
      }),'utf-8'), { contentType:'application/json', upsert:true })

    // Salvar HTML no Storage — remove versão anterior para eliminar cache
    try {
      await supabase.storage.from('aime').remove([`documentos_inspetor/${nomeArquivo}`])
      await supabase.storage.from('aime').upload(
        `documentos_inspetor/${nomeArquivo}`,
        Buffer.from(html, 'utf-8'),
        { contentType: 'text/html', upsert: true }
      )
    } catch {}

    return NextResponse.json({ ok:true, nomeArquivo, html })

  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
