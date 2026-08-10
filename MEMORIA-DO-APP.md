# MEMÓRIA TÉCNICA DO APP APARAT (para agentes de IA)

> Leia este arquivo ANTES de qualquer alteração. Ele substitui a releitura do histórico de conversas.
> Última atualização: 08/08/2026 (v43).

## O QUE É
PWA da APARAT Contabilidade (Daniel de Andrade Silva, Franca-SP, tel 16-98869-9203).
- App: https://assessoriacontabilda-lab.github.io/aparat-app/
- Link OFICIAL de instalação (Android e iPhone): https://assessoriacontabilda-lab.github.io/aparat-app/instalar/
- Repo: github.com/assessoriacontabilda-lab/aparat-app (branch main, GitHub Pages)
- Firebase projeto `aparat-contabilidade` (Firestore compat, Auth, FCM)
- Admin: assessoriacontabil.da@gmail.com · Conta Google pessoal/agenda: daniel16993542962@gmail.com
- PIX APARAT: chave e140ad9c-8e55-4fa4-853c-ebbc3a18c3c3 · Favorecido APARAT CONTABILIDADE LTDA

## COMO PUBLICAR (git push é BLOQUEADO por proxy)
1. Editar arquivo localmente (clonar repo, `git fetch && git reset --hard origin/main` antes!).
2. Upload pelo Chrome do Daniel (extensão Claude-in-Chrome): navegar
   `github.com/assessoriacontabilda-lab/aparat-app/upload/main[/pasta]`,
   find "file input for upload" → file_upload → JS: preencher input[name="message"] via native setter
   e clicar botão /Confirmar alterações|Commit changes/.
3. Trocar versão de script: criar workflow `.github/workflows/bump-*.yml` com
   `on: push: paths: [próprio arquivo]` que python-edita o index.html e commita (padrão já usado 20+ vezes).
4. Verificar: `git fetch origin && git show origin/main:arquivo`.
CUIDADO: conferir o cwd antes de `cat >>` (já quase subiu arquivo de 755 bytes no lugar do completo).
Se a extensão do Chrome não conectar: Daniel precisa abrir o Chrome e o painel da extensão pode estar deslogado (botão "Fazer login").

## VERSÕES ATUAIS (index.html carrega)
- aparat-fix.js?v=43 · nav-snippet.js?v=6 · client-pages.js?v=4
- sw.js ÚNICO (CACHE 'aparat-v41'): fetch network-first no-store + Firebase messaging.
  NUNCA registrar firebase-messaging-sw.js (2 SWs no mesmo escopo quebrou a instalação no passado).
  index usa `navigator.serviceWorker.ready` no initPush.

## LAYOUT DO CLIENTE (v41-43): QUADRADINHOS
Módulo `__APARAT_TILES__` (aparat-fix.js): home = 8 quadradinhos (grid 3col, estilo neutro azul-escuro):
hon(sec-hon), obr(sec-obr, "Minhas Guias"), fat(sec-fat, "Faturamento"), avisos(ap-blk-avisos+sec-inf),
dados(sec-dados+sec-docs+sec-doc), nota(sec-notas), extrato(ap-blk-arq), falar(ap-blk-falar).
- Página abre NO LUGAR (marca .ap-alvo + data-aphide nos irmãos; NADA é movido do view-cliente — mover quebra CSS).
- Cabeçalho #ap-pg-top: seta SVG grossa neon ← + título + nome cliente + logo A.
- Bolinhas vermelhas de novidade por contagem (localStorage apSeen2_<cliente>_tile_<k>).
- ap-blk-* são wrappers criados dividindo o .fbox-light do sec-sol pelos títulos .asec2.
- `__APARAT_PIX2__`: cartão PIX + botão copiar dentro do sec-hon.
- `__APARAT_FATFIX__`: renomeia #ap-financeiro→off (o módulo antigo de client-pages roubava o cli-fat) e devolve cli-fat ao sec-fat. Seletor "Ver mês" (#cli-fat-mes) permite ver meses antigos.
- `__APARAT_BOT2__`: assistente virtual ensina o layout novo (chip "❓ Como usar o app").
- `__APARAT_SECVAZIA__`: esconde seções vazias (texto "Nenhum...") sem formulário.
- Outros módulos ativos (flags __APARAT_*__): OBRIG_CONT, INAD, BAIXA, PIX, XLS, INSTALL, CAL2 (calendário FAB), CLIEDIT (editar cliente + renomear em cascata), PROXVENC (card próximo vencimento), WAFLUT/ap-wa-flut2 (WhatsApp), NOMES, ABADOT.

## ARMADILHAS CONHECIDAS
- IDs DUPLICADOS: form admin usa ids cli-* (cli-hon era duplicado → lista do cliente virou cli-hon-lista). Painel admin (pp-*) existe no DOM para todos.
- Fórmulas Google Sheets: locale pt-BR rejeita vírgula/AND em CUSTOM_FORMULA — usar fórmula simples '=$C2="PAGO"'.
- Redimensionar aba (resize) ANTES de setHeaderRow; 1º cabeçalho "●" (vazio some).
- referencia de honorário aceita "08/2026", "2026-08" E "Agosto/2026" (parser MESES_NOME).
- beforeinstallprompt não dispara em desktop automatizado — testar instalação no celular.
- Firebase console: inputs de hora precisam de native value setter.

## ROBÔS (GitHub Actions, notificador/, todos usam segredo FIREBASE_SA_JSON; SIMULACAO=1 = teste)
- enviar.js: carteiro a cada 5 min (push/WhatsApp/email dos docs novos).
- gerar-honorarios.js: dia 1º; copia último honorário; sem histórico → usa valor do cadastro.
- alerta-inadimplencia.js: dias úteis 9h. · backup.js: domingos (artifact 90d).
- lembretes-agenda.js: 7h30 (lembra agendamentos do dia).
- agenda-google.js: a cada 15 min sincroniza collection `agenda` → Google Agenda do daniel16993542962@gmail.com (compartilhada com firebase-adminsdk-fbsvc@aparat-contabilidade.iam.gserviceaccount.com; grava googleEventId no doc).
- planilha-honorarios.js: de hora em hora 8h-20h → planilha Google ID 1aAAilcSTH3-d7x21L8n7Ui6nnMG6gj2vHvmptbsFzTQ (abas Honorários + Painel de Clientes com cores; NÃO editar a planilha à mão, o app é o dono).
Segredos GitHub: FIREBASE_SA_JSON, CALLMEBOT_KEY/PHONE, GMAIL_USER (daniel16993542962@gmail.com), GMAIL_APP_PASS.
Executar workflow manual: Actions → workflow → "Run workflow" (2 cliques: dropdown ~x1276,y310 e botão verde).

## FIRESTORE (coleções e campos principais)
clientes{nome,cnpj,honorario,dia,regime,status}, honorarios{cliente,referencia,valor,vencimento,status,geradoAutomatico},
obrigacoes{cliente,tipo,valor,vencimento,status}, faturamento{cliente,mesRef,faturamento,despesa},
agenda{cliente,tipo,data,hora,desc,googleEventId}, agendaTipos, urgencias{dest|cliente|publico},
docs, notas, solicitacoes, usuarios{clienteNome,role}, tokens.
~22 clientes reais. Renomear cliente → usar o cadastro (CLIEDIT propaga em cascata).
Truque admin: abrir o app no Chrome do Daniel logado como admin, esperar 4s → `auth` e `fdb` são identificadores diretos (não window.*) para consultas/updates.

## REGRAS DO DANIEL
PT-BR sem erros de ortografia; cálculos corretos; MOSTRAR PRÉVIA antes de publicar mudanças visuais;
letras grandes (comandos ≥16px); layout limpo; logo A em destaque; nunca apagar dados sem autorização;
nunca digitar senhas/chaves (Daniel cola os VALORES dos segredos).
