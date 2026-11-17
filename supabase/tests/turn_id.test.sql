-- RF2: 같은 일기에 같은 client_turn_id는 한 번만 저장된다 (assistant 메시지는 NULL이라 여러 개 허용)
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.local');
insert into diaries (id, user_id, entry_date)
  values ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-11-17');

insert into diary_messages (diary_id, user_id, role, content, seq, client_turn_id)
  values ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'user', '답', 1, 'turn-1');

select throws_ok(
  $$insert into diary_messages (diary_id, user_id, role, content, seq, client_turn_id)
    values ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'user', '답', 2, 'turn-1')$$,
  '23505', null, 'same (diary_id, client_turn_id) twice is a unique violation');

select lives_ok(
  $$insert into diary_messages (diary_id, user_id, role, content, seq)
    values ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'assistant', '질문1', 3),
           ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'assistant', '질문2', 4)$$,
  'two NULL client_turn_ids are allowed');

select is((select count(*)::int from diary_messages where client_turn_id = 'turn-1'), 1, 'only one row for turn-1');

select * from finish();
rollback;
