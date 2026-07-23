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

/* ===== FATURAMENTO em um lugar so: aba completa; some da tela inicial ===== */
;(function () {
  if (window.__APARAT_FAT_TAB__) return; window.__APARAT_FAT_TAB__ = 1;
  function ehCliente() { try { return typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE === "cliente"; } catch (e) { return false; } }
  function prepPage() {
    var pag = document.getElementById("ap-financeiro"); if (!pag) return null;
    var hold = document.getElementById("ap-fat-holder");
    if (!hold) {
      [].forEach.call(pag.children, function (c) { c.style.display = "none"; });
      hold = document.createElement("div"); hold.id = "ap-fat-holder";
      hold.innerHTML = '<div class="asec">\ud83d\udcc8 Meu Faturamento</div>';
      pag.appendChild(hold);
    }
    return hold;
  }
  function unificar() {
    if (!ehCliente()) return;
    var fat = document.getElementById("cli-fat");
    if (fat) { var h = prepPage(); if (h && fat.parentElement !== h) h.appendChild(fat); }
    var sf = document.getElementById("sec-fat");
    if (sf && sf.style.display !== "none") sf.style.display = "none";
    var btns = document.querySelectorAll('.botnav button[data-go="sec-fat"]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.getAttribute("data-apfat") === "1") continue;
      b.setAttribute("data-apfat", "1");
      b.onclick = function (ev) { try { ev.preventDefault(); } catch (e) {} try { window.aPage("financeiro"); } catch (e) {} };
    }
  }
  function renomear() {
    try {
      if (!ehCliente()) return;
      var b = document.getElementById("nb-financeiro"); if (!b) return;
      var l = b.querySelector(".nbl"); if (l && l.textContent !== "Faturam.") l.textContent = "Faturam.";
      var i = b.querySelector(".nbi"); if (i && i.textContent !== "\ud83d\udcc8") i.textContent = "\ud83d\udcc8";
    } catch (e) {}
  }
  function tick() { unificar(); renomear(); }
  [1000, 2500, 5000].forEach(function (t) { setTimeout(tick, t); });
  setInterval(tick, 3000);
})();

/* ===== Grafico 3D digital NEON (faturamento x despesas x resultado) ===== */
;(function () {
  if (window.__APARAT_FAT_CHART__) return; window.__APARAT_FAT_CHART__ = 1;
  function num(v) {
    v = String(v == null ? "" : v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
    var n = parseFloat(v); return isNaN(n) ? 0 : n;
  }
  function kf(n) {
    var neg = n < 0; n = Math.abs(n);
    var s;
    if (n >= 1000000) s = (n / 1000000).toFixed(1).replace(".", ",") + "M";
    else if (n >= 1000) s = (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",") + "k";
    else s = String(Math.round(n));
    return (neg ? "-" : "") + s;
  }
  var MES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  function rot(m) { var p = String(m || "").split("-"); return (MES[parseInt(p[1], 10) - 1] || ""); }
  function barra3d(x, y0, h, w, d, grad, filtro, corTopo, corLado) {
    var y = y0 - h;
    return '<polygon points="' + x + "," + y + " " + (x + d) + "," + (y - d) + " " + (x + w + d) + "," + (y - d) + " " + (x + w) + "," + y + '" fill="' + corTopo + '"/>'
      + '<polygon points="' + (x + w) + "," + y + " " + (x + w + d) + "," + (y - d) + " " + (x + w + d) + "," + (y0 - d) + " " + (x + w) + "," + y0 + '" fill="' + corLado + '"/>'
      + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.5" fill="url(#' + grad + ')" filter="url(#' + filtro + ')"/>';
  }
  function montar(regs) {
    var W = 336, H = 178, y0 = 132, d = 5, w = 11;
    var maxv = 1;
    regs.forEach(function (r) {
      var f = num(r.faturamento), dp = num(r.despesa);
      maxv = Math.max(maxv, f, dp, f - dp);
    });
    var gw = W / regs.length;
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;display:block">'
      + "<defs>"
      + '<linearGradient id="gfat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb2ff"/><stop offset="1" stop-color="#2145c9"/></linearGradient>'
      + '<linearGradient id="gdesp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c"/><stop offset="1" stop-color="#c9541e"/></linearGradient>'
      + '<linearGradient id="gres" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dffb0"/><stop offset="1" stop-color="#0e9c4f"/></linearGradient>'
      + '<filter id="nfat" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#4d82ff" flood-opacity="0.9"/></filter>'
      + '<filter id="ndesp" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#ff9b45" flood-opacity="0.85"/></filter>'
      + '<filter id="nres" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="2.6" flood-color="#39ff88" flood-opacity="0.95"/></filter>'
      + "</defs>";
    for (var g = 1; g <= 3; g++) {
      var gy = y0 - (g * 34);
      s += '<line x1="4" y1="' + gy + '" x2="' + (W - 4) + '" y2="' + gy + '" stroke="#28285a" stroke-width="0.7" stroke-dasharray="3 4"/>';
    }
    s += '<line x1="4" y1="' + y0 + '" x2="' + (W - 4) + '" y2="' + y0 + '" stroke="#3a3a7a" stroke-width="1"/>';
    regs.forEach(function (r, i) {
      var f = num(r.faturamento), dp = num(r.despesa), res = f - dp;
      var hf = Math.max(3, Math.round(f / maxv * 92));
      var hd = Math.max(3, Math.round(dp / maxv * 92));
      var hr = Math.max(3, Math.round(Math.max(0, res) / maxv * 92));
      var cx = i * gw + gw / 2;
      var xf = cx - 21, xd = cx - 7, xr = cx + 7;
      s += barra3d(xf, y0, hf, w, d, "gfat", "nfat", "#a9c8ff", "#16308f");
      s += barra3d(xd, y0, hd, w, d, "gdesp", "ndesp", "#ffd0a0", "#8f3a12");
      s += barra3d(xr, y0, hr, w, d, "gres", "nres", "#b7ffd2", "#086b36");
      s += '<text x="' + (xf + w / 2 + d / 2) + '" y="' + (y0 - hf - d - 4) + '" text-anchor="middle" font-size="7" font-weight="700" fill="#cfe0ff">' + kf(f) + "</text>";
      s += '<text x="' + (xr + w / 2 + d / 2) + '" y="' + (y0 - hr - d - 4) + '" text-anchor="middle" font-size="7" font-weight="700" fill="#8affb0">' + kf(res) + "</text>";
      s += '<text x="' + cx + '" y="' + (y0 + 14) + '" text-anchor="middle" font-size="8.5" font-weight="700" fill="#9090b8">' + rot(r.mesRef) + "</text>";
    });
    s += "</svg>";
    s += '<div style="display:flex;gap:11px;justify-content:center;flex-wrap:wrap;margin-top:4px;font-size:9px;color:#c3d0f5">'
      + '<span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:linear-gradient(#7fb2ff,#2145c9);box-shadow:0 0 6px #4d82ff;margin-right:4px"></span>Faturamento</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:linear-gradient(#ffb35c,#c9541e);box-shadow:0 0 6px #ff9b45;margin-right:4px"></span>Despesas</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:linear-gradient(#7dffb0,#0e9c4f);box-shadow:0 0 7px #39ff88;margin-right:4px"></span>Resultado</span>'
      + "</div>";
    return s;
  }
  function build() {
    try {
      var el = document.getElementById("cli-fat"); if (!el) return;
      var cards = el.querySelectorAll(".lcard"); var alvo = null;
      for (var i = 0; i < cards.length; i++) { if (/Faturamento por m|Faturamento x Despesas/.test(cards[i].textContent || "")) { alvo = cards[i]; break; } }
      if (!alvo || alvo.getAttribute("data-ap3d") === "1") return;
      var regs = (window.__fatRegs || []).slice();
      regs.sort(function (a, b) { return String(a.mesRef || "").localeCompare(String(b.mesRef || "")); });
      regs = regs.slice(-6);
      if (!regs.length) return;
      alvo.setAttribute("data-ap3d", "1");
      alvo.innerHTML = '<div style="font-size:11px;font-weight:700;margin-bottom:8px">\ud83d\udcca Faturamento x Despesas x Resultado</div>' + montar(regs);
    } catch (e) {}
  }
  [1500, 3000, 6000].forEach(function (t) { setTimeout(build, t); });
  setInterval(build, 2000);
})();

/* ===== Assistente virtual acima da barra de icones (nao cobre a navegacao) ===== */
;(function () {
  if (window.__APARAT_BOT_POS__) return; window.__APARAT_BOT_POS__ = 1;
  function aplicar() {
    try {
      if (!(typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE === "cliente")) return;
      if (document.getElementById("ap-bot-fix")) return;
      var st = document.createElement("style"); st.id = "ap-bot-fix";
      st.textContent = ".apbot{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}"
        + "@media(max-width:760px){.apbot{bottom:calc(78px + env(safe-area-inset-bottom,0px))!important}}";
      document.head.appendChild(st);
    } catch (e) {}
  }
  [800, 2000, 4000].forEach(function (t) { setTimeout(aplicar, t); });
  setInterval(aplicar, 4000);
})();
