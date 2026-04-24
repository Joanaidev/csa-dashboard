-- Clients table
create table if not exists clients (
  id text primary key,
  name text not null,
  owner text,
  owner_email text,
  arr numeric default 0,
  status text default 'in_progress',
  last_contact date,
  threshold integer default 14,
  slack_channel text,
  in_support boolean default false,
  lifecycle text default 'onboarding',
  canton boolean default false,
  churned boolean default false,
  churn_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable realtime
alter publication supabase_realtime add table clients;

-- Allow all operations (no auth required - internal tool)
alter table clients enable row level security;
create policy "allow all" on clients for all using (true) with check (true);
