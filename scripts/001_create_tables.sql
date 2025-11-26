-- Create departments table
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp default now()
);

-- Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  role text not null check (role in ('admin', 'hod', 'employee')), -- role enum
  department_id uuid references public.departments(id),
  position text,
  phone text,
  address text,
  avatar_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create leaves table
create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  leave_type text not null check (leave_type in ('sick', 'casual', 'personal', 'annual')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'hod_approved', 'hod_rejected', 'admin_approved', 'admin_rejected', 'cancelled')),
  hod_id uuid references public.profiles(id),
  hod_approval_date timestamp,
  hod_notes text,
  admin_id uuid references public.profiles(id),
  admin_approval_date timestamp,
  admin_notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create announcements table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  title text not null,
  content text not null,
  department_id uuid references public.departments(id), -- null means company-wide
  visibility text not null default 'all' check (visibility in ('all', 'department', 'hod', 'admin')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create attendance table
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  check_in timestamp,
  check_out timestamp,
  date date not null,
  status text default 'present' check (status in ('present', 'absent', 'half_day', 'leave')),
  created_at timestamp default now()
);

-- Create performance_reviews table
create table if not exists public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  rating numeric check (rating >= 1 and rating <= 5),
  feedback text,
  review_date timestamp default now(),
  created_at timestamp default now()
);

-- Enable Row Level Security
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.leaves enable row level security;
alter table public.announcements enable row level security;
alter table public.attendance enable row level security;
alter table public.performance_reviews enable row level security;

-- RLS Policies for departments
create policy "departments_select_all" on public.departments for select using (true);

-- RLS Policies for profiles
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select using (
  exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "profiles_select_hod" on public.profiles for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hod' and p.department_id = public.profiles.department_id)
);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- RLS Policies for leaves
create policy "leaves_select_own" on public.leaves for select using (auth.uid() = employee_id);
create policy "leaves_select_admin" on public.leaves for select using (
  exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "leaves_select_hod" on public.leaves for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hod' and p.department_id = public.leaves.department_id)
);
create policy "leaves_insert_own" on public.leaves for insert with check (auth.uid() = employee_id);
create policy "leaves_update_own" on public.leaves for update using (auth.uid() = employee_id and status = 'pending');
create policy "leaves_update_hod" on public.leaves for update using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hod' and p.id = public.leaves.hod_id and public.leaves.status = 'pending')
);
create policy "leaves_update_admin" on public.leaves for update using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and public.leaves.status = 'hod_approved')
);

-- RLS Policies for announcements
create policy "announcements_select_all" on public.announcements for select using (true);
create policy "announcements_insert_admin" on public.announcements for insert with check (
  exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- RLS Policies for attendance
create policy "attendance_select_own" on public.attendance for select using (auth.uid() = employee_id);
create policy "attendance_select_admin" on public.attendance for select using (
  exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "attendance_select_hod" on public.attendance for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hod' and p.department_id = public.attendance.department_id)
);

-- RLS Policies for performance_reviews
create policy "reviews_select_own" on public.performance_reviews for select using (auth.uid() = employee_id or auth.uid() = reviewer_id);
create policy "reviews_select_admin" on public.performance_reviews for select using (
  exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
