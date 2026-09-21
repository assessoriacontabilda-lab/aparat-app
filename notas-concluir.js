/* APARAT - NOTAS DO ESCRITORIO: CONCLUIR + BLOCO DO CLIENTE (v1, 20/09/2026)
   PROBLEMA: a nota emitida pelo escritorio (colecao 'notas', tipo 'Envio', origem 'escritorio')
   nasce com status 'Aberta' e o unico jeito de fechar era o iconezinho da tabela, que o Daniel
   nao achava. E no app do cliente ela ficava misturada com os pedidos dele.
   O QUE ESTE MODULO FAZ (nao cria colecao nova):
   1) PAINEL -> aba Notas Fiscais: um bloco "Emitidas pela APARAT" em cima da tabela, com a nota
      aberta em laranja e o botao "Concluir" (grava status:'Emitida' + emitidaEm + concluidoPor)
      e "Reabrir" (volta para 'Aberta'). A tabela de sempre continua embaixo, intacta.
   2) Ao concluir, se a competencia da nota for a do checklist, marca tambem a tarefa do mes
      (window.__FICHA__.marcarObrig) quando o cliente tiver a sigla NFE no perfil - hoje isso
      so acontece se a ficha expuser a funcao; se nao houver, apenas conclui a nota.
   3) APP DO CLIENTE -> a lista #cli-notas e reorganizada em tres blocos:
      "Emitidas pela APARAT" (so as CONCLUIDAS, com botao Baixar), "Meus pedidos de emissao" e
      "Notas que eu enviei". Nota ainda aberta NAO aparece para o cliente.
   Status usados sao os que o app ja usa: 'Aberta' / 'Fechada' (tabela antiga) e 'Emitida'
   (ST_OK do modulo __APARAT_NF2__, so para o PEDIDO do cliente). */
;(function(){
  if(window.__APARAT_NOTAS_OK__) return; window.__APARAT_NOTAS_OK__=1;

  var ST_OK='Emitida', ORIGEM='Ficha do Cliente';
  var cache=[], tCache=0, ocupado=false, assPainel='', assCli='';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} }
  function num(v){ v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(v.indexOf(',')>-1) v=v.replace(/\./g,'').replace(',','.'); return parseFloat(v)||0; }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function dataBR(v){ var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2]+'/'+m[1] : String(v||''); }
  function ehAdmin(){
    try{ var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL; return true; }catch(e){ return false; }
  }
  function noPainel(){ var p=el('view-painel'); return !!(p && p.classList.contains('active') && ehAdmin()); }
  /* a area do cliente usa style.display, NUNCA a classe .active */
  function noCliente(){ var v=el('view-cliente'); return !!(v && v.style.display!=='none' && v.offsetParent!==null); }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }

  function daAparat(n){ return String(n.tipo||'')==='Envio' || (String(n.origem||'')!=='cliente' && String(n.tipo||'')!=='Pedido' && String(n.tipo||'')!=='Recebimento'); }
  function concluida(n){ var s=String(n.status||''); return s===ST_OK || /fechad|conclu/i.test(s); }
  function arquivo(n){ return n.arquivoData||n.arquivoUrl||''; }
  function nomeArq(n){ return String(n.arquivo||n.arquivoNome||('nota_'+(n.numero||n.id)+'.pdf')).replace(/[\\\/:*?"<>|]+/g,'-'); }

  async function carregar(forcar){
    if(!forcar && tCache && (Date.now()-tCache)<20000) return cache;
    var v=[];
    try{
      if(typeof dbGetAll==='function') v=await dbGetAll('notas');
      else { var d=db(); if(d){ var s=await d.collection('notas').get(); s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; v.push(o); }); } }
    }catch(e){ v=cache; }
    cache=v||[]; tCache=Date.now(); return cache;
  }
  function local(id, dados){
    for(var i=0;i<cache.length;i++){ if(String(cache[i].id)===String(id)){ for(var k in dados) cache[i][k]=dados[k]; return; } }
  }
  /* IMPORTANTE: a tabela antiga (carregarNotas) so entende /fechad/i, e o modulo __APARAT_NF2__
     entende /fechad/i OU 'Emitida'. Entao a nota do escritorio fecha como 'Fechada' (as duas
     telas concordam) e o pedido do cliente fecha como 'Emitida' (passo final do fluxo do NF2). */
  function statusFinal(n){ return String(n.tipo||'')==='Pedido' ? ST_OK : 'Fechada'; }
  async function concluir(n){
    var d=db(); if(!d){ aviso('Sem conexão com a nuvem.','warn'); return false; }
    var dados={status:statusFinal(n), emitidaEm:agoraBR(), concluidoPor:ORIGEM, atualizadoEm:new Date().toISOString()};
    try{
      await d.collection('notas').doc(String(n.id)).set(dados,{merge:true}); local(n.id,dados);
      /* se a nota é da competência do checklist, tenta marcar a tarefa do mês junto */
      try{
        var F=window.__FICHA__;
        if(F && F.compAtiva && F.marcarObrig && n.cliente){
          var cp=compDaNota(n);
          if(cp && cp===F.compAtiva()) await F.marcarObrig(n.cliente, cp, 'NFE');
        }
      }catch(e){}
      return true;
    }catch(e){ aviso('Não consegui concluir: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  async function reabrir(n){
    var d=db(); if(!d) return false;
    try{ await d.collection('notas').doc(String(n.id)).set({status:'Aberta', emitidaEm:'', concluidoPor:'', atualizadoEm:new Date().toISOString()},{merge:true});
      local(n.id,{status:'Aberta', emitidaEm:'', concluidoPor:''}); return true; }
    catch(e){ aviso('Não consegui reabrir: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  function compDaNota(n){
    var s=String(n.data||n.dataDesejada||'');
    var m=s.match(/^(\d{4})-(\d{2})/); if(m) return m[1]+'-'+m[2];
    m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if(m) return m[3]+'-'+m[2];
    return null;
  }
  async function baixar(n){
    var src=arquivo(n); if(!src){ aviso('Esta nota não tem arquivo anexado.','info'); return; }
    try{
      var b=await (await fetch(src)).blob(), url=URL.createObjectURL(b);
      var a=document.createElement('a'); a.href=url; a.download=nomeArq(n); a.setAttribute('data-bx','1'); a.style.display='none';
      document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); },4000);
    }catch(e){ try{ window.open(src,'_blank'); }catch(e2){ aviso('Não consegui abrir o arquivo.','warn'); } }
  }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-nok-css')) return;
    var s=document.createElement('style'); s.id='ap-nok-css';
    s.textContent=
       '#nok-box{margin:0 0 14px}'
      +'#nok-box .nok-tit{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:13.5px;font-weight:800;margin-bottom:8px}'
      +'#nok-box .nok-c{font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px}'
      +'#nok-box .nok-c.lar{background:rgba(255,138,0,.13);color:#ff9d2e;border:1px solid #ff8a00}'
      +'#nok-box .nok-c.ok{background:rgba(14,159,110,.16);color:#2fd29b}'
      +'body.ap-esc-claro #nok-box .nok-c.lar{color:#c25e00}body.ap-esc-claro #nok-box .nok-c.ok{color:#0e9f6e}'
      +'#nok-box .nok-l{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:11px 12px;border-radius:14px;margin-bottom:7px;background:var(--card);border:1px solid var(--border)}'
      +'#nok-box .nok-l.ab{border:1.5px solid #ff8a00;background:rgba(255,138,0,.10)}'
      +'#nok-box .nok-l.ok{background:rgba(14,159,110,.10);border-color:rgba(14,159,110,.4)}'
      +'#nok-box .nok-i{flex:1;min-width:190px}'
      +'#nok-box .nok-i b{display:block;font-size:13.5px;font-weight:700;word-break:break-word}'
      +'#nok-box .nok-i small{font-size:12px;color:var(--cinza);word-break:break-word}'
      +'#nok-box .nok-b{font:inherit;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}'
      +'#nok-box .nok-b.ok{background:#0e9f6e;border-color:#0e9f6e;color:#fff}'
      +'#nok-box .nok-b:disabled{opacity:.55;cursor:wait}'
      +'#nok-box .nok-v{padding:14px 4px;font-size:13px;color:var(--cinza)}'
      +'.nok-sec{font-size:10px;color:var(--cinza);text-transform:uppercase;letter-spacing:.09em;font-weight:800;margin:14px 0 6px}'
      +'.nok-dl{font:inherit;font-size:11px;font-weight:800;padding:6px 11px;border-radius:9px;border:1px solid var(--azul);background:transparent;color:var(--azul-light);cursor:pointer;white-space:nowrap}'
      +'body.ap-esc-claro .nok-dl{color:var(--azul)}';
    document.head.appendChild(s);
  }

  /* ================= painel do escritorio ================= */
  function painel(){
    var pg=el('pp-notas'); if(!pg || !pg.classList.contains('active')) return;
    var minhas=cache.filter(daAparat), ab=minhas.filter(function(n){ return !concluida(n); });
    var ass=minhas.map(function(n){ return n.id+':'+(concluida(n)?1:0); }).join(',');
    var box=el('nok-box');
    if(!box){
      var ref=pg.querySelector('.sec'); /* "🧾 Notas Fiscais Registradas" */
      if(!ref || !ref.parentNode) return;
      box=document.createElement('div'); box.id='nok-box'; ref.parentNode.insertBefore(box, ref);
    }
    if(ass===assPainel) return; assPainel=ass;
    var h='<div class="nok-tit">\u{1F9FE} Emitidas pela APARAT '
      +(ab.length ? '<span class="nok-c lar">'+ab.length+' em aberto</span>' : '<span class="nok-c ok">tudo concluído</span>')
      +'<span style="font-size:11.5px;font-weight:400;color:var(--cinza)">só a nota concluída aparece para o cliente baixar</span></div>';
    if(!minhas.length) h+='<div class="nok-v">Nenhuma nota emitida pelo escritório ainda.</div>';
    minhas.slice().sort(function(a,b){ return (concluida(a)?1:0)-(concluida(b)?1:0); }).slice(0,40).forEach(function(n){
      var ok=concluida(n), i=cache.indexOf(n);
      var sub=esc(String(n.cliente||''))+(n.data?(' · '+esc(dataBR(n.data))):'')+(num(n.valor)?(' · '+moeda(num(n.valor))):'')
             +(arquivo(n)?'':' · sem arquivo anexado')+(ok&&n.emitidaEm?(' · concluída em '+esc(n.emitidaEm)):'');
      h+='<div class="nok-l '+(ok?'ok':'ab')+'"><div class="nok-i"><b>'+(ok?'\u{2714} ':'')+esc(String(n.tipo==='Envio'?'Nota':n.tipo||'Nota'))+(n.numero?(' nº '+esc(n.numero)):'')+' — '+esc(String(n.descricao||'sem descrição').slice(0,70))+'</b><small>'+sub+'</small></div>'
        +(arquivo(n)?'<button class="nok-b" data-nok-dl="'+i+'">\u{2B07}\u{FE0F} Baixar</button>':'')
        +(ok ? '<button class="nok-b" data-nok-re="'+i+'">\u{21A9}\u{FE0F} Reabrir</button><span class="nok-c ok">Concluída</span>'
             : '<button class="nok-b ok" data-nok-ok="'+i+'">\u{2714} Concluir</button><span class="nok-c lar">Aberta</span>')+'</div>';
    });
    box.innerHTML=h;
    [].forEach.call(box.querySelectorAll('[data-nok-ok]'),function(b){ b.onclick=async function(){
      if(b.disabled) return; b.disabled=true; b.textContent='Gravando...';
      var n=cache[Number(b.getAttribute('data-nok-ok'))];
      if(await concluir(n)) aviso('\u{2705} Nota concluída e liberada para o cliente baixar.','ok');
      assPainel=''; painel(); try{ if(typeof carregarNotas==='function') carregarNotas(); }catch(e){}
      try{ var F=window.__FICHA__; if(F && F.carregar){ await F.carregar(true); F.render(); } }catch(e){}
    }; });
    [].forEach.call(box.querySelectorAll('[data-nok-re]'),function(b){ b.onclick=async function(){
      if(b.disabled) return; b.disabled=true;
      await reabrir(cache[Number(b.getAttribute('data-nok-re'))]);
      assPainel=''; painel(); try{ if(typeof carregarNotas==='function') carregarNotas(); }catch(e){}
    }; });
    [].forEach.call(box.querySelectorAll('[data-nok-dl]'),function(b){ b.onclick=function(){ baixar(cache[Number(b.getAttribute('data-nok-dl'))]); }; });
  }

  /* ================= app do cliente ================= */
  function cliente(){
    var alvo=el('cli-notas'); if(!alvo || !noCliente()) return;
    var nome=clienteAtual(); if(!nome) return;
    var minhas=cache.filter(function(n){ return String(n.cliente||'')===nome; });
    var emit=minhas.filter(function(n){ return daAparat(n) && concluida(n); }).sort(function(a,b){ return String(b.data||'').localeCompare(String(a.data||'')); });
    var peds=minhas.filter(function(n){ return String(n.tipo||'')==='Pedido'; });
    var recs=minhas.filter(function(n){ return String(n.tipo||'')==='Recebimento' || String(n.origem||'')==='cliente' && String(n.tipo||'')!=='Pedido'; });
    var ass=nome+'|'+emit.map(function(n){return n.id;}).join(',')+'|'+peds.length+'|'+recs.length;
    if(ass===assCli && alvo.getAttribute('data-nok')==='1') return;
    assCli=ass; alvo.setAttribute('data-nok','1');

    var h='<div class="nok-sec">\u{1F9FE} Emitidas pela APARAT</div>';
    if(!emit.length) h+='<div style="color:var(--cinza);font-size:11.5px;padding:4px 0">Nenhuma nota emitida ainda.</div>';
    emit.forEach(function(n){
      var i=cache.indexOf(n);
      h+='<div class="lcard"><div class="lcico lc-pu">\u{1F9FE}</div><div class="lcinfo"><strong>Nota '+(n.numero?('nº '+esc(n.numero)):'')+'</strong>'
        +'<span>'+(n.data?esc(dataBR(n.data)):'')+(num(n.valor)?(' · '+moeda(num(n.valor))):'')+(n.descricao?(' · '+esc(String(n.descricao).slice(0,60))):'')+'</span></div>'
        +(arquivo(n)?'<button class="nok-dl" data-nok-cdl="'+i+'">\u{2B07}\u{FE0F} Baixar</button>':'<span class="tag tn">sem arquivo</span>')+'</div>';
    });
    h+='<div class="nok-sec">\u{1F4E4} Meus pedidos de emissão</div>';
    if(!peds.length) h+='<div style="color:var(--cinza);font-size:11.5px;padding:4px 0">Nenhum pedido.</div>';
    peds.slice().reverse().forEach(function(n){
      var ok=concluida(n);
      h+='<div class="lcard"><div class="lcico lc-az">\u{1F4E4}</div><div class="lcinfo"><strong>'+esc(String(n.descricao||'Pedido de nota').slice(0,50))+'</strong>'
        +'<span>'+esc(String(n.data||''))+(num(n.valor)?(' · '+moeda(num(n.valor))):'')+'</span></div>'
        +'<span class="tag '+(ok?'tp':'tn')+'">'+(ok?'\u{2714} Emitida':esc(String(n.status||'Em análise')))+'</span></div>';
    });
    h+='<div class="nok-sec">\u{1F4E5} Notas que eu enviei</div>';
    if(!recs.length) h+='<div style="color:var(--cinza);font-size:11.5px;padding:4px 0">Você ainda não enviou notas.</div>';
    recs.slice().reverse().forEach(function(n){
      h+='<div class="lcard"><div class="lcico lc-vd">\u{1F4E5}</div><div class="lcinfo"><strong>'+esc(String(n.descricao||('Nota '+(n.numero||''))).slice(0,50))+'</strong>'
        +'<span>'+esc(String(n.data||''))+'</span></div><span class="tag tp">Recebida</span></div>';
    });
    alvo.innerHTML=h;
    [].forEach.call(alvo.querySelectorAll('[data-nok-cdl]'),function(b){ b.onclick=function(){ baixar(cache[Number(b.getAttribute('data-nok-cdl'))]); }; });
  }

  /* ================= relogio ================= */
  var voltas=0;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css();
      var painelOn=noPainel(), clienteOn=noCliente();
      if(painelOn || clienteOn){
        if(voltas===1 || voltas%9===0) await carregar(false);
        if(painelOn) painel();
        if(clienteOn) cliente();
      }
    }catch(e){}
    ocupado=false;
  }
  [1500,3600,7000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,4000);

  window.__NOTAS_OK__={carregar:carregar, concluir:concluir, reabrir:reabrir, painel:painel, cliente:cliente,
                       daAparat:daAparat, concluida:concluida, statusFinal:statusFinal, estado:function(){ return cache; }};
})();
