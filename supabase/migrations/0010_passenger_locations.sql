-- =====================================================================
-- Macedonia Ride — 0010_passenger_locations.sql
-- Run AFTER 0009. Opt-in live location of a passenger, shared only with the
-- driver of their trip while the trip is in progress, so they can find each
-- other at the pickup point.
--   * one row per booking (latest position only, no history)
--   * readable by the passenger and that trip's driver, only while live
--   * cleared when the trip completes or is cancelled
-- =====================================================================

create table if not exists passenger_locations (
  booking_id   uuid primary key references bookings(id) on delete cascade,
  trip_id      uuid not null references trips(id) on delete cascade,
  passenger_id uuid not null references users(id) on delete cascade,
  latitude     double precision,
  longitude    double precision,
  accuracy     double precision,
  is_sharing   boolean not null default true,
  updated_at   timestamptz not null default now(),
  -- Stopping wipes the position; coordinates exist only while sharing.
  constraint passenger_loc_coords check (
    (is_sharing and latitude is not null and longitude is not null)
    or (not is_sharing and latitude is null and longitude is null and accuracy is null)
  )
);
create index if not exists idx_passenger_loc_trip on passenger_locations(trip_id);

alter table passenger_locations enable row level security;

-- Trip is in a "driving" state (same set the driver's tracking uses).
create or replace function trip_is_live(p_trip uuid) returns boolean as $$
  select exists(select 1 from trips where id = p_trip
                 and status in ('driver_on_the_way','arrived_at_pickup','passenger_picked_up','in_progress'));
$$ language sql stable security definer set search_path = public;

-- The passenger of this booking, approved on this trip, while it is live.
create or replace function can_share_passenger_location(p_booking uuid, p_trip uuid) returns boolean as $$
  select exists(select 1 from bookings
                 where id = p_booking and trip_id = p_trip
                   and passenger_id = auth.uid() and status = 'approved')
         and trip_is_live(p_trip);
$$ language sql stable security definer set search_path = public;

drop policy if exists passenger_loc_read on passenger_locations;
create policy passenger_loc_read on passenger_locations for select using (
  trip_is_live(trip_id) and (passenger_id = auth.uid() or is_trip_driver(trip_id))
);

drop policy if exists passenger_loc_insert on passenger_locations;
create policy passenger_loc_insert on passenger_locations for insert with check (
  passenger_id = auth.uid() and can_share_passenger_location(booking_id, trip_id)
);

drop policy if exists passenger_loc_update on passenger_locations;
create policy passenger_loc_update on passenger_locations for update
  using (passenger_id = auth.uid())
  with check (passenger_id = auth.uid() and can_share_passenger_location(booking_id, trip_id));

-- Keep updated_at honest (clients can't backdate or freeze it).
create or replace function touch_passenger_location() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_passenger_loc_touch on passenger_locations;
create trigger trg_passenger_loc_touch before insert or update on passenger_locations
  for each row execute function touch_passenger_location();

-- No position outlives the trip.
create or replace function clear_passenger_locations() returns trigger as $$
begin
  delete from passenger_locations where trip_id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_trip_clear_passenger_loc on trips;
create trigger trg_trip_clear_passenger_loc after update of status on trips
  for each row when (new.status in ('completed', 'cancelled'))
  execute function clear_passenger_locations();

grant select, insert, update on passenger_locations to authenticated;
grant select, insert, update, delete on passenger_locations to service_role;

do $$
begin
  if not exists(select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'passenger_locations') then
    alter publication supabase_realtime add table public.passenger_locations;
  end if;
end $$;
