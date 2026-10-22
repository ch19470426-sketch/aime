// src/lib/gtm.ts
// AIMÊ — Google Tag Manager (22/10/2026, pedido do marketing). O contêiner vem de NEXT_PUBLIC_GTM_ID (o mesmo do site
// aime.eng.br). Variável vazia (desenvolvimento/homologação) = NADA do rastreamento é carregado: nem o GTM, nem o
// consentimento, nem o aviso de cookies. O valor só é aceito no formato GTM-XXXXXXX, para nunca virar código injetado.
// A variável é NEXT_PUBLIC: entra no código no momento do build, então precisa estar na Vercel ANTES do deploy.
const BRUTO = (process.env.NEXT_PUBLIC_GTM_ID ?? '').trim()
export const GTM_ID: string = /^GTM-[A-Z0-9]{4,12}$/.test(BRUTO) ? BRUTO : ''

// Consentimento padrão do Consent Mode: tudo negado até haver aceite. Lê a escolha do visitante no cookie
// aime_consent_v1 (criado pelo site no domínio .aime.eng.br); sem cookie, tenta o localStorage.
export const CONSENT_DEFAULT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
(function(){var c=null;var m=document.cookie.match(/(?:^|; )aime_consent_v1=([^;]*)/);if(m){c=m[1];}else{try{c=localStorage.getItem('aime_consent_v1');}catch(e){}}
var g=(c==='granted')?'granted':'denied';
gtag('consent','default',{analytics_storage:g,ad_storage:g,ad_user_data:g,ad_personalization:g,functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
gtag('set','ads_data_redaction',true);})();`

export function gtmScript(id: string): string {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`
}

export function gtmNoscript(id: string): string {
  return `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
}

export const COOKIE_CONSENT_SRC = 'https://aime.eng.br/assets/js/cookie-consent.js'
