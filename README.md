# Macedonia Ride

Carpool / ride-sharing платформа за меѓуградско заедничко патување во Македонија.
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (PostgreSQL + Auth + RLS).

Целосната спецификација е во **Macedonia-Ride-Blueprint.md** / **.docx**.

---

## Што е изградено

- **База:** целосна schema, тригери и RLS политики во `supabase/migrations/`, seed во `supabase/seed.sql`.
- **Auth:** регистрација/најава (Supabase Auth), огледало во `public.users`, middleware заштита на `/dashboard` и `/admin`, враќање на страницата од која дошол корисникот по најава.
- **Јавно пребарување:** `/find-ride` — посетителите прелистуваат превози без профил; се прикажуваат само идни патувања.
- **Мапи:** избор на локација (пребарување адреса, „Моја локација", клик на мапа) за поаѓање/дестинација и качување/слегување; вистинска патна рута (OSRM) се зачувува со патувањето и се користи за пресметка на скршнување.
- **Патник:** преглед, барање со мапа и проценка на скршнување во живо, откажување, разговор со возачот, **следење во живо** со ETA, оценка на возачот.
- **Возач:** „Мои објави", управување со патување (започни / заврши / откажи), прифаќање/одбивање патници, споделување GPS локација во живо, разговор по барање, оценка на патниците.
- **Известувања:** ѕвонче во реално време (ново барање, прифатено/одбиено, нова порака, патувањето тргна/заврши, нова оценка). Ги креираат DB тригери.
- **Оценки:** по завршено патување, двете страни се оценуваат; рејтингот на возачот се пресметува автоматски.
- **Admin UI:** корисници (модерација), патувања, барања, пријави.
- **Логика:** detour/route-matching (`lib/geo/detour.ts`), рути (`lib/geo/routing.ts`), search ranking (`lib/ranking/search-ranking.ts`), Zod валидација (`lib/validations/schemas.ts`).

> Сè уште НЕ е изградено: промоции/претплати (плаќање), пријави од корисници (табелата постои), повторувачки патувања, попатни станици (waypoints).

---

## Поставување (од нула)

### 1. Supabase проект
1. Креирај проект на https://supabase.com.
2. Во **SQL Editor**, изврши ги по редослед:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions_triggers.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_storage.sql`
   - `supabase/migrations/0005_user_status.sql` (пушти го **сам**, види коментар во фајлот)
   - `supabase/migrations/0006_security_fixes.sql` — **задолжително**: затвора RLS дупки (само-унапредување во admin, само-одобрување барања, лажни оценки/промоции)
   - `supabase/migrations/0007_trip_lifecycle_notifications_realtime.sql` — тек на патување, известувања, Realtime
   - `supabase/migrations/0008_popular_routes.sql` — табела за популарни рути со RLS (порано во seed, без заштита)
   - `supabase/migrations/0009_api_grants.sql` — експлицитни дозволи за API; без ова, нов Supabase проект не може да ги чита табелите
   - `supabase/seed.sql`
3. Од **Project Settings → API** земи ги: `URL`, `anon key`, `service_role key`.

> Важно: `public.users.id` мора да е ист како `auth.users.id`. Регистрацијата во апликацијата го прави тоа автоматски (со service-role клиент). Алтернативно, додади тригер на `auth.users` што вметнува ред во `public.users`.

### 2. Околина
Копирај `.env.example` во `.env.local` и пополни:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_MAPBOX_TOKEN=...   # опционално: Mapbox плочки наместо OpenStreetMap
NEXT_PUBLIC_OSRM_URL=...       # опционално: сопствен OSRM сервер за рути
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Мапи без клуч:** стандардно се користат OpenStreetMap плочки, Nominatim (пребарување адреси) и јавниот OSRM демо сервер (рути) — работи веднаш, без API клуч. За продукција со поголем сообраќај: постави `NEXT_PUBLIC_MAPBOX_TOKEN` (плочки) и `NEXT_PUBLIC_OSRM_URL` (сопствен OSRM), бидејќи јавните сервиси имаат ограничувања за употреба. Следењето во живо бара HTTPS (или localhost) за GPS во прелистувачот.

### 3. Стартување
```bash
npm install
npm run dev
# отвори http://localhost:3000
```

### Локален развој без продукциската база (препорачано)
Бара Docker Desktop и [Supabase CLI](https://supabase.com/docs/guides/cli). Сите миграции и `seed.sql` се извршуваат автоматски.
```bash
supabase start -x edge-runtime,imgproxy,vector,logflare,supavisor
supabase status -o env          # копирај API_URL, ANON_KEY и SERVICE_ROLE_KEY во .env.local
node scripts/seed-demo.mjs      # демо профили, возило, патувања и едно барање
```
Демо профилите (само локално) се наведени на врвот на `scripts/seed-demo.mjs`. Скриптата одбива да работи врз база што не е локална. Supabase Studio: http://127.0.0.1:54323.

### 4. Брз тест на текот
Потребни се два профила (возач и патник), двата одобрени од админ.
1. Возач → Возила → додај возило.
2. Возач → Креирај патување → избери Скопје → Велес (пиновите паѓаат во центарот на градот, рутата се пресметува).
3. Патник → Најди превоз → отвори го патувањето → избери качување/слегување на мапата → Испрати барање. Возачот добива известување.
4. Возач → Мои објави → патувањето → Прифати. Местата се намалуваат; патникот добива известување. Пишете си во разговорот.
5. Возач → Започни патување (дозволи локација). Патникот го гледа возилото во живо со ETA.
6. Возач → Заврши патување. Двете страни можат да се оценат.

---

## Структура

```
app/                   страници (App Router)
  page.tsx             landing
  find-ride/           јавно пребарување · offer-ride/ → креирај патување
  login/ register/     auth
  dashboard/
    passenger/         overview, find, trips, trips/[id] (барање, разговор, следење, оценка), profile
    driver/            overview, trips, trips/[id] (управување), create-trip, requests, vehicles
  admin/               модерација
components/
  map/                 MapView (Leaflet), LocationPicker, TripRouteFields, BookingFields
  realtime/            NotificationBell, Chat, LiveTracking, DriverBroadcaster
  reviews/             ReviewForm, ReviewList
lib/
  actions/             server actions: bookings, trips, reviews
  supabase/            client.ts, server.ts, middleware.ts
  geo/                 detour, polyline, routing (OSRM), geocode (Nominatim)
  ranking/             search ranking (section 21)
  validations/         Zod schemas
middleware.ts          session refresh + route guards
supabase/
  migrations/          0001 schema · 0002 triggers · 0003 RLS · 0004 storage · 0005 status
                       0006 security fixes · 0007 lifecycle, notifications, realtime
  seed.sql             cities, plans, settings, popular routes
```

---

## Препорачани следни чекори

1. **Next.js 15/16:** 14.2.35 го поправа заобиколувањето на middleware, но дел од безбедносните поправки на Next постојат само во 15+.
2. **Промоции/претплати** (`trip_promotions`, `driver_subscriptions`) со плаќање на серверот + cron за истекување. Директно запишување од возачите е намерно оневозможено (0006).
3. **Пријави од корисници** (табелата `reports` и admin екранот веќе постојат).
4. **Повторно барање** по откажување (сега `unique (trip_id, passenger_id)` дозволува едно барање по патување).
5. **Попатни станици и повторувачки патувања** (`trip_waypoints`, `recurrence`).

Детали во `Macedonia-Ride-Blueprint.md`, секции 11–23 и планот по фази (секции 28–30).
