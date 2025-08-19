-- Bulk add habits for the current user
create or replace function public.rpc_add_user_habits_bulk(
  p_items jsonb  -- e.g. [{"slug":"zone2-cardio-20","schedule":{"type":"daily"},"reminder_at":"08:00"}, ...]
) returns table(user_habit_id uuid, slug text)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_item jsonb;
  v_slug text;
  v_schedule jsonb;
  v_reminder time;
  v_target numeric;
  v_notes text;
  v_id uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_slug     := (v_item->>'slug');
    v_schedule := coalesce(v_item->'schedule', jsonb_build_object('type','daily'));
    v_reminder := nullif(v_item->>'reminder_at','')::time;
    v_target   := nullif(v_item->>'target','')::numeric;
    v_notes    := nullif(v_item->>'notes','');

    -- validate slug exists in habit_template
    if not exists (select 1 from public.habit_template where slug = v_slug) then
      continue; -- ignore invalid slugs
    end if;

    -- skip if already active for user
    if exists (
      select 1 from public.user_habit
      where user_id = auth.uid() and slug = v_slug and status = 'active'
    ) then
      continue;
    end if;

    -- insert new habit
    insert into public.user_habit(user_id, slug, schedule, reminder_at, target, notes, status)
    values (auth.uid(), v_slug, v_schedule, v_reminder, v_target, v_notes, 'active')
    returning id into v_id;

    user_habit_id := v_id; 
    slug := v_slug; 
    return next;
  end loop;
end;
$$;

-- Set proper permissions
revoke all on function public.rpc_add_user_habits_bulk(jsonb) from public, anon;
grant execute on function public.rpc_add_user_habits_bulk(jsonb) to authenticated;