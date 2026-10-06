// src/components/LinkSair.tsx
// AIMÊ — Saída das telas que "prendem" o usuário (termo de aceite e escolha de plano do primeiro
// acesso): o dashboard devolve para lá quem ainda não cumpriu a etapa, então sem este link não
// havia como trocar de usuário. Usa a tela /logout, que encerra a sessão, limpa os dados locais
// e volta ao login (mesma saída do "Sair do Aplicativo" do menu).

export default function LinkSair() {
  return (
    <a href="/logout"
      style={{ color: 'white', fontSize: '11px', textDecoration: 'underline', whiteSpace: 'nowrap', opacity: 0.9 }}>
      Trocar usuário
    </a>
  )
}
