// src/lib/propostas-conteudo.ts
// Conteúdo textual dos templates de proposta comercial por tipo de serviço

export interface PropostaConteudo {
  ao: string
  ref: string
  apresentacao: string
  frase_servico: string
  objetivo: string
  metodologia: string
  documentacao: string
  equipe: string
  honorarios: string
  prazos: string
  rescisao: string
}

export const CONTEUDO_PROPOSTA: Record<number, PropostaConteudo> = {
  11: {
    ao: `AO`,
    ref: `Ref.: Proposta para Autovistoria.`,
    apresentacao: `Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços Autovistoria**,** conforme a ABNT NBR 16.747/2020, normas correlatas e Norma de Inspeção Predial do IBAPE/2025.`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Autovistoria** completa, com adoção de metodologia
adequada para análise documental, vistoria técnica, classificação das
anomalias e falhas, avaliação de riscos, priorização de ações de
manutenção, e apresentação do Laudo de Inspeção da Edificação,
acompanhado da respectiva Anotação de Responsabilidade Técnica --
**ART's/RRT**, devidamente registrada no CREA/CAU.`,
    metodologia: `O trabalho será desenvolvido segundo metodologia preconizada pela
Associação Brasileira de Normas Técnica -- ABNT e do Instituto
Brasileiro de Avaliações e Perícias -- IBAPE e legislação vigente.

Após a caracterização inicial da edificação e registro da ART no CREA os
trabalhos seguirão com a execução das etapas/atividades seguintes:

-   Entrevista com o síndico para levantamento do histórico do imóvel
    quanto a intervenções de manutenção, irregularidades e problemas
    críticos existentes, além da elaboração de agenda de trabalho e
    solicitação da documentação administrativa, técnica e de manutenção;

-   Análise dos dados coletados sobre as características da região e do
    histórico do imóvel, e análise da documentação solicitada para o
    estudo;

-   Realização de vistorias nas instalações e sistemas construtivos da
    edificação para levantamento de problemas existentes (anomalias e
    falhas), com registro descritivo e fotográfico para posterior
    análise e classificação. A vistoria será efetuada conforme agenda, a
    ser definida de comum acordo entre contratado e contratante, e
    dentro do escopo do estudo a ser realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança da edificação, classificação das
    manifestações patológicas quanto a origem e risco e sua priorização,
    com a técnica GUT, e registro das soluções e serviços para
    manutenção predial;

-   Elaboração e entrega do Laudo de Autovistoria, documentando a
    situação encontrada, segundo tópicos exigidos na norma de inspeção
    predial, acompanhado das necessárias ARTs.

# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR-13.752/96 (Perícias de Engenharia na Construção Civil) e a NBR-16.747/2020 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025 e demais legislações.`,
    documentacao: `Em reunião com o síndico o condomínio será informado do conjunto de
documentos necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta por engenheiros civil e elétrico, inscritos no
CREA, e pessoal de apoio técnico operacional, atendendo o exigido na
legislação vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Inspeção predial com as respectivas Anotações de
    > Responsabilidade Técnica -- ARTs, registradas no CREA/ES;

-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial e
    > demais documentos em anexo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção da Edificação.`,
    prazos: `O Laudo de Inspeção Predial será entregue no prazo máximo de até 15
(quinze) dias úteis, contados a partir da data de recebimento da
documentação solicitada em reunião com o síndico.

Também deverá haver comprometimento mútuo para execução dos trabalhos
segundo agenda de trabalho, a ser definida de comum acordo entre o
Inspetor e o síndico na reunião inicial.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do LITE, sem custo
adicional.

Quanto à execução do presente trabalho, no que se refere a títulos
executivos, fica eleito o foro de Vitória/ES, com renúncia a qualquer
outro.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  12: {
    ao: `AO`,
    ref: `Ref.: Proposta comercial para Inspeção Predial.`,
    apresentacao: `Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção Predial,** conforme a ABNT NBR 16.747/2020, normas correlatas e Norma de Inspeção Predial do`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Inspeção Predial** completa, com adoção de metodologia
adequada para análise documental, vistoria técnica, classificação das
anomalias e falhas, avaliação de riscos, priorização de ações de
manutenção, e apresentação do Laudo de Inspeção da Edificação,
acompanhado das respectivas Anotações de Responsabilidade Técnica --
**ART's/RRT's**, devidamente registrada no CREA.`,
    metodologia: `O trabalho será desenvolvido segundo metodologia preconizada pela
Associação Brasileira de Normas Técnica -- ABNT e do Instituto
Brasileiro de Avaliações e Perícias - IBAPE.

Após a caracterização inicial da edificação e registro da ART/RRT no
CREA os trabalhos seguirão com a execução das etapas/atividades
seguintes:

-   Entrevista com o síndico para levantamento do histórico do imóvel
    quanto a intervenções de manutenção, irregularidades e problemas
    críticos existentes, além da elaboração de agenda de trabalho e
    solicitação da documentação administrativa, técnica e de manutenção;

-   Análise dos dados coletados sobre as características da região e do
    histórico do imóvel, e análise da documentação solicitada para o
    estudo;

-   Realização de vistoria nos sistemas construtivos da edificação para
    levantamento de problemas existentes (anomalias e falhas), com
    registro descritivo e fotográfico para posterior análise e
    classificação. A vistoria será efetuada conforme agenda, a ser
    definida de comum acordo entre contratado e contratante, e dentro do
    escopo do estudo a ser realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança da edificação, classificação das
    manifestações patológicas quanto a origem e risco e sua priorização,
    com a técnica GUT ajustada, e registro das soluções e serviços para
    manutenção predial;

-   Elaboração e entrega do Laudo de Inspeção Predial, documentando a
    situação encontrada, segundo tópicos exigidos na norma de inspeção
    predial, acompanhado das necessárias ARTs/RRT's.

# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR-13.752/96 (Perícias de Engenharia na Construção Civil) e a NBR-16.747/2020 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025.`,
    documentacao: `Em reunião com o síndico o condomínio será informado do conjunto de
documentos necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta por arquiteto ou engenheiros civil e elétrico,
inscritos no CREA, e pessoal de apoio técnico operacional, atendendo o
exigido na legislação vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Inspeção predial com as respectivas Anotações de
    > Responsabilidade Técnica -- ART/RRT;

-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial e
    > demais documentos em anexo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção da Edificação.`,
    prazos: `O Laudo de Inspeção Predial será entregue no prazo máximo de até 20
(vinte) dias úteis, contados a partir da data de recebimento da
documentação solicitada em reunião com o síndico.

Também deverá haver comprometimento mútuo para execução dos trabalhos
segundo agenda de trabalho, a ser definida de comum acordo entre o
Inspetor e o síndico na reunião inicial.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do LITE, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  13: {
    ao: `AO`,
    ref: `Ref.: Proposta Técnica para Vistoria em Imóvel Novo`,
    apresentacao: `Conforme solicitado, apresentamos a proposta técnica e comercial para execução do serviço de **Vistoria em Imóvel Novo,** seguindo as recomendações da ABNT/NBR 15.575 e normas correlatas, Norma de Inspeção`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Vistoria** completa, com adoção de metodologia adequada
para análise documental, classificação das anomalias e falhas, avaliação
de riscos, priorização, e apresentação do Laudo de Vistoria.`,
    metodologia: `O trabalho será desenvolvido segundo metodologia preconizada pela
Associação Brasileira de Normas Técnica -- ABNT e do Instituto
Brasileiro de Avaliações e Perícias - IBAPE.

Após a caracterização inicial do imóvel os trabalhos seguirão com a
execução das etapas/atividades seguintes:

-   Reunião com o proprietário para solicitação da documentação
    administrativa, técnica e legal;

-   Análise da documentação do imóvel solicitada para o trabalho;

-   Realização de vistoria nas instalações do imóvel para levantamento
    de problemas existentes (anomalias e falhas), com registro
    descritivo e fotográfico para posterior análise e classificação. A
    vistoria será efetuada conforme agenda, a ser definida de comum
    acordo entre contratado e contratante, e dentro do escopo do estudo
    a ser realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança da edificação, classificação das
    manifestações patológicas quanto a origem e risco e sua priorização,
    com a técnica GUT ajustada;

-   Elaboração e entrega do Laudo de Vistoria, documentando a situação
    encontrada, segundo tópicos exigidos em normas.

# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR 15.575 (Desempenho), NBR-13.752 (Perícias de Engenharia na Construção Civil) e a NBR-16.747 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025.`,
    documentacao: `Em reunião com o proprietário será informado do conjunto de documentos
necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta por engenheiro civil, arquiteto ou técnico de
edificações, devidamente inscritos em seus órgãos de registro
profissional, atendendo o exigido na legislação vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Vistoria do Imóvel;

-   Arquivos em mídia magnética contendo o laudo e demais documentos.

O Manual de Uso, Operação e Manutenção da unidade será consultado para
verificação e comparação com as condições do imóvel em estudo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do laudo de
    > Inspeção.`,
    prazos: `O Laudo de Vistoria será entregue no prazo máximo de até 12 (doze) dias
úteis, contados a partir da data de recebimento da documentação
solicitada em reunião com o proprietário.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  14: {
    ao: `AO`,
    ref: `Ref.: Proposta Comercial para Inspeção de fachada.`,
    apresentacao: `Conforme solicitação, apresentamos a proposta técnica e comercial para execução do serviço de **Inspeção de Fachadas,** seguindo as recomendações NBR 13.755, NBR 13.749, NBR 16.747, normas complementares`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Vistoria** completa, com adoção de metodologia adequada
para análise documental, classificação das anomalias e falhas, avaliação
de riscos, priorização, e apresentação do Laudo de Vistoria.

Avaliar o estado de conservação e aderência dos revestimentos com
verificação da estanqueidade, segurança e durabilidade para identificar
anomalias que possam causar desprendimentos ou infiltrações, visando
prevenir acidentes (queda de revestimentos), garantir desempenho e veda
útil e subsidiar a manutenção e a reabilitação, e apresentação do Laudo
de Inspeção das Fachadas, acompanhado da respectiva ART/RRT.`,
    metodologia: `O trabalho será desenvolvido segundo metodologia preconizada pela
Associação Brasileira de Normas Técnica -- ABNT e do Instituto
Brasileiro de Avaliações e Perícias - IBAPE.

Após a caracterização inicial da edificação e registro da ART/RRT no
CREA os trabalhos seguirão com a execução das etapas/atividades
seguintes:

-   Entrevista com o síndico para levantamento do histórico da fachada
    quanto a intervenções de manutenção, irregularidades e problemas
    críticos existentes, além da elaboração de agenda de trabalho e
    solicitação da documentação administrativa, técnica e de manutenção;

-   Análise dos dados coletados e da documentação solicitada para o
    estudo;

-   Realização de vistorias nas instalações e sistemas construtivos da
    edificação para levantamento de problemas existentes (anomalias e
    falhas), com registro descritivo e fotográfico para posterior
    análise e classificação. A vistoria será efetuada conforme agenda, a
    definida de comum acordo entre contratado e contratante, e dentro do
    escopo do estudo a ser realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança da fachada, classificação das manifestações
    patológicas quanto a origem e risco e sua priorização, com a técnica
    GUT ajustada, e registro das soluções e serviços, com orientações e
    recomendações para contratação dos serviços de manutenção predial;

-   Elaboração e entrega do Laudo de Inspeção da Fachada, documentando a
    situação encontrada, segundo tópicos exigidos em normas, acompanhado
    das necessárias ART/RRT.

# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR 16.747-- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025.`,
    documentacao: `Em reunião com o síndico será informado do conjunto de documentos
necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta por engenheiro civil ou arquiteto, devidamente
inscritos em seus órgãos de registro profissional, e pessoal de apoio
operacional, atendendo o exigido na legislação vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Inspeção das Fachadas;

-   Arquivos em mídia magnética contendo o laudo e demais documentos.

O Manual de Uso, Operação e Manutenção da unidade será consultado para
verificação e comparação com as condições de projeto.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção.`,
    prazos: `O Laudo de Vistoria será entregue no prazo máximo de até 20 (vinte) dias
úteis, contados a partir da data de recebimento da documentação
solicitada em reunião com o proprietário.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  15: {
    ao: `AO`,
    ref: `Ref.: Proposta comercial para Inspeção Inteligente de Elevadores.`,
    apresentacao: `Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção Inteligente em Elevadores,** conforme a ABNT NBR 16.858, metodologia da NBR 16.747ajustada e normas`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Inspeção em Elevadores** completa, com adoção de
metodologia adequada para análise documental, vistoria técnica,
classificação das anomalias e falhas, avaliação de riscos, priorização
de ações de manutenção, e apresentação do Laudo dos Elevadores,
acompanhado da respectiva Anotação de Responsabilidade Técnica --
**ART**, devidamente registrada no CREA.`,
    metodologia: `O trabalho será desenvolvido segundo metodologia preconizada pela
Associação Brasileira de Normas Técnica -- ABNT e regulamentações
específicas.

Após a caracterização inicial dos elevadores e registro da ART no CREA
os trabalhos seguirão com a execução das etapas/atividades seguintes:

-   Entrevista com o síndico para levantamento do histórico dos
    elevadores quanto a intervenções de manutenção, irregularidades e
    problemas críticos existentes, além da elaboração de agenda de
    trabalho e solicitação da documentação administrativa, técnica e de
    manutenção;

-   Análise dos dados coletados e do histórico dos elevadores, e análise
    da documentação solicitada para o estudo;

-   Realização de vistorias nas instalações para levantamento de
    problemas existentes (Requisitos normativos), com registro
    descritivo e fotográfico para posterior análise e classificação. A
    vistoria será efetuada conforme agenda, a ser definida de comum
    acordo entre contratado e contratante, e dentro do escopo do estudo
    a ser realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança da edificação, classificação das
    manifestações patológicas quanto a origem e risco e sua priorização,
    com a técnica GUT ajustada, e registro dos serviços, com orientações
    e recomendações para contratação dos serviços de manutenção;

-   Elaboração e entrega do Laudo de Inspeção de Elevadores,
    documentando a situação encontrada, segundo tópicos exigidos em
    normas, acompanhado da necessária ART.

# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR 16.858 (Série) e a metodologia preconizada pela NBR-16.747 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) ajustada.`,
    documentacao: `Em reunião com o síndico o condomínio será informado do conjunto de
documentos necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta por engenheiros mecânico, inscritos no CREA, e
pessoal de apoio técnico operacional, atendendo o exigido na legislação
vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Inspeção dos Elevadores com as respectiva Anotação de
    > Responsabilidade Técnica -- ART;

-   Arquivos em mídia magnética contendo o Laudo e demais documentos em
    > anexo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção.`,
    prazos: `O Laudo será entregue no prazo máximo de até 20 (vinte) dias úteis,
contados a partir da data de recebimento da documentação solicitada em
reunião com o síndico.

Também deverá haver comprometimento mútuo para execução dos trabalhos
segundo agenda de trabalho, a ser definida de comum acordo entre o
Inspetor e o síndico na reunião inicial.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  16: {
    ao: `Para`,
    ref: `Ref.: Proposta comercial para Inspeção em Instalações Elétricas --`,
    apresentacao: `NR-10.** Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção em Instalações Elétricas,** conforme`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Inspeção em Instalações Elétricas** completa, com adoção
de metodologia adequada para análise documental, vistoria técnica,
classificação das anomalias e falhas, avaliação de riscos, priorização
de ações de manutenção, e apresentação do Laudo de Inspeção das
Instalações Elétricas, acompanhado da respectiva Anotação de
Responsabilidade Técnica -- **ART**, devidamente registrada no CREA.`,
    metodologia: `O trabalho será desenvolvido segundo regulamentado na NR-10 e
metodologia preconizada pela Associação Brasileira de Normas Técnica --
ABNT e do Instituto Brasileiro de Avaliações e Perícias - IBAPE.

Após a caracterização inicial do ambiente e registro da ART no CREA os
trabalhos seguirão com a execução das etapas/atividades seguintes:

-   Entrevista com o responsável para levantamento do histórico das
    instalações quanto a intervenções de manutenção, irregularidades e
    problemas críticos existentes, além da elaboração de agenda de
    trabalho e solicitação da documentação administrativa, técnica e de
    manutenção;

-   Análise dos dados coletados e análise da documentação solicitada
    para o estudo;

-   Realização de vistorias nas instalações e para levantamento de
    problemas existentes (Requisitos normativos), com registro
    descritivo e fotográfico para posterior análise e classificação. A
    vistoria será efetuada conforme agenda, a ser definida de comum
    acordo entre contratado e contratante, e dentro do escopo do estudo
    a ser realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança da edificação, classificação das não
    conformidades quanto a origem e risco e sua priorização, com a
    técnica GUT ajustada, e registro das soluções e serviços, com
    orientações e recomendações para contratação dos serviços de
    manutenção;

-   Elaboração e entrega do Laudo de Inspeção Elétrica, documentando a
    situação encontrada, segundo tópicos exigidos em regulamentos e
    normas, acompanhado da necessárias ART.

# A vistoria e a elaboração de laudo seguirão critérios determinados pelo Ministério do Trabalho e pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho.

#`,
    documentacao: `Em reunião com o responsável será informado do conjunto de documentos
necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta engenheiro elétrico, inscritos no CREA, e pessoal
de apoio técnico operacional, atendendo o exigido na legislação vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Inspeção com as respectivas Anotações de Responsabilidade
    > Técnica -- ART/RRT;

-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial e
    > demais documentos em anexo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > responsável;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção.`,
    prazos: `O Laudo será entregue no prazo máximo de até 10 (dez) dias úteis,
contados a partir da data de recebimento da documentação solicitada em
reunião com o responsável.

Também deverá haver comprometimento mútuo para execução dos trabalhos
segundo agenda de trabalho, a ser definida de comum acordo entre o
Inspetor e o responsável na reunião inicial.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  17: {
    ao: `Para`,
    ref: `Ref.: Proposta comercial para Inspeção em Máquinas e Equipamentos --`,
    apresentacao: `NR-12.** Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção em Máquinas e Equipamentos,**`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Inspeção em Máquinas e Equipamentos** completa, com
adoção de metodologia adequada para análise documental, vistoria
técnica, classificação das anomalias e falhas, avaliação de riscos,
priorização de ações de manutenção, e apresentação do Laudo de Inspeção
em Máquinas e Equipamentos, acompanhado da respectiva **ART**,
devidamente registrada no CREA.`,
    metodologia: `O trabalho será desenvolvido segundo regulamentado na NR-12 e
metodologia preconizada pela Associação Brasileira de Normas Técnica --
ABNT e do Instituto Brasileiro de Avaliações e Perícias - IBAPE.

Após a caracterização inicial do ambiente e registro da ART no CREA os
trabalhos seguirão com a execução das etapas/atividades seguintes:

-   Entrevista com o responsável para levantamento do histórico das
    máquinas e equipamentos quanto a intervenções de manutenção,
    irregularidades e problemas críticos existentes, além da elaboração
    de agenda de trabalho e solicitação da documentação administrativa,
    técnica e de manutenção;

-   Análise dos dados coletados e análise da documentação solicitada
    para o estudo;

-   Realização de vistorias nas instalações e levantamento de problemas
    existentes (Requisitos normativos), com registro descritivo e
    fotográfico para posterior análise e classificação. A vistoria será
    efetuada conforme agenda, a ser definida de comum acordo entre
    contratado em contratante, e dentro do escopo do estudo a ser
    realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança das máquinas e equipamentos, classificação
    das não conformidades quanto a origem e risco e sua priorização, com
    a técnica GUT ajustada, e registro das sugestões e serviços, com
    orientações e recomendações para execução dos serviços de
    manutenção;

-   Elaboração e entrega do Laudo de Inspeção em Máquinas e
    Equipamentos, documentando a situação encontrada, segundo tópicos
    exigidos em regulamentos e normas, acompanhado da necessárias ART.

# A vistoria e a elaboração de laudo seguirão critérios determinados pelo Ministério do Trabalho e pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho.

#`,
    documentacao: `Em reunião com o responsável será informado do conjunto de documentos
necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta engenheiro mecânico, inscrito no CREA, e pessoal
de apoio técnico operacional, atendendo o exigido na legislação vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Inspeção em Máquinas e Equipamentos com a respectiva
    > Anotação de Responsabilidade Técnica -- ART;

-   Arquivos em mídia magnética contendo o Laudo e demais documentos em
    > anexo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção.`,
    prazos: `O Laudo será entregue no prazo máximo de até 10 (dez) dias úteis,
contados a partir da data de recebimento da documentação solicitada em
reunião com o responsável.

Também deverá haver comprometimento mútuo para execução dos trabalhos
segundo agenda de trabalho, a ser definida de comum acordo entre o
Inspetor e o responsável na reunião inicial.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  18: {
    ao: `Para`,
    ref: `Ref.: Proposta comercial para Inspeção em Caldeiras, Vasos de Pressão,`,
    apresentacao: `Tubulações e Tanques -- NR-13.** Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços**,** conforme a NR-13 do Ministério do Trabalho,`,
    frase_servico: `O serviço de inspeção será executado para o(a) <nome do
condomínio/nome>, localizado no <endereço (logradouro,
número/complemento, bairro, município/uf)>.`,
    objetivo: `Realização de **Inspeção em Caldeiras, Vasos de Pressão, Tubulações e
Tanques** completa, com adoção de metodologia adequada para análise
documental, vistoria técnica, classificação das anomalias e falhas,
avaliação de riscos, priorização de ações de manutenção, e apresentação
do Laudo de Inspeção acompanhado da respectiva Anotação de
Responsabilidade Técnica -- **ART**, devidamente registrada no CREA.`,
    metodologia: `O trabalho será desenvolvido segundo regulamentado na NR-13 e
metodologia preconizada pela Associação Brasileira de Normas Técnica --
ABNT e do Instituto Brasileiro de Avaliações e Perícias - IBAPE.

Após a caracterização inicial do ambiente e registro da ART no CREA os
trabalhos seguirão com a execução das etapas/atividades seguintes:

-   Entrevista com o responsável para levantamento do histórico das
    manutenções e ocorrências nas instalações, irregularidades e
    problemas críticos porventura existentes, além da elaboração de
    agenda de trabalho e solicitação da documentação administrativa,
    técnica e de manutenção;

-   Análise dos dados coletados e da documentação solicitada para o
    estudo;

-   Realização de vistorias nas instalações e levantamento de problemas
    existentes (Requisitos normativos), com registro descritivo e
    fotográfico para posterior análise e classificação. A vistoria será
    efetuada conforme agenda, a ser definida de comum acordo entre
    contratado em contratante, e dentro do escopo do estudo a ser
    realizado para esta contratação;

-   Análise das não conformidades e imagens que influenciam ou poderão
    influenciar na segurança do ambiente, classificação das não
    conformidades quanto a origem e risco e sua priorização, com a
    técnica GUT ajustada, e registro das sugestões e serviços, com
    orientações e recomendações para execução dos serviços de
    manutenção;

-   Elaboração e entrega do Laudo de Inspeção, documentando a situação
    encontrada, segundo tópicos exigidos em regulamentos e normas,
    acompanhado da necessárias ART.

# A vistoria e a elaboração de laudo seguirão critérios determinados pelo Ministério do Trabalho e pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho.

#`,
    documentacao: `Em reunião com o responsável será informado do conjunto de documentos
necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta engenheiro mecânico, inscrito no CREA, e pessoal
de apoio técnico operacional, atendendo o exigido na legislação vigente.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Laudo de Inspeção com a respectiva Anotação de Responsabilidade
    > Técnica -- ART;

-   Arquivos em mídia magnética contendo o Laudo e demais documentos em
    > anexo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção.`,
    prazos: `O Laudo será entregue no prazo máximo de até 10 (dez) dias úteis,
contados a partir da data de recebimento da documentação solicitada em
reunião com o responsável.

Também deverá haver comprometimento mútuo para execução dos trabalhos
segundo agenda de trabalho, a ser definida de comum acordo entre o
Inspetor e o responsável na reunião inicial.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
  19: {
    ao: `AO`,
    ref: `Ref.: Proposta comercial para Elaboração de Plano de Manutenção.`,
    apresentacao: `Conforme solicitado, apresentamos nossa proposta técnica e comercial para elaboração de Plano de Manutenção, seguindo o preconizado pela ABNT NBR 16.280, normas correlatas e legislação vigente.`,
    frase_servico: `O serviço será executado para o(a) <nome do condomínio/nome>,
localizado no <endereço (logradouro, número/complemento, bairro,
município/uf)>.`,
    objetivo: `Elaborar um **Plano de Manutenção Predial**, com adoção de metodologia
adequada para análise documental, vistoria técnica, definição de
soluções para as manifestações patológicas e procedimentos corretivos
objeto do escopo do trabalho, a ser utilizado para restabelecer as
condições de segurança e habitabilidade da edificação, acompanhado da
respectiva Anotações de Responsabilidade Técnica -- **ART's/RRT's**,
devidamente registrada no CREA.`,
    metodologia: `O trabalho será desenvolvido segundo boas práticas de engenharia e
metodologia preconizada pela Associação Brasileira de Normas Técnica --
ABNT. Após a caracterização inicial da edificação e registro da ART/RRT
no CREA/CAU, os trabalhos seguirão com a execução das etapas/atividades
seguintes:

-   Entrevista com o responsável para levantamento do histórico do
    imóvel quanto a intervenções de manutenção, irregularidades e
    problemas críticos existentes, além da elaboração de agenda de
    trabalho e solicitação da documentação administrativa, técnica e de
    manutenção;

-   Análise dos dados coletados sobre as características da região e do
    histórico do imóvel, e análise da documentação solicitada para o
    estudo;

-   Caso a última inspeção predial tenha ocorrido a mais de 18 (dezoito)
    meses, será realizada uma vistoria nas instalações e sistemas
    construtivos da edificação para levantamento de problemas existentes
    (manifestações patológicas), com registro descritivo e fotográfico
    para posterior análise e classificação, dentro do escopo do estudo a
    ser realizado para esta contratação;

-   Elaboração e entrega do Plano de Manutenção, documentando a situação
    encontrada, e apresentando as soluções e procedimentos corretivos a
    serem efetuados para restabelecer as condições de segurança e
    habitabilidade da edificação.`,
    documentacao: `Em reunião com o síndico o condomínio será informado do conjunto de
documentos necessárias à realização do trabalho.

Temos como política de privacidade o sigilo de todo o material fornecido
pelos clientes, sendo que até a apresentação desta proposta não tivemos
acesso a qualquer tipo de informação que possa ser enquadrada como de
caráter reservado.

Fica ainda consignado que a reprodução total ou parcial do trabalho por
qualquer forma mecânica ou eletrônica, somente poderá ser realizada com
nossa autorização expressa, detentora dos direitos autorais.`,
    equipe: `**4.1.- Equipe de Trabalho:**

A equipe será composta por arquiteto ou engenheiros civil, inscritos no
CREA/CAU, e pessoal de apoio técnico operacional, atendendo o exigido
para desenvolvimento deste tipo de trabalho.

**4.2.- Produtos Entregues.**

Após a conclusão dos trabalhos será entregue:

-   Plano de Manutenção Predial com as respectivas Anotações de
    > Responsabilidade Técnica -- ART/RRT;

-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial
    > (caso elaborado) e demais documentos em anexo.`,
    honorarios: `O preço dos serviços, com base na estimativa de horas trabalhadas,
conforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e
Perícias, e válido para 30 (trinta) dias, a partir desta data, é o
seguinte:

-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por
    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%
    referente a emissão da nota fiscal.

-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,
    correrão à conta do proponente.

O pagamento deverá ser efetuado mediante depósito bancário, ou outra
forma ajustada entre os contratantes, nas seguintes condições:

-   50% (cinquenta por cento) na data de realização da reunião com o
    > síndico;

-   50% (cinquenta por cento) para pagamento na entrega do Laudo de
    > Inspeção.`,
    prazos: `O Plano de Manutenção Predial será entregue no prazo máximo de até 12
(doze) dias úteis, contados a partir da data de recebimento da
documentação solicitada em reunião com o síndico.

Também deverá haver comprometimento mútuo para execução dos trabalhos
segundo agenda de trabalho, a ser definida de comum acordo entre o
Inspetor e o síndico na reunião inicial.`,
    rescisao: `Caso haja supressão total ou parcial do trabalho por interesse do
contratante, o contratado fará jus ao valor respectivo dos honorários
ainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso
da parcela já recebida.

Além disso, fica consignado que eventuais alterações do trabalho somente
serão efetuadas até 30 (trinta) dias após a entrega do plano, sem custo
adicional.

Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade,
permanecemos à inteira disposição, para quaisquer esclarecimentos que se
fizerem necessários.`,
  },
};
