/* APARAT - RESUMO DO EXTRATO BANCARIO (v1, 26/09/2026)
   Pedido do Daniel: anexou o extrato do cliente na aba Extratos e nao conseguiu ver isso no faturamento.
   O que este modulo faz (sem mexer no aparat-fix.js):
   1. Quando alguem escolhe um arquivo .OFX no envio do extrato (painel #ex-mfile ou app do cliente #ext-file),
      le o arquivo na hora e monta o resumo: banco, periodo, entradas (creditos), saidas (debitos), quantidade.
      Depois que o envio termina (documento em 'extratos' com o mesmo nome/tamanho de arquivo), grava
      resumo:{...} no proprio documento. PDF nao e lido (o app nao consegue ler PDF de extrato).
   2. Mostra o resumo na janela do extrato (#ap-ext-modal), na Ficha do Cliente e no cartao do cliente.
   3. Botao "Lancar no Controle de Faturamento": cria/atualiza o lancamento em 'faturamento'
      (cliente, mesRef AAAA-MM, faturamento = entradas, despesa = saidas, obs "pelo extrato OFX") -
      o Daniel confere antes, porque entrada no banco nao e sempre receita (emprestimo, aporte, transferencia).
   v2 (26/09/2026): o Itau (e outros bancos) poe no OFX linhas de SALDO e as aplicacoes/resgates automaticos como
      se fossem lancamentos - a v1 somava tudo (Castro 08/2026 deu R$ 180.542,06 em vez de R$ 22.918,65).
      Agora: ignora saldos, aplicacao/resgate automatico e rendimentos; separa as saidas em repasses a parceiros
      (cadastro do salao), PIX para pessoa fisica (CPF), pagamentos a empresas (CNPJ) e contas/tarifas.
   4. Extrato ja enviado sem resumo: botao "Ler o arquivo" que pede o mesmo arquivo de novo (o navegador nao
      consegue baixar do Storage pela regra de CORS). */
;(function(){
  if(window.__APARAT_EXTRES__) return; window.__APARAT_EXTRES__=1;

  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t||'success'); return; } }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return true; }catch(e){ return false; } }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }
  function mesmo(a,b){ return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase(); }
  function dataBR(d8){ var m=String(d8||'').match(/^(\d{4})(\d{2})(\d{2})/); return m ? (m[3]+'/'+m[2]+'/'+m[1]) : ''; }
  function compLabel(cp){ var p=String(cp||'').split('-'); return p.length===2 ? (p[1]+'/'+p[0]) : cp; }

  /* ---------------- leitura do OFX ---------------- */
  function decodifica(buf){
    var t=''; try{ t=new TextDecoder('utf-8',{fatal:true}).decode(buf); }catch(e){ try{ t=new TextDecoder('iso-8859-1').decode(buf); }catch(e2){ t=''; } }
    if(/CHARSET:1252|ENCODING:USASCII/i.test(t) && /\uFFFD/.test(t)){ try{ t=new TextDecoder('windows-1252').decode(buf); }catch(e3){} }
    return t;
  }
  /* v2: classifica cada linha do OFX */
  function classe(memo, v){
    var m=String(memo||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/^SALDO\b|\bSALDO (ANTERIOR|TOTAL|DO DIA|DIA|APLIC|MOVIMENTA|DISPON|FINAL|BLOQ|EM C)/.test(m)) return 'saldo';
    if(/RENDIMENTO|REND PAGO|REMUNERACAO APLIC|JUROS S\/ ?APLIC/.test(m)) return 'rend';
    if(/\b(APL|RES)\b.*APLIC|APLIC\.? ?AUT|APLICACAO|RESGATE|\bCDB\b|POUPANCA|INVEST ?FACIL|COMPROMISSADA/.test(m)) return 'aplic';
    if(/ESTORNO|DEVOLUC|DEVOLVID|CANCELAMENTO/.test(m)) return 'estorno';
    if(v>0 && /EMPREST|CAPITAL DE GIRO|CREDITO PESSOAL|FINANCIAMENTO|ANTECIPACAO DE RECEB|PRONAMPE|LIMITE CHEQUE/.test(m)) return 'emprest';
    return v>0 ? 'receita' : 'saida';
  }
  function docDe(memo){ var m=String(memo||''); var c=m.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/); if(c) return {tipo:'cnpj', n:c[0].replace(/\D/g,'')};
    var p=m.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/); if(p) return {tipo:'cpf', n:p[0].replace(/\D/g,'')}; return null; }
  function lerOFX(txt){
    txt=String(txt||''); if(!/<OFX>|OFXHEADER/i.test(txt)) throw new Error('o arquivo não é um OFX');
    function g(n,b){ var r=b.match(new RegExp('<'+n+'>\\s*([^<\\r\\n]*)','i')); return r ? r[1].trim() : ''; }
    var trns=[]; var re=/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi, m;
    while((m=re.exec(txt))){ var b=m[1]; var v=parseFloat(String(g('TRNAMT',b)).replace(/\./g, function(x,i,s){ return s.indexOf(',')>-1?'':x; }).replace(',','.'));
      if(isNaN(v)) continue; trns.push({tipo:g('TRNTYPE',b), data:dataBR(g('DTPOSTED',b)), valor:v, memo:(g('MEMO',b)||g('NAME',b)||'').slice(0,90), id:g('FITID',b)}); }
    if(!trns.length) throw new Error('não achei lançamentos (<STMTTRN>) no OFX');
    var ign={saldo:0, aplicEnt:0, aplicSai:0, rend:0, estornoEnt:0, estornoSai:0, emprest:0, n:0};
    var cred=0, deb=0, nc=0, nd=0, saidas=[];
    trns.forEach(function(t){ var c=classe(t.memo, t.valor), v=t.valor;
      if(c==='receita'){ cred+=v; nc++; }
      else if(c==='saida'){ deb+=-v; nd++; var dc=docDe(t.memo); saidas.push({d:t.data, v:Number((-v).toFixed(2)), m:t.memo, doc:dc?dc.n:'', dt:dc?dc.tipo:''}); }
      else { ign.n++; if(c==='saldo') ign.saldo++; else if(c==='aplic'){ if(v>0) ign.aplicEnt+=v; else ign.aplicSai+=-v; } else if(c==='rend') ign.rend+=v;
        else if(c==='estorno'){ if(v>0) ign.estornoEnt+=v; else ign.estornoSai+=-v; } else if(c==='emprest') ign.emprest+=v; } });
    Object.keys(ign).forEach(function(k){ if(k!=='n' && k!=='saldo') ign[k]=Number(ign[k].toFixed(2)); });
    var ini=dataBR(g('DTSTART',txt)), fim=dataBR(g('DTEND',txt)), banco=g('ORG',txt)||g('BANKID',txt)||'', saldo=g('BALAMT',txt);
    if(/^0?341$/.test(banco)) banco='Itaú'; else if(/^0?237$/.test(banco)) banco='Bradesco'; else if(/^0?001$/.test(banco)) banco='Banco do Brasil'; else if(/^0?104$/.test(banco)) banco='Caixa'; else if(/^0?033$/.test(banco)) banco='Santander'; else if(/^0?077$/.test(banco)) banco='Inter'; else if(/^0?260$/.test(banco)) banco='Nubank'; else if(/^0?756$/.test(banco)) banco='Sicoob'; else if(/^0?748$/.test(banco)) banco='Sicredi';
    var maiores=trns.filter(function(t){ return t.valor>0 && classe(t.memo,t.valor)==='receita'; }).sort(function(a,b){ return b.valor-a.valor; }).slice(0,5).map(function(t){ return {data:t.data, valor:Number(t.valor.toFixed(2)), memo:t.memo}; });
    return { v:2, fonte:'OFX', banco:banco, inicio:ini, fim:fim, entradas:Number(cred.toFixed(2)), saidas:Number(deb.toFixed(2)), qtdEntradas:nc, qtdSaidas:nd, qtd:trns.length,
             ignorados:ign, saidasLista:saidas.slice(0,400), saldoFinal:saldo?Number(String(saldo).replace(',','.')):null, maioresEntradas:maiores, lidoEm:agoraBR() };
  }
  /* separa as saidas: repasse a parceiro do cadastro, pessoa fisica, empresa, contas/tarifas */
  function gruposSaida(r, cliente){
    var G={parc:0, pf:0, pj:0, outras:0, nParc:0, nPf:0, nPj:0, nOut:0, nomesParc:{}}; if(!r || !r.saidasLista) return null;
    var cad=parcs[String(cliente||'').trim().toLowerCase()]||[];
    r.saidasLista.forEach(function(x){
      var p=x.doc ? cad.filter(function(c){ return c.cnpj && String(c.cnpj).replace(/\D/g,'')===x.doc || (c.cpf && String(c.cpf).replace(/\D/g,'')===x.doc); })[0] : null;
      if(p){ G.parc+=x.v; G.nParc++; G.nomesParc[p.nome||x.doc]=1; }
      else if(x.dt==='cpf'){ G.pf+=x.v; G.nPf++; }
      else if(x.dt==='cnpj'){ G.pj+=x.v; G.nPj++; }
      else { G.outras+=x.v; G.nOut++; } });
    return G;
  }
  function lerArquivo(f){ return new Promise(function(res,rej){ var fr=new FileReader(); fr.onload=function(){ res(fr.result); }; fr.onerror=function(){ rej(new Error('não consegui ler o arquivo')); }; fr.readAsArrayBuffer(f); }); }
  async function resumoDoArquivo(f){
    if(!/\.ofx$/i.test(f.name||'')) return null;
    var buf=await lerArquivo(f); return lerOFX(decodifica(buf));
  }

  /* ---------------- 1. escuta o input de arquivo e casa com o documento gravado ---------------- */
  var pend=[];   // {nome, tamanho, resumo, ts}
  document.addEventListener('change', async function(ev){
    var t=ev.target; if(!t || t.tagName!=='INPUT' || t.type!=='file') return;
    if(t.id!=='ex-mfile' && t.id!=='ext-file' && t.id!=='exr-reler') return;
    var f=t.files && t.files[0]; if(!f) return;
    try{
      var r=await resumoDoArquivo(f);
      if(!r){ if(t.id!=='exr-reler') aviso('\u{1F4C4} PDF recebido. O app só consegue somar entradas e saídas de extrato em OFX.','info'); return; }
      if(t.id==='exr-reler'){ var alvo=t.getAttribute('data-id'); await gravarResumo(alvo, r, f); return; }
      pend.push({nome:f.name, tamanho:f.size, resumo:r, ts:Date.now()});
      aviso('\u{1F4CA} Extrato lido: '+r.qtdEntradas+' entradas ('+moeda(r.entradas)+') e '+r.qtdSaidas+' saídas ('+moeda(r.saidas)+').','info');
      setTimeout(casar, 1500); setTimeout(casar, 5000); setTimeout(casar, 12000);
    }catch(e){ aviso('Não consegui ler o OFX: '+(e&&e.message?e.message:e),'warn'); }
  }, true);
  async function casar(){
    var d=db(); if(!d || !pend.length) return;
    var vivos=[];
    for(var i=0;i<pend.length;i++){ var p=pend[i]; if(Date.now()-p.ts>10*60000) continue;
      try{ var s=await d.collection('extratos').where('arquivoNome','==',p.nome).get(); var achou=null;
        s.forEach(function(x){ var o=x.data()||{}; if(Number(o.tamanho)===Number(p.tamanho) && Number(o.ts||0)>=p.ts-120000 && !(o.resumo&&o.resumo.lidoEm===p.resumo.lidoEm)) achou=x.id; });
        if(achou){ await gravarResumo(achou, p.resumo, null); continue; }
      }catch(e){}
      vivos.push(p);
    }
    pend=vivos;
  }
  async function gravarResumo(id, r, f){
    var d=db(); if(!d) return;
    var upd={resumo:r}; if(f){ upd.resumoArquivo=f.name; }
    await d.collection('extratos').doc(String(id)).set(upd,{merge:true});
    cache[id]=Object.assign(cache[id]||{}, upd); aviso('\u{2705} Resumo do extrato salvo: entradas '+moeda(r.entradas)+' · saídas '+moeda(r.saidas)+'.','success');
    ass=''; setTimeout(tick,200);
  }

  /* ---------------- dados ---------------- */
  var cache={}, tCache=0, fat={}, tFat=0, regimes={}, parcs={};
  async function carregar(forcar){
    var d=db(); if(!d) return; if(!forcar && tCache && Date.now()-tCache<20000) return; tCache=Date.now();
    try{ var q=ehAdmin()? d.collection('extratos') : d.collection('extratos').where('cliente','==',clienteAtual()); var s=await q.get(); var c={}; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; c[x.id]=o; }); cache=c; }catch(e){}
    if(ehAdmin()){ try{ var s2=await d.collection('faturamento').get(); var f={}; s2.forEach(function(x){ var o=x.data()||{}; o.id=x.id; f[String(o.cliente||'').trim().toLowerCase()+'|'+o.mesRef]=o; }); fat=f; }catch(e){}
      try{ var s3=await d.collection('clientes').get(); s3.forEach(function(x){ var o=x.data()||{}; if(o.nome){ regimes[String(o.nome).trim().toLowerCase()]=o.regime||''; parcs[String(o.nome).trim().toLowerCase()]=Array.isArray(o.parceiros)?o.parceiros:[]; } }); }catch(e){} }
  }
  function extratoDe(cli, cp){ var ks=Object.keys(cache); for(var i=0;i<ks.length;i++){ var o=cache[ks[i]]; if(mesmo(o.cliente,cli) && o.competencia===cp) return o; } return null; }
  function fatDe(cli, cp){ return fat[String(cli||'').trim().toLowerCase()+'|'+cp]||null; }

  /* ---------------- 3. lancar no Controle de Faturamento ---------------- */
  async function lancarFat(o){
    var d=db(), r=o.resumo; if(!d||!r) return;
    var cp=o.competencia, ja=fatDe(o.cliente,cp);
    if(!r.v){ aviso('Esse resumo foi feito pela versão antiga (somava as linhas de saldo). Clique em "Ler o arquivo OFX" e escolha o arquivo de novo.','warn'); return; }
    var G=gruposSaida(r,o.cliente)||{};
    var msg='Lançar no Controle de Faturamento de '+o.cliente+' — '+compLabel(cp)+':\n\nFaturamento (recebimentos reais): '+moeda(r.entradas)+'\nDespesas (saídas reais): '+moeda(r.saidas)+(G.parc?('\n   · repasses aos parceiros: '+moeda(G.parc)):'')+(G.pf?('\n   · PIX/transferências a pessoas físicas: '+moeda(G.pf)):'')+(G.pj?('\n   · pagamentos a empresas: '+moeda(G.pj)):'')+(G.outras?('\n   · contas, tarifas e outros: '+moeda(G.outras)):'')+'\n\nFora da conta: linhas de saldo, aplicação/resgate automático e rendimentos'+(r.ignorados&&r.ignorados.emprest?(', empréstimos '+moeda(r.ignorados.emprest)):'')+'.\nConfira antes de usar no PGDAS.'+(ja?('\n\nJá existe um lançamento desse mês (fat. '+moeda(ja.faturamento)+'). Ele será SUBSTITUÍDO.'):'');
    if(!confirm(msg)) return;
    var tipo=/mei/i.test(regimes[String(o.cliente).trim().toLowerCase()]||'')?'MEI':'ME';
    var dados={cliente:o.cliente, tipo:tipo, mesRef:cp, faturamento:r.entradas, despesa:r.saidas, obs:'Pelo extrato OFX ('+(r.banco||'banco')+', '+(r.inicio||'')+' a '+(r.fim||'')+'): recebimentos reais, sem saldos nem aplicações'+(G.parc?('; saídas incluem repasses a parceiros '+moeda(G.parc)):'')+(G.pf?('; PIX a pessoas físicas '+moeda(G.pf)):'')+'. Lançado em '+agoraBR()};
    try{
      if(ja) await d.collection('faturamento').doc(String(ja.id)).set(dados,{merge:true}); else { var ref=await d.collection('faturamento').add(dados); dados.id=ref.id; }
      fat[String(o.cliente).trim().toLowerCase()+'|'+cp]=Object.assign(ja||{},dados);
      aviso('\u{1F4C8} Faturamento de '+compLabel(cp)+' lançado para '+o.cliente+'.','success');
      try{ if(typeof carregarFaturamento==='function') carregarFaturamento(); }catch(e){}
      ass=''; tick();
    }catch(e){ aviso('Não consegui lançar: '+(e&&e.message?e.message:e),'warn'); }
  }

  /* ---------------- 2. como mostrar ---------------- */
  function bloco(o, modo){
    var r=o.resumo, id='exr-'+String(o.id).replace(/[^a-z0-9]/gi,'_');
    var temArq=!!(o.arquivoUrl||o.arquivoData||o.arquivoPath), ofx=/\.ofx$/i.test(o.arquivoNome||'');
    var h='<div class="exr" id="'+id+'">';
    if(r){
      var ja=fatDe(o.cliente,o.competencia);
      if(!r.v && modo==='admin'){
        h+='<div class="exr-h">\u{26A0}\u{FE0F} Resumo antigo — somava as linhas de saldo do banco</div><small class="exr-s">Os valores guardados ('+moeda(r.entradas)+' de entradas) estão errados. Escolha o mesmo arquivo OFX de novo para somar só os recebimentos reais.</small>'
          +'<div class="exr-a"><label class="exr-b az">\u{1F4C2} Ler o arquivo OFX de novo<input type="file" id="exr-reler" data-id="'+esc(o.id)+'" accept=".ofx,.OFX" style="display:none"></label></div></div>';
        return h;
      }
      if(!r.v){ return h+'</div>'; }
      var G=gruposSaida(r,o.cliente), ig=r.ignorados||{};
      h+='<div class="exr-h">\u{1F4CA} Resumo do extrato'+(r.banco?(' · '+esc(r.banco)):'')+(r.inicio?(' · '+esc(r.inicio)+' a '+esc(r.fim)):'')+'</div>'
        +'<div class="exr-g"><div class="exr-k ent"><b>'+moeda(r.entradas)+'</b><span>recebimentos reais · '+r.qtdEntradas+'</span></div>'
        +'<div class="exr-k sai"><b>'+moeda(r.saidas)+'</b><span>saídas reais · '+r.qtdSaidas+'</span></div>'
        +'<div class="exr-k"><b>'+moeda(r.entradas-r.saidas)+'</b><span>recebido − pago</span></div></div>';
      if(modo==='admin' && G && r.saidas>0) h+='<div class="exr-sg">'
        +(G.parc?('<span>\u{1F488} Repasses aos parceiros: <b>'+moeda(G.parc)+'</b> <i>('+esc(Object.keys(G.nomesParc).join(', '))+')</i></span>'):'')
        +(G.pf?('<span>\u{1F464} PIX a pessoas físicas (sócio, funcionário?): <b>'+moeda(G.pf)+'</b></span>'):'')
        +(G.pj?('<span>\u{1F3E2} Pagamentos a empresas: <b>'+moeda(G.pj)+'</b></span>'):'')
        +(G.outras?('<span>\u{1F9FE} Contas, tarifas e outros: <b>'+moeda(G.outras)+'</b></span>'):'')+'</div>';
      if(modo==='admin' && ig.n) h+='<small class="exr-s">Fora da conta: '+[ig.saldo?(ig.saldo+' linhas de saldo'):'', (ig.aplicEnt||ig.aplicSai)?('aplicação/resgate automático ('+moeda(ig.aplicSai)+' aplicados, '+moeda(ig.aplicEnt)+' resgatados)'):'', ig.rend?('rendimentos '+moeda(ig.rend)):'', (ig.estornoEnt||ig.estornoSai)?('estornos '+moeda(ig.estornoEnt+ig.estornoSai)):'', ig.emprest?('empréstimos '+moeda(ig.emprest)):''].filter(Boolean).join(' · ')+'.</small>';
      if(modo==='admin'){
        h+='<div class="exr-a">'+(ja?('<span class="exr-c ok">\u{1F4C8} No Controle de Faturamento: '+moeda(ja.faturamento)+(Math.abs(Number(ja.faturamento)-r.entradas)>0.009?' (diferente do extrato)':'')+'</span>'):'<span class="exr-c lar">Ainda não está no Controle de Faturamento</span>')
          +'<button class="exr-b az" data-exr-fat="'+esc(o.id)+'">\u{1F4C8} '+(ja?'Atualizar no':'Lançar no')+' Controle de Faturamento</button>'
          +(r.maioresEntradas&&r.maioresEntradas.length?'<button class="exr-b" data-exr-top="'+id+'">\u{1F50D} Maiores entradas</button>':'')+'</div>'
          +'<div class="exr-top" style="display:none">'+(r.maioresEntradas||[]).map(function(t){ return '<div><span>'+esc(t.data)+'</span> '+moeda(t.valor)+' <i>'+esc(t.memo)+'</i></div>'; }).join('')+'</div>'
          +'<small class="exr-s">Entrada no banco nem sempre é receita (empréstimo, aporte, transferência). Confira antes do PGDAS.</small>';
      } else h+='<small class="exr-s">Somado pelo app a partir do arquivo OFX. A APARAT confere antes de apurar.</small>';
    } else if(modo==='admin' && temArq){
      h+='<div class="exr-h">\u{1F4CA} Entradas e saídas ainda não somadas</div>'
        +(ofx?'<small class="exr-s">Esse OFX foi enviado antes desta função. Escolha o mesmo arquivo de novo que eu somo na hora (o navegador não consegue baixar do armazenamento sozinho).</small>'
             :'<small class="exr-s">Extrato em PDF: o app não consegue somar. Peça ao cliente o arquivo OFX do banco, ou lance o faturamento à mão.</small>')
        +(ofx?'<div class="exr-a"><label class="exr-b az">\u{1F4C2} Ler o arquivo OFX<input type="file" id="exr-reler" data-id="'+esc(o.id)+'" accept=".ofx,.OFX" style="display:none"></label></div>':'');
    } else if(modo==='admin' && o.realizado && !temArq){
      h+='<div class="exr-h">\u{1F4CA} Marcado como realizado sem arquivo</div><small class="exr-s">Para somar entradas e saídas, anexe o OFX na aba Extratos (Trocar o arquivo).</small>';
    }
    h+='</div>'; return h;
  }
  function ligar(box){
    [].forEach.call(box.querySelectorAll('[data-exr-fat]'),function(b){ if(b.__l) return; b.__l=1; b.onclick=function(){ var o=cache[b.getAttribute('data-exr-fat')]; if(o) lancarFat(o); }; });
    [].forEach.call(box.querySelectorAll('[data-exr-top]'),function(b){ if(b.__l) return; b.__l=1; b.onclick=function(){ var t=el(b.getAttribute('data-exr-top')); var d=t&&t.querySelector('.exr-top'); if(d) d.style.display=d.style.display==='none'?'block':'none'; }; });
  }

  /* aba Controle de Faturamento: marca as linhas que vieram do extrato */
  function tabelaFat(){
    var tb=el('fat-tbody'); if(!tb || tb.offsetParent===null) return;
    [].forEach.call(tb.querySelectorAll('tr'),function(tr){
      if(tr.__exr) return; var tds=tr.querySelectorAll('td'); if(tds.length<4) return;
      var cli=tds[0].textContent.trim(), mes=tds[2].textContent.trim(), m=mes.match(/^([A-Za-z]{3})\/(\d{4})$/); if(!m) return;
      var MM={jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12'}[m[1].toLowerCase()]; if(!MM) return;
      var f=fatDe(cli, m[2]+'-'+MM); if(!f || !/^Pelo extrato OFX/i.test(f.obs||'')) return;
      tr.__exr=1; tds[3].innerHTML+=' <span class="exr-c ok" title="'+esc(f.obs)+'">\u{1F4CA} pelo extrato</span>';
    });
  }
  /* modal da aba Extratos (#ap-ext-modal): descobre cliente e mes pelo texto do titulo */
  var ass='';
  function modal(){
    var m=el('ap-ext-modal'); if(!m) return;
    var txt=m.innerText||'', achou=null;
    var ks=Object.keys(cache); for(var i=0;i<ks.length;i++){ var o=cache[ks[i]]; if(!o.cliente) continue; if(txt.indexOf(o.cliente)>-1){ var lab=compLabel(o.competencia), p=lab.split('/'); var MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']; var nomeMes=MES[Number(p[0])-1]||''; if(txt.indexOf(lab)>-1 || (nomeMes && new RegExp(nomeMes+'\\s*/?\\s*'+p[1],'i').test(txt))){ achou=o; break; } } }
    var have=m.querySelector('.exr');
    if(!achou){ if(have) have.remove(); return; }
    var a='m|'+achou.id+'|'+(achou.resumo?achou.resumo.lidoEm:'')+'|'+(fatDe(achou.cliente,achou.competencia)?1:0);
    if(have && have.getAttribute('data-a')===a) return;
    if(have) have.remove();
    var alvo=m.querySelector('.ex-det')||m.querySelector('[class*="cx"]')||m.firstElementChild||m;
    var div=document.createElement('div'); div.innerHTML=bloco(achou,'admin'); var b=div.firstElementChild; b.setAttribute('data-a',a);
    alvo.appendChild(b); ligar(b);
  }
  /* ficha do cliente: depois da linha do extrato */
  function ficha(){
    var pg=el('pp-fichas'); if(!pg || !pg.classList.contains('active')) return;
    var st=null; try{ st=window.__FICHA__ && __FICHA__.estado ? __FICHA__.estado() : null; }catch(e){}
    var cli=st&&st.sel, corpo=el('fc-corpo'); if(!cli||!corpo) return;
    var linhas=[].slice.call(corpo.querySelectorAll('.fc-lin')).filter(function(l){ return /extrato/i.test((l.querySelector('.fc-t b')||{}).textContent||''); });
    linhas.forEach(function(l){
      var txt=(l.querySelector('.fc-t')||l).textContent||'', mm=txt.match(/(\d{2})\/(\d{4})/); var cp=null;
      if(mm) cp=mm[2]+'-'+mm[1]; else { try{ cp=__FICHA__.compAtiva(); }catch(e){} }
      if(!cp) return; var o=extratoDe(cli,cp); var nx=l.nextElementSibling, have=(nx&&nx.classList.contains('exr'))?nx:null;
      if(!o){ if(have) have.remove(); return; }
      var a='f|'+o.id+'|'+(o.resumo?o.resumo.lidoEm:'')+'|'+(fatDe(cli,cp)?1:0)+'|'+(o.arquivoUrl||o.arquivoData?1:0);
      if(have && have.getAttribute('data-a')===a) return; if(have) have.remove();
      var div=document.createElement('div'); div.innerHTML=bloco(o,'admin'); var b=div.firstElementChild; if(!b||!b.innerHTML.trim()) return; b.setAttribute('data-a',a);
      l.parentNode.insertBefore(b, l.nextSibling); ligar(b);
    });
  }
  /* app do cliente: cartao "Extratos que enviei" */
  function cliente(){
    var sec=el('sec-extratos'); if(!sec || sec.offsetParent===null) return;
    var nome=clienteAtual(); if(!nome) return;
    var itens=[].slice.call(sec.querySelectorAll('.lcard, .lcinfo, li, .ln')).filter(function(x){ return /\d{2}\/\d{4}|\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i.test(x.textContent||''); });
    var box=el('exr-cli'); if(!box){ box=document.createElement('div'); box.id='exr-cli'; sec.appendChild(box); }
    var lista=Object.keys(cache).map(function(k){ return cache[k]; }).filter(function(o){ return mesmo(o.cliente,nome) && o.resumo && o.resumo.v; }).sort(function(a,b){ return String(b.competencia).localeCompare(String(a.competencia)); }).slice(0,6);
    var a='c|'+lista.map(function(o){ return o.id+o.resumo.lidoEm; }).join(',');
    if(box.getAttribute('data-a')===a) return; box.setAttribute('data-a',a);
    box.innerHTML= lista.length ? '<div class="exr-h" style="margin-top:10px">\u{1F4CA} Entradas e saídas dos extratos que você mandou</div>'+lista.map(function(o){ return '<div class="exr-cli-l"><b>'+esc(compLabel(o.competencia))+'</b><span class="ent">\u{2B06}\u{FE0F} '+moeda(o.resumo.entradas)+'</span><span class="sai">\u{2B07}\u{FE0F} '+moeda(o.resumo.saidas)+'</span></div>'; }).join('') : '';
  }

  function css(){
    if(el('ap-exr-css')) return; var s=document.createElement('style'); s.id='ap-exr-css';
    s.textContent='.exr{border:1.5px solid rgba(51,85,255,.5);border-radius:14px;padding:11px 13px;margin:8px 0 10px;background:rgba(51,85,255,.06);font-size:12.5px}'
      +'.exr-h{font-weight:800;font-size:13px;margin-bottom:6px}.exr-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:6px 0}'
      +'.exr-k{background:var(--card);border:1px solid var(--border);border-radius:11px;padding:8px 10px}.exr-k b{display:block;font-size:16px;font-weight:800}.exr-k span{font-size:11px;color:var(--cinza)}'
      +'.exr-k.ent b{color:#2fd29b}.exr-k.sai b{color:#ff7b70}body.ap-esc-claro .exr-k.ent b{color:#0e9f6e}body.ap-esc-claro .exr-k.sai b{color:#d92d20}'
      +'.exr-a{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}'
      +'.exr-b{font:inherit;font-size:12px;font-weight:700;padding:7px 11px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;display:inline-block}.exr-b.az{background:var(--azul,#3355ff);border-color:var(--azul,#3355ff);color:#fff}'
      +'.exr-c{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:999px}.exr-c.ok{background:rgba(14,159,110,.16);color:#2fd29b}.exr-c.lar{background:rgba(255,138,0,.14);color:#ff9d2e;border:1px solid #ff8a00}'
      +'body.ap-esc-claro .exr-c.ok{color:#0e9f6e}body.ap-esc-claro .exr-c.lar{color:#c25e00}'
      +'.exr-s{display:block;font-size:11px;color:var(--cinza);margin-top:6px;line-height:1.45}.exr-top{font-size:11.5px;margin-top:6px;font-family:ui-monospace,Consolas,monospace}.exr-top span{color:var(--cinza)}.exr-top i{color:var(--cinza);font-style:normal}'
      +'.exr-sg{display:flex;flex-direction:column;gap:3px;font-size:12px;margin:4px 0 2px}.exr-sg i{color:var(--cinza);font-style:normal}'
      +'.exr-cli-l{display:flex;gap:10px;align-items:center;justify-content:space-between;background:var(--card);border:1px solid var(--border);border-radius:11px;padding:8px 11px;margin-bottom:6px;font-size:12px}.exr-cli-l .ent{color:#2fd29b;font-weight:700}.exr-cli-l .sai{color:#ff7b70;font-weight:700}';
    document.head.appendChild(s);
  }

  var voltas=0, ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{ css(); var adm=ehAdmin();
      if(adm){ var painel=el('view-painel'); if(painel && painel.classList.contains('active')){ await carregar(voltas%10===0); modal(); ficha(); tabelaFat(); } }
      else if(clienteAtual()){ await carregar(voltas%10===0); cliente(); }
    }catch(e){}
    ocupado=false;
  }
  [1500,3500,7000].forEach(function(t){ setTimeout(tick,t); }); setInterval(tick,2500);
  window.__EXTRES__={lerOFX:lerOFX, resumoDoArquivo:resumoDoArquivo, carregar:carregar, tick:tick, estado:function(){ return {cache:cache, fat:fat, pend:pend}; }, lancarFat:lancarFat, gruposSaida:gruposSaida, classe:classe, parcs:function(){ return parcs; }};
})();
