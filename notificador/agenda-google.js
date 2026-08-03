/*
 * APARAT Contabilidade - Sincronizador Agenda do app -> Google Agenda
 * Roda pelo GitHub Actions a cada 15 minutos.
 * Para cada agendamento sem googleEventId, cria o evento na Google
 * Agenda do Daniel (assessoriacontabil.da@gmail.com) e grava o id
 * de volta no Firestore para nao duplicar.
 * Requisitos: Google Calendar API ativa no projeto e a agenda do
 * Daniel compartilhada com o e-mail do robo (permissao de alterar eventos).
 * SIMULACAO=1 -> apenas mostra o que faria, sem gravar nada.
 */
const admin = require("firebase-admin");
const { JWT } = require("google-auth-library");

const CALENDARIO = "assessoriacontabil.da@gmail.com";

const EMOJI = {
  "reuniao": "\u{1F91D}",
  "entrega de documentos": "\u{1F4C4}",
  "entrega de impostos do cliente": "\u{1F4B0}",
  "entrega de notas fiscais": "\u{1F9FE}",
  "visita": "\u{1F3E2}",
  "ligacao": "\u{1F4DE}"
};

function norm(s) {
  return String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function initApp() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: segredo FIREBASE_SA_JSON nao configurado."); process.exit(1); }
  let sa;
  try { sa = JSON.parse(raw); }
  catch (e) { console.error("ERRO: FIREBASE_SA_JSON invalido."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  return sa;
}

async function main() {
  const SIMULACAO = process.env.SIMULACAO === "1";
  const sa = initApp();
  const db = admin.firestore();

  const jwt = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"]
  });

  const snap = await db.collection("agenda").get();
  let criados = 0, pulados = 0, erros = 0;

  for (const doc of snap.docs) {
    const a = doc.data();
    if (a.googleEventId) { pulados++; continue; }
    if (!a.data) { console.log("  - agendamento sem data - pulando:", doc.id); pulados++; continue; }

    const hora = /^\d{1,2}:\d{2}$/.test(String(a.hora || "").trim()) ? String(a.hora).trim() : "09:00";
    const ini = a.data + "T" + (hora.length === 4 ? "0" + hora : hora) + ":00";
    const hFim = ("0" + (parseInt(hora, 10) + 1)).slice(-2) + ":" + hora.split(":")[1];
    const fim = a.data + "T" + hFim + ":00";

    const emoji = EMOJI[norm(a.tipo)] || "\u{1F4CC}";
    const titulo = emoji + " " + (a.tipo || "Agendamento") + (a.cliente ? " - " + a.cliente : "");
    const descricao = (a.desc ? a.desc + "\n\n" : "") + "(agendamento do app APARAT)";

    const evento = {
      summary: titulo,
      description: descricao,
      start: { dateTime: ini, timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim, timeZone: "America/Sao_Paulo" },
      reminders: { useDefault: false, overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 10 }
      ] }
    };

    if (SIMULACAO) {
      console.log("  - CRIARIA evento:", titulo, a.data, hora);
      criados++;
      continue;
    }

    try {
      const r = await jwt.request({
        url: "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(CALENDARIO) + "/events",
        method: "POST",
        data: evento
      });
      await doc.ref.update({ googleEventId: r.data.id });
      console.log("  - evento criado:", titulo, a.data, hora);
      criados++;
    } catch (e) {
      erros++;
      const msg = (e.response && e.response.data && JSON.stringify(e.response.data)) || e.message;
      console.error("  - ERRO ao criar evento de", a.cliente || doc.id, ":", msg);
    }
  }

  console.log((SIMULACAO ? "[SIMULACAO] " : "") + "Resumo: " + criados + " criados, " + pulados + " ja sincronizados/pulados, " + erros + " erros.");
  if (erros > 0) process.exit(1);
}

main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA GERAL:", e); process.exit(1); });
