/* APARAT client-pages.js v1
   Paginas do app do cliente com DADOS REAIS (substitui a demonstracao fixa):
   - Honorarios: status real (Pendente/Pago), boleto para ver/baixar, avisar pagamento
   - Guias (Obrigacoes): botao "Guia Paga" que atualiza para o escritorio,
     anexos do escritorio (ver/baixar) e comprovante do cliente (anexar/ver/excluir) */
;(function () {
  if (window.__APARAT_CLIENT_PAGES__) return;
  var API = { hon: [], obr: [], env: [] };
  window.__APARAT_CLIENT_PAGES__ = API;

  function esc2(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt2(d) { try { return (typeof fmtData === "function") ? fmtData(d) : (d || ""); } catch (e) { return d || ""; } }
  function bUrl(d) { try { return (typeof blobUrl === "function") ? blobUrl(d) : d; } catch (e) { return d; } }
  function notif2(m, t) { try { (typeof notif === "function") ? notif(m, t || "success") : alert(m); } catch (e) {} }
  function agora() { return new Date().toLocaleString("pt-BR"); }
  function nomeCli() { try { return (typeof CURRENT_CLIENTE !== "undefined" && CURRENT_CLIENTE) ? CURRENT_CLIENTE : ""; } catch (e) { return ""; } }
  function ehCliente() {
    try {
      if (typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE) return CURRENT_ROLE === "cliente";
      var u = firebase.auth().currentUser;
      return !!(u && (typeof ADMIN_EMAIL === "undefined" || u.email !== ADMIN_EMAIL));
    } catch (e) { return false; }
  }
  function db() { return (typeof fdb !== "undefined" && fdb) ? fdb : firebase.firestore(); }

  var BTN = "background:#2b6fff;color:#fff;border:0;border-radius:9px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer";
  var BTN2 = "background:#1a1a35;color:#dfe6ff;border:1px solid #33335f;border-radius:9px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer";
  var BTN3 = "background:rgba(239,68,68,.16);color:#ff9db0;border:1px solid rgba(239,68,68,.35);border-radius:9px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer";
  var CARD = "background:var(--card,#12122a);border:1px solid var(--border,#222248);border-radius:13px;padding:13px;margin-bottom:10px";

  function tagHtml(st) {
    var pago = /pago|recebido|quitado/i.test(st || "");
    var cls = pago ? "tp" : (/a pagar|pendente/i.test(st || "") ? "ta" : "tn");
    var txt = pago ? "Pago ✔" : (st || "Pendente");
    return '<span class="tag ' + cls + '">' + esc2(txt) + "</span>";
  }
  function ordenar(a, b) {
    var pa = /pago/i.test(a.x.status || ""), pb = /pago/i.test(b.x.status || "");
    if (pa !== pb) return pa ? 1 : -1;
    return String(b.x.vencimento || "").localeCompare(String(a.x.vencimento || ""));
  }

  /* ---------- HONORARIOS ---------- */
  function renderHon() {
    var pag = document.getElementById("ap-honorarios"); if (!pag) return;
    var box = document.getElementById("ap-hon-real");
    if (!box) {
      [].forEach.call(pag.children, function (c) { c.style.display = "none"; });
      box = document.createElement("div"); box.id = "ap-hon-real";
      pag.appendChild(box);
    }
    var lista = API.hon.slice().sort(ordenar);
    var h = '<div class="asec">💳 Meus Honorários</div>';
    if (!lista.length) h += '<div style="color:var(--cinza,#9090b8);font-size:12px;padding:6px 0">Nenhum honorário lançado ainda.</div>';
    lista.forEach(function (it) {
      var x = it.x, pago = /pago/i.test(x.status || "");
      h += '<div style="' + CARD + '">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">'
        + '<strong style="color:#fff;font-size:13px">💳 Honorário ' + esc2(x.referencia || "") + "</strong>" + tagHtml(x.status)
        + "</div>"
        + '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:2px">R$ ' + esc2(x.valor || "") + "</div>"
        + '<div style="font-size:11px;color:var(--cinza,#9090b8);margin-bottom:8px">📅 Vencimento: ' + esc2(fmt2(x.vencimento)) + "</div>"
        + '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      if (x.arquivoData) {
        h += '<a href="' + bUrl(x.arquivoData) + '" target="_blank" style="' + BTN2 + ';text-decoration:none">📄 Ver Boleto</a>';
      }
      if (!pago) {
        h += '<button style="' + BTN + '" onclick="__APARAT_CLIENT_PAGES__.avisarHon(\'' + it.id + '\')">✅ Já Paguei — Avisar Escritório</button>';
      }
      h += "</div>";
      if (!pago) h += '<div style="font-size:10px;color:var(--cinza,#9090b8);margin-top:6px">O status muda para "Pago ✔" assim que o escritório confirmar o recebimento.</div>';
      h += "</div>";
    });
    box.innerHTML = h;
  }

  API.avisarHon = function (id) {
    var it = API.hon.filter(function (a) { return a.id === id; })[0];
    var ref = it ? (it.x.referencia || "") : "";
    db().collection("solicitacoes").add({
      cliente: nomeCli(), mensagem: "💳 PAGAMENTO INFORMADO: paguei o honorário " + ref + ". Favor confirmar o recebimento.",
      status: "Nova", data: agora(), arquivoData: "", arquivoNome: "", origem: "app-honorario"
    }).then(function () { notif2("✅ Escritório avisado! Aguarde a confirmação."); })
      .catch(function () { notif2("Não consegui avisar. Tente pela aba Falar com o Escritório.", "warn"); });
  };

  /* ---------- GUIAS (OBRIGACOES) ---------- */
  function compDaGuia(obrigId) {
    return API.env.filter(function (e) { return e.x.obrigId === obrigId; });
  }
  function renderObr() {
    var pag = document.getElementById("ap-obrig"); if (!pag) return;
    var box = document.getElementById("ap-obrig-real");
    if (!box) {
      [].forEach.call(pag.children, function (c) {
        if (c.id === "ap-obrig-anuais" || c.id === "ap-obrig-real") return;
        c.style.display = "none";
      });
      box = document.createElement("div"); box.id = "ap-obrig-real";
      pag.insertBefore(box, pag.firstChild);
    }
    var lista = API.obr.slice().sort(ordenar);
    var h = '<div class="asec">📋 Minhas Guias</div>';
    if (!lista.length) h += '<div style="color:var(--cinza,#9090b8);font-size:12px;padding:6px 0">Nenhuma guia lançada no momento.</div>';
    lista.forEach(function (it) {
      var x = it.x, pago = /pago/i.test(x.status || "");
      h += '<div style="' + CARD + '">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">'
        + '<strong style="color:#fff;font-size:13px">💰 ' + esc2(x.tipo || "Guia") + "</strong>" + tagHtml(x.status)
        + "</div>"
        + '<div style="font-size:11px;color:var(--cinza,#9090b8);margin-bottom:8px">'
        + (x.competencia ? "Competência: " + esc2(x.competencia) + " · " : "")
        + "R$ " + esc2(x.valor || "") + " · vence " + esc2(fmt2(x.vencimento)) + "</div>"
        + '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      if (x.arquivoData) {
        h += '<a href="' + bUrl(x.arquivoData) + '" target="_blank" style="' + BTN2 + ';text-decoration:none">📄 Ver Guia</a>';
      }
      if (!pago) {
        h += '<button style="' + BTN + '" onclick="__APARAT_CLIENT_PAGES__.pagarGuia(\'' + it.id + '\')">✅ Guia Paga — Confirmar</button>';
      }
      h += '<button style="' + BTN2 + '" onclick="__APARAT_CLIENT_PAGES__.anexarComp(\'' + it.id + '\')">📎 Anexar Comprovante</button>';
      h += "</div>";
      var comps = compDaGuia(it.id);
      comps.forEach(function (e) {
        h += '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 10px;border-radius:9px;background:rgba(0,0,0,.28)">'
          + '<span style="flex:1;font-size:11px;color:#dfe6ff;word-break:break-all">📎 ' + esc2(e.x.nome || "comprovante") + "</span>"
          + '<a href="' + bUrl(e.x.arquivoData) + '" target="_blank" style="' + BTN2 + ';text-decoration:none;padding:5px 9px">👁 Ver</a>'
          + '<button style="' + BTN3 + ';padding:5px 9px" onclick="__APARAT_CLIENT_PAGES__.excluirComp(\'' + e.id + '\')">🗑 Excluir</button>'
          + "</div>";
      });
      h += "</div>";
    });
    box.innerHTML = h;
  }

  API.pagarGuia = function (id) {
    var it = API.obr.filter(function (a) { return a.id === id; })[0];
    var tipo = it ? (it.x.tipo || "Guia") : "Guia";
    db().collection("obrigacoes").doc(String(id)).set({
      status: "Pago", pagoPeloCliente: true, pagoEm: agora()
    }, { merge: true }).then(function () {
      notif2("✅ Guia marcada como PAGA! O escritório já foi atualizado.");
    }).catch(function () {
      db().collection("solicitacoes").add({
        cliente: nomeCli(), mensagem: "💰 GUIA PAGA: informo o pagamento da guia " + tipo + ". Favor atualizar o status.",
        status: "Nova", data: agora(), arquivoData: "", arquivoNome: "", origem: "app-guia"
      }).then(function () { notif2("✅ Escritório avisado do pagamento!"); })
        .catch(function () { notif2("Não consegui atualizar. Avise pela aba Falar com o Escritório.", "warn"); });
    });
  };

  API.anexarComp = function (id) {
    var it = API.obr.filter(function (a) { return a.id === id; })[0];
    var tipo = it ? (it.x.tipo || "Guia") : "Guia";
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".pdf,.png,.jpg,.jpeg,.webp";
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      if (f.size > 900000) { notif2("Arquivo muito grande (máximo 900 KB).", "warn"); return; }
      var fr = new FileReader();
      fr.onload = function () {
        db().collection("enviosCliente").add({
          cliente: nomeCli(), nome: f.name, tipo: "Comprovante — " + tipo,
          arquivoData: String(fr.result), data: agora(), obrigId: String(id)
        }).then(function () { notif2("📤 Comprovante enviado ao escritório!"); })
          .catch(function () { notif2("Erro ao enviar o comprovante.", "warn"); });
      };
      fr.onerror = function () { notif2("Não consegui ler o arquivo.", "warn"); };
      fr.readAsDataURL(f);
    };
    inp.click();
  };

  API.excluirComp = function (envId) {
    db().collection("enviosCliente").doc(String(envId)).delete()
      .then(function () { notif2("🗑 Comprovante excluído.", "info"); })
      .catch(function () { notif2("Erro ao excluir.", "warn"); });
  };

  /* ---------- LIGACAO COM O BANCO (tempo real) ---------- */
  function boot() {
    try {
      if (API.__started) return;
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      if (!firebase.auth().currentUser) return;
      if (!ehCliente()) return;
      var nome = nomeCli(); if (!nome) return;
      API.__started = 1;
      var d = db();
      d.collection("honorarios").where("cliente", "==", nome).onSnapshot(function (s) {
        var a = []; s.forEach(function (doc) { a.push({ id: doc.id, x: doc.data() }); });
        API.hon = a; renderHon();
      }, function () {});
      d.collection("obrigacoes").where("cliente", "==", nome).onSnapshot(function (s) {
        var a = []; s.forEach(function (doc) { a.push({ id: doc.id, x: doc.data() }); });
        API.obr = a; renderObr();
      }, function () {});
      d.collection("enviosCliente").where("cliente", "==", nome).onSnapshot(function (s) {
        var a = []; s.forEach(function (doc) { a.push({ id: doc.id, x: doc.data() }); });
        API.env = a; renderObr();
      }, function () {});
    } catch (e) {}
  }
  API.testRender = function (h, o, e) { API.hon = h || []; API.obr = o || []; API.env = e || []; renderHon(); renderObr(); };
  [1200, 3000, 6000, 10000].forEach(function (t) { setTimeout(boot, t); });
  setInterval(boot, 5000);
})();

/* ===== Aba "Financas" vira FATURAMENTO real (mesmo painel da tela inicial) ===== */
;(function () {
  if (window.__APARAT_FAT_TAB__) return; window.__APARAT_FAT_TAB__ = 1;
  function ehCliente() { try { return typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE === "cliente"; } catch (e) { return false; } }
  function prepPage() {
    var pag = document.getElementById("ap-financeiro"); if (!pag) return null;
    var hold = document.getElementById("ap-fat-holder");
    if (!hold) {
      [].forEach.call(pag.children, function (c) { c.style.display = "none"; });
      hold = document.createElement("div"); hold.id = "ap-fat-holder";
      hold.innerHTML = '<div class="asec">📈 Meu Faturamento</div>';
      pag.appendChild(hold);
    }
    return hold;
  }
  function mover(alvo) {
    var fat = document.getElementById("cli-fat"); if (!fat) return;
    if (alvo === "page") { var h = prepPage(); if (h && fat.parentElement !== h) h.appendChild(fat); }
    else { var sf = document.getElementById("sec-fat"); if (sf && fat.parentElement !== sf) sf.appendChild(fat); }
  }
  function wrapFat() {
    if (typeof window.aPage !== "function" || window.aPage.__apFatWrapped) return;
    var orig = window.aPage;
    var w = function (key) {
      var r = orig.apply(this, arguments);
      try { if (ehCliente()) { if (key === "financeiro") mover("page"); else mover("home"); } } catch (e) {}
      return r;
    };
    w.__apFatWrapped = 1; window.aPage = w;
  }
  function renomear() {
    try {
      if (!ehCliente()) return;
      var b = document.getElementById("nb-financeiro"); if (!b) return;
      var l = b.querySelector(".nbl"); if (l && l.textContent !== "Faturam.") l.textContent = "Faturam.";
      var i = b.querySelector(".nbi"); if (i && i.textContent !== "📈") i.textContent = "📈";
    } catch (e) {}
  }
  function tick() { wrapFat(); renomear(); }
  [1000, 2500, 5000].forEach(function (t) { setTimeout(tick, t); });
  setInterval(tick, 4000);
})();
