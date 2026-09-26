/* APARAT - NOTA FISCAL: SUB-ABAS "ENTRADAS (COMPRAS)" E "HONORARIOS APARAT" (v1, 22/09/2026)
   Pedido do Daniel (aprovou a previa Downloads\APARAT-previa-nf-entradas-honorarios.html e disse "pode publicar"):
   - sub-aba de NOTA FISCAL DE ENTRADA: as compras que o cliente faz dos fornecedores;
   - sub-aba com a NFS-e do PROPRIO ESCRITORIO (honorarios), disponivel para o cliente;
   - tudo ligado na Ficha do Cliente.
   ONDE GRAVA: na colecao 'notas' que ja existe (tem regra no Firebase), com o campo novo 'direcao':
     direcao:'entrada'   -> nota de compra {fornecedor, fornecedorCnpj, ufEmit, ufDest, numero, serie, data, competencia,
                            valor, cfop, chave(44), vST, arquivo/arquivoData (XML), pdfNome/pdfData, status Nova|Conferida}
     direcao:'honorario' -> NFS-e dos honorarios {honorarioId, referencia, numero, valor, arquivo/arquivoData, status 'Fechada'}
   As notas antigas nao tem 'direcao' e continuam sendo as SAIDAS (a aba de sempre, sem mudanca).
   Para nao misturar, o dbGetAll('notas') das outras telas passa a devolver so as saidas.
   Realizado das entradas do mes (Ficha): obrigCnpj/<cliente>__AAAA-MM__NFENT (mesmo padrao do "Feito" da ficha).
   Regra do app: a area do cliente usa style.display, NUNCA a classe .active.
   v2 (26/09/2026) - pedido do Daniel: "subir notas fiscais de recebimento de prestacao de servicos"
   (ex.: Castro Barbearia recebe NFS-e dos profissionais-parceiros). Sub-aba nova "Servicos recebidos"
   no painel e no app do cliente. Grava na mesma colecao 'notas' com direcao:'entrada' + especie:'NFS-e'
   (assim saidas, notas-concluir, Drive e aviso continuam funcionando sem mudar nada) e o campo
   parceiro:true|false. O total dos parceiros e a cota-parte do profissional-parceiro, que NAO entra na
   receita bruta do salao-parceiro (Lei 12.592/2012, art. 1-A, par. 5, incluido pela Lei 13.352/2016).
   Le XML da NFS-e Padrao Nacional (infNFSe/DPS) e ABRASF/GINFES (InfNfse), ou so o PDF.
   v2 (cont.) - CADASTRO de profissionais-parceiros e de outros prestadores, por cliente, gravado no proprio
   documento do cliente (clientes/<id>.parceiros[]) - o escritorio grava, o cliente so le. Campos do parceiro:
   nome, cpf, cnpj, funcao, cota (% do profissional), homologado Sim/Nao + data + orgao, telefone, situacao.
   Buscador de CNPJ: preenche sozinho (BrasilAPI; reserva publica.cnpj.ws); no MEI tira o CPF do nome empresarial.
   Nota de CNPJ cadastrado ja entra com o tipo certo; alerta parceiro desligado / contrato nao homologado. */
;(function(){
  if(window.__APARAT_NFE__) return; window.__APARAT_NFE__=1;

  var MAX=900*1024, ORIGEM='Notas de Entrada';
  var D={notas:[], hon:[], cli:[]}, tD=0, carregando=false;
  var C={notas:[], cnpj:'', nome:''}, tC=0;
  var modo='saidas', modoCli='vendas';
  var F={cli:'', comp:'', q:''}, focoVisto=null, hRef='';
  var S={cli:'', comp:'', q:'', par:''}, focoVistoS=null;
  var assEnt='', assHon='', assCliE='', assCliH='', assFicha='', realiz={}, assSrv='', assCliS='';

  /* ---------------- utilitarios ---------------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t||'success'); return; } }catch(e){} }
  function ts(){ try{ return firebase.firestore.FieldValue.serverTimestamp(); }catch(e){ return new Date().toISOString(); } }
  function pad(n){ return (n<10?'0':'')+n; }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function soDig(s){ return String(s||'').replace(/\D/g,''); }
  /* mesma regra do notas-concluir: "1.060" = mil e sessenta; "1290.00" = mil duzentos e noventa */
  function num(v){
    v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(!v) return 0;
    if(v.indexOf(',')>-1) return parseFloat(v.replace(/\./g,'').replace(',','.'))||0;
    var i=v.lastIndexOf('.');
    if(i>-1 && /^\d{3}$/.test(v.slice(i+1))) return parseFloat(v.replace(/\./g,''))||0;
    return parseFloat(v)||0;
  }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function fmtCnpj(s){ var d=soDig(s); if(d.length===14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');
    if(d.length===11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4'); return String(s||''); }
  function fmtChave(c){ return soDig(c).replace(/(\d{4})(?=\d)/g,'$1 '); }
  function mesmo(a,b){ return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase(); }
  /* competencia em MM/AAAA a partir de varios formatos */
  function compDe(s){
    s=String(s||'').trim(); var m;
    if((m=s.match(/^(\d{4})-(\d{1,2})/))) return pad(+m[2])+'/'+m[1];
    if((m=s.match(/^\d{1,2}\/(\d{1,2})\/(\d{4})/))) return pad(+m[1])+'/'+m[2];
    if((m=s.match(/^(\d{1,2})\s*\/\s*(\d{4})$/))) return pad(+m[1])+'/'+m[2];
    var MS={jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
    m=s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/^([a-z]{3})[a-z]*\s*\/?\s*(\d{4})$/);
    if(m && MS[m[1]]) return pad(MS[m[1]])+'/'+m[2];
    return '';
  }
  function compOrd(c){ var p=String(c||'').split('/'); return p.length===2 ? p[1]+'-'+p[0] : ''; }
  function compHoje(){ var h=new Date(); return pad(h.getMonth()+1)+'/'+h.getFullYear(); }
  function compFicha(){ /* a ficha trabalha com AAAA-MM (competencia anterior por padrao) */
    try{ if(window.__FICHA__ && __FICHA__.compAtiva) return compDe(__FICHA__.compAtiva()); }catch(e){}
    var h=new Date(), d=new Date(h.getFullYear(),h.getMonth()-1,1); return pad(d.getMonth()+1)+'/'+d.getFullYear();
  }
  function ehAdmin(){
    try{ var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL; return true; }catch(e){ return false; }
  }
  function noPainel(){ var p=el('view-painel'); return !!(p && p.classList.contains('active') && ehAdmin()); }
  function noCliente(){ var v=el('view-cliente'); return !!(v && v.style.display!=='none' && v.offsetParent!==null); }
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ''; }catch(e){ return ''; } }
  function ehMeu(n){ var d=String((n&&n.direcao)||''); return d==='entrada' || d==='honorario'; }
  function honPago(h){ return /pago/i.test(String(h.status||'')); }
  function nomeSeguro(n){ return String(n||'arquivo').replace(/[\\\/:*?"<>|]+/g,'-'); }
  function foco(){ try{ return (window.__FICHA__ && __FICHA__.estado) ? (__FICHA__.estado().foco||'') : ''; }catch(e){ return ''; } }

  /* ---------------- as outras telas continuam vendo so as SAIDAS ---------------- */
  function embrulhar(){
    try{
      var orig=window.dbGetAll; if(typeof orig!=='function' || orig.__nfe) return;
      var w=async function(store){
        var r=await orig.apply(this, arguments);
        if(store==='notas' && Array.isArray(r) && !window.__NFE_VER_TUDO) r=r.filter(function(n){ return !ehMeu(n); });
        return r;
      };
      w.__nfe=1; w.__orig=orig; window.dbGetAll=w;
    }catch(e){}
  }
  embrulhar();

  /* ---------------- leitura do XML da NF-e ---------------- */
  function dvChave(c){ /* digito verificador modulo 11 da chave de acesso */
    c=soDig(c); if(c.length!==44) return false;
    var s=0, p=2; for(var i=42;i>=0;i--){ s+=Number(c[i])*p; p=(p===9)?2:p+1; }
    var r=s%11, dv=(r<2)?0:11-r; return dv===Number(c[43]);
  }
  function lerXML(txt){
    var d; try{ d=new DOMParser().parseFromString(String(txt||''),'application/xml'); }catch(e){ throw new Error('o arquivo não é um XML válido'); }
    if(!d || d.getElementsByTagName('parsererror').length) throw new Error('o arquivo não é um XML válido');
    function g(n,ctx){ if(!ctx) return ''; var e=ctx.getElementsByTagName(n)[0]; return e ? String(e.textContent||'').trim() : ''; }
    var inf=d.getElementsByTagName('infNFe')[0];
    if(!inf) throw new Error('esse XML não é de NF-e nem de NFS-e. Use "Só tenho o PDF"');
    var chave=soDig(inf.getAttribute('Id')||''); if(chave.length!==44) chave=soDig(g('chNFe',d));
    var ide=inf.getElementsByTagName('ide')[0], emit=inf.getElementsByTagName('emit')[0], dest=inf.getElementsByTagName('dest')[0];
    var tot=inf.getElementsByTagName('ICMSTot')[0];
    var dh=g('dhEmi',ide)||g('dEmi',ide), m=dh.match(/^(\d{4})-(\d{2})-(\d{2})/);
    var cf={}; [].forEach.call(inf.getElementsByTagName('CFOP'),function(x){ var t=String(x.textContent||'').trim(); if(t) cf[t]=1; });
    var r={
      chave:chave, chaveOk:dvChave(chave), numero:g('nNF',ide), serie:g('serie',ide), modelo:g('mod',ide), tpNF:g('tpNF',ide),
      data:m?(m[3]+'/'+m[2]+'/'+m[1]):'', competencia:m?(m[2]+'/'+m[1]):'',
      fornecedor:g('xNome',emit), fornecedorCnpj:g('CNPJ',emit)||g('CPF',emit), ufEmit:g('UF',emit),
      destCnpj:g('CNPJ',dest)||g('CPF',dest), destNome:g('xNome',dest), ufDest:g('UF',dest),
      valor:num(g('vNF',tot)), vST:num(g('vST',tot)), cfop:Object.keys(cf).join(', ')
    };
    if(!r.numero || !r.fornecedor) throw new Error('não achei o número ou o fornecedor dentro do XML');
    return r;
  }
  /* ---------------- leitura do XML da NFS-e (Padrao Nacional e ABRASF/GINFES) ---------------- */
  function porNome(ctx,n){ if(!ctx) return null; var l=ctx.getElementsByTagNameNS ? ctx.getElementsByTagNameNS('*',n) : ctx.getElementsByTagName(n); return (l && l[0]) || null; }
  function filho(ctx,n){ if(!ctx) return null; for(var c=ctx.firstElementChild;c;c=c.nextElementSibling){ if((c.localName||String(c.nodeName).split(':').pop())===n) return c; } return null; }
  function txtDe(e){ return e ? String(e.textContent||'').trim() : ''; }
  function docDe(ctx){ if(!ctx) return ''; var l=['CNPJ','Cnpj','CPF','Cpf']; for(var i=0;i<l.length;i++){ var t=txtDe(porNome(ctx,l[i])); if(t) return t; } return ''; }
  function numXml(v){ v=String(v==null?'':v).trim(); if(!v) return 0; if(v.indexOf(',')>-1) return num(v); return parseFloat(v)||0; }
  function dataDe(s){ s=String(s||'').trim(); var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[3]+'/'+m[2]+'/'+m[1];
    m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? (m[1]+'/'+m[2]+'/'+m[3]) : ''; }
  function ehNFSeDoc(d){ return !!(porNome(d,'infNFSe') || porNome(d,'InfNfse')); }
  function lerNFSe(txt){
    var d; try{ d=(typeof txt==='string') ? new DOMParser().parseFromString(txt,'application/xml') : txt; }catch(e){ throw new Error('o arquivo não é um XML válido'); }
    if(!d || d.getElementsByTagName('parsererror').length) throw new Error('o arquivo não é um XML válido');
    var r={especie:'NFS-e', padrao:'', chaveNfse:'', codVerif:'', numero:'', data:'', competencia:'', valor:0, prestador:'', prestadorDoc:'', ufPrest:'',
           tomaDoc:'', tomaNome:'', descricao:'', codServ:'', cancelada:false};
    var inf=porNome(d,'infNFSe'), dh='', dc='';
    if(inf){
      r.padrao='Nacional';
      var emit=filho(inf,'emit'), dps=porNome(inf,'infDPS'), prest=porNome(dps,'prest'), toma=porNome(dps,'toma');
      var ch=soDig(inf.getAttribute('Id')||''); if(ch.length===50) r.chaveNfse=ch;
      r.numero=txtDe(filho(inf,'nNFSe'));
      dh=txtDe(porNome(dps,'dhEmi'))||txtDe(filho(inf,'dhProc')); dc=txtDe(porNome(dps,'dCompet'));
      r.valor=numXml(txtDe(porNome(dps,'vServ'))||txtDe(porNome(inf,'vLiq')));
      r.prestador=txtDe(filho(emit,'xNome'))||txtDe(porNome(prest,'xNome')); r.prestadorDoc=docDe(emit)||docDe(prest);
      r.ufPrest=txtDe(porNome(emit,'UF'));
      r.tomaDoc=docDe(toma); r.tomaNome=txtDe(porNome(toma,'xNome'));
      r.descricao=txtDe(porNome(dps,'xDescServ')); r.codServ=txtDe(porNome(dps,'cTribNac'));
    } else {
      inf=porNome(d,'InfNfse');
      if(!inf) throw new Error('esse XML não é de NFS-e (nota de serviço). Use "Só tenho o PDF"');
      r.padrao='ABRASF';
      var ps=porNome(inf,'PrestadorServico'), p2=porNome(inf,'Prestador');
      var tm=porNome(inf,'TomadorServico')||porNome(inf,'Tomador');
      r.numero=txtDe(filho(inf,'Numero')); r.codVerif=txtDe(filho(inf,'CodigoVerificacao'));
      dh=txtDe(filho(inf,'DataEmissao'))||txtDe(porNome(inf,'DataEmissao')); dc=txtDe(porNome(inf,'Competencia'));
      r.valor=numXml(txtDe(porNome(inf,'ValorServicos'))||txtDe(porNome(inf,'ValorLiquidoNfse')));
      r.prestadorDoc=docDe(porNome(ps,'IdentificacaoPrestador'))||docDe(p2)||docDe(ps);
      r.prestador=txtDe(porNome(ps,'RazaoSocial'))||txtDe(porNome(ps,'NomeFantasia'))||txtDe(porNome(p2,'RazaoSocial'));
      r.ufPrest=txtDe(porNome(porNome(ps,'Endereco'),'Uf'))||txtDe(porNome(porNome(ps,'Endereco'),'UF'));
      r.tomaDoc=docDe(porNome(tm,'IdentificacaoTomador')||tm); r.tomaNome=txtDe(porNome(tm,'RazaoSocial'));
      r.descricao=txtDe(porNome(inf,'Discriminacao')); r.codServ=txtDe(porNome(inf,'ItemListaServico'));
      r.cancelada=!!(porNome(d,'NfseCancelamento')||porNome(d,'CancelamentoNfse'));
    }
    r.data=dataDe(dh); r.competencia=compDe(dc)||compDe(dh);
    if(!r.numero || !r.prestador) throw new Error('não achei o número ou o prestador dentro do XML da NFS-e');
    return r;
  }
  /* devolve {tipo:'nfe'|'nfse', x} */
  function lerQualquer(txt){
    var d; try{ d=new DOMParser().parseFromString(String(txt||''),'application/xml'); }catch(e){ throw new Error('o arquivo não é um XML válido'); }
    if(!d || d.getElementsByTagName('parsererror').length) throw new Error('o arquivo não é um XML válido');
    if(ehNFSeDoc(d)) return {tipo:'nfse', x:lerNFSe(d)};
    return {tipo:'nfe', x:lerXML(txt)};
  }
  function lerArquivo(f, comoTexto){
    return new Promise(function(res,rej){
      var fr=new FileReader(); fr.onload=function(){ res(fr.result); }; fr.onerror=function(){ rej(new Error('não consegui ler o arquivo')); };
      if(comoTexto) fr.readAsText(f); else fr.readAsDataURL(f);
    });
  }

  /* ---------------- dados ---------------- */
  async function carregar(forcar){
    if(carregando) return; if(!forcar && tD && (Date.now()-tD)<25000) return;
    var d=db(); if(!d) return; carregando=true;
    try{
      var n=[], h=[], c=[];
      try{ var s=await d.collection('notas').where('direcao','in',['entrada','honorario']).get();
        s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; n.push(o); }); }catch(e){}
      try{ var s2=await d.collection('honorarios').get();
        s2.forEach(function(x){ var o=x.data()||{}; h.push({id:x.id, cliente:o.cliente||'', referencia:o.referencia||'', valor:o.valor||'', vencimento:o.vencimento||'', status:o.status||''}); }); }catch(e){}
      try{ var s3=await d.collection('clientes').get();
        s3.forEach(function(x){ var o=x.data()||{}; var nm=String(o.nome||'').trim();
          if(nm && nm!=='Todos os Clientes' && !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(o.status||''))) c.push({id:x.id, nome:nm, cnpj:o.cnpj||'', parceiros:Array.isArray(o.parceiros)?o.parceiros:[]}); }); }catch(e){}
      c.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); });
      D={notas:n, hon:h, cli:c}; tD=Date.now();
    }finally{ carregando=false; }
  }
  async function carregarCli(forcar){
    var nome=clienteAtual(); if(!nome) return;
    if(!forcar && tC && C.nome===nome && (Date.now()-tC)<25000) return;
    var d=db(); if(!d) return;
    var v=[];
    try{ var s=await d.collection('notas').where('cliente','==',nome).get();
      s.forEach(function(x){ var o=x.data()||{}; if(!ehMeu(o)) return; o.id=x.id; v.push(o); }); }catch(e){}
    if(C.nome!==nome || !C.cnpjLido || forcar){
      C.cnpj=''; C.cnpjLido=true; C.parc=[];
      try{ var q=await d.collection('clientes').where('nome','==',nome).get(); q.forEach(function(x){ var o=x.data()||{}; if(o.cnpj) C.cnpj=o.cnpj; if(Array.isArray(o.parceiros)) C.parc=o.parceiros; }); }catch(e){}
    }
    C.notas=v; C.nome=nome; tC=Date.now();
  }
  function ehServ(n){ return !!n && n.direcao==='entrada' && n.especie==='NFS-e'; }
  function ordena(v){ return v.sort(function(a,b){ var x=compOrd(b.competencia).localeCompare(compOrd(a.competencia)); if(x) return x;
      return String(b.data||'').split('/').reverse().join('').localeCompare(String(a.data||'').split('/').reverse().join('')); }); }
  /* entradas = so as COMPRAS (NF-e); servicos = NFS-e recebidas */
  function entradas(lista){ return ordena((lista||[]).filter(function(n){ return n.direcao==='entrada' && !ehServ(n); })); }
  function servicos(lista){ return ordena((lista||[]).filter(ehServ)); }
  function totParc(v){ var t=0; v.forEach(function(n){ if(n.parceiro && !n.cancelada) t+=num(n.valor); }); return t; }
  function nfsHon(lista){ return (lista||[]).filter(function(n){ return n.direcao==='honorario'; }); }
  function cnpjDoCliente(nome){ for(var i=0;i<D.cli.length;i++) if(mesmo(D.cli[i].nome,nome)) return D.cli[i].cnpj; return ''; }
  function jaExiste(lista, chave){ chave=soDig(chave); if(!chave) return null;
    for(var i=0;i<lista.length;i++) if(lista[i].direcao==='entrada' && soDig(lista[i].chave)===chave) return lista[i]; return null; }
  function jaExisteServ(lista, x){
    var ch=soDig(x.chaveNfse), dp=soDig(x.prestadorDoc), nu=String(x.numero||'').replace(/^0+/,'');
    for(var i=0;i<lista.length;i++){ var o=lista[i]; if(!ehServ(o)) continue;
      if(ch && soDig(o.chaveNfse)===ch) return o;
      if(nu && String(o.numero||'').replace(/^0+/,'')===nu && ((dp && soDig(o.fornecedorCnpj)===dp) || (!dp && mesmo(o.fornecedor,x.prestador)))) return o; }
    return null; }
  function montarServ(x, cliente, cnpjCli, arqNome, arqData, origem, parceiro){
    var cc=soDig(cnpjCli), ac=aplicaCad(x, cliente, parceiro); parceiro=ac.parceiro;
    if(cc && soDig(x.prestadorDoc)===cc) return {erro:'NFS-e '+x.numero+': o cliente é o PRESTADOR desta nota, então ela é de venda (saída), não de serviço recebido.'};
    var alerta=[];
    if(cc && x.tomaDoc && soDig(x.tomaDoc)!==cc) alerta.push('tomador da nota não é este cliente ('+fmtCnpj(x.tomaDoc)+')');
    if(cc && !x.tomaDoc) alerta.push('nota sem tomador identificado');
    if(x.cancelada) alerta.push('NFS-e CANCELADA');
    alerta=alerta.concat(ac.alertas);
    return {doc:{
      cliente:cliente, direcao:'entrada', especie:'NFS-e', tipo:'Serviço recebido', origem:origem, parceiro:!!parceiro,
      fornecedor:x.prestador, fornecedorCnpj:fmtCnpj(x.prestadorDoc), ufEmit:x.ufPrest||'', ufDest:'',
      numero:x.numero, serie:'', modelo:'NFS-e '+(x.padrao||''), data:x.data, competencia:x.competencia,
      valor:(Number(x.valor)||0).toFixed(2), vST:'0.00', cfop:'', chave:'', chaveNfse:x.chaveNfse||'', codVerif:x.codVerif||'',
      codServ:x.codServ||'', cancelada:!!x.cancelada, cadastrado:!!ac.cad,
      descricao:(parceiro?'Cota-parte do profissional-parceiro — ':'Serviço de ')+x.prestador+(x.descricao?(' · '+String(x.descricao).slice(0,300)):''),
      alerta:alerta.join(' · '), arquivo:arqNome, arquivoData:arqData, status:'Nova', enviadoEm:agoraBR()
    }};
  }

  /* monta o registro de uma entrada vinda do XML; devolve {doc} ou {erro} */
  function montarEntrada(x, cliente, cnpjCli, arqNome, arqData, origem){
    var cc=soDig(cnpjCli);
    if(cc && soDig(x.fornecedorCnpj)===cc) return {erro:'NF '+x.numero+': o cliente é o EMITENTE desta nota, então ela é de venda (saída), não de compra.'};
    var alerta=[];
    if(cc && x.destCnpj && soDig(x.destCnpj)!==cc) alerta.push('destinatário da nota não é este cliente ('+fmtCnpj(x.destCnpj)+')');
    if(x.chave && !x.chaveOk) alerta.push('chave de acesso com dígito verificador errado');
    return {doc:{
      cliente:cliente, direcao:'entrada', tipo:'Entrada', origem:origem,
      fornecedor:x.fornecedor, fornecedorCnpj:fmtCnpj(x.fornecedorCnpj), ufEmit:x.ufEmit, ufDest:x.ufDest,
      numero:x.numero, serie:x.serie, modelo:x.modelo, data:x.data, competencia:x.competencia,
      valor:(Number(x.valor)||0).toFixed(2), vST:(Number(x.vST)||0).toFixed(2), cfop:x.cfop, chave:x.chave,
      descricao:'Compra de '+x.fornecedor, alerta:alerta.join(' · '),
      arquivo:arqNome, arquivoData:arqData, status:'Nova', enviadoEm:agoraBR()
    }};
  }
  async function gravar(dados){
    var d=db(); if(!d) throw new Error('sem conexão com a nuvem');
    dados.criadoEm=ts();
    var ref=await d.collection('notas').add(dados); return ref.id;
  }
  /* ---------------- CADASTRO de parceiros / prestadores + buscador de CNPJ ---------------- */
  function cliObj(nome){ for(var i=0;i<D.cli.length;i++) if(mesmo(D.cli[i].nome,nome)) return D.cli[i]; return null; }
  function cadDe(cliente){ if(!ehAdmin() && mesmo(cliente,C.nome) && C.parc) return C.parc; var c=cliObj(cliente); return (c && c.parceiros) || []; }
  function acharCad(cliente, doc, nome){
    var d=soDig(doc), l=cadDe(cliente);
    for(var i=0;i<l.length;i++){ var p=l[i]; if(d && (soDig(p.cnpj)===d || soDig(p.cpf)===d)) return p; }
    if(!d && nome) for(var j=0;j<l.length;j++) if(mesmo(l[j].nome,nome)) return l[j];
    return null; }
  function dvCnpj(c){ c=soDig(c); if(c.length!==14 || /^(\d)\1+$/.test(c)) return false;
    function dv(b){ var p=b.length-7, s=0; for(var i=0;i<b.length;i++){ s+=Number(b[i])*p--; if(p<2) p=9; } var r=s%11; return r<2?0:11-r; }
    return dv(c.slice(0,12))===Number(c[12]) && dv(c.slice(0,13))===Number(c[13]); }
  function dvCpf(c){ c=soDig(c); if(c.length!==11 || /^(\d)\1+$/.test(c)) return false;
    function dv(b,p){ var s=0; for(var i=0;i<b.length;i++) s+=Number(b[i])*(p-i); var r=(s*10)%11; return r===10?0:r; }
    return dv(c.slice(0,9),10)===Number(c[9]) && dv(c.slice(0,10),11)===Number(c[10]); }
  function funcaoDoCnae(cod, desc){ var c=soDig(cod), t=String(desc||'').toLowerCase();
    if(c==='9602501' || /cabeleir|manicur|pedicur/.test(t)) return /manicur|pedicur/.test(t)&&!/cabeleir/.test(t)?'Manicure/Pedicure':'Cabeleireiro(a) / Barbeiro(a)';
    if(c==='9602502' || /est[eé]tica|beleza/.test(t)) return 'Esteticista'; return ''; }
  var cacheCnpj={};
  async function pegaJson(url, ms){
    var ctl=(typeof AbortController!=='undefined')?new AbortController():null, t=setTimeout(function(){ try{ ctl&&ctl.abort(); }catch(e){} }, ms||9000);
    try{ var r=await fetch(url, ctl?{signal:ctl.signal}:{}); if(!r.ok) throw new Error('HTTP '+r.status); return await r.json(); } finally{ clearTimeout(t); } }
  /* devolve {razao, fantasia, cnpj, cpfMei, mei, situacao, telefone, email, municipio, uf, cnae, cnaeDesc, funcao, fonte} */
  async function buscaCnpj(cnpj){
    var c=soDig(cnpj); if(c.length!==14) throw new Error('digite os 14 números do CNPJ');
    if(!dvCnpj(c)) throw new Error('CNPJ inválido (dígito verificador não bate)');
    if(cacheCnpj[c]) return cacheCnpj[c];
    var r=null, erro='';
    try{ var b=await pegaJson('https://brasilapi.com.br/api/cnpj/v1/'+c);
      r={razao:b.razao_social||'', fantasia:b.nome_fantasia||'', situacao:b.descricao_situacao_cadastral||'', mei:!!b.opcao_pelo_mei,
         telefone:String(b.ddd_telefone_1||'').trim(), email:b.email||'', municipio:b.municipio||'', uf:b.uf||'',
         cnae:String(b.cnae_fiscal||''), cnaeDesc:b.cnae_fiscal_descricao||'', fonte:'BrasilAPI'}; }catch(e){ erro=String(e&&e.message||e); }
    if(!r){ try{ var w=await pegaJson('https://publica.cnpj.ws/cnpj/'+c), e2=w.estabelecimento||{};
      r={razao:w.razao_social||'', fantasia:e2.nome_fantasia||'', situacao:e2.situacao_cadastral||'', mei:!!(w.simples && /sim/i.test(String(w.simples.mei||''))),
         telefone:((e2.ddd1||'')+(e2.telefone1||'')), email:e2.email||'', municipio:(e2.cidade&&e2.cidade.nome)||'', uf:(e2.estado&&e2.estado.sigla)||'',
         cnae:String((e2.atividade_principal&&e2.atividade_principal.subclasse)||''), cnaeDesc:(e2.atividade_principal&&e2.atividade_principal.descricao)||'', fonte:'CNPJ.ws'}; }catch(e3){ erro+=' / '+String(e3&&e3.message||e3); } }
    if(!r || !r.razao) throw new Error('não consegui consultar agora ('+(erro||'sem resposta')+'). Preencha à mão.');
    var m=String(r.razao).match(/(\d{11})\s*$/); r.cpfMei=(m && dvCpf(m[1])) ? m[1] : '';
    r.nomePessoa=r.cpfMei ? String(r.razao).replace(/\s*\d{11}\s*$/,'').trim() : '';
    r.cnpj=c; r.funcao=funcaoDoCnae(r.cnae, r.cnaeDesc);
    cacheCnpj[c]=r; return r;
  }
  async function gravarCad(cliente, lista){
    var c=cliObj(cliente); if(!c || !c.id) throw new Error('cliente não encontrado');
    var limpa=lista.map(function(p){ var o={}; Object.keys(p).forEach(function(k){ if(p[k]!==undefined) o[k]=p[k]; }); return o; });
    await db().collection('clientes').doc(String(c.id)).set({parceiros:limpa},{merge:true}); c.parceiros=limpa;
  }
  /* aplica o cadastro na nota: tipo certo + alertas */
  function aplicaCad(x, cliente, parceiro){
    var p=acharCad(cliente, x.prestadorDoc, x.prestador), al=[];
    if(!p) return {parceiro:!!parceiro, cad:null, alertas:al};
    var eParc=p.tipo!=='prestador';
    if(eParc && /deslig|inativ/i.test(String(p.situacao||''))) al.push('parceiro está DESLIGADO no cadastro');
    if(eParc && p.homologado!=='Sim') al.push('contrato de parceria sem homologação no cadastro');
    return {parceiro:eParc, cad:p, alertas:al};
  }

  /* envia uma lista de arquivos XML; devolve texto de resultado */
  async function enviarXMLs(files, cliente, lista, cnpjCli, origem, parceiro){
    var ok=0, msgs=[];
    for(var i=0;i<files.length;i++){
      var f=files[i];
      try{
        if(!/\.xml$/i.test(f.name) && !/xml/i.test(f.type||'')) throw new Error('não é arquivo .xml');
        if(f.size>MAX) throw new Error('arquivo maior que 900 KB');
        var txt=await lerArquivo(f,true), lq=lerQualquer(txt), x=lq.x;
        if(lq.tipo==='nfse'){
          var ms=montarServ(x, cliente, cnpjCli, f.name, '', origem, parceiro);
          if(ms.erro){ msgs.push('\u{26D4} '+esc(ms.erro)); continue; }
          var dupS=jaExisteServ(lista, x);
          if(dupS){ msgs.push('\u{26D4} NFS-e '+esc(x.numero)+' de '+esc(x.prestador)+' já foi enviada em '+esc(dupS.enviadoEm?String(dupS.enviadoEm).slice(0,10):(dupS.data||''))+' — não foi duplicada.'); continue; }
          ms.doc.arquivoData=await lerArquivo(f,false);
          ms.doc.id=await gravar(Object.assign({},ms.doc)); lista.push(ms.doc); ok++;
          msgs.push('\u{2705} NFS-e '+esc(x.numero)+' · '+esc(x.prestador)+' · '+moeda(x.valor)+' · '+(ms.doc.parceiro?'profissional-parceiro':'outro prestador')+(ms.doc.cadastrado?' (reconhecido pelo cadastro)':'')+' → Serviços recebidos'+(ms.doc.alerta?(' · \u{26A0}\u{FE0F} '+esc(ms.doc.alerta)):''));
          continue;
        }
        var dup=jaExiste(lista, x.chave);
        if(dup){ msgs.push('\u{26D4} NF '+esc(x.numero)+' de '+esc(x.fornecedor)+' já foi enviada em '+esc(dup.enviadoEm?String(dup.enviadoEm).slice(0,10):(dup.data||''))+' — não foi duplicada.'); continue; }
        var dataUrl=await lerArquivo(f,false);
        var m=montarEntrada(x, cliente, cnpjCli, f.name, dataUrl, origem);
        if(m.erro){ msgs.push('\u{26D4} '+esc(m.erro)); continue; }
        m.doc.id=await gravar(Object.assign({},m.doc)); lista.push(m.doc); ok++;
        msgs.push('\u{2705} NF '+esc(x.numero)+' · '+esc(x.fornecedor)+' · '+moeda(x.valor)+' → Entradas (compras)'+(x.ufEmit&&x.ufDest&&x.ufEmit!==x.ufDest?(' · '+esc(x.ufEmit)+' → '+esc(x.ufDest)+' (outro estado)'):'')+(m.doc.alerta?(' · \u{26A0}\u{FE0F} '+esc(m.doc.alerta)):''));
      }catch(e){ msgs.push('\u{26D4} '+esc(f.name)+': '+esc(e&&e.message?e.message:e)); }
    }
    return {ok:ok, html:msgs.join('<br>')};
  }
  async function enviarManual(pre, cliente, lista, origem){
    var forn=String(el(pre+'forn').value||'').trim(), numero=String(el(pre+'num').value||'').trim();
    var dataISO=String(el(pre+'data').value||''), val=num(el(pre+'val').value), fi=el(pre+'pdf');
    var f=fi && fi.files && fi.files[0];
    if(!forn || !numero || !dataISO || !val) throw new Error('preencha fornecedor, número, data e valor');
    if(!f) throw new Error('anexe o PDF (ou a foto) da nota');
    if(f.size>MAX) throw new Error('arquivo maior que 900 KB');
    var m=dataISO.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) throw new Error('data inválida');
    for(var i=0;i<lista.length;i++){ var o=lista[i];
      if(o.direcao==='entrada' && !ehServ(o) && mesmo(o.fornecedor,forn) && String(o.numero)===numero) throw new Error('a NF '+numero+' de '+forn+' já foi enviada'); }
    var dataUrl=await lerArquivo(f,false);
    var cnpj=el(pre+'cnpj')?String(el(pre+'cnpj').value||'').trim():'', uf=el(pre+'uf')?String(el(pre+'uf').value||'').trim().toUpperCase():'';
    var doc={cliente:cliente, direcao:'entrada', tipo:'Entrada', origem:origem, fornecedor:forn, fornecedorCnpj:fmtCnpj(cnpj), ufEmit:uf, ufDest:'',
      numero:numero, serie:'', modelo:'', data:m[3]+'/'+m[2]+'/'+m[1], competencia:m[2]+'/'+m[1], valor:val.toFixed(2), vST:'0.00', cfop:'', chave:'',
      descricao:'Compra de '+forn, alerta:'sem XML (só o PDF)', arquivo:'', arquivoData:'', pdfNome:f.name, pdfData:dataUrl, status:'Nova', enviadoEm:agoraBR()};
    doc.id=await gravar(Object.assign({},doc)); lista.push(doc); return doc;
  }
  async function enviarManualServ(pre, cliente, lista, origem){
    var forn=String(el(pre+'forn').value||'').trim(), numero=String(el(pre+'num').value||'').trim();
    var dataISO=String(el(pre+'data').value||''), val=num(el(pre+'val').value), fi=el(pre+'pdf');
    var cnpj=String(el(pre+'cnpj').value||'').trim(), par=el(pre+'par') ? el(pre+'par').value==='sim' : false;
    var f=fi && fi.files && fi.files[0];
    if(!forn || !numero || !dataISO || !val) throw new Error('preencha prestador, número, data e valor');
    if(!f) throw new Error('anexe o PDF (ou a foto) da NFS-e');
    if(f.size>MAX) throw new Error('arquivo maior que 900 KB');
    var m=dataISO.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) throw new Error('data inválida');
    var ac=aplicaCad({prestadorDoc:cnpj, prestador:forn}, cliente, par); par=ac.parceiro;
    var dup=jaExisteServ(lista, {numero:numero, prestadorDoc:cnpj, prestador:forn, chaveNfse:''});
    if(dup) throw new Error('a NFS-e '+numero+' de '+forn+' já foi enviada');
    var dataUrl=await lerArquivo(f,false);
    var doc={cliente:cliente, direcao:'entrada', especie:'NFS-e', tipo:'Serviço recebido', origem:origem, parceiro:par,
      fornecedor:forn, fornecedorCnpj:fmtCnpj(cnpj), ufEmit:'', ufDest:'', numero:numero, serie:'', modelo:'NFS-e',
      data:m[3]+'/'+m[2]+'/'+m[1], competencia:m[2]+'/'+m[1], valor:val.toFixed(2), vST:'0.00', cfop:'', chave:'', chaveNfse:'', codVerif:'', codServ:'', cancelada:false,
      cadastrado:!!ac.cad, descricao:(par?'Cota-parte do profissional-parceiro — ':'Serviço de ')+forn, alerta:['sem XML (só o PDF)'].concat(ac.alertas).join(' · '),
      arquivo:'', arquivoData:'', pdfNome:f.name, pdfData:dataUrl, status:'Nova', enviadoEm:agoraBR()};
    doc.id=await gravar(Object.assign({},doc)); lista.push(doc); return doc;
  }
  async function marcarParceiro(n, sim){
    var dd={parceiro:!!sim, descricao:(sim?'Cota-parte do profissional-parceiro — ':'Serviço de ')+(n.fornecedor||'')};
    await db().collection('notas').doc(String(n.id)).set(dd,{merge:true}); Object.assign(n,dd);
  }
  async function baixar(dataUrl, nome){
    if(!dataUrl){ aviso('Esta nota não tem esse arquivo.','info'); return; }
    try{
      var b=await (await fetch(dataUrl)).blob(), url=URL.createObjectURL(b);
      var a=document.createElement('a'); a.href=url; a.download=nomeSeguro(nome); a.style.display='none';
      document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); },4000);
      aviso('\u{2B07}\u{FE0F} Baixando '+nomeSeguro(nome),'info');
    }catch(e){ try{ window.open(dataUrl,'_blank'); }catch(e2){ aviso('Não consegui abrir o arquivo.','warn'); } }
  }
  function nomeXml(n){ return n.arquivo || ((ehServ(n)?'NFSe-recebida_':'NF-entrada_')+(n.numero||n.id)+'.xml'); }
  function nomePdf(n){ return n.pdfNome || ((ehServ(n)?'NFSe-recebida_':'NF-entrada_')+(n.numero||n.id)+'.pdf'); }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-nfe-css')) return;
    var s=document.createElement('style'); s.id='ap-nfe-css';
    s.textContent=
       '#pp-notas.nfe-m-ent>:not(.nfe-own),#pp-notas.nfe-m-hon>:not(.nfe-own),#pp-notas.nfe-m-srv>:not(.nfe-own){display:none !important}'
      +'#pp-notas:not(.nfe-m-ent) #nfe-ent,#pp-notas:not(.nfe-m-hon) #nfe-hon,#pp-notas:not(.nfe-m-srv) #nfe-srv{display:none}'
      +'#sec-notas.nfe-m-ent>:not(.nfe-own):not(.asec),#sec-notas.nfe-m-hon>:not(.nfe-own):not(.asec),#sec-notas.nfe-m-srv>:not(.nfe-own):not(.asec){display:none !important}'
      +'#sec-notas:not(.nfe-m-ent) #nfe-c-ent,#sec-notas:not(.nfe-m-hon) #nfe-c-hon,#sec-notas:not(.nfe-m-srv) #nfe-c-srv{display:none}'
      +'.nfe-c.ve{background:rgba(0,200,180,.15);color:#2fe0c8;border:1px solid rgba(0,200,180,.55)}body.ap-esc-claro .nfe-c.ve{color:#0a8f80}'
      +'.nfe-kpi.par{border-color:rgba(0,200,180,.55);background:rgba(0,200,180,.07)}.nfe-kpi.par b{color:#2fe0c8}body.ap-esc-claro .nfe-kpi.par b{color:#0a8f80}'
      +'.nfe-lei{font-size:11.5px;color:var(--cinza);border-left:3px solid rgba(0,200,180,.6);padding:6px 10px;margin:0 0 12px;line-height:1.5}'
      +'.nfe-sub{font-size:11.5px;font-weight:700;color:var(--cinza);margin:-2px 0 8px}'
      +'.nfe-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid var(--border)}'
      +'.nfe-tab{font:inherit;font-size:13px;font-weight:700;padding:9px 15px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:inherit;cursor:pointer;display:inline-flex;gap:7px;align-items:center}'
      +'.nfe-tab.on{background:var(--azul,#3355ff);border-color:var(--azul,#3355ff);color:#fff}'
      +'.nfe-tab i{font-style:normal;font-size:11px;font-weight:800;padding:1px 8px;border-radius:999px;background:rgba(255,138,0,.18);color:#ff9d2e}'
      +'.nfe-tab.on i{background:rgba(255,255,255,.25);color:#fff}'
      +'#sec-notas .nfe-tabs{margin-top:8px}#sec-notas .nfe-tab{font-size:12px;padding:7px 11px}'
      +'.nfe-h{font-size:15px;font-weight:800;margin:0 0 4px}.nfe-s{font-size:12.5px;color:var(--cinza);margin:0 0 12px}'
      +'.nfe-fil{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}'
      +'.nfe-fil select,.nfe-fil input,.nfe-frm input,.nfe-frm select{font:inherit;font-size:13px;padding:9px 11px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:inherit;outline:none}'
      +'.nfe-fil input{flex:1;min-width:200px}'
      +'.nfe-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin-bottom:12px}'
      +'.nfe-kpi{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:11px 13px}'
      +'.nfe-kpi b{display:block;font-size:19px;font-weight:800}.nfe-kpi span{font-size:11.5px;color:var(--cinza)}'
      +'.nfe-drop{border:2px dashed var(--azul,#3355ff);border-radius:14px;padding:16px;text-align:center;margin-bottom:12px;background:rgba(51,85,255,.07)}'
      +'.nfe-drop.sobre{background:rgba(51,85,255,.18)}'
      +'.nfe-drop b{display:block;font-size:14px;color:var(--azul-light,#6e8bff)}body.ap-esc-claro .nfe-drop b{color:var(--azul,#3355ff)}'
      +'.nfe-drop small{display:block;font-size:12px;color:var(--cinza);margin:3px 0 10px}'
      +'.nfe-b{font:inherit;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}'
      +'.nfe-b.az{background:var(--azul,#3355ff);border-color:var(--azul,#3355ff);color:#fff}.nfe-b.ok{background:#0e9f6e;border-color:#0e9f6e;color:#fff}'
      +'.nfe-b.ba{border-color:#ff5a4f;color:#ff7b70}.nfe-b:disabled{opacity:.55;cursor:wait}'
      +'.nfe-frm{display:none;text-align:left;margin-top:12px;gap:8px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}'
      +'.nfe-frm.on{display:grid}.nfe-frm label{font-size:11px;color:var(--cinza);display:block;margin-bottom:3px}.nfe-frm input{width:100%}'
      +'.nfe-msg{display:none;border-radius:12px;padding:10px 13px;margin-bottom:12px;font-size:12.5px;line-height:1.55;background:rgba(51,85,255,.10);border:1px solid rgba(51,85,255,.35)}'
      +'.nfe-msg.on{display:block}'
      +'.nfe-grp{font-size:10.5px;color:var(--cinza);text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin:14px 0 6px}'
      +'.nfe-l{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:11px 12px;border-radius:14px;margin-bottom:7px;background:var(--card);border:1px solid var(--border)}'
      +'.nfe-l.nova{border:1.5px solid #ff8a00;background:rgba(255,138,0,.08)}.nfe-l.ok{border-color:rgba(14,159,110,.45);background:rgba(14,159,110,.07)}'
      +'.nfe-i{flex:1;min-width:210px}.nfe-i b{display:block;font-size:13.5px;font-weight:700;word-break:break-word}'
      +'.nfe-i small{display:block;font-size:12px;color:var(--cinza);word-break:break-word}'
      +'.nfe-i code{font-family:ui-monospace,Consolas,monospace;font-size:10.5px;color:var(--cinza)}'
      +'.nfe-c{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:999px;margin:3px 4px 0 0}'
      +'.nfe-c.lar{background:rgba(255,138,0,.14);color:#ff9d2e;border:1px solid #ff8a00}.nfe-c.ok{background:rgba(14,159,110,.16);color:#2fd29b}'
      +'.nfe-c.az{background:rgba(51,85,255,.16);color:#8ea4ff}.nfe-c.rx{background:rgba(124,58,237,.18);color:#b99bff}.nfe-c.ba{background:rgba(255,90,79,.15);color:#ff7b70}'
      +'body.ap-esc-claro .nfe-c.lar{color:#c25e00}body.ap-esc-claro .nfe-c.ok{color:#0e9f6e}body.ap-esc-claro .nfe-c.az{color:#3355ff}body.ap-esc-claro .nfe-c.rx{color:#7c3aed}body.ap-esc-claro .nfe-c.ba{color:#d92d20}'
      +'.nfe-v{padding:14px 4px;font-size:13px;color:var(--cinza)}'
      +'.nfe-acts{display:flex;gap:6px;flex-wrap:wrap}'
      +'#nfe-cobra-dl{margin-top:9px}'
      +'.lcinfo span.nfe-c{display:inline-block;width:auto;margin-top:4px}'
      +'#nfe-cad{display:none;border:1.5px solid rgba(0,200,180,.55);border-radius:16px;padding:14px;margin-bottom:14px;background:rgba(0,200,180,.05)}#nfe-cad.on{display:block}'
      +'.nfe-cadf{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin:10px 0}'
      +'.nfe-cadf label{font-size:11px;color:var(--cinza);display:block;margin-bottom:3px}'
      +'.nfe-cadf input,.nfe-cadf select{width:100%;font:inherit;font-size:13px;padding:9px 11px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:inherit;outline:none}'
      +'.nfe-cadf>div{min-width:0}.nfe-cadf.prest .so-parc{display:none}'
      +'.nfe-rf{font-size:12px;line-height:1.5;border-radius:11px;padding:8px 11px;margin:6px 0;background:rgba(51,85,255,.10);border:1px solid rgba(51,85,255,.35);display:none}.nfe-rf.on{display:block}'
      +'.nfe-busca{display:flex;gap:6px}.nfe-busca input{flex:1}';
    document.head.appendChild(s);
  }

  /* ================= PAINEL: barra de sub-abas ================= */
  function irParaNotas(m, cli){
    modo=m||'saidas'; if(cli){ F.cli=cli; }
    try{
      var it=[].slice.call(document.querySelectorAll('#view-painel .sidebar .nav .nav-item'))
        .filter(function(x){ return /Notas? Fisca/i.test(x.textContent||''); })[0];
      if(it) it.click();
    }catch(e){}
    assEnt=''; assHon=''; assSrv=''; if(m==='srv' && cli){ S.cli=cli; } setTimeout(painel,60);
  }
  function contaNovas(){ return entradas(D.notas).filter(function(n){ return n.status!=='Conferida'; }).length; }
  function refPadrao(){
    var refs=refsHon(); var h=compHoje(); if(refs.indexOf(h)>-1) return h; return refs[0]||h;
  }
  function refsHon(){
    var o={}; D.hon.forEach(function(h){ var c=compDe(h.referencia); if(c) o[c]=1; });
    return Object.keys(o).sort(function(a,b){ return compOrd(b).localeCompare(compOrd(a)); });
  }
  function honDaRef(ref){ return D.hon.filter(function(h){ return compDe(h.referencia)===ref; })
    .sort(function(a,b){ return String(a.cliente).localeCompare(String(b.cliente),'pt-BR'); }); }
  function nfsDoHon(h){
    var ns=nfsHon(D.notas);
    for(var i=0;i<ns.length;i++) if(ns[i].honorarioId && String(ns[i].honorarioId)===String(h.id)) return ns[i];
    for(var j=0;j<ns.length;j++) if(!ns[j].honorarioId && mesmo(ns[j].cliente,h.cliente) && compDe(ns[j].referencia)===compDe(h.referencia)) return ns[j];
    return null;
  }
  function faltaNfs(){ var r=hRef||refPadrao(); return honDaRef(r).filter(function(h){ return !nfsDoHon(h); }).length; }

  function barraPainel(pg){
    var t=el('nfe-tabs');
    if(!t){
      t=document.createElement('div'); t.id='nfe-tabs'; t.className='nfe-tabs nfe-own';
      pg.insertBefore(t, pg.firstChild);
    }
    var nv=contaNovas(), fh=faltaNfs(), ns=servicos(D.notas).filter(function(n){ return n.status!=='Conferida'; }).length;
    var ass=modo+'|'+nv+'|'+fh+'|'+ns;
    if(t.getAttribute('data-a')!==ass){
      t.setAttribute('data-a',ass);
      t.innerHTML='<button class="nfe-tab'+(modo==='saidas'?' on':'')+'" data-nfe-m="saidas">\u{1F4E4} Saídas (vendas)</button>'
        +'<button class="nfe-tab'+(modo==='ent'?' on':'')+'" data-nfe-m="ent">\u{1F4E5} Entradas (compras)'+(nv?('<i>'+nv+' nova'+(nv>1?'s':'')+'</i>'):'')+'</button>'
        +'<button class="nfe-tab'+(modo==='srv'?' on':'')+'" data-nfe-m="srv">\u{1F488} Serviços recebidos (NFS-e)'+(ns?('<i>'+ns+' nova'+(ns>1?'s':'')+'</i>'):'')+'</button>'
        +'<button class="nfe-tab'+(modo==='hon'?' on':'')+'" data-nfe-m="hon">\u{1F3E2} Honorários APARAT'+(fh?('<i>'+fh+' sem NFS-e</i>'):'')+'</button>';
      [].forEach.call(t.querySelectorAll('[data-nfe-m]'),function(b){ b.onclick=function(){ modo=b.getAttribute('data-nfe-m'); assEnt=''; assHon=''; assSrv=''; painel(); }; });
    }
    pg.classList.toggle('nfe-m-ent', modo==='ent');
    pg.classList.toggle('nfe-m-hon', modo==='hon');
    pg.classList.toggle('nfe-m-srv', modo==='srv');
  }

  /* ================= PAINEL: entradas ================= */
  function optsCli(sel, todos){
    return (todos?'<option value="">Todos os clientes</option>':'<option value="">Escolha o cliente...</option>')
      +D.cli.map(function(c){ return '<option'+(mesmo(c.nome,sel)?' selected':'')+'>'+esc(c.nome)+'</option>'; }).join('');
  }
  function formManual(pre){
    return '<div class="nfe-frm" id="'+pre+'frm">'
      +'<div><label>Fornecedor *</label><input id="'+pre+'forn" placeholder="Nome do fornecedor"></div>'
      +'<div><label>CNPJ do fornecedor</label><input id="'+pre+'cnpj" placeholder="00.000.000/0000-00"></div>'
      +'<div><label>Número da NF *</label><input id="'+pre+'num" placeholder="Ex: 4518"></div>'
      +'<div><label>Data de emissão *</label><input id="'+pre+'data" type="date"></div>'
      +'<div><label>Valor total (R$) *</label><input id="'+pre+'val" placeholder="1.275,40" inputmode="decimal"></div>'
      +'<div><label>UF do fornecedor</label><input id="'+pre+'uf" maxlength="2" placeholder="SP"></div>'
      +'<div><label>PDF ou foto da nota *</label><input id="'+pre+'pdf" type="file" accept=".pdf,.png,.jpg,.jpeg"></div>'
      +'<div style="display:flex;align-items:flex-end"><button class="nfe-b ok" id="'+pre+'salvar" style="width:100%">\u{1F4BE} Salvar nota</button></div>'
      +'</div>';
  }
  function montaEnt(pg){
    var b=el('nfe-ent'); if(b) return b;
    b=document.createElement('div'); b.id='nfe-ent'; b.className='nfe-own';
    b.innerHTML='<div class="nfe-h">\u{1F4E5} Notas de entrada — compras dos clientes com os fornecedores</div>'
      +'<div class="nfe-s">O cliente manda pelo app dele ou você sobe aqui. O app lê o XML sozinho e não deixa a mesma nota entrar duas vezes.</div>'
      +'<div class="nfe-fil"><select id="nfe-f-cli"></select><select id="nfe-f-comp"></select><input id="nfe-f-q" placeholder="Buscar fornecedor, CNPJ, número ou chave..."></div>'
      +'<div id="nfe-kpi" class="nfe-kpis"></div>'
      +'<div class="nfe-drop" id="nfe-drop"><b>\u{1F4CE} Arraste aqui o XML da nota de compra</b>'
      +'<small>Fornecedor, CNPJ, chave de 44 dígitos, número, data, valor, UF e CFOP saem do próprio XML. Pode mandar vários de uma vez.</small>'
      +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><select id="nfe-up-cli" class="nfe-b" style="font-weight:600"></select>'
      +'<button class="nfe-b az" id="nfe-up-bt">\u{1F4C2} Escolher XML</button><button class="nfe-b" id="nfe-man-bt">\u{1F4C4} Só tenho o PDF</button></div>'
      +'<input type="file" id="nfe-up" accept=".xml,text/xml,application/xml" multiple style="display:none">'
      +formManual('nfe-m-')+'</div>'
      +'<div class="nfe-msg" id="nfe-msg"></div><div id="nfe-lista"></div>';
    pg.appendChild(b);
    var q=el('nfe-f-q'); q.oninput=function(){ F.q=q.value; assEnt=''; listaEnt(); };
    el('nfe-f-cli').onchange=function(){ F.cli=this.value; assEnt=''; entPainel(pg); };
    el('nfe-f-comp').onchange=function(){ F.comp=this.value; assEnt=''; entPainel(pg); };
    el('nfe-up-bt').onclick=function(){ if(!cliUp()) return; el('nfe-up').click(); };
    el('nfe-up').onchange=function(){ var fs=[].slice.call(this.files||[]); this.value=''; if(fs.length) subir(fs); };
    el('nfe-man-bt').onclick=function(){ el('nfe-m-frm').classList.toggle('on'); };
    el('nfe-m-salvar').onclick=async function(){
      var cli=cliUp(); if(!cli) return; var bt=this; bt.disabled=true;
      try{ var d=await enviarManual('nfe-m-', cli, D.notas, 'escritorio'); msg('nfe-msg','\u{2705} NF '+esc(d.numero)+' de '+esc(d.fornecedor)+' salva para '+esc(cli)+'.');
        ['forn','cnpj','num','data','val','uf','pdf'].forEach(function(k){ var e=el('nfe-m-'+k); if(e) e.value=''; }); el('nfe-m-frm').classList.remove('on');
      }catch(e){ msg('nfe-msg','\u{26D4} '+esc(e&&e.message?e.message:e)); }
      bt.disabled=false; assEnt=''; entPainel(pg);
    };
    var dz=el('nfe-drop');
    dz.addEventListener('dragover',function(e){ e.preventDefault(); dz.classList.add('sobre'); });
    dz.addEventListener('dragleave',function(){ dz.classList.remove('sobre'); });
    dz.addEventListener('drop',function(e){ e.preventDefault(); dz.classList.remove('sobre');
      var fs=[].slice.call((e.dataTransfer&&e.dataTransfer.files)||[]); if(fs.length && cliUp()) subir(fs); });
    return b;
  }
  function cliUp(){ var s=el('nfe-up-cli'), v=s?s.value:''; if(!v){ msg('nfe-msg','\u{261D}\u{FE0F} Escolha primeiro de qual cliente é a nota.'); if(s) s.focus(); return ''; } return v; }
  function msg(id,h){ var m=el(id); if(!m) return; m.innerHTML=h; m.classList.add('on'); }
  async function subir(fs){
    var cli=cliUp(); if(!cli) return;
    msg('nfe-msg','\u{23F3} Lendo '+fs.length+' arquivo'+(fs.length>1?'s':'')+'...');
    var r=await enviarXMLs(fs, cli, D.notas, cnpjDoCliente(cli), 'escritorio');
    msg('nfe-msg', r.html||'Nada enviado.'); assEnt=''; entPainel(el('pp-notas'));
  }
  function filtrarEnt(){
    var q=String(F.q||'').toLowerCase().trim(), qd=soDig(q);
    return entradas(D.notas).filter(function(n){
      if(F.cli && !mesmo(n.cliente,F.cli)) return false;
      if(F.comp && n.competencia!==F.comp) return false;
      if(!q) return true;
      return [n.fornecedor,n.numero,n.cliente].join(' ').toLowerCase().indexOf(q)>-1
        || (qd.length>=3 && (soDig(n.fornecedorCnpj).indexOf(qd)>-1 || soDig(n.chave).indexOf(qd)>-1));
    });
  }
  function tagsEnt(n){
    var t=n.status==='Conferida' ? '<span class="nfe-c ok">\u{2714} Conferida</span>' : '<span class="nfe-c lar">\u{25CF} Nova — conferir</span>';
    t+= n.origem==='cliente' ? '<span class="nfe-c rx">\u{1F4F1} Enviada pelo cliente</span>' : '<span class="nfe-c az">\u{1F3E2} Lançada pelo escritório</span>';
    if(n.ufEmit && n.ufDest && n.ufEmit!==n.ufDest) t+='<span class="nfe-c lar">\u{26A0}\u{FE0F} Outro estado ('+esc(n.ufEmit)+') — olhar ICMS-ST/DIFAL</span>';
    if(num(n.vST)>0) t+='<span class="nfe-c lar">ICMS-ST na nota: '+moeda(num(n.vST))+'</span>';
    if(n.alerta) t+='<span class="nfe-c ba">\u{26A0}\u{FE0F} '+esc(n.alerta)+'</span>';
    return t;
  }
  function linhaEnt(n, i, comCli){
    var det=[]; if(comCli) det.push('<b style="display:inline">'+esc(n.cliente)+'</b>');
    det.push('NF '+esc(n.numero)+(n.serie?('/'+esc(n.serie)):'')); if(n.data) det.push(esc(n.data));
    if(n.fornecedorCnpj) det.push(esc(n.fornecedorCnpj)); if(n.cfop) det.push('CFOP '+esc(n.cfop));
    return '<div class="nfe-l '+(n.status==='Conferida'?'ok':'nova')+'"><div class="nfe-i"><b>'+esc(n.fornecedor||'Fornecedor')+' — '+moeda(num(n.valor))+'</b>'
      +'<small>'+det.join(' · ')+'</small>'+(n.chave?('<code>Chave: '+esc(fmtChave(n.chave))+'</code>'):'')+'<div>'+tagsEnt(n)+'</div></div>'
      +'<div class="nfe-acts">'+(n.arquivoData?'<button class="nfe-b" data-nfe-x="'+i+'">\u{2B07}\u{FE0F} XML</button>':'')
      +(n.pdfData?'<button class="nfe-b" data-nfe-p="'+i+'">\u{2B07}\u{FE0F} PDF</button>':'')
      +(n.status==='Conferida'?'<button class="nfe-b" data-nfe-r="'+i+'">\u{21A9}\u{FE0F} Reabrir</button>':'<button class="nfe-b ok" data-nfe-ok="'+i+'">\u{2714} Conferir</button>')
      +'<button class="nfe-b ba" data-nfe-del="'+i+'">\u{1F5D1}\u{FE0F}</button></div></div>';
  }
  function listaEnt(){
    var box=el('nfe-lista'); if(!box) return;
    var v=filtrarEnt(), ass=F.cli+'|'+F.comp+'|'+F.q+'|'+v.map(function(n){ return n.id+(n.status||''); }).join(',');
    if(ass===assEnt) return; assEnt=ass;
    var tot=0, fo={}, inter=0, nv=0;
    v.forEach(function(n){ tot+=num(n.valor); fo[soDig(n.fornecedorCnpj)||n.fornecedor]=1; if(n.ufEmit&&n.ufDest&&n.ufEmit!==n.ufDest) inter++; if(n.status!=='Conferida') nv++; });
    var k=el('nfe-kpi');
    if(k) k.innerHTML='<div class="nfe-kpi"><b>'+v.length+'</b><span>notas de entrada'+(F.comp?(' em '+esc(F.comp)):' (todos os meses)')+'</span></div>'
      +'<div class="nfe-kpi"><b>'+moeda(tot)+'</b><span>total comprado</span></div>'
      +'<div class="nfe-kpi"><b>'+Object.keys(fo).length+'</b><span>fornecedores diferentes</span></div>'
      +'<div class="nfe-kpi"><b style="color:#ff9d2e">'+nv+'</b><span>a conferir</span></div>'
      +'<div class="nfe-kpi"><b style="color:#ff9d2e">'+inter+'</b><span>de outro estado (olhar ICMS-ST/DIFAL)</span></div>';
    if(!v.length){ box.innerHTML='<div class="nfe-v">Nenhuma nota de entrada'+(F.cli?(' de '+esc(F.cli)):'')+(F.comp?(' em '+esc(F.comp)):'')+' ainda.</div>'; return; }
    var h='', grupo='';
    v.forEach(function(n){
      var g=n.competencia||'Sem data';
      if(g!==grupo){ grupo=g; h+='<div class="nfe-grp">Competência '+esc(g)+'</div>'; }
      h+=linhaEnt(n, D.notas.indexOf(n), !F.cli);
    });
    box.innerHTML=h;
    ligarAcoes(box, D.notas, function(){ assEnt=''; entPainel(el('pp-notas')); });
  }
  function ligarAcoes(box, lista, depois){
    [].forEach.call(box.querySelectorAll('[data-nfe-x]'),function(b){ b.onclick=function(){ var n=lista[+b.getAttribute('data-nfe-x')]; baixar(n.arquivoData, nomeXml(n)); }; });
    [].forEach.call(box.querySelectorAll('[data-nfe-p]'),function(b){ b.onclick=function(){ var n=lista[+b.getAttribute('data-nfe-p')]; baixar(n.pdfData, nomePdf(n)); }; });
    [].forEach.call(box.querySelectorAll('[data-nfe-ok],[data-nfe-r]'),function(b){ b.onclick=async function(){
      var ok=b.hasAttribute('data-nfe-ok'), n=lista[+(b.getAttribute('data-nfe-ok')||b.getAttribute('data-nfe-r'))]; if(!n) return;
      b.disabled=true;
      try{ var dd=ok?{status:'Conferida', conferidaEm:agoraBR(), conferidaPor:'Escritório'}:{status:'Nova', conferidaEm:'', conferidaPor:''};
        await db().collection('notas').doc(String(n.id)).set(dd,{merge:true}); Object.assign(n,dd);
        if(ok) aviso('\u{2705} Nota conferida.','success');
      }catch(e){ aviso('Não consegui gravar: '+(e&&e.message?e.message:e),'warn'); }
      depois();
    }; });
    [].forEach.call(box.querySelectorAll('[data-nfe-del]'),function(b){ b.onclick=async function(){
      var n=lista[+b.getAttribute('data-nfe-del')]; if(!n) return;
      if(!confirm('Excluir a NF '+(n.numero||'')+' de '+(n.fornecedor||'')+' ('+(n.cliente||'')+')?\nIsso não pode ser desfeito.')) return;
      b.disabled=true;
      try{ await db().collection('notas').doc(String(n.id)).delete(); var i=lista.indexOf(n); if(i>-1) lista.splice(i,1); aviso('\u{1F5D1}\u{FE0F} Nota excluída.','info'); }
      catch(e){ aviso('Não consegui excluir: '+(e&&e.message?e.message:e),'warn'); }
      depois();
    }; });
  }
  function entPainel(pg){
    if(!pg) return; montaEnt(pg);
    var f=foco(); if(f!==focoVisto){ focoVisto=f; if(f){ F.cli=f; } assEnt=''; }
    var sc=el('nfe-f-cli'), su=el('nfe-up-cli'), sp=el('nfe-f-comp');
    var aCli=D.cli.map(function(c){ return c.nome; }).join('|')+'#'+F.cli;
    if(sc.getAttribute('data-a')!==aCli){ sc.setAttribute('data-a',aCli); sc.innerHTML=optsCli(F.cli,true); su.innerHTML=optsCli(F.cli||su.value,false); }
    var comps={}; entradas(D.notas).forEach(function(n){ if(n.competencia) comps[n.competencia]=1; });
    comps[compHoje()]=1; comps[compFicha()]=1;
    var lc=Object.keys(comps).sort(function(a,b){ return compOrd(b).localeCompare(compOrd(a)); });
    var aComp=lc.join('|')+'#'+F.comp;
    if(sp.getAttribute('data-a')!==aComp){ sp.setAttribute('data-a',aComp);
      sp.innerHTML='<option value="">Todos os meses</option>'+lc.map(function(c){ return '<option'+(c===F.comp?' selected':'')+'>'+c+'</option>'; }).join(''); }
    listaEnt();
  }

  /* ================= SERVICOS RECEBIDOS (NFS-e tomadas) ================= */
  var LEI='Na parceria de salão de beleza/barbearia (Lei 13.352/2016), a cota-parte do profissional-parceiro <b>não entra na receita bruta do salão-parceiro</b>, mesmo com nota unificada ao consumidor (Lei 12.592/2012, art. 1º-A, § 5º). Confira esse total antes de apurar o PGDAS — o contrato de parceria precisa estar homologado.';
  function selTipo(id, val){
    return '<select id="'+id+'" class="nfe-b" style="font-weight:600"><option value="sim"'+(val!=='nao'?' selected':'')+'>\u{1F91D} Profissional-parceiro (cota-parte)</option><option value="nao"'+(val==='nao'?' selected':'')+'>\u{1F9F0} Outro prestador de serviço</option></select>';
  }
  function formServ(pre){
    return '<div class="nfe-frm" id="'+pre+'frm">'
      +'<div><label>Prestador (quem emitiu) *</label><input id="'+pre+'forn" placeholder="Nome do profissional ou empresa"></div>'
      +'<div><label>CNPJ do prestador (preenche sozinho)</label><input id="'+pre+'cnpj" placeholder="00.000.000/0000-00" inputmode="numeric"></div>'
      +'<div><label>Número da NFS-e *</label><input id="'+pre+'num" placeholder="Ex: 27"></div>'
      +'<div><label>Data de emissão *</label><input id="'+pre+'data" type="date"></div>'
      +'<div><label>Valor do serviço (R$) *</label><input id="'+pre+'val" placeholder="1.275,40" inputmode="decimal"></div>'
      +'<div><label>Tipo *</label><select id="'+pre+'par" style="width:100%"><option value="sim">Profissional-parceiro</option><option value="nao">Outro prestador</option></select></div>'
      +'<div><label>PDF ou foto da NFS-e *</label><input id="'+pre+'pdf" type="file" accept=".pdf,.png,.jpg,.jpeg"></div>'
      +'<div style="display:flex;align-items:flex-end"><button class="nfe-b ok" id="'+pre+'salvar" style="width:100%">\u{1F4BE} Salvar NFS-e</button></div>'
      +'<div class="nfe-rf" id="'+pre+'rf" style="grid-column:1/-1"></div>'
      +'</div>';
  }
  /* buscador no formulario "so tenho o PDF": ao completar 14 digitos, preenche o prestador (cadastro primeiro, depois Receita) */
  function ligarBuscaForm(pre, pegaCli){
    var inp=el(pre+'cnpj'); if(!inp || inp.__busca) return; inp.__busca=1; var ult='';
    async function vai(){
      var d=soDig(inp.value); if(d.length!==14 && d.length!==11) return; if(d===ult) return; ult=d;
      var rf=el(pre+'rf'), cli=pegaCli(), cad=cli?acharCad(cli,d,''):null;
      if(cad){ el(pre+'forn').value=cad.nome||''; if(el(pre+'par')) el(pre+'par').value=(cad.tipo==='prestador')?'nao':'sim';
        rf.innerHTML='\u{1F4C7} <b>'+esc(cad.nome)+'</b> já está no cadastro como '+(cad.tipo==='prestador'?'outro prestador':'<b>profissional-parceiro</b>'+(cad.funcao?(' · '+esc(cad.funcao)):''))
          +(cad.tipo!=='prestador' && cad.homologado!=='Sim'?' · \u{26A0}\u{FE0F} contrato sem homologação':'')+(/deslig/i.test(cad.situacao||'')?' · \u{26A0}\u{FE0F} DESLIGADO':'');
        rf.classList.add('on'); return; }
      if(d.length!==14) return;
      rf.innerHTML='\u{23F3} Consultando o CNPJ na Receita...'; rf.classList.add('on');
      try{ var r=await buscaCnpj(d); if(soDig(inp.value)!==d) return;
        el(pre+'forn').value=r.razao; inp.value=fmtCnpj(d);
        rf.innerHTML='\u{2705} <b>'+esc(r.razao)+'</b>'+(r.fantasia?(' ('+esc(r.fantasia)+')'):'')+' · '+esc(r.situacao||'')+(r.mei?' · MEI':'')+(r.municipio?(' · '+esc(r.municipio)+'/'+esc(r.uf)):'')
          +(r.cnaeDesc?('<br>Atividade: '+esc(r.cnaeDesc)):'')+(/ativa/i.test(r.situacao||'')?'':' <br>\u{26A0}\u{FE0F} CNPJ não está ATIVO na Receita');
      }catch(e){ rf.innerHTML='\u{26A0}\u{FE0F} '+esc(e&&e.message?e.message:e); }
    }
    inp.addEventListener('input', vai); inp.addEventListener('blur', vai);
  }

  /* ================= PAINEL: cadastro de parceiros e prestadores ================= */
  var cadEdit=-1, cadCli='';
  var FUNCOES=['Cabeleireiro(a) / Barbeiro(a)','Manicure/Pedicure','Esteticista','Maquiador(a)','Depilador(a)','Designer de sobrancelhas','Outro'];
  function formCad(){
    return '<div class="nfe-cadf" id="nfe-cd-f">'
      +'<div><label>Tipo *</label><select id="nfe-cd-tipo"><option value="parceiro">\u{1F91D} Profissional-parceiro do salão</option><option value="prestador">\u{1F9F0} Outro prestador de serviço</option></select></div>'
      +'<div style="grid-column:span 2"><label>CNPJ (digite e o resto preenche sozinho)</label><div class="nfe-busca"><input id="nfe-cd-cnpj" placeholder="00.000.000/0000-00" inputmode="numeric"><button class="nfe-b az" id="nfe-cd-bus">\u{1F50E} Buscar</button></div></div>'
      +'<div style="grid-column:span 2"><label>Nome *</label><input id="nfe-cd-nome" placeholder="Nome do profissional ou da empresa"></div>'
      +'<div><label>CPF</label><input id="nfe-cd-cpf" placeholder="000.000.000-00" inputmode="numeric"></div>'
      +'<div class="so-parc"><label>Função</label><select id="nfe-cd-func"><option value="">Escolha...</option>'+FUNCOES.map(function(f){ return '<option>'+f+'</option>'; }).join('')+'</select></div>'
      +'<div class="so-parc"><label>% cota-parte do profissional</label><input id="nfe-cd-cota" placeholder="Ex: 60" inputmode="decimal"></div>'
      +'<div class="so-parc"><label>Contrato homologado? *</label><select id="nfe-cd-hom"><option value="Nao">Não / não sei</option><option value="Sim">Sim</option></select></div>'
      +'<div class="so-parc"><label>Data da homologação</label><input id="nfe-cd-dhom" type="date"></div>'
      +'<div class="so-parc"><label>Sindicato / órgão que homologou</label><input id="nfe-cd-org" placeholder="Ex: Sindicato dos Cabeleireiros de Franca"></div>'
      +'<div><label>Telefone / WhatsApp</label><input id="nfe-cd-tel" placeholder="(16) 90000-0000" inputmode="tel"></div>'
      +'<div><label>Situação</label><select id="nfe-cd-sit"><option>Ativo</option><option>Desligado</option></select></div>'
      +'<div style="display:flex;align-items:flex-end;gap:6px"><button class="nfe-b ok" id="nfe-cd-salvar" style="flex:1">\u{1F4BE} Salvar</button><button class="nfe-b" id="nfe-cd-limpar">Limpar</button></div>'
      +'</div><div class="nfe-rf" id="nfe-cd-rf"></div>';
  }
  function montaCad(box){
    var b=el('nfe-cad'); if(b) return b;
    b=document.createElement('div'); b.id='nfe-cad';
    b.innerHTML='<div class="nfe-h">\u{1F465} Cadastro de parceiros e prestadores do cliente</div>'
      +'<div class="nfe-s">Com o CNPJ cadastrado, a nota que chegar desse prestador já entra sozinha no tipo certo, e o app avisa se o parceiro estiver desligado ou com o contrato sem homologação.</div>'
      +'<div class="nfe-fil"><select id="nfe-cd-cli"></select><input id="nfe-cd-q" placeholder="Buscar no cadastro (nome, CPF, CNPJ)..."></div>'
      +formCad()+'<div id="nfe-cd-lista"></div>';
    box.parentNode.insertBefore(b, box);
    var tp=el('nfe-cd-tipo'); tp.onchange=function(){ el('nfe-cd-f').classList.toggle('prest', tp.value==='prestador'); };
    el('nfe-cd-cli').onchange=function(){ cadCli=this.value; limparCad(); listaCad(); };
    el('nfe-cd-q').oninput=listaCad;
    el('nfe-cd-bus').onclick=function(){ buscarCad(true); };
    var ci=el('nfe-cd-cnpj'); ci.addEventListener('input',function(){ if(soDig(ci.value).length===14) buscarCad(false); });
    el('nfe-cd-limpar').onclick=limparCad;
    el('nfe-cd-salvar').onclick=salvarCad;
    return b;
  }
  var cadUlt='';
  async function buscarCad(forca){
    var d=soDig(el('nfe-cd-cnpj').value), rf=el('nfe-cd-rf'); if(!forca && d===cadUlt) return; cadUlt=d;
    rf.innerHTML='\u{23F3} Consultando o CNPJ na Receita...'; rf.classList.add('on');
    try{ var r=await buscaCnpj(d);
      el('nfe-cd-cnpj').value=fmtCnpj(d);
      el('nfe-cd-nome').value=r.nomePessoa||r.razao;
      if(r.cpfMei && !soDig(el('nfe-cd-cpf').value)) el('nfe-cd-cpf').value=fmtCnpj(r.cpfMei);
      if(r.telefone && !soDig(el('nfe-cd-tel').value)) el('nfe-cd-tel').value=r.telefone;
      if(r.funcao && !el('nfe-cd-func').value) el('nfe-cd-func').value=r.funcao;
      var jaTem=cadCli?acharCad(cadCli,d,''):null;
      rf.innerHTML='\u{2705} <b>'+esc(r.razao)+'</b>'+(r.fantasia?(' ('+esc(r.fantasia)+')'):'')+'<br>Situação na Receita: <b>'+esc(r.situacao||'?')+'</b>'+(r.mei?' · MEI':'')
        +(r.municipio?(' · '+esc(r.municipio)+'/'+esc(r.uf)):'')+(r.cnaeDesc?('<br>Atividade: '+esc(r.cnae)+' – '+esc(r.cnaeDesc)):'')
        +(r.cpfMei?'<br>CPF tirado do nome do MEI: '+esc(fmtCnpj(r.cpfMei)):'')
        +(/ativa/i.test(r.situacao||'')?'':'<br>\u{26A0}\u{FE0F} Este CNPJ não está ATIVO na Receita.')
        +(jaTem&&cadEdit<0?'<br>\u{26A0}\u{FE0F} Esse CNPJ já está no cadastro deste cliente ('+esc(jaTem.nome)+').':'')
        +'<br><small>Fonte: '+esc(r.fonte)+'. Confira antes de salvar.</small>';
    }catch(e){ rf.innerHTML='\u{26A0}\u{FE0F} '+esc(e&&e.message?e.message:e); }
  }
  function limparCad(){ cadEdit=-1; cadUlt=''; ['cnpj','nome','cpf','cota','dhom','org','tel'].forEach(function(k){ el('nfe-cd-'+k).value=''; });
    el('nfe-cd-func').value=''; el('nfe-cd-hom').value='Nao'; el('nfe-cd-sit').value='Ativo'; el('nfe-cd-rf').classList.remove('on');
    el('nfe-cd-salvar').innerHTML='\u{1F4BE} Salvar'; }
  function preencherCad(p){
    el('nfe-cd-tipo').value=p.tipo==='prestador'?'prestador':'parceiro'; el('nfe-cd-tipo').onchange();
    el('nfe-cd-cnpj').value=p.cnpj||''; el('nfe-cd-nome').value=p.nome||''; el('nfe-cd-cpf').value=p.cpf||'';
    el('nfe-cd-func').value=p.funcao||''; el('nfe-cd-cota').value=p.cota||''; el('nfe-cd-hom').value=p.homologado==='Sim'?'Sim':'Nao';
    el('nfe-cd-dhom').value=p.dataHom||''; el('nfe-cd-org').value=p.orgao||''; el('nfe-cd-tel').value=p.telefone||''; el('nfe-cd-sit').value=p.situacao||'Ativo';
    cadUlt=soDig(p.cnpj);
  }
  async function salvarCad(){
    var cli=cadCli; if(!cli){ aviso('Escolha o cliente primeiro.','warn'); return; }
    var p={tipo:el('nfe-cd-tipo').value, nome:String(el('nfe-cd-nome').value||'').trim(), cnpj:fmtCnpj(el('nfe-cd-cnpj').value), cpf:fmtCnpj(el('nfe-cd-cpf').value),
      funcao:el('nfe-cd-func').value, cota:String(el('nfe-cd-cota').value||'').replace(/[^0-9,.]/g,''), homologado:el('nfe-cd-hom').value, dataHom:el('nfe-cd-dhom').value,
      orgao:String(el('nfe-cd-org').value||'').trim(), telefone:String(el('nfe-cd-tel').value||'').trim(), situacao:el('nfe-cd-sit').value, atualizadoEm:agoraBR()};
    var rf=el('nfe-cd-rf');
    function erro(m){ rf.innerHTML='\u{26D4} '+m; rf.classList.add('on'); }
    if(!p.nome) return erro('preencha o nome.');
    if(!soDig(p.cnpj) && !soDig(p.cpf)) return erro('preencha o CNPJ ou o CPF.');
    if(soDig(p.cnpj) && !dvCnpj(p.cnpj)) return erro('CNPJ inválido.');
    if(soDig(p.cpf) && !dvCpf(p.cpf)) return erro('CPF inválido.');
    var cota=num(p.cota); if(p.cota && (cota<=0 || cota>100)) return erro('a cota-parte tem que ser entre 1 e 100%.');
    if(p.tipo==='prestador'){ p.funcao=''; p.cota=''; p.homologado=''; p.dataHom=''; p.orgao=''; }
    var l=cadDe(cli).slice();
    for(var i=0;i<l.length;i++){ if(i===cadEdit) continue; if((soDig(p.cnpj) && soDig(l[i].cnpj)===soDig(p.cnpj)) || (soDig(p.cpf) && soDig(l[i].cpf)===soDig(p.cpf) && !soDig(p.cnpj))) return erro('esse CNPJ/CPF já está cadastrado ('+esc(l[i].nome)+').'); }
    if(cadEdit>-1){ p.criadoEm=l[cadEdit].criadoEm||''; l[cadEdit]=p; } else { p.criadoEm=agoraBR(); l.push(p); }
    var bt=el('nfe-cd-salvar'); bt.disabled=true;
    try{ await gravarCad(cli, l); aviso('\u{2705} '+p.nome+' salvo no cadastro de '+cli+'.','success'); limparCad(); }
    catch(e){ erro('não consegui gravar: '+esc(e&&e.message?e.message:e)); }
    bt.disabled=false; listaCad(); assSrv=''; listaSrv();
  }
  function listaCad(){
    var box=el('nfe-cd-lista'); if(!box) return;
    var sel=el('nfe-cd-cli'), a=D.cli.map(function(c){ return c.nome; }).join('|')+'#'+cadCli;
    if(sel.getAttribute('data-a')!==a){ sel.setAttribute('data-a',a); sel.innerHTML=optsCli(cadCli,false); }
    if(!cadCli){ box.innerHTML='<div class="nfe-v">Escolha o cliente para ver e cadastrar os parceiros e prestadores dele.</div>'; return; }
    var q=String(el('nfe-cd-q').value||'').toLowerCase().trim(), qd=soDig(q), l=cadDe(cadCli);
    var v=l.map(function(p,i){ return {p:p,i:i}; }).filter(function(o){ var p=o.p; if(!q) return true;
      return String(p.nome||'').toLowerCase().indexOf(q)>-1 || (qd.length>=3 && (soDig(p.cnpj).indexOf(qd)>-1 || soDig(p.cpf).indexOf(qd)>-1)); });
    var np=0, nd=0, no=0; l.forEach(function(p){ if(p.tipo==='prestador') no++; else if(/deslig/i.test(p.situacao||'')) nd++; else np++; });
    var h='<div class="nfe-grp">'+esc(cadCli)+' · '+np+' parceiro'+(np===1?'':'s')+' ativo'+(np===1?'':'s')+(nd?(' · '+nd+' desligado'+(nd===1?'':'s')):'')+' · '+no+' outro'+(no===1?'':'s')+' prestador'+(no===1?'':'es')+'</div>';
    if(!v.length) h+='<div class="nfe-v">'+(l.length?'Nada encontrado.':'Nenhum cadastro ainda. Digite o CNPJ acima que o app preenche o resto.')+'</div>';
    v.forEach(function(o){ var p=o.p, ep=p.tipo!=='prestador', dl=/deslig/i.test(p.situacao||'');
      var det=[]; if(p.cnpj) det.push('CNPJ '+esc(p.cnpj)); if(p.cpf) det.push('CPF '+esc(p.cpf)); if(p.telefone) det.push(esc(p.telefone));
      h+='<div class="nfe-l'+(dl?'':' ok')+'"><div class="nfe-i"><b>'+esc(p.nome)+'</b><small>'+det.join(' · ')+'</small><div>'
        +(ep?'<span class="nfe-c ve">\u{1F91D} Parceiro'+(p.funcao?(' · '+esc(p.funcao)):'')+(p.cota?(' · '+esc(p.cota)+'% do profissional'):'')+'</span>':'<span class="nfe-c az">\u{1F9F0} Outro prestador</span>')
        +(ep?(p.homologado==='Sim'?'<span class="nfe-c ok">\u{2714} Homologado'+(p.dataHom?(' em '+esc(p.dataHom.split('-').reverse().join('/'))):'')+'</span>':'<span class="nfe-c lar">\u{26A0}\u{FE0F} Contrato sem homologação</span>'):'')
        +(dl?'<span class="nfe-c ba">Desligado</span>':'<span class="nfe-c ok">Ativo</span>')+'</div></div>'
        +'<div class="nfe-acts">'+(p.telefone?'<button class="nfe-b" data-cd-wa="'+o.i+'">\u{1F4F2} WhatsApp</button>':'')
        +'<button class="nfe-b" data-cd-ed="'+o.i+'">\u{270F}\u{FE0F} Editar</button><button class="nfe-b ba" data-cd-del="'+o.i+'">\u{1F5D1}\u{FE0F}</button></div></div>';
    });
    box.innerHTML=h;
    [].forEach.call(box.querySelectorAll('[data-cd-ed]'),function(b){ b.onclick=function(){ cadEdit=+b.getAttribute('data-cd-ed'); preencherCad(cadDe(cadCli)[cadEdit]); el('nfe-cd-salvar').innerHTML='\u{1F4BE} Salvar alteração'; el('nfe-cd-f').scrollIntoView({behavior:'smooth',block:'center'}); }; });
    [].forEach.call(box.querySelectorAll('[data-cd-wa]'),function(b){ b.onclick=function(){ var p=cadDe(cadCli)[+b.getAttribute('data-cd-wa')], t=soDig(p.telefone); if(t.length<=11) t='55'+t; window.open('https://wa.me/'+t,'_blank'); }; });
    [].forEach.call(box.querySelectorAll('[data-cd-del]'),function(b){ b.onclick=async function(){
      var i=+b.getAttribute('data-cd-del'), l2=cadDe(cadCli).slice(), p=l2[i]; if(!p) return;
      if(!confirm('Tirar '+p.nome+' do cadastro de '+cadCli+'?\nAs notas já enviadas continuam. Se ele só saiu do salão, prefira Editar → Situação: Desligado.')) return;
      l2.splice(i,1); try{ await gravarCad(cadCli, l2); limparCad(); }catch(e){ aviso('Não consegui excluir: '+(e&&e.message?e.message:e),'warn'); } listaCad(); }; });
  }
  function abrirCad(cli, pre){
    var b=el('nfe-cad'); if(!b) return; b.classList.add('on'); var bt=el('nfe-s-cad-bt'); if(bt) bt.classList.add('az');
    cadCli=cli||cadCli||S.cli||(el('nfe-s-up-cli')||{}).value||''; limparCad(); listaCad();
    if(pre){ el('nfe-cd-tipo').value=pre.parceiro?'parceiro':'prestador'; el('nfe-cd-tipo').onchange(); el('nfe-cd-nome').value=pre.fornecedor||''; el('nfe-cd-cnpj').value=pre.fornecedorCnpj||'';
      if(soDig(pre.fornecedorCnpj).length===14) buscarCad(true); }
    b.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function limpaServ(pre){ ['forn','cnpj','num','data','val','pdf'].forEach(function(k){ var e=el(pre+k); if(e) e.value=''; }); var f=el(pre+'frm'); if(f) f.classList.remove('on'); }
  function cliUpS(){ var s=el('nfe-s-up-cli'), v=s?s.value:''; if(!v){ msg('nfe-s-msg','\u{261D}\u{FE0F} Escolha primeiro de qual cliente é a nota.'); if(s) s.focus(); return ''; } return v; }
  async function subirS(fs){
    var cli=cliUpS(); if(!cli) return; var par=(el('nfe-s-tipo')||{}).value!=='nao';
    msg('nfe-s-msg','\u{23F3} Lendo '+fs.length+' arquivo'+(fs.length>1?'s':'')+'...');
    var r=await enviarXMLs(fs, cli, D.notas, cnpjDoCliente(cli), 'escritorio', par);
    msg('nfe-s-msg', r.html||'Nada enviado.'); assSrv=''; assEnt=''; srvPainel(el('pp-notas'));
  }
  function montaSrv(pg){
    var b=el('nfe-srv'); if(b) return b;
    b=document.createElement('div'); b.id='nfe-srv'; b.className='nfe-own';
    b.innerHTML='<div class="nfe-h">\u{1F488} Serviços recebidos — NFS-e que os clientes recebem de prestadores e parceiros</div>'
      +'<div class="nfe-s">Ex.: a Castro Barbearia recebe a NFS-e de cada profissional-parceiro. O cliente manda pelo app dele ou você sobe aqui. O app lê o XML da NFS-e (Padrão Nacional ou GINFES/ABRASF) e não deixa a mesma nota entrar duas vezes.</div>'
      +'<div class="nfe-lei">'+LEI+'</div>'
      +'<div class="nfe-fil"><select id="nfe-s-f-cli"></select><select id="nfe-s-f-comp"></select>'
      +'<select id="nfe-s-f-par"><option value="">Todos os tipos</option><option value="sim">Só parceiros</option><option value="nao">Só outros prestadores</option></select>'
      +'<input id="nfe-s-f-q" placeholder="Buscar prestador, CPF/CNPJ ou número..."></div>'
      +'<div id="nfe-s-kpi" class="nfe-kpis"></div>'
      +'<div class="nfe-drop" id="nfe-s-drop"><b>\u{1F4CE} Arraste aqui o XML da NFS-e recebida</b>'
      +'<small>Prestador, CPF/CNPJ, número, data, competência, valor e tomador saem do próprio XML. Pode mandar vários de uma vez.</small>'
      +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><select id="nfe-s-up-cli" class="nfe-b" style="font-weight:600"></select>'+selTipo('nfe-s-tipo','sim')
      +'<button class="nfe-b az" id="nfe-s-up-bt">\u{1F4C2} Escolher XML</button><button class="nfe-b" id="nfe-s-man-bt">\u{1F4C4} Só tenho o PDF</button><button class="nfe-b" id="nfe-s-cad-bt">\u{1F465} Parceiros e prestadores</button></div>'
      +'<input type="file" id="nfe-s-up" accept=".xml,text/xml,application/xml" multiple style="display:none">'
      +formServ('nfe-sm-')+'</div>'
      +'<div class="nfe-msg" id="nfe-s-msg"></div><div id="nfe-s-lista"></div>';
    pg.appendChild(b);
    montaCad(el('nfe-s-kpi'));
    el('nfe-s-cad-bt').onclick=function(){ var c=el('nfe-cad'); if(c.classList.contains('on')){ c.classList.remove('on'); this.classList.remove('az'); } else abrirCad(); };
    ligarBuscaForm('nfe-sm-', function(){ return (el('nfe-s-up-cli')||{}).value||''; });
    el('nfe-s-f-q').oninput=function(){ S.q=this.value; assSrv=''; listaSrv(); };
    el('nfe-s-f-cli').onchange=function(){ S.cli=this.value; assSrv=''; srvPainel(pg); };
    el('nfe-s-f-comp').onchange=function(){ S.comp=this.value; assSrv=''; srvPainel(pg); };
    el('nfe-s-f-par').onchange=function(){ S.par=this.value; assSrv=''; listaSrv(); };
    el('nfe-s-up-bt').onclick=function(){ if(!cliUpS()) return; el('nfe-s-up').click(); };
    el('nfe-s-up').onchange=function(){ var fs=[].slice.call(this.files||[]); this.value=''; if(fs.length) subirS(fs); };
    el('nfe-s-man-bt').onclick=function(){ var f=el('nfe-sm-frm'); f.classList.toggle('on'); var t=el('nfe-s-tipo'), p=el('nfe-sm-par'); if(t&&p) p.value=t.value; };
    el('nfe-sm-salvar').onclick=async function(){
      var cli=cliUpS(); if(!cli) return; var bt=this; bt.disabled=true;
      try{ var d=await enviarManualServ('nfe-sm-', cli, D.notas, 'escritorio'); msg('nfe-s-msg','\u{2705} NFS-e '+esc(d.numero)+' de '+esc(d.fornecedor)+' salva para '+esc(cli)+(d.parceiro?' (profissional-parceiro).':'.')); limpaServ('nfe-sm-'); }
      catch(e){ msg('nfe-s-msg','\u{26D4} '+esc(e&&e.message?e.message:e)); }
      bt.disabled=false; assSrv=''; srvPainel(pg);
    };
    var dz=el('nfe-s-drop');
    dz.addEventListener('dragover',function(e){ e.preventDefault(); dz.classList.add('sobre'); });
    dz.addEventListener('dragleave',function(){ dz.classList.remove('sobre'); });
    dz.addEventListener('drop',function(e){ e.preventDefault(); dz.classList.remove('sobre');
      var fs=[].slice.call((e.dataTransfer&&e.dataTransfer.files)||[]); if(fs.length && cliUpS()) subirS(fs); });
    return b;
  }
  function filtrarSrv(){
    var q=String(S.q||'').toLowerCase().trim(), qd=soDig(q);
    return servicos(D.notas).filter(function(n){
      if(S.cli && !mesmo(n.cliente,S.cli)) return false;
      if(S.comp && n.competencia!==S.comp) return false;
      if(S.par==='sim' && !n.parceiro) return false;
      if(S.par==='nao' && n.parceiro) return false;
      if(!q) return true;
      return [n.fornecedor,n.numero,n.cliente,n.descricao].join(' ').toLowerCase().indexOf(q)>-1
        || (qd.length>=3 && (soDig(n.fornecedorCnpj).indexOf(qd)>-1 || soDig(n.chaveNfse).indexOf(qd)>-1));
    });
  }
  function tagsSrv(n){
    var t=n.status==='Conferida' ? '<span class="nfe-c ok">\u{2714} Conferida</span>' : '<span class="nfe-c lar">\u{25CF} Nova — conferir</span>';
    t+= n.parceiro ? '<span class="nfe-c ve">\u{1F91D} Profissional-parceiro · fora da receita bruta do salão</span>' : '<span class="nfe-c az">\u{1F9F0} Outro prestador</span>';
    t+= n.origem==='cliente' ? '<span class="nfe-c rx">\u{1F4F1} Enviada pelo cliente</span>' : '<span class="nfe-c az">\u{1F3E2} Lançada pelo escritório</span>';
    var cd=acharCad(n.cliente, n.fornecedorCnpj, n.fornecedor);
    t+= cd ? '<span class="nfe-c ok">\u{1F4C7} No cadastro'+(cd.funcao?(' · '+esc(cd.funcao)):'')+(cd.cota?(' · '+esc(cd.cota)+'%'):'')+'</span>' : '<span class="nfe-c lar">\u{1F4C7} Fora do cadastro</span>';
    if(n.alerta) t+='<span class="nfe-c ba">\u{26A0}\u{FE0F} '+esc(n.alerta)+'</span>';
    return t;
  }
  function linhaSrv(n, i, comCli){
    var det=[]; if(comCli) det.push('<b style="display:inline">'+esc(n.cliente)+'</b>');
    det.push('NFS-e '+esc(n.numero)); if(n.data) det.push(esc(n.data)); if(n.fornecedorCnpj) det.push(esc(n.fornecedorCnpj));
    if(n.codServ) det.push('Serviço '+esc(n.codServ)); if(n.modelo) det.push(esc(n.modelo));
    return '<div class="nfe-l '+(n.status==='Conferida'?'ok':'nova')+'"><div class="nfe-i"><b>'+esc(n.fornecedor||'Prestador')+' — '+moeda(num(n.valor))+'</b>'
      +'<small>'+det.join(' · ')+'</small>'+(n.chaveNfse?('<code>Chave NFS-e: '+esc(fmtChave(n.chaveNfse))+'</code>'):(n.codVerif?('<code>Cód. verificação: '+esc(n.codVerif)+'</code>'):''))+'<div>'+tagsSrv(n)+'</div></div>'
      +'<div class="nfe-acts">'+(n.arquivoData?'<button class="nfe-b" data-nfe-x="'+i+'">\u{2B07}\u{FE0F} XML</button>':'')
      +(n.pdfData?'<button class="nfe-b" data-nfe-p="'+i+'">\u{2B07}\u{FE0F} PDF</button>':'')
      +(acharCad(n.cliente, n.fornecedorCnpj, n.fornecedor)?'':'<button class="nfe-b" data-nfe-cad="'+i+'">\u{2795} Cadastrar</button>')
      +'<button class="nfe-b" data-nfe-par="'+i+'">'+(n.parceiro?'\u{1F9F0} Não é parceiro':'\u{1F91D} É parceiro')+'</button>'
      +(n.status==='Conferida'?'<button class="nfe-b" data-nfe-r="'+i+'">\u{21A9}\u{FE0F} Reabrir</button>':'<button class="nfe-b ok" data-nfe-ok="'+i+'">\u{2714} Conferir</button>')
      +'<button class="nfe-b ba" data-nfe-del="'+i+'">\u{1F5D1}\u{FE0F}</button></div></div>';
  }
  function ligarParceiro(box, lista, depois){
    [].forEach.call(box.querySelectorAll('[data-nfe-par]'),function(b){ b.onclick=async function(){
      var n=lista[+b.getAttribute('data-nfe-par')]; if(!n) return; b.disabled=true;
      try{ await marcarParceiro(n, !n.parceiro); aviso(n.parceiro?'\u{1F91D} Marcada como profissional-parceiro.':'Marcada como outro prestador.','success'); }
      catch(e){ aviso('Não consegui gravar: '+(e&&e.message?e.message:e),'warn'); }
      depois();
    }; });
  }
  function kpiSrv(v, rotulo){
    var tot=0, pr={}, nv=0, par=totParc(v), np=0;
    v.forEach(function(n){ if(!n.cancelada) tot+=num(n.valor); pr[soDig(n.fornecedorCnpj)||n.fornecedor]=1; if(n.status!=='Conferida') nv++; if(n.parceiro) np++; });
    return '<div class="nfe-kpi"><b>'+v.length+'</b><span>NFS-e recebidas'+rotulo+'</span></div>'
      +'<div class="nfe-kpi"><b>'+moeda(tot)+'</b><span>total de serviços recebidos</span></div>'
      +'<div class="nfe-kpi par"><b>'+moeda(par)+'</b><span>cota-parte dos parceiros ('+np+' nota'+(np===1?'':'s')+') — fora da receita bruta</span></div>'
      +'<div class="nfe-kpi"><b>'+Object.keys(pr).length+'</b><span>prestadores diferentes</span></div>'
      +'<div class="nfe-kpi"><b style="color:#ff9d2e">'+nv+'</b><span>a conferir</span></div>';
  }
  function listaSrv(){
    var box=el('nfe-s-lista'); if(!box) return;
    var v=filtrarSrv(), ass=S.cli+'|'+S.comp+'|'+S.q+'|'+S.par+'|'+D.cli.map(function(c){ return (c.parceiros||[]).length; }).join('.')+'|'+v.map(function(n){ return n.id+(n.status||'')+(n.parceiro?'p':''); }).join(',');
    if(ass===assSrv) return; assSrv=ass;
    var k=el('nfe-s-kpi'); if(k) k.innerHTML=kpiSrv(v, S.comp?(' em '+esc(S.comp)):' (todos os meses)');
    if(!v.length){ box.innerHTML='<div class="nfe-v">Nenhuma NFS-e recebida'+(S.cli?(' de '+esc(S.cli)):'')+(S.comp?(' em '+esc(S.comp)):'')+' ainda.</div>'; return; }
    var h='', grupo='';
    v.forEach(function(n){
      var g=n.competencia||'Sem data';
      if(g!==grupo){ grupo=g; var doMes=v.filter(function(x){ return (x.competencia||'Sem data')===g; });
        h+='<div class="nfe-grp">Competência '+esc(g)+'</div><div class="nfe-sub">'+doMes.length+' nota'+(doMes.length===1?'':'s')+' · parceiros: '+moeda(totParc(doMes))+'</div>'; }
      h+=linhaSrv(n, D.notas.indexOf(n), !S.cli);
    });
    box.innerHTML=h;
    var dep=function(){ assSrv=''; srvPainel(el('pp-notas')); };
    ligarAcoes(box, D.notas, dep); ligarParceiro(box, D.notas, dep);
    [].forEach.call(box.querySelectorAll('[data-nfe-cad]'),function(b){ b.onclick=function(){ var n=D.notas[+b.getAttribute('data-nfe-cad')]; if(n) abrirCad(n.cliente, n); }; });
  }
  function srvPainel(pg){
    if(!pg) return; montaSrv(pg);
    var f=foco(); if(f!==focoVistoS){ focoVistoS=f; if(f){ S.cli=f; } assSrv=''; }
    var sc=el('nfe-s-f-cli'), su=el('nfe-s-up-cli'), sp=el('nfe-s-f-comp');
    var aCli=D.cli.map(function(c){ return c.nome; }).join('|')+'#'+S.cli;
    if(sc.getAttribute('data-a')!==aCli){ sc.setAttribute('data-a',aCli); sc.innerHTML=optsCli(S.cli,true); su.innerHTML=optsCli(S.cli||su.value,false); }
    var comps={}; servicos(D.notas).forEach(function(n){ if(n.competencia) comps[n.competencia]=1; });
    comps[compHoje()]=1; comps[compFicha()]=1;
    var lc=Object.keys(comps).sort(function(a,b){ return compOrd(b).localeCompare(compOrd(a)); });
    var aComp=lc.join('|')+'#'+S.comp;
    if(sp.getAttribute('data-a')!==aComp){ sp.setAttribute('data-a',aComp);
      sp.innerHTML='<option value="">Todos os meses</option>'+lc.map(function(c){ return '<option'+(c===S.comp?' selected':'')+'>'+c+'</option>'; }).join(''); }
    listaSrv();
  }

  /* ================= PAINEL: honorarios (NFS-e da APARAT) ================= */
  function montaHon(pg){
    var b=el('nfe-hon'); if(b) return b;
    b=document.createElement('div'); b.id='nfe-hon'; b.className='nfe-own';
    b.innerHTML='<div class="nfe-h">\u{1F3E2} NFS-e dos honorários da APARAT</div>'
      +'<div class="nfe-s">Anexe a nota de serviço que a APARAT emitiu para cada cliente. Ela fica ligada ao honorário do mês: o cliente recebe o aviso, baixa no app dele e vê a nota junto do cartão de pagamento PIX.</div>'
      +'<div class="nfe-fil"><select id="nfe-h-ref"></select><input id="nfe-h-q" placeholder="Buscar cliente..."></div>'
      +'<div id="nfe-h-kpi" class="nfe-kpis"></div><div class="nfe-msg" id="nfe-h-msg"></div><div id="nfe-h-lista"></div>'
      +'<input type="file" id="nfe-h-up" accept=".pdf,.xml,.png,.jpg,.jpeg" style="display:none">';
    pg.appendChild(b);
    el('nfe-h-ref').onchange=function(){ hRef=this.value; assHon=''; honPainel(pg); };
    el('nfe-h-q').oninput=function(){ assHon=''; honPainel(pg); };
    el('nfe-h-up').onchange=async function(){
      var f=this.files&&this.files[0]; this.value=''; var h=D.hon.filter(function(x){ return String(x.id)===String(anexando); })[0];
      if(!f || !h) return;
      try{ await anexarNfs(h, f); msg('nfe-h-msg','\u{2705} NFS-e de '+esc(h.cliente)+' ('+esc(compDe(h.referencia))+') anexada. O cliente já pode baixar no app.'); }
      catch(e){ msg('nfe-h-msg','\u{26D4} '+esc(e&&e.message?e.message:e)); }
      assHon=''; honPainel(pg);
    };
    return b;
  }
  var anexando='';
  async function anexarNfs(h, f){
    if(f.size>MAX) throw new Error('arquivo maior que 900 KB');
    var numero='', valor=num(h.valor);
    if(/\.xml$/i.test(f.name)){ try{ var t=await lerArquivo(f,true), x=new DOMParser().parseFromString(t,'application/xml');
      var e=x.getElementsByTagName('nNFSe')[0]||x.getElementsByTagName('Numero')[0]||x.getElementsByTagName('NumeroNfse')[0]; if(e) numero=String(e.textContent||'').trim(); }catch(e2){} }
    var inp=el('nfe-h-num-'+h.id); if(inp && String(inp.value||'').trim()) numero=String(inp.value).trim();
    var dataUrl=await lerArquivo(f,false), ref=compDe(h.referencia);
    var doc={cliente:h.cliente, direcao:'honorario', tipo:'NFS-e Honorários', origem:'escritorio', honorarioId:String(h.id),
      referencia:ref, competencia:ref, numero:numero, valor:valor.toFixed(2), data:new Date().toLocaleDateString('pt-BR'),
      descricao:'NFS-e dos honorários contábeis '+ref, arquivo:f.name, arquivoData:dataUrl, status:'Fechada', enviadoEm:agoraBR()};
    var velha=nfsDoHon(h);
    doc.id=await gravar(Object.assign({},doc)); D.notas.push(doc);
    if(velha){ try{ await db().collection('notas').doc(String(velha.id)).delete(); var i=D.notas.indexOf(velha); if(i>-1) D.notas.splice(i,1); }catch(e){} }
  }
  function honPainel(pg){
    if(!pg) return; montaHon(pg);
    var refs=refsHon(); if(!hRef) hRef=refPadrao();
    var sr=el('nfe-h-ref'), a=refs.join('|')+'#'+hRef;
    if(sr.getAttribute('data-a')!==a){ sr.setAttribute('data-a',a);
      sr.innerHTML=(refs.length?refs:[hRef]).map(function(r){ return '<option'+(r===hRef?' selected':'')+'>'+r+'</option>'; }).join(''); }
    var q=String((el('nfe-h-q')||{}).value||'').toLowerCase().trim(), f=foco();
    var v=honDaRef(hRef).filter(function(h){ return (!q || String(h.cliente).toLowerCase().indexOf(q)>-1) && (!f || mesmo(h.cliente,f)); });
    var ass=hRef+'|'+q+'|'+f+'|'+v.map(function(h){ var n=nfsDoHon(h); return h.id+(n?n.id:'-')+(h.status||''); }).join(',');
    if(ass===assHon) return; assHon=ass;
    var com=v.filter(function(h){ return !!nfsDoHon(h); }).length, tot=0; v.forEach(function(h){ tot+=num(h.valor); });
    el('nfe-h-kpi').innerHTML='<div class="nfe-kpi"><b>'+v.length+'</b><span>honorários em '+esc(hRef)+(f?(' · '+esc(f)):'')+'</span></div>'
      +'<div class="nfe-kpi"><b>'+moeda(tot)+'</b><span>total dos honorários</span></div>'
      +'<div class="nfe-kpi"><b style="color:#2fd29b">'+com+'</b><span>com NFS-e anexada</span></div>'
      +'<div class="nfe-kpi"><b style="color:#ff9d2e">'+(v.length-com)+'</b><span>falta anexar</span></div>';
    var box=el('nfe-h-lista');
    if(!v.length){ box.innerHTML='<div class="nfe-v">Nenhum honorário lançado em '+esc(hRef)+'.</div>'; return; }
    var h='';
    v.forEach(function(x){
      var n=nfsDoHon(x), pago=honPago(x);
      h+='<div class="nfe-l '+(n?'ok':'nova')+'"><div class="nfe-i"><b>'+esc(x.cliente)+' — '+moeda(num(x.valor))+'</b>'
        +'<small>Honorário '+esc(compDe(x.referencia)||x.referencia)+(x.vencimento?(' · vence '+esc(String(x.vencimento).split('-').reverse().join('/'))):'')+'</small><div>'
        +(n?('<span class="nfe-c ok">\u{2714} NFS-e anexada'+(n.numero?(' nº '+esc(n.numero)):'')+'</span>'):'<span class="nfe-c lar">Falta anexar a NFS-e</span>')
        +(pago?'<span class="nfe-c ok">\u{2714} Pago</span>':'<span class="nfe-c ba">Em aberto</span>')+'</div></div><div class="nfe-acts">'
        +(n?('<button class="nfe-b" data-nfe-hdl="'+esc(x.id)+'">\u{2B07}\u{FE0F} Baixar</button><button class="nfe-b" data-nfe-hup="'+esc(x.id)+'">\u{1F501} Trocar</button><button class="nfe-b ba" data-nfe-hdel="'+esc(x.id)+'">\u{1F5D1}\u{FE0F}</button>')
           :('<input id="nfe-h-num-'+esc(x.id)+'" placeholder="Nº da NFS-e" style="font:inherit;font-size:12.5px;width:120px;padding:8px 10px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:inherit">'
             +'<button class="nfe-b az" data-nfe-hup="'+esc(x.id)+'">\u{1F4CE} Anexar NFS-e</button>'))
        +'</div></div>';
    });
    box.innerHTML=h;
    function acha(id){ return D.hon.filter(function(x){ return String(x.id)===String(id); })[0]; }
    [].forEach.call(box.querySelectorAll('[data-nfe-hup]'),function(b){ b.onclick=function(){ anexando=b.getAttribute('data-nfe-hup'); el('nfe-h-up').click(); }; });
    [].forEach.call(box.querySelectorAll('[data-nfe-hdl]'),function(b){ b.onclick=function(){ var n=nfsDoHon(acha(b.getAttribute('data-nfe-hdl'))); if(n) baixar(n.arquivoData, n.arquivo||('NFSe-honorarios_'+n.referencia+'.pdf')); }; });
    [].forEach.call(box.querySelectorAll('[data-nfe-hdel]'),function(b){ b.onclick=async function(){
      var hh=acha(b.getAttribute('data-nfe-hdel')), n=nfsDoHon(hh); if(!n) return;
      if(!confirm('Tirar a NFS-e de '+hh.cliente+' ('+compDe(hh.referencia)+')? O cliente deixa de ver a nota no app.')) return;
      try{ await db().collection('notas').doc(String(n.id)).delete(); D.notas.splice(D.notas.indexOf(n),1); }catch(e){ aviso('Não consegui excluir: '+(e&&e.message?e.message:e),'warn'); }
      assHon=''; honPainel(pg);
    }; });
  }

  function painel(){
    var pg=el('pp-notas'); if(!pg || !pg.classList.contains('active')) return;
    barraPainel(pg);
    if(modo==='ent') entPainel(pg);
    if(modo==='hon') honPainel(pg);
    if(modo==='srv') srvPainel(pg);
  }

  /* ================= FICHA DO CLIENTE ================= */
  function idRealiz(cli, comp){ var p=comp.split('/'); return String(cli).trim()+'__'+p[1]+'-'+p[0]+'__NFENT'; }
  async function lerRealiz(cli, comp){
    var k=cli+'|'+comp; if(realiz[k]!==undefined) return realiz[k];
    realiz[k]=null;
    try{ var s=await db().collection('obrigCnpj').doc(idRealiz(cli,comp)).get(); realiz[k]=(s.exists && /ok/i.test(String((s.data()||{}).status||'')))?(s.data()||{}):false; }
    catch(e){ realiz[k]=false; }
    assFicha=''; return realiz[k];
  }
  async function marcarRealiz(cli, comp, sim){
    var d=db(), id=idRealiz(cli,comp), k=cli+'|'+comp;
    if(sim){ var o={cliente:cli, competencia:comp, sigla:'NFENT', obrigacao:'Notas de entrada do mês', status:'ok', origem:ORIGEM, em:agoraBR()};
      await d.collection('obrigCnpj').doc(id).set(o,{merge:true}); realiz[k]=o; }
    else { await d.collection('obrigCnpj').doc(id).delete(); realiz[k]=false; }
    assFicha='';
  }
  function ficha(){
    var pg=el('pp-fichas'); if(!pg || !pg.classList.contains('active')) return;
    var st=null; try{ st=window.__FICHA__ && __FICHA__.estado ? __FICHA__.estado() : null; }catch(e){}
    var cli=st && st.sel; var corpo=el('fc-corpo'); if(!cli || !corpo) return;
    var card=corpo.querySelector('.fc-card'); if(!card) return;
    var comp=compFicha(), k=cli+'|'+comp; if(realiz[k]===undefined){ lerRealiz(cli,comp); return; }
    var ent=entradas(D.notas).filter(function(n){ return mesmo(n.cliente,cli) && n.competencia===comp; });
    var nv=ent.filter(function(n){ return n.status!=='Conferida'; }).length, tot=0; ent.forEach(function(n){ tot+=num(n.valor); });
    var hs=D.hon.filter(function(h){ return mesmo(h.cliente,cli); }).sort(function(a,b){ return compOrd(compDe(b.referencia)).localeCompare(compOrd(compDe(a.referencia))); });
    var hAt=hs[0]||null, nfs=hAt?nfsDoHon(hAt):null, r=realiz[k];
    var sv=servicos(D.notas).filter(function(n){ return mesmo(n.cliente,cli) && n.competencia===comp; }), svTot=0, svNv=0;
    sv.forEach(function(n){ if(!n.cancelada) svTot+=num(n.valor); if(n.status!=='Conferida') svNv++; });
    var svPar=totParc(sv);
    var ass=cli+'|'+comp+'|'+ent.length+'|'+nv+'|'+(r?1:0)+'|'+(hAt?hAt.id:'')+'|'+(nfs?nfs.id:'')+'|'+sv.length+'|'+svNv+'|'+svPar;
    var box=el('nfe-ficha');
    if(box && box.getAttribute('data-a')===ass && card.contains(box)) return;
    if(!box || !card.contains(box)){
      box=document.createElement('div'); box.id='nfe-ficha';
      var alvo=[].slice.call(card.querySelectorAll('.fc-sec')).filter(function(s){ return /Financeiro/i.test(s.textContent||''); })[0];
      if(alvo) card.insertBefore(box, alvo); else card.appendChild(box);
    }
    box.setAttribute('data-a',ass);
    var h='<div class="fc-sec">\u{1F9FE} Notas fiscais — competência '+esc(comp)+'</div>';
    h+= r ? '<div class="fc-lin fc-feito"><div class="fc-t"><b>\u{2714} Notas de entrada (compras)</b><small>'+ent.length+' nota'+(ent.length===1?'':'s')+' · '+moeda(tot)+' · realizado'+(r.em?(' em '+esc(String(r.em).slice(0,10))):'')+'</small></div>'
              +'<button class="fc-bt mini" id="nfe-f-ver">\u{1F4E5} Ver</button><button class="fc-bt mini" id="nfe-f-des">\u{21A9}\u{FE0F} Desfazer</button><span class="fc-chip ok">Realizado</span></div>'
          : '<div class="fc-lin fc-fazer"><div class="fc-t"><b>Notas de entrada (compras)</b><small>'+ent.length+' nota'+(ent.length===1?'':'s')+' · '+moeda(tot)+(nv?(' · '+nv+' a conferir'):'')+' · a fazer no mês</small></div>'
              +'<button class="fc-bt" id="nfe-f-ver">\u{1F4E5} Ver entradas</button><button class="fc-bt ok" id="nfe-f-ok">\u{2714} Realizado</button></div>';
    if(sv.length) h+='<div class="fc-lin clic" id="nfe-f-srv"><div class="fc-t"><b>\u{1F488} Serviços recebidos (NFS-e)</b><small>'+sv.length+' nota'+(sv.length===1?'':'s')+' · '+moeda(svTot)
      +(svPar?(' · cota-parte dos parceiros '+moeda(svPar)+' (fora da receita bruta)'):'')+(svNv?(' · '+svNv+' a conferir'):'')+'</small></div>'
      +'<span class="fc-chip '+(svNv?'lar':'ok')+'">'+(svNv?'Conferir':'Conferidas')+'</span></div>';
    if(hAt) h+='<div class="fc-lin clic" id="nfe-f-hon"><div class="fc-t"><b>NFS-e dos honorários '+esc(compDe(hAt.referencia))+'</b><small>'+moeda(num(hAt.valor))+(nfs?(' · anexada'+(nfs.numero?(' nº '+esc(nfs.numero)):'')+' · o cliente já vê no app'):' · ainda não anexada')+'</small></div>'
      +'<span class="fc-chip '+(nfs?'ok':'lar')+'">'+(nfs?'Anexada':'Falta anexar')+'</span></div>';
    box.innerHTML=h;
    var bv=el('nfe-f-ver'); if(bv) bv.onclick=function(){ F.comp=comp; irParaNotas('ent', cli); };
    var bo=el('nfe-f-ok'); if(bo) bo.onclick=async function(){ bo.disabled=true; try{ await marcarRealiz(cli,comp,true); aviso('\u{2705} Entradas de '+comp+' realizadas.','success'); }catch(e){ aviso('Não consegui gravar: '+(e&&e.message?e.message:e),'warn'); } ficha(); };
    var bd=el('nfe-f-des'); if(bd) bd.onclick=async function(){ bd.disabled=true; try{ await marcarRealiz(cli,comp,false); }catch(e){ aviso('Não consegui desfazer: '+(e&&e.message?e.message:e),'warn'); } ficha(); };
    var bh=el('nfe-f-hon'); if(bh) bh.onclick=function(){ if(hAt) hRef=compDe(hAt.referencia); irParaNotas('hon', cli); };
    var bs=el('nfe-f-srv'); if(bs) bs.onclick=function(){ S.comp=comp; irParaNotas('srv', cli); };
  }

  /* ================= APP DO CLIENTE ================= */
  function barraCli(sec){
    var t=el('nfe-c-tabs');
    if(!t){
      t=document.createElement('div'); t.id='nfe-c-tabs'; t.className='nfe-tabs nfe-own';
      var a=sec.querySelector('.asec'); if(a && a.nextSibling) sec.insertBefore(t, a.nextSibling); else sec.insertBefore(t, sec.firstChild);
    }
    var hn=nfsHon(C.notas).length, ass=modoCli+'|'+hn;
    if(t.getAttribute('data-a')!==ass){ t.setAttribute('data-a',ass);
      t.innerHTML='<button class="nfe-tab'+(modoCli==='vendas'?' on':'')+'" data-nfe-c="vendas">\u{1F4E4} Minhas vendas</button>'
        +'<button class="nfe-tab'+(modoCli==='ent'?' on':'')+'" data-nfe-c="ent">\u{1F4E5} Minhas compras</button>'
        +'<button class="nfe-tab'+(modoCli==='srv'?' on':'')+'" data-nfe-c="srv">\u{1F488} Serviços recebidos</button>'
        +'<button class="nfe-tab'+(modoCli==='hon'?' on':'')+'" data-nfe-c="hon">\u{1F3E2} Nota da APARAT'+(hn?('<i>'+hn+'</i>'):'')+'</button>';
      [].forEach.call(t.querySelectorAll('[data-nfe-c]'),function(b){ b.onclick=function(){ modoCli=b.getAttribute('data-nfe-c'); assCliE=''; assCliH=''; assCliS=''; cliente(); }; });
    }
    sec.classList.toggle('nfe-m-ent', modoCli==='ent'); sec.classList.toggle('nfe-m-hon', modoCli==='hon'); sec.classList.toggle('nfe-m-srv', modoCli==='srv');
  }
  function montaCliEnt(sec){
    var b=el('nfe-c-ent'); if(b) return b;
    b=document.createElement('div'); b.id='nfe-c-ent'; b.className='nfe-own';
    b.innerHTML='<div class="nfe-drop" id="nfe-c-drop" style="padding:13px"><b>\u{1F4CE} Enviar nota de compra</b>'
      +'<small>Mande o arquivo XML que o fornecedor enviou por e-mail. Pode mandar vários de uma vez.</small>'
      +'<button class="nfe-b az" id="nfe-c-bt" style="width:100%">\u{1F4C2} Escolher arquivo XML</button>'
      +'<button class="nfe-b" id="nfe-c-man" style="width:100%;margin-top:7px">\u{1F4C4} Não tenho o XML, só o PDF</button>'
      +'<input type="file" id="nfe-c-up" accept=".xml,text/xml,application/xml" multiple style="display:none">'+formManual('nfe-cm-')+'</div>'
      +'<div class="nfe-msg" id="nfe-c-msg"></div><div id="nfe-c-lista"></div>';
    sec.appendChild(b);
    el('nfe-c-bt').onclick=function(){ el('nfe-c-up').click(); };
    el('nfe-c-up').onchange=async function(){ var fs=[].slice.call(this.files||[]); this.value=''; if(!fs.length) return;
      msg('nfe-c-msg','\u{23F3} Enviando...'); var r=await enviarXMLs(fs, clienteAtual(), C.notas, C.cnpj, 'cliente');
      msg('nfe-c-msg', (r.html||'Nada enviado.')+(r.ok?'<br>A APARAT já recebeu e vai conferir.':'')); assCliE=''; assCliS=''; cliente(); };
    el('nfe-c-man').onclick=function(){ el('nfe-cm-frm').classList.toggle('on'); };
    el('nfe-cm-salvar').onclick=async function(){ var bt=this; bt.disabled=true;
      try{ var d=await enviarManual('nfe-cm-', clienteAtual(), C.notas, 'cliente'); msg('nfe-c-msg','\u{2705} NF '+esc(d.numero)+' de '+esc(d.fornecedor)+' enviada. A APARAT vai conferir.');
        ['forn','cnpj','num','data','val','uf','pdf'].forEach(function(k){ var e=el('nfe-cm-'+k); if(e) e.value=''; }); el('nfe-cm-frm').classList.remove('on');
      }catch(e){ msg('nfe-c-msg','\u{26D4} '+esc(e&&e.message?e.message:e)); }
      bt.disabled=false; assCliE=''; cliente(); };
    return b;
  }
  function cliEnt(sec){
    montaCliEnt(sec);
    var v=entradas(C.notas), ass=v.map(function(n){ return n.id+(n.status||''); }).join(',');
    if(ass===assCliE) return; assCliE=ass;
    var box=el('nfe-c-lista');
    if(!v.length){ box.innerHTML='<div style="color:var(--cinza);font-size:12px;padding:4px 0">Você ainda não enviou nenhuma nota de compra.</div>'; return; }
    var h='', g='';
    v.forEach(function(n){
      if((n.competencia||'')!==g){ g=n.competencia||''; h+='<div class="nfe-grp">'+esc(g||'Sem data')+'</div>'; }
      h+='<div class="lcard"><div class="lcico lc-az">\u{1F4E5}</div><div class="lcinfo"><strong>'+esc(n.fornecedor||'Fornecedor')+'</strong>'
        +'<span>NF '+esc(n.numero)+' · '+esc(n.data||'')+' · '+moeda(num(n.valor))+'</span>'
        +'<span>'+(n.status==='Conferida'?'<span class="nfe-c ok">\u{2714} Conferida pela APARAT</span>':'<span class="nfe-c az">Recebida — em conferência</span>')+'</span></div></div>';
    });
    box.innerHTML=h;
  }
  function montaCliSrv(sec){
    var b=el('nfe-c-srv'); if(b) return b;
    b=document.createElement('div'); b.id='nfe-c-srv'; b.className='nfe-own';
    b.innerHTML='<div class="nfe-drop" id="nfe-cs-drop" style="padding:13px"><b>\u{1F4CE} Enviar nota de serviço que você recebeu</b>'
      +'<small>Ex.: a NFS-e que cada profissional-parceiro emite para o seu salão/barbearia, ou a nota de outro prestador de serviço. Mande o XML ou o PDF.</small>'
      +'<label style="display:block;text-align:left;font-size:11.5px;color:var(--cinza);margin:0 0 4px">Quem emitiu a nota?</label>'
      +'<select id="nfe-cs-tipo" class="nfe-b" style="width:100%;margin-bottom:8px;font-weight:600"><option value="sim">\u{1F91D} Profissional-parceiro do salão</option><option value="nao">\u{1F9F0} Outro prestador de serviço</option></select>'
      +'<button class="nfe-b az" id="nfe-cs-bt" style="width:100%">\u{1F4C2} Escolher arquivo XML</button>'
      +'<button class="nfe-b" id="nfe-cs-man" style="width:100%;margin-top:7px">\u{1F4C4} Não tenho o XML, só o PDF</button>'
      +'<input type="file" id="nfe-cs-up" accept=".xml,text/xml,application/xml" multiple style="display:none">'+formServ('nfe-csm-')+'</div>'
      +'<div class="nfe-msg" id="nfe-cs-msg"></div><div id="nfe-cs-lista"></div><div id="nfe-cs-parc"></div>';
    sec.appendChild(b);
    el('nfe-cs-bt').onclick=function(){ el('nfe-cs-up').click(); };
    el('nfe-cs-up').onchange=async function(){ var fs=[].slice.call(this.files||[]); this.value=''; if(!fs.length) return;
      msg('nfe-cs-msg','\u{23F3} Enviando...'); var r=await enviarXMLs(fs, clienteAtual(), C.notas, C.cnpj, 'cliente', el('nfe-cs-tipo').value!=='nao');
      msg('nfe-cs-msg', (r.html||'Nada enviado.')+(r.ok?'<br>A APARAT já recebeu e vai conferir.':'')); assCliS=''; assCliE=''; cliente(); };
    el('nfe-cs-man').onclick=function(){ el('nfe-csm-frm').classList.toggle('on'); el('nfe-csm-par').value=el('nfe-cs-tipo').value; };
    ligarBuscaForm('nfe-csm-', function(){ return clienteAtual(); });
    el('nfe-csm-salvar').onclick=async function(){ var bt=this; bt.disabled=true;
      try{ var d=await enviarManualServ('nfe-csm-', clienteAtual(), C.notas, 'cliente'); msg('nfe-cs-msg','\u{2705} NFS-e '+esc(d.numero)+' de '+esc(d.fornecedor)+' enviada. A APARAT vai conferir.'); limpaServ('nfe-csm-'); }
      catch(e){ msg('nfe-cs-msg','\u{26D4} '+esc(e&&e.message?e.message:e)); }
      bt.disabled=false; assCliS=''; cliente(); };
    return b;
  }
  function cliSrv(sec){
    montaCliSrv(sec);
    var v=servicos(C.notas), pl=C.parc||[], ass=pl.length+'#'+v.map(function(n){ return n.id+(n.status||'')+(n.parceiro?'p':''); }).join(',');
    if(ass===assCliS) return; assCliS=ass;
    var pb=el('nfe-cs-parc');
    if(pb){ var ph='<div class="nfe-grp" style="margin-top:18px">\u{1F465} Parceiros e prestadores cadastrados pela APARAT</div>';
      if(!pl.length) ph+='<div style="color:var(--cinza);font-size:12px;padding:4px 0">Nenhum cadastrado ainda. Passe para a APARAT o nome e o CNPJ dos seus parceiros.</div>';
      pl.forEach(function(p){ var dl=/deslig/i.test(p.situacao||'');
        ph+='<div class="lcard"><div class="lcico lc-az">'+(p.tipo==='prestador'?'\u{1F9F0}':'\u{1F91D}')+'</div><div class="lcinfo"><strong>'+esc(p.nome)+'</strong>'
          +'<span>'+(p.cnpj?('CNPJ '+esc(p.cnpj)):('CPF '+esc(p.cpf||'')))+(p.funcao?(' · '+esc(p.funcao)):'')+(p.cota?(' · '+esc(p.cota)+'%'):'')+'</span>'
          +'<span>'+(dl?'<span class="nfe-c ba">Desligado</span>':'<span class="nfe-c ok">Ativo</span>')+(p.tipo!=='prestador'&&p.homologado!=='Sim'?'<span class="nfe-c lar">Contrato sem homologação</span>':'')+'</span></div></div>'; });
      pb.innerHTML=ph; }
    var box=el('nfe-cs-lista');
    if(!v.length){ box.innerHTML='<div style="color:var(--cinza);font-size:12px;padding:4px 0">Você ainda não enviou nenhuma nota de serviço recebida.</div>'; return; }
    var h='', g='';
    v.forEach(function(n){
      if((n.competencia||'')!==g){ g=n.competencia||''; var dm=v.filter(function(x){ return (x.competencia||'')===g; }), tp=totParc(dm);
        h+='<div class="nfe-grp">'+esc(g||'Sem data')+'</div>'+(tp?('<div class="nfe-sub">Repassado aos parceiros no mês: '+moeda(tp)+'</div>'):''); }
      h+='<div class="lcard"><div class="lcico lc-az">\u{1F488}</div><div class="lcinfo"><strong>'+esc(n.fornecedor||'Prestador')+'</strong>'
        +'<span>NFS-e '+esc(n.numero)+' · '+esc(n.data||'')+' · '+moeda(num(n.valor))+'</span>'
        +'<span>'+(n.parceiro?'<span class="nfe-c ve">\u{1F91D} Parceiro</span>':'<span class="nfe-c az">Outro prestador</span>')
        +(n.status==='Conferida'?'<span class="nfe-c ok">\u{2714} Conferida pela APARAT</span>':'<span class="nfe-c az">Recebida — em conferência</span>')+'</span></div></div>';
    });
    box.innerHTML=h;
  }
  function cliHon(sec){
    var b=el('nfe-c-hon');
    if(!b){ b=document.createElement('div'); b.id='nfe-c-hon'; b.className='nfe-own'; sec.appendChild(b); }
    var v=nfsHon(C.notas).sort(function(a,c){ return compOrd(c.referencia).localeCompare(compOrd(a.referencia)); });
    var ass=v.map(function(n){ return n.id; }).join(',');
    if(ass===assCliH && b.innerHTML) return; assCliH=ass;
    var h='<div class="nfe-grp">\u{1F3E2} Notas fiscais dos honorários da APARAT</div>';
    if(!v.length) h+='<div style="color:var(--cinza);font-size:12px;padding:4px 0">Nenhuma nota dos honorários disponível ainda.</div>';
    v.forEach(function(n,i){
      h+='<div class="lcard"><div class="lcico lc-pu">\u{1F9FE}</div><div class="lcinfo"><strong>NFS-e honorários '+esc(n.referencia||'')+'</strong>'
        +'<span>'+(n.numero?('nº '+esc(n.numero)+' · '):'')+moeda(num(n.valor))+'</span></div>'
        +'<button class="nok-dl nfe-b" data-nfe-cdl="'+i+'">\u{2B07}\u{FE0F} Baixar</button></div>';
    });
    h+='<div style="color:var(--cinza);font-size:11.5px;margin-top:8px">O pagamento dos honorários continua no cartão PIX da tela inicial.</div>';
    b.innerHTML=h;
    [].forEach.call(b.querySelectorAll('[data-nfe-cdl]'),function(x){ x.onclick=function(){ var n=v[+x.getAttribute('data-nfe-cdl')]; baixar(n.arquivoData, n.arquivo||('NFSe-honorarios_'+(n.referencia||'')+'.pdf')); }; });
  }
  /* botao "Baixar a NFS-e" dentro do cartao PIX (#ap-cobra) quando o honorario mostrado ja tem nota */
  function cobra(){
    var cx=document.querySelector('#ap-cobra .cx'); if(!cx) return;
    var h3=cx.querySelector('h3'), txt=h3?String(h3.textContent||''):'';
    var m=txt.match(/Honor[aá]rio\s+(.+)$/i), ref=m?compDe(m[1]):'';
    var n=ref ? nfsHon(C.notas).filter(function(x){ return compDe(x.referencia)===ref; })[0] : null;
    var bt=el('nfe-cobra-dl');
    if(!n){ if(bt) bt.remove(); return; }
    if(bt && cx.contains(bt)) return;
    bt=document.createElement('button'); bt.id='nfe-cobra-dl'; bt.className='bt sec';
    bt.textContent='\u{1F9FE} Baixar a nota fiscal deste honorário';
    bt.onclick=function(){ baixar(n.arquivoData, n.arquivo||('NFSe-honorarios_'+ref+'.pdf')); };
    var pg=el('ap-cobra-paguei'); if(pg && pg.parentNode===cx) cx.insertBefore(bt, pg.nextSibling); else cx.appendChild(bt);
  }
  function cliente(){
    cobra();
    var sec=el('sec-notas'); if(!sec) return;
    barraCli(sec);
    if(modoCli==='ent') cliEnt(sec);
    if(modoCli==='hon') cliHon(sec);
    if(modoCli==='srv') cliSrv(sec);
  }

  /* ================= relogio ================= */
  var voltas=0, ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css(); embrulhar();
      if(noPainel()){
        var pn=el('pp-notas'), pf=el('pp-fichas');
        var precisa=(pn && pn.classList.contains('active')) || (pf && pf.classList.contains('active'));
        if(precisa || !tD) await carregar(voltas%8===0);
        painel(); ficha();
      } else if(noCliente() && clienteAtual()){
        await carregarCli(voltas%8===0);
        cliente();
      }
    }catch(e){}
    ocupado=false;
  }
  [1200,3000,6000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,2500);

  window.apNotasAba=irParaNotas;
  window.__NFE__={lerXML:lerXML, lerNFSe:lerNFSe, lerQualquer:lerQualquer, buscaCnpj:buscaCnpj, dvCnpj:dvCnpj, dvCpf:dvCpf, dvChave:dvChave, num:num, compDe:compDe, carregar:carregar, carregarCli:carregarCli,
                  painel:painel, ficha:ficha, cliente:cliente, estado:function(){ return {D:D, C:C, modo:modo, modoCli:modoCli, F:F, S:S, hRef:hRef}; }};
})();
