// Mis Finanzas · función "notificar" (Supabase Edge Function)
// Acciones (body JSON {"accion": ...}):
//   "clave"  → devuelve la clave pública para suscribir el celular (las claves se crean solas la primera vez).
//   "probar" → envía una notificación de prueba al usuario que llama (requiere sesión).
//   "enviar" → la llama el horario diario (pg_cron): arma y envía los avisos y el consejo del día a todos.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const APP_URL = 'https://valentinoborjacas-tech.github.io/mis-finanzas/';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Msg = { title: string; body: string; tag: string };

const CONSEJOS = [
  'Antes de pagar con tarjeta, pregúntate: ¿lo compraría si tuviera que pagarlo en efectivo hoy?',
  'Paga siempre el total del mes. Pagar solo el mínimo te hace pagar intereses altísimos.',
  'Mantén tu uso de línea bajo 30%: es una de las cosas que más miran los bancos para subirte la línea.',
  'Espera 24 horas antes de una compra no planificada. Si al día siguiente aún la quieres, piénsalo de nuevo.',
  'Las cuotas "sin intereses" también ocupan tu línea. Úsalas solo para lo que de verdad necesitas.',
  'Usar la tarjeta para gastos fijos (como servicios) y pagarla completa construye buen historial.',
  'Revisa tus movimientos cada semana: detectar un cobro raro a tiempo te ahorra problemas.',
  'Nunca retires efectivo con la tarjeta de crédito: cobra comisión e intereses desde el primer día.',
  'Un atraso de un solo día puede quedar en tu historial. Programa el pago unos días antes del vencimiento.',
  'Si pagas antes del corte, tu estado de cuenta sale con menos deuda y tu uso de línea se ve mejor.',
  'Las suscripciones pequeñas suman. Revisa cuáles usas de verdad y cancela las demás.',
  'Ten un fondo de emergencia en efectivo para no depender de la tarjeta en imprevistos.',
  'Actualiza tus ingresos en la app del banco: es un dato clave para que evalúen subirte la línea.',
  'Comprar por impulso es más fácil con tarjeta. Haz una lista antes de ir de compras.',
  'Los descuentos no son ahorro si compras algo que no pensabas comprar.',
  'Usa tus tarjetas todos los meses, aunque sea poco, y págalas completas: así el banco ve tu buen manejo.',
  'Pide el aumento de línea tú mismo después de 6 meses pagando puntual: muchas veces no lo ofrecen solos.',
  'Antes de comprar en dólares, recuerda que el tipo de cambio puede hacer que pagues más.',
  'Divide tu sueldo apenas llega: pagos, ahorro y luego gastos. No al revés.',
  'Guarda los comprobantes de compras grandes para revisar tu estado de cuenta.',
  'Si un mes gastas de más, no lo pases a cuotas: recorta el siguiente mes y paga el total.',
  'Una tarjeta es una herramienta, no un ingreso extra. La línea no es tu dinero.',
  'Compara: ¿cuántas horas de trabajo te cuesta esta compra?',
  'Activa las notificaciones de consumo de tu banco: te ayudan a detectar fraudes al instante.',
  'Evita prestar tu tarjeta: cualquier atraso de otro afecta tu historial.',
  'Revisa tu reporte en la central de riesgos de la SBS al menos una vez al año.',
  'Si tienes deuda en varias tarjetas, paga primero la de mayor tasa de interés.',
  'Celebra tus logros financieros sin endeudarte: un mes sin intereses también es un logro.',
  'Pon una meta clara: “en 6 meses, uso bajo 30% y cero atrasos”. Luego pide tu aumento.',
  'El mejor momento para pagar es apenas sale tu estado de cuenta, no el último día.',
  'Antes de comprar algo caro, revisa en la app cuánto te queda disponible después del pago del mes.',
];

/* ---------- Fechas en hora de Lima ---------- */
const DIA = 86400000;
function hoyLima() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
    .formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { t: Date.UTC(+g('year'), +g('month') - 1, +g('day')), dow: g('weekday') };
}
const diaEn = (y: number, m: number, d: number) => Date.UTC(y, m, Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()));
const mesMas = (t: number, dia: number, n: number) => { const f = new Date(t); return diaEn(f.getUTCFullYear(), f.getUTCMonth() + n, dia); };
const ddmm = (t: number) => { const f = new Date(t); return `${f.getUTCDate()}/${f.getUTCMonth() + 1}`; };
const enDias = (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Fecha de un movimiento (timestamptz) convertida al día de Lima, como número comparable con hoyLima().t
const diaLima = (iso: string) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  const [y, m, d] = p.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/* ---------- Mensajes de un usuario ---------- */
async function mensajes(userId: string): Promise<Msg[]> {
  const { t: hoy, dow } = hoyLima();
  const hace40 = new Date(hoy - 40 * DIA).toISOString();
  const [aj, ts, ss, ms] = await Promise.all([
    admin.from('ajustes').select('tipo_cambio,dias_aviso').eq('user_id', userId).maybeSingle(),
    admin.from('tarjetas').select('*').eq('user_id', userId).eq('activa', true),
    admin.from('saldos_tarjeta').select('*'),
    admin.from('movimientos').select('fecha,tipo,monto,moneda,categoria,tarjeta_id').eq('user_id', userId).gte('fecha', hace40),
  ]);
  const tc = Number(aj.data?.tipo_cambio) || 3.75;
  const diasAviso = aj.data?.dias_aviso ?? 3;
  const saldos = new Map((ss.data || []).map((s) => [s.tarjeta_id, s]));
  const movs = ms.data || [];
  const out: Msg[] = [];

  for (const t of ts.data || []) {
    const s = saldos.get(t.id);
    const deuda = Number(s?.deuda_pen ?? t.deuda_inicial_pen) + Number(s?.deuda_usd ?? t.deuda_inicial_usd) * tc;
    const linea = Number(t.linea) || 0;
    const util = linea > 0 ? deuda / linea : 0;

    let corte = diaEn(new Date(hoy).getUTCFullYear(), new Date(hoy).getUTCMonth(), t.dia_corte);
    if (corte >= hoy) corte = mesMas(corte, t.dia_corte, -1);
    const salto = t.dia_pago <= t.dia_corte ? 1 : 0;
    const proxCorte = mesMas(corte, t.dia_corte, 1);
    const pago = mesMas(corte, t.dia_pago, salto);
    const dPago = Math.round((pago - hoy) / DIA);
    const dCorte = Math.round((proxCorte - hoy) / DIA);

    // Pendiente aproximado del estado de cuenta: deuda actual menos consumos hechos después del corte.
    const consumosDesdeCorte = movs
      .filter((m) => m.tarjeta_id === t.id && m.tipo === 'gasto' && diaLima(m.fecha) > corte)
      .reduce((a, m) => a + Number(m.monto) * (m.moneda === 'USD' ? tc : 1), 0);
    const pendiente = deuda - consumosDesdeCorte;

    if (dPago >= 0 && dPago <= diasAviso && pendiente > 1) {
      out.push({
        title: `💳 ${t.nombre}: pago ${enDias(dPago)}`,
        body: `Vence el ${ddmm(pago)}. Paga el total del estado de cuenta (aprox. ${soles(pendiente)}), no el mínimo.`,
        tag: `pago-${t.id}`,
      });
    }
    if (util >= 0.3 && dCorte >= 0 && dCorte <= 3) {
      out.push({
        title: `📉 ${t.nombre} al ${Math.round(util * 100)}%`,
        body: `Paga ${soles(deuda - 0.3 * linea)} antes del corte (${ddmm(proxCorte)}) para cerrar bajo 30% de tu línea.`,
        tag: `uso-${t.id}`,
      });
    }
  }

  // Resumen semanal (lunes): gastos de los últimos 7 días.
  if (dow === 'Mon') {
    const semana = movs.filter((m) => m.tipo === 'gasto' && diaLima(m.fecha) >= hoy - 7 * DIA && diaLima(m.fecha) < hoy);
    const total = semana.reduce((a, m) => a + Number(m.monto) * (m.moneda === 'USD' ? tc : 1), 0);
    const cats = new Map<string, number>();
    semana.forEach((m) => cats.set(m.categoria, (cats.get(m.categoria) || 0) + Number(m.monto) * (m.moneda === 'USD' ? tc : 1)));
    const top = [...cats.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({
      title: '📊 Tu semana',
      body: total > 0 ? `Gastaste ${soles(total)}.${top ? ` Lo que más: ${top[0]} (${soles(top[1])}).` : ''}` : 'No registraste gastos la semana pasada. ¡Bien!',
      tag: 'semana',
    });
  }

  // Consejo del día (rota según el día del año).
  const diaDelAno = Math.floor(hoy / DIA);
  out.push({ title: '💡 Consejo del día', body: CONSEJOS[diaDelAno % CONSEJOS.length], tag: 'consejo' });
  return out;
}

/* ---------- Envío ---------- */
async function enviarA(userId: string, msgs: Msg[]) {
  const { data: subs } = await admin.from('push_suscripciones').select('*').eq('user_id', userId);
  let enviadas = 0;
  for (const s of subs || []) {
    for (const m of msgs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...m, url: APP_URL }));
        enviadas++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { await admin.from('push_suscripciones').delete().eq('id', s.id); break; } // celular dado de baja
        console.error('push', code, (e as Error).message);
      }
    }
  }
  return enviadas;
}

async function configuracion() {
  const { data, error } = await admin.from('config_push').select('*').eq('id', 1).single();
  if (error) throw error;
  if (data.vapid_public && data.vapid_private) return data;
  const k = webpush.generateVAPIDKeys();
  await admin.from('config_push').update({ vapid_public: k.publicKey, vapid_private: k.privateKey }).eq('id', 1);
  return { ...data, vapid_public: k.publicKey, vapid_private: k.privateKey };
}

async function usuario(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data } = await admin.auth.getUser(token);
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { accion } = await req.json().catch(() => ({ accion: '' }));
    const cfg = await configuracion();
    webpush.setVapidDetails(APP_URL, cfg.vapid_public, cfg.vapid_private);

    if (accion === 'clave') return json({ clave: cfg.vapid_public });

    if (accion === 'probar') {
      const u = await usuario(req);
      if (!u) return json({ error: 'Inicia sesión' }, 401);
      const msgs = await mensajes(u.id);
      const enviadas = await enviarA(u.id, [{ title: 'Mis Finanzas ✨', body: '¡Listo! Así te llegarán tus avisos y consejos.', tag: 'prueba' }, ...msgs.slice(-1)]);
      return json({ enviadas });
    }

    if (accion === 'enviar') {
      if (req.headers.get('x-cron-secret') !== cfg.cron_secret) return json({ error: 'No autorizado' }, 401);
      const { data: subs } = await admin.from('push_suscripciones').select('user_id');
      const usuarios = [...new Set((subs || []).map((s) => s.user_id))];
      let total = 0;
      for (const id of usuarios) total += await enviarA(id, await mensajes(id));
      return json({ usuarios: usuarios.length, enviadas: total });
    }

    return json({ error: 'Acción desconocida' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
