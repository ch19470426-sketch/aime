'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

type Item = {
  id?: number
  tipo_servico: string
  tipo_parametro: string
  descricao: string
  peso: number
  percentual_calculo: number | null
  ativo: boolean
}

const TIPOS_SERVICO = [
  '31 Autovistoria','32 Vistoria inspeção','33 Vistoria imóvel novo',
  '34 Vistoria fachada','35 Vistoria elevador',
  '36 Vistoria nr-10','37 Vistoria nr-12','38 Vistoria nr-13',
]
const TIPOS_PARAM = ['Gravidade','Urgência','Abrangência','Exposição']
const formInicial: Item = { tipo_servico:'31 Autovistoria', tipo_parametro:'Gravidade', descricao:'', peso:1, percentual_calculo:null, ativo:true }

const inputStyle  = { width:'100%', padding:'8px 12px', border:'1.5px solid #D1D5DB', borderRadius:'8px', fontSize:'13px', boxSizing:'border-box' as const }
const labelStyle  = { display:'block', fontSize:'12px', fontWeight:700 as const, color:'#374151', marginBottom:'4px' }
const blocoStyle  = { border:'2px solid #1E3A8A', borderRadius:'8px', overflow:'hidden' as const, marginBottom:'16px' }
const blocoHdr    = { backgroundColor:'#1E3A8A', padding:'6px 12px' }
const blocoBody   = { padding:'12px' }

export default function CriticidadeGutPage() {
  const [itens, setItens]           = useState<Item[]>([])
  const [tipoSvc, setTipoSvc]       = useState('31 Autovistoria')
  const [tipoParam, setTipoParam]   = useState('Gravidade')
  const [form, setForm]             = useState<Item>(formInicial)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [salvando, setSalvando]     = useState(false)
  const [msg, setMsg]   = useState('')
  const [erro, setErro] = useState('')
  const supabase = createClient()

  useEffect(() => { carregar() }, [tipoSvc])

  async function carregar() {
    const { data } = await supabase
      .from('criticidade_gut')
      .select('*')
      .eq('tipo_servico', tipoSvc)
      .order('tipo_parametro').order('peso')
    setItens(data ?? [])
  }

  function selecionar(item: Item) {
    setForm({...item}); setModoEdicao(true); setMsg(''); setErro('')
  }

  function novo() {
    setForm({...formInicial, tipo_servico: tipoSvc, tipo_parametro: tipoParam})
    setModoEdicao(false); setMsg(''); setErro('')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.descricao || !form.peso) { setErro('Preencha descrição e peso.'); return }
    setSalvando(true); setMsg(''); setErro('')
    try {
      const payload = { tipo_servico: form.tipo_servico, tipo_parametro: form.tipo_parametro,
        descricao: form.descricao, peso: form.peso, percentual_calculo: form.percentual_calculo, ativo: form.ativo }
      if (modoEdicao && form.id) {
        const { error } = await supabase.from('criticidade_gut').update(payload).eq('id', form.id)
        if (error) { setErro(error.message); return }
        setMsg('Atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('criticidade_gut').insert(payload)
        if (error) { setErro(error.message); return }
        setMsg('Incluído com sucesso!'); novo()
      }
      await carregar()
    } finally { setSalvando(false) }
  }

  const itensFiltrados = itens.filter(i => i.tipo_parametro === tipoParam)
  const pctAtual = itens.find(i => i.tipo_parametro === tipoParam && i.percentual_calculo != null)?.percentual_calculo

  return (
    <div style={{ backgroundColor:'#E8EEF7', minHeight:'100vh', padding:'16px' }}>
      <div style={{ maxWidth:'960px', margin:'0 auto', backgroundColor:'white', borderRadius:'16px',
        boxShadow:'0 4px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>

        <div style={{ backgroundColor:'#1E3A8A', padding:'8px 16px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' as const }}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} style={{ filter:'brightness(0) invert(1)', objectFit:'contain' }} />
          <span style={{ color:'white', fontWeight:700, fontSize:'13px', flex:1, textAlign:'center' }}>
            Criticidade GUT — Pesos e Parâmetros
          </span>
          <button onClick={() => window.location.href='/gestor?aba=configuracoes'}
            style={{ backgroundColor:'transparent', color:'white', border:'2px solid white',
              borderRadius:'9999px', padding:'4px 14px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
            Retornar
          </button>
        </div>
        <div style={{ height:'2px', backgroundColor:'#1E3A8A' }} />

        {/* Filtro tipo de serviço */}
        <div style={{ padding:'10px 16px', backgroundColor:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
          <label style={{ ...labelStyle, marginBottom:'6px' }}>Tipo de Serviço</label>
          <select value={tipoSvc} onChange={e => { setTipoSvc(e.target.value); setForm(f => ({...f, tipo_servico: e.target.value})) }}
            style={{ ...inputStyle, maxWidth:'320px' }}>
            {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display:'flex', minHeight:'460px', flexWrap:'wrap' as const }}>
          {/* Lista por parâmetro */}
          <div style={{ width:'260px', minWidth:'180px', maxWidth:'100%', borderRight:'2px solid #1E3A8A', flexShrink:0 }}>
            <div style={{ display:'flex', flexWrap:'wrap' as const, borderBottom:'2px solid #1E3A8A' }}>
              {TIPOS_PARAM.map(t => (
                <button key={t} onClick={() => { setTipoParam(t); novo() }}
                  style={{ flex:'1 1 auto', padding:'6px 4px', border:'none', cursor:'pointer', fontSize:'10px', fontWeight:700,
                    backgroundColor: tipoParam===t ? '#1E3A8A' : 'white',
                    color: tipoParam===t ? 'white' : '#1E3A8A' }}>
                  {t}
                </button>
              ))}
            </div>
            {pctAtual != null && (
              <div style={{ padding:'6px 12px', backgroundColor:'#EBF1FF', fontSize:'11px', color:'#1E3A8A', fontWeight:700 }}>
                Peso no cálculo GR: {pctAtual}%
              </div>
            )}
            <div style={{ overflowY:'auto', maxHeight:'380px' }}>
              {itensFiltrados.length === 0 && (
                <div style={{ padding:'16px', fontSize:'11px', color:'#9CA3AF', textAlign:'center' }}>
                  Nenhum item cadastrado para este serviço.
                </div>
              )}
              {itensFiltrados.map(item => (
                <div key={item.id} onClick={() => selecionar(item)}
                  style={{ padding:'8px 12px', borderBottom:'1px solid #F1F5F9', cursor:'pointer',
                    backgroundColor: form.id===item.id ? '#EBF1FF' : 'white' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'12px', fontWeight:600, color:'#1E3A8A' }}>{item.descricao}</span>
                    <span style={{ fontSize:'11px', fontWeight:700, color:'white', backgroundColor:'#1E3A8A',
                      padding:'1px 6px', borderRadius:'9999px' }}>{item.peso}</span>
                  </div>
                  {!item.ativo && <div style={{ fontSize:'10px', color:'#DC2626' }}>Inativo</div>}
                </div>
              ))}
              <div style={{ padding:'8px 12px' }}>
                <button onClick={novo}
                  style={{ width:'100%', backgroundColor:'#1E3A8A', color:'white', border:'none',
                    borderRadius:'6px', padding:'6px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
                  + Novo
                </button>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div style={{ flex:1, minWidth:'280px', padding:'20px', backgroundColor:'#F8FAFC' }}>
            <form onSubmit={salvar}>
              <div style={blocoStyle}>
                <div style={blocoHdr}>
                  <span style={{ color:'white', fontWeight:700, fontSize:'12px' }}>
                    {modoEdicao ? `Editar — ${form.tipo_parametro} / ${form.tipo_servico}` : `Novo — ${tipoParam} / ${tipoSvc}`}
                  </span>
                </div>
                <div style={blocoBody}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'12px' }}>
                    <div>
                      <label style={labelStyle}>Tipo de Serviço *</label>
                      <select value={form.tipo_servico}
                        onChange={e => setForm(f => ({...f, tipo_servico: e.target.value}))}
                        style={inputStyle}>
                        {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo de Parâmetro *</label>
                      <select value={form.tipo_parametro}
                        onChange={e => setForm(f => ({...f, tipo_parametro: e.target.value}))}
                        style={inputStyle}>
                        {TIPOS_PARAM.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Peso (1–9) *</label>
                      <input type="number" value={form.peso} min={1} max={9} step={0.5}
                        onChange={e => setForm(f => ({...f, peso: Number(e.target.value)}))}
                        required style={inputStyle} />
                    </div>
                    <div style={{ gridColumn:'span 2' }}>
                      <label style={labelStyle}>Descrição *</label>
                      <input value={form.descricao}
                        onChange={e => setForm(f => ({...f, descricao: e.target.value}))}
                        placeholder="Ex: Moderada" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>% no Cálculo GR <span style={{ fontWeight:400, color:'#6B7280' }}>(1° do tipo)</span></label>
                      <input type="number" value={form.percentual_calculo ?? ''}
                        onChange={e => setForm(f => ({...f, percentual_calculo: e.target.value ? Number(e.target.value) : null}))}
                        placeholder="Ex: 40" min={0} max={100} style={inputStyle} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', paddingTop:'20px' }}>
                      <input type="checkbox" checked={form.ativo}
                        onChange={e => setForm(f => ({...f, ativo: e.target.checked}))}
                        style={{ width:'16px', height:'16px', cursor:'pointer' }} />
                      <label style={{ fontSize:'12px', fontWeight:700, color:'#374151' }}>Ativo</label>
                    </div>
                  </div>

                  {erro && <div style={{ marginTop:'10px', padding:'8px 12px', backgroundColor:'#FEE2E2', color:'#DC2626', borderRadius:'6px', fontSize:'12px' }}>{erro}</div>}
                  {msg  && <div style={{ marginTop:'10px', padding:'8px 12px', backgroundColor:'#D1FAE5', color:'#059669', borderRadius:'6px', fontSize:'12px' }}>{msg}</div>}

                  <div style={{ marginTop:'16px' }}>
                    <button type="submit" disabled={salvando}
                      style={{ backgroundColor:'#1E3A8A', color:'white', border:'none', borderRadius:'9999px',
                        padding:'8px 24px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity:salvando?0.7:1 }}>
                      {salvando ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div style={{ backgroundColor:'#EBF1FF', borderRadius:'8px', padding:'12px', fontSize:'11px', color:'#1E3A8A', lineHeight:1.7 }}>
              <strong>Fórmula GR:</strong> (G×%G + U×%U + A×%A + E×%E) × 20<br/>
              Padrão: Gravidade 40% · Urgência 30% · Abrangência 20% · Exposição 10%<br/>
              Os percentuais são definidos no primeiro registro de cada tipo/serviço.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
