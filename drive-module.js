/* APARAT v73 - ESPELHO AUTOMATICO NO GOOGLE DRIVE (uso exclusivo do escritorio)
   - Toda guia (DAS / PGDAS-D / outras) com anexo, honorario com boleto, nota fiscal com
     arquivo e documento do tipo guia/boleto que o escritorio envia pelo app vai sozinho
     para o Google Drive, na pasta ME ou MEI conforme o REGIME do cliente:
        ME  -> 1_LpIha_lkzSfeS6Qk-Msmj2h7YtcXE36
        MEI -> 1TJ8H2dkgitv_x9LsJ6jb-FFjgKXK62cQ
     Caminho: PASTA / Nome do Cliente / AAAA / MM-AAAA / TIPO_MM-AAAA_Cliente.pdf
   - Ponte: Google Apps Script (Code.gs) publicado como app da web na conta dona das pastas.
   - So roda logado como ADMIN. Observa as colecoes em tempo real; quem ja foi para o Drive
     recebe driveId/driveUrl/driveCaminho/driveEm no proprio documento (nao repete).
   - Falha no Drive NAO trava nada: fica na fila e tenta de novo a cada 10 minutos.
   - Config: window.__DRIVE__ (teste), localStorage.aparat_drive_url (sobrescreve a URL).   */
;(function(){
  if(window.__APARAT_DRIVE__) return; window.__APARAT_DRIVE__=1;

  /* ===================== CONFIGURACAO ===================== */
  var DRIVE_URL_PADRAO='https://script.google.com/macros/s/AKfycbwLFoJUjRTWvKHqkcPk-v6GDe-auz3MZfRI7rRGGsUvGO8D-R1sQO-7mWfyk_HNYPWJ/exec';
  var DRIVE_TOKEN='788acddc72923a532c5a658ebb7d933b';
  var RETRY_MIN=10;            // minutos entre tentativas de reenvio
  var MAX_TENT=6;              // depois disso so reenvia pelo botao
  var PASTA_PADRAO='ME';       // cliente sem regime cadastrado

  /* colecoes observadas e como cada uma vira arquivo */
  var COLS={
    obrigacoes:{ rotulo:'Guia',          aceita:function(x){ return !!(x.arquivoData||x.arquivoUrl); } },
    honorarios:{ rotulo:'Honorário',     aceita:function(x){ return !!(x.arquivoData||x.arquivoUrl); } },
    notas:     { rotulo:'Nota fiscal',   aceita:function(x){ return !!(x.arquivoData||x.arquivoUrl); } },
    docs:      { rotulo:'Documento',     aceita:function(x){ return !!(x.arquivoData||x.arquivoUrl) && /guia|boleto/i.test(x.tipo||''); } }
  };

  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var MES_ABREV={jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};

  /* ===================== estado ===================== */
  var regime={}, fila=[], emAndamento=false, tent={}, ultTent={}, ativo=false, unsub=[];
  var stats={ok:0,erro:0,pend:0,ultimo:''};

  /* ===================== utilitarios ===================== */
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t||'info'); return; } }catch(e){} try{ console.log('[DRIVE]',m); }catch(e){} }
  function pad(n){ return (n<10?'0':'')+n; }
  function url(){ try{ var u=localStorage.getItem('aparat_drive_url'); if(u && /^https:\/\/script\.google\.com\//.test(u)) return u; }catch(e){} return DRIVE_URL_PADRAO; }
  function configurada(){ return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url()); }
  function ehAdmin(){
    try{ var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return true; }catch(e){ return false; }
  }
  function semAcento(s){ try{ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''); }catch(e){ return String(s||''); } }
  function limpoArq(s,max){ return semAcento(s).replace(/[\\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,max||60)||'x'; }

  /* ===================== regime -> pasta ===================== */
  function pastaDe(cliente){
    var r=regime[String(cliente||'').trim()]; if(r==null) r=regime[semAcento(cliente).toLowerCase()];
    if(!r) return {pasta:PASTA_PADRAO, regime:'', conhecido:false};
    return {pasta:/mei/i.test(r)?'MEI':'ME', regime:r, conhecido:true};
  }
  function guardarRegime(nome,reg){
    if(!nome) return; nome=String(nome).trim();
    regime[nome]=reg||''; regime[semAcento(nome).toLowerCase()]=reg||'';
  }

  /* ===================== competencia ===================== */
  /* aceita "09/2026", "2026-09", "2026-09-15", "15/09/2026", "Setembro/2026", "set/2026" */
  function comp(x){
    var cands=[x.competencia, x.referencia, x.data, x.vencimento, x.mesRef];
    for(var i=0;i<cands.length;i++){
      var c=parseComp(cands[i]); if(c) return c;
    }
    var d=null;
    try{ if(x.criadoEm && x.criadoEm.toDate) d=x.criadoEm.toDate(); }catch(e){}
    if(!d) d=new Date();
    return {ano:String(d.getFullYear()), mes:pad(d.getMonth()+1)+'-'+d.getFullYear()};
  }
  function parseComp(v){
    if(!v) return null; v=String(v).trim(); var m;
    if((m=v.match(/^(\d{4})-(\d{2})(-\d{2})?/))) return mk(m[2],m[1]);
    if((m=v.match(/^(\d{2})\/(\d{4})$/))) return mk(m[1],m[2]);
    if((m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return mk(m[2],m[3]);
    if((m=v.match(/^([A-Za-zçÇ]+)\s*[\/\-\s]\s*(\d{4})$/))){
      var nm=semAcento(m[1]).toLowerCase(), idx=-1;
      MESES.forEach(function(n,i){ if(semAcento(n)===nm) idx=i+1; });
      if(idx<0 && MES_ABREV[nm.slice(0,3)]) idx=MES_ABREV[nm.slice(0,3)];
      if(idx>0) return mk(pad(idx),m[2]);
    }
    return null;
  }
  function mk(mm,aaaa){ var n=Number(mm); if(!(n>=1&&n<=12)) return null; return {ano:String(aaaa), mes:pad(n)+'-'+aaaa}; }

  /* ===================== nome do arquivo ===================== */
  function ext(x){
    var n=x.arquivoNome||x.arquivo||x.nome||'';
    var m=String(n).match(/\.([a-z0-9]{2,5})$/i); if(m) return '.'+m[1].toLowerCase();
    var mime=x.arquivoMime||''; var dm=String(x.arquivoData||'').match(/^data:([^;]+);/); if(dm) mime=dm[1];
    if(/pdf/i.test(mime)) return '.pdf'; if(/xml/i.test(mime)) return '.xml'; if(/png/i.test(mime)) return '.png'; if(/jpe?g/i.test(mime)) return '.jpg';
    return '.pdf';
  }
  function prefixo(col,x){
    if(col==='obrigacoes') return limpoArq(x.tipo||'Guia',30);
    if(col==='honorarios') return 'Honorario';
    if(col==='notas'){ var p=(x.origem==='cliente')?'NF-recebida':'NF'; if(x.numero) p+='-'+limpoArq(x.numero,12); return p; }
    if(col==='docs') return limpoArq(x.tipo||'Documento',30);
    return 'Arquivo';
  }
  function nomeArquivo(col,x,c){
    return prefixo(col,x)+'_'+c.mes+'_'+limpoArq(x.cliente||'cliente',40)+ext(x);
  }
  function descricao(col,x){
    var p=[COLS[col].rotulo, x.tipo, x.numero?('nº '+x.numero):'', x.valor?('R$ '+x.valor):'', x.vencimento?('venc. '+x.vencimento):'', x.descricao||''];
    return p.filter(Boolean).join(' · ').slice(0,900)+' · enviado pelo app APARAT';
  }

  /* ===================== leitura do arquivo ===================== */
  function base64De(x){
    if(x.arquivoData && /^data:/.test(x.arquivoData)) return Promise.resolve({data:x.arquivoData, mime:''});
    if(x.arquivoData) return Promise.resolve({data:x.arquivoData, mime:x.arquivoMime||'application/pdf'});
    if(x.arquivoUrl){
      return fetch(x.arquivoUrl).then(function(r){ if(!r.ok) throw new Error('download '+r.status); return r.blob(); })
        .then(function(b){ return new Promise(function(res,rej){ var fr=new FileReader(); fr.onload=function(){ res({data:String(fr.result), mime:b.type||''}); }; fr.onerror=function(){ rej(new Error('leitura')); }; fr.readAsDataURL(b); }); });
    }
    return Promise.reject(new Error('sem arquivo'));
  }

  /* ===================== envio ===================== */
  function enviar(payload){
    return fetch(url(),{method:'POST', body:JSON.stringify(payload)})   // sem headers => sem preflight CORS
      .then(function(r){ return r.text(); })
      .then(function(t){ var j; try{ j=JSON.parse(t); }catch(e){ throw new Error('resposta inválida do Apps Script'); } if(!j.ok) throw new Error(j.erro||'erro no Drive'); return j; });
  }

  function montar(col,x){
    var c=comp(x), p=pastaDe(x.cliente);
    return { token:DRIVE_TOKEN, pasta:p.pasta, cliente:String(x.cliente||'Sem cliente').trim(), ano:c.ano, mes:c.mes,
             nome:nomeArquivo(col,x,c), descricao:descricao(col,x), regime:p.regime, conhecido:p.conhecido };
  }

  function chave(col,id){ return col+'/'+id; }

  function processar(col,id,x){
    var k=chave(col,id), d=db(); if(!d) return Promise.resolve(false);
    var pl=montar(col,x);
    return base64De(x).then(function(a){
      pl.base64=a.data; pl.mime=a.mime;
      /* confere de novo: outro aparelho pode ter salvo enquanto isso */
      return d.collection(col).doc(String(id)).get().then(function(s){ var y=s.exists?s.data():null; if(!y) throw new Error('documento apagado'); if(y.driveId) return null; return enviar(pl); });
    }).then(function(r){
      if(r===null){ delete pendentesConhecidos[k]; render(); return true; }
      var upd={ driveId:r.id, driveUrl:r.url, driveCaminho:r.caminho, driveNome:r.nome, drivePasta:pl.pasta, driveEm:firebase.firestore.FieldValue.serverTimestamp() };
      return d.collection(col).doc(String(id)).set(upd,{merge:true}).then(function(){
        stats.ok++; stats.ultimo=r.caminho; delete tent[k]; delete ultTent[k]; delete pendentesConhecidos[k];
        aviso('☁️ Salvo no Drive: '+r.caminho,'info'); render(); return true;
      });
    }).catch(function(e){
      tent[k]=(tent[k]||0)+1; ultTent[k]=Date.now(); stats.erro++;
      try{ console.warn('[DRIVE] falhou',k,e&&e.message); }catch(z){}
      if(tent[k]===1) aviso('⚠ Drive: não consegui salvar '+COLS[col].rotulo.toLowerCase()+' de '+(x.cliente||'')+' — vou tentar de novo em '+RETRY_MIN+' min.','warn');
      render(); return false;
    });
  }

  function enfileirar(col,id,x,forcar){
    if(!COLS[col].aceita(x) || x.driveId) return;
    var k=chave(col,id);
    if(fila.some(function(f){ return f.k===k; })) return;
    if(!forcar && tent[k]>=MAX_TENT) return;
    if(!forcar && ultTent[k] && (Date.now()-ultTent[k])<RETRY_MIN*60000) return;
    fila.push({k:k,col:col,id:id,x:x}); stats.pend=fila.length; render();
    rodar();
  }
  function rodar(){
    if(emAndamento || !fila.length) return;
    if(!configurada()){ render(); return; }
    emAndamento=true; var it=fila.shift(); stats.pend=fila.length;
    processar(it.col,it.id,it.x).then(function(){ emAndamento=false; setTimeout(rodar,400); });
  }

  /* ===================== observadores ===================== */
  var pendentesConhecidos={};   // k -> {col,id,x} que ainda nao foram (para reenvio)
  function ligar(){
    var d=db(); if(!d || ativo) return; ativo=true;
    try{
      unsub.push(d.collection('clientes').onSnapshot(function(s){ s.forEach(function(doc){ var c=doc.data()||{}; guardarRegime(c.nome,c.regime); }); revisar(); }));
      unsub.push(d.collection('perfilFiscal').onSnapshot(function(s){ s.forEach(function(doc){ var c=doc.data()||{}; var nome=c.cliente||c.nome||doc.id; if(nome && !regime[String(nome).trim()]) guardarRegime(nome, c.regime==='MEI'?'MEI':(c.regime||'')); }); }, function(){}));
    }catch(e){}
    Object.keys(COLS).forEach(function(col){
      try{
        unsub.push(d.collection(col).onSnapshot(function(s){
          s.docChanges().forEach(function(ch){
            var x=ch.doc.data()||{}, k=chave(col,ch.doc.id);
            if(ch.type==='removed' || x.driveId || !COLS[col].aceita(x)){ delete pendentesConhecidos[k]; return; }
            pendentesConhecidos[k]={col:col,id:ch.doc.id,x:x};
            enfileirar(col,ch.doc.id,x,false);
          });
          render();
        }, function(e){ try{ console.warn('[DRIVE] sem acesso a',col,e&&e.message); }catch(z){} }));
      }catch(e){}
    });
    setInterval(revisar, RETRY_MIN*60000);
  }
  function revisar(forcar){
    Object.keys(pendentesConhecidos).forEach(function(k){ var p=pendentesConhecidos[k]; enfileirar(p.col,p.id,p.x,!!forcar); });
  }
  function desligar(){ unsub.forEach(function(u){ try{ u(); }catch(e){} }); unsub=[]; ativo=false; }

  /* ===================== caixinha de status (pagina Guias) ===================== */
  function render(){
    var pg=el('pp-obrig'); if(!pg) return;
    var box=el('ap-drive-box');
    if(!box){
      box=document.createElement('div'); box.id='ap-drive-box';
      box.style.cssText='margin:8px 0 12px;padding:10px 14px;border-radius:12px;background:linear-gradient(135deg,#0f2a6b,#1b3f9e);color:#fff;font-size:12px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.25)';
      var alvo=pg.querySelector('.fbox')||pg.firstElementChild;
      if(alvo && alvo.parentNode) alvo.parentNode.insertBefore(box,alvo); else pg.insertBefore(box,pg.firstChild);
    }
    var pend=Object.keys(pendentesConhecidos).length;
    var st=!configurada()?'<b style="color:#ffd166">⚠ URL do Apps Script não configurada</b>':(pend?('<b style="color:#ffd166">'+pend+' na fila</b>'):'<b style="color:#8ef5b2">tudo salvo</b>');
    box.innerHTML='<span style="font-size:16px">☁️</span><b>Google Drive automático</b> · '+st+
      ' · <span>'+stats.ok+' salvo(s) nesta sessão</span>'+(stats.ultimo?(' · <span title="'+stats.ultimo+'" style="opacity:.85">último: '+stats.ultimo.split('/').slice(0,2).join('/')+'/…</span>'):'')+
      '<span style="margin-left:auto;display:flex;gap:6px">'+
      '<button id="ap-drive-retry" style="background:#fff;color:#0f2a6b;border:0;border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-size:11px">🔁 Reenviar pendentes</button>'+
      '<button id="ap-drive-cfg" style="background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px">⚙️ URL</button>'+
      '<a href="https://drive.google.com/drive/folders/1_LpIha_lkzSfeS6Qk-Msmj2h7YtcXE36" target="_blank" rel="noopener" style="background:rgba(255,255,255,.18);color:#fff;border-radius:8px;padding:5px 10px;text-decoration:none;font-size:11px">📁 ME</a>'+
      '<a href="https://drive.google.com/drive/folders/1TJ8H2dkgitv_x9LsJ6jb-FFjgKXK62cQ" target="_blank" rel="noopener" style="background:rgba(255,255,255,.18);color:#fff;border-radius:8px;padding:5px 10px;text-decoration:none;font-size:11px">📁 MEI</a></span>';
    var b=el('ap-drive-retry'); if(b) b.onclick=function(){ Object.keys(tent).forEach(function(k){ delete tent[k]; delete ultTent[k]; }); revisar(true); aviso(pend?('🔁 Reenviando '+pend+' arquivo(s) para o Drive…'):'Nada pendente — está tudo no Drive.','info'); };
    var c=el('ap-drive-cfg'); if(c) c.onclick=function(){
      var atual=url(); var nova=prompt('URL do Apps Script (termina em /exec):', atual);
      if(nova===null) return; nova=nova.trim();
      try{ if(nova) localStorage.setItem('aparat_drive_url',nova); else localStorage.removeItem('aparat_drive_url'); }catch(e){}
      testarPonte().then(function(v){ aviso('✅ Ponte com o Drive OK (versão '+v+')','success'); revisar(true); }).catch(function(e){ aviso('⚠ Ponte não respondeu: '+e.message,'warn'); });
      render();
    };
  }
  function testarPonte(){ return enviar({token:DRIVE_TOKEN, acao:'ping'}).then(function(j){ return j.versao||'?'; }); }

  /* ===================== inicio ===================== */
  function tick(){
    if(ehAdmin()){ if(!ativo) ligar(); render(); }
    else if(ativo) desligar();
  }
  function iniciar(){
    try{ firebase.auth().onAuthStateChanged(function(){ setTimeout(tick,800); }); }catch(e){}
    [1500,4000,9000].forEach(function(t){ setTimeout(tick,t); });
    setInterval(tick,15000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();

  /* exposto para testes e para outros modulos */
  window.__DRIVE__={ pastaDe:pastaDe, comp:comp, parseComp:parseComp, nomeArquivo:nomeArquivo, montar:montar, enfileirar:enfileirar,
    guardarRegime:guardarRegime, revisar:revisar, testarPonte:testarPonte, url:url, stats:stats, fila:fila, pendentes:pendentesConhecidos, ligar:ligar, render:render };
})();
