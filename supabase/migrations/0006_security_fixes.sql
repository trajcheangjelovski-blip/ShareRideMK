-- =====================================================================
-- Macedonia Ride — 0006_security_fixes.sql
-- Run AFTER 0005. Closes RLS gaps and adds the public profile view.
--   * passengers could set their own booking to 'approved'
--   * driver rating trigger was blocked by RLS (rating never updated)
--   * anyone could review / message / track anyone
--   * passengers lost access to their trip once it completed or was cancelled
--   * drivers could not read passenger names (users is self-only)
--   * users could make themselves admin / unblock themselves via the API
--   * drivers could set their own rating, verification and paid promotion
-- =====================================================================

-- ---------- helpers (security definer → no RLS recursion trips↔bookings) ----------
create or replace function is_trip_driver(p_trip uuid) returns boolean as $$
  select exists(select 1 from trips where id = p_trip and driver_id = auth.uid());
$$ language sql stable security definer set search_path = public;

create or replace function is_trip_passenger(p_trip uuid) returns boolean as $$
  select exists(select 1 from bookings where trip_id = p_trip and passenger_id = auth.uid());
$$ language sql stable security definer set search_path = public;

-- The other party of a booking for the current user (null if not a party).
create or replace function booking_counterpart(p_booking uuid) returns uuid as $$
  select case
           when b.passenger_id = auth.uid() then t.driver_id
           when t.driver_id    = auth.uid() then b.passenger_id
         end
    from bookings b join trips t on t.id = b.trip_id
   where b.id = p_booking;
$$ language sql stable security definer set search_path = public;

-- ---------- USERS: no self-promotion ----------
-- users_update_self allowed ANY column, so a user could call the API with
-- `update users set role = 'admin', status = 'active'` on their own row.
-- The app updates profiles via the service role (auth.uid() is null there).
create or replace function guard_user_update() returns trigger as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;
  if new.role           is distinct from old.role
  or new.status         is distinct from old.status
  or new.is_driver      is distinct from old.is_driver
  or new.is_passenger   is distinct from old.is_passenger
  or new.email          is distinct from old.email
  or new.email_verified is distinct from old.email_verified
  or new.phone_verified is distinct from old.phone_verified
  or new.password_hash  is distinct from old.password_hash then
    raise exception 'Not allowed to change protected profile fields';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_user_guard on users;
create trigger trg_user_guard before update on users
  for each row execute function guard_user_update();

-- ---------- DRIVER PROFILES: rating / trip count / verification are system-owned ----------
create or replace function guard_driver_profile() returns trigger as $$
begin
  -- depth > 1: written by a system trigger (rating recompute, trip completion)
  if auth.uid() is null or pg_trigger_depth() > 1 or is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rating_average := 0;
    new.total_trips := 0;
    new.verification_status := 'unverified';
  elsif new.rating_average      is distinct from old.rating_average
     or new.total_trips         is distinct from old.total_trips
     or new.verification_status is distinct from old.verification_status
     or new.user_id             is distinct from old.user_id then
    raise exception 'Only the bio can be edited';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_driver_profile_guard on driver_profiles;
create trigger trg_driver_profile_guard before insert or update on driver_profiles
  for each row execute function guard_driver_profile();

-- ---------- TRIPS: promotion flags are set by the system, not the driver ----------
create or replace function guard_trip_promotion() returns trigger as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- Same rule as the app: only approved drivers may publish.
    if not exists(select 1 from users where id = auth.uid() and is_driver and status = 'active') then
      raise exception 'Only approved drivers can create trips';
    end if;
    new.is_promoted := false;
    new.promotion_priority := 0;
    new.promoted_until := null;
  elsif new.is_promoted        is distinct from old.is_promoted
     or new.promotion_priority is distinct from old.promotion_priority
     or new.promoted_until     is distinct from old.promoted_until
     or new.driver_id          is distinct from old.driver_id then
    raise exception 'Promotion fields cannot be changed directly';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_trip_promo_guard on trips;
create trigger trg_trip_promo_guard before insert or update on trips
  for each row execute function guard_trip_promotion();

-- ---------- PROMOTIONS / SUBSCRIPTIONS: read-only for drivers ----------
-- Writes must come from the (future) payment flow on the server.
drop policy if exists promo_owner on trip_promotions;
create policy promo_read  on trip_promotions for select using (driver_id = auth.uid() or is_admin());
create policy promo_admin on trip_promotions for all using (is_admin()) with check (is_admin());

drop policy if exists subs_owner on driver_subscriptions;
create policy subs_read  on driver_subscriptions for select using (driver_id = auth.uid() or is_admin());
create policy subs_admin on driver_subscriptions for all using (is_admin()) with check (is_admin());

-- ---------- public profile view ----------
-- Safe subset of users for showing drivers/passengers to each other.
-- Runs with the owner's rights, so it bypasses users RLS by design.
create or replace view public_profiles as
  select id, first_name, left(last_name, 1) as last_initial,
         profile_image, is_driver, created_at
    from users
   where status <> 'deleted';
grant select on public_profiles to anon, authenticated;

-- ---------- TRIPS: passengers keep access to trips they booked ----------
drop policy if exists trips_select_public on trips;
create policy trips_select_public on trips for select
  using (status in ('published','scheduled','driver_on_the_way',
                    'arrived_at_pickup','passenger_picked_up','in_progress')
         or driver_id = auth.uid()
         or is_trip_passenger(id)
         or is_admin());

-- ---------- BOOKINGS ----------
drop policy if exists bookings_select on bookings;
create policy bookings_select on bookings for select using (
  passenger_id = auth.uid() or is_trip_driver(trip_id) or is_admin()
);

-- Only active users, never on their own trip, only on bookable trips.
drop policy if exists bookings_passenger_insert on bookings;
create policy bookings_passenger_insert on bookings for insert with check (
  passenger_id = auth.uid()
  and status = 'pending'
  and not is_trip_driver(trip_id)
  and exists(select 1 from users where id = auth.uid() and status = 'active')
  and exists(select 1 from trips t where t.id = trip_id
               and t.status = 'published' and t.available_seats >= seats_requested)
);

drop policy if exists bookings_update on bookings;
create policy bookings_update on bookings for update using (
  passenger_id = auth.uid() or is_trip_driver(trip_id) or is_admin()
);

-- Enforce who may move a booking to which status.
create or replace function guard_booking_update() returns trigger as $$
declare
  v_driver uuid;
begin
  -- service role / admin / internal triggers without a user
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if new.trip_id <> old.trip_id or new.passenger_id <> old.passenger_id then
    raise exception 'Booking trip/passenger cannot be changed';
  end if;
  if old.status = 'approved' and new.seats_requested <> old.seats_requested then
    raise exception 'Seats cannot be changed after approval';
  end if;

  if new.status is distinct from old.status then
    select driver_id into v_driver from trips where id = old.trip_id;
    if auth.uid() = v_driver then
      if not ((old.status = 'pending'  and new.status in ('approved','rejected'))
           or (old.status = 'approved' and new.status in ('cancelled_by_driver','no_show','completed'))) then
        raise exception 'Invalid status change % -> %', old.status, new.status;
      end if;
    elsif auth.uid() = old.passenger_id then
      if not (old.status in ('pending','approved') and new.status = 'cancelled_by_passenger') then
        raise exception 'Invalid status change % -> %', old.status, new.status;
      end if;
    else
      raise exception 'Not allowed';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_booking_guard on bookings;
create trigger trg_booking_guard before update on bookings
  for each row execute function guard_booking_update();

-- ---------- MESSAGES: only between the two parties of a booking ----------
drop policy if exists messages_send on messages;
create policy messages_send on messages for insert with check (
  sender_id = auth.uid()
  and booking_id is not null
  and receiver_id = booking_counterpart(booking_id)
  and exists(select 1 from bookings b where b.id = booking_id
               and b.status in ('pending','approved','completed'))
);

-- ---------- TRIP LOCATIONS: only the trip's driver, only while driving ----------
drop policy if exists triploc_driver_write on trip_locations;
create policy triploc_driver_write on trip_locations for insert with check (
  driver_id = auth.uid()
  and exists(select 1 from trips t where t.id = trip_id and t.driver_id = auth.uid()
               and t.status in ('driver_on_the_way','arrived_at_pickup',
                                'passenger_picked_up','in_progress'))
);

-- ---------- REVIEWS: only after a completed booking, only the other party ----------
drop policy if exists reviews_write on reviews;
create policy reviews_write on reviews for insert with check (
  reviewer_id = auth.uid()
  and exists(
    select 1 from bookings b join trips t on t.id = b.trip_id
     where b.id = booking_id and b.trip_id = reviews.trip_id and b.status = 'completed'
       and ((review_type = 'passenger_to_driver'
             and b.passenger_id = auth.uid() and reviewed_user_id = t.driver_id)
         or (review_type = 'driver_to_passenger'
             and t.driver_id = auth.uid() and reviewed_user_id = b.passenger_id))
  )
);

-- ---------- driver rating: must bypass RLS to update the driver's row ----------
create or replace function recompute_driver_rating() returns trigger as $$
declare avg_rating numeric(3,2);
begin
  if new.review_type = 'passenger_to_driver' then
    select round(avg(rating)::numeric, 2) into avg_rating
      from reviews
     where reviewed_user_id = new.reviewed_user_id
       and review_type = 'passenger_to_driver';
    insert into driver_profiles (user_id, rating_average)
    values (new.reviewed_user_id, coalesce(avg_rating, 0))
    on conflict (user_id) do update set rating_average = excluded.rating_average;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drivers registered before driver_profiles existed for them.
insert into driver_profiles (user_id)
select id from users where is_driver
on conflict (user_id) do nothing;
