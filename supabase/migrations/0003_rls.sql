-- =====================================================================
-- Macedonia Ride — 0003_rls.sql   (Row Level Security)
-- Run AFTER 0002. Assumes users.id == auth.uid() (Supabase Auth user id).
-- When a user signs up, insert a matching row into public.users with the
-- same id as auth.users.id (see app: lib/auth or a trigger on auth.users).
-- =====================================================================

-- Convenience: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists(
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- ---------- enable RLS ----------
alter table users                     enable row level security;
alter table passenger_saved_locations enable row level security;
alter table driver_profiles           enable row level security;
alter table vehicles                  enable row level security;
alter table trips                     enable row level security;
alter table trip_waypoints            enable row level security;
alter table bookings                  enable row level security;
alter table messages                  enable row level security;
alter table trip_locations            enable row level security;
alter table reviews                   enable row level security;
alter table reports                   enable row level security;
alter table notifications             enable row level security;
alter table trip_promotions           enable row level security;
alter table driver_subscriptions      enable row level security;
-- cities, subscription_plans, admin_settings are public-read / admin-write
alter table cities                    enable row level security;
alter table subscription_plans        enable row level security;
alter table admin_settings            enable row level security;

-- ---------- USERS ----------
create policy users_select_self_or_admin on users for select
  using (id = auth.uid() or is_admin());
-- public profile fields are served via an API view; full row only to self/admin
create policy users_update_self on users for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy users_admin_all on users for all
  using (is_admin()) with check (is_admin());

-- ---------- SAVED LOCATIONS ----------
create policy saved_owner on passenger_saved_locations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- DRIVER PROFILES ----------
create policy driver_profile_read on driver_profiles for select
  using (true);  -- public (rating, bio, trips) — no sensitive data here
create policy driver_profile_write on driver_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- VEHICLES ----------
create policy vehicles_owner_write on vehicles for all
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy vehicles_read on vehicles for select
  using (true);  -- shown on published trips; no plate exposed by API pre-approval

-- ---------- TRIPS ----------
create policy trips_select_public on trips for select
  using (status in ('published','scheduled','driver_on_the_way',
                    'arrived_at_pickup','passenger_picked_up','in_progress')
         or driver_id = auth.uid() or is_admin());
create policy trips_owner_write on trips for all
  using (driver_id = auth.uid() or is_admin())
  with check (driver_id = auth.uid() or is_admin());

-- ---------- TRIP WAYPOINTS ----------
create policy waypoints_read on trip_waypoints for select using (true);
create policy waypoints_write on trip_waypoints for all
  using (exists(select 1 from trips t where t.id = trip_waypoints.trip_id
               and (t.driver_id = auth.uid() or is_admin())))
  with check (exists(select 1 from trips t where t.id = trip_waypoints.trip_id
               and (t.driver_id = auth.uid() or is_admin())));

-- ---------- BOOKINGS ----------
-- visible to the passenger who made it, the driver of the trip, or admin
create policy bookings_select on bookings for select using (
  passenger_id = auth.uid()
  or exists(select 1 from trips t where t.id = bookings.trip_id and t.driver_id = auth.uid())
  or is_admin()
);
create policy bookings_passenger_insert on bookings for insert
  with check (passenger_id = auth.uid());
-- passenger can cancel own; driver can approve/reject/cancel/no_show on their trip
create policy bookings_update on bookings for update using (
  passenger_id = auth.uid()
  or exists(select 1 from trips t where t.id = bookings.trip_id and t.driver_id = auth.uid())
  or is_admin()
);

-- ---------- MESSAGES ----------
create policy messages_access on messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid() or is_admin());
create policy messages_send on messages for insert
  with check (sender_id = auth.uid());
create policy messages_mark_read on messages for update
  using (receiver_id = auth.uid());

-- ---------- TRIP LOCATIONS (live tracking) ----------
create policy triploc_driver_write on trip_locations for insert
  with check (driver_id = auth.uid());
create policy triploc_read on trip_locations for select using (
  driver_id = auth.uid()
  or is_admin()
  or exists(select 1 from bookings b
            where b.trip_id = trip_locations.trip_id
              and b.passenger_id = auth.uid()
              and b.status = 'approved')
);

-- ---------- REVIEWS ----------
create policy reviews_read on reviews for select using (true);
create policy reviews_write on reviews for insert
  with check (reviewer_id = auth.uid());

-- ---------- REPORTS ----------
create policy reports_insert on reports for insert
  with check (reporter_id = auth.uid());
create policy reports_read on reports for select
  using (reporter_id = auth.uid() or is_admin());
create policy reports_admin_update on reports for update using (is_admin());

-- ---------- NOTIFICATIONS ----------
create policy notif_owner on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- PROMOTIONS / SUBSCRIPTIONS ----------
create policy promo_owner on trip_promotions for all
  using (driver_id = auth.uid() or is_admin())
  with check (driver_id = auth.uid() or is_admin());
create policy subs_owner on driver_subscriptions for all
  using (driver_id = auth.uid() or is_admin())
  with check (driver_id = auth.uid() or is_admin());

-- ---------- PUBLIC REFERENCE TABLES ----------
create policy cities_read on cities for select using (true);
create policy cities_admin on cities for all using (is_admin()) with check (is_admin());
create policy plans_read on subscription_plans for select using (is_active or is_admin());
create policy plans_admin on subscription_plans for all using (is_admin()) with check (is_admin());
create policy settings_admin on admin_settings for all using (is_admin()) with check (is_admin());
