-- Per-entry comment threads (nested replies via parent_id).
-- user_id is TEXT (Better Auth / dev-user). author_* denormalized at write time.

create table if not exists comments (
  id           text primary key,
  entry_id     text not null,
  user_id      text not null,
  parent_id    text references comments (id) on delete cascade,
  body         text not null,
  author_name  text not null,
  author_image text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists comments_entry_id_idx on comments (entry_id);
create index if not exists comments_parent_id_idx on comments (parent_id);
create index if not exists comments_user_id_idx on comments (user_id);
