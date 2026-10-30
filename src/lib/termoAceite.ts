// src/lib/termoAceite.ts
// AIMÊ — Termo de Aceite dos Serviços: texto ÚNICO, usado pela tela (src/app/termo-aceite/page.tsx) e pelo arquivo que registra o aceite
// (src/app/api/gerar-termo-aceite/route.ts), para os dois nunca divergirem.
//
// Texto do documento "Termo de Aceite AIME V2.0 - 30-10-2026.docx" (versão 2.0), enviado pelo marketing e aprovado por Celso em 30/10/2026, com 4
// ajustes dele: cancelamento em "Meu Plano e Créditos" (onde fica o botão), e-mail de LGPD = suporte@aime.eng.br, "níveis de serviço" retirado da 8.2 e,
// na 7.5, os documentos deixam a plataforma após os 185 dias. Substitui o V1.1 (26/10/2026). A linha final "Vitória/ES, 30 de outubro de 2026." é a
// data do documento; a data do aceite de cada usuário vem de dataDoAceite(). Quem já aceitou o V1.1 NÃO é chamado de novo (decisão de Celso).
// Para trocar o termo: substituir os dados abaixo e a VERSAO_TERMO.
//
// Marcação do texto: **trecho** = negrito. nivel 0 = sem recuo; 1 = parágrafo numerado (1.1., 2.2.); 2 = item (a, b, c).

export const VERSAO_TERMO = '2026-10-30'

export const TERMO_TITULO = "Termo de Aceite dos Serviços – Plataforma AIMÊ (SaaS)"
export const TERMO_CABECALHO = 'SAAS – ENGENHARIA DIAGNÓSTICA INOVA SIMPLES (I.S.)'
export const TERMO_RODAPE = 'Rua Francisco Rubim, 188/102, Bento Ferreira, Vitória/ES – CNPJ 69.190.214/0001-74 – WhatsApp (27) 99954 4362'

export interface BlocoTermo { t: 'abertura' | 'clausula' | 'paragrafo'; nivel: 0 | 1 | 2; texto: string }

export const TERMO_BLOCOS: BlocoTermo[] = [
  { t: "paragrafo", nivel: 0, texto: "Versão 2.0 · Atualizada em 30/10/2026" },
  { t: "abertura", nivel: 0, texto: "**Pelo presente instrumento particular**, de um lado, a **SAAS – ENGENHARIA DIAGNÓSTICA INOVA SIMPLES (I.S.)**, CNPJ 69.190.214/0001-74, com sede na Rua Francisco Rubim, 188/102, Bento Ferreira, Vitória/ES, responsável pela plataforma **AIMÊ** – Aplicativo Inteligente para Mapeamento de Edificações e Equipamentos, doravante denominada **“CONTRATADA”**, e, de outro, o usuário devidamente cadastrado no sistema, doravante denominado **“USUÁRIO”**, têm entre si justo e acordado o presente **Termo de Aceite dos Serviços**, que se regerá pelas cláusulas e condições abaixo." },
  { t: "paragrafo", nivel: 0, texto: "O tratamento de dados pessoais também é descrito na Política de privacidade (https://aime.eng.br/privacidade/), que integra este Termo." },
  { t: "clausula", nivel: 0, texto: "1. Objeto." },
  { t: "paragrafo", nivel: 1, texto: "1.1. O presente Termo tem por objeto a disponibilização, pela CONTRATADA ao USUÁRIO, de plataforma digital em modelo Software as a Service (SaaS) destinada ao apoio à execução de atividades relacionadas à engenharia diagnóstica, incluindo, mas não se limitando, à coleta, organização, processamento e emissão de dados técnicos oriundos de vistorias, inspeções e avaliações de edificações e de equipamentos." },
  { t: "paragrafo", nivel: 1, texto: "1.2. A plataforma AIMÊ constitui ferramenta de apoio técnico-operacional, não substituindo a atuação profissional especializada, nem assumindo responsabilidade técnica pelos serviços executados." },
  { t: "clausula", nivel: 0, texto: "2. Condições de uso e responsabilidade profissional." },
  { t: "paragrafo", nivel: 1, texto: "2.1. O USUÁRIO declara estar ciente de que a utilização da plataforma para execução de atividades técnicas na área de engenharia diagnóstica exige obrigatoriamente a atuação de profissionais legalmente habilitados." },
  { t: "paragrafo", nivel: 1, texto: "2.2. O USUÁRIO compromete-se a:" },
  { t: "paragrafo", nivel: 2, texto: "a) Utilizar a plataforma apenas quando possuir ou estiver vinculado a profissional devidamente habilitado e registrado no respectivo conselho profissional competente (CREA, CAU ou equivalente);" },
  { t: "paragrafo", nivel: 2, texto: "b) Assegurar que todos os serviços técnicos executados por meio da plataforma sejam conduzidos com observância às normas técnicas aplicáveis, legislação vigente e princípios éticos profissionais;" },
  { t: "paragrafo", nivel: 2, texto: "c) Emitir os documentos técnicos (laudos, relatórios, pareceres) sob responsabilidade de profissional habilitado, com a devida Anotação de Responsabilidade Técnica (ART) ou Registro de Responsabilidade Técnica (RRT), quando aplicável." },
  { t: "paragrafo", nivel: 1, texto: "2.3. O USUÁRIO reconhece que a responsabilidade técnica pelos serviços realizados é exclusiva do profissional habilitado responsável, o qual responderá civil, administrativa e criminalmente pelos atos praticados." },
  { t: "paragrafo", nivel: 1, texto: "2.4. A CONTRATADA não se responsabiliza por:" },
  { t: "paragrafo", nivel: 2, texto: "a) Interpretações técnicas realizadas pelo USUÁRIO;" },
  { t: "paragrafo", nivel: 2, texto: "b) Decisões profissionais baseadas nos dados inseridos na plataforma;" },
  { t: "paragrafo", nivel: 2, texto: "c) Eventuais erros, omissões ou inconsistências decorrentes do uso inadequado da ferramenta." },
  { t: "clausula", nivel: 0, texto: "3. Contratação, créditos e pagamento." },
  { t: "paragrafo", nivel: 1, texto: "3.1. A utilização dos recursos e serviços da plataforma AIMÊ é franqueada ao USUÁRIO mediante contratação de uma das modalidades comerciais disponibilizadas pela CONTRATADA: (i) créditos avulsos ou pacotes de créditos/serviços; ou (ii) assinatura, conforme os planos, prazos, limites e condições apresentados na própria plataforma AIMÊ e no endereço www.aime.eng.br." },
  { t: "paragrafo", nivel: 1, texto: "3.2. Os preços, a quantidade de créditos ou serviços incluídos, a validade dos créditos, a periodicidade da assinatura e as demais condições comerciais aplicáveis serão aqueles informados ao USUÁRIO no momento da contratação. Os créditos não utilizados dentro da validade expiram e não são convertidos em dinheiro." },
  { t: "paragrafo", nivel: 1, texto: "3.3. O pagamento poderá ser realizado por PIX ou cartão de crédito, conforme as opções disponibilizadas no AIMÊ. A contratação ou renovação, quando aplicável, ficará sujeita à confirmação do pagamento pelo meio escolhido." },
  { t: "paragrafo", nivel: 1, texto: "3.4. As assinaturas são renovadas automaticamente ao fim de cada período, com nova cobrança pelo meio de pagamento escolhido, até que o USUÁRIO as cancele." },
  { t: "paragrafo", nivel: 1, texto: "3.5. O USUÁRIO pode cancelar a assinatura a qualquer momento, em \"Meu Plano e Créditos\" ou pelo e-mail suporte@aime.eng.br, sem multa. O cancelamento interrompe as cobranças seguintes, e o USUÁRIO mantém o acesso e os créditos até o fim do período já pago." },
  { t: "paragrafo", nivel: 1, texto: "3.6. Alterações de preço não afetam o período já pago e serão efetuadas anualmente, no mês de janeiro de cada novo exercício." },
  { t: "paragrafo", nivel: 1, texto: "3.7. A CONTRATADA será responsável pelas taxas cobradas pelos prestadores de serviços financeiros relativas ao processamento ordinário dos pagamentos. Em caso de estorno solicitado pelo USUÁRIO fora da hipótese da cláusula 4, as taxas e os encargos financeiros incidentes sobre o estorno, quando houver, serão de responsabilidade do USUÁRIO, observadas as condições informadas no momento da solicitação e a legislação aplicável." },
  { t: "paragrafo", nivel: 1, texto: "3.8. O USUÁRIO declara estar ciente de que a utilização dos serviços contratados depende da disponibilidade de créditos válidos ou da vigência de assinatura ativa, conforme a modalidade escolhida e as condições comerciais apresentadas no momento da contratação." },
  { t: "clausula", nivel: 0, texto: "4. Direito de arrependimento." },
  { t: "paragrafo", nivel: 1, texto: "4.1. Nos termos do art. 49 do Código de Defesa do Consumidor, quando aplicável, o USUÁRIO pode desistir da contratação em até 7 (sete) dias corridos contados do pagamento, com devolução integral do valor pago, sem cobrança de taxas." },
  { t: "paragrafo", nivel: 1, texto: "4.2. O pedido deve ser feito pelo e-mail suporte@aime.eng.br, com o CPF do cadastro. A devolução é feita pelo mesmo meio de pagamento, e os créditos daquela contratação são cancelados." },
  { t: "paragrafo", nivel: 1, texto: "4.3. Fora do prazo da cláusula 4.1, não há devolução de valores pagos nem de créditos não utilizados, salvo falha da plataforma que impeça o uso do serviço contratado." },
  { t: "clausula", nivel: 0, texto: "5. Ética e conformidade." },
  { t: "paragrafo", nivel: 1, texto: "5.1. O USUÁRIO compromete-se a atuar em conformidade com os princípios éticos de sua profissão, observando as normas dos respectivos conselhos profissionais e a legislação vigente." },
  { t: "paragrafo", nivel: 1, texto: "5.2. É vedado o uso da plataforma para:" },
  { t: "paragrafo", nivel: 2, texto: "a) Execução de serviços técnicos por profissionais não habilitados;" },
  { t: "paragrafo", nivel: 2, texto: "b) Emissão de documentos técnicos sem responsabilidade formal;" },
  { t: "paragrafo", nivel: 2, texto: "c) Inserção de dados falsos, incompletos ou que possam induzir terceiros a erro." },
  { t: "clausula", nivel: 0, texto: "6. Propriedade dos dados." },
  { t: "paragrafo", nivel: 1, texto: "6.1. O USUÁRIO reconhece e concorda que:" },
  { t: "paragrafo", nivel: 2, texto: "a) Todos os dados, informações, registros de vistoria, relatórios, laudos e demais documentos técnicos gerados por meio da plataforma são de propriedade exclusiva dos condomínios, instituições ou contratantes para os quais os serviços foram realizados;" },
  { t: "paragrafo", nivel: 2, texto: "b) A CONTRATADA não detém qualquer direito de propriedade sobre tais dados, atuando apenas como processadora e armazenadora das informações." },
  { t: "paragrafo", nivel: 1, texto: "6.2. Compete exclusivamente ao contratante dos serviços técnicos:" },
  { t: "paragrafo", nivel: 2, texto: "a) Definir os critérios de acesso, compartilhamento e utilização dos dados;" },
  { t: "paragrafo", nivel: 2, texto: "b) Autorizar ou restringir a divulgação dos documentos gerados;" },
  { t: "paragrafo", nivel: 2, texto: "c) Garantir a conformidade com a legislação aplicável à proteção de dados." },
  { t: "paragrafo", nivel: 1, texto: "6.3. O USUÁRIO compromete-se a:" },
  { t: "paragrafo", nivel: 2, texto: "a) Utilizar os dados apenas para os fins contratados;" },
  { t: "paragrafo", nivel: 2, texto: "b) Respeitar as restrições impostas pelos proprietários das informações;" },
  { t: "paragrafo", nivel: 2, texto: "c) Não divulgar, compartilhar ou comercializar os dados sem autorização expressa." },
  { t: "clausula", nivel: 0, texto: "7. Proteção de dados pessoais." },
  { t: "paragrafo", nivel: 1, texto: "7.1. Papéis. Para os fins da Lei nº 13.709/2018 (LGPD): (a) a CONTRATADA é controladora dos dados pessoais do USUÁRIO; (b) quanto aos dados pessoais de terceiros inseridos pelo USUÁRIO na execução dos serviços (contratantes, responsáveis e demais pessoas identificáveis em registros, fotos e documentos), o USUÁRIO é o controlador e a CONTRATADA atua como operadora, tratando-os apenas para disponibilizar a plataforma e conforme este Termo." },
  { t: "paragrafo", nivel: 1, texto: "7.2. Dados e finalidades. A CONTRATADA trata: (a) do USUÁRIO, nome, CPF, e-mail, WhatsApp, título profissional, dados de contratação e de consumo de créditos, registro do aceite e mensagens de suporte, para cadastro, execução do contrato, cobrança, segurança, atendimento e cumprimento de obrigação legal; (b) dos serviços, os dados técnicos e pessoais inseridos pelo USUÁRIO, para gerar os documentos solicitados." },
  { t: "paragrafo", nivel: 1, texto: "7.3. Compartilhamento. Para operar a plataforma, a CONTRATADA utiliza fornecedores de hospedagem e banco de dados, processamento de pagamentos, envio de e-mails, inteligência artificial de apoio à redação técnica e, mediante consentimento, medição de acesso. Pode haver transferência internacional de dados, com as garantias previstas na LGPD (art. 33). Os textos produzidos com apoio de inteligência artificial devem ser revisados pelo profissional habilitado, que responde por eles (cláusula 2.3)." },
  { t: "paragrafo", nivel: 1, texto: "7.4. Segurança. A CONTRATADA adota boas práticas de segurança da informação: controle de acesso por usuário, comunicação criptografada, cópias de segurança e eliminação periódica de dados. Incidente que possa acarretar risco ou dano relevante será comunicado ao USUÁRIO e à Autoridade Nacional de Proteção de Dados (ANPD), nos termos da lei." },
  { t: "paragrafo", nivel: 1, texto: "7.5. Eliminação. Os dados e produtos gerados pela execução de cada serviço (fotos, registros de vistoria, documentos e contatos de clientes) serão eliminados da base de dados **185 (cento e oitenta e cinco) dias** após a sua geração; as mensagens de suporte e o CPF ou CNPJ de clientes nos registros de consumo serão anonimizados no mesmo prazo. Ficam ressalvados contratos, pagamentos e o registro do aceite, mantidos pelos prazos de obrigação legal. As cópias de segurança são mantidas por até 4 (quatro) semanas. O USUÁRIO deve baixar e guardar cópia dos documentos que emitir, que deixarão de estar disponíveis na plataforma após os 185 (cento e oitenta e cinco) dias." },
  { t: "paragrafo", nivel: 1, texto: "7.6. Direitos do titular. Os pedidos de acesso, correção, exclusão e demais direitos previstos na LGPD são feitos pelo e-mail suporte@aime.eng.br ou pelo \"Fale Conosco\" da plataforma, com resposta em até 15 (quinze) dias. Quanto aos dados de terceiros, o USUÁRIO, como controlador, atende o titular, e a CONTRATADA o auxilia. A exclusão não alcança dados que a lei obrigue a conservar." },
  { t: "paragrafo", nivel: 1, texto: "7.7. Obrigações do USUÁRIO. O USUÁRIO é responsável pela veracidade, integridade e legalidade dos dados inseridos no sistema, por possuir base legal para tratar os dados de terceiros e informá-los, e por inserir apenas os dados necessários ao serviço." },
  { t: "paragrafo", nivel: 1, texto: "7.8. Marketing e cookies. O uso de dados para publicidade depende de autorização opcional do USUÁRIO no cadastro, que pode ser retirada a qualquer tempo em \"Meu Cadastro\". Os cookies de medição só são ativados após o aceite, e a escolha pode ser alterada em \"Preferências de cookies\"." },
  { t: "paragrafo", nivel: 1, texto: "7.9. Encarregado e canal. O encarregado pelo tratamento de dados pessoais é Celso Hamerski. O canal do titular e da ANPD para assuntos de proteção de dados é o e-mail suporte@aime.eng.br." },
  { t: "clausula", nivel: 0, texto: "8. Limitação de responsabilidade." },
  { t: "paragrafo", nivel: 1, texto: "8.1. A CONTRATADA não responde por quaisquer danos diretos ou indiretos decorrentes:" },
  { t: "paragrafo", nivel: 2, texto: "a) Do uso inadequado da plataforma;" },
  { t: "paragrafo", nivel: 2, texto: "b) Da atuação profissional do USUÁRIO ou de terceiros;" },
  { t: "paragrafo", nivel: 2, texto: "c) Da utilização dos dados gerados para finalidades diversas das previstas." },
  { t: "paragrafo", nivel: 1, texto: "8.2. A responsabilidade da CONTRATADA limita-se à disponibilização da plataforma em condições operacionais adequadas." },
  { t: "clausula", nivel: 0, texto: "9. Aceite." },
  { t: "paragrafo", nivel: 1, texto: "9.1. Ao marcar a opção \"Li e aceito os termos\", o USUÁRIO declara que leu, compreendeu e concorda integralmente com este Termo e que está ciente da Política de privacidade." },
  { t: "paragrafo", nivel: 1, texto: "9.2. O aceite eletrônico possui validade jurídica plena, nos termos da legislação vigente, e fica registrado com data e versão do Termo aceita." },
  { t: "clausula", nivel: 0, texto: "10. Disposições gerais." },
  { t: "paragrafo", nivel: 1, texto: "10.1. Este Termo poderá ser atualizado pela CONTRATADA, e as alterações serão comunicadas ao USUÁRIO pela própria plataforma ou por e-mail. A versão vigente fica disponível em aime.eng.br/termos/ e no aplicativo, com a data de atualização." },
  { t: "paragrafo", nivel: 1, texto: "10.2. O uso continuado da plataforma após a comunicação das alterações implica concordância com os novos termos." },
  { t: "paragrafo", nivel: 1, texto: "10.3. Fica eleito o foro da comarca de Vitória/ES para dirimir quaisquer controvérsias oriundas deste Termo, ressalvado o direito do USUÁRIO consumidor de propor ação no foro do seu domicílio." },
  { t: "paragrafo", nivel: 0, texto: "Vitória/ES, 30 de outubro de 2026." },
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

/** O arquivo HTML que registra o aceite (salvo em documentos_inspetor), com a data do aceite no fim. paraPdf: sem cabeçalho e rodapé no corpo (o PDF os repete em todas as páginas). */
export function termoEmHtml(dataAceite: string, opcoes: { paraPdf?: boolean } = {}): string {
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
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.6; color: #000; ${opcoes.paraPdf ? 'padding: 0; margin: 0;' : 'padding: 24px 32px; max-width: 800px; margin: 0 auto;'} }
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
  ${opcoes.paraPdf ? '' : `<div class="cab">${escapar(TERMO_CABECALHO)}</div>`}
  <div class="titulo">${escapar(TERMO_TITULO)}</div>
  ${corpo}
  <p class="data">Data do aceite: ${dataAceite}.</p>
  ${opcoes.paraPdf ? '' : `<div class="rod">${escapar(TERMO_RODAPE)}</div>`}
</body>
</html>`
}
