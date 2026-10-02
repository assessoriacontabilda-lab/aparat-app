/* APARAT - CONTROLE INTELIGENTE DE FATURAMENTO DO MEI (v1, 02/10/2026)
   PROBLEMA QUE RESOLVE: a nota fiscal emitida pelo escritório (formulário "Registrar Nota Fiscal" -> coleção 'notas',
   e a resposta com PDF ao pedido do cliente -> coleção 'solicitacoes') NÃO entrava no "Controle de Faturamento"
   (coleção 'faturamento'), que só recebia lançamento manual mês a mês. Por isso a nota nº 36 do FABIO HENRIQUE
   (R$ 710,00, 01/10/2026) não aparecia no faturamento, no gráfico, na ficha e nem no app dele.
   O QUE FAZ:
   1. Junta as notas emitidas das duas fontes, sem contar a mesma nota duas vezes (mesmo cliente, mês e valor),
      e soma por mês. O valor digitado é lido com a regra do notas-concluir ("1.060" = mil e sessenta; "750.00" = 750).
   2. LANÇAMENTO AUTOMÁTICO (só no painel do escritório, só para cliente MEI): para cada mês que tem nota e não
      tem lançamento em 'faturamento', cria o lançamento {tipo:'MEI', faturamento = soma das notas, auto:'notas'}.
      Se o lançamento foi criado por este módulo, ele é atualizado quando entra nota nova. Lançamento feito à mão
      (ou pelo extrato OFX) NUNCA é alterado: se as notas somarem mais do que foi lançado, aparece um aviso com o
      botão "Usar o total das notas". Nada é apagado.
   3. Painel "Controle inteligente MEI" na aba Faturamento: todos os MEI com faturado no ano, limite (proporcional no
      ano de abertura, se o mês de abertura for informado), % usado, quanto ainda pode faturar, ritmo por mês até
      dezembro, projeção de fim de ano e situação com o que fazer. Clique no cliente para ver mês a mês e avisar
      pelo WhatsApp.
   4. App do cliente MEI (#sec-fat): cartão "Seu limite MEI" com barra, números e explicação em linguagem simples.
   REGRAS (conferidas em 02/10/2026 — LC 123/2006 art. 18-A; Resolução CGSN 140/2018 arts. 100 a 118):
   - Limite do MEI: R$ 81.000,00 por ano-calendário. No ano de abertura: R$ 6.750,00 x meses entre a abertura e dezembro.
   - Excesso de ATÉ 20% (até R$ 97.200,00): continua MEI até 31/12, paga DAS complementar sobre o excesso e vira
     ME no Simples a partir de 1º de janeiro do ano seguinte (comunicar o desenquadramento no Portal do Simples
     até o último dia útil de janeiro).
   - Excesso ACIMA de 20%: o desenquadramento retroage a 1º de janeiro (ou ao mês de abertura, no primeiro ano);
     paga como ME todo o ano, com juros; comunicar até o último dia útil do mês seguinte ao do excesso.
   - O PLP que aumenta o limite para R$ 130 mil ainda não é lei. Se mudar: alterar LIM_MEI, LIM_MES e os textos
     "81.000"/"97.200"/"6.750" neste arquivo e subir ?v=2 no index.html.  */
;(function(){
  if(window.__APARAT_FATMEI__) return; window.__APARAT_FATMEI__=1;

  var LIM_MEI=81000, LIM_MES=6750, TOLER=1.2;
  var NM=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var NML=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return true; }catch(e){ return false; } }
  function aviso(m,t){ try{ if(typeof notif==='function') notif(m,t||'info'); }catch(e){} }
  function chave(s){ return String(s||'').trim().toLowerCase(); }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }
  function claro(){ var c=document.body.classList; return c.contains('ap-esc-claro')||c.contains('ap-tema-claro'); }
  function soDig(s){ return String(s||'').replace(/\D/g,''); }
  /* valor digitado: vírgula = decimal; só ponto com 3 dígitos depois = milhar ("1.060" = 1060); 1 ou 2 dígitos = centavos ("750.00") */
  function num(v){
    if(typeof v==='number') return isFinite(v)?v:0;
    v=String(v==null?'':v).replace(/[^0-9,.-]/g,''); if(!v) return 0;
    if(v.indexOf(',')>-1) return parseFloat(v.replace(/\./g,'').replace(',','.'))||0;
    var i=v.lastIndexOf('.');
    if(i>-1 && /^\d{3}$/.test(v.slice(i+1))) return parseFloat(v.replace(/\./g,''))||0;
    return parseFloat(v)||0;
  }
  function moeda(v){ v=Number(v)||0; var s=Math.abs(v).toFixed(2).split('.'); return (v<0?'-':'')+'R$ '+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+s[1]; }
  function pct(v){ return (Math.round(v*10)/10).toFixed(1).replace('.',',')+'%'; }
  function hojeYM(){ try{ return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7); }catch(e){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); } }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function rotulo(ym){ var p=String(ym||'').split('-'); return (NM[parseInt(p[1],10)-1]||p[1])+'/'+p[0]; }
  /* data em qualquer formato do app -> 'AAAA-MM' */
  function ymDe(v){
    if(!v) return '';
    if(typeof v==='object' && v.seconds){ var d=new Date(v.seconds*1000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
    var s=String(v).trim(), m;
    if((m=s.match(/^(\d{4})-(\d{2})/))) return m[1]+'-'+m[2];
    if((m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return m[3]+'-'+m[2];
    return '';
  }

  /* ---------------- dados ---------------- */
  var NOTAS=[], SOLS=[], FAT=[], CLI={}, versao=0, unsubs=[], tCli=0, tCliente=0;
  function ligar(){
    var d=db(); if(!d) return;
    if(ehAdmin()){
      if(!unsubs.length){
        try{ unsubs.push(d.collection('notas').onSnapshot(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); NOTAS=a; novo(); },function(){})); }catch(e){}
        try{ unsubs.push(d.collection('solicitacoes').onSnapshot(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); SOLS=a; novo(); },function(){})); }catch(e){}
        try{ unsubs.push(d.collection('faturamento').onSnapshot(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); FAT=a; novo(); },function(){})); }catch(e){}
      }
      if(Date.now()-tCli>120000){ tCli=Date.now(); d.collection('clientes').get().then(function(s){ var c={}; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; if(o.nome) c[chave(o.nome)]=o; }); CLI=c; novo(); }).catch(function(){}); }
    } else {
      var nome=clienteAtual(); if(!nome || Date.now()-tCliente<60000) return; tCliente=Date.now();
      d.collection('faturamento').where('cliente','==',nome).get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); FAT=a; novo(); }).catch(function(){});
      d.collection('notas').where('cliente','==',nome).get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); NOTAS=a; novo(); }).catch(function(){});
      d.collection('solicitacoes').where('cliente','==',nome).get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); SOLS=a; novo(); }).catch(function(){});
      d.collection('clientes').where('nome','==',nome).get().then(function(s){ var c={}; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; if(o.nome) c[chave(o.nome)]=o; }); CLI=c; novo(); }).catch(function(){});
    }
  }
  function novo(){ versao++; setTimeout(tick,0); }
  function ehMEI(cli){ var c=CLI[chave(cli)]||{}; if(/mei/i.test(c.regime||'')) return true; return FAT.some(function(f){ return chave(f.cliente)===chave(cli) && f.tipo==='MEI'; }); }
  function listaMEI(){ var a=[]; Object.keys(CLI).forEach(function(k){ if(/mei/i.test(CLI[k].regime||'')) a.push(CLI[k].nome); }); return a.sort(); }
  function ehPedidoNF(o){ return /nota\s*fiscal|nfe|nf-e|emitir\s*nota/i.test(String(o.servico||'')+' '+String(o.mensagem||'')); }

  /* notas emitidas de um cliente, sem repetir a mesma nota que está nas duas fontes */
  function notasDe(cli){
    var k=chave(cli), lista=[];
    NOTAS.forEach(function(n){ if(chave(n.cliente)!==k || n.direcao) return; if(/pedido/i.test(n.tipo||'')) return;
      var ym=ymDe(n.data)||ymDe(n.criadoEm); if(!ym) return; lista.push({fonte:'notas', id:n.id, numero:n.numero||'', valor:num(n.valor), ym:ym, data:n.data||''}); });
    SOLS.forEach(function(s){ if(chave(s.cliente)!==k || !ehPedidoNF(s) || !s.respostaArquivoData) return;
      var ym=ymDe(s.respondidoEm)||ymDe(s.data); if(!ym) return; lista.push({fonte:'sol', id:s.id, numero:'', valor:num(s.valor), ym:ym, data:s.respondidoEm||s.data||''}); });
    /* mesma nota nas duas fontes: mesmo mês e mesmo valor (centavos) -> fica a da coleção 'notas' */
    var vistos={}, fim=[];
    lista.sort(function(a,b){ return a.fonte==='notas'?-1:(b.fonte==='notas'?1:0); });
    lista.forEach(function(n){ var ch=n.ym+'|'+Math.round(n.valor*100); if(n.fonte==='sol' && vistos[ch]){ vistos[ch]--; return; } if(n.fonte==='notas'){ vistos[ch]=(vistos[ch]||0)+1; } fim.push(n); });
    return fim;
  }
  function porMes(cli){ var m={}; notasDe(cli).forEach(function(n){ var x=m[n.ym]||(m[n.ym]={soma:0, qtd:0, nums:[]}); x.soma+=n.valor; x.qtd++; if(n.numero) x.nums.push(n.numero); }); return m; }
  function fatDe(cli){ var m={}, k=chave(cli); FAT.forEach(function(f){ if(chave(f.cliente)!==k || !/^\d{4}-\d{2}$/.test(String(f.mesRef||''))) return; var x=m[f.mesRef]; if(x){ x.fat+=num(f.faturamento); x.desp+=num(f.despesa); x.ids.push(f.id); x.dup=true; } else m[f.mesRef]={fat:num(f.faturamento), desp:num(f.despesa), ids:[f.id], auto:f.auto||'', obs:f.obs||'', doc:f}; }); return m; }

  /* ---------------- cálculo ---------------- */
  function aberturaDe(cli){ var c=CLI[chave(cli)]||{}; var ym=ymDe(c.aberturaMei||c.abertura||c.dataAbertura||''); return ym; }
  function calc(cli, ano){
    ano=String(ano||hojeYM().slice(0,4)); var hoje=hojeYM(), mesHoje=(hoje.slice(0,4)===ano)?parseInt(hoje.slice(5,7),10):(hoje.slice(0,4)>ano?12:0);
    var notas=porMes(cli), fat=fatDe(cli), ab=aberturaDe(cli), mesIni=1;
    if(ab && ab.slice(0,4)===ano) mesIni=parseInt(ab.slice(5,7),10);
    var limite=(ab && ab.slice(0,4)===ano)? LIM_MES*(12-mesIni+1) : LIM_MEI;
    var meses=[], total=0, totNotas=0, qtdNotas=0, pend=[], diverg=[], ultimo=0;
    for(var m=1;m<=12;m++){ var ym=ano+'-'+String(m).padStart(2,'0'), n=notas[ym]||{soma:0,qtd:0,nums:[]}, f=fat[ym];
      var lanc=f?f.fat:0, usado=Math.max(lanc, n.soma), fonte=f?(f.auto==='notas'?'notas':(/extrato/i.test(f.obs||'')?'extrato':'manual')):(n.soma?'notas-pendente':'');
      if(!f && n.soma) pend.push({ym:ym, soma:n.soma, qtd:n.qtd, nums:n.nums});
      if(f && f.auto!=='notas' && n.soma>lanc+0.005) diverg.push({ym:ym, lancado:lanc, notas:n.soma, id:f.ids[0]});
      if(usado>0) ultimo=m;
      total+=usado; totNotas+=n.soma; qtdNotas+=n.qtd;
      meses.push({ym:ym, m:m, notas:n.soma, qtd:n.qtd, nums:n.nums, lancado:lanc, desp:f?f.desp:0, usado:usado, fonte:fonte, dup:!!(f&&f.dup), futuro:m>mesHoje&&mesHoje>0});
    }
    /* média: desde a abertura (se informada) ou desde o 1º mês com movimento — assim quem começou agora não fica com a projeção diluída */
    var primeiro=mesIni; if(!(ab && ab.slice(0,4)===ano)){ for(var q=0;q<meses.length;q++){ if(meses[q].usado>0){ primeiro=meses[q].m; break; } } }
    var mesesCorridos=mesHoje?Math.max(1, mesHoje-primeiro+1):Math.max(1,12-primeiro+1);
    var media=total/mesesCorridos, restantes=mesHoje?(12-mesHoje):0;
    var projecao=total+media*restantes, pode=limite-total, p=limite?total/limite*100:0;
    var ritmo=mesHoje?Math.max(0,pode)/Math.max(1,12-mesHoje+1):0;
    var st;
    if(total>limite*TOLER) st='desenq'; else if(total>limite) st='excedeu'; else if(p>=80 || projecao>limite) st='alerta'; else if(p>=60) st='atencao'; else st='ok';
    return {cli:cli, ano:ano, limite:limite, limiteCheio:LIM_MEI, abertura:ab, mesIni:mesIni, total:total, totNotas:totNotas, qtdNotas:qtdNotas, pct:p, pode:pode, media:media, restantes:restantes, projecao:projecao, ritmo:ritmo, status:st, meses:meses, pend:pend, diverg:diverg, mesHoje:mesHoje, ultimo:ultimo, primeiro:primeiro};
  }
  var ST={ok:{cor:'#20b87a', rot:'Tranquilo', ico:'🟢'}, atencao:{cor:'#f5a524', rot:'Atenção', ico:'🟡'}, alerta:{cor:'#ff8a00', rot:'Alerta', ico:'🟠'}, excedeu:{cor:'#e5484d', rot:'Passou do limite', ico:'🔴'}, desenq:{cor:'#7a1c1c', rot:'Desenquadrado', ico:'⛔'}};
  function textoStatus(R, paraCliente){
    var l=moeda(R.limite), t=moeda(R.total), s=R.status;
    if(s==='desenq') return paraCliente
      ? 'Você faturou '+t+', mais de 20% acima do limite do MEI ('+l+'). Pela regra, sua empresa deixa de ser MEI desde '+(R.mesIni>1?NML[R.mesIni-1]:'janeiro')+' e passa a pagar imposto como ME. A APARAT vai orientar você sobre os próximos passos — nos chame.'
      : 'Faturou '+t+': mais de 20% acima do limite ('+moeda(R.limite*TOLER)+'). Desenquadramento RETROATIVO a '+(R.mesIni>1?NML[R.mesIni-1]:'janeiro')+'/'+R.ano+': comunicar no Portal do Simples até o último dia útil do mês seguinte ao excesso, recolher como ME (PGDAS-D) desde o início do ano com juros e fazer a transformação na Junta.';
    if(s==='excedeu') return paraCliente
      ? 'Você já passou do limite anual do MEI ('+l+'), mas ficou dentro da tolerância de 20%. Continua MEI até dezembro; em janeiro sua empresa passa a ser ME e vai pagar um DAS complementar sobre o que passou. Fale com a APARAT para planejar isso.'
      : 'Passou do limite ('+l+'), mas dentro da tolerância de 20% (até '+moeda(R.limite*TOLER)+'). Continua MEI até 31/12/'+R.ano+'; DAS complementar sobre o excesso de '+moeda(R.total-R.limite)+' e desenquadramento a partir de 01/01/'+(parseInt(R.ano,10)+1)+' (comunicar até o último dia útil de janeiro). Se passar de '+moeda(R.limite*TOLER)+', retroage a janeiro.';
    if(s==='alerta') return paraCliente
      ? 'Você já usou '+pct(R.pct)+' do limite do MEI. Ainda pode faturar '+moeda(Math.max(0,R.pode))+' até dezembro'+(R.restantes?(' — cerca de '+moeda(R.ritmo)+' por mês'):'')+'. Se continuar no ritmo atual, deve fechar o ano em '+moeda(R.projecao)+'. Vamos conversar antes de emitir notas grandes.'
      : 'Usou '+pct(R.pct)+' do limite. Pode faturar mais '+moeda(Math.max(0,R.pode))+' no ano'+(R.restantes?(' ('+moeda(R.ritmo)+' por mês até dezembro)'):'')+'; no ritmo atual fecha em '+moeda(R.projecao)+(R.projecao>R.limite?' — ACIMA do limite':'')+'. Hora de planejar: segurar emissão, antecipar a migração para ME ou avaliar o Simples.';
    if(s==='atencao') return paraCliente
      ? 'Você já usou '+pct(R.pct)+' do limite do MEI. Pode faturar mais '+moeda(R.pode)+' até dezembro'+(R.restantes?(' (cerca de '+moeda(R.ritmo)+' por mês)'):'')+'. Está tudo certo, só acompanhe.'
      : 'Usou '+pct(R.pct)+' do limite; pode faturar mais '+moeda(R.pode)+(R.restantes?(' ('+moeda(R.ritmo)+' por mês até dezembro)'):'')+'. Projeção de fechamento: '+moeda(R.projecao)+'. Acompanhar mês a mês.';
    return paraCliente
      ? 'Você usou '+pct(R.pct)+' do limite do MEI e ainda pode faturar '+moeda(R.pode)+' até dezembro. Tudo tranquilo.'
      : 'Usou '+pct(R.pct)+' do limite; pode faturar mais '+moeda(R.pode)+'. Projeção de fechamento: '+moeda(R.projecao)+'.';
  }

  /* ---------------- lançamento automático (só admin) ---------------- */
  var sincronizando=false, feito={};
  async function sincronizar(){
    if(sincronizando || !ehAdmin() || window.__FATMEI_SO_LER__) return; var d=db(); if(!d) return;
    sincronizando=true; var grav=0;
    try{
      var meis=listaMEI();
      for(var i=0;i<meis.length;i++){ var cli=meis[i], notas=porMes(cli), fat=fatDe(cli), yms=Object.keys(notas);
        for(var j=0;j<yms.length;j++){ var ym=yms[j], n=notas[ym], f=fat[ym], ch=chave(cli)+'|'+ym+'|'+Math.round(n.soma*100)+'|'+n.qtd;
          if(feito[ch]) continue; feito[ch]=1; /* uma tentativa por combinação; "Lançar agora" zera e tenta de novo */
          var obs='Pelas notas emitidas no app ('+n.qtd+' nota'+(n.qtd>1?'s':'')+(n.nums.length?(' nº '+n.nums.join(', ')):'')+'), total '+moeda(n.soma)+'. Lançado automaticamente em '+agoraBR()+'.';
          try{
            if(!f){ await d.collection('faturamento').add({cliente:cli, tipo:'MEI', mesRef:ym, faturamento:Math.round(n.soma*100)/100, despesa:0, obs:obs, auto:'notas', notasSoma:Math.round(n.soma*100)/100, notasQtd:n.qtd}); grav++; }
            else if(f.auto==='notas' && Math.abs(num(f.doc.notasSoma)-n.soma)>0.005){ await d.collection('faturamento').doc(String(f.ids[0])).set({faturamento:Math.round(n.soma*100)/100, obs:obs, notasSoma:Math.round(n.soma*100)/100, notasQtd:n.qtd},{merge:true}); grav++; }
          }catch(e2){ console.warn('[fat-mei] não gravou '+cli+' '+ym, e2); aviso('Não consegui lançar o faturamento de '+rotulo(ym)+' ('+cli+'): '+(e2&&e2.message?e2.message:e2),'warn'); }
        } }
      if(grav){ aviso('📈 '+grav+' lançamento'+(grav>1?'s':'')+' de faturamento MEI feito'+(grav>1?'s':'')+' pelas notas emitidas.','success'); try{ if(typeof carregarFaturamento==='function') carregarFaturamento(); }catch(e){} }
    }catch(e){ console.warn('[fat-mei] sincronizar', e); }
    sincronizando=false;
  }
  async function usarNotas(cli, ym){
    var d=db(); if(!d) return; var R=calc(cli, ym.slice(0,4)), dv=R.diverg.filter(function(x){ return x.ym===ym; })[0]; if(!dv) return;
    if(!confirm('Trocar o faturamento de '+rotulo(ym)+' de '+cli+'\nde '+moeda(dv.lancado)+' para '+moeda(dv.notas)+' (total das notas emitidas)?\n\nAs despesas do mês não mudam.')) return;
    try{ await d.collection('faturamento').doc(String(dv.id)).set({faturamento:Math.round(dv.notas*100)/100, auto:'notas', notasSoma:Math.round(dv.notas*100)/100, obs:'Ajustado para o total das notas emitidas ('+moeda(dv.notas)+') em '+agoraBR()+'. Antes: '+moeda(dv.lancado)+'.'},{merge:true}); aviso('Faturamento de '+rotulo(ym)+' atualizado.','success'); try{ if(typeof carregarFaturamento==='function') carregarFaturamento(); }catch(e){} }
    catch(e){ aviso('Não consegui atualizar: '+(e&&e.message?e.message:e),'warn'); }
  }
  async function salvarAbertura(cli, ym){
    var d=db(), c=CLI[chave(cli)]; if(!d||!c||!c.id) return;
    try{ await d.collection('clientes').doc(String(c.id)).set({aberturaMei:ym||''},{merge:true}); c.aberturaMei=ym||''; aviso(ym?('Mês de abertura salvo: '+rotulo(ym)+'. Limite proporcional aplicado no ano de abertura.'):'Mês de abertura removido.','success'); ass=''; novo(); }
    catch(e){ aviso('Não consegui salvar: '+(e&&e.message?e.message:e),'warn'); }
  }

  /* ---------------- desenho ---------------- */
  function barra(p, cor, alt){ var w=Math.min(100,Math.max(0,p)); return '<div class="fm-bar" style="height:'+(alt||10)+'px"><div style="width:'+w.toFixed(1)+'%;background:'+cor+'"></div><i style="left:80%"></i></div>'; }
  function chip(st){ var s=ST[st]; return '<span class="fm-chip" style="background:'+s.cor+'">'+s.ico+' '+s.rot+'</span>'; }
  function waLink(cli, R){
    var c=CLI[chave(cli)]||{}, tel=soDig(c.whatsapp||c.telefone||c.celular||''); if(tel && tel.length<=11) tel='55'+tel;
    var txt='Olá! Aqui é o Daniel, da APARAT Contabilidade. Controle do seu limite MEI em '+R.ano+':\n\n• Faturado até agora: '+moeda(R.total)+'\n• Limite do ano: '+moeda(R.limite)+' ('+pct(R.pct)+' usado)\n• Ainda pode faturar: '+moeda(Math.max(0,R.pode))+(R.restantes?('\n• Ritmo seguro: '+moeda(R.ritmo)+' por mês até dezembro'):'')+'\n\n'+textoStatus(R,true)+'\n\nVocê acompanha isso no app da APARAT, em Controle de Faturamento.';
    return 'https://wa.me/'+(tel||'')+'?text='+encodeURIComponent(txt);
  }
  var S={cli:'', ano:''}, ass='';
  function painel(){
    var pg=el('pp-faturamento'); if(!pg || !pg.classList.contains('active')) return;
    var box=el('fm-box');
    if(!box){ box=document.createElement('div'); box.id='fm-box'; var alvo=el('fg-box')||[].slice.call(pg.querySelectorAll('.sec')).filter(function(s){ return /lan[cç]amentos/i.test(s.textContent||''); })[0]; if(alvo) alvo.parentNode.insertBefore(box, alvo); else pg.appendChild(box); }
    var ano=S.ano||hojeYM().slice(0,4), meis=listaMEI();
    var a=ano+'|'+versao+'|'+S.cli+'|'+claro(); if(a===ass) return; ass=a;
    if(!meis.length){ box.innerHTML='<div class="fm-tit">🛡️ Controle inteligente MEI</div><div class="fm-sub">Nenhum cliente com regime MEI no cadastro.</div>'; return; }
    var Rs=meis.map(function(c){ return calc(c, ano); }).sort(function(x,y){ return y.pct-x.pct; });
    var nPend=0, nDiv=0; Rs.forEach(function(R){ nPend+=R.pend.length; nDiv+=R.diverg.length; });
    var totFat=Rs.reduce(function(s,R){ return s+R.total; },0), nRisco=Rs.filter(function(R){ return R.status!=='ok' && R.status!=='atencao'; }).length;
    var anos=[]; for(var y=parseInt(hojeYM().slice(0,4),10);y>=2024;y--) anos.push(y);
    var h='<div class="fm-top"><div class="fm-tit">🛡️ Controle inteligente MEI <span class="fm-ano">'+ano+'</span></div>'
      +'<select id="fm-ano">'+anos.map(function(y){ return '<option value="'+y+'"'+(String(y)===ano?' selected':'')+'>'+y+'</option>'; }).join('')+'</select></div>'
      +'<div class="fm-sub">Limite de '+moeda(LIM_MEI)+' por ano (proporcional a '+moeda(LIM_MES)+' por mês no ano de abertura). As notas emitidas no app entram sozinhas no faturamento de cada mês; lançamento feito à mão não é alterado.</div>'
      +'<div class="fm-kpis">'+kpi(meis.length+' MEI', 'no cadastro')+kpi(moeda(totFat), 'faturado no ano (todos)')+kpi(String(nRisco), nRisco===1?'cliente em alerta ou acima':'clientes em alerta ou acima', nRisco?'#e5484d':'#20b87a')+kpi(String(nPend+nDiv), 'pendências de lançamento', (nPend+nDiv)?'#f5a524':'#20b87a')+'</div>';
    if(nDiv){ h+='<div class="fm-avisos">'; Rs.forEach(function(R){ R.diverg.forEach(function(dv){ h+='<div class="fm-av">⚠️ <b>'+esc(R.cli)+'</b> — '+rotulo(dv.ym)+': lançado '+moeda(dv.lancado)+', mas as notas emitidas somam '+moeda(dv.notas)+'. <button class="fm-btn" data-usar="'+esc(R.cli)+'|'+dv.ym+'">Usar o total das notas</button></div>'; }); }); h+='</div>'; }
    if(nPend){ h+='<div class="fm-avisos"><div class="fm-av">⏳ '+nPend+' mês'+(nPend>1?'es':'')+' com nota emitida ainda sem lançamento — o lançamento automático está sendo feito. <button class="fm-btn" id="fm-sync">Lançar agora</button></div></div>'; }
    h+='<div class="fm-tabwrap"><table class="fm-tab"><thead><tr><th>Cliente MEI</th><th>Faturado</th><th>Limite</th><th style="min-width:150px">Uso do limite</th><th>Pode faturar</th><th>Ritmo/mês</th><th>Projeção dez.</th><th>Situação</th></tr></thead><tbody>';
    Rs.forEach(function(R){ var s=ST[R.status], sel=chave(S.cli)===chave(R.cli);
      h+='<tr class="fm-lin'+(sel?' sel':'')+'" data-cli="'+esc(R.cli)+'"><td><b>'+esc(nomeCurto(R.cli))+'</b>'+(R.abertura&&R.abertura.slice(0,4)===ano?'<div class="fm-mini">aberto em '+rotulo(R.abertura)+'</div>':'')+(R.qtdNotas?'<div class="fm-mini">'+R.qtdNotas+' nota'+(R.qtdNotas>1?'s':'')+' no app</div>':'')+'</td>'
        +'<td><b>'+moeda(R.total)+'</b></td><td>'+moeda(R.limite)+'</td><td>'+barra(R.pct, s.cor)+'<div class="fm-mini">'+pct(R.pct)+'</div></td>'
        +'<td style="color:'+(R.pode<0?'#e5484d':'inherit')+'">'+(R.pode<0?('passou '+moeda(-R.pode)):moeda(R.pode))+'</td><td>'+(R.restantes?moeda(R.ritmo):'—')+'</td><td'+(R.projecao>R.limite?' style="color:#e5484d;font-weight:700"':'')+'>'+moeda(R.projecao)+'</td><td>'+chip(R.status)+'</td></tr>'; });
    h+='</tbody></table></div><div class="fm-sub">Clique no cliente para ver mês a mês, informar o mês de abertura e avisar pelo WhatsApp. Projeção = faturado + média mensal × meses que faltam.</div>';
    if(S.cli){ var R=Rs.filter(function(x){ return chave(x.cli)===chave(S.cli); })[0]; if(R) h+=detalhe(R); }
    box.innerHTML=h;
    el('fm-ano').onchange=function(){ S.ano=this.value; ass=''; painel(); };
    [].forEach.call(box.querySelectorAll('.fm-lin'),function(tr){ tr.onclick=function(){ S.cli=(chave(S.cli)===chave(tr.getAttribute('data-cli')))?'':tr.getAttribute('data-cli'); ass=''; painel(); }; });
    [].forEach.call(box.querySelectorAll('[data-usar]'),function(b){ b.onclick=function(ev){ ev.stopPropagation(); var p=b.getAttribute('data-usar').split('|'); usarNotas(p[0],p[1]); }; });
    var bs=el('fm-sync'); if(bs) bs.onclick=function(){ feito={}; sincronizar(); };
    var ba=el('fm-ab-salvar'); if(ba) ba.onclick=function(){ salvarAbertura(S.cli, el('fm-ab').value); };
    var bg=el('fm-graf'); if(bg) bg.onclick=function(){ try{ if(window.__FATGRAF__) __FATGRAF__.abrir(S.cli, ano); }catch(e){} };
  }
  function kpi(v, r, cor){ return '<div class="fm-kpi"><div class="v"'+(cor?' style="color:'+cor+'"':'')+'>'+v+'</div><div class="r">'+r+'</div></div>'; }
  function nomeCurto(n){ return String(n||'').replace(/^\d{2}\.\d{3}\.\d{3}\s+/,'').replace(/\s+\d{11}$/,''); }
  function detalhe(R){
    var s=ST[R.status];
    var h='<div class="fm-det" style="border-color:'+s.cor+'"><div class="fm-det-top"><div><div class="fm-tit2">'+esc(R.cli)+'</div><div class="fm-mini">'+(R.abertura?('Abertura: '+rotulo(R.abertura)+' · '):'')+'Limite '+R.ano+': '+moeda(R.limite)+(R.limite!==LIM_MEI?(' (proporcional: '+(12-R.mesIni+1)+' meses × '+moeda(LIM_MES)+')'):'')+'</div></div>'+chip(R.status)+'</div>'
      +'<div class="fm-msg" style="border-left-color:'+s.cor+'">'+esc(textoStatus(R,false))+'</div>'
      +barra(R.pct, s.cor, 14)+'<div class="fm-legs"><span>0</span><span>80% ('+moeda(R.limite*0.8)+')</span><span>'+moeda(R.limite)+'</span></div>'
      +'<div class="fm-kpis">'+kpi(moeda(R.total),'faturado em '+R.ano)+kpi(moeda(R.totNotas), R.qtdNotas+' nota'+(R.qtdNotas!==1?'s':'')+' emitida'+(R.qtdNotas!==1?'s':'')+' no app')+kpi(moeda(R.media),'média por mês'+(R.primeiro>R.mesIni?(' (desde '+NM[R.primeiro-1]+')'):''))+kpi(moeda(R.projecao),'projeção de dezembro', R.projecao>R.limite?'#e5484d':'')+kpi(moeda(Math.max(0,R.pode)),'ainda pode faturar')+kpi(R.restantes?moeda(R.ritmo):'—','ritmo seguro por mês')+'</div>'
      +'<table class="fm-tab fm-meses"><thead><tr><th>Mês</th><th>Notas no app</th><th>Lançado no faturamento</th><th>Despesas</th><th>Fonte</th></tr></thead><tbody>';
    R.meses.forEach(function(m){ if(m.m<R.mesIni) return; var f={'notas':'🧾 automático (notas)','extrato':'🏦 extrato OFX','manual':'✍️ lançado à mão','notas-pendente':'⏳ vai entrar sozinho'}[m.fonte]||'';
      var dv=R.diverg.filter(function(x){ return x.ym===m.ym; })[0];
      h+='<tr'+(m.futuro?' class="fm-fut"':'')+'><td>'+NM[m.m-1]+'</td><td>'+(m.qtd?(moeda(m.notas)+' <span class="fm-mini">('+m.qtd+(m.nums.length?(' · nº '+m.nums.join(', ')):'')+')</span>'):'—')+'</td><td>'+(m.lancado||m.fonte==='manual'||m.fonte==='extrato'?moeda(m.lancado):'—')+(dv?' <span style="color:#e5484d">⚠️ menor que as notas</span>':'')+(m.dup?' <span style="color:#f5a524">(2 lançamentos no mês)</span>':'')+'</td><td>'+(m.desp?moeda(m.desp):'—')+'</td><td class="fm-mini">'+f+(!m.qtd&&!m.lancado&&!m.futuro&&m.m<=R.mesHoje?'sem movimento informado':'')+'</td></tr>'; });
    h+='</tbody></table>'
      +'<div class="fm-acoes"><label>Mês de abertura do MEI <input type="month" id="fm-ab" value="'+esc(R.abertura||'')+'"></label><button class="fm-btn" id="fm-ab-salvar">Salvar</button>'
      +'<a class="fm-btn fm-wa" href="'+waLink(R.cli,R)+'" target="_blank" rel="noopener">📲 Avisar no WhatsApp</a><button class="fm-btn" id="fm-graf">📊 Ver gráfico completo</button></div>'
      +'<div class="fm-mini" style="margin-top:8px">Faturamento do MEI é tudo o que ele vendeu ou prestou no ano, com ou sem nota. Se o cliente vende sem nota (para pessoa física), lance o total do mês à mão ou pelo extrato OFX: este painel usa sempre o maior valor entre as notas e o lançamento.</div></div>';
    return h;
  }

  var assCli='';
  function clienteApp(){
    var alvo=el('cli-fat'); if(!alvo || alvo.offsetParent===null) return;
    var nome=clienteAtual(); if(!nome || !ehMEI(nome)) return;
    var box=el('fm-cli-box'); if(!box){ box=document.createElement('div'); box.id='fm-cli-box'; alvo.parentNode.insertBefore(box, alvo); }
    var ano=hojeYM().slice(0,4), a=versao+'|'+claro()+'|'+ano; if(a===assCli) return; assCli=a;
    var R=calc(nome, ano), s=ST[R.status];
    box.innerHTML='<div class="fm-tit">🛡️ Seu limite MEI em '+ano+'</div>'
      +'<div class="fm-msg" style="border-left-color:'+s.cor+'">'+chip(R.status)+'<div style="margin-top:6px">'+esc(textoStatus(R,true))+'</div></div>'
      +barra(R.pct, s.cor, 16)+'<div class="fm-legs"><span>R$ 0</span><span>80%</span><span>'+moeda(R.limite)+'</span></div>'
      +'<div class="fm-kpis">'+kpi(moeda(R.total),'faturado no ano')+kpi(pct(R.pct),'do limite usado', s.cor)+kpi(moeda(Math.max(0,R.pode)),'ainda pode faturar')+kpi(R.restantes?moeda(R.ritmo):'—','por mês até dezembro')+'</div>'
      +'<div class="fm-mini">'+(R.qtdNotas?(R.qtdNotas+' nota'+(R.qtdNotas>1?'s':'')+' emitida'+(R.qtdNotas>1?'s':'')+' pela APARAT este ano, somando '+moeda(R.totNotas)+'. '):'')+'Vendeu sem nota? Avise o escritório para o controle ficar completo.</div>';
  }

  /* ---------------- estilo e laço ---------------- */
  function css(){
    if(el('fm-css')) return; var s=document.createElement('style'); s.id='fm-css';
    s.textContent='#fm-box,#fm-cli-box{border:1.5px solid rgba(32,184,122,.55);border-radius:16px;padding:14px;margin:14px 0;background:rgba(32,184,122,.06)}'
      +'.fm-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.fm-tit{font-weight:800;font-size:15px}.fm-tit2{font-weight:800;font-size:14px}.fm-ano{opacity:.6;font-weight:600;margin-left:6px}'
      +'#fm-ano{padding:5px 8px;border-radius:8px;border:1px solid rgba(128,128,160,.4);background:transparent;color:inherit}.fm-sub{font-size:11px;opacity:.75;margin:6px 0 10px;line-height:1.45}.fm-mini{font-size:10.5px;opacity:.7;line-height:1.35}'
      +'.fm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}.fm-kpi{background:rgba(128,128,160,.1);border-radius:10px;padding:8px 10px}.fm-kpi .v{font-weight:800;font-size:15px}.fm-kpi .r{font-size:10.5px;opacity:.7;margin-top:2px}'
      +'.fm-bar{position:relative;background:rgba(128,128,160,.22);border-radius:99px;overflow:hidden}.fm-bar>div{height:100%;border-radius:99px;transition:width .4s}.fm-bar>i{position:absolute;top:0;bottom:0;width:2px;background:rgba(0,0,0,.35)}.fm-legs{display:flex;justify-content:space-between;font-size:10px;opacity:.65;margin:3px 0 6px}'
      +'.fm-chip{display:inline-block;color:#fff;font-weight:700;font-size:10.5px;padding:3px 9px;border-radius:99px;white-space:nowrap}'
      +'.fm-tabwrap{overflow:auto}.fm-tab{width:100%;border-collapse:collapse;font-size:12px}.fm-tab th{text-align:left;font-size:10.5px;opacity:.7;padding:6px 8px;border-bottom:1px solid rgba(128,128,160,.3)}.fm-tab td{padding:7px 8px;border-bottom:1px solid rgba(128,128,160,.15);vertical-align:middle}'
      +'.fm-lin{cursor:pointer}.fm-lin:hover td{background:rgba(32,184,122,.08)}.fm-lin.sel td{background:rgba(32,184,122,.14)}.fm-fut td{opacity:.45}'
      +'.fm-avisos{margin:8px 0}.fm-av{background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.5);border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
      +'.fm-btn{border:1px solid rgba(32,184,122,.7);background:rgba(32,184,122,.15);color:inherit;border-radius:8px;padding:5px 10px;font-size:11.5px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}.fm-btn.fm-wa{border-color:#25d366;background:rgba(37,211,102,.18)}'
      +'.fm-det{border:1.5px solid;border-radius:14px;padding:12px;margin-top:12px;background:rgba(128,128,160,.06)}.fm-det-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}'
      +'.fm-msg{border-left:4px solid;padding:8px 10px;border-radius:8px;background:rgba(128,128,160,.1);font-size:12.5px;line-height:1.5;margin:10px 0}.fm-meses{margin-top:6px}'
      +'.fm-acoes{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;font-size:11.5px}.fm-acoes input{margin-left:6px;padding:4px 6px;border-radius:8px;border:1px solid rgba(128,128,160,.4);background:transparent;color:inherit}'
      +'body.ap-esc-claro #fm-box,body.ap-tema-claro #fm-cli-box{background:#f3fbf7}';
    document.head.appendChild(s);
  }
  var tSync=0;
  function tick(){ try{ css(); ligar(); if(ehAdmin()){ painel(); if(Date.now()-tSync>4000){ tSync=Date.now(); sincronizar(); } } else clienteApp(); }catch(e){ console.warn('[fat-mei]', e); } }
  function laco(){ tick(); setTimeout(laco, 2500); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(laco,1500); }); else setTimeout(laco,1500);

  window.__FATMEI__={calc:calc, notasDe:notasDe, num:num, ymDe:ymDe, textoStatus:textoStatus, sincronizar:sincronizar, estado:function(){ return {notas:NOTAS.length, sols:SOLS.length, fat:FAT.length, cli:Object.keys(CLI).length, versao:versao}; }, abrir:function(c,a){ S.cli=c||''; S.ano=a||''; ass=''; painel(); }, tick:tick,
    _set:function(o){ if(o.NOTAS) NOTAS=o.NOTAS; if(o.SOLS) SOLS=o.SOLS; if(o.FAT) FAT=o.FAT; if(o.CLI) CLI=o.CLI; novo(); }};
})();
