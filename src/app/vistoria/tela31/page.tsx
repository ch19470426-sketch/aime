'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function Inner() {
  const params = useSearchParams()
  const cnpj = params.get('cnpjoucpf') ?? 'não informado'
  const [dados, setDados] = useState<string>('aguardando...')

  function testar() {
    setDados('Funcionou! ' + new Date().toLocaleTimeString())
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#1E3A8A' }}>Teste interação tablet</h1>
      <p>CNPJ: {cnpj}</p>
      <p style={{ fontSize: '20px', fontWeight: 'bold', color: dados === 'aguardando...' ? '#94A3B8' : '#16A34A' }}>
        {dados}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {/* Teste 1: button com onClick */}
        <button 
          onClick={testar}
          style={{ padding: '16px', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', minHeight: '52px' }}>
          1. Button onClick
        </button>

        {/* Teste 2: div clicável */}
        <div 
          onClick={testar}
          role="button"
          style={{ padding: '16px', background: '#0F766E', color: '#fff', borderRadius: '8px', fontSize: '16px', minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          2. Div onClick
        </div>

        {/* Teste 3: input type button */}
        <input 
          type="button"
          value="3. Input button"
          onClick={testar}
          style={{ padding: '16px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', minHeight: '52px' }}
        />
      </div>
    </div>
  )
}

export default function Tela31Page() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>Carregando...</div>}>
      <Inner />
    </Suspense>
  )
}
