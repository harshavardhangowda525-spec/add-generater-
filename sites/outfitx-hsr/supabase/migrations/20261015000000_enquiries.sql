-- OUTFIT X HSR — membership enquiries
-- Public visitors (anon role) may INSERT an enquiry and nothing else.
-- Only signed-in users listed in public.enquiry_staff may read or update them.

create extension if not exists pgcrypto;

create table if not exists public.enquiries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  full_name       text not null check (char_length(btrim(full_name)) between 2 and 100),
  phone           text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  email           text check (email is null or (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')),
  fitness_goal    text not null check (fitness_goal in ('strength','general','coaching','mobility','membership','other')),
  experience      text check (experience is null or experience in ('new','some','experienced')),
  contact_method  text not null check (contact_method in ('phone','whatsapp','email')),
  message         text check (message is null or char_length(message) <= 1000),
  consent         boolean not null check (consent = true),
  source_page     text check (source_page is null or char_length(source_page) <= 200),
  status          text not null default 'new' check (status in ('new','contacted','closed')),
  check (contact_method <> 'email' or email is not null)
);

create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
create index if not exists enquiries_phone_created_idx on public.enquiries (phone, created_at desc);

-- Staff allowed to read enquiries (add rows with the user's auth id).
create table if not exists public.enquiry_staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.enquiries enable row level security;
alter table public.enquiry_staff enable row level security;

-- Privileges: anon can insert only the visitor-supplied columns.
revoke all on public.enquiries from anon, authenticated;
revoke all on public.enquiry_staff from anon, authenticated;
grant insert (full_name, phone, email, fitness_goal, experience, contact_method, message, consent, source_page)
  on public.enquiries to anon;
grant select, update (status) on public.enquiries to authenticated;
grant select on public.enquiry_staff to authenticated;

create policy "Visitors can submit enquiries"
  on public.enquiries for insert to anon
  with check (consent = true and status = 'new');

create or replace function public.is_enquiry_staff() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.enquiry_staff where user_id = auth.uid()) $$;

create policy "Staff can read enquiries"
  on public.enquiries for select to authenticated
  using (public.is_enquiry_staff());

create policy "Staff can update enquiry status"
  on public.enquiries for update to authenticated
  using (public.is_enquiry_staff()) with check (public.is_enquiry_staff());

create policy "Staff can see the staff list"
  on public.enquiry_staff for select to authenticated
  using (public.is_enquiry_staff());

-- Basic abuse guard: at most 3 enquiries per phone number per hour.
create or replace function public.limit_enquiry_rate() returns trigger
  language plpgsql security definer set search_path = public
  as $$
begin
  if (select count(*) from public.enquiries
        where phone = new.phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many enquiries from this number. Please try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists enquiries_rate_limit on public.enquiries;
create trigger enquiries_rate_limit before insert on public.enquiries
  for each row execute function public.limit_enquiry_rate();
