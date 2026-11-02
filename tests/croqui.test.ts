// Croqui pelo endereço (Google): monta o pedido certo, avisa localização aproximada, não vaza a chave e cai para o envio manual quando falha.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { gerarCroqui, enderecoParaBusca, enderecoSuficiente, urlMapa } from '@/lib/croqui'
import * as rota from '@/app/api/croqui-localizacao/route'

const PNG = Buffer.from('89504e470d0a1a0a', 'hex')
const geo = (tipo: string, extra: object = {}) => new Response(JSON.stringify({ status: 'OK', results: [{ geometry: { location: { lat: -20.3, lng: -40.3 }, location_type: tipo }, ...extra }] }), { status: 200 })
const mapa = () => new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } })
const falsoFetch = (...respostas: Response[]) => { const f = vi.fn(); respostas.forEach(r => f.mockResolvedValueOnce(r)); return f as unknown as typeof fetch & ReturnType<typeof vi.fn> }
const END = { cep: '29040-780', numero: '188', logradouro: 'Rua Francisco Rubim', bairro: 'Bento Ferreira', cidade: 'Vitória', uf: 'ES' }

afterEach(() => { vi.unstubAllEnvs() })

describe('endereço', () => {
  it('monta o texto de busca e exige CEP completo ou rua + cidade', () => {
    expect(enderecoParaBusca(END)).toBe('Rua Francisco Rubim, 188, Bento Ferreira, Vitória - ES, 29040-780, Brasil')
    expect(enderecoSuficiente({ cep: '29040780' })).toBe(true)
    expect(enderecoSuficiente({ cep: '2904' })).toBe(false)
    expect(enderecoSuficiente({ logradouro: 'Rua A', cidade: 'Vitória' })).toBe(true)
    expect(enderecoSuficiente({})).toBe(false)
  })
})

describe('gerarCroqui', () => {
  it('endereço exato: devolve a imagem em data URI, sem aviso de aproximado, e pede o mapa nas coordenadas achadas', async () => {
    const f = falsoFetch(geo('ROOFTOP'), mapa())
    const r = await gerarCroqui(END, 'CHAVE-X', f)
    expect(r).toEqual({ ok: true, imagem: `data:image/png;base64,${PNG.toString('base64')}`, aproximado: false })
    expect(String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0])).toContain('center=-20.300000%2C-40.300000')
  })
  it('centro do CEP, casamento parcial ou falta de número: marca como aproximado', async () => {
    expect((await gerarCroqui(END, 'k', falsoFetch(geo('GEOMETRIC_CENTER'), mapa()))) as { aproximado: boolean }).toMatchObject({ aproximado: true })
    expect((await gerarCroqui(END, 'k', falsoFetch(geo('ROOFTOP', { partial_match: true }), mapa()))) as { aproximado: boolean }).toMatchObject({ aproximado: true })
    expect((await gerarCroqui({ ...END, numero: '' }, 'k', falsoFetch(geo('ROOFTOP'), mapa()))) as { aproximado: boolean }).toMatchObject({ aproximado: true })
  })
  it('endereço que o Google não acha: 404; serviço fora do ar, mapa que não é imagem ou erro de rede: 502 sem vazar a chave', async () => {
    expect(await gerarCroqui(END, 'k', falsoFetch(new Response(JSON.stringify({ status: 'ZERO_RESULTS', results: [] }))))).toMatchObject({ ok: false, status: 404 })
    expect(await gerarCroqui(END, 'k', falsoFetch(new Response(JSON.stringify({ status: 'REQUEST_DENIED', results: [] }))))).toMatchObject({ ok: false, status: 502 })
    const naoImagem = await gerarCroqui(END, 'CHAVE-SECRETA', falsoFetch(geo('ROOFTOP'), new Response('erro', { status: 403, headers: { 'content-type': 'text/html' } })))
    expect(naoImagem).toMatchObject({ ok: false, status: 502 })
    expect(JSON.stringify(naoImagem)).not.toContain('CHAVE-SECRETA')
    const queda = vi.fn().mockRejectedValue(new Error('rede')) as unknown as typeof fetch
    expect(await gerarCroqui(END, 'k', queda)).toMatchObject({ ok: false, status: 502 })
  })
  it('a URL do mapa leva o marcador e a chave só na consulta ao Google', () => {
    expect(urlMapa(-20.3, -40.3, 'K')).toContain('markers=color%3Ared%7C-20.300000%2C-40.300000')
    expect(urlMapa(-20.3, -40.3, 'K')).toContain('size=450x350')
  })
})

describe('POST /api/croqui-localizacao', () => {
  const chamar = (corpo: unknown) => rota.POST(new NextRequest('http://t/api/croqui-localizacao', { method: 'POST', body: JSON.stringify(corpo), headers: { 'content-type': 'application/json' } }))
  it('sem a chave configurada: 503 com mensagem para enviar a imagem manualmente', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '')
    const r = await chamar(END)
    expect(r.status).toBe(503)
    expect((await r.json()).erro).toContain('manualmente')
  })
  it('endereço insuficiente: 400, sem chamar o Google', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'k')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const r = await chamar({ cep: '12' })
    expect(r.status).toBe(400)
    expect(f).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
