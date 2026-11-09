/* APARAT - TEMA DE NATAL (v1, 09/11/2026) - liga sozinho de 01/11/2026 ate 06/01/2027
   - logo do app com gorro (imagens na tela; o icone instalado vem do manifest)
   - arvore de Natal no fundo da tela inicial (painel: Inicio/Dashboard; cliente: area do cliente),
     atras de tudo (z-index:-1, fundos do .pmain/#view-cliente ficam transparentes e a cor vai p/ o <html>)
   - neve leve por cima (pointer-events:none) - botao de neve liga/desliga (localStorage apNatalNeve)
   - faixa "Boas festas" na tela inicial (fecha no X, volta no dia seguinte)
   - assistente vira Papai Noel
   - som de abertura (caixinha de musica + guizos, ~6 s, gerado no aparelho): so na tela inicial,
     1 vez por dia por aparelho (apNatalSomDia), depois do primeiro toque (regra dos navegadores);
     botao do sino desliga (apNatalSom=off)
   - nada grava no Firebase; nada aparece fora do periodo */
;(function(){
  if(window.__APARAT_NATAL__) return; window.__APARAT_NATAL__=1;
  var INI=new Date(2026,10,1).getTime(), FIM=new Date(2027,0,7).getTime();
  function ativo(){ var t=Date.now(); return t>=INI && t<FIM; }
  if(!ativo()) return;

  var IC='data:image/webp;base64,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';
  var ARV='natal-arvore.webp?v=1';
  var LUZ='<svg viewBox="0 0 200 300" ><defs><radialGradient id="est"><stop offset="0" stop-color="#fff6c2" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf2e" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="18" r="22" fill="url(#est)" class="tw" style="--d:2.6s;--a:0s"/><circle cx="99.5" cy="37.7" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.73s;--a:-3.27s"/><circle cx="99.9" cy="38.0" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:3.48s;--a:-2.53s"/><circle cx="88.1" cy="48.5" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:3.00s;--a:-0.31s"/><circle cx="97.3" cy="56.5" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:3.10s;--a:-2.84s"/><circle cx="102.5" cy="46.5" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:2.11s;--a:-1.17s"/><circle cx="93.7" cy="73.1" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.51s;--a:-1.75s"/><circle cx="86.2" cy="68.0" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:3.44s;--a:-2.89s"/><circle cx="112.6" cy="70.2" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.46s;--a:-3.26s"/><circle cx="90.6" cy="75.4" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.69s;--a:-0.57s"/><circle cx="86.4" cy="77.9" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:2.27s;--a:-2.89s"/><circle cx="104.2" cy="73.1" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:2.75s;--a:-0.61s"/><circle cx="92.7" cy="84.7" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:1.86s;--a:-2.38s"/><circle cx="101.2" cy="98.4" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.56s;--a:-0.81s"/><circle cx="109.9" cy="112.6" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:1.87s;--a:-0.44s"/><circle cx="95.7" cy="99.8" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:3.30s;--a:-2.76s"/><circle cx="99.0" cy="95.5" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:3.18s;--a:-2.53s"/><circle cx="73.0" cy="112.8" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:1.55s;--a:-0.27s"/><circle cx="108.7" cy="100.3" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:2.97s;--a:-2.21s"/><circle cx="103.4" cy="108.1" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:3.22s;--a:-2.70s"/><circle cx="124.9" cy="105.2" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.34s;--a:-2.17s"/><circle cx="82.9" cy="111.5" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:3.49s;--a:-0.16s"/><circle cx="68.0" cy="133.0" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.77s;--a:-1.85s"/><circle cx="96.9" cy="122.7" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.50s;--a:-2.30s"/><circle cx="136.9" cy="138.1" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:2.29s;--a:-0.49s"/><circle cx="83.5" cy="132.0" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:3.02s;--a:-3.30s"/><circle cx="102.2" cy="119.0" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:2.46s;--a:-3.02s"/><circle cx="124.9" cy="127.7" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:3.25s;--a:-1.95s"/><circle cx="86.4" cy="122.9" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:3.31s;--a:-1.20s"/><circle cx="83.5" cy="118.3" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.22s;--a:-1.72s"/><circle cx="130.1" cy="137.2" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.41s;--a:-0.51s"/><circle cx="79.2" cy="121.6" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:1.62s;--a:-2.13s"/><circle cx="79.1" cy="156.7" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:1.87s;--a:-1.83s"/><circle cx="59.1" cy="168.4" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:2.15s;--a:-1.44s"/><circle cx="94.8" cy="153.2" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.19s;--a:-3.22s"/><circle cx="79.8" cy="155.8" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:1.48s;--a:-0.42s"/><circle cx="80.0" cy="166.5" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.43s;--a:-0.52s"/><circle cx="108.7" cy="159.0" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.74s;--a:-1.43s"/><circle cx="96.6" cy="149.0" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:3.43s;--a:-0.66s"/><circle cx="102.1" cy="149.1" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:2.19s;--a:-3.29s"/><circle cx="132.6" cy="163.4" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:2.49s;--a:-1.29s"/><circle cx="58.7" cy="168.4" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.66s;--a:-3.34s"/><circle cx="112.2" cy="156.9" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:3.22s;--a:-1.48s"/><circle cx="129.8" cy="154.9" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:3.24s;--a:-3.41s"/><circle cx="134.2" cy="186.5" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.15s;--a:-1.19s"/><circle cx="112.0" cy="183.5" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:3.38s;--a:-1.43s"/><circle cx="118.4" cy="185.5" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:1.56s;--a:-1.10s"/><circle cx="123.6" cy="191.5" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:2.98s;--a:-0.73s"/><circle cx="68.5" cy="192.1" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.64s;--a:-0.36s"/><circle cx="129.8" cy="189.5" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:2.36s;--a:-2.32s"/><circle cx="64.9" cy="191.7" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.57s;--a:-2.02s"/><circle cx="54.9" cy="187.1" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.92s;--a:-1.53s"/><circle cx="118.9" cy="197.1" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:2.90s;--a:-0.04s"/><circle cx="106.9" cy="179.8" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:2.38s;--a:-1.91s"/><circle cx="104.2" cy="181.4" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:3.56s;--a:-1.85s"/><circle cx="140.2" cy="192.7" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:3.34s;--a:-3.09s"/><circle cx="120.4" cy="197.4" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:3.31s;--a:-1.81s"/><circle cx="33.9" cy="223.7" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.72s;--a:-0.98s"/><circle cx="93.1" cy="209.3" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.60s;--a:-0.24s"/><circle cx="136.8" cy="216.2" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:2.37s;--a:-2.50s"/><circle cx="56.2" cy="214.9" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:2.95s;--a:-2.70s"/><circle cx="54.6" cy="224.7" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:1.84s;--a:-0.48s"/><circle cx="49.3" cy="221.2" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.47s;--a:-1.76s"/><circle cx="110.7" cy="204.4" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:2.04s;--a:-2.61s"/><circle cx="132.0" cy="211.5" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:3.06s;--a:-1.14s"/><circle cx="76.2" cy="203.4" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.97s;--a:-1.76s"/><circle cx="96.7" cy="203.9" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:3.29s;--a:-3.11s"/><circle cx="76.2" cy="205.9" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:3.02s;--a:-2.49s"/><circle cx="127.0" cy="212.8" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:2.87s;--a:-0.09s"/><circle cx="87.1" cy="220.8" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.94s;--a:-0.05s"/><circle cx="79.0" cy="210.2" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:1.44s;--a:-0.82s"/><circle cx="84.7" cy="218.4" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.06s;--a:-2.68s"/><circle cx="166.5" cy="241.2" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.94s;--a:-0.77s"/><circle cx="106.8" cy="241.0" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:3.54s;--a:-0.08s"/><circle cx="67.8" cy="238.6" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:2.56s;--a:-2.89s"/><circle cx="69.7" cy="229.8" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:1.65s;--a:-2.23s"/><circle cx="126.9" cy="233.0" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.01s;--a:-1.93s"/><circle cx="137.9" cy="238.1" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:1.46s;--a:-2.60s"/><circle cx="83.9" cy="231.5" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.69s;--a:-1.51s"/><circle cx="44.7" cy="241.8" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.75s;--a:-0.45s"/><circle cx="147.6" cy="242.2" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:2.23s;--a:-1.33s"/><circle cx="129.4" cy="232.2" r="1.7" fill="#5fb0ff" class="tw" style="--c:#5fb0ff;--d:2.17s;--a:-0.86s"/><circle cx="112.0" cy="243.0" r="1.7" fill="#3ddc84" class="tw" style="--c:#3ddc84;--d:2.41s;--a:-1.08s"/><circle cx="50.8" cy="240.0" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.88s;--a:-1.34s"/><circle cx="29.7" cy="243.1" r="1.7" fill="#ff9a3d" class="tw" style="--c:#ff9a3d;--d:1.45s;--a:-0.51s"/><circle cx="131.1" cy="237.7" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:1.42s;--a:-1.42s"/><circle cx="66.4" cy="239.2" r="1.7" fill="#ffdf8a" class="tw" style="--c:#ffdf8a;--d:2.42s;--a:-1.07s"/><circle cx="64.8" cy="237.1" r="1.7" fill="#ff3b4e" class="tw" style="--c:#ff3b4e;--d:2.63s;--a:-2.56s"/></svg>';
  var SANTA='PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE2Mjc2ZSIvPjxwYXRoIGQ9Ik0yMiA0NCBRMzAgMTAgNjIgMTIgUTg0IDE0IDg2IDM2IEw3OCA0MCBRNzQgMjYgNjAgMjYgUTQwIDI2IDM2IDQ2IFoiIGZpbGw9IiNkNjIwMmUiLz48cGF0aCBkPSJNNjAgMjYgUTc0IDI2IDc4IDQwIEw3MCA0MiBRNjggMzIgNjAgMzBaIiBmaWxsPSIjYTgxMjFmIi8+PGNpcmNsZSBjeD0iODQiIGN5PSI0MCIgcj0iNyIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjE4IiB5PSI0MCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjEyIiByeD0iNiIgZmlsbD0iI2ZmZiIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjYwIiByeD0iMjAiIHJ5PSIxNiIgZmlsbD0iI2Y2YzlhNCIvPjxjaXJjbGUgY3g9IjQyIiBjeT0iNTgiIHI9IjIuNiIgZmlsbD0iIzJhMWExMiIvPjxjaXJjbGUgY3g9IjU4IiBjeT0iNTgiIHI9IjIuNiIgZmlsbD0iIzJhMWExMiIvPjxwYXRoIGQ9Ik0zOCA1MyBxNC0zIDggMCBNNTQgNTMgcTQtMyA4IDAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNjQiIHI9IjQiIGZpbGw9IiNlZThmN2EiLz48Y2lyY2xlIGN4PSIzNyIgY3k9IjY0IiByPSIzLjUiIGZpbGw9IiNmNGEzYTMiIG9wYWNpdHk9Ii43Ii8+PGNpcmNsZSBjeD0iNjMiIGN5PSI2NCIgcj0iMy41IiBmaWxsPSIjZjRhM2EzIiBvcGFjaXR5PSIuNyIvPjxwYXRoIGQ9Ik0yNiA2MiBRMjQgOTIgNTAgOTYgUTc2IDkyIDc0IDYyIFE2OCA3MCA2MCA2OSBRNTUgNzQgNTAgNzIgUTQ1IDc0IDQwIDY5IFEzMiA3MCAyNiA2MloiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNNDAgNzAgUTUwIDY2IDYwIDcwIFE1NiA3NSA1MCA3MyBRNDQgNzUgNDAgNzBaIiBmaWxsPSIjZTllY2YyIi8+PHBhdGggZD0iTTQ0IDc4IHE2IDQgMTIgMCIgc3Ryb2tlPSIjYzljZWQ4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPgo=';
  var ADMIN_EMAIL='assessoriacontabil.da@gmail.com';

  function el(id){ return document.getElementById(id); }
  function ls(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function hoje(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  function aparece(e){ return !!e && e.style.display!=='none' && e.offsetParent!==null; }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; return !!(u && u.email===ADMIN_EMAIL); }catch(e){ return false; } }
  function noPainel(){ var p=el('view-painel'); return !!(p && p.classList.contains('active') && ehAdmin()); }
  function noCliente(){ return aparece(el('view-cliente')); }
  function travado(){ var t=el('ap-trava'); return !!(t && t.style.display!=='none' && t.offsetParent!==null); }
  function inicioPainel(){ var a=document.querySelector('#view-painel .ppage.active'); return !!a && (a.id==='pp-inicio'||a.id==='pp-dash'); }
  function telaInicial(){ return (noPainel() && inicioPainel()) || noCliente(); }

  /* ---------- estilo ---------- */
  function css(){
    if(el('apnt-css')) return;
    var s=document.createElement('style'); s.id='apnt-css';
    s.textContent=''
      +'html.apnt-fundo body.ap-tema-claro #view-cliente .ap-tile{background-color:rgba(255,255,255,.84)!important;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}'
      +'#apnt-arv{position:fixed;bottom:0;z-index:-1;pointer-events:none;height:min(62vh,560px);aspect-ratio:2/3;display:none}'
      +'html.apnt-fundo #apnt-arv{display:block}'
      +'#apnt-arv img{width:100%;height:100%;display:block}'
      +'#apnt-arv svg{position:absolute;inset:0;width:100%;height:100%}'
      +'#apnt-arv .tw{animation:apntLuz var(--d) ease-in-out infinite;animation-delay:var(--a);filter:drop-shadow(0 0 2px var(--c,#ffd23f)) drop-shadow(0 0 5px var(--c,#ffd23f))}'
      +'@keyframes apntLuz{0%,100%{opacity:1}50%{opacity:.2}}'
      +'#apnt-neve{position:fixed;inset:0;z-index:9990;pointer-events:none;overflow:hidden}'
      +'body.ap-esc-claro #apnt-neve b,body.ap-tema-claro #apnt-neve b{color:#b9cdf2;text-shadow:0 0 1px rgba(40,70,140,.6)}'+'#apnt-neve b{position:absolute;top:-12px;color:#fff;text-shadow:0 0 2px rgba(60,90,160,.55);font-weight:400;animation:apntCai linear infinite}'
      +'@keyframes apntCai{to{transform:translate(30px,105vh)}}'
      +'.apnt-bt{position:fixed;left:14px;z-index:9999;width:38px;height:38px;border-radius:50%;border:1px solid #8866ff;background:#101038;color:#fff;font-size:16px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0}'
      +'#apnt-som{bottom:calc(150px + env(safe-area-inset-bottom,0px))}#apnt-nv{bottom:calc(196px + env(safe-area-inset-bottom,0px))}'
      +'.apnt-bt.off{opacity:.55}'
      +'.apnt-faixa{position:relative;margin:4px 0 14px;padding:12px 40px 12px 14px;border-radius:14px;background:linear-gradient(135deg,#b3122a,#e0313f);color:#fff;font-weight:800;font-size:14px;box-shadow:0 6px 16px rgba(180,20,40,.3)}'
      +'.apnt-faixa span{display:block;font-weight:400;font-size:12px;opacity:.95;margin-top:3px}'
      +'.apnt-faixa button{position:absolute;top:8px;right:8px;background:rgba(255,255,255,.18);border:0;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px}'
      +'#view-cliente .apnt-faixa{margin:10px 14px 4px}'
      +'@media(prefers-reduced-motion:reduce){#apnt-neve{display:none}#apnt-arv .tw{animation:none}}';
    document.head.appendChild(s);
  }

  /* ---------- logo com gorro ---------- */
  function logos(){
    [].forEach.call(document.querySelectorAll('img[src*="icone-aparat.png"]'),function(i){
      i.setAttribute('data-apnt-orig', i.getAttribute('src')); i.src=IC;
    });
    var f=document.querySelector('link[rel="icon"]'); if(f && f.getAttribute('href')!==IC) f.setAttribute('href',IC);
  }

  /* ---------- arvore no fundo ---------- */
  /* a arvore fica atras de tudo (z-index:-1). Para ela aparecer, o fundo opaco da tela
     (.pmain, .layout, #view-cliente, body...) fica transparente e a mesma cor vai para o <html>. */
  var assTema='', marcados=[];
  function limpaFundo(){
    marcados.forEach(function(m){ var e=m[0]; e.classList.remove('apnt-transp');
      if(m[1]) e.style.setProperty('background-color',m[1],m[2]); else e.style.removeProperty('background-color');
      if(m[3]) e.style.setProperty('background-image',m[3],m[4]); else e.style.removeProperty('background-image'); }); marcados=[];
    document.documentElement.classList.remove('apnt-fundo'); document.documentElement.style.removeProperty('background');
  }
  function arvore(){
    var mostra = telaInicial() && !travado();
    var h=document.documentElement, a=el('apnt-arv');
    if(!a){
      a=document.createElement('div'); a.id='apnt-arv';
      a.innerHTML='<img alt="" src="'+ARV+'">'+LUZ;
      document.body.appendChild(a);
    }
    if(!mostra){ if(h.classList.contains('apnt-fundo')) limpaFundo(); assTema=''; return; }
    var alvo = noCliente() ? el('view-cliente') : document.querySelector('#view-painel .pmain');
    if(!alvo) return;
    var ass=document.body.className+'|'+(noCliente()?'c':'p');
    if(ass!==assTema){
      limpaFundo();
      var cor='', e=alvo;
      while(e && e!==h){
        var cs=getComputedStyle(e), bg=cs.backgroundColor;
        if((bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent') || (cs.backgroundImage && cs.backgroundImage!=='none')){
          if(!cor && bg && bg!=='rgba(0, 0, 0, 0)') cor=bg;
          marcados.push([e, e.style.getPropertyValue('background-color'), e.style.getPropertyPriority('background-color'), e.style.getPropertyValue('background-image'), e.style.getPropertyPriority('background-image')]);
          e.classList.add('apnt-transp'); e.style.setProperty('background-color','transparent','important'); e.style.setProperty('background-image','none','important');
        }
        e=e.parentElement;
      }
      h.style.setProperty('background', cor||'#f4f7fc');
      h.classList.add('apnt-fundo');
      assTema=ass;
    }
    if(noCliente()){ a.style.left='50%'; a.style.right=''; a.style.transform='translateX(-50%)'; a.style.height='min(58vh,520px)'; }
    else { a.style.left=''; a.style.right='2vw'; a.style.transform=''; a.style.height='min(66vh,600px)'; }
  }

  /* ---------- neve ---------- */
  function neve(){
    var on = ls('apNatalNeve')!=='off';
    var n=el('apnt-neve');
    if(!on){ if(n) n.remove(); return; }
    if(n) return;
    n=document.createElement('div'); n.id='apnt-neve';
    var q = window.innerWidth<700 ? 22 : 34;
    for(var i=0;i<q;i++){
      var b=document.createElement('b'); b.textContent=Math.random()<.45?'❄':'•';
      b.style.left=(Math.random()*100)+'%'; b.style.fontSize=(7+Math.random()*9)+'px'; b.style.opacity=(.45+Math.random()*.45).toFixed(2);
      b.style.animationDuration=(8+Math.random()*9).toFixed(1)+'s'; b.style.animationDelay=(-Math.random()*16).toFixed(1)+'s';
      n.appendChild(b);
    }
    document.body.appendChild(n);
  }

  /* ---------- botoes (neve e som) ---------- */
  function botoes(){
    var visivel = (noPainel()||noCliente()) && !travado();
    var bn=el('apnt-nv'), bs=el('apnt-som');
    if(!bn){
      bn=document.createElement('button'); bn.id='apnt-nv'; bn.className='apnt-bt'; bn.textContent='❄️';
      bn.onclick=function(){ var off=ls('apNatalNeve')==='off'; lsSet('apNatalNeve', off?'on':'off'); neve(); botoes(); };
      document.body.appendChild(bn);
      bs=document.createElement('button'); bs.id='apnt-som'; bs.className='apnt-bt';
      bs.onclick=function(){ var off=ls('apNatalSom')==='off'; lsSet('apNatalSom', off?'on':'off'); botoes(); if(off){ prepara(); tocar(); } };
      document.body.appendChild(bs);
    }
    var nOff=ls('apNatalNeve')==='off', sOff=ls('apNatalSom')==='off';
    bn.classList.toggle('off',nOff); bn.title=nOff?'Ligar a neve':'Desligar a neve';
    bs.textContent=sOff?'\u{1F515}':'\u{1F514}'; bs.classList.toggle('off',sOff); bs.title=sOff?'Ligar o som de Natal':'Desligar o som de Natal';
    bn.style.display=bs.style.display=visivel?'flex':'none';
  }

  /* ---------- faixa Boas Festas ---------- */
  function faixa(){
    if(ls('apNatalFaixa')===hoje()) { var v=document.querySelectorAll('.apnt-faixa'); [].forEach.call(v,function(x){ x.remove(); }); return; }
    var html='\u{1F384} Boas festas! <span>A APARAT deseja um Natal feliz e um 2027 de muitas conquistas.</span><button title="Fechar">✖</button>';
    function liga(f){ f.querySelector('button').onclick=function(){ lsSet('apNatalFaixa',hoje()); faixa(); }; }
    if(noPainel()){
      var pi=el('pp-inicio'); if(pi && !pi.querySelector('.apnt-faixa')){
        var ref=pi.querySelector('.hm-sub')||pi.querySelector('#hm-saud');
        var f=document.createElement('div'); f.className='apnt-faixa'; f.innerHTML=html; liga(f);
        if(ref && ref.parentNode) ref.parentNode.insertBefore(f, ref.nextSibling); else pi.insertBefore(f, pi.firstChild);
      }
    }
    if(noCliente()){
      var vc=el('view-cliente'); if(vc && !vc.querySelector('.apnt-faixa')){
        var top=vc.querySelector('.cli-top');
        var g=document.createElement('div'); g.className='apnt-faixa'; g.innerHTML=html; liga(g);
        if(top && top.parentNode===vc) vc.insertBefore(g, top.nextSibling); else vc.insertBefore(g, vc.firstChild);
      }
    }
  }

  /* ---------- Papai Noel no assistente ---------- */
  var falou=false;
  function papaiNoel(){
    var av=document.querySelector('.apbot-av'); if(!av) return;
    if(av.getAttribute('data-apnt')!=='1'){
      av.setAttribute('data-apsec','1');
      av.innerHTML='';
      av.style.setProperty('background','#16276e url("data:image/svg+xml;base64,'+SANTA+'") center/cover no-repeat','important');
      av.style.setProperty('box-shadow','0 0 0 3px #fff,0 0 0 6px #d6202e,0 6px 16px rgba(0,0,0,.4)','important');
      av.setAttribute('data-apnt','1'); av.title='Papai Noel da APARAT - toque para tirar duvidas';
    }
    if(!falou){ var m=el('sync-msg'); if(m){ falou=true; setTimeout(function(){ m.textContent='Ho ho ho! \u{1F385} Feliz Natal! Toque em mim se precisar de ajuda.'; },6000); } }
  }

  /* ---------- som de abertura ---------- */
  var AC=null, tocou=false;
  function prepara(){
    try{ if(!AC){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return; AC=new C(); } if(AC.state==='suspended') AC.resume(); }catch(e){}
  }
  ['pointerdown','touchstart','keydown','click'].forEach(function(ev){ document.addEventListener(ev, prepara, {capture:true, passive:true}); });
  function tocar(){ try{ if(AC) apNatalTocar(AC,0.30); }catch(e){} }
  function talvezTocar(){
    if(tocou || ls('apNatalSom')==='off' || ls('apNatalSomDia')===hoje()) return;
    if(!telaInicial() || travado() || !AC || AC.state!=='running') return;
    tocou=true; lsSet('apNatalSomDia', hoje()); tocar();
  }
/* som natalino suave: caixinha de musica + guizos, ~6 s, gerado no proprio aparelho (sem arquivo) */
function apNatalTocar(ctx, vol){
  vol = vol==null ? 0.35 : vol;
  var t0 = ctx.currentTime + 0.05;
  var master = ctx.createGain(); master.gain.value = vol;
  var rev = ctx.createConvolver();
  var len = Math.floor(ctx.sampleRate*2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for(var ch=0; ch<2; ch++){ var d=ir.getChannelData(ch); for(var i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); } }
  rev.buffer = ir;
  var wet = ctx.createGain(); wet.gain.value = 0.45;
  master.connect(ctx.destination); master.connect(rev); rev.connect(wet); wet.connect(ctx.destination);
  function hz(n){ return 440*Math.pow(2,(n-69)/12); }
  /* caixinha de musica: seno + harmonicos com decaimento */
  function sino(n, t, dur, g){
    [[1,1],[2,0.32],[3,0.12],[4.2,0.06]].forEach(function(h){
      var o=ctx.createOscillator(), a=ctx.createGain();
      o.type='sine'; o.frequency.value=hz(n)*h[0];
      a.gain.setValueAtTime(0.0001,t); a.gain.exponentialRampToValueAtTime(g*h[1],t+0.008);
      a.gain.exponentialRampToValueAtTime(0.0001,t+dur/(h[0]*0.8));
      o.connect(a); a.connect(master); o.start(t); o.stop(t+dur+0.1);
    });
  }
  /* guizo: ruido filtrado agudo, bem curtinho */
  var nb = ctx.createBuffer(1, ctx.sampleRate*0.3, ctx.sampleRate), nd=nb.getChannelData(0);
  for(var i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
  function guizo(t, g){
    var s=ctx.createBufferSource(); s.buffer=nb;
    var f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=7000+Math.random()*2500; f.Q.value=6;
    var a=ctx.createGain(); a.gain.setValueAtTime(0.0001,t); a.gain.exponentialRampToValueAtTime(g,t+0.005); a.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
    s.connect(f); f.connect(a); a.connect(master); s.start(t); s.stop(t+0.3);
  }
  /* melodia original em do maior, bem calma */
  var mel=[[76,0],[79,.36],[84,.72],[83,1.08],[79,1.44],[81,1.80],[79,2.16],[76,2.52],[74,2.88],[76,3.24],[79,3.60],[72,3.96]];
  mel.forEach(function(m){ sino(m[0], t0+m[1], 2.4, 0.22); });
  /* acorde final */
  [60,64,67,72].forEach(function(n,i){ sino(n, t0+3.96+i*0.06, 3.2, 0.10); });
  /* guizos de treno discretos no comeco e no fim */
  for(var k=0;k<10;k++){ guizo(t0+k*0.09, 0.05*(1-k/12)); }
  for(var k2=0;k2<8;k2++){ guizo(t0+3.9+k2*0.11, 0.04*(1-k2/10)); }
  return 6.8;
}


  /* ---------- relogio ---------- */
  function tick(){
    try{
      if(!ativo()){ return; }
      css(); logos(); arvore(); neve(); botoes(); faixa(); papaiNoel(); talvezTocar();
    }catch(e){ try{ console.warn('[natal]', e); }catch(_){} }
  }
  [300,1200,3000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,1000);
  window.__NATAL__={tick:tick, tocar:function(){ prepara(); tocar(); }, ativo:ativo};
})();
