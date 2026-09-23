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
   Regra do app: a area do cliente usa style.display, NUNCA a classe .active. */
;(function(){
  if(window.__APARAT_NFE__) return; window.__APARAT_NFE__=1;

  var MAX=900*1024, ORIGEM='Notas de Entrada';
  var D={notas:[], hon:[], cli:[]}, tD=0, carregando=false;
  var C={notas:[], cnpj:'', nome:''}, tC=0;
  var modo='saidas', modoCli='vendas';
  var F={cli:'', comp:'', q:''}, focoVisto=null, hRef='';
  var assEnt='', assHon='', assCliE='', assCliH='', assFicha='', realiz={};

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
    if(!inf) throw new Error('esse XML não é de NF-e (nota de produto). Para outra nota use "Só tenho o PDF"');
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
          if(nm && nm!=='Todos os Clientes' && !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(o.status||''))) c.push({nome:nm, cnpj:o.cnpj||''}); }); }catch(e){}
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
    if(C.nome!==nome || !C.cnpjLido){
      C.cnpj=''; C.cnpjLido=true;
      try{ var q=await d.collection('clientes').where('nome','==',nome).get(); q.forEach(function(x){ var o=x.data()||{}; if(o.cnpj) C.cnpj=o.cnpj; }); }catch(e){}
    }
    C.notas=v; C.nome=nome; tC=Date.now();
  }
  function entradas(lista){ return (lista||[]).filter(function(n){ return n.direcao==='entrada'; })
    .sort(function(a,b){ var x=compOrd(b.competencia).localeCompare(compOrd(a.competencia)); if(x) return x;
      return String(b.data||'').split('/').reverse().join('').localeCompare(String(a.data||'').split('/').reverse().join('')); }); }
  function nfsHon(lista){ return (lista||[]).filter(function(n){ return n.direcao==='honorario'; }); }
  function cnpjDoCliente(nome){ for(var i=0;i<D.cli.length;i++) if(mesmo(D.cli[i].nome,nome)) return D.cli[i].cnpj; return ''; }
  function jaExiste(lista, chave){ chave=soDig(chave); if(!chave) return null;
    for(var i=0;i<lista.length;i++) if(lista[i].direcao==='entrada' && soDig(lista[i].chave)===chave) return lista[i]; return null; }

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
  /* envia uma lista de arquivos XML; devolve texto de resultado */
  async function enviarXMLs(files, cliente, lista, cnpjCli, origem){
    var ok=0, msgs=[];
    for(var i=0;i<files.length;i++){
      var f=files[i];
      try{
        if(!/\.xml$/i.test(f.name) && !/xml/i.test(f.type||'')) throw new Error('não é arquivo .xml');
        if(f.size>MAX) throw new Error('arquivo maior que 900 KB');
        var txt=await lerArquivo(f,true), x=lerXML(txt);
        var dup=jaExiste(lista, x.chave);
        if(dup){ msgs.push('\u{26D4} NF '+esc(x.numero)+' de '+esc(x.fornecedor)+' já foi enviada em '+esc(dup.enviadoEm?String(dup.enviadoEm).slice(0,10):(dup.data||''))+' — não foi duplicada.'); continue; }
        var dataUrl=await lerArquivo(f,false);
        var m=montarEntrada(x, cliente, cnpjCli, f.name, dataUrl, origem);
        if(m.erro){ msgs.push('\u{26D4} '+esc(m.erro)); continue; }
        m.doc.id=await gravar(Object.assign({},m.doc)); lista.push(m.doc); ok++;
        msgs.push('\u{2705} NF '+esc(x.numero)+' · '+esc(x.fornecedor)+' · '+moeda(x.valor)+(x.ufEmit&&x.ufDest&&x.ufEmit!==x.ufDest?(' · '+esc(x.ufEmit)+' → '+esc(x.ufDest)+' (outro estado)'):'')+(m.doc.alerta?(' · \u{26A0}\u{FE0F} '+esc(m.doc.alerta)):''));
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
      if(o.direcao==='entrada' && mesmo(o.fornecedor,forn) && String(o.numero)===numero) throw new Error('a NF '+numero+' de '+forn+' já foi enviada'); }
    var dataUrl=await lerArquivo(f,false);
    var cnpj=el(pre+'cnpj')?String(el(pre+'cnpj').value||'').trim():'', uf=el(pre+'uf')?String(el(pre+'uf').value||'').trim().toUpperCase():'';
    var doc={cliente:cliente, direcao:'entrada', tipo:'Entrada', origem:origem, fornecedor:forn, fornecedorCnpj:fmtCnpj(cnpj), ufEmit:uf, ufDest:'',
      numero:numero, serie:'', modelo:'', data:m[3]+'/'+m[2]+'/'+m[1], competencia:m[2]+'/'+m[1], valor:val.toFixed(2), vST:'0.00', cfop:'', chave:'',
      descricao:'Compra de '+forn, alerta:'sem XML (só o PDF)', arquivo:'', arquivoData:'', pdfNome:f.name, pdfData:dataUrl, status:'Nova', enviadoEm:agoraBR()};
    doc.id=await gravar(Object.assign({},doc)); lista.push(doc); return doc;
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
  function nomeXml(n){ return n.arquivo || ('NF-entrada_'+(n.numero||n.id)+'.xml'); }
  function nomePdf(n){ return n.pdfNome || ('NF-entrada_'+(n.numero||n.id)+'.pdf'); }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-nfe-css')) return;
    var s=document.createElement('style'); s.id='ap-nfe-css';
    s.textContent=
       '#pp-notas.nfe-m-ent>:not(.nfe-own),#pp-notas.nfe-m-hon>:not(.nfe-own){display:none !important}'
      +'#pp-notas:not(.nfe-m-ent) #nfe-ent,#pp-notas:not(.nfe-m-hon) #nfe-hon{display:none}'
      +'#sec-notas.nfe-m-ent>:not(.nfe-own):not(.asec),#sec-notas.nfe-m-hon>:not(.nfe-own):not(.asec){display:none !important}'
      +'#sec-notas:not(.nfe-m-ent) #nfe-c-ent,#sec-notas:not(.nfe-m-hon) #nfe-c-hon{display:none}'
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
      +'#nfe-cobra-dl{margin-top:9px}';
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
    assEnt=''; assHon=''; setTimeout(painel,60);
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
    var nv=contaNovas(), fh=faltaNfs();
    var ass=modo+'|'+nv+'|'+fh;
    if(t.getAttribute('data-a')!==ass){
      t.setAttribute('data-a',ass);
      t.innerHTML='<button class="nfe-tab'+(modo==='saidas'?' on':'')+'" data-nfe-m="saidas">\u{1F4E4} Saídas (vendas)</button>'
        +'<button class="nfe-tab'+(modo==='ent'?' on':'')+'" data-nfe-m="ent">\u{1F4E5} Entradas (compras)'+(nv?('<i>'+nv+' nova'+(nv>1?'s':'')+'</i>'):'')+'</button>'
        +'<button class="nfe-tab'+(modo==='hon'?' on':'')+'" data-nfe-m="hon">\u{1F3E2} Honorários APARAT'+(fh?('<i>'+fh+' sem NFS-e</i>'):'')+'</button>';
      [].forEach.call(t.querySelectorAll('[data-nfe-m]'),function(b){ b.onclick=function(){ modo=b.getAttribute('data-nfe-m'); assEnt=''; assHon=''; painel(); }; });
    }
    pg.classList.toggle('nfe-m-ent', modo==='ent');
    pg.classList.toggle('nfe-m-hon', modo==='hon');
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
    var ass=cli+'|'+comp+'|'+ent.length+'|'+nv+'|'+(r?1:0)+'|'+(hAt?hAt.id:'')+'|'+(nfs?nfs.id:'');
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
    if(hAt) h+='<div class="fc-lin clic" id="nfe-f-hon"><div class="fc-t"><b>NFS-e dos honorários '+esc(compDe(hAt.referencia))+'</b><small>'+moeda(num(hAt.valor))+(nfs?(' · anexada'+(nfs.numero?(' nº '+esc(nfs.numero)):'')+' · o cliente já vê no app'):' · ainda não anexada')+'</small></div>'
      +'<span class="fc-chip '+(nfs?'ok':'lar')+'">'+(nfs?'Anexada':'Falta anexar')+'</span></div>';
    box.innerHTML=h;
    var bv=el('nfe-f-ver'); if(bv) bv.onclick=function(){ F.comp=comp; irParaNotas('ent', cli); };
    var bo=el('nfe-f-ok'); if(bo) bo.onclick=async function(){ bo.disabled=true; try{ await marcarRealiz(cli,comp,true); aviso('\u{2705} Entradas de '+comp+' realizadas.','success'); }catch(e){ aviso('Não consegui gravar: '+(e&&e.message?e.message:e),'warn'); } ficha(); };
    var bd=el('nfe-f-des'); if(bd) bd.onclick=async function(){ bd.disabled=true; try{ await marcarRealiz(cli,comp,false); }catch(e){ aviso('Não consegui desfazer: '+(e&&e.message?e.message:e),'warn'); } ficha(); };
    var bh=el('nfe-f-hon'); if(bh) bh.onclick=function(){ if(hAt) hRef=compDe(hAt.referencia); irParaNotas('hon', cli); };
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
        +'<button class="nfe-tab'+(modoCli==='hon'?' on':'')+'" data-nfe-c="hon">\u{1F3E2} Nota da APARAT'+(hn?('<i>'+hn+'</i>'):'')+'</button>';
      [].forEach.call(t.querySelectorAll('[data-nfe-c]'),function(b){ b.onclick=function(){ modoCli=b.getAttribute('data-nfe-c'); assCliE=''; assCliH=''; cliente(); }; });
    }
    sec.classList.toggle('nfe-m-ent', modoCli==='ent'); sec.classList.toggle('nfe-m-hon', modoCli==='hon');
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
      msg('nfe-c-msg', (r.html||'Nada enviado.')+(r.ok?'<br>A APARAT já recebeu e vai conferir.':'')); assCliE=''; cliente(); };
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
  window.__NFE__={lerXML:lerXML, dvChave:dvChave, num:num, compDe:compDe, carregar:carregar, carregarCli:carregarCli,
                  painel:painel, ficha:ficha, cliente:cliente, estado:function(){ return {D:D, C:C, modo:modo, modoCli:modoCli, F:F, hRef:hRef}; }};
})();
