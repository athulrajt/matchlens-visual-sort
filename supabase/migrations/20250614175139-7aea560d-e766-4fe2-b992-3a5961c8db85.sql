
-- Create a table for user profiles to store first names
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  first_name text,
  primary key (id)
);

-- This function automatically creates a profile for a new user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, new.raw_user_meta_data->>'first_name');
  return new;
end;
$$;

-- This trigger calls the function when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Row Level Security for profiles
alter table public.profiles enable row level security;

-- Policies for profiles table
create policy "Users can view their own profile."
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Create a table to store clusters for each user
create table public.clusters (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  tags text[],
  palette text[],
  created_at timestamptz not null default now()
);

-- Enable Row Level Security for clusters
alter table public.clusters enable row level security;

-- Policy for clusters table
create policy "Users can manage their own clusters."
  on public.clusters for all
  using ( auth.uid() = user_id ) with check (auth.uid() = user_id);

-- Create a table to store images within each cluster
create table public.images (
    id uuid not null default gen_random_uuid() primary key,
    cluster_id uuid not null references public.clusters on delete cascade,
    user_id uuid not null references auth.users on delete cascade,
    image_path text not null, -- path in storage bucket
    alt text not null,
    created_at timestamptz not null default now()
);

-- Enable Row Level Security for images
alter table public.images enable row level security;

-- Policy for images table
create policy "Users can manage their own images."
  on public.images for all
  using ( auth.uid() = user_id ) with check (auth.uid() = user_id);

-- Create a storage bucket for cluster images
insert into storage.buckets (id, name, public)
values ('cluster-images', 'cluster-images', true)
on conflict (id) do nothing;

-- Policies for storage bucket
create policy "Users can view their own cluster images."
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'cluster-images' and auth.uid() = (storage.foldername(name))[1]::uuid );

create policy "Users can upload cluster images."
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'cluster-images' and auth.uid() = (storage.foldername(name))[1]::uuid );

create policy "Users can update their own cluster images."
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'cluster-images' and auth.uid() = (storage.foldername(name))[1]::uuid );

create policy "Users can delete their own cluster images."
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'cluster-images' and auth.uid() = (storage.foldername(name))[1]::uuid );

