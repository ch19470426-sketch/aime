'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function Inner() {
  const params = useSearchParams()
  const cnpj = params.get('cnpjoucpf') ?? 'não informado'
  const [dados, setDados] = useState<string>('aguardando...')

  function testar() {
    setDados('Botão funcionou! CNPJ: ' + cnpj)
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#1E3A8A' }}>Teste botão</h1>
      <p>Resultado: {dados}</p>
      <button 
        onClick={testar}
        onTouchEnd={(e) => { e.preventDefault(); testar() }}
        style={{ padding: '16px 24px', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', marginTop: '10px', minHeight: '52px', touchAction: 'manipulation' }}>
        Testar botão
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
