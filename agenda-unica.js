/* APARAT - AGENDA UNICA DO ESCRITORIO (v1, 29/09/2026) - uso exclusivo do escritorio
   Junta em UMA aba o que antes estava em tres lugares:
     1) menu "Calendario" da Ficha do Cliente (tarefas do mes: DAS, PGDAS, extratos...)
     2) menu "Agendamentos" (formulario + lista)
     3) botao flutuante do calendario (vencimentos de guias e honorarios + agendar)
   - o item #ap-nav-calend vira "Agenda" e abre a pagina #pp-agu; o item "Agendamentos" sai do menu
   - o botao flutuante, no painel do escritorio, abre esta aba (no app do cliente nada muda)
   - clicou no dia: agenda ali mesmo e ve tudo do dia com os botoes Feito / Dar baixa /
     Google Agenda / PDF / Imagem / Editar / Excluir
   - NAO cria colecao nova e NAO apaga nada: grava em agenda (dbAdd/dbUpdate/dbDelete, as mesmas
     funcoes do app), obrigCnpj/extratos pelo __FICHA__ e baixa pelas funcoes que ja existiam. */
;(function(){
  if(window.__APARAT_AGU__) return; window.__APARAT_AGU__=1;

  var ADMIN_EMAIL='assessoriacontabil.da@gmail.com';
  var MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var FEITOS=['pago','lancado','lançado','recebido','entregue','enviado','enviada ao cliente','conferida','dispensado','quitado'];
  var TIPOS_FIXOS=['Reunião','Videochamada','Entrega de Documentos','Entrega de Impostos do Cliente','Entrega de Notas Fiscais','Assinatura','Visita','Ligação','Outro'];
  var ano=0, mes=0, diaSel='', editId='', mostra={tar:true, imp:true, hon:true, age:true};
  var DADOS={agenda:[], obrigacoes:[], honorarios:[], clientes:[], tipos:[]}, tDados=0, carregando=false;

  function el(id){ return document.getElementById(id); }
  function p2(n){ return ('0'+n).slice(-2); }
  function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function norm(t){ var s=String(t||'').trim().toLowerCase(); try{ s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){} return s; }
  function num(v){ v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(v.indexOf(',')>-1) v=v.replace(/\./g,'').replace(',','.'); return parseFloat(v)||0; }
  function money(n){ return 'R$ '+(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2}); }
  function hojeISO(){ var d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function dataISO(v){ var s=String(v||'').trim(), m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1]+'-'+p2(+m[2])+'-'+p2(+m[3]); m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return m[3]+'-'+p2(+m[2])+'-'+p2(+m[1]); return ''; }
  function dataBR(iso){ var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]+'/'+m[1]):''; }
  /* "A Pagar" e pendente; "Pago", "Quitado", "Baixado" nao */
  function pendente(st){ var s=norm(st); if(!s) return true; if(FEITOS.indexOf(s)>=0) return false; return !/^(pago|paga|quitad|baixad|recebid|liquidad|conclu)/.test(s); }
  function notaEmitida(o){ return /nf-?e|nota\s*fiscal/i.test(String(o.tipo||'')) || /emitid/i.test(String(o.status||'')); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; return !!(u && u.email===ADMIN_EMAIL); }catch(e){ return false; } }
  function noPainel(){ var p=el('view-painel'); return !!(p && p.classList.contains('active') && ehAdmin()); }
  function aviso(t,tp){ try{ if(typeof notif==='function') notif(t,tp||''); }catch(e){} }
  function ym(a,m){ return a+'-'+p2(m+1); }
  function ymMais(c,n){ var p=c.split('-'), d=new Date(+p[0], +p[1]-1+n, 1); return ym(d.getFullYear(), d.getMonth()); }

  /* ================= dados ================= */
  async function pega(store){ try{ return (typeof dbGetAll==='function' ? (await dbGetAll(store)) : [])||[]; }catch(e){ return []; } }
  async function carregar(forcar){
    if(carregando) return;
    if(!forcar && tDados && Date.now()-tDados<60000) return;
    carregando=true;
    try{
      var r=await Promise.all([pega('agenda'), pega('obrigacoes'), pega('honorarios'), pega('clientes'), pega('agendaTipos')]);
      DADOS={agenda:r[0], obrigacoes:r[1], honorarios:r[2], clientes:r[3], tipos:r[4]}; tDados=Date.now();
      var F=window.__FICHA__; if(F && F.carregar) await F.carregar(false);
    }catch(e){ console.warn('[agenda] carregar', e); }
    carregando=false;
  }
  function nomesClientes(){
    var set={}, out=[];
    DADOS.clientes.forEach(function(c){
      if(c.status && /inativ|desativ|encerr|baix|cancel|suspens/i.test(String(c.status))) return;
      var n=String(c.nome||'').trim(); if(n && !set[norm(n)]){ set[norm(n)]=1; out.push(n); }
    });
    if(!set[norm('APARAT CONTABILIDADE LTDA')]) out.push('APARAT CONTABILIDADE LTDA');
    return out.sort(function(a,b){ return a.localeCompare(b); });
  }
  function tipos(){ var out=TIPOS_FIXOS.slice(); DADOS.tipos.forEach(function(t){ var n=String(t.nome||'').trim(); if(n && out.indexOf(n)<0) out.push(n); }); return out; }

  /* tarefas da Ficha do Cliente para o mes mostrado (competencia = mes anterior) */
  function tarefasDoMes(mesVisto){
    var F=window.__FICHA__; if(!F || !F.tarefasPorDia || !F.compAtiva) return {};
    var alvo=ymMais(mesVisto,-1), hoje=new Date(), atual=ym(new Date(hoje.getFullYear(),hoje.getMonth()-1,1).getFullYear(), new Date(hoje.getFullYear(),hoje.getMonth()-1,1).getMonth());
    if(alvo>atual) return {};
    var M={}, mudou=false;
    try{
      if(F.compAtiva()!==alvo){
        mudou=true; F.trocaComp(0);
        var g=0; while(F.compAtiva()>alvo && g<36){ F.trocaComp(-1); g++; }
      }
      M=F.tarefasPorDia()||{};
    }catch(e){}
    if(mudou) try{ F.trocaComp(0); }catch(e){}
    return M;
  }

  /* tudo do mes mostrado, por dia */
  function eventos(){
    var mv=ym(ano,mes), hoje=hojeISO(), P={};
    function poe(d,e){ if(!d || d.slice(0,7)!==mv) return; (P[d]=P[d]||[]).push(e); }
    if(mostra.age) DADOS.agenda.forEach(function(a){ var d=dataISO(a.data); poe(d,{k:'age', d:d, a:a, hora:a.hora||'', tit:(a.tipo||'Compromisso'), cli:a.cliente||'', txt:a.desc||''}); });
    if(mostra.imp) DADOS.obrigacoes.forEach(function(o){ if(notaEmitida(o)) return; var d=dataISO(o.vencimento); poe(d,{k:'imp', d:d, o:o, tit:o.tipo||'Guia', cli:o.cliente||'', valor:num(o.valor), pend:pendente(o.status), comp:o.competencia||''}); });
    if(mostra.hon) DADOS.honorarios.forEach(function(h){ var d=dataISO(h.vencimento); poe(d,{k:'hon', d:d, o:h, tit:'Honorário '+(h.referencia||''), cli:h.cliente||'', valor:num(h.valor), pend:pendente(h.status)}); });
    if(mostra.tar){
      var M=tarefasDoMes(mv);
      Object.keys(M).forEach(function(d){ for(var nome in M[d]){ var g=M[d][nome]; poe(d,{k:'tar', d:d, nome:nome, g:g}); } });
    }
    Object.keys(P).forEach(function(d){ P[d].forEach(function(e){ e.atras=(e.k==='tar' ? (e.g.feitos<e.g.n) : !!e.pend) && d<hoje; }); });
    return P;
  }

  /* ================= tela ================= */
  function css(){
    if(el('ap-agu-css')) return;
    var s=document.createElement('style'); s.id='ap-agu-css';
    s.textContent=''
      +'#pp-agu .ag-sub{font-size:12.5px;color:var(--cinza);margin:-4px 0 12px;line-height:1.5}'
      +'#pp-agu .ag-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}'
      +'#pp-agu .ag-mes{display:flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:4px}'
      +'#pp-agu .ag-mes b{min-width:150px;text-align:center;font-size:14px}'
      +'#pp-agu .ag-bt{font:inherit;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer}'
      +'#pp-agu .ag-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-agu .ag-bt.vd{background:#0e9f6e;border-color:#0e9f6e;color:#fff}'
      +'#pp-agu .ag-bt.vm{border-color:#d92d20;color:#ff6b60}'
      +'#pp-agu .ag-bt.sm{font-size:11.5px;padding:6px 9px}'
      +'#pp-agu .ag-bt:disabled{opacity:.55;cursor:wait}'
      +'#pp-agu .ag-chip{font:inherit;font-size:12px;font-weight:700;padding:6px 11px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer}'
      +'#pp-agu .ag-chip.on{color:#fff}'
      +'#pp-agu .ag-chip.on.tar{background:#c25e00;border-color:#ff8a00}#pp-agu .ag-chip.on.imp{background:#8a5a00;border-color:#ffaa22}#pp-agu .ag-chip.on.hon{background:#0b7a55;border-color:#22cc77}#pp-agu .ag-chip.on.age{background:#1d4fd8;border-color:#33aaff}'
      +'#pp-agu .ag-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:12px}'
      +'#pp-agu .ag-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}'
      +'#pp-agu .ag-h{font-size:10.5px;color:var(--cinza);text-align:center;font-weight:800;padding:3px 0;text-transform:uppercase;letter-spacing:.06em}'
      +'#pp-agu .ag-d{min-width:0;min-height:86px;border:1px solid var(--border);border-radius:12px;padding:5px;display:flex;flex-direction:column;gap:2px;position:relative;cursor:pointer;background:transparent}'
      +'#pp-agu .ag-d:hover{border-color:var(--azul)}'
      +'#pp-agu .ag-d .n{font-size:12px;font-weight:800;color:var(--cinza)}'
      +'#pp-agu .ag-d.fds{opacity:.6}'
      +'#pp-agu .ag-d.hoje{border:2px solid var(--azul)}#pp-agu .ag-d.hoje .n{color:var(--azul-light,#7fa0ff)}'
      +'#pp-agu .ag-d.sel{border:2px solid #22cc77;box-shadow:0 0 0 3px rgba(34,204,119,.18)}'
      +'#pp-agu .ag-d .hj{position:absolute;top:4px;right:5px;font-size:9px;color:var(--azul-light,#7fa0ff);font-weight:800}'
      +'#pp-agu .ag-p{display:block;font-size:10px;border-radius:6px;padding:1px 4px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'#pp-agu .ag-p.tar{background:rgba(255,138,0,.13);color:#ff9d2e}'
      +'#pp-agu .ag-p.imp{background:rgba(255,170,34,.12);color:#ffc15e}'
      +'#pp-agu .ag-p.hon{background:rgba(34,204,119,.12);color:#2fd29b}'
      +'#pp-agu .ag-p.age{background:rgba(51,170,255,.14);color:#6cc4ff}'
      +'#pp-agu .ag-p.ok{background:rgba(14,159,110,.12);color:#2fd29b;opacity:.8}'
      +'#pp-agu .ag-p.atr{background:rgba(217,45,32,.16);color:#ff6b60}'
      +'body.ap-esc-claro #pp-agu .ag-p.tar{color:#b45309}body.ap-esc-claro #pp-agu .ag-p.imp{color:#8a5a00}body.ap-esc-claro #pp-agu .ag-p.hon,body.ap-esc-claro #pp-agu .ag-p.ok{color:#0e9f6e}body.ap-esc-claro #pp-agu .ag-p.age{color:#1d4fd8}body.ap-esc-claro #pp-agu .ag-p.atr{color:#d92d20}'
      +'#pp-agu .ag-sec{font-size:13px;font-weight:800;margin:16px 0 6px}'
      +'#pp-agu .ag-form{border:1.5px solid #22cc77;background:rgba(34,204,119,.07);border-radius:14px;padding:12px;margin-top:12px}'
      +'#pp-agu .ag-form .ft{font-weight:800;color:#2fd29b;font-size:13px;margin-bottom:8px}'
      +'#pp-agu .ag-fg{display:grid;grid-template-columns:2fr 1.4fr .8fr;gap:8px;margin-bottom:8px}'
      +'#pp-agu .ag-form select,#pp-agu .ag-form input,#pp-agu .ag-form textarea{width:100%;box-sizing:border-box;padding:9px 10px;border-radius:9px;border:1px solid var(--border);background:var(--card2,var(--card));color:inherit;font:inherit;font-size:12.5px}'
      +'#pp-agu .ag-form textarea{min-height:56px;resize:vertical;margin-bottom:8px}'
      +'#pp-agu .ag-lin{display:flex;gap:10px;align-items:center;padding:9px 4px;border-bottom:1px dashed var(--border);flex-wrap:wrap}'
      +'#pp-agu .ag-lin .dt{border-radius:9px;padding:5px 7px;font-weight:800;font-size:11px;min-width:44px;text-align:center;background:rgba(51,120,255,.14);color:var(--azul-light,#7fa0ff)}'
      +'#pp-agu .ag-lin .dt.atr{background:rgba(217,45,32,.16);color:#ff6b60}'
      +'#pp-agu .ag-lin .tx{flex:1;min-width:190px}#pp-agu .ag-lin .tx b{display:block;font-size:13px}#pp-agu .ag-lin .tx small{font-size:11.5px;color:var(--cinza)}'
      +'#pp-agu .ag-tag{font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:999px}'
      +'#pp-agu .ag-tag.tar{background:rgba(255,138,0,.15);color:#ff9d2e}#pp-agu .ag-tag.imp{background:rgba(255,170,34,.15);color:#ffc15e}#pp-agu .ag-tag.hon{background:rgba(34,204,119,.15);color:#2fd29b}#pp-agu .ag-tag.age{background:rgba(51,170,255,.15);color:#6cc4ff}#pp-agu .ag-tag.atr{background:rgba(217,45,32,.18);color:#ff6b60}#pp-agu .ag-tag.ok{background:rgba(14,159,110,.15);color:#2fd29b}'
      +'#pp-agu .ag-vazio{padding:14px 4px;font-size:12.5px;color:var(--cinza)}'
      +'@media(max-width:700px){#pp-agu .ag-g{gap:3px}#pp-agu .ag-d{min-height:58px;padding:3px}#pp-agu .ag-p{font-size:8.5px;padding:0 3px}#pp-agu .ag-h{font-size:9px}#pp-agu .ag-fg{grid-template-columns:1fr 1fr}#pp-agu .ag-fg>*:first-child{grid-column:1/-1}#pp-agu .ag-mes b{min-width:120px}}';
    document.head.appendChild(s);
  }

  /* menu: o item da Ficha ("Calendario") vira "Agenda"; "Agendamentos" sai */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv) return;
    var it=el('ap-nav-calend');
    if(!it){
      it=document.createElement('div'); it.className='nav-item'; it.id='ap-nav-calend';
      var f=el('ap-nav-fichas'); if(f && f.parentNode===nv) nv.insertBefore(it, f.nextSibling); else nv.appendChild(it);
    }
    var fi=el('ap-nav-fichas');
    if(fi && fi.parentNode===nv && it.previousElementSibling!==fi) nv.insertBefore(it, fi.nextSibling);
    if(it.getAttribute('data-agu')!=='1'){
      it.setAttribute('data-agu','1');
      it.innerHTML='<span class="ni">\u{1F4C5}</span>Agenda<span class="nav-dot" id="dot-agu" style="display:none"></span>';
      it.onclick=function(ev){ if(ev) ev.stopPropagation(); abrir(it); };
    }
    [].slice.call(nv.querySelectorAll('.nav-item')).forEach(function(n){
      if(/navAba\('agenda'/.test(n.getAttribute('onclick')||'')) n.remove();
    });
  }
  function pagina(){
    if(el('pp-agu')) return;
    var base=el('pp-calend')||el('pp-fichas')||el('pp-agenda'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-agu';
    p.innerHTML='<div class="sec">\u{1F4C5} Agenda do escritório</div>'
      +'<div class="ag-sub">Tudo em um lugar só: tarefas do mês de cada cliente, guias, honorários e seus agendamentos. <b>Clique em um dia</b> para agendar ou ver o que vence.</div>'
      +'<div class="ag-top"><div class="ag-mes"><button class="ag-bt sm" id="ag-ant">\u{25C0}</button><b id="ag-tit"></b><button class="ag-bt sm" id="ag-prox">\u{25B6}</button></div>'
      +'<button class="ag-bt" id="ag-hoje">Hoje</button><button class="ag-bt az" id="ag-novo">\u{2795} Novo agendamento</button><button class="ag-bt" id="ag-atu">\u{1F504} Atualizar</button></div>'
      +'<div class="ag-top" id="ag-chips">'
      +'<button class="ag-chip tar" data-ag-m="tar">\u{1F4CB} Tarefas do mês</button><button class="ag-chip imp" data-ag-m="imp">\u{1F9FE} Guias/impostos</button><button class="ag-chip hon" data-ag-m="hon">\u{1F4B3} Honorários</button><button class="ag-chip age" data-ag-m="age">\u{1F4C5} Agendamentos</button></div>'
      +'<div id="ag-corpo"><div class="ag-vazio">Carregando...</div></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    el('ag-ant').onclick=function(){ mes--; if(mes<0){ mes=11; ano--; } diaSel=''; editId=''; desenhar(); };
    el('ag-prox').onclick=function(){ mes++; if(mes>11){ mes=0; ano++; } diaSel=''; editId=''; desenhar(); };
    el('ag-hoje').onclick=function(){ var h=new Date(); ano=h.getFullYear(); mes=h.getMonth(); diaSel=hojeISO(); editId=''; desenhar(); };
    el('ag-novo').onclick=function(){ var h=new Date(); if(!diaSel){ if(ano===h.getFullYear() && mes===h.getMonth()) diaSel=hojeISO(); else diaSel=ym(ano,mes)+'-01'; } editId=''; desenhar(); setTimeout(function(){ var c=el('agu-cli'); if(c){ c.scrollIntoView({behavior:'smooth',block:'center'}); c.focus(); } },80); };
    el('ag-atu').onclick=async function(){ var b=this; b.disabled=true; await carregar(true); var F=window.__FICHA__; if(F&&F.carregar) await F.carregar(true); b.disabled=false; desenhar(); };
    [].forEach.call(p.querySelectorAll('[data-ag-m]'),function(b){ b.onclick=function(){ var k=b.getAttribute('data-ag-m'); mostra[k]=!mostra[k]; desenhar(); }; });
    try{ if(window.ABA_NOMES) window.ABA_NOMES.agu='Agenda'; }catch(e){}
  }
  async function abrir(item){
    css(); menu(); pagina();
    try{ if(typeof pPage==='function') pPage('agu', item||el('ap-nav-calend')); }catch(e){}
    var p=el('pp-agu'); if(p) p.classList.add('active');
    try{ var mcal=el('ap-cal-modal'); if(mcal) mcal.remove(); }catch(e){}
    if(!ano){ var h=new Date(); ano=h.getFullYear(); mes=h.getMonth(); }
    desenhar(); await carregar(false); desenhar();
    try{ p.scrollIntoView({block:'start'}); }catch(e){}
  }

  function pill(e){
    if(e.k==='age') return '<span class="ag-p age">'+esc((e.hora?e.hora+' ':'')+e.tit)+'</span>';
    if(e.k==='tar'){ var ok=e.g.feitos>=e.g.n; return '<span class="ag-p '+(ok?'ok':(e.atras?'atr':'tar'))+'">'+(ok?'\u{2714} ':(e.g.n-e.g.feitos)+' ')+esc(e.nome)+'</span>'; }
    return '';
  }
  function desenhar(){
    var box=el('ag-corpo'); if(!box) return;
    var tit=el('ag-tit'); if(tit) tit.textContent=MESES[mes]+' / '+ano;
    [].forEach.call(document.querySelectorAll('#pp-agu [data-ag-m]'),function(b){ b.classList.toggle('on', !!mostra[b.getAttribute('data-ag-m')]); });
    if(!tDados){ box.innerHTML='<div class="ag-vazio">Carregando...</div>'; return; }
    var P=eventos(), hoje=hojeISO();
    var off=new Date(ano,mes,1).getDay(), nd=new Date(ano,mes+1,0).getDate();
    var h='<div class="ag-card"><div class="ag-g">'+['dom','seg','ter','qua','qui','sex','sáb'].map(function(d){ return '<div class="ag-h">'+d+'</div>'; }).join('');
    for(var i=0;i<off;i++) h+='<div></div>';
    var atrasTot=0;
    for(var d=1; d<=nd; d++){
      var iso=ym(ano,mes)+'-'+p2(d), dw=new Date(ano,mes,d).getDay(), L=P[iso]||[];
      h+='<div class="ag-d'+((dw===0||dw===6)?' fds':'')+(iso===hoje?' hoje':'')+(iso===diaSel?' sel':'')+'" data-ag-d="'+iso+'"><span class="n">'+d+'</span>'+(iso===hoje?'<span class="hj">hoje</span>':'');
      var ags=L.filter(function(e){ return e.k==='age'; }).sort(function(a,b){ return String(a.hora).localeCompare(String(b.hora)); });
      var tars=L.filter(function(e){ return e.k==='tar'; });
      ags.slice(0,3).forEach(function(e){ h+=pill(e); });
      if(ags.length>3) h+='<span class="ag-p age">+'+(ags.length-3)+' agend.</span>';
      tars.forEach(function(e){ h+=pill(e); });
      var imp=L.filter(function(e){ return e.k==='imp'; }), hon=L.filter(function(e){ return e.k==='hon'; });
      if(imp.length){ var ip=imp.filter(function(e){ return e.pend; }).length, ia=imp.some(function(e){ return e.atras; }); h+='<span class="ag-p '+(ia?'atr':(ip?'imp':'ok'))+'">'+(ip?ip+' ':'\u{2714} ')+(imp.length>1?'guias':'guia')+'</span>'; }
      if(hon.length){ var hp=hon.filter(function(e){ return e.pend; }).length, ha=hon.some(function(e){ return e.atras; }); h+='<span class="ag-p '+(ha?'atr':(hp?'hon':'ok'))+'">'+(hp?hp+' ':'\u{2714} ')+'honor.</span>'; }
      L.forEach(function(e){ if(e.atras) atrasTot++; });
      h+='</div>';
    }
    h+='</div></div>';

    if(diaSel && diaSel.slice(0,7)===ym(ano,mes)) h+=painelDia(diaSel, P[diaSel]||[]);
    else h+=proximos();
    box.innerHTML=h;
    ligar(box);
    var dot=el('dot-agu'); if(dot) dot.style.display=temAtraso()?'inline-block':'none';
  }
  function temAtraso(){
    var hoje=hojeISO();
    return DADOS.obrigacoes.some(function(o){ var d=dataISO(o.vencimento); return d && d<hoje && !notaEmitida(o) && pendente(o.status); })
        || DADOS.honorarios.some(function(x){ var d=dataISO(x.vencimento); return d && d<hoje && pendente(x.status); });
  }

  function linha(e, comData){
    var hoje=hojeISO(), acoes='', tag='', tx='';
    var dt=comData?'<span class="dt'+(e.atras?' atr':'')+'">'+dataBR(e.d).slice(0,5)+'</span>':'';
    if(e.k==='age'){
      var a=e.a, id=esc(a.id);
      tag='<span class="ag-tag age">AGENDA</span>';
      tx='<b>'+esc((e.hora?e.hora+' · ':'')+e.tit)+' — '+esc(e.cli)+'</b><small>'+esc(e.txt||'sem descrição')+(a.arquivoNome?' · \u{1F4CE} '+esc(a.arquivoNome):'')+'</small>';
      acoes='<button class="ag-bt sm" data-agu-g="'+id+'" title="Google Agenda">\u{1F4C6} Google</button>'
        +'<button class="ag-bt sm" data-agu-pdf="'+id+'">\u{1F4C4} PDF</button>'
        +'<button class="ag-bt sm" data-agu-img="'+id+'">\u{1F5BC}\u{FE0F} Imagem</button>'
        +'<button class="ag-bt sm" data-agu-ed="'+id+'">\u{270F}\u{FE0F} Editar</button>'
        +'<button class="ag-bt sm vm" data-agu-ex="'+id+'">\u{1F5D1}</button>';
      return '<div class="ag-lin">'+dt+'<div class="tx">'+tx+'</div>'+tag+acoes+'</div>';
    }
    if(e.k==='tar'){
      var out='';
      e.g.itens.slice().sort(function(a,b){ return (a.t.feito?1:0)-(b.t.feito?1:0) || a.cli.localeCompare(b.cli); }).forEach(function(it){
        var atr=!it.t.feito && e.d<hoje;
        out+='<div class="ag-lin">'+dt+'<div class="tx"><b>'+(it.t.feito?'\u{2714} ':'')+esc(it.cli)+'</b><small>'+esc(it.t.n)+'</small></div>'
          +(it.t.feito?'<span class="ag-tag ok">FEITO</span>':'<span class="ag-tag '+(atr?'atr':'tar')+'">'+(atr?'ATRASADO':'TAREFA')+'</span>'
            +'<button class="ag-bt sm vd" data-agu-ok="'+esc(it.cli)+'|'+esc(it.t.tipo)+'|'+esc(it.t.sigla||'')+'|'+esc(it.t.cp)+'">\u{2714} '+(it.t.tipo==='ext'?'Realizado':'Feito')+'</button>')
          +'<button class="ag-bt sm" data-agu-fi="'+esc(it.cli)+'">\u{1F4C7} Ficha</button></div>';
      });
      return out;
    }
    var o=e.o, coll=e.k==='imp'?'obrigacoes':'honorarios';
    tag=e.pend ? '<span class="ag-tag '+(e.atras?'atr':e.k)+'">'+(e.atras?'ATRASADO':(e.k==='imp'?'GUIA':'HONORÁRIO'))+'</span>' : '<span class="ag-tag ok">\u{2714} '+esc(o.status||'Pago')+'</span>';
    tx='<b>'+esc(e.cli)+'</b><small>'+esc(e.tit)+(e.comp?' ('+esc(e.comp)+')':'')+(e.valor?' · '+money(e.valor):'')+'</small>';
    if(e.pend) acoes='<button class="ag-bt sm vd" data-agu-bx="'+coll+'|'+esc(o.id)+'">\u{2714} Dar baixa</button>';
    return '<div class="ag-lin">'+dt+'<div class="tx">'+tx+'</div>'+tag+acoes+'</div>';
  }

  function painelDia(iso, L){
    var ag=null;
    if(editId) ag=DADOS.agenda.find(function(x){ return String(x.id)===String(editId); })||null;
    var nomes=nomesClientes(), tps=tipos(), cliAt=ag?ag.cliente:'', tpAt=ag?ag.tipo:'Reunião';
    try{ var F=window.__FICHA__; if(!ag && F && F.estado){ var fo=F.estado().foco; if(fo) cliAt=(typeof fo==='string')?fo:(fo.nome||''); } }catch(e){}
    if(cliAt && nomes.indexOf(cliAt)<0) nomes.unshift(cliAt);
    if(tpAt && tps.indexOf(tpAt)<0) tps.push(tpAt);
    var h='<div class="ag-form" id="agu-form"><div class="ft">'+(ag?'\u{270F}\u{FE0F} Editar agendamento':'\u{2795} Agendar')+' — '+dataBR(iso)+'</div>'
      +'<div class="ag-fg"><select id="agu-cli"><option value="">Escolha o cliente...</option>'+nomes.map(function(n){ return '<option'+(n===cliAt?' selected':'')+'>'+esc(n)+'</option>'; }).join('')+'</select>'
      +'<select id="agu-tipo">'+tps.map(function(t){ return '<option'+(t===tpAt?' selected':'')+'>'+esc(t)+'</option>'; }).join('')+'<option value="__novo__">\u{2795} Novo tipo...</option></select>'
      +'<input id="agu-hora" type="time" value="'+esc(ag?ag.hora||'':'09:00')+'"/></div>'
      +'<div class="ag-fg" style="grid-template-columns:1fr 1fr"><input id="agu-data" type="date" value="'+esc(iso)+'"/><input id="agu-file" type="file" accept=".pdf,.jpg,.jpeg,.png" title="Anexo opcional (máx. 900 KB)"/></div>'
      +'<textarea id="agu-desc" placeholder="Descrição (opcional) — o cliente vê este texto no app">'+esc(ag?ag.desc||'':'')+'</textarea>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ag-bt vd" id="agu-salvar" style="flex:1;min-width:180px">'+(ag?'\u{1F4BE} Salvar alterações':'\u{1F4E8} Agendar e avisar o cliente')+'</button>'
      +(ag?'<button class="ag-bt" id="agu-cancel">Cancelar edição</button>':'')+'<button class="ag-bt" id="agu-fechar">Fechar dia</button></div></div>';
    var ordem={age:0,tar:1,imp:2,hon:3};
    L=L.slice().sort(function(a,b){ return ordem[a.k]-ordem[b.k] || String(a.hora||'').localeCompare(String(b.hora||'')); });
    h+='<div class="ag-sec">Dia '+dataBR(iso)+' <span style="font-weight:400;color:var(--cinza);font-size:12px">· '+(L.length?L.length+' item(ns)':'nada marcado')+'</span></div><div class="ag-card">';
    if(!L.length) h+='<div class="ag-vazio">Nada para este dia com os filtros ligados.</div>';
    L.forEach(function(e){ h+=linha(e,false); });
    return h+'</div>';
  }

  function proximos(){
    var hoje=hojeISO(), lim=(function(){ var d=new Date(); d.setDate(d.getDate()+15); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); })();
    var L=[];
    if(mostra.imp) DADOS.obrigacoes.forEach(function(o){ if(notaEmitida(o) || !pendente(o.status)) return; var d=dataISO(o.vencimento); if(d && d<=lim) L.push({k:'imp', d:d, o:o, tit:o.tipo||'Guia', cli:o.cliente||'', valor:num(o.valor), pend:true, comp:o.competencia||'', atras:d<hoje}); });
    if(mostra.hon) DADOS.honorarios.forEach(function(x){ if(!pendente(x.status)) return; var d=dataISO(x.vencimento); if(d && d<=lim) L.push({k:'hon', d:d, o:x, tit:'Honorário '+(x.referencia||''), cli:x.cliente||'', valor:num(x.valor), pend:true, atras:d<hoje}); });
    if(mostra.age) DADOS.agenda.forEach(function(a){ var d=dataISO(a.data); if(d && d>=hoje && d<=lim) L.push({k:'age', d:d, a:a, hora:a.hora||'', tit:a.tipo||'Compromisso', cli:a.cliente||'', txt:a.desc||''}); });
    L.sort(function(a,b){ return (b.atras?1:0)-(a.atras?1:0) || a.d.localeCompare(b.d) || String(a.hora||'').localeCompare(String(b.hora||'')); });
    var h='<div class="ag-sec">Atrasados e próximos 15 dias</div><div class="ag-card">';
    if(!L.length) h+='<div class="ag-vazio">Nada atrasado e nada vencendo nos próximos 15 dias. \u{2705}</div>';
    L.slice(0,40).forEach(function(e){ h+=linha(e,true); });
    if(L.length>40) h+='<div class="ag-vazio">+ '+(L.length-40)+' itens. Clique nos dias do calendário para ver.</div>';
    return h+'</div><div class="ag-vazio" style="padding-top:8px">As tarefas do mês (DAS, PGDAS, extratos) aparecem dentro de cada dia do calendário.</div>';
  }

  async function lerAnexo(f){
    if(typeof lerArquivoBase64==='function') return await lerArquivoBase64(f);
    if(f.size>900*1024) throw new Error('Anexo maior que 900 KB.');
    return await new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; r.readAsDataURL(f); });
  }

  function ligar(box){
    [].forEach.call(box.querySelectorAll('[data-ag-d]'),function(c){ c.onclick=function(){ var v=c.getAttribute('data-ag-d'); if(diaSel===v && !editId){ diaSel=''; } else { diaSel=v; editId=''; } desenhar(); }; });
    var tp=el('agu-tipo');
    if(tp) tp.onchange=async function(){
      if(tp.value!=='__novo__') return;
      var n=prompt('Nome do novo tipo de agendamento:');
      if(n && n.trim()){ n=n.trim(); try{ await dbAdd('agendaTipos',{nome:n}); DADOS.tipos.push({nome:n}); aviso('\u{2705} Tipo "'+n+'" cadastrado!'); }catch(e){ alert('Não consegui salvar o tipo: '+(e.message||e)); }
        var o=document.createElement('option'); o.textContent=n; tp.insertBefore(o, tp.querySelector('option[value="__novo__"]')); tp.value=n; }
      else tp.value=TIPOS_FIXOS[0];
    };
    var sv=el('agu-salvar');
    if(sv) sv.onclick=async function(){
      var cli=el('agu-cli').value, tipo=el('agu-tipo').value, data=el('agu-data').value, hora=el('agu-hora').value, desc=el('agu-desc').value;
      if(!cli){ alert('Escolha o cliente.'); return; }
      if(!data){ alert('Escolha a data.'); return; }
      if(tipo==='__novo__') tipo='Reunião';
      var dados={cliente:cli, tipo:tipo, data:data, hora:hora, desc:desc};
      var fi=el('agu-file');
      sv.disabled=true; sv.textContent='Gravando...';
      try{
        if(fi && fi.files && fi.files[0]){ dados.arquivoData=await lerAnexo(fi.files[0]); dados.arquivoNome=fi.files[0].name; }
        if(editId){ await dbUpdate('agenda', editId, dados); aviso('\u{270F}\u{FE0F} Agendamento atualizado!'); }
        else { await dbAdd('agenda', dados); aviso('\u{1F4C5} Agendamento criado! O cliente é avisado no app.'); }
        try{ if(typeof syncAnim==='function') syncAnim('Agendamento → '+cli); }catch(e){}
        editId=''; diaSel=data; var p=data.split('-'); ano=+p[0]; mes=+p[1]-1;
        await carregar(true); desenhar();
        try{ if(typeof carregarAgenda==='function') carregarAgenda(); }catch(e){}
      }catch(e){ alert('Erro ao agendar: '+(e.message||e)); sv.disabled=false; sv.textContent='Tentar de novo'; }
    };
    var cc=el('agu-cancel'); if(cc) cc.onclick=function(){ editId=''; desenhar(); };
    var fc=el('agu-fechar'); if(fc) fc.onclick=function(){ diaSel=''; editId=''; desenhar(); };
    function cada(sel,fn){ [].forEach.call(box.querySelectorAll('['+sel+']'),function(b){ b.onclick=function(ev){ ev.stopPropagation(); fn(b.getAttribute(sel), b); }; }); }
    cada('data-agu-g', function(id){ if(typeof window.calGoogleAg==='function') window.calGoogleAg(id); else if(typeof googleAgenda==='function') googleAgenda(id); });
    cada('data-agu-pdf', function(id){ if(typeof gerarPDFAgenda==='function') gerarPDFAgenda(id); });
    cada('data-agu-img', function(id){ if(typeof imagemAgenda==='function') imagemAgenda(id); });
    cada('data-agu-ed', function(id){ var a=DADOS.agenda.find(function(x){ return String(x.id)===String(id); }); if(!a) return; editId=id; diaSel=dataISO(a.data)||diaSel; var p=diaSel.split('-'); ano=+p[0]; mes=+p[1]-1; desenhar(); setTimeout(function(){ var f=el('agu-form'); if(f) f.scrollIntoView({behavior:'smooth',block:'center'}); },80); });
    cada('data-agu-ex', async function(id,b){ if(!confirm('Excluir este agendamento?')) return; b.disabled=true; try{ await dbDelete('agenda', id); aviso('\u{1F5D1} Agendamento excluído.'); if(editId===id) editId=''; await carregar(true); desenhar(); }catch(e){ alert('Erro: '+(e.message||e)); b.disabled=false; } });
    cada('data-agu-fi', function(n){ if(typeof window.apAbrirFicha==='function') window.apAbrirFicha(n); });
    cada('data-agu-ok', async function(v,b){
      var F=window.__FICHA__; if(!F) return; b.disabled=true; b.textContent='Gravando...';
      var p=v.split('|'), ok= p[1]==='ext' ? await F.marcarExtrato(p[0], p[3], 'recebido fora do app') : await F.marcarObrig(p[0], p[3], p[2]);
      if(ok) aviso('\u{2705} '+p[0]+': marcado como feito.');
      try{ F.trocaComp(0); }catch(e){}
      desenhar();
    });
    cada('data-agu-bx', async function(v,b){
      var p=v.split('|'), coll=p[0], id=p[1];
      b.disabled=true; b.textContent='Gravando...';
      try{
        if(coll==='obrigacoes' && typeof darBaixaObrig==='function') await darBaixaObrig(id);
        else { await dbUpdate(coll, id, {status:'Pago', baixadoPeloEscritorio:true, baixadoEm:new Date().toISOString()}); aviso('\u{2714}\u{FE0F} Baixa dada!'); }
        try{ if(typeof atualizarDashboard==='function') atualizarDashboard(); }catch(e){}
        await carregar(true); desenhar();
      }catch(e){ alert('Erro: '+(e.message||e)); b.disabled=false; b.textContent='\u{2714} Dar baixa'; }
    });
  }

  /* botao flutuante e atalhos antigos passam a abrir esta aba (so no painel do escritorio) */
  function pontes(){
    var ab=window.abrirCalendarioAparat;
    if(typeof ab==='function' && !ab.__agu){
      var orig=ab;
      var novo=function(){ if(noPainel()) return abrir(); return orig.apply(this, arguments); };
      novo.__agu=1; window.abrirCalendarioAparat=novo;
    }
    if(window.apCalendario!==abrir){ window.apCalendario=abrir; }
  }

  /* se alguem abrir a pagina antiga (pp-calend ou pp-agenda), leva para a nova */
  function redireciona(){
    ['pp-calend','pp-agenda'].forEach(function(id){ var p=el(id); if(p && p.classList.contains('active')){ p.classList.remove('active'); abrir(); } });
  }

  var voltas=0, ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      if(noPainel()){
        css(); menu(); pagina(); pontes(); redireciona();
        if(voltas===3 || voltas%24===0){ await carregar(true); var pg=el('pp-agu'); if(pg && pg.classList.contains('active') && !(document.activeElement && /^agu-/.test(document.activeElement.id||''))) desenhar(); else { var dot=el('dot-agu'); if(dot) dot.style.display=temAtraso()?'inline-block':'none'; } }
      }
    }catch(e){}
    ocupado=false;
  }
  [1600,4400,9500].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,5000);

  window.apAgenda=function(){ return abrir(); };
  window.__AGU__={abrir:abrir, desenhar:desenhar, carregar:carregar, eventos:eventos, tarefasDoMes:tarefasDoMes,
    estado:function(){ return {ano:ano, mes:mes, diaSel:diaSel, editId:editId, mostra:mostra, DADOS:DADOS}; },
    ir:function(a,m,d){ ano=a; mes=m; diaSel=d||''; desenhar(); }};
})();
