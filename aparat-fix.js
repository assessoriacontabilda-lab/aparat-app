/* APARAT - correcao Documentos Seguros + Instalacao (aparat-fix.js) */
(function () {
  "use strict";
  if (window.__APARAT_FIX__) return;
  window.__APARAT_FIX__ = true;

  var ADMIN_EMAIL = "assessoriacontabil.da@gmail.com";
  var MAX_BYTES = 720 * 1024; // limite seguro para Firestore (doc < 1MB)
  var TYPES = [
    { key: "cnpj", label: "🪪 Cartão CNPJ" },
    { key: "certidao", label: "📜 Certidão de Inteiro Teor" },
    { key: "certificado", label: "💳 Certificado Digital" }
  ];

  function fs() { return firebase.firestore(); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sanitize(s) { return String(s || "").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60); }
  function toast(msg) {
    try { if (typeof window.notif === "function") { window.notif(msg, "info"); return; } } catch (e) {}
    alert(msg);
  }
  function typeByKey(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].key === k) return TYPES[i]; return null; }
  function typeByText(t) {
    t = (t || "").toLowerCase();
    if (t.indexOf("cnpj") >= 0) return typeByKey("cnpj");
    if (t.indexOf("certid") >= 0) return typeByKey("certidao");
    if (t.indexOf("certific") >= 0) return typeByKey("certificado");
    return null;
  }
  function dataUrlToBlob(d) {
    var parts = String(d).split(","); var m = (parts[0].match(/:(.*?);/) || [])[1] || "application/octet-stream";
    var bin = atob(parts[1] || ""); var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m });
  }
  function openData(doc) {
    try { var url = URL.createObjectURL(dataUrlToBlob(doc.arquivoData)); window.open(url, "_blank"); }
    catch (e) { downloadData(doc); }
  }
  function downloadData(doc) {
    try {
      var url = URL.createObjectURL(dataUrlToBlob(doc.arquivoData));
      var a = document.createElement("a"); a.href = url; a.download = doc.arquivoNome || (doc.tipoKey + ".pdf");
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("Não foi possível baixar."); }
  }

  /* ---------- identidade ---------- */
  var IDENT = { role: null, name: null, email: null };
  function loadIdentity(cb) {
    var u = firebase.auth && firebase.auth().currentUser;
    if (!u) { IDENT = { role: null, name: null, email: null }; cb(IDENT); return; }
    fs().collection("usuarios").doc(u.uid).get().then(function (d) {
      var data = d.exists ? d.data() : {};
      IDENT = {
        role: data.role || (u.email === ADMIN_EMAIL ? "admin" : "cliente"),
        name: data.clienteNome || null,
        email: u.email
      };
      cb(IDENT);
    }).catch(function () {
      IDENT = { role: u.email === ADMIN_EMAIL ? "admin" : "cliente", name: null, email: u.email };
      cb(IDENT);
    });
  }

  /* ---------- ESCRITORIO ---------- */
  function fillClientSelect() {
    var sel = document.getElementById("docs-cli-sel");
    if (!sel) return;
    fs().collection("clientes").get().then(function (snap) {
      var nomes = [];
      snap.forEach(function (d) { var n = d.data().nome; if (n) nomes.push(n); });
      nomes.sort(function (a, b) { return a.localeCompare(b); });
      var cur = sel.value;
      sel.innerHTML = '<option value="">Toque para selecionar...</option>';
      nomes.forEach(function (n) {
        var o = document.createElement("option"); o.value = n; o.textContent = n; sel.appendChild(o);
      });
      if (cur) sel.value = cur;
    }).catch(function (e) { console.warn("[aparat-fix] fillClientSelect", e); });
  }

  function officeRender() {
    var sel = document.getElementById("docs-cli-sel");
    var box = document.getElementById("docs-lista");
    if (!sel || !box) return;
    var name = sel.value;
    if (!name) {
      box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:10px">Selecione um cliente para ver e enviar os documentos seguros.</div>';
      return;
    }
    box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:10px">Carregando...</div>';
    fs().collection("docseg").where("cliente", "==", name).get().then(function (snap) {
      var map = {};
      snap.forEach(function (d) { var x = d.data(); x.id = d.id; map[x.tipoKey] = x; });
      var html = "";
      TYPES.forEach(function (t) {
        var doc = map[t.key];
        html += '<div style="background:#12122a;border:1px solid #222248;border-radius:10px;padding:12px;margin-bottom:10px">';
        html += '<div style="font-weight:700;color:#fff;font-size:13px;margin-bottom:8px">' + t.label + "</div>";
        if (doc) {
          html += '<div style="font-size:11px;color:#9090b8;margin-bottom:8px">' + esc(doc.arquivoNome || "arquivo") + " · " + Math.round((doc.tamanho || 0) / 1024) + " KB</div>";
          html += '<div style="display:flex;gap:6px;flex-wrap:wrap">'
            + '<button data-act="ver" data-k="' + t.key + '" style="flex:1;min-width:88px;background:#3a5bd9;color:#fff;border:0;border-radius:7px;padding:8px;font-size:12px;font-weight:700;cursor:pointer">👁 Visualizar</button>'
            + '<button data-act="baixar" data-k="' + t.key + '" style="flex:1;min-width:88px;background:#22c55e;color:#fff;border:0;border-radius:7px;padding:8px;font-size:12px;font-weight:700;cursor:pointer">⬇ Baixar</button>'
            + '<button data-act="enviar" data-k="' + t.key + '" style="flex:1;min-width:88px;background:#f59e0b;color:#111;border:0;border-radius:7px;padding:8px;font-size:12px;font-weight:700;cursor:pointer">🔄 Substituir</button>'
            + '<button data-act="excluir" data-k="' + t.key + '" style="flex:1;min-width:88px;background:#ef4444;color:#fff;border:0;border-radius:7px;padding:8px;font-size:12px;font-weight:700;cursor:pointer">🗑 Excluir</button>'
            + "</div>";
        } else {
          html += '<div style="font-size:11px;color:#9090b8;margin-bottom:8px">Nenhum arquivo enviado.</div>';
          html += '<button data-act="enviar" data-k="' + t.key + '" style="width:100%;background:#3333FF;color:#fff;border:0;border-radius:7px;padding:9px;font-size:12px;font-weight:700;cursor:pointer">📤 Enviar arquivo</button>';
        }
        html += "</div>";
      });
      box.innerHTML = html;
      [].forEach.call(box.querySelectorAll("button[data-act]"), function (b) {
        b.onclick = function () {
          officeAction(b.getAttribute("data-act"), b.getAttribute("data-k"), name, map[b.getAttribute("data-k")]);
        };
      });
    }).catch(function (e) {
      box.innerHTML = '<div style="color:#ef4444;font-size:12px;padding:10px">Erro ao carregar: ' + esc(e.code || e.message) + "</div>";
    });
  }

  function officeAction(act, key, name, doc) {
    var t = typeByKey(key);
    if (act === "enviar") { pickFile(function (f) { uploadDoc(name, t, f); }); return; }
    if (!doc) return;
    if (act === "ver") { openData(doc); return; }
    if (act === "baixar") { downloadData(doc); return; }
    if (act === "excluir") {
      if (!confirm("Excluir " + t.label + " de " + name + "?")) return;
      fs().collection("docseg").doc(doc.id).delete().then(function () { toast("Documento excluído."); officeRender(); })
        .catch(function (e) { alert("Erro ao excluir: " + (e.code || e.message)); });
    }
  }

  function pickFile(cb) {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".pdf,.png,.jpg,.jpeg,.p12,.pfx";
    inp.onchange = function () { if (inp.files && inp.files[0]) cb(inp.files[0]); };
    inp.click();
  }

  function uploadDoc(name, t, file) {
    if (file.size > MAX_BYTES) {
      alert("Arquivo muito grande (" + Math.round(file.size / 1024) + " KB). O limite é 720 KB.\n\nComprima o PDF ou peça para ativar o armazenamento de arquivos grandes.");
      return;
    }
    var r = new FileReader();
    r.onload = function () {
      var id = sanitize(name) + "__" + t.key;
      fs().collection("docseg").doc(id).set({
        cliente: name, tipo: t.label, tipoKey: t.key,
        arquivoNome: file.name, arquivoData: r.result,
        mime: file.type || "application/octet-stream", tamanho: file.size,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function () { toast(t.label + " enviado para " + name + "."); officeRender(); })
        .catch(function (e) { alert("Erro ao enviar: " + (e.code || e.message)); });
    };
    r.readAsDataURL(file);
  }

  function previewInIframe() {
    var prev = document.getElementById("ds-prev-sel");
    var ifr = document.getElementById("ds-iframe");
    var sel = document.getElementById("docs-cli-sel");
    if (!prev || !ifr) return;
    var name = sel ? sel.value : "";
    var t = typeByText(prev.options[prev.selectedIndex] ? prev.options[prev.selectedIndex].textContent : "");
    if (!name) { alert("Selecione um cliente na aba 📂 Arquivos primeiro."); return; }
    if (!t) { ifr.removeAttribute("src"); return; }
    fs().collection("docseg").doc(sanitize(name) + "__" + t.key).get().then(function (d) {
      if (!d.exists) { ifr.src = "about:blank"; alert("Nenhum " + t.label + " enviado para " + name + "."); return; }
      try { ifr.src = URL.createObjectURL(dataUrlToBlob(d.data().arquivoData)); }
      catch (e) { ifr.src = d.data().arquivoData; }
    });
  }

  /* ---------- CLIENTE ---------- */
  function clientRender() {
    var box = document.getElementById("lista-docs-cliente");
    if (!box) return;
    if (!IDENT.name) {
      box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:8px">Faça login para ver seus documentos.</div>';
      return;
    }
    box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:8px">Carregando...</div>';
    fs().collection("docseg").where("cliente", "==", IDENT.name).get().then(function (snap) {
      if (snap.empty) {
        box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:8px">Nenhum documento disponível ainda.</div>';
        return;
      }
      var docs = []; snap.forEach(function (d) { var x = d.data(); x.id = d.id; docs.push(x); });
      var html = "";
      docs.forEach(function (doc, i) {
        html += '<div style="background:#12122a;border:1px solid #222248;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">'
          + '<div style="font-size:22px">📄</div>'
          + '<div style="flex:1;min-width:0"><div style="font-weight:700;color:#fff;font-size:12px">' + esc(doc.tipo) + "</div>"
          + '<div style="font-size:10px;color:#9090b8;overflow:hidden;text-overflow:ellipsis">' + esc(doc.arquivoNome || "") + "</div></div>"
          + '<button data-i="' + i + '" data-act="ver" style="background:#3a5bd9;color:#fff;border:0;border-radius:7px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer">👁 Ver</button>'
          + '<button data-i="' + i + '" data-act="baixar" style="background:#22c55e;color:#fff;border:0;border-radius:7px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer">⬇ Baixar</button>'
          + "</div>";
      });
      box.innerHTML = html;
      [].forEach.call(box.querySelectorAll("button[data-act]"), function (b) {
        b.onclick = function () {
          var doc = docs[+b.getAttribute("data-i")];
          if (b.getAttribute("data-act") === "ver") openData(doc); else downloadData(doc);
        };
      });
    }).catch(function (e) {
      box.innerHTML = '<div style="color:#ef4444;font-size:12px;padding:8px">Erro ao carregar: ' + esc(e.code || e.message) + "</div>";
    });
  }

  /* ---------- INSTALACAO ---------- */
  function setupInstall() {
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); window.__bip = e;
      var b = document.getElementById("btn-install-app"); if (b) b.style.display = "";
    });
    window.addEventListener("appinstalled", function () { window.__bip = null; toast("App instalado! Procure o ícone Aparat na tela inicial. ✔"); });
    window.instalarApp = function () {
      var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
      if (standalone) { toast("O app já está instalado neste aparelho. ✔"); return; }
      if (window.__bip) {
        window.__bip.prompt();
        window.__bip.userChoice.then(function (c) {
          window.__bip = null;
          if (c && c.outcome === "accepted") toast("App instalado! Procure o ícone Aparat na tela inicial. ✔");
        });
        return;
      }
      var ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/i.test(ua)) {
        alert("Para instalar no iPhone/iPad:\n\n1. Toque no botão Compartilhar (quadrado com seta para cima).\n2. Escolha \"Adicionar à Tela de Início\".\n3. Confirme em \"Adicionar\".\n\nO ícone da Aparat aparecerá na tela inicial.");
      } else if (/Android/i.test(ua)) {
        alert("Para instalar no Android:\n\n1. Toque nos 3 pontinhos (⋮) no canto do navegador.\n2. Escolha \"Instalar aplicativo\" ou \"Adicionar à tela inicial\".\n3. Confirme.\n\nO ícone da Aparat aparecerá na tela inicial.");
      } else {
        alert("Para instalar no computador:\n\nClique no ícone de instalar (⊕ / monitor) na barra de endereço do Chrome, ou no menu ⋮ > \"Instalar Aparat Contabilidade\".");
      }
    };
  }

  /* ---------- INIT ---------- */
  function init() {
    if (!(window.firebase && firebase.apps && firebase.apps.length)) { setTimeout(init, 300); return; }
    setupInstall();
    var sel = document.getElementById("docs-cli-sel");
    if (sel) sel.addEventListener("change", officeRender);
    var atu = document.getElementById("btn-save-docs");
    if (atu) atu.onclick = officeRender;
    var prev = document.getElementById("ds-prev-sel");
    if (prev) prev.addEventListener("change", previewInIframe);
    window.carregarDocsSeguro = officeRender;
    window.carregarDocsCliente = clientRender;
    var nb = document.getElementById("nb-docs");
    if (nb) nb.addEventListener("click", function () { setTimeout(clientRender, 350); });

    loadIdentity(function (id) {
      if (id.role === "admin" || !id.role) fillClientSelect();
      if (id.role && id.role !== "admin") clientRender();
    });
    firebase.auth().onAuthStateChanged(function () {
      loadIdentity(function (id) {
        if (id.role === "admin" || !id.role) fillClientSelect();
        if (id.role && id.role !== "admin") clientRender();
      });
    });
    console.log("[aparat-fix] carregado");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
