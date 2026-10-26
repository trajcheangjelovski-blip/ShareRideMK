-- =====================================================================
-- Macedonia Ride — 0008_popular_routes.sql
-- Run AFTER 0007. popular_routes used to be created in seed.sql, which
-- (a) fails under `supabase db reset` (the seed is sent as one batch) and
-- (b) left the table without RLS, so anonymous visitors could edit or
-- delete it. Safe on projects where the seed already created it.
-- =====================================================================

create table if not exists popular_routes (
  id            uuid primary key default uuid_generate_v4(),
  start_city_id uuid not null references cities(id),
  end_city_id   uuid not null references cities(id),
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  unique (start_city_id, end_city_id)
);

alter table popular_routes enable row level security;

drop policy if exists popular_routes_read on popular_routes;
create policy popular_routes_read on popular_routes for select using (true);

drop policy if exists popular_routes_admin on popular_routes;
create policy popular_routes_admin on popular_routes for all
  using (is_admin()) with check (is_admin());
