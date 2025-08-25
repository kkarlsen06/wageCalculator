-- 2025-08-25_on-delete-cascade_user-settings_shifts.sql
alter table user_settings
drop constraint if exists user_settings_user_id_fkey,
add  constraint user_settings_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table user_shifts
drop constraint if exists user_shifts_user_id_fkey,
add  constraint user_shifts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;