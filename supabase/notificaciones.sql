-- =====================================================================
-- Mis Finanzas · notificaciones push
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO este archivo → Run.
-- Se puede ejecutar más de una vez.
-- =====================================================================

create extension if not exists pgcrypto;

-- Celulares donde activaste las notificaciones (uno por dispositivo).
create table if not exists public.push_suscripciones (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh   text not null,
  auth     text not null,
  creado   timestamptz not null default now()
);
alter table public.push_suscripciones enable row level security;
drop policy if exists solo_lo_mio on public.push_suscripciones;
create policy solo_lo_mio on public.push_suscripciones for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_suscripciones to authenticated;

-- Claves del servidor de notificaciones. Sin políticas RLS: solo el servidor (función) puede leerla.
create table if not exists public.config_push (
  id            int primary key default 1 check (id = 1),
  vapid_public  text,
  vapid_private text,
  cron_secret   text not null default encode(gen_random_bytes(24), 'hex')
);
alter table public.config_push enable row level security;
revoke all on public.config_push from anon, authenticated;
insert into public.config_push (id) values (1) on conflict do nothing;

-- Envío automático todos los días a las 9:00 a. m. de Lima (14:00 UTC).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'mis-finanzas-notificar';
select cron.schedule('mis-finanzas-notificar', '0 14 * * *', $$
  select net.http_post(
    url     := 'https://uxcwjkpioevszvlguthl.supabase.co/functions/v1/notificar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4Y3dqa3Bpb2V2c3p2bGd1dGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMDY1NzcsImV4cCI6MjExMDc4MjU3N30.iwzl-SAftTrj3l9catCMIwBpZoS6jb70yRW86b2XU1w',
      'x-cron-secret', (select cron_secret from public.config_push where id = 1)
    ),
    body    := '{"accion":"enviar"}'::jsonb
  );
$$);
