/* APARAT - Documentos Seguros (por UID) + Instalacao - v3 */
(function () {
  "use strict";
  if (window.__APARAT_FIX__) return;
  window.__APARAT_FIX__ = "v3";

  // Auto-atualizacao: evita ficar preso numa versao antiga em cache.
  (function () {
    try {
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        rs.forEach(function (r) { try { r.update(); } catch (e) {} });
      });
      var recarregou = false;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (recarregou) return; recarregou = true; location.reload();
      });
    } catch (e) {}
  })();

  var ADMIN_EMAIL = "assessoriacontabil.da@gmail.com";
  var MAX_BYTES = 15 * 1024 * 1024;
  var CHUNK = 700000;
  var TYPES = [
    { key: "cnpj", label: "🪪 Cartão CNPJ" },
    { key: "certidao", label: "📜 Certidão de Inteiro Teor" },
    { key: "certificado", label: "💳 Certificado Digital" }
  ];

  function fs() { return firebase.firestore(); }
  function col() { return fs().collection("docseg"); }
  function uidAtual() { var u = firebase.auth && firebase.auth().currentUser; return u ? u.uid : null; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sanitize(s) { return String(s || "").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 80); }
  function typeByKey(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].key === k) return TYPES[i]; return null; }
  function typeByText(t) {
    t = (t || "").toLowerCase();
    if (t.indexOf("cnpj") >= 0) return typeByKey("cnpj");
    if (t.indexOf("certid") >= 0) return typeByKey("certidao");
    if (t.indexOf("certific") >= 0) return typeByKey("certificado");
    return null;
  }
  function readAsDataURL(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(file);
    });
  }
  function dataUrlToBlob(d) {
    var parts = String(d).split(","); var m = (parts[0].match(/:(.*?);/) || [])[1] || "application/octet-stream";
    var bin = atob(parts[1] || ""); var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m });
  }
  function openData(d) { try { window.open(URL.createObjectURL(dataUrlToBlob(d)), "_blank"); } catch (e) { downloadData(d, "documento"); } }
  function downloadData(d, nome) {
    try {
      var url = URL.createObjectURL(dataUrlToBlob(d));
      var a = document.createElement("a"); a.href = url; a.download = nome || "documento";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("Não foi possível baixar."); }
  }

  function baseId(uid, key) { return "seg_" + sanitize(uid) + "_" + key; }

  // Reconstroi o arquivo a partir do documento-mestre (inline OU em partes)
  async function buildFromMeta(meta) {
    if (!meta) return null;
    if (meta.arquivoData) return meta.arquivoData;            // formato antigo (inline)
    if (meta.data && !meta.partes) return meta.data;          // alternativo
    var n = meta.partes || 0;
    if (!n) return null;
    var base = meta.__id;
    var ids = []; for (var i = 0; i < n; i++) ids.push(base + "__p" + i);
    var docs = await Promise.all(ids.map(function (id) { return col().doc(id).get(); }));
    var s = ""; docs.forEach(function (d) { if (d.exists) s += (d.data().data || ""); });
    return s || null;
  }

  // Apaga TODOS os docs (mestre + partes) de um dono/tipo, qualquer que seja o id
  async function deleteDocSet(ownerUid, key) {
    var snap = await col().where("cliente", "==", ownerUid).get();
    var dels = [];
    snap.forEach(function (d) { if (d.data().tipoKey === key) dels.push(d.ref.delete()); });
    await Promise.all(dels);
  }

  async function uploadDoc(ownerUid, ownerNome, t, file) {
    if (file.size > MAX_BYTES) { alert("Arquivo muito grande. Limite 15 MB."); return; }
    try {
      var dataUrl = await readAsDataURL(file);
      await deleteDocSet(ownerUid, t.key);
      var base = baseId(ownerUid, t.key);
      var parts = [];
      for (var i = 0; i < dataUrl.length; i += CHUNK) parts.push(dataUrl.slice(i, i + CHUNK));
      await Promise.all(parts.map(function (p, k) {
        return col().doc(base + "__p" + k).set({ cliente: ownerUid, tipoKey: t.key, parte: k, chunk: true, data: p });
      }));
      await col().doc(base).set({
        cliente: ownerUid, clienteNome: ownerNome || "", tipo: t.label, tipoKey: t.key, meta: true,
        arquivoNome: file.name, mime: file.type || "application/octet-stream",
        tamanho: file.size, partes: parts.length,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert(t.label + " enviado para " + (ownerNome || "o cliente") + " com sucesso!");
      officeRender();
    } catch (e) { alert("Erro ao enviar: " + (e.code || e.message || e)); }
  }

  /* ---------- ESCRITORIO ---------- */
  function selectedNome() {
    var sel = document.getElementById("docs-cli-sel");
    if (!sel || sel.selectedIndex < 0) return "";
    var o = sel.options[sel.selectedIndex]; return o ? o.textContent : "";
  }

  function fillClientSelect() {
    var sel = document.getElementById("docs-cli-sel");
    if (!sel) return;
    fs().collection("usuarios").get().then(function (snap) {
      var lista = [];
      snap.forEach(function (d) {
        var x = d.data();
        if (x && x.clienteNome && x.role !== "admin" && x.email !== ADMIN_EMAIL) {
          lista.push({ uid: d.id, nome: x.clienteNome });
        }
      });
      lista.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
      var cur = sel.value;
      sel.innerHTML = '<option value="">Toque para selecionar...</option>';
      lista.forEach(function (it) {
        var o = document.createElement("option"); o.value = it.uid; o.textContent = it.nome; sel.appendChild(o);
      });
      if (cur) sel.value = cur;
    }).catch(function (e) { console.warn("[aparat-fix] usuarios", e); });
  }

  function officeRender() {
    var sel = document.getElementById("docs-cli-sel");
    var box = document.getElementById("docs-lista");
    if (!sel || !box) return;
    var uid = sel.value;
    if (!uid) {
      box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:10px">Selecione um cliente para ver e enviar os documentos seguros.</div>';
      return;
    }
    var nome = selectedNome();
    box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:10px">Carregando...</div>';
    col().where("cliente", "==", uid).where("meta", "==", true).get().then(function (snap) {
      var map = {};
      snap.forEach(function (d) { var x = d.data(); if (x.chunk) return; x.__id = d.id; map[x.tipoKey] = x; });
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
        b.onclick = function () { officeAction(b.getAttribute("data-act"), b.getAttribute("data-k"), uid, nome, map[b.getAttribute("data-k")]); };
      });
    }).catch(function (e) {
      box.innerHTML = '<div style="color:#ef4444;font-size:12px;padding:10px">Erro ao carregar: ' + esc(e.code || e.message) + "</div>";
    });
  }

  function officeAction(act, key, uid, nome, doc) {
    var t = typeByKey(key);
    if (act === "enviar") { pickFile(function (f) { uploadDoc(uid, nome, t, f); }); return; }
    if (!doc) return;
    if (act === "ver" || act === "baixar") {
      buildFromMeta(doc).then(function (d) {
        if (!d) { alert("Arquivo não encontrado."); return; }
        if (act === "ver") openData(d); else downloadData(d, doc.arquivoNome);
      });
      return;
    }
    if (act === "excluir") {
      if (!confirm("Excluir " + t.label + " de " + (nome || "cliente") + "?")) return;
      deleteDocSet(uid, key).then(function () { alert("Documento excluído."); officeRender(); })
        .catch(function (e) { alert("Erro ao excluir: " + (e.code || e.message)); });
    }
  }

  function pickFile(cb) {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".pdf,.png,.jpg,.jpeg,.p12,.pfx";
    inp.onchange = function () { if (inp.files && inp.files[0]) cb(inp.files[0]); };
    inp.click();
  }

  function previewInIframe() {
    var prev = document.getElementById("ds-prev-sel");
    var ifr = document.getElementById("ds-iframe");
    var sel = document.getElementById("docs-cli-sel");
    if (!prev || !ifr) return;
    var uid = sel ? sel.value : "";
    var t = typeByText(prev.options[prev.selectedIndex] ? prev.options[prev.selectedIndex].textContent : "");
    if (!uid) { alert("Selecione um cliente na aba 📂 Arquivos primeiro."); return; }
    if (!t) { ifr.removeAttribute("src"); return; }
    col().where("cliente", "==", uid).where("meta", "==", true).get().then(function (snap) {
      var meta = null; snap.forEach(function (d) { var x = d.data(); if (x.tipoKey === t.key) { x.__id = d.id; meta = x; } });
      if (!meta) { ifr.src = "about:blank"; alert("Nenhum " + t.label + " enviado para este cliente."); return; }
      buildFromMeta(meta).then(function (d) {
        if (!d) { ifr.src = "about:blank"; return; }
        try { ifr.src = URL.createObjectURL(dataUrlToBlob(d)); } catch (e) { ifr.src = d; }
      });
    });
  }

  /* ---------- CLIENTE ---------- */
  function clientRender() {
    var box = document.getElementById("lista-docs-cliente");
    if (!box) return;
    var uid = uidAtual();
    if (!uid) { box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:8px">Faça login para ver seus documentos.</div>'; return; }
    box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:8px">Carregando...</div>';
    col().where("cliente", "==", uid).where("meta", "==", true).get().then(function (snap) {
      var docs = []; snap.forEach(function (d) { var x = d.data(); if (x.chunk) return; x.__id = d.id; docs.push(x); });
      if (!docs.length) { box.innerHTML = '<div style="color:#9090b8;font-size:12px;padding:8px">Nenhum documento disponível ainda.</div>'; return; }
      var html = "";
      docs.forEach(function (doc, i) {
        html += '<div style="background:#12122a;border:1px solid #222248;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">'
          + '<div style="font-size:22px">📄</div>'
          + '<div style="flex:1;min-width:0"><div style="font-weight:700;color:#fff;font-size:12px">' + esc(doc.tipo || "Documento") + "</div>"
          + '<div style="font-size:10px;color:#9090b8;overflow:hidden;text-overflow:ellipsis">' + esc(doc.arquivoNome || "") + "</div></div>"
          + '<button data-i="' + i + '" data-act="ver" style="background:#3a5bd9;color:#fff;border:0;border-radius:7px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer">👁 Ver</button>'
          + '<button data-i="' + i + '" data-act="baixar" style="background:#22c55e;color:#fff;border:0;border-radius:7px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer">⬇ Baixar</button>'
          + "</div>";
      });
      box.innerHTML = html;
      [].forEach.call(box.querySelectorAll("button[data-act]"), function (b) {
        b.onclick = function () {
          var doc = docs[+b.getAttribute("data-i")]; var act = b.getAttribute("data-act");
          buildFromMeta(doc).then(function (d) {
            if (!d) { alert("Arquivo não encontrado."); return; }
            if (act === "ver") openData(d); else downloadData(d, doc.arquivoNome);
          });
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
    window.addEventListener("appinstalled", function () { window.__bip = null; alert("App instalado! Procure o ícone Aparat na tela inicial."); });
    window.instalarApp = function () {
      var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
      if (standalone) { alert("O app já está instalado neste aparelho."); return; }
      if (window.__bip) {
        window.__bip.prompt();
        window.__bip.userChoice.then(function (c) { window.__bip = null; if (c && c.outcome === "accepted") alert("App instalado!"); });
        return;
      }
      var ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/i.test(ua)) {
        alert("iPhone/iPad:\n1. Botão Compartilhar.\n2. \"Adicionar à Tela de Início\".\n3. Adicionar.");
      } else if (/Android/i.test(ua)) {
        alert("Android:\n1. Toque nos 3 pontinhos (⋮).\n2. \"Instalar aplicativo\".\n3. Confirmar.");
      } else {
        alert("PC: clique no ícone de instalar na barra de endereço do Chrome.");
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

    function afterAuth() {
      var u = firebase.auth().currentUser;
      var isAdmin = u && (u.email === ADMIN_EMAIL);
      if (isAdmin) fillClientSelect(); else if (u) clientRender();
    }
    afterAuth();
    firebase.auth().onAuthStateChanged(afterAuth);
    console.log("[aparat-fix] v3 (UID) carregado");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
