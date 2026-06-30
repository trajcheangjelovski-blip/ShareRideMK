-- =====================================================================
-- Macedonia Ride — 0004_storage.sql
-- Public bucket за профилни слики (портрети). Run AFTER 0003.
-- =====================================================================

-- Bucket за профилни слики (јавно читлив за прикажување).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Качувањето се прави преку server action со service-role клиент
-- (го заобиколува RLS), па не се потребни upload политики за корисници.
-- Јавно читање е автоматско бидејќи bucket-от е public.

-- Опционо: ако сакаш корисниците да качуваат директно од клиент,
-- отстрани го коментарот од политиките подолу:
--
-- create policy "avatars_public_read" on storage.objects for select
--   using (bucket_id = 'avatars');
-- create policy "avatars_user_upload" on storage.objects for insert
--   with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "avatars_user_update" on storage.objects for update
--   using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
