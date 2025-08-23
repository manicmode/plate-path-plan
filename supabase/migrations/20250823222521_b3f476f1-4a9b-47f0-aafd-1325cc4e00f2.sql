-- Clean up empty/whitespace schedules before applying NOT NULL constraint
update public.reminders
set schedule = null
where schedule is not null and btrim(schedule) = '';

-- Apply NOT NULL constraint on schedule after cleanup
do $$
declare n int;
begin
  select count(*) into n from public.reminders where schedule is null;
  if n = 0 then
    alter table public.reminders alter column schedule set not null;
  end if;
end $$;