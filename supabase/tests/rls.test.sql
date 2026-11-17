-- R6, R7, R12, R13: 사용자 분리(RLS), 하루 1편, 탈퇴 cascade, 사용량 상한
begin;
create extension if not exists pgtap with schema extensions;
select plan(47);

-- A = aaaaaaaa-..., B = bbbbbbbb-...
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local');

-- ── A가 자기 데이터를 만든다 ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$insert into diaries (id, entry_date, title, body)
    values ('11111111-1111-1111-1111-111111111111', '2026-11-17', 'A title', 'A body')$$,
  'A can insert own diary');
select lives_ok(
  $$insert into diary_messages (diary_id, role, content, seq)
    values ('11111111-1111-1111-1111-111111111111', 'assistant', 'A message', 1)$$,
  'A can insert message into own diary');
select lives_ok(
  $$insert into profiles (last_theme_id) values ('A theme')$$,
  'A can insert own profile');
select is((select user_id from diaries where id = '11111111-1111-1111-1111-111111111111'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'diaries.user_id defaults to auth.uid()');
select is((select count(*)::int from diaries), 1, 'A sees own diary');
select is((select count(*)::int from diary_messages), 1, 'A sees own message');

-- R6: 같은 날짜 두 번째 일기 불가
select throws_ok(
  $$insert into diaries (entry_date) values ('2026-11-17')$$,
  '23505', null, 'A cannot insert a second diary for the same entry_date');

-- ── B(공격자)가 A의 데이터에 접근 ──
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is_empty('select * from diaries', 'B cannot select A diary');
select is_empty('select * from diary_messages', 'B cannot select A messages');
select is_empty('select * from profiles', 'B cannot select A profile');

update diaries set title = 'hacked', body = 'hacked' where id = '11111111-1111-1111-1111-111111111111';
delete from diaries where id = '11111111-1111-1111-1111-111111111111';
update diary_messages set content = 'hacked' where diary_id = '11111111-1111-1111-1111-111111111111';
delete from diary_messages where diary_id = '11111111-1111-1111-1111-111111111111';
update profiles set last_theme_id = 'hacked' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select throws_ok(
  $$insert into diaries (user_id, entry_date)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-11-18')$$,
  '42501', null, 'B cannot insert diary with user_id = A');
select throws_ok(
  $$insert into diary_messages (diary_id, role, content, seq)
    values ('11111111-1111-1111-1111-111111111111', 'user', 'injected', 2)$$,
  '42501', null, 'B cannot insert message into A diary');
select throws_ok(
  $$insert into diary_messages (diary_id, user_id, role, content, seq)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user', 'injected', 2)$$,
  '42501', null, 'B cannot insert message into A diary as user_id = A');
select throws_ok(
  $$insert into profiles (user_id, last_theme_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hacked')$$,
  '42501', null, 'B cannot insert profile with user_id = A');

-- B 자기 데이터를 A 쪽으로 옮기기
select lives_ok(
  $$insert into diaries (id, entry_date)
    values ('22222222-2222-2222-2222-222222222222', '2026-11-17')$$,
  'B can insert own diary on the same date as A');
select lives_ok(
  $$insert into diary_messages (diary_id, role, content, seq)
    values ('22222222-2222-2222-2222-222222222222', 'assistant', 'B message', 1)$$,
  'B can insert message into own diary');
select throws_ok(
  $$update diaries set user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'B cannot hand own diary to A');
select throws_ok(
  $$update diary_messages set diary_id = '11111111-1111-1111-1111-111111111111'
    where diary_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'B cannot move own message into A diary');

-- usage_counters: 클라이언트 접근 불가
select throws_ok('select * from usage_counters', '42501', null, 'authenticated cannot select usage_counters');
select throws_ok(
  $$insert into usage_counters (user_id, day, calls)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', current_date, -100)$$,
  '42501', null, 'authenticated cannot insert usage_counters');
select throws_ok('update usage_counters set calls = 0', '42501', null, 'authenticated cannot update usage_counters');
select throws_ok('delete from usage_counters', '42501', null, 'authenticated cannot delete usage_counters');

-- B의 update/delete가 A 데이터에 영향 0행이었는지 postgres로 확인
reset role;
select is((select title || '|' || body from diaries where id = '11111111-1111-1111-1111-111111111111'),
  'A title|A body', 'A diary unchanged after B update/delete');
select is((select content from diary_messages where diary_id = '11111111-1111-1111-1111-111111111111'),
  'A message', 'A message unchanged after B update/delete');
select is((select last_theme_id from profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'A theme', 'A profile unchanged after B update/delete');
select is((select user_id from diaries where id = '22222222-2222-2222-2222-222222222222'),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B diary still owned by B');

-- ── anon: 아무것도 못 한다 ──
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from diaries', '42501', null, 'anon cannot select diaries');
select throws_ok('select * from diary_messages', '42501', null, 'anon cannot select diary_messages');
select throws_ok('select * from profiles', '42501', null, 'anon cannot select profiles');
select throws_ok($$select consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'draft', 3, 100)$$, '42501', null, 'anon cannot execute consume_quota');

-- ── consume_quota (R13): 서버(service_role) 전용 ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select throws_ok($$select consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'draft', 3, 100)$$, '42501', null, 'authenticated cannot execute consume_quota');

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select throws_ok($$select consume_quota(null, 'draft', 3, 100)$$, 'P0001', null, 'consume_quota rejects null user id');
select throws_ok($$select consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'other', 3, 100)$$, 'P0001', null, 'consume_quota rejects unknown kind');
select is(consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'question', 3, 100), 'ok', 'question 1 -> ok');
select is(consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'question', 3, 100), 'ok', 'question 2 -> ok');
select is(consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'question', 3, 100), 'user_limit', 'question 3 -> user_limit (1 reserved for draft)');
select is(consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'draft', 3, 100), 'ok', 'draft uses the reserved call -> ok');
select is(consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'draft', 3, 100), 'user_limit', 'draft beyond limit -> user_limit');

reset role;
select is((select calls from usage_counters where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  3, 'refused calls do not increment the counter');

-- 전체 한도: 앞 단계 카운트를 지우고 깨끗하게 시작
delete from usage_counters;
set local role service_role;
select is(consume_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'draft', 100, 1), 'ok', 'global: A first call -> ok');
select is(consume_quota('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'draft', 100, 1), 'global_limit', 'global: B next call -> global_limit');

reset role;
select is((select count(*)::int from usage_counters where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and calls > 0),
  0, 'global_limit refusal does not increment B');

-- ── updated_at 트리거: now()는 트랜잭션 안에서 고정이라 트리거를 끄고 과거 값으로 돌려 둔 뒤 확인 ──
set local session_replication_role = replica;
update diaries set updated_at = '2000-01-01' where id = '11111111-1111-1111-1111-111111111111';
set local session_replication_role = origin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
update diaries set title = 'A title 2' where id = '11111111-1111-1111-1111-111111111111';
reset role;
select is((select updated_at from diaries where id = '11111111-1111-1111-1111-111111111111'),
  now(), 'updating a diary bumps updated_at');

-- ── 탈퇴 cascade (R12) ──
delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is_empty($$select 1 from diaries where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'A diaries deleted');
select is_empty($$select 1 from diary_messages where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'A messages deleted');
select is_empty($$select 1 from profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'A profile deleted');
select is_empty($$select 1 from usage_counters where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'A usage_counters deleted');

select * from finish();
rollback;
