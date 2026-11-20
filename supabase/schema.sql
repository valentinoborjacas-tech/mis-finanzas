-- =====================================================================
-- Mis Finanzas · esquema de base de datos para Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO este archivo → Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tablas ----------
create table if not exists public.ajustes (
  user_id      uuid primary key default auth.uid() references auth.users on delete cascade,
  tipo_cambio  numeric not null default 3.75,
  dias_aviso   int not null default 3,
  token_correo text not null unique default encode(gen_random_bytes(24), 'hex'),
  creado       timestamptz not null default now()
);

create table if not exists public.tarjetas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users on delete cascade,
  banco             text not null,
  nombre            text not null,
  ultimos4          text check (ultimos4 ~ '^[0-9]{4}$'),
  linea             numeric not null default 0,
  dia_corte         int not null check (dia_corte between 1 and 31),
  dia_pago          int not null check (dia_pago between 1 and 31),
  deuda_inicial_pen numeric not null default 0,
  deuda_inicial_usd numeric not null default 0,
  color             text default '#0f766e',
  activa            boolean not null default true,
  creado            timestamptz not null default now()
);
-- Pago del mes (estado de cuenta) que faltaba pagar el día que registraste la tarjeta.
alter table public.tarjetas add column if not exists facturado_inicial_pen numeric;
alter table public.tarjetas add column if not exists facturado_inicial_usd numeric;

create table if not exists public.cuentas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  nombre        text not null,
  tipo          text not null default 'efectivo' check (tipo in ('efectivo', 'ahorro', 'corriente')),
  moneda        text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  saldo_inicial numeric not null default 0,
  activa        boolean not null default true,
  creado        timestamptz not null default now()
);

create table if not exists public.movimientos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users on delete cascade,
  fecha             timestamptz not null default now(),
  tipo              text not null check (tipo in ('gasto', 'ingreso', 'pago_tarjeta', 'transferencia')),
  monto             numeric not null check (monto > 0),
  moneda            text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  descripcion       text,
  categoria         text not null default 'Otros',
  tarjeta_id        uuid references public.tarjetas on delete set null,
  cuenta_id         uuid references public.cuentas on delete set null,
  cuenta_destino_id uuid references public.cuentas on delete set null,
  cuotas            int not null default 1 check (cuotas between 1 and 60),
  origen            text not null default 'manual' check (origen in ('manual', 'correo')),
  email_id          text,
  banco             text,
  ultimos4          text,
  creado            timestamptz not null default now(),
  unique (user_id, email_id)
);
create index if not exists movimientos_user_fecha on public.movimientos (user_id, fecha desc);
create index if not exists movimientos_tarjeta on public.movimientos (tarjeta_id);
create index if not exists movimientos_cuenta on public.movimientos (cuenta_id);

create table if not exists public.deudas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  nombre         text not null,
  tipo           text not null default 'cuotas' check (tipo in ('cuotas', 'prestamo', 'persona')),
  acreedor       text,
  moneda         text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  monto_total    numeric not null default 0,
  pagado         numeric not null default 0,
  cuotas_total   int not null default 0,
  cuotas_pagadas int not null default 0,
  monto_cuota    numeric,
  dia_pago       int check (dia_pago between 1 and 31),
  tarjeta_id     uuid references public.tarjetas on delete set null,
  notas          text,
  activa         boolean not null default true,
  creado         timestamptz not null default now()
);

-- ---------- Seguridad: cada usuario solo ve y cambia lo suyo ----------
do $$
declare t text;
begin
  foreach t in array array['ajustes', 'tarjetas', 'cuentas', 'movimientos', 'deudas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists solo_lo_mio on public.%I', t);
    execute format('create policy solo_lo_mio on public.%I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- Permisos de la API (la app entra como usuario "authenticated") ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.ajustes, public.tarjetas, public.cuentas,
  public.movimientos, public.deudas to authenticated;

-- ---------- Saldos calculados (respetan la seguridad de quien consulta) ----------
create or replace view public.saldos_tarjeta with (security_invoker = true) as
select t.id as tarjeta_id,
       t.deuda_inicial_pen + coalesce(sum(case when m.tipo = 'gasto' then m.monto else -m.monto end) filter (where m.moneda = 'PEN'), 0) as deuda_pen,
       t.deuda_inicial_usd + coalesce(sum(case when m.tipo = 'gasto' then m.monto else -m.monto end) filter (where m.moneda = 'USD'), 0) as deuda_usd
from public.tarjetas t
left join public.movimientos m on m.tarjeta_id = t.id and m.tipo in ('gasto', 'ingreso', 'pago_tarjeta')
group by t.id;

create or replace view public.saldos_cuenta with (security_invoker = true) as
select c.id as cuenta_id,
       c.saldo_inicial
       + coalesce((select sum(case when m.tipo = 'ingreso' then m.monto else -m.monto end)
                   from public.movimientos m where m.cuenta_id = c.id), 0)
       + coalesce((select sum(m.monto) from public.movimientos m
                   where m.cuenta_destino_id = c.id and m.tipo = 'transferencia'), 0) as saldo
from public.cuentas c;

grant select on public.saldos_tarjeta, public.saldos_cuenta to authenticated;

-- ---------- Funciones para el lector de correos (Google Apps Script) ----------
-- El script se identifica con el "código para el lector de correos" que ves en Ajustes de la app.

create or replace function public.registrar_movimiento_correo(
  p_token text, p_email_id text, p_fecha timestamptz, p_monto numeric, p_moneda text,
  p_descripcion text, p_banco text, p_ultimos4 text, p_tipo text default 'gasto')
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_tarjeta uuid;
  v_id uuid;
begin
  select user_id into v_user from ajustes where token_correo = p_token;
  if v_user is null then raise exception 'Codigo de correo invalido'; end if;
  if p_tipo not in ('gasto', 'pago_tarjeta') then p_tipo := 'gasto'; end if;
  if upper(p_moneda) not in ('PEN', 'USD') then raise exception 'Moneda invalida'; end if;

  -- 1) por los últimos 4 dígitos; 2) si el banco tiene una sola tarjeta, esa.
  select id into v_tarjeta from tarjetas
   where user_id = v_user and activa and ultimos4 = p_ultimos4 limit 1;
  if v_tarjeta is null then
    select min(id::text)::uuid into v_tarjeta from tarjetas
     where user_id = v_user and activa and lower(banco) = lower(p_banco)
    having count(*) = 1;
  end if;

  insert into movimientos (user_id, fecha, tipo, monto, moneda, descripcion, categoria,
                           tarjeta_id, origen, email_id, banco, ultimos4)
  values (v_user, coalesce(p_fecha, now()), p_tipo, p_monto, upper(p_moneda), left(p_descripcion, 120),
          case when p_tipo = 'pago_tarjeta' then 'Pago de tarjeta' else 'Sin categoría' end,
          v_tarjeta, 'correo', p_email_id, p_banco, p_ultimos4)
  on conflict (user_id, email_id) do nothing
  returning id into v_id;

  return coalesce(v_id::text, 'duplicado');
end $$;

create or replace function public.estado_tarjetas(p_token text)
returns table (nombre text, banco text, ultimos4 text, linea numeric, deuda_pen numeric, deuda_usd numeric,
               dia_corte int, dia_pago int, tipo_cambio numeric, dias_aviso int)
language sql security definer set search_path = public as $$
  select t.nombre, t.banco, t.ultimos4, t.linea, s.deuda_pen, s.deuda_usd,
         t.dia_corte, t.dia_pago, a.tipo_cambio, a.dias_aviso
  from ajustes a
  join tarjetas t on t.user_id = a.user_id and t.activa
  join saldos_tarjeta s on s.tarjeta_id = t.id
  where a.token_correo = p_token;
$$;

revoke all on function public.registrar_movimiento_correo(text, text, timestamptz, numeric, text, text, text, text, text) from public;
revoke all on function public.estado_tarjetas(text) from public;
grant execute on function public.registrar_movimiento_correo(text, text, timestamptz, numeric, text, text, text, text, text) to anon, authenticated;
grant execute on function public.estado_tarjetas(text) to anon, authenticated;
