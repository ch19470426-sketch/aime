'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useVistoria31 } from '@/hooks/useVistoria31'

function Inner() {
  const params = useSearchParams()
  const cnpj = params.get('cnpjoucpf') ?? ''
  const [resultado, setResultado] = useState('aguardando...')

  // Testa apenas importar o hook sem usar nada dele
  useVistoria31('12345678900', 'INS-001', cnpj, '31')

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#1E3A8A' }}>Teste hook</h1>
      <p style={{ fontSize: '18px' }}>{resultado}</p>
      <button
        onClick={() => setResultado('Botão funcionou! ' + new Date().toLocaleTimeString())}
        style={{ padding: '16px 24px', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', marginTop: '16px', minHeight: '52px' }}>
        Testar com hook
      </button>
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
