/*
 * APARAT - Planilha automatica de honorarios (Google Sheets)
 * Le os honorarios do app e reescreve a planilha do Daniel.
 * Roda de hora em hora pelo GitHub Actions.
 */
const admin = require("firebase-admin");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const SHEET_ID = "1aAAilcSTH3-d7x21L8n7Ui6nnMG6gj2vHvmptbsFzTQ";

function num(v) { v = ("" + (v == null ? "" : v)).replace(/[^0-9,.-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); return parseFloat(v) || 0; }
function mesDe(ref) { const m = String(ref || "").match(/^(\d{1,2})\s*\/\s*(\d{4})$/); return m ? m[2] + "-" + ("0" + m[1]).slice(-2) : String(ref || ""); }
function brl(n) { return (n || 0).toFixed(2).replace(".", ","); }

async function main() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: sem FIREBASE_SA_JSON."); process.exit(1); }
  const sa = JSON.parse(raw);
  console.log("Conta do robo (compartilhe a planilha com ela como EDITOR):");
  console.log("  >>> " + sa.client_email + " <<<");

  admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();
  const snap = await db.collection("honorarios").get();
  const hs = [];
  snap.forEach(d => { const h = d.data(); if (h && (h.cliente || h.valor)) hs.push(h); });
  console.log("Honorarios no app:", hs.length);

  hs.sort((a, b) => (mesDe(b.referencia) + (b.cliente || "")).localeCompare(mesDe(a.referencia) + (a.cliente || "")));
  const linhas = hs.map(h => ({
    "Cliente": h.cliente || "",
    "Referência": h.referencia || "",
    "Valor (R$)": brl(num(h.valor)),
    "Vencimento": h.vencimento || "",
    "Status": /pago/i.test(h.status || "") ? "PAGO ✔" : (h.status || "Pendente"),
    "Baixa pelo cliente": h.pagoPeloCliente ? "Sim" : "",
    "Gerado automático": h.geradoAutomatico ? "Sim" : ""
  }));

  const porCli = {};
  hs.forEach(h => {
    const n = (h.cliente || "?").trim();
    if (!porCli[n]) porCli[n] = { pago: 0, pend: 0, qtd: 0 };
    porCli[n].qtd++;
    if (/pago/i.test(h.status || "")) porCli[n].pago += (h.valorRecebido != null ? Number(h.valorRecebido) : num(h.valor));
    else porCli[n].pend += num(h.valor);
  });
  const resumoCli = Object.keys(porCli).sort().map(n => ({
    "Cliente": n, "Recebido (R$)": brl(porCli[n].pago), "Pendente (R$)": brl(porCli[n].pend), "Lançamentos": porCli[n].qtd,
    "Situação": porCli[n].pend > 0 ? "⚠ TEM PENDÊNCIA" : "✔ EM DIA"
  }));

  const porMes = {};
  hs.forEach(h => {
    const m = mesDe(h.referencia) || "sem mês";
    if (!porMes[m]) porMes[m] = { prev: 0, rec: 0 };
    porMes[m].prev += num(h.valor);
    if (/pago/i.test(h.status || "")) porMes[m].rec += (h.valorRecebido != null ? Number(h.valorRecebido) : num(h.valor));
  });
  const resumoMes = Object.keys(porMes).sort().reverse().map(m => ({
    "Mês": m, "Previsto (R$)": brl(porMes[m].prev), "Recebido (R$)": brl(porMes[m].rec), "Falta receber (R$)": brl(porMes[m].prev - porMes[m].rec)
  }));

  const jwt = new JWT({ email: sa.client_email, key: sa.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const doc = new GoogleSpreadsheet(SHEET_ID, jwt);
  try { await doc.loadInfo(); }
  catch (e) {
    console.error("NAO CONSEGUI ABRIR A PLANILHA. Compartilhe-a com o e-mail acima como Editor e rode de novo. Erro: " + (e.message || e).slice(0, 120));
    process.exit(1);
  }

  async function aba(titulo, cabecalho, dados) {
    let sh = doc.sheetsByTitle[titulo];
    if (!sh) sh = await doc.addSheet({ title: titulo, headerValues: cabecalho });
    await sh.clear();
    await sh.setHeaderRow(cabecalho);
    if (dados.length) await sh.addRows(dados);
    try { await sh.updateProperties({ gridProperties: { frozenRowCount: 1, rowCount: dados.length + 10, columnCount: cabecalho.length } }); } catch (e) {}
    console.log("  aba '" + titulo + "': " + dados.length + " linha(s)");
  }
  await aba("Honorários", ["Cliente", "Referência", "Valor (R$)", "Vencimento", "Status", "Baixa pelo cliente", "Gerado automático"], linhas);
  await aba("Resumo por Cliente", ["Cliente", "Recebido (R$)", "Pendente (R$)", "Lançamentos", "Situação"], resumoCli);
  await aba("Resumo Mensal", ["Mês", "Previsto (R$)", "Recebido (R$)", "Falta receber (R$)"], resumoMes);
  try { const s0 = doc.sheetsByIndex[0]; if (s0 && s0.title === "Página1") await s0.delete(); } catch (e) {}
  try { const s1 = doc.sheetsByIndex.find(s => s.title === "Sheet1"); if (s1) await s1.delete(); } catch (e) {}
  console.log("Planilha atualizada com sucesso: https://docs.google.com/spreadsheets/d/" + SHEET_ID);
}
main().then(() => process.exit(0)).catch(e => { console.error("FALHA:", e.message || e); process.exit(1); });
