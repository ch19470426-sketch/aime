# Testes automáticos do AIMÊ

## Regra de testes (decisão de Celso, 16/10/2026)

Os testes existem para **proteger o que não pode quebrar**: dinheiro (créditos, estornos, cobrança), segurança (quem pode ler, gravar ou apagar o quê), dados pessoais (cadastro, autorização, termo) e **dono de arquivo**.

- **Teste novo só nessas áreas**, e no máximo uns 5 por mudança.
- **Mudança de texto, cor, espaço, botão ou ordem de tela: nenhum teste novo.** Basta o verificador de tipos (`npx tsc --noEmit`) e a conferência na tela. Testes que leem o texto do código-fonte quebram a cada ajuste visual e não provam comportamento.
- A **prova de defeito provocado** (quebrar o código de propósito para ver o teste acusar) vale **só para cobrança e segurança**.
- Em 16/10/2026 a suíte foi podada de 302 para 272 testes (saíram os de texto e de estilo); os de segurança, cobrança e dados ficaram intactos.


Rodar tudo: `npm test` (uma vez) ou `npm run test:watch` (reexecuta ao salvar).
Antes de publicar qualquer mudança em `src/app/api` ou `src/lib`, rode `npm test`.

## Como funcionam
Os testes chamam as **rotas reais** de `src/app/api` com o banco, o armazenamento, a API do Asaas e o e-mail **simulados**
(`helpers.ts`) e uma sessão de teste (`setup.ts`). Nenhum serviço de verdade é tocado e nenhuma chave real é usada.
Três usuários de teste: **A** (civil, chave INS-001), **B** (civil, INS-002) e **E** (eletricista, INS-777, vinculado ao civil A).
Cada chamada ao banco e ao armazenamento fica registrada, então um teste de segurança prova que o pedido recusado
**nem chegou a tocar em nada**.

## O que está coberto
| Arquivo | Garante |
| --- | --- |
| `seguranca/vistorias-e-arquivos.test.ts` | só o dono lista, lê, apaga e homologa vistorias e ativos (etapa 1 da auditoria de dono) |
| `seguranca/debito-e-gravacao.test.ts` | só o dono gasta créditos e grava arquivos; `salvar-vistoria` não sobrescreve arquivo de outro (etapa 2) |
| `seguranca/demais-rotas.test.ts` | gravar, ler e enviar arquivos: 14 rotas, upload assinado, fluxo do eletricista (etapa 3) |
| `estornos.test.ts` | estorno do valor líquido (pago menos a taxa do Asaas) vale como total; estorno parcial só avisa |
| `seguranca/leitura-por-nome.test.ts` | leituras de arquivo por nome ou caminho do pedido (vistorias/[nome], PDFs e DOCX do laudo, imagens e ART) só do dono; o arquivo baixado não leva o CPF no nome |
| `listagens-completas.test.ts` | as listagens de documentos, estabelecimentos e vistorias leem TODAS as páginas do inspetor, mesmo com mais arquivos de outros do que o limite antigo (500 e 1000) |
| `versoes-pdf-assinado.test.ts` | cada envio do PDF assinado é uma versão com data e hora de Brasília no nome; a lista mostra todas e o resumo do gestor conta um documento só |
| `upload-pdf-assinado.test.ts` | o PDF assinado tem nome montado pelo sistema (começa pela chave) e a rota de envio só grava arquivo do próprio usuário |
| `contato-cliente.test.ts` | o contato do cliente (responsável e finalidade) é gravado e lido como a vistoria e o laudo esperam |
| `saldo-planos-vigentes.test.ts` | o saldo de plano soma TODOS os contratos vigentes (função usada pelas telas do gestor); a regra do banco é testada em `sql/testes/2026-10-14_saldo_soma_planos.sh` |
| `profissionais-de-apoio.test.ts` | vistoria 39 do Eng Elétrico (sistema 07) e do Eng Mecânico (09 e 10): a regra dos perfis, a rota do perfil, o sistema imposto no salvamento e a listagem por especialidade |
| `ajustes-vistoria-39.test.ts` | a vistoria 39 inicia com 50 CR (as outras vistorias, 100) |
| `autorizacao-marketing.test.ts` | autorização para uso dos dados em publicidade (LGPD): opt-in, rota de retirada só do titular e cadastro inicial |
| `download-documentos.test.ts` | botão Baixar do item 61: a URL assinada entrega o arquivo como download, com o nome sem a chave (CPF) |
| `termo-aceite.test.ts` | termo de aceite: data do aceite no horário de Brasília, arquivo gerado com as 9 cláusulas e a data preenchida, fonte única do texto |
| `offline-sincronizacao.test.ts` | vistoria salva offline antes da migração (chave INS-nnn) sincroniza com o CPF; as duas cópias da regra (fila do app e service worker) coincidem |
| `seguranca/gerar-nome-do-arquivo.test.ts` | gerar-laudo e gerar-plano-manutencao só gravam o HTML com nome que começa pela chave do usuário logado (o modo _info_ segue livre) |
| `seguranca/chave-inspetor.test.ts` | a chave do inspetor é o CPF, decidida no servidor; nenhuma rota grava chave vinda do navegador |
| `seguranca/migrar-chave-para-cpf.test.ts` | migração única dos arquivos da chave antiga (INS-nnn) para o CPF: só gestor, simulação por padrão, idempotente |
| `gestor-atribuir-plano.test.ts` | botão Atribuir plano: contrato novo hoje, e o erro de plano repetido no mesmo dia é explicado |

## Regras para quem mexe no código
- **Rota nova que recebe CPF, chave INS-nnn ou nome de arquivo do navegador** precisa de um teste "o próprio passa, o de outro
  dá 403 e nada é lido ou gravado". Em `src/lib/autorizacao.ts` estão os porteiros (`exigirProprio`, `exigirChaveDoProprio`,
  `exigirArquivoDoProprio`, `exigirDonoDaGeracao`, `exigirProprioOuVinculado`, `exigirCaminhoDoProprio`).
- Teste que nunca falha não protege nada: ao escrever um, remova a proteção de propósito e confira que ele acusa.
- Fora do alcance destes testes: as telas (banners, câmera, offline) e o Asaas de verdade. Esses continuam sendo conferidos à mão.
