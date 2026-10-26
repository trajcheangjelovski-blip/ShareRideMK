-- =====================================================================
-- Macedonia Ride — 0007_trip_lifecycle_notifications_realtime.sql
-- Run AFTER 0006.
--   * trip lifecycle: published → in_progress → completed (or cancelled),
--     cascading to bookings so reviews unlock after a completed ride
--   * notifications written by triggers (users can't insert for others)
--   * Realtime for chat, notifications and live tracking
-- =====================================================================

-- ---------- trip status transitions ----------
create or replace function guard_trip_status() returns trigger as $$
begin
  if new.status is not distinct from old.status or auth.uid() is null or is_admin() then
    return new;
  end if;
  if not (
       (old.status in ('draft','published','scheduled')
          and new.status in ('published','in_progress','cancelled'))
    or (old.status in ('driver_on_the_way','arrived_at_pickup','passenger_picked_up','in_progress')
          and new.status in ('in_progress','completed','cancelled'))
  ) then
    raise exception 'Invalid trip status change % -> %', old.status, new.status;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_trip_guard on trips;
create trigger trg_trip_guard before update on trips
  for each row execute function guard_trip_status();

create or replace function on_trip_status_change() returns trigger as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'completed' then
    update bookings set status = 'completed' where trip_id = new.id and status = 'approved';
    update bookings set status = 'rejected'  where trip_id = new.id and status = 'pending';
    insert into driver_profiles (user_id, total_trips) values (new.driver_id, 1)
    on conflict (user_id) do update set total_trips = driver_profiles.total_trips + 1;

  elsif new.status = 'cancelled' then
    update bookings set status = 'cancelled_by_driver' where trip_id = new.id and status = 'approved';
    update bookings set status = 'rejected'            where trip_id = new.id and status = 'pending';

  elsif new.status = 'in_progress' and old.status in ('draft','published','scheduled') then
    insert into notifications (user_id, title, message, type, data)
    select b.passenger_id, 'Возачот тргна', 'Следи го возилото во живо на мапата.', 'trip_started',
           jsonb_build_object('trip_id', new.id, 'href', '/dashboard/passenger/trips/' || new.id)
      from bookings b
     where b.trip_id = new.id and b.status = 'approved';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_trip_status on trips;
create trigger trg_trip_status after update of status on trips
  for each row execute function on_trip_status_change();

-- ---------- notifications ----------
create or replace function trip_route_label(p_trip uuid) returns text as $$
  select sc.name || ' → ' || ec.name
    from trips t
    join cities sc on sc.id = t.start_city_id
    join cities ec on ec.id = t.end_city_id
   where t.id = p_trip;
$$ language sql stable security definer set search_path = public;

create or replace function push_notification(p_user uuid, p_title text, p_message text, p_type text, p_data jsonb)
returns void as $$
  insert into notifications (user_id, title, message, type, data)
  values (p_user, p_title, p_message, p_type, p_data);
$$ language sql security definer set search_path = public;
-- Triggers only: never callable through the API (would allow spamming anyone).
revoke execute on function push_notification(uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function notify_booking_change() returns trigger as $$
declare
  v_driver uuid;
  v_route  text := trip_route_label(new.trip_id);
  v_pass   text := '/dashboard/passenger/trips/' || new.trip_id;
  v_drv    text := '/dashboard/driver/trips/' || new.trip_id;
  v_data   jsonb;
begin
  select driver_id into v_driver from trips where id = new.trip_id;

  if tg_op = 'INSERT' then
    perform push_notification(v_driver, 'Ново барање за превоз',
                   v_route || ' · ' || new.seats_requested || ' место(а)', 'booking_request',
                   jsonb_build_object('booking_id', new.id, 'trip_id', new.trip_id, 'href', v_drv));
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  v_data := jsonb_build_object('booking_id', new.id, 'trip_id', new.trip_id, 'href', v_pass);
  case new.status
    when 'approved' then
      perform push_notification(new.passenger_id, 'Барањето е прифатено', v_route, 'booking_approved', v_data);
    when 'rejected' then
      perform push_notification(new.passenger_id, 'Барањето не е прифатено', v_route, 'booking_rejected', v_data);
    when 'cancelled_by_driver' then
      perform push_notification(new.passenger_id, 'Возачот го откажа патувањето', v_route, 'booking_cancelled', v_data);
    when 'completed' then
      perform push_notification(new.passenger_id, 'Патувањето заврши — оцени го возачот', v_route, 'review_request', v_data);
    when 'cancelled_by_passenger' then
      perform push_notification(v_driver, 'Патник го откажа барањето', v_route, 'booking_cancelled',
                     jsonb_build_object('booking_id', new.id, 'trip_id', new.trip_id, 'href', v_drv));
    else
      null;
  end case;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_booking_notify on bookings;
create trigger trg_booking_notify after insert or update of status on bookings
  for each row execute function notify_booking_change();

-- One unread "new message" notification per conversation, not one per message.
create or replace function notify_message() returns trigger as $$
declare
  v_trip   uuid;
  v_driver uuid;
  v_name   text;
  v_href   text;
begin
  select b.trip_id, t.driver_id into v_trip, v_driver
    from bookings b join trips t on t.id = b.trip_id
   where b.id = new.booking_id;
  if v_trip is null then
    return new;
  end if;
  if exists(select 1 from notifications
             where user_id = new.receiver_id and type = 'message' and not is_read
               and data->>'booking_id' = new.booking_id::text) then
    return new;
  end if;

  select first_name into v_name from users where id = new.sender_id;
  v_href := case when new.receiver_id = v_driver
                 then '/dashboard/driver/trips/' || v_trip || '?booking=' || new.booking_id
                 else '/dashboard/passenger/trips/' || v_trip end;
  perform push_notification(new.receiver_id, 'Нова порака од ' || coalesce(v_name, 'корисник'),
                 left(new.message, 120), 'message',
                 jsonb_build_object('booking_id', new.booking_id, 'trip_id', v_trip, 'href', v_href || '#chat'));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_message_notify on messages;
create trigger trg_message_notify after insert on messages
  for each row execute function notify_message();

create or replace function notify_review() returns trigger as $$
begin
  perform push_notification(new.reviewed_user_id, 'Доби нова оцена: ' || repeat('★', new.rating),
                 coalesce(left(new.comment, 120), trip_route_label(new.trip_id)), 'review',
                 jsonb_build_object('trip_id', new.trip_id, 'href', '/dashboard/passenger/profile'));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_review_notify on reviews;
create trigger trg_review_notify after insert on reviews
  for each row execute function notify_review();

-- ---------- Realtime (RLS still applies to subscribers) ----------
do $$
declare t text;
begin
  foreach t in array array['messages', 'notifications', 'trip_locations'] loop
    if not exists(select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
