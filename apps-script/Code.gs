/**
 * Mis Finanzas · Lector de correos de Interbank y BBVA
 * -----------------------------------------------------
 * Corre dentro de TU cuenta de Gmail (script.google.com). Cada 5 minutos busca correos de
 * consumos de tus tarjetas, extrae monto, moneda, comercio y últimos 4 dígitos, y los registra
 * en la app. Además te envía un correo de aviso antes de tus fechas de pago.
 *
 * Pasos (ver README.md):
 *   1. Completa CONFIG.
 *   2. Ejecuta `probar` y revisa el registro (no guarda nada).
 *   3. Ejecuta `instalar` una sola vez para activar la revisión automática.
 */

const CONFIG = {
  SUPABASE_URL: 'https://uxcwjkpioevszvlguthl.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4Y3dqa3Bpb2V2c3p2bGd1dGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMDY1NzcsImV4cCI6MjExMDc4MjU3N30.iwzl-SAftTrj3l9catCMIwBpZoS6jb70yRW86b2XU1w',
  TOKEN_CORREO: 'PEGA_AQUI_EL_CODIGO_DE_AJUSTES',
  DIAS_BUSQUEDA: 3,               // revisa correos de los últimos N días
  ETIQUETA_OK: 'Mis Finanzas/Registrado',
  ETIQUETA_REVISAR: 'Mis Finanzas/Revisar',
  RESUMEN_SEMANAL_DIA: 1,         // 1 = lunes: ese día llega un resumen aunque no haya alertas
};

// Remitentes de cada banco. Si un correo no se detecta, agrega aquí la dirección exacta del remitente.
const BANCOS = [
  { nombre: 'Interbank', query: 'from:(interbank OR netinterbank OR interbank.pe OR netinterbank.com.pe)' },
  { nombre: 'BBVA', query: 'from:(bbva OR bbva.pe OR bbva.com.pe OR bbvanet OR bbvacontinental)' },
];

/* ======================= Tareas automáticas ======================= */

function revisarCorreos() {
  const procesados = cargarProcesados_();
  const limite = Date.now() - CONFIG.DIAS_BUSQUEDA * 864e5;
  let nuevos = 0, porRevisar = 0;

  BANCOS.forEach((banco) => {
    const hilos = GmailApp.search(`${banco.query} newer_than:${CONFIG.DIAS_BUSQUEDA}d`, 0, 50);
    hilos.forEach((hilo) => {
      hilo.getMessages().forEach((msg) => {
        const id = msg.getId();
        if (procesados.has(id) || msg.getDate().getTime() < limite) return;
        const datos = parsearCorreo_(msg.getSubject(), textoDe_(msg));
        if (datos === null) {                       // parece operación pero no se pudo leer
          etiquetar_(hilo, CONFIG.ETIQUETA_REVISAR);
          procesados.add(id); porRevisar++;
          return;
        }
        if (datos.ignorar) { procesados.add(id); return; }   // promociones, estados de cuenta, etc.
        rpc_('registrar_movimiento_correo', {
          p_token: CONFIG.TOKEN_CORREO,
          p_email_id: id,
          p_fecha: msg.getDate().toISOString(),
          p_monto: datos.monto,
          p_moneda: datos.moneda,
          p_descripcion: datos.descripcion,
          p_banco: banco.nombre,
          p_ultimos4: datos.ultimos4,
          p_tipo: datos.tipo,
        });
        etiquetar_(hilo, CONFIG.ETIQUETA_OK);
        procesados.add(id); nuevos++;
      });
    });
  });

  guardarProcesados_(procesados);
  if (nuevos || porRevisar) console.log(`Registrados: ${nuevos} · Para revisar a mano: ${porRevisar}`);
}

function enviarResumenDiario() {
  const filas = rpc_('estado_tarjetas', { p_token: CONFIG.TOKEN_CORREO }) || [];
  if (!filas.length) return;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const alertas = [], resumen = [];

  filas.forEach((t) => {
    const tc = Number(t.tipo_cambio) || 3.75;
    const usado = Number(t.deuda_pen) + Number(t.deuda_usd) * tc;
    const util = t.linea > 0 ? usado / t.linea : 0;
    const c = ciclo_(t, hoy);
    const diasPago = Math.round((c.pago - hoy) / 864e5);
    const diasCorte = Math.round((c.proxCorte - hoy) / 864e5);
    const deuda = `S/ ${fmt_(t.deuda_pen)}${Number(t.deuda_usd) > 0 ? ` + US$ ${fmt_(t.deuda_usd)}` : ''}`;
    const nombre = `${t.nombre}${t.ultimos4 ? ' ••' + t.ultimos4 : ''}`;

    resumen.push(`<li><b>${nombre}</b>: deuda ${deuda} · uso ${Math.round(util * 100)}% de S/ ${fmt_(t.linea)} · ` +
      `pago ${fechaTxt_(c.pago)} · corte ${fechaTxt_(c.proxCorte)}</li>`);

    if (usado > 0.01 && diasPago >= 0 && diasPago <= t.dias_aviso) {
      alertas.push(`💳 <b>${nombre}</b>: tu fecha de pago es <b>${diasPago === 0 ? 'HOY' : 'en ' + diasPago + ' día(s)'}</b> (${fechaTxt_(c.pago)}). ` +
        `Paga el total del estado de cuenta, no el mínimo. Revisa el monto en la app.`);
    }
    if (util >= 0.3 && diasCorte <= 5) {
      const pagar = usado - 0.3 * t.linea;
      alertas.push(`📉 <b>${nombre}</b>: usas ${Math.round(util * 100)}% de tu línea y el corte es ${diasCorte === 0 ? 'hoy' : 'en ' + diasCorte + ' día(s)'}. ` +
        `Si pagas S/ ${fmt_(pagar)} antes, tu estado de cuenta saldrá bajo 30%.`);
    }
  });

  const esDiaResumen = hoy.getDay() === CONFIG.RESUMEN_SEMANAL_DIA;
  if (!alertas.length && !esDiaResumen) return;

  const html = `<div style="font-family:sans-serif;font-size:15px">
    ${alertas.length ? `<h3>Avisos</h3><p>${alertas.join('</p><p>')}</p>` : '<p>✅ Todo en orden esta semana.</p>'}
    <h3>Tus tarjetas</h3><ul>${resumen.join('')}</ul>
    <p style="color:#666;font-size:13px">Enviado por tu script de Mis Finanzas.</p></div>`;
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: alertas.length ? `⚠️ Mis Finanzas: ${alertas.length} aviso(s) de tus tarjetas` : '📊 Mis Finanzas: resumen semanal',
    htmlBody: html,
  });
}

/* ======================= Instalación y pruebas ======================= */

// Ejecútalo una sola vez. Crea las tareas automáticas (y borra las anteriores para no duplicar).
function instalar() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('revisarCorreos').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('enviarResumenDiario').timeBased().everyDays(1).atHour(8).create();
  rpc_('estado_tarjetas', { p_token: CONFIG.TOKEN_CORREO }); // comprueba que la conexión funciona
  console.log('Listo: se revisará tu correo cada 5 minutos y recibirás avisos a las 8 a. m.');
}

// No guarda nada: muestra cómo se leerían tus últimos correos de cada banco.
function probar() {
  BANCOS.forEach((banco) => {
    const hilos = GmailApp.search(`${banco.query} newer_than:30d`, 0, 8);
    console.log(`===== ${banco.nombre}: ${hilos.length} conversación(es) en 30 días =====`);
    hilos.forEach((hilo) => {
      const msg = hilo.getMessages().pop();
      const r = parsearCorreo_(msg.getSubject(), textoDe_(msg));
      const res = r === null ? '❌ NO SE PUDO LEER (se marcaría para revisar)' : r.ignorar ? '— ignorado (no es una operación)' : JSON.stringify(r);
      console.log(`[${msg.getDate().toLocaleString()}] De: ${msg.getFrom()}\n  Asunto: ${msg.getSubject()}\n  → ${res}`);
    });
  });
}

/* ======================= Lectura de correos ======================= */

function parsearCorreo_(asunto, texto) {
  const todo = `${asunto}\n${texto}`;
  if (/(estado de cuenta|promoci|oferta|sorteo|campaña|descuento|beneficio|actualiza|clave|token digital|bienvenid)/i.test(asunto)) return { ignorar: true };
  if (!/(consumo|compra|cargo|operaci[oó]n|transacci[oó]n|retiro|pago|cobro|d[eé]bito|disposici[oó]n)/i.test(todo)) return { ignorar: true };
  const m = leerMonto_(todo);
  if (!m) return null;
  const esPago = /(pago (de|a) (tu |su )?tarjeta|pago recibido|hemos recibido (tu|su) pago|abono a (tu |su )?tarjeta|pagaste tu tarjeta)/i.test(todo);
  return {
    monto: m.monto,
    moneda: m.moneda,
    ultimos4: leerUltimos4_(todo),
    descripcion: leerComercio_(texto) || asunto.slice(0, 80),
    tipo: esPago ? 'pago_tarjeta' : 'gasto',
  };
}

function leerMonto_(t) {
  const re = /(S\/\.?|PEN|US\$|USD|\$)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const clave = /(monto|importe|total|consumo|valor|cargo|compra)[^0-9\n]{0,25}$/i;
  let primero = null, m;
  while ((m = re.exec(t))) {
    const r = { moneda: /S\/|PEN/i.test(m[1]) ? 'PEN' : 'USD', monto: aNumero_(m[2]) };
    if (!(r.monto > 0)) continue;
    if (!primero) primero = r;
    if (clave.test(t.slice(Math.max(0, m.index - 40), m.index))) return r; // monto junto a "Monto:", "Importe", etc.
  }
  return primero;
}

function aNumero_(s) {
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf('.') > s.lastIndexOf(',') ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = /,[0-9]{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (/\.[0-9]{3}$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  return Math.round(parseFloat(s) * 100) / 100;
}

function leerUltimos4_(t) {
  const pats = [
    /(?:\*|x|•|X){2,}[\s-]*([0-9]{4})\b/,
    /terminad[ao]s?\s+en\s*:?\s*\**\s*([0-9]{4})\b/i,
    /finalizad[ao]s?\s+en\s*:?\s*\**\s*([0-9]{4})\b/i,
    /n[uú]mero de tarjeta\s*:?\s*[0-9*x•X\s-]*?([0-9]{4})\b/i,
  ];
  for (const p of pats) { const m = t.match(p); if (m) return m[1]; }
  return null;
}

function leerComercio_(t) {
  const pats = [
    /(?:comercio|establecimiento|empresa|negocio|lugar)\s*[:\-]\s*([^\n]{2,60})/i,
    /(?:en el comercio|en el establecimiento)\s+([^\n]{2,60})/i,
    /\ben\s+([A-Z0-9][A-Z0-9 .*&'\/-]{2,40}?)(?=\s+(?:por|el|con|,)|\s*\n|\s*$)/,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m) return m[1].split(/\s{2,}/)[0].trim().replace(/[.,;:]+$/, '');
  }
  return null;
}

function textoDe_(msg) {
  let t = msg.getPlainBody();
  if (!t || t.trim().length < 20) {
    t = msg.getBody()
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/tr|\/td)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#36;/g, '$');
  }
  return t.replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n');
}

/* ======================= Ayudantes ======================= */

function rpc_(fn, body) {
  const r = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) throw new Error(`${fn} → ${r.getResponseCode()}: ${r.getContentText()}`);
  const txt = r.getContentText();
  return txt ? JSON.parse(txt) : null;
}

function etiquetar_(hilo, nombre) {
  const e = GmailApp.getUserLabelByName(nombre) || GmailApp.createLabel(nombre);
  hilo.addLabel(e);
}

// Recuerda los IDs ya leídos (además, la base de datos ignora duplicados).
function cargarProcesados_() {
  const raw = PropertiesService.getScriptProperties().getProperty('procesados');
  return new Set(raw ? JSON.parse(raw) : []);
}
function guardarProcesados_(set) {
  const ultimos = Array.from(set).slice(-400);
  PropertiesService.getScriptProperties().setProperty('procesados', JSON.stringify(ultimos));
}

function diaEn_(y, m, d) { return new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate())); }
function ciclo_(t, hoy) {
  let corte = diaEn_(hoy.getFullYear(), hoy.getMonth(), t.dia_corte);
  if (corte >= hoy) corte = diaEn_(corte.getFullYear(), corte.getMonth() - 1, t.dia_corte);
  const salto = t.dia_pago <= t.dia_corte ? 1 : 0;
  const proxCorte = diaEn_(corte.getFullYear(), corte.getMonth() + 1, t.dia_corte);
  let pago = diaEn_(corte.getFullYear(), corte.getMonth() + salto, t.dia_pago);
  if (pago < hoy) pago = diaEn_(proxCorte.getFullYear(), proxCorte.getMonth() + salto, t.dia_pago);
  return { corte, proxCorte, pago };
}
function fmt_(n) { return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fechaTxt_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM'); }
