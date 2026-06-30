# Macedonia Ride

Carpool / ride-sharing платформа за меѓуградско заедничко патување во Македонија.
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (PostgreSQL + Auth + RLS).

Целосната спецификација е во **Macedonia-Ride-Blueprint.md** / **.docx**.

---

## Што е веќе изградено (MVP core slice)

- **База:** целосна schema, тригери и RLS политики во `supabase/migrations/`, seed во `supabase/seed.sql`.
- **Auth:** регистрација/најава (Supabase Auth), огледало во `public.users`, middleware заштита на `/dashboard` и `/admin`.
- **Патник:** преглед, „Најди превоз" (search по рута/датум), детали за патување, **Request to Join** со автоматска detour пресметка, „Мои патувања".
- **Возач:** преглед, додавање возило, креирање патување, барања со **Accept/Reject** (местата се намалуваат автоматски преку DB тригер).
- **Логика:** detour/route-matching (`lib/geo/detour.ts`), search ranking (`lib/ranking/search-ranking.ts`), Zod валидација (`lib/validations/schemas.ts`).

> Сè уште НЕ е изградено (следни чекори): live tracking, chat, reviews, notifications, admin UI, промоции/претплати, мапи (Mapbox). Pickup/dropoff моментално се внесуваат како координати — следно се заменува со избор на мапа.

---

## Поставување (од нула)

### 1. Supabase проект
1. Креирај проект на https://supabase.com.
2. Во **SQL Editor**, изврши ги по редослед:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions_triggers.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/seed.sql`
3. Од **Project Settings → API** земи ги: `URL`, `anon key`, `service_role key`.

> Важно: `public.users.id` мора да е ист како `auth.users.id`. Регистрацијата во апликацијата го прави тоа автоматски (со service-role клиент). Алтернативно, додади тригер на `auth.users` што вметнува ред во `public.users`.

### 2. Околина
Копирај `.env.example` во `.env.local` и пополни:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_MAPBOX_TOKEN=...   # за мапи (следна фаза)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Стартување
```bash
npm install
npm run dev
# отвори http://localhost:3000
```

### 4. Брз тест на текот
1. Регистрирај се како **И патник и возач**.
2. Возач → Возила → додај возило.
3. Возач → Креирај патување (пр. Скопје → Велес, со координати: старт 41.99/21.42, дест 41.71/21.77).
4. Патник → Најди превоз → избери Скопје/Велес → отвори го патувањето → Request to Join.
5. Возач → Барања → Прифати. Местата се намалуваат автоматски.

---

## Структура

```
app/                 страници (App Router) + server actions + route handlers
  page.tsx           landing
  login/ register/   auth
  auth/signout/      signout route
  dashboard/
    passenger/       overview, find, trips, trips/[id]
    driver/          overview, create-trip, requests, vehicles
lib/
  supabase/          client.ts, server.ts, middleware.ts
  geo/detour.ts      detour & route-matching
  ranking/           search ranking (section 21)
  validations/       Zod schemas
middleware.ts        session refresh + route guards
supabase/
  migrations/        0001 schema · 0002 triggers · 0003 RLS
  seed.sql           cities, plans, settings, popular routes
```

---

## Препорачани следни чекори (по приоритет)

1. **Мапи (Mapbox):** замени ги координатните полиња со `LocationPicker` (search + GPS + клик на мапа) и прикажи рута во деталите.
2. **Live tracking:** Supabase Realtime канал `trip:{id}:location`, driver `watchPosition`, passenger `LiveTrackingMap` + ETA.
3. **Chat:** Realtime на `messages` по `booking_id`.
4. **Notifications:** запис во `notifications` на секоја акција + bell.
5. **Reviews + Reports.**
6. **Admin UI** над постоечките табели.
7. **Промоции/претплати** (`trip_promotions`, `driver_subscriptions`) + cron за истекување.

Детали за секоја од овие во `Macedonia-Ride-Blueprint.md`, секции 11–23 и планот по фази (секции 28–30).
