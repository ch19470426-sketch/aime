'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface DatePickerProps {
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
  min?: string
  max?: string
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DS = ['D','S','T','Q','Q','S','S']

function diasNoMes(a: number, m: number) { return new Date(a, m+1, 0).getDate() }
function primeiroDia(a: number, m: number) { return new Date(a, m, 1).getDay() }

export default function DatePicker({ value, onChange, style, min, max }: DatePickerProps) {
  const hoje = new Date().toISOString().slice(0,10)
  const [aberto, setAberto]   = useState(false)
  const [mounted, setMounted] = useState(false)  // ← evita SSR
  const [pos, setPos]         = useState({ top:0, left:0, width:220 })
  const [viewAno, setViewAno] = useState(() => value ? +value.slice(0,4) : new Date().getFullYear())
  const [viewMes, setViewMes] = useState(() => value ? +value.slice(5,7)-1 : new Date().getMonth())
  const inputRef = useRef<HTMLDivElement>(null)
  const calRef   = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (value) { setViewAno(+value.slice(0,4)); setViewMes(+value.slice(5,7)-1) }
  }, [value])

  useEffect(() => {
    if (!aberto) return
    const fn = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) &&
          !calRef.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [aberto])

  const abrir = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 220) })
    setAberto(a => !a)
  }, [])

  function navMes(d: number) {
    let m = viewMes + d, a = viewAno
    if (m < 0)  { m = 11; a-- }
    if (m > 11) { m = 0;  a++ }
    setViewMes(m); setViewAno(a)
  }

  function selecionar(dia: number) {
    const mm = String(viewMes+1).padStart(2,'0')
    const dd = String(dia).padStart(2,'0')
    const v  = `${viewAno}-${mm}-${dd}`
    if (min && v < min) return
    if (max && v > max) return
    onChange(v); setAberto(false)
  }

  const exibir = value ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}` : ''
  const total  = diasNoMes(viewAno, viewMes)
  const prim   = primeiroDia(viewAno, viewMes)
  const cells  = Array.from({ length: Math.ceil((prim+total)/7)*7 })

  const Calendario = (
    <div ref={calRef} onMouseDown={e => e.stopPropagation()}
      style={{ position:'absolute', top:pos.top, left:pos.left, minWidth:pos.width,
        zIndex:99999, backgroundColor:'white', border:'2px solid #1E3A8A',
        borderRadius:'8px', boxShadow:'0 6px 24px rgba(0,0,0,0.22)', padding:'10px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
        <button onMouseDown={e=>{e.preventDefault(); navMes(-1)}}
          style={{ background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'#1E3A8A',fontWeight:700,padding:'0 6px' }}>‹</button>
        <span style={{ fontSize:'12px', fontWeight:700, color:'#1E3A8A' }}>{MESES[viewMes]} {viewAno}</span>
        <button onMouseDown={e=>{e.preventDefault(); navMes(1)}}
          style={{ background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'#1E3A8A',fontWeight:700,padding:'0 6px' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' }}>
        {DS.map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'9px', fontWeight:700, color:'#6B7280', paddingBottom:'4px' }}>{d}</div>
        ))}
        {cells.map((_,idx) => {
          const dia = idx - prim + 1
          if (dia < 1 || dia > total) return <div key={idx} />
          const mm = String(viewMes+1).padStart(2,'0')
          const dd = String(dia).padStart(2,'0')
          const ds = `${viewAno}-${mm}-${dd}`
          const sel   = ds === value
          const isHj  = ds === hoje
          const desab = (!!min && ds < min) || (!!max && ds > max)
          return (
            <div key={idx} onMouseDown={e => { e.preventDefault(); if (!desab) selecionar(dia) }}
              style={{ textAlign:'center', fontSize:'11px', padding:'5px 2px', borderRadius:'4px',
                cursor: desab ? 'default' : 'pointer',
                backgroundColor: sel ? '#1E3A8A' : isHj ? '#EBF1FF' : 'transparent',
                color: desab ? '#D1D5DB' : sel ? 'white' : isHj ? '#1E3A8A' : '#374151',
                fontWeight: sel||isHj ? 700 : 400 }}>
              {dia}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <div ref={inputRef} onClick={abrir}
        style={{ ...style, cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'space-between', userSelect:'none' as const }}>
        <span style={{ flex:1, fontSize: style?.fontSize ?? '8pt',
          color: exibir ? (style?.color ?? '#1a1a2e') : '#9CA3AF' }}>
          {exibir || 'dd/mm/aaaa'}
        </span>
        <span style={{ fontSize:'11px', color:'#1E3A8A', marginLeft:'4px' }}>📅</span>
      </div>
      {mounted && aberto && createPortal(Calendario, document.body)}
    </>
  )
}
