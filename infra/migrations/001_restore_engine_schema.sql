create extension if not exists pgcrypto;

create table if not exists restore_jobs (
  id uuid primary key default gen_random_uuid(),
  nexus_tenant_id uuid not null,
  nexus_company_id uuid,
  nexus_user_id uuid not null,
  mode text not null,
  source_type text not null,
  source_system text,
  status text not null default 'created',
  current_step text,
  progress_percent integer default 0,
  file_name text,
  file_size bigint,
  detected_format text,
  detected_modules jsonb default '[]'::jsonb,
  restore_options jsonb default '{}'::jsonb,
  summary_json jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists restore_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references restore_jobs(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text,
  file_size bigint,
  checksum text,
  scan_status text default 'pending',
  uploaded_by uuid not null,
  created_at timestamptz default now()
);

create table if not exists restore_extracted_modules (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references restore_jobs(id) on delete cascade,
  module_key text not null,
  display_name text not null,
  record_count integer default 0,
  status text default 'extracted',
  summary_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists restore_extracted_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references restore_jobs(id) on delete cascade,
  module_key text not null,
  row_number integer,
  source_id text,
  raw_json jsonb not null,
  normalized_json jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists restore_validation_errors (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references restore_jobs(id) on delete cascade,
  row_id uuid references restore_extracted_rows(id),
  module_key text,
  severity text not null check (severity in ('warning', 'error')),
  code text not null,
  message text not null,
  field_name text,
  suggested_fix text,
  created_at timestamptz default now()
);

create table if not exists restore_plans (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references restore_jobs(id) on delete cascade,
  target_company_id uuid,
  restore_mode text not null,
  selected_modules jsonb not null default '[]'::jsonb,
  conflict_strategy text not null default 'safe_merge',
  dry_run_status text default 'pending',
  total_actions integer default 0,
  risk_level text default 'low',
  summary_json jsonb default '{}'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists restore_created_records (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references restore_jobs(id) on delete cascade,
  nexus_table text not null,
  nexus_record_id uuid not null,
  source_module text,
  source_id text,
  action text not null,
  can_rollback boolean default true,
  rollback_block_reason text,
  created_at timestamptz default now()
);

create table if not exists restore_support_cases (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references restore_jobs(id) on delete set null,
  nexus_tenant_id uuid not null,
  nexus_company_id uuid,
  source_system text,
  file_name text,
  file_path text,
  status text not null default 'awaiting_review',
  priority text default 'normal',
  customer_note text,
  admin_note text,
  assigned_to uuid,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists restore_audit_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references restore_jobs(id) on delete set null,
  nexus_tenant_id uuid,
  nexus_company_id uuid,
  actor_user_id uuid,
  actor_role text,
  action text not null,
  message text,
  meta_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
