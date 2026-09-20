/* APARAT - FICHA UNICA DO CLIENTE (v1, 20/09/2026) - uso exclusivo do escritorio
   - item de menu "Fichas dos Clientes" (#ap-nav-fichas) e pagina #pp-fichas
   - lista dos clientes ativos com sinal (atrasado / atencao / em dia) e o motivo
   - ficha com abas: Resumo, Guias, Obrigacoes CNPJ, Extratos, Notas, Documentos,
     Solicitacoes, Honorarios e Cadastro
   - SOMENTE LEITURA: nao cria colecao e nao grava nada. Le as mesmas colecoes
     das abas atuais (clientes, perfilFiscal, obrigacoes, honorarios, extratos,
     obrigCnpj, notas, solicitacoes, pagamentos, docs, pedidos, enviosCliente)
   - "Lancar guia" usa a ponte window.apLancarGuia() que ja existe
   - window.apAbrirFicha(nome) abre a ficha de qualquer lugar                       */
;(function(){
  if(window.__APARAT_FICHA__) return; window.__APARAT_FICHA__=1;

  var INICIO_PADRAO='2026-07';
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var ROT={ok:'Em dia', wa:'Atenção', ba:'Atrasado', ne:'Info'};
  var ABAS=[['resumo','Resumo'],['guias','Guias'],['obrig','Obrigações CNPJ'],['extratos','Extratos'],['notas','Notas fiscais'],
            ['docs','Documentos'],['solic','Solicitações'],['hon','Honorários'],['cad','Cadastro']];
  var COLS=['clientes','perfilFiscal','obrigacoes','honorarios','extratos','obrigCnpj','notas','solicitacoes','pagamentos'];
  var COLS_FICHA=['docs','pedidos','enviosCliente'];

  var D={}, tCarga=0, carregando=false, lista=[], sel=null, aba='resumo', filtro='todos', busca='', REG=[], extra={};

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
  async function carregarExtra(nome, forcar){
    if(!forcar && extra[nome] && (Date.now()-extra[nome].t)<90000) return extra[nome];
    var r={t:Date.now()}, d=db();
    for(var i=0;i<COLS_FICHA.length;i++){
      var col=COLS_FICHA[i], v=[];
      try{
        if(d){ var s=await d.collection(col).where('cliente','==',nome).get(); s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; v.push(o); }); }
        else { v=(await pega(col)).filter(function(o){ return mesmo(o.cliente,nome); }); }
      }catch(e){ v=[]; }
      r[col]=v;
    }
    extra[nome]=r; return r;
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
      if(n<0) P.push({st:'ba', t:par[1], s:'Venceu em '+dataBR(v), aba:'cad'});
      else if(n<=60) P.push({st:'wa', t:par[1], s:'Vence em '+n+' dia'+(n===1?'':'s')+' ('+dataBR(v)+')', aba:'cad'});
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
  async function abrirFicha(nome, qualAba){
    menu(); pagina(); mostrarPagina();
    sel=String(nome||'').trim(); aba=qualAba||'resumo';
    render(); await carregar(false); render();
    await carregarExtra(sel,false); if(sel) render();
  }
  function irMenu(re){
    var it=[].slice.call(document.querySelectorAll('#view-painel .sidebar .nav .nav-item')).filter(function(x){ return x.id!=='ap-nav-fichas' && re.test(x.textContent||''); })[0];
    if(it) it.click();
  }

  /* ================= arquivos ================= */
  function fonte(r){ return r ? (r.arquivoData||r.arquivoUrl||r.comprovanteUrl||r.comprovanteData||'') : ''; }
  function nomeArq(r){ return String(r.arquivoNome||r.arquivo||r.nome||r.titulo||'arquivo').replace(/[\\\/:*?"<>|]+/g,'-'); }
  async function abrirArq(r, baixar){
    var src=fonte(r); if(!src){ aviso('Este registro não tem arquivo anexado.','info'); return; }
    try{
      var url=src, blobUrl=null;
      if(/^data:/i.test(src) || baixar){
        try{ var b=await (await fetch(src)).blob(); blobUrl=URL.createObjectURL(b); url=blobUrl; }catch(e){ url=src; }
      }
      if(baixar){
        var a=document.createElement('a'); a.href=url; a.download=nomeArq(r); a.setAttribute('data-bx','1'); a.style.display='none';
        document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); },500);
      }else{ window.open(url,'_blank'); }
      if(blobUrl) setTimeout(function(){ try{ URL.revokeObjectURL(blobUrl); }catch(e){} }, 60000);
    }catch(e){ aviso('Não consegui abrir o arquivo.','warn'); }
  }
  function btsArq(r){
    if(!fonte(r)) return '';
    REG.push(r); var i=REG.length-1;
    return '<button class="fc-bt mini" data-fc-ver="'+i+'">\u{1F4C4} Ver</button><button class="fc-bt mini" data-fc-bx="'+i+'">\u{2B07}\u{FE0F} Baixar</button>';
  }
  function linha(t, s, st, rot, r){
    return '<div class="fc-lin"><div class="fc-t"><b>'+esc(t)+'</b><small>'+esc(s)+'</small></div>'+(r?btsArq(r):'')
          +'<span class="fc-chip '+st+'">'+esc(rot||ROT[st])+'</span></div>';
  }
  function vazio(m){ return '<div class="fc-vazio">'+esc(m)+'</div>'; }
  function ts(o){
    try{ if(o.criadoEm && o.criadoEm.seconds) return o.criadoEm.seconds*1000; }catch(e){}
    if(o.ts) return Number(o.ts)||0;
    var s=String(o.data||o.criadoEm||''); var m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/); if(m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
    var t=Date.parse(s); return isNaN(t)?0:t;
  }
  function recentes(v){ return v.slice().sort(function(a,b){ return ts(b)-ts(a); }); }

  /* ================= abas da ficha ================= */
  function abaGuias(nome){
    var hoje=hojeISO(), lim=maisDias(5), dec={};
    declPendente(nome).forEach(function(d){ dec[String(d.refId)]=d; });
    var gs=de('obrigacoes',nome).slice().sort(function(a,b){ return String(b.vencimento||'').localeCompare(String(a.vencimento||'')); });
    if(!gs.length) return vazio('Nenhuma guia lançada para este cliente.');
    return gs.slice(0,80).map(function(g){
      var v=String(g.vencimento||'').slice(0,10), st='ne', rot='A vencer';
      if(guiaPaga(g)){ st='ok'; rot=String(g.status||'Paga'); }
      else if(dec[String(g.id)]){ st='wa'; rot='Cliente diz que pagou'; }
      else if(v && v<hoje){ st='ba'; rot='Vencida'; }
      else if(v && v<=lim){ st='wa'; rot='Vence em breve'; }
      var sub=(v?('Vencimento '+dataBR(v)):'Sem vencimento')+(num(g.valor)?(' · '+moeda(num(g.valor))):'')+(g.competencia?(' · competência '+g.competencia):'')
             +(g.pagoEm?(' · pago em '+dataBR(g.pagoEm)):'')+(fonte(g)?'':' · sem arquivo anexado');
      return linha(String(g.tipo||'Guia'), sub, st, rot, g);
    }).join('');
  }
  function abaObrig(c, p){
    var nome=c.nome, h='', cp0=compAnterior(), OB=obrsMensais(p);
    var SIT={ok:['ok','Feito'], an:['wa','Em andamento'], na:['ne','Não se aplica'], at:['ba','Atrasado'], pd:['ne','A fazer']};
    if(!OB.length) h+=vazio('Sem obrigação mensal configurada para o regime deste cliente.');
    for(var k=0;k<3;k++){
      var cp=compMais(cp0,-k); if(cp < String(p.inicio||INICIO_PADRAO)) break;
      if(!OB.length) break;
      h+='<div class="fc-sec">Competência '+esc(compTxt(cp))+'</div>';
      OB.forEach(function(o){
        var x=sitObrig(nome,p,o,cp), m=SIT[x.st]||['ne',x.st], r=x.r||{};
        var sub='Prazo '+dataBR(x.venc||'')+(x.guia?' · guia já lançada na aba Guias':'')+(r.entregaEm?(' · feito em '+dataBR(r.entregaEm)):'')+(r.protocolo?(' · protocolo '+r.protocolo):'')+(Number(r.valor)?(' · '+moeda(r.valor)):'')+(r.obs?(' · '+r.obs):'');
        h+=linha(o.n, sub, m[0], m[1]);
      });
      var e=extratoDe(nome,cp), pz=vencDia(cp,10,false);
      h+=linha('Extrato bancário', e ? (e.semMovimento?'Sem movimento no mês':'Entregue'+(e.enviadoEm?(' em '+e.enviadoEm):'')) : ('Prazo '+dataBR(pz)+' · espelho da aba Extratos'),
               e?'ok':(hojeISO()>pz?'ba':'ne'), e?'Entregue':(hojeISO()>pz?'Pendente':'No prazo'));
    }
    var ano=String(new Date().getFullYear()), an=(D.obrigCnpj||[]).filter(function(r){ return mesmo(r.cliente,nome) && /^\d{4}$/.test(String(r.competencia||'')); })
      .sort(function(a,b){ return String(b.competencia).localeCompare(String(a.competencia)); });
    h+='<div class="fc-sec">Anuais</div>';
    if(!an.length) h+=vazio('Nenhuma obrigação anual marcada ainda em '+ano+' — veja a grade em Obrigações CNPJ → Anuais.');
    an.forEach(function(r){ var m=SIT[r.status]||['ne',String(r.status||'')]; h+=linha(String(r.sigla||'')+' '+String(r.competencia||''), (r.entregaEm?('Entregue em '+dataBR(r.entregaEm)):'')+(r.protocolo?(' · protocolo '+r.protocolo):''), m[0], m[1]); });
    return h;
  }
  function abaExtratos(c, p){
    var nome=c.nome, h='', cp0=compAnterior(), hoje=hojeISO(), n=0;
    for(var k=-1;k<6;k++){
      var cp=compMais(cp0,-k); if(cp < String(p.inicio||INICIO_PADRAO)) break;
      var e=extratoDe(nome,cp), pz=vencDia(cp,10,false); n++;
      if(e) h+=linha('Extrato '+compTxt(cp), e.semMovimento ? 'Marcado como sem movimento' : ('Entregue'+(e.enviadoEm?(' em '+e.enviadoEm):'')+(e.arquivoNome?(' · '+e.arquivoNome):'')+(e.origem?(' · enviado por: '+e.origem):'')), 'ok', e.semMovimento?'Sem movimento':'Entregue', e);
      else h+=linha('Extrato '+compTxt(cp), 'Prazo '+dataBR(pz), hoje>pz?'ba':'ne', hoje>pz?'Não entregue':'No prazo');
    }
    return n ? h : vazio('O controle de extratos deste cliente ainda não começou.');
  }
  function abaNotas(nome){
    var ns=recentes(de('notas',nome)); if(!ns.length) return vazio('Nenhuma nota fiscal ou pedido de emissão deste cliente.');
    return ns.slice(0,80).map(function(n){
      var ped=String(n.origem||'')==='cliente', ab=pedidoNF(n);
      var t=(ped?(String(n.tipo||'Pedido')+' do cliente'):String(n.tipo||'Nota'))+(n.numero?(' nº '+n.numero):'');
      var sub=String(n.data||'')+(num(n.valor)?(' · '+moeda(num(n.valor))):'')+(n.descricao?(' · '+String(n.descricao).slice(0,110)):'')+(n.resposta?(' · resposta: '+String(n.resposta).slice(0,80)):'');
      return linha(t, sub, ab?'wa':(/emitida|enviad|conclu/i.test(String(n.status||''))?'ok':'ne'), String(n.status||(ab?'Pedido':'Nota')), n);
    }).join('');
  }
  function abaDocs(nome){
    var x=extra[nome]; if(!x) return vazio('Carregando os documentos...');
    var h='<div class="fc-sec">Enviados ao cliente (aba Documentos)</div>';
    var a=recentes(x.docs||[]); h+= a.length ? a.slice(0,60).map(function(d){ return linha(String(d.nome||'Documento'), String(d.tipo||'')+(d.data?(' · '+d.data):''), 'ne', 'Arquivo', d); }).join('') : vazio('Nada enviado ainda.');
    h+='<div class="fc-sec">Pedidos ao cliente (Doc. Solicitados)</div>';
    var b=recentes(x.pedidos||[]); h+= b.length ? b.slice(0,60).map(function(d){ return linha(String(d.titulo||'Pedido'), String(d.descricao||'').slice(0,110)+(d.data?(' · '+d.data):''), 'ne', String(d.status||'Arquivo'), d); }).join('') : vazio('Nenhum pedido.');
    h+='<div class="fc-sec">Recebidos do cliente</div>';
    var r=recentes(x.enviosCliente||[]); h+= r.length ? r.slice(0,60).map(function(d){ return linha(String(d.nome||'Arquivo'), String(d.tipo||'')+(d.data?(' · '+d.data):''), 'ne', 'Recebido', d); }).join('') : vazio('O cliente ainda não enviou arquivos.');
    return h;
  }
  function abaSolic(nome){
    var ss=recentes(de('solicitacoes',nome)); if(!ss.length) return vazio('Nenhuma solicitação deste cliente.');
    return ss.slice(0,80).map(function(s){
      var ab=solicAberta(s);
      return linha(String(s.servico||'Solicitação'), String(s.data||'')+(s.mensagem?(' · '+String(s.mensagem).slice(0,140)):'')+(s.resposta?(' · resposta: '+String(s.resposta).slice(0,90)):''), ab?'wa':'ok', String(s.status||(ab?'Aberta':'Atendida')), s);
    }).join('');
  }
  function abaHon(nome){
    var hoje=hojeISO(), dec={};
    declPendente(nome).forEach(function(d){ dec[String(d.refId)]=d; });
    var hs=de('honorarios',nome).slice().sort(function(a,b){ return String(b.vencimento||'').localeCompare(String(a.vencimento||'')); });
    if(!hs.length) return vazio('Nenhum honorário lançado para este cliente.');
    return hs.slice(0,80).map(function(o){
      var v=String(o.vencimento||'').slice(0,10), st='ne', rot='A vencer';
      if(honPago(o)){ st='ok'; rot='Pago'; } else if(dec[String(o.id)]){ st='wa'; rot='Cliente diz que pagou'; } else if(v && v<hoje){ st='ba'; rot='Em atraso'; }
      return linha('Honorário '+String(o.referencia||''), (v?('Vencimento '+dataBR(v)):'')+' · '+moeda(num(o.valor))+(o.pagoEm?(' · pago em '+dataBR(o.pagoEm)):''), st, rot, o);
    }).join('');
  }
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
    REG=[];
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
      h+='<div class="fc-cli '+x.st+'" data-fc-cli="'+esc(x.nome)+'"><div class="fc-av">'+esc(iniciais(x.nome))+'</div><div style="flex:1;min-width:0"><b>'+esc(x.nome)+'</b>'
        +'<small>'+x.tipo+' · '+esc(cnpjFmt(x.c.cnpj))+'</small><div class="fc-mot"><span class="fc-chip '+x.st+'">'+ROT[x.st]+'</span> '+esc(x.motivo)+'</div></div></div>';
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
    var tri='<div class="fc-tri">\u{1F3E0} Início › <a id="fc-volta">Fichas dos Clientes</a> › <b style="color:inherit">'+esc(sel)+'</b></div>';
    if(!x){ box.innerHTML=tri+'<div class="fc-card"><div class="fc-vazio">'+(tCarga?'Cliente não encontrado entre os ativos.':'Carregando a ficha...')+'</div></div>'; var vv=el('fc-volta'); if(vv) vv.onclick=function(){ sel=null; render(); }; return; }
    var c=x.c, p=x.p, nome=x.nome, cp=compAnterior(), hoje=hojeISO();
    var gAb=de('obrigacoes',nome).filter(function(g){ return !guiaPaga(g); });
    var gVe=gAb.filter(function(g){ var v=String(g.vencimento||'').slice(0,10); return v && v<hoje; }).length;
    var hAb=de('honorarios',nome).filter(function(o){ return !honPago(o); }), hTot=0; hAb.forEach(function(o){ hTot+=num(o.valor); });
    var hVe=hAb.filter(function(o){ var v=String(o.vencimento||'').slice(0,10); return v && v<hoje; }).length;
    var ex=extratoDe(nome,cp), exCabe=cp>=String(p.inicio||INICIO_PADRAO), exAtr=!ex && hoje>vencDia(cp,10,false);
    var ped=de('solicitacoes',nome).filter(solicAberta).length+de('notas',nome).filter(pedidoNF).length;
    var tel=soDig(c.whatsapp||c.telefone||c.celular||''), txt='Olá! Aqui é a APARAT Contabilidade.';
    var wa=tel ? ('https://wa.me/55'+tel+'?text='+encodeURIComponent(txt)) : ('https://wa.me/?text='+encodeURIComponent(txt));
    var alerta={}; x.P.forEach(function(k){ if(!alerta[k.aba] || k.st==='ba') alerta[k.aba]=k.st; });

    var h=tri+'<div class="fc-card"><div class="fc-cab"><div class="fc-av">'+esc(iniciais(nome))+'</div><div class="fc-inf"><b>'+esc(nome)+'</b>'
      +'<span>'+x.tipo+' · '+esc(String(c.regime||p.regime||'regime não informado'))+(p.anexo?(' · anexo '+esc(p.anexo)):'')+'</span><span>'+esc(cnpjFmt(c.cnpj))+'</span></div>'
      +'<span class="fc-chip '+x.st+'">'+ROT[x.st]+'</span>'
      +'<a class="fc-bt" href="'+esc(wa)+'" target="_blank" rel="noopener">\u{1F4F2} WhatsApp</a>'
      +'<button class="fc-bt az" id="fc-lg">\u{2795} Lançar guia</button></div>';
    h+='<div class="fc-nums">'
      +'<div class="fc-num"><small>Guias em aberto</small><b class="'+(gVe?'c-ba':(gAb.length?'c-wa':'c-ok'))+'">'+gAb.length+(gVe?(' · '+gVe+' vencida'+(gVe>1?'s':'')):'')+'</b></div>'
      +'<div class="fc-num"><small>Honorários em aberto</small><b class="'+(hVe?'c-ba':(hAb.length?'c-wa':'c-ok'))+'">'+(hAb.length?(hAb.length+' · '+moeda(hTot)):'Nenhum')+'</b></div>'
      +'<div class="fc-num"><small>Extrato '+esc(compTxt(cp))+'</small><b class="'+(!exCabe?'':(ex?'c-ok':(exAtr?'c-ba':'c-wa')))+'">'+(!exCabe?'—':(ex?(ex.semMovimento?'Sem movimento':'Entregue'):(exAtr?'Não entregue':'Aguardando')))+'</b></div>'
      +'<div class="fc-num"><small>Pedidos do cliente em aberto</small><b class="'+(ped?'c-wa':'c-ok')+'">'+ped+'</b></div></div>';
    h+='<div class="fc-abas">';
    ABAS.forEach(function(a){ h+='<button class="fc-aba'+(aba===a[0]?' on':'')+'" data-fc-aba="'+a[0]+'">'+a[1]+(a[0]!=='resumo'&&alerta[a[0]]?('<i class="'+(alerta[a[0]]==='wa'?'wa':'')+'"></i>'):'')+'</button>'; });
    h+='</div><div id="fc-pane">';
    var IR={guias:[/Guias/,'Abrir a aba Guias'], obrig:[/Obriga.*CNPJ/,'Abrir Obrigações CNPJ'], extratos:[/Extratos/,'Abrir a aba Extratos'], notas:[/Nota/,'Abrir Notas Fiscais'],
            docs:[/^\W*Documentos/,'Abrir a aba Documentos'], solic:[/Solicita/,'Abrir Solicitações'], hon:[/Honor/,'Abrir Honorários'], cad:[/Dados Cadastrais/,'Abrir Dados Cadastrais']};
    if(aba==='resumo'){
      if(!x.P.length) h+=linha('Tudo em dia','Nenhuma pendência encontrada para este cliente.','ok','Em dia');
      x.P.forEach(function(k){ h+='<div class="fc-lin clic" data-fc-vai="'+k.aba+'"><div class="fc-t"><b>'+esc(k.t)+'</b><small>'+esc(k.s)+'</small></div><span class="fc-chip '+k.st+'">'+ROT[k.st]+'</span></div>'; });
    }
    else if(aba==='guias') h+=abaGuias(nome);
    else if(aba==='obrig') h+=abaObrig(c,p);
    else if(aba==='extratos') h+=abaExtratos(c,p);
    else if(aba==='notas') h+=abaNotas(nome);
    else if(aba==='docs') h+=abaDocs(nome);
    else if(aba==='solic') h+=abaSolic(nome);
    else if(aba==='hon') h+=abaHon(nome);
    else if(aba==='cad') h+=abaCad(c,p);
    h+='</div>';
    if(IR[aba]) h+='<div class="fc-pe"><button class="fc-bt" id="fc-ir">\u{2197}\u{FE0F} '+IR[aba][1]+'</button></div>';
    h+='</div>';
    box.innerHTML=h;

    el('fc-volta').onclick=function(){ sel=null; render(); };
    el('fc-lg').onclick=function(){
      if(typeof window.apLancarGuia==='function') window.apLancarGuia(nome, x.tipo==='MEI'?'':'DAS Simples Nacional', '', '\u{1F4CB} Lançando guia para '+nome+'.');
      else irMenu(/Guias/);
    };
    [].forEach.call(box.querySelectorAll('[data-fc-aba]'),function(b){ b.onclick=function(){ aba=b.getAttribute('data-fc-aba'); render(); if(aba==='docs' && !extra[nome]) carregarExtra(nome,false).then(function(){ if(sel===nome && aba==='docs') render(); }); }; });
    [].forEach.call(box.querySelectorAll('[data-fc-vai]'),function(b){ b.onclick=function(){ aba=b.getAttribute('data-fc-vai'); render(); }; });
    [].forEach.call(box.querySelectorAll('[data-fc-ver]'),function(b){ b.onclick=function(ev){ ev.stopPropagation(); abrirArq(REG[Number(b.getAttribute('data-fc-ver'))], false); }; });
    [].forEach.call(box.querySelectorAll('[data-fc-bx]'),function(b){ b.onclick=function(ev){ ev.stopPropagation(); abrirArq(REG[Number(b.getAttribute('data-fc-bx'))], true); }; });
    var ir=el('fc-ir'); if(ir && IR[aba]) ir.onclick=function(){ irMenu(IR[aba][0]); };
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
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      var painel=el('view-painel');
      if(painel && painel.classList.contains('active') && ehAdmin()){
        css(); menu(); pagina();
        var pg=el('pp-fichas'), naTela=pg && pg.classList.contains('active');
        var digitando=!!(document.activeElement && document.activeElement.id==='fc-q');
        if(voltas===2 || voltas%43===0){ await carregar(240000); if(naTela && !digitando) render(); }
      }
    }catch(e){}
    ocupado=false;
  }
  [1800,4200,9000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,7000);
  setInterval(function(){ try{ ponteInicio(); }catch(e){} },600);

  window.apAbrirFicha=abrirFicha;
  window.__FICHA__={carregar:carregar, render:render, pendencias:pendencias, abrirFicha:abrirFicha, abrir:abrir,
                    estado:function(){ return {lista:lista, sel:sel, aba:aba, D:D}; }, vencDia:vencDia};
})();
