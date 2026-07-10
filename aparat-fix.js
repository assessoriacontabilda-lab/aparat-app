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
      { n: "Financeiro", ic: "💲", d: "Visualize honorários, boletos e pagamentos." },
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

  // ---- Calendario completo no seletor de mes do Faturamento (cliente) ----
  function expandFatMonths() {
    try {
      if (window.__apFatWrapped) return;
      if (typeof window._fatMesBox !== "function") return;
      var orig = window._fatMesBox;
      window._fatMesBox = function () {
        var r;
        try { r = orig.apply(this, arguments); } catch (e) {}
        try {
          var sel = document.getElementById("cli-fat-mes");
          if (sel) {
            var have = {};
            [].forEach.call(sel.options, function (o) { have[o.value] = 1; });
            var nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            var now = new Date();
            for (var k = 0; k >= -47; k--) {
              var d = new Date(now.getFullYear(), now.getMonth() + k, 1);
              var y = d.getFullYear(), m = d.getMonth() + 1;
              var vv = y + "-" + (m < 10 ? "0" + m : m);
              if (have[vv]) continue;
              var o = document.createElement("option");
              o.value = vv; o.textContent = nomes[m - 1] + "/" + y;
              sel.appendChild(o);
            }
            var selVal = sel.value;
            var opts = [].slice.call(sel.options);
            opts.sort(function (a, b) { return a.value < b.value ? 1 : (a.value > b.value ? -1 : 0); });
            opts.forEach(function (o) { sel.appendChild(o); });
            if (selVal) sel.value = selVal;
          }
        } catch (e) {}
        return r;
      };
      window.__apFatWrapped = true;
      if (document.getElementById("cli-fat-mes")) { try { window._fatMesBox(); } catch (e) {} }
    } catch (e) {}
  }

  /* ---------- INIT ---------- */
  function init() {
    if (!(window.firebase && firebase.apps && firebase.apps.length)) { setTimeout(init, 300); return; }
    removeStrays(); setTimeout(removeStrays, 500); setTimeout(removeStrays, 1500);
    expandFatMonths();
    [600, 1800, 4000].forEach(function (t) { setTimeout(expandFatMonths, t); });
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
