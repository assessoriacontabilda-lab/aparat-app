/* =============================================================
   APARAT — BOTAO "BAIXAR" EM TODO ANEXO DO APP
   Modulo: __APARAT_BAIXAR__   ·   v1   ·   18/09/2026

   POR QUE EXISTE
   Todos os anexos do app (guia, boleto de honorario, nota, documento,
   resposta de solicitacao) eram mostrados so como link "abrir" apontando
   para um endereco blob: com target="_blank". No app instalado (PWA) do
   celular, esse tipo de link muitas vezes nao abre nada e nunca oferece
   salvar o arquivo — o cliente via a guia, mas nao conseguia baixar.

   O QUE ESTE MODULO FAZ
   Acrescenta, ao lado de cada link de anexo, um botao "Baixar" que:
     1. transforma o conteudo em Blob e dispara um <a download> de verdade,
        com nome legivel (ex.: DAS-Simples-Nacional-08-2026.pdf);
     2. quando o arquivo esta no Storage (endereco https), tenta baixar e,
        se o servidor nao permitir, abre numa aba nova como antes.
   Vale para a tela do cliente e para o painel do escritorio, e volta
   sozinho toda vez que a lista e redesenhada.

   NAO altera nenhum outro arquivo: so acrescenta o botao no que ja existe.
   ============================================================= */
;(function () {
  if (window.__APARAT_BAIXAR__) return;
  window.__APARAT_BAIXAR__ = 1;

  var EXT = {
    'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg',
    'image/webp': '.webp', 'text/xml': '.xml', 'application/xml': '.xml',
    'application/zip': '.zip',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls'
  };

  function aviso(m, t) { try { if (typeof notif === 'function') notif(m, t || 'info'); } catch (e) {} }

  /* nome de arquivo a partir do texto do cartao onde o anexo esta */
  function nomeDe(a) {
    var txt = '';
    try {
      var cx = a.closest('.lcard, .docca, .ex-card, div[style*="border-radius"], li, tr') || a.parentElement;
      var s = cx ? (cx.querySelector('strong, b, h4') || null) : null;
      txt = s ? (s.textContent || '') : (cx ? (cx.textContent || '') : '');
      var comp = (cx ? (cx.textContent || '') : '').match(/(\d{2})\/(\d{4})/);
      if (comp) txt += ' ' + comp[1] + '-' + comp[2];
    } catch (e) {}
    txt = String(txt || 'anexo')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s.-]+/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return txt || 'anexo';
  }

  function baixarBlob(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try { document.body.removeChild(a); } catch (e) {}
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 4000);
  }

  async function baixar(href, base) {
    if (!href || href === '#') { aviso('Este item está sem arquivo anexado.', 'warn'); return; }
    try {
      var r = await fetch(href);
      var b = await r.blob();
      var ext = EXT[b.type] || (/\.(pdf|png|jpe?g|webp|xml|zip|xlsx?)$/i.test(base) ? '' : '.pdf');
      var nome = /\.[a-z0-9]{2,5}$/i.test(base) ? base : (base + ext);
      baixarBlob(b, nome);
      aviso('\u{2B07}\u{FE0F} Baixando ' + nome, 'ok');
    } catch (e) {
      /* arquivo no Storage com bloqueio de origem: abre como antes */
      try { window.open(href, '_blank', 'noopener'); }
      catch (e2) { aviso('Não consegui baixar o arquivo. Tente pelo navegador.', 'warn'); }
    }
  }

  /* ---------- coloca o botao ao lado de cada anexo ---------- */
  function marcar() {
    var links = document.querySelectorAll('a[href^="blob:"], a[href^="data:"], a[href*="firebasestorage"]');
    [].forEach.call(links, function (a) {
      if (a.getAttribute('data-bx')) return;
      if (a.getAttribute('download')) return;          /* ja e um download */
      a.setAttribute('data-bx', '1');

      var bt = document.createElement('button');
      bt.className = 'ap-bx-bt';
      bt.type = 'button';
      bt.innerHTML = '\u{2B07}\u{FE0F} Baixar';
      bt.setAttribute('data-bx-bt', '1');

      /* acompanha o visual do link vizinho */
      var st = a.getAttribute('style') || '';
      if (/background/.test(st)) bt.setAttribute('style', st + ';margin-left:6px');
      else bt.setAttribute('style', 'margin-left:6px;background:transparent;border:1px solid currentColor;'
        + 'border-radius:8px;padding:2px 7px;font-size:inherit;font-weight:600;color:inherit;cursor:pointer');

      bt.onclick = function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        baixar(a.getAttribute('href'), nomeDe(a));
      };

      if (a.parentNode) a.parentNode.insertBefore(bt, a.nextSibling);
    });
  }

  marcar();
  [600, 1500, 3000].forEach(function (t) { setTimeout(marcar, t); });
  setInterval(marcar, 900);

  window.__APARAT_BAIXAR_API__ = { marcar: marcar, baixar: baixar, nomeDe: nomeDe };
})();
