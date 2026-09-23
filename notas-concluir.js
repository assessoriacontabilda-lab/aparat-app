/* APARAT - NOTAS FISCAIS DO ESCRITORIO: CONCLUIR + BAIXAR (v4, 22/09/2026)
   v4: ignora as notas com direcao 'entrada' ou 'honorario' (sub-abas do nf-entrada.js).
   CORRECAO DA v1: a v1 lia a colecao 'notas', que no Firebase do Daniel esta VAZIA (0 documentos).
   As notas emitidas pelo escritorio moram na colecao 'solicitacoes', com servico 'Emitir nota fiscal':
     o cliente pede (status 'Nova', campos valor/tomador/mensagem);
     o Daniel emite e ANEXA o PDF da NF-e na resposta -> status 'Respondida',
       campos resposta, respostaArquivoNome, respostaArquivoData, respondidoEm;
     concluir -> status 'Concluida' + concluidoEm (o mesmo que a funcao resolverSolicitacao faz).
   ESTE MODULO:
   1) PAINEL, aba Notas Fiscais: bloco "Notas emitidas pela APARAT" em cima da tabela, juntando as duas
      fontes (solicitacoes de NF + a colecao 'notas', caso ele use o formulario "Registrar Nota Fiscal").
      Pedido sem nota anexada = laranja, com atalho para responder na aba Solicitacoes.
      Nota anexada e ainda nao concluida = laranja com o botao "Concluir" (era isso que nao dava para fazer).
      Concluida = verde, com "Baixar" e "Reabrir".
   2) APP DO CLIENTE: #cli-notas ganha dois blocos - "Emitidas pela APARAT" (as que tem o PDF anexado,
      com botao Baixar de verdade, porque link target=_blank nao baixa no app instalado) e
      "Meus pedidos de emissao".
   Nada e apagado e nenhuma colecao nova e criada. */
;(function(){
  if(window.__APARAT_NOTAS_OK__) return; window.__APARAT_NOTAS_OK__=4;

  var ORIGEM='Ficha do Cliente';
  var cache=[], tCache=0, ocupado=false, assPainel='', assCli='';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} }
  /* O Daniel digita o valor de dois jeitos: "1290.00" (ponto = centavos) e "1.060" (ponto = milhar).
     Regra: se tem virgula, ela e o decimal e os pontos sao milhar. Se so tem ponto, olha quantos
     digitos vem depois do ULTIMO ponto: exatamente 3 => milhar (1.060 = mil e sessenta);
     1 ou 2 digitos => centavos (1290.00 = mil duzentos e noventa). */
  function num(v){
    v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(!v) return 0;
    if(v.indexOf(',')>-1) return parseFloat(v.replace(/\./g,'').replace(',','.'))||0;
    var i=v.lastIndexOf('.');
    if(i>-1 && /^\d{3}$/.test(v.slice(i+1))) return parseFloat(v.replace(/\./g,''))||0;
    return parseFloat(v)||0;
  }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function curto(d){ var m=String(d||'').match(/^(\d{2}\/\d{2}\/\d{4})/); if(m) return m[1];
    m=String(d||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2]+'/'+m[1] : String(d||''); }
  function ehAdmin(){
    try{ var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL; return true; }catch(e){ return false; }
  }
  function noPainel(){ var p=el('view-painel'); return !!(p && p.classList.contains('active') && ehAdmin()); }
  /* a area do cliente usa style.display, NUNCA a classe .active */
  function noCliente(){ var v=el('view-cliente'); return !!(v && v.style.display!=='none' && v.offsetParent!==null); }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }

  function ehPedidoNF(o){ return /nota\s*fiscal|nfe|nf-e|emitir\s*nota/i.test(String(o.servico||'')+' '+String(o.mensagem||'')); }
  function concluidaSol(o){ return /conclu|resolv/i.test(String(o.status||'')); }
  function nomeSeguro(n){ return String(n||'nota.pdf').replace(/[\\\/:*?"<>|]+/g,'-'); }

  /* --------- junta as duas fontes numa lista so --------- */
  async function carregar(forcar){
    if(!forcar && tCache && (Date.now()-tCache)<20000) return cache;
    var d=db(), v=[];
    if(d){
      try{
        var s=await d.collection('solicitacoes').get();
        s.forEach(function(x){
          var o=x.data()||{}; if(!ehPedidoNF(o)) return;
          v.push({ fonte:'sol', id:x.id, cliente:o.cliente||'', valor:o.valor||'', tomador:o.tomador||'',
                   pedidoEm:o.data||o.criadoEm||'', descricao:o.mensagem||'', numero:'',
                   arqNome:o.respostaArquivoNome||'', arqData:o.respostaArquivoData||'',
                   emitida:!!o.respostaArquivoData, concluida:concluidaSol(o),
                   quando:o.concluidoEm||o.respondidoEm||'', status:o.status||'Nova' });
        });
      }catch(e){}
      try{
        var n=await d.collection('notas').get();
        n.forEach(function(x){
          var o=x.data()||{};
          if(o.direcao==='entrada' || o.direcao==='honorario') return; /* sub-abas do nf-entrada.js */
          if(String(o.origem||'')==='cliente' || String(o.tipo||'')==='Recebimento' || String(o.tipo||'')==='Pedido') return;
          v.push({ fonte:'nota', id:x.id, cliente:o.cliente||'', valor:o.valor||'', tomador:'',
                   pedidoEm:o.data||'', descricao:o.descricao||'', numero:o.numero||'',
                   arqNome:o.arquivoNome||o.arquivo||('nota_'+(o.numero||x.id)+'.pdf'),
                   arqData:o.arquivoData||o.arquivoUrl||'',
                   emitida:true, concluida:/fechad|conclu|emitid/i.test(String(o.status||'')),
                   quando:o.emitidaEm||'', status:o.status||'Aberta' });
        });
      }catch(e){}
      /* 3a fonte: o Daniel tambem lanca a NF pela aba Guias, com tipo "NF-e Emitida" e
         status "Emitida pelo Escritorio", com o PDF anexado e ja espelhado no Drive.
         Essas ja nascem emitidas e concluidas - so precisam ficar disponiveis para baixar. */
      try{
        var o2=await d.collection('obrigacoes').get();
        o2.forEach(function(x){
          var o=x.data()||{};
          if(!/nf-?e|nota\s*fiscal/i.test(String(o.tipo||'')) && !/emitid/i.test(String(o.status||''))) return;
          v.push({ fonte:'obr', id:x.id, cliente:o.cliente||'', valor:o.valor||'', tomador:'',
                   pedidoEm:'', comp:o.competencia||'', descricao:o.tipo||'NF-e emitida', numero:'',
                   arqNome:o.arquivoNome||('nota_'+x.id+'.pdf'),
                   arqData:o.arquivoData||o.arquivoUrl||'', driveUrl:o.driveUrl||'',
                   emitida:true, concluida:true, quando:'', status:o.status||'Emitida' });
        });
      }catch(e){}
    }
    v.sort(function(a,b){ return (a.concluida?1:0)-(b.concluida?1:0); });
    cache=v; tCache=Date.now(); return cache;
  }
  function trocaLocal(it, dados){ for(var k in dados) it[k]=dados[k]; }

  async function concluir(it){
    var d=db(); if(!d){ aviso('Sem conexão com a nuvem.','warn'); return false; }
    if(it.fonte==='obr') return true; /* NF-e lancada na aba Guias ja nasce concluida */
    try{
      if(it.fonte==='sol'){
        await d.collection('solicitacoes').doc(String(it.id)).update({status:'Concluída', concluidoEm:agoraBR()});
        trocaLocal(it,{concluida:true, status:'Concluída', quando:agoraBR()});
        try{ if(typeof carregarSolicitacoes==='function') carregarSolicitacoes(); }catch(e){}
      } else {
        await d.collection('notas').doc(String(it.id)).set({status:'Fechada', emitidaEm:agoraBR(), concluidoPor:ORIGEM},{merge:true});
        trocaLocal(it,{concluida:true, status:'Fechada', quando:agoraBR()});
        try{ if(typeof carregarNotas==='function') carregarNotas(); }catch(e){}
      }
      return true;
    }catch(e){ aviso('Não consegui concluir: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  async function reabrir(it){
    var d=db(); if(!d) return false;
    if(it.fonte==='obr') return true;
    try{
      if(it.fonte==='sol'){
        await d.collection('solicitacoes').doc(String(it.id)).update({status: it.emitida?'Respondida':'Nova', concluidoEm:''});
        trocaLocal(it,{concluida:false, status: it.emitida?'Respondida':'Nova'});
        try{ if(typeof carregarSolicitacoes==='function') carregarSolicitacoes(); }catch(e){}
      } else {
        await d.collection('notas').doc(String(it.id)).set({status:'Aberta', emitidaEm:'', concluidoPor:''},{merge:true});
        trocaLocal(it,{concluida:false, status:'Aberta'});
        try{ if(typeof carregarNotas==='function') carregarNotas(); }catch(e){}
      }
      return true;
    }catch(e){ aviso('Não consegui reabrir: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  async function baixar(it){
    if(!it.arqData){ aviso('Esta nota não tem o arquivo anexado.','info'); return; }
    try{
      var b=await (await fetch(it.arqData)).blob(), url=URL.createObjectURL(b);
      var a=document.createElement('a'); a.href=url; a.download=nomeSeguro(it.arqNome); a.style.display='none';
      document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); },4000);
      aviso('\u{2B07}\u{FE0F} Baixando '+nomeSeguro(it.arqNome),'info');
    }catch(e){ try{ window.open(it.arqData,'_blank'); }catch(e2){ aviso('Não consegui abrir o arquivo.','warn'); } }
  }
  function irParaSolicitacoes(){
    try{
      var it=[].slice.call(document.querySelectorAll('#view-painel .sidebar .nav .nav-item'))
        .filter(function(x){ return /Solicita/i.test(x.textContent||''); })[0];
      if(it) it.click();
    }catch(e){}
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
      +'#nok-box .nok-i small{display:block;font-size:12px;color:var(--cinza);word-break:break-word}'
      +'#nok-box .nok-b{font:inherit;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}'
      +'#nok-box .nok-b.ok{background:#0e9f6e;border-color:#0e9f6e;color:#fff}'
      +'#nok-box .nok-b:disabled{opacity:.55;cursor:wait}'
      +'#nok-box .nok-v{padding:14px 4px;font-size:13px;color:var(--cinza)}'
      +'.nok-sec{font-size:10px;color:var(--cinza);text-transform:uppercase;letter-spacing:.09em;font-weight:800;margin:14px 0 6px}'
      +'.nok-dl{font:inherit;font-size:11.5px;font-weight:800;padding:7px 12px;border-radius:9px;border:1px solid var(--azul);background:transparent;color:var(--azul-light);cursor:pointer;white-space:nowrap}'
      +'body.ap-esc-claro .nok-dl{color:var(--azul)}';
    document.head.appendChild(s);
  }

  /* ================= painel do escritorio ================= */
  function painel(){
    var pg=el('pp-notas'); if(!pg || !pg.classList.contains('active')) return;
    var abertas=cache.filter(function(n){ return !n.concluida; });
    var ass=cache.map(function(n){ return n.id+':'+(n.concluida?1:0)+(n.emitida?'e':''); }).join(',');
    var box=el('nok-box');
    if(!box){
      var ref=pg.querySelector('.sec'); /* "Notas Fiscais Registradas" */
      if(!ref || !ref.parentNode) return;
      box=document.createElement('div'); box.id='nok-box'; ref.parentNode.insertBefore(box, ref);
    }
    if(ass===assPainel) return; assPainel=ass;

    var h='<div class="nok-tit">\u{1F9FE} Notas emitidas pela APARAT '
      +(abertas.length ? '<span class="nok-c lar">'+abertas.length+' em aberto</span>' : '<span class="nok-c ok">tudo concluído</span>')
      +'<span style="font-size:11.5px;font-weight:400;color:var(--cinza)">vem dos pedidos de nota dos clientes · o cliente baixa a nota no app dele</span></div>';
    if(!cache.length) h+='<div class="nok-v">Nenhum pedido de emissão de nota fiscal até agora.</div>';
    cache.slice(0,60).forEach(function(n,i){
      var det=[]; if(n.cliente) det.push(esc(n.cliente));
      if(num(n.valor)) det.push(moeda(num(n.valor)));
      if(n.tomador) det.push('tomador: '+esc(n.tomador));
      if(n.comp) det.push('competência '+esc(n.comp));
      if(n.pedidoEm) det.push('pedido em '+esc(curto(n.pedidoEm)));
      if(n.concluida && n.quando) det.push('concluída em '+esc(curto(n.quando)));
      var titulo = n.emitida ? ('Nota fiscal emitida'+(n.numero?(' nº '+esc(n.numero)):''))
                             : 'Pedido de nota — ainda sem a nota anexada';
      h+='<div class="nok-l '+(n.concluida?'ok':'ab')+'"><div class="nok-i"><b>'+(n.concluida?'\u{2714} ':'')+titulo+'</b>'
        +'<small>'+det.join(' · ')+'</small>'
        +(n.arqNome?('<small style="font-size:11px">\u{1F4CE} '+esc(n.arqNome)+'</small>'):'')+'</div>'
        +(n.arqData?'<button class="nok-b" data-nok-dl="'+i+'">\u{2B07}\u{FE0F} Baixar</button>':'')
        +(!n.emitida ? '<button class="nok-b" data-nok-ir="'+i+'">\u{1F4E8} Responder e anexar</button><span class="nok-c lar">Sem nota</span>'
          : (n.concluida ? '<button class="nok-b" data-nok-re="'+i+'">\u{21A9}\u{FE0F} Reabrir</button><span class="nok-c ok">Concluída</span>'
                         : '<button class="nok-b ok" data-nok-ok="'+i+'">\u{2714} Concluir</button><span class="nok-c lar">A concluir</span>'))
        +'</div>';
    });
    box.innerHTML=h;
    [].forEach.call(box.querySelectorAll('[data-nok-ok]'),function(b){ b.onclick=async function(){
      if(b.disabled) return; b.disabled=true; b.textContent='Gravando...';
      if(await concluir(cache[Number(b.getAttribute('data-nok-ok'))])) aviso('\u{2705} Nota concluída.','ok');
      assPainel=''; painel();
    }; });
    [].forEach.call(box.querySelectorAll('[data-nok-re]'),function(b){ b.onclick=async function(){
      if(b.disabled) return; b.disabled=true;
      await reabrir(cache[Number(b.getAttribute('data-nok-re'))]);
      assPainel=''; painel();
    }; });
    [].forEach.call(box.querySelectorAll('[data-nok-dl]'),function(b){ b.onclick=function(){ baixar(cache[Number(b.getAttribute('data-nok-dl'))]); }; });
    [].forEach.call(box.querySelectorAll('[data-nok-ir]'),function(b){ b.onclick=function(){ irParaSolicitacoes(); }; });
  }

  /* ================= app do cliente ================= */
  function cliente(){
    var alvo=el('cli-notas'); if(!alvo || !noCliente()) return;
    var nome=clienteAtual(); if(!nome) return;
    var minhas=cache.filter(function(n){ return String(n.cliente||'')===nome; });
    var emit=minhas.filter(function(n){ return n.emitida; });
    var peds=minhas.filter(function(n){ return !n.emitida; });
    var ass=nome+'|'+emit.map(function(n){return n.id;}).join(',')+'|'+peds.length;
    if(ass===assCli && alvo.getAttribute('data-nok')==='1') return;
    assCli=ass; alvo.setAttribute('data-nok','1');

    var h='<div class="nok-sec">\u{1F9FE} Emitidas pela APARAT</div>';
    if(!emit.length) h+='<div style="color:var(--cinza);font-size:11.5px;padding:4px 0">Nenhuma nota emitida ainda.</div>';
    emit.forEach(function(n){
      var i=cache.indexOf(n), det=[];
      if(num(n.valor)) det.push(moeda(num(n.valor)));
      if(n.tomador) det.push(esc(n.tomador));
      if(n.comp) det.push('competência '+esc(n.comp));
      if(n.pedidoEm) det.push(esc(curto(n.pedidoEm)));
      h+='<div class="lcard"><div class="lcico lc-pu">\u{1F9FE}</div><div class="lcinfo"><strong>Nota fiscal</strong>'
        +'<span>'+det.join(' · ')+'</span></div>'
        +'<button class="nok-dl" data-nok-cdl="'+i+'">\u{2B07}\u{FE0F} Baixar</button></div>';
    });
    h+='<div class="nok-sec">\u{1F4E4} Meus pedidos de emissão</div>';
    if(!peds.length) h+='<div style="color:var(--cinza);font-size:11.5px;padding:4px 0">Nenhum pedido aguardando.</div>';
    peds.forEach(function(n){
      h+='<div class="lcard"><div class="lcico lc-az">\u{1F4E4}</div><div class="lcinfo"><strong>'+esc(String(n.descricao||'Pedido de nota fiscal').slice(0,50))+'</strong>'
        +'<span>'+(num(n.valor)?(moeda(num(n.valor))+' · '):'')+esc(curto(n.pedidoEm))+'</span></div>'
        +'<span class="tag tn">'+esc(n.status||'Em análise')+'</span></div>';
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

  window.__NOTAS_OK__={carregar:carregar, concluir:concluir, reabrir:reabrir, baixar:baixar,
                       painel:painel, cliente:cliente, ehPedidoNF:ehPedidoNF, estado:function(){ return cache; }};
})();
