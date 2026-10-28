/* APARAT - CONTROLE MEI v2 (mei-controle.js v1, 28/10/2026)
   O QUE FAZ
   - Painel: item de menu "Controle MEI" (#ap-nav-meictl, logo depois de Faturamento) e pagina #pp-meictl.
     Lista os clientes com regime MEI: limite do ano (proporcional no ano de abertura), uso, situacao,
     DAS-MEI do mes, grade dos 12 DAS do ano, DASN-SIMEI, historico/troca de CNPJ, valor do DAS pela
     atividade, lembrete pronto no WhatsApp. Bolinha vermelha no menu = DAS-MEI vencido sem baixa.
   - App do cliente MEI (#sec-fat): cartao "Seu DAS-MEI" (valor, vencimento, situacao) + grade de
     pagamentos do ano + aviso da DASN-SIMEI. O cartao "Seu limite MEI" do fat-mei.js continua igual.
   DE ONDE LE
   - clientes (nome, cnpj, regime, whatsapp, status, aberturaMei, meiAtividade, meiDas, meiDasn, cnpjHistorico)
   - obrigacoes (guias: cliente, tipo, competencia, vencimento, status) - so dos clientes MEI (where in)
   - faturamento (via window.__FATMEI__.calc quando existe; senao soma faturamento/mesRef)
   O QUE GRAVA (so admin, sempre update no proprio documento do cliente, nada e apagado)
   - clientes/<id>.meiDas['AAAA-MM'] = {pago:true, em, por}  (baixa manual; null = desfeito)
   - clientes/<id>.meiAtividade, .meiDasn['AAAA'], .aberturaMei
   - troca de CNPJ: clientes/<id>.cnpj novo + .aberturaMei + .cnpjHistorico[] com o antigo
     (o NOME do cliente nao muda: ele e a chave que liga guias, extratos, notas e login)
   REGRAS (conferidas em 27/10/2026)
   - limite R$ 81.000/ano; no ano de abertura R$ 6.750 x meses desde a abertura; tolerancia 20%
   - DAS-MEI 2026 = INSS R$ 81,05 (5% de R$ 1.621) + ICMS R$ 1 e/ou ISS R$ 5
   - vencimento dia 20 do mes seguinte; sabado, domingo ou feriado nacional -> proximo dia util
   - DASN-SIMEI ate 31/05 do ano seguinte
*/
(function(){
  if(window.__APARAT_MEI2__) return;
  window.__APARAT_MEI2__ = true;
  var VER='1';
  var LIM_MEI=81000, LIM_MES=6750, TOLER=1.2;
  var DAS_ANO={'2026':{inss:81.05}}; /* atualizar todo janeiro com o novo salario minimo */
  var FERIADOS={'2026-01-01':1,'2026-02-16':1,'2026-02-17':1,'2026-04-03':1,'2026-04-21':1,'2026-05-01':1,'2026-06-04':1,'2026-09-07':1,'2026-10-12':1,'2026-11-02':1,'2026-11-15':1,'2026-11-20':1,'2026-12-25':1,
    '2027-01-01':1,'2027-02-08':1,'2027-02-09':1,'2027-03-26':1,'2027-04-21':1,'2027-05-01':1,'2027-05-27':1,'2027-09-07':1,'2027-10-12':1,'2027-11-02':1,'2027-11-15':1,'2027-11-20':1,'2027-12-25':1};
  var INICIO='2026-09'; /* competencias anteriores sem baixa ficam 'sem registro' (cinza), sem alerta */
  var NM=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var ATIV={comercio:'Comércio/indústria (ICMS)', servico:'Serviço (ISS)', ambos:'Comércio e serviço (ICMS + ISS)'};

  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return true; }catch(e){ return false; } }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }
  function aviso(m,t){ try{ if(typeof notif==='function') notif(m,t||'info'); }catch(e){} }
  function chave(s){ return String(s||'').trim().toLowerCase(); }
  function soDig(s){ return String(s||'').replace(/\D/g,''); }
  function num(v){
    if(typeof v==='number') return isFinite(v)?v:0;
    v=String(v==null?'':v).replace(/[^0-9,.-]/g,''); if(!v) return 0;
    if(v.indexOf(',')>-1) return parseFloat(v.replace(/\./g,'').replace(',','.'))||0;
    var i=v.lastIndexOf('.'); if(i>-1 && /^\d{3}$/.test(v.slice(i+1))) return parseFloat(v.replace(/\./g,''))||0;
    return parseFloat(v)||0;
  }
  function moeda(v){ v=Number(v)||0; var s=Math.abs(v).toFixed(2).split('.'); return (v<0?'-':'')+'R$ '+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+s[1]; }
  function pctTxt(v){ return (Math.round(v*10)/10).toFixed(1).replace('.',',')+'%'; }
  function hoje(){ try{ var s=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); return new Date(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10)); }catch(e){ var d=new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); } }
  function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function br(d){ return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
  function rot(ym){ return NM[+ym.slice(5,7)-1]+'/'+ym.slice(0,4); }
  function ymDe(v){
    if(!v) return '';
    if(typeof v==='object' && v.seconds){ var d=new Date(v.seconds*1000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
    var s=String(v).trim(), m;
    if((m=s.match(/^(\d{4})-(\d{2})/))) return m[1]+'-'+m[2];
    if((m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return m[3]+'-'+m[2];
    if((m=s.match(/^(\d{1,2})\/(\d{4})$/))) return m[2]+'-'+String(m[1]).padStart(2,'0');
    return '';
  }
  function nomeCurto(n){ return String(n||'').replace(/^\d{2}\.\d{3}\.\d{3}\s+/,'').replace(/\s+\d{11}$/,''); }
  function fmtCnpj(s){ var d=soDig(s); return d.length===14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5') : String(s||''); }
  function cnpjValido(c){
    c=soDig(c); if(c.length!==14 || /^(\d)\1+$/.test(c)) return false;
    function dv(b){ var p=b.length-7, s=0; for(var i=0;i<b.length;i++){ s+=+b[i]*p--; if(p<2) p=9; } var r=s%11; return r<2?0:11-r; }
    var d1=dv(c.slice(0,12)); if(d1!==+c[12]) return false;
    return dv(c.slice(0,13))===+c[13];
  }

  /* vencimento do DAS da competencia 'AAAA-MM' */
  function venc(ym){
    var a=+ym.slice(0,4), m=+ym.slice(5,7)-1, d=new Date(a, m+1, 20), o=new Date(d);
    while(d.getDay()===0 || d.getDay()===6 || FERIADOS[iso(d)]) d.setDate(d.getDate()+1);
    return {d:d, adiado:d.getTime()!==o.getTime(), orig:o};
  }
  function valorDas(ativ, ano){
    var t=DAS_ANO[String(ano)]; if(!t || !ativ) return 0;
    return t.inss + (ativ==='comercio'?1:ativ==='servico'?5:ativ==='ambos'?6:0);
  }

  /* ---------------- dados ---------------- */
  var CLI={}, OBR=[], FAT=[], versao=0, tCli=0, tObr=0, tCliente=0, unsubFat=null;
  function novo(){ versao++; setTimeout(tick,0); }
  function ativos(){ var a=[]; Object.keys(CLI).forEach(function(k){ var c=CLI[k]; if(/mei/i.test(c.regime||'') && !/inativ|desligad|encerrad|baixad/i.test(c.status||'')) a.push(c); }); return a.sort(function(x,y){ return nomeCurto(x.nome).localeCompare(nomeCurto(y.nome)); }); }
  function ligar(){
    var d=db(); if(!d) return;
    if(ehAdmin()){
      if(Date.now()-tCli>120000){ tCli=Date.now();
        d.collection('clientes').get().then(function(s){ var c={}; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; if(o.nome) c[chave(o.nome)]=o; }); CLI=c; tObr=0; novo(); }).catch(function(e){ console.warn('[mei2] clientes',e); });
      }
      if(!unsubFat && !window.__FATMEI__){ try{ unsubFat=d.collection('faturamento').onSnapshot(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); FAT=a; novo(); },function(){}); }catch(e){} }
      if(Date.now()-tObr>90000){ var nomes=ativos().map(function(c){ return c.nome; }); if(!nomes.length) return; tObr=Date.now();
        var lotes=[]; for(var i=0;i<nomes.length;i+=10) lotes.push(nomes.slice(i,i+10));
        Promise.all(lotes.map(function(l){ return d.collection('obrigacoes').where('cliente','in',l).get(); })).then(function(rs){
          var a=[]; rs.forEach(function(s){ s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; delete o.arquivoData; a.push(o); }); }); OBR=a; novo();
        }).catch(function(e){ console.warn('[mei2] obrigacoes',e); });
      }
    } else {
      var nome=clienteAtual(); if(!nome || Date.now()-tCliente<60000) return; tCliente=Date.now();
      d.collection('clientes').where('nome','==',nome).get().then(function(s){ var c={}; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; if(o.nome) c[chave(o.nome)]=o; }); CLI=c; novo(); }).catch(function(){});
      d.collection('obrigacoes').where('cliente','==',nome).get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; delete o.arquivoData; a.push(o); }); OBR=a; novo(); }).catch(function(){});
      if(!window.__FATMEI__) d.collection('faturamento').where('cliente','==',nome).get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); FAT=a; novo(); }).catch(function(){});
    }
  }

  /* ---------------- calculo ---------------- */
  function ehGuiaDas(o){ var t=String(o.tipo||''); return /das|simei|pgmei/i.test(t) && !/nf-?e|nota|nfs/i.test(t) && !/emitid/i.test(String(o.status||'')); }
  function compGuia(o){ var c=ymDe(o.competencia)||ymDe(o.mesRef); if(c) return c; var v=ymDe(o.vencimento); if(!v) return ''; var a=+v.slice(0,4), m=+v.slice(5,7)-1; var d=new Date(a,m-1,1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function guiaPaga(o){ return /\bpag[oa]\b|pago|baix|quitad|conclu|liquid/i.test(String(o.status||'')) && !/a\s*pagar/i.test(String(o.status||'')); }
  function guiaDeclarada(o){ return /declar|confer|informou|comprovante/i.test(String(o.status||'')) || !!o.pagamentoDeclarado; }

  function limiteDe(c, ano){
    ano=String(ano); var ab=ymDe(c.aberturaMei||c.abertura||''), mesIni=1;
    if(ab && ab.slice(0,4)===ano) mesIni=+ab.slice(5,7);
    var limite=(ab && ab.slice(0,4)===ano) ? LIM_MES*(12-mesIni+1) : LIM_MEI;
    var meses={};
    try{ if(window.__FATMEI__ && typeof __FATMEI__.calc==='function'){ var R=__FATMEI__.calc(c.nome, ano); (R.meses||[]).forEach(function(m){ meses[m.ym]=m.usado||0; }); } }catch(e){}
    if(!Object.keys(meses).length){ FAT.forEach(function(f){ if(chave(f.cliente)===chave(c.nome) && /^\d{4}-\d{2}$/.test(String(f.mesRef||''))) meses[f.mesRef]=(meses[f.mesRef]||0)+num(f.faturamento); }); }
    var h=hoje(), mesHoje=(h.getFullYear()===+ano)?h.getMonth()+1:(h.getFullYear()>+ano?12:0);
    var total=0, antes=0; Object.keys(meses).forEach(function(ym){ if(ym.slice(0,4)!==ano) return; if(+ym.slice(5,7)<mesIni) antes+=meses[ym]; else total+=meses[ym]; });
    var corridos=Math.max(1, mesHoje-mesIni+1), media=mesHoje?total/corridos:0, falta=mesHoje?12-mesHoje:0;
    var proj=total+media*falta, pode=limite-total, p=limite?total/limite*100:0;
    var porMes=mesHoje?Math.max(0,pode)/Math.max(1,12-mesHoje+1):0;
    var st = total>limite*TOLER?'desenq' : total>limite?'excedeu' : (p>=80||proj>limite)?'alerta' : p>=60?'atencao' : 'ok';
    return {ano:ano, abertura:ab, mesIni:mesIni, limite:limite, total:total, antes:antes, pct:p, pode:pode, proj:proj, porMes:porMes, status:st, mesHoje:mesHoje};
  }
  var ST={ok:['Tranquilo','#20b87a'], atencao:['Atenção','#f5a524'], alerta:['Alerta','#ff8a00'], excedeu:['Passou do limite','#e5484d'], desenq:['Desenquadrado','#b42318']};

  /* DAS de cada mes do ano: {ym, venc, st:'pago'|'decl'|'venc'|'aber', fonte, guia} */
  function dasDe(c, ano){
    ano=String(ano); var L=limiteDe(c, ano), h=hoje(), lista=[], manual=c.meiDas||{};
    var guias={}; OBR.forEach(function(o){ if(chave(o.cliente)!==chave(c.nome) || !ehGuiaDas(o)) return; var ym=compGuia(o); if(ym) (guias[ym]=guias[ym]||[]).push(o); });
    for(var m=1;m<=12;m++){
      var ym=ano+'-'+String(m).padStart(2,'0');
      if(m<L.mesIni || (L.mesHoje && m>L.mesHoje) || !L.mesHoje){ lista.push({ym:ym, fora:true}); continue; }
      var v=venc(ym), gs=guias[ym]||[], g=gs[0]||null, st, fonte='';
      var man=manual[ym];
      if(gs.some(guiaPaga)){ st='pago'; fonte='guia'; g=gs.filter(guiaPaga)[0]; }
      else if(man && man.pago){ st='pago'; fonte='manual'; }
      else if(gs.some(guiaDeclarada)){ st='decl'; fonte='cliente'; }
      else if(ym<INICIO) st='semreg';
      else st = v.d<h ? 'venc' : 'aber';
      lista.push({ym:ym, venc:v, st:st, fonte:fonte, guia:g, temGuia:gs.length>0});
    }
    return lista;
  }
  function compAtual(){ var h=hoje(); return h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); }
  function compAnterior(){ var h=hoje(), d=new Date(h.getFullYear(), h.getMonth()-1, 1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  /* a guia que importa agora: a do mes anterior se ainda nao venceu ou esta em aberto; senao a do mes atual */
  function dasFoco(lista){
    var ant=lista.filter(function(x){ return x.ym===compAnterior() && !x.fora; })[0];
    if(ant && ant.st!=='pago' && ant.st!=='semreg') return ant;
    return lista.filter(function(x){ return x.ym===compAtual() && !x.fora; })[0] || ant || null;
  }
  function diasAte(d){ return Math.round((d - hoje())/86400000); }

  /* ---------------- gravacoes (admin) ---------------- */
  async function upd(c, campos, msg){
    var d=db(); if(!d || !ehAdmin()) return false;
    try{ await d.collection('clientes').doc(String(c.id)).update(campos); Object.keys(campos).forEach(function(k){ var p=k.split('.'); if(p.length===2){ c[p[0]]=c[p[0]]||{}; c[p[0]][p[1]]=campos[k]; } else c[k]=campos[k]; }); if(msg) aviso(msg,'success'); novo(); return true; }
    catch(e){ console.warn('[mei2] gravar',e); aviso('Não consegui salvar: '+(e && e.message || e),'error'); return false; }
  }
  function marcarDas(c, ym){
    var atual=(c.meiDas||{})[ym];
    if(atual && atual.pago){ if(!confirm('Desfazer a baixa do DAS de '+rot(ym)+' de '+nomeCurto(c.nome)+'?')) return; return upd(c, mkCampo('meiDas', ym, null), 'Baixa desfeita.'); }
    if(!confirm('Dar baixa no DAS-MEI de '+rot(ym)+' de '+nomeCurto(c.nome)+' (pago)?')) return;
    return upd(c, mkCampo('meiDas', ym, {pago:true, em:new Date().toISOString(), por:'Controle MEI'}), 'DAS de '+rot(ym)+' marcado como pago.');
  }
  function mkCampo(a,b,v){ var o={}; o[a+'.'+b]=v; return o; }
  function trocarCnpj(c, novo, abertura){
    var dg=soDig(novo);
    if(!cnpjValido(dg)){ aviso('CNPJ inválido: confira os 14 números.','error'); return; }
    if(soDig(c.cnpj)===dg){ aviso('Esse já é o CNPJ atual.','info'); return; }
    if(!/^\d{4}-\d{2}$/.test(abertura||'')){ aviso('Informe o mês de abertura do CNPJ novo.','error'); return; }
    if(!confirm('Trocar o CNPJ de '+nomeCurto(c.nome)+'\n\nde: '+(fmtCnpj(c.cnpj)||'(vazio)')+'\npara: '+fmtCnpj(dg)+'\naberto em '+rot(abertura)+'\n\nO CNPJ antigo fica guardado no histórico. O nome do cliente não muda.')) return;
    var hist=(c.cnpjHistorico||[]).slice(); if(c.cnpj) hist.push({cnpj:fmtCnpj(c.cnpj), abertura:c.aberturaMei||'', trocadoEm:new Date().toISOString(), ate:abertura});
    return upd(c, {cnpj:fmtCnpj(dg), aberturaMei:abertura, cnpjHistorico:hist, cnpjTrocadoEm:new Date().toISOString()}, 'CNPJ trocado. O limite agora conta a partir de '+rot(abertura)+'.');
  }
  function waLink(c, das, valor){
    var tel=soDig(c.whatsapp||c.telefone||c.celular||''); if(tel && tel.length<=11) tel='55'+tel;
    var t='Olá! Aqui é da APARAT Contabilidade. Lembrete: o DAS-MEI de '+rot(das.ym)+(valor?(' ('+moeda(valor)+')'):'')+' '+(das.st==='venc'?'venceu em ':'vence em ')+br(das.venc.d)+'. Depois de pagar, toque em "Já paguei" na guia, no app da APARAT. Se precisar da guia, é só pedir.';
    return 'https://wa.me/'+(tel||'')+'?text='+encodeURIComponent(t);
  }

  /* ---------------- painel (admin) ---------------- */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-meictl')) return;
    var it=document.createElement('div'); it.className='nav-item'; it.id='ap-nav-meictl';
    it.innerHTML='<span class="ni">\u{1F7E2}</span>Controle MEI<span class="nav-dot" id="dot-meictl" style="display:none"></span>';
    it.onclick=function(){ try{ pPage('meictl', it); }catch(e){} ass=''; setTimeout(tick,30); };
    var fat=[].slice.call(nv.querySelectorAll('.nav-item')).filter(function(x){ return /faturamento/i.test(x.getAttribute('onclick')||'') || /^\s*\S*\s*Faturamento\s*$/i.test(x.textContent||''); })[0];
    if(fat) nv.insertBefore(it, fat.nextSibling); else nv.appendChild(it);
  }
  function pagina(){
    if(el('pp-meictl')) return;
    var base=el('pp-faturamento')||el('pp-dash'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-meictl'; p.innerHTML='<div id="m2-corpo"><div class="m2-sub">Carregando os clientes MEI...</div></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    try{ if(window.ABA_NOMES) window.ABA_NOMES.meictl='Controle MEI'; }catch(e){}
  }
  var S={sel:'', ano:''}, ass='';
  function painel(){
    var pg=el('pp-meictl'); if(!pg || !pg.classList.contains('active')) return;
    var corpo=el('m2-corpo'), ano=S.ano||String(hoje().getFullYear());
    var a=ano+'|'+versao+'|'+S.sel; if(a===ass) return; ass=a;
    var cs=ativos();
    if(!cs.length){ corpo.innerHTML='<div class="m2-tit">\u{1F7E2} Controle MEI</div><div class="m2-sub">'+(Object.keys(CLI).length?'Nenhum cliente com regime MEI e status ativo no cadastro.':'Carregando os clientes MEI...')+'</div>'; return; }
    var linhas=cs.map(function(c){ var L=limiteDe(c,ano), D=dasDe(c,ano); return {c:c, L:L, D:D, foco:dasFoco(D)}; });
    var nVenc=0, aVencer=[], decl=0; linhas.forEach(function(x){ x.D.forEach(function(d){ if(d.st==='venc') nVenc++; if(d.st==='decl') decl++; }); if(x.foco && x.foco.st==='aber') aVencer.push(x); });
    var risco=linhas.filter(function(x){ return /alerta|excedeu|desenq/.test(x.L.status); }).length;
    var dasnPend=linhas.filter(function(x){ return !((x.c.meiDasn||{})[String(+ano-1)]); }).length;
    var prox=venc(compAnterior());
    if(diasAte(prox.d)<0) prox=venc(compAtual());
    var compProx=diasAte(venc(compAnterior()).d)<0?compAtual():compAnterior();
    var anos=[]; for(var y=hoje().getFullYear(); y>=2025; y--) anos.push(y);
    var h='<div class="m2-top"><div class="m2-tit">\u{1F7E2} Controle MEI <span class="m2-ano">'+ano+'</span></div><select id="m2-ano">'+anos.map(function(y){ return '<option'+(String(y)===ano?' selected':'')+'>'+y+'</option>'; }).join('')+'</select><button class="m2-btn" id="m2-atu">Atualizar</button></div>';
    h+='<div class="m2-prox"><b>Próximo DAS-MEI: competência '+rot(compProx)+' vence em '+br(prox.d)+'</b> ('+(diasAte(prox.d)===0?'hoje':'faltam '+diasAte(prox.d)+' dia'+(diasAte(prox.d)===1?'':'s'))+')'
      +(prox.adiado?'<div class="m2-mini">O dia 20 ('+br(prox.orig)+') cai em fim de semana ou feriado, então o prazo vai para o próximo dia útil.</div>':'')
      +'<div class="m2-mini">'+(aVencer.length?aVencer.length+' cliente'+(aVencer.length>1?'s':'')+' ainda sem baixa nesta guia. Use o botão 📲 na linha para lembrar pelo WhatsApp.':'Todos os clientes já estão com a guia baixada.')+'</div></div>';
    h+='<div class="m2-kpis">'+kpi(String(cs.length),'clientes MEI ativos')+kpi(String(nVenc),'DAS vencidos sem baixa',nVenc?'#e5484d':'#20b87a')+kpi(String(decl),'"já paguei" a conferir',decl?'#f5a524':'')+kpi(String(risco),'perto ou acima do limite',risco?'#ff8a00':'#20b87a')+kpi(String(dasnPend),'DASN-SIMEI '+(+ano-1)+' sem marcar')+'</div>';
    h+='<div class="m2-tabwrap"><table class="m2-tab"><thead><tr><th>Cliente MEI</th><th>Limite '+ano+'</th><th>Faturado</th><th style="min-width:140px">Uso do limite</th><th>Situação</th><th>DAS em foco</th><th></th></tr></thead><tbody>';
    linhas.forEach(function(x){
      var s=ST[x.L.status], f=x.foco, sel=chave(S.sel)===chave(x.c.nome);
      h+='<tr class="m2-lin'+(sel?' sel':'')+'" data-cli="'+esc(x.c.nome)+'"><td><b>'+esc(nomeCurto(x.c.nome))+'</b><div class="m2-mini">'+esc(fmtCnpj(x.c.cnpj)||'sem CNPJ')+(x.L.abertura&&x.L.abertura.slice(0,4)===ano?' · aberto em '+rot(x.L.abertura):'')+'</div></td>'
        +'<td>'+moeda(x.L.limite)+(x.L.limite!==LIM_MEI?'<div class="m2-mini">proporcional</div>':'')+'</td><td>'+moeda(x.L.total)+'</td>'
        +'<td>'+barra(x.L.pct,s[1])+'<div class="m2-mini">'+pctTxt(x.L.pct)+'</div></td><td>'+chip(s[0],s[1])+'</td>'
        +'<td>'+(f?chipDas(f):'<span class="m2-mini">—</span>')+'</td>'
        +'<td>'+(f && f.st!=='pago'?'<a class="m2-btn m2-wa" target="_blank" rel="noopener" href="'+waLink(x.c,f,valorDas(x.c.meiAtividade,ano))+'" data-stop="1">📲</a>':'')+'</td></tr>';
    });
    h+='</tbody></table></div><div class="m2-mini" style="margin-top:6px">Clique no cliente para ver os 12 DAS do ano, dar baixa, trocar o CNPJ e marcar a DASN-SIMEI. Guia lançada na aba Guias com status "Pago" já conta como paga aqui.</div>';
    if(S.sel){ var x=linhas.filter(function(y){ return chave(y.c.nome)===chave(S.sel); })[0]; if(x) h+=detalhe(x, ano); }
    corpo.innerHTML=h;
    el('m2-ano').onchange=function(){ S.ano=this.value; ass=''; painel(); };
    el('m2-atu').onclick=function(){ tCli=0; tObr=0; ligar(); aviso('Atualizando...','info'); };
    [].forEach.call(corpo.querySelectorAll('[data-stop]'),function(a){ a.onclick=function(ev){ ev.stopPropagation(); }; });
    [].forEach.call(corpo.querySelectorAll('.m2-lin'),function(tr){ tr.onclick=function(){ var n=tr.getAttribute('data-cli'); S.sel=chave(S.sel)===chave(n)?'':n; ass=''; painel(); if(S.sel) setTimeout(function(){ var d=el('m2-det'); if(d) d.scrollIntoView({behavior:'smooth',block:'start'}); },50); }; });
    ligarDetalhe(ano);
  }
  function kpi(v,r,cor){ return '<div class="m2-kpi"><div class="v"'+(cor?' style="color:'+cor+'"':'')+'>'+v+'</div><div class="r">'+r+'</div></div>'; }
  function chip(t,cor){ return '<span class="m2-chip" style="color:'+cor+';border-color:'+cor+'">'+esc(t)+'</span>'; }
  function chipDas(f){
    if(f.st==='pago') return chip(NM[+f.ym.slice(5)-1]+': pago','#20b87a');
    if(f.st==='decl') return chip(NM[+f.ym.slice(5)-1]+': "já paguei"','#f5a524');
    if(f.st==='venc') return chip(NM[+f.ym.slice(5)-1]+': vencido','#e5484d');
    return chip(NM[+f.ym.slice(5)-1]+': vence '+br(f.venc.d).slice(0,5),'#3b82f6');
  }
  function barra(p,cor,alt){ return '<div class="m2-barra" style="height:'+(alt||10)+'px"><i style="width:'+Math.min(100,Math.max(0,p))+'%;background:'+cor+'"></i><span></span></div>'; }
  function detalhe(x, ano){
    var c=x.c, L=x.L, D=x.D, s=ST[L.status], vd=valorDas(c.meiAtividade, ano), dasn=c.meiDasn||{}, anoAnt=String(+ano-1);
    var h='<div class="m2-det" id="m2-det" style="border-color:'+s[1]+'"><div class="m2-tit2">'+esc(c.nome)+'</div>'
      +'<div class="m2-grid">'
      +'<div class="m2-bloco"><div class="m2-tit3">Limite de '+ano+'</div>'
        +'<p>Limite: <b>'+moeda(L.limite)+'</b>'+(L.limite!==LIM_MEI?' ('+moeda(LIM_MES)+' × '+(12-L.mesIni+1)+' meses desde '+rot(L.abertura)+')':'')+'</p>'
        +'<p>Faturado: <b>'+moeda(L.total)+'</b> · pode faturar mais <b>'+moeda(Math.max(0,L.pode))+'</b>'+(L.mesHoje&&L.mesHoje<12?' (cerca de '+moeda(L.porMes)+' por mês até dezembro)':'')+'</p>'
        +'<p>Projeção de dezembro: <b>'+moeda(L.proj)+'</b> '+chip(s[0],s[1])+'</p>'
        +barra(L.pct,s[1],14)
        +(L.antes>0?'<p class="m2-mini">⚠️ '+moeda(L.antes)+' lançados antes de '+rot(L.abertura)+' (CNPJ anterior) não entram neste limite.</p>':'')
        +'<p class="m2-mini">Tolerância de 20%: até '+moeda(L.limite*TOLER)+'. Acima disso o desenquadramento é retroativo.</p></div>'
      +'<div class="m2-bloco"><div class="m2-tit3">DAS-MEI de '+ano+'</div><div class="m2-meses">'
        +D.map(function(d){ if(d.fora) return '<div class="m2-mes fora"><b>'+NM[+d.ym.slice(5)-1]+'</b><small>—</small></div>';
          var t={pago:'Pago',decl:'"Já paguei"',venc:'Vencido',aber:'Em aberto',semreg:'Sem registro'}[d.st], dica=d.fonte==='guia'?'pago na aba Guias':d.fonte==='manual'?'baixa aqui (clique para desfazer)':'clique para dar baixa';
          var travado=d.fonte==='guia';
          return '<button class="m2-mes '+d.st+'" '+(travado?'disabled ':'')+'data-das="'+d.ym+'" title="'+esc(dica)+'"><b>'+NM[+d.ym.slice(5)-1]+'</b><small>'+t+'</small><small>vence '+br(d.venc.d).slice(0,5)+'</small>'+(d.temGuia?'<small>📄 guia</small>':'')+'</button>'; }).join('')
        +'</div><p class="m2-mini">'+(vd?'Valor do DAS em '+ano+': <b>'+moeda(vd)+'</b>.':'Defina a atividade abaixo para mostrar o valor do DAS.')+' Lance o PDF da guia na aba Guias (tipo DAS) para o cliente baixar e marcar "Já paguei".</p>'
        +'<label class="m2-lab">Atividade <select id="m2-ativ"><option value="">— escolher —</option>'+Object.keys(ATIV).map(function(k){ return '<option value="'+k+'"'+(c.meiAtividade===k?' selected':'')+'>'+ATIV[k]+'</option>'; }).join('')+'</select></label></div>'
      +'<div class="m2-bloco"><div class="m2-tit3">CNPJ</div>'
        +'<p>Atual: <b>'+esc(fmtCnpj(c.cnpj)||'(vazio)')+'</b>'+(L.abertura?' · aberto em '+rot(L.abertura):'')+'</p>'
        +((c.cnpjHistorico||[]).length?'<ul class="m2-hist">'+c.cnpjHistorico.map(function(hh){ return '<li>'+esc(hh.cnpj)+(hh.ate?' — até '+esc(rot(hh.ate)):'')+'</li>'; }).join('')+'</ul>':'<p class="m2-mini">Sem CNPJ anterior registrado.</p>')
        +'<label class="m2-lab">Novo CNPJ <input id="m2-cnpj" inputmode="numeric" placeholder="00.000.000/0000-00"></label>'
        +'<label class="m2-lab">Mês de abertura <input id="m2-cnpj-ab" type="month"></label>'
        +'<button class="m2-btn" id="m2-trocar">Trocar CNPJ e guardar o antigo</button>'
        +'<p class="m2-mini">O nome do cliente não muda (é ele que liga guias, extratos, notas e o login). O limite passa a contar a partir do mês de abertura informado.</p></div>'
      +'<div class="m2-bloco"><div class="m2-tit3">DASN-SIMEI</div>'
        +'<p>Ano-calendário '+anoAnt+': '+(dasn[anoAnt]?chip('Entregue','#20b87a'):chip('Não marcada','#f5a524'))+' <button class="m2-btn" id="m2-dasn">'+(dasn[anoAnt]?'Desmarcar':'Marcar como entregue')+'</button></p>'
        +'<p>Ano-calendário '+ano+': entregar até <b>31/05/'+(+ano+1)+'</b>. Faturamento somado até agora: <b>'+moeda(L.total)+'</b>.</p></div>'
      +'</div></div>';
    return h;
  }
  function ligarDetalhe(ano){
    var c=CLI[chave(S.sel)]; if(!c) return;
    [].forEach.call(document.querySelectorAll('#m2-det [data-das]'),function(b){ b.onclick=function(){ marcarDas(c, b.getAttribute('data-das')); }; });
    var at=el('m2-ativ'); if(at) at.onchange=function(){ upd(c, {meiAtividade:this.value||''}, 'Atividade salva.'); };
    var tr=el('m2-trocar'); if(tr) tr.onclick=function(){ trocarCnpj(c, el('m2-cnpj').value, el('m2-cnpj-ab').value); };
    var dn=el('m2-dasn'); if(dn) dn.onclick=function(){ var a=String(+ano-1), v=(c.meiDasn||{})[a]; upd(c, mkCampo('meiDasn', a, v?null:new Date().toISOString()), v?'DASN desmarcada.':'DASN '+a+' marcada como entregue.'); };
  }
  function ponto(){
    var dt=el('dot-meictl'); if(!dt) return;
    var n=0; ativos().forEach(function(c){ dasDe(c, String(hoje().getFullYear())).forEach(function(d){ if(d.st==='venc') n++; }); });
    dt.style.display=n?'':'none'; dt.textContent='';
  }

  /* ---------------- app do cliente ---------------- */
  var assCli='';
  function clienteApp(){
    var alvo=el('cli-fat'); if(!alvo || alvo.offsetParent===null) return;
    var nome=clienteAtual(); if(!nome) return; var c=CLI[chave(nome)];
    if(!c || !/mei/i.test(c.regime||'')) return;
    var box=el('m2-cli'); if(!box){ box=document.createElement('div'); box.id='m2-cli'; var fm=el('fm-cli-box'); var ref=(fm && fm.parentNode===alvo.parentNode)?fm.nextSibling:alvo; alvo.parentNode.insertBefore(box, ref); }
    var ano=String(hoje().getFullYear()), a=versao+'|'+ano; if(a===assCli) return; assCli=a;
    var D=dasDe(c, ano), f=dasFoco(D), vd=valorDas(c.meiAtividade, ano), mes=hoje().getMonth()+1, anoAnt=String(+ano-1);
    var h='<div class="m2-tit">\u{1F9FE} Seu DAS-MEI</div>';
    if(f){
      var cor={pago:'#20b87a',decl:'#f5a524',venc:'#e5484d',aber:'#3b82f6'}[f.st];
      h+='<div class="m2-dascard" style="border-left-color:'+cor+'"><div><b>Competência '+rot(f.ym)+'</b></div>'
        +'<div>'+(vd?'Valor: <b>'+moeda(vd)+'</b> · ':'')+(f.st==='venc'?'venceu em ':'vence em ')+'<b>'+br(f.venc.d)+'</b>'+(f.venc.adiado?' (o dia 20 cai em fim de semana ou feriado)':'')+'</div>'
        +'<div style="margin-top:6px">'+({pago:chip('Pago. Obrigado!','#20b87a'), decl:chip('Você informou que pagou. A APARAT vai conferir.','#f5a524'), venc:chip('Vencido: pague o quanto antes para não perder os benefícios do INSS.','#e5484d'), aber:chip(diasAte(f.venc.d)<=5?'Vence em '+(diasAte(f.venc.d)===0?'hoje':diasAte(f.venc.d)+' dia'+(diasAte(f.venc.d)===1?'':'s')):'Em aberto','#3b82f6')})[f.st]+'</div>'
        +(f.st!=='pago'?'<div class="m2-mini" style="margin-top:6px">'+(f.temGuia?'A guia está em "Guias": baixe, pague e toque em "Já paguei".':'A APARAT vai enviar a guia. Se preferir, gere no app MEI ou no Portal do Empreendedor (PGMEI).')+'</div>':'')+'</div>';
    }
    h+='<div class="m2-mini" style="margin:10px 0 6px">Seus pagamentos em '+ano+'</div><div class="m2-meses">'+D.map(function(d){ if(d.fora) return '<div class="m2-mes fora"><b>'+NM[+d.ym.slice(5)-1]+'</b></div>'; return '<div class="m2-mes '+d.st+'"><b>'+NM[+d.ym.slice(5)-1]+'</b><small>'+({pago:'Pago',decl:'Informado',venc:'Vencido',aber:'Em aberto',semreg:'—'})[d.st]+'</small></div>'; }).join('')+'</div>';
    if(mes<=5) h+='<div class="m2-dascard" style="border-left-color:#f5a524;margin-top:10px"><b>Declaração anual (DASN-SIMEI) de '+anoAnt+'</b><div>Prazo: <b>31/05/'+ano+'</b>. '+((c.meiDasn||{})[anoAnt]?'Já entregue pela APARAT. ✔':'A APARAT cuida disso: confira se todas as suas vendas de '+anoAnt+' foram informadas.')+'</div></div>';
    h+='<div class="m2-mini" style="margin-top:8px">Dica: ative o débito automático do DAS no app MEI ou no seu banco e não se preocupe mais com a data.</div>';
    box.innerHTML=h;
  }

  /* ---------------- estilo e laco ---------------- */
  function css(){
    if(el('m2-css')) return; var s=document.createElement('style'); s.id='m2-css';
    s.textContent='#m2-corpo,#m2-cli{line-height:1.45}#m2-cli{border:1.5px solid rgba(59,130,246,.5);border-radius:16px;padding:14px;margin:14px 0;background:rgba(59,130,246,.06)}'
      +'.m2-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.m2-tit{font-size:19px;font-weight:800}.m2-tit2{font-size:16px;font-weight:800;margin-bottom:10px}.m2-tit3{font-weight:800;margin-bottom:6px}.m2-ano{opacity:.6;font-weight:600}'
      +'#m2-ano,#m2-ativ,#m2-cnpj,#m2-cnpj-ab{width:auto!important;max-width:100%;padding:6px 8px;border-radius:8px;border:1px solid rgba(128,128,160,.45);background:transparent;color:inherit}#m2-ativ option{color:#111}'
      +'.m2-btn{display:inline-block;padding:6px 12px;border-radius:8px;border:1px solid rgba(59,130,246,.7);background:rgba(59,130,246,.12);color:inherit;font-weight:700;font-size:13px;cursor:pointer;text-decoration:none;width:auto!important}.m2-btn:hover{background:rgba(59,130,246,.25)}.m2-wa{padding:4px 8px}'
      +'.m2-prox{border-left:5px solid #3b82f6;background:rgba(59,130,246,.08);border-radius:10px;padding:10px 12px;margin-bottom:12px}'
      +'.m2-sub,.m2-mini{font-size:12px;opacity:.78}.m2-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px}.m2-kpi{border:1px solid rgba(128,128,160,.3);border-radius:10px;padding:8px 10px}.m2-kpi .v{font-size:20px;font-weight:800}.m2-kpi .r{font-size:11.5px;opacity:.75}'
      +'.m2-tabwrap{overflow-x:auto;border:1px solid rgba(128,128,160,.3);border-radius:10px}.m2-tab{width:100%;border-collapse:collapse;min-width:720px}.m2-tab th,.m2-tab td{padding:8px 10px;border-bottom:1px solid rgba(128,128,160,.2);text-align:left;font-size:13px;vertical-align:top}.m2-tab th{font-size:11.5px;opacity:.7}.m2-lin{cursor:pointer}.m2-lin:hover td{background:rgba(59,130,246,.07)}.m2-lin.sel td{background:rgba(59,130,246,.14)}'
      +'.m2-chip{display:inline-block;border:1px solid;border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:700;white-space:normal}'
      +'.m2-barra{position:relative;background:rgba(128,128,160,.25);border-radius:6px;min-width:110px}.m2-barra i{position:absolute;left:0;top:0;bottom:0;border-radius:6px}.m2-barra span{position:absolute;left:80%;top:-3px;bottom:-3px;width:2px;background:currentColor;opacity:.4}'
      +'.m2-det{border:1.5px solid;border-radius:14px;padding:14px;margin-top:14px}.m2-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:820px){.m2-grid{grid-template-columns:1fr}}.m2-bloco{border:1px solid rgba(128,128,160,.3);border-radius:10px;padding:12px}.m2-bloco p{margin:5px 0}.m2-lab{display:block;font-size:12px;opacity:.85;margin:8px 0}'
      +'.m2-meses{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px}.m2-mes{border:1px solid rgba(128,128,160,.4);border-radius:8px;padding:6px 4px;text-align:center;background:transparent;color:inherit;font:inherit;width:auto!important}.m2-mes b{display:block;font-size:13px}.m2-mes small{display:block;font-size:10.5px;opacity:.85}button.m2-mes{cursor:pointer}button.m2-mes:disabled{cursor:default}'
      +'.m2-mes.pago{background:rgba(32,184,122,.16);border-color:#20b87a}.m2-mes.venc{background:rgba(229,72,77,.16);border-color:#e5484d}.m2-mes.aber{background:rgba(59,130,246,.12);border-color:#3b82f6}.m2-mes.decl{background:rgba(245,165,36,.16);border-color:#f5a524}.m2-mes.fora{opacity:.35}.m2-mes.semreg{opacity:.6;border-style:dashed}'
      +'.m2-hist{margin:4px 0 4px 18px;padding:0;font-size:13px}.m2-dascard{border-left:5px solid;border-radius:10px;padding:10px 12px;background:rgba(128,128,160,.08)}'
      +'body.ap-tema-claro #m2-cli{background:#f2f7ff}';
    document.head.appendChild(s);
  }
  function tick(){
    try{
      css(); ligar();
      if(ehAdmin()){ menu(); pagina(); painel(); ponto(); }
      else clienteApp();
    }catch(e){ console.warn('[mei2]', e); }
  }
  setInterval(tick, 1500); setTimeout(tick, 800);
  window.__MEI2__ = {versao:VER, venc:venc, valorDas:valorDas, limiteDe:limiteDe, dasDe:dasDe, cnpjValido:cnpjValido, estado:function(){ return {CLI:CLI, OBR:OBR, FAT:FAT}; }, abrir:function(nome){ var it=el('ap-nav-meictl'); if(it) it.click(); S.sel=nome||''; ass=''; tick(); }, tick:tick};
})();
