/*
 * APARAT Contabilidade - Gerador automatico de honorarios mensais
 * Roda pelo GitHub Actions todo dia 1o do mes.
 * Para cada cliente cadastrado, cria o honorario do mes com base no
 * ultimo honorario lancado (mesmo valor, mesmo dia de vencimento).
 * Nao duplica: se o honorario do mes ja existe, pula.
 * SIMULACAO=1 -> apenas mostra o que faria, sem gravar nada.
 */
const admin = require("firebase-admin");

function initApp() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: segredo FIREBASE_SA_JSON nao configurado."); process.exit(1); }
  let sa;
  try { sa = JSON.parse(raw); }
  catch (e) { console.error("ERRO: FIREBASE_SA_JSON invalido."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

function p2(n) { return ("0" + n).slice(-2); }

function hojeBrasil() {
  const s = new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return { ano: +m[1], mes: +m[2], dia: +m[3] };
}

function mesDaReferencia(ref) {
  const c = String(ref || "").trim();
  let m = c.match(/^(\d{1,2})\s*\/\s*(\d{4})$/); if (m) return m[2] + "-" + p2(+m[1]);
  m = c.match(/^(\d{4})-(\d{1,2})/); if (m) return m[1] + "-" + p2(+m[2]);
  return "";
}

function diaDoVencimento(v) {
  const s = String(v || "").trim();
  let m = s.match(/^\d{4}-\d{1,2}-(\d{1,2})/); if (m) return +m[1];
  m = s.match(/^(\d{1,2})\//); if (m) return +m[1];
  return 10;
}

async function main() {
  const SIMULACAO = process.env.SIMULACAO === "1";
  initApp();
  const db = admin.firestore();

  const hoje = hojeBrasil();
  if (!SIMULACAO && hoje.dia > 3 && process.env.FORCAR !== "1") {
    console.log("Hoje e dia", hoje.dia, "- geracao real so roda do dia 1 ao 3 (ou com FORCAR=1). Fim.");
    return;
  }
  const refAtual = p2(hoje.mes) + "/" + hoje.ano;
  const mesAtual = hoje.ano + "-" + p2(hoje.mes);
  console.log((SIMULACAO ? "[SIMULACAO] " : "") + "Gerando honorarios da referencia " + refAtual);

  const cliSnap = await db.collection("clientes").get();
  const clientes = [];
  cliSnap.forEach(function (d) { const n = String(d.data().nome || "").trim(); if (n) clientes.push(n); });
  console.log("Clientes cadastrados:", clientes.length);

  const honSnap = await db.collection("honorarios").get();
  const porCliente = {};
  honSnap.forEach(function (d) {
    const h = d.data();
    const nome = String(h.cliente || "").trim();
    if (!nome) return;
    if (!porCliente[nome]) porCliente[nome] = [];
    porCliente[nome].push(h);
  });

  let criados = 0, pulados = 0, semHistorico = 0;
  for (const nome of clientes) {
    const hist = porCliente[nome] || [];
    const jaTem = hist.some(function (h) { return mesDaReferencia(h.referencia) === mesAtual; });
    if (jaTem) { console.log("  -", nome, ": ja tem honorario de", refAtual, "- pulando."); pulados++; continue; }
    if (!hist.length) { console.log("  -", nome, ": sem historico de honorario - pulando (lance o primeiro manualmente)."); semHistorico++; continue; }
    hist.sort(function (a, b) { return String(mesDaReferencia(b.referencia)).localeCompare(String(mesDaReferencia(a.referencia))); });
    const ult = hist[0];
    const diaV = Math.min(diaDoVencimento(ult.vencimento), new Date(hoje.ano, hoje.mes, 0).getDate());
    const venc = hoje.ano + "-" + p2(hoje.mes) + "-" + p2(diaV);
    const novo = {
      cliente: nome,
      referencia: refAtual,
      valor: ult.valor || "",
      vencimento: venc,
      status: "Pendente",
      geradoAutomatico: true,
      criadoEm: admin.firestore.FieldValue.serverTimestamp()
    };
    if (SIMULACAO) {
      console.log("  -", nome, ": CRIARIA honorario", refAtual, "valor R$", novo.valor, "venc", venc);
    } else {
      await db.collection("honorarios").add(novo);
      console.log("  -", nome, ": honorario", refAtual, "criado - R$", novo.valor, "venc", venc);
    }
    criados++;
  }
  console.log((SIMULACAO ? "[SIMULACAO] " : "") + "Resumo: " + criados + " a criar/criados, " + pulados + " ja existiam, " + semHistorico + " sem historico.");
}

main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA GERAL:", e); process.exit(1); });
