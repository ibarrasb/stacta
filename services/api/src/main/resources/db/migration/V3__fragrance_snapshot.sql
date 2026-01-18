alter table fragrance
  add column if not exists snapshot jsonb;

create index if not exists idx_fragrance_name on fragrance (name);
create index if not exists idx_fragrance_brand on fragrance (brand);
