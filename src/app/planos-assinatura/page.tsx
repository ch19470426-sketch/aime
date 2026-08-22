'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

type Plano = {
  id?: number
  tipo_assinatura: string
  qde_creditos: number
  validade_dias: number
  ativo: boolean
  descricao?: string
}

const formInicial: Plano = {
  tipo_assinatura: '',
  qde_creditos: 600,
  validade_dias: 30,
  ativo: true,
  descricao: '',
}

const inputStyle = { width:'100%', padding:'8px 12px', border:'1.5px solid #D1D5DB', borderRadius:'8px', fontSize:'13px', boxSizing:'border-box' as const }
const labelStyle = { display:'block', fontSize:'12px', fontWeight:700 as const, color:'#374151', marginBottom:'4px' }
const blocoStyle = { border:'2px solid #1E3A8A', borderRadius:'8px', overflow:'hidden', marginBottom:'16px' }
const blocoHeaderStyle = { backgroundColor:'#1E3A8A', padding:'6px 12px' }
const blocoBodyStyle = { padding:'12px' }

export default function PlanosAssinaturaPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [form, setForm] = useState<Plano>(formInicial)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const supabase = createClient()

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase
      .from('planos_assinatura')
      .select('*')
      .order('id')
    if (data) setPlanos(data)
  }

  function selecionar(p: Plano) {
    setForm({...p})
    setModoEdicao(true)
    setMsg(''); setErro('')
  }

  function novo() {
    setForm(formInicial)
    setModoEdicao(false)
    setMsg(''); setErro('')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tipo_assinatura || !form.qde_creditos || !form.validade_dias) {
      setErro('Preencha todos os campos obrigatórios.'); return
    }
    setSalvando(true); setMsg(''); setErro('')
    try {
      if (modoEdicao && form.id) {
        const { error } = await supabase
          .from('planos_assinatura')
          .update({ tipo_assinatura: form.tipo_assinatura, qde_creditos: form.qde_creditos,
            validade_dias: form.validade_dias, ativo: form.ativo, descricao: form.descricao })
          .eq('id', form.id)
        if (error) { setErro(error.message); return }
        setMsg('Plano atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('planos_assinatura')
          .insert({ tipo_assinatura: form.tipo_assinatura, qde_creditos: form.qde_creditos,
            validade_dias: form.validade_dias, ativo: form.ativo, descricao: form.descricao })
        if (error) { setErro(error.message); return }
        setMsg('Plano incluído com sucesso!')
        novo()
      }
      await carregar()
    } finally { setSalvando(false) }
  }

  return (
    <div style={{ backgroundColor:'#E8EEF7', minHeight:'100vh', padding:'16px' }}>
      <div style={{ maxWidth:'900px', margin:'0 auto', backgroundColor:'white', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ backgroundColor:'#1E3A8A', padding:'8px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} style={{ filter:'brightness(0) invert(1)', objectFit:'contain' }} />
          <span style={{ color:'white', fontWeight:700, fontSize:'13px', flex:1, textAlign:'center' }}>
            Planos de Assinatura
          </span>
          <button onClick={() => window.location.href='/gestor?aba=configuracoes'}
            style={{ backgroundColor:'transparent', color:'white', border:'2px solid white',
              borderRadius:'9999px', padding:'4px 14px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
            ← Voltar
          </button>
        </div>
        <div style={{ height:'2px', backgroundColor:'#1E3A8A' }} />

        <div style={{ display:'flex', minHeight:'500px', flexWrap:'wrap' as const }}>
          {/* Lista */}
          <div style={{ width:'260px', borderRight:'2px solid #1E3A8A', flexShrink:0 }}>
            <div style={{ backgroundColor:'#1E3A8A', padding:'8px 12px', color:'white', fontWeight:700, fontSize:'11px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Planos ({planos.length})</span>
              <button onClick={novo}
                style={{ backgroundColor:'white', color:'#1E3A8A', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', fontWeight:700, cursor:'pointer' }}>
                + Novo
              </button>
            </div>
            <div style={{ overflowY:'auto', maxHeight:'500px' }}>
              {planos.map(p => (
                <div key={p.id} onClick={() => selecionar(p)}
                  style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9', cursor:'pointer',
                    backgroundColor: form.id === p.id ? '#EBF1FF' : 'white' }}>
                  <div style={{ fontWeight:700, fontSize:'11px', color:'#1E3A8A' }}>{p.tipo_assinatura}</div>
                  <div style={{ fontSize:'10px', color:'#6B7280', marginTop:'2px' }}>
                    {p.qde_creditos} CR · {p.validade_dias} dias ·{' '}
                    <span style={{ color: p.ativo ? '#059669' : '#DC2626' }}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulário */}
          <div style={{ flex:1, minWidth:'280px', padding:'20px', backgroundColor:'#F8FAFC' }}>
            <form onSubmit={salvar}>
              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}>
                  <span style={{ color:'white', fontWeight:700, fontSize:'12px' }}>
                    {modoEdicao ? 'Editar Plano' : 'Novo Plano'}
                  </span>
                </div>
                <div style={blocoBodyStyle}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'12px' }}>
                    <div style={{ gridColumn:'span 2' }}>
                      <label style={labelStyle}>Tipo / Nome do Plano *</label>
                      <input name="tipo_assinatura" value={form.tipo_assinatura}
                        onChange={e => setForm(f => ({...f, tipo_assinatura: e.target.value}))}
                        placeholder="Ex: PLANO MENSAL" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Quantidade de Créditos (CR) *</label>
                      <input type="number" value={form.qde_creditos}
                        onChange={e => setForm(f => ({...f, qde_creditos: Number(e.target.value)}))}
                        min={1} required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Validade (dias) *</label>
                      <input type="number" value={form.validade_dias}
                        onChange={e => setForm(f => ({...f, validade_dias: Number(e.target.value)}))}
                        min={1} required style={inputStyle} />
                    </div>
                    <div style={{ gridColumn:'span 2' }}>
                      <label style={labelStyle}>Descrição</label>
                      <input value={form.descricao ?? ''}
                        onChange={e => setForm(f => ({...f, descricao: e.target.value}))}
                        placeholder="Descrição opcional" style={inputStyle} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <input type="checkbox" checked={form.ativo}
                        onChange={e => setForm(f => ({...f, ativo: e.target.checked}))}
                        style={{ width:'16px', height:'16px', cursor:'pointer' }} />
                      <label style={{ fontSize:'12px', fontWeight:700, color:'#374151', cursor:'pointer' }}>
                        Plano ativo
                      </label>
                    </div>
                  </div>

                  {erro && <div style={{ marginTop:'10px', padding:'8px 12px', backgroundColor:'#FEE2E2', color:'#DC2626', borderRadius:'6px', fontSize:'12px' }}>{erro}</div>}
                  {msg  && <div style={{ marginTop:'10px', padding:'8px 12px', backgroundColor:'#D1FAE5', color:'#059669', borderRadius:'6px', fontSize:'12px' }}>{msg}</div>}

                  <div style={{ marginTop:'16px', display:'flex', gap:'8px' }}>
                    <button type="submit" disabled={salvando}
                      style={{ backgroundColor:'#1E3A8A', color:'white', border:'none', borderRadius:'9999px',
                        padding:'8px 24px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:salvando?0.7:1 }}>
                      {salvando ? 'Salvando...' : 'Salvar Alterações'}
                    </button>

                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
