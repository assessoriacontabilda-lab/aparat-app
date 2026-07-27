/*
 * APARAT Contabilidade - Backup semanal dos dados
 * Exporta as colecoes principais do Firestore para um arquivo JSON,
 * guardado como artefato privado do GitHub Actions (90 dias).
 */
const admin = require("firebase-admin");
const fs = require("fs");

const COLECOES = ["clientes", "honorarios", "faturamento", "obrigacoes", "obrigacoesAnuais", "solicitacoes", "urgencias", "informativos", "docs", "agenda", "notas", "recebidos", "enviosCliente", "usuarios", "dados"];

function initApp() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: segredo FIREBASE_SA_JSON nao configurado."); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

async function main() {
  initApp();
  const db = admin.firestore();
  const backup = { geradoEm: new Date().toISOString(), colecoes: {} };
  let total = 0;
  for (const c of COLECOES) {
    try {
      const snap = await db.collection(c).get();
      const docs = [];
      snap.forEach(function (d) {
        const data = d.data();
        Object.keys(data).forEach(function (k) {
          const v = data[k];
          if (v && typeof v.toDate === "function") data[k] = v.toDate().toISOString();
        });
        if (typeof data.arquivoData === "string" && data.arquivoData.length > 500000) data.arquivoData = "[arquivo grande removido do backup]";
        docs.push({ id: d.id, dados: data });
      });
      backup.colecoes[c] = docs;
      total += docs.length;
      console.log("  " + c + ": " + docs.length + " documento(s)");
    } catch (e) { console.log("  " + c + ": erro - " + (e.message || e)); }
  }
  fs.writeFileSync("backup-aparat.json", JSON.stringify(backup, null, 1));
  console.log("Backup gerado com " + total + " documentos no total.");
}
main().then(function () { process.exit(0); }).catch(function (e) { console.error("FALHA GERAL:", e); process.exit(1); });
