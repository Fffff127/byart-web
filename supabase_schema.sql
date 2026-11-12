-- Supabase schema for By-ART web (accounts, orders, slip uploads)
-- Run in Supabase SQL editor. Adjust policies for your needs.

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now()
);

-- Orders / payments (slip attached)
create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  plan_label text not null,
  days int default 0,
  permanent boolean default false,
  amount_thb int not null,
  status text not null default 'pending_review', -- pending_review | paid | rejected
  slip_path text, -- storage path in bucket 'slips'
  note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewer_note text
);

-- Entitlements (current access per user)
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  permanent boolean default false,
  plan_until timestamptz,
  plan_label text,
  credits int default 0,
  updated_at timestamptz default now()
);

-- Storage: create a bucket named 'slips' (private) in Supabase Storage dashboard.

-- Basic RLS (enable and tailor)
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;

create policy "profiles self" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "orders self read/insert" on public.orders for select using (auth.uid() = user_id);
create policy "orders self insert" on public.orders for insert with check (auth.uid() = user_id);
create policy "entitlements self read" on public.entitlements for select using (auth.uid() = user_id);

-- Admin policies: create a secure admin role/claim or use service key in a trusted backend (Edge Function/server) to
-- read/update all orders and entitlements. Do NOT expose service key in frontend.
-- Example (if using custom claim is_admin):
-- create policy "admin orders" on public.orders for all using ((auth.jwt() ->> 'is_admin')::boolean = true);
-- create policy "admin entitlements" on public.entitlements for all using ((auth.jwt() ->> 'is_admin')::boolean = true);