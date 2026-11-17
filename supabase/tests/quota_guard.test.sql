-- R13: 한도 값이 비었거나 잘못되면 consume_quota는 열리지 않고(fail closed) 예외를 낸다
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local');

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select throws_ok($$select consume_quota('cccccccc-cccc-cccc-cccc-cccccccccccc', 'draft', null, 100)$$,
  'P0001', null, 'null p_per_user is rejected');
select throws_ok($$select consume_quota('cccccccc-cccc-cccc-cccc-cccccccccccc', 'draft', 3, null)$$,
  'P0001', null, 'null p_global is rejected');
select throws_ok($$select consume_quota('cccccccc-cccc-cccc-cccc-cccccccccccc', 'draft', 0, 100)$$,
  'P0001', null, 'p_per_user 0 is rejected');
select throws_ok($$select consume_quota('cccccccc-cccc-cccc-cccc-cccccccccccc', 'draft', 3, -1)$$,
  'P0001', null, 'negative p_global is rejected');

reset role;
select is_empty($$select 1 from usage_counters where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  'refused calls leave no usage_counters row');

select * from finish();
rollback;
