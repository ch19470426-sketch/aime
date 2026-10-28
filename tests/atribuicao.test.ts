// Leitura dos cookies do Google Analytics e validação da origem que o navegador manda na compra (marketing, 28/10/2026).
import { describe, it, expect } from 'vitest'
import { gaClientIdDoCookie, gaSessionIdDoCookie, cookieDeSessaoGa, origemDaUrl, sanitizarAtribuicao } from '@/lib/atribuicao'

describe('cookies do GA4', () => {
  it('_ga: GA1.1.XXXXXXXXXX.YYYYYYYYYY -> XXXXXXXXXX.YYYYYYYYYY; formato estranho -> null', () => {
    expect(gaClientIdDoCookie('GA1.1.1234567890.1700000000')).toBe('1234567890.1700000000')
    expect(gaClientIdDoCookie('GA1.2.1234567890.1700000000')).toBe('1234567890.1700000000')
    expect(gaClientIdDoCookie('lixo')).toBeNull()
    expect(gaClientIdDoCookie('GA1.1.<script>.1')).toBeNull()
    expect(gaClientIdDoCookie(null)).toBeNull()
  })
  it('_ga_<ID>: GS1.1.<sessao>.… e GS2.1.s<sessao>$… -> sessão', () => {
    expect(gaSessionIdDoCookie('GS1.1.1700000123.2.1.1700000456.0.0.0')).toBe('1700000123')
    expect(gaSessionIdDoCookie('GS2.1.s1700000123$o2$g1$t1700000456$j0$l0$h0')).toBe('1700000123')
    expect(gaSessionIdDoCookie('GS3.1.x')).toBeNull()
    expect(gaSessionIdDoCookie('')).toBeNull()
  })
  it('acha o cookie de sessão pelo prefixo _ga_ sem confundir com o _ga', () => {
    expect(cookieDeSessaoGa('_ga=GA1.1.1.2; _ga_PJ731J888F=GS2.1.s99$o1; outro=x')).toBe('GS2.1.s99$o1')
    expect(cookieDeSessaoGa('_ga=GA1.1.1.2')).toBeNull()
  })
})

describe('origem da visita', () => {
  it('guarda só as chaves permitidas da URL', () => {
    expect(origemDaUrl('?gclid=abc&utm_source=google&x=1&utm_campaign=Teste')).toEqual({ gclid: 'abc', utm_source: 'google', utm_campaign: 'Teste' })
  })
  it('o servidor descarta o que não for do formato esperado e corta textos longos', () => {
    const a = sanitizarAtribuicao({
      ga_client_id: '1.2; drop table', ga_session_id: '17000001', consentimento: 'talvez',
      origem: { gclid: 'x'.repeat(500), cpf: '12345678901', utm_source: 'ok' },
    })
    expect(a.ga_client_id).toBeNull()
    expect(a.ga_session_id).toBe('17000001')
    expect(a.consentimento).toBeNull()
    expect(a.origem.gclid).toHaveLength(200)
    expect(a.origem).not.toHaveProperty('cpf')
    expect(a.origem.utm_source).toBe('ok')
    expect(sanitizarAtribuicao('lixo')).toEqual({ ga_client_id: null, ga_session_id: null, origem: {}, consentimento: null })
  })
})
