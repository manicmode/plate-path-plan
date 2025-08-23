-- Apply NOT NULL constraint on schedule since all values are populated
do $$
declare n int;
begin
  select count(*) into n from public.reminders where schedule is null;
  if n = 0 then
    alter table public.reminders alter column schedule set not null;
  end if;
end $$;