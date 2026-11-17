/* APARAT - UM LOGIN, VARIAS EMPRESAS (v1, 17/11/2026)
   Pedido do Daniel: o cliente Keseler e responsavel por 5 CNPJ (e a Debora tambem). Eles entram com UMA conta
   e escolhem em qual empresa vao mexer.
   COMO FUNCIONA
   - usuarios/<uid>.empresas = lista de nomes de clientes que o login pode abrir (quem marca e o escritorio, em
     Meu Escritorio > Acessos criados > Editar > "Empresas deste login"). empresasInfo guarda nome + CNPJ para a tela.
   - A empresa ATIVA continua sendo usuarios/<uid>.clienteNome - o mesmo campo que o app inteiro e as regras do
     Firestore (meuNome()) ja usam. Trocar de empresa = gravar clienteNome (so vale nome que esta em "empresas",
     a regra do Firestore confere) e recarregar o app. Por isso nenhuma outra tela precisou mudar.
   - Login com uma empresa so: este modulo nao faz nada.
   CLIENTE: tela "Escolha a empresa" ao abrir o app (uma vez por abertura) + faixa "Voce esta em ... [Trocar]".
   ESCRITORIO: bloco de marcar as empresas no Editar do acesso + etiqueta "N empresas" na lista.
   Documentos Seguros sao guardados por login (um arquivo de cada tipo): para login com varias empresas a lista
   fica escondida, com um aviso, para o documento de uma empresa nao aparecer na outra. */
;(function(){
  if(window.__APARAT_MULTI__) return; window.__APARAT_MULTI__=1;

  var CHAVE='apMultiOk';
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function usuario(){ try{ return firebase.auth().currentUser; }catch(e){ return null; } }
  function papel(){ try{ return (typeof CURRENT_ROLE!=='undefined') ? CURRENT_ROLE : null; }catch(e){ return null; } }
  function ativa(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? String(CURRENT_CLIENTE) : ''; }catch(e){ return ''; } }
  function ehAdmin(){ try{ var u=usuario(); if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return papel()==='admin'; }catch(e){ return false; } }
  function aparece(e){ return !!e && e.style.display!=='none' && e.offsetParent!==null; }
  function lista(o){ var v=[]; if(o && Array.isArray(o.empresas)) o.empresas.forEach(function(n){ n=String(n==null?'':n).trim(); if(n && v.indexOf(n)<0) v.push(n); }); return v; }
  function cnpjDe(o,nome){ var r=''; if(o && Array.isArray(o.empresasInfo)) o.empresasInfo.forEach(function(x){ if(x && x.nome===nome && x.cnpj) r=String(x.cnpj); }); return r; }

  function css(){
    if(el('ap-me-css')) return;
    var s=document.createElement('style'); s.id='ap-me-css';
    s.textContent=
       '#me-faixa{display:flex;align-items:center;gap:10px;max-width:980px;margin:8px auto 0;padding:10px 14px;border-radius:14px;background:#0b1f4d;color:#fff;border:1.5px solid #00c2a8;box-sizing:border-box;width:calc(100% - 28px)}'
      +'#me-faixa .me-t{flex:1;min-width:0}'
      +'#me-faixa small{display:block;font-size:12px;opacity:.85}'
      +'#me-faixa b{display:block;font-size:16px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'#me-faixa button{font:inherit;font-size:16px;font-weight:800;padding:10px 14px;border-radius:12px;border:0;background:#00c2a8;color:#04231f;cursor:pointer;white-space:nowrap}'
      +'#me-esc{position:fixed;inset:0;z-index:99990;background:#f4f7fc;color:#0b1730;overflow:auto;-webkit-overflow-scrolling:touch;font-family:inherit}'
      +'#me-esc .me-c{max-width:560px;margin:0 auto;padding:22px 16px 40px}'
      +'#me-esc .me-h{display:flex;align-items:center;gap:12px;margin-bottom:18px}'
      +'#me-esc .me-h img{width:56px;height:56px;border-radius:14px;background:#09142a;object-fit:contain}'
      +'#me-esc .me-h div b{display:block;font-size:18px;font-weight:800}'
      +'#me-esc .me-h div span{display:block;font-size:14px;color:#51607a}'
      +'#me-esc h2{margin:0 0 4px;font-size:22px;font-weight:800}'
      +'#me-esc p{margin:0 0 14px;font-size:15px;color:#51607a;line-height:1.5}'
      +'#me-esc .me-e{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;padding:16px;margin:0 0 10px;border-radius:16px;border:1.5px solid #d6deec;background:#fff;color:inherit;cursor:pointer;box-sizing:border-box}'
      +'#me-esc .me-e.at{border-color:#00a892;box-shadow:0 0 0 3px rgba(0,194,168,.18)}'
      +'#me-esc .me-e .me-n{flex:1;min-width:0}'
      +'#me-esc .me-e b{display:block;font-size:17px;font-weight:800;word-break:break-word}'
      +'#me-esc .me-e small{display:block;font-size:14px;color:#51607a;margin-top:2px}'
      +'#me-esc .me-e i{font-style:normal;font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;background:#d9f7f1;color:#06695c;white-space:nowrap}'
      +'#me-esc .me-e u{text-decoration:none;font-size:22px;color:#8a97ad}'
      +'#me-esc .me-e:disabled{opacity:.6;cursor:wait}'
      +'#me-esc .me-er{display:none;font-size:15px;line-height:1.5;padding:12px 14px;border-radius:12px;margin:0 0 12px;background:#fdecea;border:1px solid #f3b3ad;color:#8a1c12}'
      +'#me-esc .me-x{display:block;width:100%;font:inherit;font-size:16px;font-weight:700;padding:13px;border-radius:12px;border:1px solid #c6d0e2;background:transparent;color:#27344d;cursor:pointer;margin-top:6px}'
      +'#me-docseg{font-size:14px;line-height:1.5;padding:12px;border-radius:10px;background:rgba(0,194,168,.10);border:1px solid rgba(0,194,168,.45)}'
      +'body.ap-me-multi #lista-docs-cliente{display:none!important}'
      +'#me-adm h4{margin:0 0 6px;font-size:13px}'
      +'#me-adm .me-lst{max-height:230px;overflow:auto;border:1px solid var(--border);border-radius:10px;padding:6px 8px;background:var(--card)}'
      +'#me-adm .me-lst label{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:0;padding:5px 2px;color:inherit;cursor:pointer}'
      +'#me-adm .me-lst input{width:auto;margin-top:2px}'
      +'#me-adm .me-lst small{color:var(--cinza);font-size:11px}'
      +'#me-adm .me-cont{font-size:12px;font-weight:700;margin:8px 0}'
      +'.me-chip{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:999px;margin:3px 4px 0 0;background:rgba(0,194,168,.18);color:#0fb39d}';
    document.head.appendChild(s);
  }

  /* ================= LADO DO CLIENTE ================= */
  var meu=null, meuUid='', lendo=false, trocando=false, ouvindo=null;

  async function lerMeu(){
    var u=usuario(), d=db(); if(!u || !d || lendo) return; lendo=true;
    try{ var s=await d.collection('usuarios').doc(u.uid).get(); meu=s.exists?(s.data()||{}):{}; meuUid=u.uid; }catch(e){}
    lendo=false;
  }
  function jaEscolheu(){ try{ return sessionStorage.getItem(CHAVE)===meuUid; }catch(e){ return true; } }
  function marcaEscolha(){ try{ sessionStorage.setItem(CHAVE,meuUid); }catch(e){} }

  function faixa(emp){
    var vc=el('view-cliente'), f=el('me-faixa');
    if(!vc || !aparece(vc)){ if(f) f.style.display='none'; return; }
    if(!f){
      f=document.createElement('div'); f.id='me-faixa';
      f.innerHTML='<div class="me-t"><small>Você está na empresa</small><b id="me-faixa-n"></b></div><button type="button" id="me-faixa-b">\u{1F501} Trocar</button>';
      vc.parentNode.insertBefore(f,vc);
      el('me-faixa-b').onclick=function(){ abrirEscolha(false); };
    }
    f.style.display='flex';
    var n=el('me-faixa-n'), a=ativa(); if(n && n.textContent!==a){ n.textContent=a; f.title=a+' — '+emp.length+' empresas neste acesso'; }
  }

  function abrirEscolha(obrigatoria){
    if(el('me-esc')) return;
    var emp=lista(meu), a=ativa(), u=usuario();
    var o=document.createElement('div'); o.id='me-esc'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Escolha a empresa');
    var h='<div class="me-c"><div class="me-h"><img src="icone-aparat.png" alt="APARAT Contabilidade"><div><b>APARAT Contabilidade</b><span>'+esc(u&&u.email||'')+'</span></div></div>'
      +'<h2>Escolha a empresa</h2><p>Este acesso cuida de '+emp.length+' empresas. Toque na empresa em que você vai mexer agora. Dá para trocar depois pelo botão <b>Trocar</b>, no alto da tela.</p>'
      +'<div class="me-er" id="me-er"></div>';
    emp.forEach(function(n,i){
      var c=cnpjDe(meu,n);
      h+='<button type="button" class="me-e'+(n===a?' at':'')+'" data-me="'+i+'"><span class="me-n"><b>'+esc(n)+'</b>'+(c?'<small>CNPJ '+esc(c)+'</small>':'')+'</span>'
        +(n===a?'<i>Aberta agora</i>':'')+'<u>›</u></button>';
    });
    if(!obrigatoria) h+='<button type="button" class="me-x" id="me-x">Voltar sem trocar</button>';
    h+='</div>';
    o.innerHTML=h; document.body.appendChild(o);
    var x=el('me-x'); if(x) x.onclick=fecharEscolha;
    [].forEach.call(o.querySelectorAll('[data-me]'),function(b){ b.onclick=function(){ escolher(emp[+b.getAttribute('data-me')]); }; });
  }
  function fecharEscolha(){ var o=el('me-esc'); if(o) o.remove(); }

  async function escolher(nome){
    if(trocando || !nome) return;
    if(nome===ativa()){ marcaEscolha(); fecharEscolha(); return; }
    /* "Ver app do cliente" (ver-como-cliente.js): troca so a visualizacao do escritorio, sem gravar nada */
    try{ if(window.__VERCOMO__ && window.__VERCOMO__.ativo){ trocando=true; marcaEscolha(); window.__VERCOMO__.trocar(nome); return; } }catch(e){}
    var o=el('me-esc'), er=el('me-er'), d=db(), u=usuario(); if(!d || !u) return;
    trocando=true; if(er) er.style.display='none';
    if(o) [].forEach.call(o.querySelectorAll('button'),function(b){ b.disabled=true; });
    try{
      await d.collection('usuarios').doc(u.uid).update({clienteNome:nome, empresaEm:Date.now()});
      marcaEscolha();
      location.reload();
    }catch(e){
      trocando=false;
      if(o) [].forEach.call(o.querySelectorAll('button'),function(b){ b.disabled=false; });
      if(er){ er.style.display='block';
        er.textContent=(e && e.code==='permission-denied')
          ? 'A troca de empresa ainda não está liberada para este acesso. Avise a APARAT pelo WhatsApp (16) 98869-9203.'
          : 'Não consegui trocar agora. Confira a internet e toque de novo.'; }
    }
  }

  function vigiar(){
    if(ouvindo || !meuUid) return; if(window.__APARAT_VERCOMO__) return; var d=db(); if(!d) return;
    try{
      ouvindo=d.collection('usuarios').doc(meuUid).onSnapshot(function(s){
        if(!s.exists || trocando) return; var o=s.data()||{};
        /* outro aparelho com o mesmo login trocou de empresa: este aqui acompanha, para nao mostrar tela de uma com dados de outra */
        if(o.clienteNome && ativa() && o.clienteNome!==ativa() && lista(o).indexOf(o.clienteNome)>=0){ trocando=true; marcaEscolha(); location.reload(); return; }
        meu=o;
      },function(){});
    }catch(e){}
  }

  function docseg(emp){
    var box=el('lista-docs-cliente'); if(!box || el('me-docseg')) return;
    var n=document.createElement('div'); n.id='me-docseg';
    n.textContent='Como este acesso cuida de '+emp.length+' empresas, os documentos seguros (cartão CNPJ, certidão e certificado) não ficam guardados aqui. Peça à APARAT pela aba Solicitações e eles chegam em Documentos Solicitados, já na empresa certa.';
    box.parentNode.insertBefore(n,box);
  }

  async function ladoCliente(){
    var u=usuario(); if(!u) return;
    if(!meu || meuUid!==u.uid){ await lerMeu(); if(!meu) return; }
    var emp=lista(meu);
    if(emp.length<2){ document.body.classList.remove('ap-me-multi'); var f=el('me-faixa'); if(f) f.style.display='none'; return; }
    css(); document.body.classList.add('ap-me-multi');
    vigiar(); faixa(emp); docseg(emp);
    if(trocando) return;
    if(emp.indexOf(ativa())<0) abrirEscolha(true);          /* login ligado a empresa fora da lista: tem de escolher */
    else if(!jaEscolheu()) abrirEscolha(true);                /* primeira tela depois de abrir o app */
  }

  /* ================= LADO DO ESCRITORIO ================= */
  var usu={}, cli=[], tAdm=0, cargaAdm=false, marcas={}, msgAdm={};

  async function carregarAdm(forcar){
    if(cargaAdm) return; if(!forcar && tAdm && (Date.now()-tAdm)<20000) return;
    var d=db(); if(!d) return; cargaAdm=true;
    try{
      var r=await Promise.all([d.collection('usuarios').get(), d.collection('clientes').get()]), m={}, v=[];
      r[0].forEach(function(x){ m[x.id]=x.data()||{}; });
      r[1].forEach(function(x){ var o=x.data()||{}, n=String(o.nome||'').trim(); if(n) v.push({nome:n, cnpj:String(o.cnpj||'')}); });
      v.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); });
      usu=m; cli=v; tAdm=Date.now();
    }catch(e){}
    cargaAdm=false;
  }

  function chips(){
    [].forEach.call(document.querySelectorAll('#acc-lista [data-acc-ed]'),function(b){
      var uid=b.getAttribute('data-acc-ed'), linha=b.parentNode, alvo=linha && linha.querySelector('.acc-i > div'); if(!alvo) return;
      var emp=lista(usu[uid]), c=alvo.querySelector('.me-chip');
      if(emp.length<2){ if(c) c.remove(); return; }
      var t=emp.length+' empresas';
      if(!c){ c=document.createElement('span'); c.className='me-chip'; alvo.appendChild(c); }
      if(c.textContent!==t){ c.textContent=t; c.title=emp.join(' · '); }
    });
  }

  function blocoAdm(){
    var ed=document.querySelector('#acc-lista .acc-ed'); if(!ed) return;
    var linha=ed.parentNode, bt=linha && linha.querySelector('[data-acc-ed]'), uid=bt && bt.getAttribute('data-acc-ed'); if(!uid) return;
    var b=el('me-adm'); if(b && b.getAttribute('data-uid')===uid && ed.contains(b)) return; if(b) b.remove();
    var o=usu[uid]||{}, emp=lista(o);
    if(!marcas[uid]){ marcas[uid]={}; (emp.length?emp:(o.clienteNome?[o.clienteNome]:[])).forEach(function(n){ marcas[uid][n]=1; }); }
    var nomes=cli.slice(); Object.keys(marcas[uid]).forEach(function(n){ if(!nomes.some(function(c){ return c.nome===n; })) nomes.push({nome:n,cnpj:''}); });
    b=document.createElement('div'); b.id='me-adm'; b.setAttribute('data-uid',uid);
    var h='<h4>\u{1F3E2} Empresas deste login (um acesso, vários CNPJ)</h4>'
      +'<p>Marque todas as empresas que esta pessoa pode abrir. Com duas ou mais, ela escolhe a empresa ao entrar no app e troca pelo botão Trocar. Cada empresa continua separada no seu painel.</p>'
      +'<div class="me-lst">';
    nomes.forEach(function(c,i){ h+='<label><input type="checkbox" data-me-ck="'+i+'"'+(marcas[uid][c.nome]?' checked':'')+'><span>'+esc(c.nome)+(c.cnpj?'<br><small>'+esc(c.cnpj)+'</small>':'')+'</span></label>'; });
    h+='</div><div class="me-cont" id="me-cont"></div><button type="button" class="acc-b ok" id="me-salva">\u{1F4BE} Salvar empresas</button>'
      +(msgAdm[uid]?'<div class="acc-msg '+msgAdm[uid].t+'" style="margin-top:8px">'+msgAdm[uid].h+'</div>':'');
    b.innerHTML=h; ed.appendChild(b);
    function conta(){ var n=Object.keys(marcas[uid]).length, c=el('me-cont'); if(c) c.textContent = n>=2 ? (n+' empresas marcadas: a pessoa escolhe a empresa ao entrar.') : (n===1 ? '1 empresa marcada: acesso comum, entra direto nela.' : 'Nenhuma marcada: marque pelo menos uma.'); }
    [].forEach.call(b.querySelectorAll('[data-me-ck]'),function(k){ k.onchange=function(){ var n=nomes[+k.getAttribute('data-me-ck')].nome; if(k.checked) marcas[uid][n]=1; else delete marcas[uid][n]; conta(); }; });
    conta();
    el('me-salva').onclick=async function(){
      var sel=nomes.filter(function(c){ return marcas[uid][c.nome]; }), bt2=this;
      if(!sel.length){ msgAdm[uid]={t:'er',h:'\u{26D4} Marque pelo menos uma empresa. Para desligar o login, use "Cliente ligado a este login" ao lado.'}; b.remove(); blocoAdm(); return; }
      bt2.disabled=true;
      try{
        var nomesSel=sel.map(function(c){ return c.nome; }), dados;
        var atual=(o.clienteNome && nomesSel.indexOf(o.clienteNome)>=0) ? o.clienteNome : nomesSel[0];
        if(sel.length>=2) dados={empresas:nomesSel, empresasInfo:sel.map(function(c){ return {nome:c.nome, cnpj:c.cnpj||''}; }), clienteNome:atual, desligadoEm:'', clienteAntigo:'', empresasEm:new Date().toLocaleString('pt-BR')};
        else dados={empresas:firebase.firestore.FieldValue.delete(), empresasInfo:firebase.firestore.FieldValue.delete(), clienteNome:atual, desligadoEm:'', clienteAntigo:'', empresasEm:new Date().toLocaleString('pt-BR')};
        await db().collection('usuarios').doc(uid).set(dados,{merge:true});
        msgAdm[uid]={t:'ok',h: sel.length>=2 ? ('\u{2705} Salvo. Este login abre <b>'+sel.length+' empresas</b>: '+nomesSel.map(esc).join(' · ')+'. Na próxima vez que a pessoa abrir o app, ela escolhe a empresa.')
                                           : ('\u{2705} Salvo. Este login abre só <b>'+esc(atual)+'</b>.')};
        delete marcas[uid]; await carregarAdm(true);
        try{ if(window.__ACESSOS__ && window.__ACESSOS__.carregar){ await window.__ACESSOS__.carregar(true); window.__ACESSOS__.desenhar(); } }catch(_){}
      }catch(e){ msgAdm[uid]={t:'er',h:'\u{26D4} Não consegui salvar: '+esc((e&&e.message)||e)}; bt2.disabled=false; }
      var v=el('me-adm'); if(v) v.remove(); blocoAdm(); chips();
    };
  }

  async function ladoAdmin(){
    var pg=el('pp-escritorio'); if(!pg || !pg.classList.contains('active') || !el('acc-lista')) return;
    css(); await carregarAdm(false); chips(); blocoAdm();
  }

  var ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true;
    try{
      var p=papel();
      if(p==='cliente') await ladoCliente();
      else if(p==='admin' && ehAdmin()) await ladoAdmin();
      else { var f=el('me-faixa'); if(f) f.style.display='none'; fecharEscolha(); meu=null; meuUid=''; if(ouvindo){ try{ ouvindo(); }catch(e){} ouvindo=null; } document.body.classList.remove('ap-me-multi'); }
    }catch(e){}
    ocupado=false;
  }
  [600,1500,3000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,1200);

  window.__MULTI__={ estado:function(){ return {meu:meu, ativa:ativa(), usu:usu, cli:cli, marcas:marcas}; }, abrir:function(){ abrirEscolha(false); }, escolher:escolher, tick:tick };
})();
