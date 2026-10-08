'use client'
import { useEffect } from 'react'
import { encerrarSessao } from '@/lib/encerrarSessao'

export default function LogoutPage() {
  useEffect(() => {
    // Sai pelo servidor e apaga à força a sessão do navegador, mesmo que a saída pelo servidor falhe.
    encerrarSessao().then(() => { window.location.replace('/') })
  }, [])

  return (
    <div style={{ backgroundColor:'#1E3A8A', minHeight:'100vh', display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'white', fontSize:'14px' }}>Encerrando sessão...</p>
    </div>
  )
}
