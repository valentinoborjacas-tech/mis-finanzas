import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/* ================= Utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const dlg = $('#sheet');
const configurado = !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_ANON_KEY.includes('TU_ANON');
const sb = configurado ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const CAT_GASTO = {
  Comida: '🍔', Supermercado: '🛒', Transporte: '🚕', Servicios: '💡', Salud: '💊', Entretenimiento: '🎬',
  Compras: '🛍️', Educación: '📚', Viajes: '✈️', Suscripciones: '📺', Hogar: '🏠', Deudas: '📄', Otros: '📦',
};
const CAT_INGRESO = { Sueldo: '💼', Freelance: '💻', Ventas: '🏷️', Regalo: '🎁', Devolución: '↩️', Otros: '📦' };
const CAT_ICONO = { ...CAT_GASTO, ...CAT_INGRESO, 'Sin categoría': '❔', 'Pago de tarjeta': '💳', Transferencia: '🔁' };
const BANCOS = ['Interbank', 'BBVA', 'BCP', 'Scotiabank', 'Otro'];
const COLOR_BANCO = { Interbank: '#0a9c55', BBVA: '#1464a5', BCP: '#e0601a', Scotiabank: '#d81e05', Otro: '#6d5dfc' };
const TIPOS = { gasto: 'Gasto', ingreso: 'Ingreso', pago_tarjeta: 'Pagar tarjeta', transferencia: 'Transferir' };
const TIPOS_CUENTA = { efectivo: 'Efectivo', ahorro: 'Ahorros', corriente: 'Cuenta corriente' };
const TIPOS_DEUDA = { cuotas: 'Compra en cuotas', prestamo: 'Préstamo', persona: 'Deuda con persona' };
const PALETA = ['#2ee6a6', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#64748b'];

const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 9h-5a3 3 0 0 0 0 6h5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  up: '<path d="M7 17 17 7M8 7h9v9"/>',
  down: '<path d="M17 7 7 17M16 17H7V8"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
};
const ic = (n, s = 22) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SIMB = { PEN: 'S/', USD: 'US$' };
const money = (n, mon = 'PEN') => `${Number(n) < 0 ? '-' : ''}${SIMB[mon]} ${nf.format(Math.abs(Number(n) || 0))}`;
const corto = (n) => (Math.abs(n) >= 1000 ? `S/ ${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `S/ ${Math.round(n)}`);
const grande = (n) => { const [e, d] = nf.format(Math.abs(n)).split('.'); return `${n < 0 ? '-' : ''}S/ ${e}<small>.${d}</small>`; };
const pct = (x) => `${Math.round(x * 100)}%`;
const DIA = 86400000;
const fechaCorta = (d) => new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '');
const fechaLarga = (d) => new Date(d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
const hoy0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const diasHasta = (d) => Math.round((d - hoy0()) / DIA);
const isoLocal = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const enDias = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : n < 0 ? `hace ${-n} días` : `en ${n} días`);
const colorDe = (t) => t.color || COLOR_BANCO[t.banco] || COLOR_BANCO.Otro;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ================= Fechas de corte y pago ================= */
function diaEn(y, m, d) { return new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate())); }
function mesMas(fecha, dia, n) { return diaEn(fecha.getFullYear(), fecha.getMonth() + n, dia); }

function ciclo(t) {
  const hoy = hoy0();
  let corte = diaEn(hoy.getFullYear(), hoy.getMonth(), t.dia_corte);
  if (corte >= hoy) corte = mesMas(corte, t.dia_corte, -1); // el corte de hoy aún no cerró
  const salto = t.dia_pago <= t.dia_corte ? 1 : 0;
  const proxCorte = mesMas(corte, t.dia_corte, 1);
  return {
    corte, proxCorte,
    pago: mesMas(corte, t.dia_pago, salto),
    proxPago: mesMas(proxCorte, t.dia_pago, salto),
    finCorte: new Date(corte.getTime() + DIA),
  };
}

function cortesEntre(f, L, dia) {
  const f0 = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  let c = diaEn(f0.getFullYear(), f0.getMonth(), dia);
  if (c < f0) c = mesMas(c, dia, 1);
  let n = 0;
  while (c <= L && n < 120) { n++; c = mesMas(c, dia, 1); }
  return n;
}

function calcTarjeta(t) {
  const tc = num(estado.ajustes?.tipo_cambio) || 3.75;
  const s = estado.saldosTarjeta[t.id];
  const deuda = { PEN: num(s ? s.deuda_pen : t.deuda_inicial_pen), USD: num(s ? s.deuda_usd : t.deuda_inicial_usd) };
  const usado = deuda.PEN + deuda.USD * tc;
  const linea = num(t.linea);
  const util = linea > 0 ? usado / linea : 0;
  const c = ciclo(t);
  const desdeCorte = { PEN: 0, USD: 0 };
  for (const m of estado.movimientos) {
    if (m.tarjeta_id === t.id && m.tipo === 'gasto' && new Date(m.fecha) >= c.finCorte) desdeCorte[m.moneda] += num(m.monto);
  }
  const noFacturado = { PEN: 0, USD: 0 };
  for (const m of estado.comprasCuotas) {
    if (m.tarjeta_id !== t.id) continue;
    const f = new Date(m.fecha);
    if (f >= c.finCorte) continue;
    const fact = Math.min(m.cuotas, cortesEntre(f, c.corte, t.dia_corte));
    noFacturado[m.moneda] += num(m.monto) * (1 - fact / m.cuotas);
  }
  const pendiente = {
    PEN: Math.max(0, deuda.PEN - desdeCorte.PEN - noFacturado.PEN),
    USD: Math.max(0, deuda.USD - desdeCorte.USD - noFacturado.USD),
  };
  const hayPendiente = pendiente.PEN > 0.009 || pendiente.USD > 0.009;
  const pagoVencido = c.pago < hoy0();
  const paraBajar30 = Math.max(0, usado - 0.3 * linea);
  const nivel = util >= 0.5 ? 'bad' : util >= 0.3 ? 'warn' : 'ok';
  const sinHistorial = t.creado && new Date(t.creado) >= c.finCorte;
  return { deuda, usado, linea, util, c, desdeCorte, pendiente, hayPendiente, pagoVencido, paraBajar30, nivel, tc, sinHistorial, disponible: Math.max(0, linea - usado) };
}

function saldoDeuda(d) {
  if (num(d.cuotas_total) > 0 && num(d.monto_cuota) > 0) return Math.max(0, num(d.monto_cuota) * (d.cuotas_total - d.cuotas_pagadas));
  return Math.max(0, num(d.monto_total) - num(d.pagado));
}
function proximaFechaDeuda(d) {
  if (!d.dia_pago) return null;
  const h = hoy0();
  let f = diaEn(h.getFullYear(), h.getMonth(), d.dia_pago);
  if (f < h) f = mesMas(f, d.dia_pago, 1);
  return f;
}

/* ================= Estado y datos ================= */
const estado = {
  user: null, vista: 'inicio', filtro: 'todos', busqueda: '', billetera: 'cuentas', modoLogin: 'entrar',
  ajustes: null, tarjetas: [], cuentas: [], deudas: [], movimientos: [], comprasCuotas: [],
  saldosTarjeta: {}, saldosCuenta: {},
};

async function cargar() {
  const uid = estado.user.id;
  const r0 = await sb.from('ajustes').upsert({ user_id: uid }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (r0.error) throw r0.error;
  const inicio6m = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString();
  const rs = await Promise.all([
    sb.from('ajustes').select('*').single(),
    sb.from('tarjetas').select('*').order('creado'),
    sb.from('cuentas').select('*').order('creado'),
    sb.from('deudas').select('*').order('creado'),
    sb.from('saldos_tarjeta').select('*'),
    sb.from('saldos_cuenta').select('*'),
    sb.from('movimientos').select('*').gte('fecha', inicio6m).order('fecha', { ascending: false }).limit(1000),
    sb.from('movimientos').select('id,fecha,monto,moneda,cuotas,tarjeta_id').eq('tipo', 'gasto').gt('cuotas', 1),
  ]);
  const err = rs.find((r) => r.error);
  if (err) throw err.error;
  const [a, t, c, d, st, sc, m, mc] = rs.map((r) => r.data);
  Object.assign(estado, {
    ajustes: a, tarjetas: t, cuentas: c, deudas: d, movimientos: m, comprasCuotas: mc,
    saldosTarjeta: Object.fromEntries(st.map((x) => [x.tarjeta_id, x])),
    saldosCuenta: Object.fromEntries(sc.map((x) => [x.cuenta_id, num(x.saldo)])),
  });
}

async function recargar() {
  try { await cargar(); } catch (e) { console.error(e); toast('No se pudo cargar: ' + (e.message || e)); }
  render();
}

const tarjetaPorId = (id) => estado.tarjetas.find((t) => t.id === id);
const cuentaPorId = (id) => estado.cuentas.find((c) => c.id === id);
const porRevisar = () => estado.movimientos.filter((m) => m.origen === 'correo' && (!m.tarjeta_id || m.categoria === 'Sin categoría'));
const tc = () => num(estado.ajustes?.tipo_cambio) || 3.75;
const enSoles = (m) => num(m.monto) * (m.moneda === 'USD' ? tc() : 1);

/* ================= Piezas visuales ================= */
const CHIP = '<svg class="pl-chip" viewBox="0 0 42 32"><rect x="1" y="1" width="40" height="30" rx="7" fill="#e8c766"/><path d="M1 11h13M1 21h13M28 11h13M28 21h13M14 1v30M28 1v30" stroke="#a98a2b" stroke-width="1.4" fill="none"/></svg>';

function plastico(t, k, attrs = '') {
  return `<div class="plastico" style="--c:${esc(colorDe(t))}" ${attrs}>
    <div class="pl-top"><span class="pl-banco">${esc(t.banco)}</span><span class="pill ${k.nivel}">${pct(k.util)} usado</span></div>
    ${CHIP}
    <div class="pl-num">•••• ${esc(t.ultimos4 || '····')}</div>
    <div class="pl-bottom"><div><small>${esc(t.nombre)}</small><b>${money(k.usado)}</b></div>
      <div class="r"><small>Disponible</small><b>${money(k.disponible)}</b></div></div>
  </div>`;
}

const barraUso = (k) => `<div class="barra ${k.nivel}"><i style="width:${Math.min(100, k.util * 100).toFixed(1)}%"></i><span class="meta"></span></div>`;
const deudaTexto = (d, sep = ' + ') => [d.PEN > 0.009 || d.USD <= 0.009 ? money(d.PEN, 'PEN') : '', d.USD > 0.009 ? money(d.USD, 'USD') : ''].filter(Boolean).join(sep);

function dona(items, total) {
  const r = 46, C = 2 * Math.PI * r;
  let off = 0;
  const segs = items.map(([, v, c]) => {
    const len = (v / total) * C;
    const s = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${c}" stroke-width="14" stroke-dasharray="${Math.max(0.01, len - (items.length > 1 ? 2 : 0)).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)" stroke-linecap="butt"/>`;
    off += len;
    return s;
  }).join('');
  return `<svg viewBox="0 0 120 120" class="donut" role="img" aria-label="Gastos por categoría">
    <circle r="${r}" cx="60" cy="60" fill="none" stroke="var(--surface-3)" stroke-width="14"/>${segs}
    <text x="60" y="56" text-anchor="middle" class="d-lbl">Total</text>
    <text x="60" y="73" text-anchor="middle" class="d-val">${corto(total)}</text></svg>`;
}

function barras(meses) {
  const max = Math.max(...meses.map((m) => m.v), 1);
  return `<div class="bars" role="img" aria-label="Gastos de los últimos 6 meses">${meses.map((m) => `
    <div class="bar ${m.actual ? 'act' : ''}"><span class="bv">${m.v ? corto(m.v) : ''}</span>
      <div class="track"><i style="height:${Math.max(3, (m.v / max) * 100).toFixed(1)}%"></i></div>
      <span class="bl">${m.lbl}</span></div>`).join('')}</div>`;
}

function itemMov(m) {
  const medio = m.tarjeta_id ? tarjetaPorId(m.tarjeta_id)?.nombre : m.cuenta_id ? cuentaPorId(m.cuenta_id)?.nombre : null;
  const icono = m.tipo === 'pago_tarjeta' ? '💳' : m.tipo === 'transferencia' ? '🔁' : (CAT_ICONO[m.categoria] || '📦');
  const signo = m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '−' : '';
  const detalle = [m.origen === 'correo' && !medio ? '⚠️ Asigna tarjeta' : medio,
    m.tipo === 'gasto' || m.tipo === 'ingreso' ? m.categoria : TIPOS[m.tipo], m.cuotas > 1 ? `${m.cuotas} cuotas` : ''].filter(Boolean).join(' · ');
  return `<li data-action="editar-mov" data-id="${m.id}">
    <div class="av">${icono}</div>
    <div class="txt"><b>${esc(m.descripcion || TIPOS[m.tipo])}</b><span>${m.origen === 'correo' ? '📧 ' : ''}${esc(detalle)}</span></div>
    <div class="monto ${m.tipo === 'ingreso' ? 'pos' : ''}">${signo}${money(m.monto, m.moneda)}</div></li>`;
}

const avFecha = (f) => `<div class="av fecha ${diasHasta(f) <= 3 ? 'urg' : ''}">${f.getDate()}<small>${f.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')}</small></div>`;

/* ================= Vistas ================= */
const TABS = [['inicio', 'home', 'Inicio'], ['tarjetas', 'card', 'Tarjetas'], null, ['movimientos', 'list', 'Movimientos'], ['billetera', 'wallet', 'Billetera']];
const TITULOS = { inicio: 'Inicio', tarjetas: 'Mis tarjetas', movimientos: 'Movimientos', billetera: 'Billetera' };

function render() {
  if (!configurado) { app.innerHTML = vistaSinConfig(); return; }
  if (!estado.user) { app.innerHTML = vistaLogin(); return; }
  const saludo = estado.vista === 'inicio'
    ? `<div><p class="sub">${esc(new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>Hola 👋</h1></div>`
    : `<h1>${TITULOS[estado.vista]}</h1>`;
  app.innerHTML = `
    <header class="top">${saludo}<button class="icon-btn" data-action="ajustes" aria-label="Ajustes">${ic('settings', 20)}</button></header>
    <main>${VISTAS[estado.vista]()}</main>
    <nav class="tabs">${TABS.map((t) => (t
      ? `<button data-vista="${t[0]}" ${t[0] === estado.vista ? 'aria-current="page"' : ''}>${ic(t[1])}${t[2]}</button>`
      : `<button class="add" data-action="nuevo-mov" aria-label="Registrar movimiento">${ic('plus', 28)}</button>`)).join('')}</nav>`;
}

function vistaSinConfig() {
  return `<div class="login"><div class="logo">${ic('card', 30)}</div><h1>Mis Finanzas</h1>
    <p class="muted">Falta conectar la app con tu base de datos (js/config.js).</p></div>`;
}

function vistaLogin() {
  const crear = estado.modoLogin === 'crear';
  return `<div class="login">
    <div class="logo">${ic('card', 30)}</div>
    <h1>${crear ? 'Crea tu cuenta' : 'Mis Finanzas'}</h1>
    <p class="muted">${crear ? 'Solo la primera vez.' : 'Tus tarjetas, gastos y deudas en un solo lugar.'}</p>
    <form id="login-form">
      <label class="lbl" for="l-email">Correo</label>
      <input id="l-email" name="email" type="email" autocomplete="email" required>
      <label class="lbl" for="l-pass">Contraseña</label>
      <input id="l-pass" name="password" type="password" minlength="8" autocomplete="${crear ? 'new-password' : 'current-password'}" required>
      ${crear ? '<p class="hint">Mínimo 8 caracteres. No uses la clave de tu correo ni de tus bancos.</p>' : ''}
      <button class="btn primary block" type="submit">${crear ? 'Crear cuenta' : 'Ingresar'}</button>
      <p class="error" id="login-error"></p>
    </form>
    <button class="btn block ghost" data-action="cambiar-login">${crear ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}</button>
  </div>`;
}

const VISTAS = {
  inicio() {
    const tiene = { PEN: 0, USD: 0 };
    estado.cuentas.filter((c) => c.activa).forEach((c) => { tiene[c.moneda] += estado.saldosCuenta[c.id] ?? num(c.saldo_inicial); });
    const debe = { PEN: 0, USD: 0 };
    const ks = estado.tarjetas.filter((t) => t.activa).map((t) => [t, calcTarjeta(t)]);
    ks.forEach(([, k]) => { debe.PEN += k.deuda.PEN; debe.USD += k.deuda.USD; });
    estado.deudas.filter((d) => d.activa && !d.tarjeta_id).forEach((d) => { debe[d.moneda] += saldoDeuda(d); });
    const tieneS = tiene.PEN + tiene.USD * tc();
    const debeS = debe.PEN + debe.USD * tc();

    // Próximos pagos
    const pagos = [];
    for (const [t, k] of ks) {
      const base = { titulo: t.nombre, vista: 'tarjetas' };
      if (k.sinHistorial) { if (!k.pagoVencido) pagos.push({ ...base, fecha: k.c.pago, monto: '', nota: 'Revisa el monto en tu banco' }); }
      else if (k.hayPendiente && !k.pagoVencido) pagos.push({ ...base, fecha: k.c.pago, monto: deudaTexto(k.pendiente, '<br>'), nota: 'Paga el total' });
      else if (k.hayPendiente) pagos.push({ ...base, fecha: k.c.pago, monto: deudaTexto(k.pendiente, '<br>'), nota: '¿Ya pagaste? Regístralo', alerta: true });
      else if (k.usado > 0.009) pagos.push({ ...base, fecha: k.c.proxPago, monto: '', nota: `Corte ${fechaCorta(k.c.proxCorte)}` });
    }
    for (const d of estado.deudas.filter((x) => x.activa && !x.tarjeta_id)) {
      const f = proximaFechaDeuda(d);
      if (f) pagos.push({ fecha: f, titulo: d.nombre, vista: 'billetera', monto: d.monto_cuota ? money(d.monto_cuota, d.moneda) : '', nota: TIPOS_DEUDA[d.tipo] });
    }
    pagos.sort((a, b) => a.fecha - b.fecha);

    // Gastos del mes y de 6 meses
    const h = hoy0();
    const ini = new Date(h.getFullYear(), h.getMonth(), 1);
    const cats = {};
    let totalMes = 0;
    const meses = Array.from({ length: 6 }, (_, i) => {
      const f = new Date(h.getFullYear(), h.getMonth() - 5 + i, 1);
      return { y: f.getFullYear(), m: f.getMonth(), lbl: f.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''), v: 0, actual: i === 5 };
    });
    for (const m of estado.movimientos) {
      if (m.tipo !== 'gasto') continue;
      const f = new Date(m.fecha);
      const v = enSoles(m);
      const mes = meses.find((x) => x.y === f.getFullYear() && x.m === f.getMonth());
      if (mes) mes.v += v;
      if (f >= ini) { cats[m.categoria] = (cats[m.categoria] || 0) + v; totalMes += v; }
    }
    let catsOrd = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    if (catsOrd.length > 6) catsOrd = [...catsOrd.slice(0, 5), ['Otras', catsOrd.slice(5).reduce((s, x) => s + x[1], 0)]];
    const items = catsOrd.map(([c, v], i) => [c, v, PALETA[i % PALETA.length]]);

    const revisar = porRevisar().length;
    const altas = ks.filter(([, k]) => k.util >= 0.3).sort((a, b) => b[1].util - a[1].util);
    const nombreMes = h.toLocaleDateString('es-PE', { month: 'long' });

    return `
      <section class="hero">
        <div class="lbl">Patrimonio neto</div>
        <div class="big">${grande(tieneS - debeS)}</div>
        <div class="hero-stats">
          <div><span><i class="dot" style="background:var(--ok)"></i>Tienes</span><b>${money(tiene.PEN)}</b>${tiene.USD ? `<em>+ ${money(tiene.USD, 'USD')}</em>` : ''}</div>
          <div><span><i class="dot" style="background:var(--bad)"></i>Debes</span><b>${money(debe.PEN)}</b>${debe.USD ? `<em>+ ${money(debe.USD, 'USD')}</em>` : ''}</div>
        </div>
      </section>
      ${revisar ? `<button class="banner" data-action="ver-revisar">${ic('mail', 20)}<span><b>${revisar}</b> cargo(s) del correo por revisar</span>${ic('up', 16)}</button>` : ''}
      ${altas.slice(0, 2).map(([t, k]) => `<button class="banner ${k.nivel}" data-vista="tarjetas">${ic('alert', 20)}<span><b>${esc(t.nombre)}</b> al ${pct(k.util)}. Paga ${money(k.paraBajar30)} antes del ${fechaCorta(k.c.proxCorte)} para bajar de 30%.</span></button>`).join('')}

      <div class="seccion"><h2>Mis tarjetas</h2><button data-vista="tarjetas">Ver detalle</button></div>
      <div class="carrusel">
        ${ks.map(([t, k]) => plastico(t, k, 'data-vista="tarjetas"')).join('')}
        <button class="plastico nueva" data-action="nueva-tarjeta">${ic('plus')}Agregar tarjeta</button>
      </div>

      <div class="seccion"><h2>Próximos pagos</h2></div>
      <div class="card">${pagos.length ? `<ul class="lista">${pagos.slice(0, 5).map((p) => `
        <li data-vista="${p.vista}">${avFecha(p.fecha)}
          <div class="txt"><b>${esc(p.titulo)}</b><span>${p.alerta ? '⚠️ ' : ''}${enDias(diasHasta(p.fecha))} · ${esc(p.nota)}</span></div>
          <div class="monto">${p.monto}</div></li>`).join('')}</ul>` : '<p class="vacio">No tienes pagos próximos.</p>'}</div>

      <div class="seccion"><h2>Gastos de ${nombreMes}</h2><button data-vista="movimientos">Ver todo</button></div>
      <div class="card">${items.length ? `<div class="dona-wrap">${dona(items, totalMes)}
        <ul class="leyenda">${items.map(([c, v, col]) => `<li><i class="dot" style="background:${col}"></i><span>${CAT_ICONO[c] || ''} ${esc(c)}</span><b>${corto(v)}</b></li>`).join('')}</ul></div>`
        : '<p class="vacio">Aún no hay gastos este mes.</p>'}</div>

      <div class="seccion"><h2>Últimos 6 meses</h2></div>
      <div class="card">${barras(meses)}</div>

      <div class="seccion"><h2>Últimos movimientos</h2><button data-vista="movimientos">Ver todos</button></div>
      <div class="card">${estado.movimientos.length ? `<ul class="lista">${estado.movimientos.slice(0, 5).map(itemMov).join('')}</ul>` : '<p class="vacio">Toca + para registrar tu primer gasto.</p>'}</div>`;
  },

  tarjetas() {
    const lista = estado.tarjetas.filter((t) => t.activa);
    return `
      ${lista.map((t) => {
        const k = calcTarjeta(t);
        const dPago = diasHasta(k.c.pago);
        let pagoStat, aviso = '';
        if (k.sinHistorial) {
          pagoStat = `<div class="stat"><span>A pagar este mes</span><b>Ver en el banco</b><em>${k.pagoVencido ? 'desde el próximo corte' : `hasta el ${fechaCorta(k.c.pago)}`}</em></div>`;
        } else if (k.hayPendiente && !k.pagoVencido) {
          pagoStat = `<div class="stat destacado"><span>A pagar este mes</span><b>${deudaTexto(k.pendiente, '<br>')}</b><em>hasta el ${fechaCorta(k.c.pago)} · ${enDias(dPago)}</em></div>`;
          if (dPago <= 3) aviso = `<div class="banner bad">${ic('alert', 20)}<span>Tu pago vence ${enDias(dPago)}. Paga el <b>total</b>, no el mínimo.</span></div>`;
        } else if (k.hayPendiente) {
          pagoStat = `<div class="stat"><span>Pendiente</span><b>${deudaTexto(k.pendiente, '<br>')}</b><em>venció el ${fechaCorta(k.c.pago)}</em></div>`;
          aviso = `<div class="banner bad">${ic('alert', 20)}<span>Quedó saldo del último estado de cuenta. Si ya pagaste, regístralo.</span></div>`;
        } else {
          pagoStat = `<div class="stat"><span>A pagar este mes</span><b class="pos">Pagado ✓</b><em>próximo: ${fechaCorta(k.c.proxPago)}</em></div>`;
        }
        if (!aviso && k.paraBajar30 > 0.009) aviso = `<div class="banner">${ic('trend', 20)}<span>Paga <b>${money(k.paraBajar30)}</b> antes del corte (${fechaCorta(k.c.proxCorte)}) para cerrar bajo 30%.</span></div>`;
        return `<section class="tarjeta-bloque">
          ${plastico(t, k)}
          <div class="card uso">
            <div class="row"><span>Uso de línea</span><span class="pill ${k.nivel}">${pct(k.util)}</span></div>
            ${barraUso(k)}
            <div class="row"><span>Usado <b>${money(k.usado)}</b></span><span>Línea <b>${money(k.linea)}</b></span></div>
          </div>
          ${aviso}
          <div class="stats">
            ${pagoStat}
            <div class="stat"><span>Deuda total</span><b>${deudaTexto(k.deuda, '<br>')}</b><em>${k.desdeCorte.PEN + k.desdeCorte.USD > 0 ? `${money(k.desdeCorte.PEN)} desde el corte` : 'sin consumos nuevos'}</em></div>
            <div class="stat"><span>Próximo corte</span><b>${fechaCorta(k.c.proxCorte)}</b><em>${enDias(diasHasta(k.c.proxCorte))}</em></div>
            <div class="stat"><span>Disponible</span><b>${money(k.disponible)}</b><em>TC S/ ${esc(tc())}</em></div>
          </div>
          <div class="btns">
            <button class="btn primary" data-action="pagar-tarjeta" data-id="${t.id}">Registrar pago</button>
            <button class="btn" data-action="filtrar" data-filtro="t:${t.id}">Movimientos</button>
            <button class="icon-btn" data-action="editar-tarjeta" data-id="${t.id}" aria-label="Editar tarjeta">${ic('edit', 18)}</button>
          </div>
        </section>`;
      }).join('') || '<div class="card vacio">Agrega tu Interbank y tu BBVA con la deuda que tienen hoy.</div>'}
      <button class="btn block ghost" data-action="nueva-tarjeta">${ic('plus', 18)}Agregar tarjeta</button>`;
  },

  movimientos() {
    const opciones = [['todos', 'Todos'], ['revisar', `📧 Por revisar (${porRevisar().length})`],
      ...estado.tarjetas.filter((t) => t.activa).map((t) => [`t:${t.id}`, `💳 ${t.nombre}`]),
      ...estado.cuentas.filter((c) => c.activa).map((c) => [`c:${c.id}`, `${c.tipo === 'efectivo' ? '💵' : '🏦'} ${c.nombre}`])];
    const h = hoy0();
    const ini = new Date(h.getFullYear(), h.getMonth(), 1);
    let g = 0, i = 0;
    for (const m of estado.movimientos) {
      if (new Date(m.fecha) < ini) continue;
      if (m.tipo === 'gasto') g += enSoles(m);
      if (m.tipo === 'ingreso' && m.cuenta_id) i += enSoles(m);
    }
    return `
      <label class="buscar">${ic('search', 18)}<input id="buscar" type="search" placeholder="Buscar comercio o descripción" value="${esc(estado.busqueda)}" aria-label="Buscar"></label>
      <div class="chips">${opciones.map(([v, n]) => `<button class="chip" data-action="filtro" data-filtro="${esc(v)}" aria-pressed="${v === estado.filtro}">${esc(n)}</button>`).join('')}</div>
      <div class="resumen-mes">
        <div class="stat"><span>Gastos del mes</span><b>${money(g)}</b></div>
        <div class="stat"><span>Ingresos del mes</span><b class="pos">${money(i)}</b></div>
      </div>
      <div id="lista-movs">${listaMovs()}</div>`;
  },

  billetera() {
    const seg = `<div class="seg" style="margin-bottom:14px">
      <button data-action="billetera" data-sub="cuentas" aria-pressed="${estado.billetera === 'cuentas'}">Efectivo y cuentas</button>
      <button data-action="billetera" data-sub="deudas" aria-pressed="${estado.billetera === 'deudas'}">Deudas</button></div>`;
    return seg + (estado.billetera === 'cuentas' ? vistaCuentas() : vistaDeudas());
  },
};

function listaMovs() {
  const f = estado.filtro;
  const q = estado.busqueda.trim().toLowerCase();
  let movs = estado.movimientos;
  if (f === 'revisar') movs = porRevisar();
  else if (f.startsWith('t:')) movs = movs.filter((m) => m.tarjeta_id === f.slice(2));
  else if (f.startsWith('c:')) movs = movs.filter((m) => m.cuenta_id === f.slice(2) || m.cuenta_destino_id === f.slice(2));
  if (q) movs = movs.filter((m) => `${m.descripcion || ''} ${m.categoria}`.toLowerCase().includes(q));
  if (!movs.length) return '<p class="vacio">No hay movimientos aquí.</p>';
  let html = '';
  let dia = '';
  for (const m of movs) {
    const d = isoLocal(m.fecha);
    if (d !== dia) {
      if (dia) html += '</ul></div>';
      const dd = diasHasta(new Date(`${d}T00:00:00`));
      html += `<div class="dia">${dd === 0 ? 'Hoy' : dd === -1 ? 'Ayer' : esc(fechaLarga(m.fecha))}</div><div class="card" style="padding:4px 14px"><ul class="lista">`;
      dia = d;
    }
    html += itemMov(m);
  }
  return html + '</ul></div>';
}

function vistaCuentas() {
  const lista = estado.cuentas.filter((c) => c.activa);
  const total = { PEN: 0, USD: 0 };
  lista.forEach((c) => { total[c.moneda] += estado.saldosCuenta[c.id] ?? num(c.saldo_inicial); });
  return `
    <section class="hero"><div class="lbl">Total disponible</div><div class="big" style="margin-bottom:4px">${grande(total.PEN)}</div>
      ${total.USD ? `<div class="muted">+ ${money(total.USD, 'USD')}</div>` : ''}</section>
    <div class="card">${lista.length ? `<ul class="lista">${lista.map((c) => `
      <li data-action="editar-cuenta" data-id="${c.id}">
        <div class="av">${c.tipo === 'efectivo' ? '💵' : '🏦'}</div>
        <div class="txt"><b>${esc(c.nombre)}</b><span>${TIPOS_CUENTA[c.tipo]} · ${c.moneda}</span></div>
        <div class="monto">${money(estado.saldosCuenta[c.id] ?? c.saldo_inicial, c.moneda)}</div></li>`).join('')}</ul>`
      : '<p class="vacio">Agrega tu efectivo y tus cuentas con el saldo de hoy.</p>'}</div>
    <div class="btns" style="margin-bottom:10px">
      <button class="btn" data-action="nuevo-mov" data-tipo="ingreso">${ic('down', 18)}Ingreso</button>
      <button class="btn" data-action="nuevo-mov" data-tipo="transferencia">🔁 Transferir</button>
    </div>
    <button class="btn block ghost" data-action="nueva-cuenta">${ic('plus', 18)}Agregar cuenta o efectivo</button>`;
}

function vistaDeudas() {
  const activas = estado.deudas.filter((d) => d.activa);
  const cerradas = estado.deudas.filter((d) => !d.activa);
  const item = (d) => {
    const saldo = saldoDeuda(d);
    const total = num(d.cuotas_total) > 0 && num(d.monto_cuota) > 0 ? num(d.monto_cuota) * d.cuotas_total : num(d.monto_total);
    const avance = total > 0 ? Math.min(1, 1 - saldo / total) : 0;
    const f = proximaFechaDeuda(d);
    return `<div class="card">
      <div class="row"><div style="min-width:0"><b>${esc(d.nombre)}</b><div class="small muted">${TIPOS_DEUDA[d.tipo]}${d.acreedor ? ' · ' + esc(d.acreedor) : ''}${d.tarjeta_id ? ' · 💳 ' + esc(tarjetaPorId(d.tarjeta_id)?.nombre || '') : ''}</div></div>
        <div style="text-align:right"><b class="num">${money(saldo, d.moneda)}</b><div class="small muted">por pagar</div></div></div>
      <div class="progreso"><i style="width:${(avance * 100).toFixed(1)}%"></i></div>
      <div class="row small muted"><span>${d.cuotas_total ? `Cuota ${d.cuotas_pagadas} de ${d.cuotas_total}` : `${pct(avance)} pagado`}</span>
        <span>${f && d.activa ? `Próximo: ${fechaCorta(f)}${d.monto_cuota ? ' · ' + money(d.monto_cuota, d.moneda) : ''}` : ''}</span></div>
      <div class="btns" style="margin-top:12px">${d.activa ? `<button class="btn primary" data-action="pagar-deuda" data-id="${d.id}">Registrar pago</button>` : ''}
        <button class="icon-btn" data-action="editar-deuda" data-id="${d.id}" aria-label="Editar deuda">${ic('edit', 18)}</button></div></div>`;
  };
  return `${activas.map(item).join('') || '<div class="card vacio">Sin deudas. Aquí van compras en cuotas, préstamos o deudas con personas.</div>'}
    <button class="btn block ghost" data-action="nueva-deuda">${ic('plus', 18)}Agregar deuda</button>
    ${cerradas.length ? `<div class="seccion"><h2>Terminadas 🎉</h2></div>${cerradas.map(item).join('')}` : ''}`;
}

/* ================= Hoja de formularios ================= */
let alGuardar = null;
function abrirSheet(titulo, cuerpo, onSubmit, { extra = '', textoGuardar = 'Guardar' } = {}) {
  dlg.innerHTML = `<form id="sheet-form" novalidate>
    <div class="sheet-head"><h2>${esc(titulo)}</h2><button type="button" class="icon-btn" data-action="cerrar-sheet" aria-label="Cerrar">${ic('close', 18)}</button></div>
    <div class="sheet-body">${cuerpo}</div>
    <p class="error" id="sheet-error"></p>
    <div class="sheet-foot">${extra}<button class="btn primary" type="submit">${textoGuardar}</button></div></form>`;
  alGuardar = onSubmit;
  dlg.showModal();
}
const cerrarSheet = () => { dlg.close(); alGuardar = null; };

const opt = (v, n, sel) => `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(n)}</option>`;
const campo = (id, etiqueta, input, hint = '') => `<label class="lbl" for="${id}">${etiqueta}</label>${input}${hint ? `<p class="hint">${hint}</p>` : ''}`;
const segMoneda = (sel = 'PEN', name = 'moneda') => `<div class="seg">
  <input type="radio" id="${name}-pen" name="${name}" value="PEN" ${sel !== 'USD' ? 'checked' : ''}><label for="${name}-pen">Soles S/</label>
  <input type="radio" id="${name}-usd" name="${name}" value="USD" ${sel === 'USD' ? 'checked' : ''}><label for="${name}-usd">Dólares US$</label></div>`;
let uid = 0;
const opciones = (name, items, sel) => `<div class="opciones">${items.map(([v, n, color]) => {
  const id = `o${++uid}`;
  return `<input type="radio" name="${name}" id="${id}" value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'checked' : ''}><label for="${id}">${color ? `<i class="sw" style="--c:${esc(color)}"></i>` : ''}${esc(n)}</label>`;
}).join('')}</div>`;
const gridCats = (tipo, sel) => {
  const cats = tipo === 'ingreso' ? CAT_INGRESO : CAT_GASTO;
  const elegido = sel && cats[sel] ? sel : null;
  return `<div class="cats">${Object.entries(cats).map(([c, e]) => {
    const id = `k${++uid}`;
    return `<input type="radio" name="categoria" id="${id}" value="${esc(c)}" ${c === elegido ? 'checked' : ''}><label for="${id}"><span>${e}</span>${esc(c)}</label>`;
  }).join('')}</div>`;
};

/* ---- Movimientos ---- */
let movEditando = null;
function formMovimiento(m = null, tipoInicial = 'gasto') {
  movEditando = m;
  const tipo = m?.tipo || tipoInicial;
  const tarjetas = estado.tarjetas.filter((t) => t.activa || t.id === m?.tarjeta_id);
  const cuentas = estado.cuentas.filter((c) => c.activa || c.id === m?.cuenta_id || c.id === m?.cuenta_destino_id);
  const medioSel = m ? (m.tarjeta_id ? `t:${m.tarjeta_id}` : m.cuenta_id ? `c:${m.cuenta_id}` : '') : (tarjetas[0] ? `t:${tarjetas[0].id}` : cuentas[0] ? `c:${cuentas[0].id}` : '');
  const medios = [...tarjetas.map((t) => [`t:${t.id}`, t.nombre, colorDe(t)]), ...cuentas.map((c) => [`c:${c.id}`, `${c.tipo === 'efectivo' ? '💵' : '🏦'} ${c.nombre}`])];
  const ctas = cuentas.map((c) => [c.id, `${c.tipo === 'efectivo' ? '💵' : '🏦'} ${c.nombre}`]);
  const cuerpo = `
    <div class="seg" style="margin-top:12px">${Object.entries(TIPOS).map(([k, n]) => `
      <input type="radio" id="tipo-${k}" name="tipo" value="${k}" ${k === tipo ? 'checked' : ''}><label for="tipo-${k}">${n}</label>`).join('')}</div>
    <div class="monto-grande">
      <input id="f-monto" name="monto" inputmode="decimal" value="${m ? esc(m.monto) : ''}" placeholder="0.00" aria-label="Monto" autocomplete="off">
      <div class="moneda-toggle">
        <input type="radio" id="moneda-pen" name="moneda" value="PEN" ${m?.moneda !== 'USD' ? 'checked' : ''}><label for="moneda-pen">S/</label>
        <input type="radio" id="moneda-usd" name="moneda" value="USD" ${m?.moneda === 'USD' ? 'checked' : ''}><label for="moneda-usd">US$</label>
      </div>
    </div>
    <div data-para="gasto"><div class="lbl">Pagado con</div>${opciones('medio_gasto', medios, medioSel)}</div>
    <div data-para="ingreso"><div class="lbl">Recibido en</div>${opciones('medio_ingreso', [...ctas.map(([v, n]) => [`c:${v}`, n]), ...tarjetas.map((t) => [`t:${t.id}`, `${t.nombre} (devolución)`, colorDe(t)])], m?.tipo === 'ingreso' ? medioSel : (ctas[0] ? `c:${ctas[0][0]}` : ''))}</div>
    <div data-para="pago_tarjeta">
      <div class="lbl">Tarjeta que pagaste</div>${opciones('tarjeta', tarjetas.map((t) => [t.id, t.nombre, colorDe(t)]), m?.tarjeta_id || tarjetas[0]?.id)}
      <div class="lbl">Desde</div>${opciones('cuenta_origen', [['', 'Otra cuenta'], ...ctas], m?.tipo === 'pago_tarjeta' ? (m.cuenta_id || '') : '')}
      <p class="hint">Regístralo en la moneda de la deuda que cancelas.</p>
    </div>
    <div data-para="transferencia">
      <div class="lbl">Desde</div>${opciones('cuenta_t_origen', ctas, m?.cuenta_id)}
      <div class="lbl">Hacia</div>${opciones('cuenta_t_destino', ctas, m?.cuenta_destino_id)}
      <p class="hint">Ej. retiro del cajero: de Ahorros a Efectivo.</p>
    </div>
    <div data-para="gasto ingreso"><div class="lbl">Categoría</div><div id="cats-box">${gridCats(tipo, m?.categoria)}</div></div>
    ${campo('f-desc', 'Descripción', `<input id="f-desc" name="descripcion" value="${esc(m?.descripcion)}" placeholder="Ej. Plaza Vea, almuerzo">`)}
    <details class="mas" ${m && (m.cuotas > 1 || isoLocal(m.fecha) !== isoLocal(new Date())) ? 'open' : ''}><summary>Fecha${tipo === 'gasto' ? ' y cuotas' : ''}</summary>
      <div class="grid2">
        <div>${campo('f-fecha', 'Fecha', `<input id="f-fecha" name="fecha" type="date" value="${isoLocal(m?.fecha || new Date())}">`)}</div>
        <div data-para="gasto">${campo('f-cuotas', 'Cuotas', `<input id="f-cuotas" name="cuotas" type="number" min="1" max="60" value="${m?.cuotas || 1}">`)}</div>
      </div>
    </details>
    ${m?.origen === 'correo' ? `<p class="hint">📧 Leído de un correo de ${esc(m.banco || 'tu banco')}${m.ultimos4 ? ' (•••• ' + esc(m.ultimos4) + ')' : ''}.</p>` : ''}`;
  abrirSheet(m ? 'Editar movimiento' : 'Nuevo movimiento', cuerpo, (d) => guardarMov(d, m),
    { extra: m ? `<button type="button" class="btn danger" data-action="borrar" data-tabla="movimientos" data-id="${m.id}">Eliminar</button>` : '' });
  actualizarTipo(false);
  if (!m) setTimeout(() => $('#f-monto')?.focus(), 50);
}

function actualizarTipo(cambio = true) {
  const form = $('#sheet-form');
  const tipo = form?.querySelector('input[name="tipo"]:checked')?.value;
  if (!tipo) return;
  form.querySelectorAll('[data-para]').forEach((el) => { el.style.display = el.dataset.para.split(' ').includes(tipo) ? '' : 'none'; });
  if (cambio && (tipo === 'gasto' || tipo === 'ingreso')) $('#cats-box').innerHTML = gridCats(tipo, movEditando?.categoria);
}

async function guardarMov(d, original) {
  const monto = num(d.monto);
  if (!(monto > 0)) throw new Error('Ingresa un monto mayor a 0.');
  const mismaFecha = original && isoLocal(original.fecha) === d.fecha;
  const reg = {
    tipo: d.tipo, monto, moneda: d.moneda, descripcion: d.descripcion?.trim() || null,
    categoria: d.categoria || 'Otros',
    fecha: mismaFecha ? original.fecha : new Date(`${d.fecha}T12:00:00`).toISOString(),
    tarjeta_id: null, cuenta_id: null, cuenta_destino_id: null, cuotas: 1,
  };
  if (d.tipo === 'gasto' || d.tipo === 'ingreso') {
    const [k, id] = String((d.tipo === 'gasto' ? d.medio_gasto : d.medio_ingreso) || '').split(':');
    if (!id) throw new Error(d.tipo === 'gasto' ? 'Elige con qué pagaste (agrega una tarjeta o cuenta primero).' : 'Elige dónde recibiste el dinero.');
    if (k === 't') reg.tarjeta_id = id; else reg.cuenta_id = id;
    if (d.tipo === 'gasto' && k === 't') reg.cuotas = Math.min(60, Math.max(1, parseInt(d.cuotas, 10) || 1));
  } else if (d.tipo === 'pago_tarjeta') {
    if (!d.tarjeta) throw new Error('Elige la tarjeta que pagaste.');
    reg.tarjeta_id = d.tarjeta;
    reg.cuenta_id = d.cuenta_origen || null;
    reg.categoria = 'Pago de tarjeta';
  } else {
    if (!d.cuenta_t_origen || !d.cuenta_t_destino) throw new Error('Elige la cuenta de origen y la de destino.');
    if (d.cuenta_t_origen === d.cuenta_t_destino) throw new Error('El origen y el destino deben ser distintos.');
    reg.cuenta_id = d.cuenta_t_origen;
    reg.cuenta_destino_id = d.cuenta_t_destino;
    reg.categoria = 'Transferencia';
  }
  const { error } = original
    ? await sb.from('movimientos').update(reg).eq('id', original.id)
    : await sb.from('movimientos').insert(reg);
  if (error) throw error;
  toast(original ? 'Movimiento actualizado' : 'Movimiento registrado ✓');
}

/* ---- Tarjetas ---- */
function formTarjeta(t = null) {
  const cuerpo = `
    ${campo('t-banco', 'Banco', `<select id="t-banco" name="banco">${BANCOS.map((b) => opt(b, b, t?.banco || 'Interbank')).join('')}</select>`)}
    ${campo('t-nombre', 'Nombre', `<input id="t-nombre" name="nombre" value="${esc(t?.nombre)}" placeholder="Ej. Interbank Visa Clásica">`)}
    <div class="grid2">
      <div>${campo('t-u4', 'Últimos 4 dígitos', `<input id="t-u4" name="ultimos4" inputmode="numeric" maxlength="4" value="${esc(t?.ultimos4)}" placeholder="1234">`)}</div>
      <div>${campo('t-linea', 'Línea (S/)', `<input id="t-linea" name="linea" inputmode="decimal" value="${esc(t?.linea ?? '')}">`)}</div>
    </div>
    <div class="grid2">
      <div>${campo('t-corte', 'Día de corte', `<input id="t-corte" name="dia_corte" type="number" min="1" max="31" value="${esc(t?.dia_corte ?? '')}">`)}</div>
      <div>${campo('t-pago', 'Último día de pago', `<input id="t-pago" name="dia_pago" type="number" min="1" max="31" value="${esc(t?.dia_pago ?? '')}">`)}</div>
    </div>
    <div class="grid2">
      <div>${campo('t-dpen', 'Deuda hoy S/', `<input id="t-dpen" name="deuda_inicial_pen" inputmode="decimal" value="${esc(t?.deuda_inicial_pen ?? 0)}">`)}</div>
      <div>${campo('t-dusd', 'Deuda hoy US$', `<input id="t-dusd" name="deuda_inicial_usd" inputmode="decimal" value="${esc(t?.deuda_inicial_usd ?? 0)}">`)}</div>
    </div>
    <p class="hint">La deuda que muestra hoy la app del banco. Desde aquí, la app suma consumos y resta pagos sola.</p>
    ${campo('t-color', 'Color de la tarjeta', `<input id="t-color" name="color" type="color" value="${esc(t ? colorDe(t) : COLOR_BANCO.Interbank)}" style="height:48px;padding:4px">`)}`;
  abrirSheet(t ? 'Editar tarjeta' : 'Nueva tarjeta', cuerpo, async (d) => {
    const reg = {
      banco: d.banco, nombre: d.nombre.trim(), ultimos4: d.ultimos4.trim() || null, linea: num(d.linea),
      dia_corte: parseInt(d.dia_corte, 10), dia_pago: parseInt(d.dia_pago, 10),
      deuda_inicial_pen: num(d.deuda_inicial_pen), deuda_inicial_usd: num(d.deuda_inicial_usd), color: d.color,
    };
    if (!reg.nombre) throw new Error('Ponle un nombre a la tarjeta.');
    if (reg.ultimos4 && !/^\d{4}$/.test(reg.ultimos4)) throw new Error('Los últimos dígitos deben ser 4 números.');
    if (!(reg.linea > 0)) throw new Error('Ingresa la línea de crédito.');
    if (!(reg.dia_corte >= 1 && reg.dia_corte <= 31 && reg.dia_pago >= 1 && reg.dia_pago <= 31)) throw new Error('Los días de corte y pago deben estar entre 1 y 31.');
    const { error } = t ? await sb.from('tarjetas').update(reg).eq('id', t.id) : await sb.from('tarjetas').insert(reg);
    if (error) throw error;
    toast('Tarjeta guardada ✓');
  }, { extra: t ? `<button type="button" class="btn danger" data-action="archivar" data-tabla="tarjetas" data-id="${t.id}">Archivar</button>` : '' });
}

function formPagoTarjeta(t) {
  const k = calcTarjeta(t);
  formMovimiento(null, 'pago_tarjeta');
  dlg.querySelector(`input[name="tarjeta"][value="${t.id}"]`).checked = true;
  const sugerido = k.pendiente.PEN > 0.009 ? k.pendiente.PEN : k.pendiente.USD > 0.009 ? k.pendiente.USD : 0;
  if (sugerido && !k.sinHistorial) {
    $('#f-monto').value = sugerido.toFixed(2);
    if (k.pendiente.PEN <= 0.009) $('#moneda-usd').checked = true;
  }
  $('#f-desc').value = `Pago ${t.nombre}`;
}

/* ---- Cuentas ---- */
function formCuenta(c = null) {
  const cuerpo = `
    ${campo('c-nombre', 'Nombre', `<input id="c-nombre" name="nombre" value="${esc(c?.nombre)}" placeholder="Ej. Billetera, Ahorros Interbank">`)}
    ${campo('c-tipo', 'Tipo', `<select id="c-tipo" name="tipo">${Object.entries(TIPOS_CUENTA).map(([k, n]) => opt(k, n, c?.tipo || 'efectivo')).join('')}</select>`)}
    <div class="lbl">Moneda</div>${segMoneda(c?.moneda)}
    ${campo('c-saldo', 'Saldo de hoy', `<input id="c-saldo" name="saldo_inicial" inputmode="decimal" value="${esc(c?.saldo_inicial ?? 0)}">`, 'Luego la app suma ingresos y resta gastos.')}`;
  abrirSheet(c ? 'Editar cuenta' : 'Nueva cuenta', cuerpo, async (d) => {
    const reg = { nombre: d.nombre.trim(), tipo: d.tipo, moneda: d.moneda, saldo_inicial: num(d.saldo_inicial) };
    if (!reg.nombre) throw new Error('Ponle un nombre.');
    const { error } = c ? await sb.from('cuentas').update(reg).eq('id', c.id) : await sb.from('cuentas').insert(reg);
    if (error) throw error;
    toast('Cuenta guardada ✓');
  }, { extra: c ? `<button type="button" class="btn danger" data-action="archivar" data-tabla="cuentas" data-id="${c.id}">Archivar</button>` : '' });
}

/* ---- Deudas ---- */
function formDeuda(d = null) {
  const cuerpo = `
    ${campo('d-nombre', 'Nombre', `<input id="d-nombre" name="nombre" value="${esc(d?.nombre)}" placeholder="Ej. Celular en cuotas">`)}
    ${campo('d-tipo', 'Tipo', `<select id="d-tipo" name="tipo">${Object.entries(TIPOS_DEUDA).map(([k, n]) => opt(k, n, d?.tipo || 'cuotas')).join('')}</select>`)}
    ${campo('d-acreedor', 'A quién le debes', `<input id="d-acreedor" name="acreedor" value="${esc(d?.acreedor)}" placeholder="Banco, tienda o persona">`)}
    <div class="lbl">Moneda</div>${segMoneda(d?.moneda)}
    ${campo('d-total', 'Monto total', `<input id="d-total" name="monto_total" inputmode="decimal" value="${esc(d?.monto_total ?? '')}">`)}
    <div class="grid2">
      <div>${campo('d-ct', 'Nº de cuotas', `<input id="d-ct" name="cuotas_total" type="number" min="0" value="${esc(d?.cuotas_total ?? 0)}">`)}</div>
      <div>${campo('d-cp', 'Cuotas pagadas', `<input id="d-cp" name="cuotas_pagadas" type="number" min="0" value="${esc(d?.cuotas_pagadas ?? 0)}">`)}</div>
    </div>
    <div class="grid2">
      <div>${campo('d-mc', 'Monto de cuota', `<input id="d-mc" name="monto_cuota" inputmode="decimal" value="${esc(d?.monto_cuota ?? '')}">`)}</div>
      <div>${campo('d-dia', 'Día de pago', `<input id="d-dia" name="dia_pago" type="number" min="1" max="31" value="${esc(d?.dia_pago ?? '')}">`)}</div>
    </div>
    <p class="hint">Sin cuotas (ej. a un amigo): deja cuotas en 0.</p>
    ${campo('d-tarjeta', 'Tarjeta (si es compra en cuotas)', `<select id="d-tarjeta" name="tarjeta_id"><option value="">Ninguna</option>${estado.tarjetas.map((t) => opt(t.id, t.nombre, d?.tarjeta_id)).join('')}</select>`)}
    ${campo('d-notas', 'Notas', `<textarea id="d-notas" name="notas" rows="2">${esc(d?.notas)}</textarea>`)}`;
  abrirSheet(d ? 'Editar deuda' : 'Nueva deuda', cuerpo, async (x) => {
    const reg = {
      nombre: x.nombre.trim(), tipo: x.tipo, acreedor: x.acreedor.trim() || null, moneda: x.moneda,
      monto_total: num(x.monto_total), cuotas_total: parseInt(x.cuotas_total, 10) || 0,
      cuotas_pagadas: parseInt(x.cuotas_pagadas, 10) || 0, monto_cuota: num(x.monto_cuota) || null,
      dia_pago: parseInt(x.dia_pago, 10) || null, tarjeta_id: x.tarjeta_id || null, notas: x.notas.trim() || null,
    };
    if (!reg.nombre) throw new Error('Ponle un nombre.');
    if (!(reg.monto_total > 0)) throw new Error('Ingresa el monto total.');
    if (reg.cuotas_total && !reg.monto_cuota) reg.monto_cuota = Math.round((reg.monto_total / reg.cuotas_total) * 100) / 100;
    if (!d) reg.pagado = reg.monto_cuota ? reg.monto_cuota * reg.cuotas_pagadas : 0;
    reg.activa = saldoDeuda({ ...d, ...reg, pagado: d?.pagado ?? reg.pagado }) > 0.009;
    const { error } = d ? await sb.from('deudas').update(reg).eq('id', d.id) : await sb.from('deudas').insert(reg);
    if (error) throw error;
    toast('Deuda guardada ✓');
  }, { extra: d ? `<button type="button" class="btn danger" data-action="borrar" data-tabla="deudas" data-id="${d.id}">Eliminar</button>` : '' });
}

function formPagoDeuda(d) {
  const ctas = estado.cuentas.filter((c) => c.activa).map((c) => [c.id, `${c.tipo === 'efectivo' ? '💵' : '🏦'} ${c.nombre}`]);
  const cuerpo = `
    <p class="muted">${esc(d.nombre)} · te falta ${money(saldoDeuda(d), d.moneda)}</p>
    <div class="monto-grande"><input id="p-monto" name="monto" inputmode="decimal" value="${esc(d.monto_cuota ?? '')}" placeholder="0.00" aria-label="Monto pagado"><span class="muted">${d.moneda === 'USD' ? 'US$' : 'S/'}</span></div>
    ${d.tarjeta_id ? '<p class="hint">Esta compra está en tu tarjeta: aquí solo avanzas el contador de cuotas.</p>'
      : `<div class="lbl">Pagado desde</div>${opciones('cuenta', [['', 'No registrar salida'], ...ctas], '')}`}`;
  abrirSheet('Registrar pago', cuerpo, async (x) => {
    const monto = num(x.monto);
    if (!(monto > 0)) throw new Error('Ingresa el monto pagado.');
    const cambios = { pagado: num(d.pagado) + monto, cuotas_pagadas: d.cuotas_total ? Math.min(d.cuotas_total, d.cuotas_pagadas + 1) : d.cuotas_pagadas };
    cambios.activa = saldoDeuda({ ...d, ...cambios }) > 0.009;
    const { error } = await sb.from('deudas').update(cambios).eq('id', d.id);
    if (error) throw error;
    if (x.cuenta) {
      const r = await sb.from('movimientos').insert({ tipo: 'gasto', monto, moneda: d.moneda, descripcion: `Pago: ${d.nombre}`, categoria: 'Deudas', cuenta_id: x.cuenta });
      if (r.error) throw r.error;
    }
    toast(cambios.activa ? 'Pago registrado ✓' : '🎉 ¡Deuda terminada!');
  });
}

/* ---- Ajustes ---- */
function formAjustes() {
  const a = estado.ajustes;
  const cuerpo = `
    <p class="muted small">Sesión: ${esc(estado.user.email)}</p>
    <div class="grid2">
      <div>${campo('a-tc', 'Tipo de cambio', `<input id="a-tc" name="tipo_cambio" inputmode="decimal" value="${esc(a.tipo_cambio)}">`)}</div>
      <div>${campo('a-dias', 'Avisar días antes', `<input id="a-dias" name="dias_aviso" type="number" min="0" max="15" value="${esc(a.dias_aviso)}">`)}</div>
    </div>
    <div class="lbl">Código para el lector de correos</div>
    <code class="token">${esc(a.token_correo)}</code>
    <p class="hint">Va en el script de Gmail (TOKEN_CORREO). No lo compartas.</p>
    <div class="btns" style="margin-top:10px"><button type="button" class="btn" data-action="copiar-token">Copiar</button>
    <button type="button" class="btn" data-action="nuevo-token">Generar otro</button></div>
    <button type="button" class="btn danger block" style="margin-top:14px" data-action="salir">Cerrar sesión</button>`;
  abrirSheet('Ajustes', cuerpo, async (d) => {
    const { error } = await sb.from('ajustes').update({ tipo_cambio: num(d.tipo_cambio) || 3.75, dias_aviso: parseInt(d.dias_aviso, 10) || 0 }).eq('user_id', estado.user.id);
    if (error) throw error;
    toast('Ajustes guardados ✓');
  });
}

/* ================= Eventos ================= */
const ACCIONES = {
  'nuevo-mov': (el) => formMovimiento(null, el.dataset.tipo || 'gasto'),
  'editar-mov': (el) => formMovimiento(estado.movimientos.find((m) => m.id === el.dataset.id)),
  'nueva-tarjeta': () => formTarjeta(),
  'editar-tarjeta': (el) => formTarjeta(tarjetaPorId(el.dataset.id)),
  'pagar-tarjeta': (el) => formPagoTarjeta(tarjetaPorId(el.dataset.id)),
  'nueva-cuenta': () => formCuenta(),
  'editar-cuenta': (el) => formCuenta(cuentaPorId(el.dataset.id)),
  'nueva-deuda': () => formDeuda(),
  'editar-deuda': (el) => formDeuda(estado.deudas.find((d) => d.id === el.dataset.id)),
  'pagar-deuda': (el) => formPagoDeuda(estado.deudas.find((d) => d.id === el.dataset.id)),
  ajustes: () => formAjustes(),
  'cerrar-sheet': () => cerrarSheet(),
  'ver-revisar': () => irA('movimientos', 'revisar'),
  filtrar: (el) => irA('movimientos', el.dataset.filtro),
  filtro: (el) => { estado.filtro = el.dataset.filtro; render(); },
  billetera: (el) => { estado.billetera = el.dataset.sub; render(); },
  'cambiar-login': () => { estado.modoLogin = estado.modoLogin === 'crear' ? 'entrar' : 'crear'; render(); },
  async borrar(el) {
    if (!confirm('¿Eliminar este registro? No se puede deshacer.')) return;
    const { error } = await sb.from(el.dataset.tabla).delete().eq('id', el.dataset.id);
    if (error) return toast(error.message);
    cerrarSheet(); toast('Eliminado'); recargar();
  },
  async archivar(el) {
    if (!confirm('¿Archivar? Dejará de aparecer, pero se conserva su historial.')) return;
    const { error } = await sb.from(el.dataset.tabla).update({ activa: false }).eq('id', el.dataset.id);
    if (error) return toast(error.message);
    cerrarSheet(); toast('Archivado'); recargar();
  },
  async 'copiar-token'() {
    try { await navigator.clipboard.writeText(estado.ajustes.token_correo); toast('Código copiado'); } catch { toast('No se pudo copiar; selecciónalo a mano.'); }
  },
  async 'nuevo-token'() {
    if (!confirm('El código anterior dejará de funcionar y tendrás que pegar el nuevo en el script de Gmail. ¿Continuar?')) return;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const { error } = await sb.from('ajustes').update({ token_correo: token }).eq('user_id', estado.user.id);
    if (error) return toast(error.message);
    await cargar(); formAjustes(); toast('Nuevo código generado');
  },
  async salir() { cerrarSheet(); await sb.auth.signOut(); },
};

function irA(vista, filtro) {
  estado.vista = vista;
  if (filtro !== undefined) estado.filtro = filtro;
  else if (vista !== 'movimientos') { estado.filtro = 'todos'; estado.busqueda = ''; }
  render();
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (a && ACCIONES[a.dataset.action]) { e.preventDefault(); ACCIONES[a.dataset.action](a); return; }
  const v = e.target.closest('[data-vista]');
  if (v && !dlg.open) irA(v.dataset.vista);
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'tipo' && e.target.closest('#sheet-form')) actualizarTipo();
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'buscar') { estado.busqueda = e.target.value; $('#lista-movs').innerHTML = listaMovs(); }
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  e.preventDefault();
  const boton = form.querySelector('[type="submit"]');
  boton.disabled = true;
  try {
    const datos = Object.fromEntries(new FormData(form));
    if (form.id === 'login-form') await enviarLogin(datos);
    else if (form.id === 'sheet-form' && alGuardar) { await alGuardar(datos); cerrarSheet(); await recargar(); }
  } catch (err) {
    const box = form.querySelector('.error');
    if (box) box.textContent = traducirError(err);
  } finally { boton.disabled = false; }
});

dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrarSheet(); });

function traducirError(err) {
  const m = err?.message || String(err);
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo: abre el enlace que te enviamos.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Usa "Ya tengo cuenta".';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa tu internet.';
  return m;
}

async function enviarLogin({ email, password }) {
  if (estado.modoLogin === 'crear') {
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
    if (!data.session) {
      estado.modoLogin = 'entrar';
      render();
      $('#login-error').textContent = 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa aquí.';
    }
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
}

/* ================= Inicio ================= */
if (configurado) {
  sb.auth.onAuthStateChange((_evento, session) => {
    const antes = estado.user?.id;
    estado.user = session?.user || null;
    if (!estado.user) { render(); return; }
    if (antes !== estado.user.id) setTimeout(recargar, 0);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && estado.user && !dlg.open) recargar(); });
} else {
  render();
}
