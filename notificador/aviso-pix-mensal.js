/*
 * APARAT Contabilidade - Aviso mensal de pagamento com a chave PIX
 * Roda pelo GitHub Actions todo dia 1o, logo depois do gerar-honorarios.js.
 *
 * Para cada cliente com honorario do mes em aberto, grava um aviso na colecao
 * 'urgencias' com o valor dele, o vencimento e a chave PIX. O notificador
 * (enviar.js) transforma esse aviso em notificacao no celular do cliente.
 *
 * Nao duplica: se o cliente ja recebeu o aviso da mesma referencia, pula.
 * SIMULACAO=1 -> so mostra o que faria.  FORCAR=1 -> roda fora do dia 1 ao 3.
 */
const admin = require("firebase-admin");

const CHAVE_PIX = "e140ad9c-8e55-4fa4-853c-ebbc3a18c3c3";
const FAVORECIDO = "APARAT CONTABILIDADE LTDA";
const ORIGEM = "cobranca-mensal";

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

const MESES_NOME = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const MESES_EXT = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function mesDaReferencia(ref) {
  const c = String(ref || "").trim();
  let m = c.match(/^(\d{1,2})\s*\/\s*(\d{4})$/); if (m) return m[2] + "-" + p2(+m[1]);
  m = c.match(/^(\d{4})-(\d{1,2})/); if (m) return m[1] + "-" + p2(+m[2]);
  m = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/^([a-z]+)\s*\/?\s*(\d{4})$/);
  if (m && MESES_NOME[m[1]]) return m[2] + "-" + p2(MESES_NOME[m[1]]);
  return "";
}

function valorNum(v) {
  // aceita "350", "350,00", "R$ 350,00" e "1.250,50" (o milhar sai antes da virgula virar ponto)
  let s = String(v == null ? "" : v).replace(/[^0-9.,-]/g, "");
  if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function money(n) {
  return "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataBR(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + "/" + m[2] + "/" + m[1]) : String(iso || "");
}

function pago(status) {
  return /pago|conclu|quitad|baixad|recebid/i.test(String(status || ""));
}

async function main() {
  const SIMULACAO = process.env.SIMULACAO === "1";
  initApp();
  const db = admin.firestore();

  const hoje = hojeBrasil();
  if (!SIMULACAO && hoje.dia > 3 && process.env.FORCAR !== "1") {
    console.log("Hoje e dia", hoje.dia, "- o aviso real so sai do dia 1 ao 3 (ou com FORCAR=1). Fim.");
    return;
  }

  const refAtual = p2(hoje.mes) + "/" + hoje.ano;
  const mesAtual = hoje.ano + "-" + p2(hoje.mes);
  const mesExtenso = MESES_EXT[hoje.mes] + "/" + hoje.ano;
  console.log((SIMULACAO ? "[SIMULACAO] " : "") + "Aviso de pagamento da referencia " + refAtual);

  // honorarios do mes, por cliente
  const honSnap = await db.collection("honorarios").get();
  const doMes = [];
  honSnap.forEach(function (d) {
    const h = d.data();
    const nome = String(h.cliente || "").trim();
    if (!nome) return;
    if (mesDaReferencia(h.referencia) !== mesAtual) return;
    if (pago(h.status)) return;
    doMes.push({ id: d.id, cliente: nome, valor: valorNum(h.valor), vencimento: String(h.vencimento || "") });
  });
  console.log("Honorarios de", refAtual, "em aberto:", doMes.length);

  // avisos ja enviados deste mes
  const urgSnap = await db.collection("urgencias").where("origem", "==", ORIGEM).get();
  const jaAvisado = {};
  urgSnap.forEach(function (d) {
    const u = d.data();
    if (String(u.referencia || "") === refAtual) jaAvisado[String(u.dest || u.cliente || "").trim().toLowerCase()] = true;
  });

  // quem ja declarou pagamento nao precisa ser cobrado
  const pagSnap = await db.collection("pagamentos").get();
  const declarou = {};
  pagSnap.forEach(function (d) {
    const p = d.data();
    if (p.status === "aguardando" && String(p.refColecao) === "honorarios") declarou[String(p.refId)] = true;
  });

  let criados = 0, pulados = 0;
  for (const h of doMes) {
    const chave = h.cliente.toLowerCase();
    if (jaAvisado[chave]) { console.log("  -", h.cliente, ": ja avisado nesta referencia - pulando."); pulados++; continue; }
    if (declarou[h.id]) { console.log("  -", h.cliente, ": ja declarou o pagamento - pulando."); pulados++; continue; }
    if (h.valor <= 0) { console.log("  -", h.cliente, ": honorario sem valor - pulando."); pulados++; continue; }

    const titulo = "Honorario de " + refAtual + " - " + money(h.valor);
    const msg =
      "Ola! O honorario de " + mesExtenso + " esta disponivel no app: " + money(h.valor) +
      (h.vencimento ? (", com vencimento em " + dataBR(h.vencimento)) : "") + ".\n\n" +
      "Pague pelo PIX - chave " + CHAVE_PIX + " (" + FAVORECIDO + ") - ou abra o app e toque em \"Copiar codigo PIX\", que ja vem com o valor certo.\n\n" +
      "Se voce ja pagou (boleto ou PIX), toque em \"Ja paguei\" no app: a cobranca some da sua tela e a APARAT confere.";

    const doc = {
      cliente: h.cliente,
      dest: h.cliente,
      titulo: titulo,
      msg: msg,
      referencia: refAtual,
      valor: h.valor,
      vencimento: h.vencimento,
      chavePix: CHAVE_PIX,
      origem: ORIGEM,
      data: new Date().toLocaleDateString("pt-BR"),
      ts: Date.now(),
      criadoEm: admin.firestore.FieldValue.serverTimestamp()
    };

    if (SIMULACAO) {
      console.log("  -", h.cliente, ": ENVIARIA ->", titulo, "| venc", dataBR(h.vencimento));
    } else {
      await db.collection("urgencias").add(doc);
      console.log("  -", h.cliente, ": aviso criado ->", titulo);
    }
    criados++;
  }

  console.log((SIMULACAO ? "[SIMULACAO] " : "") + "Resumo: " + criados + " aviso(s), " + pulados + " pulado(s).");
}

main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA GERAL:", e); process.exit(1); });
