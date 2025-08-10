-- Enable required extension for gen_random_uuid (Supabase usually has this enabled)
create extension if not exists pgcrypto;

-- 1) Audit table for denied attempts (used by server fallback too)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  route text,
  method text,
  status int,
  reason text,
  payload jsonb,
  at timestamptz not null default now()
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_reason_idx on public.audit_log (reason);
create index if not exists audit_log_route_idx on public.audit_log (route);

-- 2) Employees RLS: per-command with ai_agent lockout for writes
alter table public.employees enable row level security;

-- Drop broad policies if any (safe to run; ignore errors if absent)
do $$ begin
  begin execute 'drop policy employees_all on public.employees'; exception when others then null; end;
  begin execute 'drop policy employees_select on public.employees'; exception when others then null; end;
  begin execute 'drop policy employees_insert on public.employees'; exception when others then null; end;
  begin execute 'drop policy employees_update on public.employees'; exception when others then null; end;
  begin execute 'drop policy employees_delete on public.employees'; exception when others then null; end;
end $$;

-- SELECT: manager-scoped
create policy employees_select
  on public.employees
  for select
  using (manager_id = auth.uid());

-- INSERT: manager match and NOT ai_agent
create policy employees_insert
  on public.employees
  for insert
  with check (
    manager_id = auth.uid()
    and coalesce((auth.jwt() ->> 'ai_agent')::text, 'false') <> 'true'
  );

-- UPDATE: manager match and NOT ai_agent
create policy employees_update
  on public.employees
  for update
  using (manager_id = auth.uid())
  with check (
    manager_id = auth.uid()
    and coalesce((auth.jwt() ->> 'ai_agent')::text, 'false') <> 'true'
  );

-- DELETE: manager match and NOT ai_agent
create policy employees_delete
  on public.employees
  for delete
  using (
    manager_id = auth.uid()
    and coalesce((auth.jwt() ->> 'ai_agent')::text, 'false') <> 'true'
  );

-- 3) Employee shifts RLS
alter table public.employee_shifts enable row level security;

do $$ begin
  begin execute 'drop policy employee_shifts_all on public.employee_shifts'; exception when others then null; end;
  begin execute 'drop policy employee_shifts_select on public.employee_shifts'; exception when others then null; end;
  begin execute 'drop policy employee_shifts_insert on public.employee_shifts'; exception when others then null; end;
  begin execute 'drop policy employee_shifts_update on public.employee_shifts'; exception when others then null; end;
  begin execute 'drop policy employee_shifts_delete on public.employee_shifts'; exception when others then null; end;
end $$;

create policy employee_shifts_select
  on public.employee_shifts
  for select
  using (manager_id = auth.uid());

create policy employee_shifts_insert
  on public.employee_shifts
  for insert
  with check (
    manager_id = auth.uid()
    and coalesce((auth.jwt() ->> 'ai_agent')::text, 'false') <> 'true'
  );

create policy employee_shifts_update
  on public.employee_shifts
  for update
  using (manager_id = auth.uid())
  with check (
    manager_id = auth.uid()
    and coalesce((auth.jwt() ->> 'ai_agent')::text, 'false') <> 'true'
  );

create policy employee_shifts_delete
  on public.employee_shifts
  for delete
  using (
    manager_id = auth.uid()
    and coalesce((auth.jwt() ->> 'ai_agent')::text, 'false') <> 'true'
  );

-- Optional: If you want to hide reads for the agent entirely (block GET)
-- then you can further restrict SELECT with an additional check:
--   and coalesce((auth.jwt() ->> 'ai_agent')::text, 'false') <> 'true'
-- That mirrors the optional middleware block controlled by AGENT_BLOCK_READS.


