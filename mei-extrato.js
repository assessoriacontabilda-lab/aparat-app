/* APARAT - EXTRATO NO CONTROLE MEI (mei-extrato.js v1, 07/11/2026)
   PEDIDO DO DANIEL: "o cliente geralmente me manda o extrato pelo WhatsApp e eu mesmo anexo" -
   ter essa opcao dentro da aba Controle MEI, sem precisar ir na aba Extratos.
   O QUE FAZ
   - Na ficha do cliente aberta no Controle MEI (#m2-det) entra o bloco "Extrato bancario" (#mx-box):
     os 12 meses do ano com a situacao do extrato (entregue, sem movimento, pendente, atrasado),
     o botao "Anexar extrato de <mes>" (recebido pelo WhatsApp) e, quando o OFX ja foi lido,
     a conferencia "entradas na conta x faturado pelas notas" do mes.
   - O botao NAO tem upload proprio: abre a MESMA janela da aba Extratos (#ap-ext-modal) ja no cliente
     e no mes certos, com o campo de arquivo aberto. Assim continua tudo conectado: grava no mesmo
     documento extratos/<cliente>__AAAA-MM, a grade da aba Extratos fica verde, a Ficha do Cliente ve,
     o extrato-resumo.js le o OFX e o fat-auto.js confere conta/mes/lancamentos repetidos.
   - Somente leitura no Firestore (extratos where cliente ==). Quem grava e a janela da aba Extratos.
*/
(function(){
  if(window.__APARAT_MEIEXT__) return;
  window.__APARAT_MEIEXT__ = true;
  var VER='1';
  var NM=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var NMC=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var CACHE={}, abrindo=false, assin='';

  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return String(u.email||'').toLowerCase()===String(ADMIN_EMAIL).toLowerCase(); return true; }catch(e){ return false; } }
  function aviso(m,t){ try{ if(typeof notif==='function') notif(m,t||'info'); }catch(e){} }
  function chave(s){ return String(s||'').trim().toLowerCase(); }
  function pad(n){ return (n<10?'0':'')+n; }
  function moeda(v){ v=Number(v)||0; var s=Math.abs(v).toFixed(2).split('.'); return (v<0?'-':'')+'R$ '+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+s[1]; }
  function inicio(){ try{ return localStorage.getItem('apExtratoInicio')||'2026-07'; }catch(e){ return '2026-07'; } }
  function compAnterior(){ var h=new Date(), d=new Date(h.getFullYear(), h.getMonth()-1, 1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }

  /* ---------- leitura ---------- */
  function carregar(nome, forca){
    var k=chave(nome), c=CACHE[k];
    if(c && !forca && (c.lendo || Date.now()-c.em<60000)) return;
    var d=db(); if(!d) return;
    CACHE[k]={em:Date.now(), lendo:true, regs:(c&&c.regs)||{}};
    d.collection('extratos').where('cliente','==',String(nome).trim()).get().then(function(s){
      var r={}; s.forEach(function(x){ var o=x.data()||{}; delete o.arquivoData; if(o.competencia) r[o.competencia]=o; });
      CACHE[k]={em:Date.now(), lendo:false, regs:r}; assin='';
    }).catch(function(e){ CACHE[k].lendo=false; console.warn('[meiext]',e); });
  }

  /* mesma regra da aba Extratos: prazo dia 10 do mes seguinte */
  function situacao(reg, ano, mi){
    var cp=ano+'-'+pad(mi+1), h=new Date();
    if(reg){
      if(reg.semMovimento) return 'sm';
      if(reg.arquivoUrl || reg.arquivoPath || reg.arquivoData || reg.arquivoNome && !reg.realizado) return 'ok';
      return 'rz';
    }
    if(cp < inicio()) return 'na';
    if(new Date(ano, mi+1, 1) > h) return 'na';
    return h > new Date(ano, mi+1, 10, 23, 59, 59) ? 'at' : 'pd';
  }
  var ROT={ok:'Entregue', sm:'Sem movimento', rz:'Realizado (sem arquivo)', pd:'Pendente', at:'Atrasado', na:'—'};

  function faturadoNotas(nome, ano){
    var m={};
    try{ if(window.__FATMEI__ && typeof __FATMEI__.calc==='function'){ var R=__FATMEI__.calc(nome, String(ano)); (R.meses||[]).forEach(function(x){ m[x.ym]=Number(x.usado)||0; }); } }catch(e){}
    return m;
  }
  function receitaDoExtrato(reg, nome){
    var r=reg && reg.resumo; if(!r || !r.v) return null;
    try{ if(window.__EXTRES__ && typeof __EXTRES__.contas==='function') return __EXTRES__.contas(r, nome).receita; }catch(e){}
    return Number(r.entradas)||0;
  }

  /* ---------- bloco dentro da ficha do Controle MEI ---------- */
  function bloco(){
    var det=el('m2-det'); if(!det || det.offsetParent===null) return;
    var t=det.querySelector('.m2-tit2'); if(!t) return;
    var nome=String(t.textContent||'').trim(); if(!nome) return;
    var ano=+((el('m2-ano')||{}).value || new Date().getFullYear());
    carregar(nome);
    var c=CACHE[chave(nome)]||{regs:{}}, regs=c.regs||{};
    var a=nome+'|'+ano+'|'+c.em+'|'+(c.lendo?1:0);
    var box=el('mx-box');
    if(box && box.parentNode===det && box.getAttribute('data-a')===a) return;
    if(!box){ box=document.createElement('div'); box.id='mx-box'; box.className='m2-bloco'; }
    box.setAttribute('data-a', a);

    var fat=faturadoNotas(nome, ano), alvo=compAnterior(), alvoAno=+alvo.slice(0,4), alvoMi=+alvo.slice(5,7)-1;
    var meses='';
    for(var mi=0; mi<12; mi++){
      var cp=ano+'-'+pad(mi+1), reg=regs[cp], s=situacao(reg, ano, mi);
      var rec=receitaDoExtrato(reg, nome);
      var dica=NMC[mi]+'/'+ano+': '+ROT[s]+(reg&&reg.arquivoNome&&s==='ok'?' — '+reg.arquivoNome:'')+(rec!=null?' — entradas '+moeda(rec):'');
      meses+='<button class="mx-mes '+s+'" data-mx-m="'+mi+'" title="'+esc(dica)+'"><b>'+NM[mi]+'</b><small>'+(s==='na'?'—':ROT[s].replace(' (sem arquivo)',''))+'</small>'+(reg&&reg.origem==='escritorio'?'<small>📎 escritório</small>':'')+'</button>';
    }
    /* conferencia do mes alvo */
    var cpAlvo=alvo, regAlvo=(alvoAno===ano)?regs[cpAlvo]:null, conf='';
    if(alvoAno===ano){
      var rec2=receitaDoExtrato(regAlvo, nome), notas=fat[cpAlvo]||0;
      if(rec2!=null){
        var dif=rec2-notas;
        conf='<p>'+NMC[alvoMi]+'/'+alvoAno+': entradas na conta <b>'+moeda(rec2)+'</b> · faturado pelas notas <b>'+moeda(notas)+'</b>'
          +(dif>1?' <span class="m2-chip" style="color:#f5a524;border-color:#f5a524">entrou '+moeda(dif)+' a mais que as notas</span>':' <span class="m2-chip" style="color:#20b87a;border-color:#20b87a">confere</span>')+'</p>'
          +(dif>1?'<p class="m2-mini">Pode ser venda sem nota, PIX de pessoa física ou dinheiro que não é receita (empréstimo, transferência entre contas). Vale perguntar ao cliente.</p>':'');
      } else if(regAlvo && situacao(regAlvo,alvoAno,alvoMi)==='ok'){
        conf='<p class="m2-mini">O extrato de '+NMC[alvoMi]+' está anexado, mas ainda não foi lido. Se for OFX, abra a janela do mês e use "Ler o arquivo OFX" para conferir com as notas.</p>';
      }
    }
    var sAlvo=situacao(regAlvo, alvoAno, alvoMi), jaTem=(sAlvo==='ok'||sAlvo==='sm');
    box.innerHTML='<div class="m2-tit3">🏦 Extrato bancário de '+ano+'</div>'
      +'<p class="m2-mini">Cliente mandou o extrato pelo WhatsApp? Anexe aqui mesmo. Vai para o mesmo lugar da aba Extratos (grade, Ficha do Cliente e leitura do OFX).</p>'
      +'<div class="mx-bts"><button class="m2-btn mx-anexa" id="mx-anexa">'+(jaTem?'✏️ Ver ou trocar o extrato de ':'📎 Anexar extrato de ')+NMC[alvoMi]+'/'+alvoAno+'</button>'
      +'<button class="m2-btn" id="mx-atu" title="Ler de novo">🔄</button></div>'
      +(c.lendo&&!Object.keys(regs).length?'<p class="m2-mini">Carregando os extratos...</p>':'')
      +'<div class="mx-meses">'+meses+'</div>'
      +'<p class="m2-mini">Clique em qualquer mês para anexar, trocar, ver ou marcar sem movimento.</p>'
      +conf;
    var grid=det.querySelector('.m2-grid');
    if(box.parentNode!==det){ if(grid && grid.nextSibling) det.insertBefore(box, grid.nextSibling); else det.appendChild(box); }
    el('mx-anexa').onclick=function(){ abrirJanela(nome, alvoAno, alvoMi); };
    el('mx-atu').onclick=function(){ carregar(nome, true); aviso('Atualizando os extratos...','info'); };
    [].forEach.call(box.querySelectorAll('[data-mx-m]'),function(b){ b.onclick=function(){ abrirJanela(nome, ano, +b.getAttribute('data-mx-m')); }; });
  }

  /* ---------- ponte para a janela da aba Extratos ---------- */
  function capa(on){
    var c=el('mx-capa');
    if(on && !c){ c=document.createElement('div'); c.id='mx-capa'; c.innerHTML='<div>🏦 Abrindo o extrato...</div>'; document.body.appendChild(c); }
    if(!on && c) c.remove();
  }
  function botaoGrade(nome, mi){
    var bs=document.querySelectorAll('#ex-tab [data-ex-c]');
    for(var i=0;i<bs.length;i++){ if(chave(bs[i].getAttribute('data-ex-c'))===chave(nome) && +bs[i].getAttribute('data-ex-m')===mi) return bs[i]; }
    return null;
  }
  function abrirJanela(nome, ano, mi){
    if(abrindo) return;
    var nav=el('ap-nav-ext');
    if(!nav){ aviso('A aba Extratos ainda não carregou. Tente de novo em instantes.','warn'); return; }
    if(new Date(ano, mi, 1) > new Date()){ aviso('Esse mês ainda não começou.','warn'); return; }
    abrindo=true; capa(true);
    nav.click();                                   /* carrega a grade com os nomes e os extratos */
    var sel=el('ex-ano');
    if(sel && String(sel.value)!==String(ano)){
      var tem=[].some.call(sel.options,function(o){ return o.value===String(ano); });
      if(!tem){ var o=document.createElement('option'); o.value=String(ano); o.textContent=String(ano); sel.appendChild(o); }
      sel.value=String(ano); if(typeof sel.onchange==='function') sel.onchange.call(sel);
    }
    var t0=Date.now();
    (function espera(){
      var b=botaoGrade(nome, mi), s=el('ex-ano'), anoOk=!s || String(s.value)===String(ano);
      var head=document.querySelector('#ex-tab thead th');
      if(b && anoOk && head){
        try{ if(window.__MEI2__ && __MEI2__.abrir) __MEI2__.abrir(nome); }catch(e){}   /* volta para o Controle MEI */
        b.click();                                                                        /* abre a janela do mes */
        setTimeout(function(){
          var m=el('ap-ext-modal');
          if(m){
            var tr=m.querySelector('[data-ex-troca]'); if(tr) tr.click();                 /* abre o campo do arquivo */
            var h3=m.querySelector('h3'); if(h3 && !m.querySelector('.mx-nota')){ var p=document.createElement('div'); p.className='mx-nota'; p.textContent='Aberto pelo Controle MEI · extrato recebido pelo WhatsApp'; h3.parentNode.insertBefore(p, h3.nextSibling); }
            vigiarFechar(nome);
          } else aviso('Não consegui abrir a janela do extrato. Abra pela aba Extratos.','warn');
          capa(false); abrindo=false;
        }, 120);
        return;
      }
      if(Date.now()-t0>9000){
        capa(false); abrindo=false;
        try{ if(window.__MEI2__ && __MEI2__.abrir) __MEI2__.abrir(nome); }catch(e){}
        aviso(b?'Não consegui trocar o ano na aba Extratos.':'Cliente não encontrado na grade da aba Extratos. Confira se ele está ativo na aba Clientes.','warn');
        return;
      }
      setTimeout(espera, 150);
    })();
  }
  function vigiarFechar(nome){
    var iv=setInterval(function(){
      if(el('ap-ext-modal')) return;
      clearInterval(iv);
      setTimeout(function(){ carregar(nome, true); }, 1500);   /* depois de salvar */
      setTimeout(function(){ carregar(nome, true); }, 6000);   /* depois do resumo do OFX */
    }, 500);
  }

  function css(){
    if(el('mx-css')) return;
    var s=document.createElement('style'); s.id='mx-css';
    s.textContent='#mx-box{margin-top:12px}'
      +'#mx-box .mx-bts{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}'
      +'#mx-box .mx-anexa{background:#00c2a8!important;border-color:#00c2a8!important;color:#fff!important;font-weight:800}'
      +'#mx-box .mx-meses{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;margin:6px 0}'
      +'#mx-box .mx-mes{border:1px solid rgba(128,128,160,.4);border-radius:8px;padding:6px 4px;text-align:center;background:transparent;color:inherit;font:inherit;cursor:pointer;width:auto!important}'
      +'#mx-box .mx-mes b{display:block;font-size:13px}#mx-box .mx-mes small{display:block;font-size:10.5px;opacity:.85}'
      +'#mx-box .mx-mes.ok,#mx-box .mx-mes.sm{background:rgba(32,184,122,.16);border-color:#20b87a}'
      +'#mx-box .mx-mes.rz{background:rgba(32,184,122,.08);border-color:#20b87a;border-style:dashed}'
      +'#mx-box .mx-mes.pd{background:rgba(245,165,36,.14);border-color:#f5a524}'
      +'#mx-box .mx-mes.at{background:rgba(229,72,77,.16);border-color:#e5484d}'
      +'#mx-box .mx-mes.na{opacity:.4}'
      +'#mx-capa{position:fixed;inset:0;z-index:99998;background:rgba(6,12,26,.55);display:flex;align-items:center;justify-content:center}'
      +'#mx-capa div{background:#10213f;color:#fff;padding:14px 20px;border-radius:12px;font-weight:700}'
      +'#ap-ext-modal .mx-nota{font-size:11.5px;color:#00c2a8;margin:-6px 0 8px;font-weight:700}';
    document.head.appendChild(s);
  }
  function tick(){ try{ if(!ehAdmin()) return; css(); bloco(); }catch(e){ console.warn('[meiext]',e); } }
  setInterval(tick, 1000); setTimeout(tick, 900);
  window.__MEIEXT__={versao:VER, situacao:situacao, abrir:abrirJanela, carregar:carregar, estado:function(){ return CACHE; }, tick:tick};
})();
