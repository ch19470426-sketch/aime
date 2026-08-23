'use client'
import { useState, useRef, useEffect } from 'react'

interface DatePickerProps {
  value: string          // formato YYYY-MM-DD
  onChange: (v: string) => void
  style?: React.CSSProperties
  min?: string
  max?: string
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S']

function diasNoMes(ano: number, mes: number) { return new Date(ano, mes + 1, 0).getDate() }
function primeiroDia(ano: number, mes: number) { return new Date(ano, mes, 1).getDay() }

export default function DatePicker({ value, onChange, style, min, max }: DatePickerProps) {
  const hoje = new Date()
  const [aberto, setAberto] = useState(false)
  const [viewAno, setViewAno] = useState(() => value ? parseInt(value.slice(0,4)) : hoje.getFullYear())
  const [viewMes, setViewMes] = useState(() => value ? parseInt(value.slice(5,7)) - 1 : hoje.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    if (!aberto) return
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [aberto])

  // Sincronizar view com valor externo
  useEffect(() => {
    if (value) {
      setViewAno(parseInt(value.slice(0,4)))
      setViewMes(parseInt(value.slice(5,7)) - 1)
    }
  }, [value])

  function abrirFechar() {
    setAberto(a => !a)
  }

  function mesAnterior() {
    if (viewMes === 0) { setViewMes(11); setViewAno(a => a - 1) }
    else setViewMes(m => m - 1)
  }
  function mesSeguinte() {
    if (viewMes === 11) { setViewMes(0); setViewAno(a => a + 1) }
    else setViewMes(m => m + 1)
  }

  function selecionar(dia: number) {
    const mm = String(viewMes + 1).padStart(2,'0')
    const dd = String(dia).padStart(2,'0')
    const v = `${viewAno}-${mm}-${dd}`
    if (min && v < min) return
    if (max && v > max) return
    onChange(v)
    setAberto(false)
  }

  // Formatar exibição dd/mm/aaaa
  const exibir = value
    ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`
    : ''

  const totalDias = diasNoMes(viewAno, viewMes)
  const primeiro  = primeiroDia(viewAno, viewMes)
  const celulas   = Array.from({ length: Math.ceil((primeiro + totalDias) / 7) * 7 })

  const C = {
    wrap: { position:'relative' as const, display:'inline-block', width:'100%' },
    input: { ...style, cursor:'pointer', userSelect:'none' as const, display:'flex', alignItems:'center', justifyContent:'space-between' },
    cal: { position:'absolute' as const, zIndex:9999, backgroundColor:'white', border:'2px solid #1E3A8A',
      borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,0.18)', padding:'8px', minWidth:'220px',
      top:'calc(100% + 4px)', left:0 },
    nav: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' },
    navBtn: { background:'none', border:'none', cursor:'pointer', fontSize:'14px', color:'#1E3A8A', fontWeight:700, padding:'2px 6px' },
    mesAno: { fontSize:'12px', fontWeight:700, color:'#1E3A8A' },
    grid: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' },
    diaHead: { textAlign:'center' as const, fontSize:'9px', fontWeight:700, color:'#6B7280', padding:'2px 0' },
    dia: (sel: boolean, hoje: boolean, desab: boolean) => ({
      textAlign:'center' as const, fontSize:'10px', padding:'4px 2px', borderRadius:'4px', cursor: desab ? 'default' : 'pointer',
      backgroundColor: sel ? '#1E3A8A' : hoje ? '#EBF1FF' : 'transparent',
      color: desab ? '#D1D5DB' : sel ? 'white' : hoje ? '#1E3A8A' : '#374151',
      fontWeight: sel || hoje ? 700 : 400,
    }),
  }

  return (
    <div style={C.wrap} ref={ref}>
      <div style={C.input} onClick={abrirFechar}>
        <span style={{ flex:1, fontSize: style?.fontSize ?? '8pt', color: exibir ? '#1a1a2e' : '#9CA3AF' }}>
          {exibir || 'dd/mm/aaaa'}
        </span>
        <span style={{ fontSize:'10px', color:'#1E3A8A', marginLeft:'4px' }}>📅</span>
      </div>

      {aberto && (
        <div style={C.cal}>
          <div style={C.nav}>
            <button style={C.navBtn} onClick={e => { e.stopPropagation(); mesAnterior() }}>‹</button>
            <span style={C.mesAno}>{MESES[viewMes]} {viewAno}</span>
            <button style={C.navBtn} onClick={e => { e.stopPropagation(); mesSeguinte() }}>›</button>
          </div>
          <div style={C.grid}>
            {DIAS_SEMANA.map((d,i) => <div key={i} style={C.diaHead}>{d}</div>)}
            {celulas.map((_, idx) => {
              const dia = idx - primeiro + 1
              if (dia < 1 || dia > totalDias) return <div key={idx} />
              const mm = String(viewMes + 1).padStart(2,'0')
              const dd = String(dia).padStart(2,'0')
              const dateStr = `${viewAno}-${mm}-${dd}`
              const sel  = dateStr === value
              const isHj = dateStr === hoje.toISOString().slice(0,10)
              const desab = (!!min && dateStr < min) || (!!max && dateStr > max)
              return (
                <div key={idx} style={C.dia(sel, isHj, desab)}
                  onClick={e => { e.stopPropagation(); selecionar(dia) }}>
                  {dia}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
