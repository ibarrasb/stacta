create table if not exists app_user (
  id uuid primary key,
  cognito_sub text not null unique,
  email text,
  created_at timestamptz not null default now()
);
