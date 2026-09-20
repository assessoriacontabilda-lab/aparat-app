/* APARAT - FICHA DO CLIENTE + CLIENTE EM FOCO (v2, 20/09/2026) - uso exclusivo do escritorio
   - item de menu "Fichas dos Clientes" (#ap-nav-fichas) e pagina #pp-fichas
   - lista dos clientes ativos com sinal (atrasado / atencao / em dia) e o motivo
   - CLIENTE EM FOCO: abrir um cliente acende a faixa neon #fc-topo no alto do painel, em
     TODAS as abas. Com foco ligado:
       . abas de lista (Guias, Honorarios, Notas, Documentos, Doc. Solicitados, Solicitacoes,
         Recebidos) mostram so o que e do cliente e o formulario ja vem com ele escolhido
       . grades (Extratos, Obrigacoes CNPJ, Painel Seguro DAS, Clientes) NAO escondem ninguem:
         so acendem a linha do cliente
     "Ver todos os clientes" desliga. O foco NAO e guardado: o painel sempre abre sem foco.
   - SETA DE VOLTAR: o modulo guarda o caminho percorrido e volta para a funcao anterior
   - ficha enxuta: numeros + pendencias + atalhos para as abas de verdade + cadastro
     (as abas repetidas da v1 sairam)
   - SOMENTE LEITURA: nao cria colecao e nao grava nada. O filtro so esconde elementos na tela
     (classe fc-oculto); nao mexe nos dados nem nos outros modulos
   - window.apAbrirFicha(nome) abre a ficha; window.apFocarCliente(nome|null) liga/desliga o foco */
;(function(){
  if(window.__APARAT_FICHA__) return; window.__APARAT_FICHA__=1;

  var INICIO_PADRAO='2026-07';
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var ROT={ok:'Em dia', wa:'Atenção', ba:'Atrasado', ne:'Info'};
  var COLS=['clientes','perfilFiscal','obrigacoes','honorarios','extratos','obrigCnpj','notas','solicitacoes','pagamentos'];

  var D={}, tCarga=0, carregando=false, lista=[], sel=null, filtro='todos', busca='';
  var foco=null, hist=[], pagAtual='', selAtual=null, voltando=false, preenchido='', rolado='', contagem='';

  /* abas de lista: o que esconder e qual campo "Cliente" preencher */
  var LISTAS={
    'pp-obrig':       {itens:'#tb-obrig > tr', sel:'ob-cli'},
    'pp-honorarios':  {itens:'#hon-tbody > tr', sel:'hon-cli'},
    'pp-notas':       {itens:'#nf-tbody > tr, #nf2-lista > *', sel:'nf-cli'},
    'pp-solicitacoes':{itens:'#tb-solic > tr'},
    'pp-recebidos':   {itens:'#tb-recebidos > tr'},
    'pp-pedidos':     {itens:'#ped-lista > .ped-gru'},
    'pp-docs':        {filtroProprio:'doc-filtro', sel:'doc-cli'},
    'pp-agenda':      {sel:'ag-cli'}, 'pp-financeiro':{sel:'fin-cli'}, 'pp-faturamento':{sel:'fat-cli'}, 'pp-dados':{sel:'dad-cli'}
  };
  /* grades: ninguem some, so acende a linha */
  var GRADES={
    'pp-extratos':'#ex-tab tbody tr', 'pp-obcnpj':'.ob-rol tbody tr', 'pp-pseg':'.ps-lista > .ps-cli', 'pp-clientes':'#tb-clientes > tr'
  };

  /* ================= utilitarios ================= */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} }
  function limpo(n){ return String(n||'x').replace(/[^\w.\-]+/g,'_').slice(0,80); }
  function mesmo(a,b){ a=String(a||'').trim(); b=String(b||'').trim(); return !!a && (a===b || limpo(a)===limpo(b)); }
  function pad(n){ return (n<10?'0':'')+n; }
  function soDig(s){ return String(s||'').replace(/\D+/g,''); }
  function num(v){ v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(v.indexOf(',')>-1) v=v.replace(/\./g,'').replace(',','.'); return parseFloat(v)||0; }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function cnpjFmt(c){ var d=soDig(c); return d.length===14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5') : (String(c||'').trim()||'CNPJ não cadastrado'); }
  function isoData(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function hojeISO(){ return isoData(new Date()); }
  function maisDias(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoData(d); }
  function dataBR(v){ var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2]+'/'+m[1] : String(v||''); }
  function diasAte(iso){ var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return null; var a=new Date(Number(m[1]),Number(m[2])-1,Number(m[3])); var h=new Date(); h=new Date(h.getFullYear(),h.getMonth(),h.getDate()); return Math.round((a-h)/86400000); }
  function compAnterior(){ var h=new Date(); var d=new Date(h.getFullYear(), h.getMonth()-1, 1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  function compMais(c,n){ var p=c.split('-'); var d=new Date(Number(p[0]), Number(p[1])-1+n, 1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  function compTxt(c){ var p=String(c).split('-'); return p.length===2 ? p[1]+'/'+p[0] : String(c); }
  function ehAdmin(){
    try{ var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL; return true; }catch(e){ return false; }
  }
  function ativo(c){ return !c.status || !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(c.status)); }
  function iniciais(n){ var p=String(n||'').replace(/[^A-Za-zÀ-ÿ0-9 ]+/g,' ').trim().split(/\s+/); return ((p[0]||'?').charAt(0)+((p[1]||'').charAt(0))).toUpperCase(); }

  /* proximo dia util: usa o calendario de feriados do modulo Obrigacoes CNPJ quando existir */
  function ajusta(d, antecipa){
    try{ if(window.__OBC__ && window.__OBC__.ajusta) return window.__OBC__.ajusta(d, !!antecipa); }catch(e){}
    var g=0; while((d.getDay()===0||d.getDay()===6) && g<6){ d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+(antecipa?-1:1)); g++; }
    return d;
  }
  function vencDia(cp, dia, antecipa){
    var p=cp.split('-'), ano=Number(p[0]), mi=Number(p[1])-1;
    var d=new Date(ano, mi+1, dia);
    if(d.getMonth()!==((mi+1)%12)) d=new Date(ano, mi+2, 0);
    return isoData(ajusta(d, antecipa));
  }

  /* ================= carga ================= */
  async function pega(col){
    var v=[];
    try{
      if(typeof dbGetAll==='function') v=await dbGetAll(col);
      else { var d=db(); if(d){ var s=await d.collection(col).get(); s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; v.push(o); }); } }
    }catch(e){ v=[]; }
    return v||[];
  }
  async function carregar(forcar){
    if(carregando) return;
    var idade = forcar===true ? 0 : (typeof forcar==='number' ? forcar : 60000);
    if(idade && tCarga && (Date.now()-tCarga)<idade) return;
    carregando=true;
    try{
      for(var i=0;i<COLS.length;i++){ D[COLS[i]]=await pega(COLS[i]); }
      tCarga=Date.now(); montarLista();
    }catch(e){}
    carregando=false;
  }
  function de(col, nome){ return (D[col]||[]).filter(function(o){ return mesmo(o.cliente, nome); }); }

  /* ================= regras ================= */
  function perfilDe(c){
    var p=null, pf=D.perfilFiscal||[];
    for(var i=0;i<pf.length;i++){ if(mesmo(pf[i].cliente,c.nome) || pf[i].id===limpo(c.nome)){ p=pf[i]; break; } }
    var r=String(c.regime||(p&&p.regime)||'');
    var reg= /mei|simei/i.test(r) ? 'MEI' : /presum/i.test(r) ? 'Presumido' : /real/i.test(r) ? 'Real' : 'Simples';
    var base={cliente:c.nome, regime:reg, anexo:'', temIE:false, temIM:true, temEmpregado:false, temST:false, temReinf:false,
              temECD:false, temECF:false, issTomador:false, nEmp:0, inicio:INICIO_PADRAO, certValidade:'', alvaraValidade:'', obs:''};
    if(p){ for(var k in p){ if(p[k]!==undefined && p[k]!==null && p[k]!=='') base[k]=p[k]; } base.regime=reg; base._tem=1; }
    return base;
  }
  function guiaPaga(g){ return /pago|entreg|conclu/i.test(String(g.status||'')); }
  function honPago(h){ return /pago/i.test(String(h.status||'')); }
  function solicAberta(s){ return !/resolv|conclu|atendid/i.test(String(s.status||'')); }
  function pedidoNF(n){ return String(n.origem||'')==='cliente' && String(n.tipo||'')==='Pedido' && !/emitida/i.test(String(n.status||'')); }
  function declPendente(nome){
    return de('pagamentos',nome).filter(function(p){ return !/confirmad|recusad/i.test(String(p.status||'')); });
  }
  function extratoDe(nome, cp){
    var ex=D.extratos||[];
    for(var i=0;i<ex.length;i++){ if(mesmo(ex[i].cliente,nome) && String(ex[i].competencia||'')===cp) return ex[i]; }
    return null;
  }
  function obrsMensais(p){
    var O=null; try{ O=window.__OBC__ && window.__OBC__.OBRS; }catch(e){}
    if(O && O.length){
      return O.filter(function(o){ if(o.leitura) return false; try{ return !!o.se(p); }catch(e){ return false; } })
              .map(function(o){ return {s:o.s, n:o.n, dia:o.dia, antec:!!o.antec}; });
    }
    return [ p.regime==='MEI' ? {s:'SIMEI',n:'DAS-SIMEI',dia:20} : {s:'DAS',n:'DAS Simples',dia:20} ].filter(function(o){ return p.regime==='MEI'||p.regime==='Simples'; });
  }
  function regObrig(nome, cp, sigla){
    var id=limpo(nome)+'__'+cp+'__'+sigla, ob=D.obrigCnpj||[];
    for(var i=0;i<ob.length;i++){ if(ob[i].id===id) return ob[i]; }
    return null;
  }
  function compISO(t){
    t=String(t||'').trim(); if(!t) return null;
    var m=t.match(/^(\d{2})\/(\d{4})$/); if(m) return m[2]+'-'+m[1];
    m=t.match(/^(\d{4})-(\d{2})/); if(m) return m[1]+'-'+m[2];
    m=t.match(/^([a-zç]+)\s*\/\s*(\d{4})$/i);
    if(m){ var i=MESES.indexOf(m[1].toLowerCase()); if(i>=0) return m[2]+'-'+pad(i+1); }
    return null;
  }
  /* guia de DAS ja lancada na aba Guias para a competencia (mesmo criterio do Painel Seguro DAS) */
  function guiaDas(nome, cp){
    var gs=de('obrigacoes',nome);
    for(var i=0;i<gs.length;i++){ if(/das/i.test(String(gs[i].tipo||'')) && compISO(gs[i].competencia)===cp) return gs[i]; }
    return null;
  }
  /* situacao de uma obrigacao mensal: ok | an | na | at | pd */
  function sitObrig(nome, p, o, cp){
    if(cp < String(p.inicio||INICIO_PADRAO)) return {st:'na'};
    var r=regObrig(nome, cp, o.s), venc=vencDia(cp, o.dia, o.antec);
    if(r && r.status) return {st:r.status, r:r, venc:venc};
    if((o.s==='DAS'||o.s==='SIMEI') && guiaDas(nome,cp)) return {st:'ok', venc:venc, guia:1};
    return {st: hojeISO()>venc ? 'at' : 'pd', venc:venc};
  }

  /* pendencias de um cliente: [{st:'ba'|'wa', t, s, aba}] */
  function pendencias(c){
    var nome=c.nome, hoje=hojeISO(), lim=maisDias(5), cp=compAnterior(), p=perfilDe(c), P=[];
    de('obrigacoes',nome).forEach(function(g){
      var v=String(g.vencimento||'').slice(0,10); if(guiaPaga(g)||!v) return;
      if(v<hoje) P.push({st:'ba', t:String(g.tipo||'Guia')+(g.competencia?(' '+g.competencia):''), s:'Guia venceu em '+dataBR(v)+' e está sem baixa', aba:'guias'});
      else if(v<=lim) P.push({st:'wa', t:String(g.tipo||'Guia')+(g.competencia?(' '+g.competencia):''), s:'Guia vence em '+dataBR(v), aba:'guias'});
    });
    de('honorarios',nome).forEach(function(h){
      var v=String(h.vencimento||'').slice(0,10); if(honPago(h)||!v) return;
      if(v<hoje) P.push({st:'ba', t:'Honorário '+String(h.referencia||''), s:'Venceu em '+dataBR(v)+' · '+moeda(num(h.valor)), aba:'hon'});
    });
    if(cp>=String(p.inicio||INICIO_PADRAO) && !extratoDe(nome,cp)){
      var pz=vencDia(cp,10,false);
      if(hoje>pz) P.push({st:'ba', t:'Extrato '+compTxt(cp), s:'Não entregue · o prazo era '+dataBR(pz), aba:'extratos'});
      else P.push({st:'wa', t:'Extrato '+compTxt(cp), s:'Ainda não entregue · prazo '+dataBR(pz), aba:'extratos'});
    }
    obrsMensais(p).forEach(function(o){
      var x=sitObrig(nome,p,o,cp);
      if(x.st==='at') P.push({st:'ba', t:o.n+' '+compTxt(cp), s:'Não marcado como feito · o prazo era '+dataBR(x.venc), aba:'obrig'});
      else if(x.st==='pd' && x.venc<=lim) P.push({st:'wa', t:o.n+' '+compTxt(cp), s:'A fazer · prazo '+dataBR(x.venc), aba:'obrig'});
    });
    de('solicitacoes',nome).filter(solicAberta).forEach(function(s){
      P.push({st:'wa', t:'Solicitação em aberto', s:String(s.servico||s.mensagem||'').slice(0,90), aba:'solic'});
    });
    de('notas',nome).filter(pedidoNF).forEach(function(n){
      P.push({st:'wa', t:'Pedido de nota fiscal', s:String(n.descricao||'').slice(0,90)+(n.valor?(' · '+moeda(num(n.valor))):''), aba:'notas'});
    });
    declPendente(nome).forEach(function(d){
      P.push({st:'wa', t:'Cliente avisou que pagou', s:'Conferir o pagamento declarado'+(d.declaradoEmBR?(' em '+d.declaradoEmBR):''), aba:(String(d.refColecao||'')==='honorarios'?'hon':'guias')});
    });
    [['certValidade','Certificado digital'],['alvaraValidade','Alvará']].forEach(function(par){
      var v=String(p[par[0]]||'').slice(0,10); if(!v) return; var n=diasAte(v); if(n===null) return;
      if(n<0) P.push({st:'ba', t:par[1], s:'Venceu em '+dataBR(v), aba:'obrig'});
      else if(n<=60) P.push({st:'wa', t:par[1], s:'Vence em '+n+' dia'+(n===1?'':'s')+' ('+dataBR(v)+')', aba:'obrig'});
    });
    P.sort(function(a,b){ return (a.st==='ba'?0:1)-(b.st==='ba'?0:1); });
    return P;
  }

  function montarLista(){
    lista=(D.clientes||[]).filter(function(c){ var n=String(c.nome||'').trim(); return n && n!=='Todos os Clientes' && ativo(c); })
      .map(function(c){
        var P=pendencias(c), st=P.length ? P[0].st : 'ok', p=perfilDe(c);
        var nb=P.filter(function(x){ return x.st==='ba'; }).length;
        var motivo = !P.length ? 'Tudo em dia' : (P[0].t+(P.length>1?(' · mais '+(P.length-1)):''));
        return {c:c, nome:String(c.nome).trim(), st:st, P:P, nb:nb, motivo:motivo, tipo:(p.regime==='MEI'?'MEI':'ME'), p:p};
      });
    var ord={ba:0,wa:1,ok:2};
    lista.sort(function(a,b){ return ord[a.st]-ord[b.st] || b.nb-a.nb || a.nome.localeCompare(b.nome); });
    pintarPonto();
  }
  function pintarPonto(){
    var d=el('dot-fichas'); if(!d) return;
    var n=lista.filter(function(x){ return x.st==='ba'; }).length;
    d.style.display = n ? '' : 'none'; d.textContent = n ? String(n) : '';
  }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-ficha-css')) return;
    var s=document.createElement('style'); s.id='ap-ficha-css';
    s.textContent=
       '#pp-fichas .fc-tri{font-size:12.5px;color:var(--cinza);margin-bottom:10px}'
      +'#pp-fichas .fc-tri a{color:var(--azul-light);cursor:pointer;font-weight:700;text-decoration:none}'
      +'#pp-fichas .fc-h{font-size:19px;font-weight:800;margin-bottom:2px}'
      +'#pp-fichas .fc-sub{font-size:12.5px;color:var(--cinza);margin-bottom:12px}'
      +'#pp-fichas .fc-leg{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--cinza);margin-bottom:12px}'
      +'#pp-fichas .fc-bol{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}'
      +'#pp-fichas .fc-bol.ok{background:#0e9f6e}#pp-fichas .fc-bol.wa{background:#e2a03f}#pp-fichas .fc-bol.ba{background:#ff5a4f}'
      +'#pp-fichas .fc-barra{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;align-items:center}'
      +'#pp-fichas .fc-barra input{flex:1;min-width:200px;font:inherit;font-size:14px;padding:11px 14px;border-radius:13px;border:1.5px solid var(--border);background:var(--card);color:inherit;outline:none}'
      +'#pp-fichas .fc-barra input:focus{border-color:var(--azul);box-shadow:0 0 0 3px rgba(51,85,255,.16)}'
      +'#pp-fichas .fc-f{font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer}'
      +'#pp-fichas .fc-f.on{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-fichas .fc-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:12px}'
      +'#pp-fichas .fc-cli{background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:13px;cursor:pointer;display:flex;gap:11px;align-items:flex-start;transition:.15s;min-width:0}'
      +'#pp-fichas .fc-cli:hover{border-color:var(--azul);transform:translateY(-2px)}'
      +'#pp-fichas .fc-cli.ba{border-left:4px solid #ff5a4f}#pp-fichas .fc-cli.wa{border-left:4px solid #e2a03f}#pp-fichas .fc-cli.ok{border-left:4px solid #0e9f6e}'
      +'#pp-fichas .fc-av{width:42px;height:42px;border-radius:12px;background:rgba(51,85,255,.14);border:1px solid rgba(51,85,255,.28);color:var(--azul-light);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}'
      +'#pp-fichas .fc-cli b{display:block;font-size:13.5px;font-weight:800;line-height:1.25;word-break:break-word}'
      +'#pp-fichas .fc-cli small{display:block;font-size:11.5px;color:var(--cinza)}'
      +'#pp-fichas .fc-mot{margin-top:6px;font-size:12px;color:var(--cinza);line-height:1.35}'
      +'#pp-fichas .fc-chip{display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;white-space:nowrap}'
      +'#pp-fichas .fc-chip.ok{background:rgba(14,159,110,.16);color:#2fd29b}#pp-fichas .fc-chip.wa{background:rgba(226,160,63,.17);color:#e2a03f}'
      +'#pp-fichas .fc-chip.ba{background:rgba(217,45,32,.16);color:#ff6b60}#pp-fichas .fc-chip.ne{background:rgba(127,140,170,.16);color:var(--cinza)}'
      +'body.ap-esc-claro #pp-fichas .fc-chip.ok{color:#0e9f6e}body.ap-esc-claro #pp-fichas .fc-chip.wa{color:#b45309}body.ap-esc-claro #pp-fichas .fc-chip.ba{color:#d92d20}'
      +'#pp-fichas .fc-card{background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:16px}'
      +'#pp-fichas .fc-cab{display:flex;gap:13px;align-items:center;flex-wrap:wrap}'
      +'#pp-fichas .fc-cab .fc-av{width:54px;height:54px;font-size:17px;border-radius:16px}'
      +'#pp-fichas .fc-inf{flex:1;min-width:200px}#pp-fichas .fc-inf b{font-size:18px;font-weight:800;display:block;line-height:1.2}'
      +'#pp-fichas .fc-inf span{display:block;font-size:12.5px;color:var(--cinza)}'
      +'#pp-fichas .fc-bt{font:inherit;font-size:12.5px;font-weight:700;padding:9px 13px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1}'
      +'#pp-fichas .fc-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-fichas .fc-bt.mini{font-size:11.5px;padding:6px 9px;border-radius:9px}'
      +'#pp-fichas .fc-nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}'
      +'#pp-fichas .fc-num{background:rgba(127,140,170,.10);border-radius:14px;padding:11px 13px}'
      +'#pp-fichas .fc-num small{display:block;font-size:11.5px;color:var(--cinza)}#pp-fichas .fc-num b{font-size:18px;font-weight:800}'
      +'#pp-fichas .c-ok{color:#2fd29b}#pp-fichas .c-wa{color:#e2a03f}#pp-fichas .c-ba{color:#ff6b60}'
      +'body.ap-esc-claro #pp-fichas .c-ok{color:#0e9f6e}body.ap-esc-claro #pp-fichas .c-wa{color:#b45309}body.ap-esc-claro #pp-fichas .c-ba{color:#d92d20}'
      +'#pp-fichas .fc-abas{display:flex;gap:5px;overflow-x:auto;margin-top:16px;padding-bottom:10px;border-bottom:1px dashed var(--border)}'
      +'#pp-fichas .fc-aba{position:relative;font:inherit;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:10px;border:0;background:transparent;color:var(--cinza);cursor:pointer;white-space:nowrap}'
      +'#pp-fichas .fc-aba.on{background:rgba(51,85,255,.15);color:var(--azul-light)}'
      +'#pp-fichas .fc-aba i{position:absolute;top:3px;right:2px;width:8px;height:8px;border-radius:50%;background:#ff2d40}'
      +'#pp-fichas .fc-aba i.wa{background:#e2a03f}'
      +'#pp-fichas .fc-lin{display:flex;gap:10px;align-items:center;padding:11px 2px;border-bottom:1px dashed var(--border);flex-wrap:wrap}'
      +'#pp-fichas .fc-lin:last-child{border-bottom:0}#pp-fichas .fc-lin.clic{cursor:pointer}'
      +'#pp-fichas .fc-t{flex:1;min-width:180px}#pp-fichas .fc-t b{display:block;font-size:13.5px;font-weight:700;word-break:break-word}'
      +'#pp-fichas .fc-t small{font-size:12px;color:var(--cinza);word-break:break-word}'
      +'#pp-fichas .fc-sec{font-size:10.5px;color:var(--cinza);text-transform:uppercase;letter-spacing:1px;font-weight:800;margin:16px 0 4px}'
      +'#pp-fichas .fc-vazio{padding:18px 4px;font-size:13px;color:var(--cinza)}'
      +'#pp-fichas .fc-pe{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border)}'
      +'#pp-fichas .fc-cli.aceso{border-color:#00c2a8;box-shadow:0 0 0 1px #00c2a8,0 0 16px rgba(0,194,168,.55)}'
      +'#pp-fichas .fc-foco-txt{color:#00c2a8;font-weight:800}'
      +'#pp-fichas .fc-atalhos{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px}'
      +'#pp-fichas .fc-atalho{position:relative;font:inherit;background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:14px 10px;text-align:center;color:inherit;cursor:pointer;transition:.15s}'
      +'#pp-fichas .fc-atalho:hover{border-color:#00c2a8;box-shadow:0 0 14px rgba(0,194,168,.55);transform:translateY(-2px)}'
      +'#pp-fichas .fc-atalho .ic{display:block;font-size:25px;line-height:1.2;margin-bottom:4px}'
      +'#pp-fichas .fc-atalho b{display:block;font-size:12.5px;font-weight:800}'
      +'#pp-fichas .fc-atalho small{font-size:11px;color:var(--cinza)}'
      +'#pp-fichas .fc-atalho i{position:absolute;top:8px;right:8px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ff2d40;color:#fff;font-size:11px;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center}'
      +'#pp-fichas .fc-atalho i.wa{background:#e2a03f}'
      +'#fc-topo{display:none;margin:0 0 14px}'
      +'#fc-topo.on{display:block}'
      +'#fc-topo-in{display:flex;align-items:center;gap:10px;flex-wrap:wrap}'
      +'#fc-topo-in.fixo{position:fixed;top:6px;z-index:900;box-sizing:border-box;padding:6px;border-radius:20px;background:rgba(9,20,42,.80);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}'
      +'body.ap-esc-claro #fc-topo-in.fixo{background:rgba(244,247,252,.88)}'
      +'#fc-topo .fc-volta{font:inherit;font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:7px;padding:9px 14px 9px 11px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:inherit;cursor:pointer;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}'
      +'#fc-topo .fc-volta:hover{border-color:var(--azul);color:var(--azul-light)}'
      +'#fc-topo .fc-faixa{flex:1;min-width:260px;display:flex;align-items:center;gap:11px;flex-wrap:wrap;background:var(--card);border:2px solid #00c2a8;border-radius:16px;padding:8px 12px;box-shadow:0 0 0 1px #00c2a8,0 0 16px rgba(0,194,168,.55),inset 0 0 14px rgba(0,194,168,.10);animation:fcPulsa 2.4s ease-in-out infinite}'
      +'@keyframes fcPulsa{0%,100%{box-shadow:0 0 0 1px #00c2a8,0 0 11px rgba(0,194,168,.5),inset 0 0 14px rgba(0,194,168,.10)}50%{box-shadow:0 0 0 1px #00c2a8,0 0 26px rgba(0,194,168,.65),inset 0 0 14px rgba(0,194,168,.10)}}'
      +'@media (prefers-reduced-motion:reduce){#fc-topo .fc-faixa{animation:none}}'
      +'#fc-topo .fc-fav{width:38px;height:38px;border-radius:11px;background:rgba(0,194,168,.14);border:1px solid #00c2a8;color:#00c2a8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;box-shadow:0 0 10px rgba(0,194,168,.5)}'
      +'#fc-topo .fc-finf{flex:1;min-width:140px;line-height:1.25}'
      +'#fc-topo .fc-finf small{display:block;font-size:11px;color:var(--cinza)}'
      +'#fc-topo .fc-finf b{font-size:14.5px;font-weight:800;word-break:break-word}'
      +'#fc-topo .fc-cont{font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;border:1px solid #00c2a8;color:#00c2a8;background:rgba(0,194,168,.10);white-space:nowrap}'
      +'#fc-topo .fc-fb{font:inherit;font-size:12px;font-weight:700;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}'
      +'#fc-topo .fc-fb:hover{border-color:#00c2a8;color:#00c2a8}'
      +'body.ap-esc-claro #fc-topo .fc-cont,body.ap-esc-claro #fc-topo .fc-fav,body.ap-esc-claro #pp-fichas .fc-foco-txt{color:#00806f}'
      +'#fc-topo .fc-chip.ok{background:rgba(14,159,110,.16);color:#2fd29b}#fc-topo .fc-chip.wa{background:rgba(226,160,63,.17);color:#e2a03f}#fc-topo .fc-chip.ba{background:rgba(217,45,32,.16);color:#ff6b60}'
      +'body.ap-esc-claro #fc-topo .fc-chip.ok{color:#0e9f6e}body.ap-esc-claro #fc-topo .fc-chip.wa{color:#b45309}body.ap-esc-claro #fc-topo .fc-chip.ba{color:#d92d20}'
      +'.fc-oculto{display:none!important}'
      +'#view-painel tr.fc-aceso>td{background:rgba(0,194,168,.12)!important;box-shadow:inset 0 1px 0 #00c2a8,inset 0 -1px 0 #00c2a8}'
      +'#view-painel tr.fc-aceso>td:first-child{box-shadow:inset 3px 0 0 #00c2a8,inset 0 1px 0 #00c2a8,inset 0 -1px 0 #00c2a8}'
      +'#view-painel div.fc-aceso{border-color:#00c2a8!important;box-shadow:0 0 0 1px #00c2a8,0 0 16px rgba(0,194,168,.55)!important}'
      +'#view-painel select.fc-preso{border-color:#00c2a8!important;box-shadow:0 0 8px rgba(0,194,168,.55)!important}'
      +'@media(max-width:640px){#pp-fichas .fc-grade{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  /* ================= menu e pagina ================= */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-fichas')) return;
    var it=document.createElement('div');
    it.className='nav-item'; it.id='ap-nav-fichas';
    it.innerHTML='<span class="ni">\u{1F4C7}</span>Fichas dos Clientes<span class="nav-dot" id="dot-fichas" style="display:none"></span>';
    it.onclick=function(){ abrir(it); };
    var ini=el('ap-nav-inicio'), pri=nv.querySelector('.nav-sec');
    if(ini && ini.parentNode===nv) nv.insertBefore(it, ini.nextSibling);
    else if(pri) nv.insertBefore(it, pri.nextSibling);
    else nv.insertBefore(it, nv.firstChild);
    pintarPonto();
  }
  function pagina(){
    if(el('pp-fichas')) return;
    var base=el('pp-dash')||el('pp-clientes'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-fichas';
    p.innerHTML='<div id="fc-corpo"></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    try{ if(window.ABA_NOMES) window.ABA_NOMES.fichas='Fichas dos Clientes'; }catch(e){}
  }
  function mostrarPagina(){
    var it=el('ap-nav-fichas');
    try{ if(typeof pPage==='function') pPage('fichas', it); }catch(e){}
    var p=el('pp-fichas'); if(p) p.classList.add('active');
  }
  async function abrir(){
    mostrarPagina(); sel=null;
    render(); await carregar(false); render();
  }
  async function abrirFicha(nome){
    menu(); pagina(); mostrarPagina();
    sel=String(nome||'').trim(); focar(sel);
    render(); await carregar(false); render();
  }
  function irMenu(re){
    var it=[].slice.call(document.querySelectorAll('#view-painel .sidebar .nav .nav-item')).filter(function(x){ return x.id!=='ap-nav-fichas' && re.test(x.textContent||''); })[0];
    if(it) it.click();
    return !!it;
  }

  /* ================= cliente em foco ================= */
  function paginaAtiva(){ var p=document.querySelector('#view-painel .ppage.active'); return p ? p.id : ''; }
  function nomePagina(id, s){
    if(id==='pp-fichas') return s ? ('ficha de '+s) : 'Fichas dos Clientes';
    var it=itemDoMenu(id), t='';
    if(it){ var ni=it.querySelector('.ni'); t=(it.textContent||'').replace(ni?(ni.textContent||''):'','').replace(/\d+\s*$/,'').trim(); }
    return t || 'tela anterior';
  }
  function itemDoMenu(id){
    var chave=String(id||'').replace(/^pp-/,''), its=[].slice.call(document.querySelectorAll('#view-painel .sidebar .nav .nav-item'));
    var porId={inicio:'ap-nav-inicio', fichas:'ap-nav-fichas', pedidos:'ap-nav-ped', extratos:'ap-nav-ext', obcnpj:'ap-nav-obc', pseg:'ap-nav-pseg'}[chave];
    if(porId) return el(porId);
    for(var i=0;i<its.length;i++){ if((its[i].getAttribute('onclick')||'').indexOf("'"+chave+"'")>=0) return its[i]; }
    return null;
  }
  function focar(nome){
    nome=String(nome||'').trim()||null;
    if(nome!==foco){ foco=nome; preenchido=''; rolado=''; }
    aplicarFoco(true);
  }
  function desfocar(){
    foco=null; preenchido=''; rolado='';
    limparFiltro();
    try{ var f=el('doc-filtro'); if(f && f.value){ f.value=''; if(typeof carregarDocs==='function') carregarDocs(); } }catch(e){}
    if(paginaAtiva()==='pp-fichas' && sel){ sel=null; render(); }
    aplicarFoco(true);
  }
  function limparFiltro(){
    [].forEach.call(document.querySelectorAll('.fc-oculto'),function(e){ e.classList.remove('fc-oculto'); });
    [].forEach.call(document.querySelectorAll('.fc-aceso'),function(e){ if(!e.classList.contains('fc-cli')) e.classList.remove('fc-aceso'); });
    [].forEach.call(document.querySelectorAll('.fc-preso'),function(e){ e.classList.remove('fc-preso'); });
  }
  function temNome(e, nome){ return (e.textContent||'').indexOf(nome)>=0; }
  function ehAvisoVazio(e){
    if(e.tagName==='TR'){ var tds=e.children; return tds.length===1 && Number(tds[0].getAttribute('colspan')||1)>1; }
    return /vazio/i.test(e.className||'');
  }
  /* historico de telas: alimentado pelo relogio rapido, sem mexer no pPage do app */
  function vigiar(){
    var id=paginaAtiva(); if(!id) return;
    var s = id==='pp-fichas' ? (sel||null) : null;
    if(id===pagAtual && s===selAtual) return;
    var trocaInicial = (pagAtual==='pp-dash' && id==='pp-inicio' && !hist.length);   /* o Inicio substitui o Dashboard sozinho ao abrir */
    if(pagAtual && !voltando && !trocaInicial){
      var ult=hist[hist.length-1];
      if(!(ult && ult.id===pagAtual && ult.sel===selAtual)) hist.push({id:pagAtual, sel:selAtual});
      if(hist.length>25) hist.shift();
    }
    voltando=false; pagAtual=id; selAtual=s; preenchido=''; rolado='';
    aplicarFoco(true);
  }
  function voltar(){
    var a=hist.pop(); if(!a) return;
    voltando=true;
    if(a.id==='pp-fichas'){ if(a.sel) abrirFicha(a.sel); else abrir(); }
    else { var it=itemDoMenu(a.id); if(it) it.click(); else voltando=false; }
    setTimeout(function(){ vigiar(); },60);
  }
  function topo(){
    var t=el('fc-topo'); if(t) return t;
    var base=el('pp-inicio')||el('pp-dash'); if(!base || !base.parentNode) return null;
    t=document.createElement('div'); t.id='fc-topo'; t.innerHTML='<div id="fc-topo-in"></div>';
    base.parentNode.insertBefore(t, base.parentNode.querySelector('.ppage'));
    window.addEventListener('scroll', grudar, {passive:true}); window.addEventListener('resize', grudar);
    return t;
  }
  /* a faixa acompanha a rolagem: quando sairia da tela, fica presa no alto */
  function grudar(){
    var t=el('fc-topo'), i=el('fc-topo-in'); if(!t || !i) return;
    if(!t.classList.contains('on')){ i.classList.remove('fixo'); i.style.left=''; i.style.width=''; t.style.minHeight=''; return; }
    var r=t.getBoundingClientRect();
    if(r.top<8){ t.style.minHeight=i.offsetHeight+'px'; i.classList.add('fixo'); i.style.left=r.left+'px'; i.style.width=r.width+'px'; }
    else { i.classList.remove('fixo'); i.style.left=''; i.style.width=''; t.style.minHeight=''; }
  }
  function aplicarFoco(redesenhar){
    var t=topo(); if(!t) return;
    var id=paginaAtiva(), ant=hist[hist.length-1];
    /* 1. filtro e destaque na tela ativa */
    var cont='';
    if(foco && id){
      var L=LISTAS[id], G=GRADES[id];
      if(L){
        if(L.itens){
          var tot=0, meus=0;
          [].forEach.call(document.querySelectorAll('#'+id+' '+L.itens.split(',').join(', #'+id+' ')),function(e){
            if(ehAvisoVazio(e)) return; tot++;
            var ok=temNome(e,foco); if(ok) meus++;
            e.classList.toggle('fc-oculto', !ok);
          });
          cont = tot ? ('só deste cliente · '+meus+' de '+tot) : 'nada lançado nesta aba';
        }
        if(L.filtroProprio){
          var f=el(L.filtroProprio);
          if(f && f.value!==foco){
            var tem=[].some.call(f.options,function(o){ return o.value===foco; });
            if(tem){ f.value=foco; try{ if(typeof carregarDocs==='function') carregarDocs(); }catch(e){} }
          }
          if(f) cont = (f.value===foco) ? 'só deste cliente' : 'nenhum documento deste cliente';
        }
        if(L.sel && preenchido!==id){
          var s=el(L.sel);
          if(s && s.options && s.options.length){
            var ha=[].some.call(s.options,function(o){ return o.value===foco; });
            if(ha){ if(s.value!==foco){ s.value=foco; try{ s.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){} } s.classList.add('fc-preso'); }
            preenchido=id;
          }
        }
      }
      if(G){
        var achou=null, linhasG=0;
        [].forEach.call(document.querySelectorAll('#'+id+' '+G),function(e){
          linhasG++;
          var c1=e.querySelector('td.cli, .ps-nome b, td'); var txt=(c1?c1.textContent:e.textContent)||'';
          var ok=txt.indexOf(foco)>=0; e.classList.toggle('fc-aceso', ok); if(ok && !achou) achou=e;
        });
        cont = achou ? 'linha do cliente acesa' : (linhasG ? 'cliente não aparece nesta grade' : '');
        if(achou && rolado!==id){ rolado=id; try{ achou.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){} }
      }
    }
    /* 2. a faixa do alto */
    var assinatura=[foco||'', id, ant?(ant.id+'|'+(ant.sel||'')):'', cont, (id==='pp-fichas'&&sel)?'f':''].join('~');
    if(!redesenhar && assinatura===contagem){ grudar(); return; }
    contagem=assinatura;
    var h='';
    if(ant) h+='<button class="fc-volta" id="fc-volta2" title="Voltar para a tela anterior">\u{2190} Voltar para '+esc(nomePagina(ant.id, ant.sel))+'</button>';
    if(foco){
      var x=null; for(var i=0;i<lista.length;i++){ if(mesmo(lista[i].nome,foco)){ x=lista[i]; break; } }
      h+='<div class="fc-faixa"><div class="fc-fav">'+esc(iniciais(foco))+'</div><div class="fc-finf"><small>Trabalhando em</small><b>'+esc(foco)+'</b></div>'
        +(cont?'<span class="fc-cont">'+esc(cont)+'</span>':'')
        +(x?'<span class="fc-chip '+x.st+'" style="display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px">'+ROT[x.st]+'</span>':'')
        +((id==='pp-fichas'&&sel)?'':'<button class="fc-fb" id="fc-abre">\u{1F4C7} Ficha</button>')
        +'<button class="fc-fb" id="fc-solta">\u{2716} Ver todos os clientes</button></div>';
    }
    el('fc-topo-in').innerHTML=h; t.classList.toggle('on', !!h); grudar();
    var v=el('fc-volta2'); if(v) v.onclick=voltar;
    var a=el('fc-abre'); if(a) a.onclick=function(){ abrirFicha(foco); };
    var so=el('fc-solta'); if(so) so.onclick=desfocar;
  }

  function linha(t, s, st, rot){
    return '<div class="fc-lin"><div class="fc-t"><b>'+esc(t)+'</b><small>'+esc(s)+'</small></div>'
          +'<span class="fc-chip '+st+'">'+esc(rot||ROT[st])+'</span></div>';
  }
  function vazio(m){ return '<div class="fc-vazio">'+esc(m)+'</div>'; }
  function abaCad(c, p){
    function ln(a,b){ return '<div class="fc-lin"><div class="fc-t"><small>'+esc(a)+'</small><b>'+esc(b||'—')+'</b></div></div>'; }
    var h=ln('Razão social', c.nome)+ln('CNPJ / CPF', cnpjFmt(c.cnpj))+ln('Responsável', c.responsavel)+ln('WhatsApp', c.whatsapp||c.telefone)+ln('E-mail', c.email)
      +ln('Regime tributário', String(c.regime||p.regime||''))+ln('Honorário mensal', c.honorario?(moeda(num(c.honorario))+(c.dia?(' · vence dia '+c.dia):'')):'')+ln('Situação', String(c.status||'Ativo'));
    h+='<div class="fc-sec">Perfil fiscal</div>';
    if(!p._tem) h+=vazio('Perfil fiscal ainda não preenchido — abra Obrigações CNPJ → Perfil fiscal.');
    else{
      h+=ln('Anexo do Simples', p.anexo)+ln('Empregados', p.temEmpregado?((p.nEmp||0)+' empregado(s)'):'Não tem')
        +ln('Inscrição estadual', p.temIE?'Sim':'Não')+ln('Início do controle', compTxt(String(p.inicio||INICIO_PADRAO)));
      [['certValidade','Certificado digital'],['alvaraValidade','Alvará']].forEach(function(par){
        var v=String(p[par[0]]||'').slice(0,10), n=diasAte(v);
        h+='<div class="fc-lin"><div class="fc-t"><small>'+esc(par[1])+'</small><b>'+(v?('Validade '+esc(dataBR(v))):'—')+'</b></div>'
          +(v&&n!==null?('<span class="fc-chip '+(n<0?'ba':(n<=60?'wa':'ok'))+'">'+(n<0?'Vencido':('Faltam '+n+' dias'))+'</span>'):'')+'</div>';
      });
      if(p.obs) h+=ln('Observações', p.obs);
    }
    return h;
  }

  /* ================= render ================= */
  function render(){
    var box=el('fc-corpo'); if(!box) return;
    if(sel) renderFicha(box); else renderLista(box);
  }
  function renderLista(box){
    var q=busca.toLowerCase().trim(), qd=soDig(q);
    var v=lista.filter(function(x){
      if(filtro!=='todos' && x.st!==filtro && x.tipo!==filtro) return false;
      if(!q) return true;
      return x.nome.toLowerCase().indexOf(q)>=0 || (qd.length>=3 && soDig(x.c.cnpj).indexOf(qd)>=0);
    });
    var n={ok:0,wa:0,ba:0}; lista.forEach(function(x){ n[x.st]++; });
    var h='<div class="fc-h">\u{1F4C7} Fichas dos Clientes</div><div class="fc-sub">Clique em um cliente para ver tudo dele em um lugar só. Quem precisa de atenção aparece primeiro.</div>';
    if(!tCarga){ box.innerHTML=h+'<div class="fc-vazio">Carregando os clientes...</div>'; return; }
    h+='<div class="fc-leg"><span><i class="fc-bol ba"></i>'+n.ba+' atrasado'+(n.ba===1?'':'s')+'</span><span><i class="fc-bol wa"></i>'+n.wa+' com atenção</span><span><i class="fc-bol ok"></i>'+n.ok+' em dia</span></div>';
    h+='<div class="fc-barra"><input id="fc-q" placeholder="Buscar por nome ou CNPJ" autocomplete="off" value="'+esc(busca)+'">';
    [['todos','Todos'],['ba','Atrasados'],['wa','Atenção'],['ok','Em dia'],['ME','Só ME'],['MEI','Só MEI']].forEach(function(f){ h+='<button class="fc-f'+(filtro===f[0]?' on':'')+'" data-fc-f="'+f[0]+'">'+f[1]+'</button>'; });
    h+='<button class="fc-f" id="fc-atu" title="Ler os dados de novo">\u{1F504} Atualizar</button></div><div class="fc-grade">';
    v.forEach(function(x){
      var ac=foco && mesmo(x.nome,foco);
      h+='<div class="fc-cli '+x.st+(ac?' aceso':'')+'" data-fc-cli="'+esc(x.nome)+'"><div class="fc-av">'+esc(iniciais(x.nome))+'</div><div style="flex:1;min-width:0"><b>'+esc(x.nome)+'</b>'
        +'<small>'+x.tipo+' · '+esc(cnpjFmt(x.c.cnpj))+'</small><div class="fc-mot"><span class="fc-chip '+x.st+'">'+ROT[x.st]+'</span> '+esc(x.motivo)+(ac?' · <span class="fc-foco-txt">em foco</span>':'')+'</div></div></div>';
    });
    if(!v.length) h+='<div class="fc-vazio" style="grid-column:1/-1">Nenhum cliente encontrado com esse filtro.</div>';
    box.innerHTML=h+'</div>';
    var inp=el('fc-q');
    if(inp) inp.oninput=function(){ busca=inp.value; var p=inp.selectionStart; renderLista(box); var n2=el('fc-q'); if(n2){ n2.focus(); try{ n2.setSelectionRange(p,p); }catch(e){} } };
    [].forEach.call(box.querySelectorAll('[data-fc-f]'),function(b){ b.onclick=function(){ filtro=b.getAttribute('data-fc-f'); renderLista(box); }; });
    [].forEach.call(box.querySelectorAll('[data-fc-cli]'),function(b){ b.onclick=function(){ abrirFicha(b.getAttribute('data-fc-cli')); }; });
    var at=el('fc-atu'); if(at) at.onclick=async function(){ at.disabled=true; at.textContent='Atualizando...'; await carregar(true); render(); };
  }
  function renderFicha(box){
    var x=null; for(var i=0;i<lista.length;i++){ if(mesmo(lista[i].nome,sel)){ x=lista[i]; break; } }
    if(!x){ box.innerHTML='<div class="fc-card"><div class="fc-vazio">'+(tCarga?'Cliente não encontrado entre os ativos.':'Carregando a ficha...')+'</div></div>'; return; }
    var c=x.c, p=x.p, nome=x.nome, cp=compAnterior(), hoje=hojeISO();
    var gAb=de('obrigacoes',nome).filter(function(g){ return !guiaPaga(g); });
    var gVe=gAb.filter(function(g){ var v=String(g.vencimento||'').slice(0,10); return v && v<hoje; }).length;
    var hAb=de('honorarios',nome).filter(function(o){ return !honPago(o); }), hTot=0; hAb.forEach(function(o){ hTot+=num(o.valor); });
    var hVe=hAb.filter(function(o){ var v=String(o.vencimento||'').slice(0,10); return v && v<hoje; }).length;
    var ex=extratoDe(nome,cp), exCabe=cp>=String(p.inicio||INICIO_PADRAO), exAtr=!ex && hoje>vencDia(cp,10,false);
    var ped=de('solicitacoes',nome).filter(solicAberta).length+de('notas',nome).filter(pedidoNF).length;
    var tel=soDig(c.whatsapp||c.telefone||c.celular||''), txt='Olá! Aqui é a APARAT Contabilidade.';
    var wa=tel ? ('https://wa.me/55'+tel+'?text='+encodeURIComponent(txt)) : ('https://wa.me/?text='+encodeURIComponent(txt));
    var conta={}; x.P.forEach(function(k){ var o=conta[k.aba]||(conta[k.aba]={n:0,ba:0}); o.n++; if(k.st==='ba') o.ba++; });

    var h='<div class="fc-card"><div class="fc-cab"><div class="fc-av">'+esc(iniciais(nome))+'</div><div class="fc-inf"><b>'+esc(nome)+'</b>'
      +'<span>'+x.tipo+' · '+esc(String(c.regime||p.regime||'regime não informado'))+(p.anexo?(' · anexo '+esc(p.anexo)):'')+'</span><span>'+esc(cnpjFmt(c.cnpj))+'</span></div>'
      +'<span class="fc-chip '+x.st+'">'+ROT[x.st]+'</span>'
      +'<a class="fc-bt" href="'+esc(wa)+'" target="_blank" rel="noopener">\u{1F4F2} WhatsApp</a>'
      +'<button class="fc-bt az" id="fc-lg">\u{2795} Lançar guia</button></div>';
    h+='<div class="fc-nums">'
      +'<div class="fc-num"><small>Guias em aberto</small><b class="'+(gVe?'c-ba':(gAb.length?'c-wa':'c-ok'))+'">'+gAb.length+(gVe?(' · '+gVe+' vencida'+(gVe>1?'s':'')):'')+'</b></div>'
      +'<div class="fc-num"><small>Honorários em aberto</small><b class="'+(hVe?'c-ba':(hAb.length?'c-wa':'c-ok'))+'">'+(hAb.length?(hAb.length+' · '+moeda(hTot)):'Nenhum')+'</b></div>'
      +'<div class="fc-num"><small>Extrato '+esc(compTxt(cp))+'</small><b class="'+(!exCabe?'':(ex?'c-ok':(exAtr?'c-ba':'c-wa')))+'">'+(!exCabe?'—':(ex?(ex.semMovimento?'Sem movimento':'Entregue'):(exAtr?'Não entregue':'Aguardando')))+'</b></div>'
      +'<div class="fc-num"><small>Pedidos do cliente em aberto</small><b class="'+(ped?'c-wa':'c-ok')+'">'+ped+'</b></div></div>';

    h+='<div class="fc-sec">O que precisa de atenção</div>';
    if(!x.P.length) h+=linha('Tudo em dia','Nenhuma pendência encontrada para este cliente.','ok','Em dia');
    x.P.forEach(function(k){ h+='<div class="fc-lin clic" data-fc-vai="'+k.aba+'"><div class="fc-t"><b>'+esc(k.t)+'</b><small>'+esc(k.s)+'</small></div><span class="fc-chip '+k.st+'">'+ROT[k.st]+'</span></div>'; });

    h+='<div class="fc-sec">Abrir deste cliente</div><div class="fc-atalhos">';
    ATALHOS.forEach(function(a){
      var o=conta[a.k];
      h+='<button class="fc-atalho" data-fc-vai="'+a.k+'"><span class="ic">'+a.ic+'</span><b>'+a.t+'</b><small>'+a.s+'</small>'+(o?('<i class="'+(o.ba?'':'wa')+'">'+o.n+'</i>'):'')+'</button>';
    });
    h+='</div><div class="fc-sec">Cadastro</div>'+abaCad(c,p)+'</div>';
    box.innerHTML=h;

    el('fc-lg').onclick=function(){
      if(typeof window.apLancarGuia==='function') window.apLancarGuia(nome, x.tipo==='MEI'?'':'DAS Simples Nacional', '', '\u{1F4CB} Lançando guia para '+nome+'.');
      else irMenu(/Guias/);
    };
    [].forEach.call(box.querySelectorAll('[data-fc-vai]'),function(b){ b.onclick=function(){ irPara(b.getAttribute('data-fc-vai')); }; });
  }
  /* atalhos da ficha -> abas de verdade (o foco ja esta ligado, entao elas abrem filtradas) */
  var ATALHOS=[
    {k:'guias',    ic:'\u{1F4CB}', t:'Guias',            s:'lançar, editar, dar baixa', re:/Guias/},
    {k:'hon',      ic:'\u{1F4B3}', t:'Honorários',       s:'cobrança e baixa',          re:/Honor/},
    {k:'notas',    ic:'\u{1F9FE}', t:'Notas Fiscais',    s:'pedidos e notas',           re:/Notas? Fisca/},
    {k:'docs',     ic:'\u{1F4C4}', t:'Documentos',       s:'o que eu envio',            re:/^\W*Documentos/},
    {k:'pedidos',  ic:'\u{1F4E8}', t:'Doc. Solicitados', s:'o que eu pedi',             re:/Doc\.? Solicitados/},
    {k:'solic',    ic:'\u{1F4AC}', t:'Solicitações',     s:'pedidos do cliente',        re:/Solicita/},
    {k:'receb',    ic:'\u{1F4E5}', t:'Recebidos',        s:'o que ele mandou',          re:/Recebidos/},
    {k:'extratos', ic:'\u{1F3E6}', t:'Extratos',         s:'grade com a linha acesa',   re:/Extratos/},
    {k:'obrig',    ic:'\u{1F5C2}\u{FE0F}', t:'Obrigações CNPJ', s:'grade com a linha acesa', re:/Obriga.*CNPJ/},
    {k:'pseg',     ic:'\u{1F6E1}\u{FE0F}', t:'Painel Seguro DAS', s:'PGDAS-D e DAS',     re:/Painel Seguro/},
    {k:'cad',      ic:'\u{1F4D1}', t:'Dados Cadastrais', s:'contrato, CNPJ, certidões', re:/Dados Cadastrais/}
  ];
  function irPara(k){
    for(var i=0;i<ATALHOS.length;i++){ if(ATALHOS[i].k===k){
      if(!irMenu(ATALHOS[i].re)){ aviso('Não encontrei essa aba no menu.','warn'); return; }
      try{ window.scrollTo(0,0); var m=document.querySelector('#view-painel .main, #view-painel .content'); if(m) m.scrollTop=0; }catch(e){}
      return;
    } }
  }

  /* botao "Abrir ficha completa" na janela rapida da busca do Inicio */
  function ponteInicio(){
    var m=el('ap-hm-modal'); if(!m || m.getAttribute('data-fc')) return;
    var bts=m.querySelector('.bts'), h3=m.querySelector('h3'); if(!bts || !h3) return;
    m.setAttribute('data-fc','1');
    var b=document.createElement('button'); b.className='bt az'; b.textContent='\u{1F4C7} Abrir ficha completa';
    b.onclick=function(){ var n=(h3.textContent||'').trim(); m.remove(); abrirFicha(n); };
    bts.insertBefore(b, bts.firstChild);
  }

  /* ================= relogio ================= */
  var ocupado=false, voltas=0;
  function noPainel(){ var painel=el('view-painel'); return !!(painel && painel.classList.contains('active') && ehAdmin()); }
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      if(noPainel()){
        css(); menu(); pagina();
        var pg=el('pp-fichas'), naTela=pg && pg.classList.contains('active');
        var digitando=!!(document.activeElement && document.activeElement.id==='fc-q');
        if(voltas===2 || voltas%43===0){ await carregar(240000); if(naTela && !digitando) render(); aplicarFoco(true); }
      }
    }catch(e){}
    ocupado=false;
  }
  /* relogio rapido: historico de telas + filtro do cliente em foco (as listas do app se redesenham sozinhas) */
  function rapido(){
    try{
      if(!noPainel()){ var t=el('fc-topo'); if(t) t.classList.remove('on'); return; }
      ponteInicio(); vigiar(); aplicarFoco(false);
    }catch(e){}
  }
  [1800,4200,9000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,7000);
  setInterval(rapido,500);

  window.apAbrirFicha=abrirFicha;
  window.apFocarCliente=function(n){ if(n) focar(n); else desfocar(); };
  window.__FICHA__={carregar:carregar, render:render, pendencias:pendencias, abrirFicha:abrirFicha, abrir:abrir, focar:focar, desfocar:desfocar, voltar:voltar,
                    estado:function(){ return {lista:lista, sel:sel, foco:foco, hist:hist, D:D}; }, vencDia:vencDia};
})();
