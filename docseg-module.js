/* APARAT - DOCUMENTOS SEGUROS POR EMPRESA (v1, 29/09/2026) - uso exclusivo do escritorio
   - item de menu "Documentos Seguros" (#ap-nav-docseg) e pagina #pp-docseg, igual as outras abas
   - GRADE: 1 linha por EMPRESA (colecao clientes, ativos) x 5 documentos
     (Cartao CNPJ, Certidao de Inteiro Teor, Certificado Digital, Contrato Social, Alvara)
   - os logins repetidos (usuarios) sao AGRUPADOS na empresa pelo nome; nada e apagado.
     A linha mostra "X acessos".
   - enviou uma vez, TODOS os logins da empresa recebem: o arquivo e gravado em docseg para
     cada uid (mesmo formato do aparat-fix: mestre seg_<uid>_<tipo> + partes __pN), porque o
     cliente le docseg por "cliente == seu uid". Empresa sem login guarda em "emp_<id>" e,
     quando o login aparecer, o botao/abertura da aba iguala os acessos.
   - Certificado Digital e Alvara com data de VALIDADE: laranja 60 dias antes, vermelho vencido;
     bolinha #dot-docseg no menu.
   - o bloco antigo #sec-docs-seguros (que aparecia no pe de todas as abas) fica escondido.
   - cliente continua vendo pela tela dele (aparat-fix clientRender), sem mudanca. */
;(function(){
  if(window.__APARAT_DOCSEG__) return; window.__APARAT_DOCSEG__=1;

  var ADMIN_EMAIL='assessoriacontabil.da@gmail.com';
  var MAX_BYTES=15*1024*1024, CHUNK=700000, AVISO_DIAS=60;
  var TIPOS=[
    {key:'cnpj',        label:'\u{1FAAA} Cartão CNPJ',               curto:'Cartão CNPJ'},
    {key:'certidao',    label:'\u{1F4DC} Certidão de Inteiro Teor',  curto:'Certidão'},
    {key:'certificado', label:'\u{1F4B3} Certificado Digital',       curto:'Certificado', validade:true},
    {key:'contrato',    label:'\u{1F4D1} Contrato Social',           curto:'Contrato Social'},
    {key:'alvara',      label:'\u{1F3DB}\u{FE0F} Alvará de Funcionamento', curto:'Alvará', validade:true}
  ];
  var empresas=[], carregado=0, carregando=false, busca='', filtro='todos';

  function el(id){ return document.getElementById(id); }
  function fs(){ return firebase.firestore(); }
  function col(){ return fs().collection('docseg'); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function sanit(s){ return String(s||'').replace(/[^a-zA-Z0-9]/g,'_').slice(0,80); }
  function tipo(k){ for(var i=0;i<TIPOS.length;i++) if(TIPOS[i].key===k) return TIPOS[i]; return null; }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; return !!(u && u.email===ADMIN_EMAIL); }catch(e){ return false; } }
  function noPainel(){ var p=el('view-painel'); return !!(p && p.classList.contains('active') && ehAdmin()); }
  function hojeISO(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function dataBR(iso){ var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]+'/'+m[1]):''; }
  function dias(iso){ if(!iso) return null; var a=new Date(iso+'T12:00:00'), b=new Date(hojeISO()+'T12:00:00'); return Math.round((a-b)/86400000); }
  function aviso(t,tp){ try{ if(typeof notif==='function') return notif(t,tp==='erro'?'warn':(tp||'')); }catch(e){} }

  /* nome -> conjunto de palavras, sem numeros, acentos e "ltda/me/epp..." */
  var FORA={ltda:1,me:1,epp:1,eireli:1,slu:1,mei:1,de:1,da:1,do:1,das:1,dos:1,e:1,em:1,com:1,contratada:1,preferito:1,sa:1};
  function palavras(n){
    var s=String(n||'').toLowerCase();
    try{ s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){}
    return s.replace(/[^a-z ]+/g,' ').split(/\s+/).filter(function(w){ return w.length>1 && !FORA[w]; }).sort();
  }
  function chave(n){ return palavras(n).join(' '); }
  function mesmoNome(a,b){
    var A=palavras(a), B=palavras(b); if(!A.length||!B.length) return false;
    if(A.join(' ')===B.join(' ')) return true;
    var menor=A.length<=B.length?A:B, maior=A.length<=B.length?B:A;
    if(menor.length<2) return false;
    return menor.every(function(w){ return maior.indexOf(w)>=0; });
  }

  /* ================= leitura ================= */
  async function carregar(){
    if(carregando) return; carregando=true;
    try{
      var r=await Promise.all([fs().collection('clientes').get(), fs().collection('usuarios').get(), col().where('meta','==',true).get()]);
      var lista=[];
      r[0].forEach(function(d){
        var x=d.data()||{};
        if(x.status && /inativ|desativ|encerr|baix|cancel|suspens|deslig/i.test(String(x.status))) return;
        var n=String(x.nome||'').trim(); if(!n) return;
        lista.push({id:d.id, nome:n, cnpj:x.cnpj||'', regime:x.regime||'', logins:[], docs:{}, donos:{}});
      });
      function acha(nome){
        for(var i=0;i<lista.length;i++) if(mesmoNome(lista[i].nome,nome)) return lista[i];
        /* registro antigo gravado so com um pedaco do nome (ex.: "chuchu"): vale se for unico */
        var w=palavras(nome); if(w.length!==1 || w[0].length<5) return null;
        var hit=lista.filter(function(e){ return palavras(e.nome).indexOf(w[0])>=0; });
        return hit.length===1 ? hit[0] : null;
      }
      r[1].forEach(function(d){
        var x=d.data()||{};
        if(!x.clienteNome || x.role==='admin' || x.email===ADMIN_EMAIL) return;
        if(/deslig|inativ|bloq/i.test(String(x.role||'')+' '+String(x.status||''))) return;
        var e=acha(x.clienteNome);
        if(!e){ e={id:'', nome:String(x.clienteNome).trim(), cnpj:'', regime:'', logins:[], docs:{}, donos:{}, semCadastro:true}; lista.push(e); }
        e.logins.push({uid:d.id, email:x.email||''});
      });
      /* documentos: por uid, por emp_<id> ou (antigos) pelo nome */
      var porDono={};
      lista.forEach(function(e){ e.logins.forEach(function(l){ porDono[l.uid]=e; }); if(e.id) porDono['emp_'+e.id]=e; });
      r[2].forEach(function(d){
        var x=d.data()||{}; if(x.chunk) return; x.__id=d.id;
        var e=porDono[x.cliente] || acha(x.cliente) || (x.clienteNome && acha(x.clienteNome)); if(!e) return;
        var k=x.tipoKey; if(!k) return;
        e.donos[k]=e.donos[k]||[]; e.donos[k].push(x);
        var atual=e.docs[k], ms=function(o){ var c=o&&o.criadoEm; return c&&c.seconds?c.seconds:0; };
        if(!atual || ms(x)>ms(atual)) e.docs[k]=x;
      });
      lista.sort(function(a,b){ return (a.semCadastro?1:0)-(b.semCadastro?1:0) || a.nome.localeCompare(b.nome); });
      empresas=lista; carregado=Date.now();
    }catch(e){ console.warn('[docseg] carregar', e); }
    carregando=false;
  }

  function situacao(e,k){
    var d=e.docs[k]; if(!d) return 'vz';
    var t=tipo(k);
    if(t && t.validade && d.validade){ var n=dias(d.validade); if(n<0) return 'ven'; if(n<=AVISO_DIAS) return 'av'; }
    if(e.logins.length){ var faltam=e.logins.filter(function(l){ return !(e.donos[k]||[]).some(function(x){ return x.cliente===l.uid; }); }); if(faltam.length) return 'par'; }
    return 'ok';
  }

  /* ================= arquivo ================= */
  function lerArquivo(f){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; r.readAsDataURL(f); }); }
  async function montar(meta){
    if(!meta) return null;
    if(meta.arquivoData) return meta.arquivoData;
    if(meta.data && !meta.partes) return meta.data;
    var n=meta.partes||0; if(!n) return null;
    var ids=[]; for(var i=0;i<n;i++) ids.push(meta.__id+'__p'+i);
    var ds=await Promise.all(ids.map(function(id){ return col().doc(id).get(); }));
    var s=''; ds.forEach(function(d){ if(d.exists) s+=(d.data().data||''); });
    return s||null;
  }
  function paraBlob(d){
    var p=String(d).split(','), m=(p[0].match(/:(.*?);/)||[])[1]||'application/octet-stream';
    var b=atob(p[1]||''), a=new Uint8Array(b.length); for(var i=0;i<b.length;i++) a[i]=b.charCodeAt(i);
    return new Blob([a],{type:m});
  }
  function baixar(d,nome){
    try{ var u=URL.createObjectURL(paraBlob(d)); var a=document.createElement('a'); a.href=u; a.download=nome||'documento'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },30000); }
    catch(e){ alert('Não foi possível baixar.'); }
  }
  async function apagarDono(dono,k){
    var s=await col().where('cliente','==',dono).get(), p=[];
    s.forEach(function(d){ if(d.data().tipoKey===k) p.push(d.ref.delete()); });
    await Promise.all(p);
  }
  async function gravarDono(dono,e,t,dataUrl,info){
    await apagarDono(dono,t.key);
    var base='seg_'+sanit(dono)+'_'+t.key, partes=[];
    for(var i=0;i<dataUrl.length;i+=CHUNK) partes.push(dataUrl.slice(i,i+CHUNK));
    await Promise.all(partes.map(function(p,k){ return col().doc(base+'__p'+k).set({cliente:dono, tipoKey:t.key, parte:k, chunk:true, data:p}); }));
    var meta={cliente:dono, clienteNome:e.nome, empresaId:e.id||'', tipo:t.label, tipoKey:t.key, meta:true,
      arquivoNome:info.nome, mime:info.mime, tamanho:info.tamanho, partes:partes.length,
      criadoEm:firebase.firestore.FieldValue.serverTimestamp(), origem:'Documentos Seguros v1'};
    if(info.validade) meta.validade=info.validade;
    await col().doc(base).set(meta);
  }
  /* com login: 1 copia por uid. Sem login: guarda em emp_<id> ate o acesso ser criado */
  function donosDe(e){ var d=e.logins.map(function(l){ return l.uid; }); if(!d.length && e.id) d.push('emp_'+e.id); return d; }

  async function enviar(e,t,f,validade){
    if(f.size>MAX_BYTES){ alert('Arquivo muito grande. Limite 15 MB.'); return false; }
    var dataUrl=await lerArquivo(f), info={nome:f.name, mime:f.type||'application/octet-stream', tamanho:f.size, validade:validade||''};
    var ds=donosDe(e);
    for(var i=0;i<ds.length;i++) await gravarDono(ds[i],e,t,dataUrl,info);
    /* limpa copias antigas gravadas com outro dono (ex.: pelo nome) */
    var velhos=(e.donos[t.key]||[]).map(function(x){ return x.cliente; }).filter(function(c){ return ds.indexOf(c)<0; });
    for(var j=0;j<velhos.length;j++) await apagarDono(velhos[j],t.key);
    return true;
  }
  async function excluir(e,k){
    var ds=donosDe(e).concat((e.donos[k]||[]).map(function(x){ return x.cliente; }));
    var vistos={};
    for(var i=0;i<ds.length;i++){ if(vistos[ds[i]]) continue; vistos[ds[i]]=1; await apagarDono(ds[i],k); }
  }
  async function salvarValidade(e,k,v){
    var lst=e.donos[k]||[];
    await Promise.all(lst.map(function(x){ return col().doc(x.__id).set({validade:v||firebase.firestore.FieldValue.delete()},{merge:true}); }));
  }
  /* copia o documento para os logins que ainda nao tem (Castro Store com 3 acessos etc.) */
  async function igualar(e){
    var feitos=0;
    for(var i=0;i<TIPOS.length;i++){
      var t=TIPOS[i], d=e.docs[t.key]; if(!d) continue;
      var tem=(e.donos[t.key]||[]).map(function(x){ return x.cliente; });
      var faltam=donosDe(e).filter(function(u){ return tem.indexOf(u)<0; });
      if(!faltam.length) continue;
      var dataUrl=await montar(d); if(!dataUrl) continue;
      var info={nome:d.arquivoNome||'documento', mime:d.mime||'application/octet-stream', tamanho:d.tamanho||0, validade:d.validade||''};
      for(var j=0;j<faltam.length;j++){ await gravarDono(faltam[j],e,t,dataUrl,info); feitos++; }
    }
    return feitos;
  }
  async function igualarTodos(){
    var n=0;
    for(var i=0;i<empresas.length;i++){ try{ n+=await igualar(empresas[i]); }catch(err){ console.warn('[docseg] igualar', empresas[i].nome, err); } }
    return n;
  }

  /* ================= tela ================= */
  function css(){
    if(el('ap-docseg-css')) return;
    var s=document.createElement('style'); s.id='ap-docseg-css';
    s.textContent=''
      +'#sec-docs-seguros{display:none!important}'
      +'#pp-docseg .ds-sub{font-size:12.5px;color:var(--cinza);margin:-4px 0 12px;line-height:1.5}'
      +'#pp-docseg .ds-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}'
      +'#pp-docseg .ds-kpi{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:11px 12px}'
      +'#pp-docseg .ds-kpi b{display:block;font-size:22px;font-weight:800}#pp-docseg .ds-kpi span{font-size:11px;color:var(--cinza)}'
      +'#pp-docseg .ds-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}'
      +'#pp-docseg .ds-bar input{flex:1;min-width:180px;padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card2,var(--card));color:inherit;font:inherit;font-size:13px}'
      +'#pp-docseg .ds-bt{font:inherit;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer}'
      +'#pp-docseg .ds-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-docseg .ds-bt.on{border-color:var(--azul);color:var(--azul-light,#7fa0ff)}'
      +'#pp-docseg .ds-rol{overflow-x:auto;border:1px solid var(--border);border-radius:14px;background:var(--card)}'
      +'#pp-docseg table{width:100%;border-collapse:collapse;font-size:12.5px}'
      +'#pp-docseg th{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--cinza);padding:10px 6px;text-align:center;border-bottom:1px solid var(--border);white-space:nowrap}'
      +'#pp-docseg th.cli,#pp-docseg td.cli{text-align:left;padding-left:12px;min-width:210px}'
      +'#pp-docseg td{padding:6px;text-align:center;border-bottom:1px dashed var(--border)}'
      +'#pp-docseg td.cli b{display:block;font-size:13px}#pp-docseg td.cli small{font-size:11px;color:var(--cinza)}'
      +'#pp-docseg .fa{width:44px;height:34px;border-radius:10px;border:1px solid var(--border);background:transparent;font-size:15px;font-weight:800;cursor:pointer;color:var(--cinza)}'
      +'#pp-docseg .fa.ok{background:rgba(14,159,110,.16);border-color:rgba(14,159,110,.5);color:#2fd29b}'
      +'#pp-docseg .fa.par{background:rgba(51,120,255,.14);border-color:rgba(51,120,255,.5);color:#7fa0ff}'
      +'#pp-docseg .fa.av{background:rgba(255,138,0,.14);border-color:#ff8a00;color:#ff9d2e}'
      +'#pp-docseg .fa.ven{background:rgba(217,45,32,.16);border-color:#d92d20;color:#ff6b60}'
      +'#pp-docseg .fa:hover{transform:translateY(-1px);border-color:var(--azul)}'
      +'#pp-docseg .ds-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--cinza);margin-top:10px}'
      +'#pp-docseg .ds-tag{display:inline-block;font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;background:rgba(130,145,170,.15);color:var(--cinza);margin-left:6px;vertical-align:middle}'
      +'body.ap-esc-claro #pp-docseg .fa.ok{color:#0e9f6e}body.ap-esc-claro #pp-docseg .fa.av{color:#c25e00}body.ap-esc-claro #pp-docseg .fa.ven{color:#d92d20}body.ap-esc-claro #pp-docseg .fa.par{color:#2346c9}'
      +'#ap-ds-modal{position:fixed;inset:0;z-index:99990;background:rgba(4,4,16,.72);display:flex;align-items:center;justify-content:center;padding:14px}'
      +'#ap-ds-modal .cx{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:var(--card,#10102a);color:inherit;border:1px solid var(--border,#232350);border-radius:18px;padding:16px;position:relative}'
      +'#ap-ds-modal h3{margin:0 30px 4px 0;font-size:16px}#ap-ds-modal .s{font-size:12px;color:var(--cinza);margin-bottom:10px}'
      +'#ap-ds-modal .x{position:absolute;top:10px;right:12px;background:none;border:0;color:var(--cinza);font-size:20px;cursor:pointer}'
      +'#ap-ds-modal .ln{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border);font-size:12.5px}#ap-ds-modal .ln span{color:var(--cinza)}'
      +'#ap-ds-modal .bts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}'
      +'#ap-ds-modal .bt{flex:1;min-width:110px;font:inherit;font-size:13px;font-weight:800;padding:10px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer}'
      +'#ap-ds-modal .bt.az{background:var(--azul);border-color:var(--azul);color:#fff}#ap-ds-modal .bt.vd{background:#0e9f6e;border-color:#0e9f6e;color:#fff}#ap-ds-modal .bt.vm{background:transparent;border-color:#d92d20;color:#ff6b60}'
      +'#ap-ds-modal .bt:disabled{opacity:.55;cursor:wait}'
      +'#ap-ds-modal input[type=date]{padding:8px 10px;border-radius:9px;border:1px solid var(--border);background:transparent;color:inherit;font:inherit}'
      +'#ap-ds-modal iframe,#ap-ds-modal img.pv{width:100%;height:360px;border:1px solid var(--border);border-radius:12px;background:#fff;margin-top:10px;object-fit:contain}'
      +'#ap-ds-modal .al{border-radius:11px;padding:9px 11px;font-size:12px;margin:8px 0;line-height:1.5}'
      +'#ap-ds-modal .al.av{background:rgba(255,138,0,.13);border:1px solid rgba(255,138,0,.4)}#ap-ds-modal .al.ven{background:rgba(217,45,32,.13);border:1px solid rgba(217,45,32,.4)}#ap-ds-modal .al.par{background:rgba(51,120,255,.12);border:1px solid rgba(51,120,255,.4)}'
      +'@media(max-width:700px){#pp-docseg .ds-kpis{grid-template-columns:1fr 1fr}#pp-docseg th.cli,#pp-docseg td.cli{min-width:150px}#pp-docseg .fa{width:36px;height:30px;font-size:13px}}';
    document.head.appendChild(s);
  }

  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-docseg')) return;
    var ref=null;
    [].slice.call(nv.querySelectorAll('.nav-item')).forEach(function(it){ if(!ref && /^\s*\S+\s*Documentos\s*$/.test(it.textContent||'')) ref=it; });
    var it=document.createElement('div'); it.className='nav-item'; it.id='ap-nav-docseg';
    it.innerHTML='<span class="ni">\u{1F512}</span>Documentos Seguros<span class="nav-dot" id="dot-docseg" style="display:none"></span>';
    it.onclick=function(){ abrir(it); };
    if(ref && ref.parentNode) ref.parentNode.insertBefore(it, ref.nextSibling); else nv.appendChild(it);
  }
  function pagina(){
    if(el('pp-docseg')) return;
    var base=el('pp-docs'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-docseg';
    p.innerHTML='<div class="sec">\u{1F512} Documentos Seguros</div>'
      +'<div class="ds-sub">Uma linha por empresa. Clique no quadradinho para ver, baixar, enviar ou trocar. O arquivo vai para <b>todos os acessos</b> da empresa de uma vez.</div>'
      +'<div class="ds-kpis" id="ds-kpis"></div>'
      +'<div class="ds-bar"><input id="ds-q" placeholder="\u{1F50E} Buscar empresa ou CNPJ..."/>'
      +'<button class="ds-bt" data-ds-f="todos">Todos</button><button class="ds-bt" data-ds-f="falta">Faltando</button><button class="ds-bt" data-ds-f="venc">Vencendo/vencidos</button>'
      +'<button class="ds-bt" id="ds-atu">\u{1F504} Atualizar</button></div>'
      +'<div class="ds-rol"><table id="ds-tab"><thead></thead><tbody><tr><td style="padding:16px;color:var(--cinza)">Carregando...</td></tr></tbody></table></div>'
      +'<div class="ds-leg"><span><b style="color:#2fd29b">✓</b> Enviado</span><span><b style="color:#7fa0ff">◐</b> Falta em algum acesso</span><span><b style="color:#ff9d2e">⏳</b> Vence em até '+AVISO_DIAS+' dias</span><span><b style="color:#ff6b60">!</b> Vencido</span><span><b>+</b> Não enviado</span></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    el('ds-q').oninput=function(){ busca=this.value; grade(); };
    [].forEach.call(p.querySelectorAll('[data-ds-f]'),function(b){ b.onclick=function(){ filtro=b.getAttribute('data-ds-f'); grade(); }; });
    el('ds-atu').onclick=async function(){ var b=this; b.disabled=true; b.textContent='Atualizando...'; await carregar(); var n=await igualarTodos(); if(n) await carregar(); grade(); b.disabled=false; b.textContent='\u{1F504} Atualizar'; if(n) aviso('\u{2705} '+n+' cópia(s) enviada(s) para acessos que estavam sem o documento.'); };
    try{ if(window.ABA_NOMES) window.ABA_NOMES.docseg='Documentos Seguros'; }catch(e){}
  }
  var igualouNaAbertura=false;
  async function abrir(item){
    menu(); pagina();
    try{ if(typeof pPage==='function') pPage('docseg', item||el('ap-nav-docseg')); }catch(e){}
    var p=el('pp-docseg'); if(p) p.classList.add('active');
    grade(); await carregar(); grade();
    if(!igualouNaAbertura){ igualouNaAbertura=true; var n=await igualarTodos(); if(n){ await carregar(); grade(); aviso('\u{2705} '+n+' documento(s) copiados para os outros acessos da mesma empresa.'); } }
  }

  function passaFiltro(e){
    if(busca){ var q=chave(busca), c=String(e.cnpj||'').replace(/\D/g,''), qd=busca.replace(/\D/g,''); if(!(chave(e.nome).indexOf(q)>=0 || (qd.length>=3 && c.indexOf(qd)>=0))) return false; }
    if(filtro==='falta') return TIPOS.some(function(t){ var s=situacao(e,t.key); return s==='vz'||s==='par'; });
    if(filtro==='venc') return TIPOS.some(function(t){ var s=situacao(e,t.key); return s==='av'||s==='ven'; });
    return true;
  }
  function grade(){
    var tab=el('ds-tab'); if(!tab) return;
    [].forEach.call(document.querySelectorAll('#pp-docseg [data-ds-f]'),function(b){ b.classList.toggle('on', b.getAttribute('data-ds-f')===filtro); });
    tab.tHead.innerHTML='<tr><th class="cli">Empresa</th>'+TIPOS.map(function(t){ return '<th>'+esc(t.curto)+'</th>'; }).join('')+'</tr>';
    if(!carregado){ tab.tBodies[0].innerHTML='<tr><td class="cli" colspan="6" style="padding:16px;color:var(--cinza)">Carregando...</td></tr>'; return; }
    var ico={ok:'✓',par:'◐',av:'⏳',ven:'!',vz:'+'}, h='', vis=empresas.filter(passaFiltro);
    if(!vis.length) h='<tr><td class="cli" colspan="6" style="padding:16px;color:var(--cinza)">Nenhuma empresa nesse filtro.</td></tr>';
    vis.forEach(function(e){
      var i=empresas.indexOf(e);
      h+='<tr><td class="cli"><b>'+esc(e.nome)+(e.semCadastro?'<span class="ds-tag">sem cadastro</span>':'')+'</b><small>'+esc(e.cnpj||'CNPJ não informado')+' · '+(e.logins.length?(e.logins.length+(e.logins.length>1?' acessos':' acesso')):'sem acesso ao app')+'</small></td>';
      TIPOS.forEach(function(t){
        var s=situacao(e,t.key), d=e.docs[t.key];
        var tit=t.curto+(d?(' — '+(d.arquivoNome||'arquivo')+(d.validade?(' · válido até '+dataBR(d.validade)):'')):' — não enviado');
        h+='<td><button class="fa '+s+'" data-ds-e="'+i+'" data-ds-k="'+t.key+'" title="'+esc(tit)+'">'+ico[s]+'</button></td>';
      });
      h+='</tr>';
    });
    tab.tBodies[0].innerHTML=h;
    [].forEach.call(tab.querySelectorAll('[data-ds-e]'),function(b){ b.onclick=function(){ detalhe(empresas[+b.getAttribute('data-ds-e')], b.getAttribute('data-ds-k')); }; });
    kpis();
  }
  function contar(){
    var c={env:0,tot:0,falta:0,av:0,ven:0};
    empresas.forEach(function(e){ TIPOS.forEach(function(t){ var s=situacao(e,t.key); c.tot++; if(s==='vz') c.falta++; else c.env++; if(s==='av') c.av++; if(s==='ven') c.ven++; }); });
    return c;
  }
  function kpis(){
    var c=contar(), box=el('ds-kpis');
    if(box) box.innerHTML='<div class="ds-kpi"><b style="color:#2fd29b">'+c.env+'</b><span>documentos enviados</span></div>'
      +'<div class="ds-kpi"><b>'+c.falta+'</b><span>ainda não enviados</span></div>'
      +'<div class="ds-kpi"><b style="color:#ff9d2e">'+c.av+'</b><span>vencem em até '+AVISO_DIAS+' dias</span></div>'
      +'<div class="ds-kpi"><b style="color:#ff6b60">'+c.ven+'</b><span>vencidos</span></div>';
    var dot=el('dot-docseg'); if(dot) dot.style.display=(c.av+c.ven)>0?'inline-block':'none';
  }

  function fechar(){ var m=el('ap-ds-modal'); if(m){ var f=m.querySelector('iframe'); if(f && f.src.indexOf('blob:')===0) try{ URL.revokeObjectURL(f.src); }catch(e){} m.remove(); } }
  function janela(html){
    fechar();
    var m=document.createElement('div'); m.id='ap-ds-modal';
    m.innerHTML='<div class="cx"><button class="x" id="ds-mx">✖</button>'+html+'</div>';
    m.onclick=function(ev){ if(ev.target===m) fechar(); };
    (el('view-painel')||document.body).appendChild(m);
    el('ds-mx').onclick=fechar;
    return m;
  }
  function escolher(cb){
    var inp=document.createElement('input'); inp.type='file'; inp.accept='.pdf,.png,.jpg,.jpeg,.p12,.pfx';
    inp.onchange=function(){ if(inp.files && inp.files[0]) cb(inp.files[0]); }; inp.click();
  }

  function detalhe(e,k){
    var t=tipo(k), d=e.docs[k], s=situacao(e,k);
    var h='<h3>'+esc(t.label)+'</h3><div class="s">'+esc(e.nome)+(e.cnpj?' · '+esc(e.cnpj):'')+'</div>';
    h+='<div class="ln"><span>Acessos ao app</span><b>'+(e.logins.length?esc(e.logins.map(function(l){ return String(l.email||'').toLowerCase(); }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(', '))+(e.logins.length>1?' ('+e.logins.length+' logins)':''):'nenhum — o arquivo fica guardado e vai sozinho quando o acesso for criado')+'</b></div>';
    if(d){
      h+='<div class="ln"><span>Arquivo</span><b>'+esc(d.arquivoNome||'arquivo')+' · '+Math.max(1,Math.round((d.tamanho||0)/1024))+' KB</b></div>';
      if(d.criadoEm && d.criadoEm.seconds) h+='<div class="ln"><span>Enviado em</span><b>'+new Date(d.criadoEm.seconds*1000).toLocaleDateString('pt-BR')+'</b></div>';
    } else h+='<div class="ln"><span>Situação</span><b>não enviado</b></div>';
    if(t.validade){
      h+='<div class="ln" style="align-items:center"><span>Válido até</span><span><input type="date" id="ds-val" value="'+esc(d&&d.validade||'')+'"/>'+(d?' <button class="ds-bt" id="ds-val-ok" style="font:inherit;font-size:12px;font-weight:700;padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer">Salvar</button>':'')+'</span></div>';
      if(s==='ven') h+='<div class="al ven">\u{26A0}\u{FE0F} Venceu em '+dataBR(d.validade)+'. Providencie a renovação e envie o novo arquivo.</div>';
      if(s==='av') h+='<div class="al av">\u{23F3} Vence em '+dias(d.validade)+' dia(s) ('+dataBR(d.validade)+').</div>';
    }
    if(s==='par') h+='<div class="al par">\u{25D0} Algum acesso desta empresa ainda não tem o arquivo. Toque em <b>Igualar acessos</b>.</div>';
    if(d && /pdf|image/i.test(d.mime||'')) h+='<div id="ds-pv" style="font-size:12px;color:var(--cinza);margin-top:10px">Carregando visualização...</div>';
    h+='<div class="bts">';
    if(d) h+='<button class="bt az" id="ds-baixar">\u{2B07} Baixar</button><button class="bt" id="ds-trocar">\u{1F504} Trocar arquivo</button>';
    else h+='<button class="bt az" id="ds-enviar">\u{1F4E4} Enviar arquivo</button>';
    if(s==='par') h+='<button class="bt vd" id="ds-igualar">\u{1F465} Igualar acessos</button>';
    if(d) h+='<button class="bt vm" id="ds-excluir">\u{1F5D1} Excluir</button>';
    h+='</div>';
    var m=janela(h);

    var dataCache=null;
    async function obter(){ if(!dataCache) dataCache=await montar(d); return dataCache; }
    if(d && el('ds-pv')){
      obter().then(function(x){
        var pv=el('ds-pv'); if(!pv) return;
        if(!x){ pv.textContent='Arquivo não encontrado.'; return; }
        var u=URL.createObjectURL(paraBlob(x));
        pv.outerHTML=/image/i.test(d.mime||'') ? '<img class="pv" src="'+u+'"/>' : '<iframe src="'+u+'"></iframe>';
      });
    }
    function mandar(){
      escolher(async function(f){
        var v=el('ds-val') ? el('ds-val').value : '';
        if(t.validade && !v && !confirm('Sem data de validade o app não consegue avisar quando vencer. Enviar assim mesmo?')) return;
        var bts=m.querySelectorAll('.bt'); [].forEach.call(bts,function(b){ b.disabled=true; });
        var b1=el('ds-enviar')||el('ds-trocar'); if(b1) b1.textContent='Enviando...';
        try{ if(await enviar(e,t,f,v)){ aviso('\u{2705} '+t.curto+' enviado para '+e.nome+(e.logins.length>1?' ('+e.logins.length+' acessos)':'')+'.'); fechar(); await carregar(); grade(); } }
        catch(err){ alert('Erro ao enviar: '+(err.code||err.message||err)); [].forEach.call(bts,function(b){ b.disabled=false; }); }
      });
    }
    if(el('ds-enviar')) el('ds-enviar').onclick=mandar;
    if(el('ds-trocar')) el('ds-trocar').onclick=mandar;
    if(el('ds-baixar')) el('ds-baixar').onclick=async function(){ var x=await obter(); if(x) baixar(x,d.arquivoNome); else alert('Arquivo não encontrado.'); };
    if(el('ds-val-ok')) el('ds-val-ok').onclick=async function(){ var b=this; b.disabled=true; try{ await salvarValidade(e,k,el('ds-val').value); aviso('\u{2705} Validade salva.'); fechar(); await carregar(); grade(); }catch(err){ alert('Erro: '+(err.code||err.message)); b.disabled=false; } };
    if(el('ds-igualar')) el('ds-igualar').onclick=async function(){ var b=this; b.disabled=true; b.textContent='Copiando...'; try{ var n=await igualar(e); aviso('\u{2705} '+n+' cópia(s) enviada(s).'); fechar(); await carregar(); grade(); }catch(err){ alert('Erro: '+(err.code||err.message)); b.disabled=false; } };
    if(el('ds-excluir')) el('ds-excluir').onclick=async function(){
      if(!confirm('Excluir '+t.curto+' de '+e.nome+'? Some para todos os acessos da empresa.')) return;
      var b=this; b.disabled=true; b.textContent='Excluindo...';
      try{ await excluir(e,k); aviso('\u{1F5D1} Documento excluído.'); fechar(); await carregar(); grade(); }catch(err){ alert('Erro: '+(err.code||err.message)); b.disabled=false; }
    };
  }

  /* ================= relogio ================= */
  var voltas=0, ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      if(noPainel()){
        css(); menu(); pagina();
        if(voltas===2 || voltas%60===0){ await carregar(); grade(); }
      }
    }catch(e){}
    ocupado=false;
  }
  [1500,4000,8000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,5000);

  window.apDocSeguros=function(){ return abrir(); };
  window.__DOCSEG__={carregar:carregar, grade:grade, situacao:situacao, mesmoNome:mesmoNome, igualar:igualar, igualarTodos:igualarTodos, enviar:enviar, excluir:excluir, abrir:abrir,
    estado:function(){ return {empresas:empresas, carregado:carregado}; }, TIPOS:TIPOS};
})();
