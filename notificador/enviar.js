/*
 * APARAT Contabilidade - Carteiro de notificacoes push
 * Roda pelo GitHub Actions de tempos em tempos.
 * Le mensagens novas no Firestore e envia notificacao (FCM) para o
 * aparelho certo, mesmo com o app fechado.
 *
 * Usa um cursor de horario (colecao _notificador/estado) para nao repetir.
 * Nao altera as mensagens.
 */
const admin = require("firebase-admin");

const APP_URL = "https://assessoriacontabilda-lab.github.io/aparat-app/";
const ICON = APP_URL + "icon-192.png";

// Mensagens que o CLIENTE envia -> avisar o ESCRITORIO (role admin)
const CLIENTE_PARA_ESCRITORIO = ["solicitacoes", "recebidos"];
// Avisos que o ESCRITORIO envia -> avisar o CLIENTE (role cliente)
const ESCRITORIO_PARA_CLIENTE = ["urgencias", "informativos", "obrigacoes", "obrigacoesAnuais"];

// Palavras que indicam "para todos os clientes"
function ehTodos(dest) {
  if (!dest) return true;
  return /todos/i.test(String(dest));
}

function initApp() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) {
    console.error("ERRO: segredo FIREBASE_SA_JSON nao configurado.");
    process.exit(1);
  }
  let sa;
  try { sa = JSON.parse(raw); }
  catch (e) { console.error("ERRO: FIREBASE_SA_JSON nao e um JSON valido."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

function tituloDe(coll, d) {
  if (coll === "solicitacoes") return { t: "Nova solicitacao de cliente", b: (d.cliente ? d.cliente + ": " : "") + (d.mensagem || "Voce recebeu uma nova mensagem.") };
  if (coll === "recebidos") return { t: "Novo arquivo/mensagem recebido", b: (d.cliente ? d.cliente + ": " : "") + (d.msg || d.mensagem || d.arquivoNome || "Voce recebeu algo novo.") };
  if (coll === "urgencias") return { t: d.titulo || "Novo aviso da Aparat", b: d.msg || d.mensagem || "Toque para ver." };
  if (coll === "informativos") return { t: d.titulo || "Novo informativo da Aparat", b: d.msg || d.texto || "Toque para ver." };
  if (coll === "obrigacoes") return { t: "Nova obrigacao lancada", b: (d.tipo || d.guia || "Obrigacao") + (d.mesRef || d.competencia ? " (" + (d.mesRef || d.competencia) + ")" : "") + (d.status ? " - " + d.status : "") };
  if (coll === "obrigacoesAnuais") return { t: "Nova obrigacao anual", b: (d.tipo || "Obrigacao anual") + (d.exercicio ? " " + d.exercicio : "") + (d.situacao ? " - " + d.situacao : "") };
  return { t: "Aparat Contabilidade", b: "Voce tem uma novidade no app." };
}

async function tokensPorRole(db, role) {
  const snap = await db.collection("tokens").where("role", "==", role).get();
  const out = [];
  snap.forEach(function (doc) {
    const t = doc.data().token;
    if (t) out.push({ id: doc.id, token: t, cliente: doc.data().cliente || "" });
  });
  return out;
}

async function enviar(tokens, titulo, corpo, db) {
  if (!tokens.length) { console.log("  (sem tokens de destino)"); return; }
  const message = {
    tokens: tokens.map(function (x) { return x.token; }),
    notification: { title: titulo, body: corpo },
    webpush: {
      notification: { title: titulo, body: corpo, icon: ICON, badge: ICON },
      fcmOptions: { link: APP_URL }
    }
  };
  try {
    const resp = await admin.messaging().sendEachForMulticast(message);
    console.log("  enviados:", resp.successCount, " falhas:", resp.failureCount);
    // remove tokens invalidos/expirados
    for (let i = 0; i < resp.responses.length; i++) {
      const r = resp.responses[i];
      if (!r.success && r.error) {
        const code = r.error.code || "";
        if (code.indexOf("registration-token-not-registered") >= 0 || code.indexOf("invalid-argument") >= 0) {
          try { await db.collection("tokens").doc(tokens[i].id).delete(); console.log("  token invalido removido"); } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error("  ERRO ao enviar:", e.message || e);
  }
}

async function main() {
  initApp();
  const db = admin.firestore();

  const estadoRef = db.collection("_notificador").doc("estado");
  const estadoSnap = await estadoRef.get();
  const agora = admin.firestore.Timestamp.now();
  let desde;
  if (estadoSnap.exists && estadoSnap.data().ultimaRodada) {
    desde = estadoSnap.data().ultimaRodada;
  } else {
    // primeira rodada: olha apenas os ultimos 10 minutos (evita disparar backlog antigo)
    desde = admin.firestore.Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
    console.log("Primeira rodada: olhando ultimos 10 minutos.");
  }
  console.log("Buscando mensagens desde:", desde.toDate().toISOString());

  // Pre-carrega tokens
  const tokensAdmin = await tokensPorRole(db, "admin");
  const tokensCliente = await tokensPorRole(db, "cliente");
  console.log("Tokens admin:", tokensAdmin.length, " Tokens cliente:", tokensCliente.length);

  async function processar(coll, alvo) {
    let snap;
    try {
      snap = await db.collection(coll).where("criadoEm", ">", desde).get();
    } catch (e) {
      console.log("Colecao", coll, "sem criadoEm ou erro:", (e.message || e).slice(0, 40));
      return;
    }
    if (snap.empty) { return; }
    console.log("Colecao", coll, "->", snap.size, "nova(s).");
    for (const doc of snap.docs) {
      const d = doc.data();
      const info = tituloDe(coll, d);
      if (alvo === "admin") {
        await enviar(tokensAdmin, info.t, info.b, db);
      } else {
        // para cliente: se for para todos, manda pra todos os clientes;
        // senao, so para o cliente destino (por nome)
        const alvoTxt = String(d.dest || d.cliente || "").trim();
        let destinos = tokensCliente;
        if (!ehTodos(alvoTxt)) {
          const alvoNome = alvoTxt.toLowerCase();
          destinos = tokensCliente.filter(function (x) {
            return String(x.cliente || "").trim().toLowerCase() === alvoNome;
          });
        }
        await enviar(destinos, info.t, info.b, db);
      }
    }
  }

  for (const c of CLIENTE_PARA_ESCRITORIO) { await processar(c, "admin"); }
  for (const c of ESCRITORIO_PARA_CLIENTE) { await processar(c, "cliente"); }

  await estadoRef.set({ ultimaRodada: agora }, { merge: true });
  console.log("Cursor atualizado. Fim.");
}

main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA GERAL:", e); process.exit(1); });
