
-- 1) Create FASTag verifications table (mirrors rc_verifications)
create table if not exists public.fastag_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  vehicle_number text not null,
  status text not null default 'pending',
  error_message text,
  verification_data jsonb,
  is_cached boolean default false,
  api_cost_saved boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.fastag_verifications enable row level security;

-- RLS policies (same pattern as rc_verifications)
create policy "Users can create their own FASTag verifications"
  on public.fastag_verifications
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own FASTag verifications"
  on public.fastag_verifications
  for update
  using (auth.uid() = user_id);

create policy "Users can view their own FASTag verifications"
  on public.fastag_verifications
  for select
  using (auth.uid() = user_id);

-- Optional: No delete policy (keeps logs immutable by default)

-- Keep updated_at fresh
create trigger set_fastag_verifications_updated_at
  before update on public.fastag_verifications
  for each row execute function public.update_updated_at_column();

-- Helpful index for recent lookups and audits
create index if not exists fastag_verifications_user_vehicle_created_idx
  on public.fastag_verifications (user_id, vehicle_number, created_at desc);

-- 2) Add last-synced timestamp to vehicles for 24h TTL caching
alter table public.vehicles
  add column if not exists fasttag_last_synced_at timestamptz;

