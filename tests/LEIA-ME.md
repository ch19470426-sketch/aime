# Testes automáticos do AIMÊ

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
| `seguranca/chave-inspetor.test.ts` | a chave do inspetor é o CPF, decidida no servidor; nenhuma rota grava chave vinda do navegador |
| `seguranca/migrar-chave-para-cpf.test.ts` | migração única dos arquivos da chave antiga (INS-nnn) para o CPF: só gestor, simulação por padrão, idempotente |
| `gestor-atribuir-plano.test.ts` | botão Atribuir plano: contrato novo hoje, e o erro de plano repetido no mesmo dia é explicado |

## Regras para quem mexe no código
- **Rota nova que recebe CPF, chave INS-nnn ou nome de arquivo do navegador** precisa de um teste "o próprio passa, o de outro
  dá 403 e nada é lido ou gravado". Em `src/lib/autorizacao.ts` estão os porteiros (`exigirProprio`, `exigirChaveDoProprio`,
  `exigirArquivoDoProprio`, `exigirDonoDaGeracao`, `exigirProprioOuVinculado`, `exigirCaminhoDoProprio`).
- Teste que nunca falha não protege nada: ao escrever um, remova a proteção de propósito e confira que ele acusa.
- Fora do alcance destes testes: as telas (banners, câmera, offline) e o Asaas de verdade. Esses continuam sendo conferidos à mão.
