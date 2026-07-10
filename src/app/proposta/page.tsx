// src/app/proposta/page.tsx
// AIMÊ — Tela Proposta Comercial (tipos 11-19)

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

const TITULO_TIPO: Record<string, string> = {
  '11': 'Proposta — Autovistoria',
  '12': 'Proposta — Inspeção Predial',
  '13': 'Proposta — Vistoria Imóvel Novo',
  '14': 'Proposta — Inspeção de Fachada',
  '15': 'Proposta — Inspeção de Elevadores',
  '16': 'Proposta — Inspeção NR-10',
  '17': 'Proposta — Inspeção NR-12',
  '18': 'Proposta — Inspeção NR-13',
  '19': 'Proposta — Plano de Manutenção',
}

interface Estabelecimento {
  cnpjoucpf: string
  razao_social_nome: string
  cep_estabelecimento: string
  numero_imovel: string
  complemento: string
}

interface Inspetor {
  nome_inspetor: string
  titulo_profissional: string
  inscricao_crea_cau: string
  especializacao: string
  cabecalho_documentos: string
  rodape_documentos: string
}

function numeroParaExtenso(valor: number): string {
  if (valor === 0) return 'zero'
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

  if (valor < 20) return unidades[valor]
  if (valor < 100) {
    const d = Math.floor(valor / 10)
    const u = valor % 10
    return u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`
  }
  if (valor === 100) return 'cem'
  if (valor < 1000) {
    const c = Math.floor(valor / 100)
    const resto = valor % 100
    return resto === 0 ? centenas[c] : `${centenas[c]} e ${numeroParaExtenso(resto)}`
  }
  if (valor < 1000000) {
    const m = Math.floor(valor / 1000)
    const resto = valor % 1000
    const milStr = m === 1 ? 'mil' : `${numeroParaExtenso(m)} mil`
    return resto === 0 ? milStr : `${milStr} e ${numeroParaExtenso(resto)}`
  }
  return valor.toString()
}

function valorParaExtenso(valorStr: string): string {
  const num = parseFloat(valorStr.replace(',', '.'))
  if (isNaN(num)) return ''
  const inteiro = Math.floor(num)
  const centavos = Math.round((num - inteiro) * 100)
  let ext = numeroParaExtenso(inteiro)
  if (centavos > 0) ext += ` e ${numeroParaExtenso(centavos)} centavos`
  return ext
}

function diasParaExtenso(dias: number): string {
  return numeroParaExtenso(dias)
}

function formatarCNPJ(cnpj: string): string {
  if (cnpj.length === 14) return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (cnpj.length === 11) return cnpj.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return cnpj
}

export default function PropostaPage() {
  return (
    <Suspense fallback={
      <div style={S.body}><div style={S.page}>
        <HeaderBar titulo="Carregando..." subtitulo="" />
        <div style={S.divider} />
      </div></div>
    }>
      <PropostaInner />
    </Suspense>
  )
}

function PropostaInner() {
  const params       = useSearchParams()
  const cpfInspetor  = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor = params.get('chave_inspetor') ?? ''
  const cnpjoucpf    = params.get('cnpjoucpf')       ?? ''
  const tipoServico  = params.get('tipo_servico')    ?? '11'

  const { bannerProps, informa, agradece, solicita, fechar } = useBanner()

  const [est,         setEst]         = useState<Estabelecimento | null>(null)
  const [insp,        setInsp]        = useState<Inspetor | null>(null)
  const [endereco,    setEndereco]    = useState('')
  const [municipioUF, setMunicipioUF] = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [carregando,  setCarregando]  = useState(true)
  const [salvando,    setSalvando]    = useState(false)
  const [etapa,       setEtapa]       = useState<'cadastro' | 'valor' | 'preview'>('cadastro')
  const [modoEdicao,  setModoEdicao]  = useState(false)

  // Campos do estabelecimento (editáveis)
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cep,         setCep]         = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')

  // Campos da proposta
  const [valor,  setValor]  = useState('')
  const [prazo,  setPrazo]  = useState('15')

  // Conteúdo HTML da proposta
  const [htmlProposta, setHtmlProposta] = useState('')

  const titulo = TITULO_TIPO[tipoServico] ?? 'Proposta Comercial'
  const isPF   = cnpjoucpf.length === 11

  async function query(table: string, qparams: string) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${qparams}`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    })
    return res.json()
  }

  useEffect(() => {
    if (!cnpjoucpf || !cpfInspetor) return
    carregar()
  }, [cnpjoucpf, cpfInspetor])

  async function carregar() {
    setCarregando(true)
    try {
      // Buscar inspetor
      const inspData = await query('inspetor', `cpf_inspetor=eq.${cpfInspetor}&select=nome_inspetor,titulo_profissional,inscricao_crea_cau,especializacao,cabecalho_documentos,rodape_documentos`)
      if (Array.isArray(inspData) && inspData[0]) setInsp(inspData[0])

      // Buscar estabelecimento
      const estData = await query('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=cnpjoucpf,razao_social_nome,cep_estabelecimento,numero_imovel,complemento`)
      if (Array.isArray(estData) && estData[0]) {
        const e = estData[0]
        setEst(e)
        setRazaoSocial(e.razao_social_nome)
        setCep((e.cep_estabelecimento ?? '').replace(/\D/g,'').trim())
        setNumero(e.numero_imovel ?? '')
        setComplemento(e.complemento ?? '')
        await buscarCep(e.cep_estabelecimento?.replace('-','') ?? '', e.numero_imovel ?? '', e.complemento ?? '')
        setModoEdicao(false)
        setEtapa('cadastro')
      } else {
        setModoEdicao(true)
        setEtapa('cadastro')
      }
    } catch(e) {
      informa('Erro', 'Não foi possível carregar os dados.')
    } finally {
      setCarregando(false)
    }
  }

  async function buscarCep(cepVal: string, nr?: string, comp?: string) {
    const cepLimpo = cepVal.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setMunicipioUF(`${data.localidade}/${data.uf}`)
        setLogradouro(data.logradouro)
        const nrFinal = nr ?? numero
        const compFinal = comp ?? complemento
        const partes = [data.logradouro, nrFinal || null, compFinal || null, data.bairro].filter(Boolean)
        const end = partes.join(', ') + `, ${data.localidade}/${data.uf}`
        setEndereco(end)
      }
    } catch {}
  }

  async function salvarEstabelecimento() {
    if (!razaoSocial || !cep || !numero) {
      informa('Atenção', 'Preencha Razão Social, CEP e Número.')
      return
    }
    setSalvando(true)
    try {
      const isUpdate = !!est
      const method = isUpdate ? 'PATCH' : 'POST'
      const url = isUpdate
        ? `${SUPA_URL}/rest/v1/estabelecimento?cnpjoucpf=eq.${cnpjoucpf}`
        : `${SUPA_URL}/rest/v1/estabelecimento`
      const payload = {
        cnpjoucpf,
        razao_social_nome: razaoSocial,
        cep_estabelecimento: cep.trim(),
        numero_imovel: numero.trim(),
        complemento: complemento?.trim() ?? null,
        tipo_id: 1,
        ...(isUpdate ? {} : { data_cadastro: new Date().toISOString().split('T')[0] })
      }
      console.log('PAYLOAD PATCH:', JSON.stringify(payload), 'URL:', url)
      const res = await fetch(url, {
        method,
        headers: {
          'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      })
      console.log('RESP:', res.status, res.ok)
      if (res.ok) {
        // Re-buscar do banco para garantir dados frescos na tela
        const estAtual = await query('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=cnpjoucpf,razao_social_nome,cep_estabelecimento,numero_imovel,complemento`)
        if (Array.isArray(estAtual) && estAtual[0]) {
          const e = estAtual[0]
          setEst(e)
          setRazaoSocial(e.razao_social_nome ?? '')
          setCep((e.cep_estabelecimento ?? '').replace(/\D/g,'').trim())
          setNumero(e.numero_imovel ?? '')
          setComplemento(e.complemento ?? '')
          // Buscar endereço com dados frescos do banco
          const cepFresco = (e.cep_estabelecimento ?? '').replace(/\D/g,'')
          console.log('CEP fresco:', cepFresco, 'NR:', e.numero_imovel)
          if (cepFresco.length === 8) {
            try {
              const vr = await fetch(`https://viacep.com.br/ws/${cepFresco}/json/`)
              const vd = await vr.json()
              console.log('ViaCEP:', vd.logradouro, vd.erro)
              if (!vd.erro) {
                const partes = [vd.logradouro, e.numero_imovel||null, e.complemento||null, vd.bairro].filter(Boolean)
                const endFresco = partes.join(', ') + `, ${vd.localidade}/${vd.uf}`
                console.log('Endereço novo:', endFresco)
                setEndereco(endFresco)
                setLogradouro(vd.logradouro)
                setMunicipioUF(`${vd.localidade}/${vd.uf}`)
              }
            } catch(ex) { console.log('ViaCEP erro:', ex) }
          }
        }
        setModoEdicao(false)
        if (isUpdate) {
          informa('Dados salvos', 'Os dados do estabelecimento foram atualizados com sucesso.')
        } else {
          setEtapa('valor')
        }
      } else {
        informa('Erro', 'Não foi possível salvar o estabelecimento.')
      }
    } finally {
      setSalvando(false)
    }
  }

  async function gerarProposta() {
    if (!valor) { informa('Atenção', 'Informe o valor do serviço.'); return }
    if (!prazo) { informa('Atenção', 'Informe o prazo de execução.'); return }

    setSalvando(true)
    try {
      const res = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoServico, cpfInspetor, cnpjoucpf,
          razaoSocial, municipioUF, endereco,
          valor, prazo, chaveInspetor,
        })
      })
      const data = await res.json()
      if (data.html) {
        setHtmlProposta(data.html)
        setEtapa('preview')
      } else {
        informa('Erro', data.erro ?? 'Não foi possível gerar a proposta.')
      }
    } catch(e) {
      informa('Erro', String(e))
    } finally {
      setSalvando(false)
    }
  }

  async function salvarProposta() {
    setSalvando(true)
    try {
      const nomeArq = `${chaveInspetor}_proposta_${tipoServico}_${cnpjoucpf}.html`
      const res = await fetch('/api/salvar-vistoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeArquivo: nomeArq,
          pasta: 'documentos_inspetor',
          payload: htmlProposta,
          contentType: 'application/json',
        })
      })
      const data = await res.json()
      if (data.sucesso) {
        agradece('Proposta salva!',
          `A proposta foi salva em "Documentos inspetor" como ${nomeArq}. Após homologação e assinatura digital pelo Gov.br, entregue ao cliente.`,
          () => window.location.href = '/dashboard'
        )
      } else {
        informa('Erro', data.erro ?? 'Não foi possível salvar.')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return (
    <div style={S.body}><div style={S.page}>
      <HeaderBar titulo={etapa === 'cadastro' ? 'Cadastrar Estabelecimento' : titulo} subtitulo={etapa === 'cadastro' ? 'Cadastrar novo estabelecimento ou alterar seus dados' : 'Proposta técnica e comercial'} />
      <div style={S.divider} />
      <p style={{ padding: '40px', textAlign: 'center', color: '#4a6480', fontSize: '9pt' }}>Carregando...</p>
      <Banner {...bannerProps} />
    </div></div>
  )

  return (
    <div style={S.body}>
      <div style={S.page}>
        <HeaderBar titulo={etapa === 'cadastro' ? 'Cadastrar Estabelecimento' : titulo} subtitulo={etapa === 'cadastro' ? 'Cadastrar novo estabelecimento ou alterar seus dados' : 'Proposta técnica e comercial'} />
        <div style={S.divider} />
        <div style={S.formBody}>

          {/* ETAPA 1: CADASTRO / VISUALIZAÇÃO DO ESTABELECIMENTO */}
          {etapa === 'cadastro' && (
            <div style={S.block}>
              <div style={S.blockTitle}>Dados do {isPF ? 'Imóvel / Proprietário' : 'Estabelecimento / Condomínio'}</div>
              <div style={S.blockBody}>
                <Field label={isPF ? 'CPF' : 'CNPJ'}>
                  <input style={S.inputRO} value={formatarCNPJ(cnpjoucpf)} readOnly />
                </Field>
                <Field label={isPF ? 'Nome do proprietário' : 'Razão social / Nome do condomínio'}>
                  <input style={modoEdicao ? S.input : S.inputRO}
                    value={razaoSocial} readOnly={!modoEdicao}
                    onChange={e => setRazaoSocial(e.target.value)}
                    placeholder={modoEdicao ? 'Nome completo ou razão social' : ''} />
                </Field>
                <div style={{ ...S.row, ...S.c3 }}>
                  <Field label="CEP">
                    <input style={modoEdicao ? S.input : S.inputRO}
                      value={cep} maxLength={8} readOnly={!modoEdicao}
                      onChange={e => { setCep(e.target.value); if (e.target.value.length === 8) buscarCep(e.target.value, numero, complemento) }}
                      placeholder={modoEdicao ? '00000000' : ''} />
                  </Field>
                  <Field label="Número">
                    <input style={modoEdicao ? S.input : S.inputRO}
                      value={numero} readOnly={!modoEdicao}
                      onChange={e => setNumero(e.target.value)}
                      onBlur={e => { if (cep.length === 8) buscarCep(cep, e.target.value, complemento) }}
                      placeholder={modoEdicao ? 'Nº' : ''} />
                  </Field>
                  <Field label="Complemento">
                    <input style={modoEdicao ? S.input : S.inputRO}
                      value={complemento} readOnly={!modoEdicao}
                      onChange={e => setComplemento(e.target.value)}
                      onBlur={e => { if (cep.length === 8) buscarCep(cep, numero, e.target.value) }}
                      placeholder={modoEdicao ? 'Apto, sala...' : ''} />
                  </Field>
                </div>
                {endereco && (
                  <Field label="Endereço">
                    <input style={S.inputRO} value={endereco} readOnly />
                  </Field>
                )}

                {/* MODO VISUALIZAÇÃO */}
                {!modoEdicao && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <button style={{ ...S.btn, background: '#DC2626', color: '#fff', border: 'none' }}
                      onClick={() => window.location.href = '/dashboard'}>Cancelar</button>
                    <button style={{ ...S.btn, ...S.btnSec }}
                      onClick={() => setModoEdicao(true)}>✏️ Alterar dados</button>
                    <button style={{ ...S.btn, ...S.btnPri }}
                      onClick={() => setEtapa('valor')}>Continuar →</button>
                  </div>
                )}

                {/* MODO EDIÇÃO: salvar ou cancelar */}
                {modoEdicao && (
                  <div style={S.footer}>
                    <button style={{ ...S.btn, ...S.btnSec }}
                      onClick={() => { est ? setModoEdicao(false) : window.location.href = '/dashboard' }}>
                      {est ? 'Cancelar alteração' : 'Voltar ao dashboard'}
                    </button>
                    <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }}
                      onClick={salvarEstabelecimento} disabled={salvando}>
                      {salvando ? 'Salvando...' : est ? 'Salvar alteração' : 'Cadastrar e continuar'}
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ETAPA 2: VALOR E PRAZO */}
          {etapa === 'valor' && (
            <>
              <div style={S.block}>
                <div style={S.blockTitle}>Dados confirmados</div>
                <div style={S.blockBody}>
                  <div style={{ ...S.row, ...S.c2 }}>
                    <Field label={isPF ? 'CPF' : 'CNPJ'}><input style={S.inputRO} value={formatarCNPJ(cnpjoucpf)} readOnly /></Field>
                    <Field label={isPF ? 'Nome' : 'Razão social'}><input style={S.inputRO} value={razaoSocial} readOnly /></Field>
                  </div>
                  <Field label="Endereço"><input style={S.inputRO} value={endereco} readOnly /></Field>
                </div>
              </div>
              <div style={S.block}>
                <div style={S.blockTitle}>Valor e Prazo da Proposta</div>
                <div style={S.blockBody}>
                  <div style={{ ...S.row, ...S.c2 }}>
                    <Field label="Valor do serviço (R$) *">
                      <input style={S.input} value={valor} onChange={e => setValor(e.target.value)}
                        placeholder="Ex: 2500,00" type="text" />
                    </Field>
                    <Field label="Prazo de entrega (dias úteis) *">
                      <input style={S.input} value={prazo} onChange={e => setPrazo(e.target.value)}
                        placeholder="Ex: 15" type="number" min="1" />
                    </Field>
                  </div>
                  {valor && <div style={{ fontSize: '7pt', color: '#1E3A8A', marginTop: '2px' }}>
                    Por extenso: {valorParaExtenso(valor)} reais
                  </div>}
                  {prazo && <div style={{ fontSize: '7pt', color: '#1E3A8A' }}>
                    Prazo por extenso: {diasParaExtenso(parseInt(prazo))} dias úteis
                  </div>}
                </div>
              </div>
              <div style={S.footer}>
                <button style={{ ...S.btn, ...S.btnSec }} onClick={() => setEtapa('cadastro')}>
                  ← Voltar
                </button>
                <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }} onClick={gerarProposta} disabled={salvando}>
                  {salvando ? 'Gerando...' : 'Gerar proposta ▶'}
                </button>
              </div>
            </>
          )}

          {/* ETAPA 3: PREVIEW */}
          {etapa === 'preview' && (
            <>
              <div style={S.block}>
                <div style={S.blockTitle}>Preview da Proposta</div>
                <div style={{ padding: '8px 10px' }}>
                  <iframe
                    srcDoc={htmlProposta}
                    style={{ width: '100%', height: '600px', border: '1px solid #c3d4f0', borderRadius: '4px' }}
                    title="Proposta"
                  />
                </div>
              </div>
              <div style={S.footer}>
                <button style={{ ...S.btn, ...S.btnSec }} onClick={() => setEtapa('valor')}>
                  ← Ajustar valor/prazo
                </button>
                <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }} onClick={salvarProposta} disabled={salvando}>
                  {salvando ? 'Salvando...' : '💾 Salvar proposta'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
      <Banner {...bannerProps} />
    </div>
  )
}

function HeaderBar({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div style={S.header}>
      <div style={{ width: '80px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image src="/logo.png" alt="AIMÊ" width={80} height={36} style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '11pt', fontWeight: 700, color: '#fff', margin: 0 }}>{titulo}</h1>
        <p style={{ fontSize: '7pt', color: '#B5D4F4', marginTop: '2px' }}>{subtitulo}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  body:       { background: '#E8EEF7', display: 'flex', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, Helvetica, sans-serif', minHeight: '100vh' },
  page:       { width: '210mm', maxWidth: '100%', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,.15)', overflow: 'hidden', height: 'fit-content' },
  header:     { background: '#1E3A8A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  divider:    { height: '2px', background: '#1E3A8A' },
  formBody:   { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  block:      { border: '1px solid #c3d4f0', borderRadius: '6px', overflow: 'hidden' },
  blockTitle: { background: '#1E3A8A', color: '#ffffff', fontSize: '7.5pt', fontWeight: 700, padding: '3px 10px' },
  blockBody:  { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' },
  row:        { display: 'grid', gap: '6px' },
  c2:         { gridTemplateColumns: '1fr 1fr' },
  c3:         { gridTemplateColumns: '1fr 1fr 1fr' },
  field:      { display: 'flex', flexDirection: 'column', gap: '2px' },
  fieldLabel: { fontSize: '6.5pt', fontWeight: 600, color: '#4a6480' },
  input:      { width: '100%', border: '1px solid #c3d4f0', borderRadius: '4px', padding: '4px 6px', fontSize: '8pt', color: '#1a1a2e', fontFamily: 'inherit', background: '#ffffff', boxSizing: 'border-box' },
  inputRO:    { width: '100%', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 6px', fontSize: '8pt', color: '#64748b', fontFamily: 'inherit', background: '#f1f5f9', boxSizing: 'border-box' },
  footer:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' },
  btn:        { padding: '8px 0', fontSize: '8pt', fontWeight: 700, borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  btnSec:     { background: '#ffffff', border: '2px solid #1E3A8A', color: '#1E3A8A' },
  btnPri:     { background: '#1E3A8A', border: '2px solid #1E3A8A', color: '#ffffff' },
}
