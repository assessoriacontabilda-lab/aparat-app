/* APARAT - VER O APP DO CLIENTE POR DENTRO (v5, 17/11/2026)
   v5: nao espera mais o painel inteiro carregar (demorava ~25 s); troca assim que o login do escritorio e reconhecido e fica vigiando.
   v4: so troca para a area do cliente depois que o login do escritorio termina de carregar (antes o painel voltava por cima).
   v3: a trava por digital/PIN nao aparece durante a visualizacao.
   v2: o login do cliente so era assumido se o Firebase ja estivesse iniciado quando este arquivo carregava; agora tenta ate conseguir.
   Pedido do Daniel: "cria um acesso que eu possa entrar no app dos clientes, assim eu mesmo consigo ver como esta o app deles por dentro".
   Em vez de criar um login com senha, o Daniel usa o PROPRIO login do escritorio:
   - Menu do painel "Ver app do cliente" -> escolhe o cliente -> o app recarrega e mostra a area do cliente exatamente
     como ele ve (mesmo index.html, mesmos modulos), com uma faixa laranja "Voce esta vendo o app como ... [Voltar ao painel]".
   - SOMENTE LEITURA: enquanto dura a visualizacao, toda gravacao no Firestore/Storage e o envio ao Drive sao barrados
     (o cliente nao recebe nada, nenhum dado muda). "Sair" volta ao painel em vez de deslogar.
   - Para os modulos acharem que e o cliente, firebase.auth().currentUser passa a responder com o uid de um login daquele
     cliente (se houver) e um e-mail que nao e o do escritorio. O Firestore continua autenticado como o escritorio (le tudo).
   - Login de varias empresas (multi-empresa.js): escolhendo uma empresa do Keseler, aparece a tela "Escolha a empresa"
     do login dele, e o Trocar troca a visualizacao (sem gravar).
   Estado: sessionStorage apVerComo = {nome, uid, email} (some ao fechar o app). */
;(function(){
  if(window.__APARAT_VERCOMO_MOD__) return; window.__APARAT_VERCOMO_MOD__=1;

  var CH='apVerComo';
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function ler(){ try{ var s=sessionStorage.getItem(CH); return s?JSON.parse(s):null; }catch(e){ return null; } }
  function grava(o){ try{ if(o) sessionStorage.setItem(CH,JSON.stringify(o)); else sessionStorage.removeItem(CH); }catch(e){} }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; return firebase.firestore(); }catch(e){ return null; } }
  function aviso(m,t){ try{ if(typeof notif==='function') notif(m,t||'info'); }catch(e){} }
  var EMAIL_ESC=(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) ? String(ADMIN_EMAIL) : 'assessoriacontabil.da@gmail.com';

  var V=ler();
  /* ---------- trava de gravacao (so durante a visualizacao) ---------- */
  function barrado(){
    if(!barrado.t || Date.now()-barrado.t>2500){ barrado.t=Date.now(); aviso('\u{1F441} Modo visualização: nada é gravado nem enviado ao cliente.','warn'); }
    var e=new Error('Modo visualização: nada é gravado.'); e.code='ver-como-cliente'; return Promise.reject(e);
  }
  function travaGravacao(){
    try{
      var F=firebase.firestore;
      [['DocumentReference',['set','update','delete']],['CollectionReference',['add']],['WriteBatch',['commit']]].forEach(function(p){
        var C=F && F[p[0]]; if(!C || !C.prototype) return;
        p[1].forEach(function(m){ if(typeof C.prototype[m]==='function') C.prototype[m]=function(){ return barrado(); }; });
      });
      var fs=db();
      if(fs && typeof fs.runTransaction==='function') fs.runTransaction=function(){ return barrado(); };
      try{ var S=firebase.storage && firebase.storage.Reference; if(S && S.prototype){ ['put','putString','delete'].forEach(function(m){ if(typeof S.prototype[m]==='function') S.prototype[m]=function(){ var r=barrado(); return {then:r.then.bind(r),catch:r.catch.bind(r),on:function(){},cancel:function(){}}; }; }); } }catch(e){}
    }catch(e){}
    try{
      var f0=window.fetch;
      window.fetch=function(u){ var s=String((u&&u.url)||u||''); if(/script\.google(usercontent)?\.com|googleapis\.com\/upload|fcm\.googleapis/i.test(s)) return barrado(); return f0.apply(this,arguments); };
    }catch(e){}
  }

  /* ---------- o app passa a "ser" o cliente ---------- */
  var fingido=false;
  function fingirUsuario(){
    if(fingido) return true;
    try{
      if(!(window.firebase && firebase.apps && firebase.apps.length)) return false;   /* o app ainda nao iniciou o Firebase */
      var a=firebase.auth(), real=null;
      try{ real=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(a),'currentUser'); }catch(e){}
      var proprio=Object.getOwnPropertyDescriptor(a,'currentUser');
      var pega=function(){ try{ if(proprio && proprio.get) return proprio.get.call(a); if(real && real.get) return real.get.call(a); }catch(e){} return null; };
      Object.defineProperty(a,'currentUser',{configurable:true,get:function(){
        var u=pega(); if(!u) return null;
        if(!V) return u;
        return { uid:V.uid||u.uid, email:V.email||'visualizacao@aparat.app', displayName:'', emailVerified:true, isAnonymous:false,
                 getIdToken:function(){ return u.getIdToken.apply(u,arguments); }, reload:function(){ return Promise.resolve(); }, __visualizacao:true };
      }});
      fingido=true;
    }catch(e){}
    return fingido;
  }

  function css(){
    if(el('ap-vc-css')) return;
    var s=document.createElement('style'); s.id='ap-vc-css';
    s.textContent=
       '#vc-faixa{position:fixed;left:0;right:0;top:0;z-index:2147482000;display:flex;align-items:center;gap:10px;padding:8px 12px;background:#ff8a00;color:#1c0f00;font-size:15px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.25)}'
      +'#vc-faixa span{flex:1;min-width:0;line-height:1.3}'
      +'#vc-faixa small{display:block;font-size:12px;font-weight:600;opacity:.85}'
      +'#vc-faixa button{font:inherit;font-size:15px;font-weight:800;padding:9px 13px;border-radius:11px;border:0;background:#1c0f00;color:#fff;cursor:pointer;white-space:nowrap}'
      +'html.ap-vc-on{scroll-padding-top:var(--vc-h,62px)}body.ap-vc-on{padding-top:var(--vc-h,62px)!important}'
      +'body.ap-vc-on #me-esc{top:var(--vc-h,62px)}'
      +'#vc-modal{position:fixed;inset:0;z-index:2147481000;background:rgba(6,12,30,.6);display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto}'
      +'#vc-modal .vc-c{width:100%;max-width:560px;background:var(--card,#fff);color:inherit;border-radius:18px;padding:18px;border:1px solid var(--border,#d6deec)}'
      +'#vc-modal h3{margin:0 0 4px;font-size:19px}'
      +'#vc-modal p{margin:0 0 12px;font-size:14px;line-height:1.5;color:var(--cinza,#51607a)}'
      +'#vc-modal input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:11px 13px;border-radius:12px;border:1px solid var(--border,#c6d0e2);background:transparent;color:inherit;margin-bottom:10px}'
      +'#vc-modal .vc-l{max-height:55vh;overflow:auto}'
      +'#vc-modal .vc-i{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;padding:12px;margin:0 0 7px;border-radius:13px;border:1px solid var(--border,#d6deec);background:transparent;color:inherit;cursor:pointer}'
      +'#vc-modal .vc-i b{display:block;font-size:15px;word-break:break-word}'
      +'#vc-modal .vc-i small{display:block;font-size:12px;color:var(--cinza,#51607a)}'
      +'#vc-modal .vc-i em{font-style:normal;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap;margin-left:auto}'
      +'#vc-modal .vc-i em.ok{background:rgba(14,159,110,.15);color:#0e9f6e}#vc-modal .vc-i em.no{background:rgba(255,138,0,.15);color:#c56a00}'
      +'#vc-modal .vc-x{display:block;width:100%;font:inherit;font-size:15px;font-weight:700;padding:12px;border-radius:12px;border:1px solid var(--border,#c6d0e2);background:transparent;color:inherit;cursor:pointer;margin-top:8px}';
    document.head.appendChild(s);
  }

  /* ---------- PAINEL: menu + escolha do cliente ---------- */
  function ehAdminReal(){ try{ var u=firebase.auth().currentUser; return !!u && !V && String(u.email||'').toLowerCase()===EMAIL_ESC.toLowerCase(); }catch(e){ return false; } }
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-vercomo')) return;
    var ref=null; [].slice.call(nv.querySelectorAll('.nav-item')).forEach(function(it){ if(!ref && /Meu Escrit/.test(it.textContent||'')) ref=it; });
    var it=document.createElement('div'); it.className='nav-item'; it.id='ap-nav-vercomo';
    it.innerHTML='<span class="ni">\u{1F441}</span>Ver app do cliente';
    it.onclick=function(ev){ try{ ev.stopPropagation(); }catch(e){} abrirEscolha(); };
    if(ref && ref.parentNode) ref.parentNode.insertBefore(it, ref.nextSibling); else nv.appendChild(it);
  }

  var cache=null;
  async function carregar(){
    var d=db(); if(!d) return [];
    var r=await Promise.all([d.collection('clientes').get(), d.collection('usuarios').get()]);
    var logins=[]; r[1].forEach(function(x){ var o=x.data()||{}; if(o.role==='admin' || String(o.email||'').toLowerCase()===EMAIL_ESC.toLowerCase()) return; logins.push({uid:x.id, o:o}); });
    var v=[];
    r[0].forEach(function(x){ var o=x.data()||{}, n=String(o.nome||'').trim(); if(!n) return;
      var direto=null, multi=null;
      logins.forEach(function(l){
        if(l.o.clienteNome===n && !direto) direto=l;
        if(Array.isArray(l.o.empresas) && l.o.empresas.length>1 && l.o.empresas.indexOf(n)>=0 && !multi) multi=l;
      });
      var lg=multi||direto;
      v.push({nome:n, cnpj:String(o.cnpj||''), status:String(o.status||''), uid:lg?lg.uid:'', email:lg?String(lg.o.email||''):'', multi:!!multi, nEmp:multi?multi.o.empresas.length:0});
    });
    v.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); });
    return v;
  }
  async function abrirEscolha(){
    if(el('vc-modal')) return; css();
    var m=document.createElement('div'); m.id='vc-modal';
    m.innerHTML='<div class="vc-c"><h3>\u{1F441} Ver app do cliente</h3><p>Escolha o cliente. O app abre do jeito que ele vê, só para olhar: nada é gravado e o cliente não recebe aviso nenhum. Para sair, toque em <b>Voltar ao painel</b> na faixa laranja.</p>'
      +'<input id="vc-q" placeholder="Buscar cliente..." autocomplete="off"><div class="vc-l" id="vc-l">Carregando...</div><button class="vc-x" id="vc-x" type="button">Fechar</button></div>';
    document.body.appendChild(m);
    el('vc-x').onclick=function(){ m.remove(); };
    m.onclick=function(e){ if(e.target===m) m.remove(); };
    try{ cache=await carregar(); }catch(e){ el('vc-l').textContent='Não consegui carregar os clientes. Toque em Fechar e tente de novo.'; return; }
    function desenha(){
      var q=String(el('vc-q').value||'').toLowerCase().trim(), h='';
      cache.forEach(function(c,i){ if(q && (c.nome+' '+c.cnpj).toLowerCase().indexOf(q)<0) return;
        h+='<button type="button" class="vc-i" data-vc="'+i+'"><span><b>'+esc(c.nome)+'</b><small>'+esc(c.cnpj||'')+(c.multi?(' · acesso com '+c.nEmp+' empresas'):'')+'</small></span>'
          +(c.uid?'<em class="ok">tem acesso</em>':'<em class="no">sem acesso</em>')+'</button>'; });
      el('vc-l').innerHTML=h||'<p>Nenhum cliente encontrado.</p>';
      [].forEach.call(el('vc-l').querySelectorAll('[data-vc]'),function(b){ b.onclick=function(){ entrar(cache[+b.getAttribute('data-vc')]); }; });
    }
    el('vc-q').oninput=desenha; desenha(); try{ el('vc-q').focus(); }catch(e){}
  }
  function entrar(c){
    var real=null; try{ real=firebase.auth().currentUser; }catch(e){}
    grava({nome:c.nome, uid:c.uid||(real&&real.uid)||'', email:c.email||'visualizacao@aparat.app', multi:!!c.multi, inicio:Date.now()});
    try{ sessionStorage.removeItem('apMultiOk'); }catch(e){}
    location.reload();
  }
  function sairVisualizacao(){ grava(null); try{ sessionStorage.removeItem('apMultiOk'); }catch(e){} location.reload(); }

  /* ---------- VISUALIZACAO: troca o painel pela area do cliente ---------- */
  var montado=false, adminPronto=false, t0=Date.now();
  function vigiaFimDoLogin(){
    try{
      var velho=window.initPush;
      if(typeof velho!=='function' || velho.__vc) return;
      var novo=function(role){ if(role==='admin'){ adminPronto=true; setTimeout(montar,50); return Promise.resolve(); } return velho.apply(this,arguments); };
      novo.__vc=1; window.initPush=novo;
    }catch(e){}
  }
  function faixa(){
    if(el('vc-faixa')) return; css();
    var f=document.createElement('div'); f.id='vc-faixa';
    f.innerHTML='<span>\u{1F441} Vendo como: <b id="vc-nome"></b><small>Só olhar: nada é gravado</small></span><button type="button" id="vc-sair">\u{2190} Voltar ao painel</button>';
    document.body.appendChild(f); document.body.classList.add('ap-vc-on'); document.documentElement.classList.add('ap-vc-on');
    el('vc-nome').textContent=V.nome;
    el('vc-sair').onclick=sairVisualizacao;
    function ajusta(){ try{ document.documentElement.style.setProperty('--vc-h', Math.ceil(f.getBoundingClientRect().height)+'px'); }catch(e){} }
    ajusta(); window.addEventListener('resize',ajusta); setTimeout(ajusta,500); setTimeout(ajusta,2000);
  }
  async function montar(){
    if(montado) return;
    if(!fingirUsuario()) return;
    var u=null; try{ u=firebase.auth().currentUser; }catch(e){}
    if(!u) return;
    /* espera o handleAuth do escritorio TERMINAR (ele carrega o painel inteiro e so no fim chama initPush);
       trocar a tela antes disso faz o proprio handleAuth devolver o painel logo depois */
    var vp=el('view-painel'); if(!vp) return;
    var papelAgora=null; try{ papelAgora=CURRENT_ROLE; }catch(e){}
    if(papelAgora!=='admin') return;   /* o handleAuth do escritorio ja passou (ele marca o papel e mostra o painel na mesma hora) */
    montado=true;
    try{
      CURRENT_ROLE='cliente'; CURRENT_CLIENTE=V.nome;
      vp.classList.remove('active');
      if(typeof _show==='function'){ _show('view-app',false); _show('view-cliente',true); }
      document.querySelectorAll('.switcher').forEach(function(s){ s.style.display='none'; });
      faixa();
      window.sair=sairVisualizacao;
      if(typeof renderClientePortal==='function') await renderClientePortal(V.nome);
      try{ if(typeof saudarUsuario==='function') saudarUsuario(String(V.nome||'').split(' ')[0]); }catch(e){}
      var ul=el('user-label'); if(ul) ul.textContent=(V.email && V.email.indexOf('visualizacao@')<0)?V.email:'(visualização)';
    }catch(e){ console.error('ver-como-cliente',e); }
  }

  /* a trava por digital/PIN e do aparelho de cada cliente: na visualizacao ela nao deve pedir para criar PIN */
  function semTrava(){
    try{
      var g=Storage.prototype.getItem;
      Storage.prototype.getItem=function(k){ if(k==='apTravaOff' && this===window.localStorage) return '1'; return g.apply(this,arguments); };
    }catch(e){}
  }
  if(V){
    window.__APARAT_VERCOMO__=V; semTrava();
    fingirUsuario(); travaGravacao();
    vigiaFimDoLogin();
    /* fica de olho: se o painel voltar a aparecer por qualquer motivo, mostra de novo a area do cliente */
    setInterval(function(){
      vigiaFimDoLogin();
      var papelAgora=null; try{ papelAgora=CURRENT_ROLE; }catch(e){}
      if(montado && papelAgora==='admin'){ montado=false; }
      if(!montado){ montar(); return; }
      /* painel reapareceu sem trocar o papel: so devolve a area do cliente */
      var vp=el('view-painel'), vc=el('view-cliente');
      if(vp && vp.classList.contains('active')){ vp.classList.remove('active'); if(vc) vc.style.display=''; }
    },300);
  } else {
    setInterval(function(){ if(ehAdminReal()) menu(); },1500);
    setTimeout(function(){ if(ehAdminReal()) menu(); },800);
  }

  /* multi-empresa.js chama isto no "Trocar" durante a visualizacao */
  window.__VERCOMO__={ ativo:!!V, estado:function(){ return V; }, abrir:abrirEscolha, sair:sairVisualizacao,
    trocar:function(nome){ if(!V) return false; V.nome=nome; grava(V); try{ sessionStorage.setItem('apMultiOk',V.uid); }catch(e){} location.reload(); return true; } };
})();
