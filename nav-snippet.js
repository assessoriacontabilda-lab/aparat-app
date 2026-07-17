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
