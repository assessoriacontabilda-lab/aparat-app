;(function(){
  if(window.__APARAT_NAV_FIX__) return; window.__APARAT_NAV_FIX__=1;
  // Parte 1 - Envolve aPage: mostra o container das paginas e esconde a home
  function wrapAPage(){
    if(typeof window.aPage!=='function' || window.aPage.__apWrapped) return;
    var orig=window.aPage;
    var w=function(key){
      try{
        var va=document.getElementById('view-app');
        var vc=document.getElementById('view-cliente');
        if(key==='home'){ if(vc) vc.style.display=''; if(va) va.style.display='none'; }
        else { if(vc) vc.style.display='none'; if(va) va.style.display='block'; }
      }catch(e){}
      return orig.apply(this, arguments);
    };
    w.__apWrapped=1; window.aPage=w;
  }
  // Parte 2 - Cards da home abrem a pagina completa via aPage em vez de so rolar
  function fixCards(){
    try{
      if(typeof window.aPage!=='function') return;
      var map={fat:'financeiro',dados:'perfil',hon:'honorarios',obr:'obrig',doc:'docs',inf:'urgencias',notas:'docs'};
      var btns=document.querySelectorAll('.cli-atalhos > button');
      for(var i=0;i<btns.length;i++){
        var b=btns[i];
        if(b.getAttribute('data-apnav')==='1') continue;
        var oc=b.getAttribute('onclick')||'';
        var m=oc.match(/abrirCli\(['"]([a-z]+)['"]\)/);
        if(!m) continue;
        var key=m[1]; b.setAttribute('data-apnav','1');
        if(key==='age'){ b.style.display='none'; continue; }
        var target=map[key]; if(!target) continue;
        b.removeAttribute('onclick');
        (function(t,btn){ btn.addEventListener('click',function(ev){ ev.preventDefault(); try{ window.aPage(t); }catch(e){} }); })(target,b);
      }
    }catch(e){}
  }
  function tick(){ wrapAPage(); fixCards(); }
  [200,600,1200,2500].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,3000);
})();

/* APARAT - Botao Voltar nas paginas do cliente (estilo app de banco) */
;(function(){
  if(window.__APARAT_BACK_FIX__) return; window.__APARAT_BACK_FIX__=1;
  var TIT={honorarios:'Honorários',obrig:'Guias e Obrigações',financeiro:'Faturamento',urgencias:'Avisos',docs:'Documentos',perfil:'Perfil'};
  function bar(){
    var va=document.getElementById('view-app'); if(!va) return null;
    var b=document.getElementById('ap-backbar');
    if(!b){
      b=document.createElement('div'); b.id='ap-backbar';
      b.style.cssText='display:none;align-items:center;gap:10px;padding:10px 12px;position:sticky;top:0;z-index:80;background:rgba(10,10,24,.97);border-bottom:1px solid #222248';
      b.innerHTML='<button id="ap-backbtn" style="background:#1a1a35;border:1px solid #33335f;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;line-height:1">&#8592;</button><span id="ap-backtit" style="color:#fff;font-weight:700;font-size:14px;cursor:pointer">Voltar</span>';
      va.insertBefore(b, va.firstChild);
      b.addEventListener('click', function(){ try{ window.aPage('home'); }catch(e){} });
    }
    return b;
  }
  function wrapBack(){
    if(typeof window.aPage!=='function' || window.aPage.__apBackWrapped) return;
    var orig=window.aPage;
    var w=function(key){
      var r=orig.apply(this, arguments);
      try{
        var b=bar();
        if(b){
          var t=document.getElementById('ap-backtit'); if(t) t.textContent=TIT[key]||'Voltar';
          b.style.display=(key==='home')?'none':'flex';
        }
        if(key!=='home'){ try{ if(!(history.state&&history.state.apback)) history.pushState({apback:1},''); }catch(e){} }
      }catch(e){}
      return r;
    };
    w.__apBackWrapped=1; window.aPage=w;
  }
  window.addEventListener('popstate', function(){
    try{
      var va=document.getElementById('view-app');
      if(va && va.style.display!=='none' && typeof window.aPage==='function'){ window.aPage('home'); }
    }catch(e){}
  });
  function tick(){ wrapBack(); bar(); }
  [300,800,1500,3000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,3000);
})();
