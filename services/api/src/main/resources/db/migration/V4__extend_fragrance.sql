-- Make snapshot safe (non-null) for existing + future rows
update fragrance
set snapshot = '{}'::jsonb
where snapshot is null;

alter table fragrance
  alter column snapshot set not null;

-- Add optional fields we might store from Fragella
alter table fragrance
  add column if not exists year text,
  add column if not exists gender text,
  add column if not exists rating text,
  add column if not exists price text;
