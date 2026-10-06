/* APARAT cobra-anexo.js v1 (06/10/2026)
   Botao "Anexar comprovante ou extrato do pagamento" DIRETO no cartao de cobranca
   da tela inicial do cliente (#ap-cobra, modulo __APARAT_COBRA__ do aparat-fix.js).
   Antes o anexo so aparecia escondido depois de tocar em "Ja paguei" -> "Como voce pagou?".
   Nao mexe no aparat-fix.js: reaproveita o fluxo que ja existe la (escolherForma +
   input de arquivo), apenas abre o seletor de arquivo direto e esconde a caixa
   "Como voce pagou?". Upload, gravacao em 'pagamentos' (status 'aguardando',
   forma 'comprovante') e redesenho do cartao continuam sendo feitos pelo modulo original. */
;(function(){
  if(window.__APARAT_COBRA_ANEXO__) return; window.__APARAT_COBRA_ANEXO__=1;

  var ID='ap-cobra-anexo';
  var TXT='\u{1F4CE} Anexar comprovante ou extrato do pagamento';
  var SUB='Foto, print ou PDF · a APARAT confere e dá baixa';
  var enviando=false;

  function el(id){ return document.getElementById(id); }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} try{ alert(m); }catch(e){} }

  function css(){
    if(el(ID+'-css')) return;
    var s=document.createElement('style'); s.id=ID+'-css';
    s.textContent=
       '#'+ID+'{display:block;margin-top:9px;border:2px dashed rgba(255,255,255,.75);background:rgba(255,255,255,.12);'
      +'border-radius:13px;padding:13px 10px;text-align:center;font-size:14px;font-weight:800;cursor:pointer;color:#fff;line-height:1.3}'
      +'#'+ID+' small{display:block;font-weight:500;font-size:11.5px;opacity:.9;margin-top:3px}'
      +'#'+ID+'.ocupado{opacity:.75;cursor:default}'
      +'#ap-cobra-formas.ap-oculto{display:none !important}';
    document.head.appendChild(s);
  }

  function rotulo(b, texto, sub){ b.innerHTML=texto+(sub?('<small>'+sub+'</small>'):''); }

  function inserir(){
    var c=el('ap-cobra'); if(!c || c.style.display==='none') return;
    var paguei=el('ap-cobra-paguei'); if(!paguei) return;       /* so em cartao com item em aberto */
    if(el(ID)) return;
    css();
    var b=document.createElement('div'); b.id=ID; b.setAttribute('role','button'); b.tabIndex=0;
    rotulo(b, TXT, SUB);
    paguei.parentNode.insertBefore(b, paguei);
    /* o "Ja paguei" continua para quem nao quer anexar nada */
    if(/^✅ Já paguei$/.test(paguei.textContent.trim())) paguei.textContent='✅ Já paguei (sem comprovante)';
    b.onclick=function(){ abrir(b); };
    b.onkeydown=function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); abrir(b); } };
  }

  /* abre o seletor de arquivo do fluxo original, com a caixa "Como voce pagou?" escondida */
  function abrir(b){
    if(enviando) return;
    var paguei=el('ap-cobra-paguei'); if(!paguei) return;
    var formas=el('ap-cobra-formas');
    if(!formas){ try{ paguei.click(); }catch(e){} formas=el('ap-cobra-formas'); }
    if(!formas){ aviso('Não consegui abrir o anexo. Toque em "Já paguei" e use a opção de anexar.','erro'); return; }
    formas.classList.add('ap-oculto');
    var inp=formas.querySelector('input[type=file]');
    if(!inp){ cancelar(); aviso('Não consegui abrir o anexo. Toque em "Já paguei" e use a opção de anexar.','erro'); return; }

    var original=inp.onchange;
    inp.onchange=function(ev){
      var f=inp.files && inp.files[0];
      if(!f){ cancelar(); return; }
      enviando=true; b.classList.add('ocupado');
      rotulo(b, '⏳ Enviando '+f.name+'...', 'Não feche o app');
      /* o modulo original faz o upload, grava em pagamentos e redesenha o cartao */
      var r=null; try{ r=original?original.call(inp, ev):null; }catch(e){ falhou(b, e); return; }
      vigiar(b, formas);
      if(r && r.then) r.then(function(){ fim(b, formas); }, function(e){ falhou(b, e); });
    };
    try{ inp.addEventListener('cancel', function(){ if(!inp.files||!inp.files.length) cancelar(); }); }catch(e){}
    /* iPhone antigo / navegador sem evento cancel: ao voltar sem arquivo, desfaz */
    var volta=function(){ setTimeout(function(){ if(!enviando && !(inp.files&&inp.files.length)) cancelar(); }, 900); window.removeEventListener('focus', volta); };
    setTimeout(function(){ window.addEventListener('focus', volta); }, 300);
    try{ inp.click(); }catch(e){ cancelar(); aviso('Não consegui abrir os arquivos do aparelho.','erro'); }
  }

  /* o fluxo original: em erro, devolve o texto do drop e deixa a caixa viva; em sucesso remove #ap-cobra-formas */
  function vigiar(b, formas){
    var n=0, t=setInterval(function(){
      n++;
      if(!document.body.contains(formas)){ clearInterval(t); fim(b, formas); return; }
      var drop=formas.querySelector('.drop');
      if(drop && !/^⏳/.test(drop.textContent.trim())){ clearInterval(t); falhou(b, null); return; }
      if(n>600){ clearInterval(t); fim(b, formas); }   /* 5 min */
    },500);
  }
  function fim(b, formas){
    enviando=false;
    if(formas && document.body.contains(formas)) cancelar();   /* deu erro: a caixa continua viva, fecha */
    if(b && document.body.contains(b)){ b.classList.remove('ocupado'); rotulo(b, TXT, SUB); }
    setTimeout(inserir, 400);
  }
  function falhou(b, e){
    enviando=false;
    if(e) aviso('Não consegui enviar o arquivo: '+(e && (e.message||e)),'erro');
    cancelar();
    if(b && document.body.contains(b)){ b.classList.remove('ocupado'); rotulo(b, TXT, SUB); }
  }
  /* fecha a caixa "Como voce pagou?" pelo proprio botao Cancelar dela (devolve o "Ja paguei") */
  function cancelar(){
    var formas=el('ap-cobra-formas'); if(!formas) return;
    var c=formas.querySelector('[data-forma=""]');
    if(c){ try{ c.click(); return; }catch(e){} }
    formas.remove(); var p=el('ap-cobra-paguei'); if(p) p.style.display='';
  }

  function iniciar(){
    inserir();
    try{
      var mo=new MutationObserver(function(){ if(!enviando) inserir(); });
      mo.observe(document.body,{childList:true,subtree:true});
    }catch(e){}
    setInterval(function(){ if(!enviando) inserir(); }, 3000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
