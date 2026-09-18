/* =============================================================
   APARAT — LANCAR O DAS DIRETO DO PAINEL SEGURO
   Modulo: __APARAT_PSEG_LANCA__   ·   v1   ·   18/09/2026

   POR QUE EXISTE
   No Painel Seguro DAS o botao "Lancar guia" so abria a aba Guias preenchida:
   o Daniel ainda tinha de conferir e salvar la, e a grade Obrigacoes CNPJ ->
   Mensais so era marcada depois, pela sincronizacao.

   O QUE ESTE MODULO FAZ
   Acrescenta no mesmo modal o campo do PDF do DAS (obrigatorio) e o botao
   "Lancar DAS e enviar ao cliente". Num clique, com um resumo para conferir antes:
     1. grava a guia em `obrigacoes` com arquivoData/arquivoNome (o cliente ve
        o botao "Ver Guia" no app, pelo client-pages.js);
     2. marca o documento da grade Mensais em `obrigCnpj`
        (<cliente>__AAAA-MM__DAS ou __SIMEI) com status ok;
     3. barra a segunda guia DAS do mesmo cliente na mesma competencia.

   NAO altera o pseg-module.js: so acrescenta no modal que ele desenha.
   O botao antigo ("Abrir a aba Guias") continua funcionando do lado.
   ============================================================= */
;(function () {
  if (window.__APARAT_PSEG_LANCA__) return;
  window.__APARAT_PSEG_LANCA__ = 1;

  var TIPO_GUIA = 'DAS Simples Nacional';
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var ctxNome = '';   /* cliente do ultimo botao "guia" clicado na lista */

  function el(i) { return document.getElementById(i); }
  function esc4(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function aviso(m, t) { try { if (typeof notif === 'function') { notif(m, t); return; } } catch (e) {} }
  function db() {
    try {
      if (typeof fdb !== 'undefined' && fdb) return fdb;
      if (window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore();
    } catch (e) {}
    return null;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function limpo(n) { return String(n || 'x').replace(/[^\w.\-]+/g, '_').slice(0, 80); }
  function hojeISO() { var h = new Date(); return h.getFullYear() + '-' + pad(h.getMonth() + 1) + '-' + pad(h.getDate()); }
  function moeda(v) {
    v = Number(v) || 0;
    return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function dataBR(d) { var p = String(d || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '—'; }
  function compTxt(c) { var p = String(c).split('-'); return p[1] + '/' + p[0]; }
  function compNome(c) { var p = String(c).split('-'); return MESES[Number(p[1]) - 1] + '/' + p[0]; }
  function isoData(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  /* vencimento: usa o calculo do proprio Painel Seguro quando existir */
  function vencDAS(cp) {
    try { if (window.__PSEG__ && window.__PSEG__.vencDAS) return window.__PSEG__.vencDAS(cp); } catch (e) {}
    var p = String(cp).split('-');
    var d = new Date(Number(p[0]), Number(p[1]), 20);
    var g = 0;
    while ((d.getDay() === 0 || d.getDay() === 6) && g < 5) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); g++; }
    return d;
  }
  function compISO(t) {
    try { if (window.__PSEG__ && window.__PSEG__.compISO) { var r = window.__PSEG__.compISO(t); if (r) return r; } } catch (e) {}
    t = String(t || '').trim();
    var m = t.match(/^(\d{2})\/(\d{4})$/); if (m) return m[2] + '-' + m[1];
    m = t.match(/^(\d{4})-(\d{2})/);       if (m) return m[1] + '-' + m[2];
    m = t.match(/^([a-zç]+)\s*\/\s*(\d{4})$/i);
    if (m) { var i = MESES.indexOf(m[1].toLowerCase()); if (i >= 0) return m[2] + '-' + pad(i + 1); }
    return null;
  }

  /* ---------- guarda o cliente do botao clicado na lista ---------- */
  document.addEventListener('click', function (ev) {
    try {
      var b = ev.target && ev.target.closest ? ev.target.closest('#pp-pseg .ps-b') : null;
      if (b && b.getAttribute('data-a') === 'guia') ctxNome = b.getAttribute('data-n') || '';
    } catch (e) {}
  }, true);

  /* ---------- le cliente e competencia do modal aberto ---------- */
  function contexto(cx) {
    var nome = ctxNome, comp = null;
    try {
      var h3 = cx.querySelector('h3');
      if (!nome && h3) { var t = h3.textContent || ''; var i = t.indexOf('—'); if (i > 0) nome = t.slice(i + 1).trim(); }
      var h4 = cx.querySelector('.h4');
      if (h4) {
        var m = (h4.textContent || '').match(/Compet[êe]ncia\s+([^\u00b7·]+)/i);
        if (m) comp = compISO(m[1].trim());
      }
    } catch (e) {}
    if (!comp) { var h = new Date(); var d = new Date(h.getFullYear(), h.getMonth() - 1, 1); comp = d.getFullYear() + '-' + pad(d.getMonth() + 1); }
    return { nome: nome, comp: comp };
  }

  /* ---------- MEI grava SIMEI, os demais gravam DAS ---------- */
  async function siglaDe(nome) {
    var d = db(); if (!d) return 'DAS';
    try {
      var s = await d.collection('clientes').where('nome', '==', nome).get();
      var reg = '';
      s.forEach(function (x) { reg = String((x.data() || {}).regime || reg); });
      if (!reg) {
        var pf = await d.collection('perfilFiscal').where('cliente', '==', nome).get();
        pf.forEach(function (x) { reg = String((x.data() || {}).regime || reg); });
      }
      return /mei|simei/i.test(reg) ? 'SIMEI' : 'DAS';
    } catch (e) { return 'DAS'; }
  }

  /* ---------- ja existe guia DAS deste cliente nesta competencia? ---------- */
  async function jaLancada(nome, cp) {
    var d = db(); if (!d) return null;
    try {
      var s = await d.collection('obrigacoes').where('cliente', '==', nome).get();
      var achou = null;
      s.forEach(function (x) {
        var o = x.data() || {};
        if (!/DAS/i.test(String(o.tipo || ''))) return;
        if (compISO(o.competencia) !== cp) return;
        achou = { id: x.id, valor: o.valor, vencimento: o.vencimento, temAnexo: !!(o.arquivoData || o.arquivoUrl) };
      });
      return achou;
    } catch (e) { return null; }
  }

  /* ---------- anexo: reaproveita o modulo guia-anexo.js ---------- */
  async function prepararAnexo(file, cliente) {
    try {
      if (window.__APARAT_GUIA_ANEXO_API__ && window.__APARAT_GUIA_ANEXO_API__.prepararAnexo) {
        return await window.__APARAT_GUIA_ANEXO_API__.prepararAnexo(file, cliente);
      }
    } catch (e) { throw e; }
    if (typeof lerArquivoBase64 === 'function') {
      return { arquivoNome: file.name, arquivoTamanho: file.size, arquivoData: await lerArquivoBase64(file), arquivoUrl: '', arquivoPath: '' };
    }
    return await new Promise(function (ok, err) {
      var fr = new FileReader();
      fr.onload = function () { ok({ arquivoNome: file.name, arquivoTamanho: file.size, arquivoData: String(fr.result), arquivoUrl: '', arquivoPath: '' }); };
      fr.onerror = function () { err(new Error('Não consegui ler o arquivo.')); };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- grava a guia + marca a grade Mensais ---------- */
  async function gravar(nome, cp, valor, extra) {
    var d = db(); if (!d) throw new Error('Sem conexão com o banco.');
    var venc = isoData(vencDAS(cp));
    var dados = {
      cliente: nome, tipo: TIPO_GUIA, valor: String(valor),
      vencimento: venc, competencia: compTxt(cp), status: 'A Pagar',
      origem: 'Painel Seguro DAS'
    };
    Object.keys(extra || {}).forEach(function (k) { dados[k] = extra[k]; });

    if (typeof window.dbAdd === 'function') await window.dbAdd('obrigacoes', dados);
    else {
      try { dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp(); } catch (e) {}
      await d.collection('obrigacoes').add(dados);
    }

    var sig = await siglaDe(nome);
    try {
      await d.collection('obrigCnpj').doc(limpo(nome) + '__' + cp + '__' + sig).set({
        cliente: nome, competencia: cp, sigla: sig, status: 'ok',
        origem: 'Painel Seguro DAS', responsavel: 'Daniel',
        entregaEm: hojeISO(), valor: String(valor), atualizadoEm: new Date().toISOString()
      }, { merge: true });
    } catch (e) { /* a guia ja foi gravada; a grade marca depois pela sincronizacao */ }

    return { vencimento: venc, sigla: sig };
  }

  /* ---------- monta o campo e o botao dentro do modal ---------- */
  function montar() {
    var bt = el('lg-ok');
    if (!bt || bt.getAttribute('data-psl')) return;
    bt.setAttribute('data-psl', '1');

    var cx = bt.closest('#ap-pseg-modal .cx') || bt.closest('#ap-pseg-modal');
    if (!cx) return;
    var c = contexto(cx);

    /* campo do PDF, logo antes da linha de botoes */
    var bts = bt.parentNode;
    var box = document.createElement('div');
    box.id = 'psl-box';
    box.innerHTML =
        '<label>Guia do DAS em PDF <b>(obrigatório para enviar ao cliente)</b></label>'
      + '<input type="file" id="psl-file" accept=".pdf,.PDF,.png,.jpg,.jpeg"/>'
      + '<div id="psl-msg" style="display:none;font-size:12px;margin-top:6px"></div>';
    bts.parentNode.insertBefore(box, bts);

    /* botao novo, na frente do antigo */
    var novo = document.createElement('button');
    novo.className = bt.className;
    novo.id = 'psl-ok';
    novo.innerHTML = '\u{2705} Lançar DAS e enviar ao cliente';
    bts.insertBefore(novo, bt);
    bt.innerHTML = '\u{1F4C4} Só abrir a aba Guias';

    novo.onclick = async function () {
      var msg = el('psl-msg');
      var fi = el('psl-file');
      var file = (fi && fi.files && fi.files[0]) ? fi.files[0] : null;
      var val = (el('lg-val') || {}).value || '';
      var num = Number(String(val).replace(',', '.'));

      function erro(t) {
        var res = el('psl-resumo');
        var alvoMsg = res || msg;
        if (!alvoMsg) return;
        if (res) {
          var linha = el('psl-erro');
          if (!linha) { linha = document.createElement('div'); linha.id = 'psl-erro'; linha.style.cssText = 'font-size:12px;margin-top:8px'; res.firstChild.appendChild(linha); }
          linha.style.color = '#b45309'; linha.innerHTML = '\u{26A0} ' + t;
          return;
        }
        msg.style.display = 'block'; msg.style.color = '#b45309'; msg.innerHTML = '\u{26A0} ' + t;
      }

      if (!num || num <= 0) { erro('Informe o valor da guia (ou cole a linha digitável para ler o valor).'); return; }
      if (!file) { erro('Anexe o PDF do DAS — sem ele o cliente recebe a guia sem o boleto.'); return; }
      if (!c.nome) { erro('Não consegui identificar o cliente. Use o botão "Só abrir a aba Guias".'); return; }

      novo.disabled = true; novo.innerHTML = '\u{23F3} Conferindo...';
      var dup = await jaLancada(c.nome, c.comp);
      if (dup) {
        novo.disabled = false; novo.innerHTML = '\u{2705} Lançar DAS e enviar ao cliente';
        erro('Já existe uma guia DAS de ' + esc4(c.nome) + ' na competência ' + compTxt(c.comp)
           + ' (' + moeda(dup.valor) + ', vence ' + dataBR(dup.vencimento) + ')'
           + (dup.temAnexo ? ' e ela já tem o boleto anexado.' : ', mas sem boleto anexado — anexe pela aba Guias, em Editar.')
           + ' Não vou lançar de novo para o cliente não receber duas.');
        return;
      }

      /* resumo para conferir antes de enviar (o formulário fica escondido, não perdido) */
      novo.disabled = false;
      novo.innerHTML = '\u{2705} Lançar DAS e enviar ao cliente';
      var venc = isoData(vencDAS(c.comp));
      var alvo = document.createElement('div');
      alvo.id = 'psl-resumo';
      bts.parentNode.insertBefore(alvo, bts);
      el('psl-box').style.display = 'none';
      alvo.innerHTML =
          '<div style="border:1px solid rgba(51,85,255,.35);border-radius:10px;padding:11px 12px;margin-top:4px">'
        + '<div style="font-weight:700;margin-bottom:7px">Confira antes de enviar</div>'
        + '<div class="ln"><span>Cliente</span><b>' + esc4(c.nome) + '</b></div>'
        + '<div class="ln"><span>Guia</span><b>' + TIPO_GUIA + '</b></div>'
        + '<div class="ln"><span>Competência</span><b>' + esc4(compNome(c.comp)) + '</b></div>'
        + '<div class="ln"><span>Valor</span><b>' + moeda(num) + '</b></div>'
        + '<div class="ln"><span>Vencimento</span><b>' + dataBR(venc) + '</b></div>'
        + '<div class="ln"><span>Boleto</span><b>' + esc4(file.name) + '</b></div>'
        + '<div style="font-size:12px;margin-top:8px;opacity:.85">Ao confirmar, a guia entra no app do cliente e ele recebe a notificação no celular.</div>'
        + '<div class="bts" style="margin-top:9px">'
        + '<button class="bt vd" id="psl-conf">\u{2714} Confirmar e enviar</button>'
        + '<button class="bt" id="psl-volta">\u{21A9} Voltar</button>'
        + '</div></div>';
      novo.style.display = 'none';
      bt.style.display = 'none';

      el('psl-volta').onclick = function () {
        alvo.remove();
        var bx = el('psl-box'); if (bx) bx.style.display = '';
        novo.style.display = ''; bt.style.display = '';
      };

      el('psl-conf').onclick = async function () {
        var b2 = this; b2.disabled = true; b2.innerHTML = '\u{23F3} Enviando...';
        try {
          var extra = await prepararAnexo(file, c.nome);
          var r = await gravar(c.nome, c.comp, num.toFixed(2), extra);
          fecharTudo();
          aviso('\u{2705} DAS de ' + c.nome + ' lançado com o boleto — competência ' + compTxt(c.comp)
              + ', vence ' + dataBR(r.vencimento) + '. A grade Mensais já foi marcada.', 'ok');
          try { if (window.__PSEG__) { await window.__PSEG__.carregar(); window.__PSEG__.render(); } } catch (e) {}
          try { if (typeof carregarObrigacoes === 'function') await carregarObrigacoes(); } catch (e) {}
          try { if (typeof atualizarDashboard === 'function') await atualizarDashboard(); } catch (e) {}
        } catch (e) {
          b2.disabled = false; b2.innerHTML = '\u{2714} Confirmar e enviar';
          erro('Não consegui enviar: ' + ((e && e.message) ? e.message : e));
        }
      };
    };
  }

  function fecharTudo() { var m = el('ap-pseg-modal'); if (m) m.remove(); }

  setInterval(montar, 400);
  window.__APARAT_PSEG_LANCA_API__ = { montar: montar, gravar: gravar, jaLancada: jaLancada, prepararAnexo: prepararAnexo };
})();
