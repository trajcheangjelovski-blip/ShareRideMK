-- =====================================================================
-- Macedonia Ride — 0001_schema.sql
-- Extensions, ENUMs, tables, indexes. Run this FIRST.
-- Tables are ordered by dependency so foreign keys resolve cleanly.
-- =====================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";
create extension if not exists postgis;        -- route-matching / detour

-- ---------- ENUMS ----------
create type user_role        as enum ('passenger','driver','admin');
create type user_status      as enum ('active','blocked','pending','deleted');
create type verification_st  as enum ('unverified','pending','verified','rejected');
create type trip_status      as enum ('draft','published','scheduled',
                                      'driver_on_the_way','arrived_at_pickup',
                                      'passenger_picked_up','in_progress',
                                      'completed','cancelled');
create type booking_status   as enum ('pending','approved','rejected',
                                      'cancelled_by_passenger','cancelled_by_driver',
                                      'completed','no_show');
create type message_type     as enum ('text','pickup_clarification','system',
                                      'location_suggestion','trip_update');
create type review_type      as enum ('driver_to_passenger','passenger_to_driver');
create type report_status    as enum ('open','investigating','resolved','dismissed');
create type promotion_type   as enum ('subscription','boost_24h','boost_3d','featured');
create type promotion_status as enum ('active','expired','cancelled','scheduled');
create type sub_status       as enum ('active','expired','cancelled','past_due');
create type pay_status       as enum ('unpaid','paid','refunded','pending');
create type recurrence_type  as enum ('none','weekdays','weekends','weekly','custom');

-- ---------- CITIES (no dependencies) ----------
create table cities (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  latitude   double precision,
  longitude  double precision,
  geom       geography(Point,4326),
  is_active  boolean not null default true
);

-- ---------- USERS ----------
create table users (
  id              uuid primary key default uuid_generate_v4(),
  first_name      text not null,
  last_name       text not null,
  email           text unique,
  phone           text unique,
  password_hash   text,
  profile_image   text,
  city_id         uuid references cities(id),
  role            user_role not null default 'passenger',
  is_driver       boolean not null default false,
  is_passenger    boolean not null default true,
  email_verified  boolean not null default false,
  phone_verified  boolean not null default false,
  status          user_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_users_role   on users(role);
create index idx_users_status on users(status);

-- ---------- PASSENGER SAVED LOCATIONS ----------
create table passenger_saved_locations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  label       text not null,
  address     text,
  latitude    double precision not null,
  longitude   double precision not null,
  geom        geography(Point,4326),
  note        text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_saved_loc_user on passenger_saved_locations(user_id);

-- ---------- DRIVER PROFILES ----------
create table driver_profiles (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null unique references users(id) on delete cascade,
  bio                 text,
  rating_average      numeric(3,2) not null default 0,
  total_trips         integer not null default 0,
  verification_status verification_st not null default 'unverified',
  created_at          timestamptz not null default now()
);

-- ---------- VEHICLES ----------
create table vehicles (
  id            uuid primary key default uuid_generate_v4(),
  driver_id     uuid not null references users(id) on delete cascade,
  make          text not null,
  model         text not null,
  year          integer,
  color         text,
  license_plate text not null,
  seats         integer not null check (seats between 1 and 8),
  has_ac        boolean not null default false,
  luggage_space text,
  vehicle_image text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index idx_vehicles_driver on vehicles(driver_id);

-- ---------- TRIPS ----------
create table trips (
  id                  uuid primary key default uuid_generate_v4(),
  driver_id           uuid not null references users(id) on delete cascade,
  vehicle_id          uuid references vehicles(id),
  start_city_id       uuid not null references cities(id),
  end_city_id         uuid not null references cities(id),
  start_address       text,
  start_latitude      double precision not null,
  start_longitude     double precision not null,
  destination_address text,
  destination_latitude  double precision not null,
  destination_longitude double precision not null,
  route_polyline      text,
  route_geom          geography(LineString,4326),
  departure_date      date not null,
  departure_time      time not null,
  available_seats     integer not null check (available_seats >= 0),
  total_seats         integer not null,
  price_per_seat      numeric(10,2) not null,
  route_description   text,
  detour_allowed      boolean not null default true,
  max_detour_minutes  integer not null default 10,
  smoking_allowed     boolean not null default false,
  pets_allowed        boolean not null default false,
  luggage_allowed     boolean not null default true,
  notes               text,
  status              trip_status not null default 'draft',
  is_recurring        boolean not null default false,
  recurrence          recurrence_type not null default 'none',
  recurrence_config   jsonb,
  parent_trip_id      uuid references trips(id),
  is_promoted         boolean not null default false,
  promotion_priority  integer not null default 0,
  promoted_until      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_trips_route     on trips(start_city_id, end_city_id, departure_date);
create index idx_trips_status    on trips(status);
create index idx_trips_promo     on trips(is_promoted, promotion_priority desc);
create index idx_trips_driver    on trips(driver_id);
create index idx_trips_routegeom on trips using gist(route_geom);

-- ---------- TRIP WAYPOINTS ----------
create table trip_waypoints (
  id          uuid primary key default uuid_generate_v4(),
  trip_id     uuid not null references trips(id) on delete cascade,
  city_id     uuid references cities(id),
  address     text,
  latitude    double precision not null,
  longitude   double precision not null,
  geom        geography(Point,4326),
  order_index integer not null,
  can_pickup  boolean not null default true,
  can_dropoff boolean not null default true
);
create index idx_waypoints_trip on trip_waypoints(trip_id, order_index);

-- ---------- BOOKINGS ----------
create table bookings (
  id                            uuid primary key default uuid_generate_v4(),
  trip_id                       uuid not null references trips(id) on delete cascade,
  passenger_id                  uuid not null references users(id) on delete cascade,
  seats_requested               integer not null default 1 check (seats_requested > 0),
  pickup_address                text,
  pickup_latitude               double precision not null,
  pickup_longitude              double precision not null,
  pickup_geom                   geography(Point,4326),
  pickup_note                   text,
  dropoff_address               text,
  dropoff_latitude              double precision not null,
  dropoff_longitude             double precision not null,
  dropoff_geom                  geography(Point,4326),
  dropoff_note                  text,
  detour_minutes_estimate       numeric(6,2),
  distance_from_route_km        numeric(7,3),
  is_within_driver_detour_limit boolean,
  message                       text,
  luggage_info                  text,
  status                        booking_status not null default 'pending',
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (trip_id, passenger_id)
);
create index idx_bookings_trip   on bookings(trip_id);
create index idx_bookings_pass   on bookings(passenger_id);
create index idx_bookings_status on bookings(status);

-- ---------- MESSAGES ----------
create table messages (
  id           uuid primary key default uuid_generate_v4(),
  trip_id      uuid references trips(id) on delete cascade,
  booking_id   uuid references bookings(id) on delete cascade,
  sender_id    uuid not null references users(id),
  receiver_id  uuid not null references users(id),
  message      text not null,
  message_type message_type not null default 'text',
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index idx_messages_booking on messages(booking_id, created_at);

-- ---------- TRIP LOCATIONS (live tracking) ----------
create table trip_locations (
  id          bigserial primary key,
  trip_id     uuid not null references trips(id) on delete cascade,
  driver_id   uuid not null references users(id),
  latitude    double precision not null,
  longitude   double precision not null,
  speed       double precision,
  heading     double precision,
  recorded_at timestamptz not null default now()
);
create index idx_triploc_trip on trip_locations(trip_id, recorded_at desc);

-- ---------- REVIEWS ----------
create table reviews (
  id               uuid primary key default uuid_generate_v4(),
  trip_id          uuid not null references trips(id) on delete cascade,
  booking_id       uuid references bookings(id) on delete cascade,
  reviewer_id      uuid not null references users(id),
  reviewed_user_id uuid not null references users(id),
  rating           integer not null check (rating between 1 and 5),
  punctuality      integer check (punctuality between 1 and 5),
  driving_safety   integer check (driving_safety between 1 and 5),
  communication    integer check (communication between 1 and 5),
  cleanliness      integer check (cleanliness between 1 and 5),
  behavior         integer check (behavior between 1 and 5),
  comment          text,
  review_type      review_type not null,
  created_at       timestamptz not null default now(),
  unique (booking_id, reviewer_id, review_type)
);

-- ---------- REPORTS ----------
create table reports (
  id                uuid primary key default uuid_generate_v4(),
  reporter_id       uuid not null references users(id),
  reported_user_id  uuid references users(id),
  trip_id           uuid references trips(id),
  booking_id        uuid references bookings(id),
  reason            text not null,
  description       text,
  status            report_status not null default 'open',
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);
create index idx_reports_status on reports(status);

-- ---------- NOTIFICATIONS ----------
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references users(id) on delete cascade,
  title      text not null,
  message    text,
  type       text not null,
  data       jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user on notifications(user_id, is_read, created_at desc);

-- ---------- SUBSCRIPTION PLANS ----------
create table subscription_plans (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null,
  description          text,
  price                numeric(10,2) not null,
  currency             text not null default 'MKD',
  duration_days        integer not null,
  promoted_rides_limit integer not null default 0,
  priority_level       integer not null default 0,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);

-- ---------- DRIVER SUBSCRIPTIONS ----------
create table driver_subscriptions (
  id                   uuid primary key default uuid_generate_v4(),
  driver_id            uuid not null references users(id) on delete cascade,
  plan_id              uuid not null references subscription_plans(id),
  status               sub_status not null default 'active',
  start_date           timestamptz not null default now(),
  end_date             timestamptz not null,
  promoted_rides_used  integer not null default 0,
  promoted_rides_limit integer not null default 0,
  payment_status       pay_status not null default 'unpaid',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_subs_driver on driver_subscriptions(driver_id, status);

-- ---------- TRIP PROMOTIONS ----------
create table trip_promotions (
  id                     uuid primary key default uuid_generate_v4(),
  trip_id                uuid not null references trips(id) on delete cascade,
  driver_id              uuid not null references users(id),
  subscription_id        uuid references driver_subscriptions(id),
  promotion_type         promotion_type not null,
  priority_level         integer not null default 1,
  status                 promotion_status not null default 'active',
  start_date             timestamptz not null default now(),
  end_date               timestamptz not null,
  impressions_count      integer not null default 0,
  clicks_count           integer not null default 0,
  booking_requests_count integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_promo_active on trip_promotions(status, end_date);

-- ---------- ADMIN SETTINGS ----------
create table admin_settings (
  id            uuid primary key default uuid_generate_v4(),
  setting_key   text not null unique,
  setting_value jsonb not null,
  updated_at    timestamptz not null default now()
);
