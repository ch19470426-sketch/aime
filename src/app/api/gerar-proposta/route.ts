// src/app/api/gerar-proposta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const C: Record<string, Record<string, string>> = {
  "11": {
    "ao": "AO",
    "ref": "Ref.: Proposta para Autovistoria.",
    "apresentacao": "Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços Autovistoria**,** conforme a ABNT NBR 16.747/2020, normas correlatas e Norma de Inspeção Predial do IBAPE/2025.",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Autovistoria** completa, com adoção de metodologia\nadequada para análise documental, vistoria técnica, classificação das\nanomalias e falhas, avaliação de riscos, priorização de ações de\nmanutenção, e apresentação do Laudo de Inspeção da Edificação,\nacompanhado da respectiva Anotação de Responsabilidade Técnica --\n**ART's/RRT**, devidamente registrada no CREA/CAU.",
    "metodologia": "O trabalho será desenvolvido segundo metodologia preconizada pela\nAssociação Brasileira de Normas Técnica -- ABNT e do Instituto\nBrasileiro de Avaliações e Perícias -- IBAPE e legislação vigente.\n\nApós a caracterização inicial da edificação e registro da ART no CREA os\ntrabalhos seguirão com a execução das etapas/atividades seguintes:\n\n-   Entrevista com o síndico para levantamento do histórico do imóvel\n    quanto a intervenções de manutenção, irregularidades e problemas\n    críticos existentes, além da elaboração de agenda de trabalho e\n    solicitação da documentação administrativa, técnica e de manutenção;\n\n-   Análise dos dados coletados sobre as características da região e do\n    histórico do imóvel, e análise da documentação solicitada para o\n    estudo;\n\n-   Realização de vistorias nas instalações e sistemas construtivos da\n    edificação para levantamento de problemas existentes (anomalias e\n    falhas), com registro descritivo e fotográfico para posterior\n    análise e classificação. A vistoria será efetuada conforme agenda, a\n    ser definida de comum acordo entre contratado e contratante, e\n    dentro do escopo do estudo a ser realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança da edificação, classificação das\n    manifestações patológicas quanto a origem e risco e sua priorização,\n    com a técnica GUT, e registro das soluções e serviços para\n    manutenção predial;\n\n-   Elaboração e entrega do Laudo de Autovistoria, documentando a\n    situação encontrada, segundo tópicos exigidos na norma de inspeção\n    predial, acompanhado das necessárias ARTs.\n\n# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR-13.752/96 (Perícias de Engenharia na Construção Civil) e a NBR-16.747/2020 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025 e demais legislações.",
    "documentacao": "Em reunião com o síndico o condomínio será informado do conjunto de\ndocumentos necessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta por engenheiros civil e elétrico, inscritos no\nCREA, e pessoal de apoio técnico operacional, atendendo o exigido na\nlegislação vigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Inspeção predial com as respectivas Anotações de\n    > Responsabilidade Técnica -- ARTs, registradas no CREA/CAU;\n\n-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial e\n    > demais documentos em anexo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção da Edificação.",
    "prazos": "O Laudo de Inspeção Predial será entregue no prazo máximo de até 15\n(quinze) dias úteis, contados a partir da data de recebimento da\ndocumentação solicitada em reunião com o síndico.\n\nTambém deverá haver comprometimento mútuo para execução dos trabalhos\nsegundo agenda de trabalho, a ser definida de comum acordo entre o\nInspetor e o síndico na reunião inicial.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do LITE, sem custo\nadicional.\n\nQuanto à execução do presente trabalho, no que se refere a títulos\nexecutivos, fica eleito o foro de Vitória/ES, com renúncia a qualquer\noutro.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "12": {
    "ao": "AO",
    "ref": "Ref.: Proposta comercial para Inspeção Predial.",
    "apresentacao": "Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção Predial,** conforme a ABNT NBR 16.747/2020, normas correlatas e Norma de Inspeção Predial do",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Inspeção Predial** completa, com adoção de metodologia\nadequada para análise documental, vistoria técnica, classificação das\nanomalias e falhas, avaliação de riscos, priorização de ações de\nmanutenção, e apresentação do Laudo de Inspeção da Edificação,\nacompanhado das respectivas Anotações de Responsabilidade Técnica --\n**ART's/RRT's**, devidamente registrada no CREA.",
    "metodologia": "O trabalho será desenvolvido segundo metodologia preconizada pela\nAssociação Brasileira de Normas Técnica -- ABNT e do Instituto\nBrasileiro de Avaliações e Perícias - IBAPE.\n\nApós a caracterização inicial da edificação e registro da ART/RRT no\nCREA os trabalhos seguirão com a execução das etapas/atividades\nseguintes:\n\n-   Entrevista com o síndico para levantamento do histórico do imóvel\n    quanto a intervenções de manutenção, irregularidades e problemas\n    críticos existentes, além da elaboração de agenda de trabalho e\n    solicitação da documentação administrativa, técnica e de manutenção;\n\n-   Análise dos dados coletados sobre as características da região e do\n    histórico do imóvel, e análise da documentação solicitada para o\n    estudo;\n\n-   Realização de vistoria nos sistemas construtivos da edificação para\n    levantamento de problemas existentes (anomalias e falhas), com\n    registro descritivo e fotográfico para posterior análise e\n    classificação. A vistoria será efetuada conforme agenda, a ser\n    definida de comum acordo entre contratado e contratante, e dentro do\n    escopo do estudo a ser realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança da edificação, classificação das\n    manifestações patológicas quanto a origem e risco e sua priorização,\n    com a técnica GUT ajustada, e registro das soluções e serviços para\n    manutenção predial;\n\n-   Elaboração e entrega do Laudo de Inspeção Predial, documentando a\n    situação encontrada, segundo tópicos exigidos na norma de inspeção\n    predial, acompanhado das necessárias ARTs/RRT's.\n\n# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR-13.752/96 (Perícias de Engenharia na Construção Civil) e a NBR-16.747/2020 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025.",
    "documentacao": "Em reunião com o síndico o condomínio será informado do conjunto de\ndocumentos necessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta por arquiteto ou engenheiros civil e elétrico,\ninscritos no CREA, e pessoal de apoio técnico operacional, atendendo o\nexigido na legislação vigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Inspeção predial com as respectivas Anotações de\n    > Responsabilidade Técnica -- ART/RRT;\n\n-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial e\n    > demais documentos em anexo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção da Edificação.",
    "prazos": "O Laudo de Inspeção Predial será entregue no prazo máximo de até 20\n(vinte) dias úteis, contados a partir da data de recebimento da\ndocumentação solicitada em reunião com o síndico.\n\nTambém deverá haver comprometimento mútuo para execução dos trabalhos\nsegundo agenda de trabalho, a ser definida de comum acordo entre o\nInspetor e o síndico na reunião inicial.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do LITE, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "13": {
    "ao": "AO",
    "ref": "Ref.: Proposta Técnica para Vistoria em Imóvel Novo",
    "apresentacao": "Conforme solicitado, apresentamos a proposta técnica e comercial para execução do serviço de **Vistoria em Imóvel Novo,** seguindo as recomendações da ABNT/NBR 15.575 e normas correlatas, Norma de Inspeção",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Vistoria** completa, com adoção de metodologia adequada\npara análise documental, classificação das anomalias e falhas, avaliação\nde riscos, priorização, e apresentação do Laudo de Vistoria.",
    "metodologia": "O trabalho será desenvolvido segundo metodologia preconizada pela\nAssociação Brasileira de Normas Técnica -- ABNT e do Instituto\nBrasileiro de Avaliações e Perícias - IBAPE.\n\nApós a caracterização inicial do imóvel os trabalhos seguirão com a\nexecução das etapas/atividades seguintes:\n\n-   Reunião com o proprietário para solicitação da documentação\n    administrativa, técnica e legal;\n\n-   Análise da documentação do imóvel solicitada para o trabalho;\n\n-   Realização de vistoria nas instalações do imóvel para levantamento\n    de problemas existentes (anomalias e falhas), com registro\n    descritivo e fotográfico para posterior análise e classificação. A\n    vistoria será efetuada conforme agenda, a ser definida de comum\n    acordo entre contratado e contratante, e dentro do escopo do estudo\n    a ser realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança da edificação, classificação das\n    manifestações patológicas quanto a origem e risco e sua priorização,\n    com a técnica GUT ajustada;\n\n-   Elaboração e entrega do Laudo de Vistoria, documentando a situação\n    encontrada, segundo tópicos exigidos em normas.\n\n# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR 15.575 (Desempenho), NBR-13.752 (Perícias de Engenharia na Construção Civil) e a NBR-16.747 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025.",
    "documentacao": "Em reunião com o proprietário será informado do conjunto de documentos\nnecessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta por engenheiro civil, arquiteto ou técnico de\nedificações, devidamente inscritos em seus órgãos de registro\nprofissional, atendendo o exigido na legislação vigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Vistoria do Imóvel;\n\n-   Arquivos em mídia magnética contendo o laudo e demais documentos.\n\nO Manual de Uso, Operação e Manutenção da unidade será consultado para\nverificação e comparação com as condições do imóvel em estudo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do laudo de\n    > Inspeção.",
    "prazos": "O Laudo de Vistoria será entregue no prazo máximo de até 12 (doze) dias\núteis, contados a partir da data de recebimento da documentação\nsolicitada em reunião com o proprietário.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "14": {
    "ao": "AO",
    "ref": "Ref.: Proposta Comercial para Inspeção de fachada.",
    "apresentacao": "Conforme solicitação, apresentamos a proposta técnica e comercial para execução do serviço de **Inspeção de Fachadas,** seguindo as recomendações NBR 13.755, NBR 13.749, NBR 16.747, normas complementares",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Vistoria** completa, com adoção de metodologia adequada\npara análise documental, classificação das anomalias e falhas, avaliação\nde riscos, priorização, e apresentação do Laudo de Vistoria.\n\nAvaliar o estado de conservação e aderência dos revestimentos com\nverificação da estanqueidade, segurança e durabilidade para identificar\nanomalias que possam causar desprendimentos ou infiltrações, visando\nprevenir acidentes (queda de revestimentos), garantir desempenho e veda\nútil e subsidiar a manutenção e a reabilitação, e apresentação do Laudo\nde Inspeção das Fachadas, acompanhado da respectiva ART/RRT.",
    "metodologia": "O trabalho será desenvolvido segundo metodologia preconizada pela\nAssociação Brasileira de Normas Técnica -- ABNT e do Instituto\nBrasileiro de Avaliações e Perícias - IBAPE.\n\nApós a caracterização inicial da edificação e registro da ART/RRT no\nCREA os trabalhos seguirão com a execução das etapas/atividades\nseguintes:\n\n-   Entrevista com o síndico para levantamento do histórico da fachada\n    quanto a intervenções de manutenção, irregularidades e problemas\n    críticos existentes, além da elaboração de agenda de trabalho e\n    solicitação da documentação administrativa, técnica e de manutenção;\n\n-   Análise dos dados coletados e da documentação solicitada para o\n    estudo;\n\n-   Realização de vistorias nas instalações e sistemas construtivos da\n    edificação para levantamento de problemas existentes (anomalias e\n    falhas), com registro descritivo e fotográfico para posterior\n    análise e classificação. A vistoria será efetuada conforme agenda, a\n    definida de comum acordo entre contratado e contratante, e dentro do\n    escopo do estudo a ser realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança da fachada, classificação das manifestações\n    patológicas quanto a origem e risco e sua priorização, com a técnica\n    GUT ajustada, e registro das soluções e serviços, com orientações e\n    recomendações para contratação dos serviços de manutenção predial;\n\n-   Elaboração e entrega do Laudo de Inspeção da Fachada, documentando a\n    situação encontrada, segundo tópicos exigidos em normas, acompanhado\n    das necessárias ART/RRT.\n\n# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR 16.747-- Diretrizes, Conceitos, Terminologia e Procedimentos) e a Norma de Inspeção Predial do IBAPE/2025.",
    "documentacao": "Em reunião com o síndico será informado do conjunto de documentos\nnecessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta por engenheiro civil ou arquiteto, devidamente\ninscritos em seus órgãos de registro profissional, e pessoal de apoio\noperacional, atendendo o exigido na legislação vigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Inspeção das Fachadas;\n\n-   Arquivos em mídia magnética contendo o laudo e demais documentos.\n\nO Manual de Uso, Operação e Manutenção da unidade será consultado para\nverificação e comparação com as condições de projeto.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção.",
    "prazos": "O Laudo de Vistoria será entregue no prazo máximo de até 20 (vinte) dias\núteis, contados a partir da data de recebimento da documentação\nsolicitada em reunião com o proprietário.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "15": {
    "ao": "AO",
    "ref": "Ref.: Proposta comercial para Inspeção Inteligente de Elevadores.",
    "apresentacao": "Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção Inteligente em Elevadores,** conforme a ABNT NBR 16.858, metodologia da NBR 16.747ajustada e normas",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Inspeção em Elevadores** completa, com adoção de\nmetodologia adequada para análise documental, vistoria técnica,\nclassificação das anomalias e falhas, avaliação de riscos, priorização\nde ações de manutenção, e apresentação do Laudo dos Elevadores,\nacompanhado da respectiva Anotação de Responsabilidade Técnica --\n**ART**, devidamente registrada no CREA.",
    "metodologia": "O trabalho será desenvolvido segundo metodologia preconizada pela\nAssociação Brasileira de Normas Técnica -- ABNT e regulamentações\nespecíficas.\n\nApós a caracterização inicial dos elevadores e registro da ART no CREA\nos trabalhos seguirão com a execução das etapas/atividades seguintes:\n\n-   Entrevista com o síndico para levantamento do histórico dos\n    elevadores quanto a intervenções de manutenção, irregularidades e\n    problemas críticos existentes, além da elaboração de agenda de\n    trabalho e solicitação da documentação administrativa, técnica e de\n    manutenção;\n\n-   Análise dos dados coletados e do histórico dos elevadores, e análise\n    da documentação solicitada para o estudo;\n\n-   Realização de vistorias nas instalações para levantamento de\n    problemas existentes (Requisitos normativos), com registro\n    descritivo e fotográfico para posterior análise e classificação. A\n    vistoria será efetuada conforme agenda, a ser definida de comum\n    acordo entre contratado e contratante, e dentro do escopo do estudo\n    a ser realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança da edificação, classificação das\n    manifestações patológicas quanto a origem e risco e sua priorização,\n    com a técnica GUT ajustada, e registro dos serviços, com orientações\n    e recomendações para contratação dos serviços de manutenção;\n\n-   Elaboração e entrega do Laudo de Inspeção de Elevadores,\n    documentando a situação encontrada, segundo tópicos exigidos em\n    normas, acompanhado da necessária ART.\n\n# A vistoria e a elaboração do laudo seguirão critérios determinados pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho, conforme relação oficial, especialmente a NBR 16.858 (Série) e a metodologia preconizada pela NBR-16.747 (Inspeção Predial -- Diretrizes, Conceitos, Terminologia e Procedimentos) ajustada.",
    "documentacao": "Em reunião com o síndico o condomínio será informado do conjunto de\ndocumentos necessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta por engenheiros mecânico, inscritos no CREA, e\npessoal de apoio técnico operacional, atendendo o exigido na legislação\nvigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Inspeção dos Elevadores com as respectiva Anotação de\n    > Responsabilidade Técnica -- ART;\n\n-   Arquivos em mídia magnética contendo o Laudo e demais documentos em\n    > anexo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção.",
    "prazos": "O Laudo será entregue no prazo máximo de até 20 (vinte) dias úteis,\ncontados a partir da data de recebimento da documentação solicitada em\nreunião com o síndico.\n\nTambém deverá haver comprometimento mútuo para execução dos trabalhos\nsegundo agenda de trabalho, a ser definida de comum acordo entre o\nInspetor e o síndico na reunião inicial.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "16": {
    "ao": "Para",
    "ref": "Ref.: Proposta comercial para Inspeção em Instalações Elétricas --",
    "apresentacao": "NR-10.** Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção em Instalações Elétricas,** conforme",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Inspeção em Instalações Elétricas** completa, com adoção\nde metodologia adequada para análise documental, vistoria técnica,\nclassificação das anomalias e falhas, avaliação de riscos, priorização\nde ações de manutenção, e apresentação do Laudo de Inspeção das\nInstalações Elétricas, acompanhado da respectiva Anotação de\nResponsabilidade Técnica -- **ART**, devidamente registrada no CREA.",
    "metodologia": "O trabalho será desenvolvido segundo regulamentado na NR-10 e\nmetodologia preconizada pela Associação Brasileira de Normas Técnica --\nABNT e do Instituto Brasileiro de Avaliações e Perícias - IBAPE.\n\nApós a caracterização inicial do ambiente e registro da ART no CREA os\ntrabalhos seguirão com a execução das etapas/atividades seguintes:\n\n-   Entrevista com o responsável para levantamento do histórico das\n    instalações quanto a intervenções de manutenção, irregularidades e\n    problemas críticos existentes, além da elaboração de agenda de\n    trabalho e solicitação da documentação administrativa, técnica e de\n    manutenção;\n\n-   Análise dos dados coletados e análise da documentação solicitada\n    para o estudo;\n\n-   Realização de vistorias nas instalações e para levantamento de\n    problemas existentes (Requisitos normativos), com registro\n    descritivo e fotográfico para posterior análise e classificação. A\n    vistoria será efetuada conforme agenda, a ser definida de comum\n    acordo entre contratado e contratante, e dentro do escopo do estudo\n    a ser realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança da edificação, classificação das não\n    conformidades quanto a origem e risco e sua priorização, com a\n    técnica GUT ajustada, e registro das soluções e serviços, com\n    orientações e recomendações para contratação dos serviços de\n    manutenção;\n\n-   Elaboração e entrega do Laudo de Inspeção Elétrica, documentando a\n    situação encontrada, segundo tópicos exigidos em regulamentos e\n    normas, acompanhado da necessárias ART.\n\n# A vistoria e a elaboração de laudo seguirão critérios determinados pelo Ministério do Trabalho e pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho.\n\n#",
    "documentacao": "Em reunião com o responsável será informado do conjunto de documentos\nnecessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta engenheiro elétrico, inscritos no CREA, e pessoal\nde apoio técnico operacional, atendendo o exigido na legislação vigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Inspeção com as respectivas Anotações de Responsabilidade\n    > Técnica -- ART/RRT;\n\n-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial e\n    > demais documentos em anexo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > responsável;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção.",
    "prazos": "O Laudo será entregue no prazo máximo de até 10 (dez) dias úteis,\ncontados a partir da data de recebimento da documentação solicitada em\nreunião com o responsável.\n\nTambém deverá haver comprometimento mútuo para execução dos trabalhos\nsegundo agenda de trabalho, a ser definida de comum acordo entre o\nInspetor e o responsável na reunião inicial.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "17": {
    "ao": "Para",
    "ref": "Ref.: Proposta comercial para Inspeção em Máquinas e Equipamentos --",
    "apresentacao": "NR-12.** Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços de **Inspeção em Máquinas e Equipamentos,**",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Inspeção em Máquinas e Equipamentos** completa, com\nadoção de metodologia adequada para análise documental, vistoria\ntécnica, classificação das anomalias e falhas, avaliação de riscos,\npriorização de ações de manutenção, e apresentação do Laudo de Inspeção\nem Máquinas e Equipamentos, acompanhado da respectiva **ART**,\ndevidamente registrada no CREA.",
    "metodologia": "O trabalho será desenvolvido segundo regulamentado na NR-12 e\nmetodologia preconizada pela Associação Brasileira de Normas Técnica --\nABNT e do Instituto Brasileiro de Avaliações e Perícias - IBAPE.\n\nApós a caracterização inicial do ambiente e registro da ART no CREA os\ntrabalhos seguirão com a execução das etapas/atividades seguintes:\n\n-   Entrevista com o responsável para levantamento do histórico das\n    máquinas e equipamentos quanto a intervenções de manutenção,\n    irregularidades e problemas críticos existentes, além da elaboração\n    de agenda de trabalho e solicitação da documentação administrativa,\n    técnica e de manutenção;\n\n-   Análise dos dados coletados e análise da documentação solicitada\n    para o estudo;\n\n-   Realização de vistorias nas instalações e levantamento de problemas\n    existentes (Requisitos normativos), com registro descritivo e\n    fotográfico para posterior análise e classificação. A vistoria será\n    efetuada conforme agenda, a ser definida de comum acordo entre\n    contratado em contratante, e dentro do escopo do estudo a ser\n    realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança das máquinas e equipamentos, classificação\n    das não conformidades quanto a origem e risco e sua priorização, com\n    a técnica GUT ajustada, e registro das sugestões e serviços, com\n    orientações e recomendações para execução dos serviços de\n    manutenção;\n\n-   Elaboração e entrega do Laudo de Inspeção em Máquinas e\n    Equipamentos, documentando a situação encontrada, segundo tópicos\n    exigidos em regulamentos e normas, acompanhado da necessárias ART.\n\n# A vistoria e a elaboração de laudo seguirão critérios determinados pelo Ministério do Trabalho e pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho.\n\n#",
    "documentacao": "Em reunião com o responsável será informado do conjunto de documentos\nnecessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta engenheiro mecânico, inscrito no CREA, e pessoal\nde apoio técnico operacional, atendendo o exigido na legislação vigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Inspeção em Máquinas e Equipamentos com a respectiva\n    > Anotação de Responsabilidade Técnica -- ART;\n\n-   Arquivos em mídia magnética contendo o Laudo e demais documentos em\n    > anexo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção.",
    "prazos": "O Laudo será entregue no prazo máximo de até 10 (dez) dias úteis,\ncontados a partir da data de recebimento da documentação solicitada em\nreunião com o responsável.\n\nTambém deverá haver comprometimento mútuo para execução dos trabalhos\nsegundo agenda de trabalho, a ser definida de comum acordo entre o\nInspetor e o responsável na reunião inicial.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "18": {
    "ao": "Para",
    "ref": "Ref.: Proposta comercial para Inspeção em Caldeiras, Vasos de Pressão,",
    "apresentacao": "Tubulações e Tanques -- NR-13.** Conforme solicitado, apresentamos a proposta técnica e comercial para execução dos serviços**,** conforme a NR-13 do Ministério do Trabalho,",
    "frase_servico": "O serviço de inspeção será executado para o(a) <nome do\ncondomínio/nome>, localizado no <endereço (logradouro,\nnúmero/complemento, bairro, município/uf)>.",
    "objetivo": "Realização de **Inspeção em Caldeiras, Vasos de Pressão, Tubulações e\nTanques** completa, com adoção de metodologia adequada para análise\ndocumental, vistoria técnica, classificação das anomalias e falhas,\navaliação de riscos, priorização de ações de manutenção, e apresentação\ndo Laudo de Inspeção acompanhado da respectiva Anotação de\nResponsabilidade Técnica -- **ART**, devidamente registrada no CREA.",
    "metodologia": "O trabalho será desenvolvido segundo regulamentado na NR-13 e\nmetodologia preconizada pela Associação Brasileira de Normas Técnica --\nABNT e do Instituto Brasileiro de Avaliações e Perícias - IBAPE.\n\nApós a caracterização inicial do ambiente e registro da ART no CREA os\ntrabalhos seguirão com a execução das etapas/atividades seguintes:\n\n-   Entrevista com o responsável para levantamento do histórico das\n    manutenções e ocorrências nas instalações, irregularidades e\n    problemas críticos porventura existentes, além da elaboração de\n    agenda de trabalho e solicitação da documentação administrativa,\n    técnica e de manutenção;\n\n-   Análise dos dados coletados e da documentação solicitada para o\n    estudo;\n\n-   Realização de vistorias nas instalações e levantamento de problemas\n    existentes (Requisitos normativos), com registro descritivo e\n    fotográfico para posterior análise e classificação. A vistoria será\n    efetuada conforme agenda, a ser definida de comum acordo entre\n    contratado em contratante, e dentro do escopo do estudo a ser\n    realizado para esta contratação;\n\n-   Análise das não conformidades e imagens que influenciam ou poderão\n    influenciar na segurança do ambiente, classificação das não\n    conformidades quanto a origem e risco e sua priorização, com a\n    técnica GUT ajustada, e registro das sugestões e serviços, com\n    orientações e recomendações para execução dos serviços de\n    manutenção;\n\n-   Elaboração e entrega do Laudo de Inspeção, documentando a situação\n    encontrada, segundo tópicos exigidos em regulamentos e normas,\n    acompanhado da necessárias ART.\n\n# A vistoria e a elaboração de laudo seguirão critérios determinados pelo Ministério do Trabalho e pela Associação Brasileira de Normas Técnicas -- ABNT, aplicáveis ao trabalho.\n\n#",
    "documentacao": "Em reunião com o responsável será informado do conjunto de documentos\nnecessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta engenheiro mecânico, inscrito no CREA, e pessoal\nde apoio técnico operacional, atendendo o exigido na legislação vigente.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Laudo de Inspeção com a respectiva Anotação de Responsabilidade\n    > Técnica -- ART;\n\n-   Arquivos em mídia magnética contendo o Laudo e demais documentos em\n    > anexo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção.",
    "prazos": "O Laudo será entregue no prazo máximo de até 10 (dez) dias úteis,\ncontados a partir da data de recebimento da documentação solicitada em\nreunião com o responsável.\n\nTambém deverá haver comprometimento mútuo para execução dos trabalhos\nsegundo agenda de trabalho, a ser definida de comum acordo entre o\nInspetor e o responsável na reunião inicial.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do laudo, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  },
  "19": {
    "ao": "AO",
    "ref": "Ref.: Proposta comercial para Elaboração de Plano de Manutenção.",
    "apresentacao": "Conforme solicitado, apresentamos nossa proposta técnica e comercial para elaboração de Plano de Manutenção, seguindo o preconizado pela ABNT NBR 16.280, normas correlatas e legislação vigente.",
    "frase_servico": "O serviço será executado para o(a) <nome do condomínio/nome>,\nlocalizado no <endereço (logradouro, número/complemento, bairro,\nmunicípio/uf)>.",
    "objetivo": "Elaborar um **Plano de Manutenção Predial**, com adoção de metodologia\nadequada para análise documental, vistoria técnica, definição de\nsoluções para as manifestações patológicas e procedimentos corretivos\nobjeto do escopo do trabalho, a ser utilizado para restabelecer as\ncondições de segurança e habitabilidade da edificação, acompanhado da\nrespectiva Anotações de Responsabilidade Técnica -- **ART's/RRT's**,\ndevidamente registrada no CREA.",
    "metodologia": "O trabalho será desenvolvido segundo boas práticas de engenharia e\nmetodologia preconizada pela Associação Brasileira de Normas Técnica --\nABNT. Após a caracterização inicial da edificação e registro da ART/RRT\nno CREA/CAU, os trabalhos seguirão com a execução das etapas/atividades\nseguintes:\n\n-   Entrevista com o responsável para levantamento do histórico do\n    imóvel quanto a intervenções de manutenção, irregularidades e\n    problemas críticos existentes, além da elaboração de agenda de\n    trabalho e solicitação da documentação administrativa, técnica e de\n    manutenção;\n\n-   Análise dos dados coletados sobre as características da região e do\n    histórico do imóvel, e análise da documentação solicitada para o\n    estudo;\n\n-   Caso a última inspeção predial tenha ocorrido a mais de 18 (dezoito)\n    meses, será realizada uma vistoria nas instalações e sistemas\n    construtivos da edificação para levantamento de problemas existentes\n    (manifestações patológicas), com registro descritivo e fotográfico\n    para posterior análise e classificação, dentro do escopo do estudo a\n    ser realizado para esta contratação;\n\n-   Elaboração e entrega do Plano de Manutenção, documentando a situação\n    encontrada, e apresentando as soluções e procedimentos corretivos a\n    serem efetuados para restabelecer as condições de segurança e\n    habitabilidade da edificação.",
    "documentacao": "Em reunião com o síndico o condomínio será informado do conjunto de\ndocumentos necessárias à realização do trabalho.\n\nTemos como política de privacidade o sigilo de todo o material fornecido\npelos clientes, sendo que até a apresentação desta proposta não tivemos\nacesso a qualquer tipo de informação que possa ser enquadrada como de\ncaráter reservado.\n\nFica ainda consignado que a reprodução total ou parcial do trabalho por\nqualquer forma mecânica ou eletrônica, somente poderá ser realizada com\nnossa autorização expressa, detentora dos direitos autorais.",
    "equipe": "**4.1.- Equipe de Trabalho:**\n\nA equipe será composta por arquiteto ou engenheiros civil, inscritos no\nCREA/CAU, e pessoal de apoio técnico operacional, atendendo o exigido\npara desenvolvimento deste tipo de trabalho.\n\n**4.2.- Produtos Entregues.**\n\nApós a conclusão dos trabalhos será entregue:\n\n-   Plano de Manutenção Predial com as respectivas Anotações de\n    > Responsabilidade Técnica -- ART/RRT;\n\n-   Arquivos em mídia magnética contendo o Laudo de Inspeção Predial\n    > (caso elaborado) e demais documentos em anexo.",
    "honorarios": "O preço dos serviços, com base na estimativa de horas trabalhadas,\nconforme tabela do IBAPE -- Instituto Brasileiro de Avaliações e\nPerícias, e válido para 30 (trinta) dias, a partir desta data, é o\nseguinte:\n\n-   O valor pela prestação do serviço é de **R\\$ <valor> (<valor por\n    extenso> reais)** sem encargos. Este valor será acrescido de 15,50%\n    referente a emissão da nota fiscal.\n\n-   Os demais impostos e taxas, inclusive encargos sociais pertinentes,\n    correrão à conta do proponente.\n\nO pagamento deverá ser efetuado mediante depósito bancário, ou outra\nforma ajustada entre os contratantes, nas seguintes condições:\n\n-   50% (cinquenta por cento) na data de realização da reunião com o\n    > síndico;\n\n-   50% (cinquenta por cento) para pagamento na entrega do Laudo de\n    > Inspeção.",
    "prazos": "O Plano de Manutenção Predial será entregue no prazo máximo de até 12\n(doze) dias úteis, contados a partir da data de recebimento da\ndocumentação solicitada em reunião com o síndico.\n\nTambém deverá haver comprometimento mútuo para execução dos trabalhos\nsegundo agenda de trabalho, a ser definida de comum acordo entre o\nInspetor e o síndico na reunião inicial.",
    "rescisao": "Caso haja supressão total ou parcial do trabalho por interesse do\ncontratante, o contratado fará jus ao valor respectivo dos honorários\nainda devidos, não havendo obrigatoriedade de qualquer tipo de reembolso\nda parcela já recebida.\n\nAlém disso, fica consignado que eventuais alterações do trabalho somente\nserão efetuadas até 30 (trinta) dias após a entrega do plano, sem custo\nadicional.\n\nCertos de que prestaremos à V.S. um serviço de alto padrão de qualidade,\npermanecemos à inteira disposição, para quaisquer esclarecimentos que se\nfizerem necessários."
  }
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function dataExtenso(d: Date) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

const UN = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
const DEZ = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
const CEN = ['','cem','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos']

function n2e(n: number): string {
  if (n===0) return 'zero'
  if (n<20) return UN[n]
  if (n<100) return n%10===0 ? DEZ[Math.floor(n/10)] : `${DEZ[Math.floor(n/10)]} e ${UN[n%10]}`
  if (n===100) return 'cem'
  if (n<1000) return n%100===0 ? CEN[Math.floor(n/100)] : `${CEN[Math.floor(n/100)]} e ${n2e(n%100)}`
  if (n<1000000) { const m=Math.floor(n/1000); const r=n%1000; const ms=m===1?'mil':`${n2e(m)} mil`; return r===0?ms:`${ms} e ${n2e(r)}` }
  return n.toString()
}

function valorExt(v: string) {
  const n = parseFloat(v.replace(',','.'))
  if (isNaN(n)) return ''
  const i = Math.floor(n); const c = Math.round((n-i)*100)
  return c>0 ? `${n2e(i)} e ${n2e(c)} centavos` : n2e(i)
}

function limpar(s: string): string {
  // Remove # de início, remove > solto, converte ** e *
  return s
    .replace(/^#+\s*/,'')
    .replace(/\*\*([^*]*?)\*\*/g,'<b>$1</b>')
    .replace(/\*([^*]*?)\*/g,'<i>$1</i>')
    .replace(/(?<![a-zA-Z0-9])>(?![=])/g,'')
    .trim()
}

function md2html(txt: string): string {
  const SP = 'style="text-align:justify;margin:6pt 0"'
  const SL = 'style="text-align:justify;text-align-last:left"'
  const linhas = txt.split('\n')
  let html = ''; let inUl = false
  let paraAtual = ''; let liAtual = ''

  function flushPara() {
    if (paraAtual.trim()) {
      html += `<p ${SP}>${paraAtual.trim()}</p>`
      paraAtual = ''
    }
  }
  function flushLi() {
    if (liAtual.trim()) {
      html += `<li ${SL}>${liAtual.trim()}</li>`
      liAtual = ''
    }
  }

  for (const linha of linhas) {
    const raw = linha.trim()
    // Detectar marcador antes de limpar
    const ehMarcador = /^[-–•]/.test(raw) || /^>\s+[A-Z]/.test(raw)
    // Detectar continuação de lista (linha indentada com > dentro de lista)
    const ehContinuacao = inUl && /^>\s/.test(raw) && !ehMarcador

    const t = limpar(linha)

    if (!t) {
      flushLi()
      flushPara()
      if (inUl) { html += '</ul>'; inUl = false }
      continue
    }

    if (ehMarcador) {
      flushPara()
      flushLi()
      if (!inUl) { html += '<ul>'; inUl = true }
      liAtual = t.replace(/^[-–•>\s]+/,'')
    } else if (ehContinuacao || (inUl && liAtual)) {
      // Continuação do item atual
      liAtual += ' ' + t.replace(/^[-–•>\s]+/,'')
    } else {
      if (inUl) { flushLi(); html += '</ul>'; inUl = false }
      paraAtual += (paraAtual ? ' ' : '') + t
    }
  }

  flushLi()
  flushPara()
  if (inUl) html += '</ul>'
  return html
}


function conselho(titulo: string): string {
  if (titulo === 'Arquiteto') return 'CAU'
  if (titulo === 'Corretor Imóvel') return 'CRECI'
  return 'CREA'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipoServico, cpfInspetor, cnpjoucpf, razaoSocial, municipioUF, endereco, valor, prazo, chaveInspetor } = body

    const { data: insp } = await supabase.from('inspetor')
      .select('nome_inspetor,titulo_profissional,inscricao_crea_cau,especializacao,cabecalho_documentos,rodape_documentos')
      .eq('cpf_inspetor', cpfInspetor).single()
    if (!insp) return NextResponse.json({ erro: 'Inspetor não encontrado' }, { status: 404 })

    const c = C[tipoServico] ?? C['11']
  // Pré-processar: juntar linhas com > de continuação ao item anterior
  function preProcessar(txt: string): string {
    // Normalizar: substituir \\n por \n real, depois processar
    const normalizado = txt.replace(/\\n/g, '\n')
    const linhas = normalizado.split('\n')
    const result: string[] = []
    for (const linha of linhas) {
      const t = linha.trim()
      if (t.startsWith('>') && result.length > 0) {
        result[result.length - 1] += ' ' + t.replace(/^>\s*/, '')
      } else {
        result.push(t ? linha : '')
      }
    }
    return result.join('\n')
  }
  const cp = {
    ...c,
    objetivo: preProcessar(c.objetivo ?? ''),
    metodologia: preProcessar(c.metodologia ?? ''),
    documentacao: preProcessar(c.documentacao ?? ''),
    equipe: preProcessar(c.equipe ?? ''),
    rescisao: preProcessar(c.rescisao ?? ''),
  }
    const isPF = cnpjoucpf.length === 11
    const labelDoc = isPF ? 'CPF' : 'CNPJ'
    const docFmt = isPF
      ? cnpjoucpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4')
      : cnpjoucpf.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5')

    const dataHoje = dataExtenso(new Date())
    const valorNum = parseFloat(valor.replace(',','.'))
    const valorFmt = valorNum.toLocaleString('pt-BR',{minimumFractionDigits:2})
    const valorEx = valorExt(valor)
    const prazoNum = parseInt(prazo)
    const prazoEx = n2e(prazoNum)
    const municipio = municipioUF.split('/')[0].trim()
    const ao = c.ao ?? 'AO'

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #000;
  padding: 2cm 2cm 2cm 2.5cm;
}
.cab {
  text-align: center;
  margin-bottom: 20pt;
  padding-bottom: 8pt;
  border-bottom: 2px solid #1E3A8A;
  font-size: 9pt;
  color: #374151;
  white-space: pre-line;
}
.dest {
  margin: 16pt 0;
  text-align: right;
  font-weight: bold;
  line-height: 1.8;
}
.ref { margin: 14pt 0; }
.lema {
  margin: 14pt 0;
  text-align: center;
  font-style: italic;
  color: #374151;
}
h2 {
  font-size: 11pt;
  font-weight: bold;
  margin: 16pt 0 6pt;
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
li::before {
  content: "• ";
}
b { font-weight: bold; }
i { font-style: italic; }
.ass {
  margin-top: 30pt;
  padding-top: 10pt;
  line-height: 1.8;
}
.rod {
  margin-top: 20pt;
  padding-top: 8pt;
  border-top: 1px solid #ccc;
  font-size: 9pt;
  text-align: center;
  white-space: pre-line;
}
</style>
</head>
<body>

${insp.cabecalho_documentos ? `<div class="cab">${insp.cabecalho_documentos}</div>` : ''}

<div class="dest">
${municipio}, ${dataHoje}<br>
<br>
${ao}<br>
${razaoSocial}<br>
${labelDoc} ${docFmt}<br>
${municipioUF}
</div>

<div class="ref"><b>${c.ref}</b></div>

<p style="text-align:justify;margin:6pt 0">${c.apresentacao.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>').replace(/^#+\s*/gm,'').trim()}</p>

<div class="lema">
<i>"Segurança e valorização do imóvel é resultado da adequada manutenção<br>
e customização dos ambientes na busca de maior conforto e modernidade".</i>
</div>

<p style="text-align:justify;margin:6pt 0">O serviço será executado para o(a) <b>${razaoSocial}</b>, localizado no <b>${endereco}</b>.</p>

<h2>1.- Objetivo.</h2>
${md2html(cp.objetivo)}

<h2>2.- Metodologia.</h2>
${md2html(cp.metodologia)}

<h2>3.- Documentação.</h2>
${md2html(cp.documentacao)}

<h2>4.- Equipe de Trabalho e produtos que serão entregues.</h2>
${md2html(cp.equipe)}

<h2>5.- Honorários e Forma de Pagamento.</h2>
<p style="text-align:justify;margin:6pt 0">O preço dos serviços, com base na estimativa de horas trabalhadas, conforme tabela do IBAPE — Instituto Brasileiro de Avaliações e Perícias, e válido para 30 (trinta) dias, a partir desta data, é o seguinte:</p>
<ul>
<li style="text-align:justify;text-align-last:left">O valor pela prestação do serviço é de <b>R$ ${valorFmt} (${valorEx} reais)</b>.</li>
<li style="text-align:justify;text-align-last:left">Impostos e taxas, inclusive encargos sociais pertinentes, correrão à conta do proponente.</li>
</ul>
<p style="text-align:justify;margin:6pt 0">O pagamento deverá ser efetuado mediante depósito bancário, ou outra forma ajustada entre os contratantes, nas seguintes condições:</p>
<ul>
<li style="text-align:justify;text-align-last:left">50% (cinquenta por cento) na data de realização da reunião com o síndico;</li>
<li style="text-align:justify;text-align-last:left">50% (cinquenta por cento) para pagamento na entrega do Laudo.</li>
</ul>

<h2>6.- Prazos.</h2>
<p style="text-align:justify;margin:6pt 0">O laudo será entregue no prazo máximo de até <b>${prazoNum} (${prazoEx}) dias úteis</b>, contados a partir da data de recebimento da documentação solicitada em reunião com o síndico.</p>
<p style="text-align:justify;margin:6pt 0">Também deverá haver comprometimento mútuo para execução dos trabalhos segundo agenda de trabalho, a ser definida de comum acordo entre o Inspetor e o síndico na reunião inicial.</p>

<h2>7.- Rescisão e outras avenças.</h2>
${md2html(cp.rescisao)}

<p style="text-align:justify;margin:6pt 0">Certos de que prestaremos à V.S. um serviço de alto padrão de qualidade, permanecemos à inteira disposição, para quaisquer esclarecimentos que se fizerem necessários.</p>
<p style="text-align:justify;margin:6pt 0">Atenciosamente,</p>

<div class="ass">
<p style="text-align:justify;margin:6pt 0">[Assinatura digital via Gov.br]</p>
<p style="text-align:justify;margin:6pt 0"><b>${insp.nome_inspetor}</b></p>
<p style="text-align:justify;margin:6pt 0">${insp.titulo_profissional} — CREA/CAU ${insp.inscricao_crea_cau}</p>
${insp.especializacao ? `<p style="text-align:justify;margin:6pt 0">Especialista ${insp.especializacao}</p>` : ''}
</div>

<p style="margin-top:24pt">De acordo: _____________________ CPF: _______________ Data: ___/___/______</p>
<p style="text-align:justify;margin:6pt 0">Síndico/Preposto</p>

${insp.rodape_documentos ? `<div class="rod">${insp.rodape_documentos}</div>` : ''}

</body>
</html>`

    return NextResponse.json({ html })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
