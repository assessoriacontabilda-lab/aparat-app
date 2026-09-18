/* =============================================================
   APARAT — ANEXO DA GUIA / BOLETO NO LANÇAMENTO DA OBRIGAÇÃO
   Módulo: __APARAT_GUIA_ANEXO__   ·   v1   ·   18/09/2026

   POR QUE EXISTE
   O formulário "📋 Lançar Obrigação / Guia" (#pp-obrig) nunca teve campo de
   arquivo: lancarObrigacao() gravava só cliente, tipo, valor, vencimento,
   competência e status. O cliente recebia a notificação e via a guia na tela,
   mas o PDF do boleto não ia junto porque não era gravado em lugar nenhum.

   O QUE ESTE MÓDULO FAZ
   1. Cria o campo "📎 Anexar a guia / boleto" dentro do formulário.
   2. Intercepta dbAdd/dbUpdate durante o lançamento e grava, no documento da
      coleção `obrigacoes`, os campos arquivoData + arquivoNome (e arquivoUrl /
      arquivoPath quando o arquivo vai para o Storage).
      `arquivoData` é EXATAMENTE o campo que o client-pages.js já lê para
      desenhar o botão "📄 Ver Guia" na tela do cliente — nada muda lá.
   3. Mostra o link 📄 da guia na tabela do painel e avisa qual arquivo já está
      anexado quando o Daniel clica em "Editar".

   NÃO MEXE em lancarObrigacao() original nem no client-pages.js.
   ============================================================= */
;(function () {
  if (window.__APARAT_GUIA_ANEXO__) return;
  window.__APARAT_GUIA_ANEXO__ = 1;

  var LIMBD = 700 * 1024;              /* teto do arquivo em base64 dentro do documento */
  var PASTA = 'documentos/guias/';     /* pasta no Storage para arquivos maiores        */
  var storageOk = null;                /* null = ainda não testei                       */
  var ultimoAnexo = null;              /* anexo do registro aberto em edição            */
  /* cada função só pode ser embrulhada UMA vez — outros módulos embrulham por fora
     e não copiam as marcas, então checar a marca na função atual criaria camadas
     novas a cada passagem do setInterval. */
  var okLanc = false, okTab = false, okEdit = false;

  function el(i) { return document.getElementById(i); }
  function aviso(m, t) { try { if (typeof notif === 'function') notif(m, t || 'success'); } catch (e) {} }
  function esc3(s) { try { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); } catch (e) { return String(s == null ? '' : s); } }
  function st() {
    try { if (window.firebase && firebase.apps && firebase.apps.length && firebase.storage) return firebase.storage(); } catch (e) {}
    return null;
  }
  function limpo(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90);
  }

  /* ---------- 1. CAMPO DE ARQUIVO NO FORMULÁRIO ---------- */
  function montarCampo() {
    var bt = el('ob-btn');
    if (!bt || el('gan-file')) return;
    var cx = document.createElement('div');
    cx.id = 'gan-box';
    cx.style.cssText = 'margin:0 0 12px';
    cx.innerHTML =
        '<label style="display:block;font-size:10px;color:var(--cinza,#9090b8);margin-bottom:5px">'
      + '📎 Anexar a guia / boleto — PDF ou imagem (opcional)</label>'
      + '<input id="gan-file" type="file" accept=".pdf,.PDF,.png,.jpg,.jpeg,.webp,.xml"/>'
      + '<div id="gan-atual" style="display:none;font-size:10px;color:var(--azul-light,#6b8afd);margin-top:6px"></div>'
      + '<div id="gan-prog" style="display:none;font-size:10px;color:var(--cinza,#9090b8);margin-top:6px">Enviando o arquivo... <b id="gan-prog-n">0%</b></div>';
    bt.parentNode.insertBefore(cx, bt);
  }

  /* ---------- 2. LEITURA / ENVIO DO ARQUIVO ---------- */
  function base64(file) {
    if (typeof lerArquivoBase64 === 'function') return lerArquivoBase64(file);
    return new Promise(function (ok, err) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = function () { err(new Error('Não consegui ler o arquivo.')); };
      fr.readAsDataURL(file);
    });
  }

  function subir(ref, file) {
    return new Promise(function (ok, err) {
      var pg = el('gan-prog'), pn = el('gan-prog-n'), pronto = false;
      if (pg) pg.style.display = 'block';
      var relogio = setTimeout(function () {
        if (pronto) return; pronto = true;
        err(new Error('O envio não respondeu. Comprima o PDF (ex.: ilovepdf.com) e tente de novo.'));
      }, 60000);
      var task = ref.put(file, { contentType: file.type || 'application/octet-stream' });
      task.on('state_changed',
        function (sn) { if (pn && sn.totalBytes) pn.textContent = Math.round((sn.bytesTransferred / sn.totalBytes) * 100) + '%'; },
        function (e) { if (pronto) return; pronto = true; clearTimeout(relogio); err(e); },
        function () {
          ref.getDownloadURL()
            .then(function (u) { if (pronto) return; pronto = true; clearTimeout(relogio); ok(u); })
            .catch(function (e) { if (pronto) return; pronto = true; clearTimeout(relogio); err(e); });
        });
    });
  }

  /* devolve os campos que serão gravados junto da obrigação */
  async function prepararAnexo(file, cliente) {
    var dados = { arquivoNome: file.name, arquivoTamanho: file.size };
    if (file.size <= LIMBD) {
      dados.arquivoData = await base64(file);     /* cabe no documento — funciona sempre */
      dados.arquivoUrl = '';
      dados.arquivoPath = '';
      return dados;
    }
    var s = st();
    if (!s) throw new Error('Arquivo acima de 700 KB e o Armazenamento não respondeu. Comprima o PDF (ex.: ilovepdf.com) e tente de novo.');
    var caminho = PASTA + limpo(cliente) + '/' + Date.now() + '_' + limpo(file.name);
    var url = await subir(s.ref(caminho), file);
    dados.arquivoUrl = url;
    dados.arquivoPath = caminho;
    dados.arquivoData = url;   /* blobUrl() devolve a própria URL quando não é base64 */
    var pg = el('gan-prog'); if (pg) pg.style.display = 'none';
    return dados;
  }

  /* ---------- 3. ENTRA NO CAMINHO DO LANÇAMENTO ---------- */
  function ligar() {
    if (okLanc || typeof window.lancarObrigacao !== 'function' || window.lancarObrigacao.__ganAnexo) return;
    var orig = window.lancarObrigacao;

    var novo = async function () {
      var fi = el('gan-file');
      var file = (fi && fi.files && fi.files[0]) ? fi.files[0] : null;

      /* sem arquivo, ou com o formulário ainda incompleto: segue o fluxo normal */
      var cli = (el('ob-cli') || {}).value || '';
      var venc = (el('ob-venc') || {}).value || '';
      if (!file || !cli || !venc) return await orig.apply(this, arguments);

      var extra;
      var bt = el('ob-btn'), txtBt = bt ? bt.innerHTML : '';
      try {
        if (bt) { bt.disabled = true; bt.innerHTML = '⏳ Enviando a guia...'; }
        extra = await prepararAnexo(file, cli);
      } catch (e) {
        if (bt) { bt.disabled = false; bt.innerHTML = txtBt; }
        var pg = el('gan-prog'); if (pg) pg.style.display = 'none';
        aviso('⚠ ' + (e && e.message ? e.message : 'Não consegui preparar o anexo.'), 'warn');
        return;   /* não lança a guia sem o boleto que o Daniel escolheu anexar */
      }

      /* injeta o anexo no gravador, só para a coleção obrigacoes */
      var addOrig = window.dbAdd, updOrig = window.dbUpdate, gravou = false;
      window.dbAdd = function (store, data) {
        if (store === 'obrigacoes') { data = Object.assign({}, data, extra); gravou = true; }
        return addOrig.apply(this, [store, data]);
      };
      window.dbUpdate = function (store, id, data) {
        if (store === 'obrigacoes') { data = Object.assign({}, data, extra); gravou = true; }
        return updOrig.apply(this, [store, id, data]);
      };

      var r;
      try { r = await orig.apply(this, arguments); }
      finally {
        window.dbAdd = addOrig;
        window.dbUpdate = updOrig;
        if (bt) { bt.disabled = false; bt.innerHTML = txtBt; }
      }

      if (gravou) {
        if (fi) fi.value = '';
        var at = el('gan-atual'); if (at) at.style.display = 'none';
        aviso('📎 Guia anexada — o cliente já pode abrir o PDF em "📋 Minhas Guias".');
      }
      return r;
    };

    /* conserva as marcas dos outros módulos (ex.: __apSolic do aparat-fix.js) */
    try { for (var k in orig) { if (Object.prototype.hasOwnProperty.call(orig, k)) novo[k] = orig[k]; } } catch (e) {}
    novo.__ganAnexo = 1;
    window.lancarObrigacao = novo;
    okLanc = true;
  }

  /* ---------- 4. LINK DA GUIA NA TABELA DO PAINEL ---------- */
  function linkDe(o) {
    var d = o.arquivoData || o.arquivoUrl || '';
    if (!d) return '';
    var href = d;
    try { if (typeof blobUrl === 'function') href = blobUrl(d); } catch (e) {}
    return ' <a href="' + href + '" target="_blank" title="' + esc3(o.arquivoNome || 'guia') + '" '
         + 'style="color:var(--azul-light,#6b8afd);font-size:10px;text-decoration:none">📄 guia</a>';
  }

  async function marcarTabela() {
    var tb = el('tb-obrig'); if (!tb || !tb.rows || !tb.rows.length) return;
    var os = [];
    try { if (typeof dbGetAll === 'function') os = await dbGetAll('obrigacoes'); } catch (e) { return; }
    if (!os.length) return;
    var mapa = {}; os.forEach(function (o) { mapa[String(o.id)] = o; });
    [].forEach.call(tb.rows, function (tr) {
      if (tr.getAttribute('data-gan')) return;
      var b = tr.querySelector('button[onclick*="editarObrig"]');
      if (!b) return;
      var m = /editarObrig\('([^']+)'\)/.exec(b.getAttribute('onclick') || '');
      if (!m) return;
      var o = mapa[m[1]]; if (!o) return;
      tr.setAttribute('data-gan', '1');
      var lk = linkDe(o);
      if (lk && tr.cells[1]) tr.cells[1].innerHTML += lk;
    });
  }

  function ligarTabela() {
    if (okTab || typeof window.carregarObrigacoes !== 'function' || window.carregarObrigacoes.__ganAnexo) return;
    var orig = window.carregarObrigacoes;
    var novo = async function () {
      var r = await orig.apply(this, arguments);
      try { await marcarTabela(); } catch (e) {}
      return r;
    };
    try { for (var k in orig) { if (Object.prototype.hasOwnProperty.call(orig, k)) novo[k] = orig[k]; } } catch (e) {}
    novo.__ganAnexo = 1;
    window.carregarObrigacoes = novo;
    okTab = true;
  }

  /* ---------- 5. AO EDITAR, MOSTRA O ANEXO QUE JÁ ESTÁ LÁ ---------- */
  function ligarEdicao() {
    if (okEdit || typeof window.editarObrig !== 'function' || window.editarObrig.__ganAnexo) return;
    var orig = window.editarObrig;
    var novo = async function (id) {
      var r = await orig.apply(this, arguments);
      try {
        var os = (typeof dbGetAll === 'function') ? await dbGetAll('obrigacoes') : [];
        var o = os.filter(function (x) { return String(x.id) === String(id); })[0];
        ultimoAnexo = o || null;
        var fi = el('gan-file'); if (fi) fi.value = '';
        var at = el('gan-atual');
        if (at) {
          if (o && (o.arquivoData || o.arquivoUrl)) {
            at.style.display = 'block';
            at.innerHTML = '📎 Já tem anexo: <b>' + esc3(o.arquivoNome || 'arquivo') + '</b>'
              + linkDe(o) + ' — escolha outro arquivo só se quiser trocar.';
          } else {
            at.style.display = 'block';
            at.innerHTML = '📎 Esta guia ainda está <b>sem anexo</b>. Escolha o PDF e clique em Atualizar.';
          }
        }
      } catch (e) {}
      return r;
    };
    try { for (var k in orig) { if (Object.prototype.hasOwnProperty.call(orig, k)) novo[k] = orig[k]; } } catch (e) {}
    novo.__ganAnexo = 1;
    window.editarObrig = novo;
    okEdit = true;
  }

  /* ---------- 6. LIGA TUDO E MANTÉM LIGADO ---------- */
  function rodar() { montarCampo(); ligar(); ligarTabela(); ligarEdicao(); }
  rodar();
  [400, 900, 1800, 3500, 6000].forEach(function (t) { setTimeout(rodar, t); });
  setInterval(rodar, 4000);

  window.__APARAT_GUIA_ANEXO_API__ = { rodar: rodar, prepararAnexo: prepararAnexo, marcarTabela: marcarTabela };
})();
