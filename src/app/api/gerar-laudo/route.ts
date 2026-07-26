// src/app/api/gerar-laudo/route.ts
// AIMÊ — Gera HTML do Laudo Técnico (41-44) conforme template profissional

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Sistemas por tipo ────────────────────────────────────────────────────────
const SISTEMAS: Record<string, string[]> = {
  '41': ['01_Sistema Estrutural','02_Fachadas, Empenas e Marquises','03_Cobertura e Telhados','04_Instalações Hidrossanitárias','05_Instalações Elétricas e SPDA','06_Instalações de Gás','07_Sistema de Prevenção e Combate a Incêndio','08_Elevadores e Equipamentos Eletromecânicos','09_Impermeabilização','10_Acessibilidade','11_Contenção de Encostas e Arrimos','12_Áreas Comuns e Infraestrutura','13_Documentação e Conformidade Legal'],
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado / HVAC','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns e Infraestrutura'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado (SPFE)','02_Revestimento Cerâmico de Fachada (APFE)','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada (SBCE / Textura)','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada e Vedação','11_Segurança Contra Incêndio em Fachadas','12_Manutenção e Equipamentos de Acesso'],
}

const TITULO: Record<string,string> = {
  '41':'Laudo de Autovistoria','42':'Laudo de Inspeção Predial',
  '43':'Laudo de Imóvel Novo','44':'Laudo de Inspeção de Fachada',
}

const DOCS_ANEXO1 = [
  'Auto de Conclusão da Edificação (HABITE-SE)',
  'Convenção do Condomínio',
  'Alvará de Funcionamento de Elevadores',
  'Relatório de Inspeção Anual dos Elevadores (RIAE)',
  'Auto de Vistoria do Corpo de Bombeiros (AVCB)',
  'Atestado do Sistema de Proteção a Descargas Atmosféricas (SPDA)',
  'Avaliação da Rede de Distribuição Interna de GLP',
  'Contrato de Manutenção de Elevadores',
  'Certificado de Desratização e Desinsetização',
  'Relatório de Manutenção e Limpeza das Caixas d\'água',
  'Certificado do reservatório de GLP',
  'Laudo de autovistoria anterior',
  'Projeto Arquitetônico Aprovado na Prefeitura',
  'Projetos Elétrico e Hidrossanitário Aprovados',
  'Manual de Uso, Operação e Manutenção da Edificação',
  'Alvará de Funcionamento (Imóveis não Residenciais)',
  'Licenças Ambientais (Imóveis não Residenciais)',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function xmlEsc(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(/@/g, '&#64;')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
}

function fmtData(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const M = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`
}

function fmtDoc(v: string) {
  const n = (v||'').replace(/\D/g,'')
  if (n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  if (n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
  return v
}

function pct(val: number, total: number) {
  if (!total) return '0%'
  return Math.round(val*100/total)+'%'
}

// ─── CSS profissional ─────────────────────────────────────────────────────────
const CSS = `
  @page { margin: 2.5cm 2cm 2cm 3cm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; }
  h1 { font-size: 10pt; font-weight: bold; margin: 14pt 0 4pt; color: #000; page-break-after: avoid; }
  h2 { font-size: 10pt; font-weight: bold; margin: 10pt 0 3pt; color: #000; page-break-after: avoid; }
  h3 { font-size: 10pt; font-weight: bold; margin: 8pt 0 2pt; color: #000; page-break-after: avoid; }
  p  { margin: 3pt 0; text-align: justify; }
  ul { margin: 3pt 0 3pt 1cm; }
  li { margin: 2pt 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 4pt 0; font-size: 9pt; page-break-inside: avoid; }
  td, th { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; }
  .th-azul { background: #1E3A8A; color: #fff; font-weight: bold; text-align: center; }
  .th-cinza { background: #D9D9D9; font-weight: bold; }
  .centro { text-align: center; }
  .direita { text-align: right; }
  .bold { font-weight: bold; }
  .it { font-style: italic; }
  .quebra { page-break-before: always; }
  .capa { text-align: center; padding: 80pt 40pt; }
  .capa-titulo { font-size: 16pt; font-weight: bold; color: #1E3A8A; margin: 20pt 0; }
  .capa-sub { font-size: 12pt; margin: 8pt 0; }
  .capa-linha { border-top: 2px solid #1E3A8A; margin: 20pt 0; }
  .assin { text-align: center; margin-top: 30pt; }
  .rodape-doc { border-top: 1px solid #000; margin-top: 10pt; font-size: 8pt; color: #555; }
  .img-placeholder { background: #f0f0f0; border: 1px dashed #999; padding: 20pt; text-align: center; color: #666; font-style: italic; min-height: 60pt; }
  .nc-foto { max-width: 100%; max-height: 120pt; }
`

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
            estab, inspetor, ncs, nomeArquivo, complemento } = body

    if (!cpfInspetor || !tipoServico || !nomeArquivo)
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })

    const titulo   = TITULO[tipoServico]   ?? 'Laudo Técnico'
    const sistemas = SISTEMAS[tipoServico] ?? []
    const hoje     = new Date()
    const dataHoje = fmtData(hoje.toISOString())
    const cl       = complemento?.classificacao ?? {}
    const nivel    = complemento?.nivelInspecao ?? cl.nivel ?? ''

    // ── Label do identificador ──
    const isPF = (cnpjoucpf||'').length === 11
    const labelDoc  = tipoServico==='43' ? 'CPF' : 'CNPJ'
    const labelEst  = tipoServico==='43' ? 'Proprietário' : 'Condomínio'

    // ── Agrupar NCs por sistema ──
    const ncsPorSistema: Record<string, any[]> = {}
    for (const s of sistemas) ncsPorSistema[s] = []
    for (const nc of (ncs ?? [])) {
      const s = nc.sistema ?? ''
      if (ncsPorSistema[s] !== undefined) ncsPorSistema[s].push(nc)
      else {
        // tentar match parcial
        const match = sistemas.find(x => x === s || s.startsWith(x.split('_')[0]))
        if (match) ncsPorSistema[match].push(nc)
      }
    }

    // ── Estatística ──
    const stat = sistemas.map(s => {
      const arr = ncsPorSistema[s] ?? []
      const a = arr.filter(n => n.prioridade==='Alta').length
      const m = arr.filter(n => n.prioridade==='Média').length
      const b = arr.filter(n => n.prioridade==='Baixa').length
      return { s, a, m, b, t: a+m+b }
    })
    const totA = stat.reduce((x,s)=>x+s.a,0)
    const totM = stat.reduce((x,s)=>x+s.m,0)
    const totB = stat.reduce((x,s)=>x+s.b,0)
    const totT = totA+totM+totB

    // ── Plano de trabalho (do storage) ──
    let planoHtml = '<p><em>[Inserir plano de trabalho homologado]</em></p>'
    // Tentar buscar o plano de trabalho correspondente
    try {
      const { data: docsPlano } = await supabase.storage.from('aime')
        .list('documentos_inspetor', { limit: 200 })
      const tipoPlano = String(Number(tipoServico)+10) // 41→21 corrigido abaixo
      const mapaPlano: Record<string,string> = {'41':'21','42':'22','43':'23','44':'24'}
      const slugPlano = `plano_${titulo.toLowerCase().replace('laudo de ','').replace(/ /g,'_')}`
      const arqPlano = (docsPlano??[]).find(f =>
        f.name.startsWith(chaveInspetor) &&
        f.name.includes(cnpjoucpf) &&
        f.name.includes('plano') &&
        f.name.endsWith('.html')
      )
      if (arqPlano) {
        const { data: blob } = await supabase.storage.from('aime')
          .download(`documentos_inspetor/${arqPlano.name}`)
        if (blob) {
          const htmlPlano = await blob.text()
          // Extrair apenas as atividades do plano (tabela de agenda)
          const mTabela = htmlPlano.match(/<table[^>]*>[\s\S]*?Atividades[\s\S]*?<\/table>/i)
          if (mTabela) planoHtml = mTabela[0]
        }
      }
    } catch { /* segue sem plano */ }

    // ── Texto METODOLOGIA (do template) ──
    const METODOLOGIA_41 = `
<p>A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal que regulamentam a autovistoria.</p>

<h2>2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.</h2>
<p>A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos) da Associação Brasileira de Normas Técnicas — ABNT.</p>
<p><em>"Abrangências da análise</em></p>
<p><em>A inspeção predial baseia-se na constatação e análise do estado aparente de desempenho dos sistemas construtivos na fase de uso, operação e manutenção, considerando os requisitos dos usuários.</em></p>
<p><em>A análise consiste na constatação da situação da edificação quanto à sua capacidade de atender à suas funções segundo os requisitos dos usuários, com registro das anomalias, falhas de manutenção, uso e operação e manifestações patológicas identificadas nos diversos sistemas construtivos e instalações de uma edificação."</em></p>

<h2>2.2.- Norma de Inspeção Predial do IBAPE/2025.</h2>
<p>A Norma de Inspeção Predial do IBAPE fixa diretrizes, conceitos, terminologias, critérios e procedimentos relativos à atividade de Inspeção Predial, abrangendo os requisitos mínimos de:</p>
<ul>
  <li>Segurança: segurança estrutural; segurança contra incêndio; segurança no uso e na operação;</li>
  <li>Habitabilidade: estanqueidade; saúde, higiene e qualidade do ar; funcionalidade e acessibilidade;</li>
  <li>Sustentabilidade: durabilidade e manutenibilidade.</li>
</ul>
<p>As normas ABNT apresentadas a seguir são referências auxiliares e complementares à aplicação da norma IBAPE: NBR 16747: Inspeção Predial; NBR 5674: Manutenção de Edificações; NBR 15575: Desempenho de Edificações Habitacionais; NBR 14037: Manual de Operação, Uso e Manutenção; NBR 16280: Reforma em Edificações.</p>

<h2>2.3.- Critérios e Metodologia da Inspeção.</h2>

<h3>2.3.1.- Critérios.</h3>
<p>O critério utilizado para elaboração de laudos baseia-se na análise do risco oferecido aos usuários, ao meio ambiente e ao patrimônio, diante as condições observadas nos sistemas construtivos durante a vistoria. A análise do risco consiste na classificação das anomalias e falhas identificadas nos diversos sistemas construtivos e instalações de uma edificação, utilizando metodologia como a <strong>GUT</strong> adaptado (<strong>G</strong>ravidade, <strong>U</strong>rgência e <strong>T</strong>endência).</p>

<h3>2.3.2.- Método.</h3>
<p>O método empregado consiste em: determinar o nível da inspeção predial (NBR 16.747); verificar e analisar a documentação; obter informações com responsáveis pela edificação; vistoriar os sistemas construtivos e instalações acessíveis; classificar e priorizar as manifestações patológicas; e elaborar o laudo técnico.</p>

<h3>2.3.3.- Classificação das Inspeções Prediais (NBR 16.747) e Edificações.</h3>
<p>A classificação das inspeções prediais e edificações deve ser efetuada segundo critérios definidos em normas técnicas:</p>
<ul>
  <li><strong>NÍVEL 1:</strong> Edificações mais simples, sem necessidade de equipe multidisciplinar — apenas Engenheiro Civil ou Arquiteto;</li>
  <li><strong>NÍVEL 2:</strong> Edifícios multifamiliares ou comerciais sem sistemas complexos, somente com elevadores — requer Engenheiro Civil ou Arquiteto e Engenheiro Elétrico;</li>
  <li><strong>NÍVEL 3:</strong> Edificações complexas com manutenção regulamentada pela NBR 5674 — requer equipe multidisciplinar com Engenheiro Civil ou Arquiteto, Engenheiro Elétrico e Engenheiro Mecânico.</li>
</ul>
<p>Quanto ao <strong>RISCO</strong>: <strong>CRÍTICO</strong> — risco que pode provocar danos à saúde e segurança das pessoas, recomendando intervenção imediata; <strong>REGULAR</strong> — perda de funcionalidade sem prejuízo à operação direta, recomendando intervenção a curto prazo; <strong>MÍNIMO</strong> — pequenos prejuízos à estética, recomendando programação a médio prazo.</p>
<p>As <strong>Prioridades</strong> para manutenção das não conformidades são:</p>
<ul>
  <li><strong>Prioridade 1 (Alta):</strong> Intervenção imediata — prazo inferior a 8 meses;</li>
  <li><strong>Prioridade 2 (Média):</strong> Intervenção a médio prazo — prazo inferior a 15 meses;</li>
  <li><strong>Prioridade 3 (Baixa):</strong> Intervenção a longo prazo — prazo não superior a 30 meses.</li>
</ul>

<h3>2.3.4.- Critérios para avaliação da manutenção, uso da edificação e do desempenho.</h3>
<p>Quanto à <strong>MANUTENÇÃO</strong>: avalia-se a coerência entre o plano de manutenção apresentado e o recomendado, classificando como <strong>TOTALMENTE</strong>, <strong>PARCIALMENTE</strong> ou <strong>NÃO ATENDE</strong>.</p>
<p>Quanto às <strong>CONDIÇÕES DE USO</strong>: <strong>USO REGULAR</strong> — edificação ocupada conforme projeto; <strong>USO IRREGULAR</strong> — uso divergente do previsto.</p>
<p>Quanto ao <strong>DESEMPENHO</strong>: <strong>BOM</strong> — anomalias inexistentes ou leves; <strong>REGULAR</strong> — anomalias leves a moderadas; <strong>RUIM</strong> — anomalias significativas; <strong>CRÍTICO</strong> — anomalias graves com risco à segurança.</p>`

    const METODOLOGIA_42 = METODOLOGIA_41.replace('Autovistoria','Inspeção Predial')
    const METODOLOGIA_43 = `
<h2>2.1.- Base normativa e legal aplicável.</h2>
<p>Norma principal: <strong>ABNT NBR 15575 (Série)</strong> — Edificações Habitacionais — Desempenho, que define os requisitos mínimos para segurança, habitabilidade e sustentabilidade. Normas complementares: NBR 16.747, NBR 5674, NBR 16.280, NBR 14.037, NBR 13.752, Código Civil Brasileiro (arts. 618 e 445) e Código de Defesa do Consumidor.</p>
<h2>2.2.- Escopo técnico da vistoria.</h2>
<p>A vistoria abrange os sistemas construtivos: estrutura, vedações, revestimentos, esquadrias, hidrossanitário, elétrico, impermeabilização, áreas externas, segurança e uso.</p>
<h2>2.3.- Metodologia.</h2>
<p>O método empregado consiste em verificar e analisar a documentação do imóvel, obter informações com o responsável, vistoriar sistematicamente todos os sistemas construtivos acessíveis e elaborar o laudo com classificação e priorização das não conformidades.</p>`

    const METODOLOGIA_44 = `
<h2>2.1.- Base normativa e legal aplicável.</h2>
<p>Norma principal: <strong>NBR 13.755</strong> — Revestimento cerâmico de fachadas e paredes externas com placas cerâmicas e uso de argamassa colante. Normas complementares: NBR 13.749, NBR 16.747, NBR 15.575, NBR 5.674, NBR 7.200, NBR 14.081, Código Civil (arts. 618 e 445) e Código de Defesa do Consumidor.</p>
<h2>2.2.- Critérios adotados.</h2>
<p>Os critérios adotados para avaliação das fachadas seguem as normas técnicas aplicáveis, com classificação das anomalias por sistema e prioridade de intervenção conforme metodologia GUT adaptada.</p>`

    const METODOLOGIA: Record<string,string> = {
      '41': METODOLOGIA_41, '42': METODOLOGIA_42,
      '43': METODOLOGIA_43, '44': METODOLOGIA_44,
    }

    // ── Tabela 3.3 por tipo ──
    const tabela33 = tipoServico === '43' ? `
<table>
  <tr><td colspan="2" class="th-azul">Resultado da Classificação do Imóvel.</td></tr>
  <tr><td class="bold">a) A execução da obra em relação à <strong>CONFORMIDADE CONSTRUTIVA</strong> foi classificada como:</td><td class="centro">${xmlEsc(cl.nivel)}</td></tr>
  <tr><td class="bold">b) A <strong>QUALIDADE DE ACABAMENTO</strong> do imóvel é classificada como:</td><td class="centro">${xmlEsc(cl.risco)}</td></tr>
  <tr><td class="bold">c) Quanto ao uso, a <strong>FUNCIONALIDADE</strong> do imóvel:</td><td class="centro">${xmlEsc(cl.desempenho)}</td></tr>
  <tr><td class="bold">d) Quanto às condições de ocupação, a <strong>HABITABILIDADE</strong> pode ser considerada:</td><td class="centro">${xmlEsc(cl.manut)}</td></tr>
  <tr><td class="bold">e) A análise do resultado consolidado sobre a <strong>CLASSE DO IMÓVEL</strong> resulta em:</td><td class="centro">${xmlEsc(cl.uso)}</td></tr>
  <tr><td class="bold">f) Qual o <strong>GRAU DE SATISFAÇÃO NO RECEBIMENTO</strong> do imóvel:</td><td class="centro">${xmlEsc(cl.desempGeral)}</td></tr>
</table>
<p>As Prioridades para aplicar as soluções de manutenção constam na relação apresentada no item 4. deste documento.</p>` :
    tipoServico === '44' ? `
<table>
  <tr><td colspan="2" class="th-azul">Resultado da Classificação da Fachada.</td></tr>
  <tr><td class="bold">a) Quanto às condições gerais, o <strong>ESTADO DE CONSERVAÇÃO</strong> da fachada pode ser classificado como:</td><td class="centro">${xmlEsc(cl.nivel)}</td></tr>
  <tr><td class="bold">b) O histórico de <strong>MANUTENÇÃO</strong> da fachada apresenta que a manutenção efetuada é:</td><td class="centro">${xmlEsc(cl.risco)}</td></tr>
  <tr><td class="bold">c) A <strong>AGRESSIVIDADE DO MEIO AMBIENTE</strong> sobre a fachada é considerada:</td><td class="centro">${xmlEsc(cl.desempenho)}</td></tr>
  <tr><td class="bold">d) O <strong>RISCO DE QUEDA DE ELEMENTOS</strong> da fachada é considerado:</td><td class="centro">${xmlEsc(cl.manut)}</td></tr>
  <tr><td class="bold">e) O <strong>DESEMPENHO TÉCNICO DO SISTEMA</strong> da fachada:</td><td class="centro">${xmlEsc(cl.uso)}</td></tr>
  <tr><td class="bold">f) Quanto à <strong>PRIORIDADE DE INTERVENÇÃO</strong> para manutenção da fachada deve ser adotada execução:</td><td class="centro">${xmlEsc(cl.desempGeral)}</td></tr>
</table>
<p>As Prioridades para aplicar as soluções de manutenção constam na relação apresentada no item 4. deste documento.</p>` : `
<table>
  <tr><td colspan="2" class="th-azul">Resultado da Classificação da Edificação.</td></tr>
  <tr><td>a) Quanto ao <strong>NÍVEL</strong> da inspeção efetuada o imóvel foi classificado como <strong>INSPEÇÃO PREDIAL NÍVEL:</strong></td><td class="centro bold">${xmlEsc(nivel) || xmlEsc(cl.nivel)}</td></tr>
  <tr><td>b) Quando ao <strong>GRAU DE RISCO</strong> o imóvel encontra-se classificado como de <strong>RISCO:</strong></td><td class="centro bold">${xmlEsc(cl.risco)}</td></tr>
  <tr><td>c) Quanto ao <strong>DESEMPENHO</strong> a classificação geral do imóvel foi classificada como:</td><td class="centro bold">${xmlEsc(cl.desempenho)}</td></tr>
  <tr><td>d) Quanto à <strong>QUALIDADE DA MANUTENÇÃO</strong> a edificação foi classificada como QUALIDADE QUE:</td><td class="centro bold">${xmlEsc(cl.manut)}</td></tr>
  <tr><td>e) Quanto às <strong>CONDIÇÕES DE USO</strong> a edificação foi classificada como EDIFICAÇÃO DE USO:</td><td class="centro bold">${xmlEsc(cl.uso)}</td></tr>
  <tr><td>f) Quanto ao <strong>DESEMPENHO GERAL</strong> a edificação foi classificada como:</td><td class="centro bold">${xmlEsc(cl.desempGeral)}</td></tr>
</table>`

    // ── Tabela 4.1 — NCs por sistema ──
    const tabela41 = sistemas.map(s => {
      const arr = ncsPorSistema[s] ?? []
      if (arr.length === 0) return ''
      const nomeS = s.replace(/_/g,' ')
      const rec = complemento?.recsSistema?.[s] ?? ''
      const linhasNC = arr.map((nc: any) => `
<tr>
  <td class="centro">${xmlEsc(nc.fotoNr)}</td>
  <td>${xmlEsc(nc.nc) || xmlEsc(nc.anomalia)}</td>
  <td>${xmlEsc(nc.local)}${nc.complemento ? '<br><em>'+xmlEsc(nc.complemento)+'</em>' : ''}</td>
  <td class="centro">${xmlEsc(nc.grauRisco)}</td>
  <td class="centro bold">${xmlEsc(nc.prioridade)}</td>
  <td>${xmlEsc(nc.cp) || '—'}</td>
</tr>`).join('')
      return `
<h3>${xmlEsc(nomeS)}</h3>
<table>
  <tr>
    <td colspan="6" class="th-cinza bold">Sistema construtivo ou instalação: ${xmlEsc(nomeS)}</td>
  </tr>
  <tr>
    <td colspan="6"><strong>Descrição do sistema construtivo:</strong> ${xmlEsc(complemento?.descSistemas?.[s]) || '<em>[descrição do sistema]</em>'}</td>
  </tr>
  ${rec ? `<tr><td colspan="6"><strong>Recomendação para o sistema construtivo:</strong> ${xmlEsc(rec)}</td></tr>` : ''}
  <tr>
    <th class="th-cinza centro" style="width:6%">Foto</th>
    <th class="th-cinza" style="width:32%">Não Conformidade</th>
    <th class="th-cinza" style="width:20%">Local</th>
    <th class="th-cinza centro" style="width:8%">G Risco</th>
    <th class="th-cinza centro" style="width:12%">Prioridade</th>
    <th class="th-cinza" style="width:22%">Solução / Causa Provável</th>
  </tr>
  ${linhasNC}
</table>`
    }).join('')

    // ── Tabela 4.2 — Estatística ──
    const tabela42 = `
<table>
  <tr><td colspan="9" class="th-azul">Estatística de Manifestações Patológicas por Sistema Construtivo</td></tr>
  <tr>
    <th class="th-cinza" rowspan="2">Sistemas Construtivos</th>
    <th class="th-cinza centro" colspan="7">Manifestações por Prioridades</th>
    <th class="th-cinza centro" rowspan="2">Sub total</th>
  </tr>
  <tr>
    <th class="th-cinza centro">A</th>
    <th class="th-cinza centro">%</th>
    <th class="th-cinza centro">M</th>
    <th class="th-cinza centro">%</th>
    <th class="th-cinza centro">B</th>
    <th class="th-cinza centro">%</th>
    <th class="th-cinza centro">Total</th>
  </tr>
  ${stat.map(({s,a,m,b,t}) => `
  <tr>
    <td>${xmlEsc(s.replace(/_/g,' '))}</td>
    <td class="centro">${a||'—'}</td>
    <td class="centro">${a ? pct(a,t) : '—'}</td>
    <td class="centro">${m||'—'}</td>
    <td class="centro">${m ? pct(m,t) : '—'}</td>
    <td class="centro">${b||'—'}</td>
    <td class="centro">${b ? pct(b,t) : '—'}</td>
    <td class="centro bold">${t||'—'}</td>
    <td class="centro bold">${t||'—'}</td>
  </tr>`).join('')}
  <tr>
    <td class="bold">Total de ocorrências</td>
    <td class="centro bold">${totA}</td>
    <td class="centro bold">${pct(totA,totT)}</td>
    <td class="centro bold">${totM}</td>
    <td class="centro bold">${pct(totM,totT)}</td>
    <td class="centro bold">${totB}</td>
    <td class="centro bold">${pct(totB,totT)}</td>
    <td class="centro bold">${totT}</td>
    <td class="centro bold">${totT}</td>
  </tr>
  <tr><td colspan="9" class="it" style="font-size:8pt">A = Alta; M = Média; B = Baixa</td></tr>
</table>`

    // ── Tabela 5 — Recomendações ──
    const tabela5 = `
<table>
  <tr>
    <th class="th-cinza" style="width:25%">Item</th>
    <th class="th-cinza">Avaliação e Recomendações</th>
  </tr>
  <tr>
    <td class="bold">5.1.- Avaliação e recomendações da manutenção.</td>
    <td>${xmlEsc(complemento?.rec51) || '<em>[A ser preenchido pelo responsável técnico]</em>'}</td>
  </tr>
  <tr><td colspan="2" style="height:4pt"></td></tr>
  <tr>
    <td class="bold">5.2.- Avaliação e recomendações do uso da edificação.</td>
    <td>${xmlEsc(complemento?.rec52) || '<em>[A ser preenchido pelo responsável técnico]</em>'}</td>
  </tr>
  <tr><td colspan="2" style="height:4pt"></td></tr>
  <tr>
    <td class="bold">5.3.- Avaliação e recomendações da sustentabilidade.</td>
    <td>${xmlEsc(complemento?.rec53) || '<em>[A ser preenchido pelo responsável técnico]</em>'}</td>
  </tr>
  <tr><td colspan="2" style="height:4pt"></td></tr>
  <tr>
    <td class="bold">5.4.- Outras avaliações e recomendações.</td>
    <td>${xmlEsc(complemento?.rec54) || '<em>[A ser preenchido pelo responsável técnico]</em>'}</td>
  </tr>
</table>`

    // ── Anexo 2 — Formulários de vistoria ──
    const anexo2 = (ncs ?? []).map((nc: any) => `
<div style="page-break-inside:avoid;margin-bottom:10pt">
<table>
  <tr>
    <td colspan="4" class="th-azul">Relatório de Não Conformidade — Foto Nº ${xmlEsc(nc.fotoNr)}</td>
  </tr>
  <tr>
    <td class="bold th-cinza">Sistema:</td>
    <td colspan="3">${xmlEsc(nc.sistema)}</td>
  </tr>
  <tr>
    <td class="bold th-cinza" style="width:20%">Subsistema:</td>
    <td style="width:30%">${xmlEsc(nc.subsistema)}</td>
    <td class="bold th-cinza" style="width:15%">Local:</td>
    <td style="width:35%">${xmlEsc(nc.local)}${nc.complemento ? ' — '+xmlEsc(nc.complemento) : ''}</td>
  </tr>
  <tr>
    <td class="bold th-cinza">Anomalia / Falha:</td>
    <td colspan="3">${xmlEsc(nc.anomalia)}</td>
  </tr>
  <tr>
    <td class="bold th-cinza">Grau de Risco:</td>
    <td>${xmlEsc(nc.grauRisco)}</td>
    <td class="bold th-cinza">Prioridade:</td>
    <td class="bold">${xmlEsc(nc.prioridade)}</td>
  </tr>
  <tr>
    <td class="bold th-cinza">Descrição da NC:</td>
    <td colspan="3">${xmlEsc(nc.nc)}</td>
  </tr>
  <tr>
    <td class="bold th-cinza">Causa Provável:</td>
    <td colspan="3">${xmlEsc(nc.cp)}</td>
  </tr>
  <tr>
    <td class="bold th-cinza">Data da Vistoria:</td>
    <td colspan="3">${xmlEsc(nc.dataVistoria)}</td>
  </tr>
</table>
${nc.fotoBase64
  ? `<div style="text-align:center;margin-top:4pt"><img src="${nc.fotoBase64}" style="max-width:100%;max-height:160pt;border:1px solid #ccc" /></div>`
  : `<div class="img-placeholder">[Foto Nº ${xmlEsc(nc.fotoNr)} — inserir ao revisar o documento]</div>`
}
</div>`).join('')

    // ── HTML COMPLETO ──────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>${CSS}</style>
</head>
<body>

<!-- ═══ CAPA ═══════════════════════════════════════════════════════════════ -->
<div class="capa">
  <p style="font-size:11pt;color:#555">${dataHoje}</p>
  <div class="capa-linha"></div>
  <p class="capa-titulo">MAPEAMENTO INTELIGENTE DE EDIFICAÇÕES E EQUIPAMENTOS — AIMÊ</p>
  <div class="capa-linha"></div>
  <p class="capa-titulo" style="font-size:20pt">${titulo.toUpperCase()}</p>
  <p class="capa-sub" style="font-size:13pt">${xmlEsc(estab.razao_social_nome)}</p>
  <p class="capa-sub">${xmlEsc(estab.cidade)}/${xmlEsc(estab.uf)}</p>
  <div class="capa-linha"></div>
  <p style="font-size:9pt;color:#555;margin-top:40pt">
    ${xmlEsc(inspetor.nome_inspetor)} — ${xmlEsc(inspetor.titulo_profissional)}<br>
    CREA/CAU: ${xmlEsc(inspetor.inscricao_crea_cau)}
  </p>
</div>

<!-- ═══ ÍNDICE ══════════════════════════════════════════════════════════════ -->
<div class="quebra">
<h1>ÍNDICE</h1>
<table style="border:none">
  <tr><td style="border:none">1.- Considerações Preliminares</td></tr>
  <tr><td style="border:none;padding-left:20pt">1.1.- Características e localização da edificação</td></tr>
  <tr><td style="border:none;padding-left:20pt">1.2.- Objetivo</td></tr>
  <tr><td style="border:none;padding-left:20pt">1.3.- Plano de Trabalho</td></tr>
  <tr><td style="border:none;padding-left:20pt">1.4.- Condições e limitações</td></tr>
  <tr><td style="border:none">2.- Metodologia adotada para o Trabalho</td></tr>
  <tr><td style="border:none">3.- Resultado da Vistoria Técnica e Classificação da Edificação</td></tr>
  <tr><td style="border:none;padding-left:20pt">3.1.- Descrição da Vistoria Técnica</td></tr>
  <tr><td style="border:none;padding-left:20pt">3.2.- Resultado da Vistoria</td></tr>
  <tr><td style="border:none;padding-left:20pt">3.3.- Resultado da Classificação da Edificação</td></tr>
  <tr><td style="border:none">4.- Relação de Não Conformidades e Análise das Manifestações Patológicas</td></tr>
  <tr><td style="border:none;padding-left:20pt">4.1.- Relação de Não Conformidades e Soluções</td></tr>
  <tr><td style="border:none;padding-left:20pt">4.2.- Análise Estatística das Manifestações Patológicas</td></tr>
  <tr><td style="border:none">5.- Recomendações sobre Manutenção, Uso, Sustentabilidade e Gerais</td></tr>
  <tr><td style="border:none">6.- Conclusão</td></tr>
  <tr><td style="border:none">7.- Encerramento</td></tr>
  <tr><td style="border:none">Anexo 1 — Relação de Documentos Solicitados e Avaliados</td></tr>
  <tr><td style="border:none">Anexo 2 — Resultado da Vistoria</td></tr>
  <tr><td style="border:none">Anexo 3 — Anotações de Responsabilidade Técnica</td></tr>
</table>
</div>

<!-- ═══ 1. CONSIDERAÇÕES PRELIMINARES ══════════════════════════════════════ -->
<div class="quebra">
<h1>1.- Considerações Preliminares.</h1>
<p>Este ${titulo} é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da <em>${tipoServico==='43'?'NBR 15.575 e NBR 16.747':'ABNT/NBR 16.747/2020'}</em>, recomendações da <em>Norma de Inspeção Predial do IBAPE de 2025</em> e legislação vigente.</p>
<p>A inspeção apresentada neste laudo é o resultado de um exame "clínico geral" que avalia as condições globais do objeto em estudo e detecta a existência de problemas de conservação ou funcionamento, com base em uma análise fundamentalmente sensorial e efetuada por um profissional habilitado.</p>
<p>A documentação da edificação solicitada pelo inspetor na reunião inicial foi analisada e avaliada, e o resultado fica registrado na planilha apresentada no Anexo 1 deste laudo.</p>

<h2>1.1.- Características e localização ${tipoServico==='43'?'do Imóvel':'da Edificação'}.</h2>
<table>
  <tr><td colspan="6" class="th-azul">Características ${tipoServico==='43'?'do Imóvel':'da Edificação'}</td></tr>
  <tr><td colspan="3" class="bold th-cinza">Identificação e características da edificação:</td><td colspan="3"></td></tr>
  <tr>
    <td class="bold" style="width:18%">${labelEst}:</td>
    <td colspan="2" style="width:32%">${xmlEsc(estab.razao_social_nome)}</td>
    <td class="bold" style="width:10%">${labelDoc}:</td>
    <td style="width:20%">${fmtDoc(cnpjoucpf)}</td>
    <td style="width:20%"><span class="bold">CEP:</span> ${xmlEsc(estab.cep)}</td>
  </tr>
  <tr>
    <td class="bold">Endereço:</td>
    <td colspan="3">${xmlEsc(estab.logradouro)}${estab.numero?', '+xmlEsc(estab.numero):''}${estab.complemento?' '+xmlEsc(estab.complemento):''}</td>
    <td class="bold">Bairro:</td>
    <td>${xmlEsc(estab.bairro)}</td>
  </tr>
  <tr>
    <td class="bold">Cidade e UF:</td>
    <td>${xmlEsc(estab.cidade)}/${xmlEsc(estab.uf)}</td>
    <td class="bold">Nome do responsável:</td>
    <td>${xmlEsc(estab.nome_responsavel)}</td>
    <td class="bold">Função:</td>
    <td>${xmlEsc(estab.funcao_responsavel)}</td>
  </tr>
  <tr>
    <td class="bold">Telefone:</td>
    <td>${xmlEsc(estab.whatsapp)}</td>
    <td class="bold">e-Mail:</td>
    <td>${xmlEsc(estab.email)}</td>
    <td class="bold">Finalidade:</td>
    <td>Vistoria técnica</td>
  </tr>
  <tr>
    <td class="bold">Uso imóvel:</td>
    <td>${xmlEsc(estab.uso_imovel)}</td>
    <td class="bold">Tipo:</td>
    <td>${xmlEsc(estab.tipo_imovel)}</td>
    <td class="bold">Nº pavimentos:</td>
    <td>${xmlEsc(estab.numero_pavimentos)}</td>
  </tr>
  <tr>
    <td class="bold">Nº unidades/salas:</td>
    <td>${xmlEsc(estab.numero_unidades_salas)}</td>
    <td class="bold">Área construída:</td>
    <td>${xmlEsc(estab.area_construida)} m²</td>
    <td class="bold">Área do terreno:</td>
    <td>${xmlEsc(estab.area_terreno)} m²</td>
  </tr>
  <tr>
    <td class="bold" colspan="1">Síntese da descrição da edificação (Convenção ou Escritura):</td>
    <td colspan="5">${xmlEsc(complemento?.sinteseEdif)}</td>
  </tr>
</table>

<table>
  <tr><td colspan="2" class="th-azul">Localização ${tipoServico==='43'?'do Imóvel':'da Edificação'}</td></tr>
  <tr>
    <td style="width:50%"><div class="img-placeholder">[CROQUI MAPS — colar após baixar o documento]</div></td>
    <td style="width:50%"><div class="img-placeholder">[FOTO DA FACHADA PRINCIPAL — inserir pelo responsável técnico]</div></td>
  </tr>
</table>

<h2>1.2.- Objetivo.</h2>
<p>${tipoServico==='44'
  ? 'Avaliar o estado de conservação e aderência dos revestimentos com verificação da estanqueidade, segurança e durabilidade para identificar manifestações que possam causar desprendimentos ou infiltrações, visando prevenir acidentes, garantir desempenho e vida útil e subsidiar a manutenção e a reabilitação das fachadas.'
  : tipoServico==='43'
  ? 'Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção do imóvel, verificando a aderência ao projeto e às normas técnicas, identificar vícios aparentes e não conformidades, e avaliar o desempenho mínimo exigido pela NBR 15.575/Série (Desempenho).'
  : 'Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção da edificação, de acordo com os critérios da ABNT NBR 16.747/2020, normas correlatas, legislação vigente e metodologia apresentada neste documento.'
}</p>

<h2>1.3.- Plano de Trabalho.</h2>
<p>As etapas básicas desenvolvidas para a realização do presente trabalho de Inspeção Predial constam na tabela que segue:</p>
${planoHtml}

<h2>1.4.- Condições e limitações.</h2>
<p>O ${titulo} segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:</p>
<ul>
  <li>Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;</li>
  <li>O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para contratação dos serviços de manutenção;</li>
  <li>O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos. Foram observadas apenas condições externas que, eventualmente, possam influenciar o desempenho, a segurança ou a manutenção da edificação.</li>
</ul>
</div>

<!-- ═══ 2. METODOLOGIA ═══════════════════════════════════════════════════════ -->
<div class="quebra">
<h1>2.- Metodologia adotada para o Trabalho${tipoServico==='41'?' de Autovistoria':tipoServico==='42'?' de Inspeção Predial':''}.</h1>
${METODOLOGIA[tipoServico]??METODOLOGIA_41}
</div>

<!-- ═══ 3. RESULTADO DA VISTORIA ════════════════════════════════════════════ -->
<div class="quebra">
<h1>3.- Resultado da Vistoria Técnica e Classificação da Edificação.</h1>

<h2>3.1.- Descrição da Vistoria Técnica.</h2>
<table>
  <tr><td class="th-azul">Descrição da Realização da Vistoria — Nível da Inspeção: ${xmlEsc(nivel)||'—'}</td></tr>
  <tr><td style="min-height:50pt">${xmlEsc(complemento?.descVistoria || complemento?.dadosVistoria)}</td></tr>
</table>
<p>Os sistemas construtivos e instalações vistoriadas, com as condições observadas e as respectivas recomendações são apresentadas nos Relatórios de Não Conformidades, item 4 deste documento.</p>

<h2>3.2.- Resultado da Vistoria.</h2>
<p>O resultado da vistoria, imagens dos formulários da coleta de dados, é apresentado no <strong>Anexo 2</strong> deste documento e apresenta, fielmente, dados, informações e fotos coletadas durante a realização da vistoria.</p>

<h2>3.3.- Resultado da Classificação da Edificação.</h2>
<p>O resultado da classificação da edificação quanto ao nível de inspeção, grau de risco, desempenho, manutenção e uso foi efetuada seguindo a metodologia apresentada para execução deste trabalho.</p>
${tabela33}
</div>

<!-- ═══ 4. NÃO CONFORMIDADES ════════════════════════════════════════════════ -->
<div class="quebra">
<h1>4.- Relação de Não Conformidades e Análise das Manifestações Patológicas.</h1>

<h2>4.1.- Relação de Não Conformidades e Soluções.</h2>
<p>Neste item é apresentado, de forma clara e concisa, o conjunto de manifestações patológicas identificadas na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria. Na tabela constam as prioridades para manutenção e soluções para retificação dos problemas identificados.</p>
<p>Salientamos a importância de documentar as manutenções corretivas realizadas, indicando a solução aplicada, local, data e responsável técnico pela execução.</p>
<p>A prioridade para manutenção de cada uma das não conformidades foi obtida pelo grau de risco (0 a 100), calculado com base nos parâmetros: gravidade, urgência, tendência e exposição ao risco. Critério adotado: grau de risco superior a 64 pontos — prioridade <strong>ALTA</strong>; entre 35 e 64 pontos — prioridade <strong>MÉDIA</strong>; inferior a 35 pontos — prioridade <strong>BAIXA</strong>.</p>
${tabela41 || '<p><em>Nenhuma não conformidade registrada.</em></p>'}

<h2>4.2.- Análise Estatística das Manifestações Patológicas.</h2>
<p>A tabela que segue apresenta a estatística de ocorrências de manifestações patológicas por sistemas construtivos e prioridades.</p>
${tabela42}
</div>

<!-- ═══ 5. RECOMENDAÇÕES ═════════════════════════════════════════════════════ -->
<div class="quebra">
<h1>5.- Recomendações sobre a Manutenção, Uso, Sustentabilidade e Gerais.</h1>
<p>No decorrer do processo foi efetuada a análise da documentação, a vistoria na edificação, a classificação da edificação e das anomalias e falhas identificadas, o que possibilitou uma completa avaliação dos sistemas construtivos da edificação. A seguir estão registradas as recomendações para a manutenção, o uso, a sustentabilidade e outras consideradas pertinentes.</p>
${tabela5}
</div>

<!-- ═══ 6. CONCLUSÃO ═════════════════════════════════════════════════════════ -->
<div class="quebra">
<h1>6.- Conclusão.</h1>
<p>Diante do exposto neste documento, e após analisados todos os fatos observados que interferem ou possam vir a interferir com o assunto objeto deste laudo, concluímos:</p>
<ul>
  <li>A vistoria proporcionou a constatação de que, considerando a idade da construção, o imóvel <strong>${totA > 0 ? 'apresenta anomalias que requerem intervenção imediata, devendo ser executadas as manutenções corretivas segundo as prioridades definidas neste laudo' : 'não apresenta nenhum dano aparente que represente ameaça à sua solidez, no que se refere ao aspecto estrutural e contenções, pois não foram verificadas manifestações patológicas que possam vir a comprometer a sua estabilidade'}</strong>.</li>
  <li>Verificou-se a <strong>${totT > 0 ? 'existência' : 'não existência'}</strong> de ${totT > 0 ? `${totT} manifestações patológicas distribuídas nos sistemas construtivos vistoriados, sendo ${totA} de prioridade Alta, ${totM} de prioridade Média e ${totB} de prioridade Baixa, as quais necessitam de intervenções corretivas a serem executadas segundo as prioridades definidas` : 'danos que possam comprometer a segurança da edificação'}.</li>
  ${tipoServico==='41'||tipoServico==='42' ? '<li>Com o intuito de melhor orientar futuras ações de manutenção e conservação do imóvel, recomendamos a execução de nova vistoria no prazo máximo de 5 anos, para reavaliar e atuar preventivamente na situação construtiva da edificação.</li>' : ''}
</ul>
<p><strong>Atenção:</strong> <em>O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio ou represente utilização dos direitos exclusivos do autor, sendo que sua violação acarretará as penalidades civis e criminais previstas no art. 184 do Código Penal Brasileiro e Lei nº 9.610.</em></p>
</div>

<!-- ═══ 7. ENCERRAMENTO ══════════════════════════════════════════════════════ -->
<div class="quebra">
<h1>7.- Encerramento.</h1>

<h2>7.1. Anexos:</h2>
<ul>
  <li>Anexo 1 — Relação de documentos solicitados e analisados;</li>
  <li>Anexo 2 — Resultado da Vistoria;</li>
  <li>Anexo 3 — Anotações de responsabilidade dos profissionais que atuaram nesta inspeção.</li>
</ul>

<h2>7.2.- Declaração de conformidade com o Código de Ética.</h2>
<p>O signatário atesta que a presente ${titulo} segue criteriosamente os seguintes princípios:</p>
<ul>
  <li>Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o Laudo;</li>
  <li>O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;</li>
  <li>O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros quanto às razões que motivaram a presente contratação, bem como aos resultados alcançados;</li>
  <li>Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA e do IBAPE — Instituto Brasileiro de Avaliações e Perícias de Engenharia.</li>
</ul>

<h2>7.3.- Termo de encerramento:</h2>
<p>O responsável técnico pela execução deste trabalho coloca-se ao inteiro dispor para esclarecimentos adicionais, caso necessários. O documento é entregue em mídia magnética.</p>

<div class="assin">
  <p>${xmlEsc(estab.cidade)}/${xmlEsc(estab.uf)}, ${dataHoje}</p>
  <br><br><br>
  <p>_______________________________________________</p>
  <p><strong>${xmlEsc(inspetor.nome_inspetor)}</strong> — Responsável Técnico</p>
  <p>${xmlEsc(inspetor.titulo_profissional)} — CREA/CAU - ${xmlEsc(inspetor.inscricao_crea_cau)}</p>
  ${inspetor.especializacao ? `<p>${xmlEsc(inspetor.especializacao)}</p>` : ''}
</div>
</div>

<!-- ═══ ANEXO 1 — DOCUMENTOS ════════════════════════════════════════════════ -->
<div class="quebra">
<h1>Anexo 1 — Relação de Documentos Solicitados e Avaliados</h1>
<table>
  <tr>
    <td colspan="3" class="th-azul">Documentação da Edificação Solicitada para Análise e Avaliação</td>
  </tr>
  <tr>
    <th class="th-cinza" style="width:60%">Documentos</th>
    <th class="th-cinza centro" style="width:20%">Situação</th>
    <th class="th-cinza" style="width:20%">Observações</th>
  </tr>
  ${DOCS_ANEXO1.map(d => `<tr><td>${d}</td><td class="centro">—</td><td></td></tr>`).join('')}
</table>
<p style="font-size:8pt;margin-top:4pt"><em>Situação: Entregue; Pendente; Desnecessário — Resultado: Conforme; Não conforme; Não se aplica</em></p>
</div>

<!-- ═══ ANEXO 2 — RESULTADO DA VISTORIA ════════════════════════════════════ -->
<div class="quebra">
<h1>Anexo 2 — Resultado da Vistoria</h1>
${anexo2 || '<p><em>Nenhum formulário de vistoria disponível.</em></p>'}
</div>

<!-- ═══ ANEXO 3 — ART/RRT ═══════════════════════════════════════════════════ -->
<div class="quebra">
<h1>Anexo 3 — Anotações de Responsabilidade Técnica</h1>
<p>Inserir neste espaço a ART (Anotação de Responsabilidade Técnica) ou RRT (Registro de Responsabilidade Técnica) devidamente registrada no CREA ou CAU, relativa à execução deste trabalho de ${titulo}.</p>
<div class="img-placeholder" style="min-height:300pt">[ART/RRT — a ser inserida pelo responsável técnico após baixar o documento editável]</div>
</div>

</body>
</html>`

    // ── Salvar HTML no storage ───────────────────────────────────────────────
    const { error } = await supabase.storage
      .from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, Buffer.from(html, 'utf-8'), {
        contentType: 'text/html', upsert: true,
      })
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // ── Salvar dados estruturados JSON (para geração do DOCX profissional) ──
    const dadosJson = JSON.stringify({
      cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
      estab, inspetor, ncs, complemento
    })
    const nomeJson = nomeArquivo.replace(/\.html$/i, '_dados.json')
    await supabase.storage.from('aime')
      .upload(`documentos_inspetor/${nomeJson}`, Buffer.from(dadosJson, 'utf-8'), {
        contentType: 'application/json', upsert: true,
      })

    return NextResponse.json({ ok: true, nomeArquivo })

  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
