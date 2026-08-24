'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  value: string        // YYYY-MM-DD
  onChange: (v: string) => void
  style?: React.CSSProperties
  minYear?: number
  maxYear?: number
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DS    = ['D','S','T','Q','Q','S','S']

function diasNoMes(a: number, m: number) { return new Date(a, m+1, 0).getDate() }
function primeiroDia(a: number, m: number) { return new Date(a, m, 1).getDay() }

export default function DatePickerYear({ value, onChange, style, minYear = 1950, maxYear = 2099 }: Props) {
  const hoje     = new Date().toISOString().slice(0,10)
  const [aberto, setAberto]     = useState(false)
  const [mounted, setMounted]   = useState(false)
  const [modo, setModo]         = useState<'cal'|'mes'|'ano'>('cal')
  const [pos, setPos]           = useState({ top:0, left:0, width:220 })
  const [viewAno, setViewAno]   = useState(() => value ? +value.slice(0,4) : new Date().getFullYear())
  const [viewMes, setViewMes]   = useState(() => value ? +value.slice(5,7)-1 : new Date().getMonth())
  const inputRef = useRef<HTMLDivElement>(null)
  const calRef   = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (value) { setViewAno(+value.slice(0,4)); setViewMes(+value.slice(5,7)-1) } }, [value])
  useEffect(() => {
    if (!aberto) return
    const fn = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) && !calRef.current?.contains(e.target as Node))
        setAberto(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [aberto])

  const abrir = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 240) })
    setModo('cal'); setAberto(a => !a)
  }, [])

  function navMes(d: number) {
    let m = viewMes+d, a = viewAno
    if (m < 0)  { m=11; a-- }
    if (m > 11) { m=0;  a++ }
    setViewMes(m); setViewAno(a)
  }

  function selDia(dia: number) {
    const v = `${viewAno}-${String(viewMes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    onChange(v); setAberto(false)
  }

  function selMes(m: number) { setViewMes(m); setModo('cal') }
  function selAno(a: number) { setViewAno(a); setModo('mes') }

  const exibir = value ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}` : ''
  const total  = diasNoMes(viewAno, viewMes)
  const prim   = primeiroDia(viewAno, viewMes)
  const cells  = Array.from({ length: Math.ceil((prim+total)/7)*7 })

  // Range de anos para seleção
  const anos = Array.from({ length: maxYear - minYear + 1 }, (_,i) => minYear + i).reverse()

  const CAL_W = { minWidth: pos.width, maxWidth: 280 }

  const Cal = (
    <div ref={calRef} onMouseDown={e => e.stopPropagation()}
      style={{ position:'absolute', top:pos.top, left:pos.left, ...CAL_W,
        zIndex:99999, backgroundColor:'white', border:'2px solid #1E3A8A',
        borderRadius:'8px', boxShadow:'0 6px 24px rgba(0,0,0,0.22)', padding:'10px', boxSizing:'border-box' as const }}>

      {/* Navegação */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', gap:'4px' }}>
        {modo==='cal' && <button onMouseDown={e=>{e.preventDefault();navMes(-1)}}
          style={{ background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'#1E3A8A',fontWeight:700,padding:'0 4px' }}>‹</button>}
        {modo!=='cal' && <div style={{ width:'24px' }} />}

        <div style={{ display:'flex', gap:'4px', flex:1, justifyContent:'center' }}>
          <button onMouseDown={e=>{e.preventDefault(); setModo(modo==='mes'?'cal':'mes')}}
            style={{ background:modo==='mes'?'#EBF1FF':'none',border:'1px solid #1E3A8A',borderRadius:'4px',cursor:'pointer',
              fontSize:'11px',color:'#1E3A8A',fontWeight:700,padding:'2px 8px' }}>
            {MESES[viewMes]}
          </button>
          <button onMouseDown={e=>{e.preventDefault(); setModo(modo==='ano'?'cal':'ano')}}
            style={{ background:modo==='ano'?'#EBF1FF':'none',border:'1px solid #1E3A8A',borderRadius:'4px',cursor:'pointer',
              fontSize:'11px',color:'#1E3A8A',fontWeight:700,padding:'2px 8px' }}>
            {viewAno}
          </button>
        </div>

        {modo==='cal' && <button onMouseDown={e=>{e.preventDefault();navMes(1)}}
          style={{ background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'#1E3A8A',fontWeight:700,padding:'0 4px' }}>›</button>}
        {modo!=='cal' && <button onMouseDown={e=>{e.preventDefault();setModo('cal')}}
          style={{ background:'none',border:'1px solid #1E3A8A',borderRadius:'4px',cursor:'pointer',fontSize:'10px',color:'#1E3A8A',padding:'2px 6px' }}>✕</button>}
      </div>

      {/* Seletor de mês */}
      {modo==='mes' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'4px' }}>
          {MESES.map((m,i) => (
            <div key={i} onMouseDown={e=>{e.preventDefault();selMes(i)}}
              style={{ textAlign:'center',padding:'6px 2px',borderRadius:'4px',cursor:'pointer',fontSize:'11px',fontWeight:700,
                backgroundColor:i===viewMes?'#1E3A8A':'#F8FAFC', color:i===viewMes?'white':'#374151' }}>
              {m}
            </div>
          ))}
        </div>
      )}

      {/* Seletor de ano */}
      {modo==='ano' && (
        <div style={{ maxHeight:'200px', overflowY:'auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'3px' }}>
          {anos.map(a => (
            <div key={a} onMouseDown={e=>{e.preventDefault();selAno(a)}}
              style={{ textAlign:'center',padding:'5px 2px',borderRadius:'4px',cursor:'pointer',fontSize:'11px',fontWeight:700,
                backgroundColor:a===viewAno?'#1E3A8A':'#F8FAFC', color:a===viewAno?'white':'#374151' }}>
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Calendário */}
      {modo==='cal' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' }}>
          {DS.map((d,i) => <div key={i} style={{ textAlign:'center',fontSize:'9px',fontWeight:700,color:'#6B7280',paddingBottom:'4px' }}>{d}</div>)}
          {cells.map((_,idx) => {
            const dia = idx-prim+1
            if (dia<1||dia>total) return <div key={idx} />
            const mm = String(viewMes+1).padStart(2,'0')
            const dd = String(dia).padStart(2,'0')
            const ds = `${viewAno}-${mm}-${dd}`
            const sel = ds===value, isHj = ds===hoje
            return (
              <div key={idx} onMouseDown={e=>{e.preventDefault();selDia(dia)}}
                style={{ textAlign:'center',fontSize:'11px',padding:'5px 2px',borderRadius:'4px',cursor:'pointer',
                  backgroundColor:sel?'#1E3A8A':isHj?'#EBF1FF':'transparent',
                  color:sel?'white':isHj?'#1E3A8A':'#374151', fontWeight:sel||isHj?700:400 }}>
                {dia}
              </div>
            )
          })}
        </div>
      )}
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
