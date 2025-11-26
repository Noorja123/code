-- Insert departments
insert into public.departments (name) values
  ('Engineering'),
  ('Human Resources'),
  ('Sales'),
  ('Marketing'),
  ('Finance')
on conflict do nothing;

-- Note: Admin and HOD users need to be created through signup
-- This seed script demonstrates the structure
