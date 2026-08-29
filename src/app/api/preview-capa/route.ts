// src/app/api/preview-capa/route.ts
// Preview isolado da capa — acesse /api/preview-capa?titulo=...
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { gerarCapa } from '@/lib/gerarCapa'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Preview Capa</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { background: #888; display: flex; justify-content: center; padding: 20px }
  /* Simula página A4 em tela */
  .pagina {
    width: 210mm;
    height: 297mm;
    background: #fff;
    box-shadow: 0 4px 20px rgba(0,0,0,.4);
    overflow: hidden;
    position: relative;
  }
  .pg-capa { page-break-after: always; }
</style>
</head>
<body>
<div class="pagina">
${gerarCapa({
  titulo:           p.get('titulo')           ?? 'Laudo de Inspeção Predial',
  subtitulo:        p.get('subtitulo')        ?? 'LAUDO TÉCNICO',
  razaoSocial:      p.get('razao_social')     ?? 'Condomínio Exemplo',
  logradouro:       p.get('logradouro')       ?? 'Rua das Flores, 123',
  cidade:           p.get('cidade')           ?? 'Vitória',
  uf:               p.get('uf')              ?? 'ES',
  logo:             p.get('logo')             ?? '',
  cabecalhoTexto:   p.get('cabecalho')        ?? 'Eng. Carlos Silva Inspeções',
  nomeInspetor:     p.get('nome_inspetor')    ?? 'Carlos Silva',
  tituloInspetor:   p.get('titulo_inspetor')  ?? 'Eng. Civil',
  registroInspetor: p.get('registro')         ?? 'CREA RS12345/D',
  especializacao:   p.get('especializacao')   ?? '',
  data:             p.get('data')             ?? new Date().toLocaleDateString('pt-BR'),
})}
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
