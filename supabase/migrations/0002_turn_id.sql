-- RF2: 같은 답(clientTurnId)을 두 번 보내도 한 번만 저장한다. assistant 메시지는 NULL.
alter table diary_messages add column client_turn_id text;
alter table diary_messages add constraint diary_messages_turn_unique unique (diary_id, client_turn_id);
