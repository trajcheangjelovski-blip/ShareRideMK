-- =====================================================================
-- Macedonia Ride — 0002_functions_triggers.sql
-- Run AFTER 0001_schema.sql
-- =====================================================================

-- ---------- updated_at auto-touch ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated    before update on users
  for each row execute function set_updated_at();
create trigger trg_trips_updated     before update on trips
  for each row execute function set_updated_at();
create trigger trg_bookings_updated  before update on bookings
  for each row execute function set_updated_at();
create trigger trg_subs_updated      before update on driver_subscriptions
  for each row execute function set_updated_at();
create trigger trg_promo_updated     before update on trip_promotions
  for each row execute function set_updated_at();

-- ---------- keep geography columns in sync with lat/lng ----------
create or replace function sync_point_geom() returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geom = st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_city_geom   before insert or update on cities
  for each row execute function sync_point_geom();
create trigger trg_saved_geom  before insert or update on passenger_saved_locations
  for each row execute function sync_point_geom();
create trigger trg_waypoint_geom before insert or update on trip_waypoints
  for each row execute function sync_point_geom();

-- pickup & dropoff on bookings (two points)
create or replace function sync_booking_geom() returns trigger as $$
begin
  new.pickup_geom  = st_setsrid(st_makepoint(new.pickup_longitude,  new.pickup_latitude),  4326)::geography;
  new.dropoff_geom = st_setsrid(st_makepoint(new.dropoff_longitude, new.dropoff_latitude), 4326)::geography;
  return new;
end;
$$ language plpgsql;

create trigger trg_booking_geom before insert or update on bookings
  for each row execute function sync_booking_geom();

-- ---------- seat management on booking status change ----------
create or replace function on_booking_status_change() returns trigger as $$
begin
  -- approve: reserve seats (atomic, guarded)
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update trips
       set available_seats = available_seats - new.seats_requested
     where id = new.trip_id
       and available_seats >= new.seats_requested;
    if not found then
      raise exception 'Not enough seats available for trip %', new.trip_id;
    end if;

  -- release seats when a previously-approved booking is cancelled / no_show
  elsif old.status = 'approved'
        and new.status in ('cancelled_by_passenger','cancelled_by_driver','no_show') then
    update trips
       set available_seats = available_seats + old.seats_requested
     where id = new.trip_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_booking_seats after update on bookings
  for each row execute function on_booking_status_change();

-- ---------- recompute driver rating after a review ----------
create or replace function recompute_driver_rating() returns trigger as $$
declare avg_rating numeric(3,2);
begin
  if new.review_type = 'passenger_to_driver' then
    select round(avg(rating)::numeric, 2) into avg_rating
      from reviews
     where reviewed_user_id = new.reviewed_user_id
       and review_type = 'passenger_to_driver';
    update driver_profiles
       set rating_average = coalesce(avg_rating, 0)
     where user_id = new.reviewed_user_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_review_rating after insert on reviews
  for each row execute function recompute_driver_rating();

-- ---------- helper: detour estimate for a booking vs a trip ----------
-- Returns distance_km from route and a rough detour-minute estimate.
-- avg_speed_kmh is the assumed access-road speed for the detour leg.
create or replace function estimate_detour(
  p_route geography,
  p_point geography,
  p_avg_speed_kmh numeric default 40
) returns table(distance_km numeric, detour_minutes numeric) as $$
begin
  distance_km := round((st_distance(p_route, p_point) / 1000.0)::numeric, 3);
  -- there and back along the access road
  detour_minutes := round(((distance_km * 2) / p_avg_speed_kmh * 60)::numeric, 2);
  return next;
end;
$$ language plpgsql;
