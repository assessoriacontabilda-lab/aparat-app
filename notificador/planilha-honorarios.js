/*
 * APARAT - Planilha automatica de honorarios (Google Sheets) v2
 * Painel de Clientes com bolinhas coloridas + cores automaticas + grafico.
 */
const admin = require("firebase-admin");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const SHEET_ID = "1aAAilcSTH3-d7x21L8n7Ui6nnMG6gj2vHvmptbsFzTQ";

function num(v) { v = ("" + (v == null ? "" : v)).replace(/[^0-9,.-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); return parseFloat(v) || 0; }
function mesDe(ref) { const m = String(ref || "").match(/^(\d{1,2})\s*\/\s*(\d{4})$/); return m ? m[2] + "-" + ("0" + m[1]).slice(-2) : String(ref || ""); }
function brl(n) { return (n || 0).toFixed(2).replace(".", ","); }
function nrm(t) { return String(t || "").trim().toLowerCase(); }
function hojeISO() { const s = new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }); return s.match(/\d{4}-\d{2}-\d{2}/)[0]; }
function pago(st) { return /pago/i.test(st || ""); }

async function main() {
  const raw = process.env.FIREBASE_SA_JSON;
  if (!raw) { console.error("ERRO: sem FIREBASE_SA_JSON."); process.exit(1); }
  const sa = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  const hs = []; (await db.collection("honorarios").get()).forEach(d => { const h = d.data(); if (h && (h.cliente || h.valor)) hs.push(h); });
  const clientes = []; const vistos = {};
  (await db.collection("clientes").get()).forEach(d => { const c = d.data(); const n = String(c.nome || "").trim(); if (n && !vistos[nrm(n)]) { vistos[nrm(n)] = 1; clientes.push(c); } });
  console.log("Clientes:", clientes.length, "| Honorarios:", hs.length);

  const hoje = hojeISO();
  const mesAtualISO = hoje.slice(0, 7);
  const refAtual = mesAtualISO.slice(5, 7) + "/" + mesAtualISO.slice(0, 4);

  // ---- Painel de Clientes ----
  const painel = clientes.sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map(c => {
    const meus = hs.filter(h => nrm(h.cliente) === nrm(c.nome));
    const doMes = meus.filter(h => mesDe(h.referencia) === mesAtualISO);
    let bol, sit;
    if (!doMes.length) { bol = "⚪"; sit = "FALTA EMITIR"; }
    else if (doMes.every(h => pago(h.status))) { bol = "🟢"; sit = "PAGO"; }
    else if (doMes.some(h => !pago(h.status) && String(h.vencimento || "").slice(0, 10) < hoje)) { bol = "🔴"; sit = "ATRASADO"; }
    else { bol = "🟡"; sit = "VAI PAGAR"; }
    let recAno = 0, pendTot = 0;
    meus.forEach(h => { if (pago(h.status)) recAno += (h.valorRecebido != null ? Number(h.valorRecebido) : num(h.valor)); else pendTot += num(h.valor); });
    const vMes = doMes.length ? doMes.reduce((s, h) => s + num(h.valor), 0) : num(c.honorario);
    const venc = doMes.length ? (doMes[0].vencimento || "") : "";
    return {
      "": bol, "Cliente": c.nome || "", ["Mês " + refAtual]: sit, "Valor do mês (R$)": brl(vMes), "Vencimento": venc,
      "Recebido total (R$)": brl(recAno), "Pendente total (R$)": brl(pendTot), "Honorário cadastro (R$)": brl(num(c.honorario))
    };
  });

  hs.sort((a, b) => (mesDe(b.referencia) + (b.cliente || "")).localeCompare(mesDe(a.referencia) + (a.cliente || "")));
  const linhas = hs.map(h => {
    const atras = !pago(h.status) && String(h.vencimento || "").slice(0, 10) < hoje;
    return {
      "": pago(h.status) ? "🟢" : atras ? "🔴" : "🟡",
      "Cliente": h.cliente || "", "Referência": h.referencia || "", "Valor (R$)": brl(num(h.valor)), "Vencimento": h.vencimento || "",
      "Status": pago(h.status) ? "PAGO" : atras ? "ATRASADO" : (h.status || "Pendente").toUpperCase(),
      "Baixa pelo cliente": h.pagoPeloCliente ? "Sim" : "", "Gerado automático": h.geradoAutomatico ? "Sim" : ""
    };
  });

  const porMes = {};
  hs.forEach(h => { const m = mesDe(h.referencia) || "sem mês"; if (!porMes[m]) porMes[m] = { prev: 0, rec: 0 }; porMes[m].prev += num(h.valor); if (pago(h.status)) porMes[m].rec += (h.valorRecebido != null ? Number(h.valorRecebido) : num(h.valor)); });
  const resumoMes = Object.keys(porMes).sort().map(m => ({ "Mês": m, "Previsto (R$)": Math.round(porMes[m].prev * 100) / 100, "Recebido (R$)": Math.round(porMes[m].rec * 100) / 100, "Falta (R$)": Math.round((porMes[m].prev - porMes[m].rec) * 100) / 100 }));

  const jwt = new JWT({ email: sa.client_email, key: sa.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const doc = new GoogleSpreadsheet(SHEET_ID, jwt);
  await doc.loadInfo();

  async function aba(titulo, cab, dados, indice) {
    let sh = doc.sheetsByTitle[titulo];
    if (!sh) sh = await doc.addSheet({ title: titulo, headerValues: cab, index: indice });
    await sh.clear();
    await sh.setHeaderRow(cab);
    if (dados.length) await sh.addRows(dados);
    try { await sh.updateProperties({ index: indice, gridProperties: { frozenRowCount: 1, rowCount: dados.length + 5, columnCount: cab.length } }); } catch (e) {}
    console.log("aba '" + titulo + "':", dados.length, "linha(s)");
    return sh;
  }
  const shP = await aba("Painel de Clientes", ["", "Cliente", "Mês " + refAtual, "Valor do mês (R$)", "Vencimento", "Recebido total (R$)", "Pendente total (R$)", "Honorário cadastro (R$)"], painel, 0);
  const shH = await aba("Honorários", ["", "Cliente", "Referência", "Valor (R$)", "Vencimento", "Status", "Baixa pelo cliente", "Gerado automático"], linhas, 1);
  const shM = await aba("Resumo Mensal", ["Mês", "Previsto (R$)", "Recebido (R$)", "Falta (R$)"], resumoMes, 2);
  const velha = doc.sheetsByTitle["Resumo por Cliente"]; if (velha) { try { await velha.delete(); } catch (e) {} }

  // ---- Cores e grafico via API (REST) ----
  const base = "https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID;
  const info = (await jwt.request({ url: base + "?fields=sheets(properties(sheetId,title),charts(chartId),conditionalFormats)" })).data;
  const reqs = [];
  const COR = { verde: { red: 0.72, green: 0.92, blue: 0.78 }, amarelo: { red: 1, green: 0.95, blue: 0.7 }, vermelho: { red: 0.98, green: 0.75, blue: 0.75 }, cinza: { red: 0.92, green: 0.92, blue: 0.92 }, azul: { red: 0.05, green: 0.15, blue: 0.35 } };
  for (const s of info.sheets || []) {
    const sid = s.properties.sheetId;
    const n = (s.conditionalFormats || []).length;
    for (let i = n - 1; i >= 0; i--) reqs.push({ deleteConditionalFormatRule: { sheetId: sid, index: i } });
  }
  function corSe(sid, col, texto, cor) {
    return { addConditionalFormatRule: { rule: { ranges: [{ sheetId: sid, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 }], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: '=$' + col + '2="' + texto + '"' }] }, format: { backgroundColor: cor } } }, index: 0 } };
  }
  const sidP = shP.sheetId, sidH = shH.sheetId, sidM = shM.sheetId;
  reqs.push(corSe(sidP, "C", "PAGO", COR.verde));
  reqs.push(corSe(sidP, "C", "VAI PAGAR", COR.amarelo));
  reqs.push(corSe(sidP, "C", "ATRASADO", COR.vermelho));
  reqs.push(corSe(sidP, "C", "FALTA EMITIR", COR.cinza));
  reqs.push(corSe(sidH, "F", "PAGO", COR.verde));
  reqs.push(corSe(sidH, "F", "ATRASADO", COR.vermelho));
  reqs.push({ addConditionalFormatRule: { rule: { ranges: [{ sheetId: sidH, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 }], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: '=AND($F2<>"PAGO",$F2<>"ATRASADO",$F2<>"")' }] }, format: { backgroundColor: COR.amarelo } } }, index: 0 } });
  for (const sid of [sidP, sidH, sidM]) {
    reqs.push({ repeatCell: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: COR.azul, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: "userEnteredFormat(backgroundColor,textFormat)" } });
    reqs.push({ autoResizeDimensions: { dimensions: { sheetId: sid, dimension: "COLUMNS", startIndex: 0, endIndex: 8 } } });
  }
  const temGrafico = (info.sheets || []).some(s => (s.charts || []).length > 0);
  if (!temGrafico && resumoMes.length) {
    reqs.push({ addChart: { chart: { spec: { title: "Honorários: Previsto x Recebido", basicChart: { chartType: "COLUMN", legendPosition: "BOTTOM_LEGEND", headerCount: 1, domains: [{ domain: { sourceRange: { sources: [{ sheetId: sidM, startRowIndex: 0, endRowIndex: resumoMes.length + 1, startColumnIndex: 0, endColumnIndex: 1 }] } } }], series: [{ series: { sourceRange: { sources: [{ sheetId: sidM, startRowIndex: 0, endRowIndex: resumoMes.length + 1, startColumnIndex: 1, endColumnIndex: 2 }] } }, targetAxis: "LEFT_AXIS" }, { series: { sourceRange: { sources: [{ sheetId: sidM, startRowIndex: 0, endRowIndex: resumoMes.length + 1, startColumnIndex: 2, endColumnIndex: 3 }] } }, targetAxis: "LEFT_AXIS" }] } }, position: { overlayPosition: { anchorCell: { sheetId: sidM, rowIndex: 1, columnIndex: 5 }, widthPixels: 520, heightPixels: 320 } } } } });
  }
  await jwt.request({ url: base + ":batchUpdate", method: "POST", data: { requests: reqs } });
  console.log("Cores, painel e grafico aplicados. Planilha atualizada!");
}
main().then(() => process.exit(0)).catch(e => { console.error("FALHA:", (e.response && JSON.stringify(e.response.data).slice(0, 300)) || e.message || e); process.exit(1); });
