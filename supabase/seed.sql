-- =====================================================================
-- Macedonia Ride — seed.sql
-- Cities (with coordinates), subscription plans, default admin settings.
-- Run AFTER migrations. geom is auto-filled by the sync_point_geom trigger.
-- =====================================================================

-- ---------- CITIES ----------
insert into cities (name, latitude, longitude) values
  ('Скопје',        41.9981, 21.4254),
  ('Велес',         41.7172, 21.7758),
  ('Куманово',      42.1322, 21.7144),
  ('Тетово',        42.0106, 20.9714),
  ('Гостивар',      41.7967, 20.9089),
  ('Охрид',         41.1231, 20.8016),
  ('Битола',        41.0297, 21.3292),
  ('Прилеп',        41.3464, 21.5550),
  ('Штип',          41.7459, 22.1958),
  ('Кочани',        41.9167, 22.4122),
  ('Струмица',      41.4378, 22.6433),
  ('Кавадарци',     41.4331, 22.0117),
  ('Неготино',      41.4828, 22.0894),
  ('Гевгелија',     41.1417, 22.5025),
  ('Струга',        41.1775, 20.6781),
  ('Ресен',         41.0894, 21.0117),
  ('Кичево',        41.5142, 20.9631),
  ('Дебар',         41.5247, 20.5275),
  ('Радовиш',       41.6383, 22.4642),
  ('Свети Николе',  41.8669, 21.9436),
  ('Делчево',       41.9678, 22.7747),
  ('Берово',        41.7072, 22.8569)
on conflict (name) do nothing;

-- ---------- SUBSCRIPTION PLANS ----------
insert into subscription_plans
  (name, description, price, currency, duration_days, promoted_rides_limit, priority_level, is_active)
values
  ('Free',            'Бесплатно објавување, стандардно сортирање, основна статистика.',
                       0,    'MKD', 36500, 0,  0, true),
  ('Basic Promotion', 'Месечна претплата, ограничен број промовирани патувања, „Promoted“ badge.',
                       299,  'MKD', 30,    10, 1, true),
  ('Premium Driver',  'Повеќе промовирани патувања, Premium badge, напредна статистика, featured профил.',
                       599,  'MKD', 30,    40, 2, true)
on conflict do nothing;

-- ---------- DEFAULT ADMIN SETTINGS ----------
insert into admin_settings (setting_key, setting_value) values
  ('platform_fee',         '{"type":"flat","amount":0,"currency":"MKD"}'),
  ('service_fee_passenger','{"type":"flat","amount":0,"currency":"MKD"}'),
  ('cancellation_rules',   '{"free_cancel_hours":2,"no_show_penalty":true}'),
  ('verification_rules',   '{"require_email":true,"require_phone":true,"require_id":false}'),
  ('promotion_rules',      '{"route_match_required":true,"max_promoted_per_search":3}'),
  ('default_max_detour',   '{"minutes":10}')
on conflict (setting_key) do nothing;

-- ---------- POPULAR ROUTES (for featured / SEO) ----------
-- Stored as a lightweight reference table (not in core schema).
create table if not exists popular_routes (
  id            uuid primary key default uuid_generate_v4(),
  start_city_id uuid not null references cities(id),
  end_city_id   uuid not null references cities(id),
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  unique (start_city_id, end_city_id)
);

insert into popular_routes (start_city_id, end_city_id, is_featured, sort_order)
select s.id, e.id, true, r.ord
from (values
  ('Скопје','Велес',1),     ('Велес','Скопје',2),
  ('Скопје','Битола',3),    ('Битола','Скопје',4),
  ('Скопје','Охрид',5),     ('Охрид','Скопје',6),
  ('Скопје','Куманово',7),  ('Куманово','Скопје',8),
  ('Скопје','Тетово',9),    ('Тетово','Скопје',10),
  ('Скопје','Штип',11),     ('Штип','Скопје',12),
  ('Скопје','Прилеп',13),   ('Прилеп','Скопје',14),
  ('Скопје','Гевгелија',15),('Гевгелија','Скопје',16),
  ('Скопје','Струмица',17), ('Струмица','Скопје',18),
  ('Битола','Охрид',19),    ('Охрид','Битола',20),
  ('Велес','Штип',21),      ('Кавадарци','Скопје',22)
) as r(start_name, end_name, ord)
join cities s on s.name = r.start_name
join cities e on e.name = r.end_name
on conflict do nothing;
