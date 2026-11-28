-- =============================================================================
-- Migration 41: "please finish your profile" reminder email.
--
-- A member who created an account but has not completed their profile gets a
-- reminder 2 days after joining, and one last reminder a week after that.
-- Never more than two. Not sent to: banned members, profiles an agency posted
-- for a client, people who never confirmed their email address, or members
-- who switched off "Tips and reminders" in Settings.
--
-- At most 30 of these are queued per day (setting profile_nudge_daily_cap), so
-- catching up on older unfinished accounts cannot use up the day's email
-- allowance that login emails also depend on. The backlog clears over a few
-- days by itself.
-- Safe to run more than once.
-- =============================================================================

insert into public.app_settings (key, value, description)
values ('profile_nudge_daily_cap', '30'::jsonb,
        'Most "finish your profile" reminder emails queued per day. 0 switches the reminder off.')
on conflict (key) do nothing;

-- The reminder belongs to the "Tips and reminders" switch in Settings.
create or replace function public.email_category(p_template text)
returns text
language sql immutable
as $$
  select case
    when p_template in ('new_message', 'locked_message') then 'new_messages'
    when p_template like 'membership_%' then 'membership'
    when p_template = 'saved_search' then 'saved_searches'
    when p_template in ('verify_nudge', 'profile_nudge') then 'nudges'
    else 'always'   -- welcome, identity results, security notices
  end;
$$;

create or replace function public.enqueue_profile_nudges()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer := 0; p record; v_cap integer; v_today integer; v_sent integer;
begin
  select coalesce((s.value #>> '{}')::integer, 30) into v_cap from public.app_settings s where s.key = 'profile_nudge_daily_cap';
  v_cap := coalesce(v_cap, 30);
  select count(*) into v_today from public.email_outbox e
   where e.template = 'profile_nudge' and e.created_at >= date_trunc('day', now());
  if v_today >= v_cap then return 0; end if;

  for p in
    select pr.id, pr.role,
           (select count(*) from public.email_outbox e where e.user_id = pr.id and e.template = 'profile_nudge') as sent
      from public.profiles pr
      join auth.users au on au.id = pr.id
     where not pr.is_complete
       and pr.banned_at is null
       and pr.managed_by is null
       and au.email_confirmed_at is not null
       and pr.created_at < now() - interval '2 days'
     order by pr.created_at desc
  loop
    exit when v_today + n >= v_cap;
    v_sent := p.sent;
    -- First reminder after 2 days; a second and last one at least 7 days after the first.
    if v_sent = 0
       or (v_sent = 1 and not exists (select 1 from public.email_outbox e
                                       where e.user_id = p.id and e.template = 'profile_nudge'
                                         and e.created_at > now() - interval '7 days')) then
      perform public.enqueue_email(p.id, 'profile_nudge',
        jsonb_build_object('role', p.role, 'last', v_sent = 1), 'profile_nudge:' || p.id || ':' || (v_sent + 1));
      -- Count it only if it was really queued (the member may have reminders switched off).
      if exists (select 1 from public.email_outbox e where e.dedupe_key = 'profile_nudge:' || p.id || ':' || (v_sent + 1)
                    and e.created_at >= now() - interval '1 minute') then
        n := n + 1;
      end if;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.enqueue_profile_nudges() from public, anon, authenticated;
grant execute on function public.enqueue_profile_nudges() to service_role;
