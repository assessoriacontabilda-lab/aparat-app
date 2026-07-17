;(function(){
  if(window.__APARAT_NAV_FIX__) return; window.__APARAT_NAV_FIX__=1;
  function fixClientCardsNav(){
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
        var key=m[1];
        b.setAttribute('data-apnav','1');
        if(key==='age'){ b.style.display='none'; continue; }
        var target=map[key];
        if(!target) continue;
        b.removeAttribute('onclick');
        (function(t,orig,btn){
          btn.addEventListener('click',function(ev){ ev.preventDefault(); try{ window.aPage(t); }catch(e){ try{ window.abrirCli(orig); }catch(e2){} } });
        })(target,key,b);
      }
    }catch(e){}
  }
  [500,1500,3000].forEach(function(t){ setTimeout(fixClientCardsNav,t); });
  setInterval(fixClientCardsNav,3000);
})();
