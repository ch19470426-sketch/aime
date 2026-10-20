// Botão Baixar do item 61 (Baixar Documentos): a URL assinada entrega o arquivo COMO DOWNLOAD, com o nome sem a chave (o CPF), e o botão só abre o link.
// Antes o botão buscava o arquivo para a memória (fetch + blob) e, se algo falhava, abria uma nova aba, que tablet e aplicativo instalado bloqueiam
// sem avisar: o botão ficava sem efeito e sem mensagem.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { A, estado, reiniciar, req } from './helpers'
import { nomeSemChave } from '@/lib/nomeArquivo'
import * as listdoc from '@/app/api/listar-documentos/route'

const CNPJ = '39262886000187'
beforeEach(() => { reiniciar(); estado.chaves[A] = A })

describe('listar-documentos: a URL assinada entrega o arquivo como download, com o nome certo', () => {
  const listar = async () => (await listdoc.GET(req(`/api/listar-documentos?chave_inspetor=${A}&cnpjoucpf=${CNPJ}`))).json()
  const nomes = [
    `${A}_${CNPJ}_laudo_nr12_assinado_20261014-094600.pdf`,     // versão de PDF assinado
    `${A}_${CNPJ}_proposta_nr12_assinado.pdf`,                   // PDF assinado antigo, sem versão
    `${A}_termo_de_aceite.html`,                                  // o termo (HTML)
  ]
  it('cada documento sai com download= e o nome SEM a chave (o CPF não vai no arquivo que o inspetor envia ao cliente)', async () => {
    estado.arquivos.documentos_inspetor = nomes
    const { docs } = await listar()
    expect(docs).toHaveLength(3)
    for (const d of docs) {
      const url = new URL(d.url)
      expect(url.searchParams.get('download')).toBe(nomeSemChave(d.nome))
      expect(url.searchParams.get('download')).not.toContain(A)
      expect(url.searchParams.get('token')).toBe('t')
      expect(url.pathname).toContain(`/object/sign/aime/documentos_inspetor/${d.nome}`)
    }
  })
  it('os nomes de download esperados', async () => {
    estado.arquivos.documentos_inspetor = nomes
    const { docs } = await listar()
    const porNome = Object.fromEntries(docs.map((d: any) => [d.nome, new URL(d.url).searchParams.get('download')]))
    expect(porNome[nomes[0]]).toBe(`${CNPJ}_laudo_nr12_assinado_20261014-094600.pdf`)
    expect(porNome[nomes[1]]).toBe(`${CNPJ}_proposta_nr12_assinado.pdf`)
    expect(porNome[nomes[2]]).toBe('termo_de_aceite.html')
  })
})

describe('a tela Baixar Documentos', () => {
  const tela = readFileSync('src/app/baixar-documentos/page.tsx', 'utf-8')
  const trecho = tela.slice(tela.indexOf('function baixar(doc: Doc)'), tela.indexOf('const S = {')).replace(/\/\/.*$/gm, '')   // só o código, sem os comentários
  it('o botão só abre o link da URL assinada: sem buscar o arquivo para a memória e sem abrir nova aba', () => {
    expect(trecho).toMatch(/a\.href = doc\.url/)
    expect(trecho).toMatch(/a\.download = nomeSemChave\(doc\.nome\)/)
    expect(trecho).not.toMatch(/fetch\(/)
    expect(trecho).not.toMatch(/blob/i)
    expect(trecho).not.toMatch(/window\.open/)
  })
  it('se o documento não tem link, o botão MOSTRA uma mensagem (antes ficava sem efeito e sem aviso)', () => {
    expect(trecho).toMatch(/if \(!doc\.url\) \{ setErro\('Não foi possível iniciar o download deste documento/)
  })
})
