-- =====================================================================
-- Macedonia Ride — 0009_api_grants.sql
-- Run AFTER 0008. Newer Supabase projects no longer grant the Data API roles
-- access to new tables by default, so on a fresh project the app could not
-- read or write anything. Grant explicitly; RLS (0003/0006/0008) still
-- decides which rows each user can touch. Idempotent on older projects.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- The blanket grants above also cover views and helper functions; restore
-- the deliberate exceptions.
revoke insert, update, delete on public_profiles from anon, authenticated, service_role;
revoke execute on function push_notification(uuid, text, text, text, jsonb) from public, anon, authenticated;
