'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

const S = {
  page: { backgroundColor: '#E8EEF7', minHeight: '100vh', padding: '16px' } as React.CSSProperties,
  card: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', overflow: 'hidden', maxWidth: '1200px', margin: '0 auto' } as React.CSSProperties,
  header: { backgroundColor: '#1E3A8A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' } as React.CSSProperties,
  body: { display: 'flex', minHeight: '600px' } as React.CSSProperties,
  // Lista lateral
  lista: { width: '280px', minWidth: '220px', borderRight: '2px solid #1E3A8A', flexShrink: 0 } as React.CSSProperties,
  listaHeader: { backgroundColor: '#1E3A8A', padding: '8px 12px', color: 'white', fontWeight: 700, fontSize: '11px' } as React.CSSProperties,
  listaItem: (sel: boolean) => ({ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: sel ? '#EBF1FF' : 'white', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }) as React.CSSProperties,
  // Painel direito
  painel: { flex: 1, padding: '20px', backgroundColor: '#F8FAFC', overflowY: 'auto' as const },
  secao: { marginBottom: '20px' } as React.CSSProperties,
  secaoTitulo: { fontSize: '12px', fontWeight: 700, color: '#1E3A8A', borderBottom: '2px solid #1E3A8A', paddingBottom: '4px', marginBottom: '12px' } as React.CSSProperties,
  label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' } as React.CSSProperties,
  input: { width: '100%', padding: '8px 10px', border: '1.5px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '8px 10px', border: '1.5px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' as const, backgroundColor: 'white' },
  btnPri: { backgroundColor: '#1E3A8A', color: 'white', border: 'none', borderRadius: '9999px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  btnSec: { backgroundColor: 'white', color: '#1E3A8A', border: '2px solid #1E3A8A', borderRadius: '9999px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } as React.CSSProperties,
  badge: (cor: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, backgroundColor: cor, color: 'white' }) as React.CSSProperties,
  planoCard: (ativo: boolean) => ({ border: `2px solid ${ativo ? '#1E3A8A' : '#E2E8F0'}`, borderRadius: '8px', padding: '10px 12px', backgroundColor: ativo ? '#EBF1FF' : 'white' }) as React.CSSProperties,
}

type ResumoGestor = {
  totalInspetores: number
  inspetoresAtivos: number
  contratosVigentes: number
  totalCrPlano: number
  totalCrAvulso: number
  totalCrConsumo: number
  inspetoresSemContrato: string[]
}

type Estabelecimento = {
  cnpjoucpf: string
  razao_social_nome: string
  cep_estabelecimento: string
  numero_imovel: string
  complemento: string
  uso_estabelecimento: string
  tipo_id: number
}

type Inspetor = {
  cpf_inspetor: string
  nome_inspetor: string
  titulo_profissional: string
  inspetor_email: string
  inspetor_whatsapp: string
  is_gestor: boolean
}

type Contrato = {
  cpf_inspetor: string
  tipo_assinatura: string
  data_inicio_contrato: string
  data_fim_contrato: string
  qde_contratada_plano: number
  saldo_quantidade_plano: number
  qde_contratada_avulso: number
  saldo_quantidade_avulso: number
}

const PLANOS = ['PLANO CORTESIA', 'PLANO SERVIÇO', 'PLANO MENSAL', 'PLANO ESCRITÓRIO']
const PLANO_CR: Record<string, number> = {
  'PLANO CORTESIA': 600, 'PLANO SERVIÇO': 600, 'PLANO MENSAL': 1200, 'PLANO ESCRITÓRIO': 3600
}
const COR_PLANO: Record<string, string> = {
  'PLANO CORTESIA': '#6B7280', 'PLANO SERVIÇO': '#0284C7', 'PLANO MENSAL': '#059669', 'PLANO ESCRITÓRIO': '#7C3AED'
}

export default function GestorPage() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [inspetores, setInspetores] = useState<Inspetor[]>([])
  const [selecionado, setSelecionado] = useState<Inspetor | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [aba, setAba] = useState<'dados'|'plano'>('dados')
  const [abaGestor, setAbaGestor] = useState<'inspetores'|'estabelecimentos'|'visao-geral'>('inspetores')
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [estabSel, setEstabSel] = useState<Estabelecimento | null>(null)
  const [buscaEstab, setBuscaEstab] = useState('')
  const [editEstab, setEditEstab] = useState<Estabelecimento | null>(null)
  const [salvandoEstab, setSalvandoEstab] = useState(false)
  const [msgEstab, setMsgEstab] = useState('')
  const [carregandoEstab, setCarregandoEstab] = useState(false)
  const [resumo, setResumo] = useState<ResumoGestor | null>(null)
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  // Novo plano
  const [novoPlano, setNovoPlano] = useState('PLANO MENSAL')
  const [novoAvulso, setNovoAvulso] = useState(600)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/'; return }
      const cpf = session.user.email?.split('@')[0] ?? ''
      const res = await fetch(`${SUPA_URL}/rest/v1/inspetor?cpf_inspetor=eq.${cpf}&select=is_gestor`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` }
      })
      const d = await res.json()
      if (!d[0]?.is_gestor) { window.location.href = '/dashboard'; return }
      setAutorizado(true)
      carregarInspetores(session.access_token)
    })
  }, [])

  async function carregarInspetores(token: string) {
    const res = await fetch(`${SUPA_URL}/rest/v1/inspetor?select=cpf_inspetor,nome_inspetor,titulo_profissional,inspetor_email,inspetor_whatsapp,is_gestor&order=nome_inspetor`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` }
    })
    setInspetores(await res.json())
  }

  async function selecionarInspetor(insp: Inspetor) {
    setSelecionado(insp)
    setAba('dados')
    setMsg('')
    try {
      const r = await fetch(`/api/gestor/contratos?cpf=${insp.cpf_inspetor}`)
      const d = await r.json()
      setContratos(Array.isArray(d) ? d : [])
    } catch { setContratos([]) }
  }

  async function atribuirPlano() {
    if (!selecionado) return
    setSalvando(true); setMsg('')
    try {
      const res = await fetch('/api/gestor/atribuir-plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: selecionado.cpf_inspetor, tipo: novoPlano, qde: PLANO_CR[novoPlano] })
      })
      const d = await res.json()
      if (!res.ok) { setMsg(`Erro: ${d.erro}`); return }
      setMsg('Plano atribuído com sucesso!')
      await selecionarInspetor(selecionado)
      setAba('plano')
    } catch (e) { setMsg('Erro ao atribuir plano.') }
    finally { setSalvando(false) }
  }

  async function adicionarAvulso() {
    if (!selecionado) return
    setSalvando(true); setMsg('')
    try {
      const res = await fetch('/api/gestor/adicionar-avulso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: selecionado.cpf_inspetor, qde: novoAvulso })
      })
      const d = await res.json()
      if (!res.ok) { setMsg(`Erro: ${d.erro}`); return }
      setMsg(`${novoAvulso} créditos avulsos adicionados!`)
      await selecionarInspetor(selecionado)
      setAba('plano')
    } catch (e) { setMsg('Erro ao adicionar créditos.') }
    finally { setSalvando(false) }
  }

  async function carregarResumo() {
    setCarregandoResumo(true)
    try {
      const res = await fetch('/api/gestor/resumo')
      const data = await res.json()
      setResumo(data)
    } catch { setResumo(null) }
    finally { setCarregandoResumo(false) }
  }

  async function carregarEstabelecimentos() {
    setCarregandoEstab(true)
    try {
      const res = await fetch('/api/gestor/listar-estabelecimentos')
      const data = await res.json()
      if (Array.isArray(data)) {
        setEstabelecimentos(data)
      } else {
        console.error('[AIMÊ] listar-estabelecimentos retornou:', data)
        setEstabelecimentos([])
        setMsgEstab(`Erro ao carregar: ${data?.erro ?? JSON.stringify(data)}`)
      }
    } catch (e) {
      console.error('[AIMÊ] erro carregarEstabelecimentos:', e)
      setEstabelecimentos([])
      setMsgEstab('Erro de conexão ao carregar estabelecimentos.')
    } finally {
      setCarregandoEstab(false)
    }
  }

  async function salvarEstab() {
    if (!editEstab) return
    setSalvandoEstab(true); setMsgEstab('')
    try {
      const res = await fetch('/api/salvar-estabelecimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEstab)
      })
      const d = await res.json()
      if (!res.ok) { setMsgEstab(`Erro: ${d.erro ?? 'Falha ao salvar.'}`); return }
      setMsgEstab('Estabelecimento atualizado com sucesso!')
      setEstabSel(editEstab)
      await carregarEstabelecimentos()
    } catch { setMsgEstab('Erro ao salvar.') }
    finally { setSalvandoEstab(false) }
  }

  async function novoInspetor() {
    const { data: { session } } = await supabase.auth.getSession()
    window.location.href = `/inspetor?gestor=1`
  }

  const inspFiltrados = inspetores.filter(i =>
    i.nome_inspetor?.toLowerCase().includes(busca.toLowerCase()) ||
    i.cpf_inspetor?.includes(busca.replace(/\D/g,''))
  )

  const contratoAtivo = contratos.find(c => new Date(c.data_fim_contrato) >= new Date())
  const saldoTotal = (contratoAtivo?.saldo_quantidade_plano ?? 0) + (contratos[0]?.saldo_quantidade_avulso ?? 0)

  if (autorizado === null) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#4a6480' }}>Verificando acesso...</p>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <img src="/logo.png" alt="AIMÊ" width={80} height={32} style={{ filter:'brightness(0) invert(1)', objectFit:'contain' }} />
          <span style={{ color:'white', fontWeight:700, fontSize:'13px', flex:1, textAlign:'center' }}>
            Painel do Gestor
          </span>
          <button onClick={() => window.location.href='/dashboard'}
            style={{ ...S.btnSec, padding:'4px 12px', fontSize:'11px', backgroundColor:'transparent', color:'white', borderColor:'white' }}>
            ← Voltar
          </button>
        </div>
        <div style={{ height:'2px', backgroundColor:'#1E3A8A' }} />

        {/* Navegação principal */}
        <div style={{ display:'flex', gap:'0', borderBottom:'2px solid #1E3A8A' }}>
          {(['inspetores','estabelecimentos','visao-geral'] as const).map(ab => (
            <button key={ab} onClick={() => { setAbaGestor(ab); if(ab==='estabelecimentos') carregarEstabelecimentos(); if(ab==='visao-geral') carregarResumo() }}
              style={{ padding:'8px 20px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700,
                borderBottom: abaGestor===ab ? '3px solid #1E3A8A' : '3px solid transparent',
                color: abaGestor===ab ? '#1E3A8A' : '#6B7280', backgroundColor:'white' }}>
              {ab === 'inspetores' ? '👤 Inspetores' : ab === 'estabelecimentos' ? '🏢 Estabelecimentos' : '📊 Visão Geral'}
            </button>
          ))}
        </div>

        <div style={S.body}>
          {abaGestor === 'inspetores' ? (<>
          {/* ── Lista de Inspetores ── */}
          <div style={S.lista}>
            <div style={{ ...S.listaHeader, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Inspetores ({inspetores.length})</span>
              <button onClick={() => window.location.href='/inspetor?gestor=1'}
                style={{ backgroundColor:'white', color:'#1E3A8A', border:'none',
                  borderRadius:'4px', padding:'2px 8px', fontSize:'10px', fontWeight:700, cursor:'pointer' }}>
                + Novo Gestor
              </button>
            </div>
            <div style={{ padding:'8px' }}>
              <input
                placeholder="Buscar por nome ou CPF..."
                value={busca} onChange={e => setBusca(e.target.value)}
                style={{ ...S.input, marginBottom:'4px' }} />
            </div>
            <div style={{ overflowY:'auto', maxHeight:'500px' }}>
              {inspFiltrados.map(insp => (
                <div key={insp.cpf_inspetor}
                  onClick={() => selecionarInspetor(insp)}
                  style={S.listaItem(selecionado?.cpf_inspetor === insp.cpf_inspetor)}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'11px', color:'#1E3A8A' }}>
                      {insp.nome_inspetor}
                    </div>
                    <div style={{ fontSize:'10px', color:'#6B7280' }}>
                      {insp.titulo_profissional} · {insp.cpf_inspetor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')}
                    </div>
                  </div>
                  {insp.is_gestor && <span style={S.badge('#7C3AED')}>G</span>}
                </div>
              ))}
              {inspFiltrados.length === 0 && (
                <div style={{ padding:'20px', textAlign:'center', color:'#9CA3AF', fontSize:'11px' }}>
                  Nenhum inspetor encontrado
                </div>
              )}
            </div>
          </div>

          {/* ── Painel de Detalhes ── */}
          <div style={S.painel}>
            {!selecionado ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'400px', flexDirection:'column', gap:'12px' }}>
                <div style={{ fontSize:'40px' }}>👤</div>
                <p style={{ color:'#9CA3AF', fontSize:'13px' }}>Selecione um inspetor na lista</p>
              </div>
            ) : (
              <>
                {/* Nome e resumo */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:'16px', color:'#1E3A8A', fontWeight:900 }}>{selecionado.nome_inspetor}</h2>
                    <p style={{ margin:'2px 0 0', fontSize:'11px', color:'#6B7280' }}>{selecionado.titulo_profissional}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'11px', color:'#6B7280' }}>Saldo total</div>
                    <div style={{ fontSize:'20px', fontWeight:900, color: saldoTotal > 0 ? '#059669' : '#DC2626' }}>
                      {saldoTotal} CR
                    </div>
                  </div>
                </div>

                {/* Abas */}
                <div style={{ display:'flex', gap:'4px', marginBottom:'16px', borderBottom:'2px solid #E2E8F0' }}>
                  {(['dados','plano'] as const).map(a => (
                    <button key={a} onClick={() => setAba(a)}
                      style={{ padding:'6px 16px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700,
                        borderBottom: aba===a ? '2px solid #1E3A8A' : '2px solid transparent',
                        color: aba===a ? '#1E3A8A' : '#6B7280', backgroundColor:'transparent' }}>
                      {a === 'dados' ? '📋 Dados' : '📊 Plano'}
                    </button>
                  ))}
                </div>

                {msg && (
                  <div style={{ padding:'8px 12px', borderRadius:'8px', marginBottom:'12px', fontSize:'12px',
                    backgroundColor: msg.startsWith('Erro') ? '#FEE2E2' : '#D1FAE5',
                    color: msg.startsWith('Erro') ? '#DC2626' : '#059669' }}>
                    {msg}
                  </div>
                )}

                {/* Aba Dados */}
                {aba === 'dados' && (
                  <div style={S.secao}>
                    <div style={S.secaoTitulo}>Dados Cadastrais</div>
                    <div style={S.grid2}>
                      <div>
                        <label style={S.label}>CPF</label>
                        <input style={S.input} readOnly value={selecionado.cpf_inspetor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')} />
                      </div>
                      <div>
                        <label style={S.label}>Título Profissional</label>
                        <input style={S.input} readOnly value={selecionado.titulo_profissional} />
                      </div>
                      <div>
                        <label style={S.label}>E-mail</label>
                        <input style={S.input} readOnly value={selecionado.inspetor_email} />
                      </div>
                      <div>
                        <label style={S.label}>WhatsApp</label>
                        <input style={S.input} readOnly value={selecionado.inspetor_whatsapp} />
                      </div>
                    </div>
                    <div style={{ marginTop:'12px', display:'flex', gap:'8px' }}>
                      <button onClick={() => window.location.href=`/inspetor?cpf=${selecionado.cpf_inspetor}&visualizar=1`}
                        style={S.btnPri}>
                        🔍 Visualizar Cadastro
                      </button>
                    </div>
                  </div>
                )}

                {/* Aba Plano */}
                {aba === 'plano' && (
                  <div>
                    <div style={S.secaoTitulo}>Contratos e Créditos</div>
                    {contratos.length === 0 ? (
                      <p style={{ color:'#9CA3AF', fontSize:'12px' }}>Nenhum contrato encontrado.</p>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                        {contratos.map((ct, i) => {
                          const vencido = new Date(ct.data_fim_contrato) < new Date()
                          const pct = ct.qde_contratada_plano > 0
                            ? Math.round((ct.saldo_quantidade_plano/ct.qde_contratada_plano)*100) : 0
                          return (
                            <div key={i} style={{ border:`1.5px solid ${vencido?'#E5E7EB':'#1E3A8A'}`, borderRadius:'8px', padding:'12px', opacity: vencido ? 0.6 : 1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                                <span style={S.badge(COR_PLANO[ct.tipo_assinatura] ?? '#6B7280')}>{ct.tipo_assinatura}</span>
                                <span style={{ fontSize:'10px', color: vencido?'#DC2626':'#059669', fontWeight:700 }}>
                                  {vencido ? '⚠ Vencido' : `✓ Válido até ${new Date(ct.data_fim_contrato).toLocaleDateString('pt-BR')}`}
                                </span>
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginTop:'8px' }}>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>Início</div>
                                  <div style={{ fontWeight:700 }}>{new Date(ct.data_inicio_contrato).toLocaleDateString('pt-BR')}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>Vencimento</div>
                                  <div style={{ fontWeight:700, color:vencido?'#DC2626':'#059669' }}>{new Date(ct.data_fim_contrato).toLocaleDateString('pt-BR')}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Contratado</div>
                                  <div style={{ fontWeight:700, color:'#1E3A8A' }}>{ct.qde_contratada_plano}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Saldo Plano</div>
                                  <div style={{ fontWeight:700, color:'#1E3A8A' }}>{ct.saldo_quantidade_plano}</div>
                                  <div style={{ height:'4px', backgroundColor:'#E5E7EB', borderRadius:'2px', marginTop:'4px' }}>
                                    <div style={{ height:'4px', backgroundColor:'#1E3A8A', borderRadius:'2px', width:`${pct}%` }} />
                                  </div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Avulso Contratado</div>
                                  <div style={{ fontWeight:700, color:'#7C3AED' }}>{ct.qde_contratada_avulso}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Saldo Avulso</div>
                                  <div style={{ fontWeight:700, color:'#7C3AED' }}>{ct.saldo_quantidade_avulso}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Novo plano */}

                  </div>
                )}

                {/* Aba Avulso */}
                {aba === 'avulso' && (
                  <div>
                    <div style={S.secaoTitulo}>Adicionar Créditos Avulsos</div>
                    <p style={{ fontSize:'12px', color:'#374151', marginBottom:'16px', lineHeight:1.6 }}>
                      Créditos avulsos não possuem validade e são acumulativos. Pacotes de 600 CR.
                    </p>
                    <div style={S.grid2}>
                      <div>
                        <label style={S.label}>Quantidade de Créditos</label>
                        <select style={S.select} value={novoAvulso} onChange={e => setNovoAvulso(Number(e.target.value))}>
                          {[600,1200,1800,2400,3000,3600].map(v => (
                            <option key={v} value={v}>{v} CR ({v/600} pacote{v>600?'s':''})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end' }}>
                        <button onClick={adicionarAvulso} disabled={salvando} style={S.btnPri}>
                          {salvando ? 'Aguarde...' : 'Adicionar Créditos'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          </>) : abaGestor === 'estabelecimentos' ? (<>
          {/* ── Lista de Estabelecimentos ── */}
          <div style={S.lista}>
            <div style={S.listaHeader}>Estabelecimentos ({estabelecimentos.length})</div>
            <div style={{ padding:'8px' }}>
              <input placeholder="Buscar por nome ou CNPJ/CPF..."
                value={buscaEstab} onChange={e => setBuscaEstab(e.target.value)}
                style={{ ...S.input, marginBottom:'4px' }} />
              <button onClick={carregarEstabelecimentos} disabled={carregandoEstab}
                style={{ ...S.btnPri, width:'100%', borderRadius:'6px', marginBottom:'4px',
                  opacity: carregandoEstab ? 0.7 : 1 }}>
                {carregandoEstab ? 'Carregando...' : '🔍 Listar Estabelecimentos'}
              </button>
            </div>
            {msgEstab && !msgEstab.startsWith('Estabelecimento atualizado') && (
              <div style={{ margin:'4px 8px', padding:'6px 8px', borderRadius:'4px', fontSize:'10px',
                backgroundColor:'#FEE2E2', color:'#DC2626' }}>{msgEstab}</div>
            )}
            <div style={{ overflowY:'auto', maxHeight:'520px' }}>
              {estabelecimentos
                .filter(e => e.razao_social_nome?.toLowerCase().includes(buscaEstab.toLowerCase()) ||
                  e.cnpjoucpf?.includes(buscaEstab.replace(/\D/g,'')))
                .map(est => (
                  <div key={est.cnpjoucpf}
                    onClick={() => { setEstabSel(est); setEditEstab({...est}); setMsgEstab('') }}
                    style={S.listaItem(estabSel?.cnpjoucpf === est.cnpjoucpf)}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'11px', color:'#1E3A8A' }}>{est.razao_social_nome}</div>
                      <div style={{ fontSize:'10px', color:'#6B7280' }}>{est.cnpjoucpf} · CEP {est.cep_estabelecimento}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ── Painel Estabelecimento ── */}
          <div style={S.painel}>
            {!estabSel ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'400px', flexDirection:'column', gap:'12px' }}>
                <div style={{ fontSize:'40px' }}>🏢</div>
                <p style={{ color:'#9CA3AF', fontSize:'13px' }}>Selecione um estabelecimento na lista</p>
              </div>
            ) : (
              <>
                <h2 style={{ margin:'0 0 16px', fontSize:'16px', color:'#1E3A8A', fontWeight:900 }}>{estabSel.razao_social_nome}</h2>

                {msgEstab && (
                  <div style={{ padding:'8px 12px', borderRadius:'8px', marginBottom:'12px', fontSize:'12px',
                    backgroundColor: msgEstab.startsWith('Erro') ? '#FEE2E2' : '#D1FAE5',
                    color: msgEstab.startsWith('Erro') ? '#DC2626' : '#059669' }}>
                    {msgEstab}
                  </div>
                )}

                <div style={{ ...S.secaoTitulo, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>Dados do Estabelecimento</span>
                  <span style={{ fontSize:'10px', color:'#6B7280', fontWeight:400 }}>somente consulta</span>
                </div>
                <div style={S.grid2}>
                  {/* Linha 1: Razão Social + CNPJ/CPF */}
                <div style={S.grid2}>
                  <div>
                    <label style={S.label}>Razão Social / Nome</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.razao_social_nome ?? ''}
                      onChange={e => setEditEstab((prev: any) => ({ ...prev, razao_social_nome: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.label}>CNPJ / CPF</label>
                    <input
                      style={{ ...S.input, backgroundColor: '#F9FAFB', color: '#6B7280' }}
                      value={(() => {
                        const v = editEstab?.cnpjoucpf?.replace(/\D/g,'') ?? ''
                        if (v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
                        if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
                        return v
                      })()}
                      readOnly />
                  </div>
                </div>
                {/* Linha 2: Uso */}
                <div style={{ marginTop:'8px' }}>
                  <label style={S.label}>Uso / Atividade</label>
                  <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.uso_estabelecimento ?? ''}
                    onChange={e => setEditEstab((prev: any) => ({ ...prev, uso_estabelecimento: e.target.value }))} />
                </div>
                {/* Linha 3: CEP */}
                <div style={{ marginTop:'8px' }}>
                  <label style={S.label}>CEP</label>
                  <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.cep_estabelecimento ?? ''}
                    onChange={e => setEditEstab((prev: any) => ({ ...prev, cep_estabelecimento: e.target.value }))} />
                </div>
                {/* Linha 4: Número + Complemento */}
                <div style={{ ...S.grid2, marginTop:'8px' }}>
                  <div>
                    <label style={S.label}>Número</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.numero_imovel ?? ''}
                      onChange={e => setEditEstab((prev: any) => ({ ...prev, numero_imovel: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.label}>Complemento</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.complemento ?? ''}
                      onChange={e => setEditEstab((prev: any) => ({ ...prev, complemento: e.target.value }))} />
                  </div>
                </div>
                </div>

              </>
            )}
          </div>
          </>) : (<>
          {/* ── Visão Geral ── */}
          <div style={{ flex:1, padding:'20px', backgroundColor:'#F8FAFC' }}>
            {carregandoResumo ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#6B7280', fontSize:'13px' }}>Carregando...</div>
            ) : !resumo ? (
              <div style={{ textAlign:'center', padding:'40px', flexDirection:'column', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ fontSize:'40px' }}>📊</div>
                <p style={{ color:'#9CA3AF', fontSize:'13px' }}>Clique para carregar o resumo</p>
                <button onClick={carregarResumo} style={S.btnPri}>Carregar Visão Geral</button>
              </div>
            ) : (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'24px' }}>
                  {[
                    { label:'Total de Inspetores', valor: resumo.totalInspetores, cor:'#1E3A8A', icon:'👤' },
                    { label:'Com Contrato Vigente', valor: resumo.contratosVigentes, cor:'#059669', icon:'✅' },
                    { label:'Sem Contrato', valor: resumo.totalInspetores - resumo.contratosVigentes, cor:'#DC2626', icon:'⚠️' },
                    { label:'CR Plano Disponível', valor: resumo.totalCrPlano, cor:'#0284C7', icon:'📦' },
                    { label:'CR Avulso Disponível', valor: resumo.totalCrAvulso, cor:'#7C3AED', icon:'➕' },
                    { label:'Total CR Disponível', valor: resumo.totalCrPlano + resumo.totalCrAvulso, cor:'#065F46', icon:'💎' },
                  ].map(({ label, valor, cor, icon }) => (
                    <div key={label} style={{ backgroundColor:'white', borderRadius:'10px', padding:'16px',
                      border:`2px solid ${cor}20`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize:'20px', marginBottom:'6px' }}>{icon}</div>
                      <div style={{ fontSize:'22px', fontWeight:900, color: cor }}>{valor.toLocaleString('pt-BR')}</div>
                      <div style={{ fontSize:'10px', color:'#6B7280', marginTop:'4px' }}>{label}</div>
                    </div>
                  ))}
                </div>
                {resumo.inspetoresSemContrato.length > 0 && (
                  <div>
                    <div style={S.secaoTitulo}>Inspetores sem contrato vigente</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                      {resumo.inspetoresSemContrato.map(nome => (
                        <span key={nome} style={{ backgroundColor:'#FEE2E2', color:'#DC2626',
                          padding:'3px 10px', borderRadius:'9999px', fontSize:'11px', fontWeight:600 }}>
                          {nome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop:'20px', textAlign:'right' }}>
                  <button onClick={carregarResumo} style={{ ...S.btnSec, fontSize:'11px', padding:'6px 14px' }}>
                    🔄 Atualizar
                  </button>
                </div>
              </div>
            )}
          </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
