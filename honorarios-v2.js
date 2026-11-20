/* ===== APARAT · Honorários v2 (honorarios-v2.js) — 20/11/2026 =====
   PAINEL (admin), aba #pp-honorarios:
   - placar (recebido / a receber / em atraso / total) + barra do mês
   - caixa 1: "Cliente avisou que pagou" = a caixa #ap-pgadm-honorario do modulo __APARAT_PAGOU__,
     movida para dentro do layout. Aviso de honorario que ja esta Pago fecha sozinho.
   - caixa 2: em atraso por cliente (todos os meses) com Cobrar (WhatsApp + PIX) e Recebi
   - caixa 3: a vencer no mes · caixa 4: conferir (sem honorario no mes, duplicado, referencia fora do padrao)
   - caixa 5: recebidos · grafico do ano · historico por cliente (editar/excluir) · lancar avulso
   - a tabela antiga (#hon-tbody) e o formulario antigo ficam NO DOM, so escondidos:
     ficha-cliente.js e outros modulos ainda leem esses elementos.
   CLIENTE, cartao #ap-cobra (__APARAT_COBRA__):
   - o QR do honorario fica atras do botao "Pagar agora com PIX". O toque mostra o QR e ja grava
     a declaracao em `pagamentos` (status aguardando, forma pix, viaQR:true) -> push para o escritorio.
     NAO marca Pago: quem da baixa e o Daniel (o toque nao prova que o dinheiro entrou). */
;(function(){
  if(window.__HONV2__) return;
  window.__HONV2__={versao:1};

  var CHAVE='e140ad9c-8e55-4fa4-853c-ebbc3a18c3c3', FAVORECIDO='APARAT CONTABILIDADE LTDA', CIDADE='FRANCA';
  var MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var MABR=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  var H=[], C=[], MES=null, HCLI='', assinado=false, tCli=0, assinatura='', fechados={};

  /* ---------------- utilitarios ---------------- */
  function el(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function db(){ try{ if(typeof fdb!=='undefined' && fdb) return fdb; if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore(); }catch(e){} return null; }
  function aviso(m,t){ try{ if(typeof notif==='function'){ notif(m,t); return; } }catch(e){} }
  function p2(n){ return ('0'+n).slice(-2); }
  function hojeISO(){ var d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function dataBR(v){ var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]+'/'+m[1]):String(v||''); }
  function num(v){ if(typeof v==='number') return v; v=(''+(v==null?'':v)).replace(/[^0-9,.-]/g,''); if(v.indexOf(',')>-1) v=v.replace(/\./g,'').replace(',','.'); return parseFloat(v)||0; }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function pago(h){ return /pago|quitad|baixad|recebid/i.test(String(h&&h.status||'')); }
  function recebido(h){ var r=h.valorRecebido; return (r!=null && r!=='' && !isNaN(Number(r))) ? Number(r) : num(h.valor); }
  function dias(iso){ var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return 0;
    var a=new Date(+m[1],+m[2]-1,+m[3]), h=new Date(); h=new Date(h.getFullYear(),h.getMonth(),h.getDate()); return Math.round((h-a)/86400000); }
  function sem(s){ s=String(s||''); try{ s=s.normalize('NFD').replace(/[̀-ͯ]/g,''); }catch(e){} return s.toLowerCase(); }
  function soAZ(s){ return sem(s).toUpperCase().replace(/[^A-Z0-9]/g,''); }
  function soDig(s){ return String(s||'').replace(/\D+/g,''); }
  function ehAdmin(){ try{ var u=firebase.auth().currentUser; if(!u) return false; return (typeof ADMIN_EMAIL!=='undefined' && ADMIN_EMAIL) ? u.email===ADMIN_EMAIL : false; }catch(e){ return false; } }
  function serverTs(){ try{ return firebase.firestore.FieldValue.serverTimestamp(); }catch(e){ return new Date(); } }
  function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

  /* competencia AAAA-MM a partir da referencia ("11/2026", "Novembro/2026", "Nov/2026") ou do vencimento */
  function compDe(h){
    var r=String(h.referencia||'').trim(), m=r.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{4})$/);
    if(m && +m[1]>=1 && +m[1]<=12) return m[2]+'-'+p2(+m[1]);
    m=sem(r).match(/^([a-zç]+)\s*[\/\- ]\s*(?:de\s+)?(\d{4})$/);
    if(m){ for(var i=0;i<12;i++){ if(sem(MESES[i]).indexOf(m[1].slice(0,3))===0) return m[2]+'-'+p2(i+1); } }
    var v=String(h.vencimento||'').match(/^(\d{4})-(\d{2})/); return v ? v[1]+'-'+v[2] : '';
  }
  function padrao(h){ return /^\d{2}\/\d{4}$/.test(String(h.referencia||'').trim()); }
  function compTxt(c){ var p=String(c).split('-'); return p.length===2 ? p[1]+'/'+p[0] : String(c); }
  function compNome(c){ var p=String(c).split('-'); return (MESES[+p[1]-1]||'')+' / '+p[0]; }
  function compMais(c,n){ var p=c.split('-'); var d=new Date(+p[0], +p[1]-1+n, 1); return d.getFullYear()+'-'+p2(d.getMonth()+1); }
  function compHoje(){ return hojeISO().slice(0,7); }
  function curto(n){ n=String(n||'').replace(/^\d{2}\.\d{3}\.\d{3}\s+/,'').replace(/\s+\d{11}$/,'').replace(/^CONTRATADA:\s*/i,'').trim(); return n.length>26 ? n.slice(0,25)+'…' : n; }
  function listaMeses(cs){ cs=cs.map(compTxt); if(cs.length<2) return cs.join(''); return cs.slice(0,-1).join(', ')+' e '+cs[cs.length-1]; }

  /* ---------------- PIX copia e cola (mesma regra do cartao do cliente) ---------------- */
  function tlv(id,v){ v=String(v); return id+p2(v.length>99?99:v.length)+v; }
  function crc16(t){ var c=0xFFFF; for(var i=0;i<t.length;i++){ c^=(t.charCodeAt(i)&0xFF)<<8; for(var j=0;j<8;j++){ c=(c&0x8000)?(((c<<1)^0x1021)&0xFFFF):((c<<1)&0xFFFF); } } var h=c.toString(16).toUpperCase(); while(h.length<4) h='0'+h; return h; }
  function pix(valor, txid){
    var p=tlv('00','01')+tlv('26',tlv('00','br.gov.bcb.pix')+tlv('01',CHAVE))+tlv('52','0000')+tlv('53','986');
    if(valor>0) p+=tlv('54',(Math.round(valor*100)/100).toFixed(2));
    p+=tlv('58','BR')+tlv('59',FAVORECIDO.slice(0,25))+tlv('60',CIDADE)+tlv('62',tlv('05',(txid||'APARAT').slice(0,25)))+'6304';
    return p+crc16(p);
  }
  function qrImg(txt, tam){ try{ if(!window.qrcode) return ''; var q=window.qrcode(0,'M'); q.addData(txt); q.make(); return q.createDataURL(tam||4,2); }catch(e){ return ''; } }
  function carregarQr(cb){
    if(window.qrcode){ if(cb) cb(); return; }
    var s=document.createElement('script');
    var base='qrcode-gen.js?v=1';
    try{ var s0=document.querySelector('script[src*="aparat-fix.js"]'); if(s0&&s0.src) base=s0.src.replace(/aparat-fix\.js.*$/,'qrcode-gen.js?v=1'); }catch(e){}
    s.src=base; s.onload=function(){ if(cb) cb(); }; document.head.appendChild(s);
  }
  function copiar(txt, ok){
    function manual(){ try{ var t=document.createElement('textarea'); t.value=txt; t.style.cssText='position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); ok&&ok(); }catch(e){} }
    try{ navigator.clipboard.writeText(txt).then(function(){ ok&&ok(); }, manual); }catch(e){ manual(); }
  }

  /* ---------------- CSS ---------------- */
  function css(){
    if(el('hv2-css')) return;
    var s=document.createElement('style'); s.id='hv2-css';
    s.textContent=''
    +'.hv2-oculto{display:none!important}'
    +'#hv2{margin-bottom:16px}'
    +'#hv2 .cab{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 12px}'
    +'#hv2 .cab h2{margin:0;font-size:19px}'
    +'#hv2 .mes{display:flex;align-items:center;gap:6px;margin-left:auto}'
    +'#hv2 .mes b{background:rgba(0,0,0,.25);border:1px solid var(--border,#222248);border-radius:9px;padding:7px 14px;font-size:13px;min-width:150px;text-align:center}'
    +'#hv2 .b,#hv2-modal .b{border:0;border-radius:9px;padding:8px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;color:#fff;background:#3355ff}'
    +'#hv2 .b:disabled,#hv2-modal .b:disabled{opacity:.55;cursor:default}'
    +'#hv2 .b.vd,#hv2-modal .b.vd{background:#16a34a}#hv2 .b.wa,#hv2-modal .b.wa{background:#1fa855}'
    +'#hv2 .b.gh,#hv2-modal .b.gh{background:transparent;border:1px solid var(--border,#222248);color:inherit}'
    +'#hv2 .b.vm,#hv2-modal .b.vm{background:transparent;border:1px solid rgba(239,68,68,.55);color:#ef4444}'
    +'#hv2 .b.mini{padding:5px 9px;font-size:11px}'
    +'#hv2 .placar{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}'
    +'#hv2 .t{border-radius:12px;padding:11px 8px;text-align:center;border:1px solid}'
    +'#hv2 .t small{display:block;font-size:10px;color:var(--cinza,#9090b8);text-transform:uppercase;letter-spacing:.04em}'
    +'#hv2 .t b{display:block;font-size:19px;margin:3px 0}#hv2 .t i{font-style:normal;font-size:10.5px;color:var(--cinza,#9090b8)}'
    +'#hv2 .t.v{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.3)}#hv2 .t.v b{color:#22c55e}'
    +'#hv2 .t.l{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.3)}#hv2 .t.l b{color:#f59e0b}'
    +'#hv2 .t.r{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.35)}#hv2 .t.r b{color:#ef4444}'
    +'#hv2 .t.a{background:rgba(51,85,255,.08);border-color:rgba(51,85,255,.3)}#hv2 .t.a b{color:#7fa0ff}'
    +'#hv2 .barra{margin:11px 0 4px;background:rgba(127,127,170,.18);border-radius:20px;height:11px;overflow:hidden}'
    +'#hv2 .barra div{height:100%;background:linear-gradient(90deg,#16a34a,#22c55e);border-radius:20px}'
    +'#hv2 .barra-tx{font-size:11px;color:var(--cinza,#9090b8);margin-bottom:14px}'
    +'#hv2 .cx{border-radius:14px;border:1px solid var(--border,#222248);background:var(--card,#12122a);margin-bottom:13px;overflow:hidden}'
    +'#hv2 .cx>h3{margin:0;font-size:14px;padding:11px 14px;display:flex;align-items:center;gap:8px}'
    +'#hv2 .cx>h3 .n{margin-left:auto;font-size:11px;border-radius:20px;padding:3px 10px;font-weight:800;color:#fff}'
    +'#hv2 .cx .ds{font-size:11px;color:var(--cinza,#9090b8);padding:2px 14px 8px}'
    +'#hv2 .cx.vm{border-color:rgba(239,68,68,.45)}#hv2 .cx.vm>h3{background:rgba(239,68,68,.1)}#hv2 .cx.vm .n{background:#ef4444}'
    +'#hv2 .cx.lj{border-color:rgba(245,158,11,.45)}#hv2 .cx.lj>h3{background:rgba(245,158,11,.1)}#hv2 .cx.lj .n{background:#f59e0b;color:#111}'
    +'#hv2 .cx.vd{border-color:rgba(34,197,94,.4)}#hv2 .cx.vd>h3{background:rgba(34,197,94,.08)}#hv2 .cx.vd .n{background:#16a34a}'
    +'#hv2 .cx.rx{border-color:rgba(167,139,250,.45)}#hv2 .cx.rx>h3{background:rgba(167,139,250,.1)}#hv2 .cx.rx .n{background:#8b5cf6}'
    +'#hv2 .cx .vazio{padding:4px 14px 13px;font-size:12px;color:var(--cinza,#9090b8)}'
    +'#hv2 .ln{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid rgba(127,127,170,.14)}'
    +'#hv2 .ln .nm{flex:1;min-width:170px}#hv2 .ln .nm b{display:block;font-size:13px}#hv2 .ln .nm span{font-size:11px;color:var(--cinza,#9090b8)}'
    +'#hv2 .vl{font-weight:800;font-size:14px;min-width:92px;text-align:right}'
    +'#hv2 .pl{font-size:10px;border-radius:20px;padding:3px 9px;font-weight:700;white-space:nowrap}'
    +'#hv2 .pl.vm{background:rgba(239,68,68,.15);color:#ef4444}#hv2 .pl.lj{background:rgba(245,158,11,.15);color:#d97706}#hv2 .pl.az{background:rgba(51,85,255,.15);color:#5b7bff}'
    +'#hv2 .sub{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}#hv2 .sub span{font-size:10.5px;background:rgba(127,127,170,.1);border:1px solid rgba(127,127,170,.22);border-radius:7px;padding:3px 7px}'
    +'#hv2 .sub span.dup{border-color:rgba(139,92,246,.6);color:#8b5cf6}'
    +'#hv2 .chips{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px 14px}#hv2 .chips span{font-size:11px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:8px;padding:5px 9px;cursor:pointer}'
    +'#hv2 .dois{display:grid;grid-template-columns:1.2fr 1fr;gap:13px}'
    +'#hv2 .graf{display:flex;align-items:flex-end;gap:12px;height:140px;padding:12px 16px 0}'
    +'#hv2 .gc{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;color:var(--cinza,#9090b8)}'
    +'#hv2 .gb{width:100%;max-width:48px;display:flex;flex-direction:column-reverse;border-radius:6px 6px 0 0;overflow:hidden;min-height:2px}'
    +'#hv2 .gb i{display:block}#hv2 .gv{background:#22c55e}#hv2 .gl{background:#f59e0b}'
    +'#hv2 .leg{font-size:10.5px;color:var(--cinza,#9090b8);padding:8px 16px 12px}#hv2 .leg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 4px 0 10px;vertical-align:middle}'
    +'#hv2 .busca{display:flex;gap:8px;padding:6px 14px 8px;flex-wrap:wrap}'
    +'#hv2 select,#hv2-modal select,#hv2-modal input{background:rgba(0,0,0,.25);border:1px solid var(--border,#222248);border-radius:9px;color:inherit;padding:8px 10px;font:inherit;font-size:12.5px}'
    +'#hv2 .busca select{flex:1;min-width:200px}'
    +'#hv2 table.mini{width:100%;border-collapse:collapse}#hv2 table.mini th,#hv2 table.mini td{padding:7px 12px;font-size:11.5px;text-align:left;border-top:1px solid rgba(127,127,170,.14)}#hv2 table.mini th{color:var(--cinza,#9090b8);font-weight:600}'
    +'#hv2 .s-vm{color:#ef4444}#hv2 .s-vd{color:#16a34a}#hv2 .s-lj{color:#d97706}#hv2 .s-rx{color:#8b5cf6}'
    +'#hv2-slot .ap-pgadm{border-color:rgba(51,85,255,.55)}'
    +'#hv2-slot .hv2-qr{display:inline-block;margin-left:6px;font-size:10px;font-weight:800;border-radius:20px;padding:2px 8px;background:rgba(51,85,255,.15);color:#5b7bff}'
    +'#hv2-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99990;display:flex;align-items:center;justify-content:center;padding:14px}'
    +'#hv2-modal .cx{background:#101030;color:#fff;border:1px solid rgba(51,85,255,.5);border-radius:16px;padding:16px;width:100%;max-width:470px;max-height:90vh;overflow:auto;box-shadow:0 14px 50px rgba(0,0,0,.5)}'
    +'#hv2-modal h4{margin:0 0 4px;font-size:15px}#hv2-modal p{margin:0 0 11px;font-size:12px;color:#a9b2d6}'
    +'#hv2-modal label{display:block;font-size:11px;color:#a9b2d6;margin:8px 0 3px}#hv2-modal input,#hv2-modal select{width:100%;box-sizing:border-box}'
    +'#hv2-modal .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}'
    +'#hv2-modal .op{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}#hv2-modal .op span{flex:1;min-width:90px;text-align:center;border:1px solid #2a2a55;border-radius:9px;padding:8px 6px;font-size:11.5px;cursor:pointer}'
    +'#hv2-modal .op span.on{border-color:#22c55e;background:rgba(34,197,94,.15);color:#8ff0b0;font-weight:700}'
    +'#hv2-modal .it{display:flex;align-items:center;gap:8px;padding:7px 2px;border-bottom:1px dotted #2a2a55;font-size:12px;cursor:pointer}#hv2-modal .it input{width:auto}'
    +'#hv2-modal .acoes{display:flex;gap:8px;margin-top:14px}#hv2-modal .acoes .b{flex:1;padding:11px}'
    +'#hv2-modal .wa{background:#0b141a;border-radius:12px;padding:12px;margin-top:8px}#hv2-modal .wa div{background:#005c4b;color:#e9edef;border-radius:9px 0 9px 9px;padding:9px 11px;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word}'
    +'#hv2-modal .alerta{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);color:#fbbf24;border-radius:9px;padding:8px 10px;font-size:11.5px;margin-top:8px}'
    +'#hv2-modal .qrbox{background:#fff;border-radius:14px;padding:12px;text-align:center;color:#0F1B33;margin-top:8px}#hv2-modal .qrbox img{width:210px;height:210px;image-rendering:pixelated}'
    +'#hv2-modal .qrbox .cod{font-size:10px;word-break:break-all;margin-top:6px;color:#334}'
    +'#hv2-modal .ok{background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.45);color:#8ff0b0;border-radius:10px;padding:9px 11px;font-size:12px;margin-top:10px}'
    /* tema claro */
    +'body.ap-esc-claro #hv2 .mes b,body.ap-esc-claro #hv2 select{background:#fff;color:#0F1B33}'
    +'body.ap-esc-claro #hv2 .cx{background:#fff;border-color:#E6EDF7}'
    +'body.ap-tema-claro #hv2-modal .cx,body.ap-esc-claro #hv2-modal .cx{background:#fff;color:#0F1B33;border-color:#c9d4f5}'
    +'body.ap-tema-claro #hv2-modal input,body.ap-tema-claro #hv2-modal select,body.ap-esc-claro #hv2-modal input,body.ap-esc-claro #hv2-modal select{background:#F4F7FC;color:#0F1B33;border-color:#d5ddef}'
    +'body.ap-tema-claro #hv2-modal p,body.ap-tema-claro #hv2-modal label,body.ap-esc-claro #hv2-modal p,body.ap-esc-claro #hv2-modal label{color:#66748C}'
    +'body.ap-tema-claro #hv2-modal .op span.on,body.ap-esc-claro #hv2-modal .op span.on{color:#0b7f58}'
    +'@media(max-width:760px){#hv2 .placar{grid-template-columns:1fr 1fr}#hv2 .dois{grid-template-columns:1fr}#hv2 .mes{margin-left:0}}'
    /* cliente: botao antes do QR */
    +'#ap-cobra .hv2-qroculto{display:none!important}'
    +'#ap-cobra .hv2-pagar{display:block;width:100%;border:0;border-radius:13px;padding:15px;font:inherit;font-size:16px;font-weight:800;cursor:pointer;margin-top:12px;background:#fff;color:#0B7F58;box-shadow:0 4px 14px rgba(0,0,0,.18)}'
    +'#ap-cobra .hv2-dica{font-size:12px;opacity:.95;margin-top:7px;line-height:1.45}';
    document.head.appendChild(s);
  }

  /* ---------------- modal ---------------- */
  function fecharModal(){ var m=el('hv2-modal'); if(m) m.remove(); }
  function modal(html){
    fecharModal(); css();
    var m=document.createElement('div'); m.id='hv2-modal';
    m.innerHTML='<div class="cx">'+html+'</div>';
    m.addEventListener('click',function(e){ if(e.target===m) fecharModal(); });
    document.body.appendChild(m);
    return m;
  }

  /* ================= DADOS (painel) ================= */
  function assinar(){
    if(assinado) return; var d=db(); if(!d) return;
    assinado=true;
    d.collection('honorarios').onSnapshot(function(s){
      var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); H=a; desenhar();
    }, function(){ assinado=false; });
  }
  async function carregarClientes(){
    if(Date.now()-tCli<60000 && C.length) return; tCli=Date.now();
    try{ var d=db(); var s=await d.collection('clientes').get(); var a=[]; s.forEach(function(x){ var o=x.data()||{}; o.id=x.id; a.push(o); }); C=a; }catch(e){}
  }
  function cadastro(nome){ for(var i=0;i<C.length;i++){ if(C[i].nome===nome) return C[i]; } return null; }
  function ativo(c){ return !c.status || !/inativ|desativ|encerr|baix|cancel|suspens/i.test(String(c.status)); }
  function nomesClientes(){
    var m={}; C.forEach(function(c){ if(c.nome && ativo(c)) m[c.nome]=1; }); H.forEach(function(h){ if(h.cliente) m[h.cliente]=1; });
    return Object.keys(m).sort(function(a,b){ return sem(a).localeCompare(sem(b)); });
  }
  function ms(h){ var c=h.criadoEm; if(!c) return 0; if(typeof c.toMillis==='function') return c.toMillis(); if(c.seconds) return c.seconds*1000; var t=Date.parse(c); return isNaN(t)?0:t; }

  /* duplicados: mesmo cliente + mesma competencia. O "suspeito" e o fora do padrao ou o mais novo. */
  function suspeitos(){
    var g={}, sus={}, grupos=[];
    H.forEach(function(h){ var k=h.cliente+'|'+compDe(h); (g[k]=g[k]||[]).push(h); });
    Object.keys(g).forEach(function(k){
      var a=g[k]; if(a.length<2) return;
      a=a.slice().sort(function(x,y){ if(padrao(x)!==padrao(y)) return padrao(x)?-1:1; return ms(x)-ms(y); });
      a.slice(1).forEach(function(h){ sus[h.id]=1; });
      grupos.push(a);
    });
    return {sus:sus, grupos:grupos};
  }

  function calc(){
    var hoje=hojeISO(), mes=MES;
    var doMes=H.filter(function(h){ return compDe(h)===mes; });
    var rec=0, nRec=0, aVencer=[], pendMes=0;
    doMes.forEach(function(h){ if(pago(h)){ rec+=recebido(h); nRec++; } else { pendMes+=num(h.valor); if(String(h.vencimento||'')>=hoje) aVencer.push(h); } });
    var atr={}, atrTot=0, atrN=0;
    H.forEach(function(h){
      if(pago(h)) return; var v=String(h.vencimento||''); if(!/^\d{4}-\d{2}-\d{2}/.test(v) || v>=hoje) return;
      var k=h.cliente||'—'; (atr[k]=atr[k]||[]).push(h); atrTot+=num(h.valor); atrN++;
    });
    var grupos=Object.keys(atr).map(function(k){
      var a=atr[k].sort(function(x,y){ return String(x.vencimento).localeCompare(String(y.vencimento)); });
      var t=0; a.forEach(function(h){ t+=num(h.valor); });
      return {cliente:k, itens:a, total:t, dias:dias(a[0].vencimento)};
    }).sort(function(a,b){ return b.dias-a.dias || b.total-a.total; });
    var aVencerTot=0; aVencer.sort(function(a,b){ return String(a.vencimento).localeCompare(String(b.vencimento)); }).forEach(function(h){ aVencerTot+=num(h.valor); });
    return {doMes:doMes, rec:rec, nRec:nRec, total:rec+pendMes, aVencer:aVencer, aVencerTot:aVencerTot, atr:grupos, atrTot:atrTot, atrN:atrN};
  }

  function alertas(){
    var ocultos=lsGet('hv2-ocultos',{}), a=[], mes=MES;
    var tem={}; H.forEach(function(h){ if(compDe(h)===mes) tem[h.cliente]=1; });
    var ant={}; [compMais(mes,-1),compMais(mes,-2)].forEach(function(c){ H.forEach(function(h){ if(compDe(h)===c) ant[h.cliente]=h; }); });
    var falta=[];
    C.forEach(function(c){ if(c.nome && ativo(c) && !tem[c.nome]) falta.push(c.nome); });
    Object.keys(ant).forEach(function(n){ var c=cadastro(n); if(!tem[n] && falta.indexOf(n)<0 && (!c || ativo(c))) falta.push(n); });
    falta.forEach(function(n){ var k='falta|'+n+'|'+mes; if(!ocultos[k]) a.push({k:k, tipo:'falta', cliente:n, t:curto(n)+' sem honorário em '+compTxt(mes), s:'Cliente ativo sem honorário lançado neste mês', bt:'Lançar'}); });
    suspeitos().grupos.forEach(function(g){
      var k='dup|'+g[0].cliente+'|'+compDe(g[0]); if(ocultos[k]) return;
      a.push({k:k, tipo:'dup', cliente:g[0].cliente, t:curto(g[0].cliente)+' · '+compTxt(compDe(g[0]))+' lançado '+g.length+' vezes',
        s:g.map(function(h){ return '"'+(h.referencia||'')+'" '+money(num(h.valor))+(pago(h)?' (pago)':''); }).join(' e '), bt:'Ver'});
    });
    var fora=H.filter(function(h){ return !padrao(h) && compDe(h); });
    if(fora.length && !ocultos['fmt|'+fora.length]) a.push({k:'fmt|'+fora.length, tipo:'fmt', t:'Referência em dois formatos', s:fora.length+' lançamento'+(fora.length>1?'s':'')+' como "'+esc(fora[0].referencia)+'" → padronizar para "'+compTxt(compDe(fora[0]))+'"', bt:'Padronizar'});
    return a;
  }

  /* ================= DESENHO (painel) ================= */
  function estrutura(){
    var pg=el('pp-honorarios'); if(!pg) return null;
    var w=el('hv2');
    if(!w){
      css();
      w=document.createElement('div'); w.id='hv2';
      w.innerHTML='<div class="cab"><h2>\u{1F4B3} Honorários do mês</h2>'
        +'<div class="mes"><button class="b gh" data-a="ant">◀</button><b id="hv2-mes"></b><button class="b gh" data-a="prox">▶</button></div>'
        +'<button class="b gh" data-a="lancar">➕ Lançar avulso</button></div>'
        +'<div id="hv2-placar"></div><div id="hv2-slot"></div><div id="hv2-corpo"></div>';
      var ref=pg.querySelector('.hon-card');
      pg.insertBefore(w, ref || null);
      w.addEventListener('click', clique);
      w.addEventListener('change', function(e){ if(e.target && e.target.id==='hv2-hcli'){ HCLI=e.target.value; desenhar(true); } });
    }
    [].slice.call(pg.children).forEach(function(c){
      if(c.classList.contains('hon-card') || c.classList.contains('fbox') || c.classList.contains('sec') || c.id==='hon-historico-table') c.classList.add('hv2-oculto');
    });
    var dec=el('ap-pgadm-honorario'), slot=el('hv2-slot');
    if(dec && slot && dec.parentNode!==slot) slot.appendChild(dec);
    return w;
  }

  function mesesDisponiveis(){
    var m={}; m[compHoje()]=1; H.forEach(function(h){ var c=compDe(h); if(c) m[c]=1; });
    return Object.keys(m).sort();
  }

  function desenhar(forcar){
    var pg=el('pp-honorarios'); if(!pg || !ehAdmin()) return;
    var w=estrutura(); if(!w) return;
    var ms_=mesesDisponiveis();
    if(!MES || ms_.indexOf(MES)<0) MES = ms_.indexOf(compHoje())>=0 ? compHoje() : ms_[ms_.length-1];
    var sig=JSON.stringify([MES,HCLI,hojeISO(),C.length,lsGet('hv2-ocultos',{}),H.map(function(h){ return [h.id,h.status,h.valor,h.valorRecebido,h.vencimento,h.referencia,h.cliente,h.cobradoEm]; })]);
    if(!forcar && sig===assinatura) return; assinatura=sig;

    var k=calc();
    el('hv2-mes').textContent=compNome(MES);
    var pct=k.total ? Math.round(k.rec/k.total*100) : 0;
    var nAtrCli=k.atr.length;
    el('hv2-placar').innerHTML='<div class="placar">'
      +'<div class="t v"><small>Recebido</small><b>'+money(k.rec)+'</b><i>'+k.nRec+' cliente'+(k.nRec===1?'':'s')+'</i></div>'
      +'<div class="t l"><small>A receber no mês</small><b>'+money(k.aVencerTot)+'</b><i>'+k.aVencer.length+' honorário'+(k.aVencer.length===1?'':'s')+'</i></div>'
      +'<div class="t r"><small>Em atraso (todos os meses)</small><b>'+money(k.atrTot)+'</b><i>'+nAtrCli+' cliente'+(nAtrCli===1?'':'s')+' · '+k.atrN+' honorário'+(k.atrN===1?'':'s')+'</i></div>'
      +'<div class="t a"><small>Total do mês</small><b>'+money(k.total)+'</b><i>'+k.doMes.length+' honorário'+(k.doMes.length===1?'':'s')+'</i></div>'
      +'</div><div class="barra"><div style="width:'+pct+'%"></div></div><div class="barra-tx">'+pct+'% do mês já recebido</div>';

    var sus=suspeitos().sus, h='';
    /* EM ATRASO */
    h+='<div class="cx vm"><h3>\u{1F534} Em atraso <span class="n">'+money(k.atrTot)+'</span></h3>';
    if(!k.atr.length) h+='<div class="vazio">Nenhum honorário vencido. \u{1F389}</div>';
    else {
      h+='<div class="ds">Agrupado por cliente, juntando todos os meses em aberto.</div>';
      k.atr.forEach(function(g){
        var cob=g.itens.map(function(x){ return x.cobradoEm||''; }).sort().pop();
        h+='<div class="ln"><div class="nm"><b>'+esc(g.cliente)+'</b><span>'
          +(g.itens.length>1 ? (g.itens.length+' honorários em aberto · mais antigo de '+dataBR(g.itens[0].vencimento)) : (esc(g.itens[0].referencia||'')+' · venceu '+dataBR(g.itens[0].vencimento)))
          +(cob?(' · <b style="display:inline;color:#1fa855">cobrado em '+dataBR(cob)+'</b>'):'')+'</span>';
        if(g.itens.length>1) h+='<div class="sub">'+g.itens.map(function(x){ return '<span'+(sus[x.id]?' class="dup"':'')+'>'+esc(x.referencia||'')+' · '+money(num(x.valor))+(sus[x.id]?' ⚠ parece duplicado':'')+'</span>'; }).join('')+'</div>';
        h+='</div><span class="pl vm">'+g.dias+' dia'+(g.dias===1?'':'s')+'</span><div class="vl" style="color:#ef4444">'+money(g.total)+'</div>'
          +'<button class="b wa" data-a="cobrar" data-c="'+esc(g.cliente)+'">\u{1F4F2} Cobrar</button>'
          +'<button class="b vd" data-a="recebi" data-c="'+esc(g.cliente)+'" data-ids="'+esc(g.itens.filter(function(x){ return !sus[x.id]; }).map(function(x){ return x.id; }).join(','))+'">✔ Recebi</button></div>';
      });
    }
    h+='</div>';

    /* A VENCER + CONFERIR | RECEBIDOS + GRAFICO */
    h+='<div class="dois"><div>';
    h+='<div class="cx lj"><h3>\u{1F7E0} A vencer neste mês <span class="n">'+money(k.aVencerTot)+'</span></h3>';
    if(!k.aVencer.length) h+='<div class="vazio">Nada a vencer neste mês.</div>';
    k.aVencer.forEach(function(x){
      var d=-dias(x.vencimento);
      h+='<div class="ln"><div class="nm"><b>'+esc(x.cliente)+'</b><span>'+esc(x.referencia||'')+'</span></div>'
        +'<span class="pl lj">'+(d===0?'vence hoje':(d===1?'amanhã':dataBR(x.vencimento).slice(0,5)))+'</span><div class="vl">'+money(num(x.valor))+'</div>'
        +'<button class="b vd" data-a="recebi" data-c="'+esc(x.cliente)+'" data-ids="'+esc(x.id)+'">✔ Recebi</button></div>';
    });
    h+='</div>';
    var al=alertas();
    h+='<div class="cx rx"><h3>⚠ Conferir antes de fechar o mês <span class="n">'+al.length+'</span></h3>';
    if(!al.length) h+='<div class="vazio">Tudo certo por aqui.</div>';
    al.forEach(function(a){
      h+='<div class="ln"><div class="nm"><b>'+esc(a.t)+'</b><span>'+a.s+'</span></div>'
        +'<button class="b gh mini" data-a="al-'+a.tipo+'" data-c="'+esc(a.cliente||'')+'">'+a.bt+'</button>'
        +'<button class="b gh mini" data-a="ocultar" data-k="'+esc(a.k)+'" title="Não mostrar mais este aviso">✕</button></div>';
    });
    h+='</div></div><div>';
    var pagos=k.doMes.filter(pago).sort(function(a,b){ return recebido(b)-recebido(a); });
    h+='<div class="cx vd"><h3>\u{1F7E2} Recebidos <span class="n">'+pagos.length+'</span></h3>';
    if(!pagos.length) h+='<div class="vazio">Nenhum recebimento neste mês ainda.</div>';
    else h+='<div class="chips">'+pagos.map(function(x){ return '<span data-a="hist" data-c="'+esc(x.cliente)+'" title="'+esc(x.cliente)+'">'+esc(curto(x.cliente))+' · '+money(recebido(x)).replace('R$ ','')+'</span>'; }).join('')+'</div>';
    h+='</div>';
    h+=grafico();
    h+='</div></div>';
    h+=historico();
    el('hv2-corpo').innerHTML=h;
  }

  function grafico(){
    var ano=MES.slice(0,4), por={}, rT=0, pT=0;
    H.forEach(function(h){ var c=compDe(h); if(c.slice(0,4)!==ano) return; var p=por[c]=por[c]||[0,0]; if(pago(h)){ p[0]+=recebido(h); rT+=recebido(h); } else { p[1]+=num(h.valor); pT+=num(h.valor); } });
    var ks=Object.keys(por).sort(); if(!ks.length) return '';
    var mx=0; ks.forEach(function(k){ mx=Math.max(mx,por[k][0]+por[k][1]); });
    var h='<div class="cx"><h3>\u{1F4C6} '+ano+' mês a mês</h3><div class="graf">';
    ks.forEach(function(k){ var p=por[k], t=p[0]+p[1], alt=mx?Math.round(t/mx*110):0;
      h+='<div class="gc" title="'+compTxt(k)+': recebido '+money(p[0])+' · pendente '+money(p[1])+'"><div class="gb" style="height:'+alt+'px"><i class="gv" style="height:'+(t?p[0]/t*100:0)+'%"></i><i class="gl" style="height:'+(t?p[1]/t*100:0)+'%"></i></div>'+MABR[+k.slice(5)-1]+'</div>'; });
    return h+'</div><div class="leg"><i class="gv"></i>Recebido '+money(rT)+' <i class="gl"></i>Pendente '+money(pT)+'</div></div>';
  }

  function historico(){
    var nomes=nomesClientes();
    var hc=el('hon-cli'); if(hc && !hc.__hv2){ hc.__hv2=1; hc.addEventListener('change',function(){ if(hc.value){ HCLI=hc.value; desenhar(true); } }); }
    var h='<div class="cx"><h3>\u{1F50E} Histórico por cliente</h3><div class="busca"><select id="hv2-hcli"><option value="">— escolha o cliente —</option>'
      +nomes.map(function(n){ return '<option'+(n===HCLI?' selected':'')+'>'+esc(n)+'</option>'; }).join('')+'</select>'
      +(HCLI?'<button class="b gh" data-a="csv">Baixar CSV</button>':'')+'</div>';
    if(!HCLI) return h+'<div class="vazio">Escolha um cliente para ver todos os honorários dele.</div></div>';
    var sus=suspeitos().sus, hoje=hojeISO();
    var a=H.filter(function(x){ return x.cliente===HCLI; }).sort(function(x,y){ return compDe(y).localeCompare(compDe(x)) || ms(y)-ms(x); });
    if(!a.length) return h+'<div class="vazio">Nenhum honorário lançado para este cliente.</div></div>';
    h+='<table class="mini"><tr><th>Mês</th><th>Valor</th><th>Vencimento</th><th>Situação</th><th></th></tr>';
    a.forEach(function(x){
      var s = pago(x) ? '<span class="s-vd">Pago'+(x.valorRecebido!=null&&Number(x.valorRecebido)!==num(x.valor)?(' ('+money(recebido(x))+')'):'')+(x.pagoEm?(' em '+dataBR(x.pagoEm)):'')+'</span>'
            : sus[x.id] ? '<span class="s-rx">⚠ duplicado?</span>'
            : String(x.vencimento||'')<hoje ? '<span class="s-vm">Em atraso</span>' : '<span class="s-lj">A vencer</span>';
      h+='<tr><td>'+esc(x.referencia||'')+'</td><td>'+money(num(x.valor))+'</td><td>'+dataBR(x.vencimento)+'</td><td>'+s+'</td>'
        +'<td style="text-align:right">'+(x.arquivoData?'<button class="b gh mini" data-a="pdf" data-id="'+esc(x.id)+'">\u{1F4C4}</button> ':'')+'<button class="b gh mini" data-a="editar" data-id="'+esc(x.id)+'">✏️ Editar</button></td></tr>';
    });
    return h+'</table></div>';
  }

  /* ================= ACOES (painel) ================= */
  function clique(e){
    var b=e.target.closest('[data-a]'); if(!b) return;
    var a=b.getAttribute('data-a'), c=b.getAttribute('data-c')||'';
    if(a==='ant' || a==='prox'){ var ms_=mesesDisponiveis(), i=ms_.indexOf(MES)+(a==='ant'?-1:1); if(i>=0 && i<ms_.length){ MES=ms_[i]; desenhar(true); } return; }
    if(a==='lancar') return janelaLancar({});
    if(a==='cobrar') return janelaCobrar(c);
    if(a==='recebi') return janelaRecebi(c, (b.getAttribute('data-ids')||'').split(',').filter(Boolean));
    if(a==='hist' || a==='al-dup'){ HCLI=c; desenhar(true); var t=el('hv2-hcli'); if(t) t.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    if(a==='al-falta'){ var ult=H.filter(function(x){ return x.cliente===c; }).sort(function(x,y){ return compDe(y).localeCompare(compDe(x)); })[0], cad=cadastro(c);
      return janelaLancar({cliente:c, mes:MES, valor: ult?num(ult.valor):(cad?num(cad.honorario):0), dia: ult?String(ult.vencimento||'').slice(8,10):'' }); }
    if(a==='al-fmt') return janelaPadronizar();
    if(a==='ocultar'){ var o=lsGet('hv2-ocultos',{}); o[b.getAttribute('data-k')]=1; lsSet('hv2-ocultos',o); desenhar(true); return; }
    if(a==='editar') return janelaEditar(b.getAttribute('data-id'));
    if(a==='pdf'){ var x=acha(b.getAttribute('data-id')); if(x) abrirPdf(x); return; }
    if(a==='csv') return csv();
  }
  function acha(id){ for(var i=0;i<H.length;i++){ if(String(H[i].id)===String(id)) return H[i]; } return null; }
  function abrirPdf(x){
    try{ var u=x.arquivoData; if(typeof blobUrl==='function') u=blobUrl(x.arquivoData);
      var a=document.createElement('a'); a.href=u; a.download=x.arquivo||('Honorario_'+soAZ(x.referencia)+'.pdf'); document.body.appendChild(a); a.click(); a.remove(); }catch(e){ aviso('Não consegui abrir o PDF.','warn'); }
  }
  function csv(){
    var a=H.filter(function(x){ return x.cliente===HCLI; }).sort(function(x,y){ return compDe(x).localeCompare(compDe(y)); });
    var t='﻿Cliente;Referência;Valor;Vencimento;Situação;Recebido;Pago em\n';
    a.forEach(function(x){ t+=[x.cliente,x.referencia,num(x.valor).toFixed(2).replace('.',','),dataBR(x.vencimento),x.status||'Pendente',pago(x)?recebido(x).toFixed(2).replace('.',','):'',dataBR(x.pagoEm||'')].map(function(v){ return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'; }).join(';')+'\n'; });
    var bl=new Blob([t],{type:'text/csv;charset=utf-8'}), u=URL.createObjectURL(bl), l=document.createElement('a');
    l.href=u; l.download='honorarios-'+soAZ(HCLI).slice(0,30)+'.csv'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },4000);
  }
  function depois(){
    try{ if(window.__PAGOU__){ window.__PAGOU__.carregar().then(function(){ window.__PAGOU__.pintarAdmin(); }); } }catch(e){}
    try{ if(typeof carregarHonorarios==='function') carregarHonorarios(); }catch(e){}
    try{ if(typeof atualizarDashboard==='function') atualizarDashboard(); }catch(e){}
  }

  /* ---- Recebi ---- */
  function janelaRecebi(cliente, pre){
    var abertos=H.filter(function(x){ return x.cliente===cliente && !pago(x); }).sort(function(a,b){ return String(a.vencimento).localeCompare(String(b.vencimento)); });
    if(!abertos.length){ aviso('Esse cliente não tem honorário em aberto.','info'); return; }
    var sus=suspeitos().sus, forma='PIX', manual=false;
    var m=modal('<h4>✔ Recebi — '+esc(cliente)+'</h4><p>Marque o que foi pago. Pode baixar vários meses de uma vez.</p>'
      +abertos.map(function(x){ return '<label class="it"><input type="checkbox" value="'+esc(x.id)+'"'+(pre.indexOf(String(x.id))>=0?' checked':'')+'> <span style="flex:1">'+esc(x.referencia||'')+' · vence '+dataBR(x.vencimento)+(sus[x.id]?' <b style="color:#a78bfa">⚠ duplicado?</b>':'')+'</span><b>'+money(num(x.valor))+'</b></label>'; }).join('')
      +'<div class="g2"><div><label>Valor recebido (R$)</label><input id="hv2-rv" inputmode="decimal"></div><div><label>Data do pagamento</label><input id="hv2-rd" type="date" value="'+hojeISO()+'"></div></div>'
      +'<label>Forma</label><div class="op" id="hv2-rf"><span class="on">PIX</span><span>Boleto</span><span>Dinheiro</span><span>Transferência</span></div>'
      +'<label class="it" style="border:0;margin-top:6px"><input type="checkbox" id="hv2-rav" checked> Avisar o cliente no app que o pagamento foi recebido</label>'
      +'<div class="acoes"><button class="b gh" data-x="c">Cancelar</button><button class="b vd" data-x="ok">Confirmar recebimento</button></div>');
    var rv=m.querySelector('#hv2-rv');
    function marcados(){ return [].slice.call(m.querySelectorAll('.it input[type=checkbox][value]')).filter(function(i){ return i.checked; }).map(function(i){ return acha(i.value); }).filter(Boolean); }
    function soma(){ if(manual) return; var t=0; marcados().forEach(function(x){ t+=num(x.valor); }); rv.value=t.toFixed(2).replace('.',','); }
    soma();
    rv.addEventListener('input',function(){ manual=true; });
    [].slice.call(m.querySelectorAll('.it input[value]')).forEach(function(i){ i.addEventListener('change',soma); });
    [].slice.call(m.querySelectorAll('#hv2-rf span')).forEach(function(s){ s.onclick=function(){ [].slice.call(m.querySelectorAll('#hv2-rf span')).forEach(function(z){ z.classList.remove('on'); }); s.classList.add('on'); forma=s.textContent; }; });
    m.querySelector('[data-x=c]').onclick=fecharModal;
    var ok=m.querySelector('[data-x=ok]');
    ok.onclick=async function(){
      var it=marcados(); if(!it.length){ aviso('Marque pelo menos um honorário.','warn'); return; }
      var total=num(rv.value), soma0=0; it.forEach(function(x){ soma0+=num(x.valor); });
      var data=m.querySelector('#hv2-rd').value||hojeISO(), avisar=m.querySelector('#hv2-rav').checked;
      ok.disabled=true; ok.textContent='Salvando...';
      try{
        var d=db(), dif=Math.round((total-soma0)*100)/100;
        for(var i=0;i<it.length;i++){
          var v=num(it[i].valor); if(i===it.length-1) v=Math.max(0, Math.round((v+dif)*100)/100);
          await d.collection('honorarios').doc(String(it[i].id)).set({status:'Pago', valorRecebido:v, pagoEm:data, formaPagamento:forma, confirmadoPor:'Daniel'},{merge:true});
        }
        await fecharDeclaracoes(it.map(function(x){ return String(x.id); }), 'baixado na aba Honorários');
        if(avisar){
          try{ await d.collection('urgencias').add({cliente:cliente, dest:cliente, titulo:'Pagamento confirmado',
            msg:'Recebemos o pagamento do honorário de '+listaMeses(it.map(compDe))+' ('+money(total)+'). Está tudo certo, obrigado!',
            data:new Date().toLocaleDateString('pt-BR'), ts:Date.now(), criadoEm:serverTs(), origem:'honorarios'}); }catch(e){}
        }
        fecharModal(); aviso('✅ Recebimento registrado'+(avisar?' e cliente avisado.':'.'),'ok'); depois();
      }catch(e){ ok.disabled=false; ok.textContent='Confirmar recebimento'; aviso('Não consegui salvar: '+(e.message||e),'erro'); }
    };
  }

  async function fecharDeclaracoes(ids, obs){
    var P=window.__PAGOU__; if(!P || !P.cache) return; var d=db();
    var lista=P.cache().filter(function(p){ return p.status==='aguardando' && p.refColecao==='honorarios' && ids.indexOf(String(p.refId))>=0; });
    for(var i=0;i<lista.length;i++){
      try{ await d.collection('pagamentos').doc(String(lista[i].id)).set({status:'confirmado', resolvidoEm:new Date().toISOString(), obsAdmin:obs},{merge:true}); lista[i].status='confirmado'; }catch(e){}
    }
  }
  /* aviso "cliente avisou que pagou" de honorario que ja esta Pago: fecha sozinho */
  async function fecharVelhos(){
    var P=window.__PAGOU__; if(!P || !P.cache || !H.length) return;
    var ids=[];
    P.cache().forEach(function(p){ if(p.status!=='aguardando' || p.refColecao!=='honorarios' || fechados[p.id]) return; var x=acha(p.refId); if(x && pago(x)){ ids.push(String(p.refId)); fechados[p.id]=1; } });
    if(ids.length){ await fecharDeclaracoes(ids, 'honorário já estava pago (fechado automaticamente)'); try{ P.pintarAdmin(); }catch(e){} }
  }
  function marcarQR(){
    var P=window.__PAGOU__, slot=el('hv2-slot'); if(!P || !P.cache || !slot) return;
    [].slice.call(slot.querySelectorAll('[data-pgok]')).forEach(function(b){
      var dec=b.closest('.dec'); if(!dec || dec.querySelector('.hv2-qr')) return;
      var id=b.getAttribute('data-pgok'), p=P.cache().filter(function(x){ return String(x.id)===String(id); })[0];
      if(p && p.viaQR){ var bb=dec.querySelector('b'); if(bb){ var s=document.createElement('span'); s.className='hv2-qr'; s.textContent='\u{1F4F1} pagou pelo QR do app'; bb.appendChild(s); } }
    });
  }

  /* ---- Cobrar ---- */
  function janelaCobrar(cliente){
    var it=H.filter(function(x){ return x.cliente===cliente && !pago(x) && String(x.vencimento||'')<hojeISO(); }).sort(function(a,b){ return String(a.vencimento).localeCompare(String(b.vencimento)); });
    var sus=suspeitos().sus, semDup=it.filter(function(x){ return !sus[x.id]; });
    if(semDup.length) it=semDup;
    if(!it.length) return;
    var tot=0; it.forEach(function(x){ tot+=num(x.valor); });
    var codigo=pix(tot, ('HONAT'+soAZ(cliente)).slice(0,25));
    var meses=listaMeses(it.map(compDe));
    var txt='Olá! Aqui é o Daniel, da APARAT Contabilidade. \u{1F60A}\n'
      +'Consta em aberto o honorário de '+meses+', total de '+money(tot)+'.\n'
      +'Para pagar pelo PIX, é só copiar o código abaixo. Se já pagou, desconsidere e me mande o comprovante por aqui ou pelo app. Obrigado!\n\n'+codigo;
    var cad=cadastro(cliente), fone=soDig(cad && (cad.whatsapp||cad.telefone||cad.celular));
    if(fone && fone.length<=11) fone='55'+fone;
    var m=modal('<h4>\u{1F4F2} Cobrar no WhatsApp — '+esc(cliente)+'</h4>'
      +'<p>'+(fone?('Vai abrir a conversa com '+esc(fone.replace(/^55/,''))+'. '):'Esse cliente não tem WhatsApp no cadastro: o WhatsApp vai pedir para escolher o contato. ')+'Você confere e aperta enviar lá.</p>'
      +'<div class="wa"><div>'+esc(txt)+'</div></div>'
      +'<div class="acoes"><button class="b gh" data-x="c">Cancelar</button><button class="b wa" data-x="ok">Abrir WhatsApp</button></div>');
    m.querySelector('[data-x=c]').onclick=fecharModal;
    m.querySelector('[data-x=ok]').onclick=async function(){
      window.open('https://wa.me/'+(fone||'')+'?text='+encodeURIComponent(txt),'_blank');
      fecharModal();
      try{ var d=db(); for(var i=0;i<it.length;i++) await d.collection('honorarios').doc(String(it[i].id)).set({cobradoEm:hojeISO()},{merge:true}); }catch(e){}
    };
  }

  /* ---- Lançar avulso ---- */
  function janelaLancar(o){
    var nomes=nomesClientes(), mes=o.mes||MES||compHoje();
    var dia=o.dia||'10', venc=mes+'-'+p2(+dia||10);
    if(venc<hojeISO()) venc=hojeISO();
    var m=modal('<h4>➕ Lançar honorário</h4><p>O cliente vê na hora no app, com o PIX pronto para pagar. O PDF do boleto é opcional.</p>'
      +'<label>Cliente</label><select id="hv2-lc"><option value="">— escolha —</option>'+nomes.map(function(n){ return '<option'+(n===o.cliente?' selected':'')+'>'+esc(n)+'</option>'; }).join('')+'</select>'
      +'<div class="g2"><div><label>Mês de referência</label><input id="hv2-lm" type="month" value="'+mes+'"></div><div><label>Valor (R$)</label><input id="hv2-lv" inputmode="decimal" value="'+(o.valor?Number(o.valor).toFixed(2).replace('.',','):'')+'"></div></div>'
      +'<label>Vencimento</label><input id="hv2-lvc" type="date" value="'+venc+'">'
      +'<label>Boleto em PDF (opcional)</label><input id="hv2-lf" type="file" accept=".pdf,image/*">'
      +'<div id="hv2-lal"></div>'
      +'<div class="acoes"><button class="b gh" data-x="c">Cancelar</button><button class="b" data-x="ok">Lançar</button></div>');
    var confirmouDup=false;
    m.querySelector('[data-x=c]').onclick=fecharModal;
    var ok=m.querySelector('[data-x=ok]');
    ok.onclick=async function(){
      var cli=m.querySelector('#hv2-lc').value, mm=m.querySelector('#hv2-lm').value, val=num(m.querySelector('#hv2-lv').value), vc=m.querySelector('#hv2-lvc').value;
      if(!cli || !/^\d{4}-\d{2}$/.test(mm) || !(val>0) || !vc){ aviso('Preencha cliente, mês, valor e vencimento.','warn'); return; }
      var ja=H.filter(function(x){ return x.cliente===cli && compDe(x)===mm; });
      if(ja.length && !confirmouDup){ confirmouDup=true; m.querySelector('#hv2-lal').innerHTML='<div class="alerta">⚠ Já existe honorário de '+compTxt(mm)+' para esse cliente ('+ja.map(function(x){ return money(num(x.valor)); }).join(', ')+'). Toque em Lançar de novo se quiser mesmo um segundo lançamento.</div>'; return; }
      ok.disabled=true; ok.textContent='Lançando...';
      try{
        var f=m.querySelector('#hv2-lf'), arq='', dados='';
        if(f.files && f.files[0]){ arq=f.files[0].name; dados = (typeof lerArquivoBase64==='function') ? await lerArquivoBase64(f.files[0]) : ''; }
        var reg={cliente:cli, referencia:compTxt(mm), valor:String(Math.round(val*100)/100), vencimento:vc, arquivo:arq||('Honorario_'+compTxt(mm).replace('/','')+'.pdf'), arquivoData:dados, status:'Pendente', origem:'Lançar avulso (Honorários v2)'};
        if(typeof dbAdd==='function') await dbAdd('honorarios', reg); else await db().collection('honorarios').add(Object.assign(reg,{criadoEm:serverTs()}));
        fecharModal(); aviso('\u{1F4CE} Honorário lançado para '+cli+'.','ok'); depois();
      }catch(e){ ok.disabled=false; ok.textContent='Lançar'; aviso('Não consegui lançar: '+(e.message||e),'erro'); }
    };
  }

  /* ---- Editar ---- */
  function janelaEditar(id){
    var x=acha(id); if(!x) return;
    var m=modal('<h4>✏️ Editar honorário</h4><p>'+esc(x.cliente)+'</p>'
      +'<div class="g2"><div><label>Mês de referência</label><input id="hv2-em" type="month" value="'+compDe(x)+'"></div><div><label>Valor (R$)</label><input id="hv2-ev" inputmode="decimal" value="'+num(x.valor).toFixed(2).replace('.',',')+'"></div></div>'
      +'<label>Vencimento</label><input id="hv2-evc" type="date" value="'+esc(x.vencimento||'')+'">'
      +(pago(x)?'<div class="ok">Pago'+(x.pagoEm?(' em '+dataBR(x.pagoEm)):'')+' · recebido '+money(recebido(x))+'</div>':'')
      +'<div id="hv2-eex"></div>'
      +'<div class="acoes"><button class="b vm" data-x="del">Excluir</button>'+(pago(x)?'<button class="b gh" data-x="pend">↩ Voltar p/ pendente</button>':'<button class="b vd" data-x="rec">✔ Recebi</button>')+'<button class="b" data-x="ok">Salvar</button></div>');
    var d=db();
    m.querySelector('[data-x=ok]').onclick=async function(){
      var mm=m.querySelector('#hv2-em').value, v=num(m.querySelector('#hv2-ev').value), vc=m.querySelector('#hv2-evc').value;
      if(!/^\d{4}-\d{2}$/.test(mm) || !(v>0)){ aviso('Confira mês e valor.','warn'); return; }
      try{ await d.collection('honorarios').doc(String(id)).set({referencia:compTxt(mm), valor:String(Math.round(v*100)/100), vencimento:vc},{merge:true}); fecharModal(); aviso('✏️ Honorário atualizado.','ok'); depois(); }catch(e){ aviso('Não consegui salvar: '+(e.message||e),'erro'); }
    };
    var pe=m.querySelector('[data-x=pend]');
    if(pe) pe.onclick=async function(){ try{ await d.collection('honorarios').doc(String(id)).set({status:'Pendente'},{merge:true}); fecharModal(); aviso('Voltou para pendente.','info'); depois(); }catch(e){ aviso('Não consegui salvar: '+(e.message||e),'erro'); } };
    var rc=m.querySelector('[data-x=rec]');
    if(rc) rc.onclick=function(){ janelaRecebi(x.cliente,[String(id)]); };
    var de=m.querySelector('[data-x=del]'), conf=false;
    de.onclick=async function(){
      if(!conf){ conf=true; de.textContent='Toque de novo para excluir'; m.querySelector('#hv2-eex').innerHTML='<div class="alerta">Excluir apaga este honorário de '+esc(x.referencia||'')+' ('+money(num(x.valor))+') do app, inclusive da tela do cliente. Não dá para desfazer.</div>'; return; }
      try{ await d.collection('honorarios').doc(String(id)).delete(); fecharModal(); aviso('Honorário excluído.','info'); depois(); }catch(e){ aviso('Não consegui excluir: '+(e.message||e),'erro'); }
    };
  }

  /* ---- Padronizar referencia ---- */
  function janelaPadronizar(){
    var fora=H.filter(function(x){ return !padrao(x) && compDe(x); });
    if(!fora.length) return;
    var m=modal('<h4>Padronizar referência</h4><p>Troca o texto da referência para o formato MM/AAAA. Valor, vencimento e situação não mudam.</p>'
      +'<div style="font-size:12px;max-height:200px;overflow:auto">'+fora.slice(0,40).map(function(x){ return '<div class="it" style="cursor:default">'+esc(curto(x.cliente))+': "'+esc(x.referencia)+'" → <b>'+compTxt(compDe(x))+'</b></div>'; }).join('')+(fora.length>40?'<div class="it">e mais '+(fora.length-40)+'...</div>':'')+'</div>'
      +'<div class="acoes"><button class="b gh" data-x="c">Cancelar</button><button class="b" data-x="ok">Padronizar '+fora.length+'</button></div>');
    m.querySelector('[data-x=c]').onclick=fecharModal;
    var ok=m.querySelector('[data-x=ok]');
    ok.onclick=async function(){
      ok.disabled=true; ok.textContent='Salvando...'; var d=db(), n=0;
      for(var i=0;i<fora.length;i++){ try{ await d.collection('honorarios').doc(String(fora[i].id)).set({referencia:compTxt(compDe(fora[i])), referenciaAntiga:String(fora[i].referencia||'')},{merge:true}); n++; }catch(e){} }
      fecharModal(); aviso(n+' referência'+(n===1?'':'s')+' padronizada'+(n===1?'':'s')+'.','ok'); depois();
    };
  }

  /* ================= CLIENTE: botao antes do QR ================= */
  var clienteOcupado=false;
  function clienteAtual(){ try{ return (typeof CURRENT_CLIENTE!=='undefined' && CURRENT_CLIENTE) ? String(CURRENT_CLIENTE) : ''; }catch(e){ return ''; } }
  function travarQR(){
    var c=el('ap-cobra'); if(!c) return;
    if(!c.__hv2obs && window.MutationObserver){ c.__hv2obs=new MutationObserver(function(){ try{ travarQR(); }catch(e){} }); c.__hv2obs.observe(c,{childList:true,subtree:true}); }
    var cx=c.querySelector('.cx'); if(!cx || cx.classList.contains('gu') || cx.classList.contains('ag')) return;
    var qr=cx.querySelector('.qr'); if(!qr) return;
    if(cx.querySelector('.hv2-pagar')) return;
    css();
    qr.classList.add('hv2-qroculto');
    var cp=el('ap-cobra-copiar'); if(cp) cp.classList.add('hv2-qroculto');
    var b=document.createElement('button'); b.className='hv2-pagar'; b.type='button';
    b.innerHTML='\u{1F4B8} Pagar agora com PIX';
    var dc=document.createElement('div'); dc.className='hv2-dica';
    dc.innerHTML='Toque aqui <b>antes</b> de escanear: o QR Code aparece na hora e a APARAT já fica sabendo do seu pagamento.';
    var ref=el('ap-cobra-paguei');
    if(ref){ cx.insertBefore(b, ref); cx.insertBefore(dc, ref); ref.textContent='✅ Já paguei de outro jeito'; }
    else { cx.appendChild(b); cx.appendChild(dc); }
    b.onclick=function(){ pagarAgora(b); };
  }
  async function principal(nome){
    var d=db(); if(!d) return null;
    var dec={};
    try{ var pg=await d.collection('pagamentos').where('cliente','==',nome).get(); pg.forEach(function(x){ var o=x.data()||{}; if(o.status==='aguardando') dec[String(o.refColecao)+'|'+String(o.refId)]=1; }); }catch(e){}
    var it=[];
    var s=await d.collection('honorarios').where('cliente','==',nome).get();
    s.forEach(function(x){ var o=x.data()||{}; if(/pago|conclu|entreg|recebid|quitad|baixad|emitid|lanc/i.test(String(o.status||'')) || !/^\d{4}-\d{2}-\d{2}/.test(String(o.vencimento||''))) return;
      if(dec['honorarios|'+x.id]) return; it.push({id:x.id, o:o}); });
    it.sort(function(a,b){ return String(a.o.vencimento)<String(b.o.vencimento)?-1:1; });
    return it[0]||null;
  }
  async function pagarAgora(btn){
    if(clienteOcupado) return; clienteOcupado=true;
    var nome=clienteAtual(); btn.disabled=true; var t0=btn.innerHTML; btn.innerHTML='⏳ Abrindo o QR Code...';
    try{
      var p=await principal(nome);
      if(!p){ aviso('Não encontrei honorário em aberto.','info'); btn.disabled=false; btn.innerHTML=t0; clienteOcupado=false; return; }
      var o=p.o, valor=num(o.valor), comp=String(o.referencia||'');
      var txid=(('HON'+soAZ(comp).slice(0,6))+soAZ(nome).slice(0,10)).slice(0,25)||'APARAT';
      var codigo=pix(valor, txid);
      function tela(){
        var img=qrImg(codigo,6);
        var m=modal('<h4>\u{1F4B8} Pague pelo PIX</h4><p>Honorário '+esc(comp)+' · <b style="color:inherit">'+money(valor)+'</b> · '+esc(FAVORECIDO)+'</p>'
          +'<div class="qrbox">'+(img?'<img src="'+img+'" alt="QR Code PIX">':'')+'<div style="font-size:12px;font-weight:700;margin-top:4px">Escaneie no app do seu banco — o valor já vem preenchido.</div><div class="cod">'+esc(codigo)+'</div></div>'
          +'<button class="b" data-x="cp" style="width:100%;margin-top:10px;padding:12px">\u{1F4CB} Copiar código PIX</button>'
          +'<div class="ok" id="hv2-qrok">⏳ Avisando a APARAT...</div>'
          +'<div class="acoes"><button class="b vd" data-x="ok">Pronto</button></div>');
        var cp=m.querySelector('[data-x=cp]');
        cp.onclick=function(){ copiar(codigo,function(){ cp.textContent='✅ Código copiado! Cole no app do banco'; }); };
        m.querySelector('[data-x=ok]').onclick=function(){ fecharModal(); };
        return m;
      }
      carregarQr();
      var m=tela();
      if(!window.qrcode) carregarQr(function(){ var bx=m.querySelector('.qrbox'); var im=qrImg(codigo,6); if(bx && im && !bx.querySelector('img')){ var i=document.createElement('img'); i.src=im; i.alt='QR Code PIX'; bx.insertBefore(i,bx.firstChild); } });
      var okb=m.querySelector('#hv2-qrok');
      try{
        if(!(window.__PAGOU__ && window.__PAGOU__.declarar)) throw new Error('módulo de pagamentos indisponível');
        await window.__PAGOU__.declarar({id:p.id, valor:valor, vencimento:o.vencimento, referencia:comp, competencia:comp, tipo:'Honorário '+comp, titulo:'Honorário '+comp},
                                         'honorario','honorarios',{viaQR:true},'pix');
        try{ await window.__PAGOU__.carregar(); }catch(e){}
        if(okb) okb.innerHTML='✅ A APARAT já foi avisada do seu pagamento. Depois que ela conferir, você recebe a confirmação aqui no app.<br><small>Se não conseguir pagar agora, fale com a APARAT.</small>';
      }catch(e){
        if(okb){ okb.style.cssText='background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.45);color:#fbbf24'; okb.innerHTML='Não consegui avisar a APARAT agora. Depois de pagar, toque em <b>Já paguei</b> no cartão.'; }
      }
    }catch(e){
      aviso('Não consegui abrir o pagamento: '+(e && (e.message||e)),'erro');
    }
    btn.disabled=false; btn.innerHTML=t0; clienteOcupado=false;
  }

  /* ================= relogio ================= */
  var ocupado=false;
  async function tick(){
    if(ocupado) return; ocupado=true;
    try{
      var u=null; try{ u=firebase.auth().currentUser; }catch(e){}
      if(u){
        if(ehAdmin() && el('pp-honorarios')){
          assinar(); await carregarClientes();
          var pg=el('pp-honorarios');
          if(pg.classList.contains('active') || pg.offsetParent!==null){ desenhar(); estrutura(); marcarQR(); }
          await fecharVelhos();
        }
        var vc=el('view-cliente');
        if(vc && vc.style.display!=='none' && clienteAtual()) travarQR();
      }
    }catch(e){}
    ocupado=false;
  }
  window.__HONV2__.tick=tick;
  window.__HONV2__.desenhar=function(){ desenhar(true); };
  window.__HONV2__._t={compDe:compDe, calc:calc, alertas:alertas, pix:pix, suspeitos:suspeitos, set:function(h,c,m){ H=h; C=c; if(m) MES=m; }};
  [800,2000,4000].forEach(function(t){ setTimeout(tick,t); });
  setInterval(tick,1500);
})();
