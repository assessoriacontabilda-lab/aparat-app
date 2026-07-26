/*
 * APARAT Contabilidade - Alerta diario de inadimplencia
 * Roda todo dia pelo GitHub Actions. Se houver honorarios vencidos e
 * nao pagos, avisa o Daniel por push, WhatsApp e e-mail.
 * SIMULACAO=1 -> so mostra, nao envia nada.
 */
const admin = require("firebase-admin");
const https = require("https");

const APP_URL = "https://assessoriacontabilda-lab.github.io/aparat-app/";
const ICON = APP_URL + "icon-192.png";

function initApp() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: segredo FIREBASE_SA_JSON nao configurado."); process.exit(1); }
  let sa;
  try { sa = JSON.parse(raw); } catch (e) { console.error("ERRO: FIREBASE_SA_JSON invalido."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
function p2(n) { return ("0" + n).slice(-2); }
function hojeISO() {
  const s = new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  return s.match(/\d{4}-\d{2}-\d{2}/)[0];
}
function num(v) { v = ("" + (v == null ? "" : v)).replace(/[^0-9,.-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); return parseFloat(v) || 0; }
function money(n) { return "R$ " + (n || 0).toFixed(2).replace(".", ","); }

function avisarWhatsApp(texto) {
  return new Promise(function (res) {
    const key = process.env.CALLMEBOT_KEY;
    if (!key) { console.log("  (WhatsApp: sem CALLMEBOT_KEY)"); return res(); }
    const fone = process.env.CALLMEBOT_PHONE || "5516988699203";
    const url = "https://api.callmebot.com/whatsapp.php?phone=" + fone + "&text=" + encodeURIComponent(texto) + "&apikey=" + encodeURIComponent(key);
    https.get(url, function (r) { console.log("  WhatsApp:", r.statusCode); r.resume(); res(); })
      .on("error", function (e) { console.log("  WhatsApp erro:", e.message); res(); });
  });
}
async function avisarEmail(titulo, corpo) {
  const pass = process.env.GMAIL_APP_PASS;
  if (!pass) { console.log("  (E-mail: sem GMAIL_APP_PASS)"); return; }
  const user = process.env.GMAIL_USER || "assessoriacontabil.da@gmail.com";
  try {
    const nodemailer = require("nodemailer");
    const tp = nodemailer.createTransport({ service: "gmail", auth: { user: user, pass: pass } });
    await tp.sendMail({ from: "APARAT App <" + user + ">", to: user, subject: "⚠️ " + titulo, text: corpo + "\n\nAbra o painel: " + APP_URL });
    console.log("  E-mail enviado.");
  } catch (e) { console.log("  E-mail erro:", e.message || e); }
}

async function main() {
  const SIMULACAO = process.env.SIMULACAO === "1";
  initApp();
  const db = admin.firestore();
  const hoje = hojeISO();

  const snap = await db.collection("honorarios").get();
  const porCli = {};
  snap.forEach(function (d) {
    const h = d.data();
    const pago = /pago/i.test(String(h.status || ""));
    const v = String(h.vencimento || "").slice(0, 10);
    if (pago || !v || v >= hoje) return;
    const n = String(h.cliente || "?").trim();
    if (/^teste/i.test(n)) return;
    if (!porCli[n]) porCli[n] = { total: 0, desde: "9999-99-99" };
    porCli[n].total += num(h.valor);
    if (v < porCli[n].desde) porCli[n].desde = v;
  });
  const nomes = Object.keys(porCli).sort(function (a, b) { return porCli[a].desde.localeCompare(porCli[b].desde); });
  if (!nomes.length) { console.log("Nenhum cliente em atraso hoje (" + hoje + "). Nada a avisar."); return; }

  let total = 0; nomes.forEach(function (n) { total += porCli[n].total; });
  const titulo = "Inadimplencia: " + nomes.length + " cliente(s) em atraso - " + money(total);
  const linhas = nomes.slice(0, 10).map(function (n) {
    const m = porCli[n].desde.match(/(\d{4})-(\d{2})-(\d{2})/);
    return "- " + n + ": " + money(porCli[n].total) + " (desde " + m[3] + "/" + m[2] + ")";
  });
  const corpo = linhas.join("\n") + (nomes.length > 10 ? "\n...e mais " + (nomes.length - 10) : "");
  console.log((SIMULACAO ? "[SIMULACAO] " : "") + titulo);
  console.log(corpo);
  if (SIMULACAO) { console.log("[SIMULACAO] Nada foi enviado."); return; }

  const tk = await db.collection("tokens").where("role", "==", "admin").get();
  const tokens = []; tk.forEach(function (d) { if (d.data().token) tokens.push(d.data().token); });
  if (tokens.length) {
    try {
      const resp = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: { title: "⚠️ " + titulo, body: corpo.slice(0, 200) },
        webpush: { notification: { title: "⚠️ " + titulo, body: corpo.slice(0, 200), icon: ICON, badge: ICON }, fcmOptions: { link: APP_URL } }
      });
      console.log("  push enviados:", resp.successCount, "falhas:", resp.failureCount);
    } catch (e) { console.log("  push erro:", e.message || e); }
  }
  await avisarWhatsApp("*APARAT* ⚠️ " + titulo + "\n" + corpo);
  await avisarEmail(titulo, corpo);
  console.log("Fim.");
}
main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA GERAL:", e); process.exit(1); });
