/* =============================================================
   APARAT — "VER GUIA" NOS CARTOES DA TELA DO CLIENTE
   Modulo: __APARAT_VER_GUIA__   ·   v1   ·   18/09/2026

   POR QUE EXISTE
   Na tela "Minhas Guias" o cliente ve dois blocos:
     1. "Pagou? Avise a APARAT" (cartoes com o botao "Ja paguei"), e
     2. a lista de obrigacoes/honorarios do proprio index.html.
   Nenhum dos dois desenhava link para o arquivo, entao o cliente via a
   guia com valor e vencimento mas nao tinha onde abrir o boleto — tocava
   no cartao e nao acontecia nada. So o bloco do client-pages.js mostrava
   "Ver Guia", e ele nem sempre aparece nessa tela.

   O QUE ESTE MODULO FAZ
   Acrescenta dois botoes em cada cartao que tenha arquivo gravado, nos
   dois blocos: "Ver guia" / "Ver boleto" / "Ver nota" (abre) e "Baixar"
   (salva com o nome real do arquivo, ex. PGDASD-DAS-...pdf). Os dois ja
   vao marcados com data-bx para o baixar-anexo.js nao repetir o botao.

   Casamento: cartoes do bloco "Pagou?" tem data-pgit com o id do
   documento; os da lista simples sao casados por valor + vencimento.
   ============================================================= */
;(function () {
  if (window.__APARAT_VER_GUIA__) return;
  window.__APARAT_VER_GUIA__ = 1;

  var cache = { obrigacoes: [], honorarios: [], em: 0 };
  var urls = {};        /* id -> blob url, criado uma vez so */
  var buscando = false;

  function el(i) { return document.getElementById(i); }
  function db() {
    try {
      if (typeof fdb !== 'undefined' && fdb) return fdb;
      if (window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore();
    } catch (e) {}
    return null;
  }
  function cliente() {
    try { if (typeof CURRENT_CLIENTE !== 'undefined' && CURRENT_CLIENTE) return CURRENT_CLIENTE; } catch (e) {}
    return '';
  }
  function soDig(s) { return String(s == null ? '' : s).replace(/\D+/g, ''); }
  function urlDe(o) {
    if (urls[o.id]) return urls[o.id];
    var dado = o.arquivoData || o.arquivoUrl || '';
    if (!dado) return '';
    var u = dado;
    try { if (typeof blobUrl === 'function') u = blobUrl(dado); } catch (e) {}
    urls[o.id] = u;
    return u;
  }

  async function carregar() {
    var nome = cliente();
    if (!nome || buscando) return;
    if (Date.now() - cache.em < 12000) return;      /* no maximo a cada 12 s */
    var d = db(); if (!d) return;
    buscando = true;
    try {
      var pares = [['obrigacoes'], ['honorarios']];
      for (var i = 0; i < pares.length; i++) {
        var col = pares[i][0];
        var s = await d.collection(col).where('cliente', '==', nome).get();
        var arr = [];
        s.forEach(function (x) { var o = x.data() || {}; o.id = x.id; arr.push(o); });
        cache[col] = arr;
      }
      cache.em = Date.now();
    } catch (e) {}
    buscando = false;
  }

  /* devolve um par de botoes: abrir e baixar (com o nome real do arquivo).
     O link de abrir ja vai marcado com data-bx para o baixar-anexo.js nao
     acrescentar um segundo botao com nome deduzido da tela. */
  function botao(o, rotulo) {
    var u = urlDe(o); if (!u) return null;
    var cx = document.createElement('span');
    cx.setAttribute('data-vg-cx', '1');
    cx.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';

    var estilo = 'display:inline-block;padding:9px 14px;border-radius:11px;background:transparent;'
      + 'border:1.5px solid currentColor;color:#2b6fff;font-weight:800;font-size:13px;text-decoration:none';

    var a = document.createElement('a');
    a.href = u; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'ap-vg';
    a.setAttribute('data-vg-bt', '1');
    a.setAttribute('data-bx', '1');
    a.textContent = '\u{1F4C4} ' + rotulo;
    a.style.cssText = estilo;

    var nome = String(o.arquivoNome || (rotulo.replace(/\s+/g, '-') + '.pdf'));
    if (!/\.[a-z0-9]{2,5}$/i.test(nome)) nome += '.pdf';
    var bx = document.createElement('a');
    bx.href = u;
    bx.setAttribute('download', nome);
    bx.setAttribute('data-vg-bx', '1');
    bx.setAttribute('data-bx', '1');
    bx.textContent = '\u{2B07}\u{FE0F} Baixar';
    bx.style.cssText = estilo + ';background:#2b6fff;border-color:#2b6fff;color:#fff';

    cx.appendChild(a); cx.appendChild(bx);
    return cx;
  }

  function rotuloDe(o, col) {
    if (col === 'honorarios') return 'Ver boleto';
    if (/NF-?e|nota/i.test(String(o.tipo || ''))) return 'Ver nota';
    return 'Ver guia';
  }

  /* ---------- 1. cartoes do bloco "Pagou? Avise a APARAT" (tem o id) ---------- */
  function porId() {
    var cartoes = document.querySelectorAll('[data-pgit]');
    [].forEach.call(cartoes, function (c) {
      if (c.getAttribute('data-vg')) return;
      var id = c.getAttribute('data-pgit');
      var o = null, col = 'obrigacoes';
      for (var i = 0; i < cache.obrigacoes.length; i++) if (String(cache.obrigacoes[i].id) === String(id)) o = cache.obrigacoes[i];
      if (!o) { for (var j = 0; j < cache.honorarios.length; j++) if (String(cache.honorarios[j].id) === String(id)) { o = cache.honorarios[j]; col = 'honorarios'; } }
      if (!o) return;
      c.setAttribute('data-vg', '1');
      var b = botao(o, rotuloDe(o, col));
      if (b) c.appendChild(b);
    });
  }

  /* ---------- 2. lista simples do index.html (casa por valor + vencimento) ---------- */
  function casa(txt, o) {
    var v = soDig(o.valor);
    var d = String(o.vencimento || '').slice(0, 10).split('-');
    if (!v || d.length !== 3) return false;
    var br = d[2] + '/' + d[1] + '/' + d[0];
    if (txt.indexOf(br) < 0) return false;
    var digitos = soDig(txt);
    return digitos.indexOf(v) >= 0;
  }

  function porTexto() {
    ['cli-obr', 'cli-hon-lista'].forEach(function (id) {
      var lista = el(id); if (!lista) return;
      var col = id === 'cli-obr' ? 'obrigacoes' : 'honorarios';
      [].forEach.call(lista.children, function (c) {
        if (c.getAttribute && c.getAttribute('data-vg')) return;
        if (c.querySelector && c.querySelector('[data-vg-bt], a[href^="blob:"], a[href^="data:"]')) return;
        var txt = c.textContent || '';
        var achou = null;
        for (var i = 0; i < cache[col].length; i++) {
          var o = cache[col][i];
          if (!(o.arquivoData || o.arquivoUrl)) continue;
          if (casa(txt, o)) { achou = o; break; }
        }
        if (!achou) return;
        c.setAttribute('data-vg', '1');
        var b = botao(achou, rotuloDe(achou, col));
        if (!b) return;
        b.style.marginTop = '6px';
        [].forEach.call(b.children, function (x) { x.style.padding = '5px 10px'; x.style.fontSize = '11px'; });
        var alvo = c.querySelector('.lcinfo') || c;
        alvo.appendChild(b);
      });
    });
  }

  async function rodar() {
    if (!cliente()) return;
    await carregar();
    try { porId(); } catch (e) {}
    try { porTexto(); } catch (e) {}
  }

  [1500, 3500, 6000].forEach(function (t) { setTimeout(rodar, t); });
  setInterval(rodar, 2500);

  window.__APARAT_VER_GUIA_API__ = {
    rodar: rodar,
    teste: function (obr, hon) { cache.obrigacoes = obr || []; cache.honorarios = hon || []; cache.em = Date.now(); porId(); porTexto(); }
  };
})();
