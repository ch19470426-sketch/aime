'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
  minYear?: number
  maxYear?: number
}

const MESES_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DS = ['D','S','T','Q','Q','S','S']

function diasNoMes(a: number, m: number) { return new Date(a, m+1, 0).getDate() }
function primeiroDia(a: number, m: number) { return new Date(a, m, 1).getDay() }

export default function DatePickerYear({ value, onChange, style, minYear = 1950, maxYear = 2030 }: Props) {
  const hoje = new Date().toISOString().slice(0,10)
  const [aberto, setAberto] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 })
  const [viewAno, setViewAno] = useState(() => value ? +value.slice(0,4) : new Date().getFullYear())
  const [viewMes, setViewMes] = useState(() => value ? +value.slice(5,7)-1 : new Date().getMonth())
  const inputRef = useRef<HTMLDivElement>(null)
  const calRef = useRef<HTMLDivElement>(null)
  const anosRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (value) { setViewAno(+value.slice(0,4)); setViewMes(+value.slice(5,7)-1) }
  }, [value])
  useEffect(() => {
    if (!aberto) return
    const fn = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) && !calRef.current?.contains(e.target as Node))
        setAberto(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [aberto])

  // Scroll da barra de anos para o ano selecionado
  useEffect(() => {
    if (aberto && anosRef.current) {
      const el = anosRef.current.querySelector(`[data-ano="${viewAno}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [aberto, viewAno])

  const abrir = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 260) })
    setAberto(a => !a)
  }, [])

  function navMes(d: number) {
    let m = viewMes+d, a = viewAno
    if (m < 0)  { m=11; a-- }
    if (m > 11) { m=0;  a++ }
    setViewMes(m); setViewAno(a)
  }

  function selDia(dia: number) {
    const mm = String(viewMes+1).padStart(2,'0')
    const dd = String(dia).padStart(2,'0')
    onChange(`${viewAno}-${mm}-${dd}`)
    setAberto(false)
  }

  const exibir = value ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}` : ''
  const total = diasNoMes(viewAno, viewMes)
  const prim = primeiroDia(viewAno, viewMes)
  const cells = Array.from({ length: Math.ceil((prim+total)/7)*7 })
  const anos = Array.from({ length: maxYear - minYear + 1 }, (_,i) => minYear + i)

  const Cal = (
    <div ref={calRef} onMouseDown={e => e.stopPropagation()}
      style={{ position:'absolute', top:pos.top, left:pos.left, width: pos.width,
        zIndex:99999, backgroundColor:'white', border:'2px solid #1E3A8A',
        borderRadius:'8px', boxShadow:'0 6px 24px rgba(0,0,0,0.22)',
        display:'flex', flexDirection:'column', boxSizing:'border-box' as const }}>

      {/* Header: nav mês + título */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 10px 6px', borderBottom:'1px solid #E2E8F0' }}>
        <button onMouseDown={e=>{e.preventDefault();navMes(-1)}}
          style={{ background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'#1E3A8A',fontWeight:700,lineHeight:1,padding:'0 2px' }}>‹</button>
        <span style={{ fontSize:'12px', fontWeight:700, color:'#1E3A8A' }}>
          {MESES_LONG[viewMes]} {viewAno}
        </span>
        <button onMouseDown={e=>{e.preventDefault();navMes(1)}}
          style={{ background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'#1E3A8A',fontWeight:700,lineHeight:1,padding:'0 2px' }}>›</button>
      </div>

      {/* Corpo: barra lateral de anos + calendário */}
      <div style={{ display:'flex', flex:1, minHeight:0 }}>

        {/* Barra lateral — anos */}
        <div ref={anosRef}
          style={{ width:'48px', overflowY:'auto', borderRight:'1px solid #E2E8F0',
            maxHeight:'224px', flexShrink:0, scrollbarWidth:'thin' as any }}>
          {anos.map(a => (
            <div key={a} data-ano={a}
              onMouseDown={e=>{e.preventDefault(); setViewAno(a)}}
              style={{ textAlign:'center', padding:'5px 2px', fontSize:'10px', fontWeight:700,
                cursor:'pointer', lineHeight:1.2,
                backgroundColor: a===viewAno ? '#1E3A8A' : 'transparent',
                color: a===viewAno ? 'white' : '#374151' }}>
              {a}
            </div>
          ))}
        </div>

        {/* Calendário */}
        <div style={{ flex:1, padding:'6px 8px' }}>
          {/* Meses rápidos */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'2px', marginBottom:'6px' }}>
            {MESES_SHORT.map((m,i) => (
              <div key={i} onMouseDown={e=>{e.preventDefault(); setViewMes(i)}}
                style={{ textAlign:'center', padding:'3px 1px', borderRadius:'3px', cursor:'pointer',
                  fontSize:'9px', fontWeight:700,
                  backgroundColor: i===viewMes ? '#EBF1FF' : 'transparent',
                  color: i===viewMes ? '#1E3A8A' : '#6B7280',
                  border: i===viewMes ? '1px solid #1E3A8A' : '1px solid transparent' }}>
                {m}
              </div>
            ))}
          </div>
          {/* Dias */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'1px' }}>
            {DS.map((d,i) => (
              <div key={i} style={{ textAlign:'center',fontSize:'9px',fontWeight:700,color:'#6B7280',paddingBottom:'3px' }}>{d}</div>
            ))}
            {cells.map((_,idx) => {
              const dia = idx-prim+1
              if (dia<1||dia>total) return <div key={idx} />
              const mm = String(viewMes+1).padStart(2,'0')
              const dd = String(dia).padStart(2,'0')
              const ds = `${viewAno}-${mm}-${dd}`
              const sel = ds===value, isHj = ds===hoje
              return (
                <div key={idx} onMouseDown={e=>{e.preventDefault();selDia(dia)}}
                  style={{ textAlign:'center', fontSize:'10px', padding:'4px 1px', borderRadius:'3px',
                    cursor:'pointer',
                    backgroundColor: sel?'#1E3A8A':isHj?'#EBF1FF':'transparent',
                    color: sel?'white':isHj?'#1E3A8A':'#374151',
                    fontWeight: sel||isHj?700:400 }}>
                  {dia}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div ref={inputRef} onClick={abrir}
        style={{ ...style, cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'space-between', userSelect:'none' as const }}>
        <span style={{ flex:1, fontSize:style?.fontSize??'8pt', color:exibir?(style?.color??'#1a1a2e'):'#9CA3AF' }}>
          {exibir||'dd/mm/aaaa'}
        </span>
        <span style={{ fontSize:'11px', color:'#1E3A8A', marginLeft:'4px' }}>📅</span>
      </div>
      {mounted && aberto && createPortal(Cal, document.body)}
    </>
  )
}
