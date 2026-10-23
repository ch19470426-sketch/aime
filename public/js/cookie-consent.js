/* Cópia do aviso de cookies do site aime.eng.br. Se o texto ou a lógica mudarem no site, atualizar aqui também. */
/* AIMÊ - aviso de cookies + Google Consent Mode v2 */
(function(){
  var KEY='aime_consent_v1';
  function get(){var m=document.cookie.match(/(?:^|; )aime_consent_v1=([^;]*)/);if(m)return m[1];try{return localStorage.getItem(KEY);}catch(e){return null;}}
  function put(v){var h=location.hostname,dom=/(^|\.)aime\.eng\.br$/.test(h)?'; domain=.aime.eng.br':'';document.cookie=KEY+'='+v+dom+'; path=/; max-age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');try{localStorage.setItem(KEY,v);}catch(e){}}
  window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments);}
  function apply(v){
    var g=(v==='granted')?'granted':'denied';
    gtag('consent','update',{analytics_storage:g,ad_storage:g,ad_user_data:g,ad_personalization:g});
    window.dataLayer.push({event:'consent_update',consent_choice:v});
  }
  var css='#aime-ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:760px;margin:0 auto;background:#fff;color:#24344A;border:1px solid #D5DEE9;border-radius:8px;box-shadow:0 10px 30px rgba(7,31,71,.18);padding:18px 20px;font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:14px;line-height:1.5;display:flex;gap:16px;align-items:center;flex-wrap:wrap}'
  +'#aime-ck p{margin:0;flex:1 1 320px}'
  +'#aime-ck strong{display:block;color:#0D1A2D;font-size:15px;margin-bottom:2px}'
  +'#aime-ck a{color:#0B4DA2;text-decoration:underline}'
  +'#aime-ck .ck-b{display:flex;gap:8px;flex-wrap:wrap}'
  +'#aime-ck button{font:600 14px "IBM Plex Sans",system-ui,sans-serif;border-radius:6px;padding:10px 18px;cursor:pointer;border:1px solid #0A2A5E}'
  +'#aime-ck .ck-ok{background:#0A2A5E;color:#fff}'
  +'#aime-ck .ck-ok:hover{background:#071F47}'
  +'#aime-ck .ck-no{background:#fff;color:#0A2A5E}'
  +'#aime-ck .ck-no:hover{background:#EEF3FA}'
  +'#aime-ck button:focus-visible{outline:2px solid #1E90EC;outline-offset:2px}'
  +'@media (max-width:560px){#aime-ck .ck-b{width:100%}#aime-ck button{flex:1}}';
  function show(){
    if(document.getElementById('aime-ck'))return;
    if(!document.getElementById('aime-ck-css')){var s=document.createElement('style');s.id='aime-ck-css';s.textContent=css;document.head.appendChild(s);}
    var d=document.createElement('div');d.id='aime-ck';d.setAttribute('role','dialog');d.setAttribute('aria-live','polite');d.setAttribute('aria-label','Aviso de cookies');
    d.innerHTML='<p><strong>Este site usa cookies</strong>Usamos cookies para entender como o site é utilizado e medir nossas campanhas. Você pode aceitar ou recusar, e o site funciona normalmente nos dois casos. Saiba mais na <a href="https://aime.eng.br/privacidade/">Política de privacidade</a>.</p>'
      +'<div class="ck-b"><button type="button" class="ck-no">Recusar</button><button type="button" class="ck-ok">Aceitar</button></div>';
    document.body.appendChild(d);
    d.querySelector('.ck-ok').onclick=function(){put('granted');apply('granted');d.remove();};
    d.querySelector('.ck-no').onclick=function(){put('denied');apply('denied');d.remove();};
  }
  window.aimeCookiePrefs=function(){var x=document.getElementById('aime-ck');if(x)x.remove();show();return false;};
  function footerLink(){
    var p=document.querySelector('footer a[href*="privacidade"]');
    if(!p||document.getElementById('aime-ck-link'))return;
    var a=document.createElement('a');a.id='aime-ck-link';a.href='#';a.textContent='Preferências de cookies';
    a.onclick=function(e){e.preventDefault();window.aimeCookiePrefs();};
    p.parentNode.insertBefore(a,p.nextSibling);
  }
  function init(){footerLink();var c=get();if(c&&!/aime_consent_v1=/.test(document.cookie))put(c);if(!c)show();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
