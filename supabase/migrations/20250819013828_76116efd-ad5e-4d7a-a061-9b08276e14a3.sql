-- Fix rpc_update_user_habit to use COALESCE and prevent clearing fields
create or replace function public.rpc_update_user_habit(
  p_user_habit_id uuid,
  p_schedule jsonb default null,
  p_reminder_at time without time zone default null,
  p_target numeric default null,
  p_notes text default null
) returns void
language plpgsql security definer
set search_path=public,pg_temp
as $$
begin
  update public.user_habit uh
     set schedule     = coalesce(p_schedule,     uh.schedule),
         reminder_at  = coalesce(p_reminder_at,  uh.reminder_at),
         target       = coalesce(p_target,       uh.target),
         notes        = coalesce(p_notes,        uh.notes),
         next_due_at  = case
                          when uh.status='active'
                            then public.compute_next_due_at(
                                   uh.start_date,
                                   coalesce(p_schedule,    uh.schedule),
                                   coalesce(p_reminder_at, uh.reminder_at)
                                 )
                          else null
                        end,
         snooze_until = null,
         updated_at   = now()
   where uh.id = p_user_habit_id
     and uh.user_id = auth.uid();
end;
$$;