-- Supabase schema khởi đầu cho TEAM DUTY
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role text not null default 'student' check(role in ('student','teacher'))
);
create table if not exists public.availability (
 id bigint generated always as identity primary key,
 student_id uuid not null references public.profiles(id) on delete cascade,
 duty_date date not null,
 shift text not null check(shift in ('Sáng','Chiều','Tối')),
 unique(student_id,duty_date,shift)
);
create table if not exists public.assignments (
 id bigint generated always as identity primary key,
 student_id uuid not null references public.profiles(id) on delete cascade,
 duty_date date not null,
 shift text not null check(shift in ('Sáng','Chiều','Tối')),
 status text not null default 'draft' check(status in ('draft','published')),
 assigned_by uuid references public.profiles(id),
 unique(student_id,duty_date,shift)
);
alter table public.profiles enable row level security;
alter table public.availability enable row level security;
alter table public.assignments enable row level security;
-- Lưu ý: cần hoàn thiện policy teacher/student trước khi triển khai thật.
