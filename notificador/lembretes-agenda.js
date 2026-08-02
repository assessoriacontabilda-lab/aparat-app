/*
 * APARAT - Lembretes de agendamento do dia
 * Roda toda manha. Para cada agendamento de HOJE:
 *  - avisa o CLIENTE por push no app
 *  - avisa o Daniel por push, WhatsApp e e-mail (resumo)
 * SIMULACAO=1 -> so mostra, nao envia.
 */
const admin = require("firebase-admin");
const https = require("https");
const APP_URL = "https://assessoriacontabilda-lab.github.io/aparat-app/";
const ICON = APP_URL + "icon-192.png";

function initApp() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: sem FIREBASE_SA_JSON."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}
function hojeISO() {
  const s = new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  return s.match(/\d{4}-\d{2}-\d{2}/)[0];
}
function norm(t) { try { return String(t || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) { return String(t || "").trim().toLowerCase(); } }
function avisarWhatsApp(texto) {
  return new Promise(function (res) {
    const key = process.env.CALLMEBOT_KEY;
    if (!key) return res();
    const fone = process.env.CALLMEBOT_PHONE || "5516988699203";
    https.get("https://api.callmebot.com/whatsapp.php?phone=" + fone + "&text=" + encodeURIComponent(texto) + "&apikey=" + encodeURIComponent(key),
      function (r) { console.log("  WhatsApp:", r.statusCode); r.resume(); res(); }).on("error", function () { res(); });
  });
}
async function avisarEmail(titulo, corpo) {
  const pass = process.env.GMAIL_APP_PASS; if (!pass) return;
  const user = process.env.GMAIL_USER || "assessoriacontabil.da@gmail.com";
  try {
    const nodemailer = require("nodemailer");
    const tp = nodemailer.createTransport({ service: "gmail", auth: { user: user, pass: pass } });
    await tp.sendMail({ from: "APARAT App <" + user + ">", to: user, subject: "📅 " + titulo, text: corpo + "\n\n" + APP_URL });
    console.log("  E-mail enviado.");
  } catch (e) { console.log("  E-mail erro:", e.message || e); }
}
async function push(tokens, titulo, corpo) {
  if (!tokens.length) { console.log("  (sem tokens)"); return; }
  try {
    const r = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: { title: titulo, body: corpo },
      webpush: { notification: { title: titulo, body: corpo, icon: ICON, badge: ICON }, fcmOptions: { link: APP_URL } }
    });
    console.log("  push:", r.successCount, "ok,", r.failureCount, "falhas");
  } catch (e) { console.log("  push erro:", e.message || e); }
}
async function main() {
  const SIM = process.env.SIMULACAO === "1";
  initApp();
  const db = admin.firestore();
  const hoje = hojeISO();
  const snap = await db.collection("agenda").get();
  const doDia = [];
  snap.forEach(function (d) { const a = d.data(); if (String(a.data || "").slice(0, 10) === hoje) doDia.push(a); });
  if (!doDia.length) { console.log("Nenhum agendamento hoje (" + hoje + ")."); return; }
  console.log((SIM ? "[SIMULACAO] " : "") + doDia.length + " agendamento(s) hoje:");
  const tk = await db.collection("tokens").get();
  const tokensAdmin = [], tokensCli = {};
  tk.forEach(function (d) {
    const t = d.data();
    if (!t.token) return;
    if (t.role === "admin") tokensAdmin.push(t.token);
    else { const n = norm(t.cliente); (tokensCli[n] = tokensCli[n] || []).push(t.token); }
  });
  const linhas = [];
  for (const a of doDia) {
    const desc = (a.tipo || "Compromisso") + (a.hora ? " às " + a.hora : "") + (a.desc ? " — " + a.desc : "");
    linhas.push("- " + (a.cliente || "?") + ": " + desc);
    console.log("  ", a.cliente, "|", desc);
    if (SIM) continue;
    const tcli = tokensCli[norm(a.cliente)] || [];
    await push(tcli, "📅 Lembrete: hoje com a APARAT", desc + ". Toque para ver no app.");
  }
  if (SIM) { console.log("[SIMULACAO] Nada enviado."); return; }
  const resumo = "Agendamentos de hoje:\n" + linhas.join("\n");
  await push(tokensAdmin, "📅 Agenda de hoje: " + doDia.length + " compromisso(s)", linhas.join(" | ").slice(0, 200));
  await avisarWhatsApp("*APARAT* 📅 " + resumo);
  await avisarEmail("Agenda de hoje: " + doDia.length + " compromisso(s)", resumo);
  console.log("Fim.");
}
main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA:", e); process.exit(1); });
