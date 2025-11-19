-- FIX: Infinite Recursion in RLS Policies
-- The issue is that 'plans' checks 'plan_collaborators', and 'plan_collaborators' checks 'plans'.
-- Solution: Use a SECURITY DEFINER function to check plan ownership without triggering RLS on 'plans'.

-- 1. Create a secure function to check ownership
create or replace function public.is_plan_owner(_plan_id uuid)
returns boolean as $$
begin
  -- This query runs with the privileges of the function creator (admin), bypassing RLS
  return exists (
    select 1 from public.plans 
    where id = _plan_id 
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 2. Grant access to the function
grant execute on function public.is_plan_owner to authenticated;
grant execute on function public.is_plan_owner to service_role;

-- 3. Drop the recursive policy
drop policy if exists "Plan owners can manage collaborators." on public.plan_collaborators;

-- 4. Recreate the policy using the secure function
create policy "Plan owners can manage collaborators."
  on public.plan_collaborators for all
  using ( public.is_plan_owner(plan_id) );

