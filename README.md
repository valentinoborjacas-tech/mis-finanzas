# Mis Finanzas 💳

App personal (se instala en el celular) para controlar tarjetas de crédito, efectivo, cuentas y deudas.
Los consumos de **Interbank** y **BBVA** se registran solos leyendo los correos que te mandan los bancos.

**Todo es gratis:** GitHub Pages (la app), Supabase (la base de datos) y Google Apps Script (el lector de correos).

```
Correo del banco ──► Gmail ──► Apps Script (cada 5 min) ──► Supabase ◄── App en tu celular
```

---

## Paso 1 · Crear la base de datos (Supabase) — 10 min

1. Entra a <https://supabase.com> → **Start your project** → regístrate con tu cuenta de GitHub o de Google.
2. **New project**:
   - Name: `mis-finanzas`
   - Database password: genera una y guárdala (no la vas a necesitar en la app).
   - Region: **South America (São Paulo)**, la más cercana a Perú.
   - Espera 1–2 minutos a que se cree.
3. En el menú izquierdo abre **SQL Editor** → **New query** → copia y pega **todo** el archivo
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Debe decir *Success*.
4. Ve a **Project Settings → API** (o **Data API**) y copia:
   - **Project URL** (algo como `https://abcdxyz.supabase.co`)
   - **anon public key** (un texto largo que empieza con `eyJ…`)
5. Abre [`js/config.js`](js/config.js) y reemplaza `TU-PROYECTO` y `TU_ANON_KEY` con esos dos valores.

> La *anon key* es pública por diseño. Tus datos están protegidos por las reglas de seguridad (RLS)
> del archivo SQL: cada usuario solo puede ver sus propios registros. **Nunca** pegues la clave
> `service_role` en ningún archivo.

## Paso 2 · Publicar la app (GitHub Pages) — 5 min

1. Abre **GitHub Desktop** → **File → Add local repository** → elige la carpeta `Documents\GitHub\mis-finanzas`.
   Te dirá que no es un repositorio: haz clic en **create a repository** → **Create repository**.
2. Haz clic en **Publish repository**. **Desmarca** "Keep this code private" (GitHub Pages gratis
   necesita repositorio público; en el código no hay datos tuyos, solo la anon key, que es pública).
3. En el navegador abre tu repositorio en github.com → **Settings → Pages** →
   *Source*: **Deploy from a branch** → Branch: **main** / **(root)** → **Save**.
4. En 1–2 minutos tu app estará en `https://TU-USUARIO.github.io/mis-finanzas/`.
5. Vuelve a Supabase → **Authentication → URL Configuration** → *Site URL*: pega esa dirección → **Save**.
   (Así el correo de confirmación de cuenta te regresa a tu app).

Cada vez que cambies algo: en GitHub Desktop escribe un resumen → **Commit to main** → **Push origin**.

## Paso 3 · Instalar en el celular — 2 min

1. En el celular abre tu dirección `https://TU-USUARIO.github.io/mis-finanzas/` en **Chrome** (Android)
   o **Safari** (iPhone).
2. Android: menú ⋮ → **Instalar app** / **Agregar a pantalla principal**.
   iPhone: botón Compartir → **Agregar a inicio**.
3. Abre la app → **Crear una cuenta nueva** → confirma desde el correo que te llega → ingresa.

## Paso 4 · Cargar tus datos iniciales — 5 min

1. **Tarjetas** → *Agregar tarjeta*: banco, últimos 4 dígitos, línea, día de corte, último día de pago
   y la **deuda que tienes hoy** (la ves en la app del banco). Haz esto con tu Interbank y tu BBVA.
2. **Efectivo** → *Agregar cuenta o billetera*: tu efectivo y tus cuentas de ahorro con el saldo de hoy.
3. **Deudas**: compras en cuotas, préstamos o deudas con personas.
4. ⚙️ **Ajustes**: revisa el tipo de cambio y **copia el código para el lector de correos** (lo usas en el paso 5).

## Paso 5 · Conectar tu Gmail (Google Apps Script) — 10 min

1. Entra a <https://script.google.com> con la cuenta de Gmail donde te llegan los correos de los bancos →
   **Nuevo proyecto**. Ponle de nombre `Mis Finanzas - lector`.
2. Borra lo que hay y pega **todo** el archivo [`apps-script/Code.gs`](apps-script/Code.gs).
3. Arriba, en `CONFIG`, completa:
   - `SUPABASE_URL` y `SUPABASE_ANON_KEY`: los mismos del paso 1.
   - `TOKEN_CORREO`: el código que copiaste en ⚙️ Ajustes de la app.
4. ⚙️ **Configuración del proyecto** (rueda a la izquierda) → **Zona horaria**: `(GMT-05:00) Lima`.
5. Guarda (💾). En la lista de funciones de arriba elige **`probar`** → **Ejecutar**.
   - Google pedirá permisos: **Revisar permisos** → elige tu cuenta → saldrá
     *"Google no verificó esta app"* → **Configuración avanzada** → **Ir a Mis Finanzas - lector (no seguro)** → **Permitir**.
     Es normal: el script es tuyo y solo corre en tu cuenta.
   - Abajo verás cómo se leyó cada correo. Si alguno dice ❌, copia ese registro y mándamelo para ajustar el lector.
6. Cuando `probar` se vea bien, elige **`instalar`** → **Ejecutar**. ¡Listo! Desde ahora:
   - Cada 5 minutos los consumos nuevos aparecen en la app (con el ícono 📧).
   - Todos los días a las 8 a. m. te llega un correo **solo si hay algo importante** (pago cercano o uso alto
     antes del corte), y los lunes un resumen semanal.

Los correos que el script no puede leer quedan con la etiqueta **Mis Finanzas/Revisar** en Gmail para que
los registres a mano.

---

## Cómo usar la app para que te suban la línea

- **Mantén el uso bajo 30 %** (mejor bajo 10 %). La barra de cada tarjeta tiene una marca en 30 %.
  Si te pasas, la app te dice cuánto pagar **antes del corte** para que tu estado de cuenta salga bajo 30 %.
- **Paga el total facturado antes del último día de pago.** La app calcula ese monto restando los consumos
  hechos después del corte y las cuotas aún no facturadas. Compáralo siempre con tu estado de cuenta.
- **Usa la tarjeta todos los meses**, aunque sea poco, y págala completa.
- Tras ~6 meses así, **actualiza tus ingresos** en la app del banco y **solicita el aumento** de línea.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html`, `css/`, `js/app.js` | La app (HTML + JavaScript, sin compilar) |
| `js/config.js` | Conexión a tu Supabase |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | Lo que la hace instalable en el celular |
| `supabase/schema.sql` | Tablas, seguridad y funciones de la base de datos |
| `apps-script/Code.gs` | Lector de correos y avisos (va en script.google.com) |
