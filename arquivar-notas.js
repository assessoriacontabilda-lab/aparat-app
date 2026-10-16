/* APARAT - ARQUIVAR NOTAS DO MES (v3, 15/10/2026)
   v3: a janela espera a lista de notas carregar antes de mostrar o resumo (antes mostrava 0 se clicasse rapido).
   v2: so estilo - o CSS geral do app esticava a caixinha do modal e os campos da aba Arquivados.
   O que faz:
   1) PAINEL, aba Notas Fiscais: botao "Arquivar mes" no bloco "Notas emitidas pela APARAT".
      Escolhe o mes (padrao: mes anterior), mostra o resumo (quantas notas, soma, quantas ficam
      por estarem pendentes) e grava {arquivado:true, arquivadoEm, arquivadoMes} em cada nota
      CONCLUIDA e COM PDF daquele mes - na colecao de origem (solicitacoes / notas / obrigacoes).
      NADA e apagado. O faturamento mora em outra colecao (faturamento) e nao e tocado.
   2) PAINEL, menu lateral: aba nova "Arquivados" (#pp-arquivados). So busca no Firebase quando
      e aberta (where arquivado==true), agrupa por mes, com Baixar e Desarquivar.
   3) APP DO CLIENTE: no fim de #cli-notas, um bloco fechado "Notas arquivadas" que so carrega ao
      tocar (where cliente==eu e arquivado==true), com botao Baixar.
   4) Esconde as arquivadas das listas do dia a dia: notas-concluir.js v5 ja pula o.arquivado;
      aqui embrulhamos dbGetAll (tabela Solicitacoes do painel) e getMine (lista do cliente).
   Depende de notas-concluir.js >= v5 (que pula os documentos com arquivado=true). */
;(function(){
  if(window.__APARAT_ARQ__) return; window.__APARAT_ARQ__=1;

  var COL={sol:'solicitacoes', nota:'notas', obr:'obrigacoes'};
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var arq=[], tArq=0, carregandoArq=false, filtroAno='', filtroCli='';
  var cliArq=null, cliArqNome='', cliCarregando=false;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} try{ console.log('[arq]',m); }catch(e){} }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  /* mesma regra de valor do notas-concluir.js: "1.060" = mil e sessenta, "1290.00" = mil duzentos e noventa */
  function num(v){
    v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(!v) return 0;
    if(v.indexOf(',')>-1) return parseFloat(v.replace(/\./g,'').replace(',','.'))||0;
    var i=v.lastIndexOf('.');
    if(i>-1 && /^\d{3}$/.test(v.slice(i+1))) return parseFloat(v.replace(/\./g,''))||0;
    return parseFloat(v)||0;
  }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function curto(d){ var m=String(d||'').match(/(\d{2}\/\d{2}\/\d{4})/); if(m) return m[1];
    m=String(d||'').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2]+'/'+m[1] : String(d||''); }
  /* descobre o mes "AAAA-MM" de qualquer data que o app grava: "dd/mm/aaaa, hh:mm", "aaaa-mm-dd", "mm/aaaa", "aaaa-mm" */
  function mesDeData(s){
    s=String(s||''); var m;
    if((m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/))) return m[3]+'-'+m[2];
    if((m=s.match(/(\d{4})-(\d{2})/))) return m[1]+'-'+m[2];
    if((m=s.match(/^\s*(\d{2})\/(\d{4})\s*$/))) return m[2]+'-'+m[1];
    return '';
  }
  /* mes de referencia da nota: competencia (NF-e da aba Guias) > data da conclusao > data do pedido */
  function mesDe(n){ return mesDeData(n.comp) || mesDeData(n.quando) || mesDeData(n.pedidoEm) || ''; }
  function nomeMes(am){ var p=String(am||'').split('-'); if(p.length<2) return am||''; var i=parseInt(p[1],10)-1; return (MESES[i]||p[1])+'/'+p[0]; }
  function nomeMesCap(am){ var s=nomeMes(am); return s.charAt(0).toUpperCase()+s.slice(1); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL; return true; }catch(e){ return false; } }
  function noPainel(){ var p=el('view-painel'); return !!(p && p.classList.contains('active') && ehAdmin()); }
  /* a area do cliente usa style.display, NUNCA a classe .active */
  function noCliente(){ var v=el('view-cliente'); return !!(v && v.style.display!=='none' && v.offsetParent!==null); }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }
  function NOK(){ return window.__NOTAS_OK__||null; }
  function mesAtual(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2); }
  function mesAnterior(){ var d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2); }
  function ultimosMeses(n){ var v=[], d=new Date(); d.setDate(1); for(var i=0;i<n;i++){ v.push(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)); d.setMonth(d.getMonth()-1); } return v; }

  /* ================= 4) esconder arquivadas das listas antigas ================= */
  function embrulhar(){
    try{
      if(typeof window.dbGetAll==='function' && !window.dbGetAll.__arq){
        var o1=window.dbGetAll;
        var w1=async function(store){ var v=await o1.apply(this,arguments);
          if(store==='solicitacoes' || store==='notas' || store==='obrigacoes'){ try{ v=v.filter(function(x){ return !(x && x.arquivado===true); }); }catch(e){} }
          return v; };
        w1.__arq=1; window.dbGetAll=w1;
      }
      if(typeof window.getMine==='function' && !window.getMine.__arq){
        var o2=window.getMine;
        var w2=async function(col,nome){ var v=await o2.apply(this,arguments);
          if(col==='solicitacoes' || col==='notas' || col==='obrigacoes'){ try{ v=v.filter(function(x){ return !(x && x.arquivado===true); }); }catch(e){} }
          return v; };
        w2.__arq=1; window.getMine=w2;
      }
    }catch(e){}
  }

  /* ================= gravacao ================= */
  async function marcar(it, ligar, mes){
    var d=db(); if(!d) throw new Error('Sem conexão com a nuvem.');
    var col=COL[it.fonte]; if(!col) throw new Error('Origem desconhecida: '+it.fonte);
    var dados = ligar ? {arquivado:true, arquivadoEm:agoraBR(), arquivadoMes:mes||mesDe(it)||''}
                      : {arquivado:false, arquivadoEm:'', arquivadoMes:''};
    await d.collection(col).doc(String(it.id)).set(dados,{merge:true});
  }
  function candidatos(mes, incluirAnteriores){
    var n=NOK(); if(!n) return {ok:[],pend:[]};
    var todos=n.estado()||[], ok=[], pend=[];
    todos.forEach(function(x){
      var m=mesDe(x); if(!m) return;
      var bate = incluirAnteriores ? (m<=mes) : (m===mes);
      if(!bate) return;
      if(x.concluida && x.emitida && x.arqData) ok.push(x); else pend.push(x);
    });
    return {ok:ok, pend:pend};
  }
  async function arquivarMes(mes, incluirAnteriores){
    var c=candidatos(mes, incluirAnteriores), feitas=0, erros=0;
    for(var i=0;i<c.ok.length;i++){
      try{ await marcar(c.ok[i], true, mesDe(c.ok[i])||mes); feitas++; }catch(e){ erros++; }
    }
    try{ var n=NOK(); if(n){ await n.carregar(true); n.painel(); } }catch(e){}
    try{ if(typeof carregarSolicitacoes==='function') carregarSolicitacoes(); }catch(e){}
    tArq=0;
    return {feitas:feitas, erros:erros};
  }
  async function desarquivar(it){
    await marcar(it,false);
    arq=arq.filter(function(x){ return !(x.fonte===it.fonte && x.id===it.id); });
    try{ var n=NOK(); if(n){ await n.carregar(true); n.painel(); } }catch(e){}
    try{ if(typeof carregarSolicitacoes==='function') carregarSolicitacoes(); }catch(e){}
  }

  /* ================= leitura das arquivadas (so quando a aba abre) ================= */
  function item(fonte, id, o){
    if(fonte==='sol') return { fonte:'sol', id:id, cliente:o.cliente||'', valor:o.valor||'', tomador:o.tomador||'',
      pedidoEm:o.data||o.criadoEm||'', quando:o.concluidoEm||o.respondidoEm||'', comp:'',
      arqNome:o.respostaArquivoNome||'', arqData:o.respostaArquivoData||'', mes:o.arquivadoMes||'', arquivadoEm:o.arquivadoEm||'' };
    if(fonte==='nota') return { fonte:'nota', id:id, cliente:o.cliente||'', valor:o.valor||'', tomador:'', numero:o.numero||'',
      pedidoEm:o.data||'', quando:o.emitidaEm||'', comp:'',
      arqNome:o.arquivoNome||o.arquivo||('nota_'+(o.numero||id)+'.pdf'), arqData:o.arquivoData||o.arquivoUrl||'', mes:o.arquivadoMes||'', arquivadoEm:o.arquivadoEm||'' };
    return { fonte:'obr', id:id, cliente:o.cliente||'', valor:o.valor||'', tomador:'',
      pedidoEm:'', quando:'', comp:o.competencia||'', descricao:o.tipo||'NF-e emitida',
      arqNome:o.arquivoNome||('nota_'+id+'.pdf'), arqData:o.arquivoData||o.arquivoUrl||'', driveUrl:o.driveUrl||'', mes:o.arquivadoMes||'', arquivadoEm:o.arquivadoEm||'' };
  }
  async function lerArquivadas(cliente){
    var d=db(), v=[]; if(!d) return v;
    var fontes=[['sol','solicitacoes'],['nota','notas'],['obr','obrigacoes']];
    for(var i=0;i<fontes.length;i++){
      try{
        var q=d.collection(fontes[i][1]).where('arquivado','==',true);
        if(cliente) q=q.where('cliente','==',cliente);
        var s=await q.get();
        s.forEach(function(x){ var o=x.data()||{}; if(fontes[i][0]==='nota' && (o.direcao==='entrada'||o.direcao==='honorario')) return;
          var it=item(fontes[i][0], x.id, o); if(!it.mes) it.mes=mesDe(it); v.push(it); });
      }catch(e){}
    }
    v.sort(function(a,b){ return a.mes<b.mes?1:(a.mes>b.mes?-1:0); });
    return v;
  }
  async function baixar(it){
    var n=NOK(); if(n && n.baixar) return n.baixar(it);
    if(!it.arqData){ aviso('Esta nota não tem o arquivo anexado.','info'); return; }
    try{ var b=await (await fetch(it.arqData)).blob(), url=URL.createObjectURL(b), a=document.createElement('a');
      a.href=url; a.download=String(it.arqNome||'nota.pdf').replace(/[\\\/:*?"<>|]+/g,'-'); a.style.display='none'; document.body.appendChild(a); a.click();
      setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); },4000); }catch(e){ try{ window.open(it.arqData,'_blank'); }catch(e2){} }
  }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-arq-css')) return;
    var s=document.createElement('style'); s.id='ap-arq-css';
    s.textContent=
       '.arq-bt{font:inherit;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}'
      +'.arq-bt.esc{background:#0F1B33;border-color:#0F1B33;color:#fff}.arq-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'.arq-bt:disabled{opacity:.5;cursor:not-allowed}'
      +'#nok-box .nok-tit #arq-abrir{margin-left:auto}'
      +'#arq-fundo{position:fixed;inset:0;background:rgba(5,8,20,.62);display:flex;align-items:center;justify-content:center;padding:16px;z-index:99990}'
      +'#arq-modal{background:var(--card);color:inherit;border:1px solid var(--border);border-radius:18px;padding:20px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35)}'
      +'#arq-modal h4{margin:0 0 6px;font-size:15px}#arq-modal p{font-size:12.5px;color:var(--cinza);margin:0 0 12px}'
      +'#arq-modal select,#arq-modal label{font:inherit;font-size:13px}#arq-modal select{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card);color:inherit;width:100%}'
      +'#arq-modal .arq-res{background:rgba(51,85,255,.07);border:1px solid var(--border);border-radius:12px;padding:10px 12px;font-size:13px;margin:12px 0}'
      +'#arq-modal .arq-res div{display:flex;justify-content:space-between;gap:10px;padding:3px 0}'
      +'#arq-modal .arq-bts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}'
      +'#pp-arquivados .arq-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 12px}'
      +'#pp-arquivados .arq-top input,#pp-arquivados .arq-top select{font:inherit;font-size:13px;border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card);color:inherit}'
      +'#pp-arquivados .arq-info{font-size:12px;color:var(--cinza);margin-bottom:12px}'
      +'.arq-mes{border:1px solid var(--border);border-radius:14px;margin-bottom:10px;background:var(--card);overflow:hidden}'
      +'.arq-mes>summary{list-style:none;cursor:pointer;padding:12px 14px;font-size:13.5px;font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}'
      +'.arq-mes>summary::-webkit-details-marker{display:none}.arq-mes>summary small{color:var(--cinza);font-weight:500;font-size:12px}'
      +'.arq-l{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-top:1px dashed var(--border);font-size:13px}'
      +'.arq-l .arq-i{flex:1;min-width:180px}.arq-l .arq-i b{display:block;font-size:13px}.arq-l .arq-i small{display:block;font-size:11.5px;color:var(--cinza);word-break:break-word}'
      +'.arq-l .arq-ac{display:flex;gap:6px;flex-wrap:wrap}.arq-l .arq-bt{padding:6px 11px;font-size:12px}'
      +'.arq-chip{font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;background:rgba(102,116,140,.15);color:var(--cinza)}'
      +'.arq-vazio{padding:16px 6px;font-size:13px;color:var(--cinza)}'
      +'#arq-cli{margin-top:10px;border:1px solid var(--border);border-radius:14px;background:var(--card)}'
      +'#arq-cli>summary{list-style:none;cursor:pointer;padding:11px 12px;font-size:12.5px;font-weight:800;display:flex;justify-content:space-between;align-items:center}'
      +'#arq-cli>summary::-webkit-details-marker{display:none}#arq-cli>summary small{color:var(--cinza);font-weight:500;font-size:11px}'
      +'#arq-cli .lcard{margin:0 10px 8px}'
      +'#arq-modal label{justify-content:flex-start!important;text-align:left!important;width:auto!important}'
      +'#arq-modal input[type=checkbox]{width:16px!important;height:16px!important;min-width:0!important;flex:0 0 16px!important;margin:0!important;padding:0!important}'
      +'#pp-arquivados .arq-top input{flex:1 1 220px!important;width:auto!important;min-width:160px!important;margin:0!important}'
      +'#pp-arquivados .arq-top select,#pp-arquivados .arq-top .arq-bt{flex:0 0 auto!important;width:auto!important;margin:0!important}';
    document.head.appendChild(s);
  }

  /* ================= 1) botao + janela "Arquivar mes" ================= */
  function botao(){
    var box=el('nok-box'); if(!box) return;
    var tit=box.querySelector('.nok-tit'); if(!tit || el('arq-abrir')) return;
    var b=document.createElement('button'); b.className='arq-bt esc'; b.id='arq-abrir'; b.type='button';
    b.textContent='\u{1F4E6} Arquivar mês'; b.onclick=abrirModal; tit.appendChild(b);
  }
  function abrirModal(){
    if(el('arq-fundo')) return;
    var f=document.createElement('div'); f.id='arq-fundo';
    var ops=ultimosMeses(14).map(function(m){ return '<option value="'+m+'"'+(m===mesAnterior()?' selected':'')+'>'+esc(nomeMesCap(m))+'</option>'; }).join('');
    f.innerHTML='<div id="arq-modal"><h4>\u{1F4E6} Arquivar notas do mês</h4>'
      +'<p>As notas <b>concluídas e com PDF</b> do mês escolhido saem da lista e vão para a aba Arquivados. Nada é apagado: você e o cliente continuam baixando o PDF de lá. O Faturamento não muda.</p>'
      +'<select id="arq-mes">'+ops+'</select>'
      +'<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12.5px"><input type="checkbox" id="arq-ant"> Incluir também os meses anteriores a esse</label>'
      +'<div class="arq-res" id="arq-res"></div>'
      +'<div class="arq-bts"><button class="arq-bt" id="arq-canc" type="button">Cancelar</button><button class="arq-bt az" id="arq-ok" type="button">\u{1F4E6} Arquivar</button></div></div>';
    document.body.appendChild(f);
    function resumo(){
      var mes=el('arq-mes').value, ant=el('arq-ant').checked, c=candidatos(mes,ant);
      var soma=c.ok.reduce(function(s,x){ return s+num(x.valor); },0);
      el('arq-res').innerHTML='<div><span>Vão para o arquivo</span><b>'+c.ok.length+' nota(s) · '+moeda(soma)+'</b></div>'
        +'<div><span>Ficam na lista (pendentes ou sem PDF)</span><b>'+c.pend.length+'</b></div>'
        +'<div><span>Faturamento do mês</span><b style="color:#0e9f6e">não muda</b></div>';
      el('arq-ok').disabled=!c.ok.length;
      el('arq-ok').textContent=c.ok.length?('\u{1F4E6} Arquivar '+c.ok.length+' nota(s)'):'Nada para arquivar';
    }
    el('arq-mes').onchange=resumo; el('arq-ant').onchange=resumo;
    (async function(){ var n=NOK();
      if(n && !(n.estado()||[]).length){ el('arq-res').textContent='Carregando as notas...'; el('arq-ok').disabled=true; try{ await n.carregar(true); }catch(e){} }
      if(el('arq-res')) resumo(); })();
    el('arq-canc').onclick=fechar; f.onclick=function(e){ if(e.target===f) fechar(); };
    el('arq-ok').onclick=async function(){
      var b=el('arq-ok'); if(b.disabled) return; b.disabled=true; b.textContent='Arquivando...';
      var mes=el('arq-mes').value, r=await arquivarMes(mes, el('arq-ant').checked);
      fechar();
      if(r.erros) aviso('Arquivei '+r.feitas+' nota(s); '+r.erros+' deram erro. Tente de novo.','warn');
      else aviso('\u{1F4E6} '+r.feitas+' nota(s) de '+nomeMes(mes)+' arquivada(s).','ok');
    };
    function fechar(){ var x=el('arq-fundo'); if(x) x.remove(); }
  }

  /* ================= 2) aba Arquivados no painel ================= */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-arq')) return;
    var ref=null; [].forEach.call(nv.querySelectorAll('.nav-item'),function(x){ if(/Notas Fiscais/i.test(x.textContent||'')) ref=x; });
    var it=document.createElement('div'); it.className='nav-item'; it.id='ap-nav-arq';
    it.innerHTML='<span class="ni">\u{1F4E6}</span>Arquivados';
    it.onclick=function(){ abrirAba(it); };
    if(ref && ref.parentNode) ref.parentNode.insertBefore(it, ref.nextSibling); else nv.appendChild(it);
  }
  function pagina(){
    if(el('pp-arquivados')) return;
    var base=el('pp-notas'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-arquivados';
    p.innerHTML='<div class="sec">\u{1F4E6} Documentos arquivados</div><div id="arq-corpo"></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
  }
  async function abrirAba(it){
    try{ if(typeof pPage==='function') pPage('arquivados', it); }catch(e){}
    var p=el('pp-arquivados'); if(p) p.classList.add('active');
    renderAba(true);
    if(!tArq || (Date.now()-tArq)>60000){ carregandoArq=true; arq=await lerArquivadas(''); tArq=Date.now(); carregandoArq=false; }
    renderAba();
  }
  function renderAba(carregando){
    var c=el('arq-corpo'); if(!c) return;
    var anos={}; arq.forEach(function(x){ var a=String(x.mes||'').slice(0,4); if(a) anos[a]=1; });
    var listaAnos=Object.keys(anos).sort().reverse();
    var h='<div class="arq-top"><input id="arq-busca" placeholder="Buscar cliente..." value="'+esc(filtroCli)+'">'
      +'<select id="arq-ano"><option value="">Todos os anos</option>'+listaAnos.map(function(a){ return '<option value="'+a+'"'+(a===filtroAno?' selected':'')+'>'+a+'</option>'; }).join('')+'</select>'
      +'<button class="arq-bt" id="arq-recarregar" type="button">\u{1F504} Atualizar</button></div>'
      +'<div class="arq-info">Esta aba só busca os PDFs quando você abre. As telas do dia a dia não carregam as notas arquivadas.</div>';
    if(carregando){ h+='<div class="arq-vazio">Buscando as notas arquivadas...</div>'; c.innerHTML=h; return; }
    var lista=arq.filter(function(x){
      if(filtroAno && String(x.mes||'').slice(0,4)!==filtroAno) return false;
      if(filtroCli && String(x.cliente||'').toLowerCase().indexOf(filtroCli.toLowerCase())<0) return false;
      return true;
    });
    if(!lista.length) h+='<div class="arq-vazio">'+(arq.length?'Nenhuma nota com esse filtro.':'Nada arquivado ainda. Use "\u{1F4E6} Arquivar mês" na aba Notas Fiscais.')+'</div>';
    var g={}; lista.forEach(function(x){ var m=x.mes||'sem-mes'; (g[m]=g[m]||[]).push(x); });
    Object.keys(g).sort().reverse().forEach(function(m){
      var soma=g[m].reduce(function(s,x){ return s+num(x.valor); },0);
      h+='<details class="arq-mes" open><summary>'+esc(m==='sem-mes'?'Sem mês definido':nomeMesCap(m))+'<small>'+g[m].length+' nota(s) · '+moeda(soma)+'</small></summary>';
      g[m].forEach(function(x){
        var i=arq.indexOf(x), det=[];
        if(num(x.valor)) det.push(moeda(num(x.valor)));
        if(x.tomador) det.push('tomador: '+esc(x.tomador));
        if(x.comp) det.push('competência '+esc(x.comp));
        var dt=curto(x.quando||x.pedidoEm); if(dt) det.push(esc(dt));
        if(x.arquivadoEm) det.push('arquivada em '+esc(curto(x.arquivadoEm)));
        h+='<div class="arq-l"><div class="arq-i"><b>'+esc(x.cliente||'(sem cliente)')+'</b><small>'+det.join(' · ')+'</small>'
          +(x.arqNome?'<small>\u{1F4CE} '+esc(x.arqNome)+'</small>':'')+'</div>'
          +'<span class="arq-chip">Arquivada</span><div class="arq-ac">'
          +(x.arqData?'<button class="arq-bt" data-arq-dl="'+i+'" type="button">\u{2B07}\u{FE0F} Baixar</button>':'')
          +'<button class="arq-bt" data-arq-un="'+i+'" type="button">\u{21A9}\u{FE0F} Desarquivar</button></div></div>';
      });
      h+='</details>';
    });
    c.innerHTML=h;
    el('arq-busca').oninput=function(){ filtroCli=this.value; var v=this.value; renderAba(); var b=el('arq-busca'); if(b){ b.focus(); b.value=v; } };
    el('arq-ano').onchange=function(){ filtroAno=this.value; renderAba(); };
    el('arq-recarregar').onclick=async function(){ tArq=0; await abrirAba(el('ap-nav-arq')); };
    [].forEach.call(c.querySelectorAll('[data-arq-dl]'),function(b){ b.onclick=function(){ baixar(arq[Number(b.getAttribute('data-arq-dl'))]); }; });
    [].forEach.call(c.querySelectorAll('[data-arq-un]'),function(b){ b.onclick=async function(){
      if(b.disabled) return; b.disabled=true; b.textContent='Voltando...';
      try{ await desarquivar(arq[Number(b.getAttribute('data-arq-un'))]); aviso('\u{21A9}\u{FE0F} Nota voltou para a lista.','ok'); }
      catch(e){ aviso('Não consegui desarquivar: '+(e&&e.message?e.message:e),'warn'); }
      renderAba();
    }; });
  }

  /* ================= 3) bloco do cliente ================= */
  function cliente(){
    var alvo=el('cli-notas'); if(!alvo || !noCliente()) return;
    var nome=clienteAtual(); if(!nome) return;
    if(nome!==cliArqNome){ cliArqNome=nome; cliArq=null; }
    if(el('arq-cli')) return; /* o notas-concluir.js troca o innerHTML de #cli-notas; quando isso acontece, o bloco some e a gente recoloca */
    var d=document.createElement('details'); d.id='arq-cli';
    d.innerHTML='<summary>\u{1F4E6} Notas arquivadas <small id="arq-cli-n">toque para ver</small></summary><div id="arq-cli-corpo"></div>';
    alvo.appendChild(d);
    d.addEventListener('toggle', async function(){ if(d.open){ if(!cliArq && !cliCarregando){ cliCarregando=true; el('arq-cli-corpo').innerHTML='<div class="arq-vazio">Buscando...</div>'; cliArq=await lerArquivadas(nome); cliCarregando=false; } renderCli(); } });
    if(cliArq) renderCli();
  }
  function renderCli(){
    var c=el('arq-cli-corpo'), n=el('arq-cli-n'); if(!c) return;
    var v=cliArq||[];
    if(n) n.textContent=v.length?(v.length+' nota(s)'):'nenhuma';
    if(!v.length){ c.innerHTML='<div class="arq-vazio">Nenhuma nota arquivada.</div>'; return; }
    var h='', g={}; v.forEach(function(x){ (g[x.mes||'sem-mes']=g[x.mes||'sem-mes']||[]).push(x); });
    Object.keys(g).sort().reverse().forEach(function(m){
      h+='<div class="nok-sec" style="padding:0 12px">'+esc(m==='sem-mes'?'Sem mês':nomeMesCap(m))+'</div>';
      g[m].forEach(function(x){
        var i=v.indexOf(x), det=[]; if(num(x.valor)) det.push(moeda(num(x.valor))); if(x.tomador) det.push(esc(x.tomador));
        var dt=curto(x.quando||x.pedidoEm); if(dt) det.push(esc(dt));
        h+='<div class="lcard"><div class="lcico lc-pu">\u{1F9FE}</div><div class="lcinfo"><strong>Nota fiscal</strong><span>'+det.join(' · ')+'</span></div>'
          +(x.arqData?'<button class="nok-dl" data-arq-cdl="'+i+'">\u{2B07}\u{FE0F} Baixar</button>':'')+'</div>';
      });
    });
    c.innerHTML=h;
    [].forEach.call(c.querySelectorAll('[data-arq-cdl]'),function(b){ b.onclick=function(){ baixar(v[Number(b.getAttribute('data-arq-cdl'))]); }; });
  }

  /* ================= relogio ================= */
  var ocupado=false;
  function tick(){
    if(ocupado) return; ocupado=true;
    try{
      css(); embrulhar();
      if(noPainel()){ menu(); pagina(); botao(); }
      if(noCliente()) cliente();
    }catch(e){}
    ocupado=false;
  }
  [800,2000,4000,8000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,2500);

  window.__ARQ__={ mesDe:mesDe, mesDeData:mesDeData, num:num, candidatos:candidatos, arquivarMes:arquivarMes, desarquivar:desarquivar,
                   lerArquivadas:lerArquivadas, abrirAba:abrirAba, abrirModal:abrirModal, estado:function(){ return arq; }, tick:tick };
})();
