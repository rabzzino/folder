-- Add assigned_to to tasks
alter table public.tasks add column assigned_to text; 

-- Create plan_collaborators table
create table public.plan_collaborators (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.plans on delete cascade not null,
  user_id uuid references auth.users not null,
  role text default 'editor', -- 'editor', 'viewer'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(plan_id, user_id)
);

-- Enable RLS
alter table public.plan_collaborators enable row level security;

-- Collaborators policies
create policy "Users can view collaborations they are part of."
  on plan_collaborators for select
  using ( auth.uid() = user_id );

create policy "Plan owners can manage collaborators."
  on plan_collaborators for all
  using ( exists ( select 1 from plans where plans.id = plan_collaborators.plan_id and plans.user_id = auth.uid() ) );

-- Update Plans policies to include collaborators
create policy "Collaborators can view plans."
  on plans for select
  using ( 
    exists ( select 1 from plan_collaborators where plan_collaborators.plan_id = plans.id and plan_collaborators.user_id = auth.uid() )
    or auth.uid() = user_id 
  );

-- Update Tasks policies to include collaborators
create policy "Collaborators can view tasks."
  on tasks for select
  using ( 
    exists ( select 1 from plans where plans.id = tasks.plan_id and (
      plans.user_id = auth.uid() or 
      exists ( select 1 from plan_collaborators where plan_collaborators.plan_id = plans.id and plan_collaborators.user_id = auth.uid() )
    ))
  );

create policy "Collaborators can update tasks."
  on tasks for update
  using ( 
    exists ( select 1 from plans where plans.id = tasks.plan_id and (
      plans.user_id = auth.uid() or 
      exists ( select 1 from plan_collaborators where plan_collaborators.plan_id = plans.id and plan_collaborators.user_id = auth.uid() )
    ))
  );

