/*
 * APARAT Contabilidade - Robo de Faturamento automatico
 * Le extratos OFX enviados pelos clientes (colecao enviosCliente),
 * soma entradas (faturamento) e saidas (despesa) por mes, acha o cliente
 * pelo CNPJ e preenche/atualiza a aba Faturamento.
 *
 * Regra combinada com o Daniel: toda entrada = receita, toda saida = despesa.
 * So processa OFX (o PDF fica guardado, mas nao entra no calculo automatico).
 * Idempotente: marca o envio com faturadoEm e usa 1 linha por cliente+mes.
 */
const admin = require("firebase-admin");

function initApp() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: FIREBASE_SA_JSON nao configurado."); process.exit(1); }
  let sa;
  try { sa = JSON.parse(raw); } catch (e) { console.error("ERRO: FIREBASE_SA_JSON invalido."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }

// Converte valor OFX/BR em numero (aceita 1.234,56 ou 1234.56 ou -50,00)
function parseValor(v) {
  let s = String(v || "").trim();
  if (!s) return NaN;
  let neg = /^-/.test(s);
  s = s.replace(/[^\d.,]/g, "");
  if (s.indexOf(",") >= 0) { s = s.replace(/\./g, "").replace(",", "."); }
  let n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return neg ? -n : n;
}

// Extrai transacoes do OFX: [{amount, mesRef}]
function parseOFX(texto) {
  const trans = [];
  if (!texto) return trans;
  // separa por STMTTRN (funciona em OFX XML e SGML)
  const partes = texto.split(/<STMTTRN>/i).slice(1);
  for (const p of partes) {
    const mA = p.match(/<TRNAMT>\s*([-+]?[\d.,]+)/i);
    const mD = p.match(/<DTPOSTED>\s*(\d{6})/i);
    if (!mA) continue;
    const amount = parseValor(mA[1]);
    if (isNaN(amount) || amount === 0) continue;
    let mesRef = "";
    if (mD) { const d = mD[1]; mesRef = d.slice(0, 4) + "-" + d.slice(4, 6); }
    trans.push({ amount: amount, mesRef: mesRef });
  }
  return trans;
}

function fmt(n) { return (Math.round(n * 100) / 100).toFixed(2); }

async function main() {
  initApp();
  const db = admin.firestore();

  // mapa CNPJ(8 digitos) -> { nome, regime }
  const cliSnap = await db.collection("clientes").get();
  const mapaCnpj = {};
  cliSnap.forEach(function (d) {
    const x = d.data();
    const k = soDigitos(x.cnpj).slice(0, 8);
    if (k) mapaCnpj[k] = { nome: String(x.nome || "").trim(), regime: String(x.regime || "ME") };
  });
  console.log("Clientes mapeados por CNPJ:", Object.keys(mapaCnpj).length);

  // envios OFX ainda nao faturados
  const envSnap = await db.collection("enviosCliente").where("tipo", "==", "OFX").get();
  console.log("Envios OFX encontrados:", envSnap.size);

  let processados = 0;
  for (const doc of envSnap.docs) {
    const e = doc.data();
    if (e.faturadoEm) continue; // ja processado
    const cnpj8 = soDigitos(e.cliente).slice(0, 8);
    const cli = mapaCnpj[cnpj8];
    if (!cli || !cli.nome) {
      console.log("Envio", doc.id, "sem cliente correspondente (CNPJ " + cnpj8 + ") - pulando.");
      continue;
    }

    // decodifica o arquivo (base64) -> texto
    let texto = "";
    try {
      let b64 = String(e.arquivoData || "");
      const v = b64.indexOf("base64,");
      if (v >= 0) b64 = b64.slice(v + 7);
      texto = Buffer.from(b64, "base64").toString("latin1");
    } catch (err) { console.log("Envio", doc.id, "falha ao decodificar."); continue; }

    const trans = parseOFX(texto);
    if (!trans.length) { console.log("Envio", doc.id, "OFX sem transacoes legiveis."); continue; }

    // agrupa por mes
    const porMes = {};
    let mesUnico = trans.find(function (t) { return t.mesRef; });
    for (const t of trans) {
      const mes = t.mesRef || (mesUnico ? mesUnico.mesRef : "sem-data");
      if (!porMes[mes]) porMes[mes] = { fat: 0, desp: 0 };
      if (t.amount > 0) porMes[mes].fat += t.amount;
      else porMes[mes].desp += -t.amount;
    }

    for (const mes in porMes) {
      const fatv = porMes[mes].fat, despv = porMes[mes].desp;
      // 1 linha por cliente+mes: procura existente, senao cria
      const existentes = await db.collection("faturamento")
        .where("cliente", "==", cli.nome).where("mesRef", "==", mes).limit(1).get();
      const dados = {
        cliente: cli.nome,
        mesRef: mes,
        tipo: cli.regime || "ME",
        faturamento: fmt(fatv),
        despesa: fmt(despv),
        origem: "ofx-auto",
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      };
      if (!existentes.empty) {
        await existentes.docs[0].ref.set(dados, { merge: true });
        console.log("Atualizado:", cli.nome, mes, "fat=" + dados.faturamento, "desp=" + dados.despesa);
      } else {
        dados.criadoEm = admin.firestore.FieldValue.serverTimestamp();
        await db.collection("faturamento").add(dados);
        console.log("Criado:", cli.nome, mes, "fat=" + dados.faturamento, "desp=" + dados.despesa);
      }
    }

    await doc.ref.set({ faturadoEm: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    processados++;
  }

  console.log("Envios processados nesta rodada:", processados, "- Fim.");
}

main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA GERAL:", e); process.exit(1); });
