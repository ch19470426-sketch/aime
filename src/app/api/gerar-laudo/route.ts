// src/app/api/gerar-laudo/route.ts
// AIMÊ — Gera HTML do Laudo Técnico (tipos 41-44)
// Reescrito do zero em 27/07/2026 — sem resíduos

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
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado / HVAC','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns e Infraestrutura'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado (SPFE)','02_Revestimento Cerâmico de Fachada (APFE)','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada (SBCE / Textura)','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada e Vedação','11_Segurança Contra Incêndio em Fachadas','12_Manutenção e Equipamentos de Acesso'],
}

const TITULO: Record<string,string> = {
  '41':'Laudo de Autovistoria',
  '42':'Laudo de Inspeção Predial',
  '43':'Laudo de Imóvel Novo',
  '44':'Laudo de Inspeção de Fachada',
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

const DESC_SISTEMAS: Record<string,string> = {
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
function x(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;')
    .replace(/@/g,'&#64;')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'')
}

function fmtDoc(v: string): string {
  const n = (v||'').replace(/\D/g,'')
  if (n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  if (n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
  return v
}

function fmtData(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  const M = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`
}

function pct(v: number, t: number): string {
  return t ? Math.round(v*100/t)+'%' : '0%'
}

function descS(s: string): string {
  return DESC_SISTEMAS[s] || `Sistema construtivo: ${s.slice(3).replace(/_/g,' ')}`
}

function nomeS(s: string): string {
  return s.slice(3).replace(/_/g,' ')
}

function badgeP(p: string): string {
  const cor = p==='Alta' ? '#991b1b;background:#fee2e2'
    : p==='Média' ? '#854d0e;background:#fef9c3'
    : '#166534;background:#dcfce7'
  return `<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:7.5pt;font-weight:bold;color:${cor}">${x(p)}</span>`
}

// ─── CSS (mesmo padrão das propostas) ────────────────────────────────────────
const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #000; padding: 2cm 2cm 2cm 2.5cm; }
.cab { text-align: center; margin-bottom: 10pt; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; font-size: 12pt; color: #374151; white-space: pre-line; }
.rod { margin-top: 10pt; padding-top: 4pt; border-top: 1px solid #ccc; font-size: 10pt; text-align: center; white-space: pre-line; color: #374151; }
h1 { font-size: 11pt; font-weight: bold; margin: 14pt 0 2pt; }
h2 { font-size: 10pt; font-weight: bold; margin: 10pt 0 2pt; }
h3 { font-size: 10pt; font-weight: bold; margin: 8pt 0 2pt; }
p  { margin: 4pt 0; text-align: justify; }
ul { margin: 4pt 0 4pt 0.8cm; padding-left: 0; list-style: none; }
li { margin-bottom: 3pt; text-align: justify; padding-left: 1.2em; text-indent: -1.2em; }
li::before { content: "• "; }
b { font-weight: bold; }
.quebra { page-break-before: always; }
table { width: 100%; border-collapse: collapse; margin: 4pt 0; font-size: 8.5pt; }
th { background: #1E3A8A; color: #fff; padding: 4pt 6pt; font-weight: bold; text-align: left; border-right: 1px solid #4a6fa5; font-size: 8pt; }
th:last-child { border-right: none; }
td { border-top: 1px solid #1E3A8A; border-right: 1px solid #1E3A8A; padding: 4pt 6pt; color: #222; vertical-align: top; }
td:last-child { border-right: none; }
tr:nth-child(even) td { background: #f7f9ff; }
.th-cab { background: #1E3A8A; color: #fff; font-weight: bold; font-size: 9pt; }
.lbl { font-size: 7pt; font-weight: bold; color: #1E3A8A; display: block; margin-bottom: 2pt; }
.ass { margin-top: 30pt; padding-top: 10pt; line-height: 1; }
/* Formulários vistoria homologada — igual ao padrão das telas */
.blk { border: 1px solid #c3d4f0; border-radius: 6px; overflow: hidden; margin-bottom: 8pt; page-break-inside: avoid; }
.bt  { background: #1E3A8A; color: #fff; font-size: 8pt; font-weight: bold; padding: 3px 10px; }
.bb  { padding: 6px 10px; }
.g2  { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.g3  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
.g4  { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; }
.f   { display: flex; flex-direction: column; gap: 1px; margin-bottom: 4px; }
.f label { font-size: 6.5pt; font-weight: 600; color: #4a6480; }
.f span  { border: 1px solid #c3d4f0; border-radius: 4px; padding: 2px 5px; font-size: 7.5pt; background: #f8fafc; }
.foto-vt { width: 100%; height: 70mm; object-fit: cover; border-radius: 5px; border: 2px solid #1E3A8A; display: block; margin-top: 4px; }
.met  { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px; }
.m    { background: #E8EEF7; border: 2px solid #c3d4f0; border-radius: 5px; padding: 3px 8px; display: flex; align-items: center; gap: 8px; }
.stamp{ background: #E6F5EE; border: 2px solid #1A7A3C; border-radius: 8px; padding: 6px 12px; text-align: center; margin-top: 4px; }
.stamp span { color: #1A7A3C; font-weight: bold; font-size: 8pt; }
`

// ─── POST handler ─────────────────────────────────────────────────────────────
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
    const labelDoc = tipoServico==='43' ? 'CPF' : 'CNPJ'
    const labelEst = tipoServico==='43' ? 'Proprietário' : 'Condomínio'

    // ── Agrupar NCs por sistema ───────────────────────────────────────────────
    const ncsPorSistema: Record<string, any[]> = {}
    sistemas.forEach(s => { ncsPorSistema[s] = [] })
    ;(ncs ?? []).forEach((nc: any) => {
      if (ncsPorSistema[nc.sistema] !== undefined) ncsPorSistema[nc.sistema].push(nc)
    })

    // ── Estatística ───────────────────────────────────────────────────────────
    const stat = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      const a = arr.filter((n:any) => n.prioridade==='Alta').length
      const m = arr.filter((n:any) => n.prioridade==='Média').length
      const b = arr.filter((n:any) => n.prioridade==='Baixa').length
      return { s, a, m, b, t: a+m+b }
    })
    const totA = stat.reduce((t,s) => t+s.a, 0)
    const totM = stat.reduce((t,s) => t+s.m, 0)
    const totB = stat.reduce((t,s) => t+s.b, 0)
    const totT = totA+totM+totB

    // ── Buscar imagens do storage ─────────────────────────────────────────────
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

    // ── Cabeçalho e rodapé do inspetor ───────────────────────────────────────
    const cabInspetor = x(inspetor?.cabecalho_documentos) || titulo
    const rodInspetor = x(inspetor?.rodape_documentos)    || `${x(inspetor?.nome_inspetor)} — ${x(inspetor?.titulo_profissional)} — CREA/CAU ${x(inspetor?.inscricao_crea_cau)}`

    // ── Tabela 1.1 — Características ─────────────────────────────────────────
    const tab11 = `
<table>
  <tr><td colspan="6" class="th-cab">Características ${tipoServico==='43'?'do Imóvel':'da Edificação'}</td></tr>
  <tr>
    <td colspan="2"><span class="lbl">${labelEst}</span>${x(estab?.razao_social_nome)}</td>
    <td><span class="lbl">${labelDoc}</span>${fmtDoc(cnpjoucpf)}</td>
    <td><span class="lbl">CEP</span>${x(estab?.cep)}</td>
    <td colspan="2"></td>
  </tr>
  <tr>
    <td colspan="3"><span class="lbl">Endereço</span>${x(estab?.logradouro)}${estab?.numero?', '+x(estab.numero):''}${estab?.complemento?' — '+x(estab.complemento):''}</td>
    <td colspan="2"><span class="lbl">Bairro</span>${x(estab?.bairro)}</td>
    <td><span class="lbl">Cidade/UF</span>${x(estab?.cidade)}/${x(estab?.uf)}</td>
  </tr>
  <tr>
    <td colspan="2"><span class="lbl">Responsável</span>${x(estab?.nome_responsavel)}</td>
    <td><span class="lbl">Função</span>${x(estab?.funcao_responsavel)}</td>
    <td><span class="lbl">Tel/WhatsApp</span>${x(estab?.whatsapp)}</td>
    <td colspan="2"><span class="lbl">e-Mail</span>${x(estab?.email)}</td>
  </tr>
  <tr>
    <td><span class="lbl">Uso do Imóvel</span>${x(estab?.uso_imovel)}</td>
    <td><span class="lbl">Tipo</span>${x(estab?.tipo_imovel)}</td>
    <td><span class="lbl">Nº Pavimentos</span>${x(estab?.numero_pavimentos)}</td>
    <td><span class="lbl">Nº Unidades/Salas</span>${x(estab?.numero_unidades_salas)}</td>
    <td><span class="lbl">Área construída m²</span>${x(estab?.area_construida)}</td>
    <td><span class="lbl">Área terreno m²</span>${x(estab?.area_terreno)}</td>
  </tr>
  <tr><td colspan="6"><span class="lbl">Síntese da descrição da Edificação (Convenção ou Escritura)</span>${x(complemento?.sinteseEdif)}</td></tr>
</table>
<table style="margin-top:6pt">
  <tr><td colspan="2" class="th-cab">Localização ${tipoServico==='43'?'do Imóvel':'da Edificação'}</td></tr>
  <tr>
    <td style="width:50%">
      <span class="lbl">Croqui de localização</span>
      ${srcCroqui ? `<img src="${srcCroqui}" style="width:100%;height:130px;object-fit:cover;border:1px solid #1E3A8A">` : '<div style="border:1px solid #1E3A8A;height:130px;display:flex;align-items:center;justify-content:center;color:#9ab0d4;font-style:italic;font-size:8pt">[Croqui — colar após baixar o documento]</div>'}
    </td>
    <td style="width:50%">
      <span class="lbl">Foto da fachada principal</span>
      ${srcFachada ? `<img src="${srcFachada}" style="width:100%;height:130px;object-fit:cover;border:1px solid #1E3A8A">` : '<div style="border:1px solid #1E3A8A;height:130px;display:flex;align-items:center;justify-content:center;color:#9ab0d4;font-style:italic;font-size:8pt">[Foto fachada — inserir pelo inspetor]</div>'}
    </td>
  </tr>
</table>`

    // ── Tabela 3.3 — Classificação ────────────────────────────────────────────
    const itens33_4142 = [
      ['a)', `Quanto ao <b>NÍVEL</b> da inspeção efetuada o imóvel foi classificado como INSPEÇÃO PREDIAL NÍVEL:`, nivel, '#dbeafe;color:#1e40af'],
      ['b)', `Quanto ao <b>GRAU DE RISCO</b> o imóvel encontra-se classificado como de RISCO:`, cl.risco, '#fef9c3;color:#854d0e'],
      ['c)', `Quanto ao <b>DESEMPENHO</b> a classificação geral do imóvel foi classificada como:`, cl.desempenho, '#dcfce7;color:#166534'],
      ['d)', `Quanto à <b>QUALIDADE DA MANUTENÇÃO</b> a edificação foi classificada como QUALIDADE QUE:`, cl.manut, '#f3e8ff;color:#6b21a8'],
      ['e)', `Quanto às <b>CONDIÇÕES DE USO</b> a edificação foi classificada como EDIFICAÇÃO DE USO:`, cl.uso, '#e0f2fe;color:#0369a1'],
      ['f)', `Quanto ao <b>DESEMPENHO GERAL</b> a edificação foi classificada como:`, cl.desempGeral, '#dcfce7;color:#166534'],
    ]
    const itens33_43 = [
      ['a)', `A execução da obra em relação à <b>CONFORMIDADE CONSTRUTIVA</b> foi classificada como:`, cl.nivel, '#dbeafe;color:#1e40af'],
      ['b)', `A <b>QUALIDADE DE ACABAMENTO</b> do imóvel é classificada como:`, cl.risco, '#fef9c3;color:#854d0e'],
      ['c)', `Quanto ao uso, a <b>FUNCIONALIDADE</b> do imóvel:`, cl.desempenho, '#dcfce7;color:#166534'],
      ['d)', `Quanto às condições de ocupação, a <b>HABITABILIDADE</b> pode ser considerada:`, cl.manut, '#f3e8ff;color:#6b21a8'],
      ['e)', `A análise do resultado consolidado sobre a <b>CLASSE DO IMÓVEL</b> resulta em:`, cl.uso, '#e0f2fe;color:#0369a1'],
      ['f)', `Qual o <b>GRAU DE SATISFAÇÃO NO RECEBIMENTO</b> do imóvel:`, cl.desempGeral, '#dcfce7;color:#166534'],
    ]
    const itens33_44 = [
      ['a)', `Quanto ao <b>ESTADO DE CONSERVAÇÃO</b> da fachada pode ser classificado como:`, cl.risco, '#fef9c3;color:#854d0e'],
      ['b)', `O histórico de <b>MANUTENÇÃO</b> da fachada:`, cl.manut, '#f3e8ff;color:#6b21a8'],
      ['c)', `A <b>AGRESSIVIDADE DO MEIO AMBIENTE</b> sobre a fachada é considerada:`, cl.desempenho, '#fef9c3;color:#854d0e'],
      ['d)', `O <b>RISCO DE QUEDA DE ELEMENTOS</b> da fachada é considerado:`, cl.uso, '#fee2e2;color:#991b1b'],
      ['e)', `O <b>DESEMPENHO TÉCNICO DO SISTEMA</b> da fachada:`, cl.desempGeral, '#dcfce7;color:#166534'],
    ]
    const itens33 = tipoServico==='43' ? itens33_43 : tipoServico==='44' ? itens33_44 : itens33_4142
    const titulo33 = tipoServico==='43' ? 'Resultado da Classificação do Imóvel'
      : tipoServico==='44' ? 'Resultado da Classificação da Fachada'
      : 'Resultado da Classificação da Edificação'

    const tab33 = `
<table>
  <tr><td colspan="2" class="th-cab">${titulo33}</td></tr>
  ${itens33.map(([letra, desc, val, cor]) =>
    `<tr>
      <td style="width:66%"><b>${letra}</b> ${desc}</td>
      <td style="text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:8pt;font-weight:bold;background:${cor}">${x(val)||'—'}</span></td>
    </tr>`
  ).join('')}
</table>`

    // ── Tabela 4.1 — NCs por sistema ─────────────────────────────────────────
    const tab41 = sistemas.map(s => {
      const arr = ncsPorSistema[s]
      if (arr.length === 0) return ''
      const rec = x(complemento?.recsSistema?.[s] ?? '')
      return `
<h3>${x(nomeS(s))}</h3>
<table>
  <tr><td colspan="6" class="th-cab">Relação de Não Conformidades e Soluções por Sistema Construtivo</td></tr>
  <tr><td colspan="6"><b>Sistema construtivo:</b> ${x(nomeS(s))}</td></tr>
  <tr><td colspan="6"><b>Descrição:</b> ${x(descS(s))}</td></tr>
  ${rec ? `<tr><td colspan="6" style="background:#EEF2FF"><b>Recomendação para o sistema construtivo:</b> ${rec}</td></tr>` : ''}
  <tr>
    <th style="width:6%">Foto</th>
    <th style="width:30%">Não Conformidade</th>
    <th style="width:18%">Local</th>
    <th style="width:8%;text-align:center">GR</th>
    <th style="width:10%;text-align:center">Prioridade</th>
    <th style="width:28%">Solução</th>
  </tr>
  ${arr.map((nc: any, i: number) => `
  <tr${i%2===1?' style="background:#f7f9ff"':''}>
    <td style="text-align:center">${x(nc.fotoNr)}</td>
    <td>${x(nc.nc||nc.anomalia)}</td>
    <td>${x(nc.local)}${nc.complemento?' — '+x(nc.complemento):''}</td>
    <td style="text-align:center">${x(nc.grauRisco)}</td>
    <td style="text-align:center">${badgeP(nc.prioridade)}</td>
    <td>${x(nc.solucaoNC||nc.cp||'—')}</td>
  </tr>`).join('')}
</table>`
    }).join('')

    // ── Tabela 4.2 — Estatística ──────────────────────────────────────────────
    const tab42 = `
<table>
  <tr><td colspan="9" class="th-cab">Estatística de Manifestações Patológicas por Sistema Construtivo</td></tr>
  <tr>
    <th rowspan="2">Sistemas Construtivos</th>
    <th colspan="7" style="text-align:center">Manifestações por Prioridades</th>
    <th rowspan="2" style="text-align:center">Sub total</th>
  </tr>
  <tr>
    <th style="text-align:center">A</th>
    <th style="text-align:center">%</th>
    <th style="text-align:center">M</th>
    <th style="text-align:center">%</th>
    <th style="text-align:center">B</th>
    <th style="text-align:center">%</th>
    <th style="text-align:center">Total</th>
  </tr>
  ${stat.map(({s,a,m,b,t}) => `
  <tr>
    <td>${x(nomeS(s))}</td>
    <td style="text-align:center">${a||'—'}</td>
    <td style="text-align:center">${a?pct(a,t):'—'}</td>
    <td style="text-align:center">${m||'—'}</td>
    <td style="text-align:center">${m?pct(m,t):'—'}</td>
    <td style="text-align:center">${b||'—'}</td>
    <td style="text-align:center">${b?pct(b,t):'—'}</td>
    <td style="text-align:center;font-weight:bold">${t||'—'}</td>
    <td style="text-align:center;font-weight:bold">${t||'—'}</td>
  </tr>`).join('')}
  <tr>
    <td style="font-weight:bold">Total de ocorrências</td>
    <td style="text-align:center;font-weight:bold">${totA}</td>
    <td style="text-align:center;font-weight:bold">${pct(totA,totT)}</td>
    <td style="text-align:center;font-weight:bold">${totM}</td>
    <td style="text-align:center;font-weight:bold">${pct(totM,totT)}</td>
    <td style="text-align:center;font-weight:bold">${totB}</td>
    <td style="text-align:center;font-weight:bold">${pct(totB,totT)}</td>
    <td style="text-align:center;font-weight:bold">${totT}</td>
    <td style="text-align:center;font-weight:bold">${totT}</td>
  </tr>
  <tr><td colspan="9" style="font-style:italic;font-size:8pt">A = Alta; M = Média; B = Baixa</td></tr>
</table>`

    // ── Tabela 5 — Recomendações ──────────────────────────────────────────────
    const tab5 = `
<table>
  <tr><td colspan="2" class="th-cab">Recomendações sobre Manutenção, Uso, Sustentabilidade e Gerais</td></tr>
  <tr>
    <td style="width:5%;text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.1</td>
    <td><b>Avaliação e recomendações da manutenção.</b><br>${x(complemento?.rec51)||'<i>[A ser preenchido pelo responsável técnico]</i>'}</td>
  </tr>
  <tr>
    <td style="text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.2</td>
    <td><b>Avaliação e recomendações do uso da edificação.</b><br>${x(complemento?.rec52)||'<i>[A ser preenchido]</i>'}</td>
  </tr>
  <tr>
    <td style="text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.3</td>
    <td><b>Avaliação e recomendações da sustentabilidade.</b><br>${x(complemento?.rec53)||'<i>[A ser preenchido]</i>'}</td>
  </tr>
  <tr>
    <td style="text-align:center;background:#EEF2FF;font-weight:bold;color:#1E3A8A;vertical-align:middle">5.4</td>
    <td><b>Outras avaliações e recomendações.</b><br>${x(complemento?.rec54)||'<i>[A ser preenchido]</i>'}</td>
  </tr>
</table>`

    // ── Anexo 1 — Documentos ─────────────────────────────────────────────────
    const tabA1 = `
<table>
  <tr><td colspan="3" class="th-cab">Documentação da Edificação Solicitada para Análise e Avaliação</td></tr>
  <tr>
    <th style="width:60%;text-align:left">Documentos</th>
    <th style="width:20%;text-align:center">Situação</th>
    <th style="width:20%;text-align:left">Resultado</th>
  </tr>
  ${DOCS_ANEXO1.map(d => {
    const info = (complemento?.docsAnexo1 ?? {})[d] ?? { situacao: '', resultado: '' }
    const sit  = info.situacao  || '—'
    const res  = info.resultado || '—'
    const cor  = sit==='Entregue' ? 'color:#166534;font-weight:bold'
               : sit==='Pendente' ? 'color:#991b1b;font-weight:bold' : 'color:#6b7280'
    return `<tr><td>${d}</td><td style="text-align:center;${cor}">${sit}</td><td>${res}</td></tr>`
  }).join('')}
  <tr><td colspan="3" style="font-style:italic;font-size:8pt">Situação: Entregue; Pendente; Desnecessário — Resultado: Conforme; Não conforme; Não se aplica</td></tr>
</table>`

    // ── Anexo 2 — Formulários de vistoria (padrão visual das telas) ──────────
    // Reproduz exatamente o layout da rota homologar (blk/bt/bb/g2/g3/g4/f/m)
    const tabA2 = (ncs ?? []).length === 0
      ? '<p><i>Nenhuma vistoria homologada encontrada para este serviço.</i></p>'
      : (ncs ?? []).map((nc: any) => {
          const ns   = x((nc.sistema||'').slice(3).replace(/_/g,' '))
          const corGR = Number(nc.grauRisco) >= 64 ? '#DC2626'
            : Number(nc.grauRisco) >= 35 ? '#D97706' : '#059669'
          const foto = nc.fotoBase64 && nc.fotoBase64.startsWith('data:image')
            ? `<img src="${nc.fotoBase64}" class="foto-vt" alt="Foto ${x(nc.fotoNr)}">`
            : `<div style="height:70mm;background:#f1f5f9;border:2px solid #1E3A8A;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#9ab0d4;font-style:italic;font-size:8pt;margin-top:4px">[Foto Nº ${x(nc.fotoNr)} — não disponível]</div>`
          return `
<div class="blk">
  <div class="bt">AIMÊ — Vistoria Homologada</div>
  <div class="bb">
    <div class="g2">
      <div class="f"><label>${x(nc.cnpjoucpf||'').length===11?'CPF':'CNPJ'}</label><span>${x(nc.cnpjDisplay||nc.cnpjoucpf)}</span></div>
      <div class="f"><label>Razão Social / Nome</label><span>${x(nc.razaoSocial||estab?.razao_social_nome)}</span></div>
    </div>
    <div class="g3">
      <div class="f"><label>Tipo de serviço</label><span>${x(nc.tipoServico||tipoServico)}</span></div>
      <div class="f"><label>Data Vistoria</label><span>${x(nc.dataVistoria)}</span></div>
      <div class="f"><label>Chave Inspetor</label><span>${x(nc.chaveInspetor||chaveInspetor)}</span></div>
    </div>
  </div>
</div>
<div class="blk">
  <div class="bt">Anomalia / Não Conformidade</div>
  <div class="bb">
    <div class="g2">
      <div class="f"><label>Sistema</label><span>${ns}</span></div>
      <div class="f"><label>Subsistema</label><span>${x(nc.subsistema)}</span></div>
    </div>
    <div class="f"><label>Anomalia</label><span>${x(nc.anomalia)}</span></div>
    <div class="g3">
      <div class="f"><label>Origem</label><span>${x(nc.origem||nc.resultado)}</span></div>
      <div class="f"><label>Local</label><span>${x(nc.local)}</span></div>
      <div class="f"><label>Complemento</label><span>${x(nc.complemento)}</span></div>
    </div>
  </div>
</div>
<div class="blk">
  <div class="bt">Classificação de Risco</div>
  <div class="bb">
    <div class="g4">
      <div class="f"><label>Gravidade</label><span>${x(nc.gravidade)}</span></div>
      <div class="f"><label>Urgência</label><span>${x(nc.urgencia)}</span></div>
      <div class="f"><label>Abrangência</label><span>${x(nc.abrangencia)}</span></div>
      <div class="f"><label>Exposição</label><span>${x(nc.exposicao)}</span></div>
    </div>
    <div class="met">
      <div class="m" style="border-color:${corGR}">
        <span style="font-size:6.5pt;color:#4a6480;font-weight:600">Grau de Risco</span>
        <span style="font-size:13pt;font-weight:700;color:${corGR}">${x(nc.grauRisco)}</span>
      </div>
      <div class="m" style="border-color:${corGR};justify-content:center">
        <span style="font-size:6.5pt;color:#4a6480;font-weight:600">Prioridade</span>
        <span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:99px;font-size:7.5pt;font-weight:700;color:${corGR};border:1.5px solid ${corGR}">${x(nc.prioridade)}</span>
      </div>
    </div>
  </div>
</div>
<div class="blk">
  <div class="bt">Evidência Fotográfica</div>
  <div class="bb">
    <div class="g2">
      <div class="f" style="width:80px"><label>Foto Nº</label><span style="text-align:center;color:#1E3A8A;font-weight:bold">${x(nc.fotoNr)}</span></div>
    </div>
    ${foto}
  </div>
</div>
<div class="blk">
  <div class="bt">Não Conformidade (NC)</div>
  <div class="bb">
    <div class="f"><label>Não conformidade (NC)</label><span style="white-space:pre-wrap">${x(nc.nc||nc.anomalia)}</span></div>
    <div class="f"><label>Causa provável (CP)</label><span style="white-space:pre-wrap">${x(nc.cp)}</span></div>
    <div class="f"><label>Solução</label><span style="white-space:pre-wrap">${x(nc.solucaoNC||nc.cp||'—')}</span></div>
  </div>
</div>
<div class="stamp"><span>✓ Homologado — ${x(nc.chaveInspetor||chaveInspetor)}</span></div>`
        }).join('<div style="page-break-after:always"></div>\n')

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

<p style="text-align:right;margin:0;line-height:1">${x(estab?.cidade)}/${x(estab?.uf)}, ${dataHoje}</p>
<p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p>

<h1>1.- Considerações Preliminares.</h1>
<p>Este ${titulo} é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da ABNT/NBR 16.747/2020, recomendações da Norma de Inspeção Predial do IBAPE de 2025 e legislação vigente.</p>
<p>A inspeção apresentada neste laudo é o resultado de um exame "clínico geral" que avalia as condições globais do objeto em estudo e detecta a existência de problemas de conservação ou funcionamento, com base em uma análise fundamentalmente sensorial e efetuada por um profissional habilitado.</p>
<p>A documentação da edificação solicitada pelo inspetor na reunião inicial foi analisada e avaliada, e o resultado fica registrado na planilha apresentada no Anexo 1 deste laudo.</p>

<h2>1.1.- Características e localização ${tipoServico==='43'?'do Imóvel':'da Edificação'}.</h2>
${tab11}

<h2>1.2.- Objetivo.</h2>
<p>Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção ${tipoServico==='43'?'do imóvel':'da edificação'}, de acordo com os critérios da ABNT NBR 16.747/2020, normas correlatas, legislação vigente e metodologia apresentada neste documento.</p>

<h2>1.3.- Plano de Trabalho.</h2>
<p>As etapas básicas desenvolvidas para a realização do presente trabalho de Inspeção Predial constam na tabela que segue.</p>
<table>
  <tr>
    <th style="width:8%;text-align:center">Horas</th>
    <th style="width:10%;text-align:center">Dias Úteis</th>
    <th style="width:12%;text-align:center">Dt Início</th>
    <th style="width:12%;text-align:center">Dt Fim</th>
    <th>Atividades</th>
  </tr>
  <tr><td style="text-align:center">2</td><td style="text-align:center">1</td><td></td><td></td><td>Análise técnica inicial da edificação para conhecer as características e peculiaridades</td></tr>
  <tr><td style="text-align:center">3</td><td style="text-align:center">1</td><td></td><td></td><td>Entrevista Inicial para coletar dados históricos do prédio e documentação necessária</td></tr>
  <tr><td style="text-align:center">3</td><td style="text-align:center">3</td><td></td><td></td><td>Entrega documentos pelo síndico para o inspetor predial e análise</td></tr>
  <tr><td style="text-align:center">6</td><td style="text-align:center">5</td><td></td><td></td><td>Execução da vistoria com levantamento das anomalias e falhas nos sistemas construtivos</td></tr>
  <tr><td style="text-align:center">34</td><td style="text-align:center">6</td><td></td><td></td><td>Elaboração laudo efetuando análise, classificação, recomendações e soluções</td></tr>
  <tr><td style="text-align:center">1</td><td style="text-align:center">1</td><td></td><td></td><td>Entrega do Laudo de autovistoria ao Síndico</td></tr>
</table>

<h2>1.4.- Condições e limitações.</h2>
<p>O ${titulo} segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:</p>
<ul>
  <li>Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;</li>
  <li>O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para contratação dos serviços de manutenção;</li>
  <li>O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos.</li>
</ul>

<div class="quebra">
<h1>2.- Metodologia adotada para o Trabalho.</h1>
<p>A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal que regulamentam a autovistoria.</p>

<h2>2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.</h2>
<p>A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos) da Associação Brasileira de Normas Técnicas — ABNT.</p>
<p>"<i>Abrangências da análise. A inspeção predial baseia-se na constatação e análise do estado aparente de desempenho dos sistemas construtivos na fase de uso, operação e manutenção, considerando os requisitos dos usuários. A análise consiste na constatação da situação da edificação quanto à sua capacidade de atender às suas funções segundo os requisitos dos usuários, com base na análise fundamentalmente sensorial e efetuada por um profissional habilitado.</i>"</p>

<h2>2.2.- Norma de Inspeção Predial do IBAPE/2025.</h2>
<p>A Norma de Inspeção Predial do IBAPE fixa diretrizes, conceitos, terminologias, critérios e procedimentos relativos à atividade de Inspeção Predial, abrangendo os requisitos mínimos de:</p>
<ul>
  <li>Segurança: segurança estrutural; segurança contra incêndio; segurança no uso e na operação;</li>
  <li>Habitabilidade: estanqueidade; saúde, higiene e qualidade do ar; funcionalidade e acessibilidade;</li>
  <li>Sustentabilidade: durabilidade e manutenibilidade.</li>
</ul>
<p>As normas ABNT apresentadas a seguir são referências auxiliares e complementares à aplicação da norma IBAPE: <i>NBR 16747: Inspeção Predial; NBR 5674: Manutenção de Edificações; NBR 15575: Desempenho; NBR 14037: Manual de Operação, Uso e Manutenção; NBR 16280: Reforma em Edificações.</i></p>

<h2>2.3.- Critérios e Metodologia da Inspeção.</h2>

<h2>2.3.1.- Critérios.</h2>
<p>O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio, diante as condições observadas nos sistemas construtivos durante a vistoria. A análise do risco consiste na classificação das anomalias e falhas identificadas nos diversos sistemas construtivos e instalações de uma edificação, levando em consideração: a Gravidade, a Urgência e a Tendência de evolução, usando a metodologia GUT adaptado.</p>

<h2>2.3.2.- Método.</h2>
<p>O método empregado consiste em: determinar o nível da inspeção predial (NBR 16.747); verificar e analisar a documentação; obter informações com responsáveis pela edificação; vistoriar os sistemas construtivos e instalações; classificar e priorizar as manifestações patológicas; e elaborar o laudo técnico.</p>

<h2>2.3.3.- Classificação das Inspeções Prediais (NBR 16.747) e Edificações.</h2>
<p>As Prioridades para efetuar as manutenções das não conformidades são apuradas por metodologias técnicas como a GUT adaptado (Gravidade, Urgência e Tendência):</p>
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
  <tr><td class="th-cab">Descrição da Realização da Vistoria — Nível da Inspeção: ${x(nivel)||'—'}</td></tr>
  <tr><td style="min-height:50pt;padding:8pt">${x(complemento?.descVistoria||complemento?.dadosVistoria)}</td></tr>
</table>
<p>Os sistemas construtivos e instalações vistoriadas, com as condições observadas e as respectivas recomendações são apresentadas nos Relatórios de Não Conformidades, item 4 deste documento.</p>

<h2>3.2.- Resultado da Vistoria.</h2>
<p>O resultado da vistoria, imagens dos formulários da coleta de dados, é apresentado no Anexo 2 deste documento e apresenta, fielmente, dados, informações e fotos coletadas durante a realização da vistoria.</p>

<h2>3.3.- Resultado da Classificação ${tipoServico==='43'?'do Imóvel':tipoServico==='44'?'da Fachada':'da Edificação'}.</h2>
<p>O resultado da classificação foi efetuado seguindo a metodologia apresentada para execução deste trabalho.</p>
${tab33}
<p>As Prioridades para aplicar as soluções de manutenção constam na relação apresentada no item 4. deste documento.</p>
</div>

<div class="quebra">
<h1>4.- Relação de Não Conformidades e Análise das Manifestações Patológicas.</h1>

<h2>4.1.- Relação de Não Conformidades e Soluções.</h2>
<p>Neste item é apresentado, de forma clara e concisa, o conjunto de manifestações patológicas identificadas na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria.</p>
<p>A prioridade para manutenção de cada uma das não conformidades foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: gravidade, urgência, tendência e exposição ao risco. Critério: grau de risco superior a 64 pontos — prioridade <b>ALTA</b>; entre 35 e 64 pontos — prioridade <b>MÉDIA</b>; inferior a 35 pontos — prioridade <b>BAIXA</b>.</p>
${tab41 || '<p><i>Nenhuma não conformidade registrada.</i></p>'}

<h2>4.2.- Análise Estatística das Manifestações Patológicas.</h2>
<p>A tabela que segue apresenta a estatística de ocorrências de manifestações patológicas por sistema construtivos e prioridades.</p>
${tab42}
</div>

<div class="quebra">
<h1>5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais.</h1>
<p>No decorrer do processo foi efetuada a análise da documentação, a vistoria na edificação, a classificação da edificação e das anomalias e falhas identificadas, o que possibilitou uma completa avaliação dos sistemas construtivos. A seguir estão registradas as recomendações.</p>
${tab5}
</div>

<div class="quebra">
<h1>6.- Conclusão.</h1>
<p>Diante do exposto neste documento, e após analisados todos os fatos observados que interferem ou possam vir a interferir com o assunto objeto deste laudo, concluímos:</p>
<p>A vistoria proporcionou a constatação de que, considerando a idade da construção, o imóvel ${totA>0 ? 'apresenta anomalias que requerem intervenção imediata' : 'não apresenta nenhum dano aparente que represente ameaça à sua solidez'}.</p>
<p>Verificou-se ${totT>0 ? `a existência de ${totT} manifestações patológicas distribuídas nos sistemas construtivos vistoriados, sendo ${totA} de prioridade Alta, ${totM} de prioridade Média e ${totB} de prioridade Baixa, as quais necessitam de intervenções corretivas` : 'a não existência de danos que possam comprometer a segurança da edificação'}.</p>
<p>Recomendamos a execução de nova autovistoria no prazo máximo de 5 anos, para reavaliar e atuar preventivamente na situação construtiva da edificação.</p>
<p><b>Atenção:</b> <i>O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio.</i></p>
</div>

<div class="quebra">
<h1>7.- Encerramento.</h1>

<h2>7.1. Anexos:</h2>
<ul>
  <li>Anexo 1 – Relação de documentos solicitados e analisados;</li>
  <li>Anexo 2 – Resultado da Vistoria;</li>
  <li>Anexo 3 – Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.</li>
</ul>

<h2>7.2.- Declaração de conformidade com o Código de Ética.</h2>
<p>O signatário atesta que a presente autovistoria segue criteriosamente os seguintes princípios:</p>
<ul>
  <li>Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o Laudo;</li>
  <li>O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;</li>
  <li>O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros;</li>
  <li>Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA e do IBAPE.</li>
</ul>

<h2>7.3.- Termo de encerramento:</h2>
<p>O responsável técnico pela execução deste trabalho coloca-se ao inteiro dispor para esclarecimentos adicionais, caso necessários. O documento é entregue em mídia magnética.</p>

<div class="ass">
  <p style="text-align:center">${x(estab?.cidade)}/${x(estab?.uf)}, ${dataHoje}</p>
  <br><br><br>
  <p style="text-align:center">_______________________________________________</p>
  <p style="text-align:center"><b>${x(inspetor?.nome_inspetor)}</b> – Responsável Técnico</p>
  <p style="text-align:center">${x(inspetor?.titulo_profissional)} – CREA/CAU - ${x(inspetor?.inscricao_crea_cau)}</p>
  ${inspetor?.especializacao ? `<p style="text-align:center">${x(inspetor.especializacao)}</p>` : ''}
  <p style="text-align:center">-.-.-.-.-</p>
</div>
</div>

<div class="quebra">
<h1>Anexo 1 – Relação de Documentos Solicitados e Avaliados</h1>
${tabA1}
</div>

<div class="quebra">
<h1>Anexo 2 – Resultado da Vistoria</h1>
${tabA2}
</div>

<div class="quebra">
<h1>Anexo 3 – Anotações de Responsabilidade Técnica</h1>
<p>Inserir neste espaço a ART (Anotação de Responsabilidade Técnica) ou RRT (Registro de Responsabilidade Técnica) devidamente registrada no CREA ou CAU, relativa à execução deste trabalho.</p>
${srcArt
  ? `<div style="margin-top:8pt;text-align:center"><img src="${srcArt}" style="max-width:100%;border:1px solid #1E3A8A"></div>`
  : '<div style="margin-top:8pt;border:1px dashed #1E3A8A;padding:40pt;text-align:center;color:#9ab0d4;font-style:italic">[ART/RRT — a ser inserida pelo responsável técnico após baixar o documento editável]</div>'
}
</div>

${rodInspetor ? `<div class="rod">${rodInspetor}</div>` : ''}

</body>
</html>`

    // ── Salvar HTML no storage ────────────────────────────────────────────────
    const { error } = await supabase.storage
      .from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, Buffer.from(html, 'utf-8'), {
        contentType: 'text/html', upsert: true,
      })
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // ── Salvar dados estruturados JSON (para geração do DOCX) ─────────────────
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
