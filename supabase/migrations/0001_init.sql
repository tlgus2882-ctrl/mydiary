-- R6, R7, R12, R13: 스키마, RLS, 사용량 함수

-- ── 테이블 ──
create table diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date date not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'drafted', 'saved')),
  title text not null default '',
  body text not null default '',
  theme_id text,
  font_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table diary_messages (
  id bigint generated always as identity primary key,
  diary_id uuid not null references diaries on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  seq int not null,
  created_at timestamptz not null default now(),
  unique (diary_id, seq)
);
create index on diary_messages (user_id);

create table profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  last_theme_id text,
  last_font_id text
);

create table usage_counters (
  user_id uuid references auth.users on delete cascade,
  day date,
  calls int not null default 0,
  primary key (user_id, day)
);

-- ── updated_at ──
create function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger diaries_updated_at before update on diaries
  for each row execute function set_updated_at();

-- ── 권한: anon은 아무것도 못 한다. usage_counters는 클라이언트 접근 불가 ──
revoke all on diaries, diary_messages, profiles, usage_counters from anon;
revoke all on usage_counters from authenticated;

-- consume_quota (R13): 허용이면 오늘(UTC) 카운트를 1 올리고 ok, 아니면 올리지 않고 user_limit 또는 global_limit.
-- question은 초안 1회를 남겨 두려고 사용자 한도를 p_per_user - 1로 본다.
-- 서버(service_role) 전용: 클라이언트가 한도를 직접 넘겨 전체 예산을 소진하지 못하게 한다.
-- 전역 합계 검사까지 상수 키 advisory lock(트랜잭션 끝에 해제)으로 직렬화한다.

-- ── RLS (R7) ──
alter table diaries enable row level security;
alter table diary_messages enable row level security;
alter table profiles enable row level security;
alter table usage_counters enable row level security; -- 정책 없음

create policy diaries_own on diaries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy profiles_own on profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- insert/update 시 부모 일기도 본인 것이어야 한다
create policy diary_messages_own on diary_messages for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from diaries d where d.id = diary_id and d.user_id = (select auth.uid()))
  );

create function consume_quota(p_user_id uuid, p_kind text, p_per_user int, p_global int) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_limit int := case when p_kind = 'question' then p_per_user - 1 else p_per_user end;
  v_used int;
  v_total int;
begin
  if p_user_id is null then
    raise exception 'consume_quota: user id required';
  end if;
  if p_kind is null or p_kind not in ('question', 'draft') then
    raise exception 'consume_quota: invalid kind %', p_kind;
  end if;

  perform pg_advisory_xact_lock(hashtext('consume_quota'));

  select coalesce(sum(calls), 0) into v_total from usage_counters where day = v_day;
  select coalesce(max(calls), 0) into v_used from usage_counters where user_id = p_user_id and day = v_day;

  if v_used >= v_limit then
    return 'user_limit';
  end if;
  if v_total >= p_global then
    return 'global_limit';
  end if;

  insert into usage_counters (user_id, day, calls) values (p_user_id, v_day, 1)
  on conflict (user_id, day) do update set calls = usage_counters.calls + 1;
  return 'ok';
end $$;

revoke execute on function consume_quota(uuid, text, int, int) from public, anon, authenticated;
grant execute on function consume_quota(uuid, text, int, int) to service_role;
