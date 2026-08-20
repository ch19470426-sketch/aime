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
  const [aba, setAba] = useState<'dados'|'plano'|'avulso'>('dados')
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
    const res = await fetch(`${SUPA_URL}/rest/v1/contratos_inspetor?cpf_inspetor=eq.${insp.cpf_inspetor}&order=data_inicio_contrato.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
    })
    setContratos(await res.json())
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

        <div style={S.body}>
          {/* ── Lista de Inspetores ── */}
          <div style={S.lista}>
            <div style={S.listaHeader}>Inspetores ({inspetores.length})</div>
            <div style={{ padding:'8px' }}>
              <input
                placeholder="Buscar por nome ou CPF..."
                value={busca} onChange={e => setBusca(e.target.value)}
                style={{ ...S.input, marginBottom:'4px' }} />
              <button onClick={novoInspetor} style={{ ...S.btnPri, width:'100%', borderRadius:'6px', marginBottom:'4px' }}>
                + Novo Inspetor
              </button>
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
                  {(['dados','plano','avulso'] as const).map(a => (
                    <button key={a} onClick={() => setAba(a)}
                      style={{ padding:'6px 16px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700,
                        borderBottom: aba===a ? '2px solid #1E3A8A' : '2px solid transparent',
                        color: aba===a ? '#1E3A8A' : '#6B7280', backgroundColor:'transparent' }}>
                      {a === 'dados' ? '📋 Dados' : a === 'plano' ? '📊 Plano' : '➕ Avulso'}
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
                      <button onClick={() => window.location.href=`/inspetor?cpf=${selecionado.cpf_inspetor}&gestor=1`}
                        style={S.btnPri}>
                        ✏️ Editar Cadastro
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
                              <div style={S.grid3}>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Plano</div>
                                  <div style={{ fontWeight:700, color:'#1E3A8A' }}>{ct.saldo_quantidade_plano} / {ct.qde_contratada_plano}</div>
                                  <div style={{ height:'4px', backgroundColor:'#E5E7EB', borderRadius:'2px', marginTop:'4px' }}>
                                    <div style={{ height:'4px', backgroundColor:'#1E3A8A', borderRadius:'2px', width:`${pct}%` }} />
                                  </div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Avulso</div>
                                  <div style={{ fontWeight:700, color:'#7C3AED' }}>{ct.saldo_quantidade_avulso} / {ct.qde_contratada_avulso}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>Início</div>
                                  <div style={{ fontWeight:700 }}>{new Date(ct.data_inicio_contrato).toLocaleDateString('pt-BR')}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Novo plano */}
                    <div style={{ ...S.secaoTitulo, marginTop:'16px' }}>Atribuir Novo Plano</div>
                    <div style={S.grid2}>
                      <div>
                        <label style={S.label}>Tipo de Plano</label>
                        <select style={S.select} value={novoPlano} onChange={e => setNovoPlano(e.target.value)}>
                          {PLANOS.map(p => <option key={p} value={p}>{p} — {PLANO_CR[p]} CR</option>)}
                        </select>
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end' }}>
                        <button onClick={atribuirPlano} disabled={salvando} style={S.btnPri}>
                          {salvando ? 'Aguarde...' : 'Atribuir Plano'}
                        </button>
                      </div>
                    </div>
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
        </div>
      </div>
    </div>
  )
}
