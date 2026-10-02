create function public.prayer_schedule_is_valid(
  schedule_type text,
  scheduled_days jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when schedule_type is null then scheduled_days is null
    when schedule_type = 'daily' then scheduled_days is null
    when schedule_type in ('weekly', 'selectedDays') then
      jsonb_typeof(scheduled_days) = 'array'
      and scheduled_days <@ '["sun", "mon", "tue", "wed", "thu", "fri", "sat"]'::jsonb
      and case
        when schedule_type = 'weekly' then jsonb_array_length(scheduled_days) = 1
        else jsonb_array_length(scheduled_days) between 2 and 7
      end
      and (
        select count(*) = count(distinct day.value)
        from jsonb_array_elements_text(scheduled_days) as day(value)
      )
    else false
  end;
$$;

create table public.categories (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (id, user_id),
  check (updated_at >= created_at)
);

create table public.prayer_requests (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  title text not null check (length(btrim(title)) > 0),
  details text,
  schedule_type text check (
    schedule_type is null or schedule_type in ('daily', 'weekly', 'selectedDays')
  ),
  scheduled_days jsonb,
  status text not null check (status in ('active', 'archived', 'answered')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on update restrict
    on delete restrict,
  unique (id, user_id),
  check (public.prayer_schedule_is_valid(schedule_type, scheduled_days)),
  check (updated_at >= created_at)
);

create table public.answer_records (
  id uuid primary key,
  prayer_request_id uuid not null unique
    references public.prayer_requests (id)
    on update restrict
    on delete cascade,
  answered_on date not null,
  description text not null check (length(btrim(description)) > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  check (updated_at >= created_at)
);

create index categories_owner_updated_idx
  on public.categories (user_id, updated_at desc, id);
create index prayer_requests_owner_updated_idx
  on public.prayer_requests (user_id, updated_at desc, id);
create index answer_records_answered_on_idx
  on public.answer_records (answered_on desc, prayer_request_id);

alter table public.categories enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.answer_records enable row level security;

create policy "categories_select_own"
  on public.categories for select
  to authenticated
  using (user_id = (select auth.uid()));
create policy "categories_insert_own"
  on public.categories for insert
  to authenticated
  with check (user_id = (select auth.uid()));
create policy "categories_update_own"
  on public.categories for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "prayer_requests_select_own"
  on public.prayer_requests for select
  to authenticated
  using (user_id = (select auth.uid()));
create policy "prayer_requests_insert_own"
  on public.prayer_requests for insert
  to authenticated
  with check (user_id = (select auth.uid()));
create policy "prayer_requests_update_own"
  on public.prayer_requests for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "answer_records_select_own"
  on public.answer_records for select
  to authenticated
  using (
    exists (
      select 1
      from public.prayer_requests
      where prayer_requests.id = answer_records.prayer_request_id
        and prayer_requests.user_id = (select auth.uid())
    )
  );
create policy "answer_records_insert_own"
  on public.answer_records for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.prayer_requests
      where prayer_requests.id = answer_records.prayer_request_id
        and prayer_requests.user_id = (select auth.uid())
    )
  );
create policy "answer_records_update_own"
  on public.answer_records for update
  to authenticated
  using (
    exists (
      select 1
      from public.prayer_requests
      where prayer_requests.id = answer_records.prayer_request_id
        and prayer_requests.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.prayer_requests
      where prayer_requests.id = answer_records.prayer_request_id
        and prayer_requests.user_id = (select auth.uid())
    )
  );

revoke all on public.categories, public.prayer_requests, public.answer_records from anon;
grant select, insert, update on public.categories, public.prayer_requests, public.answer_records
  to authenticated;
revoke all on function public.prayer_schedule_is_valid(text, jsonb) from public;
grant execute on function public.prayer_schedule_is_valid(text, jsonb) to authenticated;
