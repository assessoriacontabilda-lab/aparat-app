/* APARAT - FATURAMENTO AUTOMATICO PELAS NOTAS E EXTRATOS (fat-auto.js v1, 24/10/2026)
   Pedido do Daniel (23/10/2026): "quando eu lancar uma nota em qualquer aba, os valores computam no faturamento;
   mesmo lancando em PDF e em XML conta uma unica vez; no upload de nota ou extrato, preenchimento automatico,
   sem ficar digitando, e sem valores repetidos". Decisoes dele: NOTAS valem (o extrato vira conferencia; cliente
   que nao emite nota usa o extrato); nota "parecida" -> pergunta; o cliente ve as notas que somaram.
   O QUE FAZ
   1. LEITURA AUTOMATICA DO ARQUIVO (XML de NF-e/NFC-e, NFS-e nacional, NFS-e ABRASF e PDF do DANFE/DANFSe com
      pdf.js): chave, numero, emitente, tomador, data, competencia, valor e se esta cancelada. Preenche sozinho:
      - Solicitacoes > Responder (pedido de nota): mostra o que leu e aceita tambem o XML da mesma nota;
      - Notas Fiscais > Registrar Nota Fiscal: cliente, numero, valor, data e descricao;
      - Guias (NF-e Emitida): valor e competencia.
   2. MESMA NOTA CONTA UMA VEZ: identifica a nota pela chave de acesso ou por CNPJ do emitente + numero. PDF e XML
      da mesma nota, ou a mesma nota lancada em duas abas, viram um grupo so. Nota so com valor digitado (sem
      arquivo lido): mesmo cliente + mesmo mes + mesmo valor em abas diferentes = mesma nota (regra antiga).
      Antes de salvar, avisa se a nota ja existe e pergunta quando ha uma "parecida" (mesmo cliente, mes e valor).
   3. A NOTA VAI PARA QUEM EMITIU: a nota conta no faturamento do cliente dono do CNPJ emitente. Por isso a NFS-e
      dos honorarios (emitida pela APARAT, lancada em Guias como "NF-e Emitida") NAO entra no faturamento do
      cliente - entra no da APARAT.
   4. FATURAMENTO: para MEI e ME, cada mes com nota ganha/atualiza o lancamento em 'faturamento'
      {auto:'notas', notasSoma, notasQtd, notasLista}. Lancamento feito a mao ou pelo botao do extrato nunca e
      sobrescrito: se as notas somarem mais, aparece "Usar o total das notas". Nada e apagado.
   5. ARQUIVOS JA LANCADOS: le sozinho, uma vez, os PDF/XML que ja estao no app e grava o campo nf no documento.
   6. EXTRATO OFX: ao escolher o arquivo, confere o mes do arquivo, se a conta ja apareceu em outro cliente e se
      os lancamentos (FITID) ja estao em outro extrato. Depois de salvo, o resumo passa a contar so os
      lancamentos do mes e que nao estavam em outro extrato (o original fica em resumoOriginal).
   7. Painel Faturamento: quadro "Notas que formam o faturamento" (cliente x mes, de onde veio cada nota,
      PDF/XML, repetidas e canceladas riscadas, conferencia com o extrato). App do cliente: lista das notas do mes.
   Substitui o lancamento automatico do fat-mei.js (que passa a usar esta contagem). */
;(function(){
  if(window.__APARAT_FATAUTO__) return; window.__APARAT_FATAUTO__=1;
  window.__FATMEI_SO_LER__=1; /* um gravador so: este modulo */

  var VER=1, APARAT_CNPJ='56938548000131';
  var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var NM=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var MESES_L=['janeiro','fevereiro','mar\u00e7o','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return true; }catch(e){ return false; } }
  function aviso(m,t){ try{ if(typeof notif==='function') notif(m,t||'info'); }catch(e){} }
  function norm(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' '); }
  function soDig(s){ return String(s||'').replace(/\D/g,''); }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }
  function claro(){ var c=document.body.classList; return c.contains('ap-esc-claro')||c.contains('ap-tema-claro'); }
  /* valor digitado no app: virgula = decimal; so ponto com 3 digitos depois = milhar ("1.060"); 1-2 digitos = centavos */
  function num(v){
    if(typeof v==='number') return isFinite(v)?v:0;
    v=String(v==null?'':v).replace(/[^0-9,.-]/g,''); if(!v) return 0;
    if(v.indexOf(',')>-1) return parseFloat(v.replace(/\./g,'').replace(',','.'))||0;
    var i=v.lastIndexOf('.');
    if(i>-1 && /^\d{3}$/.test(v.slice(i+1))) return parseFloat(v.replace(/\./g,''))||0;
    return parseFloat(v)||0;
  }
  function r2(v){ return Math.round((Number(v)||0)*100)/100; }
  function moeda(v){ v=Number(v)||0; var s=Math.abs(v).toFixed(2).split('.'); return (v<0?'-':'')+'R$ '+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+s[1]; }
  function valBR(v){ return moeda(v).replace('R$ ',''); }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function hojeYM(){ try{ return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7); }catch(e){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); } }
  function rotulo(ym){ var p=String(ym||'').split('-'); return (NM[parseInt(p[1],10)-1]||p[1])+'/'+p[0]; }
  function ymDe(v){
    if(!v) return '';
    if(typeof v==='object' && v.seconds){ var d=new Date(v.seconds*1000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
    var s=String(v).trim(), m;
    if((m=s.match(/^(\d{4})-(\d{2})/))) return m[1]+'-'+m[2];
    if((m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return m[3]+'-'+m[2];
    if((m=s.match(/^(\d{2})\/(\d{4})$/))) return m[2]+'-'+m[1];
    return '';
  }
  function isoDeBR(s){ var m=String(s||'').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?(m[3]+'-'+m[2]+'-'+m[1]):''; }
  function brDeISO(s){ var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]+'/'+m[1]):''; }
  function fmtCnpj(c){ c=soDig(c); if(c.length===14) return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'); if(c.length===11) return c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4'); return c; }

  /* =================== 1. LEITURA DA NOTA (XML / PDF / nome do arquivo) =================== */
  function dv44(c){ var s=0, p=2; for(var i=42;i>=0;i--){ s+=Number(c[i])*p; p=p===9?2:p+1; } var r=s%11, d=(r<2)?0:11-r; return d===Number(c[43]); }
  function infoChave(c){
    c=soDig(c);
    if(c.length===44 && dv44(c)){
      var mm=+c.slice(4,6); if(mm<1||mm>12) return null;
      var mod=c.slice(20,22);
      return {chave:c, tipo:mod==='65'?'NFCe':'NFe', mod:mod, cnpjEmit:c.slice(6,20), serie:String(+c.slice(22,25)), numero:String(+c.slice(25,34)), ym:'20'+c.slice(2,4)+'-'+c.slice(4,6)};
    }
    if(c.length===50){
      /* NFS-e nacional: municipio(7) + ambiente(1) + tipo inscricao(1) + CNPJ/CPF(14) + numero(13) + AAMM(4) + codigo(9) + DV(1) */
      var uf=+c.slice(0,2), amb=c[7], tp=c[8], aa=+c.slice(36,38), m2=+c.slice(38,40);
      if(uf<11||uf>53||(amb!=='1'&&amb!=='2')||(tp!=='1'&&tp!=='2')||m2<1||m2>12||aa<20) return null;
      var ins=c.slice(9,23); return {chave:c, tipo:'NFSe', mod:'NFSe', cnpjEmit:tp==='2'?ins:ins.slice(3), serie:'', numero:String(+c.slice(23,36)), ym:'20'+c.slice(36,38)+'-'+c.slice(38,40)};
    }
    return null;
  }
  function acharChave(txt){
    var flat=String(txt||'').replace(/(\d)[ \u00a0]+(?=\d)/g,'$1'), re=/(?:^|\D)(\d{50}|\d{44})(?!\d)/g, m, achou=null;
    while((m=re.exec(flat))){ var i=infoChave(m[1]); if(i){ if(i.tipo==='NFSe') return i; if(!achou) achou=i; } re.lastIndex=m.index+1; }
    return achou;
  }
  function novoNF(origem){ return {v:VER, origem:origem, tipo:'', chave:'', numero:'', serie:'', mod:'', cnpjEmit:'', nomeEmit:'', docToma:'', nomeToma:'', dataEmi:'', comp:'', ym:'', valor:0, cancelada:false, faltando:[], lidoEm:agoraBR()}; }
  function fechar(nf){
    var ic=nf.chave?infoChave(nf.chave):null; if(ic){ ['tipo','mod','cnpjEmit','numero','serie'].forEach(function(k){ if(!nf[k]) nf[k]=ic[k]; }); }
    nf.ym=ymDe(nf.comp)||ymDe(nf.dataEmi)||(ic?ic.ym:'')||nf.ym||''; /* competencia > emissao > AAMM da chave */
    nf.valor=r2(nf.valor);
    nf.faltando=[]; if(!nf.numero) nf.faltando.push('numero'); if(!nf.valor) nf.faltando.push('valor'); if(!nf.ym) nf.faltando.push('data'); if(!nf.cnpjEmit) nf.faltando.push('emitente');
    return nf;
  }
  function lerXML(txt){
    var doc; try{ doc=new DOMParser().parseFromString(String(txt||''),'text/xml'); }catch(e){ return null; }
    if(!doc || doc.getElementsByTagName('parsererror').length) return null;
    function tg(no,n){ if(!no) return null; var a=no.getElementsByTagNameNS ? no.getElementsByTagNameNS('*',n) : no.getElementsByTagName(n); if(!a.length) a=no.getElementsByTagName(n); return a.length?a[0]:null; }
    function tx(no,n){ var e=tg(no,n); return e?String(e.textContent||'').trim():''; }
    var nf=novoNF('xml'), e, inf;
    /* evento de cancelamento */
    var tpEv=tx(doc,'tpEvento'), chEv=tx(doc,'chNFe')||tx(doc,'chNFSe');
    if((tpEv==='110111' || tg(doc,'e101101')) && chEv && !tg(doc,'infNFe') && !tg(doc,'infNFSe')){ nf.chave=soDig(chEv); nf.cancelada=true; nf.evento='cancelamento'; return fechar(nf); }
    if((inf=tg(doc,'infNFSe'))){ /* NFS-e padrao nacional */
      nf.tipo='NFSe'; nf.chave=soDig(inf.getAttribute('Id')||''); nf.numero=String(+tx(inf,'nNFSe')||'')||'';
      var dps=tg(doc,'infDPS'); nf.dataEmi=(tx(dps,'dhEmi')||tx(inf,'dhProc')).slice(0,10); nf.comp=tx(dps,'dCompet').slice(0,10);
      e=tg(inf,'emit'); nf.cnpjEmit=soDig(tx(e,'CNPJ')||tx(e,'CPF')); nf.nomeEmit=tx(e,'xNome');
      if(!nf.cnpjEmit){ var pr=tg(dps,'prest'); nf.cnpjEmit=soDig(tx(pr,'CNPJ')||tx(pr,'CPF')); }
      var to=tg(dps,'toma'); nf.docToma=soDig(tx(to,'CNPJ')||tx(to,'CPF')); nf.nomeToma=tx(to,'xNome');
      nf.valor=parseFloat(tx(dps,'vServ'))||parseFloat(tx(inf,'vLiq'))||0;
      if(/cancel/i.test(tx(inf,'xSit')||'')) nf.cancelada=true;
      return fechar(nf);
    }
    if((inf=tg(doc,'infNFe'))){ /* NF-e / NFC-e */
      nf.chave=soDig(inf.getAttribute('Id')||''); var ide=tg(inf,'ide');
      nf.numero=String(+tx(ide,'nNF')||''); nf.serie=String(+tx(ide,'serie')||''); nf.mod=tx(ide,'mod'); nf.tipo=nf.mod==='65'?'NFCe':'NFe';
      nf.dataEmi=(tx(ide,'dhEmi')||tx(ide,'dEmi')).slice(0,10);
      e=tg(inf,'emit'); nf.cnpjEmit=soDig(tx(e,'CNPJ')||tx(e,'CPF')); nf.nomeEmit=tx(e,'xNome');
      var de=tg(inf,'dest'); nf.docToma=soDig(tx(de,'CNPJ')||tx(de,'CPF')); nf.nomeToma=tx(de,'xNome');
      nf.valor=parseFloat(tx(tg(inf,'ICMSTot'),'vNF'))||0;
      var cs=tx(doc,'cStat'); if(cs==='101'||cs==='135'&&tpEv==='110111') nf.cancelada=true;
      return fechar(nf);
    }
    if((inf=tg(doc,'InfNfse'))){ /* NFS-e ABRASF (prefeitura) */
      nf.tipo='NFSe-mun'; nf.numero=String(+tx(inf,'Numero')||''); nf.dataEmi=tx(inf,'DataEmissao').slice(0,10); nf.comp=tx(inf,'Competencia').slice(0,10);
      var ps=tg(inf,'PrestadorServico')||tg(doc,'Prestador'); nf.cnpjEmit=soDig(tx(ps,'Cnpj')||tx(ps,'Cpf')); nf.nomeEmit=tx(ps,'RazaoSocial');
      var tm=tg(doc,'TomadorServico')||tg(doc,'Tomador'); nf.docToma=soDig(tx(tm,'Cnpj')||tx(tm,'Cpf')); nf.nomeToma=tx(tm,'RazaoSocial');
      nf.valor=parseFloat(tx(doc,'ValorServicos'))||parseFloat(tx(doc,'ValorLiquidoNfse'))||0;
      nf.codVerif=tx(inf,'CodigoVerificacao'); if(tg(doc,'NfseCancelamento')||tg(doc,'Cancelamento')) nf.cancelada=true;
      return fechar(nf);
    }
    return null;
  }
  function moedaTxt(s){ return parseFloat(String(s).replace(/\./g,'').replace(',','.'))||0; }
  var RE_MOEDA=/(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)(?!\s*%)/g;
  function lerTextoPDF(t, nome){
    t=String(t||''); var nf=novoNF('pdf'), m;
    var ch=acharChave(t)||acharChave(nome||''); if(ch) nf.chave=ch.chave;
    /* valor: o primeiro valor depois dos rotulos de total; senao o maior "R$" da nota */
    var rot=[/VALOR TOTAL DA NFS-?E/i, /VALOR DO SERVI[\u00c7C]O/i, /VALOR TOTAL DA NOTA/i, /VALOR TOTAL DOS SERVI[\u00c7C]OS/i, /VALOR L[\u00cdI]QUIDO DA NFS-?E/i, /VALOR TOTAL/i];
    for(var i=0;i<rot.length && !nf.valor;i++){ var r=rot[i].exec(t); if(!r) continue; var tre=t.slice(r.index+r[0].length, r.index+r[0].length+400); RE_MOEDA.lastIndex=0; var mm; while((mm=RE_MOEDA.exec(tre))){ var v=moedaTxt(mm[1]); if(v>0){ nf.valor=v; break; } } }
    if(!nf.valor){ var mx=0, re2=/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g; while((m=re2.exec(t))){ mx=Math.max(mx, moedaTxt(m[1])); } nf.valor=mx; }
    if((m=/EMISS[\u00c3A]O DA NFS-?E[^\d]{0,40}(\d{2}\/\d{2}\/\d{4})/i.exec(t))||(m=/DATA (?:DE |DA )?EMISS[\u00c3A]O[^\d]{0,40}(\d{2}\/\d{2}\/\d{4})/i.exec(t))) nf.dataEmi=isoDeBR(m[1]);
    if((m=/COMPET[\u00caE]NCIA(?: DA NFS-?E)?[^\d]{0,40}(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{4})/i.exec(t))){ nf.comp=/^\d{2}\/\d{4}$/.test(m[1])?(m[1].slice(3)+'-'+m[1].slice(0,2)+'-01'):isoDeBR(m[1]); }
    if(!nf.chave){
      if((m=/N[\u00daU]MERO DA NFS-?E[^\d]{0,30}(\d{1,15})/i.exec(t))||(m=/N[\u00ba\u00b0o]\.?\s*(\d{1,9})/i.exec(t))) nf.numero=String(+m[1]);
      if((m=/(?:PRESTADOR|EMITENTE)[\s\S]{0,300}?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i.exec(t))||(m=/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/.exec(t))) nf.cnpjEmit=soDig(m[1]);
      nf.tipo=/NFS-?e/i.test(t)?'NFSe':(/DANFE/i.test(t)?'NFe':'');
    }
    if((m=/TOMADOR[\s\S]{0,500}?Nome \/ Nome Empresarial\s*\n?\s*([^\n]+)/i.exec(t))||(m=/DESTINAT[\u00c1A]RIO[\s\S]{0,250}?NOME\s*\/\s*RAZ[\u00c3A]O SOCIAL\s*\n?\s*([^\n]+)/i.exec(t))) nf.nomeToma=m[1].trim().slice(0,80);
    if((m=/TOMADOR[\s\S]{0,60}?CNPJ \/ CPF[^\d]{0,20}([\d.\/-]{11,18})/i.exec(t))) nf.docToma=soDig(m[1]);
    if((m=/PRESTADOR[\s\S]{0,400}?Nome \/ Nome Empresarial\s*\n?\s*([^\n]+)/i.exec(t))) nf.nomeEmit=m[1].trim().slice(0,80);
    if(/SITUA[\u00c7C][\u00c3A]O DA NFS-?E[\s\S]{0,120}?CANCELAD/i.test(t) || /NFS-?E CANCELADA|NF-?E CANCELADA/i.test(t)) nf.cancelada=true;
    return fechar(nf);
  }
  var pdfjsP=null;
  function pdfjs(){
    if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if(pdfjsP) return pdfjsP;
    pdfjsP=new Promise(function(ok,err){ var s=document.createElement('script'); s.src=PDFJS+'pdf.min.js'; s.onload=function(){ try{ pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'; ok(pdfjsLib); }catch(e){ err(e); } }; s.onerror=function(){ pdfjsP=null; err(new Error('n\u00e3o consegui carregar o leitor de PDF')); }; document.head.appendChild(s); });
    return pdfjsP;
  }
  async function textoPDF(bytes){
    var lib=await pdfjs(); var pdf=await lib.getDocument({data:bytes}).promise, t='';
    for(var p=1;p<=Math.min(pdf.numPages,4);p++){ var pg=await pdf.getPage(p), c=await pg.getTextContent(); t+=c.items.map(function(i){ return i.str+(i.hasEOL?'\n':' '); }).join('')+'\n'; }
    return t;
  }
  function bytesDeDataUrl(du){
    var m=String(du||'').match(/^data:([^;,]*)(;base64)?,([\s\S]*)$/); if(!m) return null;
    var bin=m[2]?atob(m[3]):decodeURIComponent(m[3]), u=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i)&255; return u;
  }
  function decod(u){ try{ return new TextDecoder('utf-8',{fatal:true}).decode(u); }catch(e){ try{ return new TextDecoder('iso-8859-1').decode(u); }catch(e2){ return ''; } } }
  function cabeca(u){ var s=''; for(var i=0;i<Math.min(u.length,64);i++) s+=String.fromCharCode(u[i]); return s.replace(/^\ufeff|^\xEF\xBB\xBF/,'').replace(/^\s+/,''); }
  /* bytes -> nf (ou null). nome ajuda quando o PDF e imagem (sem texto) */
  async function lerBytes(u, nome){
    var c=cabeca(u);
    if(/^%PDF/.test(c)){ var t=''; try{ t=await textoPDF(u); }catch(e){ t=''; } var nf=lerTextoPDF(t, nome); if(!t.trim()){ nf.origem='nome'; nf.semTexto=true; } return nf; }
    if(/^</.test(c)){ return lerXML(decod(u)); }
    var ch=acharChave(nome||''); if(ch){ var n2=novoNF('nome'); n2.chave=ch.chave; return fechar(n2); }
    return null;
  }
  function lerFile(f){ return new Promise(function(ok,err){ var fr=new FileReader(); fr.onload=function(){ ok(new Uint8Array(fr.result)); }; fr.onerror=function(){ err(new Error('n\u00e3o consegui ler o arquivo')); }; fr.readAsArrayBuffer(f); }); }
  async function lerArquivo(f){ var u=await lerFile(f); var nf=await lerBytes(u, f.name); if(nf) nf.arq=f.name; return nf; }
  /* junta o que veio do XML (exato) com o do PDF */
  function juntarNF(a,b){
    if(!a) return b; if(!b) return a; var x=a.origem==='xml'?a:(b.origem==='xml'?b:a), y=x===a?b:a, r={};
    Object.keys(y).forEach(function(k){ r[k]=y[k]; }); Object.keys(x).forEach(function(k){ var v=x[k]; if(v!=='' && v!=null && !(Array.isArray(v)&&!v.length) && v!==0) r[k]=v; });
    r.cancelada=!!(a.cancelada||b.cancelada); r.origem=x.origem; return fechar(r);
  }
  function chavesNF(nf){
    var k=[]; if(!nf) return k;
    if(nf.chave) k.push('C'+nf.chave);
    if(nf.cnpjEmit && nf.numero){ if(/^NFSe/.test(nf.tipo)) k.push('S'+nf.cnpjEmit+'|'+nf.numero); else if(nf.tipo) k.push('N'+nf.cnpjEmit+'|'+(nf.mod||'55')+'|'+(nf.serie||'')+'|'+nf.numero); }
    return k;
  }
  /* o mesmo documento pode ter nota diferente da que esta no arquivo? nao: chaves vem do arquivo */

  /* =================== 2. DADOS =================== */
  var SOLS=[], NOTAS=[], OBR=[], FAT=[], CLI=[], versao=0, unsubs=[], tCli=0, carregou={s:0,n:0,o:0,f:0};
  var PORCNPJ={}, PORNOME={};
  function ligar(){
    var d=db(); if(!d || !ehAdmin()) return;
    if(!unsubs.length){
      function on(col, fn, k){ try{ unsubs.push(d.collection(col).onSnapshot(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); fn(a); carregou[k]=1; novo(); },function(e){ console.warn('[fat-auto] '+col,e); })); }catch(e){} }
      on('solicitacoes', function(a){ SOLS=a; }, 's'); on('notas', function(a){ NOTAS=a; }, 'n'); on('obrigacoes', function(a){ OBR=a; }, 'o'); on('faturamento', function(a){ FAT=a; }, 'f');
    }
    if(Date.now()-tCli>120000){ tCli=Date.now(); d.collection('clientes').get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; if(o.nome) a.push(o); }); CLI=a; indexar(); novo(); }).catch(function(){}); }
  }
  function indexar(){
    PORCNPJ={}; PORNOME={};
    CLI.forEach(function(c){ var k=soDig(c.cnpj||c.CNPJ||c.documento||''); if(k.length===14||k.length===11) PORCNPJ[k]=c; PORNOME[norm(c.nome)]=c; });
  }
  function clientePorCnpj(c){ c=soDig(c); return c?(PORCNPJ[c]||null):null; }
  function clientePorNome(n){ var k=norm(n); if(PORNOME[k]) return PORNOME[k]; var raiz=(String(n||'').match(/^(\d{2}\.\d{3}\.\d{3})\s/)||[])[1]; if(raiz){ raiz=soDig(raiz); var ks=Object.keys(PORCNPJ); for(var i=0;i<ks.length;i++) if(ks[i].slice(0,8)===raiz) return PORCNPJ[ks[i]]; } return null; }
  function nomeOficial(n){ var c=clientePorNome(n); return c?c.nome:String(n||'').trim(); }
  var pronto=function(){ return carregou.s&&carregou.n&&carregou.o&&carregou.f&&CLI.length>0; };
  var tNovo=0; function novo(){ versao++; clearTimeout(tNovo); tNovo=setTimeout(tick,150); }

  /* gravacao (com modo de teste "seco": window.__FATAUTO_SECO__=1 so registra em window.__FATAUTO_LOG__) */
  var LOCAL={solicitacoes:function(){ return SOLS; }, notas:function(){ return NOTAS; }, obrigacoes:function(){ return OBR; }, faturamento:function(){ return FAT; }};
  async function gravar(col, id, dados){
    if(window.__FATAUTO_SECO__){ (window.__FATAUTO_LOG__=window.__FATAUTO_LOG__||[]).push({op:'set', col:col, id:id, dados:dados}); var a=LOCAL[col]?LOCAL[col]():[]; a.forEach(function(o){ if(String(o.id)===String(id)) Object.keys(dados).forEach(function(k){ o[k]=dados[k]; }); }); novo(); return; }
    return db().collection(col).doc(String(id)).set(dados,{merge:true});
  }
  async function adicionar(col, dados){
    if(window.__FATAUTO_SECO__){ (window.__FATAUTO_LOG__=window.__FATAUTO_LOG__||[]).push({op:'add', col:col, dados:dados}); var o=Object.assign({id:'seco'+Math.random().toString(36).slice(2,8)},dados); if(LOCAL[col]) LOCAL[col]().push(o); novo(); return; }
    return db().collection(col).add(dados);
  }

  function ehPedidoNF(o){ return /nota\s*fiscal|nfe|nf-e|nfs-e|emitir\s*nota/i.test(String(o.servico||'')+' '+String(o.mensagem||'')); }
  function ehObrNF(o){ return /nf-?e|nfs-?e|nota\s*fiscal/i.test(String(o.tipo||'')) && !/^(DAS|DARF|FGTS|INSS|ISS|ICMS)\b/i.test(String(o.tipo||'')); }
  function mimeDe(du, nome){ var m=String(du||'').match(/^data:([^;,]+)/); var t=m?m[1]:''; if(/xml/i.test(t)||/\.xml$/i.test(nome||'')) return 'xml'; if(/pdf/i.test(t)||/\.pdf$/i.test(nome||'')) return 'pdf'; return t?'outro':''; }
  var FONTE_ROT={sol:'Solicita\u00e7\u00f5es', nota:'Notas Fiscais', obr:'Guias'};

  /* cada documento do app que pode ser uma nota emitida vira um "item" */
  function itens(){
    var L=[];
    SOLS.forEach(function(s){ if(!ehPedidoNF(s) || !s.respostaArquivoData) return; var nf=s.nf&&s.nf.v?s.nf:null;
      var arq={}; var t1=mimeDe(s.respostaArquivoData, s.respostaArquivoNome); if(t1) arq[t1]=1; if(s.nfXmlData) arq.xml=1; if(s.nfPdfData) arq.pdf=1;
      L.push(base('sol', s, nf, num(s.valor), (nf&&nf.ym)||ymDe(s.respondidoEm)||ymDe(s.data), s.respondidoEm||s.data||'', s.tomador||'', arq)); });
    NOTAS.forEach(function(n){ if(n.direcao==='entrada') return; if(/pedido|recebimento/i.test(String(n.tipo||'')) || String(n.origem||'')==='cliente') return;
      var nf=n.nf&&n.nf.v?n.nf:null; if(n.direcao==='honorario' && !(nf && nf.cnpjEmit)) return;
      var arq={}; var t1=mimeDe(n.arquivoData, n.arquivo||n.arquivoNome); if(t1) arq[t1]=1; if(n.pdfData) arq.pdf=1; if(n.nfXmlData) arq.xml=1; if(n.nfPdfData) arq.pdf=1;
      L.push(base('nota', n, nf, num(n.valor), (nf&&nf.ym)||ymDe(n.data)||ymDe(n.criadoEm), n.data||'', n.descricao||'', arq)); });
    OBR.forEach(function(o){ if(!ehObrNF(o)) return; var nf=o.nf&&o.nf.v?o.nf:null; if(!nf || !nf.cnpjEmit) return; /* guia sem nota lida: nao sabemos de quem e a nota */
      var arq={}; var t1=mimeDe(o.arquivoData, o.arquivoNome); if(t1) arq[t1]=1; if(o.nfXmlData) arq.xml=1;
      L.push(base('obr', o, nf, num(o.valor), nf.ym||ymDe(o.competencia), o.vencimento||'', '', arq)); });
    return L;
  }
  function base(fonte, o, nf, valorDigitado, ym, quando, desc, arq){
    var dono=null, alerta='';
    if(nf && nf.cnpjEmit){ var c=clientePorCnpj(nf.cnpjEmit); if(c) dono=c.nome; else if(nf.cnpjEmit===APARAT_CNPJ) dono='APARAT CONTABILIDADE LTDA'; else alerta='emitente '+fmtCnpj(nf.cnpjEmit)+' n\u00e3o \u00e9 cliente cadastrado'; }
    if(!dono){ if(fonte==='obr') return null; dono=nomeOficial(o.cliente); }
    var valor=(nf && nf.valor)?nf.valor:valorDigitado;
    if(nf && nf.valor && valorDigitado && Math.abs(nf.valor-valorDigitado)>0.005) alerta=(alerta?alerta+' \u00b7 ':'')+'valor digitado '+moeda(valorDigitado)+' \u2260 nota '+moeda(nf.valor);
    return {fonte:fonte, id:o.id, ref:fonte+':'+o.id, docCliente:o.cliente||'', cliente:dono, nf:nf, keys:chavesNF(nf), valor:r2(valor), ym:ym||'', quando:quando, numero:(nf&&nf.numero)||o.numero||'', tomador:(nf&&nf.nomeToma)||desc||'', dataEmi:(nf&&nf.dataEmi)||'', arq:arq, cancelada:!!((nf&&nf.cancelada)||/cancel/i.test(String(o.status||''))), outra:!!(nf&&nf.outra), mesmaQue:(nf&&nf.mesmaQue)||'', alerta:alerta, arquivado:o.arquivado===true};
  }
  /* agrupa a mesma nota: chave/numero iguais, "e a mesma" marcado, ou (sem arquivo lido) mesmo mes+valor em abas diferentes */
  function agrupar(L){
    L=L.filter(Boolean); var pai=L.map(function(_,i){ return i; });
    function raiz(i){ while(pai[i]!==i){ pai[i]=pai[pai[i]]; i=pai[i]; } return i; }
    function une(a,b){ a=raiz(a); b=raiz(b); if(a!==b) pai[b]=a; }
    var porKey={}, porRef={};
    L.forEach(function(it,i){ porRef[it.ref]=i; it.keys.forEach(function(k){ var kk=norm(it.cliente)+'#'+k; if(porKey[kk]!=null) une(porKey[kk],i); else porKey[kk]=i; }); });
    L.forEach(function(it,i){ if(it.mesmaQue && porRef[it.mesmaQue]!=null) une(porRef[it.mesmaQue], i); });
    /* regra antiga para quem nao tem arquivo lido */
    L.forEach(function(a,i){ if(a.keys.length || a.outra || !a.ym || !a.valor) return;
      for(var j=0;j<L.length;j++){ var b=L[j]; if(j===i || b.fonte===a.fonte || b.outra || norm(b.cliente)!==norm(a.cliente) || b.ym!==a.ym || Math.round(b.valor*100)!==Math.round(a.valor*100)) continue; une(i,j); break; } });
    var G={};
    L.forEach(function(it,i){ var r=raiz(i); (G[r]=G[r]||[]).push(it); });
    return Object.keys(G).map(function(k){ return grupo(G[k]); });
  }
  function grupo(its){
    var ordem={xml:3,pdf:2,nome:1}; its.sort(function(a,b){ return ((b.nf?ordem[b.nf.origem]||0:0)-(a.nf?ordem[a.nf.origem]||0:0)); });
    var p=its[0], arq={}, cancel=false, valores={};
    its.forEach(function(it){ Object.keys(it.arq).forEach(function(k){ arq[k]=1; }); if(it.cancelada) cancel=true; if(it.valor) valores[Math.round(it.valor*100)]=1; });
    var nnum=''; its.forEach(function(it){ if(!nnum && it.numero) nnum=it.numero; });
    var ym=''; its.forEach(function(it){ if(!ym && it.nf && it.nf.ym) ym=it.nf.ym; }); if(!ym) ym=p.ym;
    var valor=p.valor; if(!valor) its.forEach(function(it){ if(!valor && it.valor) valor=it.valor; });
    return {cliente:p.cliente, ym:ym, valor:valor, numero:nnum, tomador:p.tomador, dataEmi:p.dataEmi||'', itens:its, arq:arq, cancelada:cancel, lida:its.some(function(it){ return it.nf && it.nf.origem!=='nome'; }), conflito:Object.keys(valores).length>1, alerta:its.map(function(it){ return it.alerta; }).filter(Boolean).join(' \u00b7 ')};
  }
  var cacheG=null, cacheV=-1;
  function grupos(){ if(cacheV===versao && cacheG) return cacheG; cacheG=agrupar(itens()); cacheV=versao; return cacheG; }
  function gruposDe(cli, ym){ var k=norm(cli); return grupos().filter(function(g){ return norm(g.cliente)===k && (!ym || g.ym===ym); }); }
  function porMes(cli){ var m={}; gruposDe(cli).forEach(function(g){ if(g.cancelada || !g.ym || !(g.valor>0)) return; var x=m[g.ym]||(m[g.ym]={soma:0,qtd:0,gs:[]}); x.soma=r2(x.soma+g.valor); x.qtd++; x.gs.push(g); }); return m; }
  function clientesComNota(){ var s={}; grupos().forEach(function(g){ if(!g.cancelada && g.valor>0) s[g.cliente]=1; }); return Object.keys(s); }
  /* para o fat-mei.js: notas (ja sem repeticao) no formato dele */
  function notasDe(cli){
    if(ehAdmin()){ var out=[]; gruposDe(cli).forEach(function(g){ if(g.cancelada||!g.ym||!(g.valor>0)) return; out.push({fonte:g.itens[0].fonte==='sol'?'sol':'notas', id:g.itens[0].id, numero:g.numero, valor:g.valor, ym:g.ym, data:brDeISO(g.dataEmi)}); }); return out; }
    var o=[]; FATCLI.forEach(function(f){ if(f.auto!=='notas' || !Array.isArray(f.notasLista)) return; f.notasLista.forEach(function(n){ o.push({fonte:'notas', id:f.id, numero:n.n||'', valor:Number(n.v)||0, ym:f.mesRef, data:n.d||''}); }); }); return o;
  }

  /* =================== 3. LANCAMENTO NO FATURAMENTO =================== */
  function fatDocs(cli, ym){ var k=norm(cli); return FAT.filter(function(f){ return norm(f.cliente)===k && f.mesRef===ym; }); }
  function tipoDe(cli, doc){ var c=clientePorNome(cli); if(c && /mei/i.test(c.regime||'')) return 'MEI'; if(doc && doc.tipo) return doc.tipo; if(c && /epp/i.test(c.regime||'')) return 'EPP'; return 'ME'; }
  function listaCompacta(x){ return x.gs.slice().sort(function(a,b){ return String(a.dataEmi).localeCompare(String(b.dataEmi)); }).slice(0,60).map(function(g){ return {n:g.numero||'', d:brDeISO(g.dataEmi)||'', v:r2(g.valor), t:String(g.tomador||'').slice(0,40), f:g.itens.map(function(i){ return i.fonte; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(','), a:Object.keys(g.arq).join(',')}; }); }
  function divergencias(){
    var out=[]; clientesComNota().forEach(function(cli){ var pm=porMes(cli); Object.keys(pm).forEach(function(ym){ var ds=fatDocs(cli,ym); if(!ds.length) return; var f=ds[0]; if(f.auto==='notas') return;
      var lanc=num(f.faturamento); if(pm[ym].soma>lanc+0.005) out.push({cli:cli, ym:ym, lancado:lanc, notas:pm[ym].soma, id:f.id}); }); });
    return out;
  }
  var sincronizando=false, tentado={};
  async function sincronizar(forcar){
    if(sincronizando || !ehAdmin() || !pronto()) return 0; var d=db(); if(!d) return 0;
    sincronizando=true; var grav=0;
    try{
      var clis=clientesComNota();
      for(var i=0;i<clis.length;i++){ var cli=clis[i], pm=porMes(cli), yms=Object.keys(pm);
        for(var j=0;j<yms.length;j++){ var ym=yms[j], x=pm[ym], lista=listaCompacta(x), sig=r2(x.soma)+'|'+x.qtd+'|'+lista.map(function(n){ return n.n+':'+n.v; }).join(',');
          var ds=fatDocs(cli, ym), f=ds[0], tk=norm(cli)+'|'+ym+'|'+sig; if(!forcar && tentado[tk]) continue; tentado[tk]=1;
          var obs='Pelas notas emitidas no app ('+x.qtd+' nota'+(x.qtd>1?'s':'')+(lista.some(function(n){ return n.n; })?(' n\u00ba '+lista.map(function(n){ return n.n; }).filter(Boolean).join(', ')):'')+'), total '+moeda(x.soma)+'. Atualizado automaticamente em '+agoraBR()+'.';
          var dados={faturamento:r2(x.soma), obs:obs, auto:'notas', notasSoma:r2(x.soma), notasQtd:x.qtd, notasLista:lista, notasSig:sig, autoVer:VER};
          try{
            if(!f){ dados.cliente=cli; dados.mesRef=ym; dados.tipo=tipoDe(cli); dados.despesa=0; await adicionar('faturamento', dados); grav++; }
            else if(f.auto==='notas' && f.notasSig!==sig){ await gravar('faturamento', f.id, dados); grav++; }
          }catch(e2){ console.warn('[fat-auto] n\u00e3o gravou '+cli+' '+ym, e2); }
        } }
      if(grav){ aviso('\ud83d\udcc8 Faturamento atualizado pelas notas ('+grav+' m\u00eas'+(grav>1?'es':'')+').','success'); try{ if(typeof carregarFaturamento==='function') carregarFaturamento(); }catch(e){} }
    }catch(e){ console.warn('[fat-auto] sincronizar', e); }
    sincronizando=false; return grav;
  }
  async function usarNotas(cli, ym){
    var d=db(); if(!d) return; var dv=divergencias().filter(function(x){ return norm(x.cli)===norm(cli) && x.ym===ym; })[0]; if(!dv) return;
    var ok=await escolher('Usar o total das notas?', 'Trocar o faturamento de <b>'+rotulo(ym)+'</b> de <b>'+esc(cli)+'</b> de '+moeda(dv.lancado)+' para <b>'+moeda(dv.notas)+'</b> (total das notas emitidas). As despesas do m\u00eas n\u00e3o mudam.', [{v:'sim',r:'Usar o total das notas',c:'az'},{v:'',r:'Cancelar'}]);
    if(ok!=='sim') return;
    var x=porMes(cli)[ym], lista=listaCompacta(x), sig=r2(x.soma)+'|'+x.qtd+'|'+lista.map(function(n){ return n.n+':'+n.v; }).join(',');
    try{ await gravar('faturamento', dv.id, {faturamento:r2(x.soma), auto:'notas', notasSoma:r2(x.soma), notasQtd:x.qtd, notasLista:lista, notasSig:sig, autoVer:VER, obs:'Ajustado para o total das notas emitidas ('+moeda(x.soma)+') em '+agoraBR()+'. Antes: '+moeda(dv.lancado)+'.'}); aviso('Faturamento de '+rotulo(ym)+' atualizado.','success'); try{ if(typeof carregarFaturamento==='function') carregarFaturamento(); }catch(e){} }
    catch(e){ aviso('N\u00e3o consegui atualizar: '+(e&&e.message?e.message:e),'warn'); }
  }

  /* =================== 4. LER OS ARQUIVOS QUE JA ESTAO NO APP =================== */
  var lendo=false, falhou={};
  function filaLeitura(){
    var q=[];
    SOLS.forEach(function(s){ if(ehPedidoNF(s) && s.respostaArquivoData && !(s.nf && s.nf.v)) q.push({col:'solicitacoes', o:s, du:s.respostaArquivoData, nome:s.respostaArquivoNome||'', du2:s.nfXmlData||''}); });
    NOTAS.forEach(function(n){ if(n.direcao==='entrada' || (n.nf && n.nf.v)) return; if(/pedido|recebimento/i.test(String(n.tipo||''))||String(n.origem||'')==='cliente') return; var du=n.arquivoData||n.pdfData; if(du && /^data:/.test(du)) q.push({col:'notas', o:n, du:du, nome:n.arquivo||n.arquivoNome||'', du2:(n.pdfData&&n.arquivoData&&n.pdfData!==du)?n.pdfData:''}); });
    OBR.forEach(function(o){ if(!ehObrNF(o) || (o.nf && o.nf.v) || !o.arquivoData || !/^data:/.test(o.arquivoData)) return; q.push({col:'obrigacoes', o:o, du:o.arquivoData, nome:o.arquivoNome||'', du2:''}); });
    return q.filter(function(x){ return !falhou[x.col+':'+x.o.id]; });
  }
  async function lerPendentes(max){
    if(lendo || !ehAdmin() || !pronto()) return 0; var d=db(); if(!d) return 0; lendo=true; var n=0;
    try{
      var q=filaLeitura().slice(0, max||3);
      for(var i=0;i<q.length;i++){ var x=q[i], nf=null;
        try{ var u=bytesDeDataUrl(x.du); nf=u?await lerBytes(u, x.nome):null; if(x.du2){ var u2=bytesDeDataUrl(x.du2); var nf2=u2?await lerBytes(u2,''):null; nf=juntarNF(nf, nf2); } }catch(e){ nf=null; }
        falhou[x.col+':'+x.o.id]=1; /* uma tentativa por sessao */
        if(!nf){ nf=novoNF('nada'); nf.erro='arquivo sem nota leg\u00edvel'; nf.faltando=['tudo']; }
        nf.arq=x.nome; nf.automatico=true;
        try{ await gravar(x.col, x.o.id, {nf:nf}); n++; }catch(e){ console.warn('[fat-auto] leitura '+x.col, e); }
      }
    }catch(e){}
    lendo=false; return n;
  }

  /* =================== 5. JANELAS (escolha com botoes) =================== */
  function escolher(titulo, html, bts){
    return new Promise(function(ok){
      var v=el('fa-modal'); if(v) v.remove();
      var m=document.createElement('div'); m.id='fa-modal';
      m.innerHTML='<div class="cx"><h3>'+titulo+'</h3><div class="tx">'+html+'</div><div class="bts">'+bts.map(function(b,i){ return '<button class="bt '+(b.c||'')+'" data-i="'+i+'">'+b.r+'</button>'; }).join('')+'</div></div>';
      m.onclick=function(ev){ var b=ev.target.closest('[data-i]'); if(b){ m.remove(); ok(bts[+b.getAttribute('data-i')].v); } else if(ev.target===m){ m.remove(); ok(''); } };
      document.body.appendChild(m);
    });
  }
  /* confere a nota antes de salvar: ja existe? existe parecida? */
  function verificar(nf, cliDoc, refProprio){
    var dono=null; if(nf && nf.cnpjEmit){ var c=clientePorCnpj(nf.cnpjEmit); dono=c?c.nome:(nf.cnpjEmit===APARAT_CNPJ?'APARAT CONTABILIDADE LTDA':null); }
    dono=dono||nomeOficial(cliDoc); var ks=chavesNF(nf), L=itens().filter(Boolean).filter(function(it){ return it.ref!==refProprio; });
    var ex=L.filter(function(it){ return norm(it.cliente)===norm(dono) && it.keys.some(function(k){ return ks.indexOf(k)>-1; }); });
    var ym=nf.ym, ce=Math.round((nf.valor||0)*100);
    var par=L.filter(function(it){ return ex.indexOf(it)<0 && norm(it.cliente)===norm(dono) && it.ym===ym && ce && Math.round(it.valor*100)===ce; });
    return {dono:dono, exatas:ex, parecidas:par};
  }
  function descItem(it){ return (FONTE_ROT[it.fonte]||it.fonte)+(it.numero?(' \u00b7 n\u00ba '+esc(it.numero)):'')+' \u00b7 '+moeda(it.valor)+(it.quando?(' \u00b7 '+esc(brDeISO(it.quando)||String(it.quando).slice(0,10))):''); }
  /* devolve: 'segue' | 'cancela'; marca nf.outra / nf.mesmaQue conforme a resposta */
  async function confirmarDup(nf, cliDoc, refProprio, bloqueiaExata){
    var R=verificar(nf, cliDoc, refProprio);
    if(R.exatas.length){
      if(!bloqueiaExata){ aviso('\u2139\ufe0f Essa nota j\u00e1 est\u00e1 lan\u00e7ada ('+descItem(R.exatas[0]).replace(/<[^>]+>/g,'')+'). Vai contar uma vez s\u00f3 no faturamento.','info'); return 'segue'; }
      var r=await escolher('\u26d4 Esta nota j\u00e1 est\u00e1 lan\u00e7ada', 'Nota '+(nf.numero?'n\u00ba <b>'+esc(nf.numero)+'</b> ':'')+'de <b>'+esc(R.dono)+'</b>, '+moeda(nf.valor)+', j\u00e1 est\u00e1 no app:<ul>'+R.exatas.map(function(it){ return '<li>'+descItem(it)+'</li>'; }).join('')+'</ul>O faturamento <b>n\u00e3o</b> muda: ela conta uma vez s\u00f3.', [{v:'segue',r:'Salvar este arquivo junto (conta 1 vez)',c:'az'},{v:'cancela',r:'Cancelar'}]);
      return r==='segue'?'segue':'cancela';
    }
    if(R.parecidas.length){
      var p=R.parecidas[0];
      var r2_=await escolher('\u26a0\ufe0f Nota parecida j\u00e1 lan\u00e7ada', 'Mesmo cliente (<b>'+esc(R.dono)+'</b>), mesmo valor ('+moeda(nf.valor)+') e mesmo m\u00eas ('+rotulo(nf.ym)+'), mas '+(p.numero&&nf.numero?('n\u00famero diferente (n\u00ba '+esc(p.numero)+' \u00d7 n\u00ba '+esc(nf.numero)+')'):'sem o mesmo n\u00famero')+':<ul><li>'+descItem(p)+'</li></ul>Pode ser outra nota de verdade. <b>Voc\u00ea decide:</b>', [{v:'outra',r:'\u00c9 outra nota, lan\u00e7ar',c:'az'},{v:'mesma',r:'\u00c9 a mesma nota'},{v:'cancela',r:'Cancelar'}]);
      if(r2_==='outra'){ nf.outra=true; return 'segue'; }
      if(r2_==='mesma'){ nf.mesmaQue=p.ref; return 'segue'; }
      return 'cancela';
    }
    return 'segue';
  }
  function cartao(nf, R, extra){
    if(!nf) return '';
    var lin=function(r,v,falta){ return '<div class="fa-f'+(falta?' falta':'')+'"><span>'+r+(falta?'':' <i>\u2714 autom\u00e1tico</i>')+'</span><b>'+(v||'\u2014 digite')+'</b></div>'; };
    var h='<div class="fa-card"><div class="fa-ct">\ud83e\uddfe Lido do arquivo'+(nf.origem==='xml'?' (XML)':(nf.origem==='pdf'?' (PDF)':''))+'</div><div class="fa-grid">'
      +lin('Emitente', R&&R.dono?esc(R.dono):(nf.nomeEmit?esc(nf.nomeEmit):(nf.cnpjEmit?fmtCnpj(nf.cnpjEmit):'')), !nf.cnpjEmit)
      +lin('N\u00famero'+(nf.serie?' / s\u00e9rie':''), esc(nf.numero)+(nf.serie?' / '+esc(nf.serie):''), !nf.numero)
      +lin('Emiss\u00e3o', brDeISO(nf.dataEmi), !nf.dataEmi)
      +lin('Compet\u00eancia', nf.ym?rotulo(nf.ym):'', !nf.ym)
      +lin('Tomador', esc(nf.nomeToma||''), !nf.nomeToma)
      +lin('Valor da nota', nf.valor?moeda(nf.valor):'', !nf.valor)+'</div>';
    if(nf.cancelada) h+='<div class="fa-box bad">\u26d4 Nota <b>cancelada</b>: n\u00e3o entra no faturamento.</div>';
    if(R){ if(R.exatas.length) h+='<div class="fa-box ok">\u2714 Essa nota j\u00e1 est\u00e1 no app ('+descItem(R.exatas[0])+'). Vai contar <b>uma vez s\u00f3</b>.</div>';
      else if(R.parecidas.length) h+='<div class="fa-box warn">\u26a0\ufe0f Parecida com '+descItem(R.parecidas[0])+'. Ao salvar eu pergunto se \u00e9 a mesma.</div>';
      else if(!nf.cancelada && nf.valor) h+='<div class="fa-box ok">\u2714 Nota nova: vai somar <b>'+moeda(nf.valor)+'</b> em '+rotulo(nf.ym)+' de '+esc(R.dono)+'.</div>'; }
    if(nf.faltando && nf.faltando.length && !nf.cancelada) h+='<div class="fa-box warn">N\u00e3o achei no arquivo: '+nf.faltando.map(function(f){ return {numero:'n\u00famero',valor:'valor',data:'data',emitente:'emitente'}[f]||f; }).join(', ')+'. '+(extra||'')+'</div>';
    if(nf.cnpjEmit===APARAT_CNPJ && R && norm(R.dono)!==norm('APARAT CONTABILIDADE LTDA')) h+='<div class="fa-box warn">Essa nota foi emitida pela APARAT (honor\u00e1rios): conta no faturamento da APARAT, n\u00e3o no do cliente.</div>';
    return h+'</div>';
  }

  /* =================== 6. PREENCHIMENTO AUTOMATICO NAS ABAS =================== */
  var okR=0, okN=0, okG=0, INJ=null; /* {store, dados} - colado no proximo dbAdd/dbUpdate dessa colecao */
  function ligarGravador(){
    if(typeof window.dbAdd==='function' && !window.dbAdd.__faAuto){ var a=window.dbAdd; var na=function(store, data){ if(INJ && store===INJ.store){ data=Object.assign({}, data, INJ.dados); INJ.usado=1; } return a.apply(this,[store,data]); }; for(var k in a){ try{ na[k]=a[k]; }catch(e){} } na.__faAuto=1; window.dbAdd=na; }
    if(typeof window.dbUpdate==='function' && !window.dbUpdate.__faAuto){ var u=window.dbUpdate; var nu=function(store, id, data){ if(INJ && store===INJ.store){ data=Object.assign({}, data, INJ.dados); INJ.usado=1; } return u.apply(this,[store,id,data]); }; for(var k2 in u){ try{ nu[k2]=u[k2]; }catch(e){} } nu.__faAuto=1; window.dbUpdate=nu; }
  }
  function dataUrl(f){ return new Promise(function(ok,err){ var fr=new FileReader(); fr.onload=function(){ ok(fr.result); }; fr.onerror=function(){ err(new Error('n\u00e3o consegui ler o arquivo')); }; fr.readAsDataURL(f); }); }
  function setSel(sel, nome){ if(!sel || !nome) return false; var achou=null; [].forEach.call(sel.options,function(o){ if(!achou && (norm(o.value)===norm(nome) || norm(o.textContent)===norm(nome))) achou=o; }); if(achou){ sel.value=achou.value; try{ sel.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){} return true; } return false; }
  function setVal2(id, v){ var e=el(id); if(e && v!=null && v!==''){ e.value=v; try{ e.dispatchEvent(new Event('input',{bubbles:true})); }catch(x){} e.classList.add('fa-auto'); } }

  /* --- 6a. Solicitacoes > Responder --- */
  var RSP=null;
  function ligarResposta(){
    if(okR || typeof window.apAbrirResposta!=='function' || window.apAbrirResposta.__faAuto) return; okR=1;
    var orig=window.apAbrirResposta;
    var nv=async function(id){ var r=await orig.apply(this, arguments); try{ melhorarResposta(id); }catch(e){ console.warn('[fat-auto] resposta', e); } return r; };
    for(var k in orig){ try{ nv[k]=orig[k]; }catch(e){} } nv.__faAuto=1; window.apAbrirResposta=nv;
  }
  function melhorarResposta(id){
    var m=el('ap-rsp-modal'), fi=el('ap-rsp-file'), env=el('ap-rsp-env'); if(!m || !fi || !env || el('fa-rsp-xml')) return;
    var s=SOLS.filter(function(x){ return x.id===id; })[0]; if(!s || !ehPedidoNF(s)) return;
    RSP={id:id, cli:s.cliente||'', nfA:null, nfX:null, nf:null, xml:null};
    var box=document.createElement('div'); box.id='fa-rsp';
    box.innerHTML='<label>XML da mesma nota (opcional \u00b7 conta uma vez s\u00f3)</label><input id="fa-rsp-xml" type="file" accept=".xml,text/xml"/><div id="fa-rsp-info"><div class="fa-dica">Anexe o PDF (e, se quiser, o XML): eu leio n\u00famero, data e valor sozinho.</div></div>';
    fi.parentNode.insertBefore(box, fi.nextSibling);
    async function atual(){ RSP.nf=juntarNF(RSP.nfA, RSP.nfX); var inf=el('fa-rsp-info'); if(!inf) return;
      if(!RSP.nf){ inf.innerHTML=(RSP.lendo?'<div class="fa-dica">\u23f3 Lendo a nota...</div>':''); return; }
      var R=verificar(RSP.nf, RSP.cli, 'sol:'+id); inf.innerHTML=cartao(RSP.nf, R, 'O valor que conta \u00e9 o do pedido ('+(s.valor?('R$ '+esc(s.valor)):'n\u00e3o informado')+').'); }
    async function ler(inp, campo){ var f=inp.files&&inp.files[0]; RSP[campo]=null; if(campo==='nfX') RSP.xml=null; if(!f){ atual(); return; } RSP.lendo=1; atual();
      try{ RSP[campo]=await lerArquivo(f); if(campo==='nfX' && RSP.nfX){ if(RSP.nfX.origem!=='xml'){ aviso('\u26a0 Esse arquivo n\u00e3o \u00e9 o XML de uma nota.','warn'); RSP.nfX=null; } else RSP.xml={nome:f.name, data:await dataUrl(f)}; } }catch(e){ RSP[campo]=null; }
      RSP.lendo=0; if(!RSP[campo] && campo==='nfA' && /\.(pdf|xml)$/i.test(f.name)) aviso('N\u00e3o consegui ler a nota desse arquivo \u2014 confira o valor no pedido.','warn'); atual(); }
    fi.addEventListener('change', function(){ ler(fi,'nfA'); });
    el('fa-rsp-xml').addEventListener('change', function(){ ler(el('fa-rsp-xml'),'nfX'); });
    var origClick=env.onclick;
    env.onclick=async function(ev){
      var R0=RSP; if(!R0 || R0.id!==id){ return origClick && origClick.call(env, ev); }
      if(R0.lendo){ aviso('\u23f3 Ainda lendo a nota, um instante...','info'); return; }
      if(R0.nf){
        var resp=await confirmarDup(R0.nf, R0.cli, 'sol:'+id, false); if(resp==='cancela') return;
        var dados={nf:R0.nf}; if(R0.xml && (R0.xml.data.length<300000)){ dados.nfXmlData=R0.xml.data; dados.nfXmlNome=R0.xml.nome; }
        try{ await gravar('solicitacoes', id, dados); }catch(e){ console.warn('[fat-auto] nf na solicita\u00e7\u00e3o', e); }
      }
      return origClick && origClick.call(env, ev);
    };
  }

  /* --- 6b. Notas Fiscais > Registrar --- */
  var NFF={nfA:null, nfX:null, nf:null, xml:null};
  function montarNotas(){
    var fi=el('nf-file'); if(!fi || el('fa-nf-xml')) return;
    var alvo=el('nf-file-preview')||fi.parentNode; var box=document.createElement('div'); box.id='fa-nf';
    box.innerHTML='<div class="fa-xmlln"><label>\u2795 XML da mesma nota (opcional \u00b7 conta uma vez s\u00f3) <input id="fa-nf-xml" type="file" accept=".xml,text/xml"/></label></div><div id="fa-nf-info"></div>';
    alvo.parentNode.insertBefore(box, alvo.nextSibling);
    fi.addEventListener('change', function(){ lerNF(fi,'nfA'); });
    el('fa-nf-xml').addEventListener('change', function(){ lerNF(el('fa-nf-xml'),'nfX'); });
  }
  async function lerNF(inp, campo){
    var f=inp.files&&inp.files[0]; NFF[campo]=null; if(campo==='nfX') NFF.xml=null;
    if(f){ var inf=el('fa-nf-info'); if(inf) inf.innerHTML='<div class="fa-dica">\u23f3 Lendo a nota...</div>'; try{ NFF[campo]=await lerArquivo(f); if(campo==='nfX'&&NFF.nfX){ if(NFF.nfX.origem!=='xml') NFF.nfX=null; else NFF.xml={nome:f.name, data:await dataUrl(f)}; } }catch(e){ NFF[campo]=null; } }
    NFF.nf=juntarNF(NFF.nfA, NFF.nfX); preencherNotas();
  }
  function preencherNotas(){
    var nf=NFF.nf, inf=el('fa-nf-info'); if(!inf) return; if(!nf){ inf.innerHTML=''; return; }
    var R=verificar(nf, (el('nf-cli')||{}).value||'', '');
    if(R.dono) setSel(el('nf-cli'), R.dono);
    if(nf.cnpjEmit && clientePorCnpj(nf.cnpjEmit)) setSel(el('nf-tipo'),'Envio');
    if(nf.numero) setVal2('nf-num', nf.numero);
    if(nf.valor) setVal2('nf-val', valBR(nf.valor));
    if(nf.dataEmi) setVal2('nf-data', nf.dataEmi);
    var dsc=(el('nf-desc')||{}).value||''; if(nf.nomeToma && (!dsc || /^Tomador: /.test(dsc))) setVal2('nf-desc', 'Tomador: '+nf.nomeToma);
    inf.innerHTML=cartao(nf, R, 'Preencha o que faltou nos campos acima.');
  }
  function ligarNotas(){
    if(okN || typeof window.enviarNota!=='function' || window.enviarNota.__faAuto) return; okN=1;
    var orig=window.enviarNota;
    var nv=async function(){
      var nf=NFF.nf;
      if(nf){
        var cli=(el('nf-cli')||{}).value||'', v=num((el('nf-val')||{}).value);
        if(v && !nf.valor){ nf.valor=v; nf.faltando=nf.faltando.filter(function(x){ return x!=='valor'; }); }
        var eid=(typeof editNfId!=='undefined'&&editNfId)?('nota:'+editNfId):''; var resp=await confirmarDup(nf, cli, eid, true); if(resp==='cancela') return;
        var dados={nf:nf}; if(NFF.xml && NFF.xml.data.length<300000){ dados.nfXmlData=NFF.xml.data; dados.nfXmlNome=NFF.xml.nome; }
        INJ={store:'notas', dados:dados};
      }
      try{ return await orig.apply(this, arguments); }
      finally{ var usou=INJ&&INJ.usado; INJ=null; if(usou){ NFF={nfA:null,nfX:null,nf:null,xml:null}; var x=el('fa-nf-xml'); if(x) x.value=''; var inf=el('fa-nf-info'); if(inf) inf.innerHTML=''; } }
    };
    for(var k in orig){ try{ nv[k]=orig[k]; }catch(e){} } nv.__faAuto=1; window.enviarNota=nv;
  }

  /* --- 6c. Guias (NF-e Emitida) --- */
  var GUI={nf:null};
  function montarGuias(){
    var fi=el('gan-file'); if(!fi || fi.__faAuto) return; fi.__faAuto=1;
    var box=document.createElement('div'); box.id='fa-gui-info'; fi.parentNode.appendChild(box);
    fi.addEventListener('change', async function(){
      GUI.nf=null; box.innerHTML=''; var f=fi.files&&fi.files[0]; if(!f || !/\.(pdf|xml)$/i.test(f.name)) return;
      var tipo=(el('ob-tipo')||{}).value||''; var nf=null; try{ nf=await lerArquivo(f); }catch(e){}
      if(!nf || (!nf.chave && !nf.numero)) return; /* boleto/guia comum: nao e nota */
      GUI.nf=nf; if(!/nf|nota/i.test(tipo)) setSel(el('ob-tipo'),'NF-e Emitida');
      var R=verificar(nf, (el('ob-cli')||{}).value||'', '');
      if(nf.valor) setVal2('ob-val', nf.valor.toFixed(2));
      if(nf.ym) setVal2('ob-comp', nf.ym.slice(5,7)+'/'+nf.ym.slice(0,4));
      if(R.dono && clientePorCnpj(nf.cnpjEmit) && nf.cnpjEmit!==APARAT_CNPJ) setSel(el('ob-cli'), R.dono);
      box.innerHTML=cartao(nf, R, '');
    });
  }
  function ligarGuias(){
    if(okG || typeof window.lancarObrigacao!=='function' || window.lancarObrigacao.__faAuto) return; okG=1;
    var orig=window.lancarObrigacao;
    var nv=async function(){
      var nf=GUI.nf, tipo=(el('ob-tipo')||{}).value||'';
      if(nf && /nf|nota/i.test(tipo)){ var oid=(typeof editObId!=='undefined'&&editObId)?('obr:'+editObId):''; var resp=await confirmarDup(nf, (el('ob-cli')||{}).value||'', oid, true); if(resp==='cancela') return; INJ={store:'obrigacoes', dados:{nf:nf}}; }
      try{ return await orig.apply(this, arguments); }
      finally{ var usou=INJ&&INJ.usado; INJ=null; if(usou){ GUI.nf=null; var b=el('fa-gui-info'); if(b) b.innerHTML=''; } }
    };
    for(var k in orig){ try{ nv[k]=orig[k]; }catch(e){} } nv.__faAuto=1; window.lancarObrigacao=nv;
  }

  /* =================== 7. EXTRATO OFX: mes, conta e lancamentos repetidos =================== */
  function lerOFXbasico(txt){
    function g(n,b){ var r=String(b).match(new RegExp('<'+n+'>\\s*([^<\\r\\n]*)','i')); return r?r[1].trim():''; }
    var trs=[], re=/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi, m;
    while((m=re.exec(txt))){ var b=m[1], dt=g('DTPOSTED',b).slice(0,8), v=g('TRNAMT',b), memo=(g('MEMO',b)||g('NAME',b)), fid=g('FITID',b);
      trs.push({bloco:m[0], ym:dt.length===8?(dt.slice(0,4)+'-'+dt.slice(4,6)):'', id:fid?('F'+fid):('H'+dt+'|'+v+'|'+memo.slice(0,40)), v:parseFloat(String(v).replace(',','.'))||0}); }
    var conta=[g('BANKID',txt), g('BRANCHID',txt), g('ACCTID',txt)].filter(Boolean).join('-');
    var cont={}; trs.forEach(function(t){ if(t.ym) cont[t.ym]=(cont[t.ym]||0)+1; }); var mes=Object.keys(cont).sort(function(a,b){ return cont[b]-cont[a]; })[0]||'';
    return {trs:trs, conta:conta, banco:g('BANKID',txt)||g('ORG',txt), ini:g('DTSTART',txt).slice(0,8), fim:g('DTEND',txt).slice(0,8), mes:mes, meses:cont};
  }
  function d8(s){ return s&&s.length===8?(s.slice(6,8)+'/'+s.slice(4,6)+'/'+s.slice(0,4)):''; }
  var EXP=null; /* extrato escolhido e ainda nao salvo */
  async function analisarExtrato(f){
    var box=el('fa-ex-info'); var mod=el('ap-ext-modal'), h3=mod&&mod.querySelector('h3'), bt=el('ex-msalva');
    var cli=h3?String(h3.textContent||'').replace(/^[^\w\u00c0-\u00ff\d]+/,'').trim():''; var mm=bt?String(bt.textContent||'').toLowerCase().match(/([a-z\u00e7]+)\/(\d{4})/):null;
    var cp=mm&&MESES_L.indexOf(mm[1])>-1?(mm[2]+'-'+String(MESES_L.indexOf(mm[1])+1).padStart(2,'0')):'';
    if(!/\.ofx$/i.test(f.name)){ EXP=null; if(box) box.innerHTML=''; return; }
    var u=await lerFile(f), txt=decod(u), O=lerOFXbasico(txt); if(!O.trs.length){ EXP=null; return; }
    var d=db(), outros=[]; try{ var s=await d.collection('extratos').get(); s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; if(o.ofx) outros.push(o); }); }catch(e){}
    var meus=outros.filter(function(o){ return norm(o.cliente)===norm(cli) && o.competencia!==cp; }), ja={}, ondeJa={};
    meus.forEach(function(o){ (o.ofx.ids||[]).forEach(function(i){ ja[i]=1; ondeJa[i]=o.competencia; }); });
    var dono=outros.filter(function(o){ return O.conta && o.ofx.conta===O.conta && norm(o.cliente)!==norm(cli); })[0];
    var rep=O.trs.filter(function(t){ return ja[t.id]; }), fora=O.trs.filter(function(t){ return !ja[t.id] && cp && t.ym && t.ym!==cp; });
    var mesesRep={}; rep.forEach(function(t){ mesesRep[ondeJa[t.id]]=1; });
    EXP={nome:f.name, tamanho:f.size, cli:cli, cp:cp, O:O, rep:rep.length, fora:fora.length, ts:Date.now(), txt:txt};
    var h='<div class="fa-card"><div class="fa-ct">\ud83c\udfe6 Lido do extrato</div><div class="fa-grid">'
      +'<div class="fa-f"><span>Banco / conta <i>\u2714 autom\u00e1tico</i></span><b>'+esc(O.banco||'?')+(O.conta?' \u00b7 '+esc(O.conta.split('-').slice(1).join('-')):'')+'</b></div>'
      +'<div class="fa-f"><span>Per\u00edodo do arquivo <i>\u2714 autom\u00e1tico</i></span><b>'+d8(O.ini)+' a '+d8(O.fim)+'</b></div>'
      +'<div class="fa-f"><span>M\u00eas com mais lan\u00e7amentos <i>\u2714 autom\u00e1tico</i></span><b>'+(O.mes?rotulo(O.mes):'?')+'</b></div>'
      +'<div class="fa-f"><span>Lan\u00e7amentos no arquivo</span><b>'+O.trs.length+'</b></div></div>';
    if(dono) h+='<div class="fa-box bad">\u26d4 Esta conta j\u00e1 apareceu nos extratos de <b>'+esc(dono.cliente)+'</b>. Confira se escolheu o cliente certo.</div>';
    if(cp && O.mes && O.mes!==cp) h+='<div class="fa-box warn">\u26a0\ufe0f O arquivo \u00e9 de <b>'+rotulo(O.mes)+'</b>, mas voc\u00ea est\u00e1 salvando em <b>'+rotulo(cp)+'</b>.</div>';
    if(rep.length===O.trs.length) h+='<div class="fa-box bad">\u26d4 <b>Este extrato j\u00e1 foi enviado</b> ('+Object.keys(mesesRep).map(rotulo).join(', ')+'). Se salvar, nenhum lan\u00e7amento conta de novo.</div>';
    else if(rep.length) h+='<div class="fa-box warn">\u26a0\ufe0f '+rep.length+' lan\u00e7amento'+(rep.length>1?'s':'')+' deste arquivo j\u00e1 estava'+(rep.length>1?'m':'')+' no extrato de '+Object.keys(mesesRep).map(rotulo).join(', ')+'. N\u00e3o v\u00e3o contar de novo.</div>';
    if(fora.length) h+='<div class="fa-box warn">\u26a0\ufe0f '+fora.length+' lan\u00e7amento'+(fora.length>1?'s s\u00e3o':' \u00e9')+' de outro m\u00eas (fora de '+rotulo(cp)+'). N\u00e3o entram no resumo deste m\u00eas.</div>';
    var conta=O.trs.length-rep.length-fora.length;
    if(conta>0 && conta<O.trs.length) h+='<div class="fa-box ok">\u2714 V\u00e3o contar <b>'+conta+'</b> lan\u00e7amentos de '+rotulo(cp)+'.</div>';
    else if(conta===O.trs.length) h+='<div class="fa-box ok">\u2714 Nenhum lan\u00e7amento repetido.</div>';
    if(box) box.innerHTML=h+'</div>';
    setTimeout(casarExtrato, 2500); setTimeout(casarExtrato, 8000); setTimeout(casarExtrato, 20000); setTimeout(casarExtrato, 45000);
  }
  async function casarExtrato(){
    var P=EXP, d=db(); if(!P || !d || !P.cli || !P.cp || P.feito) return; if(Date.now()-P.ts>15*60000){ EXP=null; return; }
    try{
      var s=await d.collection('extratos').where('cliente','==',P.cli).get(), doc=null;
      s.forEach(function(x){ var o=x.data()||{}; if(o.competencia===P.cp && o.arquivoNome===P.nome && Number(o.tamanho)===Number(P.tamanho) && Number(o.ts||0)>=P.ts-120000){ o.id=x.id; doc=o; } });
      if(!doc) return;
      var r=doc.resumo; if(!(r && r.v) && Date.now()-P.ts<30000) return; /* espera o resumo do extrato-resumo.js */
      P.feito=1;
      var outros=[]; var s2=await d.collection('extratos').where('cliente','==',P.cli).get(); s2.forEach(function(x){ var o=x.data()||{}; if(x.id!==doc.id && o.ofx && o.competencia!==P.cp) outros.push(o); });
      var ja={}; outros.forEach(function(o){ (o.ofx.ids||[]).forEach(function(i){ ja[i]=1; }); });
      var fica=P.O.trs.filter(function(t){ return !ja[t.id] && (!t.ym || t.ym===P.cp); });
      var upd={ofx:{conta:P.O.conta, banco:P.O.banco, inicio:d8(P.O.ini), fim:d8(P.O.fim), mesArquivo:P.O.mes, qtd:P.O.trs.length, repetidos:P.O.trs.filter(function(t){ return ja[t.id]; }).length, foraDoMes:P.O.trs.filter(function(t){ return !ja[t.id] && t.ym && t.ym!==P.cp; }).length, ids:fica.map(function(t){ return t.id.slice(0,60); }).slice(0,2500), lidoEm:agoraBR(), ver:VER}};
      if(fica.length<P.O.trs.length && window.__EXTRES__ && typeof __EXTRES__.lerOFX==='function'){
        var cab=P.txt.split(/<STMTTRN>/i)[0], fim=P.txt.slice(P.txt.toUpperCase().lastIndexOf('</STMTTRN>')+10);
        var novo=cab+fica.map(function(t){ return t.bloco; }).join('\n')+fim;
        try{ if(fica.length){ var rl=__EXTRES__.lerOFX(novo); rl.filtro={repetidos:upd.ofx.repetidos, foraDoMes:upd.ofx.foraDoMes, original:{entradas:r?r.entradas:null, saidas:r?r.saidas:null}}; upd.resumo=rl; }
          else upd.resumo={v:2, fonte:'OFX', banco:r?r.banco:'', inicio:'', fim:'', entradas:0, saidas:0, qtdEntradas:0, qtdSaidas:0, qtd:0, ignorados:{}, saidasLista:[], creditosTransf:[], maioresEntradas:[], lidoEm:agoraBR(), filtro:{repetidos:upd.ofx.repetidos, foraDoMes:upd.ofx.foraDoMes}};
          if(r) upd.resumoOriginal=r; }catch(e){ console.warn('[fat-auto] resumo filtrado', e); }
      }
      if(window.__FATAUTO_SECO__) (window.__FATAUTO_LOG__=window.__FATAUTO_LOG__||[]).push({op:'set', col:'extratos', id:doc.id, dados:upd}); else await d.collection('extratos').doc(String(doc.id)).set(upd,{merge:true});
      if(upd.resumo) aviso('\ud83c\udfe6 Extrato salvo sem repeti\u00e7\u00e3o: contam '+fica.length+' de '+P.O.trs.length+' lan\u00e7amentos (entradas '+moeda(upd.resumo.entradas)+').','success');
      try{ if(window.__EXTRES__) __EXTRES__.carregar(true); }catch(e){}
      EXP=null;
    }catch(e){ console.warn('[fat-auto] casar extrato', e); }
  }
  document.addEventListener('change', function(ev){ var t=ev.target; if(!t || t.id!=='ex-mfile') return; var f=t.files&&t.files[0]; if(!f || !ehAdmin()) return;
    var up=el('ex-mup'); if(up && !el('fa-ex-info')){ var b=document.createElement('div'); b.id='fa-ex-info'; var sv=el('ex-msalva'); var at=sv?sv.closest('.bts'):null; if(at) up.insertBefore(b, at); else up.appendChild(b); }
    analisarExtrato(f).catch(function(e){ console.warn('[fat-auto] extrato', e); }); }, true);

  /* =================== 8. PAINEL FATURAMENTO E APP DO CLIENTE =================== */
  var S={cli:'', ym:''}, ass='';
  function extratoResumo(cli, ym){ try{ if(!window.__EXTRES__) return null; var c=__EXTRES__.estado().cache||{}, ks=Object.keys(c); for(var i=0;i<ks.length;i++){ var o=c[ks[i]]; if(norm(o.cliente)===norm(cli) && o.competencia===ym && o.resumo && o.resumo.v){ var C=__EXTRES__.contas(o.resumo, o.cliente); return {receita:C.receita, despesa:C.despesa}; } } }catch(e){} return null; }
  function painel(){
    var pg=el('pp-faturamento'); if(!pg || !pg.classList.contains('active')) return;
    var box=el('fa-box'); if(!box){ box=document.createElement('div'); box.id='fa-box'; var alvo=el('fm-box')||el('fg-box')||[].slice.call(pg.querySelectorAll('.sec')).filter(function(s){ return /lan[c\u00e7]amentos/i.test(s.textContent||''); })[0]; if(alvo) alvo.parentNode.insertBefore(box, alvo); else pg.appendChild(box); }
    var a=versao+'|'+S.cli+'|'+S.ym+'|'+claro()+'|'+filaLeitura().length; if(a===ass) return; ass=a;
    if(!pronto()){ box.innerHTML='<div class="fa-tit">\ud83e\uddfe Faturamento pelas notas</div><div class="fa-sub">Carregando as notas...</div>'; return; }
    var clis=clientesComNota().sort(function(x,y){ return x.localeCompare(y); }), dv=divergencias(), fila=filaLeitura().length;
    if(!S.cli || clis.indexOf(S.cli)<0) S.cli=clis[0]||'';
    var pm=S.cli?porMes(S.cli):{}, todosG=S.cli?gruposDe(S.cli):[], yms={}; todosG.forEach(function(g){ if(g.ym) yms[g.ym]=1; }); var ymL=Object.keys(yms).sort().reverse();
    if(!S.ym || ymL.indexOf(S.ym)<0) S.ym=ymL[0]||'';
    var gs=todosG.filter(function(g){ return g.ym===S.ym; }), tot=0, rep=0;
    var h='<div class="fa-top"><div class="fa-tit">\ud83e\uddfe Notas que formam o faturamento <span class="fa-sub2">MEI e ME \u00b7 cada nota conta uma vez</span></div>'
      +'<div class="fa-sel"><select id="fa-cli">'+clis.map(function(c){ return '<option'+(c===S.cli?' selected':'')+'>'+esc(c)+'</option>'; }).join('')+'</select>'
      +'<select id="fa-ym">'+ymL.map(function(y){ return '<option value="m'+y+'"'+(y===S.ym?' selected':'')+'>'+rotulo(y).replace('/',' de ')+'</option>'; }).join('')+'</select></div></div>'; /* valor "m" + texto "Out de 2026": o aparat-fix nao enche este seletor com 48 meses */
    if(fila) h+='<div class="fa-box warn">\u23f3 Lendo '+fila+' arquivo'+(fila>1?'s':'')+' de nota que j\u00e1 estava'+(fila>1?'m':'')+' no app (uma vez s\u00f3)...</div>';
    dv.forEach(function(x){ h+='<div class="fa-box warn">\u26a0\ufe0f <b>'+esc(x.cli)+'</b> \u2014 '+rotulo(x.ym)+': lan\u00e7ado '+moeda(x.lancado)+', mas as notas somam '+moeda(x.notas)+'. <button class="fa-btn" data-usar="'+esc(x.cli)+'|'+x.ym+'">Usar o total das notas</button></div>'; });
    h+='<div class="fa-tw"><table class="fa-tab"><thead><tr><th>Nota</th><th>Emiss\u00e3o</th><th>Tomador</th><th>Arquivos</th><th>Entrou por</th><th class="r">Valor</th><th>Conta?</th></tr></thead><tbody>';
    gs.sort(function(a,b){ return String(a.dataEmi).localeCompare(String(b.dataEmi)); }).forEach(function(g){
      var tags=(g.arq.pdf?'<span class="fa-tag t1">PDF</span>':'')+(g.arq.xml?'<span class="fa-tag t2">XML</span>':'')+(!g.lida?'<span class="fa-tag t3">sem leitura</span>':'');
      var fontes=g.itens.map(function(i){ return FONTE_ROT[i.fonte]; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(' + ');
      var conta=g.cancelada?'\u2716 cancelada':'\u2714'; if(!g.cancelada) tot+=g.valor;
      h+='<tr'+(g.cancelada?' class="risc"':'')+'><td>'+(g.itens[0].nf&&/^NFSe/.test(g.itens[0].nf.tipo)?'NFS-e ':'NF ')+esc(g.numero||'s/ n\u00ba')+(g.conflito?' <span class="fa-tag t3" title="valores diferentes entre os arquivos">valores diferentes</span>':'')+(g.alerta?'<div class="fa-mini">'+esc(g.alerta)+'</div>':'')+'</td><td>'+(brDeISO(g.dataEmi)||'\u2014')+'</td><td>'+esc(String(g.tomador||'\u2014').slice(0,34))+'</td><td>'+tags+'</td><td>'+fontes+'</td><td class="r">'+moeda(g.valor)+'</td><td>'+conta+'</td></tr>';
      if(g.itens.length>1){ g.itens.slice(1).forEach(function(it){ rep++; h+='<tr class="risc"><td>'+esc(g.numero||'')+' (repetida)</td><td></td><td></td><td>'+Object.keys(it.arq).map(function(k){ return '<span class="fa-tag '+(k==='xml'?'t2':'t1')+'">'+k.toUpperCase()+'</span>'; }).join('')+'</td><td>'+FONTE_ROT[it.fonte]+'</td><td class="r">'+moeda(it.valor)+'</td><td>\u2716 j\u00e1 contada</td></tr>'; }); }
    });
    if(!gs.length) h+='<tr><td colspan="7" class="fa-mini">Nenhuma nota neste m\u00eas.</td></tr>';
    var f=S.cli&&S.ym?fatDocs(S.cli,S.ym)[0]:null;
    h+='<tr class="fa-tot"><th colspan="5">Faturamento de '+(S.ym?rotulo(S.ym):'\u2014')+' pelas notas'+(rep?(' ('+rep+' repetida'+(rep>1?'s':'')+' ignorada'+(rep>1?'s':'')+')'):'')+'</th><th class="r">'+moeda(tot)+'</th><th></th></tr></tbody></table></div>';
    if(f) h+='<div class="fa-mini">No Controle de Faturamento: '+moeda(num(f.faturamento))+' \u00b7 '+(f.auto==='notas'?'\ud83e\uddfe autom\u00e1tico pelas notas':(/extrato/i.test(f.obs||'')?'\ud83c\udfe6 lan\u00e7ado pelo extrato':'\u270d\ufe0f lan\u00e7ado \u00e0 m\u00e3o'))+'</div>';
    var ex=S.cli&&S.ym?extratoResumo(S.cli,S.ym):null;
    if(ex) h+='<div class="fa-box ok">\ud83c\udfe6 Confer\u00eancia com o extrato de '+rotulo(S.ym)+': entrou na conta '+moeda(ex.receita)+' \u00b7 notas '+moeda(tot)+(ex.receita-tot>0.005?(' \u00b7 <b>sem nota '+moeda(ex.receita-tot)+'</b>'):'')+'. As notas valem; o extrato n\u00e3o soma por cima.</div>';
    h+='<div class="fa-mini">A nota conta para o cliente dono do CNPJ que a emitiu. Nota da APARAT (honor\u00e1rios) conta para a APARAT. Lan\u00e7amento feito \u00e0 m\u00e3o nunca \u00e9 trocado sozinho.</div>';
    box.innerHTML=h;
    el('fa-cli').onchange=function(){ S.cli=this.value; S.ym=''; ass=''; painel(); };
    el('fa-ym').onchange=function(){ S.ym=String(this.value).replace(/^m/,''); ass=''; painel(); };
    [].forEach.call(box.querySelectorAll('[data-usar]'),function(b){ b.onclick=function(){ var p=b.getAttribute('data-usar').split('|'); usarNotas(p[0],p[1]); }; });
  }
  /* app do cliente: lista das notas do mes escolhido (vem de faturamento.notasLista) */
  var FATCLI=[], tFC=0, assC='';
  function clienteApp(){
    var nome=clienteAtual(), alvo=el('cli-fat'); if(!nome || !alvo || alvo.offsetParent===null) return;
    var d=db(); if(d && Date.now()-tFC>60000){ tFC=Date.now(); d.collection('faturamento').where('cliente','==',nome).get().then(function(s){ var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); FATCLI=a; assC=''; clienteApp(); }).catch(function(){}); }
    var sel=el('cli-fat-mes'), ym=sel?sel.value:''; if(!ym){ var ms=FATCLI.map(function(f){ return f.mesRef; }).sort(); ym=ms[ms.length-1]||''; }
    var f=FATCLI.filter(function(x){ return x.mesRef===ym && x.auto==='notas' && Array.isArray(x.notasLista); })[0];
    var box=el('fa-cli-box'); if(!box){ box=document.createElement('div'); box.id='fa-cli-box'; var mb=el('cli-fat-mesbox'); if(mb) mb.parentNode.insertBefore(box, mb.nextSibling); else alvo.appendChild(box); }
    var a=ym+'|'+(f?f.notasSig:'')+'|'+claro(); if(a===assC) return; assC=a;
    if(!f){ box.innerHTML=''; box.style.display='none'; return; } box.style.display='';
    box.innerHTML='<div class="fa-tit">\ud83e\uddfe Notas que formam o faturamento de '+rotulo(ym)+'</div><table class="fa-tab"><thead><tr><th>Nota</th><th>Data</th><th>Tomador</th><th class="r">Valor</th></tr></thead><tbody>'
      +f.notasLista.map(function(n){ return '<tr><td>'+esc(n.n||'s/ n\u00ba')+'</td><td>'+esc(n.d||'\u2014')+'</td><td>'+esc(n.t||'\u2014')+'</td><td class="r">'+moeda(n.v)+'</td></tr>'; }).join('')
      +'<tr class="fa-tot"><th colspan="3">Total ('+f.notasLista.length+' nota'+(f.notasLista.length>1?'s':'')+')</th><th class="r">'+moeda(f.notasSoma)+'</th></tr></tbody></table><div class="fa-mini">Cada nota conta uma vez s\u00f3, mesmo que tenha PDF e XML. Vendeu sem nota? Avise o escrit\u00f3rio.</div>';
  }

  /* =================== estilo e laco =================== */
  function css(){
    if(el('fa-css')) return; var s=document.createElement('style'); s.id='fa-css';
    s.textContent='#fa-box,#fa-cli-box{border:1.5px solid rgba(51,85,255,.5);border-radius:16px;padding:14px;margin:14px 0;background:rgba(51,85,255,.06)}'
      +'.fa-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.fa-tit{font-weight:800;font-size:15px;margin-bottom:6px}.fa-sub2{font-weight:600;font-size:11px;opacity:.65;margin-left:6px}'
      +'.fa-sel{display:flex;gap:6px;flex-wrap:wrap}.fa-sel select{width:auto!important;max-width:260px;padding:5px 8px;border-radius:8px;border:1px solid rgba(128,128,160,.4);background:transparent;color:inherit;font-size:12px}'
      +'.fa-tw{overflow:auto}.fa-tab{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}.fa-tab th{text-align:left;font-size:10.5px;opacity:.75;padding:6px 8px;border-bottom:1px solid rgba(128,128,160,.3)}.fa-tab td{padding:7px 8px;border-bottom:1px solid rgba(128,128,160,.15)}.fa-tab .r{text-align:right;white-space:nowrap}'
      +'.fa-tab tr.risc td{text-decoration:line-through;opacity:.5}.fa-tab tr.fa-tot th{opacity:1;font-size:12px;border-top:1px solid rgba(128,128,160,.4)}'
      +'.fa-tag{display:inline-block;font-size:10px;border-radius:20px;padding:1px 7px;font-weight:700;margin-right:3px;text-decoration:none}.fa-tag.t1{background:rgba(51,85,255,.18);color:#6b8afd}.fa-tag.t2{background:rgba(32,184,122,.18);color:#20b87a}.fa-tag.t3{background:rgba(245,165,36,.2);color:#d98c00}'
      +'.fa-mini{font-size:10.5px;opacity:.72;margin-top:6px;line-height:1.4}.fa-sub{font-size:11px;opacity:.7}.fa-dica{font-size:11px;opacity:.75;margin-top:6px}'
      +'.fa-box{border-radius:10px;padding:8px 10px;margin-top:8px;font-size:12px;line-height:1.45}.fa-box.ok{background:rgba(32,184,122,.12);border:1px solid rgba(32,184,122,.45)}.fa-box.warn{background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.5)}.fa-box.bad{background:rgba(229,72,77,.12);border:1px solid rgba(229,72,77,.5)}'
      +'.fa-btn{border:1px solid rgba(51,85,255,.7);background:rgba(51,85,255,.15);color:inherit;border-radius:8px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer;margin-left:6px}'
      +'.fa-card{border:1px solid rgba(51,85,255,.4);border-radius:12px;padding:10px;margin-top:10px;background:rgba(51,85,255,.05)}.fa-ct{font-weight:800;font-size:12.5px;margin-bottom:6px}'
      +'.fa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}.fa-f span{display:block;font-size:10px;opacity:.7}.fa-f span i{color:#20b87a;font-style:normal;font-weight:700}.fa-f b{display:block;font-size:12.5px;border:1px solid rgba(128,128,160,.3);border-radius:8px;padding:5px 8px;margin-top:2px;word-break:break-word}.fa-f.falta b{border-color:#f5a524;color:#d98c00}'
      +'.fa-xmlln{margin:2px 0 8px;font-size:11px}.fa-xmlln label{display:block;font-size:11px;opacity:.85}.fa-xmlln input,#fa-rsp input{width:100%!important;font-size:12px;margin-top:4px}input.fa-auto,select.fa-auto{box-shadow:0 0 0 2px rgba(32,184,122,.55)!important}'
      +'#fa-modal{position:fixed;inset:0;background:rgba(6,12,26,.66);display:flex;align-items:center;justify-content:center;z-index:100000;padding:14px}#fa-modal .cx{background:var(--card,#14142e);color:inherit;border:1px solid var(--border,#333);border-radius:16px;max-width:480px;width:100%;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.5);font-size:13px;line-height:1.5}'
      +'#fa-modal h3{margin:0 0 8px;font-size:15px}#fa-modal ul{margin:6px 0 6px 18px;padding:0}#fa-modal .bts{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}#fa-modal .bt{font-size:12.5px;font-weight:700;padding:9px 13px;border-radius:10px;border:1px solid var(--border,#444);background:transparent;color:inherit;cursor:pointer}#fa-modal .bt.az{background:#3355FF;border-color:#3355FF;color:#fff}'
      +'body.ap-esc-claro #fa-modal .cx{background:#fff;color:#0F1B33;border-color:#E6EDF7}body.ap-esc-claro #fa-box{background:#f4f6ff}body.ap-tema-claro #fa-cli-box{background:#f4f6ff}';
    document.head.appendChild(s);
  }
  var tSync=0, tLer=0;
  function tick(){
    try{ css(); ligarGravador(); ligarResposta(); ligarNotas(); ligarGuias(); montarNotas(); montarGuias(); ligar();
      if(ehAdmin()){ if(pronto()){ if(filaLeitura().length){ if(Date.now()-tLer>2500){ tLer=Date.now(); lerPendentes(3); } } else if(Date.now()-tSync>5000){ tSync=Date.now(); sincronizar(); } } painel(); } /* so lanca depois de ler todos os arquivos */
      else clienteApp();
    }catch(e){ console.warn('[fat-auto]', e); }
  }
  function laco(){ tick(); setTimeout(laco, 2500); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(laco,1200); }); else setTimeout(laco,1200);
  document.addEventListener('change', function(ev){ if(ev.target && ev.target.id==='cli-fat-mes'){ assC=''; setTimeout(clienteApp,50); } }, true);

  window.__FATAUTO__={VER:VER, lerXML:lerXML, lerTextoPDF:lerTextoPDF, lerBytes:lerBytes, lerArquivo:lerArquivo, infoChave:infoChave, acharChave:acharChave, chavesNF:chavesNF, juntarNF:juntarNF, num:num,
    itens:itens, agrupar:agrupar, grupos:grupos, gruposDe:gruposDe, porMes:porMes, notasDe:notasDe, divergencias:divergencias, sincronizar:sincronizar, lerPendentes:lerPendentes, filaLeitura:filaLeitura,
    verificar:verificar, lerOFXbasico:lerOFXbasico, pronto:function(){ return ehAdmin()?pronto():FATCLI.length>0; }, tick:tick,
    estado:function(){ return {sols:SOLS.length, notas:NOTAS.length, obr:OBR.length, fat:FAT.length, cli:CLI.length, versao:versao, pronto:pronto()}; },
    _set:function(o){ if(o.SOLS) SOLS=o.SOLS; if(o.NOTAS) NOTAS=o.NOTAS; if(o.OBR) OBR=o.OBR; if(o.FAT) FAT=o.FAT; if(o.CLI){ CLI=o.CLI; indexar(); } carregou={s:1,n:1,o:1,f:1}; novo(); }};
})();
