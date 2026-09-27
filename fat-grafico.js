/* APARAT - GRAFICO DO FATURAMENTO POR CLIENTE (v1, 26/09/2026)
   Pedido do Daniel: ver o grafico do faturamento de cada cliente separadamente, na aba Controle de
   Faturamento e na Ficha do Cliente. Nao grava nada: so le a colecao 'faturamento' (e 'clientes' para o regime).
   O que mostra:
   1. Aba Faturamento: seletor de cliente e ano. "Todos os clientes" mostra o ranking do ano.
      Com um cliente escolhido: resumo do ano, grafico faturamento x despesa por mes (com o mesmo mes do ano
      anterior), acumulado do ano x limite (MEI 81 mil + tolerancia de 20%; ME 360 mil; EPP 4,8 mi),
      RBT12 (soma dos 12 meses anteriores, usada no PGDAS) com as faixas do Simples, tabela mes a mes
      e botao para baixar a imagem com a logo. A tabela "Lancamentos por Cliente" passa a mostrar so esse cliente.
   2. Ficha do Cliente: mini grafico dos ultimos 12 meses antes da secao Financeiro, com botao para abrir o completo.
   3. App do cliente (#sec-fat): graficos do ano do proprio cliente (faturamento x despesa e acumulado x limite),
      com seletor de ano e imagem com a logo; esconde o grafico antigo de 6 barras. Le so os lancamentos dele.
   Regras usadas (conferidas em 26/09/2026):
   - MEI: limite R$ 81.000/ano (proporcional R$ 6.750 por mes no ano de abertura); excesso de ate 20% (R$ 97.200)
     mantem o MEI ate dezembro com DAS complementar; acima disso o desenquadramento retroage a janeiro.
   - ME ate R$ 360.000; EPP ate R$ 4.800.000 (LC 123/2006, art. 3o).
   - Faixas do Simples (Anexos I a V): 180 mil, 360 mil, 720 mil, 1,8 mi, 3,6 mi, 4,8 mi.
   - RBT12 = receita bruta dos 12 meses anteriores ao periodo de apuracao; com menos de 12 meses de atividade
     o PGDAS usa a media dos meses x 12 (LC 123/2006, art. 18, par. 2o).  */
;(function(){
  if(window.__APARAT_FATGRAF__) return; window.__APARAT_FATGRAF__=1;

  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return true; }catch(e){ return false; } }
  function aviso(m,t){ try{ if(typeof notif==='function') notif(m,t||'info'); }catch(e){} }
  function chave(s){ return String(s||'').trim().toLowerCase(); }
  function num(v){ if(typeof v==='number') return isFinite(v)?v:0; v=String(v==null?'':v).replace(/[^0-9,.-]/g,''); if(v.indexOf(',')>-1) v=v.replace(/\./g,'').replace(',','.'); return parseFloat(v)||0; }
  function moeda(v){ v=Number(v)||0; var s=Math.abs(v).toFixed(2).split('.'); return (v<0?'-':'')+'R$ '+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+s[1]; }
  function curto(v){ var a=Math.abs(v), s;
    if(a>=1000000) s=(v/1000000).toFixed(a>=10000000?0:1).replace('.',',')+' mi';
    else if(a>=1000) s=(v/1000).toFixed(a>=100000?0:1).replace('.',',').replace(/,0$/,'')+' mil';
    else s=String(Math.round(v)); return 'R$ '+s; }
  var NM=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function rotulo(ym){ var p=String(ym||'').split('-'); return (NM[parseInt(p[1],10)-1]||p[1])+'/'+p[0]; }
  function soMes(ym){ return NM[parseInt(String(ym).slice(5,7),10)-1]||''; }
  function somaMes(ym,n){ var a=parseInt(ym.slice(0,4),10), m=parseInt(ym.slice(5,7),10)-1+n; a+=Math.floor(m/12); m=((m%12)+12)%12; return a+'-'+String(m+1).padStart(2,'0'); }
  function hojeYM(){ var p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()); return p.slice(0,7); }
  function claro(){ var c=document.body.classList; return c.contains('ap-esc-claro')||c.contains('ap-tema-claro'); }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }
  var LARG=720; function medir(box){ var w=box&&box.clientWidth?box.clientWidth-26:720; LARG=Math.round(Math.min(900,Math.max(330,w))/10)*10; return LARG; }

  var LIM={MEI:81000, ME:360000, EPP:4800000};
  var FAIXAS=[180000,360000,720000,1800000,3600000,4800000];
  var COR={fat:'#3f6bff', desp:'#ff8a00', ant:'#8a90b8', res:'#20b87a', lim:'#e5484d', alerta:'#f5a524', rbt:'#8b5cf6'};

  /* ---------------- dados ---------------- */
  var REGS=[], CLI={}, versao=0, unsub=null, tCli=0;
  var S={cli:'', ano:''};
  function ligarDados(){
    var d=db(); if(!d) return;
    if(!unsub){ try{ unsub=d.collection('faturamento').onSnapshot(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); REGS=a; versao++; setTimeout(tick,0); }, function(){ unsub=null; }); }catch(e){ unsub=null; } }
    if(Date.now()-tCli>120000){ tCli=Date.now(); d.collection('clientes').get().then(function(s){ var c={}; s.forEach(function(x){ var o=x.data()||{}; if(o.nome) c[chave(o.nome)]=o; }); CLI=c; versao++; setTimeout(tick,0); }).catch(function(){}); }
  }
  function mapaDe(cli){
    var m={}, k=chave(cli), dup=[];
    REGS.forEach(function(r){ if(chave(r.cliente)!==k || !/^\d{4}-\d{2}$/.test(String(r.mesRef||''))) return;
      var x=m[r.mesRef]; if(x){ dup.push(r.mesRef); x.fat+=num(r.faturamento); x.desp+=num(r.despesa); if(r.obs) x.obs=(x.obs?x.obs+' · ':'')+r.obs; }
      else m[r.mesRef]={fat:num(r.faturamento), desp:num(r.despesa), obs:r.obs||'', tipo:r.tipo||''}; });
    m.__dup=dup; return m;
  }
  function tipoDe(cli, m){
    var ks=Object.keys(m).filter(function(k){ return k.charAt(0)!=='_'; }).sort(); var t=ks.length?m[ks[ks.length-1]].tipo:'';
    if(LIM[t]) return t; var c=CLI[chave(cli)]||{}; return /mei/i.test(c.regime||'')?'MEI':'ME';
  }
  function faixa(v){ for(var i=0;i<FAIXAS.length;i++){ if(v<=FAIXAS[i]) return i+1; } return 0; }
  function clientesComDados(){ var s={}; REGS.forEach(function(r){ var n=String(r.cliente||'').trim(); if(n && !s[chave(n)]) s[chave(n)]=n; }); return Object.keys(s).map(function(k){ return s[k]; }).sort(function(a,b){ return a.localeCompare(b,'pt-BR'); }); }
  function anosDe(cli){ var s={}; s[hojeYM().slice(0,4)]=1; REGS.forEach(function(r){ if(!cli || chave(r.cliente)===chave(cli)){ var a=String(r.mesRef||'').slice(0,4); if(/^\d{4}$/.test(a)) s[a]=1; } }); return Object.keys(s).sort().reverse(); }

  function calc(cli, ano){
    var m=mapaDe(cli), tipo=tipoDe(cli,m), hoje=hojeYM();
    var ks=Object.keys(m).filter(function(k){ return k.charAt(0)!=='_'; }).sort();
    var inicio=ks[0]||'', ultimo=ks[ks.length-1]||'';
    var R={cli:cli, ano:ano, tipo:tipo, limite:LIM[tipo], meses:[], fatAno:0, despAno:0, lanc:0, faltam:[], dup:m.__dup, inicio:inicio, ultimo:ultimo, temAnt:false};
    var acum=0;
    for(var i=1;i<=12;i++){
      var ym=ano+'-'+String(i).padStart(2,'0'), x=m[ym], ant=m[(parseInt(ano,10)-1)+'-'+String(i).padStart(2,'0')];
      if(ant) R.temAnt=true;
      if(x){ acum+=x.fat; R.fatAno+=x.fat; R.despAno+=x.desp; R.lanc++; }
      else if(inicio && ym>=inicio && ym<hoje) R.faltam.push(ym);
      var rb=0, nb=0; for(var j=1;j<=12;j++){ var p=m[somaMes(ym,-j)]; if(p){ rb+=p.fat; nb++; } }
      R.meses.push({ym:ym, fat:x?x.fat:null, desp:x?x.desp:null, res:x?(x.fat-x.desp):null, ant:ant?ant.fat:null, obs:x?x.obs:'',
        acum:(ultimo && ym<=ultimo && ym>=inicio)?acum:null, rbt:(nb && ultimo && ym<=somaMes(ultimo,1))?rb:null, rbtN:nb});
    }
    R.res=R.fatAno-R.despAno; R.media=R.lanc?R.fatAno/R.lanc:0; R.pct=R.limite?R.fatAno/R.limite*100:0;
    /* PGDAS do proximo mes a apurar (mes seguinte ao ultimo lancado) */
    var pa=ultimo?somaMes(ultimo,1):''; var rb2=0, nb2=0; if(pa){ for(var j2=1;j2<=12;j2++){ var q=m[somaMes(pa,-j2)]; if(q){ rb2+=q.fat; nb2++; } } }
    R.pa=pa; R.rbt12=rb2; R.rbtN=nb2; R.rbtFaixa=faixa(rb2);
    var anoAnt=0, cA=0, cB=0, cN=0; R.meses.forEach(function(x){ if(x.ant!=null) anoAnt+=x.ant; if(x.ant!=null && x.fat!=null){ cA+=x.fat; cB+=x.ant; cN++; } }); R.fatAnt=anoAnt; R.cmpN=cN; R.cmpVar=(cN && cB)?((cA/cB-1)*100):null;
    return R;
  }

  /* ---------------- desenho (SVG) ---------------- */
  function passo(max){ var bruto=max/4, p=Math.pow(10,Math.floor(Math.log10(bruto||1))), n=bruto/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
  function grafico(o){
    /* o: {labels:[], series:[{nome,cor,vals,tipo:'bar'|'line'}], linhas:[{v,cor,rot,tr}], h, w} */
    var W=o.w||LARG, H=o.h||(W<520?230:250), L=62, Rm=14, T=16, B=28, tx=claro()?'#5b6078':'#9aa0c3', gr=claro()?'#e3e6f0':'#23264a';
    var max=0; o.series.forEach(function(s){ s.vals.forEach(function(v){ if(v!=null && v>max) max=v; }); });
    (o.linhas||[]).forEach(function(l){ if(l.v>max) max=l.v; }); if(max<=0) max=1000;
    var st=passo(max*1.05), top=Math.ceil(max*1.05/st)*st, iw=W-L-Rm, ih=H-T-B, n=o.labels.length, gw=iw/n;
    function y(v){ return T+ih-(v/top)*ih; }
    var h='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;font-family:Arial,Helvetica,sans-serif">';
    for(var v=0; v<=top+0.5; v+=st){ h+='<line x1="'+L+'" x2="'+(W-Rm)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'" stroke="'+gr+'" stroke-width="1"/><text x="'+(L-6)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="'+tx+'">'+esc(curto(v))+'</text>'; }
    o.labels.forEach(function(lb,i){ h+='<text x="'+(L+gw*i+gw/2).toFixed(1)+'" y="'+(H-9)+'" text-anchor="middle" font-size="11" fill="'+tx+'">'+esc(lb)+'</text>'; });
    var barras=o.series.filter(function(s){ return s.tipo==='bar'; }), k=barras.length, bw=Math.min(22,(gw*0.78)/Math.max(1,k));
    barras.forEach(function(s,si){ s.vals.forEach(function(v,i){ if(v==null) return; var x=L+gw*i+gw/2-(bw*k)/2+bw*si, yy=y(Math.max(0,v));
      h+='<rect x="'+x.toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+Math.max(1,(T+ih-yy)).toFixed(1)+'" rx="3" fill="'+s.cor+'"'+(s.op?(' fill-opacity="'+s.op+'"'):'')+'><title>'+esc(s.nome+' · '+o.labels[i]+': '+moeda(v))+'</title></rect>'; }); });
    (o.linhas||[]).forEach(function(l){ var yy=y(l.v).toFixed(1); h+='<line x1="'+L+'" x2="'+(W-Rm)+'" y1="'+yy+'" y2="'+yy+'" stroke="'+l.cor+'" stroke-width="1.6"'+(l.tr?' stroke-dasharray="6 4"':'')+'/><text x="'+(W-Rm-4)+'" y="'+(y(l.v)-5).toFixed(1)+'" text-anchor="end" font-size="11" font-weight="700" fill="'+l.cor+'">'+esc(l.rot)+'</text>'; });
    o.series.filter(function(s){ return s.tipo==='line'; }).forEach(function(s){
      var pts=[], seg=[]; s.vals.forEach(function(v,i){ if(v==null){ if(seg.length) pts.push(seg); seg=[]; return; } seg.push([L+gw*i+gw/2, y(v)]); }); if(seg.length) pts.push(seg);
      pts.forEach(function(sg){ h+='<polyline fill="none" stroke="'+s.cor+'" stroke-width="2.6" stroke-linejoin="round" points="'+sg.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ')+'"/>'; });
      s.vals.forEach(function(v,i){ if(v==null) return; h+='<circle cx="'+(L+gw*i+gw/2).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="4" fill="'+s.cor+'"><title>'+esc(s.nome+' · '+o.labels[i]+': '+moeda(v))+'</title></circle>'; });
    });
    return h+'</svg>';
  }
  function legenda(itens){ return '<div class="fg-leg">'+itens.map(function(i){ return '<span><i style="background:'+i[1]+(i[2]?';height:3px;border-radius:2px':'')+'"></i>'+esc(i[0])+'</span>'; }).join('')+'</div>'; }

  /* ---------------- aba Controle de Faturamento ---------------- */
  function selects(){
    var cs=clientesComDados(); if(S.cli && !cs.some(function(c){ return chave(c)===chave(S.cli); })) cs.push(S.cli);
    var anos=anosDe(S.cli); if(!S.ano || anos.indexOf(S.ano)<0) S.ano=anos[0];
    return '<select id="fg-cli"><option value="">Todos os clientes (ranking do ano)</option>'+cs.map(function(c){ return '<option value="'+esc(c)+'"'+(chave(c)===chave(S.cli)?' selected':'')+'>'+esc(c)+'</option>'; }).join('')+'</select>'
      +'<select id="fg-ano">'+anos.map(function(a){ return '<option'+(a===S.ano?' selected':'')+'>'+a+'</option>'; }).join('')+'</select>';
  }
  function ranking(){
    var ano=S.ano, lin=clientesComDados().map(function(c){ var R=calc(c,ano); return {c:c, v:R.fatAno, d:R.despAno, t:R.tipo, p:R.pct, n:R.lanc}; }).filter(function(x){ return x.n; }).sort(function(a,b){ return b.v-a.v; });
    if(!lin.length) return '<div class="fg-vazio">Nenhum lançamento de faturamento em '+esc(ano)+'.</div>';
    var max=lin[0].v||1;
    return '<div class="fg-t">🏆 Faturamento de '+esc(ano)+' por cliente</div><div class="fg-sub">Clique no nome para ver o gráfico do cliente.</div>'
      +lin.map(function(x){ var cor=x.p>=100?COR.lim:(x.p>=80?COR.alerta:COR.fat);
        return '<div class="fg-rk" data-fg-cli="'+esc(x.c)+'"><div class="fg-rk-n"><b>'+esc(x.c)+'</b><small>'+esc(x.t)+' · '+x.n+' '+(x.n===1?'mês':'meses')+' · '+x.p.toFixed(1).replace('.',',')+'% do limite</small></div>'
          +'<div class="fg-rk-b"><i style="width:'+Math.max(2,x.v/max*100).toFixed(1)+'%;background:'+cor+'"></i></div><div class="fg-rk-v">'+moeda(x.v)+'</div></div>'; }).join('');
  }
  function kpi(t,v,s,cor){ return '<div class="fg-k"><span>'+t+'</span><b'+(cor?(' style="color:'+cor+'"'):'')+'>'+v+'</b>'+(s?('<small>'+s+'</small>'):'')+'</div>'; }
  function painelCliente(){
    var R=calc(S.cli,S.ano), lb=R.meses.map(function(m){ return soMes(m.ym); });
    if(!R.lanc && !R.temAnt) return '<div class="fg-vazio">'+esc(S.cli)+' não tem faturamento lançado em '+esc(S.ano)+'.</div>';
    var corP=R.pct>=100?COR.lim:(R.pct>=80?COR.alerta:COR.res), h='';
    var var_=R.cmpVar;
    h+='<div class="fg-kg">'
      +kpi('Faturado em '+esc(R.ano), moeda(R.fatAno), R.lanc+' '+(R.lanc===1?'mês lançado':'meses lançados'))
      +kpi('Despesas no ano', moeda(R.despAno), '', COR.desp)
      +kpi('Resultado no ano', moeda(R.res), R.fatAno?('margem '+(R.res/R.fatAno*100).toFixed(1).replace('.',',')+'%'):'', R.res>=0?COR.res:COR.lim)
      +kpi('Média por mês', moeda(R.media), var_!=null?((var_>=0?'▲ ':'▼ ')+Math.abs(var_).toFixed(1).replace('.',',')+'% x '+(parseInt(R.ano,10)-1)+' ('+R.cmpN+' '+(R.cmpN===1?'mês':'meses')+' comparáveis)'):'')
      +kpi('Limite '+R.tipo, R.pct.toFixed(1).replace('.',',')+'%', 'de '+moeda(R.limite), corP)
      +(R.tipo!=='MEI' && R.pa ? kpi('RBT12 p/ PGDAS '+rotulo(R.pa), moeda(R.rbt12), (R.rbtFaixa?(R.rbtFaixa+'ª faixa do Simples'):'acima de R$ 4,8 mi')+' · '+R.rbtN+'/12 meses no app', COR.rbt) : '')
      +'</div>';
    var avs=[];
    if(R.faltam.length) avs.push('Sem lançamento em '+R.faltam.map(rotulo).join(', ')+' — o gráfico e os totais ficam menores do que a realidade.');
    if(R.dup.length) avs.push('Há mais de um lançamento em '+R.dup.map(rotulo).join(', ')+' — somei os dois; confira na tabela abaixo.');
    if(R.tipo==='MEI' && R.fatAno>R.limite*1.2) avs.push('Passou de 20% acima do limite do MEI (R$ 97.200): o desenquadramento retroage a janeiro — tratar já.');
    else if(R.tipo==='MEI' && R.fatAno>R.limite) avs.push('Passou do limite do MEI, mas dentro da tolerância de 20%: continua MEI até dezembro, com DAS complementar sobre o excesso, e vai para o Simples em janeiro.');
    else if(R.pct>=80) avs.push('Já usou '+R.pct.toFixed(0)+'% do limite anual de '+R.tipo+'.');
    if(avs.length) h+='<div class="fg-av">⚠️ '+avs.map(esc).join('<br>⚠️ ')+'</div>';

    h+='<div class="fg-card"><div class="fg-t">📊 Faturamento x despesa por mês — '+esc(R.ano)+'</div>'
      +legenda([['Faturamento',COR.fat],['Despesa',COR.desp]].concat(R.temAnt?[['Faturamento '+(parseInt(R.ano,10)-1),COR.ant]]:[]))
      +grafico({labels:lb, series:[{nome:'Faturamento',cor:COR.fat,tipo:'bar',vals:R.meses.map(function(m){ return m.fat; })},{nome:'Despesa',cor:COR.desp,tipo:'bar',vals:R.meses.map(function(m){ return m.desp; })}]
        .concat(R.temAnt?[{nome:'Faturamento '+(parseInt(R.ano,10)-1),cor:COR.ant,tipo:'bar',op:0.75,vals:R.meses.map(function(m){ return m.ant; })}]:[])})
      +(R.temAnt?'':'<div class="fg-sub">Sem lançamentos de '+(parseInt(R.ano,10)-1)+' no app para comparar. Lance os meses do ano passado e a barra cinza aparece ao lado.</div>')+'</div>';

    var lin=[{v:R.limite,cor:COR.lim,rot:'Limite '+R.tipo+' '+curto(R.limite)},{v:R.limite*0.8,cor:COR.alerta,rot:'80% '+curto(R.limite*0.8),tr:1}];
    if(R.tipo==='MEI') lin.push({v:R.limite*1.2,cor:'#b42318',rot:'+20% '+curto(R.limite*1.2),tr:1});
    h+='<div class="fg-card"><div class="fg-t">📈 Acumulado no ano x limite '+esc(R.tipo)+'</div>'
      +legenda([['Acumulado',COR.fat,1],['Limite',COR.lim,1],['80% do limite',COR.alerta,1]].concat(R.tipo==='MEI'?[['Tolerância de 20%','#b42318',1]]:[]))
      +grafico({labels:lb, series:[{nome:'Acumulado',cor:COR.fat,tipo:'line',vals:R.meses.map(function(m){ return m.acum; })}], linhas:lin})
      +'<div class="fg-sub">'+(R.tipo==='MEI'?'MEI: limite de R$ 81.000 no ano (no ano de abertura, R$ 6.750 por mês de atividade). Até 20% acima, continua MEI até dezembro; acima disso, o desenquadramento retroage a janeiro.'
        :(R.tipo==='ME'?'ME: até R$ 360.000 no ano. Passando disso, a empresa vira EPP no ano seguinte (continua no Simples até R$ 4,8 mi).':'EPP: limite do Simples de R$ 4.800.000 no ano; ICMS e ISS saem do DAS acima de R$ 3,6 mi.'))+'</div></div>';

    if(R.tipo!=='MEI'){
      var vals=R.meses.map(function(m){ return m.rbt; }), mx=Math.max.apply(null,vals.map(function(v){ return v||0; }).concat([0]));
      var fl=[]; for(var i=0;i<FAIXAS.length;i++){ fl.push({v:FAIXAS[i],cor:COR.rbt,rot:'Fim da '+(i+1)+'ª faixa '+curto(FAIXAS[i]),tr:1}); if(FAIXAS[i]>=mx) break; }
      h+='<div class="fg-card"><div class="fg-t">🧮 RBT12 — receita dos 12 meses anteriores (base do PGDAS)</div>'
        +legenda([['RBT12 de cada mês',COR.rbt,1]])
        +grafico({labels:lb, series:[{nome:'RBT12',cor:COR.rbt,tipo:'line',vals:vals}], linhas:fl})
        +'<div class="fg-sub">Cada ponto é a soma dos 12 meses anteriores àquele mês, só com o que está lançado no app'+(R.pa?(' — para o PGDAS de '+rotulo(R.pa)+' o app tem '+R.rbtN+' dos 12 meses')+'.':'.')
        +' Se a empresa tem menos de 12 meses de atividade, o PGDAS usa a média dos meses × 12 (LC 123, art. 18, § 2º). Confira sempre com o PGDAS.</div></div>';
    }

    h+='<div class="fg-card"><div class="fg-t">🗓️ Mês a mês — '+esc(R.ano)+'</div><div class="fg-tw"><table class="fg-tab"><thead><tr><th>Mês</th><th>Faturamento</th><th>Despesa</th><th>Resultado</th><th>Acumulado</th>'+(R.temAnt?'<th>'+(parseInt(R.ano,10)-1)+'</th><th>Variação</th>':'')+'</tr></thead><tbody>'
      +R.meses.filter(function(m){ return m.fat!=null || m.ant!=null; }).map(function(m){
        var vv=(m.fat!=null && m.ant)?((m.fat/m.ant-1)*100):null;
        return '<tr><td>'+rotulo(m.ym)+(m.obs?(' <span title="'+esc(m.obs)+'">📝</span>'):'')+'</td><td>'+(m.fat!=null?moeda(m.fat):'—')+'</td><td>'+(m.desp!=null?moeda(m.desp):'—')+'</td><td style="color:'+((m.res||0)>=0?COR.res:COR.lim)+'">'+(m.res!=null?moeda(m.res):'—')+'</td><td>'+(m.acum!=null&&m.fat!=null?moeda(m.acum):'—')+'</td>'
          +(R.temAnt?('<td>'+(m.ant!=null?moeda(m.ant):'—')+'</td><td>'+(vv!=null?((vv>=0?'▲ ':'▼ ')+Math.abs(vv).toFixed(1).replace('.',',')+'%'):'—')+'</td>'):'')+'</tr>'; }).join('')
      +'<tr class="tot"><td>Total</td><td>'+moeda(R.fatAno)+'</td><td>'+moeda(R.despAno)+'</td><td>'+moeda(R.res)+'</td><td></td>'+(R.temAnt?('<td>'+moeda(R.fatAnt)+'</td><td></td>'):'')+'</tr></tbody></table></div></div>';
    return h;
  }
  function aba(){
    var pg=el('pp-faturamento'); if(!pg || !pg.classList.contains('active')) return;
    var box=el('fg-box');
    if(!box){ box=document.createElement('div'); box.id='fg-box'; var sec=[].slice.call(pg.querySelectorAll('.sec')).filter(function(s){ return /lan[cç]amentos/i.test(s.textContent||''); })[0];
      if(sec) pg.insertBefore(box, sec); else pg.appendChild(box); }
    var ass=versao+'|'+S.cli+'|'+S.ano+'|'+(claro()?1:0)+'|'+medir(box);
    if(box.getAttribute('data-a')!==ass){
      box.setAttribute('data-a',ass);
      box.innerHTML='<div class="fg-top"><div class="fg-tit"><img src="icone-aparat.png" alt="APARAT" width="30" height="30"><div><b>Gráfico do faturamento por cliente</b><small>Escolha o cliente para ver só os números dele.</small></div></div>'
        +'<div class="fg-sel">'+selects()+(S.cli?'<button class="fg-b" id="fg-img">🖼️ Baixar imagem</button>':'')+'</div></div>'
        +'<div id="fg-corpo">'+(S.cli?painelCliente():ranking())+'</div>';
      el('fg-cli').onchange=function(){ S.cli=this.value; S.ano=''; box.removeAttribute('data-a'); aba(); var f=el('fat-cli'); if(S.cli && f && !f.value){ try{ f.value=S.cli; }catch(e){} } };
      el('fg-ano').onchange=function(){ S.ano=this.value; box.removeAttribute('data-a'); aba(); };
      [].forEach.call(box.querySelectorAll('[data-fg-cli]'),function(r){ r.onclick=function(){ S.cli=r.getAttribute('data-fg-cli'); S.ano=''; box.removeAttribute('data-a'); aba(); box.scrollIntoView({behavior:'smooth',block:'start'}); }; });
      var bi=el('fg-img'); if(bi) bi.onclick=function(){ baixarImagem(el('fg-corpo'), S.cli, S.ano); };
    }
    filtrarTabela();
  }
  function filtrarTabela(){
    var tb=el('fat-tbody'); if(!tb) return; var k=chave(S.cli), vis=0, tot=0;
    [].forEach.call(tb.querySelectorAll('tr'),function(tr){ var td=tr.querySelector('td'); if(!td || tr.querySelectorAll('td').length<4) return; tot++;
      var ok=!k || chave(td.textContent)===k; tr.style.display=ok?'':'none'; if(ok) vis++; });
    var n=el('fg-filtro'), tbox=tb.closest('.tbox');
    if(!k){ if(n) n.remove(); return; }
    if(!n && tbox){ n=document.createElement('div'); n.id='fg-filtro'; tbox.parentNode.insertBefore(n,tbox); }
    if(n){ var t='Mostrando só '+S.cli+' ('+vis+' de '+tot+' lançamentos). '; if(n.getAttribute('data-t')!==t){ n.setAttribute('data-t',t); n.innerHTML=esc(t)+'<a href="#" id="fg-todos">Ver todos</a>'; el('fg-todos').onclick=function(ev){ ev.preventDefault(); S.cli=''; var b=el('fg-box'); if(b) b.removeAttribute('data-a'); aba(); }; } }
  }

  /* imagem com a logo (PNG) */
  function svgParaImg(svg){ return new Promise(function(res){ var vb=(svg.match(/viewBox="0 0 (\d+) (\d+)"/)||[0,720,250]), w=1080, h=Math.round(1080*vb[2]/vb[1]);
    var s=svg.replace('width="100%"','width="'+w+'" height="'+h+'"'); var i=new Image(); i.onload=function(){ res({i:i,h:h}); }; i.onerror=function(){ res(null); }; i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s); }); }
  async function baixarImagem(root, cli, ano){
    try{
      var R=calc(cli,ano), cards=[].slice.call((root||document).querySelectorAll('.fg-card')).filter(function(c){ return c.querySelector('svg'); });
      var ims=[]; for(var k=0;k<cards.length;k++){ ims.push(await svgParaImg(cards[k].querySelector('svg').outerHTML)); }
      var W=1200, top=190, H=top+60; ims.forEach(function(m){ H+=(m?m.h:0)+70; });
      var c=document.createElement('canvas'); c.width=W; c.height=H; var x=c.getContext('2d'), lc=claro();
      x.fillStyle=lc?'#ffffff':'#0a0a18'; x.fillRect(0,0,W,H); x.fillStyle='#3333ff'; x.fillRect(0,0,W,96);
      var lg=await new Promise(function(r){ var i=new Image(); i.onload=function(){ r(i); }; i.onerror=function(){ r(null); }; i.src='icone-aparat.png'; });
      if(lg) x.drawImage(lg,24,14,68,68);
      x.fillStyle='#fff'; x.font='bold 30px Arial'; x.fillText('APARAT Contabilidade',108,48); x.font='17px Arial'; x.fillText('Controle de Faturamento · Daniel de Andrade Silva · (16) 98869-9203',108,76);
      x.fillStyle=lc?'#11142b':'#ffffff'; x.font='bold 24px Arial'; x.fillText(cli+' — '+ano,40,138);
      x.fillStyle=lc?'#5b6078':'#9aa0c3'; x.font='17px Arial'; x.fillText('Faturado: '+moeda(R.fatAno)+'   ·   Despesas: '+moeda(R.despAno)+'   ·   Resultado: '+moeda(R.res)+'   ·   '+R.pct.toFixed(1).replace('.',',')+'% do limite '+R.tipo,40,170);
      var y0=top; for(var i=0;i<cards.length;i++){ x.fillStyle=lc?'#11142b':'#ffffff'; x.font='bold 20px Arial'; x.fillText((cards[i].querySelector('.fg-t')||{}).textContent||'',40,y0+34);
        if(ims[i]){ x.drawImage(ims[i].i,60,y0+50,1080,ims[i].h); y0+=ims[i].h+70; } }
      x.fillStyle=lc?'#5b6078':'#9aa0c3'; x.font='14px Arial'; x.fillText('Gerado pelo app APARAT em '+new Date().toLocaleDateString('pt-BR')+' · valores lançados no Controle de Faturamento',40,H-24);
      var a=document.createElement('a'); a.download='faturamento-'+String(cli).replace(/[^a-z0-9]+/gi,'_')+'-'+ano+'.png'; a.href=c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
      aviso('🖼️ Imagem do gráfico gerada.','success');
    }catch(e){ aviso('Não consegui gerar a imagem: '+(e&&e.message?e.message:e),'warn'); }
  }

  /* ---------------- Ficha do Cliente ---------------- */
  function ficha(){
    var pg=el('pp-fichas'); if(!pg || !pg.classList.contains('active')) return;
    var st=null; try{ st=window.__FICHA__ && __FICHA__.estado ? __FICHA__.estado() : null; }catch(e){}
    var cli=st&&st.sel, corpo=el('fc-corpo'); if(!cli || !corpo) return;
    var ass=versao+'|'+cli+'|'+(claro()?1:0)+'|'+medir(corpo), box=el('fg-ficha');
    if(box && corpo.contains(box) && box.getAttribute('data-a')===ass) return;
    if(box) box.remove();
    var fin=[].slice.call(corpo.querySelectorAll('.fc-sec')).filter(function(s){ return /financeiro/i.test(s.textContent||''); })[0];
    var hoje=hojeYM(), m=mapaDe(cli), ks=Object.keys(m).filter(function(k){ return k.charAt(0)!=='_'; }).sort();
    box=document.createElement('div'); box.id='fg-ficha'; box.setAttribute('data-a',ass);
    var h='<div class="fc-sec">📈 Faturamento</div>';
    if(!ks.length){ h+='<div class="fg-mini fg-sub">Nenhum faturamento lançado para este cliente. Lance em Controle de Faturamento (ou pelo extrato OFX).</div>'; }
    else{
      var fim=ks[ks.length-1]>hoje?ks[ks.length-1]:somaMes(hoje,-1), ms=[]; for(var i=11;i>=0;i--) ms.push(somaMes(fim,-i));
      var R=calc(cli, fim.slice(0,4)), corP=R.pct>=100?COR.lim:(R.pct>=80?COR.alerta:COR.res);
      h+='<div class="fg-mini">'+legenda([['Faturamento',COR.fat],['Despesa',COR.desp]])
        +grafico({h:190,labels:ms.map(function(y){ return soMes(y)+(y.slice(5)==='01'&&LARG>=520?('/'+y.slice(2,4)):''); }), series:[{nome:'Faturamento',cor:COR.fat,tipo:'bar',vals:ms.map(function(y){ return m[y]?m[y].fat:null; })},{nome:'Despesa',cor:COR.desp,tipo:'bar',vals:ms.map(function(y){ return m[y]?m[y].desp:null; })}]})
        +'<div class="fg-sub">'+esc(R.ano)+': <b>'+moeda(R.fatAno)+'</b> faturado · <b style="color:'+corP+'">'+R.pct.toFixed(1).replace('.',',')+'%</b> do limite '+esc(R.tipo)
        +(R.tipo!=='MEI'&&R.pa?(' · RBT12 p/ '+rotulo(R.pa)+': <b>'+moeda(R.rbt12)+'</b> ('+R.rbtN+'/12 meses no app)'):'')
        +(R.faltam.length?(' · <span style="color:'+COR.alerta+'">'+R.faltam.length+' '+(R.faltam.length===1?'mês':'meses')+' sem lançamento</span>'):'')+'</div>'
        +'<button class="fg-b az" id="fg-abrir">📊 Ver gráfico completo</button></div>';
    }
    box.innerHTML=h;
    if(fin) fin.parentNode.insertBefore(box, fin); else corpo.appendChild(box);
    var b=el('fg-abrir'); if(b) b.onclick=function(){ S.cli=cli; S.ano=''; var nv=[].slice.call(document.querySelectorAll('.nav-item')).filter(function(n){ return /'faturamento'/.test(n.getAttribute('onclick')||''); })[0];
      try{ if(typeof navAba==='function') navAba('faturamento', nv); else if(nv) nv.click(); }catch(e){ if(nv) nv.click(); }
      setTimeout(function(){ var bx=el('fg-box'); if(bx){ bx.removeAttribute('data-a'); aba(); bx.scrollIntoView({behavior:'smooth',block:'start'}); } },350); };
  }

  /* ---------------- App do cliente (aba Faturamento) ---------------- */
  var CR={nome:'', t:0}, SC={ano:''};
  function carregarCli(){
    var d=db(), nome=clienteAtual(); if(!d || !nome) return;
    if(CR.nome===nome && Date.now()-CR.t<60000) return; CR.nome=nome; CR.t=Date.now();
    d.collection('faturamento').where('cliente','==',nome).get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); REGS=a; versao++; setTimeout(tick,0); }).catch(function(){});
  }
  function clienteApp(){
    var alvo=el('cli-fat'); if(!alvo || alvo.offsetParent===null) return;
    var nome=clienteAtual(); if(!nome) return;
    /* o grafico antigo de 6 barras fica escondido: o novo mostra o ano inteiro */
    [].forEach.call(alvo.querySelectorAll('.lcard'),function(c){ if(/Faturamento por m[eê]s/i.test(c.textContent||'') && c.style.display!=='none') c.style.display='none'; });
    var box=el('fg-cli-box'); if(!box){ box=document.createElement('div'); box.id='fg-cli-box'; alvo.parentNode.insertBefore(box, alvo.nextSibling); }
    var anos=anosDe(nome); if(!SC.ano || anos.indexOf(SC.ano)<0) SC.ano=anos[0];
    var ass=versao+'|'+nome+'|'+SC.ano+'|'+(claro()?1:0)+'|'+medir(box);
    if(box.getAttribute('data-a')===ass) return; box.setAttribute('data-a',ass);
    var R=calc(nome, SC.ano), lb=R.meses.map(function(m){ return soMes(m.ym); });
    if(!REGS.length){ box.innerHTML=''; return; }
    var corP=R.pct>=100?COR.lim:(R.pct>=80?COR.alerta:COR.res);
    var h='<div class="fg-top"><div class="fg-tit"><img src="icone-aparat.png" alt="APARAT" width="28" height="28"><div><b>Gráficos do seu faturamento</b><small>Números lançados pela APARAT Contabilidade.</small></div></div>'
      +'<div class="fg-sel"><select id="fg-c-ano">'+anos.map(function(a){ return '<option'+(a===SC.ano?' selected':'')+'>'+a+'</option>'; }).join('')+'</select><button class="fg-b" id="fg-c-img">🖼️ Baixar imagem</button></div></div>';
    if(!R.lanc){ h+='<div class="fg-vazio">Ainda não há faturamento lançado em '+esc(SC.ano)+'.</div>'; }
    else{
      h+='<div class="fg-kg">'+kpi('Faturado em '+esc(R.ano), moeda(R.fatAno), R.lanc+' '+(R.lanc===1?'mês':'meses'))+kpi('Despesas', moeda(R.despAno), '', COR.desp)
        +kpi('Resultado', moeda(R.res), '', R.res>=0?COR.res:COR.lim)+kpi('Limite '+R.tipo, R.pct.toFixed(1).replace('.',',')+'%', 'de '+moeda(R.limite), corP)+'</div>';
      if(R.faltam.length) h+='<div class="fg-sub" style="margin:0 0 8px">🕒 O escritório ainda vai lançar: '+R.faltam.map(rotulo).join(', ')+'.</div>';
      h+='<div class="fg-card"><div class="fg-t">📊 Quanto entrou e quanto saiu por mês</div>'
        +legenda([['Faturamento',COR.fat],['Despesa',COR.desp]].concat(R.temAnt?[[String(parseInt(R.ano,10)-1),COR.ant]]:[]))
        +grafico({labels:lb, series:[{nome:'Faturamento',cor:COR.fat,tipo:'bar',vals:R.meses.map(function(m){ return m.fat; })},{nome:'Despesa',cor:COR.desp,tipo:'bar',vals:R.meses.map(function(m){ return m.desp; })}]
          .concat(R.temAnt?[{nome:'Faturamento '+(parseInt(R.ano,10)-1),cor:COR.ant,tipo:'bar',op:0.75,vals:R.meses.map(function(m){ return m.ant; })}]:[])})
        +(R.cmpVar!=null?('<div class="fg-sub">Comparado com os mesmos meses de '+(parseInt(R.ano,10)-1)+': '+(R.cmpVar>=0?'▲ ':'▼ ')+Math.abs(R.cmpVar).toFixed(1).replace('.',',')+'%.</div>'):'')+'</div>';
      var lin=[{v:R.limite,cor:COR.lim,rot:'Limite '+curto(R.limite)},{v:R.limite*0.8,cor:COR.alerta,rot:'80% '+curto(R.limite*0.8),tr:1}];
      if(R.tipo==='MEI') lin.push({v:R.limite*1.2,cor:'#b42318',rot:'+20% '+curto(R.limite*1.2),tr:1});
      h+='<div class="fg-card"><div class="fg-t">📈 Quanto você já faturou no ano x limite '+esc(R.tipo)+'</div>'
        +grafico({labels:lb, series:[{nome:'Acumulado',cor:COR.fat,tipo:'line',vals:R.meses.map(function(m){ return m.acum; })}], linhas:lin})
        +'<div class="fg-sub">'+(R.pct>=100?'🔴 Você passou do limite do ano. Fale com a APARAT para acertar o enquadramento.':(R.pct>=80?'⚠️ Você já usou '+R.pct.toFixed(0)+'% do limite do ano. Fale com a APARAT antes de emitir notas grandes.':'✅ Dentro do limite do ano.'))+'</div></div>';
    }
    box.innerHTML=h;
    el('fg-c-ano').onchange=function(){ SC.ano=this.value; box.removeAttribute('data-a'); clienteApp(); };
    el('fg-c-img').onclick=function(){ baixarImagem(box, nome, SC.ano); };
  }

  function css(){
    if(el('ap-fg-css')) return; var s=document.createElement('style'); s.id='ap-fg-css';
    s.textContent='#fg-box{border:1.5px solid rgba(51,85,255,.55);border-radius:16px;padding:14px;margin:14px 0;background:rgba(51,85,255,.05)}'
      +'.fg-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px}'
      +'.fg-tit{display:flex;gap:10px;align-items:center}.fg-tit img{border-radius:8px}.fg-tit b{display:block;font-size:14.5px}.fg-tit small{color:var(--cinza);font-size:11.5px}'
      +'.fg-sel{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.fg-sel select{font:inherit;font-size:12.5px;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:inherit;max-width:100%}'
      +'#fg-cli{min-width:220px}.fg-b{font:inherit;font-size:12px;font-weight:700;padding:7px 11px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer}.fg-b.az{background:var(--azul,#3355ff);border-color:var(--azul,#3355ff);color:#fff;margin-top:8px}'
      +'.fg-kg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:10px}'
      +'.fg-k{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:9px 11px}.fg-k span{display:block;font-size:10.5px;color:var(--cinza);text-transform:uppercase;letter-spacing:.4px;font-weight:700}.fg-k b{display:block;font-size:16.5px;font-weight:800;margin-top:2px}.fg-k small{display:block;font-size:11px;color:var(--cinza);margin-top:2px}'
      +'.fg-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px;margin-bottom:10px}.fg-t{font-weight:800;font-size:13.5px;margin-bottom:4px}'
      +'.fg-sub{font-size:11.5px;color:var(--cinza);line-height:1.5;margin-top:6px}.fg-vazio{padding:14px;text-align:center;color:var(--cinza);font-size:12.5px}'
      +'.fg-leg{display:flex;flex-wrap:wrap;gap:12px;font-size:11.5px;color:var(--cinza);margin:2px 0 6px}.fg-leg span{display:inline-flex;align-items:center;gap:5px}.fg-leg i{display:inline-block;width:12px;height:12px;border-radius:3px}'
      +'.fg-av{border:1.5px solid #f5a524;background:rgba(245,165,36,.1);border-radius:12px;padding:9px 11px;font-size:12px;line-height:1.55;margin-bottom:10px}'
      +'.fg-tw{overflow-x:auto}.fg-tab{width:100%;border-collapse:collapse;font-size:12px}.fg-tab th,.fg-tab td{padding:6px 8px;border-bottom:1px solid var(--border);text-align:right;white-space:nowrap}.fg-tab th:first-child,.fg-tab td:first-child{text-align:left}.fg-tab th{color:var(--cinza);font-size:10.5px;text-transform:uppercase}.fg-tab tr.tot td{font-weight:800}'
      +'.fg-rk{display:grid;grid-template-columns:minmax(150px,1.3fr) 2fr auto;gap:10px;align-items:center;padding:8px 6px;border-bottom:1px solid var(--border);cursor:pointer}.fg-rk:hover{background:rgba(51,85,255,.08)}'
      +'.fg-rk-n b{display:block;font-size:12.5px}.fg-rk-n small{font-size:11px;color:var(--cinza)}.fg-rk-b{height:12px;background:rgba(127,127,160,.15);border-radius:8px;overflow:hidden}.fg-rk-b i{display:block;height:100%;border-radius:8px}.fg-rk-v{font-weight:800;font-size:12.5px}'
      +'#fg-filtro{font-size:12px;margin:0 0 8px;padding:7px 11px;border-radius:10px;background:rgba(51,85,255,.1);border:1px solid rgba(51,85,255,.4)}#fg-filtro a{color:var(--azul-light,#7fa0ff);font-weight:700;margin-left:4px}'
      +'.fg-mini{background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:10px 12px;margin-bottom:6px}'
      +'#fg-cli-box{margin-top:10px}#fg-cli-box .fg-k b{font-size:14.5px}#fg-cli-box .fg-kg{grid-template-columns:repeat(2,1fr)}#fg-cli-box .fg-tit b{font-size:13.5px}'
      +'@media(max-width:560px){.fg-rk{grid-template-columns:1fr auto}.fg-rk-b{grid-column:1/-1;order:3}#fg-cli{min-width:0;flex:1}}';
    document.head.appendChild(s);
  }

  var ocupado=false;
  function tick(){
    if(ocupado) return; ocupado=true;
    try{ if(ehAdmin()){ var p=el('view-painel'); if(p && p.classList.contains('active')){ css(); ligarDados(); aba(); ficha(); } }
      else if(clienteAtual()){ css(); carregarCli(); clienteApp(); } }catch(e){}
    ocupado=false;
  }
  [1500,4000].forEach(function(t){ setTimeout(tick,t); }); setInterval(tick,1500);
  window.__FATGRAF__={calc:calc, estado:function(){ return {S:S, regs:REGS.length, versao:versao}; }, abrir:function(c,a){ S.cli=c||''; S.ano=a||''; var b=el('fg-box'); if(b) b.removeAttribute('data-a'); aba(); }, tick:tick};
})();
