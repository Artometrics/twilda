-- Twilda 007 — onboarding persistence on profiles
-- Idempotent. Run after 001_initial_schema.sql.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.profiles.onboarding_completed is
  'True after the user dismisses the /novels/ welcome modal (or completes first-run onboarding).';
