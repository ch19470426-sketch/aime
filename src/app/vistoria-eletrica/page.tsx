"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useRouter } from 'next/navigation'
import { useParametros, guardarCivil, guardarEstabelecimento } from '@/lib/identidade'
import React from "react"
import Image from "next/image"
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'
import { tokenDaSessao, novaSessaoToken } from '@/lib/sessaoVistoria'
import { PERFIS_APOIO, sistemaFixoDoPerfil, type PerfilApoio } from '@/lib/profissionaisDeApoio'

const S: Record<string, React.CSSProperties> = {
  body:       { background:'#E8EEF7', display:'flex', justifyContent:'center', padding:'24px', fontFamily:'Arial, Helvetica, sans-serif', minHeight:'100vh' },
  page:       { width:'210mm', maxWidth:'100%', background:'#ffffff', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,.15)', overflow:'hidden', height:'fit-content' },
  header:     { background:'#1E3A8A', padding:'8px 16px', display:'flex', alignItems:'center', gap:'12px' },
  divider:    { height:'2px', background:'#1E3A8A' },
  formBody:   { padding:'10px 14px', display:'flex', flexDirection:'column', gap:'8px' },
  block:      { border:'1px solid #c3d4f0', borderRadius:'6px', overflow:'hidden' },
  blockTitle: { background:'#1E3A8A', color:'#ffffff', fontSize:'11px', fontWeight:700, padding:'5px 10px' },
  blockBody:  { padding:'8px 10px', display:'flex', flexDirection:'column', gap:'6px' },
  field:      { display:'flex', flexDirection:'column', gap:'2px' },
  fieldLabel: { fontSize:'10px', fontWeight:600, color:'#4a6480' },
  input:      { width:'100%', border:'1px solid #c3d4f0', borderRadius:'4px', padding:'4px 6px', fontSize:'13px', color:'#1a1a2e', fontFamily:'inherit', background:'#ffffff', boxSizing:'border-box' },
  footer:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'4px', padding:'10px 14px' },
  btn:        { padding:'8px 0', fontSize:'13px', fontWeight:700, borderRadius:'50px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', fontFamily:'inherit', border:'none' },
  btnSec:     { background:'#ffffff', border:'2px solid #1E3A8A', color:'#1E3A8A' },
  btnPri:     { background:'#1E3A8A', border:'2px solid #1E3A8A', color:'#ffffff' },
  erro:       { color:'#E24B4A', fontSize:'7pt', marginTop:'2px' },
  ok:         { color:'#16A34A', fontSize:'7pt', marginTop:'2px', fontWeight:600 },
}

function VistoriaEletricaInner() {
  const params        = useParametros()
  const router        = useRouter()
  const cpfEletrico   = params.get('cpf_inspetor')   ?? ''
  const chaveEletrico = params.get('chave_inspetor') ?? ''
  const sessaoToken    = tokenDaSessao(params.get('sessao'))

  const [cnpj,      setCnpj]      = useState('')
  const [cpfCivil,  setCpfCivil]  = useState('')
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')
  const [credencial,setCredencial]= useState<any>(null)
  const { bannerProps, solicita, fechar } = useBanner()

  // Especialidade do profissional (Eng Elétrico ou Eng Mecânico): vem do SERVIDOR (título profissional do cadastro), não da URL. Os botões
  // esperam a resposta; se ela falhar, a tela segue como elétrica (o comportamento de sempre).
  const [perfil, setPerfil] = useState<PerfilApoio>(PERFIS_APOIO['Eng Elétrico'])
  const [perfilPronto, setPerfilPronto] = useState(false)
  useEffect(() => {
    if (!cpfEletrico) { setPerfilPronto(true); return }
    fetch(`/api/perfil-apoio?cpf_inspetor=${encodeURIComponent(cpfEletrico)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.perfil) setPerfil(j.perfil) })
      .catch(() => { /* sem resposta: segue como elétrico */ })
      .finally(() => setPerfilPronto(true))
  }, [cpfEletrico])
  const sistemaFixoUrl = encodeURIComponent(sistemaFixoDoPerfil(perfil))

  function fmtCNPJ(v: string) {
    const d = v.replace(/\D/g,'').slice(0,14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
             .replace(/(\d{2})(\d{3})(\d{3})(\d{4})/,'$1.$2.$3/$4')
             .replace(/(\d{2})(\d{3})(\d{3})/,'$1.$2.$3')
             .replace(/(\d{2})(\d{3})/,'$1.$2')
  }
  function fmtCPF(v: string) {
    const d = v.replace(/\D/g,'').slice(0,11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
             .replace(/(\d{3})(\d{3})(\d{3})/,'$1.$2.$3')
             .replace(/(\d{3})(\d{3})/,'$1.$2')
  }

  async function credenciar() {
    setErro('')
    const cnpjLimpo = cnpj.replace(/\D/g,'')
    const cpfLimpo  = cpfCivil.replace(/\D/g,'')
    if (cnpjLimpo.length < 14) { setErro('CNPJ inválido'); return }
    if (cpfLimpo.length < 11)  { setErro('CPF inválido'); return }
    setSalvando(true)
    try {
      // ART nao e mais anexada aqui — passou a ser inserida direto no laudo
      // 42 pelo civil/arquiteto. So o vinculo (CNPJ + CPF do civil) e criado.
      const res  = await fetch('/api/upload-art-eletrico', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          cpfEletrico, cnpjoucpf: cnpjLimpo,
          cpfInspetor: cpfLimpo, tipoServico: '32 Vistoria inspeção',
        })
      })
      const data = await res.json()
      if (!res.ok || data.erro) throw new Error(data.erro || 'Erro no upload')

      // Saldo minimo para INICIAR a vistoria — quem deve ter credito
      // suficiente e o ELETRICISTA, nao o inspetor civil (decisao de
      // Celso, 01/10/2026). Mesmo padrao fail-open das demais checagens.
      try {
        const resSaldo = await fetch(`/api/creditos/verificar-servico?cpf_inspetor=${cpfEletrico}&codigo_servico=39`)
        if (resSaldo.ok) {
          const verificacao = await resSaldo.json()
          if (verificacao.liberado === false) {
            setSalvando(false)
            solicita('Créditos insuficientes',
              `Créditos insuficientes para iniciar esta vistoria. São necessários ${verificacao.necessario} CR (faltam ${verificacao.faltam ?? '—'}).`,
              [
                { label: 'Comprar Créditos', acao: () => { fechar(); window.location.href = `/meu-plano` }, estilo: 'primario' },
                { label: 'Cancelar', acao: () => fechar(), estilo: 'secundario' },
              ]
            )
            return
          }
        }
      } catch { /* falha na verificação — libera normalmente */ }

      // Vai direto para a vistoria — o comando já foi dado ao clicar em
      // "Vistoriar", não precisa de uma tela intermediária com outro botão.
      guardarCivil(cpfLimpo)   // o CPF do civil fica só na aba, não na URL
      router.push(
        (guardarEstabelecimento(cnpjLimpo), `/vistoria/tela32?tipo_servico=32&sistema_fixo=${sistemaFixoUrl}&apoio=1&sobre_civil=1&sessao=${sessaoToken}`)
      )
    } catch(e: any) {
      setErro(e.message ?? 'Erro inesperado')
    } finally {
      setSalvando(false)
    }
  }

  async function iniciarVistoriaComCredencial() {
    try {
      const resSaldo = await fetch(`/api/creditos/verificar-servico?cpf_inspetor=${cpfEletrico}&codigo_servico=39`)
      if (resSaldo.ok) {
        const verificacao = await resSaldo.json()
        if (verificacao.liberado === false) {
          solicita('Créditos insuficientes',
            `Créditos insuficientes para iniciar esta vistoria. São necessários ${verificacao.necessario} CR (faltam ${verificacao.faltam ?? '—'}).`,
            [
              { label: 'Comprar Créditos', acao: () => { fechar(); window.location.href = `/meu-plano` }, estilo: 'primario' },
              { label: 'Cancelar', acao: () => fechar(), estilo: 'secundario' },
            ]
          )
          return
        }
      }
    } catch { /* falha na verificação — libera normalmente */ }
    guardarCivil(credencial.cpfCivil)   // o CPF do civil fica só na aba, não na URL
    router.push(
      (guardarEstabelecimento(credencial.cnpj), `/vistoria/tela32?tipo_servico=32&sistema_fixo=${sistemaFixoUrl}&apoio=1&sobre_civil=1&sessao=${sessaoToken}`)
    )
  }

  return (
    <div style={S.body}>
      <Banner {...bannerProps} />
      <div style={S.page}>
        {/* Cabeçalho */}
        <div style={{ ...S.header, alignItems:'center', justifyContent:'space-between' }}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={36}
            style={{ filter:'brightness(0) invert(1)', objectFit:'contain', flexShrink:0 }} />
          <div style={{ flex:1, textAlign:'center', fontSize:'16px', color:'#fff', fontWeight:700 }}>39 — Vistoria Inspeção {perfil.rotulo}</div>
          <div style={{ width:80 }}></div>
        </div>
        <div style={S.divider} />

        {!credencial ? (
          <>
            <div style={S.formBody}>
              <div style={S.block}>
                <div style={S.blockTitle}>Credenciamento</div>
                <div style={S.blockBody}>
                  <p style={{ fontSize:'12px', color:'#4a6480', margin:0 }}>
                    Informe o CNPJ do estabelecimento e o CPF do inspetor predial que realizou a vistoria de inspeção.
                  </p>

                  <div style={S.field}>
                    <label style={S.fieldLabel}>CNPJ DO ESTABELECIMENTO *</label>
                    <input style={S.input} value={cnpj}
                      onChange={e => setCnpj(fmtCNPJ(e.target.value))}
                      placeholder="00.000.000/0000-00" inputMode="numeric" />
                  </div>

                  <div style={S.field}>
                    <label style={S.fieldLabel}>CPF DO INSPETOR PREDIAL (CIVIL/ARQUITETO) *</label>
                    <input style={S.input} value={cpfCivil}
                      onChange={e => setCpfCivil(fmtCPF(e.target.value))}
                      placeholder="000.000.000-00" inputMode="numeric" />
                  </div>

                  {erro && <span style={S.erro}>{erro}</span>}
                </div>
              </div>
            </div>

            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }}
                onClick={() => router.push(`/dashboard`)}>
                Voltar
              </button>
              <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }}
                onClick={credenciar} disabled={salvando || !perfilPronto}>
                {salvando ? 'Registrando...' : 'Vistoriar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={S.formBody}>
              <div style={S.block}>
                <div style={S.blockTitle}>Credencial Registrada</div>
                <div style={S.blockBody}>
                  <span style={S.ok}>✓ ART registrada — acesso liberado {perfil.ao}</span>
                  <p style={{ fontSize:'12px', color:'#4a6480', margin:0 }}>
                    Clique em <b>Iniciar Vistoria</b> para registrar as não conformidades {perfil.de}.
                  </p>
                </div>
              </div>
            </div>
            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }}
                onClick={() => router.push(`/dashboard`)}>
                Dashboard
              </button>
              <button style={{ ...S.btn, ...S.btnPri }}
                onClick={iniciarVistoriaComCredencial} disabled={!perfilPronto}>
                Iniciar Vistoria
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VistoriaEletrica() {
  return (
    <Suspense fallback={<div style={{ backgroundColor:'#E8EEF7', minHeight:'100vh' }} />}>
      <VistoriaEletricaInner />
    </Suspense>
  )
}
