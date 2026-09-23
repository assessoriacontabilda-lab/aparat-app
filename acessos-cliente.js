/* APARAT - ACESSOS DOS CLIENTES: LISTA, EDITAR, NOVA SENHA (v1, 22/09/2026)
   Pedido do Daniel: "corrige o editar do acesso do cliente - tentei recuperar a senha dele e nao consegui (Castro Barbearia)".
   O painel so tinha "Criar acesso": nao mostrava qual e-mail cada cliente usa, nao tinha editar e nao dava para
   trocar a senha. O app nao consegue trocar a senha de outra conta direto (o Firebase so deixa isso no servidor),
   entao este modulo da tres saidas, todas na aba "Meu Escritorio" > "Acessos dos Clientes":
   1) Enviar o link de nova senha para o e-mail de login do cliente (com o e-mail certo, que agora aparece na tela);
   2) Editar: trocar o cliente ligado ao login, ou desligar/religar o login;
   3) Novo login: cria um login novo (outro e-mail + senha provisoria que VOCE escolhe) para o mesmo cliente e,
      se marcado, desliga o login antigo. Serve quando o e-mail antigo nao existe ou o cliente nao recebe o link.
   Grava so na colecao 'usuarios' (a mesma que o "Criar acesso" ja usa). Login desligado = clienteNome vazio
   (o app nao mostra dados de ninguem) + desligadoEm + clienteAntigo, e pode ser religado pelo Editar. */
;(function(){
  if(window.__APARAT_ACESSOS__) return; window.__APARAT_ACESSOS__=1;

  var lista=[], tCarga=0, abrindo='', ass='', carregando=false;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t||'success'); return; } }catch(e){} }
  function agoraBR(){ return new Date().toLocaleString('pt-BR'); }
  function ehAdmin(){
    try{ var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL; return true; }catch(e){ return false; }
  }
  function mensagem(e){
    var c=(e&&e.code)||'', m={
      'auth/invalid-email':'o e-mail está escrito errado.',
      'auth/user-not-found':'não existe login com esse e-mail.',
      'auth/missing-email':'falta o e-mail.',
      'auth/email-already-in-use':'esse e-mail já tem um login. Use outro e-mail para o login novo.',
      'auth/weak-password':'a senha precisa ter pelo menos 6 caracteres.',
      'auth/too-many-requests':'muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
      'auth/network-request-failed':'sem internet agora.',
      'auth/operation-not-allowed':'o login por e-mail está desligado no Firebase.'
    };
    return m[c] || ((e&&e.message)?e.message:String(e||'erro desconhecido'));
  }
  function emailOk(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s||'').trim()); }
  function nomesClientes(){
    var s=el('acc-cli'), v=[];
    if(s) [].forEach.call(s.options,function(o){ var t=String(o.value||o.textContent||'').trim(); if(t && !/^selecione|^escolha|todos os clientes/i.test(t)) v.push(t); });
    lista.forEach(function(u){ if(u.clienteNome && v.indexOf(u.clienteNome)<0) v.push(u.clienteNome); if(u.clienteAntigo && v.indexOf(u.clienteAntigo)<0) v.push(u.clienteAntigo); });
    return v.sort(function(a,b){ return a.localeCompare(b,'pt-BR'); });
  }

  async function carregar(forcar){
    if(carregando) return; if(!forcar && tCarga && (Date.now()-tCarga)<30000) return;
    var d=db(); if(!d) return; carregando=true;
    try{
      var s=await d.collection('usuarios').get(), v=[];
      s.forEach(function(x){ var o=x.data()||{}; if(o.role==='admin') return;
        if(typeof ADMIN_EMAIL!=='undefined' && o.email===ADMIN_EMAIL) return;
        v.push({uid:x.id, email:o.email||'', clienteNome:o.clienteNome||'', clienteAntigo:o.clienteAntigo||'', desligadoEm:o.desligadoEm||'',
                criadoPor:o.criadoPor||'', substituiu:o.substituiu||'', trocadoEm:o.trocadoEm||''}); });
      v.sort(function(a,b){ return String(a.clienteNome||a.clienteAntigo||'~').localeCompare(String(b.clienteNome||b.clienteAntigo||'~'),'pt-BR'); });
      lista=v; tCarga=Date.now(); ass='';
    }catch(e){}
    carregando=false;
  }

  function css(){
    if(el('ap-acc-css')) return;
    var s=document.createElement('style'); s.id='ap-acc-css';
    s.textContent=
       '#acc-box{margin-top:14px}'
      +'#acc-box .acc-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}'
      +'#acc-box .acc-top input{flex:1;min-width:200px;font:inherit;font-size:13px;padding:9px 12px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:inherit;outline:none}'
      +'#acc-box .acc-l{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:11px 12px;border-radius:14px;margin-bottom:7px;background:var(--card);border:1px solid var(--border)}'
      +'#acc-box .acc-l.off{opacity:.75;border-style:dashed}'
      +'#acc-box .acc-l.aberto{border:1.5px solid var(--azul,#3355ff)}'
      +'#acc-box .acc-i{flex:1;min-width:210px}'
      +'#acc-box .acc-i b{display:block;font-size:13.5px;font-weight:700;word-break:break-word}'
      +'#acc-box .acc-i small{display:block;font-size:12px;color:var(--cinza);word-break:break-all}'
      +'#acc-box .acc-b{font:inherit;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:11px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}'
      +'#acc-box .acc-b.az{background:var(--azul,#3355ff);border-color:var(--azul,#3355ff);color:#fff}'
      +'#acc-box .acc-b.ok{background:#0e9f6e;border-color:#0e9f6e;color:#fff}'
      +'#acc-box .acc-b:disabled{opacity:.55;cursor:wait}'
      +'#acc-box .acc-c{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:999px;margin:3px 4px 0 0}'
      +'#acc-box .acc-c.ok{background:rgba(14,159,110,.16);color:#2fd29b}#acc-box .acc-c.off{background:rgba(255,90,79,.15);color:#ff7b70}'
      +'body.ap-esc-claro #acc-box .acc-c.ok{color:#0e9f6e}body.ap-esc-claro #acc-box .acc-c.off{color:#d92d20}'
      +'#acc-box .acc-ed{flex-basis:100%;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));padding:12px;margin-top:4px;border-radius:12px;background:rgba(51,85,255,.07);border:1px solid rgba(51,85,255,.3)}'
      +'#acc-box .acc-ed h4{margin:0 0 6px;font-size:13px}'
      +'#acc-box .acc-ed p{margin:0 0 8px;font-size:12px;color:var(--cinza);line-height:1.5}'
      +'#acc-box .acc-ed label{display:block;font-size:11px;color:var(--cinza);margin:6px 0 3px}'
      +'#acc-box .acc-ed input,#acc-box .acc-ed select{width:100%;font:inherit;font-size:13px;padding:9px 11px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:inherit}'
      +'#acc-box .acc-ed .ck{display:flex;gap:8px;align-items:flex-start;font-size:12px;margin:8px 0}'
      +'#acc-box .acc-ed .ck input{width:auto;margin-top:2px}'
      +'#acc-box .acc-msg{flex-basis:100%;font-size:12.5px;line-height:1.55;padding:9px 12px;border-radius:10px;margin-top:4px}'
      +'#acc-box .acc-msg.ok{background:rgba(14,159,110,.12);border:1px solid rgba(14,159,110,.4)}'
      +'#acc-box .acc-msg.er{background:rgba(255,90,79,.10);border:1px solid rgba(255,90,79,.45)}'
      +'#acc-box .acc-v{font-size:13px;color:var(--cinza);padding:10px 2px}';
    document.head.appendChild(s);
  }

  var msgs={};
  function caixa(){
    var pg=el('pp-escritorio'); if(!pg) return null;
    var b=el('acc-box'); if(b) return b;
    var ref=el('acc-cli'); var fbox=ref; while(fbox && !(fbox.classList && fbox.classList.contains('fbox'))) fbox=fbox.parentNode;
    b=document.createElement('div'); b.id='acc-box';
    b.innerHTML='<div class="ftitle">\u{1F465} Acessos criados — ver, editar e trocar a senha</div>'
      +'<div class="acc-top"><input id="acc-q" placeholder="Buscar cliente ou e-mail..."><button class="acc-b" id="acc-atu">\u{1F504} Atualizar</button></div>'
      +'<div id="acc-lista"><div class="acc-v">Carregando...</div></div>';
    if(fbox && fbox.parentNode) fbox.parentNode.insertBefore(b, fbox.nextSibling); else pg.appendChild(b);
    el('acc-q').oninput=function(){ ass=''; desenhar(); };
    el('acc-atu').onclick=async function(){ this.disabled=true; await carregar(true); this.disabled=false; desenhar(); };
    return b;
  }

  function desenhar(){
    var box=el('acc-lista'); if(!box) return;
    var q=String((el('acc-q')||{}).value||'').toLowerCase().trim();
    var v=lista.filter(function(u){ return !q || (u.clienteNome+' '+u.clienteAntigo+' '+u.email).toLowerCase().indexOf(q)>-1; });
    var a=q+'|'+abrindo+'|'+JSON.stringify(msgs)+'|'+v.map(function(u){ return u.uid+u.clienteNome+u.email+u.desligadoEm; }).join(',');
    if(a===ass) return; ass=a;
    if(!v.length){ box.innerHTML='<div class="acc-v">'+(lista.length?'Nada encontrado nessa busca.':'Nenhum acesso de cliente criado ainda.')+'</div>'; return; }
    var guarda={}; ['acc-n-email','acc-n-senha','acc-e-cli'].forEach(function(k){ var e=el(k); if(e) guarda[k]=e.value; }); var dz=el('acc-n-desl'); if(dz) guarda.desl=dz.checked;
    var nomes=nomesClientes(), h='';
    v.forEach(function(u){
      var off=!u.clienteNome, nome=u.clienteNome||u.clienteAntigo||'(sem cliente ligado)';
      h+='<div class="acc-l'+(off?' off':'')+(abrindo===u.uid?' aberto':'')+'"><div class="acc-i"><b>'+esc(nome)+'</b>'
        +'<small>Login: <b style="display:inline;font-size:12px">'+esc(u.email||'(sem e-mail gravado)')+'</b></small>'
        +'<div>'+(off?'<span class="acc-c off">Login desligado'+(u.desligadoEm?(' em '+esc(String(u.desligadoEm).slice(0,10))):'')+'</span>':'<span class="acc-c ok">Ativo</span>')
        +(u.substituiu?'<span class="acc-c ok">login novo</span>':'')+'</div></div>'
        +'<button class="acc-b" data-acc-link="'+esc(u.uid)+'"'+(u.email?'':' disabled')+'>\u{1F4E7} Enviar link de nova senha</button>'
        +'<button class="acc-b az" data-acc-ed="'+esc(u.uid)+'">'+(abrindo===u.uid?'\u{2716} Fechar':'\u{270F}\u{FE0F} Editar')+'</button>';
      if(msgs[u.uid]) h+='<div class="acc-msg '+msgs[u.uid].t+'">'+msgs[u.uid].h+'</div>';
      if(abrindo===u.uid){
        h+='<div class="acc-ed">'
          +'<div><h4>\u{1F517} Cliente ligado a este login</h4><p>Troque se o login ficou ligado ao cliente errado.</p>'
          +'<label>Cliente</label><select id="acc-e-cli"><option value="">— desligar este login —</option>'
          +nomes.map(function(n){ return '<option'+(n===(u.clienteNome||'')?' selected':'')+'>'+esc(n)+'</option>'; }).join('')+'</select>'
          +'<div style="margin-top:9px"><button class="acc-b ok" data-acc-salva="'+esc(u.uid)+'">\u{1F4BE} Salvar</button></div></div>'
          +'<div><h4>\u{1F511} Novo login com senha que você escolhe</h4><p>Use quando o cliente não recebe o link ou o e-mail antigo não existe. O app não consegue trocar a senha de um login que já existe; por isso ele cria um login novo para o mesmo cliente.</p>'
          +'<label>E-mail do login novo</label><input id="acc-n-email" type="email" placeholder="ex: castrobarbearia@gmail.com" autocomplete="off">'
          +'<label>Senha provisória (mínimo 6)</label><input id="acc-n-senha" type="text" placeholder="ex: Castro2026" autocomplete="off">'
          +'<div class="ck"><input type="checkbox" id="acc-n-desl" checked><span>Desligar o login antigo ('+esc(u.email||'sem e-mail')+'). Dá para religar depois pelo Editar.</span></div>'
          +'<button class="acc-b az" data-acc-novo="'+esc(u.uid)+'">\u{1F511} Criar login novo</button></div>'
          +'</div>';
      }
      h+='</div>';
    });
    box.innerHTML=h;
    ['acc-n-email','acc-n-senha','acc-e-cli'].forEach(function(k){ var e=el(k); if(e && guarda[k]!=null) e.value=guarda[k]; }); if(el('acc-n-desl') && guarda.desl!=null) el('acc-n-desl').checked=guarda.desl;
    function acha(id){ for(var i=0;i<lista.length;i++) if(lista[i].uid===id) return lista[i]; return null; }
    [].forEach.call(box.querySelectorAll('[data-acc-ed]'),function(b){ b.onclick=function(){ var id=b.getAttribute('data-acc-ed'); abrindo=(abrindo===id)?'':id; ['acc-n-email','acc-n-senha'].forEach(function(k){ var e=el(k); if(e) e.value=''; }); var ec=el('acc-e-cli'); if(ec) ec.remove(); ass=''; desenhar(); }; });
    [].forEach.call(box.querySelectorAll('[data-acc-link]'),function(b){ b.onclick=async function(){
      var u=acha(b.getAttribute('data-acc-link')); if(!u) return; b.disabled=true;
      try{
        await firebase.auth().sendPasswordResetEmail(u.email);
        msgs[u.uid]={t:'ok',h:'\u{2705} Link enviado para <b>'+esc(u.email)+'</b>. O cliente abre o e-mail (olhar também o spam e as promoções), toca no link e escolhe a senha nova. '
          +'Se ele não receber em alguns minutos, o e-mail provavelmente não existe ou está errado: use <b>Editar → Novo login</b>.'};
      }catch(e){ msgs[u.uid]={t:'er',h:'\u{26D4} Não consegui enviar: '+esc(mensagem(e))+' Use <b>Editar → Novo login</b>.'}; }
      ass=''; desenhar();
    }; });
    [].forEach.call(box.querySelectorAll('[data-acc-salva]'),function(b){ b.onclick=async function(){
      var u=acha(b.getAttribute('data-acc-salva')); if(!u) return; var novo=String((el('acc-e-cli')||{}).value||'');
      b.disabled=true;
      try{
        var dados = novo ? {clienteNome:novo, desligadoEm:'', clienteAntigo:'', editadoEm:agoraBR()}
                         : {clienteNome:'', clienteAntigo:u.clienteNome||u.clienteAntigo||'', desligadoEm:agoraBR(), editadoEm:agoraBR()};
        await db().collection('usuarios').doc(u.uid).set(dados,{merge:true});
        Object.assign(u,dados);
        msgs[u.uid]={t:'ok',h: novo ? ('\u{2705} Login ligado a <b>'+esc(novo)+'</b>. Na próxima vez que o cliente entrar, ele vê os dados desse cliente.')
                                    : '\u{2705} Login desligado. Quem entrar com ele não vê dados de nenhum cliente.'};
        abrindo='';
      }catch(e){ msgs[u.uid]={t:'er',h:'\u{26D4} Não consegui salvar: '+esc(mensagem(e))}; }
      ass=''; desenhar();
    }; });
    [].forEach.call(box.querySelectorAll('[data-acc-novo]'),function(b){ b.onclick=async function(){
      var u=acha(b.getAttribute('data-acc-novo')); if(!u) return;
      var email=String((el('acc-n-email')||{}).value||'').trim().toLowerCase(), senha=String((el('acc-n-senha')||{}).value||'');
      var desl=!!(el('acc-n-desl')||{}).checked, cli=u.clienteNome||u.clienteAntigo||'';
      if(!cli){ msgs[u.uid]={t:'er',h:'\u{26D4} Este login não está ligado a nenhum cliente. Ligue o cliente primeiro (Salvar) e depois crie o login novo.'}; ass=''; desenhar(); return; }
      if(!emailOk(email)){ msgs[u.uid]={t:'er',h:'\u{26D4} Digite um e-mail válido para o login novo.'}; ass=''; desenhar(); return; }
      if(senha.length<6){ msgs[u.uid]={t:'er',h:'\u{26D4} A senha precisa ter pelo menos 6 caracteres.'}; ass=''; desenhar(); return; }
      if(email===String(u.email||'').toLowerCase()){ msgs[u.uid]={t:'er',h:'\u{26D4} Esse é o e-mail do login antigo. Para o login novo use outro e-mail.'}; ass=''; desenhar(); return; }
      b.disabled=true; b.textContent='Criando...';
      try{
        var sec; try{ sec=firebase.app('secondary'); }catch(_){ sec=firebase.initializeApp(firebaseConfig,'secondary'); }
        var cred=await sec.auth().createUserWithEmailAndPassword(email,senha), uid=cred.user.uid;
        try{ await sec.auth().signOut(); }catch(_){}
        await db().collection('usuarios').doc(uid).set({role:'cliente', clienteNome:cli, email:email, substituiu:u.uid, criadoPor:'Acessos (novo login)', trocadoEm:agoraBR()});
        if(desl){
          var dd={clienteNome:'', clienteAntigo:cli, desligadoEm:agoraBR(), substituidoPor:uid};
          await db().collection('usuarios').doc(u.uid).set(dd,{merge:true}); Object.assign(u,dd);
        }
        msgs[u.uid]={t:'ok',h:'\u{1F501} Substituído pelo login novo '+esc(email)+(desl?' (este foi desligado).':'.')};
        lista.push({uid:uid, email:email, clienteNome:cli, clienteAntigo:'', desligadoEm:'', substituiu:u.uid});
        var txt='Olá! Aqui é a APARAT Contabilidade. Seu acesso ao app foi renovado.\nE-mail: '+email+'\nSenha provisória: '+senha+'\nLink: https://assessoriacontabilda-lab.github.io/aparat-app/';
        msgs[uid]={t:'ok',h:'\u{2705} Login novo criado para <b>'+esc(cli)+'</b>: '+esc(email)+' · senha <b>'+esc(senha)+'</b>'+(desl?' · o login antigo foi desligado.':'.')
          +'<br><a class="acc-b ok" style="display:inline-block;margin-top:7px;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(txt)+'">\u{1F4F2} Mandar os dados pelo WhatsApp</a>'};
        abrindo=''; aviso('\u{1F511} Login novo criado para '+cli+'.','success');
      }catch(e){ msgs[u.uid]={t:'er',h:'\u{26D4} Não consegui criar: '+esc(mensagem(e))}; }
      ass=''; desenhar();
    }; });
  }

  var voltas=0, ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      var pg=el('pp-escritorio');
      if(pg && pg.classList.contains('active') && ehAdmin()){
        css(); if(caixa()){ await carregar(voltas%12===0); desenhar(); }
      }
    }catch(e){}
    ocupado=false;
  }
  [1500,4000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,2500);
  /* o "Criar acesso" antigo tambem atualiza a lista */
  try{ var velho=window.criarAcessoCliente; if(typeof velho==='function' && !velho.__acc){ var w=async function(){ var r=await velho.apply(this,arguments); tCarga=0; setTimeout(tick,800); return r; }; w.__acc=1; window.criarAcessoCliente=w; } }catch(e){}

  window.__ACESSOS__={carregar:carregar, desenhar:desenhar, estado:function(){ return {lista:lista, abrindo:abrindo, msgs:msgs}; }};
})();
