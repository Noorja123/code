-- Updated trigger to handle role and department_id from signup metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text;
  selected_department_id uuid;
begin
  -- Extract role and department from user metadata, default to 'employee'
  selected_role := coalesce(new.raw_user_meta_data->>'role', 'employee');
  selected_department_id := (new.raw_user_meta_data->>'department_id')::uuid;
  
  insert into public.profiles (id, email, first_name, last_name, role, department_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    selected_role,
    selected_department_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
