-- FOLIO database schema for Supabase/PostgreSQL
-- Run this file once in Supabase Dashboard -> SQL Editor.
-- This creates application tables only; Supabase Auth is not used by Fase 1.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  phone text,
  location text,
  headline text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  original_filename text not null,
  storage_key text not null,
  mime_type text not null,
  file_size integer not null,
  processing_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  category text not null,
  description text
);

create table if not exists public.job_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text
);

create table if not exists public.cv_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  preview_image text,
  template_config_json jsonb not null,
  is_active boolean not null default true
);

create table if not exists public.job_positions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.job_categories(id),
  title text not null,
  description text not null,
  seniority_level text not null,
  is_active boolean not null default true,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency_level text,
  evidence text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create table if not exists public.job_position_skills (
  id uuid primary key default gen_random_uuid(),
  job_position_id uuid not null references public.job_positions(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  importance_weight double precision not null,
  required_level text,
  is_required boolean not null default false,
  unique (job_position_id, skill_id)
);

create table if not exists public.career_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  career_profile_id uuid,
  status text not null,
  model_metadata_json jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_analysis_id uuid,
  extracted_profile_json jsonb not null,
  user_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.career_analyses
  drop constraint if exists career_analyses_career_profile_id_fkey;
alter table public.career_analyses
  add constraint career_analyses_career_profile_id_fkey
  foreign key (career_profile_id) references public.career_profiles(id) on delete set null;

alter table public.career_profiles
  drop constraint if exists career_profiles_source_analysis_id_fkey;
alter table public.career_profiles
  add constraint career_profiles_source_analysis_id_fkey
  foreign key (source_analysis_id) references public.career_analyses(id) on delete set null;

create table if not exists public.career_recommendations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.career_analyses(id) on delete cascade,
  job_position_id uuid not null references public.job_positions(id),
  match_score double precision not null,
  score_breakdown_json jsonb not null,
  explanation_json jsonb not null,
  rank integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.career_insights (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.career_analyses(id) on delete cascade,
  profile_summary text not null,
  strengths_json jsonb not null,
  improvement_areas_json jsonb not null,
  career_potential_json jsonb not null,
  cv_evaluation_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  career_analysis_id uuid references public.career_analyses(id) on delete set null,
  target_job_position_id uuid not null references public.job_positions(id),
  duration_months integer not null,
  weekly_study_hours integer not null,
  status text not null,
  roadmap_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  title text not null,
  description text not null,
  skill_id uuid references public.skills(id) on delete set null,
  period_number integer not null,
  estimated_hours integer not null,
  expected_outcome text not null,
  status text not null,
  completed_at timestamptz
);

create table if not exists public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  template_id uuid not null references public.cv_templates(id),
  structured_content_json jsonb not null,
  generated_file_key text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  feature_name text not null,
  provider text not null,
  model_name text not null,
  status text not null,
  latency_ms integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_user_id_idx on public.auth_sessions(user_id);
create index if not exists user_profiles_user_id_idx on public.user_profiles(user_id);
create index if not exists uploaded_files_user_id_idx on public.uploaded_files(user_id);
create index if not exists career_profiles_user_id_idx on public.career_profiles(user_id);
create index if not exists job_positions_category_id_idx on public.job_positions(category_id);
create index if not exists career_analyses_user_id_idx on public.career_analyses(user_id);
create index if not exists roadmaps_user_id_idx on public.roadmaps(user_id);
create index if not exists cv_documents_user_id_idx on public.cv_documents(user_id);
create index if not exists ai_generation_logs_user_id_idx on public.ai_generation_logs(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists career_profiles_set_updated_at on public.career_profiles;
create trigger career_profiles_set_updated_at before update on public.career_profiles
for each row execute function public.set_updated_at();

drop trigger if exists job_positions_set_updated_at on public.job_positions;
create trigger job_positions_set_updated_at before update on public.job_positions
for each row execute function public.set_updated_at();

drop trigger if exists roadmaps_set_updated_at on public.roadmaps;
create trigger roadmaps_set_updated_at before update on public.roadmaps
for each row execute function public.set_updated_at();

drop trigger if exists cv_documents_set_updated_at on public.cv_documents;
create trigger cv_documents_set_updated_at before update on public.cv_documents
for each row execute function public.set_updated_at();