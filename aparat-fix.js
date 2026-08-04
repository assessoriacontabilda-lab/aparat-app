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
  var IDS = ["ob-cli", "hon-cli", "nf-cli", "dad-cli", "fat-cli", "ag-cli", "doc-cli", "acc-cli", "oba-cli", "urg-dest", "docs-cli-sel", "fin-cli"];
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
