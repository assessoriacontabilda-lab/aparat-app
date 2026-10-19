/* APARAT - FICHA DO CLIENTE: bloco "Notas fiscais" reorganizado (nfe-ficha-v2.js, v1, 19/10/2026)
   Pedido do Daniel: "o que seria essa nota de entrada? parece que esta meio bagunçado".
   O bloco #nfe-ficha (desenhado pelo nf-entrada.js) misturava tres coisas: compras do cliente,
   NFS-e da APARAT de outro mes e nem mostrava as notas que o cliente emitiu. Aqui fica assim:
     1) "Notas que o cliente emitiu"   -> saidas (solicitacoes 'Emitir nota fiscal' com PDF + notas sem direcao)
     2) "Compras de fornecedores"      -> entradas (mesma linha do nf-entrada, so renomeada; sem nota = nao vira tarefa)
     3) "Nota da APARAT (honorarios)"  -> a linha #nfe-f-hon vai para a secao Financeiro
   NAO GRAVA NADA no Firebase. Os botoes continuam os do nf-entrada.js (os nos sao movidos, nao recriados).
   Regra do app: a area do cliente nunca e testada por .active; este modulo so mexe no painel (#pp-fichas). */
(function(){
  if(window.__APARAT_NFE_FICHA2__) return; window.__APARAT_NFE_FICHA2__ = 1;
  var VER = '1';
  var sol = null, notasSai = null, carregadoEm = 0, carregando = false;

  function el(id){ return document.getElementById(id); }
  function norm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function mesmo(a,b){ a = norm(a); b = norm(b); if(!a||!b) return false; if(a===b) return true;
    var ra = a.replace(/^[\d.\/-]+\s*/,''), rb = b.replace(/^[\d.\/-]+\s*/,''); return ra===rb; }
  /* regra de valor do app (ver onde-moram-as-notas-fiscais.md): "1.060" = 1060, "1290.00" = 1290, "1.234,56" = 1234.56 */
  function num(v){
    if(typeof v==='number') return isFinite(v)?v:0;
    var s = String(v==null?'':v).replace(/[^\d.,-]/g,''); if(!s) return 0;
    if(s.indexOf(',')>-1){ s = s.replace(/\./g,'').replace(',','.'); }
    else { var i = s.lastIndexOf('.'); if(i>-1 && s.length-i-1===3) s = s.replace(/\./g,''); }
    var n = parseFloat(s); return isFinite(n)?n:0;
  }
  function moeda(v){ try{ return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }catch(e){ return 'R$ '+(Number(v||0)).toFixed(2); } }
  var MESES = {janeiro:'01',fevereiro:'02',marco:'03',abril:'04',maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',outubro:'10',novembro:'11',dezembro:'12'};
  /* qualquer data/referencia -> 'MM/AAAA' */
  function compDe(s){
    if(!s) return '';
    if(s && typeof s==='object' && s.seconds){ var d = new Date(s.seconds*1000); return ('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear(); }
    s = String(s).trim(); var m;
    if((m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return m[2]+'/'+m[3];
    if((m = s.match(/^(\d{4})-(\d{2})/))) return m[2]+'/'+m[1];
    if((m = s.match(/^(\d{2})\/(\d{4})$/))) return m[1]+'/'+m[2];
    if((m = s.match(/^([A-Za-zÀ-ÿ]+)\s*\/\s*(\d{4})$/))){ var k = norm(m[1]); if(MESES[k]) return MESES[k]+'/'+m[2]; }
    return '';
  }
  function ehPedidoNF(s){ return /nota\s*fiscal|nfs-?e|nf-?e/i.test(String(s.servico||'')); }

  async function carregar(force){
    if(carregando) return; if(!force && Date.now()-carregadoEm<60000) return;
    if(typeof window.dbGetAll!=='function') return;
    carregando = true;
    try{
      var a = await window.dbGetAll('solicitacoes'); sol = (a||[]).filter(ehPedidoNF);
      var b = await window.dbGetAll('notas'); notasSai = (b||[]).filter(function(n){ return !n.direcao; });
      carregadoEm = Date.now();
    }catch(e){ console.warn('[nfe-ficha-v2] nao carregou', e); }
    carregando = false;
  }
  function saidas(cli, comp){
    var emit = [], pend = [], tot = 0;
    (sol||[]).forEach(function(s){
      if(!mesmo(s.cliente, cli)) return;
      var temPdf = !!(s.respostaArquivoData||s.respostaArquivoNome);
      var c = compDe(temPdf ? (s.respondidoEm||s.concluidoEm||s.data||s.criadoEm) : (s.data||s.criadoEm));
      if(c!==comp) return;
      if(temPdf){ emit.push(s); tot += num(s.valor); } else if(!/cancel|recus/i.test(String(s.status||''))) pend.push(s);
    });
    (notasSai||[]).forEach(function(n){
      if(!mesmo(n.cliente, cli) || n.cancelada) return;
      var c = compDe(n.competencia||n.data||n.criadoEm); if(c!==comp) return;
      if(/fechad|emitid/i.test(String(n.status||'')) || n.arquivoData || n.pdfData){ emit.push(n); tot += num(n.valor); }
      else pend.push(n);
    });
    return {emit:emit, pend:pend, tot:tot};
  }

  function css(){
    if(el('nfe2-css')) return;
    var s = document.createElement('style'); s.id = 'nfe2-css';
    s.textContent = '#nfe-ficha .nfe2-dica{font-size:11px;opacity:.65;margin:-4px 0 8px 2px;line-height:1.4}'
      + '#nfe-ficha .fc-lin.nfe2-vazio{opacity:.75}'
      + '.fc-lin.nfe2-hon .fc-t b:before{content:"\\1F9FE  "}';
    document.head.appendChild(s);
  }

  function aplicar(box){
    var card = box.closest ? box.closest('.fc-card') : box.parentNode; if(!card) return;
    var sec = box.querySelector('.fc-sec'); var m = sec ? (sec.textContent||'').match(/(\d{2}\/\d{4})/) : null;
    var comp = m ? m[1] : ''; var st = null; try{ st = window.__FICHA__ && __FICHA__.estado ? __FICHA__.estado() : null; }catch(e){}
    var cli = st && st.sel ? st.sel : ''; if(!comp || !cli) return;
    css();

    /* 1) linha das NOTAS QUE O CLIENTE EMITIU (nova) */
    var r = saidas(cli, comp), n = r.emit.length;
    var lin = document.createElement('div'); lin.className = 'fc-lin nfe2-sai' + (r.pend.length ? ' fc-fazer' : (n ? '' : ' nfe2-vazio'));
    var txt = n ? (n+' nota'+(n===1?'':'s')+' · '+moeda(r.tot)+' · receita do mês p/ PGDAS') : 'nenhuma nota registrada no app neste mês';
    if(r.pend.length) txt += ' · '+r.pend.length+' pedido'+(r.pend.length===1?'':'s')+' do cliente aguardando emissão';
    lin.innerHTML = '<div class="fc-t"><b>\u{1F4E4} Notas que o cliente emitiu (vendas / serviços)</b><small></small></div>'
      + '<button class="fc-bt" type="button">\u{1F4E4} Ver notas</button>';
    lin.querySelector('small').textContent = txt;
    lin.querySelector('button').onclick = function(){ try{ if(window.apNotasAba) window.apNotasAba('saidas', cli); }catch(e){} };
    var dica = document.createElement('div'); dica.className = 'nfe2-dica';
    dica.textContent = 'Saídas = notas que o cliente emite · Compras = notas que ele recebe dos fornecedores · a nota da APARAT (honorários) fica no Financeiro, logo abaixo.';
    if(sec){ sec.insertAdjacentElement('afterend', dica); dica.insertAdjacentElement('afterend', lin); } else { box.insertBefore(lin, box.firstChild); }

    /* 2) linha das COMPRAS (a do nf-entrada, renomeada) */
    var bv = el('nfe-f-ver'); var linC = bv ? bv.closest('.fc-lin') : null;
    if(linC){
      var b = linC.querySelector('.fc-t b'), sm = linC.querySelector('.fc-t small');
      if(b) b.textContent = '\u{1F4E5} Compras de fornecedores (NF-e / NFS-e de entrada)';
      if(sm && /^0 notas/.test(sm.textContent||'')){
        sm.textContent = 'nenhuma compra lançada neste mês · lance pela aba Notas Fiscais → Entradas';
        linC.classList.remove('fc-fazer'); linC.classList.add('nfe2-vazio');
        var bo = el('nfe-f-ok'); if(bo) bo.style.display = 'none';
      }
    }
    /* 2b) servicos recebidos (parceiros do salao) */
    var bs = el('nfe-f-srv'); var linS = bs ? bs.closest('.fc-lin') : null;
    if(linS){ var b2 = linS.querySelector('.fc-t b'); if(b2 && !/parceiros/i.test(b2.textContent)) b2.textContent = '\u{1F91D} Serviços recebidos de parceiros (NFS-e) — '+b2.textContent.replace(/^Serviços recebidos \(NFS-e\)\s*/i,''); }

    /* 3) NOTA DA APARAT -> secao Financeiro */
    var honNovo = box.querySelector('#nfe-f-hon');
    if(honNovo){ [].slice.call(card.querySelectorAll('.fc-lin.nfe2-hon')).forEach(function(x){ if(x!==honNovo) x.parentNode.removeChild(x); }); }
    var hon = honNovo || card.querySelector('.fc-lin.nfe2-hon');
    if(hon){
      var bh = hon.querySelector('.fc-t b');
      if(bh && !/Nota da APARAT/.test(bh.textContent)) bh.textContent = 'Nota da APARAT (NFS-e dos honorários '+(bh.textContent.match(/(\d{2}\/\d{4})/)||['',''])[1]+')';
      var sh = hon.querySelector('.fc-t small');
      if(sh && /ainda não anexada/i.test(sh.textContent) && !/só vê/.test(sh.textContent)) sh.textContent = sh.textContent.replace(/ainda não anexada/i, 'ainda não anexada · o cliente só vê depois que anexar');
      hon.classList.add('nfe2-hon');
      var fin = [].slice.call(card.querySelectorAll('.fc-sec')).filter(function(s){ return /Financeiro/i.test(s.textContent||''); })[0];
      if(fin) fin.insertAdjacentElement('afterend', hon);
    }
  }

  function tick(){
    try{
      var box = el('nfe-ficha'); if(!box || !box.offsetParent) return; /* so quando a ficha esta visivel (display, nao .active) */
      carregar(false);
      var ass = (box.getAttribute('data-a')||'') + '|' + (sol?sol.length:-1) + '|' + (notasSai?notasSai.length:-1) + '|' + VER;
      if(box.getAttribute('data-v2')===ass && box.querySelector('.nfe2-sai')) return;
      /* limpa o que eu mesmo coloquei antes (se o nf-entrada nao redesenhou) */
      [].slice.call(box.querySelectorAll('.nfe2-sai,.nfe2-dica')).forEach(function(x){ x.parentNode.removeChild(x); });
      box.setAttribute('data-v2', ass);
      aplicar(box);
    }catch(e){ console.warn('[nfe-ficha-v2]', e); }
  }
  [1500,3000,6000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick, 1500);
  /* reage na hora em que o nf-entrada redesenha o bloco (sem esperar o proximo tick) */
  var deb = null;
  try{
    new MutationObserver(function(){ if(deb) return; deb = setTimeout(function(){ deb = null; tick(); }, 60); })
      .observe(document.body, {childList:true, subtree:true});
  }catch(e){}
  window.__APARAT_NFE_FICHA2_API__ = {saidas:saidas, compDe:compDe, num:num, carregar:function(){ return carregar(true); }, tick:tick};
})();
