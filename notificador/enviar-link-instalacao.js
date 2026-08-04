/* APARAT - Envia por e-mail o link de instalacao do app (roda 1 vez, manual) */
const LINK = "https://assessoriacontabilda-lab.github.io/aparat-app/instalar/";
async function main() {
  const pass = process.env.GMAIL_APP_PASS;
  const user = process.env.GMAIL_USER || "assessoriacontabil.da@gmail.com";
  if (!pass) { console.error("ERRO: GMAIL_APP_PASS nao configurado."); process.exit(1); }
  const nodemailer = require("nodemailer");
  const tp = nodemailer.createTransport({ service: "gmail", auth: { user: user, pass: pass } });
  const html = ''
    + '<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0D1A33;color:#fff;border-radius:14px;padding:26px">'
    + '<h2 style="margin:0 0 6px">📲 Link oficial de instalação do App APARAT</h2>'
    + '<p style="color:#9ab">Funciona em <b>Android</b> e <b>iPhone</b>.</p>'
    + '<p><a href="' + LINK + '" style="display:inline-block;background:#3355ff;color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:12px">ABRIR LINK DE INSTALAÇÃO</a></p>'
    + '<p style="font-size:13px;color:#9ab;word-break:break-all">' + LINK + '</p>'
    + '<hr style="border:0;border-top:1px solid #2a4a7f">'
    + '<p style="font-size:14px"><b>🤖 Android:</b> abrir o link no Chrome e tocar em INSTALAR AGORA (ou menu ⋮ → Instalar aplicativo).</p>'
    + '<p style="font-size:14px"><b>📱 iPhone:</b> abrir o link no Safari → botão Compartilhar ⬆︎ → "Adicionar à Tela de Início" → Adicionar.</p>'
    + '<p style="font-size:12px;color:#9ab">APARAT Contabilidade · Franca-SP</p>'
    + '</div>';
  const destinos = ["daniel16993542962@gmail.com", "assessoriacontabil.da@gmail.com"];
  for (const para of destinos) {
    await tp.sendMail({ from: '"APARAT Contabilidade" <' + user + '>', to: para, subject: "📲 Link de instalação do App APARAT (Android e iPhone)", html: html });
    console.log("Enviado para", para);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error("FALHA:", e.message); process.exit(1); });
