// src/lib/termoAceite.ts
// AIMÊ — Termo de Aceite dos Serviços: texto ÚNICO, usado pela tela (src/app/termo-aceite/page.tsx) e pelo arquivo que registra o aceite
// (src/app/api/gerar-termo-aceite/route.ts), para os dois nunca divergirem.
//
// Texto do documento "Termo_de_Aceite_AIMÊ.docx" enviado por Celso em 16/10/2026, reproduzido SEM alteração (inclusive o cabeçalho e o rodapé do
// documento). É um termo PROVISÓRIO, até o advogado entregar o definitivo. Para trocar o termo: substituir os dados abaixo e a VERSAO_TERMO.
//
// Marcação do texto: **trecho** = negrito. nivel 0 = sem recuo; 1 = parágrafo numerado (1.1., 2.2.); 2 = item (a, b, c).

export const VERSAO_TERMO = '2026-10-16'

export const TERMO_TITULO = "Termo de Aceite dos Serviços – Plataforma AIMÊ (SaaS)"
export const TERMO_CABECALHO = 'SAAS – ENGENHARIA DIAGNÓSTICA INOVA SIMPLES (IS)'
export const TERMO_RODAPE = 'Rua Francisco Rubim, 188/102, Bento Ferreira, Vitória/ES – CNPJ 69.190.214/0001/74 – WhatsApp (27) 99954 4362'

export interface BlocoTermo { t: 'abertura' | 'clausula' | 'paragrafo'; nivel: 0 | 1 | 2; texto: string }

export const TERMO_BLOCOS: BlocoTermo[] = [
  { t: "abertura", nivel: 0, texto: "**Pelo presente instrumento particular**, de um lado, a **PLATAFORMA AIMÊ**, doravante denominada **“CONTRATADA”**, e, de outro, o usuário devidamente cadastrado no sistema, doravante denominado **“USUÁRIO”**, têm entre si justo e acordado o presente **Termo de Aceite dos Serviços**, que se regerá pelas cláusulas e condições abaixo." },
  { t: "clausula", nivel: 0, texto: "1. OBJETO." },
  { t: "paragrafo", nivel: 1, texto: "1.1. O presente Termo tem por objeto a disponibilização, pela CONTRATADA ao USUÁRIO, de plataforma digital em modelo **Software as a Service (SaaS)** destinada ao apoio à execução de atividades relacionadas à **engenharia diagnóstica**, incluindo, mas não se limitando, à coleta, organização, processamento e emissão de dados técnicos oriundos de vistorias, inspeções e avaliações de edificações e de equipamentos." },
  { t: "paragrafo", nivel: 1, texto: "1.2. A plataforma AIME constitui ferramenta de apoio técnico-operacional, não substituindo a atuação profissional especializado, nem assumindo responsabilidade técnica pelos serviços executados." },
  { t: "clausula", nivel: 0, texto: "2. CONDIÇÕES DE USO E RESPONSABILIDADE PROFISSIONAL." },
  { t: "paragrafo", nivel: 1, texto: "2.1. O USUÁRIO declara estar ciente de que a utilização da plataforma para execução de atividades técnicas na área de engenharia diagnóstica **exige obrigatoriamente a atuação de profissionais legalmente habilitados**." },
  { t: "paragrafo", nivel: 1, texto: "2.2. O USUÁRIO compromete-se a:" },
  { t: "paragrafo", nivel: 2, texto: "a) Utilizar a plataforma apenas quando possuir ou estiver vinculado a profissional devidamente habilitado e registrado no respectivo conselho profissional competente (CREA, CAU, CRECI ou equivalente);" },
  { t: "paragrafo", nivel: 2, texto: "b) Assegurar que todos os serviços técnicos executados por meio da plataforma sejam conduzidos com observância às normas técnicas aplicáveis, legislação vigente e princípios éticos profissionais;" },
  { t: "paragrafo", nivel: 2, texto: "c) Emitir os documentos técnicos (laudos, relatórios, pareceres) sob responsabilidade de profissional habilitado, com a devida **Anotação de Responsabilidade Técnica (ART)** ou **Registro de Responsabilidade Técnica (RRT)**, quando aplicável." },
  { t: "paragrafo", nivel: 1, texto: "2.3. O USUÁRIO reconhece que a responsabilidade técnica pelos serviços realizados é exclusiva do profissional habilitado responsável, o qual responderá civil, administrativa e criminalmente pelos atos praticados." },
  { t: "paragrafo", nivel: 1, texto: "2.4. A CONTRATADA não se responsabiliza por:" },
  { t: "paragrafo", nivel: 2, texto: "a) Interpretações técnicas realizadas pelo USUÁRIO;" },
  { t: "paragrafo", nivel: 2, texto: "b) Decisões profissionais baseadas nos dados inseridos na plataforma;" },
  { t: "paragrafo", nivel: 2, texto: "c) Eventuais erros, omissões ou inconsistências decorrentes do uso inadequado da ferramenta." },
  { t: "clausula", nivel: 0, texto: "3. CONTRATAÇÃO, CRÉDITOS E PAGAMENTO." },
  { t: "paragrafo", nivel: 1, texto: "3.1. A utilização dos recursos e serviços da plataforma AIMÊ é franqueada ao USUÁRIO mediante contratação de uma das modalidades comerciais disponibilizadas pela CONTRATADA: (i) créditos avulsos ou pacotes de créditos/serviços; ou (ii) assinatura, conforme os planos, prazos, limites e condições apresentados na própria plataforma AIMÊ e no endereço www.aime.eng.br." },
  { t: "paragrafo", nivel: 1, texto: "3.2. Os preços, a quantidade de créditos ou serviços incluídos, a validade dos créditos, a periodicidade da assinatura e as demais condições comerciais aplicáveis serão aqueles informados ao USUÁRIO no momento da contratação." },
  { t: "paragrafo", nivel: 1, texto: "3.3. O pagamento poderá ser realizado por PIX ou cartão de crédito, conforme as opções disponibilizadas no AIMÊ. A contratação ou renovação, quando aplicável, ficará sujeita à confirmação do pagamento pelo meio escolhido." },
  { t: "paragrafo", nivel: 1, texto: "3.4. A CONTRATADA será responsável pelas taxas cobradas pelos prestadores de serviços financeiros relativas ao processamento ordinário dos pagamentos. Em caso de solicitação de estorno pelo USUÁRIO, as taxas e os encargos financeiros incidentes sobre o estorno, quando houver, serão de responsabilidade do USUÁRIO/contratante, observadas as condições informadas no momento da solicitação e a legislação aplicável." },
  { t: "paragrafo", nivel: 1, texto: "3.5. O USUÁRIO declara estar ciente de que a utilização dos serviços contratados depende da disponibilidade de créditos válidos ou da vigência de assinatura ativa, conforme a modalidade escolhida e as condições comerciais apresentadas no momento da contratação." },
  { t: "clausula", nivel: 0, texto: "4. ÉTICA E CONFORMIDADE." },
  { t: "paragrafo", nivel: 1, texto: "4.1. O USUÁRIO compromete-se a atuar em conformidade com os princípios éticos de sua profissão, observando as normas dos respectivos conselhos profissionais e a legislação vigente." },
  { t: "paragrafo", nivel: 1, texto: "4.2. É vedado o uso da plataforma para:" },
  { t: "paragrafo", nivel: 2, texto: "a) Execução de serviços técnicos por profissionais não habilitados;" },
  { t: "paragrafo", nivel: 2, texto: "b) Emissão de documentos técnicos sem responsabilidade formal;" },
  { t: "paragrafo", nivel: 2, texto: "c) Inserção de dados falsos, incompletos ou que possam induzir terceiros a erro." },
  { t: "clausula", nivel: 0, texto: "5. PROPRIEDADE DOS DADOS." },
  { t: "paragrafo", nivel: 1, texto: "5.1. O USUÁRIO reconhece e concorda que:" },
  { t: "paragrafo", nivel: 2, texto: "a) Todos os dados, informações, registros de vistoria, relatórios, laudos e demais documentos técnicos gerados por meio da plataforma são de **propriedade exclusiva dos condomínios, instituições ou contratantes para os quais os serviços foram realizados**;" },
  { t: "paragrafo", nivel: 2, texto: "b) A CONTRATADA não detém qualquer direito de propriedade sobre tais dados, atuando apenas como processadora e armazenadora das informações." },
  { t: "paragrafo", nivel: 1, texto: "5.2. Compete exclusivamente ao contratante dos serviços técnicos:" },
  { t: "paragrafo", nivel: 2, texto: "a) Definir os critérios de acesso, compartilhamento e utilização dos dados;" },
  { t: "paragrafo", nivel: 2, texto: "b) Autorizar ou restringir a divulgação dos documentos gerados;" },
  { t: "paragrafo", nivel: 2, texto: "c) Garantir a conformidade com a legislação aplicável à proteção de dados." },
  { t: "paragrafo", nivel: 1, texto: "5.3. O USUÁRIO compromete-se a:" },
  { t: "paragrafo", nivel: 2, texto: "a) Utilizar os dados apenas para os fins contratados;" },
  { t: "paragrafo", nivel: 2, texto: "b) Respeitar as restrições impostas pelos proprietários das informações;" },
  { t: "paragrafo", nivel: 2, texto: "c) Não divulgar, compartilhar ou comercializar os dados sem autorização expressa." },
  { t: "clausula", nivel: 0, texto: "6. PROTEÇÃO DE DADOS." },
  { t: "paragrafo", nivel: 1, texto: "6.1. A CONTRATADA compromete-se a adotar boas práticas de segurança da informação, visando a proteção dos dados armazenados na plataforma." },
  { t: "paragrafo", nivel: 1, texto: "6.2. O USUÁRIO é responsável pela veracidade, integridade e legalidade dos dados inseridos no sistema." },
  { t: "paragrafo", nivel: 0, texto: "6.3.- Os dados e produtos gerados na plataforma pela execução dos serviços armazenados na base de dados poderão ser eliminados ou anonimizados após o prazo de 6 (seis) meses, observadas as obrigações legais de conservação." },
  { t: "clausula", nivel: 0, texto: "7. LIMITAÇÃO DE RESPONSABILIDADE." },
  { t: "paragrafo", nivel: 1, texto: "7.1. A CONTRATADA não responde por quaisquer danos diretos ou indiretos decorrentes:" },
  { t: "paragrafo", nivel: 2, texto: "a) Do uso inadequado da plataforma;" },
  { t: "paragrafo", nivel: 2, texto: "b) Da atuação profissional do USUÁRIO ou de terceiros;" },
  { t: "paragrafo", nivel: 2, texto: "c) Da utilização dos dados gerados para finalidades diversas das previstas." },
  { t: "paragrafo", nivel: 1, texto: "7.2. A responsabilidade da CONTRATADA limita-se à disponibilização da plataforma em condições operacionais adequadas, conforme os níveis de serviço estabelecidos." },
  { t: "clausula", nivel: 0, texto: "8. ACEITE." },
  { t: "paragrafo", nivel: 1, texto: "8.1. Ao acessar e utilizar a plataforma AIMÊ, o USUÁRIO declara que leu, compreendeu e concorda integralmente com os termos deste documento." },
  { t: "paragrafo", nivel: 1, texto: "8.2. O aceite eletrônico possui validade jurídica plena, nos termos da legislação vigente." },
  { t: "clausula", nivel: 0, texto: "9. DISPOSIÇÕES GERAIS" },
  { t: "paragrafo", nivel: 1, texto: "9.1. Este Termo poderá ser atualizado pela CONTRATADA a qualquer tempo, sendo as alterações comunicadas ao USUÁRIO por meio da própria plataforma." },
  { t: "paragrafo", nivel: 1, texto: "9.2. O uso continuado da plataforma após alterações implica concordância com os novos termos." },
  { t: "paragrafo", nivel: 1, texto: "9.3. Fica eleito o foro da comarca do domicílio da CONTRATADA para dirimir quaisquer controvérsias oriundas deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja." },
]

/** "a **b** c" → [{t:"a ",b:false}, {t:"b",b:true}, {t:" c",b:false}] */
export function partesComNegrito(texto: string): { t: string; b: boolean }[] {
  return texto.split('**').map((t, i) => ({ t, b: i % 2 === 1 })).filter(p => p.t !== '')
}

/** Data do aceite, dd/mm/aaaa, no HORÁRIO DE BRASÍLIA (o servidor roda em UTC: sem isso, quem aceita depois das 21h registraria o dia seguinte). */
export function dataDoAceite(agora: Date = new Date()): string {
  const p: Record<string, string> = {}
  for (const parte of new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(agora)) p[parte.type] = parte.value
  return `${p.day}/${p.month}/${p.year}`
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const comNegritoHtml = (texto: string) => partesComNegrito(texto).map(p => (p.b ? `<strong>${escapar(p.t)}</strong>` : escapar(p.t))).join('')

/** O arquivo HTML que registra o aceite (salvo em documentos_inspetor), com a data do aceite no fim. */
export function termoEmHtml(dataAceite: string): string {
  const corpo = TERMO_BLOCOS.map(b => {
    if (b.t === 'clausula') return `<h2>${escapar(b.texto)}</h2>`
    if (b.t === 'abertura') return `<p class="abertura">${comNegritoHtml(b.texto)}</p>`
    return `<p class="n${b.nivel}">${comNegritoHtml(b.texto)}</p>`
  }).join('\n  ')
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="versao-termo" content="${VERSAO_TERMO}">
  <title>Termo de Aceite dos Serviços – AIMÊ</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.6; color: #000; padding: 24px 32px; max-width: 800px; margin: 0 auto; }
    .cab { text-align: center; font-weight: bold; font-size: 9pt; padding-bottom: 4pt; border-bottom: 1px solid #000; }
    .titulo { text-align: center; font-weight: bold; font-size: 11pt; margin: 18pt 0; }
    h2 { font-size: 10pt; font-weight: bold; margin: 14pt 0 4pt; }
    p { margin: 4pt 0; text-align: justify; }
    .abertura { margin-bottom: 10pt; }
    .n1 { padding-left: 34px; text-indent: -34px; }
    .n2 { padding-left: 68px; text-indent: -34px; }
    .data { margin-top: 24pt; text-align: right; font-weight: bold; }
    .rod { margin-top: 24pt; padding-top: 4pt; border-top: 1px solid #000; text-align: center; font-size: 8pt; color: #333; }
  </style>
</head>
<body>
  <div class="cab">${escapar(TERMO_CABECALHO)}</div>
  <div class="titulo">${escapar(TERMO_TITULO)}</div>
  ${corpo}
  <p class="data">Data do aceite: ${dataAceite}.</p>
  <div class="rod">${escapar(TERMO_RODAPE)}</div>
</body>
</html>`
}
