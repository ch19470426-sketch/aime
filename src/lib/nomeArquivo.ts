// src/lib/nomeArquivo.ts
// AIMÊ — Nome de arquivo entregue ao USUÁRIO (download, anexo, PDF).
//
// No armazenamento, o nome do arquivo começa pela chave do inspetor, que é o CPF dele ("<cpf>_<cnpj>_<serviço>.html"). Esse prefixo
// existe para a checagem de dono (src/lib/autorizacao.ts) e NÃO pode sair no arquivo que o inspetor baixa e envia ao cliente: seria
// entregar o CPF dele. O que o usuário recebe leva o nome sem o primeiro trecho.
//   "05491239704_12345678000190_proposta.html"  ->  "12345678000190_proposta.html"
//   "05491239704_termo_de_aceite.html"          ->  "termo_de_aceite.html"
export const nomeSemChave = (nome: string): string => String(nome ?? '').replace(/^[^_]+_/, '')
