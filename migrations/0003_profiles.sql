-- App-local profile (nickname used only in this archive app)

create table if not exists profiles (
  user_id    text primary key,
  nickname   text not null,
  updated_at timestamptz not null default now()
);
