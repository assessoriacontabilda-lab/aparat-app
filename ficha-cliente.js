/* APARAT - FICHA DO CLIENTE + CLIENTE EM FOCO (v4, 20/09/2026) - uso exclusivo do escritorio
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
   - v3: DOIS SINAIS por cliente. FINANCEIRO (vermelho so com honorario ou guia vencida) e
     TRABALHO DO MES (o que o escritorio ainda nao fez na competencia anterior pisca em
     laranja neon; nunca fica vermelho). Extrato nao registrado deixou de pintar o cliente todo.
   - v3: a ficha virou o checklist do mes, com botao "Feito" / "Realizado" / "Desfazer":
       . obrigacao mensal -> grava em obrigCnpj, MESMO documento da grade Obrigacoes CNPJ ->
         Mensais (id cliente__AAAA-MM__SIGLA, status ok, origem 'Ficha do Cliente')
       . extrato -> grava em extratos (id cliente__AAAA-MM), sem arquivo, campo realizado:true;
         "Sem movimento" grava igual ao botao da aba Extratos
       . aba Extratos ganha "Marcar todos de MM/AAAA como realizados" (com confirmacao) e o
         botao "Realizado" dentro da janela de cada celula pendente
     Desfazer so apaga o que a propria ficha gravou. Nao cria colecao nova.
   - v4: CALENDARIO do escritorio (menu "Calendario", pagina #pp-calend): as tarefas de TODOS
     os clientes no dia em que vencem, com dia util ja ajustado; clicando no dia sai a lista de
     clientes com o botao Feito. E SELETOR DE COMPETENCIA (compSel) na lista, na ficha e no
     calendario, para olhar meses fechados sem mudar nada.
   - v4: VIRADA DO MES no dia 1o. Nao apaga NADA: a competencia corrente ja e compAnterior(),
     entao no dia 1o o checklist zera sozinho; o modulo so mostra a faixa "competencia X aberta"
     uma vez por mes (localStorage apFichaVirada) com o resumo do mes que fechou.
   - o filtro do cliente em foco so esconde elementos na tela (classe fc-oculto)
   - window.apAbrirFicha(nome) abre a ficha; window.apFocarCliente(nome|null) liga/desliga o foco */
;(function(){
  if(window.__APARAT_FICHA__) return; window.__APARAT_FICHA__=1;

  var INICIO_PADRAO='2026-07', ORIGEM='Ficha do Cliente';
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var ROT={ok:'Em dia', wa:'Atenção', ba:'Atrasado', ne:'Info'};
  var COLS=['clientes','perfilFiscal','obrigacoes','honorarios','extratos','obrigCnpj','notas','solicitacoes','pagamentos'];

  var D={}, tCarga=0, carregando=false, lista=[], sel=null, filtro='todos', busca='';
  var foco=null, hist=[], pagAtual='', selAtual=null, voltando=false, preenchido='', rolado='', contagem='';
  var compSel=null, diaSel=null, calContagem='';

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
  /* competencia que as telas estao mostrando (a corrente e sempre o mes anterior) */
  function compAtiva(){ return compSel || compAnterior(); }
  function compNome(c){ var p=String(c).split('-'); return (MESES[Number(p[1])-1]||'')+' de '+p[0]; }
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

  /* ---- trabalho do mes (competencia anterior): checklist do escritorio ---- */
  function trabalhoDoMes(c){
    var nome=c.nome, p=perfilDe(c), cp=compAtiva(), hoje=hojeISO(), T=[];
    if(cp < String(p.inicio||INICIO_PADRAO)) return T;
    var obrs=obrsMensais(p).slice();
    if(p.regime==='Simples') obrs.unshift({s:'PGDAS', n:'PGDAS-D', dia:20});
    obrs.forEach(function(o){
      var x=sitObrig(nome,p,o,cp), r=x.r||null;
      if(x.st==='na') return;
      var feito=(x.st==='ok');
      T.push({tipo:'obr', sigla:o.s, n:o.n+' '+compTxt(cp), cp:cp, venc:x.venc, feito:feito, andamento:(x.st==='an'),
              vencido:(!feito && hoje>x.venc), r:r, porGuia:!!x.guia, meu:!!(r && r.origem===ORIGEM)});
    });
    var e=extratoDe(nome,cp), pz=vencDia(cp,10,false);
    T.push({tipo:'ext', n:'Extrato bancário '+compTxt(cp), cp:cp, venc:pz, feito:!!e, vencido:(!e && hoje>pz), r:e, meu:!!(e && e.origemFicha && !e.arquivoUrl && !e.arquivoData)});
    return T;
  }
  /* ---- financeiro: so dinheiro ---- */
  function financeiro(c){
    var nome=c.nome, hoje=hojeISO(), F=[];
    de('obrigacoes',nome).forEach(function(g){
      var v=String(g.vencimento||'').slice(0,10); if(guiaPaga(g)||!v||v>=hoje) return;
      F.push({st:'ba', t:String(g.tipo||'Guia')+(g.competencia?(' '+g.competencia):''), s:'Guia venceu em '+dataBR(v)+' e está sem baixa'+(num(g.valor)?(' · '+moeda(num(g.valor))):''), aba:'guias'});
    });
    de('honorarios',nome).forEach(function(h){
      var v=String(h.vencimento||'').slice(0,10); if(honPago(h)||!v||v>=hoje) return;
      F.push({st:'ba', t:'Honorário '+String(h.referencia||''), s:'Venceu em '+dataBR(v)+' · '+moeda(num(h.valor)), aba:'hon'});
    });
    return F;
  }
  /* ---- avisos: nem dinheiro vencido nem tarefa do mes ---- */
  function avisos(c){
    var nome=c.nome, hoje=hojeISO(), lim=maisDias(5), p=perfilDe(c), A=[];
    de('obrigacoes',nome).forEach(function(g){
      var v=String(g.vencimento||'').slice(0,10); if(guiaPaga(g)||!v) return;
      if(v>=hoje && v<=lim) A.push({st:'wa', t:String(g.tipo||'Guia')+(g.competencia?(' '+g.competencia):''), s:'Guia do cliente vence em '+dataBR(v), aba:'guias'});
    });
    de('solicitacoes',nome).filter(solicAberta).forEach(function(s){
      A.push({st:'wa', t:'Solicitação em aberto', s:String(s.servico||s.mensagem||'').slice(0,90), aba:'solic'});
    });
    de('notas',nome).filter(pedidoNF).forEach(function(n){
      A.push({st:'wa', t:'Pedido de nota fiscal', s:String(n.descricao||'').slice(0,90)+(n.valor?(' · '+moeda(num(n.valor))):''), aba:'notas'});
    });
    declPendente(nome).forEach(function(d){
      A.push({st:'wa', t:'Cliente avisou que pagou', s:'Conferir o pagamento declarado'+(d.declaradoEmBR?(' em '+d.declaradoEmBR):''), aba:(String(d.refColecao||'')==='honorarios'?'hon':'guias')});
    });
    [['certValidade','Certificado digital'],['alvaraValidade','Alvará']].forEach(function(par){
      var v=String(p[par[0]]||'').slice(0,10); if(!v) return; var n=diasAte(v); if(n===null) return;
      if(n<0) A.push({st:'wa', t:par[1], s:'Venceu em '+dataBR(v), aba:'obrig'});
      else if(n<=60) A.push({st:'wa', t:par[1], s:'Vence em '+n+' dia'+(n===1?'':'s')+' ('+dataBR(v)+')', aba:'obrig'});
    });
    return A;
  }
  /* compatibilidade com a v2: tudo junto */
  function pendencias(c){ return financeiro(c).concat(avisos(c)); }

  function montarLista(){
    lista=(D.clientes||[]).filter(function(c){ var n=String(c.nome||'').trim(); return n && n!=='Todos os Clientes' && ativo(c); })
      .map(function(c){
        var F=financeiro(c), T=trabalhoDoMes(c), A=avisos(c), p=perfilDe(c);
        var falta=T.filter(function(t){ return !t.feito; });
        var st = F.length ? 'ba' : ((falta.length||A.length) ? 'wa' : 'ok');
        return {c:c, nome:String(c.nome).trim(), st:st, F:F, T:T, A:A, P:F.concat(A), falta:falta.length, tipo:(p.regime==='MEI'?'MEI':'ME'), p:p};
      });
    lista.sort(function(a,b){ return (b.F.length?1:0)-(a.F.length?1:0) || b.falta-a.falta || b.A.length-a.A.length || a.nome.localeCompare(b.nome); });
    pintarPonto();
  }
  /* a bolinha do menu e so um ponto (sem texto, para nao grudar no nome do quadradinho do Inicio):
     acende quando algum cliente tem dinheiro vencido */
  function pintarPonto(){
    var d=el('dot-fichas'); if(!d) return;
    var n=lista.filter(function(x){ return x.F.length>0; }).length;
    d.textContent=''; d.style.display = n ? 'inline-block' : 'none';
    d.title = n ? (n+' cliente(s) com honorário ou guia vencida') : '';
  }

  /* ================= gravacoes da v3 (Feito / Realizado / Desfazer) ================= */
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function trocaLocal(col, id, dados){
    var v=D[col]||(D[col]=[]), i=-1;
    for(var k=0;k<v.length;k++){ if(v[k].id===id){ i=k; break; } }
    if(dados===null){ if(i>=0) v.splice(i,1); return; }
    dados.id=id; if(i>=0){ for(var f in dados) v[i][f]=dados[f]; } else v.push(dados);
  }
  function depoisDeGravar(){
    montarLista(); render(); aplicarFoco(true);
    try{ var b=el('ex-recarrega'); var pe=el('pp-extratos'); if(b && pe && pe.classList.contains('active')) b.click(); }catch(e){}
  }
  async function marcarObrig(nome, cp, sigla){
    var d=db(); if(!d){ aviso('Sem conexão com a nuvem.','warn'); return false; }
    var id=limpo(nome)+'__'+cp+'__'+sigla;
    var dados={cliente:nome, competencia:cp, sigla:sigla, status:'ok', origem:ORIGEM, responsavel:'Daniel', entregaEm:hojeISO(), atualizadoEm:new Date().toISOString()};
    try{ await d.collection('obrigCnpj').doc(id).set(dados,{merge:true}); trocaLocal('obrigCnpj',id,dados); return true; }
    catch(e){ aviso('Não consegui gravar: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  async function desfazerObrig(nome, cp, sigla){
    var d=db(); if(!d) return false; var id=limpo(nome)+'__'+cp+'__'+sigla, r=regObrig(nome,cp,sigla);
    if(!r || r.origem!==ORIGEM){ aviso('Essa marcação foi feita em outra tela. Desfaça por lá.','info'); return false; }
    try{ await d.collection('obrigCnpj').doc(id).delete(); trocaLocal('obrigCnpj',id,null); return true; }
    catch(e){ aviso('Não consegui desfazer: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  async function marcarExtrato(nome, cp, como){
    var d=db(); if(!d){ aviso('Sem conexão com a nuvem.','warn'); return false; }
    if(extratoDe(nome,cp)) return true;                      /* nunca passa por cima de um extrato ja registrado */
    var id=limpo(nome)+'__'+cp, semMov=/sem movimento/i.test(String(como||''));
    var dados = semMov
      ? {cliente:nome, competencia:cp, semMovimento:true, situacao:'sm', origem:'escritorio', enviadoEm:agoraBR(), ts:Date.now(), realizado:true, origemFicha:true}
      : {cliente:nome, competencia:cp, semMovimento:false, situacao:'ok', arquivoNome:'Realizado — '+String(como||'recebido fora do app'), arquivoUrl:'', arquivoData:'', arquivoPath:'',
         origem:'escritorio', enviadoEm:agoraBR(), ts:Date.now(), realizado:true, origemFicha:true, recebidoPor:String(como||'')};
    try{ await d.collection('extratos').doc(id).set(dados,{merge:true}); trocaLocal('extratos',id,dados); return true; }
    catch(e){ aviso('Não consegui gravar o extrato: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  async function desfazerExtrato(nome, cp){
    var d=db(); if(!d) return false; var r=extratoDe(nome,cp);
    if(!r || !r.origemFicha || r.arquivoUrl || r.arquivoData){ aviso('Esse extrato tem arquivo ou foi registrado em outra tela. Use a aba Extratos.','info'); return false; }
    try{ await d.collection('extratos').doc(limpo(nome)+'__'+cp).delete(); trocaLocal('extratos',r.id,null); return true; }
    catch(e){ aviso('Não consegui desfazer: '+(e&&e.message?e.message:e),'warn'); return false; }
  }
  function semExtrato(cp){
    return lista.filter(function(x){ return cp>=String(x.p.inicio||INICIO_PADRAO) && !extratoDe(x.nome,cp); });
  }
  async function marcarTodosExtratos(cp, como){
    var alvo=semExtrato(cp), ok=0;
    for(var i=0;i<alvo.length;i++){ if(await marcarExtrato(alvo[i].nome, cp, como)) ok++; }
    aviso('\u{2705} '+ok+' extrato(s) de '+compTxt(cp)+' marcados como realizados.','ok');
    depoisDeGravar();
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
      +'#pp-fichas .fc-bol.lar{background:#ff8a00}'
      +'#pp-fichas .fc-cli.v3{flex-direction:column;gap:10px;align-items:stretch}#pp-fichas .fc-cli.v3.din{border-left:4px solid #ff5a4f}'
      +'#pp-fichas .fc-l1{display:flex;gap:11px;align-items:flex-start}'
      +'#pp-fichas .fc-duo{display:grid;grid-template-columns:1fr 1fr;gap:8px}'
      +'#pp-fichas .fc-ind{border-radius:12px;padding:7px 10px;font-size:11px;line-height:1.3;background:rgba(127,140,170,.10);color:var(--cinza);border:1.5px solid transparent;min-width:0}'
      +'#pp-fichas .fc-ind b{display:block;font-size:12.5px;font-weight:800;color:inherit;word-break:break-word}'
      +'#pp-fichas .fc-ind.verm{background:rgba(217,45,32,.14);color:#ff6b60}#pp-fichas .fc-ind.verde{background:rgba(14,159,110,.14);color:#2fd29b}'
      +'#pp-fichas .fc-ind.fazer{background:rgba(255,138,0,.12);border-color:#ff8a00;color:#ff9d2e;animation:fcPisca 1.5s ease-in-out infinite}'
      +'body.ap-esc-claro #pp-fichas .fc-ind.verm{color:#d92d20}body.ap-esc-claro #pp-fichas .fc-ind.verde{color:#0e9f6e}body.ap-esc-claro #pp-fichas .fc-ind.fazer{color:#c25e00}'
      +'@keyframes fcPisca{0%,100%{box-shadow:0 0 0 0 rgba(255,138,0,.55)}50%{box-shadow:0 0 14px 1px rgba(255,138,0,.6)}}'
      +'#pp-fichas .fc-lin.fc-fazer{border:1.5px solid #ff8a00;border-radius:14px;padding:11px 12px;margin:8px 0;background:rgba(255,138,0,.10);animation:fcPisca 1.5s ease-in-out infinite}'
      +'#pp-fichas .fc-lin.fc-feito{opacity:.8}'
      +'@media (prefers-reduced-motion:reduce){#pp-fichas .fc-ind.fazer,#pp-fichas .fc-lin.fc-fazer{animation:none}}'
      +'#pp-fichas .fc-bt.ok{background:#0e9f6e;border-color:#0e9f6e;color:#fff}#pp-fichas .fc-bt.lar{border-color:#ff8a00;color:#ff9d2e}'
      +'#pp-fichas .fc-bt:disabled{opacity:.55;cursor:wait}'
      +'body.ap-esc-claro #pp-fichas .fc-bt.lar{color:#c25e00}'
      +'#pp-fichas .fc-chip.lar,#fc-topo .fc-chip.lar{background:rgba(255,138,0,.13);color:#ff9d2e;border:1px solid #ff8a00}'
      +'body.ap-esc-claro #pp-fichas .fc-chip.lar,body.ap-esc-claro #fc-topo .fc-chip.lar{color:#c25e00}'
      +'#pp-fichas .fc-por{font:inherit;font-size:12px;padding:7px 8px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:inherit;max-width:100%}'
      +'#fc-ex-bar{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:0 0 10px}#fc-ex-bar:empty{display:none}'
      +'#fc-ex-bar .fc-xb{font:inherit;font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer}'
      +'#fc-ex-bar .fc-xb.lar{border-color:#ff8a00;color:#ff9d2e}#fc-ex-bar .fc-xb.ok{background:#0e9f6e;border-color:#0e9f6e;color:#fff}'
      +'body.ap-esc-claro #fc-ex-bar .fc-xb.lar{color:#c25e00}'
      +'#fc-ex-bar .fc-xs{font-size:11.5px;color:var(--cinza)}'
      +'#fc-ex-bar .fc-conf{flex:1;border:2px solid #ff8a00;border-radius:16px;padding:13px 14px;background:var(--card)}'
      +'#fc-ex-bar .fc-conf b{display:block;font-size:13.5px;margin-bottom:3px}#fc-ex-bar .fc-conf span{font-size:12px;color:var(--cinza)}'
      +'#fc-ex-bar .fc-conf div{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}'
      +'#pp-fichas .fc-comp,#pp-calend .fc-comp{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px}'
      +'.fc-cb{font:inherit;font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:inherit;cursor:pointer}'
      +'.fc-cb:hover:not(:disabled){border-color:var(--azul);color:var(--azul-light)}.fc-cb:disabled{opacity:.4;cursor:not-allowed}'
      +'#pp-fichas .fc-comp b,#pp-calend .fc-comp b{font-size:13.5px;font-weight:800;min-width:170px;text-align:center}'
      +'.fc-cs{font-size:11.5px;color:var(--cinza)}'
      +'.fc-virada{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(14,159,110,.10);border:2px solid #0e9f6e;border-radius:16px;padding:12px 14px;margin:0 0 14px}'
      +'.fc-virada b{display:block;font-size:14px;margin-bottom:2px}.fc-virada span{display:block;font-size:12.5px;color:var(--cinza)}'
      +'.fc-virada>div{flex:1;min-width:240px}'
      +'#pp-calend .cal-tit{font-size:15px;font-weight:800;margin-bottom:10px}#pp-calend .cal-tit span{font-size:11.5px;font-weight:400;color:var(--cinza);margin-left:6px}'
      +'#pp-calend .cal-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}'
      +'#pp-calend .cal-h{font-size:10.5px;color:var(--cinza);text-align:center;font-weight:800;padding:3px 0;text-transform:uppercase;letter-spacing:.06em}'
      +'#pp-calend .cal-d{min-width:0;min-height:72px;border:1px solid var(--border);background:var(--card);border-radius:12px;padding:5px;display:flex;flex-direction:column;gap:2px;position:relative}'
      +'#pp-calend .cal-d .n{font-size:12px;font-weight:800;color:var(--cinza)}'
      +'#pp-calend .cal-d.fds{opacity:.55}'
      +'#pp-calend .cal-d.hoje{border:2px solid var(--azul)}#pp-calend .cal-d.hoje .n{color:var(--azul-light)}'
      +'#pp-calend .cal-d.tem{cursor:pointer}#pp-calend .cal-d.tem:hover{border-color:var(--azul)}'
      +'#pp-calend .cal-d.sel{border:2px solid var(--azul);box-shadow:0 0 0 3px rgba(51,85,255,.2)}'
      +'#pp-calend .cal-d .hj{position:absolute;top:4px;right:5px;font-size:9px;color:var(--azul-light);font-weight:800}'
      +'#pp-calend .cal-p{display:block;font-size:10px;border-radius:6px;padding:1px 4px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'#pp-calend .cal-p.a{background:rgba(255,138,0,.13);color:#ff9d2e;border:1px solid #ff8a00}'
      +'#pp-calend .cal-p.b{background:rgba(217,45,32,.14);color:#ff6b60}'
      +'#pp-calend .cal-p.v{background:rgba(14,159,110,.14);color:#2fd29b}'
      +'body.ap-esc-claro #pp-calend .cal-p.a{color:#c25e00}body.ap-esc-claro #pp-calend .cal-p.b{color:#d92d20}body.ap-esc-claro #pp-calend .cal-p.v{color:#0e9f6e}'
      +'#pp-calend .cal-gr{font-size:12px;font-weight:800;margin:12px 0 2px}#pp-calend .cal-gr span{font-weight:400;color:var(--cinza);font-size:11.5px}'
      +'#pp-calend .fc-lin.fc-fazer,#pp-calend .fc-lin.fc-feito,#pp-calend .fc-lin{display:flex;gap:10px;align-items:center;padding:11px 2px;flex-wrap:wrap}'
      +'#pp-calend .fc-lin.fc-fazer{border:1.5px solid #ff8a00;border-radius:14px;padding:11px 12px;margin:6px 0;background:rgba(255,138,0,.10)}'
      +'#pp-calend .fc-lin.fc-feito{opacity:.8;border-bottom:1px dashed var(--border)}'
      +'#pp-calend .fc-t{flex:1;min-width:180px}#pp-calend .fc-t b{display:block;font-size:13.5px;font-weight:700}#pp-calend .fc-t small{font-size:12px;color:var(--cinza)}'
      +'#pp-calend .fc-bt{font:inherit;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer}'
      +'#pp-calend .fc-bt.ok{background:#0e9f6e;border-color:#0e9f6e;color:#fff}#pp-calend .fc-bt:disabled{opacity:.55;cursor:wait}'
      +'#pp-calend .fc-chip{display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px}'
      +'#pp-calend .fc-chip.ok{background:rgba(14,159,110,.16);color:#2fd29b}body.ap-esc-claro #pp-calend .fc-chip.ok{color:#0e9f6e}'
      +'#pp-calend .fc-h{font-size:19px;font-weight:800;margin-bottom:2px}#pp-calend .fc-sub{font-size:12.5px;color:var(--cinza);margin-bottom:12px}'
      +'#pp-calend .fc-card{background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:16px}'
      +'#pp-calend .fc-sec{font-size:10.5px;color:var(--cinza);text-transform:uppercase;letter-spacing:1px;font-weight:800;margin:16px 0 4px}'
      +'#pp-calend .fc-leg{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--cinza)}'
      +'#pp-calend .fc-bol{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}'
      +'#pp-calend .fc-bol.ba{background:#ff5a4f}#pp-calend .fc-bol.lar{background:#ff8a00}#pp-calend .fc-bol.ok{background:#0e9f6e}'
      +'#pp-calend .fc-vazio{padding:18px 4px;font-size:13px;color:var(--cinza)}'
      +'@media(max-width:700px){#pp-calend .cal-g{gap:3px}#pp-calend .cal-d{min-height:56px;padding:3px}#pp-calend .cal-p{font-size:8.5px;padding:1px 3px}#pp-calend .cal-h{font-size:9px}}'
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
    var porId={inicio:'ap-nav-inicio', fichas:'ap-nav-fichas', calend:'ap-nav-calend', pedidos:'ap-nav-ped', extratos:'ap-nav-ext', obcnpj:'ap-nav-obc', pseg:'ap-nav-pseg'}[chave];
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
    var xf=null; for(var q=0;q<lista.length;q++){ if(foco && mesmo(lista[q].nome,foco)){ xf=lista[q]; break; } }
    var assinatura=[foco||'', id, ant?(ant.id+'|'+(ant.sel||'')):'', cont, (id==='pp-fichas'&&sel)?'f':'', xf?(xf.F.length+'/'+xf.falta):''].join('~');
    if(!redesenhar && assinatura===contagem){ grudar(); return; }
    contagem=assinatura;
    var h='';
    if(ant) h+='<button class="fc-volta" id="fc-volta2" title="Voltar para a tela anterior">\u{2190} Voltar para '+esc(nomePagina(ant.id, ant.sel))+'</button>';
    if(foco){
      var x=null; for(var i=0;i<lista.length;i++){ if(mesmo(lista[i].nome,foco)){ x=lista[i]; break; } }
      h+='<div class="fc-faixa"><div class="fc-fav">'+esc(iniciais(foco))+'</div><div class="fc-finf"><small>Trabalhando em</small><b>'+esc(foco)+'</b></div>'
        +(cont?'<span class="fc-cont">'+esc(cont)+'</span>':'')
        +((x&&x.F.length)?'<span class="fc-chip ba" style="display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px">dinheiro vencido</span>':'')
        +((x&&x.falta)?'<span class="fc-chip lar" style="display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px">'+x.falta+' a fazer</span>':'')
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
      if(filtro==='din' && !x.F.length) return false;
      if(filtro==='fazer' && !x.falta) return false;
      if(filtro==='ok' && (x.F.length || x.falta)) return false;
      if((filtro==='ME'||filtro==='MEI') && x.tipo!==filtro) return false;
      if(!q) return true;
      return x.nome.toLowerCase().indexOf(q)>=0 || (qd.length>=3 && soDig(x.c.cnpj).indexOf(qd)>=0);
    });
    var nD=lista.filter(function(x){ return x.F.length; }).length, nF=lista.filter(function(x){ return x.falta; }).length,
        nO=lista.filter(function(x){ return !x.F.length && !x.falta; }).length;
    var h='<div class="fc-h">\u{1F4C7} Fichas dos Clientes</div><div class="fc-sub">Cada cliente tem dois sinais: o <b>dinheiro</b> e o <b>trabalho do mês</b>. Clique para abrir a ficha.</div>'+barraComp()+faixaVirada();
    if(!tCarga){ box.innerHTML=h+'<div class="fc-vazio">Carregando os clientes...</div>'; return; }
    h+='<div class="fc-leg"><span><i class="fc-bol ba"></i>'+nD+' com dinheiro vencido</span><span><i class="fc-bol lar"></i>'+nF+' com trabalho do mês a fazer</span><span><i class="fc-bol ok"></i>'+nO+' em dia</span></div>';
    h+='<div class="fc-barra"><input id="fc-q" placeholder="Buscar por nome ou CNPJ" autocomplete="off" value="'+esc(busca)+'">';
    [['todos','Todos'],['din','Dinheiro vencido'],['fazer','A fazer no mês'],['ok','Em dia'],['ME','Só ME'],['MEI','Só MEI']].forEach(function(f){ h+='<button class="fc-f'+(filtro===f[0]?' on':'')+'" data-fc-f="'+f[0]+'">'+f[1]+'</button>'; });
    h+='<button class="fc-f" id="fc-atu" title="Ler os dados de novo">\u{1F504} Atualizar</button></div><div class="fc-grade">';
    v.forEach(function(x){
      var ac=foco && mesmo(x.nome,foco);
      var fin = x.F.length ? ('<div class="fc-ind verm">\u{1F4B0} Financeiro<b>'+esc(x.F.length===1 ? x.F[0].t : (x.F.length+' vencidos'))+'</b></div>')
                           : '<div class="fc-ind verde">\u{1F4B0} Financeiro<b>Em dia</b></div>';
      var tra = x.falta ? ('<div class="fc-ind fazer">\u{1F4CB} Trabalho do mês<b>'+x.falta+' a fazer</b></div>')
                        : (x.T.length ? '<div class="fc-ind verde">\u{1F4CB} Trabalho do mês<b>Tudo feito</b></div>' : '<div class="fc-ind">\u{1F4CB} Trabalho do mês<b>—</b></div>');
      h+='<div class="fc-cli v3'+(x.F.length?' din':'')+(ac?' aceso':'')+'" data-fc-cli="'+esc(x.nome)+'"><div class="fc-l1"><div class="fc-av">'+esc(iniciais(x.nome))+'</div><div style="flex:1;min-width:0"><b>'+esc(x.nome)+'</b>'
        +'<small>'+x.tipo+' · '+esc(cnpjFmt(x.c.cnpj))+(x.A.length?(' · '+x.A.length+' aviso'+(x.A.length>1?'s':'')):'')+(ac?' · <span class="fc-foco-txt">em foco</span>':'')+'</small></div></div>'
        +'<div class="fc-duo">'+fin+tra+'</div></div>';
    });
    if(!v.length) h+='<div class="fc-vazio" style="grid-column:1/-1">Nenhum cliente encontrado com esse filtro.</div>';
    box.innerHTML=h+'</div>';
    var inp=el('fc-q');
    if(inp) inp.oninput=function(){ busca=inp.value; var p=inp.selectionStart; renderLista(box); var n2=el('fc-q'); if(n2){ n2.focus(); try{ n2.setSelectionRange(p,p); }catch(e){} } };
    [].forEach.call(box.querySelectorAll('[data-fc-f]'),function(b){ b.onclick=function(){ filtro=b.getAttribute('data-fc-f'); renderLista(box); }; });
    [].forEach.call(box.querySelectorAll('[data-fc-cli]'),function(b){ b.onclick=function(){ abrirFicha(b.getAttribute('data-fc-cli')); }; });
    var at=el('fc-atu'); if(at) at.onclick=async function(){ at.disabled=true; at.textContent='Atualizando...'; await carregar(true); render(); };
    ligarComp(box);
  }
  function renderFicha(box){
    var x=null; for(var i=0;i<lista.length;i++){ if(mesmo(lista[i].nome,sel)){ x=lista[i]; break; } }
    if(!x){ box.innerHTML='<div class="fc-card"><div class="fc-vazio">'+(tCarga?'Cliente não encontrado entre os ativos.':'Carregando a ficha...')+'</div></div>'; return; }
    var c=x.c, p=x.p, nome=x.nome, cp=compAtiva(), hoje=hojeISO();
    var hAb=de('honorarios',nome).filter(function(o){ return !honPago(o); }), hTot=0; hAb.forEach(function(o){ hTot+=num(o.valor); });
    var gAb=de('obrigacoes',nome).filter(function(g){ return !guiaPaga(g); });
    var tel=soDig(c.whatsapp||c.telefone||c.celular||''), txt='Olá! Aqui é a APARAT Contabilidade.';
    var wa=tel ? ('https://wa.me/55'+tel+'?text='+encodeURIComponent(txt)) : ('https://wa.me/?text='+encodeURIComponent(txt));
    var conta={}; x.P.forEach(function(k){ var o=conta[k.aba]||(conta[k.aba]={n:0,ba:0}); o.n++; if(k.st==='ba') o.ba++; });

    var h=barraComp()+'<div class="fc-card"><div class="fc-cab"><div class="fc-av">'+esc(iniciais(nome))+'</div><div class="fc-inf"><b>'+esc(nome)+'</b>'
      +'<span>'+x.tipo+' · '+esc(String(c.regime||p.regime||'regime não informado'))+(p.anexo?(' · anexo '+esc(p.anexo)):'')+'</span><span>'+esc(cnpjFmt(c.cnpj))+'</span></div>'
      +'<a class="fc-bt" href="'+esc(wa)+'" target="_blank" rel="noopener">\u{1F4F2} WhatsApp</a>'
      +'<button class="fc-bt az" id="fc-lg">\u{2795} Lançar guia</button></div>';

    /* 1. trabalho do mes */
    h+='<div class="fc-sec">\u{1F4CB} Trabalho do mês — competência '+esc(compTxt(cp))+' '+(x.falta?('<span class="fc-chip lar">'+x.falta+' a fazer</span>'):(x.T.length?'<span class="fc-chip ok">tudo feito</span>':''))+'</div>';
    if(!x.T.length) h+=vazio('O controle mensal deste cliente ainda não começou nesta competência.');
    x.T.forEach(function(t,i){
      if(t.feito){
        var r=t.r||{}, det = t.tipo==='ext'
            ? (r.semMovimento ? 'Sem movimento no mês' : (r.realizado ? String(r.arquivoNome||'Realizado') : ('Entregue'+(r.arquivoNome?(' · '+r.arquivoNome):''))))+(r.enviadoEm?(' · '+r.enviadoEm):'')
            : (t.porGuia ? 'Guia já lançada na aba Guias' : ('Feito'+(r.entregaEm?(' em '+dataBR(r.entregaEm)):'')+(r.origem?(' · '+r.origem):'')));
        h+='<div class="fc-lin fc-feito"><div class="fc-t"><b>\u{2714} '+esc(t.n)+'</b><small>'+esc(det)+'</small></div>'
          +(t.meu?'<button class="fc-bt mini" data-fc-des="'+i+'">\u{21A9}\u{FE0F} Desfazer</button>':'')+'<span class="fc-chip ok">Feito</span></div>';
      }else{
        h+='<div class="fc-lin fc-fazer"><div class="fc-t"><b>'+esc(t.n)+'</b><small>'+(t.vencido?('Prazo era '+dataBR(t.venc)+' · ainda não marcado'):('A fazer · prazo '+dataBR(t.venc)))+(t.andamento?' · em andamento':'')+'</small></div>'
          +(t.tipo==='ext'
             ? '<select class="fc-por" id="fc-por'+i+'"><option>recebido por WhatsApp</option><option>recebido por e-mail</option><option>já lançado no Domínio</option><option>sem movimento no mês</option></select>'
               +'<button class="fc-bt ok" data-fc-ok="'+i+'">\u{2714} Realizado</button><button class="fc-bt lar" data-fc-vai="extratos">\u{1F4CE} Anexar arquivo</button>'
             : '<button class="fc-bt ok" data-fc-ok="'+i+'">\u{2714} Feito</button>')+'</div>';
      }
    });

    /* 2. financeiro */
    h+='<div class="fc-sec">\u{1F4B0} Financeiro</div>';
    h+='<div class="fc-lin clic" data-fc-vai="hon"><div class="fc-t"><b>Honorários</b><small>'+(hAb.length?(hAb.length+' em aberto · '+moeda(hTot)):'Nenhum em aberto')+'</small></div>'
      +'<span class="fc-chip '+(x.F.some(function(k){ return k.aba==='hon'; })?'ba':'ok')+'">'+(x.F.some(function(k){ return k.aba==='hon'; })?'Em atraso':'Em dia')+'</span></div>';
    h+='<div class="fc-lin clic" data-fc-vai="guias"><div class="fc-t"><b>Guias do cliente</b><small>'+(gAb.length?(gAb.length+' em aberto'):'Nenhuma em aberto')+'</small></div>'
      +'<span class="fc-chip '+(x.F.some(function(k){ return k.aba==='guias'; })?'ba':'ok')+'">'+(x.F.some(function(k){ return k.aba==='guias'; })?'Vencida':'Em dia')+'</span></div>';
    x.F.forEach(function(k){ h+='<div class="fc-lin clic" data-fc-vai="'+k.aba+'"><div class="fc-t"><b>'+esc(k.t)+'</b><small>'+esc(k.s)+'</small></div><span class="fc-chip ba">Vencido</span></div>'; });

    /* 3. avisos */
    if(x.A.length){
      h+='<div class="fc-sec">\u{1F514} Avisos</div>';
      x.A.forEach(function(k){ h+='<div class="fc-lin clic" data-fc-vai="'+k.aba+'"><div class="fc-t"><b>'+esc(k.t)+'</b><small>'+esc(k.s)+'</small></div><span class="fc-chip wa">Atenção</span></div>'; });
    }

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
    ligarComp(box);
    [].forEach.call(box.querySelectorAll('[data-fc-vai]'),function(b){ b.onclick=function(){ irPara(b.getAttribute('data-fc-vai')); }; });
    [].forEach.call(box.querySelectorAll('[data-fc-ok]'),function(b){ b.onclick=async function(){
      var t=x.T[Number(b.getAttribute('data-fc-ok'))]; if(!t || b.disabled) return; b.disabled=true; b.textContent='Gravando...';
      var ok = t.tipo==='ext' ? await marcarExtrato(nome, t.cp, (el('fc-por'+b.getAttribute('data-fc-ok'))||{}).value) : await marcarObrig(nome, t.cp, t.sigla);
      if(ok) aviso('\u{2705} '+t.n+' marcado como feito.','ok');
      depoisDeGravar();
    }; });
    [].forEach.call(box.querySelectorAll('[data-fc-des]'),function(b){ b.onclick=async function(){
      var t=x.T[Number(b.getAttribute('data-fc-des'))]; if(!t || b.disabled) return; b.disabled=true;
      if(t.tipo==='ext') await desfazerExtrato(nome, t.cp); else await desfazerObrig(nome, t.cp, t.sigla);
      depoisDeGravar();
    }; });
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

  /* ================= competencia, virada do mes e calendario ================= */
  function barraComp(){
    var cp=compAtiva(), atual=compAnterior();
    return '<div class="fc-comp"><button class="fc-cb" data-fc-comp="-1" title="Mês anterior">\u{25C0}</button>'
      +'<b>Competência '+esc(compTxt(cp))+'</b>'
      +'<button class="fc-cb" data-fc-comp="1" title="Próximo mês"'+(cp>=atual?' disabled':'')+'>\u{25B6}</button>'
      +(cp!==atual ? '<button class="fc-cb hoje" data-fc-comp="0">\u{21BA} Voltar para '+esc(compTxt(atual))+'</button>'
                   : '<span class="fc-cs">mês corrente do controle</span>')+'</div>';
  }
  /* faixa "competencia X aberta" — aparece uma vez por mes, nao apaga nada */
  function faixaVirada(){
    var cp=compAnterior(), dia=new Date().getDate(); if(dia>5) return '';
    var visto=''; try{ visto=localStorage.getItem('apFichaVirada')||''; }catch(e){}
    if(visto===cp) return '';
    var ant=compMais(cp,-1), falta=0, cli=0;
    var guarda=compSel; compSel=ant;
    lista.forEach(function(x){ var T=trabalhoDoMes(x.c), f=T.filter(function(t){ return !t.feito; }).length; if(f){ falta+=f; cli++; } });
    compSel=guarda;
    return '<div class="fc-virada" id="fc-virada"><div><b>\u{1F504} Competência '+esc(compTxt(cp))+' aberta</b>'
      +'<span>O checklist do mês novo começou. '+(falta ? ('De '+esc(compTxt(ant))+' ficaram '+falta+' tarefa(s) em '+cli+' cliente(s) — nada foi apagado, é só voltar a competência para ver.') : ('O mês '+esc(compTxt(ant))+' fechou com tudo feito.'))+'</span></div>'
      +(falta?'<button class="fc-cb" data-fc-comp="ant">Ver '+esc(compTxt(ant))+'</button>':'')
      +'<button class="fc-cb" id="fc-virada-x">\u{2716} Entendi</button></div>';
  }
  function trocaComp(v){
    var atual=compAnterior();
    if(v==='ant') compSel=compMais(atual,-1);
    else if(Number(v)===0) compSel=null;
    else { var n=compMais(compAtiva(), Number(v)); if(n>atual) n=atual; compSel=(n===atual?null:n); }
    diaSel=null; montarLista(); render(); calendario(true); aplicarFoco(true);
  }

  /* ---- calendario: menu, pagina e desenho ---- */
  function menuCal(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-calend')) return;
    var it=document.createElement('div');
    it.className='nav-item'; it.id='ap-nav-calend';
    it.innerHTML='<span class="ni">\u{1F4C5}</span>Calendário<span class="nav-dot" id="dot-calend" style="display:none"></span>';
    it.onclick=function(){ abrirCal(); };
    var f=el('ap-nav-fichas');
    if(f && f.parentNode===nv) nv.insertBefore(it, f.nextSibling); else nv.appendChild(it);
  }
  function paginaCal(){
    if(el('pp-calend')) return;
    var base=el('pp-fichas'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-calend';
    p.innerHTML='<div id="cal-corpo"></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    try{ if(window.ABA_NOMES) window.ABA_NOMES.calend='Calendário'; }catch(e){}
  }
  async function abrirCal(){
    menuCal(); paginaCal();
    try{ if(typeof pPage==='function') pPage('calend', el('ap-nav-calend')); }catch(e){}
    var p=el('pp-calend'); if(p) p.classList.add('active');
    calendario(true); await carregar(false); calendario(true);
  }
  /* mapa dia -> tarefas, a partir do trabalhoDoMes de todos os clientes */
  function tarefasPorDia(){
    var M={};
    lista.forEach(function(x){
      trabalhoDoMes(x.c).forEach(function(t){
        if(!t.venc) return;
        var d=M[t.venc]||(M[t.venc]={});
        var nome=t.tipo==='ext' ? 'Extrato bancário' : t.n.replace(/\s+\d{2}\/\d{4}\s*$/,'');
        var g=d[nome]||(d[nome]={n:0, feitos:0, itens:[]});
        g.n++; if(t.feito) g.feitos++;
        g.itens.push({cli:x.nome, t:t, x:x});
      });
    });
    return M;
  }
  function calendario(forcar){
    var box=el('cal-corpo'); if(!box) return;
    var cp=compAtiva(), M=tarefasPorDia(), hoje=hojeISO();
    var dias=Object.keys(M).sort(), base=dias.length?dias[0].slice(0,7):compMais(cp,1);
    var pa=base.split('-'), ano=Number(pa[0]), mi=Number(pa[1])-1;
    var prim=new Date(ano,mi,1), nd=new Date(ano,mi+1,0).getDate(), off=prim.getDay();
    var tot=0, feitos=0;
    dias.forEach(function(k){ for(var n in M[k]){ tot+=M[k][n].n; feitos+=M[k][n].feitos; } });
    var ass=[cp, diaSel||'', tot, feitos, lista.length, tCarga].join('~');
    if(!forcar && ass===calContagem) return; calContagem=ass;

    var h='<div class="fc-h">\u{1F4C5} Calendário do escritório</div>'
      +'<div class="fc-sub">As tarefas de todos os clientes no dia em que vencem, com o dia útil já ajustado. Clique num dia para ver a lista.</div>'
      +barraComp();
    if(!tCarga){ box.innerHTML=h+'<div class="fc-vazio">Carregando...</div>'; return; }
    h+='<div class="fc-card"><div class="cal-tit">'+esc(compNome(base))+' <span>prazos da competência '+esc(compTxt(cp))+' · '+feitos+' de '+tot+' feitos</span></div>';
    h+='<div class="cal-g">'+['dom','seg','ter','qua','qui','sex','sáb'].map(function(d){ return '<div class="cal-h">'+d+'</div>'; }).join('');
    for(var i=0;i<off;i++) h+='<div></div>';
    for(var d=1;d<=nd;d++){
      var iso=ano+'-'+pad(mi+1)+'-'+pad(d), dw=new Date(ano,mi,d).getDay(), t=M[iso];
      h+='<div class="cal-d'+((dw===0||dw===6)?' fds':'')+(iso===hoje?' hoje':'')+(t?' tem':'')+(diaSel===iso?' sel':'')+'"'+(t?' data-cal-d="'+iso+'"':'')+'>'
        +'<span class="n">'+d+'</span>'+(iso===hoje?'<span class="hj">hoje</span>':'');
      if(t) for(var nome in t){
        var g=t[nome], ok=(g.feitos>=g.n), atras=(!ok && hoje>iso);
        h+='<span class="cal-p '+(ok?'v':(atras?'b':'a'))+'">'+(ok?'\u{2714} ':(g.n-g.feitos)+' ')+esc(nome)+'</span>';
      }
      h+='</div>';
    }
    h+='</div><div class="fc-leg" style="margin-top:10px"><span><i class="fc-bol ba"></i>prazo já passou</span><span><i class="fc-bol lar"></i>a fazer</span><span><i class="fc-bol ok"></i>feito</span></div>';

    if(diaSel && M[diaSel]){
      h+='<div class="fc-sec">Dia '+esc(dataBR(diaSel))+'</div>';
      for(var nm in M[diaSel]){
        var gg=M[diaSel][nm];
        h+='<div class="cal-gr">'+esc(nm)+' <span>'+gg.feitos+' de '+gg.n+' feitos</span></div>';
        gg.itens.slice().sort(function(a,b){ return (a.t.feito?1:0)-(b.t.feito?1:0) || a.cli.localeCompare(b.cli); }).forEach(function(it,i){
          if(it.t.feito) h+='<div class="fc-lin fc-feito"><div class="fc-t"><b>\u{2714} '+esc(it.cli)+'</b><small>'+esc(it.t.n)+'</small></div><span class="fc-chip ok">Feito</span></div>';
          else h+='<div class="fc-lin fc-fazer"><div class="fc-t"><b>'+esc(it.cli)+'</b><small>'+esc(it.t.n)+' · prazo '+dataBR(it.t.venc)+'</small></div>'
            +'<button class="fc-bt ok" data-cal-ok="'+esc(it.cli)+'|'+esc(it.t.tipo)+'|'+esc(it.t.sigla||'')+'|'+esc(it.t.cp)+'">\u{2714} '+(it.t.tipo==='ext'?'Realizado':'Feito')+'</button>'
            +'<button class="fc-bt" data-cal-fi="'+esc(it.cli)+'">\u{1F4C7} Ficha</button></div>';
        });
      }
    } else if(diaSel) h+='<div class="fc-vazio">Nada marcado para esse dia.</div>';
    h+='</div>';
    box.innerHTML=h;
    ligarComp(box);
    [].forEach.call(box.querySelectorAll('[data-cal-d]'),function(b){ b.onclick=function(){ var v=b.getAttribute('data-cal-d'); diaSel=(diaSel===v?null:v); calendario(true); }; });
    [].forEach.call(box.querySelectorAll('[data-cal-fi]'),function(b){ b.onclick=function(){ abrirFicha(b.getAttribute('data-cal-fi')); }; });
    [].forEach.call(box.querySelectorAll('[data-cal-ok]'),function(b){ b.onclick=async function(){
      if(b.disabled) return; b.disabled=true; b.textContent='Gravando...';
      var p=b.getAttribute('data-cal-ok').split('|');
      var ok = p[1]==='ext' ? await marcarExtrato(p[0], p[3], 'recebido fora do app') : await marcarObrig(p[0], p[3], p[2]);
      if(ok) aviso('\u{2705} '+p[0]+': marcado como feito.','ok');
      montarLista(); calendario(true); render();
    }; });
  }
  function ligarComp(box){
    [].forEach.call(box.querySelectorAll('[data-fc-comp]'),function(b){ b.onclick=function(){ trocaComp(b.getAttribute('data-fc-comp')); }; });
    var x=el('fc-virada-x'); if(x) x.onclick=function(){ try{ localStorage.setItem('apFichaVirada', compAnterior()); }catch(e){} var v=el('fc-virada'); if(v) v.remove(); };
  }

  /* aba Extratos: barra "marcar todos" e botao "Realizado" dentro da janela da celula pendente */
  var confirmaTodos=false;
  function extrasExtratos(){
    var pg=el('pp-extratos'); if(!pg || !pg.classList.contains('active') || !tCarga) return;
    var cp=compAtiva(), falta=semExtrato(cp).length, bar=el('fc-ex-bar');
    if(!bar){
      var ref=pg.querySelector('.ex-rol')||pg.querySelector('#ex-tab'); if(!ref || !ref.parentNode) return;
      bar=document.createElement('div'); bar.id='fc-ex-bar'; ref.parentNode.insertBefore(bar, ref);
    }
    var ass=cp+'|'+falta+'|'+(confirmaTodos?1:0); if(bar.getAttribute('data-a')===ass) return; bar.setAttribute('data-a',ass);
    if(!falta){ bar.innerHTML=''; confirmaTodos=false; return; }
    bar.innerHTML = confirmaTodos
      ? '<div class="fc-conf"><b>Marcar os '+falta+' extratos de '+esc(compTxt(cp))+' como realizados?</b><span>Só os clientes que ainda estão sem registro nesse mês. O cliente passa a ver o extrato como entregue. Cada um pode ser desfeito na ficha.</span>'
        +'<div><button class="fc-xb ok" id="fc-ex-sim">\u{2714} Sim, marcar todos</button><button class="fc-xb" id="fc-ex-nao">Cancelar</button></div></div>'
      : '<button class="fc-xb lar" id="fc-ex-todos">\u{2714} Marcar todos de '+esc(compTxt(cp))+' como realizados ('+falta+')</button><span class="fc-xs">para quando os extratos chegaram por fora do app</span>';
    var t=el('fc-ex-todos'); if(t) t.onclick=function(){ confirmaTodos=true; extrasExtratos(); };
    var n=el('fc-ex-nao'); if(n) n.onclick=function(){ confirmaTodos=false; extrasExtratos(); };
    var s=el('fc-ex-sim'); if(s) s.onclick=async function(){ s.disabled=true; s.textContent='Gravando...'; confirmaTodos=false; await marcarTodosExtratos(cp,'recebido fora do app'); bar.removeAttribute('data-a'); };
  }
  function extrasJanelaExtrato(){
    var m=el('ap-ext-modal'); if(!m || m.getAttribute('data-fc')) return;
    var cob=m.querySelector('[data-ex-cob]'), bts=m.querySelector('.bts'), h3=m.querySelector('h3'); if(!cob || !bts || !h3) return;   /* so celula SEM registro */
    m.setAttribute('data-fc','1');
    var nome=(h3.textContent||'').replace(/^[^A-Za-zÀ-ÿ0-9]+/,'').trim(), cp=null;
    [].forEach.call(m.querySelectorAll('.ln'),function(l){ var sp=l.querySelector('span'), b=l.querySelector('b'); if(sp && b && /Compet/i.test(sp.textContent||'')) cp=compISO((b.textContent||'').trim()); });
    if(!nome || !cp) return;
    var bt=document.createElement('button'); bt.className='bt az'; bt.textContent='\u{2714} Realizado (sem arquivo)';
    bt.onclick=async function(){ bt.disabled=true; bt.textContent='Gravando...'; var ok=await marcarExtrato(nome, cp, 'recebido fora do app'); var x=el('ex-mx'); if(x) x.click(); if(ok) aviso('\u{2705} Extrato de '+nome+' marcado como realizado.','ok'); depoisDeGravar(); };
    bts.insertBefore(bt, bts.firstChild);
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
        css(); menu(); pagina(); menuCal(); paginaCal();
        var pg=el('pp-fichas'), naTela=pg && pg.classList.contains('active');
        var digitando=!!(document.activeElement && document.activeElement.id==='fc-q');
        if(voltas===2 || voltas%43===0){ await carregar(240000); if(naTela && !digitando) render(); calendario(true); aplicarFoco(true); }
      }
    }catch(e){}
    ocupado=false;
  }
  /* relogio rapido: historico de telas + filtro do cliente em foco (as listas do app se redesenham sozinhas) */
  function rapido(){
    try{
      if(!noPainel()){ var t=el('fc-topo'); if(t) t.classList.remove('on'); return; }
      ponteInicio(); vigiar(); aplicarFoco(false); extrasExtratos(); extrasJanelaExtrato();
      if(el('pp-calend') && el('pp-calend').classList.contains('active')) calendario(false);
    }catch(e){}
  }
  [1800,4200,9000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,7000);
  setInterval(rapido,500);

  window.apAbrirFicha=abrirFicha;
  window.apFocarCliente=function(n){ if(n) focar(n); else desfocar(); };
  window.apCalendario=abrirCal;
  window.__FICHA__={trabalhoDoMes:trabalhoDoMes, calendario:calendario, tarefasPorDia:tarefasPorDia, trocaComp:trocaComp, compAtiva:compAtiva, financeiro:financeiro, marcarExtrato:marcarExtrato, marcarObrig:marcarObrig, carregar:carregar, render:render, pendencias:pendencias, abrirFicha:abrirFicha, abrir:abrir, focar:focar, desfocar:desfocar, voltar:voltar,
                    estado:function(){ return {lista:lista, sel:sel, foco:foco, hist:hist, D:D}; }, vencDia:vencDia};
})();
