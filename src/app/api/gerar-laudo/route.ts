// src/app/api/gerar-laudo/route.ts
// AIMÊ — Gera o HTML do Laudo Técnico (41-44) e salva em documentos_inspetor

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Sistemas por tipo de laudo ───────────────────────────────────────────────
const SISTEMAS: Record<string, string[]> = {
  '41': ['01_Sistema Estrutural','02_Fachadas, Empenas e Marquises','03_Cobertura e Telhados','04_Instalações Hidrossanitárias','05_Instalações Elétricas e SPDA','06_Instalações de Gás','07_Sistema de Prevenção e Combate a Incêndio','08_Elevadores e Equipamentos Eletromecânicos','09_Impermeabilização','10_Acessibilidade','11_Contenção de Encostas e Arrimos','12_Áreas Comuns e Infraestrutura','13_Documentação e Conformidade Legal'],
  '42': ['01_Estrutura','02_Vedações Verticais','03_Cobertura','04_Revestimentos','05_Impermeabilização','06_Esquadrias','07_Instalações Hidrossanitárias','08_Instalações Elétricas','09_Instalações de Gás','10_Instalações Ar Condicionado / HVAC','11_Fachadas','12_Proteção e Combate a Incêndio','13_Acessibilidade','14_Áreas Comuns e Infraestrutura'],
  '43': ['01_Sistema Estrutural','02_Sistema de Pisos','03_Vedações Verticais','04_Sistema de Cobertura','05_Instalações Hidrossanitárias','06_Instalações Elétricas','07_Esquadrias e Vidros','08_Revestimentos e Acabamentos','09_Impermeabilização','10_Fachadas','11_Proteção Contra Incêndio','12_Acessibilidade'],
  '44': ['01_Revestimento Argamassado (SPFE)','02_Revestimento Cerâmico de Fachada (APFE)','03_Revestimento em Pastilhas','04_Fachada Ventilada','05_Pintura de Fachada (SBCE / Textura)','06_EIFS / Reboco Sintético','07_Esquadrias e Juntas de Fachada','08_Peitoris, Pingadeiras e Rufos','09_Impermeabilização de Fachada','10_Estrutura de Fachada e Vedação','11_Segurança Contra Incêndio em Fachadas','12_Manutenção e Equipamentos de Acesso'],
}

const TITULO: Record<string, string> = {
  '41': 'Laudo de Autovistoria',
  '42': 'Laudo de Inspeção Predial',
  '43': 'Laudo de Imóvel Novo',
  '44': 'Laudo de Inspeção de Fachada',
}

const NORMA: Record<string, string> = {
  '41': 'ABNT/NBR 16.747/2020 e Norma de Inspeção Predial do IBAPE/2025',
  '42': 'ABNT/NBR 16.747/2020 e Norma de Inspeção Predial do IBAPE/2025',
  '43': 'NBR 15.575 (Série), NBR 16.747 e Norma de Inspeção Predial do IBAPE/2025',
  '44': 'NBR 13.755, NBR 16.747 e normas complementares',
}

const LABEL_EST: Record<string, string> = {
  '41': 'Condomínio', '42': 'Condomínio', '43': 'Proprietário', '44': 'Condomínio'
}

const LABEL_DOC: Record<string, string> = {
  '41': 'CNPJ', '42': 'CNPJ', '43': 'CPF', '44': 'CNPJ'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

function fmtCNPJ(v: string) {
  const n = v.replace(/\D/g, '')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}

function prioLabel(p: string) {
  if (p === 'Alta') return '<span style="color:#DC2626;font-weight:bold">Alta</span>'
  if (p === 'Média') return '<span style="color:#D97706;font-weight:bold">Média</span>'
  return '<span style="color:#059669">Baixa</span>'
}

// ─── Gerar recomendação por sistema via IA ────────────────────────────────────
async function gerarRecSistema(sistema: string, ncs: any[]): Promise<string> {
  try {
    const ncsTexto = ncs.map(nc => `Anomalia: ${nc.anomalia} | Local: ${nc.local} | GR: ${nc.grauRisco}`).join('\n')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content:
          `Engenheiro civil em inspeção predial. Recomendação técnica para o sistema ${sistema}.\nNCs:\n${ncsTexto}\nMáx 400 chars. Texto corrido. Baseie-se APENAS nas NCs listadas.`
        }]
      })
    })
    const data = await response.json()
    return data.content?.[0]?.text?.trim() ?? 'Ver NCs relacionadas no item 4.1.'
  } catch {
    return 'Ver NCs relacionadas no item 4.1.'
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
      estab, inspetor, ncs, nomeArquivo, complemento
    } = body

    if (!cpfInspetor || !tipoServico || !nomeArquivo) {
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })
    }

    const titulo   = TITULO[tipoServico]    ?? 'Laudo Técnico'
    const norma    = NORMA[tipoServico]     ?? ''
    const sistemas = SISTEMAS[tipoServico]  ?? []
    const labelEst = LABEL_EST[tipoServico] ?? 'Estabelecimento'
    const labelDoc = LABEL_DOC[tipoServico] ?? 'CNPJ'
    const hoje     = new Date()
    const dataHoje = fmtData(hoje.toISOString())

    // ── Agrupar NCs por sistema ──
    const ncsPorSistema: Record<string, any[]> = {}
    for (const s of sistemas) ncsPorSistema[s] = []
    for (const nc of (ncs ?? [])) {
      const sSistema = sistemas.find(s => nc.sistema?.includes(s.split('_')[1]?.substring(0,5) ?? '')) ?? nc.sistema
      if (ncsPorSistema[sSistema]) ncsPorSistema[sSistema].push(nc)
      else ncsPorSistema[nc.sistema] = [...(ncsPorSistema[nc.sistema] ?? []), nc]
    }

    // ── Gerar recomendações por sistema via IA (paralelo) ──
    const recsPromises: Record<string, Promise<string>> = {}
    for (const s of sistemas) {
      const ncsS = (ncs ?? []).filter((nc: any) => nc.sistema === s)
      if (ncsS.length > 0) recsPromises[s] = gerarRecSistema(s, ncsS)
    }
    const recsSistema: Record<string, string> = {}
    for (const [s, p] of Object.entries(recsPromises)) {
      recsSistema[s] = await p
    }

    // ── Estatística por sistema ──
    const stat = sistemas.map(s => {
      const ncsS = (ncs ?? []).filter((nc: any) => nc.sistema === s)
      return {
        sistema: s,
        alta:  ncsS.filter((nc: any) => nc.prioridade === 'Alta').length,
        media: ncsS.filter((nc: any) => nc.prioridade === 'Média').length,
        baixa: ncsS.filter((nc: any) => nc.prioridade === 'Baixa').length,
        total: ncsS.length,
      }
    })
    const totA = stat.reduce((a, s) => a + s.alta, 0)
    const totM = stat.reduce((a, s) => a + s.media, 0)
    const totB = stat.reduce((a, s) => a + s.baixa, 0)

    // ── Classificação 3.3 ──
    const cl = complemento?.classificacao ?? {}

    // ── HTML do laudo ──────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #111; padding: 2cm 2cm 2cm 2.5cm; }
  h1 { font-size: 12pt; color: #1E3A8A; margin: 16pt 0 6pt; border-bottom: 2px solid #1E3A8A; padding-bottom: 3pt; }
  h2 { font-size: 11pt; color: #1E3A8A; margin: 12pt 0 4pt; }
  h3 { font-size: 10pt; color: #1E3A8A; margin: 8pt 0 3pt; }
  p { margin: 4pt 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 9pt; }
  th { background: #1E3A8A; color: white; padding: 4pt 6pt; text-align: left; font-size: 9pt; }
  td { border: 1px solid #CBD5E1; padding: 3pt 6pt; vertical-align: top; }
  tr:nth-child(even) td { background: #F8FAFC; }
  .cab { background: #1E3A8A; color: white; padding: 6pt 10pt; font-weight: bold; margin-bottom: 2pt; }
  .placeholder { background: #FFF9E6; border: 1px dashed #F59E0B; padding: 8pt; text-align: center; color: #92400E; font-style: italic; min-height: 80pt; display: flex; align-items: center; justify-content: center; }
  .classif td:first-child { font-weight: bold; width: 60%; }
  .classif td:last-child { color: #1E3A8A; font-weight: bold; }
  .alta { color: #DC2626; font-weight: bold; }
  .media { color: #D97706; font-weight: bold; }
  .baixa { color: #059669; }
  .assinatura { margin-top: 32pt; text-align: center; }
  .rodape { margin-top: 16pt; padding-top: 4pt; border-top: 1px solid #CBD5E1; text-align: center; font-size: 8pt; color: #6B7280; }
  .quebra { page-break-before: always; }
  ul { margin: 4pt 0 4pt 16pt; }
  li { margin: 2pt 0; }
</style>
</head>
<body>

<!-- ─── CAPA ─────────────────────────────────────────────────────────────── -->
<div style="text-align:center;margin-bottom:32pt">
  <p style="font-size:14pt;font-weight:bold;color:#1E3A8A">MAPEAMENTO INTELIGENTE DE EDIFICAÇÕES E EQUIPAMENTOS</p>
  <p style="font-size:11pt;color:#374151;margin-top:4pt">${titulo}</p>
  <p style="font-size:10pt;color:#6B7280;margin-top:2pt">${dataHoje}</p>
</div>

<!-- ─── 1. CONSIDERAÇÕES PRELIMINARES ────────────────────────────────────── -->
<h1>1.- Considerações Preliminares.</h1>
<p>${titulo === 'Laudo de Autovistoria'
  ? `Este Laudo de Autovistoria é o documento completo resultante do trabalho executado na vistoria da edificação, análise, classificação e priorização das manifestações patológicas, conforme exigências da <em>ABNT/NBR 16.747/2020</em>, recomendações da <em>Norma de Inspeção Predial do IBAPE de 2025</em> e legislação vigente.`
  : titulo === 'Laudo de Inspeção Predial'
  ? `Este Laudo de Inspeção Predial é o documento completo resultante do trabalho executado pela inspeção da edificação, pela vistoria, análise, classificação e priorização das manifestações patológicas, contendo todos os itens exigidos na <em>ABNT/NBR 16.747/2020</em>, e também segue as recomendações da <em>Norma de Inspeção Predial do IBAPE de 2025</em> e a legislação vigente.`
  : titulo === 'Laudo de Imóvel Novo'
  ? `Este Laudo de Imóvel Novo é o documento completo resultante do trabalho executado pela inspeção na unidade, análise, classificação e priorização das anomalias e falhas, conforme exigências da <em>NBR 15.575</em> e <em>NBR 16.747</em>, <em>Norma de Inspeção Predial do IBAPE de 2025</em> e demais legislações aplicáveis.`
  : `Este Laudo de Inspeção em Fachada é o documento completo resultante do trabalho executado pela inspeção das fachadas da edificação, pela vistoria, análise, classificação e priorização das manifestações patológicas, conforme exigências da <em>NBR 13.755</em>, <em>NBR 16.747</em>, normas complementares e legislação aplicável.`
}</p>
<p style="margin-top:6pt">A inspeção apresentada neste laudo é o resultado de um exame "clínico geral" que avalia as condições globais do objeto em estudo e detecta a existência de problemas de conservação ou funcionamento, com base em uma análise fundamentalmente sensorial e efetuada por um profissional habilitado.</p>
<p style="margin-top:6pt">A documentação da edificação solicitada pelo inspetor na reunião inicial foi analisada e avaliada, e o resultado fica registrado na planilha apresentada no Anexo 1 deste laudo.</p>

<h2>1.1.- Características e localização ${tipoServico === '43' ? 'do Imóvel' : 'da Edificação'}.</h2>
<table>
  <tr><td colspan="6" class="cab">Características ${tipoServico === '43' ? 'do Imóvel' : 'da Edificação'}</td></tr>
  <tr>
    <td colspan="2"><strong>${labelEst}:</strong><br>${estab.razao_social_nome ?? ''}</td>
    <td><strong>${labelDoc}:</strong><br>${fmtCNPJ(cnpjoucpf)}</td>
    <td><strong>CEP:</strong><br>${estab.cep ?? ''}</td>
    <td colspan="2"></td>
  </tr>
  <tr>
    <td colspan="3"><strong>Endereço:</strong><br>${estab.logradouro ?? ''}, ${estab.numero ?? ''} ${estab.complemento ?? ''}</td>
    <td colspan="2"><strong>Bairro:</strong><br>${estab.bairro ?? ''}</td>
    <td><strong>Cidade/UF:</strong><br>${estab.cidade ?? ''}/${estab.uf ?? ''}</td>
  </tr>
  <tr>
    <td colspan="2"><strong>Nome do responsável:</strong><br>${estab.nome_responsavel ?? ''}</td>
    <td colspan="2"><strong>Função:</strong><br>${estab.funcao_responsavel ?? ''}</td>
    <td><strong>WhatsApp:</strong><br>${estab.whatsapp ?? ''}</td>
    <td><strong>E-mail:</strong><br>${estab.email ?? ''}</td>
  </tr>
  <tr>
    <td colspan="3"><strong>Finalidade da vistoria:</strong><br>${estab.finalidade_vistoria ?? 'Conforme contrato de prestação de serviços'}</td>
    <td colspan="3"></td>
  </tr>
  <tr>
    <td><strong>Uso imóvel:</strong><br>${estab.uso_imovel ?? ''}</td>
    <td><strong>Tipo imóvel:</strong><br>${estab.tipo_imovel ?? ''}</td>
    <td><strong>Nº pavimentos:</strong><br>${estab.numero_pavimentos ?? ''}</td>
    <td><strong>Nº unidades/salas:</strong><br>${estab.numero_unidades_salas ?? ''}</td>
    <td><strong>Área construída:</strong><br>${estab.area_construida ?? ''} m²</td>
    <td><strong>Área terreno:</strong><br>${estab.area_terreno ?? ''} m²</td>
  </tr>
  <tr>
    <td colspan="6"><strong>Síntese da descrição ${tipoServico === '43' ? 'do imóvel' : 'da edificação'}:</strong><br><br>${complemento?.sinteseEdif ?? ''}<br>&nbsp;</td>
  </tr>
</table>

<table style="margin-top:8pt">
  <tr><td colspan="2" class="cab">Localização ${tipoServico === '43' ? 'do Imóvel' : 'da Edificação'}</td></tr>
  <tr>
    <td style="width:50%;min-height:120pt"><div class="placeholder">[CROQUI MAPS — Colar após baixar o documento]</div></td>
    <td style="width:50%;min-height:120pt"><div class="placeholder">[FOTO DA FACHADA PRINCIPAL — Inserir pelo inspetor]</div></td>
  </tr>
</table>

<h2>1.2.- Objetivo.</h2>
<p>${tipoServico === '41' ? 'Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção da edificação, de acordo com os critérios da ABNT NBR 16.747/2020, normas correlatas, legislação vigente e metodologia apresentada neste documento.'
  : tipoServico === '42' ? 'Avaliar as condições de segurança, funcionalidade, habitabilidade, manutenção e uso da edificação, de acordo com os critérios da ABNT NBR 16.747/2020, normas correlatas e metodologia apresentada neste documento.'
  : tipoServico === '43' ? 'Avaliar as condições de segurança, funcionalidade, habitabilidade e manutenção do imóvel, verificando a aderência ao projeto e às normas técnicas, identificar vícios aparentes e não conformidades, e avaliar o desempenho mínimo exigido pela NBR 15.575/Série (Desempenho).'
  : 'Avaliar o estado de conservação e aderência dos revestimentos com verificação da estanqueidade, segurança e durabilidade para identificar manifestações que possam causar desprendimentos ou infiltrações, visando prevenir acidentes, garantir desempenho e vida útil e subsidiar a manutenção e a reabilitação das fachadas.'
}</p>

<h2>1.3.- Plano de Trabalho.</h2>
<p><em>[Plano de trabalho conforme documento gerado no módulo 2x — extrair da versão homologada.]</em></p>

<h2>1.4.- Condições e limitações.</h2>
<p>O ${titulo} segue as condições abaixo relacionadas, além de estar sujeito às seguintes limitações:</p>
<ul>
  <li>Neste trabalho computamos como corretos os elementos documentais consultados e as informações prestadas por terceiros, de boa fé e confiáveis;</li>
  <li>O trabalho apresentado e o resultado final são válidos apenas para a sequência metodológica apresentada, sendo vedada a utilização deste laudo em conexão com qualquer outro trabalho, exceto como referência para contratação dos serviços de manutenção;</li>
  <li>O responsável técnico não assume responsabilidade sobre matéria alheia ao exercício profissional, estabelecido em leis, códigos e regulamentos. Foram observadas apenas condições externas que, eventualmente, possam influenciar o desempenho, a segurança ou a manutenção da edificação, sem caracterizar análise do poder público ou de serviços urbanos.</li>
</ul>

<!-- ─── 2. METODOLOGIA ────────────────────────────────────────────────────── -->
<h1 class="quebra">2.- Metodologia adotada para o desenvolvimento do Trabalho.</h1>
${tipoServico === '41' ? `
<p>A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação estadual e municipal que regulamentam a autovistoria.</p>
<h2>2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.</h2>
<p>A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos) da Associação Brasileira de Normas Técnicas — ABNT.</p>
<h2>2.2.- Norma de Inspeção Predial do IBAPE — 2025.</h2>
<p>Complementarmente à NBR 16.747/2020, este trabalho também segue as recomendações da Norma de Inspeção Predial do IBAPE/2025.</p>
<h2>2.3.- Critérios adotados.</h2>
<p>Os critérios adotados para classificação das não conformidades e prioridades seguem a metodologia GUT adaptada (Gravidade, Urgência e Tendência).</p>
` : tipoServico === '42' ? `
<p>A metodologia adotada para este trabalho segue as normas da ABNT, IBAPE e legislação vigente.</p>
<h2>2.1.- Norma Brasileira para Inspeção Predial — NBR-16.747/2020.</h2>
<p>A metodologia básica para execução do presente trabalho foi pautada nos requisitos constantes da NBR-16.747/2020 (Inspeção Predial — Diretrizes, Conceitos, Terminologia e Procedimentos).</p>
<h2>2.2.- Norma de Inspeção Predial do IBAPE — 2025.</h2>
<p>Complementarmente à NBR 16.747/2020, este trabalho também segue as recomendações da Norma de Inspeção Predial do IBAPE/2025.</p>
<h2>2.3.- Critérios adotados.</h2>
<p>Os critérios adotados para classificação das não conformidades e prioridades seguem a metodologia GUT adaptada (Gravidade, Urgência e Tendência).</p>
` : tipoServico === '43' ? `
<h2>2.1.- Base normativa e legal aplicável.</h2>
<p>Norma principal: ABNT NBR 15575 (Série) — Edificações Habitacionais — Desempenho. Normas complementares: NBR 16.747, NBR 5674, NBR 16.280, NBR 14.037, NBR 13.752, Código Civil Brasileiro (arts. 618 e 445) e Código de Defesa do Consumidor (CDC).</p>
<h2>2.2.- Escopo técnico da vistoria.</h2>
<p>A vistoria abrange os sistemas construtivos: estrutura, vedações, revestimentos, esquadrias, hidrossanitário, elétrico, impermeabilização, áreas externas, segurança e uso.</p>
<h2>2.3.- Metodologia.</h2>
<p>O método empregado consiste em verificar e analisar a documentação do imóvel, obter informações com o responsável pela edificação, vistoriar sistematicamente todos os sistemas construtivos e elaborar o laudo com classificação e priorização das não conformidades.</p>
` : `
<h2>2.1.- Base normativa e legal aplicável.</h2>
<p>Norma principal: NBR 13.755 — Revestimento cerâmico de fachadas e paredes externas com placas cerâmicas e uso de argamassa colante. Normas complementares: NBR 13.749, NBR 16.747, NBR 15.575, NBR 5.674, NBR 7.200, NBR 14.081, Código Civil (arts. 618 e 445) e Código de Defesa do Consumidor (CDC).</p>
<h2>2.2.- Critérios adotados.</h2>
<p>Os critérios adotados para avaliação das fachadas seguem as normas técnicas aplicáveis, com classificação das anomalias por sistema e prioridade de intervenção conforme metodologia GUT adaptada.</p>
`}

<!-- ─── 3. RESULTADO DA VISTORIA ──────────────────────────────────────────── -->
<h1 class="quebra">3.- Resultado da Vistoria Técnica e Classificação da Edificação.</h1>

<h2>3.1.- Descrição da Vistoria Técnica.</h2>
<table>
  <tr><th>Descrição da Realização da Vistoria</th></tr>
  <tr><td style="min-height:60pt">${complemento?.descVistoria ?? ''}</td></tr>
</table>
<p style="margin-top:6pt">Os sistemas construtivos e instalações vistoriadas, com as condições observadas e as respectivas recomendações são apresentadas nos Relatórios de Não Conformidades, item 4 deste documento.</p>

<h2>3.2.- Resultado da Vistoria.</h2>
<p>O resultado da vistoria, imagens dos formulários da coleta de dados, é apresentado no <strong>Anexo 2</strong> deste documento e apresenta, fielmente, dados, informações e fotos coletadas durante a realização da vistoria.</p>

<h2>3.3.- Resultado da Classificação da Edificação.</h2>
<table class="classif">
  <tr><td colspan="2" class="cab">Resultado da Classificação da Edificação.</td></tr>
  <tr><td>a) Quanto ao <strong>NÍVEL</strong> da inspeção efetuada o imóvel em questão foi classificado como <strong>INSPEÇÃO PREDIAL NÍVEL:</strong></td><td>${cl.nivel ?? ''}</td></tr>
  <tr><td>b) Quando ao <strong>GRAU DE RISCO</strong> o imóvel em questão encontra-se classificado como de <strong>RISCO:</strong></td><td>${cl.risco ?? ''}</td></tr>
  <tr><td>c) Quanto ao <strong>DESEMPENHO</strong> a classificação geral do imóvel foi classificada como de <strong>DESEMPENHO:</strong></td><td>${cl.desempenho ?? ''}</td></tr>
  <tr><td>d) Quanto a <strong>QUALIDADE DA MANUTENÇÃO</strong> a edificação foi classificada como QUALIDADE QUE:</td><td>${cl.manut ?? ''}</td></tr>
  <tr><td>e) Quanto as <strong>CONDIÇÕES DE USO</strong> a edificação foi classificada como EDIFICAÇÃO DE USO:</td><td>${cl.uso ?? ''}</td></tr>
  <tr><td>f) Quanto ao <strong>DESEMPENHO GERAL</strong> a edificação foi classificada como:</td><td>${cl.desempGeral ?? ''}</td></tr>
</table>

<!-- ─── 4. NÃO CONFORMIDADES ─────────────────────────────────────────────── -->
<h1 class="quebra">4.- Relação de Não Conformidades e Análise das Manifestações Patológicas.</h1>

<h2>4.1.- Relação de Não Conformidades e Soluções.</h2>
<p>Neste item é apresentado, de forma clara e concisa, o conjunto de manifestações patológicas identificadas na vistoria, suas localizações e o número da foto no respectivo formulário de vistoria.</p>

${sistemas.map(s => {
  const ncsS = (ncs ?? []).filter((nc: any) => nc.sistema === s)
  if (ncsS.length === 0) return ''
  const rec = recsSistema[s] ?? ''
  return `
<h3 style="margin-top:10pt">${s.replace(/_/g,' ')}</h3>
<table>
  <tr>
    <th style="width:25%">Subsistema</th>
    <th style="width:28%">Anomalia / Não conformidade</th>
    <th style="width:15%">Local</th>
    <th style="width:8%;text-align:center">GR</th>
    <th style="width:10%;text-align:center">Prioridade</th>
    <th style="width:6%;text-align:center">Foto</th>
    <th style="width:8%;text-align:center">Solução</th>
  </tr>
  ${ncsS.map((nc: any) => `
  <tr>
    <td>${nc.subsistema ?? ''}</td>
    <td>${nc.anomalia ?? ''}</td>
    <td>${nc.local ?? ''}${nc.complemento ? '<br><em>' + nc.complemento + '</em>' : ''}</td>
    <td style="text-align:center">${nc.grauRisco ?? ''}</td>
    <td style="text-align:center">${prioLabel(nc.prioridade)}</td>
    <td style="text-align:center">${nc.fotoNr ?? ''}</td>
    <td style="text-align:center">Ver NC</td>
  </tr>`).join('')}
  ${rec ? `<tr><td colspan="7" style="background:#F0F4FF;font-style:italic;font-size:8.5pt"><strong>Recomendação técnica para o sistema:</strong> ${rec}</td></tr>` : ''}
</table>`
}).join('')}

<h2>4.2.- Análise Estatística das Manifestações Patológicas.</h2>
<table>
  <tr>
    <th style="width:50%">Sistema Construtivo</th>
    <th style="width:12%;text-align:center" class="alta">Alta (A)</th>
    <th style="width:12%;text-align:center" class="media">Média (M)</th>
    <th style="width:12%;text-align:center" class="baixa">Baixa (B)</th>
    <th style="width:14%;text-align:center">Total</th>
  </tr>
  ${stat.map(s => `
  <tr>
    <td>${s.sistema.replace(/_/g,' ')}</td>
    <td style="text-align:center${s.alta > 0 ? ';color:#DC2626;font-weight:bold' : ''}">${s.alta > 0 ? s.alta : '—'}</td>
    <td style="text-align:center${s.media > 0 ? ';color:#D97706;font-weight:bold' : ''}">${s.media > 0 ? s.media : '—'}</td>
    <td style="text-align:center${s.baixa > 0 ? ';color:#059669' : ''}">${s.baixa > 0 ? s.baixa : '—'}</td>
    <td style="text-align:center;font-weight:bold">${s.total > 0 ? s.total : '—'}</td>
  </tr>`).join('')}
  <tr style="background:#1E3A8A;color:white;font-weight:bold">
    <td>TOTAL DE OCORRÊNCIAS</td>
    <td style="text-align:center">${totA}</td>
    <td style="text-align:center">${totM}</td>
    <td style="text-align:center">${totB}</td>
    <td style="text-align:center">${totA + totM + totB}</td>
  </tr>
  <tr><td colspan="5" style="font-size:8pt;font-style:italic">A = Alta &nbsp;|&nbsp; M = Média &nbsp;|&nbsp; B = Baixa</td></tr>
</table>

<!-- ─── 5. RECOMENDAÇÕES ──────────────────────────────────────────────────── -->
<h1 class="quebra">5.- Recomendações${tipoServico !== '44' ? ' sobre a Manutenção, Uso, Sustentabilidade e Gerais' : ' Gerais'}.</h1>
<p>${tipoServico !== '44'
  ? 'No decorrer do processo foi efetuada a análise da documentação, a vistoria na edificação, a classificação da edificação e das anomalias e falhas identificadas, o que possibilitou uma completa avaliação dos sistemas construtivos da edificação. A seguir estão registradas as recomendações para a manutenção, o uso, a sustentabilidade e outras consideradas pertinentes.'
  : 'No decorrer do processo de inspeção foi efetuada a análise da documentação, a vistoria na fachada e a classificação das anomalias e falhas, o que possibilitou uma completa avaliação das fachadas.'
}</p>
<table>
  <tr><th>Item</th><th>Recomendações</th></tr>
  <tr><td style="width:30%;font-weight:bold">5.1.- Avaliação e recomendações da manutenção.</td><td>${complemento?.rec51 ?? ''}</td></tr>
  <tr><td style="font-weight:bold">5.2.- Avaliação e recomendações do uso da edificação.</td><td>${complemento?.rec52 ?? ''}</td></tr>
  <tr><td style="font-weight:bold">5.3.- Avaliação e recomendações da sustentabilidade.</td><td>${complemento?.rec53 ?? ''}</td></tr>
  <tr><td style="font-weight:bold">5.4.- Outras avaliações e recomendações.</td><td>${complemento?.rec54 ?? ''}</td></tr>
</table>

<!-- ─── 6. CONCLUSÃO ──────────────────────────────────────────────────────── -->
<h1 class="quebra">6.- Conclusão.</h1>
<p>Diante do exposto neste documento, e após analisados todos os fatos observados que interferem ou possam vir a interferir com o assunto objeto deste laudo, concluímos:</p>
<ul>
  <li>A vistoria proporcionou a constatação de que, considerando a idade da construção, o imóvel <strong>${totA > 0 ? 'apresenta anomalias que requerem intervenção imediata' : 'não apresenta nenhum dano aparente que represente ameaça à sua solidez, no que se refere ao aspecto estrutural'}</strong>.</li>
  <li>Verificou-se a <strong>${(ncs?.length ?? 0) > 0 ? 'existência' : 'não existência'}</strong> de ${(ncs?.length ?? 0) > 0 ? 'diversas anomalias como documentado neste laudo, as quais necessitam de intervenções corretivas a serem executadas segundo as prioridades definidas' : 'danos que possam comprometer a segurança da edificação'}.</li>
  ${tipoServico === '41' || tipoServico === '42' ? '<li>Com o intuito de melhor orientar futuras ações de manutenção e conservação do imóvel, recomendamos a execução de nova vistoria no prazo máximo de 5 anos, para reavaliar e atuar preventivamente na situação construtiva da edificação.</li>' : ''}
</ul>

<!-- ─── 7. ENCERRAMENTO ───────────────────────────────────────────────────── -->
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
  <li>Os itens deste trabalho foram revisados pessoalmente pelo responsável técnico que elaborou o presente laudo;</li>
  <li>O responsável técnico não possui no presente, nem contempla para o futuro, interesse nos bens envolvidos neste trabalho;</li>
  <li>O trabalho encontra-se abrigado por absoluta confidencialidade, sendo garantido o sigilo perante terceiros quanto às razões que motivaram a presente contratação, bem como aos resultados alcançados;</li>
  <li>Este trabalho foi elaborado em observância estrita aos princípios dos Códigos de Ética Profissional do CONFEA e do IBAPE.</li>
</ul>

<h2>7.3.- Termo de encerramento:</h2>
<p>O responsável técnico pela execução deste trabalho coloca-se ao inteiro dispor para esclarecimentos adicionais, caso necessários. O documento é entregue em mídia magnética.</p>
<p style="margin-top:6pt;font-style:italic;font-size:9pt"><strong>Atenção:</strong> O titular do direito autoral deste trabalho somente autoriza sua reprodução nos casos legais cabíveis, vedando sua cópia ou qualquer forma de reprodução que caracterize plágio ou represente utilização dos direitos exclusivos do autor.</p>

<div class="assinatura">
  <p>${estab.cidade ?? ''}/ES, ${dataHoje}</p>
  <br><br>
  <p>[Assinatura digital]</p>
  <p>___________________________________</p>
  <p><strong>${inspetor.nome_inspetor ?? ''}</strong> — Responsável Técnico</p>
  <p>${inspetor.titulo_profissional ?? ''} — CREA/CAU - ${inspetor.inscricao_crea_cau ?? ''}</p>
  ${inspetor.especializacao ? `<p>${inspetor.especializacao}</p>` : ''}
</div>

<div class="rodape">Mapeamento Inteligente de Edificações e Equipamentos — AIMÊ</div>

<!-- ─── ANEXO 1 ───────────────────────────────────────────────────────────── -->
<h1 class="quebra">Anexo 1 — Relação de Documentos Solicitados e Avaliados</h1>
<p><em>[Documentos conforme Plano de Trabalho homologado — extrair da versão salva em Documentos Inspetor.]</em></p>

<!-- ─── ANEXO 2 ───────────────────────────────────────────────────────────── -->
<h1 class="quebra">Anexo 2 — Resultado da Vistoria</h1>
${(ncs ?? []).sort((a: any, b: any) => (a.fotoNr ?? '').localeCompare(b.fotoNr ?? '')).map((nc: any) => `
<div style="border:1px solid #CBD5E1;border-radius:6px;padding:10pt;margin-bottom:12pt;page-break-inside:avoid">
  <table style="width:100%;margin-bottom:6pt">
    <tr>
      <td style="background:#1E3A8A;color:white;padding:3pt 6pt;font-weight:bold;width:25%">Foto Nº ${nc.fotoNr ?? ''}</td>
      <td style="background:#1E3A8A;color:white;padding:3pt 6pt;width:45%">Sistema: ${nc.sistema ?? ''}</td>
      <td style="background:#1E3A8A;color:white;padding:3pt 6pt;width:30%">Data: ${nc.dataVistoria ?? ''}</td>
    </tr>
  </table>
  <table style="width:100%;font-size:9pt">
    <tr><td style="width:20%;font-weight:bold">Subsistema:</td><td>${nc.subsistema ?? ''}</td><td style="width:20%;font-weight:bold">Local:</td><td>${nc.local ?? ''}</td></tr>
    <tr><td style="font-weight:bold">Anomalia:</td><td colspan="3">${nc.anomalia ?? ''}</td></tr>
    <tr><td style="font-weight:bold">Complemento:</td><td colspan="3">${nc.complemento ?? '—'}</td></tr>
    <tr><td style="font-weight:bold">GR:</td><td>${nc.grauRisco ?? ''}</td><td style="font-weight:bold">Prioridade:</td><td>${nc.prioridade ?? ''}</td></tr>
    <tr><td style="font-weight:bold">Descrição NC:</td><td colspan="3">${nc.nc ?? ''}</td></tr>
    <tr><td style="font-weight:bold">Causa provável:</td><td colspan="3">${nc.cp ?? ''}</td></tr>
  </table>
  ${nc.fotoBase64 ? `<div style="margin-top:6pt;text-align:center"><img src="${nc.fotoBase64}" style="max-width:100%;max-height:200pt;border:1px solid #CBD5E1"></div>` : `<div class="placeholder" style="margin-top:6pt">[Foto Nº ${nc.fotoNr} — disponível no arquivo original]</div>`}
</div>`).join('')}

<!-- ─── ANEXO 3 ───────────────────────────────────────────────────────────── -->
<h1 class="quebra">Anexo 3 — Anotações de Responsabilidade Técnica</h1>
<p><em>[ART/RRT a ser inserida pelo inspetor após baixar o documento.]</em></p>

</body>
</html>`

    // ── Salvar no storage ──────────────────────────────────────────────────────
    const { error: uploadError } = await supabase.storage
      .from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, Buffer.from(html, 'utf-8'), {
        contentType: 'text/html',
        upsert: true,
      })

    if (uploadError) return NextResponse.json({ erro: uploadError.message }, { status: 500 })

    return NextResponse.json({ ok: true, nomeArquivo })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
