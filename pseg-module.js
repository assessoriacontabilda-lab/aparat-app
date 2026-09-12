
/* APARAT v72 - PAINEL SEGURO DAS/PGDAS (uso exclusivo do escritorio)
   - item de menu "Sistema -> Painel Seguro DAS" (#ap-nav-pseg) e pagina #pp-pseg
   - NAO cria colecao nova: le clientes/perfilFiscal, grava em obrigCnpj
     (mesmo documento da grade Obrigacoes CNPJ -> Mensais: sigla DAS ou SIMEI)
     e usa apLancarGuia() para lancar a guia em "obrigacoes"
   - PGDAS-D transmitido = documento obrigCnpj com sigla PGDAS (nao aparece na grade)
   - fechamento da competencia = documento obrigCnpj com id FECH_AAAA-MM
   - verificador de linha digitavel de DAS (48 digitos, mod 10 / mod 11)
   - modal SEMPRE dentro de #view-painel (tema claro)                                  */
;(function(){
  if(window.__APARAT_PSEG__) return; window.__APARAT_PSEG__=1;

  var C_OB='obrigCnpj', C_PF='perfilFiscal';
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var PORTAIS={
    PGMEI:  'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao',
    ECAC:   'https://cav.receita.fazenda.gov.br/autenticacao/login',
    SIMPLES:'https://www8.receita.fazenda.gov.br/SimplesNacional/',
    DOMINIO:'https://www.dominioweb.com.br/'
  };
  var TIPO_GUIA='DAS Simples Nacional';

  var cli=[], regime={}, fone={}, cnpj={}, cOb={}, cGuias={}, carregando=false, compSel=null, filtro='pend';

  /* ================= utilitarios ================= */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function el(id){ return document.getElementById(id); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} try{ alert(m); }catch(e){} }
  function limpo(n){ return String(n||'x').replace(/[^\w.\-]+/g,'_').slice(0,80); }
  function pad(n){ return (n<10?'0':'')+n; }
  function soDig(s){ return String(s||'').replace(/\D+/g,''); }
  function moeda(v){ v=Number(v)||0; return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function cnpjFmt(c){ c=soDig(c); return c.length===14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5') : (c||'—'); }
  function hojeISO(){ var h=new Date(); return h.getFullYear()+'-'+pad(h.getMonth()+1)+'-'+pad(h.getDate()); }
  function dataBR(d){ if(!d) return '—'; var p=String(d).slice(0,10).split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : String(d); }
  function ehAdmin(){
    try{ var u=firebase.auth().currentUser; if(!u) return false;
      if(typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) return u.email===ADMIN_EMAIL; return true; }catch(e){ return false; }
  }
  function compAtual(){ var h=new Date(); var d=new Date(h.getFullYear(), h.getMonth()-1, 1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  function compMais(c,n){ var p=c.split('-'); var d=new Date(Number(p[0]), Number(p[1])-1+n, 1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  function compTxt(c){ var p=c.split('-'); return p[1]+'/'+p[0]; }
  function compNome(c){ var p=c.split('-'); return MESES[Number(p[1])-1]+'/'+p[0]; }

  /* dia util: reaproveita o modulo Obrigacoes CNPJ quando existir */
  function vencDAS(c){
    var p=c.split('-'), ano=Number(p[0]), mi=Number(p[1])-1;
    var d=new Date(ano, mi+1, 20);
    try{ if(window.__OBC__ && window.__OBC__.ajusta) d=window.__OBC__.ajusta(d,false); }
    catch(e){}
    if(!window.__OBC__){ var g=0; while((d.getDay()===0||d.getDay()===6) && g<5){ d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1); g++; } }
    return d;
  }
  function txtData(d){ return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(); }
  function isoData(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }

  function copiar(txt, msg){
    var ok=false;
    try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt); ok=true; } }catch(e){}
    if(!ok){ try{ var t=document.createElement('textarea'); t.value=txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); ok=true; }catch(e){} }
    aviso(ok ? (msg||'Copiado.') : 'Não consegui copiar automaticamente.', ok?'ok':'erro');
  }

  /* ================= verificador de DAS ================= */
  function mod10(s){
    var soma=0, peso=2;
    for(var i=s.length-1;i>=0;i--){ var p=Number(s[i])*peso; soma += p>9 ? (Math.floor(p/10)+p%10) : p; peso = peso===2?1:2; }
    return (10 - soma%10) % 10;
  }
  function mod11(s){
    var soma=0, peso=2;
    for(var i=s.length-1;i>=0;i--){ soma += Number(s[i])*peso; peso = peso===9?2:peso+1; }
    var r=soma%11;
    if(r===0||r===1) return 0; if(r===10) return 1; return 11-r;
  }
  function verificarDAS(txt){
    var bruto=String(txt||'');
    if(/br\.gov\.bcb\.pix/i.test(bruto)) return {ok:false, motivo:'Isso é um PIX copia e cola, não é DAS. A Receita Federal não cobra DAS por PIX.'};
    var d=soDig(bruto);
    if(!d.length) return {ok:false, motivo:'Cole a linha digitável da guia.'};
    if(d.length===47) return {ok:false, motivo:'Linha com 47 dígitos é boleto de banco. DAS verdadeiro tem 48 dígitos e não é boleto bancário.'};
    if(d.length===44){ /* codigo de barras puro: monta os blocos */
      var b=[]; for(var k=0;k<4;k++){ var bl=d.slice(k*11,k*11+11); b.push(bl+(d[2]>='8'?mod11(bl):mod10(bl))); } d=b.join('');
    }
    if(d.length!==48) return {ok:false, motivo:'A linha tem '+d.length+' dígitos. DAS verdadeiro tem exatamente 48.'};
    if(d[0]!=='8') return {ok:false, motivo:'Não começa com 8. Toda guia de arrecadação começa com 8.'};
    if(d[1]!=='5') return {ok:false, motivo:'O segundo dígito é '+d[1]+'. Guia federal (DAS) tem segmento 5.'};
    var metodo=d[2];
    if('6789'.indexOf(metodo)<0) return {ok:false, motivo:'O terceiro dígito ('+metodo+') não é um método de cálculo válido (6, 7, 8 ou 9).'};
    var usaM11 = (metodo==='8'||metodo==='9');
    var blocos=[], barras='';
    for(var i=0;i<4;i++){
      var bloco=d.slice(i*12,i*12+12), corpo=bloco.slice(0,11), dv=Number(bloco[11]);
      var calc = usaM11 ? mod11(corpo) : mod10(corpo);
      blocos.push({corpo:corpo, dv:dv, calc:calc, ok:dv===calc});
      barras+=corpo;
    }
    var ruins=blocos.map(function(b,i){ return b.ok?null:(i+1); }).filter(Boolean);
    if(ruins.length) return {ok:false, motivo:'Dígito verificador errado no bloco '+ruins.join(' e ')+'. Linha digitada errada ou adulterada.', blocos:blocos};
    var dvGeral=Number(barras[3]), semDV=barras.slice(0,3)+barras.slice(4);
    var calcGeral = usaM11 ? mod11(semDV) : mod10(semDV);
    if(dvGeral!==calcGeral) return {ok:false, motivo:'O dígito verificador geral não confere. Linha adulterada ou digitada errada.', blocos:blocos};
    var valor = (metodo==='6'||metodo==='8') ? Number(barras.slice(4,15))/100 : null;
    return {ok:true, valor:valor, metodo:usaM11?'módulo 11':'módulo 10', barras:barras, blocos:blocos,
            motivo:'Estrutura válida de DAS: 48 dígitos, arrecadação federal (85), dígitos verificadores corretos.'};
  }

  /* ================= carga ================= */
  async function carregar(){
    if(carregando) return; var d=db(); if(!d) return; carregando=true;
    try{
      var s=await d.collection('clientes').get(), lista=[], reg={}, fo={}, cn={};
      s.forEach(function(x){
        var o=x.data()||{}, n=String(o.nome||'').trim();
        var ativo=!o.status || !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(o.status));
        if(!n || n==='Todos os Clientes' || !ativo) return;
        lista.push(n);
        var r=String(o.regime||'');
        reg[n]= /mei|simei/i.test(r) ? 'MEI' : /presum/i.test(r) ? 'Presumido' : /real/i.test(r) ? 'Real' : (r?'Simples':'');
        fo[n]=soDig(o.whatsapp||o.telefone||o.celular||'');
        cn[n]=soDig(o.cnpj||'');
      });
      lista.sort(function(a,b){ return a.localeCompare(b); });
      cli=lista; regime=reg; fone=fo; cnpj=cn;
    }catch(e){}
    try{ /* perfil fiscal completa o regime de quem nao tem no cadastro */
      var pf=await d.collection(C_PF).get();
      pf.forEach(function(x){ var o=x.data()||{}; if(o.cliente && o.regime && !regime[o.cliente]) regime[o.cliente]=o.regime; });
    }catch(e){}
    try{
      var ob=await d.collection(C_OB).get(), novo={};
      ob.forEach(function(x){ var o=x.data()||{}; o.id=x.id; novo[x.id]=o; });
      cOb=novo;
    }catch(e){}
    try{ /* guias DAS ja lancadas (aba Guias) */
      var g=await d.collection('obrigacoes').get(), gu={};
      g.forEach(function(x){
        var o=x.data()||{};
        if(!/DAS/i.test(String(o.tipo||''))) return;
        var c=compISO(o.competencia); if(!c) return;
        gu[limpo(o.cliente)+'__'+c]={id:x.id, valor:Number(o.valor)||0, venc:o.vencimento||'', status:o.status||''};
      });
      cGuias=gu;
    }catch(e){}
    carregando=false;
  }
  /* aceita "08/2026", "2026-08", "Agosto/2026" */
  function compISO(t){
    t=String(t||'').trim(); if(!t) return null;
    var m=t.match(/^(\d{2})\/(\d{4})$/); if(m) return m[2]+'-'+m[1];
    m=t.match(/^(\d{4})-(\d{2})/); if(m) return m[1]+'-'+m[2];
    m=t.match(/^([a-zç]+)\s*\/\s*(\d{4})$/i);
    if(m){ var i=MESES.indexOf(m[1].toLowerCase()); if(i>=0) return m[2]+'-'+pad(i+1); }
    return null;
  }
  async function salvar(id,dados){
    var d=db(); if(!d) throw new Error('Sem conexão com o banco');
    dados.atualizadoEm=new Date().toISOString();
    await d.collection(C_OB).doc(id).set(dados,{merge:true});
    var at=cOb[id]||{}; Object.keys(dados).forEach(function(k){ at[k]=dados[k]; }); at.id=id; cOb[id]=at;
  }
  async function apagar(id){ var d=db(); if(!d) return; await d.collection(C_OB).doc(id).delete(); delete cOb[id]; }

  /* ================= situacao por cliente ================= */
  function tipo(n){ return regime[n]==='MEI' ? 'MEI' : 'Simples'; }
  function sigla(n){ return tipo(n)==='MEI' ? 'SIMEI' : 'DAS'; }
  function regPgdas(n,c){ return cOb[limpo(n)+'__'+c+'__PGDAS']; }
  function regDas(n,c){ return cOb[limpo(n)+'__'+c+'__'+sigla(n)]; }
  function guia(n,c){ return cGuias[limpo(n)+'__'+c]; }
  function temPgdas(n,c){ var r=regPgdas(n,c); return !!(r && r.status==='ok'); }
  function temDas(n,c){ var r=regDas(n,c); if(r && r.status==='ok') return true; return !!guia(n,c); }
  function pendente(n,c){ if(tipo(n)==='Simples' && !temPgdas(n,c)) return true; return !temDas(n,c); }
  function fechamento(c){ return cOb['FECH_'+c]; }

  /* sincroniza: guia lancada na aba Guias e obrigCnpj ainda sem "ok" -> marca ok */
  var sincronizando=false;
  async function sincronizar(c){
    if(sincronizando) return; sincronizando=true;
    try{
      for(var i=0;i<cli.length;i++){
        var n=cli[i], g=guia(n,c), r=regDas(n,c);
        if(g && !(r && r.status==='ok')){
          await salvar(limpo(n)+'__'+c+'__'+sigla(n), {cliente:n, competencia:c, sigla:sigla(n), status:'ok',
            valor:g.valor||0, origem:'Painel Seguro DAS', responsavel:'Daniel', entregaEm:hojeISO(), obs:(r&&r.obs)||'Guia lançada na aba Guias'});
        }
      }
    }catch(e){}
    sincronizando=false;
  }

  /* ================= estilo ================= */
  function css(){
    if(el('ap-pseg-css')) return;
    var s=document.createElement('style'); s.id='ap-pseg-css';
    s.textContent=
       '#pp-pseg .ps-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}'
      +'#pp-pseg .ps-comp{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:999px;padding:5px 8px}'
      +'#pp-pseg .ps-comp button{width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:transparent;color:inherit;font-size:16px;cursor:pointer}'
      +'#pp-pseg .ps-comp b{font-size:16px;min-width:150px;text-align:center}'
      +'#pp-pseg .ps-selo{font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;background:rgba(14,159,110,.16);color:#0e9f6e}'
      +'#pp-pseg .ps-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:12px}'
      +'#pp-pseg .ps-kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:11px 12px}'
      +'#pp-pseg .ps-kpi b{display:block;font-size:24px;line-height:1.1}'
      +'#pp-pseg .ps-kpi span{font-size:11.5px;color:var(--cinza)}'
      +'#pp-pseg .ps-kpi.vm b{color:#d92d20}#pp-pseg .ps-kpi.vd b{color:#0e9f6e}#pp-pseg .ps-kpi.az b{color:var(--azul-light)}'
      +'#pp-pseg .ps-filtros{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px;align-items:center}'
      +'#pp-pseg .ps-f{font-size:13px;font-weight:700;padding:8px 14px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer}'
      +'#pp-pseg .ps-f.on{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-pseg .ps-acoes{margin-left:auto;display:flex;gap:7px;flex-wrap:wrap}'
      +'#pp-pseg .ps-bt{font-size:13px;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1}'
      +'#pp-pseg .ps-bt.az{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#pp-pseg .ps-bt.vd{background:#0e9f6e;border-color:#0e9f6e;color:#fff}'
      +'#pp-pseg .ps-bt:disabled{opacity:.45;cursor:not-allowed}'
      +'#pp-pseg .ps-lista{display:flex;flex-direction:column;gap:9px}'
      +'#pp-pseg .ps-cli{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px 14px;display:grid;grid-template-columns:minmax(180px,1.4fr) 90px 1fr 1fr minmax(260px,1.8fr);gap:10px;align-items:center}'
      +'#pp-pseg .ps-cli.pend{border-left:4px solid #d92d20}#pp-pseg .ps-cli.okk{border-left:4px solid #0e9f6e}'
      +'#pp-pseg .ps-nome b{font-size:14px;display:block}#pp-pseg .ps-nome small{font-size:11.5px;color:var(--cinza)}'
      +'#pp-pseg .ps-reg{font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px;text-align:center;letter-spacing:.3px}'
      +'#pp-pseg .ps-reg.MEI{background:rgba(14,159,110,.16);color:#0e9f6e}#pp-pseg .ps-reg.Simples{background:rgba(51,85,255,.16);color:var(--azul-light)}'
      +'#pp-pseg .ps-st{font-size:12.5px;line-height:1.3}#pp-pseg .ps-st small{display:block;font-size:10.5px;color:var(--cinza)}'
      +'#pp-pseg .ps-st.ok{color:#0e9f6e;font-weight:700}#pp-pseg .ps-st.pd{color:#d92d20;font-weight:700}#pp-pseg .ps-st.na{color:var(--cinza)}'
      +'#pp-pseg .ps-btns{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}'
      +'#pp-pseg .ps-b{font-size:12px;font-weight:700;padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;line-height:1;white-space:nowrap}'
      +'#pp-pseg .ps-b.az{border-color:rgba(51,85,255,.55);color:var(--azul-light)}#pp-pseg .ps-b.vd{border-color:rgba(14,159,110,.55);color:#0e9f6e}#pp-pseg .ps-b.zap{border-color:rgba(37,211,102,.55);color:#25d366}'
      +'#pp-pseg .ps-b:disabled{opacity:.4;cursor:not-allowed}'
      +'#pp-pseg .ps-vazio{background:var(--card);border:1px dashed var(--border);border-radius:14px;padding:22px;text-align:center;color:var(--cinza);font-size:14px}'
      +'#pp-pseg .ps-nota{background:rgba(51,85,255,.1);border:1px solid rgba(51,85,255,.28);border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:1.55;margin-top:12px}'
      +'#ap-pseg-modal{position:fixed;inset:0;background:rgba(6,12,26,.66);display:flex;align-items:center;justify-content:center;z-index:99999;padding:14px}'
      +'#ap-pseg-modal .cx{position:relative;background:var(--card);border:1px solid var(--border);border-radius:18px;max-width:620px;width:100%;max-height:88vh;overflow:auto;padding:20px 18px 18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
      +'#ap-pseg-modal .x{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:transparent;color:var(--cinza);font-size:14px;cursor:pointer;line-height:1}'
      +'#ap-pseg-modal h3{margin:0 6px 4px 0;font-size:17px;padding-right:34px}'
      +'#ap-pseg-modal .h4{font-size:12px;color:var(--cinza);margin-bottom:11px}'
      +'#ap-pseg-modal label{font-size:11.5px;color:var(--cinza);display:block;margin-top:10px}'
      +'#ap-pseg-modal input[type=text],#ap-pseg-modal input[type=number],#ap-pseg-modal textarea{width:100%;margin-top:4px;font-size:14px;padding:9px 11px;border-radius:9px;border:1px solid var(--border);background:transparent;color:inherit}'
      +'#ap-pseg-modal textarea{font-family:Consolas,monospace;letter-spacing:.5px}'
      +'#ap-pseg-modal .bts{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}'
      +'#ap-pseg-modal .bt{font-size:13px;font-weight:700;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:inherit;cursor:pointer;text-decoration:none;display:inline-block}'
      +'#ap-pseg-modal .bt.az{background:var(--azul);border-color:var(--azul);color:#fff}#ap-pseg-modal .bt.vd{background:#0e9f6e;border-color:#0e9f6e;color:#fff}#ap-pseg-modal .bt.vm{border-color:rgba(217,45,32,.55);color:#d92d20}'
      +'#ap-pseg-modal .res{border-radius:12px;padding:12px 14px;margin-top:12px;font-size:13.5px;line-height:1.5}'
      +'#ap-pseg-modal .res.ok{background:rgba(14,159,110,.14);border:1px solid rgba(14,159,110,.45)}#ap-pseg-modal .res.ko{background:rgba(217,45,32,.12);border:1px solid rgba(217,45,32,.45)}'
      +'#ap-pseg-modal .res b.big{font-size:16px;display:block;margin-bottom:4px}'
      +'#ap-pseg-modal .ln{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dotted var(--border);font-size:13px}#ap-pseg-modal .ln span{color:var(--cinza)}'
      +'#ap-pseg-modal .passo{display:flex;gap:10px;padding:8px 0;border-bottom:1px dotted var(--border);font-size:13px;line-height:1.45}'
      +'#ap-pseg-modal .passo i{flex:0 0 26px;height:26px;border-radius:50%;background:var(--azul);color:#fff;font-style:normal;font-weight:800;text-align:center;line-height:26px;font-size:12px}'
      +'#ap-pseg-modal .gtab{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}#ap-pseg-modal .gtab button{font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--cinza);cursor:pointer}#ap-pseg-modal .gtab button.on{background:var(--azul);border-color:var(--azul);color:#fff}'
      +'#ap-pseg-modal .nota{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);border-radius:10px;padding:9px 12px;font-size:12.5px;margin-top:10px;line-height:1.5}'
      +'body.ap-esc-claro #ap-pseg-modal .cx{background:#fff;color:#0f172a}'
      +'@media(max-width:900px){#pp-pseg .ps-cli{grid-template-columns:1fr 1fr}#pp-pseg .ps-btns{grid-column:1/-1;justify-content:flex-start}}'
      +'@media(max-width:640px){#pp-pseg .ps-kpis{grid-template-columns:1fr 1fr}#pp-pseg .ps-cli{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  /* ================= menu e pagina ================= */
  function menu(){
    var nv=document.querySelector('#view-painel .sidebar .nav'); if(!nv || el('ap-nav-pseg')) return;
    var secs=[].slice.call(nv.querySelectorAll('.nav-sec')), ref=null;
    secs.forEach(function(s){ if(/Sistema/i.test(s.textContent||'')) ref=s; });
    var it=document.createElement('div');
    it.className='nav-item'; it.id='ap-nav-pseg';
    it.innerHTML='<span class="ni">\u{1F6E1}\u{FE0F}</span>Painel Seguro DAS<span class="nav-dot" id="dot-pseg"></span>';
    it.onclick=function(){ abrir(it); };
    if(ref && ref.parentNode) ref.parentNode.insertBefore(it, ref.nextSibling); else nv.appendChild(it);
  }
  async function abrir(item){
    try{ if(typeof pPage==='function') pPage('pseg', item); }catch(e){}
    var p=el('pp-pseg'); if(p) p.classList.add('active');
    if(!compSel) compSel=compAtual();
    render(true); await carregar(); await sincronizar(compSel); render();
  }
  function pagina(){
    if(el('pp-pseg')) return;
    var base=el('pp-obcnpj')||el('pp-extratos')||el('pp-docs'); if(!base || !base.parentNode) return;
    var p=document.createElement('div'); p.className='ppage'; p.id='pp-pseg';
    p.innerHTML='<div class="sec">\u{1F6E1}\u{FE0F} Painel Seguro DAS/PGDAS</div><div id="ps-corpo"></div>';
    base.parentNode.insertBefore(p, base.nextSibling);
  }

  /* ================= render ================= */
  function render(carregandoAinda){
    var c=el('ps-corpo'); if(!c) return;
    var cp=compSel||compAtual(), f=fechamento(cp);
    var me=cli.filter(function(n){ return tipo(n)==='Simples'; }), mei=cli.filter(function(n){ return tipo(n)==='MEI'; });
    var nPg=me.filter(function(n){ return temPgdas(n,cp); }).length;
    var nDas=cli.filter(function(n){ return temDas(n,cp); }).length;
    var nPend=cli.filter(function(n){ return pendente(n,cp); }).length;
    var lista=cli.filter(function(n){
      if(filtro==='pend') return pendente(n,cp);
      if(filtro==='mei') return tipo(n)==='MEI';
      if(filtro==='me') return tipo(n)==='Simples';
      return true;
    });
    var h='<div class="ps-top">'
      +'<div class="ps-comp"><button id="ps-ant" title="Mês anterior">\u{25C0}</button><b>'+esc(compNome(cp))+'</b><button id="ps-prox" title="Próximo mês">\u{25B6}</button></div>'
      +(f ? '<span class="ps-selo">\u{1F512} Competência fechada em '+esc(dataBR(f.fechadoEm))+'</span>' : '')
      +'<div class="ps-acoes"><button class="ps-bt" id="ps-verif">\u{1F50D} Verificador de DAS</button><button class="ps-bt" id="ps-guia">\u{1F4D6} Guia de emissão</button>'
      +(f ? '' : '<button class="ps-bt vd" id="ps-fechar" '+(nPend?'disabled title="Só libera quando todos estiverem com DAS enviado"':'')+'>\u{1F512} Fechar competência</button>')
      +'</div></div>'
      +'<div class="ps-kpis">'
      +'<div class="ps-kpi az"><b>'+cli.length+'</b><span>clientes ativos · '+mei.length+' MEI · '+me.length+' Simples</span></div>'
      +'<div class="ps-kpi"><b>'+nPg+'/'+me.length+'</b><span>PGDAS-D transmitidos (ME)</span></div>'
      +'<div class="ps-kpi vd"><b>'+nDas+'/'+cli.length+'</b><span>DAS enviados ao cliente</span></div>'
      +'<div class="ps-kpi '+(nPend?'vm':'vd')+'"><b>'+nPend+'</b><span>'+(nPend===1?'pendência':'pendências')+' · vence '+txtData(vencDAS(cp))+'</span></div>'
      +'</div>'
      +'<div class="ps-filtros">'
      +[['pend','\u{26A0}\u{FE0F} Só pendentes'],['todos','Todos'],['mei','MEI'],['me','Simples']].map(function(x){ return '<button class="ps-f'+(filtro===x[0]?' on':'')+'" data-f="'+x[0]+'">'+x[1]+'</button>'; }).join('')
      +'</div>';
    if(carregandoAinda && !cli.length) h+='<div class="ps-vazio">Carregando os clientes do app…</div>';
    else if(!lista.length) h+='<div class="ps-vazio">'+(filtro==='pend' ? '\u{2705} Nenhuma pendência nesta competência. Mês fechado!' : 'Nenhum cliente neste filtro.')+'</div>';
    else h+='<div class="ps-lista">'+lista.map(linha.bind(null,cp)).join('')+'</div>';
    h+='<div class="ps-nota"><b>Regra de ouro:</b> DAS verdadeiro tem 48 dígitos, começa com 85, não tem PIX nem QR Code de banco e vence dia 20. A Receita Federal não envia guia por e-mail nem por WhatsApp. Só é confiável a guia que <b>você</b> emite nos portais oficiais e envia pelo app.</div>';
    c.innerHTML=h;
    ligar(cp);
  }
  function linha(cp,n){
    var t=tipo(n), pg=temPgdas(n,cp), ds=temDas(n,cp), g=guia(n,cp), rp=regPgdas(n,cp), rd=regDas(n,cp), pend=pendente(n,cp);
    var stPg = t==='MEI' ? '<div class="ps-st na">— <small>MEI não tem PGDAS-D</small></div>'
             : pg ? '<div class="ps-st ok">\u{2714} Transmitido <small>'+esc(dataBR(rp.entregaEm))+(rp.protocolo?' · recibo '+esc(rp.protocolo):'')+'</small></div>'
                  : '<div class="ps-st pd">Pendente <small>transmitir no e-CAC</small></div>';
    var stDs = ds ? '<div class="ps-st ok">\u{2714} '+(g?'Enviado ao cliente':'Emitido')+' <small>'+(g&&g.valor?moeda(g.valor):(rd&&rd.valor?moeda(rd.valor):''))+(g&&g.venc?' · vence '+esc(dataBR(g.venc)):'')+'</small></div>'
             : (t==='Simples' && !pg) ? '<div class="ps-st na">Bloqueado <small>primeiro o PGDAS-D</small></div>'
             : '<div class="ps-st pd">Pendente <small>emitir e lançar a guia</small></div>';
    var portal = t==='MEI' ? '<button class="ps-b az" data-a="portal" data-p="PGMEI" data-n="'+esc(n)+'">\u{1F3DB}\u{FE0F} PGMEI</button>'
                           : '<button class="ps-b az" data-a="portal" data-p="ECAC" data-n="'+esc(n)+'">\u{1F3DB}\u{FE0F} e-CAC</button>';
    var b='<button class="ps-b" data-a="cnpj" data-n="'+esc(n)+'" title="Copiar CNPJ">\u{1F4CB} CNPJ</button>'+portal;
    if(t==='Simples') b+='<button class="ps-b '+(pg?'':'vd')+'" data-a="pgdas" data-n="'+esc(n)+'">'+(pg?'\u{270F}\u{FE0F} PGDAS-D':'\u{2714} PGDAS-D')+'</button>';
    b+='<button class="ps-b vd" data-a="guia" data-n="'+esc(n)+'" '+((t==='Simples'&&!pg)?'disabled':'')+'>'+(ds?'\u{1F4C4} Ver guia':'\u{1F4C4} Lançar guia')+'</button>';
    b+='<button class="ps-b zap" data-a="zap" data-n="'+esc(n)+'" '+(fone[n]?'':'disabled title="Sem WhatsApp no cadastro"')+'>\u{1F4AC} Zap</button>';
    return '<div class="ps-cli '+(pend?'pend':'okk')+'">'
      +'<div class="ps-nome"><b>'+esc(n)+'</b><small>'+esc(cnpjFmt(cnpj[n]))+'</small></div>'
      +'<div class="ps-reg '+t+'">'+(t==='MEI'?'MEI':'SIMPLES')+'</div>'
      +stPg+stDs
      +'<div class="ps-btns">'+b+'</div></div>';
  }

  function ligar(cp){
    var a=el('ps-ant'), p=el('ps-prox');
    if(a) a.onclick=function(){ compSel=compMais(cp,-1); render(true); carregar().then(function(){ sincronizar(compSel).then(render); }); };
    if(p) p.onclick=function(){ compSel=compMais(cp,1); render(true); carregar().then(function(){ sincronizar(compSel).then(render); }); };
    [].forEach.call(document.querySelectorAll('#pp-pseg .ps-f'),function(b){ b.onclick=function(){ filtro=b.getAttribute('data-f'); render(); }; });
    var v=el('ps-verif'); if(v) v.onclick=function(){ modalVerificador(null,cp); };
    var g=el('ps-guia'); if(g) g.onclick=modalGuia;
    var f=el('ps-fechar'); if(f) f.onclick=function(){ fecharComp(cp); };
    [].forEach.call(document.querySelectorAll('#pp-pseg .ps-b'),function(b){
      b.onclick=function(){
        var n=b.getAttribute('data-n'), ac=b.getAttribute('data-a');
        if(ac==='cnpj') copiar(cnpj[n]||'', 'CNPJ de '+n+' copiado.');
        else if(ac==='portal'){ if(cnpj[n]) copiar(cnpj[n], 'CNPJ copiado. Abrindo o portal oficial…'); window.open(PORTAIS[b.getAttribute('data-p')],'_blank','noopener'); }
        else if(ac==='pgdas') modalPgdas(n,cp);
        else if(ac==='guia') lancarGuia(n,cp);
        else if(ac==='zap') zap(n,cp);
      };
    });
  }

  /* ================= janela ================= */
  function fecharModal(){ var m=el('ap-pseg-modal'); if(m) m.remove(); }
  function modal(html){
    fecharModal();
    var m=document.createElement('div'); m.id='ap-pseg-modal';
    m.innerHTML='<div class="cx"><button class="x" id="pseg-mx">\u{2716}</button>'+html+'</div>';
    m.onclick=function(ev){ if(ev.target===m) fecharModal(); };
    (el('view-painel')||document.body).appendChild(m);
    var x=el('pseg-mx'); if(x) x.onclick=fecharModal;
    return m;
  }

  /* ---- marcar PGDAS-D ---- */
  function modalPgdas(n,cp){
    var id=limpo(n)+'__'+cp+'__PGDAS', r=cOb[id]||{};
    modal('<h3>PGDAS-D — '+esc(n)+'</h3><div class="h4">Competência '+esc(compNome(cp))+' · CNPJ '+esc(cnpjFmt(cnpj[n]))+'</div>'
      +'<div class="ln"><span>Situação</span><b>'+(r.status==='ok'?'Transmitido em '+esc(dataBR(r.entregaEm)):'Ainda não transmitido')+'</b></div>'
      +'<label>Número do recibo (opcional)</label><input type="text" id="pg-rec" value="'+esc(r.protocolo||'')+'" placeholder="ex.: 62814545202608001">'
      +'<label>Observação (opcional)</label><input type="text" id="pg-obs" value="'+esc(r.obs||'')+'">'
      +'<div class="bts"><button class="bt vd" id="pg-ok">\u{2714} Marcar como transmitido</button>'
      +'<a class="bt" href="'+PORTAIS.ECAC+'" target="_blank" rel="noopener">\u{1F3DB}\u{FE0F} Abrir e-CAC</a>'
      +(r.status==='ok'?'<button class="bt vm" id="pg-lim">\u{21A9}\u{FE0F} Desfazer</button>':'')+'</div>'
      +'<div class="nota">No e-CAC: Simples Nacional → PGDAS-D e DEFIS → Declarar/Retificar → informe a receita bruta do mês → Transmitir. Depois gere o DAS na mesma tela e lance a guia aqui no painel.</div>');
    el('pg-ok').onclick=async function(){
      this.disabled=true;
      try{ await salvar(id,{cliente:n, competencia:cp, sigla:'PGDAS', status:'ok', protocolo:el('pg-rec').value.trim(), obs:el('pg-obs').value.trim(),
                           origem:'e-CAC', responsavel:'Daniel', entregaEm:(r.entregaEm||hojeISO())});
        fecharModal(); render(); aviso('PGDAS-D de '+n+' marcado como transmitido.','ok'); }
      catch(e){ aviso('Não foi possível salvar: '+(e.message||e),'erro'); this.disabled=false; }
    };
    var l=el('pg-lim'); if(l) l.onclick=async function(){ if(!confirm('Desfazer a marcação do PGDAS-D de '+n+'?')) return; try{ await apagar(id); fecharModal(); render(); }catch(e){ aviso('Não foi possível: '+(e.message||e),'erro'); } };
  }

  /* ---- lancar guia (abre a aba Guias ja preenchida) ---- */
  function lancarGuia(n,cp){
    var g=guia(n,cp);
    if(g){ /* ja existe: mostra a ficha */
      modal('<h3>Guia DAS — '+esc(n)+'</h3><div class="h4">Competência '+esc(compNome(cp))+'</div>'
        +'<div class="ln"><span>Valor</span><b>'+moeda(g.valor)+'</b></div><div class="ln"><span>Vencimento</span><b>'+esc(dataBR(g.venc))+'</b></div><div class="ln"><span>Status no app do cliente</span><b>'+esc(g.status||'—')+'</b></div>'
        +'<div class="bts"><button class="bt az" id="gu-ver">\u{1F4CB} Abrir na aba Guias</button><button class="bt" id="gu-zap">\u{1F4AC} Avisar no WhatsApp</button><button class="bt" id="gu-chk">\u{1F50D} Conferir linha digitável</button></div>');
      el('gu-ver').onclick=function(){ fecharModal(); if(typeof window.apLancarGuia==='function') window.apLancarGuia(n,'','', 'Guia de '+n+' já lançada — veja a lista abaixo do formulário.'); };
      el('gu-zap').onclick=function(){ fecharModal(); zap(n,cp); };
      el('gu-chk').onclick=function(){ modalVerificador(n,cp); };
      return;
    }
    modal('<h3>Lançar guia DAS — '+esc(n)+'</h3><div class="h4">Competência '+esc(compNome(cp))+' · vencimento '+txtData(vencDAS(cp))+'</div>'
      +'<label>Cole a linha digitável do DAS (opcional — o valor é lido dela)</label><textarea id="lg-lin" rows="2" placeholder="8580 0000 0…"></textarea>'
      +'<div id="lg-res"></div>'
      +'<label>Valor da guia (R$)</label><input type="number" step="0.01" id="lg-val" placeholder="0,00">'
      +'<div class="bts"><button class="bt az" id="lg-ok">\u{1F4C4} Abrir a aba Guias preenchida</button></div>'
      +'<div class="nota">O formulário da aba Guias vai abrir com cliente, tipo, competência e vencimento já preenchidos. Confira e clique em salvar lá — a guia chega ao app do cliente na hora, e este painel marca o DAS como emitido.</div>');
    var ta=el('lg-lin');
    ta.oninput=function(){
      var d=soDig(ta.value); var r=el('lg-res'); if(d.length<44){ r.innerHTML=''; return; }
      var v=verificarDAS(ta.value);
      r.innerHTML='<div class="res '+(v.ok?'ok':'ko')+'">'+(v.ok?'\u{2705} ':'\u{274C} ')+esc(v.motivo)+(v.ok&&v.valor!=null?' Valor: <b>'+moeda(v.valor)+'</b>':'')+'</div>';
      if(v.ok && v.valor!=null) el('lg-val').value=v.valor.toFixed(2);
    };
    el('lg-ok').onclick=function(){
      var val=el('lg-val').value; fecharModal();
      if(typeof window.apLancarGuia!=='function'){ aviso('A função de lançar guia não carregou. Use a aba Guias.','erro'); return; }
      window.apLancarGuia(n, TIPO_GUIA, val, '\u{1F4CB} Lançando o DAS de '+n+' — competência '+compNome(cp)+'. Confira e salve.');
      setTimeout(function(){
        try{
          var v=el('ob-venc'); if(v) v.value=isoData(vencDAS(cp));
          var c2=el('ob-comp'); if(c2) c2.value=compTxt(cp);
          var s=el('ob-status'); if(s) s.value='A Pagar';
        }catch(e){}
      },1400);
    };
  }

  /* ---- WhatsApp ---- */
  function zap(n,cp){
    var f=fone[n]; if(!f){ aviso('Cliente sem WhatsApp no cadastro.','erro'); return; }
    if(f.length<=11) f='55'+f;
    var g=guia(n,cp), primeiro=n.split(' ')[0];
    var msg = g
      ? 'Olá, '+n+'! Aqui é o Daniel, da APARAT Contabilidade.\nA guia DAS da competência '+compTxt(cp)+' já está no seu app APARAT, na aba Minhas Guias. Valor: '+moeda(g.valor)+'. Vencimento: '+dataBR(g.venc||isoData(vencDAS(cp)))+'.\nImportante: a Receita Federal não envia guia por e-mail nem por WhatsApp. Pague somente a guia que está no app. Se receber qualquer outra, me chame antes de pagar.'
      : 'Olá, '+n+'! Aqui é o Daniel, da APARAT Contabilidade.\nEstou emitindo a sua guia DAS da competência '+compTxt(cp)+' (vencimento '+txtData(vencDAS(cp))+'). Assim que estiver no app APARAT eu te aviso.\nLembrete: a Receita Federal não envia guia por e-mail nem por WhatsApp. Pague somente a guia que estiver no app.';
    window.open('https://wa.me/'+f+'?text='+encodeURIComponent(msg),'_blank','noopener');
  }

  /* ---- fechar competencia ---- */
  async function fecharComp(cp){
    var pend=cli.filter(function(n){ return pendente(n,cp); }).length;
    if(pend){ aviso('Ainda há '+pend+' pendência(s). Feche só quando tudo estiver verde.','erro'); return; }
    if(!confirm('Fechar a competência '+compNome(cp)+'? Fica registrado data e hora, com '+cli.length+' cliente(s) atendidos.')) return;
    try{
      await salvar('FECH_'+cp,{tipo:'fechamento', competencia:cp, sigla:'FECH', status:'ok', clientes:cli.length, fechadoEm:new Date().toISOString(), responsavel:'Daniel'});
      render(); aviso('Competência '+compNome(cp)+' fechada.','ok');
    }catch(e){ aviso('Não foi possível fechar: '+(e.message||e),'erro'); }
  }

  /* ---- verificador ---- */
  function modalVerificador(n,cp){
    modal('<h3>\u{1F50D} Verificador de DAS</h3><div class="h4">'+(n?'Cliente '+esc(n)+' · competência '+esc(compNome(cp)):'Cole a linha digitável de qualquer guia recebida')+'</div>'
      +'<textarea id="vf-lin" rows="3" placeholder="Cole aqui a linha digitável (48 dígitos)…"></textarea>'
      +'<div class="bts"><button class="bt az" id="vf-ok">Conferir</button><button class="bt" id="vf-lim">Limpar</button></div>'
      +'<div id="vf-res"></div>'
      +'<div class="nota"><b>O que este verificador prova:</b> que a estrutura é de guia de arrecadação federal e que os dígitos verificadores fecham. <b>O que não prova:</b> ele não consulta a Receita. Compare sempre o valor e o CNPJ com o PGDAS-D ou o PGMEI.</div>');
    function rodar(){
      var v=verificarDAS(el('vf-lin').value), r=el('vf-res'), extra='';
      if(v.ok){
        if(v.valor!=null){
          extra+='<div class="ln"><span>Valor embutido</span><b>'+moeda(v.valor)+'</b></div>';
          if(n){ var g=guia(n,cp);
            if(g && g.valor) extra+='<div class="ln"><span>Guia lançada no app</span><b>'+moeda(g.valor)+' — '+(Math.abs(g.valor-v.valor)<0.005?'\u{2705} confere':'\u{26A0}\u{FE0F} valor diferente')+'</b></div>';
            else extra+='<div class="ln"><span>Guia lançada no app</span><b>nenhuma ainda</b></div>'; }
        }
        extra+='<div class="ln"><span>Método</span><b>'+esc(v.metodo)+'</b></div><div class="ln"><span>Código de barras</span><b style="font-family:monospace;font-size:12px">'+esc(v.barras)+'</b></div>';
      }
      r.innerHTML='<div class="res '+(v.ok?'ok':'ko')+'"><b class="big">'+(v.ok?'\u{2705} Estrutura válida de DAS':'\u{274C} Reprovado')+'</b>'+esc(v.motivo)+extra+'</div>';
    }
    el('vf-ok').onclick=rodar;
    el('vf-lin').oninput=function(){ if(soDig(this.value).length>=44) rodar(); };
    el('vf-lim').onclick=function(){ el('vf-lin').value=''; el('vf-res').innerHTML=''; };
  }

  /* ---- guia de emissao ---- */
  function modalGuia(){
    var G={
      pgmei:{t:'PGMEI — DAS do MEI', url:PORTAIS.PGMEI, p:[
        'Clique em Acessar. Digite o CNPJ do cliente (use o botão CNPJ do painel para copiar) e o código de segurança.',
        'Menu Emitir Guia de Pagamento (DAS) → escolha o ano-calendário → marque o mês da competência → Apurar/Gerar DAS.',
        'Baixe o PDF. Confira: 48 dígitos começando com 85, valor e vencimento dia 20.',
        'Volte ao painel → Lançar guia → cole a linha digitável → abra a aba Guias e salve. O cliente recebe no app.']},
      ecac:{t:'e-CAC — PGDAS-D e DAS da ME', url:PORTAIS.ECAC, p:[
        'Entre com o seu certificado digital ou gov.br. Em Alterar perfil de acesso, escolha Procurador de pessoa jurídica e cole o CNPJ do cliente.',
        'Simples Nacional → PGDAS-D e DEFIS → Declarar/Retificar → período de apuração → informe a receita bruta por atividade → Transmitir.',
        'Guarde o número do recibo e marque PGDAS-D aqui no painel (campo recibo).',
        'Na mesma tela, Gerar DAS → baixe o PDF → volte ao painel → Lançar guia.']},
      dominio:{t:'Domínio Web — cliente com certificado A1', url:PORTAIS.DOMINIO, p:[
        'Escrita Fiscal → importe as notas do mês (SIEG Hub) e confira o faturamento.',
        'Simples Nacional → Apuração → gere a declaração e transmita pelo certificado do cliente.',
        'Emita o DAS pelo próprio Domínio, baixe o PDF e confira os 48 dígitos.',
        'Volte ao painel: marque PGDAS-D e clique em Lançar guia.']}
    };
    var at='pgmei';
    function html(){
      var g=G[at];
      return '<h3>\u{1F4D6} Guia de emissão</h3><div class="h4">Roteiro curto para você e para quem for te ajudar no escritório</div>'
        +'<div class="gtab">'+Object.keys(G).map(function(k){ return '<button data-g="'+k+'" class="'+(k===at?'on':'')+'">'+esc(G[k].t.split(' — ')[0])+'</button>'; }).join('')+'</div>'
        +'<b style="font-size:14px">'+esc(g.t)+'</b>'
        +g.p.map(function(x,i){ return '<div class="passo"><i>'+(i+1)+'</i><div>'+esc(x)+'</div></div>'; }).join('')
        +'<div class="bts"><a class="bt az" href="'+g.url+'" target="_blank" rel="noopener">\u{1F3DB}\u{FE0F} Acessar '+esc(g.t.split(' — ')[0])+'</a></div>'
        +'<div class="nota">Os endereços são fixos no código do app. Se um portal abrir em endereço que não termina em <b>.gov.br</b> (ou dominioweb.com.br), feche e me avise.</div>';
    }
    var m=modal(html());
    function liga(){ [].forEach.call(m.querySelectorAll('.gtab button'),function(b){ b.onclick=function(){ at=b.getAttribute('data-g'); m.querySelector('.cx').innerHTML='<button class="x" id="pseg-mx">\u{2716}</button>'+html(); el('pseg-mx').onclick=fecharModal; liga(); }; }); }
    liga();
  }

  /* ================= bolinha de pendencias ================= */
  function pintarPonto(){
    var d=el('dot-pseg'); if(!d) return;
    var cp=compSel||compAtual(); var n=cli.filter(function(x){ return pendente(x,cp); }).length;
    var h=new Date(), venc=vencDAS(cp), perto=(venc-h)<7*86400000;
    d.style.display = (n && perto && !fechamento(cp)) ? '' : 'none';
  }

  /* ================= relogio ================= */
  var ocupado=false, voltas=0;
  async function tick(){
    if(ocupado) return; ocupado=true; voltas++;
    try{
      css();
      var painel=el('view-painel');
      if(painel && painel.classList.contains('active') && ehAdmin()){
        menu(); pagina();
        if(voltas===1 || voltas%12===0){
          await carregar();
          if(el('pp-pseg') && el('pp-pseg').classList.contains('active')){ await sincronizar(compSel||compAtual()); render(); }
          else pintarPonto();
        }
      }
    }catch(e){}
    ocupado=false;
  }
  [2200,4800,9500].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,7000);

  window.__PSEG__={verificarDAS:verificarDAS, mod10:mod10, mod11:mod11, vencDAS:vencDAS, render:render, carregar:carregar, compISO:compISO};
})();
