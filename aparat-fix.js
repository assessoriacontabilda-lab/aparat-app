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

  // ---- Visual: camada de organizacao (mantem o tema escuro) ----
  (function injectStyle() {
    try {
      if (document.getElementById("__apstyle")) return;
      var css = ""
        + ":root{--ap-radius:14px;--ap-line:rgba(255,255,255,.08);--ap-blue:#4f7cff;}"
        + ".sidebar{border-right:1px solid var(--ap-line);}"
        + ".nav-sec{text-transform:uppercase;letter-spacing:.09em;font-size:10px!important;color:#8890b8!important;opacity:.75;margin:16px 14px 6px!important;font-weight:800!important;}"
        + ".nav-item,.ni{border-radius:10px!important;margin:2px 8px!important;transition:background .15s,box-shadow .15s;}"
        + ".nav-item:hover,.ni:hover{background:rgba(255,255,255,.06)!important;}"
        + ".nav-item.active,.ni.active{background:linear-gradient(90deg,rgba(79,124,255,.20),rgba(79,124,255,.03))!important;box-shadow:inset 3px 0 0 var(--ap-blue);}"
        + ".kcard{border-radius:var(--ap-radius)!important;border:1px solid rgba(255,255,255,.07)!important;background:linear-gradient(160deg,#15152f,#101024)!important;transition:transform .18s,box-shadow .18s,border-color .18s;}"
        + ".kcard:hover{transform:translateY(-2px);border-color:rgba(79,124,255,.4)!important;box-shadow:0 10px 24px rgba(0,0,0,.4);}"
        + ".fbox,.tbox{border-radius:var(--ap-radius)!important;border:1px solid rgba(255,255,255,.07)!important;}"
        + ".btn-az,.btn{border-radius:10px!important;}"
        + ".qcard{border-radius:var(--ap-radius)!important;border:1px solid var(--ap-line)!important;background:linear-gradient(160deg,#17193c,#111028)!important;transition:transform .18s,box-shadow .18s,border-color .18s;}"
        + ".qcard:hover,.qcard:active{transform:translateY(-2px);border-color:rgba(79,124,255,.45)!important;box-shadow:0 8px 20px rgba(0,0,0,.4);}"
        + ".wcard{border-radius:16px!important;background:linear-gradient(135deg,#2846cf,#3a5bd9)!important;box-shadow:0 10px 26px rgba(42,70,207,.32)!important;}"
        + ".lcard,.hon-app-card{border-radius:var(--ap-radius)!important;border:1px solid var(--ap-line)!important;}"
        + ".bnav{border-top:1px solid var(--ap-line)!important;}"
        + ".nbtn{border-radius:10px!important;transition:color .15s;}"
        + "#cli-docs-carousel,#cli-docs-cards{border-radius:var(--ap-radius)!important;}"
        // --- Cards do cliente organizados em coluna unica (igual ao escritorio) ---
        + "#ap-home .qgrid{display:flex!important;flex-direction:column!important;gap:11px!important;grid-template-columns:none!important;margin:14px 0!important}"
        + "#ap-home .qgrid>*{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;align-items:center!important;justify-content:flex-start!important;gap:8px 14px!important;padding:15px 16px!important;border-radius:15px!important;background:linear-gradient(135deg,#1b3a8f,#11224f)!important;border:1px solid rgba(120,160,255,.22)!important;box-shadow:0 5px 15px rgba(0,0,0,.28)!important;text-align:left!important;width:auto!important;min-height:0!important;aspect-ratio:auto!important}"
        + "#ap-home .qgrid>*:hover,#ap-home .qgrid>*:active{transform:translateY(-2px);border-color:rgba(150,180,255,.55)!important}"
        + "#ap-home .qgrid>* .qc-icon{font-size:24px!important;width:44px!important;min-width:44px!important;height:44px!important;display:flex!important;align-items:center!important;justify-content:center!important;border:2px solid rgba(150,180,255,.4)!important;border-radius:11px!important;margin:0!important;flex:0 0 auto!important;background:rgba(255,255,255,.05)!important}"
        + "#ap-home .qgrid>* .qc-lbl{font-weight:800!important;color:#fff!important;font-size:15px!important;margin:0!important;flex:1 1 60%!important}"
        + "#ap-home .qgrid>* .qc-sub{font-size:11px!important;color:#c3d0f5!important;margin:0!important;flex:1 1 100%!important;padding-left:58px!important;line-height:1.3!important}"
        // --- Atalhos do cliente em cards grandes (coluna unica) ---
        + ".cli-atalhos{display:flex!important;flex-direction:column!important;gap:10px!important;grid-template-columns:none!important}"
        + ".cli-atalhos>button{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;width:100%!important;padding:14px 16px!important;border-radius:14px!important;background:linear-gradient(135deg,#1b3a8f,#11224f)!important;border:1px solid rgba(120,160,255,.22)!important;box-shadow:0 4px 12px rgba(0,0,0,.28)!important;color:#fff!important;font-weight:800!important;font-size:15px!important;text-align:left!important;min-height:0!important;height:auto!important;transition:transform .15s,border-color .15s}"
        + ".cli-atalhos>button:hover,.cli-atalhos>button:active{transform:translateY(-2px);border-color:rgba(150,180,255,.55)!important}"
        // Selo fluorescente indicando onde anexar o extrato bancario
        + ".ap-extrato-flag{display:flex;align-items:center;gap:8px;margin:10px 0;padding:11px 13px;border-radius:12px;font-weight:800;font-size:13px;color:#062a12;background:linear-gradient(90deg,#39ff14,#00e5ff);box-shadow:0 0 8px 2px rgba(57,255,20,.7);animation:apglow 1.4s ease-in-out infinite;cursor:pointer}"
        + ".ap-extrato-flag .ap-ef-ic{font-size:18px}"
        + "@keyframes apglow{0%{box-shadow:0 0 6px 1px rgba(57,255,20,.6)}50%{box-shadow:0 0 18px 6px rgba(0,229,255,.9)}100%{box-shadow:0 0 6px 1px rgba(57,255,20,.6)}}"
        + "@media (max-width:640px){"
        + "html,body{overflow-x:hidden!important}"
        + ".layout{flex-direction:column!important;display:flex!important}"
        + ".sidebar{width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;max-height:none!important;border-right:none!important;border-bottom:1px solid var(--ap-line)!important;position:static!important}"
        + ".nav{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;overflow-x:auto!important;gap:6px!important;padding:8px!important;-webkit-overflow-scrolling:touch}"
        + ".nav-sec{display:none!important}"
        + ".nav-item,.ni{flex:0 0 auto!important;white-space:nowrap!important;font-size:12px!important;padding:9px 12px!important;margin:0!important}"
        + ".sidebar-foot{display:none!important}"
        + ".pmain,.painel{width:100%!important;padding:12px 10px!important}"
        + ".cards4{grid-template-columns:1fr 1fr!important;gap:8px!important}"
        + ".kcard{padding:12px 8px!important}"
        + "#ap-quick-cards{max-width:none!important}"
        + ".fbox,.tbox{padding:12px!important}"
        + ".fgrid{grid-template-columns:1fr!important}"
        + "#view-app.app-wrap,#view-app{padding:0!important}"
        + ".phone{width:100%!important;max-width:none!important;min-height:100vh!important;height:100vh!important;border:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important}"
        + ".phone .notch{display:none!important}"
        + ".phone .sbar{display:none!important}"
        + ".phone .acontent{flex:1 1 auto!important;overflow-y:auto!important}"
        + ".phone .bnav{flex:0 0 auto!important}"
        + "}";
      var s = document.createElement("style"); s.id = "__apstyle"; s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
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

  /* ---------- CARROSSEL do cliente ("Meus Documentos") ---------- */
  var CAR = { cache: null, idx: 0 };
  var CAR_SUB = { cnpj: "Comprovante CNPJ", certidao: "Certidão de Inteiro Teor", certificado: "Certificado Digital A1" };
  async function carLoad() {
    var uid = uidAtual(); if (!uid) return {};
    var snap = await col().where("cliente", "==", uid).where("meta", "==", true).get();
    var m = {}; snap.forEach(function (d) { var x = d.data(); if (x.chunk) return; x.__id = d.id; m[x.tipoKey] = x; });
    return m;
  }
  async function carRender(i) {
    var cards = document.getElementById("cli-docs-cards"); if (!cards) return;
    if (typeof i === "number" && i >= 0 && i < TYPES.length) CAR.idx = i;
    if (!CAR.cache) CAR.cache = await carLoad();
    var t = TYPES[CAR.idx]; var doc = CAR.cache[t.key];
    var h = '<div style="text-align:center;padding:14px"><div style="font-size:38px">📄</div>'
      + '<div style="font-weight:700;color:#fff;font-size:16px;margin-top:6px">' + t.label + '</div>'
      + '<div style="font-size:12px;color:#9090b8;margin:4px 0 12px">' + (CAR_SUB[t.key] || "") + '</div>';
    if (doc) {
      h += '<div style="font-size:11px;color:#bcd;margin-bottom:12px;word-break:break-word">' + esc(doc.arquivoNome || "documento") + '</div>'
        + '<div style="display:flex;gap:8px;justify-content:center">'
        + '<button data-carver="' + t.key + '" style="background:#3a5bd9;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer">👁 Ver</button>'
        + '<button data-carbaixar="' + t.key + '" style="background:#22c55e;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer">⬇ Baixar</button></div>';
    } else {
      h += '<div style="color:#9090b8;padding:10px">Documento não disponível</div>';
    }
    h += "</div>"; cards.innerHTML = h;
    var nav = document.getElementById("doc-nav-info"); if (nav) nav.textContent = (CAR.idx + 1) + " / " + TYPES.length;
    var vb = cards.querySelector("[data-carver]"); if (vb) vb.onclick = function () { carAbrir(t.key, false); };
    var bb = cards.querySelector("[data-carbaixar]"); if (bb) bb.onclick = function () { carAbrir(t.key, true); };
  }
  function carAbrir(key, baixar) {
    var doc = CAR.cache && CAR.cache[key]; if (!doc) { alert("Documento não disponível."); return; }
    buildFromMeta(doc).then(function (d) {
      if (!d) { alert("Arquivo não encontrado."); return; }
      if (baixar) downloadData(d, doc.arquivoNome); else openData(d);
    });
  }
  function setupCarousel() {
    window.renderDocsCarousel = function (i) { return carRender(i); };
    window.navDoc = function (dir) { CAR.idx = (CAR.idx + (dir || 1) + TYPES.length) % TYPES.length; carRender(CAR.idx); };
    if (document.getElementById("cli-docs-cards")) carRender(0);
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

  /* ---------- Cards grandes na tela inicial do escritorio ---------- */
  function navToSecao(name) {
    var items = [].slice.call(document.querySelectorAll(".sidebar .nav-item, .sidebar .ni"));
    var el = items.filter(function (e) { return e.textContent.indexOf(name) >= 0; })[0];
    if (el) el.click();
  }
  function injectQuickCards() {
    var dash = document.getElementById("pp-dash");
    if (!dash) return;
    if (document.getElementById("ap-quick-cards")) return;
    var cards = [
      { n: "Documentos", ic: "📁", d: "Acesse seus documentos a qualquer momento." },
      { n: "Obrigações", ic: "📅", d: "Acompanhe prazos e evite multas." },
      { n: "Faturamento", ic: "📈", d: "Acompanhe faturamento, despesas e resultado." },
      { n: "Solicitações", ic: "✈️", d: "Envie solicitações de forma rápida e fácil." },
      { n: "Informativos", ic: "📢", d: "Receba comunicados importantes." }
    ];
    var wrap = document.createElement("div");
    wrap.id = "ap-quick-cards";
    wrap.style.cssText = "display:flex;flex-direction:column;gap:14px;margin-bottom:18px;max-width:600px";
    cards.forEach(function (c) {
      var card = document.createElement("div");
      card.style.cssText = "display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:16px;cursor:pointer;background:linear-gradient(135deg,#1b3a8f,#11224f);border:1px solid rgba(120,160,255,.22);box-shadow:0 6px 18px rgba(0,0,0,.3);transition:transform .18s,box-shadow .18s";
      card.onmouseover = function () { card.style.transform = "translateY(-3px)"; card.style.boxShadow = "0 12px 30px rgba(30,70,180,.45)"; };
      card.onmouseout = function () { card.style.transform = ""; card.style.boxShadow = "0 6px 18px rgba(0,0,0,.3)"; };
      card.onclick = function () { navToSecao(c.n); };
      card.innerHTML = '<div style="font-size:32px;min-width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(150,180,255,.4);border-radius:12px">' + c.ic + '</div><div><div style="font-weight:800;color:#fff;font-size:17px">' + c.n + '</div><div style="font-size:12px;color:#c3d0f5;margin-top:3px;line-height:1.3">' + c.d + '</div></div>';
      wrap.appendChild(card);
    });
    dash.insertBefore(wrap, dash.firstElementChild);
  }

  // ---- Cards grandes na tela inicial do CLIENTE ----
  function injectClientCards() {
    // Desativado: os cards do cliente agora sao os proprios botoes do .qgrid,
    // reorganizados em coluna unica via CSS (sobrevive as re-renderizacoes do app).
    return;
    // eslint-disable-next-line no-unreachable
    var home = document.getElementById("ap-home");
    if (!home) return;
    if (document.getElementById("ap-client-cards")) return;
    var cards = [
      { ic: "📁", t: "Documentos", d: "Acesse seus documentos a qualquer momento.", nav: "nb-docs" },
      { ic: "📅", t: "Obrigações", d: "Acompanhe seus prazos e evite multas.", nav: "nb-obrig" },
      { ic: "💲", t: "Financeiro", d: "Veja honorários, boletos e pagamentos.", nav: "nb-financeiro" },
      { ic: "💳", t: "Honorários", d: "Veja e pague seus honorários.", nav: "nb-honorarios" },
      { ic: "🚨", t: "Avisos", d: "Receba comunicados importantes.", nav: "nb-urgencias" }
    ];
    var wrap = document.createElement("div");
    wrap.id = "ap-client-cards";
    wrap.style.cssText = "display:flex;flex-direction:column;gap:12px;margin:14px 0";
    cards.forEach(function (c) {
      var card = document.createElement("div");
      card.style.cssText = "display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;cursor:pointer;background:linear-gradient(135deg,#1b3a8f,#11224f);border:1px solid rgba(120,160,255,.22);box-shadow:0 5px 15px rgba(0,0,0,.3)";
      card.onclick = function () { var b = document.getElementById(c.nav); if (b) b.click(); };
      card.innerHTML = '<div style="font-size:28px;min-width:46px;height:46px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(150,180,255,.4);border-radius:11px">' + c.ic + '</div><div><div style="font-weight:800;color:#fff;font-size:15px">' + c.t + '</div><div style="font-size:11px;color:#c3d0f5;margin-top:2px;line-height:1.3">' + c.d + '</div></div>';
      wrap.appendChild(card);
    });
    var seg = home.querySelector(".segbadge");
    if (seg && seg.parentNode === home) { home.insertBefore(wrap, seg.nextSibling); }
    else { home.insertBefore(wrap, home.firstElementChild); }
    var qg = home.querySelector(".qgrid"); if (qg) qg.style.display = "none";
  }

  // ---- Remove letras/textos soltos direto no <body> (ex.: "h h") ----
  function removeStrays() {
    try {
      var b = document.body; if (!b) return;
      for (var i = b.childNodes.length - 1; i >= 0; i--) {
        var n = b.childNodes[i];
        if (n.nodeType === 3) {
          var t = (n.nodeValue || "").replace(/\s+/g, "").trim(); // __stray
          if (t.length > 0 && t.length <= 3) { b.removeChild(n); }
        }
      }
    } catch (e) {}
  }

  // ---- Avatar de secretaria (bonequinho) no assistente virtual ----
  function secretarySvg() {
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
      + "<defs><clipPath id='apsc'><circle cx='50' cy='50' r='50'/></clipPath>"
      + "<linearGradient id='apsg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3a5bd9'/><stop offset='1' stop-color='#16276e'/></linearGradient></defs>"
      + "<g clip-path='url(#apsc)'>"
      + "<rect width='100' height='100' fill='url(#apsg)'/>"
      + "<path d='M12 100 q0 -30 38 -30 q38 0 38 30 z' fill='#0f1c4d'/>"
      + "<path d='M50 72 l-11 28 h22 z' fill='#f4f6ff'/>"
      + "<rect x='43' y='58' width='14' height='16' rx='6' fill='#eab58c'/>"
      + "<circle cx='50' cy='44' r='20' fill='#f4c49c'/>"
      + "<path d='M29 46 q0 -23 21 -23 q21 0 21 23 q-7 -11 -21 -11 q-14 0 -21 11z' fill='#4a2f1a'/>"
      + "<path d='M29 46 q-3 13 2 22 l4 -2 q-5 -10 -2 -20z' fill='#4a2f1a'/>"
      + "<path d='M71 46 q3 13 -2 22 l-4 -2 q5 -10 2 -20z' fill='#4a2f1a'/>"
      + "<circle cx='43' cy='45' r='2.3' fill='#3a2a1a'/>"
      + "<circle cx='57' cy='45' r='2.3' fill='#3a2a1a'/>"
      + "<path d='M44 52 q6 5 12 0' stroke='#b5623c' stroke-width='2' fill='none' stroke-linecap='round'/>"
      + "<path d='M28 45 q0 -21 22 -21 q22 0 22 21' stroke='#12203f' stroke-width='4' fill='none'/>"
      + "<rect x='25' y='43' width='6' height='11' rx='3' fill='#12203f'/>"
      + "<rect x='69' y='43' width='6' height='11' rx='3' fill='#12203f'/>"
      + "<path d='M28 52 q-4 9 7 13' stroke='#12203f' stroke-width='3' fill='none'/>"
      + "<circle cx='36' cy='65' r='3.2' fill='#12203f'/>"
      + "</g></svg>";
  }
  function setSecretaryAvatar() {
    try {
      var av = document.querySelector(".apbot-av");
      if (!av) return;
      if (av.getAttribute("data-apsec") === "1") return;
      var uri = "data:image/svg+xml;utf8," + secretarySvg()
        .replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/"/g, "'");
      av.innerHTML = "";
      av.style.background = "#16276e url(\"" + uri + "\") center/cover no-repeat";
      av.setAttribute("data-apsec", "1");
    } catch (e) {}
  }

  // ---- Selo fluorescente: onde anexar o extrato bancario (cli-arq-file) ----
  function markExtratoUpload() {
    try {
      var f = document.getElementById("cli-arq-file");
      if (!f) return;
      if (document.getElementById("ap-extrato-flag")) return;
      var flag = document.createElement("div");
      flag.id = "ap-extrato-flag";
      flag.className = "ap-extrato-flag";
      flag.innerHTML = "<span class='ap-ef-ic'>📎</span> Anexe AQUI o seu extrato bancário (OFX ou PDF)";
      flag.onclick = function () { try { f.click(); } catch (e) {} };
      var anchor = f.parentElement || f;
      anchor.parentNode.insertBefore(flag, anchor);
    } catch (e) {}
  }

  // ---- Calendario completo em QUALQUER seletor de mes (independe do id) ----
  function expandFatMonths() {
    try {
      var sels = document.querySelectorAll("select");
      var nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      var now = new Date();
      for (var si = 0; si < sels.length; si++) {
        var s = sels[si];
        var opts = [].slice.call(s.options);
        if (!opts.length) continue;
        var isMonth = false;
        for (var oi = 0; oi < opts.length; oi++) {
          var ov = opts[oi].value, ot = opts[oi].textContent || "";
          if (/^\d{4}-\d{2}$/.test(ov) || /(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/?\d{4}/i.test(ot)) { isMonth = true; break; }
        }
        if (!isMonth) continue;
        if (s.getAttribute("data-apmonths") === "1" && s.options.length > 40) continue;
        var have = {};
        [].forEach.call(s.options, function (o) { have[o.value] = 1; });
        for (var k = 0; k >= -47; k--) {
          var d = new Date(now.getFullYear(), now.getMonth() + k, 1);
          var y = d.getFullYear(), m = d.getMonth() + 1;
          var vv = y + "-" + (m < 10 ? "0" + m : m);
          if (have[vv]) continue;
          var o2 = document.createElement("option");
          o2.value = vv; o2.textContent = nomes[m - 1] + "/" + y;
          s.appendChild(o2);
        }
        var selVal = s.value;
        var allo = [].slice.call(s.options);
        allo.sort(function (a, b) { return a.value < b.value ? 1 : (a.value > b.value ? -1 : 0); });
        allo.forEach(function (o) { s.appendChild(o); });
        if (selVal) s.value = selVal;
        s.setAttribute("data-apmonths", "1");
      }
    } catch (e) {}
  }

  // ---- Obrigacoes mensais completas: Extrato, NF-e e Certidao Fiscal ----
  function setupObrigacoes() {
    try {
      var tipo = document.getElementById("ob-tipo");
      var status = document.getElementById("ob-status");
      if (!tipo || !status) return;
      if (tipo.getAttribute("data-apob") === "1") return;
      var origStatus = [].slice.call(status.options).map(function (o) { return { v: o.value, t: o.textContent }; });
      var novos = ["Extrato Bancário", "NF-e Emitida", "Certidão Fiscal", "Lançamento no Domínio"];
      var have = {};
      [].forEach.call(tipo.options, function (o) { have[o.value] = 1; });
      novos.forEach(function (n) {
        if (!have[n]) { var o = document.createElement("option"); o.value = n; o.textContent = n; tipo.appendChild(o); }
      });
      var mapa = {
        "Extrato Bancário": ["Recebido", "Enviado", "Não Enviado"],
        "NF-e Emitida": ["Emitida", "Não Emitida", "Enviada ao Cliente", "Recebida de Fornecedor", "Emitida pelo Escritório"],
        "Certidão Fiscal": ["Conferida", "Pendente", "Irregular"],
        "Lançamento no Domínio": ["Lançado", "Em Andamento", "Pendente"]
      };
      function aplicar() {
        var lista = mapa[tipo.value];
        var atual = status.value;
        status.innerHTML = "";
        var fonte = lista ? lista.map(function (s) { return { v: s, t: s }; }) : origStatus;
        fonte.forEach(function (s) {
          var o = document.createElement("option"); o.value = s.v; o.textContent = s.t; status.appendChild(o);
        });
        try { status.value = atual; } catch (e) {}
      }
      tipo.addEventListener("change", aplicar);
      tipo.setAttribute("data-apob", "1");
    } catch (e) {}
  }

  // ---- Anexos nas Obrigacoes: escritorio anexa, cliente baixa ----
  var OB_MAX = 700000; // ~700 KB por anexo

  function obBaixar(nome, dataUrl) {
    try {
      var a = document.createElement("a");
      a.href = dataUrl; a.download = nome || "documento";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {}
  }

  function enhanceObrigOffice() {
    try {
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var u = firebase.auth().currentUser;
      if (!u || u.email !== ADMIN_EMAIL) return;
      var db = firebase.firestore();
      var btns = [].slice.call(document.querySelectorAll("[onclick]")).filter(function (b) {
        return /excluirObrig\(/.test(b.getAttribute("onclick") || "");
      });
      btns.forEach(function (b) {
        if (b.getAttribute("data-apanx") === "1") return;
        var m = (b.getAttribute("onclick") || "").match(/excluirObrig\(['"]([^'"]+)['"]\)/);
        if (!m) return;
        var id = m[1];
        var cel = b.parentElement; if (!cel) return;

        var bAnx = document.createElement("button");
        bAnx.className = b.className;
        bAnx.textContent = "📎 Anexar";
        bAnx.style.marginLeft = "4px";
        bAnx.onclick = function () {
          var inp = document.createElement("input");
          inp.type = "file";
          inp.accept = ".pdf,.xml,.png,.jpg,.jpeg";
          inp.onchange = function () {
            var f = inp.files && inp.files[0]; if (!f) return;
            if (f.size > OB_MAX) { alert("Arquivo muito grande (máximo 700 KB). Comprima o PDF e tente novamente."); return; }
            var fr = new FileReader();
            fr.onload = function () {
              db.collection("obrigacoes").doc(id).set({
                arquivoData: String(fr.result),
                arquivoNome: f.name,
                arquivoMime: f.type || "",
                arquivoEm: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true }).then(function () {
                alert("Anexo salvo! O cliente já pode visualizar e baixar.");
              }).catch(function () { alert("Erro ao salvar o anexo."); });
            };
            fr.onerror = function () { alert("Não consegui ler o arquivo."); };
            fr.readAsDataURL(f);
          };
          inp.click();
        };

        var bDl = document.createElement("button");
        bDl.className = b.className;
        bDl.textContent = "⬇ Baixar";
        bDl.style.marginLeft = "4px";
        bDl.onclick = function () {
          db.collection("obrigacoes").doc(id).get().then(function (d) {
            var x = d.data() || {};
            if (!x.arquivoData) { alert("Esta obrigação ainda não tem anexo."); return; }
            obBaixar(x.arquivoNome, x.arquivoData);
          }).catch(function () { alert("Erro ao buscar o anexo."); });
        };

        cel.appendChild(bAnx);
        cel.appendChild(bDl);
        b.setAttribute("data-apanx", "1");
      });
    } catch (e) {}
  }

  function enhanceObrigClient() {
    try {
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var pag = document.getElementById("ap-obrig");
      if (!pag) return;
      var u = firebase.auth().currentUser;
      if (!u || u.email === ADMIN_EMAIL) return;
      if (pag.getAttribute("data-apanx") === "1") return;
      pag.setAttribute("data-apanx", "1");
      var db = firebase.firestore();
      db.collection("usuarios").doc(u.uid).get().then(function (ud) {
        var nome = (ud.data() || {}).clienteNome || "";
        if (!nome) return;
        return db.collection("obrigacoes").where("cliente", "==", nome).get().then(function (snap) {
          var lista = [];
          snap.forEach(function (d) { var x = d.data(); if (x && x.arquivoData) lista.push(x); });
          if (!lista.length) return;
          var box = document.createElement("div");
          box.id = "ap-obrig-anexos";
          box.style.cssText = "margin:14px 0;padding:13px;border-radius:14px;background:linear-gradient(135deg,#1b3a8f,#11224f);border:1px solid rgba(120,160,255,.22)";
          var t = document.createElement("div");
          t.style.cssText = "font-weight:800;color:#fff;margin-bottom:8px;font-size:14px";
          t.textContent = "📎 Documentos das Obrigações";
          box.appendChild(t);
          lista.forEach(function (x) {
            var row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;margin-top:7px;border-radius:10px;background:rgba(0,0,0,.28)";
            var lbl = document.createElement("div");
            lbl.style.cssText = "font-size:12px;color:#dfe6ff;line-height:1.3";
            lbl.innerHTML = "<b>" + (x.tipo || "Documento") + "</b><br><span style='color:#c3d0f5'>" + (x.arquivoNome || "") + "</span>";
            var btn = document.createElement("button");
            btn.textContent = "⬇ Baixar";
            btn.style.cssText = "background:#2b6fff;color:#fff;border:0;border-radius:9px;padding:7px 13px;font-weight:700;cursor:pointer;white-space:nowrap";
            btn.onclick = function () { obBaixar(x.arquivoNome, x.arquivoData); };
            row.appendChild(lbl); row.appendChild(btn);
            box.appendChild(row);
          });
          pag.insertBefore(box, pag.firstChild);
        });
      }).catch(function () {});
    } catch (e) {}
  }

  // ---- Obrigacoes ANUAIS: sub-aba dentro de Obrigacoes ----
  var ANUAIS_TIPOS = ["DASN-SIMEI", "DEFIS", "ECF", "ECD (SPED Contábil)", "DIRF", "RAIS/eSocial", "Balanço Patrimonial", "DRE Anual", "Informe de Rendimentos", "IRPF dos Sócios"];
  var ANUAIS_SIT = ["Entregue", "Pendente", "Em Andamento", "Dispensado"];

  function elx(tag, props, style) {
    var e = document.createElement(tag);
    if (props) for (var k in props) e[k] = props[k];
    if (style) e.style.cssText = style;
    return e;
  }
  function mkSel(id, arr) {
    var s = elx("select", { id: id });
    arr.forEach(function (v) { var o = elx("option"); o.value = v; o.textContent = v; s.appendChild(o); });
    return s;
  }

  function setupObrigAnuais() {
    try {
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var u = firebase.auth().currentUser;
      if (!u || u.email !== ADMIN_EMAIL) return;
      var page = document.getElementById("pp-obrig");
      if (!page || page.getAttribute("data-apanu") === "1") return;
      page.setAttribute("data-apanu", "1");
      var db = firebase.firestore();
      var orig = [].slice.call(page.children);

      var bar = elx("div", null, "display:flex;gap:10px;margin-bottom:14px");
      function styBtn(on) { return "padding:10px 18px;border-radius:10px;font-weight:800;border:1px solid rgba(120,160,255,.3);cursor:pointer;font-size:13px;" + (on ? "background:linear-gradient(135deg,#2b6fff,#1b3a8f);color:#fff" : "background:#12122a;color:#c8d2f0"); }
      var bM = elx("button", { textContent: "📋 Obrigações Mensais" }, styBtn(true));
      var bA = elx("button", { textContent: "🗓️ Obrigações Anuais" }, styBtn(false));
      bar.appendChild(bM); bar.appendChild(bA);

      var anu = elx("div", { id: "ob-anuais-wrap" }, "display:none");
      var card = elx("div", null, "background:#12122a;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px");
      card.appendChild(elx("div", { innerHTML: "🗓️ <b>Lançar Obrigação Anual</b>" }, "color:#7fa0ff;margin-bottom:12px"));
      var grid = elx("div", null, "display:grid;grid-template-columns:1fr 1fr;gap:12px");
      function fld(lb, input) {
        var d = elx("div");
        d.appendChild(elx("label", { textContent: lb }, "display:block;font-size:11px;color:#9fb0e8;margin-bottom:4px"));
        input.style.cssText = "width:100%;background:#05050f;border:1px solid rgba(150,180,255,.25);border-radius:7px;padding:9px 11px;color:#dfe6ff;font-size:13px";
        d.appendChild(input); return d;
      }
      var selCli = elx("select", { id: "oba-cli" });
      function carregarClientesAnu() {
        db.collection("clientes").get().then(function (snap) {
          var nomes = [];
          snap.forEach(function (d) { var n = String((d.data() || {}).nome || "").trim(); if (n && nomes.indexOf(n) < 0) nomes.push(n); });
          nomes.sort(function (a, b) { return a.localeCompare(b); });
          var atual = selCli.value;
          selCli.innerHTML = "";
          var ph = elx("option"); ph.value = ""; ph.textContent = "Selecione o cliente..."; selCli.appendChild(ph);
          nomes.forEach(function (n) { var o = elx("option"); o.value = n; o.textContent = n; selCli.appendChild(o); });
          if (atual) selCli.value = atual;
        }).catch(function () {});
      }
      carregarClientesAnu();
      var selTipo = mkSel("oba-tipo", ANUAIS_TIPOS);
      var anos = []; var ya = new Date().getFullYear(); for (var y = ya + 1; y >= ya - 6; y--) anos.push(String(y));
      var selAno = mkSel("oba-ano", anos);
      var selSit = mkSel("oba-sit", ANUAIS_SIT);
      var inpPz = elx("input", { type: "date", id: "oba-prazo" });
      var inpF = elx("input", { type: "file", id: "oba-file", accept: ".pdf,.xml,.png,.jpg,.jpeg" });
      grid.appendChild(fld("Cliente", selCli));
      grid.appendChild(fld("Tipo (Obrigação Anual)", selTipo));
      grid.appendChild(fld("Exercício (Ano)", selAno));
      grid.appendChild(fld("Situação", selSit));
      grid.appendChild(fld("Prazo", inpPz));
      grid.appendChild(fld("Anexo (PDF/recibo · máx 700KB)", inpF));
      card.appendChild(grid);
      var bLanc = elx("button", { textContent: "📤 Lançar / Enviar ao Cliente" }, "margin-top:14px;background:#2b6fff;color:#fff;border:0;border-radius:9px;padding:10px 16px;font-weight:800;cursor:pointer");
      card.appendChild(bLanc);
      anu.appendChild(card);
      var lst = elx("div", { id: "oba-lista" }, "margin-top:14px");
      anu.appendChild(lst);

      page.insertBefore(bar, page.firstChild);
      page.appendChild(anu);

      function show(w) {
        orig.forEach(function (c) { c.style.display = (w === "m") ? "" : "none"; });
        anu.style.display = (w === "a") ? "" : "none";
        bM.style.cssText = styBtn(w === "m"); bA.style.cssText = styBtn(w === "a");
        if (w === "a") { carregarClientesAnu(); renderLista(); }
      }
      bM.onclick = function () { show("m"); };
      bA.onclick = function () { show("a"); };

      function baixar(id) {
        db.collection("obrigacoesAnuais").doc(id).get().then(function (d) {
          var x = d.data() || {};
          if (!x.arquivoData) { alert("Esta obrigação ainda não tem anexo."); return; }
          obBaixar(x.arquivoNome, x.arquivoData);
        });
      }
      function anexar(id) {
        var inp = elx("input", { type: "file", accept: ".pdf,.xml,.png,.jpg,.jpeg" });
        inp.onchange = function () {
          var f = inp.files && inp.files[0]; if (!f) return;
          if (f.size > OB_MAX) { alert("Anexo muito grande (máx 700 KB)."); return; }
          var fr = new FileReader();
          fr.onload = function () {
            db.collection("obrigacoesAnuais").doc(id).set({ arquivoData: String(fr.result), arquivoNome: f.name, arquivoEm: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).then(function () { alert("Anexo salvo! O cliente já pode baixar."); });
          };
          fr.readAsDataURL(f);
        };
        inp.click();
      }
      function editar(id, x) {
        selCli.value = x.cliente || ""; selTipo.value = x.tipo || ""; selAno.value = x.exercicio || ""; selSit.value = x.situacao || "";
        inpPz.value = x.prazo || ""; anu.__editId = id;
        card.scrollIntoView({ block: "center" });
      }
      function renderLista() {
        db.collection("obrigacoesAnuais").get().then(function (snap) {
          var arr = []; snap.forEach(function (d) { arr.push({ id: d.id, x: d.data() }); });
          arr.sort(function (a, b) { return String(b.x.cliente || "") < String(a.x.cliente || "") ? 1 : -1; });
          lst.innerHTML = "";
          var tbl = elx("table", null, "width:100%;border-collapse:collapse;font-size:13px");
          var th = "padding:8px;border:1px solid rgba(255,255,255,.12);text-align:left;background:#1a1a3a;color:#9fb0e8";
          tbl.innerHTML = "<tr><th style='" + th + "'>Cliente</th><th style='" + th + "'>Obrigação</th><th style='" + th + "'>Ano</th><th style='" + th + "'>Situação</th><th style='" + th + "'>Ação</th></tr>";
          arr.forEach(function (it) {
            var x = it.x, tr = elx("tr");
            function td(html, c) { var e = elx("td"); e.style.cssText = "padding:8px;border:1px solid rgba(255,255,255,.12)" + (c ? ";text-align:center" : ""); e.innerHTML = html; return e; }
            tr.appendChild(td(x.cliente || ""));
            tr.appendChild(td(x.tipo || ""));
            tr.appendChild(td(x.exercicio || "", true));
            tr.appendChild(td("<span style='background:rgba(57,255,20,.15);color:#8affb0;padding:3px 8px;border-radius:20px;font-size:11px'>" + (x.situacao || "") + "</span>", true));
            var ac = td("", true);
            [["✏️ Editar", function () { editar(it.id, x); }], ["🗑️ Excluir", function () { if (confirm("Excluir esta obrigação anual?")) db.collection("obrigacoesAnuais").doc(it.id).delete().then(renderLista); }], ["📎 Anexar", function () { anexar(it.id); }], ["⬇ Baixar", function () { baixar(it.id); }]].forEach(function (p) {
              var b = elx("button", { textContent: p[0] }, "margin:0 2px;background:#1b2f6a;color:#fff;border:0;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:11px");
              b.onclick = p[1]; ac.appendChild(b);
            });
            tr.appendChild(ac);
            tbl.appendChild(tr);
          });
          lst.appendChild(tbl);
        }).catch(function () { lst.innerHTML = "<div style='color:#ffd3e0'>Erro ao carregar.</div>"; });
      }

      bLanc.onclick = function () {
        var dados = { cliente: selCli.value, tipo: selTipo.value, exercicio: selAno.value, situacao: selSit.value, prazo: inpPz.value || "", atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() };
        var f = inpF.files && inpF.files[0];
        function persist(extra) {
          var payload = {}; for (var k in dados) payload[k] = dados[k]; if (extra) for (var k2 in extra) payload[k2] = extra[k2];
          var eid = anu.__editId;
          if (eid) { db.collection("obrigacoesAnuais").doc(eid).set(payload, { merge: true }).then(function () { anu.__editId = null; alert("Atualizado!"); inpF.value = ""; renderLista(); }); }
          else { payload.criadoEm = firebase.firestore.FieldValue.serverTimestamp(); db.collection("obrigacoesAnuais").add(payload).then(function () { alert("Lançado! O cliente já pode visualizar."); inpF.value = ""; renderLista(); }); }
        }
        if (f) { if (f.size > OB_MAX) { alert("Anexo muito grande (máx 700 KB)."); return; } var fr = new FileReader(); fr.onload = function () { persist({ arquivoData: String(fr.result), arquivoNome: f.name }); }; fr.readAsDataURL(f); }
        else persist();
      };

      show("m");
    } catch (e) {}
  }

  function enhanceObrigAnuaisClient() {
    try {
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var pag = document.getElementById("ap-obrig");
      if (!pag) return;
      var u = firebase.auth().currentUser;
      if (!u || u.email === ADMIN_EMAIL) return;
      if (pag.getAttribute("data-apanu") === "1") return;
      pag.setAttribute("data-apanu", "1");
      var db = firebase.firestore();
      db.collection("usuarios").doc(u.uid).get().then(function (ud) {
        var nome = (ud.data() || {}).clienteNome || "";
        if (!nome) return;
        return db.collection("obrigacoesAnuais").where("cliente", "==", nome).get().then(function (snap) {
          if (snap.empty) return;
          var box = elx("div", { id: "ap-obrig-anuais" }, "margin:14px 0;padding:13px;border-radius:14px;background:linear-gradient(135deg,#1b3a8f,#11224f);border:1px solid rgba(120,160,255,.22)");
          box.appendChild(elx("div", { textContent: "🗓️ Minhas Obrigações Anuais" }, "font-weight:800;color:#fff;margin-bottom:8px;font-size:14px"));
          snap.forEach(function (d) {
            var x = d.data();
            var row = elx("div", null, "display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;margin-top:7px;border-radius:10px;background:rgba(0,0,0,.28)");
            var lbl = elx("div", { innerHTML: "<b>" + (x.tipo || "") + " " + (x.exercicio || "") + "</b><br><span style='color:#c3d0f5'>" + (x.situacao || "") + (x.arquivoNome ? " · " + x.arquivoNome : "") + "</span>" }, "font-size:12px;color:#dfe6ff;line-height:1.3");
            row.appendChild(lbl);
            if (x.arquivoData) {
              var btn = elx("button", { textContent: "⬇ Baixar" }, "background:#2b6fff;color:#fff;border:0;border-radius:9px;padding:7px 13px;font-weight:700;cursor:pointer;white-space:nowrap");
              btn.onclick = function () { obBaixar(x.arquivoNome, x.arquivoData); };
              row.appendChild(btn);
            } else {
              row.appendChild(elx("span", { textContent: "aguardando" }, "color:#9fb0e8;font-size:12px"));
            }
            box.appendChild(row);
          });
          pag.insertBefore(box, pag.firstChild);
        });
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- INIT ---------- */
  function init() {
    if (!(window.firebase && firebase.apps && firebase.apps.length)) { setTimeout(init, 300); return; }
    removeStrays(); setTimeout(removeStrays, 500); setTimeout(removeStrays, 1500);
    setInterval(enhanceObrigOffice, 2000);
    setInterval(enhanceObrigClient, 3000);
    setInterval(setupObrigAnuais, 2500);
    setInterval(enhanceObrigAnuaisClient, 3500);
    expandFatMonths();
    [600, 1800, 4000].forEach(function (t) { setTimeout(expandFatMonths, t); });
    setInterval(expandFatMonths, 3000);
    setupObrigacoes();
    [700, 2000, 4500].forEach(function (t) { setTimeout(setupObrigacoes, t); });
    setInterval(setupObrigacoes, 4000);
    setSecretaryAvatar();
    [400, 1200, 2500, 5000].forEach(function (t) { setTimeout(setSecretaryAvatar, t); });
    markExtratoUpload();
    document.addEventListener("click", function () { setTimeout(markExtratoUpload, 250); }, true);
    [800, 2500].forEach(function (t) { setTimeout(markExtratoUpload, t); });
    setupInstall();
    var sel = document.getElementById("docs-cli-sel");
    if (sel) {
      sel.addEventListener("change", officeRender);
      // atualiza a lista de clientes toda vez que o Daniel abre/toca o seletor
      sel.addEventListener("mousedown", fillClientSelect);
      sel.addEventListener("focus", fillClientSelect);
    }
    var atu = document.getElementById("btn-save-docs");
    if (atu) atu.onclick = function () { fillClientSelect(); officeRender(); };
    // atualiza a lista ao abrir a aba "Arquivos" dos Documentos Seguros
    var tabArq = document.getElementById("ds-tab-btn-links");
    if (tabArq) tabArq.addEventListener("click", function () { setTimeout(fillClientSelect, 120); });
    var prev = document.getElementById("ds-prev-sel");
    if (prev) prev.addEventListener("change", previewInIframe);
    // se existir botao de criar acesso do cliente, atualiza a lista depois
    var btnAcesso = document.getElementById("btn-criar-acesso") || document.getElementById("acesso-btn");
    if (btnAcesso) btnAcesso.addEventListener("click", function () { setTimeout(fillClientSelect, 1500); });
    window.carregarDocsSeguro = officeRender;
    window.carregarDocsCliente = clientRender;
    setupCarousel();
    injectQuickCards();
    setTimeout(injectQuickCards, 800);
    setTimeout(injectQuickCards, 2200);
    var navDash = [].slice.call(document.querySelectorAll(".sidebar .nav-item, .sidebar .ni")).filter(function (e) { return e.textContent.indexOf("Dashboard") >= 0; })[0];
    if (navDash) navDash.addEventListener("click", function () { setTimeout(injectQuickCards, 200); });
    var nbHome = document.getElementById("nb-home");
    if (nbHome) nbHome.addEventListener("click", function () { setTimeout(injectClientCards, 200); });
    var nb = document.getElementById("nb-docs");
    if (nb) nb.addEventListener("click", function () { setTimeout(clientRender, 350); });

    function afterAuth() {
      var u = firebase.auth().currentUser;
      var isAdmin = u && (u.email === ADMIN_EMAIL);
      if (isAdmin) { fillClientSelect(); }
      else if (u) {
        clientRender(); CAR.cache = null; setTimeout(function () { carRender(0); }, 300);
        injectClientCards(); setTimeout(injectClientCards, 800); setTimeout(injectClientCards, 2200);
      }
    }
    afterAuth();
    firebase.auth().onAuthStateChanged(afterAuth);
    console.log("[aparat-fix] v3.1 (UID + carrossel) carregado");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

;(function(){
  if(window.__APARAT_NAV_FIX__) return; window.__APARAT_NAV_FIX__=1;
  function fixClientCardsNav(){
    try{
      if(typeof window.aPage!=='function') return;
      var map={fat:'financeiro',dados:'perfil',hon:'honorarios',obr:'obrig',doc:'docs',inf:'urgencias',notas:'docs'};
      var btns=document.querySelectorAll('.cli-atalhos > button');
      for(var i=0;i<btns.length;i++){
        var b=btns[i];
        if(b.getAttribute('data-apnav')==='1') continue;
        var oc=b.getAttribute('onclick')||'';
        var m=oc.match(/abrirCli\(['"]([a-z]+)['"]\)/);
        if(!m) continue;
        var key=m[1];
        b.setAttribute('data-apnav','1');
        if(key==='age'){ b.style.display='none'; continue; }
        var target=map[key];
        if(!target) continue;
        b.removeAttribute('onclick');
        (function(t,orig,btn){
          btn.addEventListener('click',function(ev){ ev.preventDefault(); try{ window.aPage(t); }catch(e){ try{ window.abrirCli(orig); }catch(e2){} } });
        })(target,key,b);
      }
    }catch(e){}
  }
  [500,1500,3000].forEach(function(t){ setTimeout(fixClientCardsNav,t); });
  setInterval(fixClientCardsNav,3000);
})();

/* ===== APARAT: Gestao de Honorarios REAL (mes selecionavel + total anual) ===== */
;(function () {
  if (window.__APARAT_HON_GESTAO__) return; window.__APARAT_HON_GESTAO__ = 1;
  var MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  var ABREV = { jan:0, fev:1, mar:2, abr:3, mai:4, jun:5, jul:6, ago:7, set:8, out:9, nov:10, dez:11 };
  function num(v) {
    try { if (typeof _num === "function") return _num(v); } catch (e) {}
    v = String(v == null ? "" : v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
    var n = parseFloat(v); return isNaN(n) ? 0 : n;
  }
  function money(n) { return "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pad(m) { return (m < 10 ? "0" : "") + m; }
  function compDe(h) {
    var r = String(h.referencia || "").toLowerCase();
    var m = r.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*[\s\/\-]*(\d{4})/);
    if (m) return m[2] + "-" + pad(ABREV[m[1]] + 1);
    m = r.match(/(\d{4})-(\d{1,2})/); if (m) return m[1] + "-" + pad(parseInt(m[2], 10));
    m = r.match(/(\d{1,2})[\s\/\-](\d{4})/); if (m) return m[2] + "-" + pad(parseInt(m[1], 10));
    m = String(h.vencimento || "").match(/(\d{4})-(\d{2})/); if (m) return m[1] + "-" + m[2];
    return "";
  }
  function ehPago(h) { return /pago/i.test(h.status || ""); }
  function recebidoDe(h) { return (h.valorRecebido != null && h.valorRecebido !== "") ? Number(h.valorRecebido) : num(h.valor); }
  var DADOS = [];
  var MES_SEL = (function () { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1); })();

  function montaOpcoes(sel) {
    var comps = {};
    DADOS.forEach(function (it) { var c = compDe(it.x); if (c) comps[c] = 1; });
    var hoje = new Date();
    for (var y = 2025; y <= hoje.getFullYear() + 1; y++) for (var m = 1; m <= 12; m++) comps[y + "-" + pad(m)] = 1;
    var lista = Object.keys(comps).sort().reverse();
    sel.innerHTML = "";
    lista.forEach(function (c) {
      var p = c.split("-");
      var o = document.createElement("option");
      o.value = c; o.textContent = MESES[parseInt(p[1], 10) - 1] + " " + p[0];
      sel.appendChild(o);
    });
    sel.value = MES_SEL;
    if (!sel.value) { sel.value = lista[0] || ""; MES_SEL = sel.value; }
  }

  function render() {
    var page = document.getElementById("pp-honorarios"); if (!page) return;
    var card = page.querySelector(".hon-card"); if (!card) return;
    var wrap = document.getElementById("hg-wrap");
    if (!wrap) {
      card.innerHTML = "";
      wrap = document.createElement("div"); wrap.id = "hg-wrap";
      card.appendChild(wrap);
      wrap.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
        + '<div class="hon-title">💳 Gestão de Honorários</div>'
        + '<select id="hg-mes" style="background:#0a0a20;border:1px solid var(--border,#222248);border-radius:9px;color:#fff;padding:8px 12px;font-size:13px;font-weight:700"></select>'
        + "</div>"
        + '<div id="hg-stats"></div>'
        + '<div id="hg-anual" style="margin:10px 0;padding:10px 12px;border-radius:10px;background:rgba(51,51,255,.08);border:1px solid rgba(51,51,255,.25);font-size:12px;color:#cfd8ff"></div>'
        + '<div id="hg-lista"></div>';
      var sel = wrap.querySelector("#hg-mes");
      montaOpcoes(sel);
      sel.addEventListener("change", function () { MES_SEL = sel.value; render(); });
    }
    var sel2 = wrap.querySelector("#hg-mes");
    if (sel2 && sel2.options.length === 0) montaOpcoes(sel2);

    var doMes = DADOS.filter(function (it) { return compDe(it.x) === MES_SEL; });
    var rec = 0, pen = 0;
    doMes.forEach(function (it) { if (ehPago(it.x)) rec += recebidoDe(it.x); else pen += num(it.x.valor); });
    var ano = MES_SEL.split("-")[0], recA = 0, penA = 0;
    DADOS.forEach(function (it) {
      if (compDe(it.x).indexOf(ano + "-") !== 0) return;
      if (ehPago(it.x)) recA += recebidoDe(it.x); else penA += num(it.x.valor);
    });
    function tile(cor, borda, rot, val, corTx) {
      return '<div style="background:' + cor + ';border:1px solid ' + borda + ';border-radius:9px;padding:10px;text-align:center">'
        + '<div style="font-size:9px;color:var(--cinza,#9090b8)">' + rot + "</div>"
        + '<div style="font-size:16px;font-weight:800;color:' + corTx + '">' + val + "</div></div>";
    }
    document.getElementById("hg-stats").innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
      + tile("rgba(34,197,94,.1)", "rgba(34,197,94,.2)", "Recebido no mês", money(rec), "var(--verde,#22c55e)")
      + tile("rgba(245,158,11,.1)", "rgba(245,158,11,.2)", "Pendente no mês", money(pen), "var(--laranja,#f59e0b)")
      + tile("rgba(51,51,255,.1)", "rgba(51,51,255,.2)", "Total do mês", money(rec + pen), "var(--azul-light,#7fa0ff)")
      + "</div>";
    document.getElementById("hg-anual").innerHTML =
      "📆 <b>Total anual " + ano + ":</b> recebido <b style='color:var(--verde,#22c55e)'>" + money(recA)
      + "</b> · pendente <b style='color:var(--laranja,#f59e0b)'>" + money(penA)
      + "</b> · total <b style='color:var(--azul-light,#7fa0ff)'>" + money(recA + penA) + "</b>";

    var lst = document.getElementById("hg-lista");
    if (!doMes.length) { lst.innerHTML = '<div style="font-size:11px;color:var(--cinza,#9090b8);padding:6px 0">Nenhum honorário lançado neste mês. Use o formulário abaixo para lançar.</div>'; return; }
    var esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var html = "";
    doMes.forEach(function (it) {
      var h = it.x, pago = ehPago(h);
      html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 10px;margin-top:7px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid var(--border,#222248)">'
        + '<span style="flex:1;min-width:130px;font-size:12px;color:#fff;font-weight:700">' + esc2(h.cliente || "") + "</span>"
        + '<span style="font-size:12px;color:#cfd8ff">' + (pago ? money(recebidoDe(h)) : money(num(h.valor))) + "</span>"
        + '<span class="tag ' + (pago ? "tp" : "tn") + '">' + (pago ? "Pago ✔" : esc2(h.status || "Pendente")) + "</span>"
        + '<button class="btn-sm" onclick="togglePago(\'' + it.id + '\')">' + (pago ? "↩ Pendente" : "✔ Pago") + "</button>"
        + (pago ? '<button class="btn-sm" onclick="editarRecebido(\'' + it.id + '\')">💲 Recebido</button>' : "")
        + '<button class="btn-sm" onclick="editarHonorario(\'' + it.id + '\')">✏️ Editar</button>'
        + "</div>";
    });
    lst.innerHTML = html;
  }

  function melhoraCampoRef() {
    try {
      var ref = document.getElementById("hon-ref");
      if (!ref || document.getElementById("hg-refmes")) return;
      var mi = document.createElement("input");
      mi.type = "month"; mi.id = "hg-refmes";
      mi.style.cssText = "width:100%;margin-top:5px;background:#0a0a20;border:1px solid var(--border,#222248);border-radius:8px;color:#fff;padding:7px 10px;font-size:12px";
      mi.addEventListener("change", function () {
        if (!mi.value) return;
        var p = mi.value.split("-");
        ref.value = MESES[parseInt(p[1], 10) - 1] + "/" + p[0];
      });
      ref.parentNode.appendChild(mi);
      ref.placeholder = "Escolha o mês abaixo ou digite (Ex: Julho/2025)";
    } catch (e) {}
  }

  window.__APARAT_HON_TEST__ = function (arr) { DADOS = arr || []; render(); };

  function boot() {
    try {
      if (window.__APARAT_HON_GESTAO__ === 2) return;
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var u = firebase.auth().currentUser; if (!u) return;
      if (typeof ADMIN_EMAIL !== "undefined" && u.email !== ADMIN_EMAIL) return;
      if (!document.getElementById("pp-honorarios")) return;
      window.__APARAT_HON_GESTAO__ = 2;
      firebase.firestore().collection("honorarios").onSnapshot(function (s) {
        var a = []; s.forEach(function (d) { a.push({ id: d.id, x: d.data() }); });
        DADOS = a; render();
      }, function () {});
      melhoraCampoRef();
      setInterval(melhoraCampoRef, 4000);
    } catch (e) {}
  }
  [1500, 3500, 7000].forEach(function (t) { setTimeout(boot, t); });
  setInterval(boot, 5000);
})();

/* ===== APARAT ESCRITORIO: Faturamento unico com gestao + grafico 3D neon ===== */
;(function () {
  if (window.__APARAT_FATADM__) return; window.__APARAT_FATADM__ = 1;
  var MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  var MAB = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  function num(v) {
    v = String(v == null ? "" : v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
    var n = parseFloat(v); return isNaN(n) ? 0 : n;
  }
  function money(n) { return "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function kf(n) {
    var neg = n < 0; n = Math.abs(n);
    var s;
    if (n >= 1000000) s = (n / 1000000).toFixed(1).replace(".", ",") + "M";
    else if (n >= 1000) s = (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",") + "k";
    else s = String(Math.round(n));
    return (neg ? "-" : "") + s;
  }
  function pad(m) { return (m < 10 ? "0" : "") + m; }
  function rot(m) { var p = String(m || "").split("-"); return (MAB[parseInt(p[1], 10) - 1] || ""); }
  function barra3d(x, y0, h, w, d, grad, filtro, corTopo, corLado) {
    var y = y0 - h;
    return '<polygon points="' + x + "," + y + " " + (x + d) + "," + (y - d) + " " + (x + w + d) + "," + (y - d) + " " + (x + w) + "," + y + '" fill="' + corTopo + '"/>'
      + '<polygon points="' + (x + w) + "," + y + " " + (x + w + d) + "," + (y - d) + " " + (x + w + d) + "," + (y0 - d) + " " + (x + w) + "," + y0 + '" fill="' + corLado + '"/>'
      + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.5" fill="url(#' + grad + 'A)" filter="url(#' + filtro + 'A)"/>';
  }
  function grafico(meses) {
    var W = 640, H = 210, y0 = 158, d = 6, w = 22;
    var maxv = 1;
    meses.forEach(function (m) { maxv = Math.max(maxv, m.fat, m.desp, m.fat - m.desp); });
    var gw = W / meses.length;
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;display:block;max-width:700px">'
      + "<defs>"
      + '<linearGradient id="gfatA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb2ff"/><stop offset="1" stop-color="#2145c9"/></linearGradient>'
      + '<linearGradient id="gdespA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c"/><stop offset="1" stop-color="#c9541e"/></linearGradient>'
      + '<linearGradient id="gresA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dffb0"/><stop offset="1" stop-color="#0e9c4f"/></linearGradient>'
      + '<filter id="nfatA" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="#4d82ff" flood-opacity="0.9"/></filter>'
      + '<filter id="ndespA" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="#ff9b45" flood-opacity="0.85"/></filter>'
      + '<filter id="nresA" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="2.8" flood-color="#39ff88" flood-opacity="0.95"/></filter>'
      + "</defs>";
    for (var g = 1; g <= 3; g++) {
      var gy = y0 - (g * 40);
      s += '<line x1="6" y1="' + gy + '" x2="' + (W - 6) + '" y2="' + gy + '" stroke="#28285a" stroke-width="0.8" stroke-dasharray="4 5"/>';
    }
    s += '<line x1="6" y1="' + y0 + '" x2="' + (W - 6) + '" y2="' + y0 + '" stroke="#3a3a7a" stroke-width="1.2"/>';
    meses.forEach(function (m, i) {
      var res = m.fat - m.desp;
      var hf = Math.max(3, Math.round(m.fat / maxv * 112));
      var hd = Math.max(3, Math.round(m.desp / maxv * 112));
      var hr = Math.max(3, Math.round(Math.max(0, res) / maxv * 112));
      var cx = i * gw + gw / 2;
      var xf = cx - 38, xd = cx - 11, xr = cx + 16;
      s += barra3d(xf, y0, hf, w, d, "gfat", "nfat", "#a9c8ff", "#16308f");
      s += barra3d(xd, y0, hd, w, d, "gdesp", "ndesp", "#ffd0a0", "#8f3a12");
      s += barra3d(xr, y0, hr, w, d, "gres", "nres", "#b7ffd2", "#086b36");
      s += '<text x="' + (xf + w / 2 + d / 2) + '" y="' + (y0 - hf - d - 5) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#cfe0ff">' + kf(m.fat) + "</text>";
      s += '<text x="' + (xr + w / 2 + d / 2) + '" y="' + (y0 - hr - d - 5) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#8affb0">' + kf(res) + "</text>";
      s += '<text x="' + cx + '" y="' + (y0 + 20) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#9090b8">' + rot(m.mesRef) + "</text>";
    });
    s += "</svg>";
    s += '<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:11px;color:#c3d0f5">'
      + '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:linear-gradient(#7fb2ff,#2145c9);box-shadow:0 0 7px #4d82ff;margin-right:5px"></span>Faturamento</span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:linear-gradient(#ffb35c,#c9541e);box-shadow:0 0 7px #ff9b45;margin-right:5px"></span>Despesas</span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:linear-gradient(#7dffb0,#0e9c4f);box-shadow:0 0 8px #39ff88;margin-right:5px"></span>Resultado</span>'
      + "</div>";
    return s;
  }

  var REGS = [];
  var CLI_SEL = "", MES_SEL = (function () { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1); })();

  function filtrados() {
    return REGS.filter(function (r) { return !CLI_SEL || r.cliente === CLI_SEL; });
  }
  function porMes(regs) {
    var mp = {};
    regs.forEach(function (r) {
      var m = String(r.mesRef || ""); if (!/^\d{4}-\d{2}$/.test(m)) return;
      if (!mp[m]) mp[m] = { mesRef: m, fat: 0, desp: 0 };
      mp[m].fat += num(r.faturamento); mp[m].desp += num(r.despesa);
    });
    return Object.keys(mp).sort().map(function (k) { return mp[k]; });
  }

  function render() {
    var page = document.getElementById("pp-faturamento"); if (!page) return;
    var wrap = document.getElementById("fadm-wrap");
    if (!wrap) {
      wrap = document.createElement("div"); wrap.id = "fadm-wrap";
      wrap.style.cssText = "background:#12122a;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:14px";
      page.insertBefore(wrap, page.firstChild);
      wrap.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
        + '<div style="color:#7fa0ff;font-weight:800;font-size:15px">📈 Gestão de Faturamento</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '<select id="fadm-cli" style="background:#0a0a20;border:1px solid #222248;border-radius:9px;color:#fff;padding:8px 12px;font-size:13px;font-weight:700"></select>'
        + '<select id="fadm-mes" style="background:#0a0a20;border:1px solid #222248;border-radius:9px;color:#fff;padding:8px 12px;font-size:13px;font-weight:700"></select>'
        + "</div></div>"
        + '<div id="fadm-stats"></div>'
        + '<div id="fadm-anual" style="margin:10px 0;padding:10px 12px;border-radius:10px;background:rgba(51,51,255,.08);border:1px solid rgba(51,51,255,.25);font-size:12px;color:#cfd8ff"></div>'
        + '<div id="fadm-chart" style="padding:6px 2px 2px"></div>';
      wrap.querySelector("#fadm-cli").addEventListener("change", function () { CLI_SEL = this.value; render(); });
      wrap.querySelector("#fadm-mes").addEventListener("change", function () { MES_SEL = this.value; render(); });
    }
    var selC = wrap.querySelector("#fadm-cli"), selM = wrap.querySelector("#fadm-mes");
    var nomes = {};
    REGS.forEach(function (r) { if (r.cliente) nomes[r.cliente] = 1; });
    var atualC = selC.value;
    selC.innerHTML = '<option value="">Todos os clientes</option>';
    Object.keys(nomes).sort().forEach(function (n) {
      var o = document.createElement("option"); o.value = n; o.textContent = n; selC.appendChild(o);
    });
    selC.value = atualC || CLI_SEL || "";
    var comps = {};
    REGS.forEach(function (r) { if (/^\d{4}-\d{2}$/.test(String(r.mesRef || ""))) comps[r.mesRef] = 1; });
    var hoje = new Date();
    for (var mm = 1; mm <= 12; mm++) comps[hoje.getFullYear() + "-" + pad(mm)] = 1;
    var lista = Object.keys(comps).sort().reverse();
    selM.innerHTML = "";
    lista.forEach(function (c) {
      var p = c.split("-");
      var o = document.createElement("option"); o.value = c; o.textContent = MESES[parseInt(p[1], 10) - 1] + " " + p[0];
      selM.appendChild(o);
    });
    selM.value = MES_SEL; if (!selM.value) { selM.value = lista[0] || ""; MES_SEL = selM.value; }

    var fr = filtrados();
    var doMes = fr.filter(function (r) { return r.mesRef === MES_SEL; });
    var fm = 0, dm = 0;
    doMes.forEach(function (r) { fm += num(r.faturamento); dm += num(r.despesa); });
    var ano = MES_SEL.split("-")[0], fa = 0, da = 0;
    fr.forEach(function (r) { if (String(r.mesRef || "").indexOf(ano + "-") === 0) { fa += num(r.faturamento); da += num(r.despesa); } });
    function tile(bg, bd, rot2, val, cor, glow) {
      return '<div style="background:' + bg + ';border:1px solid ' + bd + ';border-radius:10px;padding:12px;text-align:center;box-shadow:0 0 12px ' + glow + '">'
        + '<div style="font-size:10px;color:#9090b8">' + rot2 + "</div>"
        + '<div style="font-size:18px;font-weight:800;color:' + cor + ';text-shadow:0 0 8px ' + glow + '">' + val + "</div></div>";
    }
    document.getElementById("fadm-stats").innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px">'
      + tile("rgba(51,51,255,.10)", "rgba(77,130,255,.35)", "Faturamento no mês", money(fm), "#7fb2ff", "rgba(77,130,255,.35)")
      + tile("rgba(245,158,11,.08)", "rgba(255,155,69,.3)", "Despesas no mês", money(dm), "#ffb35c", "rgba(255,155,69,.25)")
      + tile("rgba(34,197,94,.08)", "rgba(57,255,136,.3)", "Resultado no mês", money(fm - dm), "#7dffb0", "rgba(57,255,136,.3)")
      + "</div>";
    document.getElementById("fadm-anual").innerHTML =
      "📆 <b>Total anual " + ano + (CLI_SEL ? " — " + CLI_SEL : " — todos os clientes") + ":</b> faturamento <b style='color:#7fb2ff'>" + money(fa)
      + "</b> · despesas <b style='color:#ffb35c'>" + money(da)
      + "</b> · resultado <b style='color:#7dffb0'>" + money(fa - da) + "</b>";
    var meses = porMes(fr).slice(-6);
    document.getElementById("fadm-chart").innerHTML = meses.length
      ? grafico(meses)
      : '<div style="font-size:11px;color:#9090b8;padding:6px 0">Sem lançamentos para montar o gráfico.</div>';
  }

  function esconderFinanceiro() {
    try {
      var itens = document.querySelectorAll(".nav-item");
      for (var i = 0; i < itens.length; i++) {
        var oc = itens[i].getAttribute("onclick") || "";
        if (oc.indexOf("navAba('financeiro'") > -1 && itens[i].style.display !== "none") itens[i].style.display = "none";
      }
      var secs = document.querySelectorAll(".nav-sec");
      for (var j = 0; j < secs.length; j++) {
        if ((secs[j].textContent || "").trim() === "Financeiro") secs[j].textContent = "Documentos";
      }
    } catch (e) {}
  }

  window.__APARAT_FATADM_TEST__ = function (arr) { REGS = arr || []; render(); esconderFinanceiro(); };

  function boot() {
    try {
      if (window.__APARAT_FATADM__ === 2) return;
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var u = firebase.auth().currentUser; if (!u) return;
      if (typeof ADMIN_EMAIL !== "undefined" && u.email !== ADMIN_EMAIL) return;
      if (!document.getElementById("pp-faturamento")) return;
      window.__APARAT_FATADM__ = 2;
      esconderFinanceiro();
      if (!document.getElementById("ap-bot-fix-adm")) {
        var st = document.createElement("style"); st.id = "ap-bot-fix-adm";
        st.textContent = ".apbot{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}";
        document.head.appendChild(st);
      }
      setInterval(esconderFinanceiro, 4000);
      firebase.firestore().collection("faturamento").onSnapshot(function (s) {
        var a = []; s.forEach(function (d) { var x = d.data(); x.__id = d.id; a.push(x); });
        REGS = a; render();
      }, function () {});
    } catch (e) {}
  }
  [1500, 3500, 7000].forEach(function (t) { setTimeout(boot, t); });
  setInterval(boot, 5000);
})();

/* ===== APARAT: TODOS os clientes em TODOS os seletores do escritorio ===== */
;(function () {
  if (window.__APARAT_CLISEL__) return; window.__APARAT_CLISEL__ = 1;
  var NOMES = {};
  var DEMO = { "Mercearia Silva ME": 1, "Tech Soluções LTDA": 1, "Clínica Bem Estar": 1, "Padaria Gostosa ME": 1 };
  var IDS = ["ob-cli", "hon-cli", "nf-cli", "dad-cli", "fat-cli", "ag-cli", "doc-cli", "acc-cli", "oba-cli", "urg-dest", "docs-cli-sel", "fin-cli", "ped-cli"];
  function coletar(db) {
    var specs = [["clientes", "nome"], ["dados", "cliente"], ["faturamento", "cliente"], ["honorarios", "cliente"], ["obrigacoes", "cliente"], ["usuarios", "clienteNome"]];
    specs.forEach(function (sp) {
      db.collection(sp[0]).get().then(function (s) {
        s.forEach(function (d) {
          var n = String((d.data() || {})[sp[1]] || "").trim();
          if (n && n !== "Todos os Clientes") NOMES[n] = 1;
        });
      }).catch(function () {});
    });
  }
  function aplicar() {
    try {
      var lista = Object.keys(NOMES).sort(function (a, b) { return a.localeCompare(b); });
      if (!lista.length) return;
      IDS.forEach(function (id) {
        var s = document.getElementById(id); if (!s) return;
        [].slice.call(s.options).forEach(function (o) {
          if (DEMO[o.value] && !NOMES[o.value] && s.value !== o.value) s.removeChild(o);
        });
        var have = {};
        [].forEach.call(s.options, function (o) { have[o.value] = 1; });
        lista.forEach(function (n) {
          if (!have[n]) { var o = document.createElement("option"); o.value = n; o.textContent = n; s.appendChild(o); }
        });
      });
    } catch (e) {}
  }
  window.__APARAT_CLISEL_TEST__ = function (nomes) { (nomes || []).forEach(function (n) { NOMES[n] = 1; }); aplicar(); };
  function boot() {
    try {
      if (window.__APARAT_CLISEL__ === 2) return;
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var u = firebase.auth().currentUser; if (!u) return;
      if (typeof ADMIN_EMAIL !== "undefined" && u.email !== ADMIN_EMAIL) return;
      window.__APARAT_CLISEL__ = 2;
      coletar(firebase.firestore());
      setInterval(function () { coletar(firebase.firestore()); }, 120000);
      setInterval(aplicar, 3000);
      [1000, 2500, 5000].forEach(function (t) { setTimeout(aplicar, t); });
    } catch (e) {}
  }
  [1500, 3500, 7000].forEach(function (t) { setTimeout(boot, t); });
  setInterval(boot, 5000);
})();

/* ===== APARAT: migrar lancamentos do antigo Financeiro para o Faturamento ===== */
;(function () {
  if (window.__APARAT_MIGRA_FIN__) return; window.__APARAT_MIGRA_FIN__ = 1;
  var MMAP = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  function pad(m) { return (m < 10 ? "0" : "") + m; }
  function num(v) {
    if (typeof v === "number") return isNaN(v) ? 0 : v;
    v = String(v == null ? "" : v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
    var n = parseFloat(v); return isNaN(n) ? 0 : n;
  }
  function mesRefDe(comp) {
    var c = String(comp || "").toLowerCase().trim();
    var m = c.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*[\s\/\-]*(\d{4})/);
    if (m) return m[2] + "-" + pad(MMAP[m[1]]);
    m = c.match(/^(\d{4})[\-\/](\d{1,2})$/); if (m) return m[1] + "-" + pad(parseInt(m[2], 10));
    m = c.match(/^(\d{1,2})[\s\/\-](\d{4})$/); if (m) return m[2] + "-" + pad(parseInt(m[1], 10));
    return "";
  }
  function migrar(db) {
    Promise.all([
      db.collection("financeiro").get(),
      db.collection("faturamento").get(),
      db.collection("clientes").get()
    ]).then(function (r) {
      var have = {};
      r[1].forEach(function (d) { var x = d.data() || {}; have[String(x.cliente || "") + "|" + String(x.mesRef || "")] = 1; });
      var regime = {};
      r[2].forEach(function (d) { var x = d.data() || {}; if (x.nome) regime[x.nome] = x.regime || ""; });
      var feitos = 0, marcados = 0, cadeia = Promise.resolve();
      r[0].forEach(function (d) {
        var x = d.data() || {};
        if (x.migradoFaturamento) return;
        var mes = mesRefDe(x.competencia);
        var nome = String(x.cliente || "").trim();
        cadeia = cadeia.then(function () {
          var ops = [];
          if (nome && mes && !have[nome + "|" + mes]) {
            have[nome + "|" + mes] = 1;
            var rec = num(x.receita), desp = num(x.despesa);
            ops.push(db.collection("faturamento").add({
              cliente: nome, mesRef: mes,
              tipo: /mei/i.test(regime[nome] || "") ? "MEI" : "ME",
              faturamento: rec.toFixed(2).replace(".", ","),
              despesa: desp.toFixed(2).replace(".", ","),
              origem: "migrado-financeiro",
              criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
              atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function () { feitos++; }));
          }
          ops.push(d.ref.set({ migradoFaturamento: true }, { merge: true }).then(function () { marcados++; }));
          return Promise.all(ops);
        });
      });
      cadeia.then(function () {
        if (feitos > 0 && typeof notif === "function") {
          notif("📈 " + feitos + " lançamento(s) do antigo Financeiro migrados para o Faturamento!", "success");
        }
      }).catch(function () {});
    }).catch(function () {});
  }
  function boot() {
    try {
      if (window.__APARAT_MIGRA_FIN__ === 2) return;
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var u = firebase.auth().currentUser; if (!u) return;
      if (typeof ADMIN_EMAIL !== "undefined" && u.email !== ADMIN_EMAIL) return;
      window.__APARAT_MIGRA_FIN__ = 2;
      migrar(firebase.firestore());
    } catch (e) {}
  }
  [2000, 5000, 9000].forEach(function (t) { setTimeout(boot, t); });
  setInterval(boot, 6000);
})();

/* ===== APARAT: Secretario virtual avisa novidades dos clientes em tempo real ===== */
;(function () {
  if (window.__APARAT_SECR_AVISO__) return; window.__APARAT_SECR_AVISO__ = 1;
  var COLS = { solicitacoes: "📨 Nova solicitação", enviosCliente: "📎 Novo arquivo", notas: "🧾 Nova nota fiscal" };
  function falar(msg) {
    try {
      if (typeof notif === "function") notif(msg, "warn");
      var s = document.getElementById("sync-msg");
      if (s) s.textContent = "💬 " + msg;
      var bot = document.getElementById("aparat-bot");
      if (bot) { bot.classList.remove("pop"); void bot.offsetWidth; bot.classList.add("pop"); }
    } catch (e) {}
  }
  function boot() {
    try {
      if (window.__APARAT_SECR_AVISO__ === 2) return;
      if (!(window.firebase && firebase.apps && firebase.apps.length)) return;
      var u = firebase.auth().currentUser; if (!u) return;
      if (typeof ADMIN_EMAIL !== "undefined" && u.email !== ADMIN_EMAIL) return;
      window.__APARAT_SECR_AVISO__ = 2;
      var db = firebase.firestore();
      Object.keys(COLS).forEach(function (coll) {
        var primeira = true;
        db.collection(coll).onSnapshot(function (s) {
          if (primeira) { primeira = false; return; }
          s.docChanges().forEach(function (ch) {
            if (ch.type !== "added") return;
            var d = ch.doc.data() || {};
            if (coll === "notas" && String(d.origem || "") !== "cliente") return;
            falar(COLS[coll] + " de " + (d.cliente || "cliente") + "!");
          });
        }, function () {});
      });
    } catch (e) {}
  }
  [2000, 4500, 8000].forEach(function (t) { setTimeout(boot, t); });
  setInterval(boot, 5000);
})();

/* ===== APARAT: Botao ATIVAR NOTIFICACOES no painel do escritorio (admin) ===== */
;(function () {
  if (window.__APARAT_BTN_NOTIF_ADM__) return; window.__APARAT_BTN_NOTIF_ADM__ = 1;
  function tick() {
    try {
      if (!(typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE === "admin")) return;
      if (!("Notification" in window)) return;
      var ok = Notification.permission === "granted";
      var b = document.getElementById("adm-btn-notif");
      if (!b) {
        var pg = document.getElementById("pp-dash"); if (!pg) return;
        b = document.createElement("button"); b.id = "adm-btn-notif";
        b.style.cssText = "width:100%;margin:0 0 12px;border:0;border-radius:10px;padding:13px;font-weight:800;font-size:13px;cursor:pointer;color:#fff";
        b.onclick = function () {
          try { ativarNotificacoes(); } catch (e) {}
          setTimeout(tick, 1500); setTimeout(tick, 4000);
        };
        pg.insertBefore(b, pg.firstChild);
      }
      if (ok) {
        b.textContent = "🔔 Notificações ativadas neste aparelho ✔";
        b.style.background = "#1c8f4e";
      } else if (Notification.permission === "denied") {
        b.textContent = "⚠ Notificações BLOQUEADAS — toque no cadeado 🔒 da barra de endereço → Notificações → Permitir";
        b.style.background = "#c9541e";
      } else {
        b.textContent = "🔔 ATIVAR NOTIFICAÇÕES NESTE APARELHO — toque aqui";
        b.style.background = "#2b6fff";
      }
    } catch (e) {}
  }
  [1500, 3000, 6000].forEach(function (t) { setTimeout(tick, t); });
  setInterval(tick, 4000);
})();

/* ===== Contador inteligente de obrigacoes pendentes (Dashboard) ===== */
(function () {
  if (window.__APARAT_OBRIG_CONT__) return; window.__APARAT_OBRIG_CONT__ = 1;
  var CONCLUIDOS = ["pago", "lancado", "lançado", "recebido", "entregue", "enviado", "enviada ao cliente", "emitida", "emitida pelo escritorio", "emitida pelo escritório", "recebida de fornecedor", "conferida", "dispensado"];
  var MESES = { janeiro: 1, fevereiro: 2, marco: 3, "março": 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
  function p2(n) { return ("0" + n).slice(-2); }
  function mesDe(o) {
    var c = ((o.competencia || o.mesRef || "") + "").trim();
    var m = c.match(/^(\d{1,2})\s*\/\s*(\d{4})$/); if (m) return m[2] + "-" + p2(+m[1]);
    m = c.match(/^(\d{4})-(\d{1,2})/); if (m) return m[1] + "-" + p2(+m[2]);
    m = c.toLowerCase().match(/^([a-zç]+)\s*\/?\s*(\d{4})$/); if (m && MESES[m[1]]) return m[2] + "-" + p2(MESES[m[1]]);
    var v = ((o.vencimento || "") + "").trim();
    m = v.match(/^(\d{4})-(\d{1,2})/); if (m) return m[1] + "-" + p2(+m[2]);
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return m[3] + "-" + p2(+m[2]);
    return "";
  }
  function pendente(o) {
    var s = ((o.status || "") + "").trim().toLowerCase();
    if (!s) return true;
    return CONCLUIDOS.indexOf(s) === -1;
  }
  async function recontar() {
    try {
      if (typeof dbGetAll !== "function") return;
      var el = document.getElementById("dash-obrig"); if (!el) return;
      var os = await dbGetAll("obrigacoes");
      var n = 0;
      (os || []).forEach(function (o) { if (pendente(o)) n++; });
      el.textContent = n;
      var r = document.getElementById("dash-resumo-ob"); if (r) r.textContent = n;
      try { var ks = el.parentElement.querySelector(".ks"); if (ks) ks.textContent = "pendentes de verdade"; } catch (e) {}
    } catch (e) {}
  }
  window.__APARAT_OBRIG_TEST__ = { mesDe: mesDe, pendente: pendente };
  function instalar() {
    if (typeof window.atualizarDashboard !== "function" || window.atualizarDashboard.__apObc) return false;
    var orig = window.atualizarDashboard;
    var novo = async function () { try { await orig.apply(this, arguments); } catch (e) {} await recontar(); };
    novo.__apObc = 1; window.atualizarDashboard = novo;
    recontar();
    return true;
  }
  var tent = 0;
  var iv = setInterval(function () { if (instalar() || ++tent > 60) clearInterval(iv); }, 500);
  setTimeout(recontar, 3000);
  setInterval(recontar, 60000);
})();

/* ===== Alerta de inadimplencia no Dashboard (admin) ===== */
(function () {
  if (window.__APARAT_INAD__) return; window.__APARAT_INAD__ = 1;
  function p2(n) { return ("0" + n).slice(-2); }
  function num(v) { v = ("" + (v == null ? "" : v)).replace(/[^0-9,.-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); return parseFloat(v) || 0; }
  function money(n) { return "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
  function hojeISO() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dataBR(v) { var m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "/" + m[2] + "/" + m[1] : String(v || ""); }
  async function render() {
    try {
      var ancora = document.getElementById("dash-obrig"); if (!ancora) return;
      if (typeof dbGetAll !== "function") return;
      var hs = await dbGetAll("honorarios");
      var hoje = hojeISO();
      var atrasados = (hs || []).filter(function (h) {
        var pago = /pago/i.test(String(h.status || ""));
        var v = String(h.vencimento || "").slice(0, 10);
        return !pago && v && v < hoje;
      });
      var card = document.getElementById("ap-inad-card");
      if (!atrasados.length) { if (card) card.style.display = "none"; return; }
      var porCli = {};
      atrasados.forEach(function (h) {
        var n = String(h.cliente || "?").trim();
        if (!porCli[n]) porCli[n] = { total: 0, maisAntigo: "9999-99-99" };
        porCli[n].total += num(h.valor);
        var v = String(h.vencimento || "").slice(0, 10);
        if (v && v < porCli[n].maisAntigo) porCli[n].maisAntigo = v;
      });
      var nomes = Object.keys(porCli).sort(function (a, b) { return porCli[a].maisAntigo.localeCompare(porCli[b].maisAntigo); });
      var total = 0; nomes.forEach(function (n) { total += porCli[n].total; });
      if (!card) {
        card = document.createElement("div");
        card.id = "ap-inad-card";
        var alvo = ancora.closest ? ancora.closest(".kcard") : null;
        var linha = alvo && alvo.parentElement ? alvo.parentElement : null;
        if (linha && linha.parentElement) linha.parentElement.insertBefore(card, linha.nextSibling);
        else document.body.appendChild(card);
      }
      card.style.display = "";
      card.style.cssText += ";background:#1a0b12;border:1px solid #ff3355;border-radius:14px;padding:14px 16px;margin:12px 0;box-shadow:0 0 14px rgba(255,51,85,.25)";
      var linhas = nomes.slice(0, 8).map(function (n) {
        return '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px dashed #3a1a24"><span>' + n.replace(/</g, "&lt;") + '</span><span style="white-space:nowrap;color:#ff8899">' + money(porCli[n].total) + ' · desde ' + dataBR(porCli[n].maisAntigo) + "</span></div>";
      }).join("");
      var extra = nomes.length > 8 ? '<div style="font-size:11px;color:#8888aa;margin-top:4px">e mais ' + (nomes.length - 8) + " cliente(s)...</div>" : "";
      card.innerHTML = '<div style="font-weight:800;color:#ff5566;font-size:14px;margin-bottom:6px">&#9888;&#65039; Clientes em atraso: ' + nomes.length + ' &middot; Total ' + money(total) + "</div>" + linhas + extra;
    } catch (e) {}
  }
  function instalar() {
    if (typeof window.atualizarDashboard !== "function" || window.atualizarDashboard.__apInad) return false;
    var orig = window.atualizarDashboard;
    var novo = async function () { try { await orig.apply(this, arguments); } catch (e) {} await render(); };
    novo.__apInad = 1; window.atualizarDashboard = novo;
    render();
    return true;
  }
  var tent = 0;
  var iv = setInterval(function () { if (instalar() || ++tent > 60) clearInterval(iv); }, 700);
  setTimeout(render, 4000);
  setInterval(render, 120000);
})();

/* ===== Baixa rapida de obrigacoes + contador considera todos os meses ===== */
(function () {
  if (window.__APARAT_BAIXA__) return; window.__APARAT_BAIXA__ = 1;
  var CONCLUIDO_POR_TIPO = {
    "Extrato Bancário": "Recebido",
    "NF-e Emitida": "Emitida",
    "Certidão Fiscal": "Conferida",
    "Lançamento no Domínio": "Lançado"
  };
  window.darBaixaObrig = async function (id) {
    try {
      var os = await dbGetAll("obrigacoes");
      var o = os.find(function (x) { return String(x.id) === String(id); });
      if (!o) return;
      var novo = CONCLUIDO_POR_TIPO[o.tipo] || "Pago";
      await dbUpdate("obrigacoes", id, { status: novo, baixadoPeloEscritorio: true, baixadoEm: new Date().toISOString() });
      if (typeof notif === "function") notif("✔️ Baixa dada: " + (o.tipo || "obrigacao") + " de " + (o.cliente || "") + " → " + novo);
      if (typeof carregarObrigacoes === "function") await carregarObrigacoes();
      if (typeof atualizarDashboard === "function") await atualizarDashboard();
    } catch (e) { console.error("baixa", e); }
  };
  var FEITOS = ["pago", "lancado", "lançado", "recebido", "entregue", "enviado", "enviada ao cliente", "emitida", "emitida pelo escritorio", "emitida pelo escritório", "recebida de fornecedor", "conferida", "dispensado"];
  function pendenteStatus(s) {
    s = String(s || "").trim().toLowerCase();
    if (!s) return true;
    return FEITOS.indexOf(s) === -1;
  }
  function injetarBotoes() {
    try {
      var tb = document.getElementById("tb-obrig"); if (!tb) return;
      [].forEach.call(tb.querySelectorAll("tr"), function (tr) {
        if (tr.getAttribute("data-apbx") === "1") return;
        var btnEd = tr.querySelector('button[onclick^="editarObrig"]');
        if (!btnEd) return;
        tr.setAttribute("data-apbx", "1");
        var m = String(btnEd.getAttribute("onclick") || "").match(/editarObrig\('([^']+)'\)/);
        if (!m) return;
        var tag = tr.querySelector(".tag");
        var st = tag ? tag.textContent : "";
        if (!pendenteStatus(st)) return;
        var b = document.createElement("button");
        b.className = "btn-sm";
        b.style.cssText = "background:#0f2a18;border:1px solid #22cc77;color:#22cc77;margin-right:4px";
        b.textContent = "✔ Dar baixa";
        b.setAttribute("onclick", "darBaixaObrig('" + m[1] + "')");
        btnEd.parentElement.insertBefore(b, btnEd);
      });
    } catch (e) {}
  }
  setInterval(injetarBotoes, 1200);
  setTimeout(injetarBotoes, 2000);
})();

/* ===== PIX na tela de honorarios do cliente ===== */
(function () {
  if (window.__APARAT_PIX__) return; window.__APARAT_PIX__ = 1;
  var CHAVE = "e140ad9c-8e55-4fa4-853c-ebbc3a18c3c3";
  var FAVORECIDO = "APARAT CONTABILIDADE LTDA";
  window.copiarPixAparat = function () {
    function feito() { var b = document.getElementById("ap-pix-btn"); if (b) { b.textContent = "✅ Chave copiada!"; setTimeout(function () { b.textContent = "📋 Copiar chave PIX"; }, 2500); } if (typeof notif === "function") notif("Chave PIX copiada! Cole no app do seu banco."); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(CHAVE).then(feito, fallback); return; }
      fallback();
    } catch (e) { fallback(); }
    function fallback() {
      try {
        var t = document.createElement("textarea"); t.value = CHAVE; t.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); feito();
      } catch (e) { alert("Chave PIX: " + CHAVE); }
    }
  };
  function injetar() {
    try {
      if (typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE && CURRENT_ROLE !== "cliente") return;
      var alvo = document.getElementById("ap-honorarios"); if (!alvo) return;
      if (document.getElementById("ap-pix-card")) return;
      var c = document.createElement("div");
      c.id = "ap-pix-card";
      c.style.cssText = "background:linear-gradient(135deg,#071a2e,#0b2a1a);border:1px solid #22cc77;border-radius:14px;padding:14px 16px;margin:0 0 14px 0;box-shadow:0 0 14px rgba(34,204,119,.2)";
      c.innerHTML =
        '<div style="font-weight:800;color:#22cc77;font-size:14px;margin-bottom:4px">&#128179; Pague seus honorários com PIX</div>' +
        '<div style="font-size:11px;color:#9ab">Favorecido: <b style="color:#fff">' + FAVORECIDO + '</b></div>' +
        '<div style="font-size:11px;color:#9ab;word-break:break-all;margin:4px 0 8px">Chave (aleatória): <span style="color:#fff">' + CHAVE + '</span></div>' +
        '<button id="ap-pix-btn" onclick="copiarPixAparat()" style="background:#22cc77;color:#04180c;border:0;border-radius:9px;padding:9px 14px;font-weight:800;font-size:13px;cursor:pointer;width:100%">&#128203; Copiar chave PIX</button>' +
        '<div style="font-size:10px;color:#8888aa;margin-top:6px">Depois de pagar, use o botão "Já Paguei" para avisar o escritório.</div>';
      alvo.insertBefore(c, alvo.firstChild);
    } catch (e) {}
  }
  setInterval(injetar, 1500);
  setTimeout(injetar, 2500);
})();

/* ===== Relatorio Excel (admin) ===== */
(function () {
  if (window.__APARAT_XLS__) return; window.__APARAT_XLS__ = 1;
  function num(v) { v = ("" + (v == null ? "" : v)).replace(/[^0-9,.-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); return parseFloat(v) || 0; }
  function carregarLib() {
    return new Promise(function (res, rej) {
      if (window.XLSX) return res();
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = function () { rej(new Error("Falha ao carregar biblioteca Excel")); };
      document.head.appendChild(s);
    });
  }
  window.baixarRelatorioExcel = async function () {
    var btn = document.getElementById("ap-xls-btn");
    try {
      if (btn) btn.textContent = "⏳ Gerando...";
      await carregarLib();
      var hs = await dbGetAll("honorarios");
      var fs = await dbGetAll("faturamento");
      var os = await dbGetAll("obrigacoes");
      var wb = XLSX.utils.book_new();
      var abaHon = (hs || []).map(function (h) { return { Cliente: h.cliente || "", Referencia: h.referencia || "", "Valor (R$)": num(h.valor), Vencimento: h.vencimento || "", Status: h.status || "" }; });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(abaHon.length ? abaHon : [{ Aviso: "Sem dados" }]), "Honorarios");
      var abaFat = (fs || []).map(function (r) { var f = num(r.faturamento), d = num(r.despesa); return { Cliente: r.cliente || "", "Mes (ref)": r.mesRef || "", "Faturamento (R$)": f, "Despesas (R$)": d, "Resultado (R$)": f - d }; });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(abaFat.length ? abaFat : [{ Aviso: "Sem dados" }]), "Faturamento");
      var abaObr = (os || []).map(function (o) { return { Cliente: o.cliente || "", Tipo: o.tipo || "", "Valor (R$)": num(o.valor), Vencimento: o.vencimento || "", Competencia: o.competencia || "", Status: o.status || "" }; });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(abaObr.length ? abaObr : [{ Aviso: "Sem dados" }]), "Obrigacoes");
      var recebido = 0, pendente = 0;
      (hs || []).forEach(function (h) { if (/pago/i.test(h.status || "")) recebido += (h.valorRecebido != null ? Number(h.valorRecebido) : num(h.valor)); else pendente += num(h.valor); });
      var fatT = 0, despT = 0;
      (fs || []).forEach(function (r) { fatT += num(r.faturamento); despT += num(r.despesa); });
      var abaRes = [
        { Indicador: "Honorarios recebidos (R$)", Valor: recebido },
        { Indicador: "Honorarios pendentes (R$)", Valor: pendente },
        { Indicador: "Faturamento total clientes (R$)", Valor: fatT },
        { Indicador: "Despesas totais clientes (R$)", Valor: despT },
        { Indicador: "Resultado total clientes (R$)", Valor: fatT - despT },
        { Indicador: "Total de lancamentos de honorarios", Valor: (hs || []).length },
        { Indicador: "Total de obrigacoes registradas", Valor: (os || []).length }
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(abaRes), "Resumo");
      var ag = new Date();
      var nome = "APARAT-relatorio-" + ag.getFullYear() + "-" + ("0" + (ag.getMonth() + 1)).slice(-2) + "-" + ("0" + ag.getDate()).slice(-2) + ".xlsx";
      XLSX.writeFile(wb, nome);
      if (typeof notif === "function") notif("📊 Relatorio Excel baixado: " + nome);
    } catch (e) {
      alert("Erro ao gerar o Excel: " + (e.message || e));
    } finally {
      if (btn) btn.innerHTML = "&#128202; Baixar relatório Excel";
    }
  };
  function injetar() {
    try {
      if (typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE !== "admin") return;
      if (document.getElementById("ap-xls-btn")) return;
      var ancora = document.getElementById("adm-btn-notif") || document.getElementById("dash-obrig");
      if (!ancora) return;
      var b = document.createElement("button");
      b.id = "ap-xls-btn";
      b.innerHTML = "&#128202; Baixar relatório Excel";
      b.style.cssText = "display:block;width:100%;margin:8px 0;background:#0e2033;border:1px solid #4488ff;color:#7fb2ff;border-radius:11px;padding:11px;font-weight:800;font-size:13px;cursor:pointer";
      b.setAttribute("onclick", "baixarRelatorioExcel()");
      if (ancora.id === "adm-btn-notif") ancora.parentElement.insertBefore(b, ancora.nextSibling);
      else { var kc = ancora.closest(".kcard"); var linha = kc && kc.parentElement ? kc.parentElement : null; if (linha && linha.parentElement) linha.parentElement.insertBefore(b, linha); }
    } catch (e) {}
  }
  setInterval(injetar, 1500);
  setTimeout(injetar, 2500);
})();

/* ===== Botao instalar aplicativo (PWA) ===== */
(function () {
  if (window.__APARAT_INSTALL__) return; window.__APARAT_INSTALL__ = 1;
  var promptGuardado = null;
  function emAppInstalado() {
    try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch (e) { return false; }
  }
  function ehIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function navegadorDentroDeApp() { return /wv\)|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(navigator.userAgent); }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    promptGuardado = e;
    window.__AP_PROMPT_OK = 1;
    mostrar();
  });
  window.addEventListener("appinstalled", function () {
    promptGuardado = null;
    var b = document.getElementById("ap-inst-bar"); if (b) b.remove();
    if (typeof notif === "function") notif("✅ Aplicativo instalado! Procure o ícone APARAT na tela do celular.");
  });
  window.instalarAppAparat = async function () {
    if (promptGuardado) {
      try {
        promptGuardado.prompt();
        var r = await promptGuardado.userChoice;
        if (r && r.outcome === "accepted") { var b = document.getElementById("ap-inst-bar"); if (b) b.remove(); }
        promptGuardado = null;
      } catch (e) {}
      return;
    }
    var msg;
    if (ehIOS()) {
      msg = "No iPhone: toque no botao Compartilhar (quadrado com seta) do Safari e escolha \"Adicionar a Tela de Inicio\".";
    } else if (navegadorDentroDeApp()) {
      msg = "Voce esta no navegador de dentro do WhatsApp. Toque nos 3 pontinhos no canto e escolha \"Abrir no Chrome\". La, toque de novo em INSTALAR APLICATIVO.";
    } else {
      msg = "No Chrome: toque nos 3 pontinhos (menu) e escolha \"Instalar aplicativo\" ou \"Adicionar a tela inicial\".";
    }
    alert("📲 COMO INSTALAR O APP APARAT\n\n" + msg);
  };
  function mostrar() {
    try {
      if (emAppInstalado()) return;
      if (document.getElementById("ap-inst-bar")) return;
      var bar = document.createElement("div");
      bar.id = "ap-inst-bar";
      bar.style.cssText = "position:fixed;left:10px;right:10px;bottom:10px;z-index:99998;background:linear-gradient(135deg,#101038,#0b2a56);border:1px solid #4488ff;border-radius:14px;padding:11px 13px;display:flex;align-items:center;gap:10px;box-shadow:0 6px 20px rgba(0,0,0,.5)";
      bar.innerHTML =
        '<div style="flex:1;min-width:0"><div style="font-weight:800;color:#fff;font-size:13px">&#128241; Instale o app APARAT</div><div style="font-size:11px;color:#9ab">Fica na tela do celular, com notificações</div></div>' +
        '<button onclick="instalarAppAparat()" style="background:#3355ff;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap">INSTALAR</button>' +
        '<button onclick="document.getElementById(\'ap-inst-bar\').remove()" style="background:none;border:0;color:#667;font-size:16px;cursor:pointer">&#10005;</button>';
      document.body.appendChild(bar);
    } catch (e) {}
  }
  setTimeout(function () { if (!emAppInstalado() && !document.getElementById("ap-inst-bar")) mostrar(); }, 6000);
})();

/* ===== Calendario inteligente de vencimentos e agendamentos ===== */
(function () {
  if (window.__APARAT_CAL__) return; window.__APARAT_CAL__ = 1;
  var FEITOS = ["pago", "lancado", "lançado", "recebido", "entregue", "enviado", "enviada ao cliente", "emitida", "emitida pelo escritorio", "emitida pelo escritório", "recebida de fornecedor", "conferida", "dispensado"];
  var MESES_N = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  var calAno = 0, calMes = 0, diaSel = "";
  function p2(n) { return ("0" + n).slice(-2); }
  function esc2(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function num(v) { v = ("" + (v == null ? "" : v)).replace(/[^0-9,.-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); return parseFloat(v) || 0; }
  function money(n) { return "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
  function hojeISO() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dataISO(v) { var s = String(v || "").trim(); var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + "-" + p2(+m[2]) + "-" + p2(+m[3]); m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return m[3] + "-" + p2(+m[2]) + "-" + p2(+m[1]); return ""; }
  function dataBR(iso) { var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "/" + m[2] : ""; }
  function pendente(st) { var s = String(st || "").trim().toLowerCase(); if (!s) return true; return FEITOS.indexOf(s) === -1; }
  function souCliente() { try { return typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE === "cliente"; } catch (e) { return false; } }
  function meuNome() { try { return (typeof CURRENT_CLIENTE !== "undefined" && CURRENT_CLIENTE) ? String(CURRENT_CLIENTE).trim().toLowerCase() : ""; } catch (e) { return ""; } }

  async function coletar() {
    var eventos = [];
    var cli = souCliente() ? meuNome() : "";
    function meu(n) { return !cli || String(n || "").trim().toLowerCase() === cli; }
    try {
      var hs = await dbGetAll("honorarios");
      (hs || []).forEach(function (h) {
        if (!meu(h.cliente)) return;
        var d = dataISO(h.vencimento); if (!d) return;
        eventos.push({ data: d, tipo: "hon", titulo: (souCliente() ? "Honorário contábil" : (h.cliente || "")), sub: "Honorário " + (h.referencia || "") + (!pendente(h.status) ? " · ✔ Pago" : ""), valor: num(h.valor), pend: pendente(h.status) });
      });
    } catch (e) {}
    try {
      var os = await dbGetAll("obrigacoes");
      (os || []).forEach(function (o) {
        if (!meu(o.cliente)) return;
        var d = dataISO(o.vencimento); if (!d) return;
        eventos.push({ data: d, tipo: "imp", titulo: (souCliente() ? (o.tipo || "Guia") : (o.cliente || "")), sub: (souCliente() ? "" : (o.tipo || "")) + (o.competencia ? " (" + o.competencia + ")" : "") + (!pendente(o.status) ? " · ✔ " + (o.status || "") : ""), valor: num(o.valor), pend: pendente(o.status) });
      });
    } catch (e) {}
    try {
      var ags = await dbGetAll("agenda");
      (ags || []).forEach(function (a) {
        if (!meu(a.cliente)) return;
        var d = dataISO(a.data); if (!d) return;
        eventos.push({ data: d, tipo: "age", titulo: (a.tipo || "Compromisso") + (souCliente() ? " com a APARAT" : " — " + (a.cliente || "")), sub: (a.hora ? a.hora + " · " : "") + (a.desc || ""), valor: 0, pend: false, agenda: true });
      });
    } catch (e) {}
    return eventos;
  }

  window.calMudarMes = function (dir) { calMes += dir; if (calMes < 0) { calMes = 11; calAno--; } if (calMes > 11) { calMes = 0; calAno++; } diaSel = ""; desenhar(); };
  window.fecharCalendarioAparat = function () { var m = document.getElementById("ap-cal-modal"); if (m) m.remove(); };
  window.calDiaClique = function (iso) { if (souCliente()) return; diaSel = iso; desenhar(); };
  window.calSalvarAgendamento = async function () {
    try {
      var cli = (document.getElementById("apc-cli") || {}).value || "";
      var tp = (document.getElementById("apc-tipo") || {}).value || "Reunião";
      var hr = (document.getElementById("apc-hora") || {}).value || "";
      var dsc = (document.getElementById("apc-desc") || {}).value || "";
      if (!cli) { alert("Escolha o cliente."); return; }
      await dbAdd("agenda", { cliente: cli, tipo: tp, data: diaSel, hora: hr, desc: dsc });
      if (typeof notif === "function") notif("📅 Agendamento criado! O cliente será avisado no celular.");
      diaSel = "";
      desenhar();
    } catch (e) { alert("Erro ao agendar: " + (e.message || e)); }
  };

  async function nomesClientes() {
    var set = {}, out = [];
    try { var cs = await dbGetAll("clientes"); (cs || []).forEach(function (c) { var n = String(c.nome || "").trim(); if (n && !set[n.toLowerCase()]) { set[n.toLowerCase()] = 1; out.push(n); } }); } catch (e) {}
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }

  async function desenhar() {
    var m = document.getElementById("ap-cal-modal"); if (!m) return;
    var corpo = m.querySelector("#ap-cal-corpo"); if (!corpo) return;
    var evs = await coletar();
    var hoje = hojeISO();
    var mesIni = calAno + "-" + p2(calMes + 1);
    var porDia = {};
    evs.forEach(function (e) { if (e.data.slice(0, 7) === mesIni) { if (!porDia[e.data]) porDia[e.data] = []; porDia[e.data].push(e); } });
    var prim = new Date(calAno, calMes, 1).getDay();
    var nd = new Date(calAno, calMes + 1, 0).getDate();
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;background:#12122e;border-radius:10px;padding:8px 12px;margin-bottom:10px;font-weight:800;font-size:14px">' +
      '<span onclick="calMudarMes(-1)" style="color:#4488ff;cursor:pointer;padding:0 10px;font-size:18px">&#8249;</span>' +
      "<span>" + MESES_N[calMes] + " / " + calAno + "</span>" +
      '<span onclick="calMudarMes(1)" style="color:#4488ff;cursor:pointer;padding:0 10px;font-size:18px">&#8250;</span></div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center">';
    h += "<tr>" + ["D", "S", "T", "Q", "Q", "S", "S"].map(function (x) { return '<th style="color:#667;font-size:9px;padding:3px 0">' + x + "</th>"; }).join("") + "</tr><tr>";
    for (var i = 0; i < prim; i++) h += "<td></td>";
    var col = prim;
    for (var d = 1; d <= nd; d++) {
      var iso = calAno + "-" + p2(calMes + 1) + "-" + p2(d);
      var lst = porDia[iso] || [];
      var pts = "";
      var temAtr = lst.some(function (e) { return e.pend && e.data < hoje; });
      var visto = {};
      lst.forEach(function (e) {
        var cor = e.agenda ? "#33aaff" : (e.pend && e.data < hoje) ? "#ff4455" : (e.tipo === "hon" ? "#22cc77" : "#ffaa22");
        if (visto[cor]) return; visto[cor] = 1;
        pts += '<i style="display:inline-block;width:6px;height:6px;border-radius:50%;margin:1px;background:' + cor + '"></i>';
      });
      var estilo = "padding:5px 0;height:34px;vertical-align:top;border-radius:8px;cursor:" + (souCliente() ? "default" : "pointer");
      if (iso === hoje) estilo += ";background:#152a4d;border:1px solid #4488ff";
      if (iso === diaSel) estilo += ";background:#1d3a1d;border:1px solid #22cc77";
      h += '<td onclick="calDiaClique(\'' + iso + '\')" style="' + estilo + '"><span style="color:' + (temAtr ? "#ff8899" : "#ccd") + ";font-weight:" + (iso === hoje ? "800" : "400") + '">' + d + "</span><br>" + pts + "</td>";
      col++;
      if (col % 7 === 0 && d < nd) h += "</tr><tr>";
    }
    h += "</tr></table>";
    h += '<div style="display:flex;gap:10px;font-size:9px;color:#9ab;margin:8px 0;justify-content:center;flex-wrap:wrap">' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22cc77;margin-right:3px"></i>Honorário</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffaa22;margin-right:3px"></i>Imposto/Guia</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4455;margin-right:3px"></i>Atraso</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#33aaff;margin-right:3px"></i>Agendamento</span></div>';
    if (!souCliente()) {
      if (diaSel) {
        var nomes = await nomesClientes();
        h += '<div style="background:#0f2418;border:1px solid #22cc77;border-radius:12px;padding:10px;margin-bottom:10px">' +
          '<div style="font-weight:800;color:#22cc77;font-size:12px;margin-bottom:6px">&#10133; Agendar para ' + dataBR(diaSel) + "/" + diaSel.slice(0, 4) + "</div>" +
          '<select id="apc-cli" style="width:100%;margin-bottom:6px;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px"><option value="">Escolha o cliente...</option>' + nomes.map(function (n) { return "<option>" + esc2(n) + "</option>"; }).join("") + "</select>" +
          '<div style="display:flex;gap:6px;margin-bottom:6px"><select id="apc-tipo" style="flex:1;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px"><option>Reunião</option><option>Entrega de Documentos</option><option>Visita</option><option>Ligação</option><option>Outro</option></select>' +
          '<input id="apc-hora" type="time" style="width:96px;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px"/></div>' +
          '<input id="apc-desc" placeholder="Descrição (opcional)" style="width:100%;box-sizing:border-box;margin-bottom:8px;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px"/>' +
          '<button onclick="calSalvarAgendamento()" style="width:100%;background:#22cc77;color:#04180c;border:0;border-radius:9px;padding:10px;font-weight:800;font-size:13px;cursor:pointer">SALVAR AGENDAMENTO</button></div>';
      } else {
        h += '<div style="background:#152a4d;border:1px dashed #4488ff;border-radius:10px;padding:8px;text-align:center;font-size:11px;color:#7fb2ff;font-weight:800;margin-bottom:10px">&#10133; Toque em um dia para AGENDAR</div>';
      }
    }
    var atras = evs.filter(function (e) { return e.pend && e.data < hoje; }).sort(function (a, b) { return a.data.localeCompare(b.data); });
    var mesSeg = (function(){ var a = calAno, m = calMes + 1; if (m > 11) { m = 0; a++; } return a + "-" + p2(m + 1); })();
    var doMesFut = evs.filter(function (e) { var mm = e.data.slice(0, 7); return !(e.pend && e.data < hoje) && (mm === mesIni || mm === mesSeg) && e.data >= hoje; }).sort(function (a, b) { return a.data.localeCompare(b.data); });
    var lista = atras.concat(doMesFut).slice(0, 20);
    h += '<div style="background:#10102a;border:1px solid #232350;border-radius:12px;padding:10px"><div style="font-size:11px;font-weight:800;color:#7fb2ff;margin-bottom:4px">' + (souCliente() ? "O QUE VENCE PARA VOCÊ" : "ATRASADOS E PRÓXIMOS") + "</div>";
    if (!lista.length) h += '<div style="font-size:11px;color:#667;padding:6px 0">Nada por aqui neste mês ✅</div>';
    lista.forEach(function (e, ix) {
      var atr = e.pend && e.data < hoje;
      var corD = e.agenda ? "background:#0d2438;color:#33aaff" : atr ? "background:#3a1020;color:#ff8899" : "background:#152a4d;color:#7fb2ff";
      var tag = e.agenda ? ["#0d2438", "#33aaff", "AGENDA"] : atr ? ["#2a0d14", "#ff5566", "ATRASADO"] : e.tipo === "hon" ? ["#0f2a18", "#22cc77", "HONORÁRIO"] : ["#2a1c08", "#ffaa22", "IMPOSTO"];
      h += '<div style="display:flex;gap:8px;align-items:center;padding:6px 2px;font-size:11px;' + (ix < lista.length - 1 ? "border-bottom:1px dashed #1e1e3e" : "") + '">' +
        '<span style="border-radius:8px;padding:4px 7px;font-weight:800;font-size:11px;min-width:34px;text-align:center;' + corD + '">' + dataBR(e.data) + "</span>" +
        '<div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc2(e.titulo) + '</div><div style="color:#778;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc2(e.sub) + "</div></div>" +
        (e.valor ? '<span style="font-weight:700;white-space:nowrap">' + money(e.valor) + "</span>" : "") +
        '<span style="font-size:8px;padding:2px 6px;border-radius:6px;font-weight:800;background:' + tag[0] + ";color:" + tag[1] + '">' + tag[2] + "</span></div>";
    });
    h += "</div>";
    corpo.innerHTML = h;
  }

  window.abrirCalendarioAparat = function () {
    if (document.getElementById("ap-cal-modal")) return;
    var ag = new Date(); calAno = ag.getFullYear(); calMes = ag.getMonth(); diaSel = "";
    var m = document.createElement("div");
    m.id = "ap-cal-modal";
    m.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(4,4,16,.92);overflow:auto;padding:14px";
    m.innerHTML = '<div style="max-width:430px;margin:0 auto;background:#0a0a22;border:1px solid #232350;border-radius:18px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
      '<div style="font-weight:800;font-size:15px;color:#fff">&#128197; ' + (souCliente() ? "Meus Vencimentos" : "Calendário de Vencimentos") + "</div>" +
      '<button onclick="fecharCalendarioAparat()" style="background:none;border:0;color:#889;font-size:20px;cursor:pointer">&#10005;</button></div>' +
      '<div style="font-size:10px;color:#8888aa;margin-bottom:10px">' + (souCliente() ? "Honorários, guias e agendamentos" : "Honorários e impostos de todos os clientes + agenda") + "</div>" +
      '<div id="ap-cal-corpo" style="color:#fff">Carregando...</div></div>';
    document.body.appendChild(m);
    desenhar();
  };

  function injetarBotoes() {
    try {
      if (typeof CURRENT_ROLE === "undefined" || !CURRENT_ROLE) return;
      {
        var velho = document.getElementById("ap-cal-btn"); if (velho) velho.remove();
        if (document.getElementById("ap-cal-fab")) return;
        if (CURRENT_ROLE !== "admin" && !document.querySelector(".apbot") && !document.getElementById("ap-honorarios")) return;
        var f = document.createElement("button");
        f.id = "ap-cal-fab";
        f.innerHTML = "&#128197;";
        f.title = "Meus Vencimentos";
        f.style.cssText = "position:fixed;left:14px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:9999;width:48px;height:48px;border-radius:50%;background:#101038;border:1px solid #8866ff;color:#b39bff;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)";
        f.setAttribute("onclick", "abrirCalendarioAparat()");
        document.body.appendChild(f);
      }
    } catch (e) {}
  }
  setInterval(injetarBotoes, 1600);
  setTimeout(injetarBotoes, 2600);
})();

/* ===== Calendario v2: botoes editar/excluir/baixa na lista ===== */
(function () {
  if (window.__APARAT_CAL2__) return; window.__APARAT_CAL2__ = 1;
  var FEITOS = ["pago", "lancado", "lançado", "recebido", "entregue", "enviado", "enviada ao cliente", "emitida", "emitida pelo escritorio", "emitida pelo escritório", "recebida de fornecedor", "conferida", "dispensado"];
  var MESES_N = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  var calAno = 0, calMes = 0, diaSel = "", editId = "", preencher = null;
  function p2(n) { return ("0" + n).slice(-2); }
  function esc2(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function norm(t) { try { return String(t || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) { return String(t || "").trim().toLowerCase(); } }
  function num(v) { v = ("" + (v == null ? "" : v)).replace(/[^0-9,.-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); return parseFloat(v) || 0; }
  function money(n) { return "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
  function hojeISO() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dataISO(v) { var s = String(v || "").trim(); var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + "-" + p2(+m[2]) + "-" + p2(+m[3]); m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return m[3] + "-" + p2(+m[2]) + "-" + p2(+m[1]); return ""; }
  function dataBR(iso) { var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "/" + m[2] : ""; }
  function pendente(st) { var s = norm(st); if (!s) return true; return FEITOS.indexOf(s) === -1; }
  function souCliente() { try { return typeof CURRENT_ROLE !== "undefined" && CURRENT_ROLE === "cliente"; } catch (e) { return false; } }
  function meuNome() { try { return (typeof CURRENT_CLIENTE !== "undefined" && CURRENT_CLIENTE) ? norm(CURRENT_CLIENTE) : ""; } catch (e) { return ""; } }

  async function coletar() {
    var evs = [];
    var cli = souCliente() ? meuNome() : "";
    function meu(n) { return !cli || norm(n) === cli; }
    try { (await dbGetAll("honorarios") || []).forEach(function (h) { if (!meu(h.cliente)) return; var d = dataISO(h.vencimento); if (!d) return; evs.push({ id: h.id, coll: "honorarios", data: d, tipo: "hon", titulo: (souCliente() ? "Honorário contábil" : (h.cliente || "")), sub: "Honorário " + (h.referencia || "") + (!pendente(h.status) ? " · ✔ Pago" : ""), valor: num(h.valor), pend: pendente(h.status) }); }); } catch (e) {}
    try { (await dbGetAll("obrigacoes") || []).forEach(function (o) { if (!meu(o.cliente)) return; var d = dataISO(o.vencimento); if (!d) return; evs.push({ id: o.id, coll: "obrigacoes", data: d, tipo: "imp", titulo: (souCliente() ? (o.tipo || "Guia") : (o.cliente || "")), sub: (souCliente() ? "" : (o.tipo || "")) + (o.competencia ? " (" + o.competencia + ")" : "") + (!pendente(o.status) ? " · ✔ " + (o.status || "") : ""), valor: num(o.valor), pend: pendente(o.status) }); }); } catch (e) {}
    try { (await dbGetAll("agenda") || []).forEach(function (a) { if (!meu(a.cliente)) return; var d = dataISO(a.data); if (!d) return; evs.push({ id: a.id, coll: "agenda", data: d, tipo: "age", titulo: (a.tipo || "Compromisso") + (souCliente() ? " com a APARAT" : " — " + (a.cliente || "")), sub: (a.hora ? a.hora + " · " : "") + (a.desc || ""), valor: 0, pend: false, agenda: true, bruto: a }); }); } catch (e) {}
    return evs;
  }

  var TIPOS_FIXOS = ["Reunião", "Entrega de Documentos", "Entrega de Impostos do Cliente", "Entrega de Notas Fiscais", "Visita", "Ligação", "Outro"];
  async function tiposAg() {
    var out = TIPOS_FIXOS.slice();
    try { (await dbGetAll("agendaTipos") || []).forEach(function (t) { var n = String(t.nome || "").trim(); if (n && out.indexOf(n) < 0) out.push(n); }); } catch (e) {}
    return out;
  }
  window.calTipoChange = async function (sel) {
    if (sel.value !== "__novo__") return;
    var n = prompt("Digite o nome do novo tipo de agendamento:");
    if (n && n.trim()) {
      n = n.trim();
      try { await dbAdd("agendaTipos", { nome: n }); if (typeof notif === "function") notif("✅ Tipo \"" + n + "\" cadastrado!"); } catch (e) { alert("Não consegui salvar o tipo: " + (e.message || e)); }
      var o = document.createElement("option"); o.textContent = n;
      var nv = sel.querySelector('option[value="__novo__"]');
      sel.insertBefore(o, nv); sel.value = n;
    } else { sel.value = TIPOS_FIXOS[0]; }
  };
  window.calGoogleAg = async function (id) {
    try {
      var ags = await dbGetAll("agenda"); var a = ags.find(function (x) { return String(x.id) === String(id); }); if (!a) return;
      var d = dataISO(a.data).replace(/-/g, ""); if (!d) return;
      var hm = String(a.hora || "09:00").match(/(\d{1,2}):(\d{2})/) || [0, "09", "00"];
      var ini = d + "T" + p2(+hm[1]) + hm[2] + "00";
      var fim = d + "T" + p2(Math.min(+hm[1] + 1, 23)) + hm[2] + "00";
      var url = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent((a.tipo || "Compromisso") + " — " + (a.cliente || "")) + "&dates=" + ini + "/" + fim + "&ctz=America/Sao_Paulo&details=" + encodeURIComponent((a.desc || "") + "\n(Agendado pelo app APARAT)");
      window.open(url, "_blank");
    } catch (e) {}
  };
  window.calMudarMes = function (dir) { calMes += dir; if (calMes < 0) { calMes = 11; calAno--; } if (calMes > 11) { calMes = 0; calAno++; } diaSel = ""; editId = ""; desenhar(); };
  window.fecharCalendarioAparat = function () { var m = document.getElementById("ap-cal-modal"); if (m) m.remove(); };
  window.calDiaClique = function (iso) { if (souCliente()) return; diaSel = iso; editId = ""; preencher = null; desenhar(); };
  window.calExcluirAg = async function (id) {
    if (!confirm("Excluir este agendamento?")) return;
    try { await dbDelete("agenda", id); if (typeof notif === "function") notif("🗑️ Agendamento excluído."); desenhar(); } catch (e) { alert("Erro: " + (e.message || e)); }
  };
  window.calEditarAg = async function (id) {
    try {
      var ags = await dbGetAll("agenda"); var a = ags.find(function (x) { return String(x.id) === String(id); }); if (!a) return;
      diaSel = dataISO(a.data); editId = id; preencher = { cliente: a.cliente || "", tipo: a.tipo || "Reunião", hora: a.hora || "", desc: a.desc || "" };
      calAno = +diaSel.slice(0, 4); calMes = +diaSel.slice(5, 7) - 1;
      desenhar();
    } catch (e) {}
  };
  window.calBaixa = async function (coll, id) {
    try {
      if (coll === "obrigacoes" && typeof darBaixaObrig === "function") { await darBaixaObrig(id); desenhar(); return; }
      await dbUpdate(coll, id, { status: "Pago", baixadoPeloEscritorio: true, baixadoEm: new Date().toISOString() });
      if (typeof notif === "function") notif("✔️ Baixa dada!");
      if (typeof atualizarDashboard === "function") atualizarDashboard();
      desenhar();
    } catch (e) { alert("Erro: " + (e.message || e)); }
  };
  window.calSalvarAgendamento = async function () {
    try {
      var cli = (document.getElementById("apc-cli") || {}).value || "";
      var tp = (document.getElementById("apc-tipo") || {}).value || "Reunião";
      var hr = (document.getElementById("apc-hora") || {}).value || "";
      var dsc = (document.getElementById("apc-desc") || {}).value || "";
      if (!cli) { alert("Escolha o cliente."); return; }
      if (editId) { await dbUpdate("agenda", editId, { cliente: cli, tipo: tp, data: diaSel, hora: hr, desc: dsc }); if (typeof notif === "function") notif("✏️ Agendamento atualizado!"); }
      else { await dbAdd("agenda", { cliente: cli, tipo: tp, data: diaSel, hora: hr, desc: dsc }); if (typeof notif === "function") notif("📅 Agendamento criado! O cliente será avisado no celular."); }
      diaSel = ""; editId = ""; preencher = null;
      desenhar();
    } catch (e) { alert("Erro ao agendar: " + (e.message || e)); }
  };

  async function nomesClientes() {
    var set = {}, out = [];
    try { (await dbGetAll("clientes") || []).forEach(function (c) { var n = String(c.nome || "").trim(); if (n && !set[norm(n)]) { set[norm(n)] = 1; out.push(n); } }); } catch (e) {}
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }

  async function desenhar() {
    var m = document.getElementById("ap-cal-modal"); if (!m) return;
    var corpo = m.querySelector("#ap-cal-corpo"); if (!corpo) return;
    var evs = await coletar();
    var hoje = hojeISO();
    var mesIni = calAno + "-" + p2(calMes + 1);
    var porDia = {};
    evs.forEach(function (e) { if (e.data.slice(0, 7) === mesIni) { (porDia[e.data] = porDia[e.data] || []).push(e); } });
    var prim = new Date(calAno, calMes, 1).getDay();
    var nd = new Date(calAno, calMes + 1, 0).getDate();
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;background:#12122e;border-radius:10px;padding:8px 12px;margin-bottom:10px;font-weight:800;font-size:14px">' +
      '<span onclick="calMudarMes(-1)" style="color:#4488ff;cursor:pointer;padding:0 10px;font-size:18px">&#8249;</span>' +
      "<span>" + MESES_N[calMes] + " / " + calAno + "</span>" +
      '<span onclick="calMudarMes(1)" style="color:#4488ff;cursor:pointer;padding:0 10px;font-size:18px">&#8250;</span></div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center"><tr>' + ["D", "S", "T", "Q", "Q", "S", "S"].map(function (x) { return '<th style="color:#667;font-size:9px;padding:3px 0">' + x + "</th>"; }).join("") + "</tr><tr>";
    for (var i = 0; i < prim; i++) h += "<td></td>";
    var col = prim;
    for (var d = 1; d <= nd; d++) {
      var iso = calAno + "-" + p2(calMes + 1) + "-" + p2(d);
      var lst = porDia[iso] || [];
      var pts = "", visto = {};
      var temAtr = lst.some(function (e) { return e.pend && e.data < hoje; });
      lst.forEach(function (e) {
        var cor = e.agenda ? "#33aaff" : (e.pend && e.data < hoje) ? "#ff4455" : (e.tipo === "hon" ? "#22cc77" : "#ffaa22");
        if (visto[cor]) return; visto[cor] = 1;
        pts += '<i style="display:inline-block;width:6px;height:6px;border-radius:50%;margin:1px;background:' + cor + '"></i>';
      });
      var st = "padding:5px 0;height:34px;vertical-align:top;border-radius:8px;cursor:" + (souCliente() ? "default" : "pointer");
      if (iso === hoje) st += ";background:#152a4d;border:1px solid #4488ff";
      if (iso === diaSel) st += ";background:#1d3a1d;border:1px solid #22cc77";
      h += '<td onclick="calDiaClique(\'' + iso + '\')" style="' + st + '"><span style="color:' + (temAtr ? "#ff8899" : "#ccd") + ";font-weight:" + (iso === hoje ? "800" : "400") + '">' + d + "</span><br>" + pts + "</td>";
      col++;
      if (col % 7 === 0 && d < nd) h += "</tr><tr>";
    }
    h += "</tr></table>";
    h += '<div style="display:flex;gap:10px;font-size:9px;color:#9ab;margin:8px 0;justify-content:center;flex-wrap:wrap">' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22cc77;margin-right:3px"></i>Honorário</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffaa22;margin-right:3px"></i>Imposto</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4455;margin-right:3px"></i>Atraso</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#33aaff;margin-right:3px"></i>Agendamento</span></div>';
    if (!souCliente()) {
      if (diaSel) {
        var nomes = await nomesClientes();
        var tipos = await tiposAg();
        var pf = preencher || {};
        h += '<div style="background:#0f2418;border:1px solid #22cc77;border-radius:12px;padding:10px;margin-bottom:10px">' +
          '<div style="font-weight:800;color:#22cc77;font-size:12px;margin-bottom:6px">' + (editId ? "&#9999;&#65039; Editar agendamento de " : "&#10133; Agendar para ") + dataBR(diaSel) + "/" + diaSel.slice(0, 4) + "</div>" +
          '<select id="apc-cli" style="width:100%;margin-bottom:6px;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px"><option value="">Escolha o cliente...</option>' + nomes.map(function (n) { return "<option" + (norm(n) === norm(pf.cliente) ? " selected" : "") + ">" + esc2(n) + "</option>"; }).join("") + "</select>" +
          '<div style="display:flex;gap:6px;margin-bottom:6px"><select id="apc-tipo" onchange="calTipoChange(this)" style="flex:1;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px">' + tipos.map(function (t) { return "<option" + (t === pf.tipo ? " selected" : "") + ">" + esc2(t) + "</option>"; }).join("") + '<option value="__novo__">➕ Cadastrar novo tipo...</option></select>' +
          '<input id="apc-hora" type="time" value="' + esc2(pf.hora || "") + '" style="width:96px;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px"/></div>' +
          '<input id="apc-desc" placeholder="Descrição (opcional)" value="' + esc2(pf.desc || "") + '" style="width:100%;box-sizing:border-box;margin-bottom:8px;background:#0a0a22;color:#fff;border:1px solid #232350;border-radius:8px;padding:8px;font-size:12px"/>' +
          '<button onclick="calSalvarAgendamento()" style="width:100%;background:#22cc77;color:#04180c;border:0;border-radius:9px;padding:10px;font-weight:800;font-size:13px;cursor:pointer">' + (editId ? "SALVAR ALTERAÇÕES" : "SALVAR AGENDAMENTO") + "</button></div>";
      } else {
        h += '<div style="background:#152a4d;border:1px dashed #4488ff;border-radius:10px;padding:8px;text-align:center;font-size:11px;color:#7fb2ff;font-weight:800;margin-bottom:10px">&#10133; Toque em um dia para AGENDAR</div>';
      }
    }
    var mesSeg = (function () { var a = calAno, mm = calMes + 1; if (mm > 11) { mm = 0; a++; } return a + "-" + p2(mm + 1); })();
    var atras = evs.filter(function (e) { return e.pend && e.data < hoje; }).sort(function (a, b) { return a.data.localeCompare(b.data); });
    var fut = evs.filter(function (e) { var mm = e.data.slice(0, 7); return !(e.pend && e.data < hoje) && e.data >= hoje && (mm === mesIni || mm === mesSeg || e.agenda); }).sort(function (a, b) { return a.data.localeCompare(b.data); });
    var lista = atras.concat(fut).slice(0, 25);
    h += '<div style="background:#10102a;border:1px solid #232350;border-radius:12px;padding:10px"><div style="font-size:11px;font-weight:800;color:#7fb2ff;margin-bottom:4px">' + (souCliente() ? "O QUE VENCE PARA VOCÊ" : "ATRASADOS E PRÓXIMOS") + "</div>";
    if (!lista.length) h += '<div style="font-size:11px;color:#667;padding:6px 0">Nada por aqui ✅</div>';
    lista.forEach(function (e, ix) {
      var atr = e.pend && e.data < hoje;
      var corD = e.agenda ? "background:#0d2438;color:#33aaff" : atr ? "background:#3a1020;color:#ff8899" : "background:#152a4d;color:#7fb2ff";
      var tag = e.agenda ? ["#0d2438", "#33aaff", "AGENDA"] : atr ? ["#2a0d14", "#ff5566", "ATRASADO"] : e.tipo === "hon" ? ["#0f2a18", "#22cc77", "HONORÁRIO"] : ["#2a1c08", "#ffaa22", "IMPOSTO"];
      var acoes = "";
      if (!souCliente()) {
        if (e.agenda) acoes = '<span onclick="calGoogleAg(\'' + e.id + '\')" style="cursor:pointer;font-size:13px;margin-left:4px" title="Adicionar ao Google Agenda">&#128198;</span><span onclick="calEditarAg(\'' + e.id + '\')" style="cursor:pointer;font-size:13px;margin-left:4px" title="Editar">&#9999;&#65039;</span><span onclick="calExcluirAg(\'' + e.id + '\')" style="cursor:pointer;font-size:13px;margin-left:4px" title="Excluir">&#128465;&#65039;</span>';
        else if (e.pend) acoes = '<span onclick="calBaixa(\'' + e.coll + "','" + e.id + '\')" style="cursor:pointer;font-size:11px;margin-left:4px;background:#0f2a18;color:#22cc77;border:1px solid #22cc77;border-radius:6px;padding:2px 6px;font-weight:800" title="Dar baixa">&#10004;</span>';
      }
      h += '<div style="display:flex;gap:7px;align-items:center;padding:6px 2px;font-size:11px;' + (ix < lista.length - 1 ? "border-bottom:1px dashed #1e1e3e" : "") + '">' +
        '<span style="border-radius:8px;padding:4px 6px;font-weight:800;font-size:10px;min-width:34px;text-align:center;' + corD + '">' + dataBR(e.data) + "</span>" +
        '<div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc2(e.titulo) + '</div><div style="color:#778;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc2(e.sub) + "</div></div>" +
        (e.valor ? '<span style="font-weight:700;white-space:nowrap;font-size:10px">' + money(e.valor) + "</span>" : "") +
        '<span style="font-size:8px;padding:2px 5px;border-radius:6px;font-weight:800;background:' + tag[0] + ";color:" + tag[1] + '">' + tag[2] + "</span>" + acoes + "</div>";
    });
    h += "</div>";
    corpo.innerHTML = h;
  }

  window.abrirCalendarioAparat = function () {
    if (document.getElementById("ap-cal-modal")) { desenhar(); return; }
    var ag = new Date(); calAno = ag.getFullYear(); calMes = ag.getMonth(); diaSel = ""; editId = ""; preencher = null;
    var m = document.createElement("div");
    m.id = "ap-cal-modal";
    m.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(4,4,16,.92);overflow:auto;padding:14px";
    m.innerHTML = '<div style="max-width:430px;margin:0 auto;background:#0a0a22;border:1px solid #232350;border-radius:18px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
      '<div style="font-weight:800;font-size:15px;color:#fff">&#128197; ' + (souCliente() ? "Meus Vencimentos" : "Calendário de Vencimentos") + "</div>" +
      '<button onclick="fecharCalendarioAparat()" style="background:none;border:0;color:#889;font-size:20px;cursor:pointer">&#10005;</button></div>' +
      '<div style="font-size:10px;color:#8888aa;margin-bottom:10px">' + (souCliente() ? "Honorários, guias e agendamentos" : "Toque em um item da lista para dar baixa ✔, editar ✏️ ou excluir 🗑️") + "</div>" +
      '<div id="ap-cal-corpo" style="color:#fff">Carregando...</div></div>';
    document.body.appendChild(m);
    desenhar();
  };
})();

/* ===== Editar cadastro de cliente ===== */
(function () {
  if (window.__APARAT_CLIEDIT__) return; window.__APARAT_CLIEDIT__ = 1;
  var editando = null, nomeAntigo = "";
  window.editarClienteAparat = async function (id) {
    try {
      var cs = await dbGetAll("clientes");
      var c = cs.find(function (x) { return String(x.id) === String(id); });
      if (!c) return;
      editando = id;
      nomeAntigo = c.nome || "";
      setVal("cli-nome", c.nome || ""); setVal("cli-cnpj", c.cnpj || "");
      setVal("cli-resp", c.responsavel || ""); setVal("cli-wpp", c.whatsapp || "");
      setVal("cli-email", c.email || ""); setVal("cli-hon", c.honorario || "");
      setVal("cli-dia", c.dia || "");
      try { var rg = document.getElementById("cli-reg"); if (rg && c.regime) rg.value = c.regime; } catch (e) {}
      trocarBotao(true);
      try { var f = document.getElementById("cli-nome"); if (f) { f.scrollIntoView({ behavior: "smooth", block: "center" }); f.focus(); } } catch (e) {}
      if (typeof notif === "function") notif("✏️ Editando " + (c.nome || "cliente") + " — altere os campos e toque em Atualizar.");
    } catch (e) {}
  };
  window.cancelarEdicaoCliente = function () {
    editando = null;
    ["cli-nome", "cli-cnpj", "cli-resp", "cli-wpp", "cli-email", "cli-hon", "cli-dia", "cli-senha"].forEach(function (i) { try { setVal(i, ""); } catch (e) {} });
    trocarBotao(false);
  };
  function botaoCadastrar() {
    return [].find.call(document.querySelectorAll("button"), function (b) { return /Cadastrar Cliente|Atualizar Cliente/.test(b.textContent); });
  }
  function trocarBotao(edicao) {
    var b = botaoCadastrar(); if (!b) return;
    b.innerHTML = edicao ? "✏️ Atualizar Cliente" : "💾 Cadastrar Cliente";
    var canc = document.getElementById("cli-canc-edit");
    if (edicao) {
      if (!canc) {
        canc = document.createElement("button");
        canc.id = "cli-canc-edit";
        canc.className = b.className;
        canc.style.cssText = "background:#2a1c1c;border:1px solid #885555;color:#dd9999;margin-left:8px";
        canc.textContent = "✖ Cancelar edição";
        canc.setAttribute("onclick", "cancelarEdicaoCliente()");
        b.parentElement.insertBefore(canc, b.nextSibling);
      }
    } else if (canc) canc.remove();
  }
  function instalar() {
    if (typeof window.cadastrarCliente !== "function" || window.cadastrarCliente.__apEd) return false;
    var orig = window.cadastrarCliente;
    var novo = async function () {
      if (!editando) { return orig.apply(this, arguments); }
      var nome = val("cli-nome"), cnpj = val("cli-cnpj");
      if (!nome || !cnpj) { notif("⚠ Preencha Razão Social e CNPJ", "warn"); return; }
      var dados = { nome: nome, cnpj: cnpj, responsavel: val("cli-resp"), whatsapp: val("cli-wpp"), email: val("cli-email"), regime: val("cli-reg"), honorario: val("cli-hon") || "0", dia: val("cli-dia") };
      await dbUpdate("clientes", editando, dados);
      if (nomeAntigo && nomeAntigo.trim().toLowerCase() !== nome.trim().toLowerCase()) {
        if (typeof notif === "function") notif("🔄 Nome mudou — atualizando todos os registros do cliente...");
        var ALVOS = [["usuarios", "clienteNome"], ["honorarios", "cliente"], ["obrigacoes", "cliente"], ["obrigacoesAnuais", "cliente"], ["faturamento", "cliente"], ["agenda", "cliente"], ["docs", "cliente"], ["notas", "cliente"], ["solicitacoes", "cliente"], ["enviosCliente", "cliente"], ["recebidos", "cliente"], ["dados", "cliente"], ["tokens", "cliente"]];
        var trocados = 0;
        var velho = nomeAntigo.trim().toLowerCase();
        for (var ai = 0; ai < ALVOS.length; ai++) {
          try {
            var docs = await dbGetAll(ALVOS[ai][0]);
            for (var di = 0; di < (docs || []).length; di++) {
              var dd = docs[di];
              if (String(dd[ALVOS[ai][1]] || "").trim().toLowerCase() === velho) {
                var up = {}; up[ALVOS[ai][1]] = nome;
                await dbUpdate(ALVOS[ai][0], dd.id, up);
                trocados++;
              }
            }
          } catch (e) {}
        }
        if (typeof notif === "function") notif("✅ Cadastro atualizado e nome trocado em " + trocados + " registro(s)! O cliente vê o nome novo ao reabrir o app.");
      } else {
        if (typeof notif === "function") notif("✅ Cadastro de " + nome + " atualizado!");
      }
      nomeAntigo = "";
      window.cancelarEdicaoCliente();
      if (typeof carregarClientes === "function") await carregarClientes();
      if (typeof atualizarSelects === "function") await atualizarSelects();
      if (typeof atualizarDashboard === "function") await atualizarDashboard();
    };
    novo.__apEd = 1; window.cadastrarCliente = novo;
    return true;
  }
  function injetarBotoes() {
    try {
      var tb = document.getElementById("tb-clientes"); if (!tb) return;
      [].forEach.call(tb.querySelectorAll("tr"), function (tr) {
        if (tr.getAttribute("data-aped") === "1") return;
        var btnEx = tr.querySelector('button[onclick^="excluirCliente"]');
        if (!btnEx) return;
        tr.setAttribute("data-aped", "1");
        var m = String(btnEx.getAttribute("onclick") || "").match(/excluirCliente\('([^']+)'\)/);
        if (!m) return;
        var b = document.createElement("button");
        b.className = "btn-sm";
        b.style.cssText = "background:#0e2033;border:1px solid #4488ff;color:#7fb2ff;margin-right:4px";
        b.textContent = "✏️ Editar";
        b.setAttribute("onclick", "editarClienteAparat('" + m[1] + "')");
        btnEx.parentElement.insertBefore(b, btnEx);
      });
    } catch (e) {}
  }
  var tent = 0;
  var iv = setInterval(function () { if (instalar() && ++tent > 3) clearInterval(iv); tent++; if (tent > 80) clearInterval(iv); }, 700);
  setInterval(injetarBotoes, 1300);
  setTimeout(injetarBotoes, 2000);
})();

/* APARAT - Card "Proximo vencimento" na home do cliente */
;(function(){
  if(window.__APARAT_PROXVENC__) return; window.__APARAT_PROXVENC__=1;
  function num(v){var n=parseFloat(String(v==null?'':v).replace(/[^0-9.,-]/g,'').replace(',','.'));return isNaN(n)?0:n;}
  function hojeISO(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function dtBR(iso){var p=String(iso||'').split('-');return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso;}
  function dias(iso){try{return Math.round((new Date(iso+'T00:00:00')-new Date(hojeISO()+'T00:00:00'))/86400000);}catch(e){return 9999;}}
  function moeda(v){try{return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}catch(e){return 'R$ '+v;}}
  async function coletar(nome){
    var itens=[];
    try{
      var h=await fdb.collection('honorarios').where('cliente','==',nome).get();
      h.forEach(function(d){var x=d.data();var st=String(x.status||'').toLowerCase();
        if(st.indexOf('pago')<0 && x.vencimento) itens.push({desc:'Honorário '+(x.referencia||''),valor:num(x.valor),venc:String(x.vencimento)});});
    }catch(e){}
    try{
      var o=await fdb.collection('obrigacoes').where('cliente','==',nome).get();
      o.forEach(function(d){var x=d.data();var st=String(x.status||'').toLowerCase();
        if(!/pago|conclu|entreg|recebid|emitid|lanc/.test(st) && x.vencimento) itens.push({desc:x.tipo||x.titulo||'Guia/Imposto',valor:num(x.valor),venc:String(x.vencimento)});});
    }catch(e){}
    return itens.filter(function(i){return /^\d{4}-\d{2}-\d{2}/.test(i.venc);});
  }
  function card(){
    var h=document.getElementById('ap-home'); if(!h) return null;
    var c=document.getElementById('ap-proxvenc');
    if(!c){c=document.createElement('div');c.id='ap-proxvenc';c.style.cssText='margin:0 0 11px 0';var ref=h.querySelector('.qgrid');if(ref)h.insertBefore(c,ref);else h.appendChild(c);}
    return c;
  }
  var ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true;
    try{
      if(typeof CURRENT_CLIENTE==='undefined'||!CURRENT_CLIENTE||typeof fdb==='undefined'){ocupado=false;return;}
      var c=card(); if(!c){ocupado=false;return;}
      var itens=await coletar(CURRENT_CLIENTE);
      itens.sort(function(a,b){return a.venc<b.venc?-1:1;});
      var atras=itens.filter(function(i){return dias(i.venc)<0;});
      var prox=itens.filter(function(i){return dias(i.venc)>=0;});
      var html;
      if(atras.length){
        var a=atras[0];
        html='<div style="background:linear-gradient(135deg,#2a0f16,#3d1420);border:1px solid rgba(255,77,90,.55);border-radius:13px;padding:12px 14px;display:flex;align-items:center;gap:12px">'
          +'<div style="font-size:26px">⚠️</div><div style="flex:1"><div style="font-size:10px;color:#ff8f9a;font-weight:800;letter-spacing:.5px">EM ATRASO</div>'
          +'<div style="font-size:13px;font-weight:800;color:#fff">'+a.desc+'</div>'
          +'<div style="font-size:11px;color:#ffb3ba">'+(a.valor?moeda(a.valor)+' · ':'')+'venceu em '+dtBR(a.venc)+'</div></div></div>';
      }else if(prox.length){
        var p=prox[0]; var dd=dias(p.venc);
        var quando=dd===0?'vence HOJE':(dd===1?'vence amanhã':'vence em '+dd+' dias');
        var urg=dd<=3;
        html='<div style="background:linear-gradient(135deg,'+(urg?'#2a2210,#3d3114':'#0f1c28,#14293d')+');border:1px solid '+(urg?'rgba(255,193,7,.55)':'rgba(59,130,246,.5)')+';border-radius:13px;padding:12px 14px;display:flex;align-items:center;gap:12px">'
          +'<div style="font-size:26px">⏰</div><div style="flex:1"><div style="font-size:10px;color:'+(urg?'#ffd54f':'#7DB8FF')+';font-weight:800;letter-spacing:.5px">PRÓXIMO VENCIMENTO</div>'
          +'<div style="font-size:13px;font-weight:800;color:#fff">'+p.desc+'</div>'
          +'<div style="font-size:11px;color:#c9d6e8">'+(p.valor?moeda(p.valor)+' · ':'')+quando+' ('+dtBR(p.venc)+')</div></div></div>';
      }else{
        html='<div style="background:linear-gradient(135deg,#0f2818,#143d24);border:1px solid rgba(52,211,153,.5);border-radius:13px;padding:12px 14px;display:flex;align-items:center;gap:12px">'
          +'<div style="font-size:26px">✅</div><div><div style="font-size:13px;font-weight:800;color:#fff">Tudo em dia!</div>'
          +'<div style="font-size:11px;color:#9fe8c5">Nenhum pagamento pendente no momento.</div></div></div>';
      }
      c.innerHTML=html;
    }catch(e){}
    ocupado=false;
  }
  [1500,4000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,90000);
})();

/* APARAT - Botao WhatsApp flutuante no app do cliente */
;(function(){
  if(window.__APARAT_WAFLUT__) return; window.__APARAT_WAFLUT__=1;
  function tick(){
    try{
      var va=document.getElementById('view-app'); if(!va) return;
      var b=document.getElementById('ap-wa-flut');
      if(!b){
        b=document.createElement('a'); b.id='ap-wa-flut';
        b.href='https://wa.me/5516988699203?text='+encodeURIComponent('Olá, Daniel! Sou cliente da APARAT e preciso de ajuda.');
        b.target='_blank'; b.rel='noopener';
        b.style.cssText='position:fixed;right:14px;bottom:92px;z-index:95;width:52px;height:52px;border-radius:50%;background:#25D366;display:none;align-items:center;justify-content:center;font-size:27px;box-shadow:0 4px 14px rgba(0,0,0,.45),0 0 14px rgba(37,211,102,.55);text-decoration:none';
        b.textContent='💬';
        document.body.appendChild(b);
      }
      var vis = va.style.display!=='none' && va.offsetParent!==null && typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE;
      b.style.display=vis?'flex':'none';
    }catch(e){}
  }
  [800,2000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,2500);
})();

/* APARAT - Nomes mais simples + icones maiores no app do cliente */
;(function(){
  if(window.__APARAT_NOMES__) return; window.__APARAT_NOMES__=1;
  var MAPA={'Guias e Obrigações':'Minhas Guias','Faturamento':'Minhas Vendas','Obrigações':'Minhas Guias'};
  function css(){
    if(document.getElementById('ap-nomes-css')) return;
    var st=document.createElement('style'); st.id='ap-nomes-css';
    st.textContent='.qc-icon{font-size:32px !important}.qc-lbl{font-size:12px !important;font-weight:800 !important}';
    document.head.appendChild(st);
  }
  function tick(){
    try{
      css();
      var t=document.getElementById('ap-backtit');
      if(t && MAPA[t.textContent]) t.textContent=MAPA[t.textContent];
      var fin=document.querySelector('#nb-financeiro .nbl'); if(fin && fin.textContent==='Finanças') fin.textContent='Vendas';
      var qs=document.querySelectorAll('#ap-home .qcard');
      qs.forEach(function(q){
        var l=q.querySelector('.qc-lbl'); if(!l) return;
        if(l.textContent==='Guias') l.textContent='Minhas Guias';
        if(l.textContent==='Finanças') l.textContent='Minhas Vendas';
      });
    }catch(e){}
  }
  [600,1500,3000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,3000);
})();

/* APARAT - Bolinha de novidade nas abas do cliente + resumos reais na home */
;(function(){
  if(window.__APARAT_ABADOT__) return; window.__APARAT_ABADOT__=1;
  var SECS=[
    {sec:'honorarios', nb:'nb-honorarios', col:'honorarios'},
    {sec:'obrig',      nb:'nb-obrig',      col:'obrigacoes'},
    {sec:'docs',       nb:'nb-docs',       col:'docs'},
    {sec:'urgencias',  nb:'nb-urgencias',  col:'urgencias'}
  ];
  var contagens={};
  function chave(sec){return 'apSeen_'+(CURRENT_CLIENTE||'')+'_'+sec;}
  function lida(sec){try{return parseInt(localStorage.getItem(chave(sec))||'0',10)||0;}catch(e){return 0;}}
  function marcar(sec){try{if(contagens[sec]!=null)localStorage.setItem(chave(sec),String(contagens[sec]));}catch(e){} dot(sec,false);}
  function dot(sec,mostrar){
    var s=SECS.find(function(x){return x.sec===sec;}); if(!s) return;
    var nb=document.getElementById(s.nb); if(!nb) return;
    nb.style.position='relative';
    var velho=nb.querySelector('.nbdot'); if(velho) velho.style.display='none';
    var d=nb.querySelector('.ap-tabdot');
    if(!d){d=document.createElement('span');d.className='ap-tabdot';d.style.cssText='position:absolute;top:2px;right:10px;width:8px;height:8px;background:#ff4d5a;border-radius:50%;box-shadow:0 0 6px rgba(255,77,90,.8);display:none';nb.appendChild(d);}
    d.style.display=mostrar?'block':'none';
  }
  async function contar(nome){
    for(var i=0;i<SECS.length;i++){
      var s=SECS[i]; var n=0;
      try{var r=await fdb.collection(s.col).where('cliente','==',nome).get(); n+=r.size;}catch(e){}
      if(s.col==='urgencias'){
        try{var r2=await fdb.collection('urgencias').where('dest','==',nome).get(); n+=r2.size;}catch(e){}
      }
      contagens[s.sec]=n;
      dot(s.sec, n>lida(s.sec));
    }
  }
  function resumo(){
    try{
      var qs=document.querySelectorAll('#ap-home .qcard');
      qs.forEach(function(q){
        var l=q.querySelector('.qc-lbl'), sub=q.querySelector('.qc-sub'); if(!l||!sub) return;
        var tx=l.textContent;
        if(/Guias/.test(tx) && contagens.obrig!=null) sub.textContent=contagens.obrig>0?(contagens.obrig+' no total'):'Nenhuma';
        if(/Avisos/.test(tx) && contagens.urgencias!=null){var nov=Math.max(0,contagens.urgencias-lida('urgencias'));sub.textContent=nov>0?(nov+' novo'+(nov>1?'s':'')):'Sem novidades';}
        if(/Vendas|Finanças/.test(tx)) sub.textContent='Ver resumo';
      });
    }catch(e){}
  }
  function wrap(){
    if(typeof window.aPage!=='function'||window.aPage.__apDotWrapped) return;
    var orig=window.aPage;
    var w=function(key){var r=orig.apply(this,arguments);try{marcar(key);resumo();}catch(e){}return r;};
    w.__apDotWrapped=1; window.aPage=w;
  }
  var ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true;
    try{
      wrap();
      if(typeof CURRENT_CLIENTE!=='undefined'&&CURRENT_CLIENTE&&typeof fdb!=='undefined'){
        await contar(CURRENT_CLIENTE); resumo();
      }
    }catch(e){}
    ocupado=false;
  }
  [2000,5000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,60000);
})();

/* APARAT v38 - Melhorias na TELA REAL do cliente (view-cliente) */
;(function(){
  if(window.__APARAT_CLIUI2__) return; window.__APARAT_CLIUI2__=1;
  function num(v){var n=parseFloat(String(v==null?'':v).replace(/[^0-9.,-]/g,'').replace(',','.'));return isNaN(n)?0:n;}
  function hojeISO(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function dtBR(iso){var p=String(iso||'').split('-');return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso;}
  function dias(iso){try{return Math.round((new Date(iso+'T00:00:00')-new Date(hojeISO()+'T00:00:00'))/86400000);}catch(e){return 9999;}}
  function moeda(v){try{return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}catch(e){return 'R$ '+v;}}
  function vcVisivel(){var vc=document.getElementById('view-cliente');return vc && vc.style.display!=='none' && vc.offsetParent!==null;}

  /* 1) Card Proximo Vencimento no topo */
  async function coletar(nome){
    var itens=[];
    try{
      var h=await fdb.collection('honorarios').where('cliente','==',nome).get();
      h.forEach(function(d){var x=d.data();var st=String(x.status||'').toLowerCase();
        if(st.indexOf('pago')<0 && x.vencimento) itens.push({desc:'Honorário '+(x.referencia||''),valor:num(x.valor),venc:String(x.vencimento)});});
    }catch(e){}
    try{
      var o=await fdb.collection('obrigacoes').where('cliente','==',nome).get();
      o.forEach(function(d){var x=d.data();var st=String(x.status||'').toLowerCase();
        if(!/pago|conclu|entreg|recebid|emitid|lanc/.test(st) && x.vencimento) itens.push({desc:x.tipo||x.titulo||'Guia/Imposto',valor:num(x.valor),venc:String(x.vencimento)});});
    }catch(e){}
    return itens.filter(function(i){return /^\d{4}-\d{2}-\d{2}/.test(i.venc);});
  }
  async function cardVenc(nome){
    var topo=document.getElementById('cli-topo'); if(!topo) return;
    var c=document.getElementById('ap-proxvenc2');
    if(!c){c=document.createElement('div');c.id='ap-proxvenc2';c.style.cssText='margin:10px 0';topo.parentNode.insertBefore(c,topo.nextSibling);}
    var itens=await coletar(nome);
    itens.sort(function(a,b){return a.venc<b.venc?-1:1;});
    var atras=itens.filter(function(i){return dias(i.venc)<0;});
    var prox=itens.filter(function(i){return dias(i.venc)>=0;});
    var html;
    if(atras.length){
      var a=atras[0];
      html='<div style="background:linear-gradient(135deg,#2a0f16,#3d1420);border:1px solid rgba(255,77,90,.55);border-radius:13px;padding:13px 15px;display:flex;align-items:center;gap:12px">'
        +'<div style="font-size:28px">⚠️</div><div style="flex:1"><div style="font-size:10px;color:#ff8f9a;font-weight:800;letter-spacing:.5px">EM ATRASO</div>'
        +'<div style="font-size:14px;font-weight:800;color:#fff">'+a.desc+'</div>'
        +'<div style="font-size:12px;color:#ffb3ba">'+(a.valor?moeda(a.valor)+' · ':'')+'venceu em '+dtBR(a.venc)+'</div></div></div>';
    }else if(prox.length){
      var p=prox[0]; var dd=dias(p.venc);
      var quando=dd===0?'vence HOJE':(dd===1?'vence amanhã':'vence em '+dd+' dias');
      var urg=dd<=3;
      html='<div style="background:linear-gradient(135deg,'+(urg?'#2a2210,#3d3114':'#0f1c28,#14293d')+');border:1px solid '+(urg?'rgba(255,193,7,.55)':'rgba(59,130,246,.5)')+';border-radius:13px;padding:13px 15px;display:flex;align-items:center;gap:12px">'
        +'<div style="font-size:28px">⏰</div><div style="flex:1"><div style="font-size:10px;color:'+(urg?'#ffd54f':'#7DB8FF')+';font-weight:800;letter-spacing:.5px">PRÓXIMO VENCIMENTO</div>'
        +'<div style="font-size:14px;font-weight:800;color:#fff">'+p.desc+'</div>'
        +'<div style="font-size:12px;color:#c9d6e8">'+(p.valor?moeda(p.valor)+' · ':'')+quando+' ('+dtBR(p.venc)+')</div></div></div>';
    }else{
      html='<div style="background:linear-gradient(135deg,#0f2818,#143d24);border:1px solid rgba(52,211,153,.5);border-radius:13px;padding:13px 15px;display:flex;align-items:center;gap:12px">'
        +'<div style="font-size:28px">✅</div><div><div style="font-size:14px;font-weight:800;color:#fff">Tudo em dia!</div>'
        +'<div style="font-size:12px;color:#9fe8c5">Nenhum pagamento pendente no momento.</div></div></div>';
    }
    c.innerHTML=html;
  }

  /* 2) Botao WhatsApp flutuante */
  function botaoWa(){
    var b=document.getElementById('ap-wa-flut2');
    if(!b){
      b=document.createElement('a'); b.id='ap-wa-flut2';
      b.href='https://wa.me/5516988699203?text='+encodeURIComponent('Olá, Daniel! Sou cliente da APARAT e preciso de ajuda.');
      b.target='_blank'; b.rel='noopener'; b.title='Falar com a APARAT no WhatsApp';
      b.style.cssText='position:fixed;left:14px;bottom:150px;z-index:96;width:52px;height:52px;border-radius:50%;background:#25D366;display:none;align-items:center;justify-content:center;font-size:27px;box-shadow:0 4px 14px rgba(0,0,0,.45),0 0 14px rgba(37,211,102,.55);text-decoration:none';
      b.textContent='💬';
      document.body.appendChild(b);
    }
    b.style.display=(vcVisivel() && typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE)?'flex':'none';
  }

  /* 3) Nomes mais simples */
  function nomes(){
    try{
      if(typeof CLI_NOMES!=='undefined'){CLI_NOMES.fat='Minhas Vendas';CLI_NOMES.obr='Minhas Guias';}
      var sf=document.querySelector('#sec-fat .asec'); if(sf && /Controle de Faturamento/.test(sf.textContent)) sf.textContent='📈 Minhas Vendas';
      var so=document.querySelector('#sec-obr .asec'); if(so && /Suas Obrigações/.test(so.textContent)) so.textContent='📋 Minhas Guias';
      document.querySelectorAll('.botnav button').forEach(function(bt){
        if(/Faturam\./.test(bt.textContent)) bt.innerHTML=bt.innerHTML.replace('Faturam.','Vendas');
        if(/Obrig\./.test(bt.textContent)) bt.innerHTML=bt.innerHTML.replace('Obrig.','Guias');
      });
    }catch(e){}
  }

  /* 4) Bolinha de novidade nas secoes */
  var SECS=[
    {sec:'sec-hon', col:'honorarios'},
    {sec:'sec-obr', col:'obrigacoes'},
    {sec:'sec-doc', col:'docs'},
    {sec:'sec-age', col:'agenda'}
  ];
  var contagens={};
  function chave(sec){return 'apSeen2_'+(CURRENT_CLIENTE||'')+'_'+sec;}
  function lida(sec){try{return parseInt(localStorage.getItem(chave(sec))||'0',10)||0;}catch(e){return 0;}}
  function marcar(sec){try{if(contagens[sec]!=null)localStorage.setItem(chave(sec),String(contagens[sec]));}catch(e){} dot(sec,false);}
  function dot(sec,mostrar){
    var s=document.getElementById(sec); if(!s) return;
    var h=s.querySelector('.asec'); if(!h) return;
    h.style.position='relative';
    var d=h.querySelector('.ap-secdot');
    if(!d){d=document.createElement('span');d.className='ap-secdot';d.style.cssText='display:none;margin-left:8px;width:9px;height:9px;background:#ff4d5a;border-radius:50%;box-shadow:0 0 7px rgba(255,77,90,.85);vertical-align:middle';h.appendChild(d);}
    d.style.display=mostrar?'inline-block':'none';
    var bt=document.querySelector('.botnav button[data-go="'+sec+'"]');
    if(bt){
      bt.style.position='relative';
      var bd=bt.querySelector('.ap-secdot');
      if(!bd){bd=document.createElement('span');bd.className='ap-secdot';bd.style.cssText='display:none;position:absolute;top:3px;right:8px;width:8px;height:8px;background:#ff4d5a;border-radius:50%;box-shadow:0 0 6px rgba(255,77,90,.8)';bt.appendChild(bd);}
      bd.style.display=mostrar?'block':'none';
    }
  }
  async function contar(nome){
    for(var i=0;i<SECS.length;i++){
      var s=SECS[i]; var n=0;
      try{var r=await fdb.collection(s.col).where('cliente','==',nome).get(); n=r.size;}catch(e){}
      contagens[s.sec]=n;
      dot(s.sec, n>lida(s.sec));
    }
  }
  function wrapGo(){
    if(typeof window.cliGo!=='function'||window.cliGo.__apDot2) return;
    var orig=window.cliGo;
    var w=function(id,el){var r=orig.apply(this,arguments);try{marcar(id);}catch(e){}return r;};
    w.__apDot2=1; window.cliGo=w;
  }

  var ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true;
    try{
      wrapGo(); botaoWa();
      if(vcVisivel() && typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE && typeof fdb!=='undefined'){
        nomes();
        await cardVenc(CURRENT_CLIENTE);
        await contar(CURRENT_CLIENTE);
      }
    }catch(e){}
    ocupado=false;
  }
  [1500,4000,8000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,60000);
})();

/* APARAT v39 - Esconde secoes vazias no app do cliente (reaparecem quando tiverem conteudo) */
;(function(){
  if(window.__APARAT_SECVAZIA__) return; window.__APARAT_SECVAZIA__=1;
  function tick(){
    try{
      var vc=document.getElementById('view-cliente'); if(!vc) return;
      vc.querySelectorAll('.cli-sec').forEach(function(s){
        var head=s.querySelector('.asec');
        var corpo=(s.textContent||'').replace(head?head.textContent:'','').trim();
        var temForm=!!s.querySelector('input,textarea,select,button');
        var vazia=/^Nenhum/i.test(corpo) && !temForm;
        s.style.display=vazia?'none':'';
      });
    }catch(e){}
  }
  [1200,3000,6000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,5000);
})();

/* APARAT v41 - APP DO CLIENTE EM QUADRADINHOS (paginas no lugar, sem mover nada) */
;(function(){
  if(window.__APARAT_TILES__) return; window.__APARAT_TILES__=41;
  var TILES=[
    {k:'hon',    ic:'\u{1F4B3}', lb:'Honor\u00e1rios',     alvos:['sec-hon'],                       col:'honorarios'},
    {k:'obr',    ic:'\u{1F4CB}', lb:'Minhas Guias',   alvos:['sec-obr'],                       col:'obrigacoes'},
    {k:'fat',    ic:'\u{1F4C8}', lb:'Faturamento',    alvos:['sec-fat'],                       col:null},
    {k:'avisos', ic:'\u{1F514}', lb:'Avisos',         alvos:['ap-blk-avisos','sec-inf'],       col:null},
    {k:'dados',  ic:'\u{1F464}', lb:'Meus Dados',     alvos:['sec-dados','sec-docs','sec-doc'],col:'docs'},
    {k:'pedidos',ic:'\u{1F4E8}', lb:'Meus Pedidos',   alvos:['sec-pedidos'],                   col:'pedidos'},
    {k:'nota',   ic:'\u{1F9FE}', lb:'Enviar Nota',    alvos:['sec-notas'],                     col:null},
    {k:'extrato',ic:'\u{1F3E6}', lb:'Meus Extratos',  alvos:['sec-extratos','ap-blk-arq'],    col:null},
    {k:'falar',  ic:'\u{1F4AC}', lb:'Falar Conosco',  alvos:['ap-blk-falar'],                  col:null}
  ];
  var SETA='<svg viewBox="0 0 24 24" fill="none" style="width:26px;height:26px"><path d="M15.5 4 8 12l7.5 8" stroke="#9cc4ff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function css(){
    if(document.getElementById('ap-tiles-css')) return;
    var st=document.createElement('style'); st.id='ap-tiles-css';
    st.textContent=
      'body.ap-tiles-on #view-cliente .cli-atalhos,body.ap-tiles-on .botnav{display:none !important}'
      +'body.ap-tiles-on #view-cliente:not(.ap-open) .cli-grid{display:none !important}'
      +'#view-cliente{font-size:15px}'
      +'#ap-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:14px auto 8px;max-width:520px}'
      +'#view-cliente.ap-open #ap-grid{display:none !important}'
      +'.ap-tile{position:relative;aspect-ratio:1/1;border-radius:19px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:linear-gradient(160deg,#1b2b4f 0%,#131f3a 70%);border:1.5px solid #31497c;box-shadow:0 6px 16px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.06);cursor:pointer}'
      +'.ap-tile .ic{width:50px;height:50px;border-radius:14px;background:rgba(91,141,255,.14);border:1px solid rgba(91,141,255,.3);display:flex;align-items:center;justify-content:center;font-size:28px}'
      +'.ap-tile .lb{font-size:14px;font-weight:800;text-align:center;line-height:1.15;padding:0 4px;color:#eef3fc}'
      +'.ap-tile .dt{position:absolute;top:8px;right:8px;min-width:16px;height:16px;background:#ff2d40;border-radius:9px;border:2.5px solid #131f3a;box-shadow:0 0 8px rgba(255,45,64,.9);display:none}'
      +'#view-cliente.ap-open [data-aphide="1"]{display:none !important}'
      +'#view-cliente.ap-open .cli-grid{display:block !important}'
      +'#view-cliente.ap-open .ap-alvo{display:block !important}'
      +'#view-cliente.ap-open .ap-alvo .asec{display:none !important}'
      +'#ap-pg-top{position:sticky;top:0;z-index:60;background:rgba(10,15,30,.97);border-bottom:1px solid #223258;display:flex;align-items:center;gap:13px;padding:12px 14px;margin:0 -14px 14px}'
      +'#ap-pg-volta{width:48px;height:48px;border-radius:50%;background:#101a3a;border:3px solid #3B82F6;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px #3B82F6,0 0 24px rgba(59,130,246,.55);cursor:pointer;flex-shrink:0}'
      +'#ap-pg-tit{font-size:21px;font-weight:800}'
      +'#ap-pg-cli{font-size:13px;color:#8fa5c9;margin-top:1px}'
      +'#ap-pg-logo{margin-left:auto;width:38px;height:38px;border-radius:11px;background:#0D1A33;border:1.5px solid #2c4370;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;color:#5b8dff}'
      +'#view-cliente.ap-open .lcinfo strong{font-size:15px}'
      +'#view-cliente.ap-open .lcinfo span{font-size:13px}'
      +'#view-cliente.ap-open .tag{font-size:13px;padding:6px 12px}'
      +'#view-cliente.ap-open .asec2{font-size:16px !important}'
      +'#view-cliente.ap-open input,#view-cliente.ap-open textarea{font-size:15px !important;padding:12px !important}'
      +'#view-cliente.ap-open .btn{font-size:16px !important;padding:14px !important;border-radius:13px !important}'
      +'#view-cliente.ap-open .fbox-light{background:transparent;border:0;padding:0}';
    document.head.appendChild(st);
  }
  function vc(){return document.getElementById('view-cliente');}
  function vcOk(){var v=vc();return v&&v.querySelector('.cli-grid')&&typeof CURRENT_CLIENTE!=='undefined'&&CURRENT_CLIENTE;}
  function blocos(){
    var fb=document.querySelector('#sec-sol .fbox-light'); if(!fb||fb.dataset.apBlk) return; fb.dataset.apBlk='1';
    var mapa=[{id:'ap-blk-avisos',re:/Avisos/},{id:'ap-blk-falar',re:/Falar com o Escrit/},{id:'ap-blk-arq',re:/Enviar Arquivos/}];
    var atual=null; var kids=[].slice.call(fb.childNodes);
    kids.forEach(function(nd){
      if(nd.nodeType===1 && nd.classList && nd.classList.contains('asec2')){
        var m=null; for(var i=0;i<mapa.length;i++){ if(mapa[i].re.test(nd.textContent)){m=mapa[i];break;} }
        if(m){ atual=document.createElement('div'); atual.id=m.id; fb.insertBefore(atual,nd); }
      }
      if(atual && nd!==atual) atual.appendChild(nd);
    });
    var f=document.getElementById('ap-blk-falar');
    if(f && !document.getElementById('ap-blk-zap')){
      var z=document.createElement('a'); z.id='ap-blk-zap';
      z.href='https://wa.me/5516988699203?text='+encodeURIComponent('Ol\u00e1, Daniel! Sou cliente da APARAT.');
      z.target='_blank'; z.rel='noopener';
      z.style.cssText='display:flex;align-items:center;gap:12px;background:linear-gradient(160deg,#0f2e1c,#0c2416);border:1.5px solid rgba(52,211,153,.5);border-radius:14px;padding:14px;margin-top:12px;text-decoration:none;color:#fff';
      z.innerHTML='<span style="font-size:28px">\u{1F4AC}</span><span><b style="font-size:15px">WhatsApp direto</b><br><span style="font-size:13px;color:#9fe8c5">(16) 98869-9203 \u00b7 resposta mais r\u00e1pida</span></span>';
      f.appendChild(z);
    }
  }
  function limparMarcas(){
    document.querySelectorAll('[data-aphide]').forEach(function(e){e.removeAttribute('data-aphide');});
    document.querySelectorAll('.ap-alvo').forEach(function(e){e.classList.remove('ap-alvo');});
  }
  function marcarCaminho(el){
    var v=vc(); var alvo=el;
    el.classList.add('ap-alvo');
    while(el && el!==v){
      var pai=el.parentElement; if(!pai) break;
      [].slice.call(pai.children).forEach(function(irmao){
        if(irmao!==el && !irmao.classList.contains('ap-alvo') && !irmao.hasAttribute('data-apkeep') && irmao.id!=='ap-pg-top' && !irmao.querySelector('.ap-alvo')){
          irmao.setAttribute('data-aphide','1');
        }
      });
      el=pai;
    }
  }
  function topo(t){
    var v=vc();
    var h=document.getElementById('ap-pg-top');
    if(!h){
      h=document.createElement('div'); h.id='ap-pg-top';
      h.innerHTML='<div id="ap-pg-volta">'+SETA+'</div><div><div id="ap-pg-tit"></div><div id="ap-pg-cli"></div></div><div id="ap-pg-logo">A</div>';
      v.insertBefore(h,v.firstChild);
      document.getElementById('ap-pg-volta').onclick=function(){fechar();};
    }
    h.style.display='flex';
    document.getElementById('ap-pg-tit').textContent=t.ic+' '+t.lb;
    document.getElementById('ap-pg-cli').textContent=CURRENT_CLIENTE||'';
  }
  function abrir(t){
    css(); blocos();
    var v=vc(); if(!v) return;
    limparMarcas();
    var achou=false;
    t.alvos.forEach(function(id){ var el=document.getElementById(id); if(el){ marcarCaminho(el); achou=true; } });
    if(!achou) return;
    v.classList.add('ap-open');
    topo(t);
    try{window.scrollTo({top:0});}catch(e){} try{v.scrollTop=0;}catch(e){}
    try{marcarVisto(t);}catch(e){}
    try{ if(!(history.state&&history.state.apTile)) history.pushState({apTile:1},''); }catch(e){}
  }
  function fechar(pop){
    var v=vc(); if(!v) return;
    v.classList.remove('ap-open');
    limparMarcas();
    var h=document.getElementById('ap-pg-top'); if(h)h.style.display='none';
    try{window.scrollTo({top:0});}catch(e){}
    if(pop!==false){ try{ if(history.state&&history.state.apTile) history.back(); }catch(e){} }
  }
  window.addEventListener('popstate',function(){ var v=vc(); if(v&&v.classList.contains('ap-open')) fechar(false); });
  function chave(k){return 'apSeen2_'+(CURRENT_CLIENTE||'')+'_tile_'+k;}
  var contagens={};
  function marcarVisto(t){ if(contagens[t.k]!=null){ try{localStorage.setItem(chave(t.k),String(contagens[t.k]));}catch(e){} } var d=document.querySelector('.ap-tile[data-k="'+t.k+'"] .dt'); if(d)d.style.display='none'; }
  async function badges(){
    for(var i=0;i<TILES.length;i++){
      var t=TILES[i]; if(!t.col) continue;
      var n=0; try{var r=await fdb.collection(t.col).where('cliente','==',CURRENT_CLIENTE).get(); n=r.size;}catch(e){}
      contagens[t.k]=n;
      var vis=0; try{vis=parseInt(localStorage.getItem(chave(t.k))||'0',10)||0;}catch(e){}
      var d=document.querySelector('.ap-tile[data-k="'+t.k+'"] .dt'); if(d)d.style.display=(n>vis)?'block':'none';
    }
    var n2=0;
    try{var a=await fdb.collection('urgencias').where('dest','==',CURRENT_CLIENTE).get(); n2+=a.size;}catch(e){}
    try{var b=await fdb.collection('urgencias').where('dest','==','Todos os Clientes').get(); n2+=b.size;}catch(e){}
    contagens['avisos']=n2;
    var v2=0; try{v2=parseInt(localStorage.getItem(chave('avisos'))||'0',10)||0;}catch(e){}
    var d2=document.querySelector('.ap-tile[data-k="avisos"] .dt'); if(d2)d2.style.display=(n2>v2)?'block':'none';
  }
  function grade(){
    if(document.getElementById('ap-grid')){ document.body.classList.add('ap-tiles-on'); return; }
    var seg=document.querySelector('#view-cliente .segbadge'); if(!seg) return;
    var g=document.createElement('div'); g.id='ap-grid';
    TILES.forEach(function(t){
      var d=document.createElement('div'); d.className='ap-tile'; d.setAttribute('data-k',t.k);
      d.innerHTML='<span class="dt"></span><div class="ic">'+t.ic+'</div><div class="lb">'+t.lb+'</div>';
      d.onclick=function(){abrir(t);};
      g.appendChild(d);
    });
    seg.parentNode.insertBefore(g,seg.nextSibling);
    document.body.classList.add('ap-tiles-on');
  }
  var ocupado=false;
  async function tick(){
    if(ocupado)return; ocupado=true;
    try{
      if(vcOk()){ css(); blocos(); grade(); await badges(); }
      else if(!document.getElementById('view-cliente') || !CURRENT_CLIENTE){ document.body.classList.remove('ap-tiles-on'); }
    }catch(e){}
    ocupado=false;
  }
  [1200,3000,6000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,8000);
})();

/* APARAT v40 - Assistente virtual PROFESSOR do novo app */
;(function(){
  if(window.__APARAT_BOT2__) return; window.__APARAT_BOT2__=1;
  function pronto(){return typeof window.responderAssistente==='function' && !window.responderAssistente.__apBot2;}
  function instalar(){
    if(!pronto()) return;
    var orig=window.responderAssistente;
    var GUIA='A tela inicial do app tem <b>quadradinhos</b> — cada um abre uma função:<br>'
      +'💳 <b>Honorários</b> — seus boletos e o PIX para pagar<br>'
      +'📋 <b>Minhas Guias</b> — DAS e impostos com vencimento<br>'
      +'📈 <b>Faturamento</b> — suas vendas mês a mês e o limite anual<br>'
      +'🔔 <b>Avisos</b> — recados do escritório (bolinha vermelha = novidade)<br>'
      +'👤 <b>Meus Dados</b> — CNPJ, inscrições e documentos da empresa<br>'
      +'🧾 <b>Enviar Nota</b> — mandar nota fiscal para a Aparat<br>'
      +'📤 <b>Enviar Extrato</b> — mandar o extrato do banco (PDF/OFX)<br>'
      +'💬 <b>Falar Conosco</b> — mensagem direta para o Daniel<br><br>'
      +'Para <b>voltar</b>, toque na <b>seta azul brilhante ←</b> no topo. E o 📅 no canto abre o calendário de vencimentos!';
    var w=async function(q){
      var t=(q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      function has(){for(var i=0;i<arguments.length;i++){if(t.indexOf(arguments[i])>-1)return true;}return false;}
      if(has('quadradinho','quadrado','icone','ícone','tela inicial','como usar o app','como mexer','me ensina o app','nao acho','não acho','onde fica','como abro','sumiu','cade o menu','navegar'))
        return GUIA;
      if(has('voltar','seta'))
        return 'Para voltar à tela dos quadradinhos, toque na <b>seta azul brilhante ←</b> que fica no canto de cima, à esquerda. Ela aparece em todas as telas abertas. 😊';
      if(has('bolinha vermelha','bolinha no'))
        return 'A <b>bolinha vermelha</b> em cima de um quadradinho significa que tem <b>novidade</b> ali (uma guia nova, um aviso, um documento). É só tocar no quadradinho que ela some. 😊';
      var r=await orig.apply(this,arguments);
      return r;
    };
    w.__apBot2=1; window.responderAssistente=w;
    // chip extra de ajuda
    if(typeof window.mostrarChips==='function' && !window.mostrarChips.__apBot2){
      var oc=window.mostrarChips;
      var w2=function(){ oc.apply(this,arguments);
        try{
          var m=document.getElementById('apchat-msgs'); var d=m&&m.querySelector('.apchat-chips:last-child');
          if(d && !d.querySelector('.ap-chip-usar')){
            var b=document.createElement('span'); b.className='apchat-chip ap-chip-usar'; b.textContent='❓ Como usar o app';
            b.onclick=function(){ document.getElementById('apchat-in').value='como usar o app'; enviarChat(); };
            d.insertBefore(b,d.firstChild);
          }
        }catch(e){}
      };
      w2.__apBot2=1; window.mostrarChips=w2;
    }
  }
  [800,2000,4000].forEach(function(t){setTimeout(instalar,t);});
  setInterval(instalar,5000);
})();

/* APARAT v42 - Faturamento do cliente de volta ao quadradinho + seletor de mes visivel */
;(function(){
  if(window.__APARAT_FATFIX__) return; window.__APARAT_FATFIX__=1;
  function css(){
    if(document.getElementById('ap-fatfix-css')) return;
    var st=document.createElement('style'); st.id='ap-fatfix-css';
    st.textContent='#cli-fat-mes{font-size:15px !important;padding:10px !important;font-weight:700;border-radius:10px;background:#101a3a;color:#fff;border:1.5px solid #2c4370}'
      +'#view-cliente.ap-open #cli-fat .lcard{font-size:14px}';
    document.head.appendChild(st);
  }
  function tick(){
    try{
      css();
      // desligar o modulo antigo que roubava o faturamento para a tela escondida
      var fin=document.getElementById('ap-financeiro');
      if(fin) fin.id='ap-financeiro-off';
      // trazer o conteudo de volta para dentro do quadradinho Faturamento
      var cf=document.getElementById('cli-fat');
      var sf=document.getElementById('sec-fat');
      if(cf && sf && cf.parentElement!==sf){
        sf.appendChild(cf);
      }
    }catch(e){}
  }
  [800,2000,4000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,2000);
})();

/* APARAT v43 - Cartao PIX dentro do quadradinho Honorarios */
;(function(){
  if(window.__APARAT_PIX2__) return; window.__APARAT_PIX2__=1;
  var CHAVE='e140ad9c-8e55-4fa4-853c-ebbc3a18c3c3';
  function copiar(){
    try{
      navigator.clipboard.writeText(CHAVE).then(function(){
        var b=document.getElementById('ap-pix2-btn');
        if(b){ b.textContent='✅ Chave copiada! Cole no app do seu banco'; setTimeout(function(){ b.textContent='📋 Copiar chave PIX'; },4000); }
      });
    }catch(e){
      try{
        var ta=document.createElement('textarea'); ta.value=CHAVE; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        var b2=document.getElementById('ap-pix2-btn');
        if(b2){ b2.textContent='✅ Chave copiada!'; setTimeout(function(){ b2.textContent='📋 Copiar chave PIX'; },4000); }
      }catch(e2){}
    }
  }
  window.copiarPixAparat2=copiar;
  function tick(){
    try{
      var sh=document.getElementById('sec-hon'); if(!sh) return;
      if(document.getElementById('ap-pix2')) return;
      var d=document.createElement('div'); d.id='ap-pix2';
      d.innerHTML=
        '<div style="background:linear-gradient(160deg,#0f2e1c,#0c2416);border:1.5px solid rgba(52,211,153,.5);border-radius:15px;padding:15px;margin-top:14px">'
        +'<div style="font-size:16px;font-weight:800;color:#fff">Pagar com PIX</div>'
        +'<div style="font-size:14px;color:#b9e8cd;margin-top:7px;line-height:1.55;word-break:break-all"><b>Favorecido:</b> APARAT CONTABILIDADE LTDA<br><b>Chave:</b> '+CHAVE+'</div>'
        +'</div>'
        +'<button id="ap-pix2-btn" onclick="copiarPixAparat2()" style="display:block;width:100%;background:linear-gradient(150deg,#2b6dff,#1a3fd6);color:#fff;border:0;border-radius:13px;padding:15px;font-size:16px;font-weight:800;margin-top:10px;cursor:pointer;box-shadow:0 5px 14px rgba(43,109,255,.4)">📋 Copiar chave PIX</button>';
      sh.appendChild(d);
    }catch(e){}
  }
  [1500,3500,7000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,5000);
})();

/* APARAT v46 - TEMA CLARO DO APP DO CLIENTE + MENU COM CHAVE DE TEMA
   Escopo: somente a area do cliente (#view-cliente). O painel administrativo nao muda. */
;(function(){
  if(window.__APARAT_TEMA__) return; window.__APARAT_TEMA__=46;

  var CHAVE='apTemaCliente';           /* claro | escuro */
  function lido(){ try{return localStorage.getItem(CHAVE)||'claro';}catch(e){return 'claro';} }
  function grava(v){ try{localStorage.setItem(CHAVE,v);}catch(e){} }

  /* ---------- fonte ---------- */
  function fonte(){
    if(document.getElementById('ap-fonte-poppins')) return;
    var l=document.createElement('link'); l.id='ap-fonte-poppins'; l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }

  /* ---------- folha de estilo do tema claro ---------- */
  function css(){
    if(document.getElementById('ap-tema-css')) return;
    var P='body.ap-tema-claro ';
    var V=P+'#view-cliente ';
    var st=document.createElement('style'); st.id='ap-tema-css';
    st.textContent=

    /* variaveis reescritas dentro da area do cliente */
    P+'#view-cliente{'
      +'--azul:#3355FF;--azul2:#2E7DF6;--azul-light:#2E7DF6;'
      +'--escuro:#F4F7FC;--card:#FFFFFF;--card2:#F5F8FD;--border:#E6EDF7;'
      +'--branco:#0F1B33;--cinza:#66748C;'
      +'--verde:#0E9F6E;--vermelho:#D92D20;--laranja:#B45309;'
      +'background:#F4F7FC !important;color:#0F1B33;'
      +"font-family:'Poppins','Segoe UI',sans-serif;font-size:15.5px}"

    +'body.ap-tema-claro{background:#F4F7FC}'

    /* cabecalho fixo do cliente */
    +V+'.cli-top{background:#FFFFFF;border-bottom:1px solid #E6EDF7;padding:12px 16px}'
    +V+'.cli-top .ct-h{color:#8A97AD;font-size:12px}'
    +V+'.cli-top .ct-n{color:#0F1B33;font-size:16px}'
    +V+'.cli-top img{border-radius:12px;box-shadow:0 2px 8px rgba(16,24,40,.10)}'

    /* cartao de boas-vindas */
    +V+'.wcard{background:linear-gradient(92deg,#0B2A8A 0%,#3355FF 55%,#2E9BF6 100%);'
      +'border-radius:20px;padding:20px 22px;color:#fff;box-shadow:0 10px 30px rgba(20,50,140,.26)}'
    +V+'.wcard h2{font-size:22px}'+V+'.wcard h3{font-size:13px}'+V+'.wcard p{font-size:12.5px}'

    /* selo de seguranca */
    +V+'.segbadge{background:#E7F8EF;border:1px solid #B7E9D1;border-radius:999px;padding:9px 14px}'
    +V+'.segbadge span{color:#0E9F6E;font-size:12.5px;font-weight:600}'

    /* quadradinhos */
    +V+'#ap-grid{max-width:760px;gap:14px}'
    +'@media(max-width:520px){'+V+'#ap-grid{grid-template-columns:1fr 1fr}}'
    +'@media(min-width:900px){'+V+'#ap-grid{grid-template-columns:repeat(4,1fr);max-width:900px}}'
    +V+'.ap-tile{background:#FFFFFF;border:1px solid #E6EDF7;border-radius:18px;'
      +'aspect-ratio:auto;padding:20px 10px;gap:10px;'
      +'box-shadow:0 1px 2px rgba(16,24,40,.05),0 10px 26px rgba(16,24,40,.06)}'
    +V+'.ap-tile:active{transform:scale(.98)}'
    +V+'.ap-tile .ic{background:#EAF1FF;border:1px solid #D6E4FF}'
    +V+'.ap-tile .lb{color:#0F1B33;font-size:14.5px}'
    +V+'.ap-tile .dt{border-color:#FFFFFF;box-shadow:0 0 0 2px #fff}'

    /* cabecalho da pagina aberta */
    +V+'#ap-pg-top{background:#FFFFFF;border-bottom:1px solid #E6EDF7}'
    +V+'#ap-pg-volta{background:#EAF1FF;border-color:#3355FF;box-shadow:none}'
    +V+'#ap-pg-volta path{stroke:#3355FF}'
    +V+'#ap-pg-tit{color:#0F1B33;font-size:20px}'
    +V+'#ap-pg-cli{color:#66748C}'
    +V+'#ap-pg-logo{background:#EAF1FF;border-color:#D6E4FF;color:#3355FF}'

    /* titulos de secao */
    +V+'.asec,'+V+'.asec2{color:#0F1B33}'
    +V+'.asec2{color:#2E7DF6}'
    +V+'.asec a{color:#2E7DF6}'

    /* blocos e cartoes */
    +V+'.fbox-light{background:#FFFFFF;border:1px solid #E6EDF7;border-radius:16px;'
      +'box-shadow:0 1px 2px rgba(16,24,40,.05),0 10px 26px rgba(16,24,40,.06)}'
    +V+'.lcard,'+V+'.docca,'+V+'.achart,'+V+'.agcarda,'+V+'.sgrowa,'+V+'.segr,'+V+'.contato-card,'+V+'.resbox{'
      +'background:#FFFFFF;border:1px solid #E6EDF7;border-radius:14px;'
      +'box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 18px rgba(16,24,40,.05)}'
    +V+'.hon-app-card,'+V+'.hon-card{background:#FFFFFF;border:1px solid #E6EDF7;border-radius:16px;'
      +'box-shadow:0 1px 2px rgba(16,24,40,.05),0 10px 26px rgba(16,24,40,.06)}'
    +V+'.hon-app-header h4,'+V+'.hon-title{color:#2E7DF6}'
    +V+'.hon-valor-app{color:#0F1B33}'
    +V+'.hon-venc-app{color:#66748C}'
    +V+'.hon-hist-item{border-top:1px dashed #D8E3F2;color:#0F1B33}'
    +V+'.hon-row{background:#F8FAFF;border:1px solid #E6EDF7}'
    +V+'.hon-info strong{color:#0F1B33}'

    /* textos que estavam brancos */
    +V+'.lcinfo strong,'+V+'.dinf strong,'+V+'.agia strong,'+V+'.sgrowa .stx strong,'
      +V+'.segr .st strong,'+V+'.rb-val,'+V+'.qc-lbl{color:#0F1B33}'
    +V+'.lcinfo span,'+V+'.dinf span,'+V+'.agia span,'+V+'.sgrowa .stx span,'
      +V+'.segr .st span,'+V+'.rb-lbl,'+V+'.bla,'+V+'.bl2{color:#66748C}'
    +V+'label{color:#66748C;font-size:12.5px;font-weight:600}'

    /* etiquetas de situacao */
    +V+'.tag{border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700}'
    +V+'.tp{background:#E7F8EF;color:#0E9F6E}'
    +V+'.ta{background:#FDECEA;color:#D92D20}'
    +V+'.tn{background:#FDF3E4;color:#B45309}'
    +V+'.ti{background:#EAF1FF;color:#3355FF}'

    /* avisos */
    +V+'.ubanner{background:#FDECEA;border:1px solid #F6C9C4;border-left:5px solid #D92D20;border-radius:14px}'
    +V+'.ubbody{color:#4B5565}'
    +V+'.ubdata{color:#8A97AD}'

    /* formularios */
    +V+'input,'+V+'select,'+V+'textarea{background:#FFFFFF;border:1px solid #D8E3F2;color:#0F1B33;'
      +'border-radius:12px;padding:12px 14px;font-size:15px;font-family:inherit}'
    +V+'input:focus,'+V+'select:focus,'+V+'textarea:focus{border-color:#3355FF;box-shadow:0 0 0 4px rgba(51,85,255,.12)}'
    +V+'input[type="file"]{padding:10px;background:#FBFCFF;border-style:dashed}'

    /* botoes */
    +V+'.btn{border-radius:12px;font-weight:700}'
    +V+'.btn-az{background:linear-gradient(92deg,#0B2A8A 0%,#3355FF 55%,#2E9BF6 100%);color:#fff;'
      +'box-shadow:0 4px 14px rgba(51,85,255,.30)}'
    +V+'.btn-sm{background:#FFFFFF;border:1px solid #D8E3F2;color:#2E7DF6}'
    +V+'.btn-vd{background:#E7F8EF;color:#0E9F6E;border:1px solid #B7E9D1}'
    +V+'.btn-pgto.apagar{background:linear-gradient(92deg,#0B2A8A 0%,#3355FF 55%,#2E9BF6 100%);color:#fff}'
    +V+'.btn-pgto.pago{background:#E7F8EF;color:#0E9F6E;border:1px solid #B7E9D1}'
    +V+'.btndl{background:linear-gradient(92deg,#0B2A8A,#2E9BF6);border-radius:9px;padding:7px 13px;font-size:12px}'

    /* icones redondos das listas */
    +V+'.lcico{border-radius:12px}'
    +V+'.lc-az{background:#EAF1FF}'+V+'.lc-gr{background:#E7F8EF}'
    +V+'.lc-or{background:#FDF3E4}'+V+'.lc-rd{background:#FDECEA}'+V+'.lc-pu{background:#F0EBFF}'
    +V+'.dico{background:#FDECEA;border:1px solid #F6C9C4}'

    /* graficos */
    +V+'.bar-a.r,'+V+'.bar2.r{background:linear-gradient(180deg,#5B8DFF,#3355FF)}'
    +V+'.bar-a.d,'+V+'.bar2.d{background:linear-gradient(180deg,#FFB4AC,#F1705E)}'

    /* tabelas */
    +V+'th{background:#F5F8FD;color:#66748C}'
    +V+'td{color:#0F1B33;border-top:1px solid #E6EDF7}'
    +V+'tr:hover td{background:#F8FAFF}'

    /* barra da LGPD e rodape */
    +P+'#lgpd-bar{background:#FFFFFF;border-top:1px solid #E6EDF7;color:#4B5565}'

    /* etiqueta NOVO nas listas (nao pode esticar) */
    +V+'.lcinfo span.tag-novo{display:inline-block;width:auto;color:#FFFFFF;margin-top:4px}'
    /* cartao do PIX */
    +P+'#ap-pix2>div{background:linear-gradient(135deg,#F0F6FF,#FFFFFF) !important;'
      +'border:1.5px solid #C9DDFB !important;border-radius:16px !important}'
    +P+'#ap-pix2>div>div{color:#0F1B33 !important}'
    +P+'#ap-pix2>div b{color:#0F1B33 !important}'
    /* setas do carrossel de documentos */
    +V+'#cli-docs-carousel button{background:#FFFFFF !important;border:1px solid #D8E3F2 !important;color:#2E7DF6 !important}'
    +V+'#doc-nav-info{color:#66748C !important}'
    /* barra de progresso do faturamento */
    +V+'.lcard div[style*="#0a0a18"]{background:#EDF2FA !important;border-color:#D8E3F2 !important}'
    /* cartao de boas-vindas com o gradiente novo */
    +V+'.wcard{background:linear-gradient(92deg,#0B2A8A 0%,#3355FF 55%,#2E9BF6 100%) !important}'

    /* ---------- ajustes de blocos com estilo embutido ---------- */
    /* barra superior do aplicativo */
    +P+'.top-switch{background:#FFFFFF;border-bottom:1px solid #E6EDF7}'
    +P+'.ts-logo span{color:#0F1B33}'
    +P+'.ts-logo small{color:#2E7DF6}'
    +P+'.ts-info{color:#66748C}'+P+'.ts-info strong{color:#0F1B33}'
    +P+'.live-row{color:#66748C}'
    +P+'.switcher{background:#F5F8FD;border:1px solid #E6EDF7}'
    +P+'.sw-btn{color:#66748C}'
    +P+'.sw-btn.active{background:#3355FF;color:#fff}'
    /* barra de foco do escritorio */
    +P+'.foco-bar{background:#FFFFFF;border:1px solid #E6EDF7}'
    +P+'.foco-bar b{color:#0F1B33}'+P+'.foco-bar .fb-sub{color:#66748C}'
    +P+'.foco-bar .fb-logo{background:#EAF1FF;color:#3355FF}'
    /* cartao do proximo vencimento */
    +P+'#ap-proxvenc2>div{background:#FFFFFF !important;border-width:1px;border-left-width:5px;'
      +'border-radius:14px !important;box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 20px rgba(16,24,40,.06)}'
    +P+'#ap-proxvenc2>div>div>div:first-child{color:#0F1B33 !important}'
    +P+'#ap-proxvenc2>div>div>div+div{color:#4B5565 !important}'
    /* barra de instalacao do aplicativo */
    +P+'#ap-inst-bar{background:#FFFFFF !important;border:1px solid #C9DDFB !important;'
      +'box-shadow:0 8px 26px rgba(16,24,40,.14)}'
    +P+'#ap-inst-bar div{color:#0F1B33 !important}'
    +P+'#ap-inst-bar div[style*="11px"]{color:#66748C !important}'

    /* assistente virtual */
    +P+'.apchat{background:#FFFFFF;border:1px solid #D8E3F2;box-shadow:0 12px 44px rgba(16,24,40,.22)}'
    +P+'.apchat-msgs{background:#F4F7FC}'
    +P+'.apchat-input{background:#FFFFFF;border-top:1px solid #E6EDF7}'
    +P+'.apchat-input input{background:#FFFFFF;border:1px solid #D8E3F2;color:#0F1B33}'
    +P+'.apchat-chip{background:#EAF1FF;border:1px solid #C9DDFB;color:#3355FF}'

    /* ---------- menu lateral (existe nos dois temas) ---------- */
    +'#ap-menu-bt{width:44px;height:44px;flex:0 0 auto;border-radius:12px;cursor:pointer;'
      +'display:flex;align-items:center;justify-content:center;background:#131f3a;border:1.5px solid #31497c}'
    +P+'#ap-menu-bt{background:#FFFFFF;border:1px solid #D8E3F2}'
    +'#ap-menu-bt i{display:block;width:19px;height:2.4px;background:#eef3fc;border-radius:3px;position:relative}'
    +'#ap-menu-bt i::before,#ap-menu-bt i::after{content:"";position:absolute;left:0;width:19px;height:2.4px;'
      +'background:#eef3fc;border-radius:3px}'
    +'#ap-menu-bt i::before{top:-6px}#ap-menu-bt i::after{top:6px}'
    +P+'#ap-menu-bt i,'+P+'#ap-menu-bt i::before,'+P+'#ap-menu-bt i::after{background:#0F1B33}'

    +'#ap-cortina{position:fixed;inset:0;background:rgba(15,27,51,.45);z-index:940;display:none}'
    +'#ap-cortina.on{display:block}'
    +'#ap-gaveta{position:fixed;top:0;left:0;bottom:0;width:288px;max-width:84vw;z-index:950;'
      +'transform:translateX(-100%);transition:transform .26s ease;display:flex;flex-direction:column;'
      +'overflow-y:auto;background:#0f1a33;box-shadow:12px 0 40px rgba(0,0,0,.45)}'
    +P+'#ap-gaveta{background:#FFFFFF;box-shadow:12px 0 40px rgba(16,24,40,.16)}'
    +'#ap-gaveta.on{transform:translateX(0)}'
    +'#ap-gaveta .cab{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #223258}'
    +P+'#ap-gaveta .cab{border-bottom:1px solid #E6EDF7}'
    +'#ap-gaveta .cab img{width:38px;height:38px;border-radius:11px}'
    +'#ap-gaveta .cab b{font-size:15px;color:#eef3fc}'
    +P+'#ap-gaveta .cab b{color:#0F1B33}'
    +'#ap-gaveta .cab .x{margin-left:auto;width:36px;height:36px;border-radius:10px;cursor:pointer;'
      +'border:1px solid #31497c;background:transparent;color:#9fb1d0;font-size:16px}'
    +P+'#ap-gaveta .cab .x{border:1px solid #D8E3F2;color:#66748C}'
    +'#ap-gaveta .grupo{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'
      +'color:#7e8fae;padding:15px 16px 5px}'
    +'#ap-gaveta .it{display:flex;align-items:center;gap:12px;padding:12px 16px;font-size:15px;'
      +'font-weight:600;color:#eef3fc;cursor:pointer;border-left:3px solid transparent}'
    +P+'#ap-gaveta .it{color:#0F1B33}'
    +'#ap-gaveta .it:hover{background:rgba(51,85,255,.16)}'
    +P+'#ap-gaveta .it:hover{background:#EAF1FF}'
    +'#ap-gaveta .it .ei{width:24px;text-align:center;font-size:18px}'
    +'#ap-gaveta .chave{margin-left:auto;width:52px;height:29px;border-radius:999px;position:relative;'
      +'flex:0 0 auto;background:#31497c;transition:.22s}'
    +'#ap-gaveta .chave::after{content:"";position:absolute;top:3px;left:3px;width:23px;height:23px;'
      +'border-radius:50%;background:#fff;transition:.22s;box-shadow:0 2px 6px rgba(0,0,0,.35)}'
    +'body:not(.ap-tema-claro) #ap-gaveta .chave{background:#3355FF}'
    +'body:not(.ap-tema-claro) #ap-gaveta .chave::after{left:26px}'
    +P+'#ap-gaveta .chave{background:#D8E3F2}'
    +P+'#ap-gaveta .chave::after{left:3px}';

    document.head.appendChild(st);
  }

  /* ---------- aplicar o tema ---------- */
  function aplicar(t){
    document.body.classList.toggle('ap-tema-claro', t==='claro');
    var ic=document.getElementById('ap-tema-ic'), tx=document.getElementById('ap-tema-tx');
    if(ic) ic.textContent = (t==='claro') ? '\u{1F319}' : '☀️';
    if(tx) tx.textContent = (t==='claro') ? 'Tema escuro' : 'Tema claro';
    var m=document.querySelector('meta[name="theme-color"]');
    if(m) m.setAttribute('content', t==='claro' ? '#F4F7FC' : '#0a0a18');
  }
  function trocar(){
    var novo = (lido()==='claro') ? 'escuro' : 'claro';
    grava(novo); aplicar(novo);
  }

  /* ---------- menu lateral ---------- */
  var ITENS=[
    {g:'Menu'},
    {k:'',       ic:'\u{1F3E0}', lb:'Início'},
    {k:'hon',    ic:'\u{1F4B3}', lb:'Honorários'},
    {k:'obr',    ic:'\u{1F4CB}', lb:'Minhas Guias'},
    {k:'fat',    ic:'\u{1F4C8}', lb:'Faturamento'},
    {k:'avisos', ic:'\u{1F514}', lb:'Avisos'},
    {g:'Enviar para o escritório'},
    {k:'nota',   ic:'\u{1F9FE}', lb:'Enviar Nota'},
    {k:'extrato',ic:'\u{1F4E4}', lb:'Enviar Extrato'},
    {k:'falar',  ic:'\u{1F4AC}', lb:'Falar Conosco'},
    {g:'Minha conta'},
    {k:'dados',  ic:'\u{1F464}', lb:'Meus Dados'}
  ];
  function gaveta(abrir){
    var g=document.getElementById('ap-gaveta'), c=document.getElementById('ap-cortina');
    if(g) g.classList.toggle('on',!!abrir);
    if(c) c.classList.toggle('on',!!abrir);
  }
  function irPara(k){
    gaveta(false);
    var v=document.getElementById('view-cliente');
    var aberto = v && v.classList.contains('ap-open');
    if(!k){
      if(aberto){ var volta=document.getElementById('ap-pg-volta'); if(volta) volta.click(); }
      try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}
      return;
    }
    var t=document.querySelector('.ap-tile[data-k="'+k+'"]');
    if(t) setTimeout(function(){t.click();},40);
  }
  function montarMenu(){
    if(document.getElementById('ap-gaveta')) return;
    var c=document.createElement('div'); c.id='ap-cortina'; c.onclick=function(){gaveta(false);};
    document.body.appendChild(c);

    var g=document.createElement('nav'); g.id='ap-gaveta';
    var h='<div class="cab"><img src="icone-aparat.png" alt="Aparat"/><b>Aparat Contabilidade</b>'
        +'<button class="x" id="ap-gav-x">✕</button></div>';
    ITENS.forEach(function(i){
      if(i.g){ h+='<div class="grupo">'+i.g+'</div>'; return; }
      h+='<div class="it" data-ir="'+i.k+'"><span class="ei">'+i.ic+'</span>'+i.lb+'</div>';
    });
    h+='<div class="grupo">Aparência</div>'
      +'<div class="it" id="ap-tema-bt"><span class="ei" id="ap-tema-ic">\u{1F319}</span>'
      +'<span id="ap-tema-tx">Tema escuro</span><span class="chave"></span></div>';
    g.innerHTML=h;
    document.body.appendChild(g);

    document.getElementById('ap-gav-x').onclick=function(){gaveta(false);};
    document.getElementById('ap-tema-bt').onclick=trocar;
    [].slice.call(g.querySelectorAll('.it[data-ir]')).forEach(function(el){
      el.onclick=function(){ irPara(el.getAttribute('data-ir')); };
    });
  }
  function botao(){
    var top=document.querySelector('#view-cliente .cli-top');
    if(!top || document.getElementById('ap-menu-bt')) return;
    var b=document.createElement('button'); b.id='ap-menu-bt'; b.setAttribute('aria-label','Abrir menu');
    b.innerHTML='<i></i>';
    b.onclick=function(){ montarMenu(); aplicar(lido()); gaveta(true); };
    top.insertBefore(b, top.firstChild);
  }

  /* ---------- ciclo ---------- */
  function tick(){
    try{
      var v=document.getElementById('view-cliente');
      var ativo = v && v.style.display!=='none' && v.querySelector('.cli-top');
      if(!ativo){ document.body.classList.remove('ap-tema-claro'); return; }
      fonte(); css(); botao(); aplicar(lido());
    }catch(e){}
  }
  [900,2200,4500,8000].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,6000);
})();

/* APARAT v48 - TEMA CLARO DO PAINEL DO ESCRITORIO + CHAVE NO MENU LATERAL
   Escopo: somente o painel administrativo (#view-painel e a barra do topo). */
;(function(){
  if(window.__APARAT_TEMA_ESC__) return; window.__APARAT_TEMA_ESC__=48;

  var CHAVE='apTemaEscritorio';        /* claro | escuro */
  function lido(){ try{return localStorage.getItem(CHAVE)||'claro';}catch(e){return 'claro';} }
  function grava(v){ try{localStorage.setItem(CHAVE,v);}catch(e){} }

  function fonte(){
    if(document.getElementById('ap-fonte-poppins')) return;
    var l=document.createElement('link'); l.id='ap-fonte-poppins'; l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }

  function css(){
    if(document.getElementById('ap-tema-esc-css')) return;
    var P='body.ap-esc-claro ';
    var A=P+'#view-painel ';
    var st=document.createElement('style'); st.id='ap-tema-esc-css';
    st.textContent=

    /* variaveis reescritas dentro do painel */
    P+'#view-painel{'
      +'--azul:#3355FF;--azul2:#2E7DF6;--azul-light:#2E7DF6;'
      +'--escuro:#F4F7FC;--card:#FFFFFF;--card2:#F5F8FD;--border:#E6EDF7;'
      +'--branco:#0F1B33;--cinza:#66748C;'
      +'--verde:#0E9F6E;--vermelho:#D92D20;--laranja:#B45309;'
      +"color:#0F1B33;font-family:'Poppins','Segoe UI',sans-serif}"
    +P+'{background:#F4F7FC}'
    +P+'.layout{background:#F4F7FC}'

    /* ---------- barra do topo ---------- */
    +P+'.top-switch{background:#FFFFFF;border-bottom:1px solid #E6EDF7;padding:12px 20px}'
    +P+'.ts-logo span{color:#0F1B33;font-size:15px}'
    +P+'.ts-logo small{color:#2E7DF6}'
    +P+'.ts-info{color:#66748C;font-size:11px}'
    +P+'.ts-info strong{color:#0F1B33}'
    +P+'.live-row{color:#66748C}'
    +P+'.switcher{background:#F5F8FD;border:1px solid #E6EDF7;border-radius:12px}'
    +P+'.sw-btn{color:#66748C;font-size:12px;padding:8px 16px}'
    +P+'.sw-btn.active{background:#3355FF;color:#FFFFFF;box-shadow:0 3px 10px rgba(51,85,255,.30)}'

    /* ---------- menu lateral ---------- */
    +A+'.sidebar{background:#FFFFFF;border-right:1px solid #E6EDF7;width:216px}'
    +A+'.nav-sec{color:#8A97AD;font-size:10px;padding:14px 16px 4px}'
    +A+'.nav-item{color:#42506B;font-size:13px;padding:10px 16px;border-left:3px solid transparent}'
    +A+'.nav-item:hover{background:#EAF1FF;color:#0F1B33}'
    +A+'.nav-item.active{background:#EAF1FF;color:#3355FF;border-left:3px solid #3355FF}'
    +A+'.nav-item .ni{font-size:15px}'
    +A+'.nav-dot{box-shadow:0 0 0 2px #FFFFFF}'
    +A+'.sidebar-foot{border-top:1px solid #E6EDF7;color:#8A97AD;font-size:10px}'
    +A+'.sidebar-foot span[style]{color:#8A97AD !important}'

    /* ---------- area principal ---------- */
    +A+'.pmain{background:#F4F7FC;padding:22px 26px}'
    +A+'.sec{color:#0F1B33;font-size:15px;margin-bottom:10px}'
    +A+'.sec a{color:#2E7DF6;font-size:12px}'

    /* cartoes de indicadores */
    +A+'.kcard{background:#FFFFFF;border:1px solid #E6EDF7;border-radius:16px;padding:16px 18px;'
      +'box-shadow:0 1px 2px rgba(16,24,40,.05),0 10px 26px rgba(16,24,40,.05)}'
    +A+'.kcard .kl{color:#66748C;font-size:11px;font-weight:600;letter-spacing:0}'
    +A+'.kcard .kv{font-size:24px}'
    +A+'.kcard .ks{font-size:11px}'
    +A+'.c-az{color:#2E7DF6}'+A+'.c-gr{color:#0E9F6E}'
    +A+'.c-rd{color:#D92D20}'+A+'.c-or{color:#B45309}'

    /* caixas e graficos */
    +A+'.cbox,'+A+'.tbox,'+A+'.fbox,'+A+'.segr{background:#FFFFFF;border:1px solid #E6EDF7;border-radius:16px;'
      +'box-shadow:0 1px 2px rgba(16,24,40,.05),0 10px 26px rgba(16,24,40,.05)}'
    +A+'.cbox{padding:16px}'
    +A+'.bar2.r{background:linear-gradient(180deg,#5B8DFF,#3355FF)}'
    +A+'.bar2.d{background:linear-gradient(180deg,#FFB4AC,#F1705E)}'
    +A+'.bl2,'+A+'.li2{color:#66748C;font-size:11px}'
    +A+'#pp-dash strong{color:#0F1B33 !important}'

    /* tabelas */
    +A+'th{background:#F5F8FD;color:#66748C;font-size:11px;padding:11px 14px;letter-spacing:.2px}'
    +A+'td{color:#0F1B33;font-size:13px;padding:12px 14px;border-top:1px solid #E6EDF7}'
    +A+'tr:hover td{background:#F8FAFF}'
    +A+'td[style*="var(--cinza)"]{color:#8A97AD !important}'

    /* etiquetas */
    +A+'.tag{border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:700}'
    +A+'.tp{background:#E7F8EF;color:#0E9F6E}'
    +A+'.ta{background:#FDECEA;color:#D92D20}'
    +A+'.tn{background:#FDF3E4;color:#B45309}'
    +A+'.ti{background:#EAF1FF;color:#3355FF}'

    /* formularios */
    +A+'.ftitle{color:#0F1B33;font-size:14px;border-bottom:1px solid #E6EDF7;padding-bottom:10px;margin-bottom:14px}'
    +A+'label{color:#66748C;font-size:12px;font-weight:600}'
    +A+'input,'+A+'select,'+A+'textarea{background:#FFFFFF;border:1px solid #D8E3F2;color:#0F1B33;'
      +'border-radius:10px;padding:10px 12px;font-size:13.5px;font-family:inherit}'
    +A+'input:focus,'+A+'select:focus,'+A+'textarea:focus{border-color:#3355FF;box-shadow:0 0 0 4px rgba(51,85,255,.12)}'
    +A+'input::placeholder,'+A+'textarea::placeholder{color:#A6B2C6}'

    /* botoes */
    +A+'.btn{border-radius:10px;font-size:13px;padding:10px 18px;font-weight:700}'
    +A+'.btn-az{background:linear-gradient(92deg,#0B2A8A 0%,#3355FF 55%,#2E9BF6 100%);color:#fff;'
      +'box-shadow:0 4px 12px rgba(51,85,255,.28)}'
    +A+'.btn-sm{background:#FFFFFF;border:1px solid #D8E3F2;color:#2E7DF6;border-radius:8px;font-size:11.5px;padding:5px 10px}'
    +A+'.btn-vd{background:#E7F8EF;color:#0E9F6E;border:1px solid #B7E9D1}'

    /* textos e campos que tinham cor branca fixa */
    +A+'input[style*="color:#fff"],'+A+'select[style*="color:#fff"],'+A+'textarea[style*="color:#fff"]{color:#0F1B33 !important}'
    +A+'div[style*="color:#fff"]:not([style*="background"]),'
      +A+'span[style*="color:#fff"]:not([style*="background"]),'
      +A+'b[style*="color:#fff"]:not([style*="background"]),'
      +A+'strong[style*="color:#fff"]:not([style*="background"]),'
      +A+'label[style*="color:#fff"]:not([style*="background"]){color:#0F1B33 !important}'
    +A+'.btn:not(.btn-az):not(.btn-vd){background:#FFFFFF;border:1px solid #D8E3F2;color:#2E7DF6}'
    +A+'.btn[style*="color:#fff"]:not(.btn-az){color:#2E7DF6 !important;background:#FFFFFF !important;border:1px solid #D8E3F2 !important}'

    /* cartoes de acesso rapido dentro do painel */
    +A+'#ap-quick-cards>div{background:#FFFFFF !important;border:1px solid #E6EDF7 !important;'
      +'box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 22px rgba(16,24,40,.06)}'
    +A+'#ap-quick-cards>div>div{color:#0F1B33 !important}'
    +A+'#ap-quick-cards>div>div>div+div{color:#66748C !important}'

    /* honorarios e listas dentro do painel */
    +A+'.hon-card{background:#FFFFFF;border:1px solid #E6EDF7;border-radius:16px}'
    +A+'.hon-title{color:#0F1B33}'
    +A+'.hon-row{background:#F8FAFF;border:1px solid #E6EDF7;border-radius:12px}'
    +A+'.hon-info strong{color:#0F1B33}'
    +A+'.hon-valor{color:#2E7DF6}'
    +A+'.segr .st strong{color:#0F1B33}'
    +A+'.segr .st span{color:#66748C}'

    /* barra de foco e atalhos do cliente vistos pelo escritorio */
    +A+'.foco-bar{background:#FFFFFF;border:1px solid #E6EDF7;border-radius:14px}'
    +A+'.foco-bar b{color:#0F1B33}'+A+'.foco-bar .fb-sub{color:#66748C}'
    +A+'.foco-bar .fb-logo{background:#EAF1FF;color:#3355FF}'
    +A+'.cli-atalhos button{background:#FFFFFF;border:1px solid #D8E3F2;color:#0F1B33;border-radius:10px}'
    +A+'.cli-atalhos button:hover{border-color:#3355FF;background:#EAF1FF}'

    /* previa do aplicativo dentro do painel */
    +P+'.app-wrap{background:#F4F7FC}'

    /* indicador de sincronizacao */
    +P+'#sync-ind{background:#FFFFFF;border:1px solid #E6EDF7;color:#66748C;'
      +'box-shadow:0 4px 16px rgba(16,24,40,.10)}'

    /* ---------- chave de tema no menu ---------- */
    +'#ap-esc-tema{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13px;'
      +'font-weight:600;color:#9090b8;cursor:pointer}'
    +P+'#ap-esc-tema{color:#42506B}'
    +'#ap-esc-tema:hover{background:rgba(51,85,255,.14)}'
    +P+'#ap-esc-tema:hover{background:#EAF1FF}'
    +'#ap-esc-tema .ei{width:18px;text-align:center;font-size:15px}'
    +'#ap-esc-tema .chave{margin-left:auto;width:44px;height:25px;border-radius:999px;position:relative;'
      +'flex:0 0 auto;background:#3355FF;transition:.22s}'
    +'#ap-esc-tema .chave::after{content:"";position:absolute;top:3px;left:22px;width:19px;height:19px;'
      +'border-radius:50%;background:#fff;transition:.22s;box-shadow:0 2px 6px rgba(0,0,0,.3)}'
    +P+'#ap-esc-tema .chave{background:#D8E3F2}'
    +P+'#ap-esc-tema .chave::after{left:3px}';

    document.head.appendChild(st);
  }

  function aplicar(t){
    document.body.classList.toggle('ap-esc-claro', t==='claro');
    var ic=document.getElementById('ap-esc-ic'), tx=document.getElementById('ap-esc-tx');
    if(ic) ic.textContent = (t==='claro') ? '\u{1F319}' : '☀️';
    if(tx) tx.textContent = (t==='claro') ? 'Tema escuro' : 'Tema claro';
  }
  function trocar(){
    var novo = (lido()==='claro') ? 'escuro' : 'claro';
    grava(novo); aplicar(novo);
  }

  function item(){
    var nav=document.querySelector('#view-painel .sidebar .nav');
    if(!nav || document.getElementById('ap-esc-tema')) return;
    var sec=document.createElement('div'); sec.className='nav-sec'; sec.id='ap-esc-sec';
    sec.textContent='Aparência';
    var it=document.createElement('div'); it.id='ap-esc-tema';
    it.innerHTML='<span class="ei" id="ap-esc-ic">\u{1F319}</span><span id="ap-esc-tx">Tema escuro</span><span class="chave"></span>';
    it.onclick=trocar;
    nav.appendChild(sec); nav.appendChild(it);
  }

  function tick(){
    try{
      var p=document.getElementById('view-painel');
      var ativo = p && p.classList.contains('active');
      if(!ativo){ document.body.classList.remove('ap-esc-claro'); return; }
      fonte(); css(); item(); aplicar(lido());
    }catch(e){}
  }
  [700,2000,4200,7500].forEach(function(t){setTimeout(tick,t);});
  setInterval(tick,5000);
  document.addEventListener('click',function(){setTimeout(tick,250);},true);
})();

/* APARAT v49 - ABA "DOCUMENTOS SOLICITADOS" (escritorio envia ate 25 MB; cliente baixa) */
;(function(){
  if(window.__APARAT_PEDIDOS__) return; window.__APARAT_PEDIDOS__=1;
  var COL='pedidos', MAXMB=25, PASTA='documentos/pedidos/', LIMBD=700*1024;
  var editId=null, enviando=false, storageOk=null;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function st(){ try{ if(window.firebase && firebase.apps && firebase.apps.length && firebase.storage) return firebase.storage(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} try{ alert(m); }catch(e){} }
  function el(id){ return document.getElementById(id); }
  function v(id){ var e=el(id); return e?String(e.value||'').trim():''; }
  function setV(id,x){ var e=el(id); if(e) e.value=x; }
  function tam(b){ b=Number(b)||0; return b>=1048576 ? (b/1048576).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1024))+' KB'; }
  function hoje(){ return new Date().toLocaleDateString('pt-BR'); }
  function limpo(n){ return String(n||'arquivo').replace(/[^\w.\-]+/g,'_').slice(-70); }
  function icone(n){
    var e=String(n||'').split('.').pop().toLowerCase();
    if(e==='pdf') return '\u{1F4C4}';
    if(['jpg','jpeg','png','webp','gif','bmp'].indexOf(e)>=0) return '\u{1F5BC}️';
    if(['xls','xlsx','csv','ods'].indexOf(e)>=0) return '\u{1F4CA}';
    if(['zip','rar','7z'].indexOf(e)>=0) return '\u{1F5DC}️';
    if(['xml','txt','ofx'].indexOf(e)>=0) return '\u{1F4C3}';
    if(['doc','docx','odt'].indexOf(e)>=0) return '\u{1F4DD}';
    return '\u{1F4CE}';
  }
  function ehAdmin(){
    try{
      var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL;
      return true;
    }catch(e){ return false; }
  }

  /* ---------- estilo proprio (funciona no tema claro e no escuro) ---------- */
  function css(){
    if(el('ap-ped-css')) return;
    var s=document.createElement('style'); s.id='ap-ped-css';
    s.textContent=
      '#pp-pedidos .ped-item{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:11px 12px;margin-bottom:8px;flex-wrap:wrap}'
      +'#pp-pedidos .ped-ic{width:40px;height:40px;border-radius:11px;background:rgba(51,85,255,.14);display:flex;align-items:center;justify-content:center;font-size:20px;flex:0 0 auto}'
      +'#pp-pedidos .ped-inf{flex:1;min-width:150px}'
      +'#pp-pedidos .ped-inf b{display:block;font-size:13px}'
      +'#pp-pedidos .ped-inf span{display:block;font-size:11px;color:var(--cinza);margin-top:2px}'
      +'#pp-pedidos .ped-bts{display:flex;gap:6px;flex-wrap:wrap}'
      +'#pp-pedidos .ped-bt{font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer;text-decoration:none;display:inline-block}'
      +'#pp-pedidos .ped-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-pedidos .ped-bt.vm{border-color:rgba(217,45,32,.55);color:#d92d20}'
      +'#pp-pedidos .ped-gru{margin:12px 0 6px;font-size:12px;font-weight:800;color:var(--azul-light);border-bottom:1px solid var(--border);padding-bottom:5px}'
      +'#pp-pedidos .ped-vazio{font-size:12px;color:var(--cinza);padding:6px 0}'
      +'#pp-pedidos .ped-tag{font-size:10px;font-weight:700;border-radius:8px;padding:3px 8px}'
      +'#sec-pedidos .ped-cli{display:flex;align-items:center;gap:11px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px;margin-bottom:9px;flex-wrap:wrap}'
      +'#sec-pedidos .ped-cli .ic{width:44px;height:44px;border-radius:12px;background:rgba(51,85,255,.14);display:flex;align-items:center;justify-content:center;font-size:22px;flex:0 0 auto}'
      +'#sec-pedidos .ped-cli .inf{flex:1;min-width:140px}'
      +'#sec-pedidos .ped-cli .inf b{display:block;font-size:15px}'
      +'#sec-pedidos .ped-cli .inf span{display:block;font-size:12px;color:var(--cinza);margin-top:2px}'
      +'#sec-pedidos .ped-dl{background:var(--azul);color:#fff;border:0;border-radius:11px;padding:11px 16px;font-size:14px;font-weight:800;text-decoration:none;cursor:pointer;display:inline-block}';
    document.head.appendChild(s);
  }

  /* ================= PAINEL DO ESCRITORIO ================= */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-ped')) return;
    var ref=null;
    [].slice.call(nv.querySelectorAll('.nav-item')).forEach(function(it){
      if(/Documentos/.test(it.textContent||'') && !/Solicitad/.test(it.textContent||'')) ref=it;
    });
    var it=document.createElement('div');
    it.className='nav-item'; it.id='ap-nav-ped';
    it.innerHTML='<span class="ni">\u{1F4E8}</span>Doc. Solicitados<span class="nav-dot" id="dot-ped"></span>';
    it.onclick=function(){ abrir(it); };
    if(ref && ref.parentNode) ref.parentNode.insertBefore(it, ref.nextSibling); else nv.appendChild(it);
  }

  function abrir(item){
    try{ if(typeof pPage==='function'){ pPage('pedidos', item); } }catch(e){}
    var p=el('pp-pedidos'); if(p) p.classList.add('active');
    listarSolic(); listar();
  }

  function pagina(){
    if(el('pp-pedidos')) return;
    var base=el('pp-docs'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-pedidos';
    p.innerHTML=
      '<div class="sec">\u{1F4E8} Pedidos dos clientes</div>'
      +'<div id="ped-sols"></div>'
      +'<div class="fbox" id="ped-form" style="margin-top:12px">'
        +'<div class="ftitle" id="ped-ftit">\u{1F4E4} Enviar documento ao cliente</div>'
        +'<div class="fgrid">'
          +'<div class="fg"><label>Cliente</label><select id="ped-cli"><option value="">Selecione o cliente...</option></select></div>'
          +'<div class="fg"><label>Título do documento</label><input id="ped-tit" type="text" placeholder="Ex.: Certidão Negativa de Débitos"/></div>'
        +'</div>'
        +'<div class="fg" style="margin-bottom:10px"><label>Observação para o cliente (opcional)</label><input id="ped-desc" type="text" placeholder="Ex.: validade de 90 dias"/></div>'
        +'<div id="ped-aviso" style="display:none;font-size:12px;line-height:1.5;background:rgba(180,83,9,.12);color:#b45309;border:1px solid rgba(180,83,9,.35);border-radius:10px;padding:10px 12px;margin-bottom:10px"></div>'
        +'<div class="fg" style="margin-bottom:10px"><label>Arquivo (PDF, imagem, XML, Excel, ZIP · máx. '+MAXMB+' MB)</label><input id="ped-file" type="file"/></div>'
        +'<div class="fg" style="margin-bottom:10px"><label>Ou cole o link do arquivo (Google Drive, OneDrive · opcional)</label><input id="ped-link" type="text" placeholder="https://drive.google.com/..."/></div>'
        +'<div id="ped-prog" style="display:none;font-size:12px;color:var(--cinza);margin-bottom:10px">Enviando... <b id="ped-prog-n">0%</b></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
          +'<button class="btn btn-az" id="ped-btn">\u{1F4E4} Enviar ao cliente</button>'
          +'<button class="btn" id="ped-cancel" style="display:none;background:transparent;border:1px solid var(--border);color:var(--cinza)">✖ Cancelar edição</button>'
        +'</div>'
      +'</div>'
      +'<div class="sec" style="margin-top:16px">\u{1F4C2} Documentos enviados</div>'
      +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">'
        +'<div class="fg" style="flex:1;min-width:180px;margin:0"><select id="ped-filtro"><option value="">Todos os clientes</option></select></div>'
        +'<button class="ped-bt" id="ped-recarrega">🔄 Atualizar lista</button>'
      +'</div>'
      +'<div id="ped-lista"><div class="ped-vazio">Carregando...</div></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    el('ped-btn').onclick=enviar;
    el('ped-cancel').onclick=function(){ limparForm(); };
    el('ped-filtro').onchange=listar;
    el('ped-recarrega').onclick=function(){ listarSolic(); listar(); };
    checarStorage();
    try{ if(window.ABA_NOMES) window.ABA_NOMES.pedidos='Documentos Solicitados'; }catch(e){}
  }

  function limparForm(){
    editId=null;
    setV('ped-tit',''); setV('ped-desc',''); setV('ped-link','');
    var f=el('ped-file'); if(f) f.value='';
    var t=el('ped-ftit'); if(t) t.innerHTML='\u{1F4E4} Enviar documento ao cliente';
    var b=el('ped-btn'); if(b) b.innerHTML='\u{1F4E4} Enviar ao cliente';
    var c=el('ped-cancel'); if(c) c.style.display='none';
    window.__apPedSolic=null;
  }

  /* --------- lista de solicitacoes (o que o cliente pediu) --------- */
  async function listarSolic(){
    var box=el('ped-sols'); if(!box) return;
    var d=db(); if(!d){ box.innerHTML='<div class="ped-vazio">Sem conexão com a nuvem.</div>'; return; }
    var itens=[];
    try{
      var s=await d.collection('solicitacoes').get();
      s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; itens.push(o); });
    }catch(e){ box.innerHTML='<div class="ped-vazio">Não foi possível carregar os pedidos.</div>'; return; }
    if(!itens.length){ box.innerHTML='<div class="ped-vazio">Nenhum pedido em aberto. Você também pode enviar um documento por conta própria no formulário abaixo.</div>'; return; }
    itens.reverse();
    box.innerHTML=itens.map(function(x){
      var feito=/atend/i.test(String(x.status||''));
      var tag=feito
        ? '<span class="ped-tag" style="background:rgba(14,159,110,.16);color:#0e9f6e">Atendido ✔</span>'
        : '<span class="ped-tag" style="background:rgba(180,83,9,.16);color:#b45309">Aguardando</span>';
      return '<div class="ped-item">'
        +'<div class="ped-ic">✉️</div>'
        +'<div class="ped-inf"><b>'+esc(x.cliente||'(sem cliente)')+'</b><span>'+esc(x.mensagem||'')+'</span><span>'+esc(x.data||'')+'</span></div>'
        +'<div class="ped-bts">'+tag
        +'<button class="ped-bt az" data-ped-resp="'+esc(x.id)+'">\u{1F4CE} Responder com arquivo</button>'
        +'</div></div>';
    }).join('');
    [].slice.call(box.querySelectorAll('[data-ped-resp]')).forEach(function(b){
      b.onclick=function(){
        var id=b.getAttribute('data-ped-resp');
        var x=itens.filter(function(i){ return String(i.id)===String(id); })[0]; if(!x) return;
        responder(x);
      };
    });
  }

  function responder(x){
    limparForm();
    window.__apPedSolic={id:x.id, cliente:x.cliente||''};
    var sel=el('ped-cli');
    if(sel && x.cliente){
      var tem=false;
      [].forEach.call(sel.options,function(o){ if(o.value===x.cliente) tem=true; });
      if(!tem){ var o=document.createElement('option'); o.value=x.cliente; o.textContent=x.cliente; sel.appendChild(o); }
      sel.value=x.cliente;
    }
    setV('ped-tit', String(x.mensagem||'Documento solicitado').slice(0,60));
    var t=el('ped-ftit'); if(t) t.innerHTML='\u{1F4E4} Respondendo o pedido de '+esc(x.cliente||'cliente');
    try{ el('ped-form').scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){}
    try{ el('ped-file').focus(); }catch(e){}
  }

  /* --------- enviar / atualizar --------- */
  async function enviar(){
    if(enviando) return;
    var d=db(); if(!d){ aviso('Sem conexão com a nuvem.','warn'); return; }
    var cli=v('ped-cli'), tit=v('ped-tit'), desc=v('ped-desc'), link=v('ped-link');
    if(!cli){ aviso('⚠ Selecione o cliente','warn'); return; }
    var fi=el('ped-file'), file=(fi && fi.files && fi.files[0]) ? fi.files[0] : null;
    if(!editId && !file && !link){ aviso('⚠ Escolha o arquivo ou cole o link','warn'); return; }
    if(file && file.size > MAXMB*1024*1024){ aviso('⚠ Arquivo muito grande (máximo '+MAXMB+' MB)','warn'); return; }
    if(link && !/^https?:\/\//i.test(link)){ aviso('⚠ O link precisa começar com https://','warn'); return; }
    if(file && file.size > LIMBD && storageOk===false){
      aviso('⚠ Arquivo acima de 700 KB. Ative o Armazenamento no Firebase ou envie o link do Google Drive.','warn'); return;
    }
    if(!tit) tit = file ? file.name : 'Documento';

    enviando=true;
    var bt=el('ped-btn'); if(bt){ bt.disabled=true; bt.innerHTML='⏳ Enviando...'; }
    try{
      var dados={cliente:cli, titulo:tit, descricao:desc};
      if(file){
        dados.arquivoNome=file.name;
        dados.tamanho=file.size;
        dados.arquivoUrl=''; dados.arquivoData=''; dados.arquivoPath='';
        if(file.size<=LIMBD && storageOk!==true){
          dados.arquivoData=await base64(file);   // cabe no banco, funciona sempre
        }else{
          var s=st(); if(!s) throw new Error('Armazenamento indisponível');
          var caminho=PASTA+limpo(cli)+'/'+Date.now()+'_'+limpo(file.name);
          dados.arquivoUrl=await subir(s.ref(caminho), file);
          dados.arquivoPath=caminho;
        }
      }
      if(link){ dados.arquivoUrl=link; if(!file){ dados.arquivoNome=''; dados.arquivoPath=''; dados.arquivoData=''; } }
      if(editId){
        var antigo=null;
        if(file){ try{ var sn=await d.collection(COL).doc(editId).get(); antigo=(sn.data()||{}).arquivoPath||null; }catch(e){} }
        await d.collection(COL).doc(editId).update(dados);
        if(file && antigo) apagarArquivo(antigo);
        aviso('✏️ Documento atualizado!');
      }else{
        dados.data=hoje();
        dados.ts=Date.now();
        try{ dados.criadoEm=firebase.firestore.FieldValue.serverTimestamp(); }catch(e){}
        var sol=window.__apPedSolic;
        if(sol && sol.id) dados.solicitacaoId=sol.id;
        await d.collection(COL).add(dados);
        if(sol && sol.id){
          try{ await d.collection('solicitacoes').doc(sol.id).update({status:'Atendida ✔'}); }catch(e){}
        }
        aviso('\u{1F4E8} Documento enviado para '+cli+'!');
        try{ if(typeof syncAnim==='function') syncAnim('Documento → '+cli); }catch(e){}
      }
      limparForm();
      await listar(); await listarSolic();
    }catch(e){
      aviso('Erro ao enviar: '+(e && e.message ? e.message : e),'warn');
    }
    var pg=el('ped-prog'); if(pg) pg.style.display='none';
    if(bt){ bt.disabled=false; bt.innerHTML=editId?'✏️ Salvar alterações':'\u{1F4E4} Enviar ao cliente'; }
    enviando=false;
  }

  function base64(file){
    if(typeof lerArquivoBase64==='function') return lerArquivoBase64(file);
    return new Promise(function(ok,err){
      var fr=new FileReader();
      fr.onload=function(){ ok(fr.result); };
      fr.onerror=function(){ err(new Error('Não foi possível ler o arquivo')); };
      fr.readAsDataURL(file);
    });
  }

  function subir(ref, file){
    return new Promise(function(ok,err){
      var pg=el('ped-prog'), pn=el('ped-prog-n'), pronto=false;
      if(pg) pg.style.display='block';
      var relogio=setTimeout(function(){
        if(pronto) return; pronto=true;
        err(new Error('O envio não respondeu. O Armazenamento (Storage) do Firebase parece não estar ativado — use o link do Google Drive ou ative o Storage no console.'));
      },60000);
      var task=ref.put(file,{contentType:file.type||'application/octet-stream'});
      task.on('state_changed', function(sn){
        if(pn && sn.totalBytes) pn.textContent=Math.round((sn.bytesTransferred/sn.totalBytes)*100)+'%';
      }, function(e){ if(pronto) return; pronto=true; clearTimeout(relogio); err(e); },
      function(){
        ref.getDownloadURL().then(function(u){ if(pronto) return; pronto=true; clearTimeout(relogio); ok(u); })
                            .catch(function(e){ if(pronto) return; pronto=true; clearTimeout(relogio); err(e); });
      });
    });
  }

  /* verifica uma unica vez se o Armazenamento (Storage) esta ativado no projeto */
  function checarStorage(){
    if(storageOk!==null) return;
    storageOk=false;
    var b='';
    try{ b=(firebase.app().options||{}).storageBucket||''; }catch(e){}
    if(!b){ mostrarAviso(); return; }
    fetch('https://firebasestorage.googleapis.com/v0/b/'+b+'/o?maxResults=1')
      .then(function(r){ storageOk=(r.status!==404); mostrarAviso(); })
      .catch(function(){ storageOk=false; mostrarAviso(); });
  }
  function mostrarAviso(){
    var a=el('ped-aviso'); if(!a) return;
    if(storageOk===true){ a.style.display='none'; return; }
    a.style.display='block';
    a.innerHTML='⚠️ <b>Armazenamento de arquivos grandes ainda não ativado</b> no Firebase.'
      +'<br>Por enquanto: arquivos de <b>até 700 KB</b> vão normalmente pelo app, e para arquivos maiores cole o <b>link do Google Drive</b> no campo abaixo.'
      +'<br>Para liberar até '+MAXMB+' MB: Firebase → Storage → Começar (é preciso plano Blaze).';
  }

  function apagarArquivo(caminho){
    try{ var s=st(); if(s && caminho) s.ref(caminho).delete().catch(function(){}); }catch(e){}
  }

  /* --------- lista de documentos enviados (editar / excluir) --------- */
  async function listar(){
    var box=el('ped-lista'); if(!box) return;
    var d=db(); if(!d){ box.innerHTML='<div class="ped-vazio">Sem conexão com a nuvem.</div>'; return; }
    var itens=[];
    try{
      var s=await d.collection(COL).get();
      s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; itens.push(o); });
    }catch(e){ box.innerHTML='<div class="ped-vazio">Não foi possível carregar a lista.</div>'; return; }

    var filtro=el('ped-filtro');
    if(filtro){
      var atual=filtro.value, nomes=[];
      itens.forEach(function(x){ if(x.cliente && nomes.indexOf(x.cliente)<0) nomes.push(x.cliente); });
      nomes.sort(function(a,b){ return a.localeCompare(b); });
      filtro.innerHTML='<option value="">Todos os clientes</option>'+nomes.map(function(n){ return '<option value="'+esc(n)+'">'+esc(n)+'</option>'; }).join('');
      if(atual && nomes.indexOf(atual)>=0) filtro.value=atual;
    }
    var sel=(filtro && filtro.value)||'';
    itens.sort(function(a,b){ return (Number(b.ts)||0)-(Number(a.ts)||0); });

    var grupos={};
    itens.forEach(function(x){
      var c=x.cliente||'(sem cliente)';
      if(sel && c!==sel) return;
      (grupos[c]=grupos[c]||[]).push(x);
    });
    var clientes=Object.keys(grupos).sort(function(a,b){ return a.localeCompare(b); });
    if(!clientes.length){ box.innerHTML='<div class="ped-vazio">Nenhum documento enviado ainda.</div>'; return; }

    box.innerHTML=clientes.map(function(c){
      return '<div class="ped-gru">\u{1F464} '+esc(c)+' <span style="color:var(--cinza);font-weight:400;font-size:10px">('+grupos[c].length+')</span></div>'
        +grupos[c].map(function(x){
          var sub=[x.descricao||'', x.arquivoNome||'', x.tamanho?tam(x.tamanho):'', x.data||''].filter(function(t){ return t; }).join(' · ');
          var end=x.arquivoUrl||x.arquivoData||'';
          var link=end?('<a class="ped-bt az" href="'+esc(end)+'" target="_blank" rel="noopener" download="'+esc(x.arquivoNome||x.titulo||'documento')+'">⬇️ Abrir</a>'):'';
          return '<div class="ped-item">'
            +'<div class="ped-ic">'+icone(x.arquivoNome)+'</div>'
            +'<div class="ped-inf"><b>'+esc(x.titulo||'Documento')+'</b><span>'+esc(sub)+'</span></div>'
            +'<div class="ped-bts">'+link
            +'<button class="ped-bt" data-ped-edit="'+esc(x.id)+'">✏️ Editar</button>'
            +'<button class="ped-bt vm" data-ped-del="'+esc(x.id)+'">\u{1F5D1}️ Excluir</button>'
            +'</div></div>';
        }).join('');
    }).join('');

    [].slice.call(box.querySelectorAll('[data-ped-edit]')).forEach(function(b){
      b.onclick=function(){
        var x=itens.filter(function(i){ return String(i.id)===String(b.getAttribute('data-ped-edit')); })[0];
        if(x) editar(x);
      };
    });
    [].slice.call(box.querySelectorAll('[data-ped-del]')).forEach(function(b){
      b.onclick=function(){
        var x=itens.filter(function(i){ return String(i.id)===String(b.getAttribute('data-ped-del')); })[0];
        if(x) excluir(x);
      };
    });
  }

  function editar(x){
    limparForm();
    editId=x.id;
    var sel=el('ped-cli');
    if(sel && x.cliente){
      var tem=false; [].forEach.call(sel.options,function(o){ if(o.value===x.cliente) tem=true; });
      if(!tem){ var o=document.createElement('option'); o.value=x.cliente; o.textContent=x.cliente; sel.appendChild(o); }
      sel.value=x.cliente;
    }
    setV('ped-tit', x.titulo||''); setV('ped-desc', x.descricao||'');
    if(x.arquivoUrl && !x.arquivoPath) setV('ped-link', x.arquivoUrl);
    var t=el('ped-ftit'); if(t) t.innerHTML='✏️ Editando: '+esc(x.titulo||'documento');
    var b=el('ped-btn'); if(b) b.innerHTML='✏️ Salvar alterações';
    var c=el('ped-cancel'); if(c) c.style.display='inline-block';
    try{ el('ped-form').scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){}
  }

  async function excluir(x){
    if(!confirm('Excluir "'+(x.titulo||'documento')+'" de '+(x.cliente||'')+'?\n\nO cliente deixa de ver este arquivo no app.')) return;
    var d=db(); if(!d) return;
    try{
      await d.collection(COL).doc(x.id).delete();
      if(x.arquivoPath) apagarArquivo(x.arquivoPath);
      aviso('Documento excluído.','info');
      if(String(editId)===String(x.id)) limparForm();
      await listar();
    }catch(e){ aviso('Erro ao excluir: '+(e && e.message ? e.message : e),'warn'); }
  }

  /* ================= APP DO CLIENTE ================= */
  function blocoCliente(){
    var vc=document.getElementById('view-cliente'); if(!vc) return null;
    var left=vc.querySelector('.cli-left'); if(!left) return null;
    var b=el('sec-pedidos');
    if(!b){
      b=document.createElement('div'); b.className='cli-sec'; b.id='sec-pedidos';
      b.innerHTML='<div class="asec" style="margin-top:12px">\u{1F4E8} Meus Pedidos</div><div id="cli-ped"><div style="font-size:13px;color:var(--cinza);padding:4px 0">Carregando...</div></div>';
      var ref=el('sec-doc');
      if(ref && ref.parentNode===left) left.insertBefore(b, ref.nextSibling); else left.appendChild(b);
    }
    return b;
  }

  var ultimoCli='';
  async function listarCliente(){
    if(typeof CURRENT_CLIENTE==='undefined' || !CURRENT_CLIENTE) return;
    if(!blocoCliente()) return;
    var alvo=el('cli-ped'); if(!alvo) return;
    var d=db(); if(!d) return;
    var itens=[];
    try{
      var s=await d.collection(COL).where('cliente','==',CURRENT_CLIENTE).get();
      s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; itens.push(o); });
    }catch(e){ return; }
    itens.sort(function(a,b){ return (Number(b.ts)||0)-(Number(a.ts)||0); });
    ultimoCli=CURRENT_CLIENTE;
    if(!itens.length){
      alvo.innerHTML='<div style="font-size:13px;color:var(--cinza);padding:4px 0">\u{1F4ED} Ainda não há documentos aqui. Quando você pedir um documento ao escritório, ele aparece nesta tela para baixar.</div>';
      return;
    }
    alvo.innerHTML=itens.map(function(x){
      var sub=[x.descricao||'', x.arquivoNome||'', x.tamanho?tam(x.tamanho):'', x.data||''].filter(function(t){ return t; }).join(' · ');
      var end=x.arquivoUrl||x.arquivoData||'';
      var bt=end
        ? '<a class="ped-dl" href="'+esc(end)+'" target="_blank" rel="noopener" download="'+esc(x.arquivoNome||x.titulo||'documento')+'">⬇️ Baixar</a>'
        : '';
      return '<div class="ped-cli">'
        +'<div class="ic">'+icone(x.arquivoNome)+'</div>'
        +'<div class="inf"><b>'+esc(x.titulo||'Documento')+'</b><span>'+esc(sub)+'</span></div>'
        +bt+'</div>';
    }).join('');
  }

  /* ================= RELOGIO ================= */
  var ocupado=false, voltas=0;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css();
      var painel=el('view-painel');
      if(painel && painel.classList.contains('active') && ehAdmin()){ menu(); pagina(); }
      var vc=el('view-cliente');
      if(vc && vc.querySelector('.cli-grid') && typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE){
        if(!el('cli-ped') || CURRENT_CLIENTE!==ultimoCli || voltas%5===0) await listarCliente();
      }
    }catch(e){}
    ocupado=false;
  }
  [1500,3500,7000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,6000);
})();

/* APARAT v52 - ABA "EXTRATOS BANCARIOS" (grade cliente x mes, prazo dia 10, cobranca) */
;(function(){
  if(window.__APARAT_EXTRATOS__) return; window.__APARAT_EXTRATOS__=1;
  var COL='extratos', MAXMB=25, PASTA='extratos/', LIMBD=700*1024;
  var DIA_PRAZO=10, DIA_LEMBRETE=8, DIA_COBRA=11;
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var MABREV=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  var anoSel=new Date().getFullYear(), cache=[], nomes=[], carregando=false, enviando=false;
  var INICIO_PADRAO='2026-07';
  function inicio(){ try{ return localStorage.getItem('apExtratoInicio')||INICIO_PADRAO; }catch(e){ return INICIO_PADRAO; } }
  function setInicio(v){ try{ localStorage.setItem('apExtratoInicio',v); }catch(e){} }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function st(){ try{ if(window.firebase && firebase.apps && firebase.apps.length && firebase.storage) return firebase.storage(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} try{ alert(m); }catch(e){} }
  function limpo(n){ return String(n||'x').replace(/[^\w.\-]+/g,'_').slice(0,80); }
  function tam(b){ b=Number(b)||0; return b>=1048576 ? (b/1048576).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1024))+' KB'; }
  function pad(n){ return (n<10?'0':'')+n; }
  function comp(ano,mi){ return ano+'-'+pad(mi+1); }
  function idDoc(cli,cp){ return limpo(cli)+'__'+cp; }
  function ehAdmin(){
    try{
      var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL;
      return true;
    }catch(e){ return false; }
  }
  /* prazo = dia 10 do mes seguinte a competencia */
  function prazoDe(ano,mi){ var d=new Date(ano, mi+1, DIA_PRAZO, 23, 59, 59); return d; }
  function prazoTxt(ano,mi){ var d=prazoDe(ano,mi); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(); }
  /* competencia que esta sendo cobrada agora (mes anterior ao atual) */
  function compAtual(){
    var h=new Date(), ano=h.getFullYear(), mi=h.getMonth()-1;
    if(mi<0){ mi=11; ano--; }
    return {ano:ano, mi:mi};
  }
  function situacao(cli,ano,mi){
    var h=new Date();
    var cp=comp(ano,mi);
    var reg=acha(cli, cp);
    if(reg) return reg.semMovimento ? 'sm' : 'ok';
    if(cp < inicio()) return 'na';               /* antes do inicio do controle */
    var ini=new Date(ano, mi, 1);
    if(ini>h) return 'na';                       /* mes ainda nao aconteceu */
    if(new Date(ano, mi+1, 1) > h) return 'na';  /* mes corrente ainda nao fechou */
    return (h > prazoDe(ano,mi)) ? 'at' : 'pd';
  }
  function acha(cli,cp){
    for(var i=0;i<cache.length;i++){ if(cache[i].cliente===cli && cache[i].competencia===cp) return cache[i]; }
    return null;
  }

  function css(){
    if(el('ap-ext-css')) return;
    var s=document.createElement('style'); s.id='ap-ext-css';
    s.textContent=
      '#pp-extratos .ex-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:12px}'
      +'#pp-extratos .ex-kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:11px 12px}'
      +'#pp-extratos .ex-kpi b{display:block;font-size:22px;line-height:1.1}'
      +'#pp-extratos .ex-kpi span{font-size:11px;color:var(--cinza)}'
      +'#pp-extratos .ex-rol{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--card)}'
      +'#pp-extratos table{border-collapse:separate;border-spacing:0;width:100%;min-width:760px;font-size:12px}'
      +'#pp-extratos th,#pp-extratos td{padding:8px 5px;text-align:center;border-bottom:1px solid var(--border)}'
      +'#pp-extratos thead th{font-size:11px;color:var(--cinza);font-weight:700}'
      +'#pp-extratos td.cli,#pp-extratos th.cli{text-align:left;padding-left:12px;min-width:170px;font-weight:700}'
      +'#pp-extratos tbody tr:last-child td{border-bottom:0}'
      +'#pp-extratos .fa{width:28px;height:28px;border-radius:8px;border:1px solid transparent;font-size:13px;cursor:pointer;line-height:1}'
      +'#pp-extratos .fa.ok{background:rgba(14,159,110,.16);color:#0e9f6e;border-color:rgba(14,159,110,.3)}'
      +'#pp-extratos .fa.sm{background:rgba(14,159,110,.09);color:#0e9f6e;border-color:rgba(14,159,110,.2)}'
      +'#pp-extratos .fa.pd{background:rgba(180,83,9,.16);color:#b45309;border-color:rgba(180,83,9,.3)}'
      +'#pp-extratos .fa.at{background:rgba(217,45,32,.16);color:#d92d20;border-color:rgba(217,45,32,.35)}'
      +'#pp-extratos .fa.na{background:rgba(130,145,170,.13);color:var(--cinza)}'
      +'#pp-extratos .ex-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--cinza);margin-top:10px;align-items:center}'
      +'#pp-extratos .ex-det{margin-top:12px;border:1px dashed var(--border);border-radius:12px;padding:14px}'
      +'#pp-extratos .ex-det .ln{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dotted var(--border);font-size:12.5px}'
      +'#pp-extratos .ex-det .ln:last-of-type{border-bottom:0}'
      +'#pp-extratos .ex-det .ln span{color:var(--cinza)}'
      +'#pp-extratos .ex-bt{font-size:12px;font-weight:700;padding:8px 13px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer;text-decoration:none;display:inline-block;margin:6px 6px 0 0}'
      +'#pp-extratos .ex-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#ap-ext-modal{position:fixed;inset:0;background:rgba(6,12,26,.66);display:flex;align-items:center;justify-content:center;z-index:99999;padding:14px}'
      +'#ap-ext-modal .cx{position:relative;background:var(--card);border:1px solid var(--border);border-radius:18px;max-width:540px;width:100%;max-height:88vh;overflow:auto;padding:20px 18px 18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
      +'#ap-ext-modal .x{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:transparent;color:var(--cinza);font-size:14px;cursor:pointer;line-height:1}'
      +'#ap-ext-modal h3{margin:0 6px 10px 0;font-size:16px;padding-right:34px}'
      +'#ap-ext-modal .ln{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dotted var(--border);font-size:13px}'
      +'#ap-ext-modal .ln:last-of-type{border-bottom:0}'
      +'#ap-ext-modal .ln span{color:var(--cinza)}'
      +'#ap-ext-modal .bts{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}'
      +'#ap-ext-modal .bt{font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer;text-decoration:none;display:inline-block}'
      +'#ap-ext-modal .bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#ap-ext-modal .bt.vm{border-color:rgba(217,45,32,.55);color:#d92d20}'
      +'#ap-ext-modal .cx input[type=file]{width:100%;margin-top:8px;font-size:12px}'
      +'#ap-ext-modal .cx label{font-size:11px;color:var(--cinza)}'
      +'#sec-extratos .ex-hist{display:flex;align-items:center;gap:9px;border-top:1px dotted var(--border);padding:9px 0}'
      +'#sec-extratos .ex-hist .in{flex:1;min-width:0}'
      +'#sec-extratos .ex-hist .in b{display:block;font-size:13px}'
      +'#sec-extratos .ex-hist .in span{display:block;font-size:11px;color:var(--cinza);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'#sec-extratos .ex-vb{font-size:12px;font-weight:700;padding:7px 11px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--cinza);text-decoration:none;white-space:nowrap}'
      +'#sec-extratos .ex-vb.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#sec-extratos .ex-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:13px;margin-bottom:10px}'
      +'#sec-extratos .ex-card h4{margin:0 0 3px;font-size:15px}'
      +'#sec-extratos .ex-card p{margin:0;font-size:12px;color:var(--cinza);line-height:1.5}'
      +'#sec-extratos .ex-al{border-radius:12px;padding:11px 13px;margin-bottom:10px;font-size:12.5px;line-height:1.55}'
      +'#sec-extratos .ex-al.at{background:rgba(217,45,32,.13);border:1px solid rgba(217,45,32,.32)}'
      +'#sec-extratos .ex-al.pd{background:rgba(180,83,9,.13);border:1px solid rgba(180,83,9,.32)}'
      +'#sec-extratos .ex-al.ok{background:rgba(14,159,110,.13);border:1px solid rgba(14,159,110,.32)}'
      +'#sec-extratos .ex-fita{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:9px}'
      +'#sec-extratos .ex-fita div{border-radius:9px;padding:6px 2px;text-align:center;font-size:10px;font-weight:700;line-height:1.35}'
      +'#sec-extratos .ex-fita .ok,#sec-extratos .ex-fita .sm{background:rgba(14,159,110,.16);color:#0e9f6e}'
      +'#sec-extratos .ex-fita .at{background:rgba(217,45,32,.16);color:#d92d20}'
      +'#sec-extratos .ex-fita .pd{background:rgba(180,83,9,.16);color:#b45309}'
      +'#sec-extratos .ex-fita .na{background:rgba(130,145,170,.13);color:var(--cinza)}'
      +'#sec-extratos .ex-mbt{display:block;width:100%;border:0;border-radius:12px;padding:12px;font-size:14px;font-weight:800;cursor:pointer;margin-top:8px;background:var(--azul);color:#fff}'
      +'#sec-extratos .ex-mbt.sec{background:transparent;border:1px solid var(--border);color:var(--cinza)}';
    document.head.appendChild(s);
  }

  /* ---------- carrega a colecao ---------- */
  async function carregar(force){
    if(carregando) return;
    var d=db(); if(!d) return;
    carregando=true;
    try{
      var s=await d.collection(COL).get();
      var arr=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; arr.push(o); });
      cache=arr;
    }catch(e){}
    carregando=false;
  }
  async function carregarNomes(){
    var d=db(); if(!d) return;
    var set={};
    var specs=[['clientes','nome'],['usuarios','clienteNome']];
    for(var i=0;i<specs.length;i++){
      try{
        var s=await d.collection(specs[i][0]).get();
        s.forEach(function(x){
          var o=x.data()||{};
          var n=String(o[specs[i][1]]||'').trim();
          var ativo=!o.status || !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(o.status));
          if(n && n!=='Todos os Clientes' && ativo) set[n]=1;
        });
      }catch(e){}
    }
    var l=Object.keys(set).sort(function(a,b){ return a.localeCompare(b); });
    if(l.length) nomes=l;
  }

  /* ================= PAINEL DO ESCRITORIO ================= */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-ext')) return;
    var ref=null;
    [].slice.call(nv.querySelectorAll('.nav-item')).forEach(function(it){
      if(/Doc\. Solicitados/.test(it.textContent||'')) ref=it;
      if(!ref && /Documentos/.test(it.textContent||'')) ref=it;
    });
    var it=document.createElement('div');
    it.className='nav-item'; it.id='ap-nav-ext';
    it.innerHTML='<span class="ni">\u{1F3E6}</span>Extratos<span class="nav-dot" id="dot-ext"></span>';
    it.onclick=function(){ abrir(it); };
    if(ref && ref.parentNode) ref.parentNode.insertBefore(it, ref.nextSibling); else nv.appendChild(it);
  }

  async function abrir(item){
    try{ if(typeof pPage==='function'){ pPage('extratos', item); } }catch(e){}
    var p=el('pp-extratos'); if(p) p.classList.add('active');
    await carregarNomes(); await carregar(true); grade();
  }

  function pagina(){
    if(el('pp-extratos')) return;
    var base=el('pp-pedidos')||el('pp-docs'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-extratos';
    var anos='';
    var hy=new Date().getFullYear();
    for(var a=hy+1;a>=hy-3;a--) anos+='<option value="'+a+'"'+(a===anoSel?' selected':'')+'>'+a+'</option>';
    p.innerHTML=
      '<div class="sec">\u{1F3E6} Extratos bancários dos clientes</div>'
      +'<div class="ex-kpis" id="ex-kpis"></div>'
      +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:9px">'
        +'<div class="fg" style="margin:0;min-width:120px"><select id="ex-ano">'+anos+'</select></div>'
        +'<button class="ex-bt" id="ex-recarrega">🔄 Atualizar</button>'
        +'<button class="ex-bt az" id="ex-cobrar">\u{1F514} Cobrar os atrasados</button>'
        +'<div class="fg" style="margin:0;min-width:200px;display:flex;align-items:center;gap:6px">'
          +'<label style="font-size:11px;color:var(--cinza);white-space:nowrap">Controle começa em</label>'
          +'<select id="ex-inicio"></select>'
        +'</div>'
      +'</div>'
      +'<div class="ex-rol"><table id="ex-tab"><thead></thead><tbody><tr><td style="padding:16px;color:var(--cinza)">Carregando...</td></tr></tbody></table></div>'
      +'<div class="ex-leg">'
        +'<span><b style="color:#0e9f6e">✓</b> Entregue</span>'
        +'<span><b style="color:#0e9f6e">∅</b> Sem movimento</span>'
        +'<span><b style="color:#b45309">•</b> Pendente no prazo</span>'
        +'<span><b style="color:#d92d20">!</b> Atrasado</span>'
        +'<span><b style="color:var(--cinza)">–</b> Não se aplica</span>'
        +'<span style="margin-left:auto">Prazo: dia '+DIA_PRAZO+' do mês seguinte</span>'
      +'</div>'
      +'<div class="ex-det" id="ex-det"><b style="font-size:13px">\u{1F446} Clique em qualquer quadradinho da grade</b><div style="font-size:12px;color:var(--cinza);margin-top:5px">A ficha do cliente abre em uma janela no meio da tela, com os botões de visualizar, baixar, trocar o arquivo, excluir e cobrar.</div></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    el('ex-ano').onchange=function(){ anoSel=Number(this.value)||anoSel; grade(); };
    el('ex-recarrega').onclick=async function(){ await carregarNomes(); await carregar(true); grade(); };
    el('ex-cobrar').onclick=cobrar;
    var si=el('ex-inicio');
    if(si){
      var op='', hj=new Date();
      for(var q=0;q<30;q++){
        var dq=new Date(hj.getFullYear(), hj.getMonth()-q, 1);
        var cq=comp(dq.getFullYear(), dq.getMonth());
        op+='<option value="'+cq+'">'+MESES[dq.getMonth()]+'/'+dq.getFullYear()+'</option>';
      }
      si.innerHTML=op; si.value=inicio();
      si.onchange=function(){ setInicio(this.value); grade(); };
    }
    try{ if(window.ABA_NOMES) window.ABA_NOMES.extratos='Extratos Bancários'; }catch(e){}
  }

  function grade(){
    var tab=el('ex-tab'); if(!tab) return;
    var th='<tr><th class="cli">Cliente</th>';
    var ca=compAtual();
    for(var m=0;m<12;m++) th+='<th'+((anoSel===ca.ano&&m===ca.mi)?' style="color:var(--azul-light)"':'')+'>'+MABREV[m].charAt(0).toUpperCase()+MABREV[m].slice(1)+'</th>';
    tab.tHead.innerHTML=th+'</tr>';
    if(!nomes.length){ tab.tBodies[0].innerHTML='<tr><td class="cli" colspan="13" style="padding:16px;color:var(--cinza)">Nenhum cliente encontrado. Cadastre os clientes na aba Clientes.</td></tr>'; kpis(); return; }
    var ico={ok:'✓',sm:'∅',pd:'•',at:'!',na:'–'};
    var html='';
    nomes.forEach(function(n){
      html+='<tr><td class="cli">'+esc(n)+'</td>';
      for(var m=0;m<12;m++){
        var s=situacao(n,anoSel,m);
        html+='<td><button class="fa '+s+'" data-ex-c="'+esc(n)+'" data-ex-m="'+m+'" title="'+esc(n)+' — '+MESES[m]+'/'+anoSel+'">'+ico[s]+'</button></td>';
      }
      html+='</tr>';
    });
    tab.tBodies[0].innerHTML=html;
    [].slice.call(tab.querySelectorAll('[data-ex-c]')).forEach(function(b){
      b.onclick=function(){ detalhe(b.getAttribute('data-ex-c'), Number(b.getAttribute('data-ex-m'))); };
    });
    kpis();
  }

  function kpis(){
    var box=el('ex-kpis'); if(!box) return;
    var ca=compAtual(), c={ok:0,sm:0,pd:0,at:0};
    nomes.forEach(function(n){ var s=situacao(n,ca.ano,ca.mi); if(c[s]!=null) c[s]++; });
    box.innerHTML=
       '<div class="ex-kpi"><b style="color:#0e9f6e">'+c.ok+'</b><span>Entregues · '+MESES[ca.mi]+'/'+ca.ano+'</span></div>'
      +'<div class="ex-kpi"><b style="color:#d92d20">'+c.at+'</b><span>Atrasados (venceu '+prazoTxt(ca.ano,ca.mi)+')</span></div>'
      +'<div class="ex-kpi"><b style="color:#b45309">'+c.pd+'</b><span>Pendentes no prazo</span></div>'
      +'<div class="ex-kpi"><b style="color:var(--azul-light)">'+c.sm+'</b><span>Sem movimento declarado</span></div>';
    var d=el('dot-ext'); if(d) d.style.display=c.at>0?'inline-block':'none';
  }

  function fecharModal(){ var m=el('ap-ext-modal'); if(m) m.remove(); }
  function modal(html){
    fecharModal();
    var m=document.createElement('div'); m.id='ap-ext-modal';
    m.innerHTML='<div class="cx"><button class="x" id="ex-mx">✖</button>'+html+'</div>';
    m.onclick=function(ev){ if(ev.target===m) fecharModal(); };
    document.body.appendChild(m);
    var x=el('ex-mx'); if(x) x.onclick=fecharModal;
    return m;
  }

  function detalhe(cli,mi){
    var cp=comp(anoSel,mi), s=situacao(cli,anoSel,mi), reg=acha(cli,cp);
    var nome={ok:'✓ Entregue',sm:'∅ Sem movimento',pd:'• Pendente no prazo',at:'! Atrasado',na:'– Fora do controle'}[s];
    var cor={ok:'#0e9f6e',sm:'#0e9f6e',pd:'#b45309',at:'#d92d20',na:'var(--cinza)'}[s];
    var h='<h3>\u{1F3E6} '+esc(cli)+'</h3>'
      +'<div class="ln"><span>Competência</span><b>'+MESES[mi]+'/'+anoSel+'</b></div>'
      +'<div class="ln"><span>Situação</span><b style="color:'+cor+'">'+nome+'</b></div>'
      +'<div class="ln"><span>Prazo de entrega</span><b>'+prazoTxt(anoSel,mi)+'</b></div>';
    var bts='';
    if(reg){
      if(reg.semMovimento){
        h+='<div class="ln"><span>Declaração</span><b>Não houve movimentação</b></div>';
      }else{
        h+='<div class="ln"><span>Arquivo</span><b>'+esc(reg.arquivoNome||'(sem nome)')+'</b></div>';
        if(reg.tamanho) h+='<div class="ln"><span>Tamanho</span><b>'+tam(reg.tamanho)+'</b></div>';
      }
      h+='<div class="ln"><span>Registrado em</span><b>'+esc(reg.enviadoEm||'-')+'</b></div>'
        +'<div class="ln"><span>Origem</span><b>'+(reg.origem==='escritorio'?'lançado pelo escritório':'enviado pelo cliente')+'</b></div>';
      var end=reg.arquivoUrl||reg.arquivoData||'';
      if(end){
        bts+='<a class="bt az" href="'+esc(end)+'" target="_blank" rel="noopener">\u{1F441}️ Visualizar</a>'
            +'<a class="bt" href="'+esc(end)+'" target="_blank" rel="noopener" download="'+esc(reg.arquivoNome||('extrato_'+cp))+'">⬇️ Baixar</a>';
      }
      bts+='<button class="bt" data-ex-troca="1">✏️ Trocar o arquivo</button>';
      if(!reg.semMovimento) bts+='<button class="bt" data-ex-sm="1">∅ Marcar sem movimento</button>';
      bts+='<button class="bt vm" data-ex-del="1">\u{1F5D1}️ Excluir</button>';
    }else{
      if(s==='at') h+='<div class="ln"><span>Atraso</span><b style="color:#d92d20">'+atrasoDias(anoSel,mi)+' dia(s)</b></div>';
      if(s==='na') h+='<div class="ln"><span>Observação</span><b>Mês futuro ou anterior ao início do controle</b></div>';
      bts+='<button class="bt az" data-ex-cob="1">\u{1F514} Cobrar este cliente</button>'
          +'<button class="bt" data-ex-troca="1">\u{1F4CE} Anexar eu mesmo</button>'
          +'<button class="bt" data-ex-sm="1">∅ Marcar sem movimento</button>';
    }
    h+='<div class="bts">'+bts+'</div>'
      +'<div id="ex-mup" style="display:none;margin-top:12px;border-top:1px dotted var(--border);padding-top:11px">'
        +'<label>Arquivo do extrato (PDF ou OFX · máx. '+MAXMB+' MB)</label>'
        +'<input id="ex-mfile" type="file" accept=".pdf,.ofx,.PDF,.OFX"/>'
        +'<div id="ex-mprog" style="display:none;font-size:12px;color:var(--cinza);margin-top:6px">Enviando... <b id="ex-mprog-n">0%</b></div>'
        +'<div class="bts"><button class="bt az" id="ex-msalva">\u{1F4BE} Salvar em '+MESES[mi]+'/'+anoSel+'</button></div>'
      +'</div>';
    var m=modal(h);
    var bt;
    bt=m.querySelector('[data-ex-sm]');    if(bt) bt.onclick=function(){ fecharModal(); marcarSemMov(cli,cp); };
    bt=m.querySelector('[data-ex-del]');   if(bt) bt.onclick=function(){ fecharModal(); apagar(cli,cp); };
    bt=m.querySelector('[data-ex-cob]');   if(bt) bt.onclick=function(){ fecharModal(); cobrarUm(cli,anoSel,mi); };
    bt=m.querySelector('[data-ex-troca]'); if(bt) bt.onclick=function(){ var u=el('ex-mup'); if(u) u.style.display='block'; };
    bt=m.querySelector('#ex-msalva');      if(bt) bt.onclick=function(){ anexarAdmin(cli,cp,mi); };
  }

  async function anexarAdmin(cli,cp,mi){
    if(enviando) return;
    var d=db(); if(!d){ aviso('Sem conexão com a nuvem.','warn'); return; }
    var fi=el('ex-mfile'), file=(fi && fi.files && fi.files[0]) ? fi.files[0] : null;
    if(!file){ aviso('⚠ Escolha o arquivo do extrato','warn'); return; }
    if(file.size > MAXMB*1024*1024){ aviso('⚠ Arquivo muito grande (máximo '+MAXMB+' MB)','warn'); return; }
    enviando=true;
    var bt=el('ex-msalva'); if(bt){ bt.disabled=true; bt.innerHTML='⏳ Enviando...'; }
    try{
      var antigo=(acha(cli,cp)||{}).arquivoPath||null;
      var dados={ cliente:cli, competencia:cp, semMovimento:false, situacao:'ok',
        arquivoNome:file.name, tamanho:file.size, origem:'escritorio',
        enviadoEm:new Date().toLocaleString('pt-BR'), ts:Date.now(), prazo:prazoTxt(anoSel,mi),
        arquivoUrl:'', arquivoData:'', arquivoPath:'' };
      var s=st(), subiu=false;
      if(s){
        try{
          var caminho=PASTA+limpo(cli)+'/'+cp+'/'+Date.now()+'_'+limpo(file.name);
          dados.arquivoUrl=await subir(s.ref(caminho), file);
          dados.arquivoPath=caminho; subiu=true;
        }catch(e){ subiu=false; }
      }
      if(!subiu){
        if(file.size>LIMBD) throw new Error('Não foi possível usar o armazenamento e o arquivo passa de 700 KB.');
        dados.arquivoData=await base64(file);
      }
      await d.collection(COL).doc(idDoc(cli,cp)).set(dados,{merge:true});
      if(antigo && antigo!==dados.arquivoPath){ try{ if(s) s.ref(antigo).delete().catch(function(){}); }catch(e){} }
      aviso('\u{1F4BE} Extrato de '+cli+' salvo em '+MESES[mi]+'/'+anoSel+'.');
      fecharModal();
      await carregar(true); grade();
    }catch(e){ aviso('Erro ao salvar: '+(e && e.message ? e.message : e),'warn'); }
    if(bt){ bt.disabled=false; bt.innerHTML='\u{1F4BE} Salvar'; }
    enviando=false;
  }

  function atrasoDias(ano,mi){
    var ms=new Date()-prazoDe(ano,mi);
    return Math.max(0, Math.floor(ms/86400000));
  }

  async function marcarSemMov(cli,cp){
    var d=db(); if(!d){ aviso('Sem conexão com a nuvem.','warn'); return; }
    try{
      await d.collection(COL).doc(idDoc(cli,cp)).set({
        cliente:cli, competencia:cp, semMovimento:true, situacao:'sm',
        origem:'escritorio', enviadoEm:new Date().toLocaleString('pt-BR'), ts:Date.now()
      },{merge:true});
      aviso('∅ '+cli+': mês marcado como sem movimento.');
      await carregar(true); grade();
    }catch(e){ aviso('Erro ao salvar: '+(e && e.message ? e.message : e),'warn'); }
  }

  async function apagar(cli,cp){
    if(!confirm('Apagar o registro de extrato de '+cli+' ('+cp+')?')) return;
    var d=db(); if(!d) return;
    try{
      var reg=acha(cli,cp);
      await d.collection(COL).doc(idDoc(cli,cp)).delete();
      if(reg && reg.arquivoPath){ try{ var s=st(); if(s) s.ref(reg.arquivoPath).delete().catch(function(){}); }catch(e){} }
      aviso('Registro apagado.','info');
      await carregar(true); grade();
    }catch(e){ aviso('Erro ao apagar: '+(e && e.message ? e.message : e),'warn'); }
  }

  async function cobrarUm(cli,ano,mi){
    var d=db(); if(!d) return;
    try{
      await d.collection('urgencias').add({
        titulo:'\u{1F3E6} Extrato de '+MESES[mi]+'/'+ano+' pendente',
        msg:'Olá! Ainda não recebemos o seu extrato bancário de '+MESES[mi]+'/'+ano+'. O prazo era '+prazoTxt(ano,mi)+'. Envie pelo app em "\u{1F3E6} Meus Extratos" (PDF ou OFX). Se não houve movimento, toque em "Não tive movimento". APARAT Contabilidade.',
        prio:'Alta', dest:cli, data:new Date().toLocaleDateString('pt-BR')
      });
      aviso('\u{1F514} Cobrança enviada para '+cli+'.');
    }catch(e){ aviso('Erro ao cobrar: '+(e && e.message ? e.message : e),'warn'); }
  }

  async function cobrar(){
    var ca=compAtual(), lista=[];
    nomes.forEach(function(n){ if(situacao(n,ca.ano,ca.mi)==='at') lista.push(n); });
    if(!lista.length){ aviso('Nenhum cliente atrasado em '+MESES[ca.mi]+'/'+ca.ano+'. Está tudo em dia!','info'); return; }
    if(!confirm('Enviar cobrança do extrato de '+MESES[ca.mi]+'/'+ca.ano+' para '+lista.length+' cliente(s)?\n\n'+lista.join('\n'))) return;
    for(var i=0;i<lista.length;i++){ await cobrarUm(lista[i], ca.ano, ca.mi); }
    aviso('\u{1F514} Cobrança enviada para '+lista.length+' cliente(s).');
    try{ if(typeof syncAnim==='function') syncAnim('Cobrança de extrato · '+lista.length+' cliente(s)'); }catch(e){}
  }

  /* ================= APP DO CLIENTE ================= */
  function blocoCliente(){
    var vc=el('view-cliente'); if(!vc) return null;
    var left=vc.querySelector('.cli-left'); if(!left) return null;
    var b=el('sec-extratos');
    if(!b){
      b=document.createElement('div'); b.className='cli-sec'; b.id='sec-extratos';
      b.innerHTML='<div class="asec" style="margin-top:12px">\u{1F3E6} Meus Extratos</div><div id="cli-ext"><div style="font-size:13px;color:var(--cinza);padding:4px 0">Carregando...</div></div>';
      var ref=el('sec-pedidos')||el('sec-doc');
      if(ref && ref.parentNode===left) left.insertBefore(b, ref.nextSibling); else left.appendChild(b);
    }
    return b;
  }

  var ultimoCli='';
  async function telaCliente(){
    if(typeof CURRENT_CLIENTE==='undefined' || !CURRENT_CLIENTE) return;
    if(!blocoCliente()) return;
    var alvo=el('cli-ext'); if(!alvo) return;
    var d=db(); if(!d) return;
    try{
      var s=await d.collection(COL).where('cliente','==',CURRENT_CLIENTE).get();
      var arr=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; arr.push(o); });
      cache=cache.filter(function(x){ return x.cliente!==CURRENT_CLIENTE; }).concat(arr);
    }catch(e){}
    ultimoCli=CURRENT_CLIENTE;

    var ca=compAtual(), s0=situacao(CURRENT_CLIENTE,ca.ano,ca.mi);
    var alerta='';
    if(s0==='at'){
      alerta='<div class="ex-al at"><b style="color:#d92d20">⚠️ Extrato de '+MESES[ca.mi]+'/'+ca.ano+' em atraso</b><br>O prazo era '+prazoTxt(ca.ano,ca.mi)+'. Envie hoje para a APARAT fechar a sua apuração.</div>';
    }else if(s0==='pd'){
      alerta='<div class="ex-al pd"><b style="color:#b45309">\u{1F4C5} Extrato de '+MESES[ca.mi]+'/'+ca.ano+'</b><br>Você tem até '+prazoTxt(ca.ano,ca.mi)+' para enviar.</div>';
    }else{
      alerta='<div class="ex-al ok"><b style="color:#0e9f6e">✔ '+MESES[ca.mi]+'/'+ca.ano+' entregue</b><br>Obrigado! Não há nada pendente no momento.</div>';
    }

    var envio='';
    if(s0==='at'||s0==='pd'){
      envio='<div class="ex-card">'
        +'<h4>'+MESES[ca.mi].charAt(0).toUpperCase()+MESES[ca.mi].slice(1)+' / '+ca.ano+'</h4>'
        +'<p>Extrato de todas as contas da empresa · PDF ou OFX (máx. '+MAXMB+' MB)</p>'
        +'<div class="fg" style="margin-top:9px"><input id="ext-file" type="file" accept=".pdf,.ofx,.PDF,.OFX"/></div>'
        +'<div id="ext-prog" style="display:none;font-size:12px;color:var(--cinza);margin-top:6px">Enviando... <b id="ext-prog-n">0%</b></div>'
        +'<button class="ex-mbt" id="ext-env">\u{1F4E4} Enviar extrato de '+MESES[ca.mi]+'</button>'
        +'<button class="ex-mbt sec" id="ext-sm">∅ Não tive movimento neste mês</button>'
      +'</div>';
    }

    /* fita dos ultimos 12 meses */
    var fita='', h=new Date();
    for(var k=11;k>=0;k--){
      var dt=new Date(ca.ano, ca.mi-k, 1);
      var sx=situacao(CURRENT_CLIENTE, dt.getFullYear(), dt.getMonth());
      var ic={ok:'✓',sm:'∅',pd:'•',at:'!',na:'–'}[sx];
      fita+='<div class="'+sx+'">'+MABREV[dt.getMonth()]+'<br>'+ic+'</div>';
    }

    /* lista dos extratos que o cliente ja mandou, com botao de ver e baixar */
    var meus=cache.filter(function(x){ return x.cliente===CURRENT_CLIENTE; })
                  .sort(function(a,b){ return String(b.competencia||'').localeCompare(String(a.competencia||'')); })
                  .slice(0,12);
    var lista='';
    meus.forEach(function(x){
      var p=String(x.competencia||'').split('-'), mn=Number(p[1])-1;
      var titulo=(MESES[mn]?MESES[mn].charAt(0).toUpperCase()+MESES[mn].slice(1):x.competencia)+' / '+p[0];
      var end=x.arquivoUrl||x.arquivoData||'';
      var acao = x.semMovimento
        ? '<span class="ex-vb" style="border-color:rgba(14,159,110,.4);color:#0e9f6e">∅ Sem movimento</span>'
        : (end
            ? '<a class="ex-vb az" href="'+esc(end)+'" target="_blank" rel="noopener">\u{1F441}️ Ver</a>'
              +'<a class="ex-vb" href="'+esc(end)+'" target="_blank" rel="noopener" download="'+esc(x.arquivoNome||('extrato_'+x.competencia))+'">⬇️</a>'
            : '<span class="ex-vb">arquivo indisponível</span>');
      var sub=[x.arquivoNome||'', x.tamanho?tam(x.tamanho):'', x.enviadoEm||''].filter(function(t){ return t; }).join(' · ');
      lista+='<div class="ex-hist"><div class="in"><b>'+esc(titulo)+'</b><span>'+esc(sub)+'</span></div>'+acao+'</div>';
    });
    if(!lista) lista='<div style="font-size:12px;color:var(--cinza);padding:8px 0">Você ainda não enviou nenhum extrato por aqui.</div>';

    alvo.innerHTML=alerta+envio
      +'<div class="ex-card"><h4>Meu histórico</h4><p>Últimos 12 meses de entrega</p>'
      +'<div class="ex-fita">'+fita+'</div>'
      +'<p style="margin-top:9px">Prazo: todo dia '+DIA_PRAZO+' do mês seguinte.</p></div>'
      +'<div class="ex-card"><h4>\u{1F4C2} Extratos que enviei</h4><p>Toque em "Ver" para abrir o arquivo</p>'
      +lista+'</div>';

    var be=el('ext-env'); if(be) be.onclick=enviarCliente;
    var bs=el('ext-sm'); if(bs) bs.onclick=semMovCliente;
  }

  async function semMovCliente(){
    if(!confirm('Confirmar que NÃO houve movimentação bancária neste mês?\n\nIsso fica registrado com data e hora.')) return;
    var d=db(); if(!d){ aviso('Sem conexão.','warn'); return; }
    var ca=compAtual(), cp=comp(ca.ano,ca.mi);
    try{
      await d.collection(COL).doc(idDoc(CURRENT_CLIENTE,cp)).set({
        cliente:CURRENT_CLIENTE, competencia:cp, semMovimento:true, situacao:'sm',
        origem:'cliente', enviadoEm:new Date().toLocaleString('pt-BR'), ts:Date.now(),
        prazo:prazoTxt(ca.ano,ca.mi)
      },{merge:true});
      aviso('∅ Registrado: mês sem movimento.');
      await telaCliente();
    }catch(e){ aviso('Erro ao registrar: '+(e && e.message ? e.message : e),'warn'); }
  }

  async function enviarCliente(){
    if(enviando) return;
    var d=db(); if(!d){ aviso('Sem conexão.','warn'); return; }
    var fi=el('ext-file'), file=(fi && fi.files && fi.files[0]) ? fi.files[0] : null;
    if(!file){ aviso('⚠ Escolha o arquivo do extrato (PDF ou OFX)','warn'); return; }
    if(file.size > MAXMB*1024*1024){ aviso('⚠ Arquivo muito grande (máximo '+MAXMB+' MB)','warn'); return; }
    var ca=compAtual(), cp=comp(ca.ano,ca.mi);
    enviando=true;
    var bt=el('ext-env'); if(bt){ bt.disabled=true; bt.innerHTML='⏳ Enviando...'; }
    try{
      var dados={
        cliente:CURRENT_CLIENTE, competencia:cp, semMovimento:false, situacao:'ok',
        arquivoNome:file.name, tamanho:file.size, origem:'cliente',
        enviadoEm:new Date().toLocaleString('pt-BR'), ts:Date.now(), prazo:prazoTxt(ca.ano,ca.mi),
        arquivoUrl:'', arquivoData:'', arquivoPath:''
      };
      var s=st(); var subiu=false;
      if(s){
        try{
          var caminho=PASTA+limpo(CURRENT_CLIENTE)+'/'+cp+'/'+Date.now()+'_'+limpo(file.name);
          dados.arquivoUrl=await subir(s.ref(caminho), file);
          dados.arquivoPath=caminho; subiu=true;
        }catch(e){ subiu=false; }
      }
      if(!subiu){
        if(file.size>LIMBD) throw new Error('Não foi possível enviar pelo armazenamento e o arquivo passa de 700 KB. Fale com o escritório.');
        dados.arquivoData=await base64(file);
      }
      await d.collection(COL).doc(idDoc(CURRENT_CLIENTE,cp)).set(dados,{merge:true});
      /* mantem a aba "Recebidos" do escritorio funcionando como sempre */
      try{
        if(typeof dbAdd==='function'){
          await dbAdd('enviosCliente',{cliente:CURRENT_CLIENTE, nome:file.name,
            tipo:(String(file.name).split('.').pop()||'').toUpperCase(),
            arquivoData:dados.arquivoData||'', arquivoUrl:dados.arquivoUrl||'',
            data:new Date().toLocaleString('pt-BR'), origem:'extrato '+cp});
        }
      }catch(e){}
      if(fi) fi.value='';
      aviso('\u{1F4E4} Extrato de '+MESES[ca.mi]+' enviado para a APARAT!');
      await telaCliente();
    }catch(e){
      aviso('Erro ao enviar: '+(e && e.message ? e.message : e),'warn');
    }
    var pg=el('ext-prog'); if(pg) pg.style.display='none';
    if(bt){ bt.disabled=false; bt.innerHTML='\u{1F4E4} Enviar extrato'; }
    enviando=false;
  }

  function base64(file){
    if(typeof lerArquivoBase64==='function') return lerArquivoBase64(file);
    return new Promise(function(ok,err){
      var fr=new FileReader();
      fr.onload=function(){ ok(fr.result); };
      fr.onerror=function(){ err(new Error('Não foi possível ler o arquivo')); };
      fr.readAsDataURL(file);
    });
  }

  function subir(ref, file){
    return new Promise(function(ok,err){
      var pg=el('ext-prog')||el('ex-mprog'), pn=el('ext-prog-n')||el('ex-mprog-n'), pronto=false;
      if(pg) pg.style.display='block';
      var relogio=setTimeout(function(){
        if(pronto) return; pronto=true;
        err(new Error('O envio não respondeu.'));
      },60000);
      var task=ref.put(file,{contentType:file.type||'application/octet-stream'});
      task.on('state_changed', function(sn){
        if(pn && sn.totalBytes) pn.textContent=Math.round((sn.bytesTransferred/sn.totalBytes)*100)+'%';
      }, function(e){ if(pronto) return; pronto=true; clearTimeout(relogio); err(e); },
      function(){
        ref.getDownloadURL().then(function(u){ if(pronto) return; pronto=true; clearTimeout(relogio); ok(u); })
                            .catch(function(e){ if(pronto) return; pronto=true; clearTimeout(relogio); err(e); });
      });
    });
  }

  /* ================= RELOGIO ================= */
  var ocupado=false, voltas=0;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css();
      var painel=el('view-painel');
      if(painel && painel.classList.contains('active') && ehAdmin()){
        menu(); pagina();
        if(voltas===1 || voltas%10===0){ await carregarNomes(); await carregar(); if(el('ex-tab')) grade(); }
      }
      var vc=el('view-cliente');
      if(vc && vc.querySelector('.cli-grid') && typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE){
        if(!el('cli-ext') || CURRENT_CLIENTE!==ultimoCli || voltas%5===0) await telaCliente();
      }
    }catch(e){}
    ocupado=false;
  }
  [1800,4000,8000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,6000);
})();

/* APARAT v55 - PEDIDO DE NOTA FISCAL
   Fase 1: descricao do cliente visivel na tabela do painel + bolinha certa
   Fase 2: cliente PEDE a emissao (formulario completo) e o escritorio emite com 1 clique (interligado)
   Fase 3: repetir ultimo pedido, tomadores frequentes e relatorio pedidas x emitidas */
;(function(){
  if(window.__APARAT_NF2__) return; window.__APARAT_NF2__=1;
  var COL='notas';
  var ST_NOVO='Pedido recebido', ST_EMIS='Em emissão', ST_RESP='Aguardando o cliente', ST_OK='Emitida';
  var PASSOS=[ST_NOVO, ST_EMIS, ST_OK];

  /* ---------------- utilitarios ---------------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function v(id){ var e=el(id); return e?String(e.value||'').trim():''; }
  function setV(id,x){ var e=el(id); if(e) e.value=(x==null?'':x); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t||'success'); return; } }catch(e){} try{ alert(m); }catch(e){} }
  function hoje(){ return new Date().toLocaleDateString('pt-BR'); }
  function agora(){ return new Date().toLocaleString('pt-BR'); }
  function ehAdmin(){
    try{
      var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL;
      return true;
    }catch(e){ return false; }
  }
  function ms(ts){ try{ if(!ts) return 0; if(typeof ts.toMillis==='function') return ts.toMillis(); if(ts.seconds) return ts.seconds*1000; return Date.parse(ts)||0; }catch(e){ return 0; } }
  function num(x){ x=String(x==null?'':x).replace(/[^0-9,.-]/g,''); if(x.indexOf(',')>-1) x=x.replace(/\./g,'').replace(',','.'); return parseFloat(x)||0; }
  function moeda(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function dataBr(s){
    s=String(s||''); if(!s) return '';
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m) return m[3]+'/'+m[2]+'/'+m[1];
    return s;
  }
  function soNum(s){ return String(s==null?'':s).replace(/\D/g,''); }
  function validaCPF(c){
    c=soNum(c); if(c.length!==11 || /^(\d)\1{10}$/.test(c)) return false;
    var s=0,i,d1,d2;
    for(i=0;i<9;i++) s+=parseInt(c.charAt(i),10)*(10-i);
    d1=(s*10)%11; if(d1===10) d1=0; if(d1!==parseInt(c.charAt(9),10)) return false;
    s=0; for(i=0;i<10;i++) s+=parseInt(c.charAt(i),10)*(11-i);
    d2=(s*10)%11; if(d2===10) d2=0; return d2===parseInt(c.charAt(10),10);
  }
  function validaCNPJ(c){
    c=soNum(c); if(c.length!==14 || /^(\d)\1{13}$/.test(c)) return false;
    var t=[5,4,3,2,9,8,7,6,5,4,3,2], s=0, i, r, d1, d2;
    for(i=0;i<12;i++) s+=parseInt(c.charAt(i),10)*t[i];
    r=s%11; d1=(r<2)?0:(11-r); if(d1!==parseInt(c.charAt(12),10)) return false;
    t=[6,5,4,3,2,9,8,7,6,5,4,3,2]; s=0;
    for(i=0;i<13;i++) s+=parseInt(c.charAt(i),10)*t[i];
    r=s%11; d2=(r<2)?0:(11-r); return d2===parseInt(c.charAt(13),10);
  }
  function validaDoc(c){ var n=soNum(c); if(n.length===11) return validaCPF(n); if(n.length===14) return validaCNPJ(n); return false; }
  function fmtDoc(c){
    var n=soNum(c);
    if(n.length===11) return n.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4');
    if(n.length===14) return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');
    return String(c||'');
  }
  function validaEmail(e){ return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(e||'').trim()); }
  function ehPedido(x){ return String(x && x.tipo || '')==='Pedido'; }
  function copiar(txt){
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt); return true; }
    }catch(e){}
    try{
      var t=document.createElement('textarea'); t.value=txt;
      t.style.cssText='position:fixed;left:-9999px'; document.body.appendChild(t);
      t.select(); document.execCommand('copy'); document.body.removeChild(t); return true;
    }catch(e){ return false; }
  }

  /* ---------------- estilo ---------------- */
  function css(){
    if(el('ap-nf2-css')) return;
    var s=document.createElement('style'); s.id='ap-nf2-css';
    s.textContent=
      /* painel do escritorio */
      '#nf2-box .nf2-card{background:var(--card);border:1.5px solid rgba(180,83,9,.45);border-radius:14px;padding:14px;margin-bottom:10px}'
      +'#nf2-box .nf2-card.ok{border-color:rgba(14,159,110,.45)}'
      +'#nf2-box .nf2-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}'
      +'#nf2-box .nf2-nome{font-size:16px;font-weight:800}'
      +'#nf2-box .nf2-dados{display:grid;grid-template-columns:1fr 1fr;gap:7px 16px;font-size:13px}'
      +'#nf2-box .nf2-dados span{display:block;font-size:10px;color:var(--cinza)}'
      +'#nf2-box .nf2-dados b{font-size:13px;word-break:break-word}'
      +'#nf2-box .nf2-desc{margin-top:10px;background:rgba(51,85,255,.07);border:1px solid var(--border);border-radius:10px;padding:10px 12px}'
      +'#nf2-box .nf2-desc span{display:block;font-size:10px;color:var(--cinza)}'
      +'#nf2-box .nf2-desc b{font-size:14px}'
      +'#nf2-box .nf2-resp{margin-top:8px;background:rgba(180,83,9,.10);border:1px solid rgba(180,83,9,.35);border-radius:10px;padding:9px 12px;font-size:12px}'
      +'#nf2-box .nf2-bts{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}'
      +'#nf2-box .nf2-bt{font-size:13px;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer;text-decoration:none;display:inline-block}'
      +'#nf2-box .nf2-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#nf2-box .nf2-bt.vd{background:#0E9F6E;border-color:#0E9F6E;color:#fff}'
      +'#nf2-box .nf2-bt.vm{border-color:rgba(217,45,32,.55);color:#d92d20}'
      +'#nf2-box .nf2-tag{font-size:11px;font-weight:700;border-radius:9px;padding:4px 10px;display:inline-block}'
      +'#nf2-box .nf2-vazio{font-size:13px;color:var(--cinza);padding:8px 0}'
      +'#nf2-rel{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}'
      +'#nf2-rel .nf2-kpi{flex:1;min-width:120px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px}'
      +'#nf2-rel .nf2-kpi b{display:block;font-size:22px;font-weight:800;line-height:1.2}'
      +'#nf2-rel .nf2-kpi span{display:block;font-size:11px;color:var(--cinza)}'
      /* app do cliente */
      +'#nf2-cli .nf2-esc{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px}'
      +'#nf2-cli .nf2-esc button{flex:1;min-width:150px;font-size:15px;font-weight:800;padding:14px 12px;border-radius:13px;border:1.5px solid var(--azul);background:transparent;color:var(--azul);cursor:pointer}'
      +'#nf2-cli .nf2-esc button.on{background:var(--azul);color:#fff}'
      +'#nf2-cli .nf2-form{background:rgba(51,85,255,.05);border:1px dashed var(--azul);border-radius:14px;padding:14px;margin-bottom:14px}'
      +'#nf2-cli .nf2-form label{display:block;font-size:12px;font-weight:700;color:var(--cinza);margin:0 0 4px}'
      +'#nf2-cli .nf2-form .fg{margin-bottom:10px}'
      +'#nf2-cli .nf2-form input,#nf2-cli .nf2-form textarea{width:100%;font-size:15px !important;padding:12px !important;border-radius:10px;border:1px solid var(--border);background:var(--escuro,#0d0d20);color:inherit;font-family:inherit}'
      +'#nf2-cli .nf2-form .nf2-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
      +'#nf2-cli .nf2-erro{font-size:12px;color:#d92d20;font-weight:700;margin-top:-6px;margin-bottom:8px;display:none}'
      +'#nf2-cli .nf2-ped{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:13px;margin-bottom:10px}'
      +'#nf2-cli .nf2-ped .lin{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:10px}'
      +'#nf2-cli .nf2-et{font-size:11px;font-weight:700;border-radius:20px;padding:5px 10px;background:rgba(102,116,140,.18);color:var(--cinza)}'
      +'#nf2-cli .nf2-et.on{background:var(--azul);color:#fff}'
      +'#nf2-cli .nf2-et.done{background:rgba(14,159,110,.18);color:#0E9F6E}'
      +'#nf2-cli .nf2-sep{color:var(--cinza);font-size:12px}'
      +'@media(max-width:520px){#nf2-box .nf2-dados,#nf2-cli .nf2-form .nf2-2{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  /* ================================================================
     PAINEL DO ESCRITORIO
     ================================================================ */
  function caixaAdmin(){
    var pg=el('pp-notas'); if(!pg) return null;
    var b=el('nf2-box');
    if(!b){
      b=document.createElement('div'); b.id='nf2-box';
      b.innerHTML='<div class="sec">\u{1F4E5} Pedidos de nota fiscal</div>'
        +'<div id="nf2-rel"></div>'
        +'<div id="nf2-lista"><div class="nf2-vazio">Carregando...</div></div>';
      pg.insertBefore(b, pg.firstChild);
    }
    return b;
  }

  function cabecalho(){
    var pg=el('pp-notas'); if(!pg) return;
    var thead=pg.querySelector('table thead tr'); if(!thead || el('nf2-th')) return;
    var th=document.createElement('th'); th.id='nf2-th'; th.textContent='Descrição / pedido';
    var ths=thead.querySelectorAll('th');
    thead.insertBefore(th, ths.length>2 ? ths[2] : null);
  }

  var cacheAdmin=[];

  /* uma leitura so: alimenta os cartoes de pedido, os numeros do mes e a tabela */
  async function atualizarPainel(){
    var itens=[];
    try{ itens=await dbGetAll(COL); }
    catch(e){
      var t=el('nf-tbody');
      if(t) t.innerHTML='<tr><td colspan="9" style="color:var(--laranja)">⚠ Publique a regra de segurança de "notas" no Firebase para ativar esta aba.</td></tr>';
      var a=el('nf2-lista'); if(a) a.innerHTML='<div class="nf2-vazio">Não foi possível carregar os pedidos.</div>';
      return;
    }
    cacheAdmin=itens;
    cabecalho(); caixaAdmin();
    relatorio(itens);
    listarAdmin(itens);
    desenhaTabela(itens);
  }

  function listarAdmin(itens){
    var box=caixaAdmin(); if(!box) return;
    var alvo=el('nf2-lista'); if(!alvo) return;
    itens=itens||cacheAdmin||[];

    var peds=itens.filter(ehPedido).sort(function(a,b){ return ms(b.criadoEm)-ms(a.criadoEm); });
    var abertos=peds.filter(function(x){ return String(x.status||'')!==ST_OK; });
    var feitos=peds.filter(function(x){ return String(x.status||'')===ST_OK; }).slice(0,5);

    if(!peds.length){
      alvo.innerHTML='<div class="nf2-vazio">\u{1F4ED} Nenhum pedido de emissão no momento. '
        +'Quando um cliente pedir uma nota pelo app, ela aparece aqui com todos os dados do tomador.</div>';
      return;
    }
    var h='';
    h+= abertos.length
      ? '<div style="font-size:13px;font-weight:800;color:#b45309;margin:2px 0 8px">\u{23F3} Aguardando emissão ('+abertos.length+')</div>'
      : '<div class="nf2-vazio">✔ Nenhum pedido aguardando emissão.</div>';
    h+= abertos.map(cartao).join('');
    if(feitos.length){
      h+='<div style="font-size:13px;font-weight:800;color:#0E9F6E;margin:14px 0 8px">✔ Últimos pedidos emitidos</div>'
        +feitos.map(cartao).join('');
    }
    alvo.innerHTML=h;
    ligarBotoes(alvo);
  }

  function tagStatus(st){
    st=String(st||ST_NOVO);
    if(st===ST_OK) return '<span class="nf2-tag" style="background:rgba(14,159,110,.16);color:#0E9F6E">✔ Emitida</span>';
    if(st===ST_EMIS) return '<span class="nf2-tag" style="background:rgba(51,85,255,.16);color:#3355FF">\u{1F58A}️ Em emissão</span>';
    if(st===ST_RESP) return '<span class="nf2-tag" style="background:rgba(180,83,9,.16);color:#b45309">\u{1F4AC} Aguardando o cliente</span>';
    return '<span class="nf2-tag" style="background:rgba(180,83,9,.16);color:#b45309">⏳ Aguardando emissão</span>';
  }

  function cartao(x){
    var feito=String(x.status||'')===ST_OK;
    var linha=function(rot,txt){ return '<div><span>'+esc(rot)+'</span><b>'+(txt?esc(txt):'—')+'</b></div>'; };
    var anexo=x.arquivoData
      ? '<button class="nf2-bt" data-nf2-anexo="'+esc(x.id)+'">\u{1F4CE} Ver anexo</button>' : '';
    return '<div class="nf2-card'+(feito?' ok':'')+'">'
      +'<div class="nf2-top">'
        +'<div class="nf2-nome">\u{1F9FE} '+esc(x.cliente||'(sem cliente)')+'</div>'
        +'<div>'+tagStatus(x.status)+' <span style="font-size:11px;color:var(--cinza)">'+esc(x.data||'')+'</span></div>'
      +'</div>'
      +'<div class="nf2-dados">'
        +linha('Tomador', x.tomador)
        +linha('CPF / CNPJ', x.docTomador?fmtDoc(x.docTomador):'')
        +linha('Valor', x.valor?moeda(num(x.valor)):'')
        +linha('Data desejada', dataBr(x.dataDesejada))
        +linha('E-mail para envio', x.emailTomador)
        +linha('Endereço', x.enderecoTomador)
      +'</div>'
      +'<div class="nf2-desc"><span>Descrição do serviço ou produto</span><b>'+esc(x.descricao||'—')+'</b>'
        +(x.obs?'<div style="font-size:12px;color:var(--cinza);margin-top:5px">Observação: '+esc(x.obs)+'</div>':'')
      +'</div>'
      +(x.resposta?'<div class="nf2-resp"><b>Sua resposta ao cliente:</b> '+esc(x.resposta)+' <span style="color:var(--cinza)">('+esc(x.respostaEm||'')+')</span></div>':'')
      +'<div class="nf2-bts">'
        +(feito?'':'<button class="nf2-bt az" data-nf2-emitir="'+esc(x.id)+'">✅ Emitir agora</button>')
        +'<button class="nf2-bt" data-nf2-copiar="'+esc(x.id)+'">\u{1F4CB} Copiar dados do tomador</button>'
        +(feito?'':'<button class="nf2-bt" data-nf2-resp="'+esc(x.id)+'">\u{1F4AC} Responder ao cliente</button>')
        +'<button class="nf2-bt" data-nf2-zap="'+esc(x.id)+'">\u{1F4F2} WhatsApp</button>'
        +anexo
        +(feito?'<button class="nf2-bt" data-nf2-reabrir="'+esc(x.id)+'">\u{1F513} Reabrir</button>'
               :'<button class="nf2-bt vd" data-nf2-ok="'+esc(x.id)+'">✔ Marcar como emitida</button>')
        +'<button class="nf2-bt vm" data-nf2-del="'+esc(x.id)+'">\u{1F5D1}️ Excluir</button>'
      +'</div>'
    +'</div>';
  }

  function acha(id){ return cacheAdmin.filter(function(i){ return String(i.id)===String(id); })[0]; }

  function ligarBotoes(box){
    function on(attr,fn){
      [].slice.call(box.querySelectorAll('['+attr+']')).forEach(function(b){
        b.onclick=function(){ var x=acha(b.getAttribute(attr)); if(x) fn(x); };
      });
    }
    on('data-nf2-emitir', emitirAgora);
    on('data-nf2-copiar', copiarTomador);
    on('data-nf2-resp', responderCliente);
    on('data-nf2-zap', mandarZap);
    on('data-nf2-anexo', verAnexo);
    on('data-nf2-ok', function(x){ mudarStatus(x, ST_OK); });
    on('data-nf2-reabrir', function(x){ mudarStatus(x, ST_NOVO); });
    on('data-nf2-del', excluirPedido);
  }

  function textoTomador(x){
    return 'PEDIDO DE NOTA FISCAL — '+(x.cliente||'')+'\n'
      +'Tomador: '+(x.tomador||'')+'\n'
      +'CPF/CNPJ: '+(x.docTomador?fmtDoc(x.docTomador):'')+'\n'
      +'Endereço: '+(x.enderecoTomador||'')+'\n'
      +'E-mail: '+(x.emailTomador||'')+'\n'
      +'Valor: '+(x.valor?moeda(num(x.valor)):'')+'\n'
      +'Data desejada: '+dataBr(x.dataDesejada)+'\n'
      +'Descrição: '+(x.descricao||'')
      +(x.obs?('\nObservação: '+x.obs):'');
  }

  function copiarTomador(x){
    var ok=copiar(textoTomador(x));
    aviso(ok?'\u{1F4CB} Dados copiados. É só colar no emissor.':'Não consegui copiar. Abra o pedido e copie na mão.', ok?'success':'warn');
  }

  function mandarZap(x){
    var t='Olá! Sobre o seu pedido de nota fiscal:\n\n'+textoTomador(x);
    try{ window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank','noopener'); }catch(e){}
  }

  function verAnexo(x){
    try{ window.open((typeof blobUrl==='function')?blobUrl(x.arquivoData):x.arquivoData,'_blank'); }
    catch(e){ aviso('Não foi possível abrir o anexo.','warn'); }
  }

  async function mudarStatus(x, st, calado){
    var d=db(); if(!d) return;
    try{
      await d.collection(COL).doc(String(x.id)).update({status:st, atualizadoEm:agora()});
      if(!calado) aviso(st===ST_OK?'✔ Pedido marcado como emitido.':'Pedido reaberto.','info');
      await atualizarPainel();
    }catch(e){ aviso('Erro ao atualizar: '+(e.message||e),'warn'); }
  }

  async function excluirPedido(x){
    if(!confirm('Excluir o pedido de nota de '+(x.cliente||'')+'?\n\nO cliente deixa de ver este pedido no app.')) return;
    var d=db(); if(!d) return;
    try{ await d.collection(COL).doc(String(x.id)).delete(); aviso('\u{1F5D1}️ Pedido excluído.','info'); await atualizarPainel(); }
    catch(e){ aviso('Erro ao excluir: '+(e.message||e),'warn'); }
  }

  async function responderCliente(x){
    var t=prompt('O que você quer responder para '+(x.cliente||'o cliente')+'?\n\nExemplo: "Falta o endereço completo do tomador para eu emitir."', x.resposta||'');
    if(t===null) return;
    t=String(t||'').trim(); if(!t) return;
    var d=db(); if(!d) return;
    try{
      await d.collection(COL).doc(String(x.id)).update({resposta:t, respostaEm:agora(), status:ST_RESP});
      aviso('\u{1F4AC} Resposta enviada. O cliente vê no app dele.','info');
      await atualizarPainel();
    }catch(e){ aviso('Erro ao responder: '+(e.message||e),'warn'); }
  }

  function emitirAgora(x){
    var sel=el('nf-cli');
    if(sel && x.cliente){
      var tem=false;
      [].forEach.call(sel.options,function(o){ if(o.value===x.cliente) tem=true; });
      if(!tem){ var o=document.createElement('option'); o.value=x.cliente; o.textContent=x.cliente; sel.appendChild(o); }
      sel.value=x.cliente;
    }
    setV('nf-tipo','Envio');
    setV('nf-val', x.valor?String(num(x.valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})):'');
    setV('nf-desc', x.descricao||'');
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(x.dataDesejada||''))) setV('nf-data', x.dataDesejada);
    window.__apNF2Pedido={id:x.id, cliente:x.cliente||''};
    var t=el('pp-notas') && el('pp-notas').querySelector('.ftitle');
    if(t){ t.setAttribute('data-nf2-orig', t.getAttribute('data-nf2-orig')||t.innerHTML); t.innerHTML='\u{1F9FE} Emitindo a nota pedida por '+esc(x.cliente||'cliente'); }
    var b=el('nf-btn'); if(b){ b.setAttribute('data-nf2-orig', b.getAttribute('data-nf2-orig')||b.textContent); b.textContent='✅ Registrar e concluir o pedido'; }
    mudarStatus(x, ST_EMIS, true);
    try{ el('nf-num').focus(); }catch(e){}
    try{ el('pp-notas').scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
    aviso('Dados do pedido carregados. Informe o número da nota e anexe o PDF/XML.','info');
  }

  function restaurarForm(){
    var t=el('pp-notas') && el('pp-notas').querySelector('.ftitle');
    if(t && t.getAttribute('data-nf2-orig')) t.innerHTML=t.getAttribute('data-nf2-orig');
    var b=el('nf-btn'); if(b && b.getAttribute('data-nf2-orig')) b.textContent=b.getAttribute('data-nf2-orig');
  }

  /* liga a nota emitida ao pedido que a originou */
  function hookEnviar(){
    if(typeof window.enviarNota!=='function' || window.enviarNota.__nf2) return;
    var orig=window.enviarNota;
    var w=async function(){
      var ped=window.__apNF2Pedido;
      var r=await orig.apply(this, arguments);
      if(ped && ped.id){
        var d=db();
        try{
          var s=await d.collection(COL).where('cliente','==',ped.cliente).get();
          var arr=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; arr.push(o); });
          arr=arr.filter(function(o){ return !ehPedido(o); });
          arr.sort(function(a,b){ return ms(b.criadoEm)-ms(a.criadoEm); });
          var nova=arr[0];
          if(nova) await d.collection(COL).doc(String(nova.id)).update({pedidoId:String(ped.id)});
          await d.collection(COL).doc(String(ped.id)).update({status:ST_OK, notaId:nova?String(nova.id):'', emitidaEm:agora()});
          aviso('✔ Nota registrada e pedido de '+ped.cliente+' concluído!','success');
        }catch(e){}
        window.__apNF2Pedido=null;
        restaurarForm();
        try{ await atualizarPainel(); }catch(e){}
      }
      return r;
    };
    w.__nf2=1; window.enviarNota=w;
  }

  /* ---------------- relatorio pedidas x emitidas (mes corrente) ---------------- */
  function relatorio(itens){
    var box=el('nf2-rel'); if(!box) return;
    var h=new Date(), ini=new Date(h.getFullYear(), h.getMonth(), 1).getTime();
    var peds=itens.filter(ehPedido);
    var noMes=peds.filter(function(x){ return ms(x.criadoEm)>=ini; });
    var emitidas=noMes.filter(function(x){ return String(x.status||'')===ST_OK; }).length;
    var abertos=peds.filter(function(x){ return String(x.status||'')!==ST_OK; }).length;
    var notasMes=itens.filter(function(x){ return !ehPedido(x) && ms(x.criadoEm)>=ini; }).length;
    var valor=noMes.reduce(function(a,x){ return a+num(x.valor); },0);
    var mes=h.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    box.innerHTML=
       '<div class="nf2-kpi"><b>'+noMes.length+'</b><span>pedidos em '+esc(mes)+'</span></div>'
      +'<div class="nf2-kpi"><b style="color:#0E9F6E">'+emitidas+'</b><span>já emitidas no mês</span></div>'
      +'<div class="nf2-kpi"><b style="color:#b45309">'+abertos+'</b><span>aguardando emissão</span></div>'
      +'<div class="nf2-kpi"><b>'+notasMes+'</b><span>notas registradas no mês</span></div>'
      +'<div class="nf2-kpi"><b style="font-size:17px">'+esc(moeda(valor))+'</b><span>valor pedido no mês</span></div>';
  }

  /* ---------------- tabela do painel COM a coluna Descricao ---------------- */
  function desenhaTabela(ns){
    var tb=el('nf-tbody'); if(!tb) return;
    ns=ns||[];
    try{ _seedVistos('notas', ns); }catch(e){}
    var doCliente=ns.filter(function(n){ return String(n.origem||'')==='cliente'; });
    var pg=el('pp-notas'), aberta=pg && pg.classList.contains('active');
    try{
      if(aberta){ localStorage.setItem('seen_notas_cli', String(doCliente.length)); }
      setDot('dot-notas', doCliente.length, 'seen_notas_cli');
    }catch(e){}

    if(!ns.length){ tb.innerHTML='<tr><td colspan="9" style="color:var(--cinza)">Nenhuma nota fiscal registrada.</td></tr>'; return; }
    tb.innerHTML='';
    ns.slice().reverse().forEach(function(n){
      var pedido=ehPedido(n);
      var st=String(n.status||'');
      var fechada=/fechad/i.test(st) || st===ST_OK;
      var stag = pedido ? tagStatus(st)
        : (fechada?'<span class="tag tp">✔ Fechada</span>':'<span class="tag tn">\u{1F4C2} Aberta</span>');
      var ttag = pedido ? '\u{1F9FE} Pedido' : (n.tipo==='Recebimento'?'\u{1F4E5} Receb.':'\u{1F4E4} Envio');
      var arq = n.arquivoData
        ? '<span style="font-size:10px;color:var(--azul-light);cursor:pointer" onclick="abrirNotaArquivo(\''+n.id+'\')">\u{1F4C4} Ver</span>'
        : '<span style="font-size:10px;color:var(--cinza)">—</span>';
      var sub = pedido && n.tomador ? '<br><span style="font-size:10px;color:var(--cinza)">Tomador: '+esc(n.tomador)+'</span>' : '';
      var desc = n.descricao
        ? '<b style="font-size:11px">'+esc(String(n.descricao).slice(0,90))+(String(n.descricao).length>90?'…':'')+'</b>'+sub
        : '<span style="font-size:10px;color:var(--cinza)">—</span>';
      var novoN=(String(n.origem||'')==='cliente') && _ehNovo('notas', n.id);
      var tr=document.createElement('tr');
      if(novoN){ tr.className='neon-novo'; tr.style.cursor='pointer'; tr.onclick=function(){ _verNovo(tr,'notas',n.id); }; }
      if(pedido) tr.style.background='rgba(180,83,9,.07)';
      tr.innerHTML='<td>'+esc(n.cliente||'')+(novoN?'<span class="tag-novo">NOVO</span>':'')+'</td>'
        +'<td>'+ttag+'</td>'
        +'<td style="max-width:230px">'+desc+'</td>'
        +'<td>'+esc(n.numero||'—')+'</td>'
        +'<td>'+(n.valor?esc(moeda(num(n.valor))):'—')+'</td>'
        +'<td>'+esc(dataBr(n.dataDesejada||n.data)||'—')+'</td>'
        +'<td>'+arq+'</td>'
        +'<td>'+stag+'</td>'
        +'<td style="white-space:nowrap"><span style="cursor:pointer;margin-right:7px" title="Editar" onclick="editarNota(\''+n.id+'\')">✏️</span>'
        +'<span style="cursor:pointer;margin-right:7px" title="'+(fechada?'Reabrir':'Fechar')+'" onclick="fecharNota(\''+n.id+'\')">'+(fechada?'\u{1F513}':'✅')+'</span>'
        +'<span style="cursor:pointer" title="Excluir" onclick="excluirNota(\''+n.id+'\')">\u{1F5D1}️</span></td>';
      tb.appendChild(tr);
    });
  }

  function hookTabela(){
    if(typeof window.carregarNotas!=='function' || window.carregarNotas.__nf2) return;
    var w=async function(){ await atualizarPainel(); };
    w.__nf2=1; window.carregarNotas=w;
  }

  /* ================================================================
     APP DO CLIENTE
     ================================================================ */
  function nomeCli(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE)?CURRENT_CLIENTE:''; }catch(e){ return ''; } }

  function blocoCliente(){
    var sec=el('sec-notas'); if(!sec) return null;
    if(el('nf2-cli')) return el('nf2-cli');
    var b=document.createElement('div'); b.id='nf2-cli';
    b.innerHTML=
      '<div class="nf2-esc">'
        +'<button id="nf2-bt-pedir" class="on">\u{1F9FE} Pedir emissão de nota</button>'
        +'<button id="nf2-bt-enviar">\u{1F4E4} Enviar nota que já tenho</button>'
      +'</div>'
      +'<div class="nf2-form" id="nf2-form">'
        +'<div style="font-size:16px;font-weight:800;margin-bottom:12px">\u{1F9FE} Pedido de emissão de nota fiscal</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
          +'<button type="button" id="nf2-repetir" style="font-size:13px;font-weight:700;padding:9px 13px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer;display:none">\u{1F501} Repetir meu último pedido</button>'
        +'</div>'
        +'<div class="fg"><label>Tomador — nome ou razão social *</label>'
          +'<input id="nf2-tomador" type="text" list="nf2-tomadores" placeholder="Para quem é a nota"/>'
          +'<datalist id="nf2-tomadores"></datalist></div>'
        +'<div class="nf2-2">'
          +'<div class="fg"><label>CPF ou CNPJ do tomador *</label><input id="nf2-doc" type="text" inputmode="numeric" placeholder="00.000.000/0000-00"/></div>'
          +'<div class="fg"><label>Valor da nota *</label><input id="nf2-valor" type="text" inputmode="decimal" placeholder="2.500,00"/></div>'
        +'</div>'
        +'<div class="nf2-2">'
          +'<div class="fg"><label>E-mail para enviar a nota *</label><input id="nf2-email" type="email" placeholder="financeiro@empresa.com.br"/></div>'
          +'<div class="fg"><label>Data desejada *</label><input id="nf2-dtdes" type="date"/></div>'
        +'</div>'
        +'<div class="fg"><label>Endereço do tomador *</label><input id="nf2-end" type="text" placeholder="Rua, número, bairro, cidade/UF"/></div>'
        +'<div class="fg"><label>Descrição do serviço ou produto *</label><textarea id="nf2-desc" rows="3" placeholder="Ex.: Consultoria administrativa — competência agosto/2026"></textarea></div>'
        +'<div class="fg"><label>Observação (opcional)</label><input id="nf2-obs" type="text" placeholder="Ex.: reter ISS na fonte"/></div>'
        +'<div class="fg"><label>Anexo — pedido de compra, contrato (opcional, até 700 KB)</label><input id="nf2-file" type="file" accept=".pdf,.xml,.png,.jpg,.jpeg,.webp"/></div>'
        +'<div class="nf2-erro" id="nf2-erro"></div>'
        +'<button class="btn btn-az" id="nf2-enviar" style="width:100%">\u{1F9FE} Enviar pedido para a Aparat</button>'
        +'<div style="font-size:12px;color:var(--cinza);margin-top:8px">Os campos com * são obrigatórios. Com eles preenchidos a Aparat emite sem precisar te ligar.</div>'
      +'</div>'
      +'<div id="nf2-meus"></div>';
    var head=sec.querySelector('.asec');
    if(head && head.nextSibling) sec.insertBefore(b, head.nextSibling); else sec.insertBefore(b, sec.firstChild);
    el('nf2-bt-pedir').onclick=function(){ trocarAba(true); };
    el('nf2-bt-enviar').onclick=function(){ trocarAba(false); };
    el('nf2-enviar').onclick=enviarPedido;
    el('nf2-repetir').onclick=repetir;
    var dc=el('nf2-doc');
    if(dc) dc.onblur=function(){ if(dc.value) dc.value=fmtDoc(dc.value); };
    trocarAba(true);
    return b;
  }

  function formAntigo(){
    var sec=el('sec-notas'); if(!sec) return null;
    return sec.querySelector('.fbox-light');
  }
  function trocarAba(pedir){
    var f=el('nf2-form'), a=formAntigo();
    if(f) f.style.display=pedir?'block':'none';
    if(a) a.style.display=pedir?'none':'block';
    var b1=el('nf2-bt-pedir'), b2=el('nf2-bt-enviar');
    if(b1) b1.className=pedir?'on':'';
    if(b2) b2.className=pedir?'':'on';
  }

  function erro(msg, foco){
    var e=el('nf2-erro');
    if(e){ e.textContent='⚠ '+msg; e.style.display='block'; }
    aviso('⚠ '+msg,'warn');
    try{ if(foco) el(foco).focus(); }catch(x){}
    return false;
  }
  function limpaErro(){ var e=el('nf2-erro'); if(e){ e.textContent=''; e.style.display='none'; } }

  var enviandoPed=false;
  async function enviarPedido(){
    if(enviandoPed) return;
    limpaErro();
    var cli=nomeCli();
    if(!cli) return erro('Cadastro não identificado. Avise o escritório.');
    var tomador=v('nf2-tomador'), doc=v('nf2-doc'), valor=v('nf2-valor'), email=v('nf2-email');
    var dt=v('nf2-dtdes'), end=v('nf2-end'), desc=v('nf2-desc'), obs=v('nf2-obs');

    if(tomador.length<3) return erro('Escreva o nome ou a razão social do tomador.','nf2-tomador');
    if(!validaDoc(doc)) return erro('CPF ou CNPJ inválido. Confira os números.','nf2-doc');
    if(num(valor)<=0) return erro('Informe o valor da nota (exemplo: 2.500,00).','nf2-valor');
    if(!validaEmail(email)) return erro('Informe um e-mail válido para o envio da nota.','nf2-email');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dt)) return erro('Escolha a data desejada para a emissão.','nf2-dtdes');
    if(end.length<8) return erro('Informe o endereço do tomador.','nf2-end');
    if(desc.length<5) return erro('Descreva o serviço ou o produto da nota.','nf2-desc');

    var fi=el('nf2-file'), arquivo='', arquivoData='';
    if(fi && fi.files && fi.files[0]){
      arquivo=fi.files[0].name;
      try{ arquivoData=await lerArquivoBase64(fi.files[0]); }
      catch(e){ return erro(e.message||'Não consegui ler o anexo.'); }
    }
    enviandoPed=true;
    var bt=el('nf2-enviar'); if(bt){ bt.disabled=true; bt.textContent='⏳ Enviando...'; }
    try{
      await dbAdd(COL,{
        cliente:cli, tipo:'Pedido', origem:'cliente', status:ST_NOVO,
        tomador:tomador, docTomador:soNum(doc), emailTomador:email, enderecoTomador:end,
        valor:num(valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
        dataDesejada:dt, descricao:desc, obs:obs,
        numero:'', data:hoje(), arquivo:arquivo, arquivoData:arquivoData,
        resposta:'', pedidoId:'', notaId:''
      });
      ['nf2-tomador','nf2-doc','nf2-valor','nf2-email','nf2-dtdes','nf2-end','nf2-desc','nf2-obs'].forEach(function(i){ setV(i,''); });
      if(fi) fi.value='';
      aviso('\u{1F9FE} Pedido enviado! A Aparat já foi avisada e você acompanha o andamento aqui.');
      await listarCliente();
    }catch(e){
      if((e.code||'').indexOf('permission')>-1 || /insufficient|permission/i.test(e.message||''))
        erro('O escritório precisa liberar a regra de "notas" no Firebase.');
      else erro('Erro ao enviar: '+(e.code||e.message||''));
    }
    enviandoPed=false;
    if(bt){ bt.disabled=false; bt.innerHTML='\u{1F9FE} Enviar pedido para a Aparat'; }
  }

  var meusPedidos=[];
  function repetir(){
    var x=meusPedidos.filter(ehPedido)[0]; if(!x) return;
    trocarAba(true);
    setV('nf2-tomador', x.tomador||''); setV('nf2-doc', x.docTomador?fmtDoc(x.docTomador):'');
    setV('nf2-valor', x.valor||''); setV('nf2-email', x.emailTomador||'');
    setV('nf2-end', x.enderecoTomador||''); setV('nf2-desc', x.descricao||'');
    setV('nf2-obs', x.obs||'');
    var h=new Date(); h.setDate(h.getDate()+2);
    setV('nf2-dtdes', h.toISOString().slice(0,10));
    aviso('\u{1F501} Dados do último pedido carregados. Confira o valor e a descrição antes de enviar.','info');
    try{ el('nf2-valor').focus(); }catch(e){}
  }

  function linhaTempo(st){
    st=String(st||ST_NOVO);
    var atual = (st===ST_OK) ? 2 : (st===ST_EMIS ? 1 : 0);
    var h='<div class="lin">';
    h+='<span class="nf2-et done">✔ Pedido enviado</span>';
    PASSOS.forEach(function(p,i){
      var cls = (i<atual) ? 'done' : (i===atual ? 'on' : '');
      var txt = (i===0?'Aparat recebeu':(i===1?'Em emissão':'Emitida ✔'));
      h+='<span class="nf2-sep">›</span><span class="nf2-et '+cls+'">'+txt+'</span>';
    });
    h+='</div>';
    if(st===ST_RESP) h+='<div class="lin"><span class="nf2-et on">\u{1F4AC} A Aparat respondeu — veja abaixo</span></div>';
    return h;
  }

  var ultimoCli='';
  async function listarCliente(){
    var cli=nomeCli(); if(!cli) return;
    if(!blocoCliente()) return;
    var alvo=el('nf2-meus'); if(!alvo) return;
    var d=db(); if(!d) return;
    var itens=[];
    try{
      var s=await d.collection(COL).where('cliente','==',cli).get();
      s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; itens.push(o); });
    }catch(e){ return; }
    itens.sort(function(a,b){ return ms(b.criadoEm)-ms(a.criadoEm); });
    meusPedidos=itens;
    ultimoCli=cli;

    /* tomadores frequentes */
    var dl=el('nf2-tomadores');
    if(dl){
      var nomes=[];
      itens.filter(ehPedido).forEach(function(x){ if(x.tomador && nomes.indexOf(x.tomador)<0) nomes.push(x.tomador); });
      dl.innerHTML=nomes.slice(0,12).map(function(n){ return '<option value="'+esc(n)+'"></option>'; }).join('');
    }
    var bt=el('nf2-repetir'); if(bt) bt.style.display=itens.filter(ehPedido).length?'inline-block':'none';

    var peds=itens.filter(ehPedido);
    if(!peds.length){
      alvo.innerHTML='<div style="font-size:13px;color:var(--cinza);padding:6px 0">'
        +'\u{1F4ED} Você ainda não pediu nenhuma nota por aqui. Preencha o formulário acima e a Aparat recebe na hora.</div>';
      badgeTile(itens);
      return;
    }
    alvo.innerHTML='<div style="font-size:15px;font-weight:800;margin:14px 0 8px">\u{1F4CB} Meus pedidos de nota</div>'
      +peds.map(function(x){
        var st=String(x.status||ST_NOVO);
        return '<div class="nf2-ped">'
          +'<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">'
            +'<b style="font-size:15px">'+esc(x.tomador||'Tomador')+'</b>'
            +'<span style="font-size:15px;font-weight:800">'+esc(moeda(num(x.valor)))+'</span>'
          +'</div>'
          +'<div style="font-size:12px;color:var(--cinza);margin-top:3px">'+esc(x.descricao||'')+'</div>'
          +'<div style="font-size:12px;color:var(--cinza);margin-top:3px">Pedido em '+esc(x.data||'')
            +(x.dataDesejada?(' · para '+esc(dataBr(x.dataDesejada))):'')+'</div>'
          +linhaTempo(st)
          +(x.resposta?('<div style="margin-top:9px;background:rgba(180,83,9,.10);border:1px solid rgba(180,83,9,.35);border-radius:10px;padding:9px 11px;font-size:13px">'
              +'<b>\u{1F4AC} Aparat respondeu:</b> '+esc(x.resposta)+'</div>'):'')
        +'</div>';
      }).join('');
    badgeTile(itens);
  }

  /* bolinha vermelha do quadradinho "Enviar Nota" no app do cliente */
  function badgeTile(itens){
    try{
      var cli=nomeCli(); if(!cli) return;
      var n=itens.filter(function(x){ return String(x.origem||'')!=='cliente'; }).length
          + itens.filter(function(x){ return ehPedido(x) && x.resposta; }).length
          + itens.filter(function(x){ return ehPedido(x) && String(x.status||'')===ST_OK; }).length;
      var chave='apSeen2_'+cli+'_tile_nota';
      var sec=el('sec-notas');
      var aberta=sec && sec.classList.contains('ap-alvo');
      if(aberta) localStorage.setItem(chave, String(n));
      var visto=parseInt(localStorage.getItem(chave)||'0',10)||0;
      var d=document.querySelector('.ap-tile[data-k="nota"] .dt');
      if(d) d.style.display=(n>visto)?'block':'none';
      var t=document.querySelector('.ap-tile[data-k="nota"] .lb');
      if(t && t.textContent!=='Nota Fiscal') t.textContent='Nota Fiscal';
    }catch(e){}
  }

  /* ================================================================
     RELOGIO
     ================================================================ */
  var ocupado=false, voltas=0;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css();
      var painel=el('view-painel');
      if(painel && painel.classList.contains('active') && ehAdmin()){
        hookEnviar(); hookTabela();
        var pg=el('pp-notas');
        if(pg && pg.classList.contains('active')) await atualizarPainel();
      }
      var vc=el('view-cliente');
      if(vc && vc.querySelector('.cli-grid') && nomeCli()){
        if(!el('nf2-cli') || nomeCli()!==ultimoCli || voltas%4===0) await listarCliente();
      }
    }catch(e){}
    ocupado=false;
  }
  [1500,3500,7000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,6000);
})();

/* APARAT v56 - CONTROLE DE OBRIGACOES DO CNPJ
   Fase 1: trilha de abertura (13 itens) + perfil fiscal do cliente
   Fase 2: grade mensal cliente x obrigacao com farois e cobranca
   Fase 3: fechamento da folha em 8 etapas
   Fase 4: obrigacoes anuais + validade de certificado e alvara
   Colecoes NOVAS: aberturas, perfilFiscal, obrigCnpj, folhaMes
   (a colecao antiga "obrigacoes" NAO e tocada - continua sendo a das guias) */
;(function(){
  if(window.__APARAT_OBRIG_CNPJ__) return; window.__APARAT_OBRIG_CNPJ__=1;

  var C_AB='aberturas', C_PF='perfilFiscal', C_OB='obrigCnpj', C_FO='folhaMes';
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var MABREV=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var INICIO_PADRAO='2026-07';

  /* ---------------- trilha de abertura ---------------- */
  var TRILHA=[
    {id:'contrato', t:'Contrato Social / CCMEI',              d:'Documento de constituição arquivado na Junta Comercial, ou o Certificado da Condição de MEI'},
    {id:'cnpj',     t:'CNPJ deferido + Cartão CNPJ',           d:'Comprovante de inscrição e de situação cadastral salvo em PDF'},
    {id:'regime',   t:'Enquadramento tributário',              d:'Opção pelo Simples Nacional, definição do Anexo e do Fator R. Janela curta: contada da inscrição municipal/estadual e limitada a 180 dias da abertura do CNPJ', dias:30, critico:1},
    {id:'ie',       t:'Inscrição Estadual (SEFAZ-SP)',         d:'Só para quem tem ICMS: comércio, indústria e transporte intermunicipal', se:'temIE'},
    {id:'im',       t:'Inscrição Municipal — CCM de Franca',   d:'Obrigatória para prestador de serviço e para quem tem estabelecimento na cidade', se:'temIM'},
    {id:'alvara',   t:'Alvará de funcionamento e licenças',    d:'Prefeitura, Vigilância Sanitária e Corpo de Bombeiros conforme o CNAE'},
    {id:'cert',     t:'Certificado digital e-CNPJ (A1)',       d:'Cadastrar a validade no perfil fiscal para o painel avisar a renovação'},
    {id:'ecac',     t:'Acesso ao e-CAC + procuração eletrônica', d:'Procuração eletrônica para a APARAT acessar o e-CAC do cliente'},
    {id:'dte',      t:'DTE-SP — domicílio eletrônico',         d:'Credenciamento no Domicílio Eletrônico do Contribuinte de São Paulo', se:'temIE'},
    {id:'nota',     t:'Habilitação para emitir nota',          d:'NFS-e pelo Emissor Nacional ou pela Prefeitura de Franca, e NF-e quando houver Inscrição Estadual'},
    {id:'banco',    t:'Conta bancária PJ e chave Pix',         d:'Necessária para o controle da aba Extratos Bancários'},
    {id:'esocial',  t:'Cadastro no eSocial e FGTS Digital',    d:'Só se a empresa vai ter empregado ou pró-labore', se:'temEmpregado'},
    {id:'aparat',   t:'Contrato APARAT + acesso ao app',       d:'Honorários acertados, contrato assinado e login do cliente criado'}
  ];

  /* ---------------- obrigacoes mensais ----------------
     dia    = dia base do vencimento no mes seguinte a competencia
     antec  = 1 quando o vencimento ANTECIPA para o dia util anterior (caso do FGTS Digital);
              sem antec, prorroga para o dia util seguinte                                     */
  var OBRS=[
    {s:'DAS',   n:'DAS Simples',    dia:20, se:function(p){ return p.regime==='Simples'; }, ajuda:'PGDAS-D apurado e guia paga até o dia 20 do mês seguinte'},
    {s:'SIMEI', n:'DAS-SIMEI',      dia:20, se:function(p){ return p.regime==='MEI'; },     ajuda:'Guia mensal do MEI, dia 20 do mês seguinte'},
    {s:'ESOC',  n:'eSocial folha',  dia:15, se:function(p){ return !!p.temEmpregado; },     ajuda:'Eventos S-1200/S-1210 até o dia 15 do mês seguinte'},
    {s:'DCTF',  n:'DCTFWeb',        dia:15, se:function(p){ return !!p.temEmpregado; },     ajuda:'Transmissão até o dia 15 do mês seguinte'},
    {s:'FGTS',  n:'FGTS Digital',   dia:20, antec:1, se:function(p){ return !!p.temEmpregado; }, ajuda:'Guia do FGTS até o dia 20; em dia não útil o vencimento ANTECIPA (Lei 8.036/1990, art. 17)'},
    {s:'REINF', n:'EFD-Reinf',      dia:15, se:function(p){ return !!p.temReinf; },         ajuda:'Só para quem retém ou é retido na fonte'},
    {s:'DEST',  n:'DeSTDA',         dia:28, se:function(p){ return !!p.temIE && !!p.temST && p.regime!=='MEI'; }, ajuda:'ME/EPP com IE que teve ICMS-ST, DIFAL ou antecipação. O MEI é dispensado (Ajuste SINIEF 12/2015)'},
    {s:'ISS',   n:'ISS / NFS-e',    dia:10, se:function(p){ return !!p.temIM; },            ajuda:'Conforme o calendário da Prefeitura de Franca — confira o dia no perfil fiscal'},
    {s:'EXT',   n:'Extrato',        dia:10, leitura:'extratos', se:function(p){ return true; }, ajuda:'Espelho da aba Extratos Bancários (somente leitura)'}
  ];

  /* ---------------- etapas da folha ---------------- */
  var ETAPAS=[
    {t:'Variáveis',    d:'Faltas, horas extras, adiantamento e atestados recebidos do cliente'},
    {t:'Cálculo',      d:'Folha lançada no Domínio'},
    {t:'Conferência',  d:'Comparação com o mês anterior — variação acima de 15% pede justificativa'},
    {t:'Holerite',     d:'Recibo gerado e enviado ao cliente'},
    {t:'eSocial',      d:'S-1200/S-1210 transmitidos até o dia 15'},
    {t:'DCTFWeb',      d:'Declaração transmitida até o dia 15'},
    {t:'Guias',        d:'FGTS Digital e DARF gerados e enviados até o dia 20'},
    {t:'Arquivo',      d:'Recibos assinados guardados na pasta do cliente'}
  ];

  /* ---------------- obrigacoes anuais ---------------- */
  var ANUAIS=[
    {s:'DEFIS',  n:'DEFIS',        mes:3,  dia:31, se:function(p){ return p.regime==='Simples'; }, ajuda:'Declaração de Informações Socioeconômicas e Fiscais, até 31 de março'},
    {s:'DASN',   n:'DASN-SIMEI',   mes:5,  dia:31, se:function(p){ return p.regime==='MEI'; },    ajuda:'Declaração anual do MEI, até 31 de maio'},
    {s:'ECD',    n:'ECD',          mes:5,  dia:31, ult:1, se:function(p){ return !!p.temECD; },  ajuda:'Escrituração Contábil Digital, último dia útil de maio'},
    {s:'ECF',    n:'ECF',          mes:7,  dia:31, ult:1, se:function(p){ return !!p.temECF; },  ajuda:'Escrituração Contábil Fiscal, último dia útil de julho'},
    {s:'INFO',   n:'Informe de rendimentos', mes:2, dia:28, ult:1, se:function(p){ return !!p.temEmpregado; }, ajuda:'Comprovante de rendimentos entregue ao empregado até o último dia útil de fevereiro'}
  ];

  var cAb={}, cPf={}, cOb={}, cFo={}, cExt={}, nomes=[], carregando=false;
  var subAba='ab', anoSel=new Date().getFullYear(), compSel=null, folhaComp=null;

  /* ================= utilitarios ================= */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} try{ alert(m); }catch(e){} }
  function limpo(n){ return String(n||'x').replace(/[^\w.\-]+/g,'_').slice(0,80); }
  function pad(n){ return (n<10?'0':'')+n; }
  function comp(ano,mi){ return ano+'-'+pad(mi+1); }
  function hojeISO(){ var h=new Date(); return h.getFullYear()+'-'+pad(h.getMonth()+1)+'-'+pad(h.getDate()); }
  function dataBR(d){ if(!d) return '—'; var p=String(d).split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : String(d); }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function ehAdmin(){
    try{
      var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL;
      return true;
    }catch(e){ return false; }
  }

  /* ---- feriados nacionais + dia util ---- */
  function pascoa(a){
    var A=a%19, B=Math.floor(a/100), C=a%100, D=Math.floor(B/4), E=B%4;
    var F=Math.floor((B+8)/25), G=Math.floor((B-F+1)/3), H=(19*A+B-D-G+15)%30;
    var I=Math.floor(C/4), K=C%4, L=(32+2*E+2*I-H-K)%7, M=Math.floor((A+11*H+22*L)/451);
    var mes=Math.floor((H+L-7*M+114)/31), dia=((H+L-7*M+114)%31)+1;
    return new Date(a, mes-1, dia);
  }
  var _fer={};
  function feriados(a){
    if(_fer[a]) return _fer[a];
    var set={};
    ['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'].forEach(function(d){ set[a+'-'+d]=1; });
    var p=pascoa(a);
    [-48,-47,-2,60].forEach(function(off){   /* carnaval (seg e ter), sexta santa, corpus christi */
      var d=new Date(p.getFullYear(), p.getMonth(), p.getDate()+off);
      set[d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())]=1;
    });
    _fer[a]=set; return set;
  }
  function ehUtil(d){
    var w=d.getDay(); if(w===0||w===6) return false;
    var k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
    return !feriados(d.getFullYear())[k];
  }
  function ajusta(d, antecipa){
    var g=0;
    while(!ehUtil(d) && g<20){ d=new Date(d.getFullYear(), d.getMonth(), d.getDate()+(antecipa?-1:1)); g++; }
    return d;
  }
  function fimDoDia(d){ d.setHours(23,59,59,999); return d; }
  /* vencimento de uma obrigacao mensal para a competencia ano/mi */
  function vencMes(o, ano, mi){
    var d=new Date(ano, mi+1, o.dia);
    if(d.getMonth()!==((mi+1)%12)) d=new Date(ano, mi+2, 0);   /* dia 31 em mes de 30 */
    return fimDoDia(ajusta(d, !!o.antec));
  }
  /* ult:1 = ultimo dia UTIL do mes, entao o ajuste anda para tras */
  function vencAno(o, ano){
    var d = o.ult ? new Date(ano, o.mes, 0) : new Date(ano, o.mes-1, o.dia);
    return fimDoDia(ajusta(d, !!o.ult));
  }
  function txtData(d){ return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(); }

  /* ---- perfil fiscal com valor padrao ---- */
  function perfil(cli){
    var p=cPf[limpo(cli)];
    if(p) return p;
    var reg='Simples';
    try{
      if(window.__AP_CLI_REGIME__ && window.__AP_CLI_REGIME__[cli]) reg=window.__AP_CLI_REGIME__[cli];
    }catch(e){}
    return {cliente:cli, regime:reg, anexo:'', temIE:false, temIM:true, temEmpregado:false,
            temST:false, temReinf:false, temECD:false, temECF:false, nEmp:0,
            inicio:INICIO_PADRAO, certValidade:'', alvaraValidade:'', obs:'', _novo:1};
  }
  function cabe(o, p){ try{ return !!o.se(p); }catch(e){ return false; } }

  /* ---- situacao de uma celula da grade mensal ---- */
  function sitMes(cli, o, ano, mi){
    var p=perfil(cli);
    var cp=comp(ano,mi);
    if(!cabe(o,p)) return 'na';
    if(cp < (p.inicio||INICIO_PADRAO)) return 'na';
    if(o.leitura==='extratos'){
      var e=cExt[limpo(cli)+'__'+cp];
      if(e) return e.semMovimento ? 'ok' : 'ok';
    }else{
      var r=cOb[limpo(cli)+'__'+cp+'__'+o.s];
      if(r && r.status) return r.status;
    }
    var h=new Date();
    if(new Date(ano, mi+1, 1) > h) return 'na';       /* competencia ainda nao fechou */
    return (h > vencMes(o,ano,mi)) ? 'at' : 'pd';
  }
  function sitAno(cli, o, ano){
    var p=perfil(cli);
    if(!cabe(o,p)) return 'na';
    var r=cOb[limpo(cli)+'__'+ano+'__'+o.s];
    if(r && r.status) return r.status;
    var h=new Date();
    if(new Date(ano,0,1) > h) return 'na';
    return (h > vencAno(o,ano)) ? 'at' : 'pd';
  }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-obc-css')) return;
    var s=document.createElement('style'); s.id='ap-obc-css';
    s.textContent=
       '#pp-obcnpj .ob-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}'
      +'#pp-obcnpj .ob-tab{font-size:13px;font-weight:700;padding:9px 15px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer}'
      +'#pp-obcnpj .ob-tab.on{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-obcnpj .ob-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:12px}'
      +'#pp-obcnpj .ob-kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:11px 12px}'
      +'#pp-obcnpj .ob-kpi b{display:block;font-size:22px;line-height:1.1}'
      +'#pp-obcnpj .ob-kpi span{font-size:11px;color:var(--cinza)}'
      +'#pp-obcnpj .ob-rol{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--card)}'
      +'#pp-obcnpj table{border-collapse:separate;border-spacing:0;width:100%;min-width:820px;font-size:12px}'
      +'#pp-obcnpj th,#pp-obcnpj td{padding:8px 5px;text-align:center;border-bottom:1px solid var(--border)}'
      +'#pp-obcnpj thead th{font-size:11px;color:var(--cinza);font-weight:700;line-height:1.35}'
      +'#pp-obcnpj thead th small{display:block;font-weight:400;font-size:10px;opacity:.85}'
      +'#pp-obcnpj td.cli,#pp-obcnpj th.cli{text-align:left;padding-left:12px;min-width:180px;font-weight:700}'
      +'#pp-obcnpj tbody tr:last-child td{border-bottom:0}'
      +'#pp-obcnpj .fa{width:28px;height:28px;border-radius:8px;border:1px solid transparent;font-size:13px;cursor:pointer;line-height:1}'
      +'#pp-obcnpj .fa.ok{background:rgba(14,159,110,.16);color:#0e9f6e;border-color:rgba(14,159,110,.3)}'
      +'#pp-obcnpj .fa.an{background:rgba(51,85,255,.16);color:var(--azul-light);border-color:rgba(51,85,255,.3)}'
      +'#pp-obcnpj .fa.pd{background:rgba(180,83,9,.16);color:#b45309;border-color:rgba(180,83,9,.3)}'
      +'#pp-obcnpj .fa.at{background:rgba(217,45,32,.16);color:#d92d20;border-color:rgba(217,45,32,.35)}'
      +'#pp-obcnpj .fa.na{background:rgba(130,145,170,.13);color:var(--cinza)}'
      +'#pp-obcnpj .ob-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--cinza);margin-top:10px;align-items:center}'
      +'#pp-obcnpj .ob-bt{font-size:12px;font-weight:700;padding:8px 13px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer;text-decoration:none;display:inline-block;margin:0 6px 6px 0}'
      +'#pp-obcnpj .ob-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-obcnpj .ob-emp{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer}'
      +'#pp-obcnpj .ob-emp:hover{border-color:var(--azul)}'
      +'#pp-obcnpj .ob-emp b{font-size:14px}'
      +'#pp-obcnpj .ob-emp .sub{font-size:11.5px;color:var(--cinza);margin-top:2px}'
      +'#pp-obcnpj .ob-bar{height:9px;border-radius:999px;background:rgba(130,145,170,.2);overflow:hidden;margin-top:10px}'
      +'#pp-obcnpj .ob-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(92deg,#0B2A8A,#3355FF,#2E9BF6)}'
      +'#pp-obcnpj .ob-pct{font-size:11px;color:var(--cinza);margin-top:5px}'
      +'#pp-obcnpj .ob-chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:700;margin-left:7px;vertical-align:middle}'
      +'#pp-obcnpj .ob-chip.ok{background:rgba(14,159,110,.16);color:#0e9f6e}'
      +'#pp-obcnpj .ob-chip.an{background:rgba(51,85,255,.16);color:var(--azul-light)}'
      +'#pp-obcnpj .ob-chip.pd{background:rgba(180,83,9,.16);color:#b45309}'
      +'#pp-obcnpj .ob-chip.at{background:rgba(217,45,32,.16);color:#d92d20}'
      +'#pp-obcnpj .ob-nota{background:rgba(51,85,255,.1);border:1px solid rgba(51,85,255,.28);border-radius:12px;padding:11px 13px;font-size:12px;line-height:1.55;margin-top:11px}'
      +'#ap-obc-modal{position:fixed;inset:0;background:rgba(6,12,26,.66);display:flex;align-items:center;justify-content:center;z-index:99999;padding:14px}'
      +'#ap-obc-modal .cx{position:relative;background:var(--card);border:1px solid var(--border);border-radius:18px;max-width:600px;width:100%;max-height:88vh;overflow:auto;padding:20px 18px 18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
      +'#ap-obc-modal .x{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:transparent;color:var(--cinza);font-size:14px;cursor:pointer;line-height:1}'
      +'#ap-obc-modal h3{margin:0 6px 4px 0;font-size:16px;padding-right:34px}'
      +'#ap-obc-modal .h4{font-size:11.5px;color:var(--cinza);margin-bottom:11px}'
      +'#ap-obc-modal .ln{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dotted var(--border);font-size:13px}'
      +'#ap-obc-modal .ln:last-of-type{border-bottom:0}'
      +'#ap-obc-modal .ln span{color:var(--cinza)}'
      +'#ap-obc-modal .bts{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}'
      +'#ap-obc-modal .bt{font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer;text-decoration:none;display:inline-block}'
      +'#ap-obc-modal .bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#ap-obc-modal .bt.vm{border-color:rgba(217,45,32,.55);color:#d92d20}'
      +'#ap-obc-modal .it{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px dotted var(--border)}'
      +'#ap-obc-modal .it:last-child{border-bottom:0}'
      +'#ap-obc-modal .it input[type=checkbox]{margin-top:3px;width:18px;height:18px;flex:0 0 auto;cursor:pointer;accent-color:#3355FF}'
      +'#ap-obc-modal .it .tt{font-size:13px;font-weight:700;display:block}'
      +'#ap-obc-modal .it .ds{font-size:11px;color:var(--cinza);display:block;margin-top:2px;line-height:1.45}'
      +'#ap-obc-modal .it.feito .tt{opacity:.6;text-decoration:line-through}'
      +'#ap-obc-modal .cx input[type=text],#ap-obc-modal .cx input[type=date],#ap-obc-modal .cx input[type=number],#ap-obc-modal .cx select,#ap-obc-modal .cx textarea{width:100%;margin-top:4px;font-size:13px;padding:8px 10px;border-radius:9px;border:1px solid var(--border);background:transparent;color:inherit}'
      +'#ap-obc-modal .cx label{font-size:11px;color:var(--cinza);display:block;margin-top:9px}'
      +'#ap-obc-modal .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
      +'#ap-obc-modal .sw{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:6px 0}'
      +'#ap-obc-modal .sw input{width:18px;height:18px;accent-color:#3355FF;cursor:pointer}'
      +'@media(max-width:640px){#pp-obcnpj .ob-kpis{grid-template-columns:1fr 1fr}#ap-obc-modal .g2{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  /* ================= carga ================= */
  async function carregarNomes(){
    var d=db(); if(!d) return;
    var set={}, reg={};
    try{
      var s=await d.collection('clientes').get();
      s.forEach(function(x){
        var o=x.data()||{}, n=String(o.nome||'').trim();
        var ativo=!o.status || !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(o.status));
        if(n && n!=='Todos os Clientes' && ativo){ set[n]=1; if(o.regime) reg[n]=String(o.regime); }
      });
    }catch(e){}
    try{
      var u=await d.collection('usuarios').get();
      u.forEach(function(x){ var o=x.data()||{}, n=String(o.clienteNome||'').trim(); if(n && n!=='Todos os Clientes') set[n]=1; });
    }catch(e){}
    var l=Object.keys(set).sort(function(a,b){ return a.localeCompare(b); });
    if(l.length) nomes=l;
    try{
      window.__AP_CLI_REGIME__={};
      Object.keys(reg).forEach(function(n){
        var r=reg[n];
        window.__AP_CLI_REGIME__[n] = /mei|simei/i.test(r) ? 'MEI'
                                    : /presum/i.test(r) ? 'Presumido'
                                    : /real/i.test(r) ? 'Real' : 'Simples';
      });
    }catch(e){}
  }
  async function carregar(){
    if(carregando) return; var d=db(); if(!d) return;
    carregando=true;
    var alvos=[[C_AB,cAb],[C_PF,cPf],[C_OB,cOb],[C_FO,cFo],['extratos',cExt]];
    for(var i=0;i<alvos.length;i++){
      try{
        var s=await d.collection(alvos[i][0]).get();
        var novo={};
        s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; novo[x.id]=o; });
        var alvo=alvos[i][1];
        Object.keys(alvo).forEach(function(k){ delete alvo[k]; });
        Object.keys(novo).forEach(function(k){ alvo[k]=novo[k]; });
      }catch(e){}
    }
    carregando=false;
  }
  async function salvar(col,id,dados){
    var d=db(); if(!d) throw new Error('Sem conexão com o banco');
    dados.atualizadoEm=new Date().toISOString();
    await d.collection(col).doc(id).set(dados,{merge:true});
    var alvo = col===C_AB?cAb : col===C_PF?cPf : col===C_OB?cOb : col===C_FO?cFo : null;
    if(alvo){ var at=alvo[id]||{}; Object.keys(dados).forEach(function(k){ at[k]=dados[k]; }); at.id=id; alvo[id]=at; }
  }
  async function apagar(col,id){
    var d=db(); if(!d) return;
    await d.collection(col).doc(id).delete();
    var alvo = col===C_AB?cAb : col===C_PF?cPf : col===C_OB?cOb : col===C_FO?cFo : null;
    if(alvo) delete alvo[id];
  }

  /* ================= menu e pagina ================= */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-obc')) return;
    var ref=el('ap-nav-ext');
    if(!ref){
      [].slice.call(nv.querySelectorAll('.nav-item')).forEach(function(it){
        if(/Doc\. Solicitados|Documentos/.test(it.textContent||'')) ref=ref||it;
      });
    }
    var it=document.createElement('div');
    it.className='nav-item'; it.id='ap-nav-obc';
    it.innerHTML='<span class="ni">\u{1F5C2}\u{FE0F}</span>Obrigações CNPJ<span class="nav-dot" id="dot-obc"></span>';
    it.onclick=function(){ abrir(it); };
    if(ref && ref.parentNode) ref.parentNode.insertBefore(it, ref.nextSibling); else nv.appendChild(it);
  }

  async function abrir(item){
    try{ if(typeof pPage==='function'){ pPage('obcnpj', item); } }catch(e){}
    var p=el('pp-obcnpj'); if(p) p.classList.add('active');
    await carregarNomes(); await carregar(); render();
  }

  function pagina(){
    if(el('pp-obcnpj')) return;
    var base=el('pp-extratos')||el('pp-pedidos')||el('pp-docs'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-obcnpj';
    p.innerHTML=
       '<div class="sec">\u{1F5C2}\u{FE0F} Controle de obrigações do CNPJ</div>'
      +'<div class="ob-tabs">'
        +'<button class="ob-tab on" data-ob="ab">\u{1F680} Abertura</button>'
        +'<button class="ob-tab" data-ob="me">\u{1F4C5} Mensais</button>'
        +'<button class="ob-tab" data-ob="fo">\u{1F465} Folha</button>'
        +'<button class="ob-tab" data-ob="an">\u{1F5D3}\u{FE0F} Anuais</button>'
        +'<button class="ob-tab" data-ob="pf">\u{2699}\u{FE0F} Perfil fiscal</button>'
      +'</div>'
      +'<div id="ob-corpo"><div style="padding:16px;color:var(--cinza)">Carregando...</div></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
    [].slice.call(p.querySelectorAll('.ob-tab')).forEach(function(b){
      b.onclick=function(){
        subAba=b.getAttribute('data-ob');
        [].slice.call(p.querySelectorAll('.ob-tab')).forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        render();
      };
    });
    try{ if(window.ABA_NOMES) window.ABA_NOMES.obcnpj='Obrigações do CNPJ'; }catch(e){}
  }

  function render(){
    var c=el('ob-corpo'); if(!c) return;
    if(!nomes.length){ c.innerHTML='<div style="padding:16px;color:var(--cinza)">Nenhum cliente ativo encontrado. Cadastre os clientes na aba Clientes.</div>'; return; }
    if(subAba==='ab') telaAbertura(c);
    else if(subAba==='me') telaMensais(c);
    else if(subAba==='fo') telaFolha(c);
    else if(subAba==='an') telaAnuais(c);
    else telaPerfil(c);
    pintarPonto();
  }

  function pintarPonto(){
    var d=el('dot-obc'); if(!d) return;
    var ca=compAtual(), n=0;
    nomes.forEach(function(cli){
      OBRS.forEach(function(o){ if(sitMes(cli,o,ca.ano,ca.mi)==='at') n++; });
    });
    d.style.display = n>0 ? 'inline-block' : 'none';
  }
  function compAtual(){
    var h=new Date(), ano=h.getFullYear(), mi=h.getMonth()-1;
    if(mi<0){ mi=11; ano--; }
    return {ano:ano, mi:mi};
  }

  /* ================= janela ================= */
  function fecharModal(){ var m=el('ap-obc-modal'); if(m) m.remove(); }
  function modal(html){
    fecharModal();
    var m=document.createElement('div'); m.id='ap-obc-modal';
    m.innerHTML='<div class="cx"><button class="x" id="obc-mx">✖</button>'+html+'</div>';
    m.onclick=function(ev){ if(ev.target===m) fecharModal(); };
    document.body.appendChild(m);
    var x=el('obc-mx'); if(x) x.onclick=fecharModal;
    return m;
  }

  /* ================= 1. TRILHA DE ABERTURA ================= */
  function itensDe(cli){
    var p=perfil(cli);
    return TRILHA.filter(function(t){ return !t.se || !!p[t.se]; });
  }
  function progresso(cli){
    var reg=cAb[limpo(cli)]||{}, it=reg.itens||{}, lista=itensDe(cli), f=0;
    lista.forEach(function(t){ if(it[t.id] && it[t.id].ok) f++; });
    return {feitos:f, total:lista.length, pct: lista.length? Math.round(f/lista.length*100) : 0};
  }
  function telaAbertura(c){
    var emAndamento=[], concluidas=[];
    nomes.forEach(function(cli){
      var reg=cAb[limpo(cli)];
      if(!reg) return;                       /* so aparece quem foi colocado na trilha */
      var pr=progresso(cli);
      (pr.pct===100 ? concluidas : emAndamento).push({cli:cli, pr:pr, reg:reg});
    });
    var pend=0; emAndamento.forEach(function(x){ pend+=(x.pr.total-x.pr.feitos); });
    var criticos=0;
    emAndamento.forEach(function(x){
      var it=(x.reg.itens||{});
      if(!(it.regime&&it.regime.ok) && x.reg.dataAbertura){
        var lim=new Date(x.reg.dataAbertura); lim.setDate(lim.getDate()+180);
        if(new Date()>lim) criticos++;
      }
    });
    var h=
       '<div class="ob-kpis">'
        +'<div class="ob-kpi"><b style="color:var(--azul-light)">'+emAndamento.length+'</b><span>CNPJ em abertura</span></div>'
        +'<div class="ob-kpi"><b style="color:#b45309">'+pend+'</b><span>Itens pendentes</span></div>'
        +'<div class="ob-kpi"><b style="color:#d92d20">'+criticos+'</b><span>Prazo do Simples estourado</span></div>'
        +'<div class="ob-kpi"><b style="color:#0e9f6e">'+concluidas.length+'</b><span>Trilhas concluídas</span></div>'
      +'</div>'
      +'<div style="margin-bottom:11px"><button class="ob-bt az" id="ob-nova">\u{2795} Colocar uma empresa na trilha</button>'
      +'<button class="ob-bt" id="ob-rec">\u{1F504} Atualizar</button></div>';
    if(!emAndamento.length && !concluidas.length){
      h+='<div class="ob-nota">Nenhuma empresa na trilha ainda. Clique em <b>Colocar uma empresa na trilha</b> para acompanhar tudo o que precisa ser feito depois que o CNPJ é aberto: enquadramento, Inscrição Estadual, Inscrição Municipal, alvará, certificado digital e mais.</div>';
    }
    emAndamento.concat(concluidas).forEach(function(x){
      var chip = x.pr.pct===100 ? '<span class="ob-chip ok">Concluída</span>'
               : x.pr.pct>=60  ? '<span class="ob-chip an">Em andamento</span>'
               : '<span class="ob-chip pd">Começando</span>';
      h+='<div class="ob-emp" data-ob-ab="'+esc(x.cli)+'"><b>'+esc(x.cli)+'</b>'+chip
        +'<div class="sub">'+esc(x.reg.cnpj||'CNPJ não informado')+' · aberta em '+dataBR(x.reg.dataAbertura)+'</div>'
        +'<div class="ob-bar"><i style="width:'+x.pr.pct+'%"></i></div>'
        +'<div class="ob-pct">'+x.pr.feitos+' de '+x.pr.total+' itens · '+x.pr.pct+'%</div></div>';
    });
    h+='<div class="ob-nota"><b>Prazo que evita multa:</b> a opção pelo Simples Nacional de empresa recém-aberta tem janela curta — contada a partir da inscrição municipal/estadual e limitada a 180 dias da abertura do CNPJ. O item <b>Enquadramento tributário</b> é o que o painel vigia.</div>';
    c.innerHTML=h;
    var bn=el('ob-nova'); if(bn) bn.onclick=novaTrilha;
    var br=el('ob-rec'); if(br) br.onclick=async function(){ await carregarNomes(); await carregar(); render(); };
    [].slice.call(c.querySelectorAll('[data-ob-ab]')).forEach(function(b){
      b.onclick=function(){ fichaAbertura(b.getAttribute('data-ob-ab')); };
    });
  }

  function novaTrilha(){
    var op='<option value="">— escolha o cliente —</option>';
    nomes.forEach(function(n){ if(!cAb[limpo(n)]) op+='<option value="'+esc(n)+'">'+esc(n)+'</option>'; });
    modal('<h3>\u{1F680} Colocar empresa na trilha</h3><div class="h4">A trilha acompanha os 13 itens que vêm depois da abertura do CNPJ.</div>'
      +'<label>Cliente</label><select id="obn-cli">'+op+'</select>'
      +'<div class="g2"><div><label>CNPJ</label><input type="text" id="obn-cnpj" placeholder="00.000.000/0001-00"></div>'
      +'<div><label>Data de abertura do CNPJ</label><input type="date" id="obn-data" value="'+hojeISO()+'"></div></div>'
      +'<div class="bts"><button class="bt az" id="obn-ok">Criar trilha</button><button class="bt" id="obn-x">Cancelar</button></div>');
    el('obn-x').onclick=fecharModal;
    el('obn-ok').onclick=async function(){
      var cli=el('obn-cli').value;
      if(!cli){ aviso('Escolha o cliente.','erro'); return; }
      this.disabled=true;
      try{
        await salvar(C_AB, limpo(cli), {cliente:cli, cnpj:el('obn-cnpj').value.trim(), dataAbertura:el('obn-data').value, itens:{}, criadoEm:new Date().toISOString()});
        fecharModal(); render(); aviso('Trilha criada para '+cli+'.','ok');
      }catch(e){ aviso('Não foi possível criar: '+(e.message||e),'erro'); this.disabled=false; }
    };
  }

  function fichaAbertura(cli){
    var reg=cAb[limpo(cli)]||{itens:{}}, it=reg.itens||{}, lista=itensDe(cli), pr=progresso(cli);
    var h='<h3>'+esc(cli)+'</h3><div class="h4">'+esc(reg.cnpj||'CNPJ não informado')+' · aberta em '+dataBR(reg.dataAbertura)+' · '+pr.feitos+' de '+pr.total+' itens</div>';
    lista.forEach(function(t,i){
      var f=it[t.id]&&it[t.id].ok;
      h+='<label class="it'+(f?' feito':'')+'"><input type="checkbox" data-ob-it="'+t.id+'"'+(f?' checked':'')+'>'
        +'<span style="flex:1"><span class="tt">'+(i+1)+'. '+esc(t.t)+(t.critico?' <span class="ob-chip at">prazo curto</span>':'')+'</span>'
        +'<span class="ds">'+esc(t.d)+(f&&it[t.id].data?' <b style="color:#0e9f6e">— feito em '+dataBR(it[t.id].data)+'</b>':'')+'</span></span></label>';
    });
    h+='<label>Observação da trilha</label><textarea id="obf-obs" rows="2">'+esc(reg.obs||'')+'</textarea>'
      +'<div class="bts"><button class="bt az" id="obf-salvar">\u{1F4BE} Salvar observação</button>'
      +'<button class="bt" id="obf-perfil">\u{2699}\u{FE0F} Perfil fiscal</button>'
      +'<button class="bt" id="obf-cobrar">\u{1F514} Cobrar o cliente</button>'
      +'<button class="bt vm" id="obf-excluir">\u{1F5D1}\u{FE0F} Tirar da trilha</button></div>';
    modal(h);
    [].slice.call(document.querySelectorAll('[data-ob-it]')).forEach(function(cb){
      cb.onchange=async function(){
        var id=cb.getAttribute('data-ob-it'), novo=JSON.parse(JSON.stringify(reg.itens||{}));
        novo[id]={ok:cb.checked, data:cb.checked?hojeISO():''};
        cb.disabled=true;
        try{ await salvar(C_AB, limpo(cli), {cliente:cli, itens:novo}); reg.itens=novo; fichaAbertura(cli); render(); }
        catch(e){ aviso('Não foi possível salvar: '+(e.message||e),'erro'); cb.disabled=false; cb.checked=!cb.checked; }
      };
    });
    el('obf-salvar').onclick=async function(){
      this.disabled=true;
      try{ await salvar(C_AB, limpo(cli), {cliente:cli, obs:el('obf-obs').value}); aviso('Observação salva.','ok'); fecharModal(); }
      catch(e){ aviso('Não foi possível salvar: '+(e.message||e),'erro'); this.disabled=false; }
    };
    el('obf-perfil').onclick=function(){ fichaPerfil(cli); };
    el('obf-cobrar').onclick=function(){ cobrar(cli, 'Ainda faltam documentos para concluir a abertura da sua empresa. Vamos resolver?'); };
    el('obf-excluir').onclick=async function(){
      if(!confirm('Tirar '+cli+' da trilha de abertura? O histórico dos itens será apagado.')) return;
      this.disabled=true;
      try{ await apagar(C_AB, limpo(cli)); fecharModal(); render(); aviso('Empresa retirada da trilha.','ok'); }
      catch(e){ aviso('Não foi possível excluir: '+(e.message||e),'erro'); this.disabled=false; }
    };
  }

  /* ================= 2. GRADE MENSAL ================= */
  function telaMensais(c){
    var ca=compAtual();
    if(!compSel) compSel=comp(ca.ano, ca.mi);
    var pa=compSel.split('-'), ano=Number(pa[0]), mi=Number(pa[1])-1;
    var cont={ok:0,an:0,pd:0,at:0};
    nomes.forEach(function(cli){ OBRS.forEach(function(o){ var s=sitMes(cli,o,ano,mi); if(cont[s]!=null) cont[s]++; }); });
    var opc='', hj=new Date();
    for(var q=0;q<24;q++){
      var dq=new Date(hj.getFullYear(), hj.getMonth()-q, 1);
      var cq=comp(dq.getFullYear(), dq.getMonth());
      opc+='<option value="'+cq+'"'+(cq===compSel?' selected':'')+'>'+MESES[dq.getMonth()]+'/'+dq.getFullYear()+'</option>';
    }
    var h=
       '<div class="ob-kpis">'
        +'<div class="ob-kpi"><b style="color:#0e9f6e">'+cont.ok+'</b><span>Entregues</span></div>'
        +'<div class="ob-kpi"><b style="color:#d92d20">'+cont.at+'</b><span>Vencidas</span></div>'
        +'<div class="ob-kpi"><b style="color:#b45309">'+cont.pd+'</b><span>Pendentes no prazo</span></div>'
        +'<div class="ob-kpi"><b style="color:var(--azul-light)">'+cont.an+'</b><span>Em andamento</span></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:9px">'
        +'<div class="fg" style="margin:0;min-width:170px"><select id="ob-comp">'+opc+'</select></div>'
        +'<button class="ob-bt" id="ob-rec2">\u{1F504} Atualizar</button>'
        +'<button class="ob-bt az" id="ob-cob">\u{1F514} Cobrar os atrasados</button>'
      +'</div>'
      +'<div class="ob-rol"><table><thead><tr><th class="cli">Cliente</th>';
    OBRS.forEach(function(o){ h+='<th>'+esc(o.n)+'<small>vence '+txtData(vencMes(o,ano,mi))+'</small></th>'; });
    h+='</tr></thead><tbody>';
    var ico={ok:'✓',an:'●',pd:'•',at:'!',na:'–'};
    nomes.forEach(function(cli){
      h+='<tr><td class="cli">'+esc(cli)+'</td>';
      OBRS.forEach(function(o,oi){
        var s=sitMes(cli,o,ano,mi);
        h+='<td><button class="fa '+s+'" data-ob-c="'+esc(cli)+'" data-ob-o="'+oi+'" title="'+esc(cli+' — '+o.n)+'">'+ico[s]+'</button></td>';
      });
      h+='</tr>';
    });
    h+='</tbody></table></div>'
      +'<div class="ob-leg"><span><b style="color:#0e9f6e">✓</b> Entregue</span><span><b style="color:var(--azul-light)">●</b> Em andamento</span>'
      +'<span><b style="color:#b45309">•</b> Pendente no prazo</span><span><b style="color:#d92d20">!</b> Vencida</span>'
      +'<span><b style="color:var(--cinza)">–</b> Não se aplica</span>'
      +'<span style="margin-left:auto">Quem vê cada coluna é decidido no <b>Perfil fiscal</b></span></div>'
      +'<div class="ob-nota">Vencimento em sábado, domingo ou feriado nacional já sai ajustado: o <b>FGTS Digital antecipa</b> para o dia útil anterior (Lei 8.036/1990, art. 17) e as demais <b>prorrogam</b> para o dia útil seguinte.</div>';
    c.innerHTML=h;
    el('ob-comp').onchange=function(){ compSel=this.value; render(); };
    el('ob-rec2').onclick=async function(){ await carregarNomes(); await carregar(); render(); };
    el('ob-cob').onclick=function(){ cobrarAtrasados(ano,mi); };
    [].slice.call(c.querySelectorAll('[data-ob-c]')).forEach(function(b){
      b.onclick=function(){ fichaMes(b.getAttribute('data-ob-c'), Number(b.getAttribute('data-ob-o')), ano, mi); };
    });
  }

  var NOME_ST={ok:'Entregue', an:'Em andamento', pd:'Pendente — dentro do prazo', at:'VENCIDA', na:'Não se aplica'};
  function fichaMes(cli, oi, ano, mi){
    var o=OBRS[oi], cp=comp(ano,mi), id=limpo(cli)+'__'+cp+'__'+o.s;
    var r=cOb[id]||{}, s=sitMes(cli,o,ano,mi);
    if(o.leitura==='extratos'){
      var e=cExt[limpo(cli)+'__'+cp];
      modal('<h3>'+esc(o.n)+' — '+esc(cli)+'</h3><div class="h4">Competência '+MESES[mi]+'/'+ano+'</div>'
        +'<div class="ln"><span>Situação</span><b>'+(e?(e.semMovimento?'Sem movimento declarado':'Extrato entregue'):'Não entregue')+'</b></div>'
        +'<div class="ln"><span>Entregue em</span><b>'+(e&&e.data?esc(e.data):'—')+'</b></div>'
        +'<div class="ob-nota">Esta coluna é um espelho da aba <b>🏦 Extratos</b>. Para anexar, trocar ou cobrar o extrato, use aquela aba — é lá que o arquivo fica guardado.</div>');
      return;
    }
    var h='<h3>'+esc(o.n)+' — '+esc(cli)+'</h3><div class="h4">Competência '+MESES[mi]+'/'+ano+' · vence '+txtData(vencMes(o,ano,mi))+'</div>'
      +'<div class="ln"><span>Situação</span><b class="ob-chip '+s+'">'+NOME_ST[s]+'</b></div>'
      +'<div class="ln"><span>Entregue em</span><b>'+dataBR(r.entregaEm)+'</b></div>'
      +'<div class="ln"><span>Responsável</span><b>'+esc(r.responsavel||'—')+'</b></div>'
      +'<div class="g2"><div><label>Protocolo / recibo</label><input type="text" id="obm-prot" value="'+esc(r.protocolo||'')+'"></div>'
      +'<div><label>Valor da guia (R$)</label><input type="number" step="0.01" id="obm-val" value="'+(r.valor!=null?esc(r.valor):'')+'"></div></div>'
      +'<label>Onde foi feita</label><select id="obm-org">'
      +['','Domínio Web','e-CAC','PGDAS-D','Prefeitura de Franca','SEFAZ-SP','FGTS Digital','Manual'].map(function(x){
          return '<option value="'+esc(x)+'"'+((r.origem||'')===x?' selected':'')+'>'+(x||'— escolha —')+'</option>'; }).join('')
      +'</select>'
      +'<label>Observação</label><textarea id="obm-obs" rows="2">'+esc(r.obs||'')+'</textarea>'
      +'<div class="bts"><button class="bt az" id="obm-ok">\u{2705} Marcar como entregue</button>'
      +'<button class="bt" id="obm-an">\u{1F535} Em andamento</button>'
      +'<button class="bt" id="obm-na">\u{26AA} Não se aplica</button>'
      +'<button class="bt" id="obm-cob">\u{1F514} Cobrar</button>'
      +(r.status?'<button class="bt vm" id="obm-lim">\u{21A9}\u{FE0F} Limpar</button>':'')+'</div>'
      +'<div class="ob-nota">'+esc(o.ajuda)+'</div>';
    modal(h);
    function base(st){
      return {cliente:cli, competencia:cp, sigla:o.s, status:st,
              protocolo:el('obm-prot').value.trim(), valor:Number(el('obm-val').value)||0,
              origem:el('obm-org').value, obs:el('obm-obs').value,
              responsavel:'Daniel', entregaEm: st==='ok' ? (cOb[id]&&cOb[id].entregaEm ? cOb[id].entregaEm : hojeISO()) : ''};
    }
    async function grava(st){
      try{ await salvar(C_OB, id, base(st)); fecharModal(); render(); aviso('Situação atualizada.','ok'); }
      catch(e){ aviso('Não foi possível salvar: '+(e.message||e),'erro'); }
    }
    el('obm-ok').onclick=function(){ this.disabled=true; grava('ok'); };
    el('obm-an').onclick=function(){ this.disabled=true; grava('an'); };
    el('obm-na').onclick=function(){ this.disabled=true; grava('na'); };
    el('obm-cob').onclick=function(){ cobrar(cli, 'Precisamos de informação para fechar a obrigação '+o.n+' da competência '+MESES[mi]+'/'+ano+'.'); };
    var bl=el('obm-lim');
    if(bl) bl.onclick=async function(){
      this.disabled=true;
      try{ await apagar(C_OB, id); fecharModal(); render(); aviso('Situação limpa.','ok'); }
      catch(e){ aviso('Não foi possível limpar: '+(e.message||e),'erro'); this.disabled=false; }
    };
  }

  /* ================= 3. FOLHA DE PAGAMENTO ================= */
  function comFolha(){ return nomes.filter(function(n){ return !!perfil(n).temEmpregado; }); }
  function sitEtapa(cli, ei, ano, mi){
    var r=cFo[limpo(cli)+'__'+comp(ano,mi)]||{}, et=r.etapas||{};
    if(et[ei] && et[ei].ok) return 'ok';
    var h=new Date();
    if(new Date(ano, mi+1, 1) > h) return 'pd';
    var lim;
    if(ei<=3) lim=ajusta(new Date(ano, mi+1, 10), false);
    else if(ei<=5) lim=ajusta(new Date(ano, mi+1, 15), false);
    else if(ei===6) lim=ajusta(new Date(ano, mi+1, 20), true);
    else lim=ajusta(new Date(ano, mi+1, 28), false);
    lim.setHours(23,59,59,999);
    return h>lim ? 'at' : 'pd';
  }
  function telaFolha(c){
    var ca=compAtual();
    if(!folhaComp) folhaComp=comp(ca.ano, ca.mi);
    var pa=folhaComp.split('-'), ano=Number(pa[0]), mi=Number(pa[1])-1;
    var lista=comFolha();
    if(!lista.length){
      c.innerHTML='<div class="ob-nota">Nenhum cliente marcado com <b>tem empregado</b> no Perfil fiscal. Abra a aba <b>⚙️ Perfil fiscal</b>, ligue a chave "Tem empregado" de quem tem folha e esta tela se monta sozinha.</div>';
      return;
    }
    var aguard=0, fora=0, bruto=0, emp=0;
    lista.forEach(function(cli){
      var r=cFo[limpo(cli)+'__'+folhaComp]||{};
      bruto+=Number(r.totalBruto)||0; emp+=Number(perfil(cli).nEmp)||0;
      if(sitEtapa(cli,0,ano,mi)!=='ok') aguard++;
      for(var i=0;i<8;i++){ if(sitEtapa(cli,i,ano,mi)==='at'){ fora++; break; } }
    });
    var opc='', hj=new Date();
    for(var q=0;q<24;q++){
      var dq=new Date(hj.getFullYear(), hj.getMonth()-q, 1);
      var cq=comp(dq.getFullYear(), dq.getMonth());
      opc+='<option value="'+cq+'"'+(cq===folhaComp?' selected':'')+'>'+MESES[dq.getMonth()]+'/'+dq.getFullYear()+'</option>';
    }
    var h=
       '<div class="ob-kpis">'
        +'<div class="ob-kpi"><b style="color:var(--azul-light)">'+lista.length+'</b><span>Empresas com folha</span></div>'
        +'<div class="ob-kpi"><b style="color:#b45309">'+aguard+'</b><span>Aguardando variáveis</span></div>'
        +'<div class="ob-kpi"><b style="color:#d92d20">'+fora+'</b><span>Fora do prazo</span></div>'
        +'<div class="ob-kpi"><b style="color:#0e9f6e">'+moeda(bruto)+'</b><span>Folha do mês ('+emp+' empregados)</span></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:9px">'
        +'<div class="fg" style="margin:0;min-width:170px"><select id="ob-fcomp">'+opc+'</select></div>'
        +'<button class="ob-bt" id="ob-frec">\u{1F504} Atualizar</button></div>'
      +'<div class="ob-rol"><table><thead><tr><th class="cli">Cliente</th><th>Empregados</th>';
    ETAPAS.forEach(function(e,i){ h+='<th>'+(i+1)+'. '+esc(e.t)+'</th>'; });
    h+='</tr></thead><tbody>';
    var ico={ok:'✓',an:'●',pd:'•',at:'!',na:'–'};
    lista.forEach(function(cli){
      h+='<tr><td class="cli">'+esc(cli)+'</td><td>'+(perfil(cli).nEmp||0)+'</td>';
      for(var i=0;i<8;i++){
        var s=sitEtapa(cli,i,ano,mi);
        h+='<td><button class="fa '+s+'" data-ob-fc="'+esc(cli)+'" data-ob-fe="'+i+'" title="'+esc(cli+' — '+ETAPAS[i].t)+'">'+ico[s]+'</button></td>';
      }
      h+='</tr>';
    });
    h+='</tbody></table></div>'
      +'<div class="ob-leg"><span><b style="color:#0e9f6e">✓</b> Concluída</span><span><b style="color:#b45309">•</b> Aguardando</span>'
      +'<span><b style="color:#d92d20">!</b> Fora do prazo</span></div>'
      +alertasFolha();
    c.innerHTML=h;
    el('ob-fcomp').onchange=function(){ folhaComp=this.value; render(); };
    el('ob-frec').onclick=async function(){ await carregar(); render(); };
    [].slice.call(c.querySelectorAll('[data-ob-fc]')).forEach(function(b){
      b.onclick=function(){ fichaFolha(b.getAttribute('data-ob-fc'), Number(b.getAttribute('data-ob-fe')), ano, mi); };
    });
  }

  function alertasFolha(){
    var h=new Date(), m=h.getMonth()+1, av=[];
    if(m===11) av.push('<b>13º salário — 1ª parcela</b> até 30 de novembro.');
    if(m===12) av.push('<b>13º salário — 2ª parcela</b> até 20 de dezembro.');
    if(m===10) av.push('Comece a organizar o <b>13º salário</b>: a 1ª parcela vence em 30 de novembro.');
    var ven=[];
    nomes.forEach(function(cli){
      var p=perfil(cli);
      [['certValidade','Certificado digital'],['alvaraValidade','Alvará']].forEach(function(par){
        var v=p[par[0]]; if(!v) return;
        var d=new Date(v+'T12:00:00'); if(isNaN(d)) return;
        var dias=Math.round((d-h)/86400000);
        if(dias<=60) ven.push(esc(cli)+' — <b>'+par[1]+'</b> '+(dias<0?'venceu em ':'vence em ')+dataBR(v));
      });
    });
    if(!av.length && !ven.length) return '';
    return '<div class="ob-nota"><b>\u{1F514} Avisos</b><br>'+av.concat(ven).join('<br>')+'</div>';
  }

  function fichaFolha(cli, ei, ano, mi){
    var cp=comp(ano,mi), id=limpo(cli)+'__'+cp, r=cFo[id]||{}, et=r.etapas||{};
    var p=perfil(cli), s=sitEtapa(cli,ei,ano,mi);
    var ant=cFo[limpo(cli)+'__'+comp(mi===0?ano-1:ano, mi===0?11:mi-1)]||{};
    var vAnt=Number(ant.totalBruto)||0, vAtu=Number(r.totalBruto)||0;
    var varia = vAnt>0 ? ((vAtu-vAnt)/vAnt*100) : 0;
    var alerta = (ei===2 && vAnt>0 && Math.abs(varia)>15 && !r.justificativa);
    var h='<h3>'+esc(cli)+'</h3><div class="h4">Folha de '+MESES[mi]+'/'+ano+' · etapa '+(ei+1)+' de 8 — '+esc(ETAPAS[ei].t)+'</div>'
      +'<div class="ln"><span>Situação</span><b class="ob-chip '+s+'">'+(s==='ok'?'Concluída':s==='at'?'FORA DO PRAZO':'Aguardando')+'</b></div>'
      +'<div class="ln"><span>O que é</span><b style="font-weight:400;text-align:right;max-width:62%">'+esc(ETAPAS[ei].d)+'</b></div>'
      +'<div class="ln"><span>Empregados</span><b>'+(p.nEmp||0)+'</b></div>'
      +'<div class="g2"><div><label>Total bruto da folha (R$)</label><input type="number" step="0.01" id="obf-bru" value="'+(r.totalBruto!=null?esc(r.totalBruto):'')+'"></div>'
      +'<div><label>Mês anterior</label><input type="text" value="'+(vAnt?moeda(vAnt):'—')+'" disabled></div></div>'
      +(vAnt>0 ? '<div class="ln"><span>Variação x mês anterior</span><b style="color:'+(Math.abs(varia)>15?'#d92d20':'#0e9f6e')+'">'+(varia>0?'+':'')+varia.toFixed(1).replace('.',',')+'%</b></div>' : '')
      +(alerta ? '<label>Justificativa da variação (obrigatória acima de 15%)</label><textarea id="obf-just" rows="2">'+esc(r.justificativa||'')+'</textarea>' : '')
      +'<label>Observação</label><textarea id="obf-fobs" rows="2">'+esc(r.obs||'')+'</textarea>'
      +'<div class="bts"><button class="bt az" id="obf-ok">'+(et[ei]&&et[ei].ok?'\u{21A9}\u{FE0F} Reabrir etapa':'\u{2705} Concluir etapa')+'</button>'
      +'<button class="bt" id="obf-sv">\u{1F4BE} Só salvar</button>'
      +'<button class="bt" id="obf-var">\u{1F4AC} Pedir as variáveis</button>'
      +'<button class="bt" id="obf-wa">\u{1F4F2} WhatsApp</button></div>'
      +(alerta ? '<div class="ob-nota" style="background:rgba(217,45,32,.1);border-color:rgba(217,45,32,.3)"><b>Conferência travada:</b> a folha variou '+varia.toFixed(1).replace('.',',')+'% em relação ao mês anterior. Escreva a justificativa para concluir esta etapa.</div>' : '');
    modal(h);
    async function grava(concluir){
      var novo=JSON.parse(JSON.stringify(et));
      if(concluir) novo[ei]={ok: !(et[ei]&&et[ei].ok), data:hojeISO()};
      var dados={cliente:cli, competencia:cp, etapas:novo, totalBruto:Number(el('obf-bru').value)||0, obs:el('obf-fobs').value};
      var ju=el('obf-just'); if(ju) dados.justificativa=ju.value;
      if(concluir && alerta && (!ju || !ju.value.trim())){ aviso('Escreva a justificativa da variação para concluir.','erro'); return false; }
      try{ await salvar(C_FO, id, dados); fecharModal(); render(); aviso('Folha atualizada.','ok'); return true; }
      catch(e){ aviso('Não foi possível salvar: '+(e.message||e),'erro'); return false; }
    }
    el('obf-ok').onclick=async function(){ this.disabled=true; var r2=await grava(true); if(!r2) this.disabled=false; };
    el('obf-sv').onclick=async function(){ this.disabled=true; var r2=await grava(false); if(!r2) this.disabled=false; };
    el('obf-var').onclick=function(){ cobrar(cli, 'Precisamos das variáveis da folha de '+MESES[mi]+'/'+ano+': faltas, horas extras, adiantamentos e atestados.'); };
    el('obf-wa').onclick=function(){
      var t='Olá! Aqui é a APARAT Contabilidade. Precisamos das variáveis da folha de '+MESES[mi]+'/'+ano+' da '+cli+'.';
      window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank');
    };
  }

  /* ================= 4. ANUAIS ================= */
  function telaAnuais(c){
    var h='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:9px">'
      +'<div class="fg" style="margin:0;min-width:120px"><select id="ob-ano">';
    var hy=new Date().getFullYear();
    for(var a=hy;a>=hy-4;a--) h+='<option value="'+a+'"'+(a===anoSel?' selected':'')+'>'+a+'</option>';
    h+='</select></div><button class="ob-bt" id="ob-arec">\u{1F504} Atualizar</button></div>'
      +'<div class="ob-rol"><table><thead><tr><th class="cli">Cliente</th>';
    ANUAIS.forEach(function(o){ h+='<th>'+esc(o.n)+'<small>vence '+txtData(vencAno(o,anoSel))+'</small></th>'; });
    h+='<th>Certificado</th><th>Alvará</th></tr></thead><tbody>';
    var ico={ok:'✓',an:'●',pd:'•',at:'!',na:'–'};
    nomes.forEach(function(cli){
      var p=perfil(cli);
      h+='<tr><td class="cli">'+esc(cli)+'</td>';
      ANUAIS.forEach(function(o,oi){
        var s=sitAno(cli,o,anoSel);
        h+='<td><button class="fa '+s+'" data-ob-ac="'+esc(cli)+'" data-ob-ao="'+oi+'" title="'+esc(cli+' — '+o.n)+'">'+ico[s]+'</button></td>';
      });
      h+='<td>'+val(p.certValidade)+'</td><td>'+val(p.alvaraValidade)+'</td></tr>';
    });
    h+='</tbody></table></div>'
      +'<div class="ob-nota">DEFIS até 31 de março · DASN-SIMEI até 31 de maio · ECD no último dia útil de maio · ECF no último dia útil de julho. A validade do certificado digital e do alvará vem do <b>Perfil fiscal</b> e vira aviso quando faltam 60 dias.</div>';
    c.innerHTML=h;
    el('ob-ano').onchange=function(){ anoSel=Number(this.value)||anoSel; render(); };
    el('ob-arec').onclick=async function(){ await carregar(); render(); };
    [].slice.call(c.querySelectorAll('[data-ob-ac]')).forEach(function(b){
      b.onclick=function(){ fichaAno(b.getAttribute('data-ob-ac'), Number(b.getAttribute('data-ob-ao'))); };
    });
  }
  function val(v){
    if(!v) return '<span style="color:var(--cinza)">—</span>';
    var d=new Date(v+'T12:00:00'); if(isNaN(d)) return esc(v);
    var dias=Math.round((d-new Date())/86400000);
    var cor = dias<0 ? '#d92d20' : dias<=60 ? '#b45309' : '#0e9f6e';
    return '<b style="color:'+cor+'">'+dataBR(v)+'</b>';
  }
  function fichaAno(cli, oi){
    var o=ANUAIS[oi], id=limpo(cli)+'__'+anoSel+'__'+o.s, r=cOb[id]||{}, s=sitAno(cli,o,anoSel);
    modal('<h3>'+esc(o.n)+' — '+esc(cli)+'</h3><div class="h4">Ano '+anoSel+' · vence '+txtData(vencAno(o,anoSel))+'</div>'
      +'<div class="ln"><span>Situação</span><b class="ob-chip '+s+'">'+NOME_ST[s]+'</b></div>'
      +'<div class="ln"><span>Entregue em</span><b>'+dataBR(r.entregaEm)+'</b></div>'
      +'<label>Protocolo / recibo</label><input type="text" id="oba-prot" value="'+esc(r.protocolo||'')+'">'
      +'<label>Observação</label><textarea id="oba-obs" rows="2">'+esc(r.obs||'')+'</textarea>'
      +'<div class="bts"><button class="bt az" id="oba-ok">\u{2705} Marcar como entregue</button>'
      +'<button class="bt" id="oba-na">\u{26AA} Não se aplica</button>'
      +(r.status?'<button class="bt vm" id="oba-lim">\u{21A9}\u{FE0F} Limpar</button>':'')+'</div>'
      +'<div class="ob-nota">'+esc(o.ajuda)+'</div>');
    async function grava(st){
      try{
        await salvar(C_OB, id, {cliente:cli, competencia:String(anoSel), sigla:o.s, status:st,
          protocolo:el('oba-prot').value.trim(), obs:el('oba-obs').value, responsavel:'Daniel',
          entregaEm: st==='ok' ? (r.entregaEm||hojeISO()) : ''});
        fecharModal(); render(); aviso('Situação atualizada.','ok');
      }catch(e){ aviso('Não foi possível salvar: '+(e.message||e),'erro'); }
    }
    el('oba-ok').onclick=function(){ this.disabled=true; grava('ok'); };
    el('oba-na').onclick=function(){ this.disabled=true; grava('na'); };
    var bl=el('oba-lim');
    if(bl) bl.onclick=async function(){
      this.disabled=true;
      try{ await apagar(C_OB, id); fecharModal(); render(); }catch(e){ aviso('Não foi possível limpar.','erro'); this.disabled=false; }
    };
  }

  /* ================= 5. PERFIL FISCAL ================= */
  function telaPerfil(c){
    var h='<div class="ob-nota" style="margin-top:0">O perfil fiscal é o cérebro desta aba: é ele que decide <b>quais colunas acendem</b> para cada cliente. Quem não tem Inscrição Estadual nunca vê DeSTDA; quem não tem empregado não aparece na folha.</div>'
      +'<div style="margin:11px 0"><button class="ob-bt" id="ob-prec">\u{1F504} Atualizar</button></div>'
      +'<div class="ob-rol"><table><thead><tr><th class="cli">Cliente</th><th>Regime</th><th>Anexo</th><th>IE</th><th>IM</th>'
      +'<th>Empregado</th><th>ICMS-ST</th><th>Reinf</th><th>Controle desde</th><th></th></tr></thead><tbody>';
    nomes.forEach(function(cli){
      var p=perfil(cli);
      function sn(v){ return v ? '<b style="color:#0e9f6e">sim</b>' : '<span style="color:var(--cinza)">não</span>'; }
      h+='<tr><td class="cli">'+esc(cli)+(p._novo?' <span class="ob-chip pd">padrão</span>':'')+'</td>'
        +'<td>'+esc(p.regime)+'</td><td>'+esc(p.anexo||'—')+'</td>'
        +'<td>'+sn(p.temIE)+'</td><td>'+sn(p.temIM)+'</td><td>'+sn(p.temEmpregado)+(p.temEmpregado?' ('+(p.nEmp||0)+')':'')+'</td>'
        +'<td>'+sn(p.temST)+'</td><td>'+sn(p.temReinf)+'</td><td>'+esc(p.inicio||INICIO_PADRAO)+'</td>'
        +'<td><button class="ob-bt" data-ob-pf="'+esc(cli)+'" style="margin:0">\u{270F}\u{FE0F} Editar</button></td></tr>';
    });
    h+='</tbody></table></div>';
    c.innerHTML=h;
    el('ob-prec').onclick=async function(){ await carregarNomes(); await carregar(); render(); };
    [].slice.call(c.querySelectorAll('[data-ob-pf]')).forEach(function(b){
      b.onclick=function(){ fichaPerfil(b.getAttribute('data-ob-pf')); };
    });
  }

  function fichaPerfil(cli){
    var p=perfil(cli);
    function op(lista, atual){
      return lista.map(function(x){ return '<option value="'+esc(x)+'"'+(String(atual||'')===x?' selected':'')+'>'+(x||'—')+'</option>'; }).join('');
    }
    var meses='';
    var hj=new Date();
    for(var q=0;q<36;q++){
      var dq=new Date(hj.getFullYear(), hj.getMonth()-q, 1);
      var cq=comp(dq.getFullYear(), dq.getMonth());
      meses+='<option value="'+cq+'"'+(cq===(p.inicio||INICIO_PADRAO)?' selected':'')+'>'+MESES[dq.getMonth()]+'/'+dq.getFullYear()+'</option>';
    }
    modal('<h3>\u{2699}\u{FE0F} Perfil fiscal</h3><div class="h4">'+esc(cli)+'</div>'
      +'<div class="g2"><div><label>Regime</label><select id="obp-reg">'+op(['MEI','Simples','Presumido','Real'], p.regime)+'</select></div>'
      +'<div><label>Anexo do Simples</label><select id="obp-anx">'+op(['','I','II','III','IV','V'], p.anexo)+'</select></div></div>'
      +'<div class="sw"><input type="checkbox" id="obp-ie"'+(p.temIE?' checked':'')+'><label style="margin:0">Tem Inscrição Estadual (SEFAZ-SP)</label></div>'
      +'<div class="sw"><input type="checkbox" id="obp-im"'+(p.temIM?' checked':'')+'><label style="margin:0">Tem Inscrição Municipal (CCM Franca)</label></div>'
      +'<div class="sw"><input type="checkbox" id="obp-st"'+(p.temST?' checked':'')+'><label style="margin:0">Tem ICMS-ST, DIFAL ou antecipação (liga a DeSTDA)</label></div>'
      +'<div class="sw"><input type="checkbox" id="obp-rf"'+(p.temReinf?' checked':'')+'><label style="margin:0">Retém ou é retido na fonte (liga a EFD-Reinf)</label></div>'
      +'<div class="sw"><input type="checkbox" id="obp-em"'+(p.temEmpregado?' checked':'')+'><label style="margin:0">Tem empregado ou pró-labore (liga folha, eSocial, DCTFWeb e FGTS)</label></div>'
      +'<div class="sw"><input type="checkbox" id="obp-ecd"'+(p.temECD?' checked':'')+'><label style="margin:0">Entrega ECD</label></div>'
      +'<div class="sw"><input type="checkbox" id="obp-ecf"'+(p.temECF?' checked':'')+'><label style="margin:0">Entrega ECF</label></div>'
      +'<div class="g2"><div><label>Quantos empregados</label><input type="number" id="obp-nemp" min="0" value="'+(Number(p.nEmp)||0)+'"></div>'
      +'<div><label>Controle começa em</label><select id="obp-ini">'+meses+'</select></div></div>'
      +'<div class="g2"><div><label>Validade do certificado digital</label><input type="date" id="obp-cert" value="'+esc(p.certValidade||'')+'"></div>'
      +'<div><label>Validade do alvará</label><input type="date" id="obp-alv" value="'+esc(p.alvaraValidade||'')+'"></div></div>'
      +'<label>Observação</label><textarea id="obp-obs" rows="2">'+esc(p.obs||'')+'</textarea>'
      +'<div class="bts"><button class="bt az" id="obp-ok">\u{1F4BE} Salvar perfil</button><button class="bt" id="obp-x">Cancelar</button></div>');
    el('obp-x').onclick=fecharModal;
    el('obp-ok').onclick=async function(){
      this.disabled=true;
      try{
        await salvar(C_PF, limpo(cli), {
          cliente:cli, regime:el('obp-reg').value, anexo:el('obp-anx').value,
          temIE:el('obp-ie').checked, temIM:el('obp-im').checked, temST:el('obp-st').checked,
          temReinf:el('obp-rf').checked, temEmpregado:el('obp-em').checked,
          temECD:el('obp-ecd').checked, temECF:el('obp-ecf').checked,
          nEmp:Number(el('obp-nemp').value)||0, inicio:el('obp-ini').value,
          certValidade:el('obp-cert').value, alvaraValidade:el('obp-alv').value, obs:el('obp-obs').value
        });
        fecharModal(); render(); aviso('Perfil fiscal salvo.','ok');
      }catch(e){ aviso('Não foi possível salvar: '+(e.message||e),'erro'); this.disabled=false; }
    };
  }

  /* ================= cobranca ================= */
  async function cobrar(cli, msg){
    var d=db(); if(!d){ aviso('Sem conexão com o banco.','erro'); return; }
    try{
      await d.collection('urgencias').add({
        cliente:cli, dest:cli, titulo:'Pendência da sua empresa', msg:msg,
        data:new Date().toLocaleDateString('pt-BR'), ts:Date.now(),
        criadoEm: (firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp) ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
        origem:'obrigCnpj'
      });
      aviso('Aviso enviado para '+cli+'.','ok');
    }catch(e){ aviso('Não foi possível enviar: '+(e.message||e),'erro'); }
  }
  async function cobrarAtrasados(ano,mi){
    var lista=[];
    nomes.forEach(function(cli){
      var faltas=[];
      OBRS.forEach(function(o){ if(!o.leitura && sitMes(cli,o,ano,mi)==='at') faltas.push(o.n); });
      if(faltas.length) lista.push({cli:cli, faltas:faltas});
    });
    if(!lista.length){ aviso('Nenhuma obrigação vencida nesta competência. Tudo em dia!','ok'); return; }
    if(!confirm('Enviar aviso para '+lista.length+' cliente(s) com obrigação vencida?')) return;
    for(var i=0;i<lista.length;i++){
      await cobrar(lista[i].cli, 'Está pendente na sua empresa: '+lista[i].faltas.join(', ')+' (competência '+MESES[mi]+'/'+ano+'). Fale com a APARAT para regularizar.');
    }
  }

  /* ================= relogio ================= */
  var ocupado=false, voltas=0;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css();
      var painel=el('view-painel');
      if(painel && painel.classList.contains('active') && ehAdmin()){
        menu(); pagina();
        if(voltas===1 || voltas%12===0){
          await carregarNomes(); await carregar();
          if(el('pp-obcnpj') && el('pp-obcnpj').classList.contains('active')) render(); else pintarPonto();
        }
      }
    }catch(e){}
    ocupado=false;
  }
  [2000,4500,9000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,7000);

  /* exposto para teste */
  window.__OBC__={vencMes:vencMes, vencAno:vencAno, ajusta:ajusta, ehUtil:ehUtil, feriados:feriados,
                  pascoa:pascoa, sitMes:sitMes, perfil:perfil, OBRS:OBRS, TRILHA:TRILHA, ETAPAS:ETAPAS,
                  render:render, comp:comp};
})();

/* APARAT v57 - INICIO DO PAINEL EM QUADRADINHOS
   - pagina #pp-inicio: busca de cliente + faixa "o que fazer hoje" + quadradinhos
   - os quadradinhos sao montados LENDO o menu lateral, entao qualquer aba nova
     (inclusive as criadas por outros modulos) entra sozinha
   - o menu lateral CONTINUA existindo (decisao do Daniel em 20/08/2026) */
;(function(){
  if(window.__APARAT_HOME_ESC__) return; window.__APARAT_HOME_ESC__=1;

  var LEGENDAS={
    'docs':'o que eu envio ao cliente',
    'pedidos':'o que eu pedi e ele mandou',
    'recebidos':'o que o cliente mandou sozinho',
    'dados':'contrato, CNPJ, certidões'
  };
  var trocou=false, clientes=[], montando=false, ultimoMenu='';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function p2(n){ return ('0'+n).slice(-2); }
  function hojeISO(){ var d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function maisDias(n){ var d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function dataBR(v){ var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2]+'/'+m[1] : String(v||''); }
  function num(v){ v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(v.indexOf(',')>-1) v=v.replace(/\./g,'').replace(',','.'); return parseFloat(v)||0; }
  function money(n){ return 'R$ '+(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2}); }
  function limpo(n){ return String(n||'x').replace(/[^\w.\-]+/g,'_').slice(0,80); }
  function compAnterior(){
    var h=new Date(), a=h.getFullYear(), m=h.getMonth()-1;
    if(m<0){ m=11; a--; }
    return a+'-'+p2(m+1);
  }
  function ehAdmin(){
    try{
      var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL;
      return true;
    }catch(e){ return false; }
  }
  function saudacao(){
    var h=new Date().getHours();
    return h<12 ? 'Bom dia' : (h<18 ? 'Boa tarde' : 'Boa noite');
  }
  function dataLonga(){
    var D=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    var M=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var d=new Date();
    var s=D[d.getDay()]+', '+d.getDate()+' de '+M[d.getMonth()]+' de '+d.getFullYear();
    return s.charAt(0).toUpperCase()+s.slice(1);
  }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-home-css')) return;
    var s=document.createElement('style'); s.id='ap-home-css';
    s.textContent=
       '#pp-inicio .hm-saud{font-size:19px;font-weight:800;margin-bottom:2px}'
      +'#pp-inicio .hm-sub{font-size:12.5px;color:var(--cinza);margin-bottom:15px}'
      +'#pp-inicio .hm-busca{position:relative;margin-bottom:14px;max-width:430px}'
      +'#pp-inicio .hm-busca input{width:100%;font:inherit;font-size:14px;padding:12px 14px 12px 38px;border-radius:13px;border:1.5px solid var(--border);background:var(--card);color:inherit;outline:none}'
      +'#pp-inicio .hm-busca input:focus{border-color:var(--azul);box-shadow:0 0 0 3px rgba(51,85,255,.16)}'
      +'#pp-inicio .hm-lupa{position:absolute;left:13px;top:12px;font-size:15px;opacity:.6;pointer-events:none}'
      +'#pp-inicio .hm-res{position:absolute;top:53px;left:0;right:0;background:var(--card);border:1.5px solid var(--border);border-radius:13px;box-shadow:0 14px 34px rgba(0,0,0,.35);overflow:hidden;display:none;z-index:40}'
      +'#pp-inicio .hm-res.on{display:block}'
      +'#pp-inicio .hm-res div{padding:10px 14px;font-size:13px;cursor:pointer;border-bottom:1px dotted var(--border)}'
      +'#pp-inicio .hm-res div:last-child{border-bottom:0}'
      +'#pp-inicio .hm-res div:hover{background:rgba(51,85,255,.10)}'
      +'#pp-inicio .hm-res b{display:block;font-weight:700}'
      +'#pp-inicio .hm-res span{font-size:11.5px;color:var(--cinza)}'
      +'#pp-inicio .hm-hoje{background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:18px}'
      +'#pp-inicio .hm-hoje .tt{font-size:12.5px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}'
      +'#pp-inicio .hm-hoje .tt i{color:var(--cinza);font-weight:400;font-size:11.5px;margin-left:auto;font-style:normal}'
      +'#pp-inicio .hm-chips{display:flex;gap:9px;flex-wrap:wrap}'
      +'#pp-inicio .hm-chip{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid transparent;transition:.15s;background:transparent}'
      +'#pp-inicio .hm-chip:hover{transform:translateY(-2px)}'
      +'#pp-inicio .hm-chip b{font-size:17px;font-weight:800;line-height:1}'
      +'#pp-inicio .hm-chip.r{background:rgba(217,45,32,.13);border-color:rgba(217,45,32,.34);color:#ff6b60}'
      +'#pp-inicio .hm-chip.a{background:rgba(180,83,9,.15);border-color:rgba(180,83,9,.36);color:#e2a03f}'
      +'#pp-inicio .hm-chip.b{background:rgba(51,85,255,.13);border-color:rgba(51,85,255,.34);color:var(--azul-light)}'
      +'#pp-inicio .hm-chip.v{background:rgba(14,159,110,.13);border-color:rgba(14,159,110,.34);color:#0e9f6e}'
      +'body.ap-esc-claro #pp-inicio .hm-chip.r{color:#d92d20}'
      +'body.ap-esc-claro #pp-inicio .hm-chip.a{color:#b45309}'
      +'#pp-inicio .hm-gsec{font-size:10.5px;color:var(--cinza);text-transform:uppercase;letter-spacing:1.1px;font-weight:800;margin:18px 0 9px}'
      +'#pp-inicio .hm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:12px}'
      +'#pp-inicio .hm-tile{position:relative;aspect-ratio:1/1;max-width:190px;width:100%;justify-self:center;border-radius:19px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--card);border:1.5px solid var(--border);box-shadow:0 4px 14px rgba(0,0,0,.16);cursor:pointer;transition:.15s}'
      +'#pp-inicio .hm-tile:hover{transform:translateY(-3px);border-color:var(--azul);box-shadow:0 10px 26px rgba(51,85,255,.22)}'
      +'#pp-inicio .hm-tile .ic{width:46px;height:46px;border-radius:13px;background:rgba(51,85,255,.13);border:1px solid rgba(51,85,255,.28);display:flex;align-items:center;justify-content:center;font-size:26px}'
      +'#pp-inicio .hm-tile .lb{font-size:12.5px;font-weight:800;text-align:center;line-height:1.2;padding:0 6px}'
      +'#pp-inicio .hm-tile .s2{font-size:10px;color:var(--cinza);text-align:center;line-height:1.25;padding:0 8px;font-weight:400;margin-top:-3px}'
      +'#pp-inicio .hm-tile .dt{position:absolute;top:9px;right:9px;min-width:20px;height:20px;padding:0 5px;background:#ff2d40;color:#fff;font-size:11px;font-weight:800;border-radius:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(255,45,64,.6)}'
      +'#ap-hm-modal{position:fixed;inset:0;background:rgba(6,12,26,.66);display:flex;align-items:center;justify-content:center;z-index:99999;padding:14px}'
      +'#ap-hm-modal .cx{position:relative;background:var(--card);border:1px solid var(--border);border-radius:18px;max-width:520px;width:100%;max-height:88vh;overflow:auto;padding:20px 18px 18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
      +'#ap-hm-modal .x{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:transparent;color:var(--cinza);font-size:14px;cursor:pointer}'
      +'#ap-hm-modal h3{margin:0 34px 4px 0;font-size:17px}'
      +'#ap-hm-modal .h4{font-size:11.5px;color:var(--cinza);margin-bottom:12px}'
      +'#ap-hm-modal .ln{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dotted var(--border);font-size:13px}'
      +'#ap-hm-modal .ln:last-of-type{border-bottom:0}'
      +'#ap-hm-modal .ln span{color:var(--cinza)}'
      +'#ap-hm-modal .bts{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}'
      +'#ap-hm-modal .bt{font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;text-decoration:none;display:inline-block}'
      +'#ap-hm-modal .bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'@media(max-width:640px){#pp-inicio .hm-grid{grid-template-columns:repeat(2,1fr)}}';
    document.head.appendChild(s);
  }

  /* ================= pagina e menu ================= */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-inicio')) return;
    var it=document.createElement('div');
    it.className='nav-item'; it.id='ap-nav-inicio';
    it.innerHTML='<span class="ni">\u{1F3E0}</span>Início';
    it.onclick=function(){ abrir(it); };
    var pri=nv.querySelector('.nav-sec');
    if(pri) nv.insertBefore(it, pri.nextSibling); else nv.insertBefore(it, nv.firstChild);
  }

  function pagina(){
    if(el('pp-inicio')) return;
    var base=el('pp-dash'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-inicio';
    p.innerHTML=
       '<div class="hm-saud" id="hm-saud">Olá</div>'
      +'<div class="hm-sub" id="hm-sub"></div>'
      +'<div class="hm-busca">'
        +'<span class="hm-lupa">\u{1F50D}</span>'
        +'<input id="hm-q" placeholder="Buscar cliente por nome ou CNPJ..." autocomplete="off">'
        +'<div class="hm-res" id="hm-res"></div>'
      +'</div>'
      +'<div class="hm-hoje"><div class="tt">\u{1F4CC} O que fazer hoje <i>clique em qualquer um para ir direto</i></div>'
      +'<div class="hm-chips" id="hm-chips"><span style="font-size:12px;color:var(--cinza)">Carregando...</span></div></div>'
      +'<div id="hm-grids"></div>';
    base.parentNode.insertBefore(p, base);
    try{ if(window.ABA_NOMES) window.ABA_NOMES.inicio='Início'; }catch(e){}
    ligarBusca();
  }

  function abrir(item){
    try{ if(typeof pPage==='function'){ pPage('inicio', item); } }catch(e){}
    var p=el('pp-inicio'); if(p) p.classList.add('active');
    cabecalho(); tiles(true); faixa();
  }

  /* primeira carga: troca o Dashboard pelo Inicio uma vez so */
  function trocarInicial(){
    if(trocou) return;
    var pi=el('pp-inicio'), pd=el('pp-dash'), ni=el('ap-nav-inicio'); if(!pi||!pd||!ni) return;
    trocou=true;
    if(pd.classList.contains('active')){
      pd.classList.remove('active');
      pi.classList.add('active');
      var at=document.querySelector('#view-painel .sidebar .nav .nav-item.active');
      if(at) at.classList.remove('active');
      ni.classList.add('active');
    }
  }

  function cabecalho(){
    var a=el('hm-saud'), b=el('hm-sub'); if(!a) return;
    var nome='Daniel';
    a.textContent=saudacao()+', '+nome+' \u{1F44B}';
    if(b) b.textContent=dataLonga()+(clientes.length?(' · '+clientes.length+' clientes ativos'):'');
  }

  /* ================= quadradinhos lidos do menu ================= */
  function tiles(forcar){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv) return;
    var box=el('hm-grids'); if(!box) return;
    var assinatura=[].slice.call(nv.children).map(function(c){ return (c.className||'')+'|'+(c.id||'')+'|'+(c.textContent||'').trim(); }).join('~');
    if(!forcar && assinatura===ultimoMenu) { pintarPontos(); return; }
    ultimoMenu=assinatura;

    var grupos=[], atual=null;
    [].slice.call(nv.children).forEach(function(c){
      if(c.classList.contains('nav-sec')){ atual={g:(c.textContent||'').trim(), itens:[]}; grupos.push(atual); return; }
      if(!c.classList.contains('nav-item')) return;
      if(c.id==='ap-nav-inicio') return;                       /* nao vira quadradinho */
      if(c.closest && c.closest('#ap-esc-tema')) return;
      var ni=c.querySelector('.ni');
      var ic=ni ? (ni.textContent||'').trim() : '\u{1F4C1}';
      var lb=(c.textContent||'').replace(ic,'').trim();
      if(!lb) return;
      if(/apar[êe]ncia|tema/i.test(lb)) return;                 /* chave de tema fica so no menu */
      if(!atual){ atual={g:'Painel', itens:[]}; grupos.push(atual); }
      atual.itens.push({el:c, ic:ic, lb:lb});
    });

    var h='';
    grupos.forEach(function(gr){
      if(!gr.itens.length) return;
      h+='<div class="hm-gsec">'+esc(gr.g)+'</div><div class="hm-grid">';
      gr.itens.forEach(function(t,i){
        var chave=chaveDe(t.el);
        var leg=LEGENDAS[chave]||'';
        t.el.setAttribute('data-hm-i', gr.g+'#'+i);
        h+='<div class="hm-tile" data-hm="'+esc(gr.g+'#'+i)+'">'
          +'<span class="dt" style="display:none"></span>'
          +'<div class="ic">'+esc(t.ic)+'</div><div class="lb">'+esc(t.lb)+'</div>'
          +(leg?'<div class="s2">'+esc(leg)+'</div>':'')
          +'</div>';
      });
      h+='</div>';
    });
    box.innerHTML=h;

    var mapa={};
    grupos.forEach(function(gr){ gr.itens.forEach(function(t,i){ mapa[gr.g+'#'+i]=t.el; }); });
    [].slice.call(box.querySelectorAll('[data-hm]')).forEach(function(q){
      var alvo=mapa[q.getAttribute('data-hm')];
      q.onclick=function(){ if(alvo) alvo.click(); };
    });
    window.__HM_MAPA__=mapa;
    pintarPontos();
  }

  function chaveDe(item){
    var oc=item.getAttribute('onclick')||'';
    var m=oc.match(/navAba\('([a-z]+)'/i);
    if(m) return m[1];
    if(item.id==='ap-nav-ext') return 'extratos';
    if(item.id==='ap-nav-ped') return 'pedidos';
    if(item.id==='ap-nav-obc') return 'obcnpj';
    return '';
  }

  /* copia a bolinha vermelha do menu para o quadradinho */
  function pintarPontos(){
    var mapa=window.__HM_MAPA__||{}, box=el('hm-grids'); if(!box) return;
    [].slice.call(box.querySelectorAll('[data-hm]')).forEach(function(q){
      var alvo=mapa[q.getAttribute('data-hm')]; if(!alvo) return;
      var d=alvo.querySelector('.nav-dot');
      var pt=q.querySelector('.dt'); if(!pt) return;
      var liga = d && d.style.display && d.style.display!=='none';
      pt.style.display = liga ? 'flex' : 'none';
      pt.textContent = (d && (d.textContent||'').trim()) || '';
      if(liga && !pt.textContent) pt.textContent='!';
    });
  }

  /* ================= faixa "o que fazer hoje" ================= */
  function irPara(chave){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv) return;
    var itens=[].slice.call(nv.querySelectorAll('.nav-item'));
    for(var i=0;i<itens.length;i++){ if(chaveDe(itens[i])===chave){ itens[i].click(); return; } }
  }

  async function faixa(){
    var box=el('hm-chips'); if(!box) return;
    var lista=[], hoje=hojeISO(), sexta=maisDias(5), cp=compAnterior();
    var d=db();

    /* honorarios em atraso */
    try{
      var hs=await pega('honorarios');
      var atr=hs.filter(function(h){
        var pago=/pago/i.test(String(h.status||''));
        var v=String(h.vencimento||'').slice(0,10);
        return !pago && v && v<hoje;
      });
      var tot=0; atr.forEach(function(h){ tot+=num(h.valor); });
      if(atr.length) lista.push({c:'r', n:atr.length, t:'honorário'+(atr.length>1?'s':'')+' em atraso · '+money(tot), k:'honorarios'});
    }catch(e){}

    /* guias (colecao antiga obrigacoes) */
    try{
      var gs=await pega('obrigacoes');
      var gv=0, gp=0;
      gs.forEach(function(g){
        var pago=/pago|entreg|conclu/i.test(String(g.status||''));
        var v=String(g.vencimento||'').slice(0,10);
        if(pago||!v) return;
        if(v<hoje) gv++; else if(v<=sexta) gp++;
      });
      if(gv) lista.push({c:'r', n:gv, t:'guia'+(gv>1?'s':'')+' vencida'+(gv>1?'s':''), k:'obrig'});
      if(gp) lista.push({c:'a', n:gp, t:'guia'+(gp>1?'s':'')+' vence'+(gp>1?'m':'')+' até sexta', k:'obrig'});
    }catch(e){}

    /* extratos que faltam da competencia anterior */
    try{
      var ex=await pega('extratos');
      var tem={};
      ex.forEach(function(x){ if(String(x.competencia||'')===cp) tem[limpo(x.cliente||'')]=1; });
      var falta=clientes.filter(function(c){ return !tem[limpo(c.nome)]; }).length;
      if(falta) lista.push({c:'a', n:falta, t:'sem extrato de '+mesNome(cp), k:'extratos'});
    }catch(e){}

    /* solicitacoes em aberto */
    try{
      var so=await pega('solicitacoes');
      var ab=so.filter(function(s){ return !/resolv|conclu|atendid/i.test(String(s.status||'')); }).length;
      if(ab) lista.push({c:'b', n:ab, t:'solicitaç'+(ab>1?'ões':'ão')+' em aberto', k:'solicitacoes'});
    }catch(e){}

    /* pedidos de nota fiscal do cliente */
    try{
      var nt=await pega('notas');
      var pd=nt.filter(function(n){
        return String(n.origem||'')==='cliente' && String(n.tipo||'')==='Pedido' && !/emitida/i.test(String(n.status||''));
      }).length;
      if(pd) lista.push({c:'b', n:pd, t:'pedido'+(pd>1?'s':'')+' de nota fiscal', k:'notas'});
    }catch(e){}

    /* obrigacoes do CNPJ - so aparece depois que as regras do Firestore forem publicadas */
    try{
      if(d){
        var s=await d.collection('obrigCnpj').get();
        var venc=0;
        s.forEach(function(x){ var o=x.data()||{}; if(o.status==='at') venc++; });
        if(window.__OBC__ && window.__OBC__.contarVencidas){
          try{ venc=window.__OBC__.contarVencidas(); }catch(e){}
        }
        if(venc) lista.push({c:'r', n:venc, t:'obrigaç'+(venc>1?'ões':'ão')+' do CNPJ vencida'+(venc>1?'s':''), k:'obcnpj'});
      }
    }catch(e){}

    /* certificado e alvara perto do vencimento */
    try{
      if(d){
        var pf=await d.collection('perfilFiscal').get();
        var cav=0;
        pf.forEach(function(x){
          var o=x.data()||{};
          ['certValidade','alvaraValidade'].forEach(function(campo){
            var v=String(o[campo]||'').slice(0,10);
            if(v && v<=maisDias(60)) cav++;
          });
        });
        if(cav) lista.push({c:'a', n:cav, t:'certificado/alvará vencendo', k:'obcnpj'});
      }
    }catch(e){}

    if(!lista.length){
      box.innerHTML='<div class="hm-chip v"><b>✓</b> Tudo em dia por aqui</div>';
      return;
    }
    box.innerHTML=lista.map(function(x,i){
      return '<div class="hm-chip '+x.c+'" data-hm-c="'+i+'"><b>'+x.n+'</b> '+esc(x.t)+'</div>';
    }).join('');
    [].slice.call(box.querySelectorAll('[data-hm-c]')).forEach(function(e2){
      e2.onclick=function(){ irPara(lista[Number(e2.getAttribute('data-hm-c'))].k); };
    });
  }

  function mesNome(cp){
    var M=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var p=String(cp||'').split('-');
    return p.length===2 ? M[Number(p[1])-1] : cp;
  }

  var cacheCol={};
  async function pega(col){
    if(cacheCol[col] && (Date.now()-cacheCol[col].t) < 60000) return cacheCol[col].v;
    var v=[];
    try{
      if(typeof dbGetAll==='function') v=await dbGetAll(col);
      else { var d=db(); if(d){ var s=await d.collection(col).get(); s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; v.push(o); }); } }
    }catch(e){ v=[]; }
    cacheCol[col]={t:Date.now(), v:v};
    return v;
  }

  /* ================= busca de cliente ================= */
  async function carregarClientes(){
    var cs=await pega('clientes');
    clientes=cs.filter(function(c){
      var n=String(c.nome||'').trim();
      var ativo=!c.status || !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(c.status));
      return n && n!=='Todos os Clientes' && ativo;
    }).sort(function(a,b){ return String(a.nome).localeCompare(String(b.nome)); });
  }

  function ligarBusca(){
    var q=el('hm-q'), res=el('hm-res'); if(!q||!res) return;
    q.oninput=function(){
      var v=q.value.trim().toLowerCase();
      if(v.length<2){ res.classList.remove('on'); return; }
      var achou=clientes.filter(function(c){
        return (String(c.nome||'')+' '+String(c.cnpj||'')).toLowerCase().indexOf(v)>=0;
      }).slice(0,7);
      if(!achou.length){ res.innerHTML='<div><span>Nenhum cliente encontrado</span></div>'; res.classList.add('on'); return; }
      res.innerHTML=achou.map(function(c){
        return '<div data-hm-cli="'+esc(c.nome)+'"><b>'+esc(c.nome)+'</b><span>'+esc(c.cnpj||'CNPJ não cadastrado')+'</span></div>';
      }).join('');
      res.classList.add('on');
      [].slice.call(res.querySelectorAll('[data-hm-cli]')).forEach(function(e2){
        e2.onclick=function(){ res.classList.remove('on'); q.value=''; ficha(e2.getAttribute('data-hm-cli')); };
      });
    };
    q.onkeydown=function(ev){ if(ev.key==='Escape'){ res.classList.remove('on'); q.value=''; } };
    document.addEventListener('click', function(ev){
      if(!ev.target.closest || !ev.target.closest('.hm-busca')) res.classList.remove('on');
    });
  }

  function fecharModal(){ var m=el('ap-hm-modal'); if(m) m.remove(); }
  async function ficha(nome){
    var c=null;
    for(var i=0;i<clientes.length;i++){ if(clientes[i].nome===nome){ c=clientes[i]; break; } }
    if(!c) c={nome:nome};
    var m=document.createElement('div'); m.id='ap-hm-modal';
    m.innerHTML='<div class="cx"><button class="x" id="hm-mx">✖</button>'
      +'<h3>'+esc(c.nome)+'</h3><div class="h4">'+esc(c.cnpj||'CNPJ não cadastrado')+' · '+esc(c.regime||'regime não informado')+'</div>'
      +'<div id="hm-fx"><div style="font-size:12.5px;color:var(--cinza)">Carregando a situação...</div></div>'
      +'<div class="bts">'
        +'<button class="bt az" data-hm-ir="honorarios">\u{1F4B3} Honorários</button>'
        +'<button class="bt" data-hm-ir="extratos">\u{1F3E6} Extratos</button>'
        +'<button class="bt" data-hm-ir="obcnpj">\u{1F5C2}\u{FE0F} Obrigações</button>'
        +'<button class="bt" data-hm-ir="clientes">\u{1F465} Cadastro</button>'
        +'<a class="bt" id="hm-wa" target="_blank" rel="noopener">\u{1F4F2} WhatsApp</a>'
      +'</div></div>';
    m.onclick=function(ev){ if(ev.target===m) fecharModal(); };
    document.body.appendChild(m);
    el('hm-mx').onclick=fecharModal;
    [].slice.call(m.querySelectorAll('[data-hm-ir]')).forEach(function(b){
      b.onclick=function(){ fecharModal(); irPara(b.getAttribute('data-hm-ir')); };
    });
    var wa=el('hm-wa');
    if(wa){
      var tel=String(c.telefone||c.whatsapp||'').replace(/\D/g,'');
      var txt='Olá! Aqui é a APARAT Contabilidade.';
      wa.href = tel ? ('https://wa.me/55'+tel+'?text='+encodeURIComponent(txt)) : ('https://wa.me/?text='+encodeURIComponent(txt));
    }

    /* resumo do cliente */
    var linhas='';
    try{
      var hoje=hojeISO(), cp=compAnterior();
      var hs=await pega('honorarios');
      var meus=hs.filter(function(h){ return String(h.cliente||'')===c.nome; });
      var abertos=meus.filter(function(h){ return !/pago/i.test(String(h.status||'')); });
      var atras=abertos.filter(function(h){ var v=String(h.vencimento||'').slice(0,10); return v && v<hoje; });
      var tot=0; abertos.forEach(function(h){ tot+=num(h.valor); });
      linhas+='<div class="ln"><span>Honorários em aberto</span><b'+(atras.length?' style="color:#ff6b60"':'')+'>'
             +(abertos.length? (abertos.length+' · '+money(tot)+(atras.length?(' · '+atras.length+' em atraso'):'')) : 'nenhum')+'</b></div>';

      var ex=await pega('extratos');
      var temEx=ex.some(function(x){ return String(x.cliente||'')===c.nome && String(x.competencia||'')===cp; });
      linhas+='<div class="ln"><span>Extrato de '+mesNome(cp)+'</span><b style="color:'+(temEx?'#0e9f6e':'#e2a03f')+'">'+(temEx?'entregue':'não entregue')+'</b></div>';

      var so=await pega('solicitacoes');
      var minhas=so.filter(function(s){ return String(s.cliente||'')===c.nome && !/resolv|conclu|atendid/i.test(String(s.status||'')); }).length;
      linhas+='<div class="ln"><span>Solicitações em aberto</span><b>'+(minhas||'nenhuma')+'</b></div>';

      var d=db();
      if(d){
        try{
          var pfd=await d.collection('perfilFiscal').doc(limpo(c.nome)).get();
          if(pfd.exists){
            var p=pfd.data()||{};
            linhas+='<div class="ln"><span>Perfil fiscal</span><b>'+esc(p.regime||'—')+(p.anexo?(' · anexo '+esc(p.anexo)):'')+(p.temEmpregado?(' · '+(p.nEmp||0)+' empregado(s)'):'')+'</b></div>';
            if(p.certValidade) linhas+='<div class="ln"><span>Certificado digital</span><b style="color:'+(String(p.certValidade).slice(0,10)<=maisDias(60)?'#e2a03f':'#0e9f6e')+'">vence '+dataBR(p.certValidade)+'</b></div>';
          }
        }catch(e){}
      }
    }catch(e){}
    var fx=el('hm-fx');
    if(fx) fx.innerHTML = linhas || '<div style="font-size:12.5px;color:var(--cinza)">Sem dados para mostrar ainda.</div>';
  }

  /* ================= relogio ================= */
  var ocupado=false, voltas=0;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css();
      var painel=el('view-painel');
      if(painel && painel.classList.contains('active') && ehAdmin()){
        menu(); pagina();
        if(voltas>=2) trocarInicial();
        if(el('pp-inicio')){
          tiles(false);
          if(voltas===2 || voltas%10===0){
            await carregarClientes();
            cabecalho();
            if(el('pp-inicio').classList.contains('active')) await faixa();
          }
        }
      }
    }catch(e){}
    ocupado=false;
  }
  [1200,2600,5200,9000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,7000);

  window.__HOME_ESC__={tiles:tiles, faixa:faixa, ficha:ficha, irPara:irPara, abrir:abrir};
})();
