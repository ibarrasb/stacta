create extension if not exists "pgcrypto";

create table if not exists fragrance (
  id uuid primary key default gen_random_uuid(),
  external_source text not null,          -- e.g. "fragella"
  external_id text not null,              -- id from fragella
  name text not null,
  brand text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_source, external_id)
);
