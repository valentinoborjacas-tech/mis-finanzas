import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/* ================= Utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const dlg = $('#sheet');
const configurado = !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_ANON_KEY.includes('TU_ANON');
const sb = configurado ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const CATEGORIAS = ['Comida', 'Supermercado', 'Transporte', 'Servicios', 'Salud', 'Entretenimiento', 'Compras',
  'Educación', 'Viajes', 'Suscripciones', 'Hogar', 'Deudas', 'Sueldo', 'Otros', 'Sin categoría'];
const BANCOS = ['Interbank', 'BBVA', 'BCP', 'Scotiabank', 'Otro'];
const TIPOS = { gasto: 'Gasto', ingreso: 'Ingreso', pago_tarjeta: 'Pago tarjeta', transferencia: 'Transferencia' };
const ICONOS = { gasto: '↘', ingreso: '↗', pago_tarjeta: '💳', transferencia: '⇄' };
const TIPOS_CUENTA = { efectivo: 'Efectivo', ahorro: 'Ahorros', corriente: 'Cuenta corriente' };
const TIPOS_DEUDA = { cuotas: 'Compra en cuotas', prestamo: 'Préstamo', persona: 'Deuda con persona' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmts = {};
const money = (n, mon = 'PEN') => (fmts[mon] ??= new Intl.NumberFormat('es-PE', { style: 'currency', currency: mon })).format(Number(n) || 0);
const pct = (x) => `${Math.round(x * 100)}%`;
const DIA = 86400000;
const fechaCorta = (d) => new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
const fechaLarga = (d) => new Date(d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
const hoy0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const diasHasta = (d) => Math.round((d - hoy0()) / DIA);
const isoLocal = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const enDias = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : n < 0 ? `hace ${-n} días` : `en ${n} días`);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ================= Fechas de corte y pago ================= */
// Día d del mes m (si el mes es más corto, usa el último día).
function diaEn(y, m, d) { return new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate())); }
function mesMas(fecha, dia, n) { return diaEn(fecha.getFullYear(), fecha.getMonth() + n, dia); }

function ciclo(t) {
  const hoy = hoy0();
  let corte = diaEn(hoy.getFullYear(), hoy.getMonth(), t.dia_corte);
  if (corte >= hoy) corte = mesMas(corte, t.dia_corte, -1); // el corte de hoy aún no cerró
  const salto = t.dia_pago <= t.dia_corte ? 1 : 0;
  const proxCorte = mesMas(corte, t.dia_corte, 1);
  return {
    corte,
    proxCorte,
    pago: mesMas(corte, t.dia_pago, salto),
    proxPago: mesMas(proxCorte, t.dia_pago, salto),
    finCorte: new Date(corte.getTime() + DIA),
  };
}

// Cuántos cortes han pasado desde una compra hasta el corte L (para saber cuántas cuotas ya se facturaron).
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

  // Consumos hechos después del último corte (todavía no se facturan).
  const desdeCorte = { PEN: 0, USD: 0 };
  for (const m of estado.movimientos) {
    if (m.tarjeta_id === t.id && m.tipo === 'gasto' && new Date(m.fecha) >= c.finCorte) desdeCorte[m.moneda] += num(m.monto);
  }
  // Parte de compras en cuotas que aún no se ha facturado.
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
  // Si la tarjeta se registró después del último corte, la deuda inicial mezcla lo facturado con consumos nuevos:
  // no podemos saber cuánto es el pago del mes hasta el próximo corte.
  const sinHistorial = t.creado && new Date(t.creado) >= c.finCorte;
  return { deuda, usado, linea, util, c, desdeCorte, pendiente, hayPendiente, pagoVencido, paraBajar30, nivel, tc, sinHistorial };
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
  user: null, vista: 'inicio', filtro: 'todos', modoLogin: 'entrar',
  ajustes: null, tarjetas: [], cuentas: [], deudas: [], movimientos: [], comprasCuotas: [],
  saldosTarjeta: {}, saldosCuenta: {},
};

async function cargar() {
  const uid = estado.user.id;
  const r0 = await sb.from('ajustes').upsert({ user_id: uid }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (r0.error) throw r0.error;
  const desde = new Date(Date.now() - 120 * DIA).toISOString();
  const rs = await Promise.all([
    sb.from('ajustes').select('*').single(),
    sb.from('tarjetas').select('*').order('creado'),
    sb.from('cuentas').select('*').order('creado'),
    sb.from('deudas').select('*').order('creado'),
    sb.from('saldos_tarjeta').select('*'),
    sb.from('saldos_cuenta').select('*'),
    sb.from('movimientos').select('*').gte('fecha', desde).order('fecha', { ascending: false }).limit(1000),
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

/* ================= Vistas ================= */
const TABS = [
  ['inicio', '⌂', 'Inicio'], ['tarjetas', '💳', 'Tarjetas'], ['movimientos', '☰', 'Movimientos'],
  ['cuentas', '👛', 'Efectivo'], ['deudas', '📋', 'Deudas'],
];

function render() {
  if (!configurado) { app.innerHTML = vistaSinConfig(); return; }
  if (!estado.user) { app.innerHTML = vistaLogin(); return; }
  const titulo = TABS.find((t) => t[0] === estado.vista)[2];
  app.innerHTML = `
    <header class="top"><h1>${titulo}</h1><button class="icon" data-action="ajustes" aria-label="Ajustes">⚙️</button></header>
    <main>${VISTAS[estado.vista]()}</main>
    <button class="fab" data-action="nuevo-mov" aria-label="Registrar movimiento">+</button>
    <nav class="tabs">${TABS.map(([k, i, n]) => `<button data-vista="${k}" ${k === estado.vista ? 'aria-current="page"' : ''}><span class="ico">${i}</span>${n}</button>`).join('')}</nav>`;
}

function vistaSinConfig() {
  return `<div class="login"><h1>Mis Finanzas</h1>
    <div class="card"><p>Falta conectar la app con tu base de datos.</p>
    <p class="muted small">Abre <code>js/config.js</code> y pega la URL y la <b>anon key</b> de tu proyecto de Supabase. Los pasos están en el archivo <code>README.md</code>.</p></div></div>`;
}

function vistaLogin() {
  const crear = estado.modoLogin === 'crear';
  return `<div class="login">
    <h1>Mis Finanzas</h1>
    <p class="muted">${crear ? 'Crea tu cuenta (solo la primera vez).' : 'Ingresa para ver tus tarjetas y gastos.'}</p>
    <form id="login-form" class="card">
      <label for="l-email">Correo</label>
      <input id="l-email" name="email" type="email" autocomplete="email" required>
      <label for="l-pass">Contraseña</label>
      <input id="l-pass" name="password" type="password" minlength="8" autocomplete="${crear ? 'new-password' : 'current-password'}" required>
      ${crear ? '<p class="hint">Mínimo 8 caracteres. Usa una contraseña distinta a la de tu correo y tus bancos.</p>' : ''}
      <div class="btns"><button class="btn primary block" type="submit">${crear ? 'Crear cuenta' : 'Ingresar'}</button></div>
      <p class="error" id="login-error"></p>
    </form>
    <button class="btn block" data-action="cambiar-login">${crear ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}</button>
  </div>`;
}

function barraUso(k) {
  return `<div class="barra ${k.nivel}"><i style="width:${Math.min(100, k.util * 100).toFixed(1)}%"></i><span class="meta" title="30%"></span></div>`;
}
const deudaTexto = (d, sep = ' + ') => [d.PEN > 0.009 || d.USD <= 0.009 ? money(d.PEN, 'PEN') : '', d.USD > 0.009 ? money(d.USD, 'USD') : ''].filter(Boolean).join(sep);

const VISTAS = {
  inicio() {
    const tc = num(estado.ajustes?.tipo_cambio) || 3.75;
    const tiene = { PEN: 0, USD: 0 };
    estado.cuentas.filter((c) => c.activa).forEach((c) => { tiene[c.moneda] += estado.saldosCuenta[c.id] ?? num(c.saldo_inicial); });
    const debe = { PEN: 0, USD: 0 };
    const ks = estado.tarjetas.filter((t) => t.activa).map((t) => [t, calcTarjeta(t)]);
    ks.forEach(([, k]) => { debe.PEN += k.deuda.PEN; debe.USD += k.deuda.USD; });
    estado.deudas.filter((d) => d.activa && !d.tarjeta_id).forEach((d) => { debe[d.moneda] += saldoDeuda(d); });

    // Próximos pagos
    const pagos = [];
    for (const [t, k] of ks) {
      const base = { titulo: t.nombre, vista: 'tarjetas' };
      if (k.sinHistorial) { if (!k.pagoVencido) pagos.push({ ...base, fecha: k.c.pago, monto: '—', nota: 'Mira el monto en la app del banco' }); }
      else if (k.hayPendiente && !k.pagoVencido) pagos.push({ ...base, fecha: k.c.pago, monto: deudaTexto(k.pendiente, '<br>'), nota: 'Paga el total facturado' });
      else if (k.hayPendiente && k.pagoVencido) pagos.push({ ...base, fecha: k.c.pago, monto: deudaTexto(k.pendiente, '<br>'), nota: 'Revisa: quedó saldo del último estado de cuenta', alerta: true });
      else if (k.usado > 0.009) pagos.push({ ...base, fecha: k.c.proxPago, monto: '—', nota: `Se factura al corte del ${fechaCorta(k.c.proxCorte)}` });
    }
    for (const d of estado.deudas.filter((d) => d.activa && !d.tarjeta_id)) {
      const f = proximaFechaDeuda(d);
      if (f) pagos.push({ fecha: f, titulo: d.nombre, vista: 'deudas', monto: d.monto_cuota ? money(d.monto_cuota, d.moneda) : '—', nota: TIPOS_DEUDA[d.tipo] });
    }
    pagos.sort((a, b) => a.fecha - b.fecha);

    // Gastos del mes por categoría (en soles)
    const h = hoy0();
    const ini = new Date(h.getFullYear(), h.getMonth(), 1);
    const cats = {};
    let totalMes = 0;
    for (const m of estado.movimientos) {
      if (m.tipo !== 'gasto' || new Date(m.fecha) < ini) continue;
      const v = num(m.monto) * (m.moneda === 'USD' ? tc : 1);
      cats[m.categoria] = (cats[m.categoria] || 0) + v;
      totalMes += v;
    }
    const catsOrd = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const maxCat = catsOrd[0]?.[1] || 1;
    const revisar = porRevisar().length;
    const altas = ks.filter(([, k]) => k.util >= 0.3);

    return `
      ${revisar ? `<div class="aviso warn" data-action="ver-revisar" style="cursor:pointer;margin:0 0 12px">📧 Tienes <b>${revisar}</b> cargo(s) leídos del correo por revisar (tarjeta o categoría). Toca para verlos.</div>` : ''}
      <div class="grid2">
        <div class="card"><h2>Lo que tienes</h2><div class="big">${money(tiene.PEN)}</div>${tiene.USD ? `<div class="muted num">${money(tiene.USD, 'USD')}</div>` : ''}</div>
        <div class="card"><h2>Lo que debes</h2><div class="big">${money(debe.PEN)}</div>${debe.USD ? `<div class="muted num">${money(debe.USD, 'USD')}</div>` : ''}</div>
      </div>
      ${altas.map(([t, k]) => `<div class="aviso ${k.nivel}">⚠️ <b>${esc(t.nombre)}</b> usa ${pct(k.util)} de su línea. Paga <b>${money(k.paraBajar30)}</b> antes del corte del ${fechaCorta(k.c.proxCorte)} para cerrar el mes bajo 30%.</div>`).join('')}
      <div class="seccion">Próximos pagos</div>
      <div class="card">${pagos.length ? `<ul class="lista">${pagos.slice(0, 6).map((p) => `
        <li data-vista="${p.vista}">
          <div class="ico">${p.alerta ? '❗' : '📅'}</div>
          <div class="txt"><b>${esc(p.titulo)}</b><span>${fechaCorta(p.fecha)} · ${enDias(diasHasta(p.fecha))} · ${esc(p.nota)}</span></div>
          <div class="monto">${p.monto}</div></li>`).join('')}</ul>` : '<p class="vacio">Sin pagos próximos. Agrega tus tarjetas en la pestaña Tarjetas.</p>'}</div>
      <div class="seccion">Gastos de ${h.toLocaleDateString('es-PE', { month: 'long' })}</div>
      <div class="card">
        <div class="row"><span class="muted">Total (dólares convertidos a S/ ${tc})</span><b class="num">${money(totalMes)}</b></div>
        <div style="margin-top:12px">${catsOrd.length ? catsOrd.map(([c, v]) => `
          <div class="cat-bar"><span>${esc(c)}</span><span class="b"><i style="width:${(v / maxCat * 100).toFixed(1)}%"></i></span><span class="num">${money(v)}</span></div>`).join('') : '<p class="vacio">Aún no hay gastos este mes.</p>'}</div>
      </div>`;
  },

  tarjetas() {
    const lista = estado.tarjetas.filter((t) => t.activa);
    return `
      ${lista.map((t) => {
        const k = calcTarjeta(t);
        const dPago = diasHasta(k.c.pago);
        let avisoPago;
        if (k.sinHistorial) avisoPago = `<div class="aviso warn">Tu próximo pago es ${k.pagoVencido ? 'después del corte del ' + fechaCorta(k.c.proxCorte) : 'hasta el ' + fechaLarga(k.c.pago)}. Por ahora revisa el monto exacto en la app del banco; desde el próximo corte la app lo calcula sola.</div>`;
        else if (k.hayPendiente && !k.pagoVencido) avisoPago = `<div class="aviso ${dPago <= 3 ? 'bad' : 'warn'}">Paga <b>${deudaTexto(k.pendiente)}</b> hasta el ${fechaLarga(k.c.pago)} (${enDias(dPago)}). Paga el <b>total</b>, no el mínimo.</div>`;
        else if (k.hayPendiente) avisoPago = `<div class="aviso bad">Según tus registros quedó <b>${deudaTexto(k.pendiente)}</b> del estado de cuenta que vencía el ${fechaCorta(k.c.pago)} Compáralo con tu app del banco y registra el pago si ya lo hiciste.</div>`;
        else avisoPago = `<div class="aviso ok">✅ Estado de cuenta del ${fechaCorta(k.c.corte)} pagado.</div>`;
        return `<div class="card">
          <div class="tarjeta-head">
            <span class="chip-color" style="background:${esc(t.color || '#0f766e')}"></span>
            <div style="flex:1"><h3>${esc(t.nombre)}</h3><span class="muted small">${esc(t.banco)}${t.ultimos4 ? ' •••• ' + esc(t.ultimos4) : ''}</span></div>
            <span class="pill ${k.nivel}">${pct(k.util)}</span>
          </div>
          ${barraUso(k)}
          <div class="row small"><span class="muted">Usado ${money(k.usado)} de ${money(k.linea)}</span><span class="muted">meta: bajo 30%</span></div>
          <div class="row" style="margin-top:10px"><span class="muted">Deuda actual</span><b class="num">${deudaTexto(k.deuda)}</b></div>
          <div class="row"><span class="muted">Consumos desde el corte</span><span class="num">${deudaTexto(k.desdeCorte)}</span></div>
          <div class="row"><span class="muted">Último corte</span><span>${fechaCorta(k.c.corte)}</span></div>
          <div class="row"><span class="muted">Próximo corte</span><span>${fechaCorta(k.c.proxCorte)} (${enDias(diasHasta(k.c.proxCorte))})</span></div>
          ${avisoPago}
          ${k.paraBajar30 > 0.009 ? `<div class="aviso warn">Para que el banco vea poco uso, paga <b>${money(k.paraBajar30)}</b> antes del corte del ${fechaCorta(k.c.proxCorte)}: así tu estado de cuenta saldrá bajo 30%.</div>` : ''}
          <div class="btns">
            <button class="btn primary" data-action="pagar-tarjeta" data-id="${t.id}">Registrar pago</button>
            <button class="btn" data-action="filtrar" data-filtro="t:${t.id}">Movimientos</button>
            <button class="btn" data-action="editar-tarjeta" data-id="${t.id}">Editar</button>
          </div>
        </div>`;
      }).join('') || '<div class="card vacio">Aún no tienes tarjetas. Agrega tu Interbank y tu BBVA con la deuda que tienen hoy.</div>'}
      <button class="btn block" data-action="nueva-tarjeta">+ Agregar tarjeta</button>
      <p class="hint" style="margin-top:12px">Tipo de cambio para calcular el uso de línea: S/ ${esc(estado.ajustes?.tipo_cambio)} (cámbialo en ⚙️). Las compras en cuotas se descuentan del "pago del mes" según las cuotas ya facturadas; compáralo siempre con tu estado de cuenta.</p>`;
  },

  movimientos() {
    const f = estado.filtro;
    let movs = estado.movimientos;
    if (f === 'revisar') movs = porRevisar();
    else if (f.startsWith('t:')) movs = movs.filter((m) => m.tarjeta_id === f.slice(2));
    else if (f.startsWith('c:')) movs = movs.filter((m) => m.cuenta_id === f.slice(2) || m.cuenta_destino_id === f.slice(2));
    const opciones = [['todos', 'Todos (últimos 4 meses)'], ['revisar', `Por revisar (${porRevisar().length})`],
      ...estado.tarjetas.map((t) => [`t:${t.id}`, `💳 ${t.nombre}`]), ...estado.cuentas.map((c) => [`c:${c.id}`, `👛 ${c.nombre}`])];
    let html = `<select id="filtro" aria-label="Filtrar">${opciones.map(([v, n]) => `<option value="${esc(v)}" ${v === f ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    if (!movs.length) return html + '<p class="vacio">No hay movimientos aquí.</p>';
    let diaActual = '';
    html += '<div class="card" style="margin-top:12px;padding-top:4px">';
    for (const m of movs) {
      const d = isoLocal(m.fecha);
      if (d !== diaActual) {
        if (diaActual) html += '</ul>';
        html += `<div class="dia">${esc(fechaLarga(m.fecha))}</div><ul class="lista">`;
        diaActual = d;
      }
      const medio = m.tarjeta_id ? tarjetaPorId(m.tarjeta_id)?.nombre : m.cuenta_id ? cuentaPorId(m.cuenta_id)?.nombre : null;
      const signo = m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '−' : '';
      const detalle = [medio || (m.origen === 'correo' ? '⚠️ sin tarjeta' : ''), m.tipo === 'gasto' ? m.categoria : TIPOS[m.tipo],
        m.cuotas > 1 ? `${m.cuotas} cuotas` : '', m.origen === 'correo' ? '📧' : ''].filter(Boolean).join(' · ');
      html += `<li data-action="editar-mov" data-id="${m.id}">
        <div class="ico">${ICONOS[m.tipo]}</div>
        <div class="txt"><b>${esc(m.descripcion || TIPOS[m.tipo])}</b><span>${esc(detalle)}</span></div>
        <div class="monto ${m.tipo === 'ingreso' ? 'pos' : 'neg'}">${signo}${money(m.monto, m.moneda)}</div></li>`;
    }
    return html + '</ul></div>';
  },

  cuentas() {
    const lista = estado.cuentas.filter((c) => c.activa);
    return `
      <div class="card">${lista.length ? `<ul class="lista">${lista.map((c) => `
        <li data-action="editar-cuenta" data-id="${c.id}">
          <div class="ico">${c.tipo === 'efectivo' ? '💵' : '🏦'}</div>
          <div class="txt"><b>${esc(c.nombre)}</b><span>${TIPOS_CUENTA[c.tipo]} · ${c.moneda}</span></div>
          <div class="monto">${money(estado.saldosCuenta[c.id] ?? c.saldo_inicial, c.moneda)}</div></li>`).join('')}</ul>`
        : '<p class="vacio">Agrega tu billetera (efectivo) y tus cuentas de ahorro con el saldo que tienen hoy.</p>'}</div>
      <div class="btns">
        <button class="btn primary" data-action="nuevo-mov" data-tipo="ingreso">+ Ingreso</button>
        <button class="btn" data-action="nuevo-mov" data-tipo="gasto">− Gasto</button>
        <button class="btn" data-action="nuevo-mov" data-tipo="transferencia">⇄ Transferir / retirar</button>
      </div>
      <button class="btn block" style="margin-top:12px" data-action="nueva-cuenta">+ Agregar cuenta o billetera</button>`;
  },

  deudas() {
    const activas = estado.deudas.filter((d) => d.activa);
    const cerradas = estado.deudas.filter((d) => !d.activa);
    const item = (d) => {
      const saldo = saldoDeuda(d);
      const total = num(d.cuotas_total) > 0 && num(d.monto_cuota) > 0 ? num(d.monto_cuota) * d.cuotas_total : num(d.monto_total);
      const avance = total > 0 ? Math.min(1, 1 - saldo / total) : 0;
      const f = proximaFechaDeuda(d);
      return `<div class="card">
        <div class="row"><div><h3>${esc(d.nombre)}</h3><span class="muted small">${TIPOS_DEUDA[d.tipo]}${d.acreedor ? ' · ' + esc(d.acreedor) : ''}${d.tarjeta_id ? ' · 💳 ' + esc(tarjetaPorId(d.tarjeta_id)?.nombre || '') : ''}</span></div>
        <b class="num">${money(saldo, d.moneda)}</b></div>
        <div class="barra"><i style="width:${(avance * 100).toFixed(1)}%"></i></div>
        <div class="row small muted"><span>${d.cuotas_total ? `Cuota ${d.cuotas_pagadas} de ${d.cuotas_total}` : `Pagado ${money(d.pagado, d.moneda)} de ${money(d.monto_total, d.moneda)}`}</span>
        <span>${f && d.activa ? `Próximo pago ${fechaCorta(f)}${d.monto_cuota ? ' · ' + money(d.monto_cuota, d.moneda) : ''}` : ''}</span></div>
        ${d.notas ? `<p class="small muted">${esc(d.notas)}</p>` : ''}
        <div class="btns">${d.activa ? `<button class="btn primary" data-action="pagar-deuda" data-id="${d.id}">Registrar pago</button>` : ''}
        <button class="btn" data-action="editar-deuda" data-id="${d.id}">Editar</button></div></div>`;
    };
    return `${activas.map(item).join('') || '<div class="card vacio">Sin deudas registradas. Aquí van tus compras en cuotas, préstamos o lo que le debes a alguien.</div>'}
      <button class="btn block" data-action="nueva-deuda">+ Agregar deuda</button>
      <p class="hint" style="margin-top:12px">Las compras en cuotas que tengan tarjeta asignada ya cuentan dentro de la deuda de esa tarjeta, por eso no se suman otra vez en “Lo que debes”.</p>
      ${cerradas.length ? `<div class="seccion">Terminadas</div>${cerradas.map(item).join('')}` : ''}`;
  },
};

/* ================= Hoja de formularios ================= */
let alGuardar = null;
function abrirSheet(titulo, cuerpo, onSubmit, { extra = '', textoGuardar = 'Guardar' } = {}) {
  dlg.innerHTML = `<form id="sheet-form" novalidate>
    <div class="sheet-head"><h2>${esc(titulo)}</h2><button type="button" class="icon" data-action="cerrar-sheet" aria-label="Cerrar">✕</button></div>
    <div class="sheet-body">${cuerpo}</div>
    <p class="error" id="sheet-error"></p>
    <div class="sheet-foot">${extra}<button class="btn primary" type="submit">${textoGuardar}</button></div></form>`;
  alGuardar = onSubmit;
  dlg.showModal();
}
const cerrarSheet = () => { dlg.close(); alGuardar = null; };

const opt = (v, n, sel) => `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(n)}</option>`;
const campo = (id, etiqueta, input, hint = '') => `<label for="${id}">${etiqueta}</label>${input}${hint ? `<p class="hint">${hint}</p>` : ''}`;
const segMoneda = (sel = 'PEN', name = 'moneda') => `<div class="seg dos">
  <input type="radio" id="${name}-pen" name="${name}" value="PEN" ${sel !== 'USD' ? 'checked' : ''}><label for="${name}-pen">Soles S/</label>
  <input type="radio" id="${name}-usd" name="${name}" value="USD" ${sel === 'USD' ? 'checked' : ''}><label for="${name}-usd">Dólares US$</label></div>`;

/* ---- Movimientos ---- */
function formMovimiento(m = null, tipoInicial = 'gasto') {
  const tipo = m?.tipo || tipoInicial;
  const tarjetas = estado.tarjetas.filter((t) => t.activa || t.id === m?.tarjeta_id);
  const cuentas = estado.cuentas.filter((c) => c.activa || c.id === m?.cuenta_id || c.id === m?.cuenta_destino_id);
  const medioSel = m ? (m.tarjeta_id ? `t:${m.tarjeta_id}` : m.cuenta_id ? `c:${m.cuenta_id}` : '') : '';
  const opcionesMedio = (conTarjetas) => `<option value="">Elegir…</option>
    ${conTarjetas && tarjetas.length ? `<optgroup label="Tarjetas de crédito">${tarjetas.map((t) => opt(`t:${t.id}`, `💳 ${t.nombre}`, medioSel)).join('')}</optgroup>` : ''}
    ${cuentas.length ? `<optgroup label="Efectivo y cuentas">${cuentas.map((c) => opt(`c:${c.id}`, `👛 ${c.nombre} (${c.moneda})`, medioSel)).join('')}</optgroup>` : ''}`;
  const cuerpo = `
    <div class="seg" style="margin-top:12px">${Object.entries(TIPOS).map(([k, n]) => `
      <input type="radio" id="tipo-${k}" name="tipo" value="${k}" ${k === tipo ? 'checked' : ''}><label for="tipo-${k}">${n}</label>`).join('')}</div>
    ${campo('f-monto', 'Monto', `<input id="f-monto" name="monto" inputmode="decimal" value="${m ? esc(m.monto) : ''}" placeholder="0.00" autofocus>`)}
    <label>Moneda</label>${segMoneda(m?.moneda)}
    ${campo('f-desc', 'Descripción', `<input id="f-desc" name="descripcion" value="${esc(m?.descripcion)}" placeholder="Ej. Plaza Vea, almuerzo, sueldo">`)}
    <div data-para="gasto">${campo('f-medio-g', 'Pagado con', `<select id="f-medio-g" name="medio_gasto">${opcionesMedio(true)}</select>`)}
      ${campo('f-cuotas', 'Cuotas (si pagaste con tarjeta)', `<input id="f-cuotas" name="cuotas" type="number" min="1" max="60" value="${m?.cuotas || 1}">`, 'Déjalo en 1 si fue en una sola cuota.')}</div>
    <div data-para="ingreso">${campo('f-medio-i', 'Recibido en', `<select id="f-medio-i" name="medio_ingreso">${opcionesMedio(true)}</select>`, 'Si es una devolución a tu tarjeta, elige la tarjeta.')}</div>
    <div data-para="pago_tarjeta">
      ${campo('f-tarjeta', 'Tarjeta que pagaste', `<select id="f-tarjeta" name="tarjeta"><option value="">Elegir…</option>${tarjetas.map((t) => opt(t.id, t.nombre, m?.tarjeta_id)).join('')}</select>`)}
      ${campo('f-desde', 'Pagaste desde', `<select id="f-desde" name="cuenta_origen"><option value="">Otra cuenta (no registrada)</option>${cuentas.map((c) => opt(c.id, `${c.nombre} (${c.moneda})`, m?.cuenta_id)).join('')}</select>`,
        'Registra el pago en la moneda de la deuda que cancelas (si pagas dólares con soles, regístralo en US$).')}</div>
    <div data-para="transferencia">
      ${campo('f-origen', 'Desde', `<select id="f-origen" name="cuenta_t_origen"><option value="">Elegir…</option>${cuentas.map((c) => opt(c.id, `${c.nombre} (${c.moneda})`, m?.cuenta_id)).join('')}</select>`)}
      ${campo('f-destino', 'Hacia', `<select id="f-destino" name="cuenta_t_destino"><option value="">Elegir…</option>${cuentas.map((c) => opt(c.id, `${c.nombre} (${c.moneda})`, m?.cuenta_destino_id)).join('')}</select>`, 'Ej. retiro del cajero: de “Ahorros” a “Efectivo”. Ambas en la misma moneda.')}</div>
    <div data-para="gasto ingreso">${campo('f-cat', 'Categoría', `<select id="f-cat" name="categoria">${CATEGORIAS.map((c) => opt(c, c, m?.categoria || 'Otros')).join('')}</select>`)}</div>
    ${campo('f-fecha', 'Fecha', `<input id="f-fecha" name="fecha" type="date" value="${isoLocal(m?.fecha || new Date())}">`)}
    ${m?.origen === 'correo' ? `<p class="hint">📧 Registrado automáticamente desde un correo de ${esc(m.banco || 'tu banco')}${m.ultimos4 ? ' (tarjeta •••• ' + esc(m.ultimos4) + ')' : ''}.</p>` : ''}`;
  abrirSheet(m ? 'Editar movimiento' : 'Nuevo movimiento', cuerpo, (d) => guardarMov(d, m),
    { extra: m ? `<button type="button" class="btn danger" data-action="borrar" data-tabla="movimientos" data-id="${m.id}">Eliminar</button>` : '' });
  actualizarTipo();
}

function actualizarTipo() {
  const form = $('#sheet-form');
  const tipo = form?.querySelector('input[name="tipo"]:checked')?.value;
  if (!tipo) return;
  form.querySelectorAll('[data-para]').forEach((el) => { el.style.display = el.dataset.para.split(' ').includes(tipo) ? 'block' : 'none'; });
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
    const [k, id] = String(d.tipo === 'gasto' ? d.medio_gasto : d.medio_ingreso).split(':');
    if (!id) throw new Error(d.tipo === 'gasto' ? 'Elige con qué pagaste.' : 'Elige dónde recibiste el dinero.');
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
  toast(original ? 'Movimiento actualizado' : 'Movimiento registrado');
}

/* ---- Tarjetas ---- */
function formTarjeta(t = null) {
  const cuerpo = `
    ${campo('t-banco', 'Banco', `<select id="t-banco" name="banco">${BANCOS.map((b) => opt(b, b, t?.banco || 'Interbank')).join('')}</select>`)}
    ${campo('t-nombre', 'Nombre', `<input id="t-nombre" name="nombre" value="${esc(t?.nombre)}" placeholder="Ej. Interbank Visa Clásica">`)}
    ${campo('t-u4', 'Últimos 4 dígitos', `<input id="t-u4" name="ultimos4" inputmode="numeric" maxlength="4" value="${esc(t?.ultimos4)}" placeholder="1234">`, 'Sirve para reconocer la tarjeta en los correos del banco.')}
    ${campo('t-linea', 'Línea de crédito (S/)', `<input id="t-linea" name="linea" inputmode="decimal" value="${esc(t?.linea ?? '')}">`)}
    <div class="grid2">
      <div>${campo('t-corte', 'Día de corte', `<input id="t-corte" name="dia_corte" type="number" min="1" max="31" value="${esc(t?.dia_corte ?? '')}">`)}</div>
      <div>${campo('t-pago', 'Último día de pago', `<input id="t-pago" name="dia_pago" type="number" min="1" max="31" value="${esc(t?.dia_pago ?? '')}">`)}</div>
    </div>
    <p class="hint">Los encuentras en tu estado de cuenta o en la app del banco.</p>
    <div class="grid2">
      <div>${campo('t-dpen', 'Deuda inicial S/', `<input id="t-dpen" name="deuda_inicial_pen" inputmode="decimal" value="${esc(t?.deuda_inicial_pen ?? 0)}">`)}</div>
      <div>${campo('t-dusd', 'Deuda inicial US$', `<input id="t-dusd" name="deuda_inicial_usd" inputmode="decimal" value="${esc(t?.deuda_inicial_usd ?? 0)}">`)}</div>
    </div>
    <p class="hint">Lo que debes HOY según la app del banco. Desde aquí, la app suma tus consumos y resta tus pagos sola.</p>
    ${campo('t-color', 'Color', `<input id="t-color" name="color" type="color" value="${esc(t?.color || (t?.banco === 'BBVA' ? '#1d4ed8' : '#15803d'))}" style="height:44px;padding:4px">`)}`;
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
    toast('Tarjeta guardada');
  }, { extra: t ? `<button type="button" class="btn danger" data-action="archivar" data-tabla="tarjetas" data-id="${t.id}">Archivar</button>` : '' });
}

function formPagoTarjeta(t) {
  const k = calcTarjeta(t);
  formMovimiento(null, 'pago_tarjeta');
  $('#f-tarjeta').value = t.id;
  const sugerido = k.pendiente.PEN > 0.009 ? k.pendiente.PEN : k.pendiente.USD > 0.009 ? k.pendiente.USD : '';
  if (sugerido) {
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
    <label>Moneda</label>${segMoneda(c?.moneda)}
    ${campo('c-saldo', 'Saldo inicial', `<input id="c-saldo" name="saldo_inicial" inputmode="decimal" value="${esc(c?.saldo_inicial ?? 0)}">`, 'Lo que tienes hoy. Luego la app suma ingresos y resta gastos.')}`;
  abrirSheet(c ? 'Editar cuenta' : 'Nueva cuenta', cuerpo, async (d) => {
    const reg = { nombre: d.nombre.trim(), tipo: d.tipo, moneda: d.moneda, saldo_inicial: num(d.saldo_inicial) };
    if (!reg.nombre) throw new Error('Ponle un nombre.');
    const { error } = c ? await sb.from('cuentas').update(reg).eq('id', c.id) : await sb.from('cuentas').insert(reg);
    if (error) throw error;
    toast('Cuenta guardada');
  }, { extra: c ? `<button type="button" class="btn danger" data-action="archivar" data-tabla="cuentas" data-id="${c.id}">Archivar</button>` : '' });
}

/* ---- Deudas ---- */
function formDeuda(d = null) {
  const cuerpo = `
    ${campo('d-nombre', 'Nombre', `<input id="d-nombre" name="nombre" value="${esc(d?.nombre)}" placeholder="Ej. Celular en cuotas, préstamo de Juan">`)}
    ${campo('d-tipo', 'Tipo', `<select id="d-tipo" name="tipo">${Object.entries(TIPOS_DEUDA).map(([k, n]) => opt(k, n, d?.tipo || 'cuotas')).join('')}</select>`)}
    ${campo('d-acreedor', 'A quién le debes', `<input id="d-acreedor" name="acreedor" value="${esc(d?.acreedor)}" placeholder="Banco, tienda o persona">`)}
    <label>Moneda</label>${segMoneda(d?.moneda)}
    ${campo('d-total', 'Monto total', `<input id="d-total" name="monto_total" inputmode="decimal" value="${esc(d?.monto_total ?? '')}">`)}
    <div class="grid2">
      <div>${campo('d-ct', 'Nº de cuotas', `<input id="d-ct" name="cuotas_total" type="number" min="0" value="${esc(d?.cuotas_total ?? 0)}">`)}</div>
      <div>${campo('d-cp', 'Cuotas pagadas', `<input id="d-cp" name="cuotas_pagadas" type="number" min="0" value="${esc(d?.cuotas_pagadas ?? 0)}">`)}</div>
    </div>
    <div class="grid2">
      <div>${campo('d-mc', 'Monto de cuota', `<input id="d-mc" name="monto_cuota" inputmode="decimal" value="${esc(d?.monto_cuota ?? '')}">`)}</div>
      <div>${campo('d-dia', 'Día de pago', `<input id="d-dia" name="dia_pago" type="number" min="1" max="31" value="${esc(d?.dia_pago ?? '')}">`)}</div>
    </div>
    <p class="hint">Si es una deuda sin cuotas (ej. a un amigo), deja cuotas en 0.</p>
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
    if (reg.cuotas_total && !reg.monto_cuota) reg.monto_cuota = Math.round(reg.monto_total / reg.cuotas_total * 100) / 100;
    if (!d) reg.pagado = reg.monto_cuota ? reg.monto_cuota * reg.cuotas_pagadas : 0;
    reg.activa = saldoDeuda({ ...d, ...reg, pagado: d?.pagado ?? reg.pagado }) > 0.009;
    const { error } = d ? await sb.from('deudas').update(reg).eq('id', d.id) : await sb.from('deudas').insert(reg);
    if (error) throw error;
    toast('Deuda guardada');
  }, { extra: d ? `<button type="button" class="btn danger" data-action="borrar" data-tabla="deudas" data-id="${d.id}">Eliminar</button>` : '' });
}

function formPagoDeuda(d) {
  const cuentas = estado.cuentas.filter((c) => c.activa);
  const cuerpo = `
    <p class="muted">${esc(d.nombre)} · saldo ${money(saldoDeuda(d), d.moneda)}</p>
    ${campo('p-monto', `Monto pagado (${d.moneda})`, `<input id="p-monto" name="monto" inputmode="decimal" value="${esc(d.monto_cuota ?? '')}">`)}
    ${d.tarjeta_id ? '<p class="hint">Esta compra está en tu tarjeta: el dinero lo pagas al pagar la tarjeta. Aquí solo avanzas el contador de cuotas.</p>'
      : campo('p-cuenta', 'Pagado desde', `<select id="p-cuenta" name="cuenta"><option value="">No registrar salida de dinero</option>${cuentas.map((c) => opt(c.id, `${c.nombre} (${c.moneda})`)).join('')}</select>`)}`;
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
    toast(cambios.activa ? 'Pago registrado' : '🎉 ¡Deuda terminada!');
  });
}

/* ---- Ajustes ---- */
function formAjustes() {
  const a = estado.ajustes;
  const cuerpo = `
    <p class="muted small">Sesión: ${esc(estado.user.email)}</p>
    ${campo('a-tc', 'Tipo de cambio (S/ por US$)', `<input id="a-tc" name="tipo_cambio" inputmode="decimal" value="${esc(a.tipo_cambio)}">`, 'Para sumar tus deudas en dólares al uso de la línea.')}
    ${campo('a-dias', 'Avisarme del pago con estos días de anticipación', `<input id="a-dias" name="dias_aviso" type="number" min="0" max="15" value="${esc(a.dias_aviso)}">`)}
    <label>Código para el lector de correos</label>
    <code class="token">${esc(a.token_correo)}</code>
    <p class="hint">Pégalo en el script de Gmail (TOKEN_CORREO). No lo compartas: con él se pueden registrar movimientos en tu cuenta.</p>
    <div class="btns"><button type="button" class="btn" data-action="copiar-token">Copiar código</button>
    <button type="button" class="btn" data-action="nuevo-token">Generar otro</button></div>
    <div class="btns"><button type="button" class="btn danger block" data-action="salir">Cerrar sesión</button></div>`;
  abrirSheet('Ajustes', cuerpo, async (d) => {
    const { error } = await sb.from('ajustes').update({ tipo_cambio: num(d.tipo_cambio) || 3.75, dias_aviso: parseInt(d.dias_aviso, 10) || 0 }).eq('user_id', estado.user.id);
    if (error) throw error;
    toast('Ajustes guardados');
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
  'ver-revisar': () => { estado.filtro = 'revisar'; estado.vista = 'movimientos'; render(); },
  filtrar: (el) => { estado.filtro = el.dataset.filtro; estado.vista = 'movimientos'; render(); },
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

document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-vista]');
  if (v && !dlg.open) { estado.vista = v.dataset.vista; if (estado.vista !== 'movimientos') estado.filtro = 'todos'; render(); window.scrollTo(0, 0); return; }
  const a = e.target.closest('[data-action]');
  if (a && ACCIONES[a.dataset.action]) { e.preventDefault(); ACCIONES[a.dataset.action](a); }
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'tipo' && e.target.closest('#sheet-form')) actualizarTipo();
  if (e.target.id === 'filtro') { estado.filtro = e.target.value; render(); }
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

dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrarSheet(); }); // tocar fuera cierra

function traducirError(err) {
  const m = err?.message || String(err);
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo: revisa tu bandeja y abre el enlace que te enviamos.';
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
    if (antes !== estado.user.id) setTimeout(recargar, 0); // fuera del callback, como recomienda Supabase
  });
  // Al volver a la app, trae lo nuevo que haya llegado del correo.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && estado.user && !dlg.open) recargar(); });
} else {
  render();
}
