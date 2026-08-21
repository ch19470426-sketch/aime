'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

type Estab = {
  cnpjoucpf: string
  razao_social_nome: string
  cep_estabelecimento: string
  numero_imovel: string
  complemento: string
  uso_estabelecimento: string
  tipo_id: number
  // via ViaCEP (preenchido após busca)
  logradouro?: string
  bairro?: string
  cidade?: string
  uf?: string
}

const S = {
  page: { backgroundColor:'#E8EEF7', minHeight:'100vh', padding:'16px' } as React.CSSProperties,
  card: { backgroundColor:'white', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,0.12)', overflow:'hidden', maxWidth:'900px', margin:'0 auto' } as React.CSSProperties,
  header: { backgroundColor:'#1E3A8A', padding:'8px 16px', display:'flex', alignItems:'center', gap:'12px' } as React.CSSProperties,
  body: { display:'flex', minHeight:'500px' } as React.CSSProperties,
  lista: { width:'260px', minWidth:'220px', borderRight:'2px solid #1E3A8A', flexShrink:0 } as React.CSSProperties,
  listaHeader: { backgroundColor:'#1E3A8A', padding:'8px 12px', color:'white', fontWeight:700, fontSize:'11px' } as React.CSSProperties,
  listaItem: (sel: boolean) => ({ padding:'10px 12px', borderBottom:'1px solid #F1F5F9', cursor:'pointer', backgroundColor: sel?'#EBF1FF':'white', fontSize:'11px' }) as React.CSSProperties,
  painel: { flex:1, padding:'20px', backgroundColor:'#F8FAFC' } as React.CSSProperties,
  secaoTitulo: { fontSize:'12px', fontWeight:700, color:'#1E3A8A', borderBottom:'2px solid #1E3A8A', paddingBottom:'4px', marginBottom:'12px' } as React.CSSProperties,
  label: { display:'block', fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'4px' } as React.CSSProperties,
  input: { width:'100%', padding:'8px 10px', border:'1.5px solid #D1D5DB', borderRadius:'6px', fontSize:'12px', boxSizing:'border-box' as const, backgroundColor:'#F9FAFB', color:'#374151' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' } as React.CSSProperties,
  btnSec: { backgroundColor:'white', color:'#1E3A8A', border:'2px solid #1E3A8A', borderRadius:'9999px', padding:'8px 20px', fontSize:'12px', fontWeight:700, cursor:'pointer' } as React.CSSProperties,
}

function formatDoc(v: string) {
  const d = (v ?? '').replace(/\D/g,'')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  return v
}

function MeusEstabelecimentosInner() {
  const params = useSearchParams()
  const cpfInspetor = params.get('cpf_inspetor') ?? ''

  const [estabs, setEstabs] = useState<Estab[]>([])
  const [selecionado, setSelecionado] = useState<Estab | null>(null)
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<Estab | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msgSalvar, setMsgSalvar] = useState('')

  useEffect(() => {
    if (!cpfInspetor) { setCarregando(false); return }
    fetch(`/api/meus-estabelecimentos?cpf=${cpfInspetor}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setEstabs(d)
        else setErro(d.erro ?? 'Erro ao carregar')
      })
      .catch(() => setErro('Erro de conexão'))
      .finally(() => setCarregando(false))
  }, [cpfInspetor])

  async function selecionar(est: Estab) {
    setSelecionado(est)
    setEditando({...est})
    setMsgSalvar('')
    // Buscar endereço via ViaCEP
    const cep = (est.cep_estabelecimento ?? '').replace(/\D/g,'')
    if (cep.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        const d = await r.json()
        if (!d.erro) {
          setSelecionado(prev => prev ? {
            ...prev,
            logradouro: d.logradouro || '',
            bairro: d.bairro || '',
            cidade: d.localidade || '',
            uf: d.uf || '',
          } : prev)
          setEditando(prev => prev ? {
            ...prev,
            logradouro: d.logradouro || '',
            bairro: d.bairro || '',
            cidade: d.localidade || '',
            uf: d.uf || '',
          } : prev)
        }
      } catch {}
    }
  }

  async function salvar() {
    if (!editando) return
    setSalvando(true); setMsgSalvar('')
    try {
      const res = await fetch('/api/salvar-estabelecimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando)
      })
      const d = await res.json()
      if (res.ok) {
        setMsgSalvar('Dados salvos com sucesso!')
        setSelecionado({...editando})
        setEstabs(prev => prev.map(e => e.cnpjoucpf === editando.cnpjoucpf ? {...editando} : e))
      } else {
        setMsgSalvar(`Erro: ${d.erro ?? 'Falha ao salvar.'}`)
      }
    } catch { setMsgSalvar('Erro de conexão.') }
    finally { setSalvando(false) }
  }

  const filtrados = estabs.filter(e =>
    e.razao_social_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    e.cnpjoucpf?.includes(busca.replace(/\D/g,''))
  )

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <img src="/logo.png" alt="AIMÊ" height={32} width={80}
            style={{ filter:'brightness(0) invert(1)', objectFit:'contain' }} />
          <span style={{ color:'white', fontWeight:700, fontSize:'13px', flex:1, textAlign:'center' }}>
            Meus Estabelecimentos
          </span>
          <button onClick={() => window.location.href='/dashboard'}
            style={{ ...S.btnSec, padding:'4px 12px', fontSize:'11px',
              backgroundColor:'transparent', color:'white', borderColor:'white' }}>
            ← Voltar
          </button>
        </div>
        <div style={{ height:'2px', backgroundColor:'#1E3A8A' }} />

        <div style={S.body}>
          {/* Lista */}
          <div style={S.lista}>
            <div style={S.listaHeader}>
              Estabelecimentos ({estabs.length})
            </div>
            <div style={{ padding:'8px' }}>
              <input placeholder="Buscar por nome ou CNPJ/CPF..."
                value={busca} onChange={e => setBusca(e.target.value)}
                style={{ ...S.input, backgroundColor:'white', marginBottom:'4px' }} />
            </div>
            <div style={{ overflowY:'auto', maxHeight:'460px' }}>
              {carregando ? (
                <div style={{ padding:'20px', textAlign:'center', color:'#6B7280', fontSize:'11px' }}>
                  Carregando...
                </div>
              ) : erro ? (
                <div style={{ padding:'12px', color:'#DC2626', fontSize:'11px' }}>{erro}</div>
              ) : filtrados.length === 0 ? (
                <div style={{ padding:'20px', textAlign:'center', color:'#9CA3AF', fontSize:'11px' }}>
                  {busca ? 'Nenhum resultado encontrado' : 'Nenhum estabelecimento vinculado'}
                </div>
              ) : filtrados.map(est => (
                <div key={est.cnpjoucpf}
                  onClick={() => selecionar(est)}
                  style={S.listaItem(selecionado?.cnpjoucpf === est.cnpjoucpf)}>
                  <div style={{ fontWeight:700, color:'#1E3A8A' }}>{est.razao_social_nome}</div>
                  <div style={{ fontSize:'10px', color:'#6B7280', marginTop:'2px' }}>
                    {formatDoc(est.cnpjoucpf)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Painel de detalhes */}
          <div style={S.painel}>
            {!selecionado ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', height:'400px', gap:'12px' }}>
                <div style={{ fontSize:'40px' }}>🏢</div>
                <p style={{ color:'#9CA3AF', fontSize:'13px' }}>
                  Selecione um estabelecimento na lista
                </p>
              </div>
            ) : (
              <>
                <div style={{marginBottom:'12px'}}>
                  <label style={{...S.label, fontSize:'12px'}}>Razão Social / Nome</label>
                  <input style={{...S.input, backgroundColor:'white', fontSize:'14px', fontWeight:700}}
                    value={editando?.razao_social_nome ?? ''}
                    onChange={e => setEditando(prev => prev ? {...prev, razao_social_nome: e.target.value} : prev)} />
                </div>

                {/* Identificação */}
                <div style={{ marginBottom:'16px' }}>
                  <div style={S.secaoTitulo}>Identificação</div>
                  <div style={S.grid2}>
                    <div>
                      <label style={S.label}>{selecionado.tipo_id === 2 ? 'CPF' : 'CNPJ'}</label>
                      <input style={S.input} readOnly value={formatDoc(selecionado.cnpjoucpf)} />
                    </div>
                    <div>
                      <label style={S.label}>Uso / Atividade</label>
                      <input style={{...S.input, backgroundColor:'white'}} value={editando?.uso_estabelecimento ?? ''} onChange={e => setEditando(prev => prev ? {...prev, uso_estabelecimento: e.target.value} : prev)} />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <div style={S.secaoTitulo}>Endereço</div>
                  <div style={S.grid2}>
                    <div>
                      <label style={S.label}>CEP</label>
                      <input style={{...S.input, backgroundColor:'white'}}
                      value={editando?.cep_estabelecimento ?? ''}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g,'').slice(0,8)
                        const fmt = v.length > 5 ? v.replace(/(\d{5})(\d)/,'$1-$2') : v
                        setEditando(prev => prev ? {...prev, cep_estabelecimento: fmt} : prev)
                        if (v.length === 8 && editando) selecionar({...editando, cep_estabelecimento: fmt})
                      }} />
                    </div>
                    <div>
                      <label style={S.label}>Número</label>
                      <input style={{...S.input, backgroundColor:'white'}} value={editando?.numero_imovel ?? ''} onChange={e => setEditando(prev => prev ? {...prev, numero_imovel: e.target.value} : prev)} />
                    </div>
                    <div style={{ gridColumn:'span 2' }}>
                      <label style={S.label}>Logradouro</label>
                      <input style={S.input} readOnly value={selecionado.logradouro ?? '(buscando...)'} />
                    </div>
                    <div>
                      <label style={S.label}>Bairro</label>
                      <input style={S.input} readOnly value={selecionado.bairro ?? ''} />
                    </div>
                    <div>
                      <label style={S.label}>Complemento</label>
                      <input style={{...S.input, backgroundColor:'white'}} value={editando?.complemento ?? ''} onChange={e => setEditando(prev => prev ? {...prev, complemento: e.target.value} : prev)} />
                    </div>
                    <div>
                      <label style={S.label}>Cidade</label>
                      <input style={S.input} readOnly value={selecionado.cidade ?? ''} />
                    </div>
                    <div>
                      <label style={S.label}>UF</label>
                      <input style={S.input} readOnly value={selecionado.uf ?? ''} />
                    </div>
                  </div>
                </div>
                {/* Botões */}
                <div style={{marginTop:'16px', display:'flex', gap:'8px', alignItems:'center'}}>
                  <button onClick={salvar} disabled={salvando}
                    style={{backgroundColor:'#1E3A8A', color:'white', border:'none',
                      borderRadius:'9999px', padding:'8px 24px', fontSize:'12px',
                      fontWeight:700, cursor:'pointer', opacity:salvando?0.7:1}}>
                    {salvando ? 'Salvando...' : '💾 Salvar Dados'}
                  </button>
                  {msgSalvar && (
                    <span style={{fontSize:'12px', fontWeight:600,
                      color: msgSalvar.startsWith('Erro') ? '#DC2626' : '#059669'}}>
                      {msgSalvar}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MeusEstabelecimentosPage() {
  return <Suspense fallback={<div style={{backgroundColor:'#E8EEF7',minHeight:'100vh'}} />}>
    <MeusEstabelecimentosInner />
  </Suspense>
}
