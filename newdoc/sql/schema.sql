create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 first_name text not null default '', last_name text not null default '', position text not null default '',
 department text not null default '', email text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.signatures (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 signature_url text not null, signature_name text not null default 'ลายเซ็น', created_at timestamptz not null default now(),
 unique(id,user_id)
);
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 department text not null default '', document_number text not null default '', document_date date,
 subject text not null default '', recipient text not null default '', content text not null default '',
 signer_name text not null default '', signer_position text not null default '',
 status text not null default 'draft' check(status in ('draft','completed')),
 signature_id uuid, signature_width_mm smallint not null default 40 check(signature_width_mm between 15 and 70),
 signature_align text not null default 'right' check(signature_align in ('left','center','right')),
 signature_gap_mm smallint not null default 14 check(signature_gap_mm between 0 and 30),
 signature_image_x_mm smallint not null default 0 check(signature_image_x_mm between -20 and 20),
 signature_image_y_mm smallint not null default 0 check(signature_image_y_mm between -10 and 10),
 pdf_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint documents_signature_owner_fk foreign key(signature_id,user_id) references public.signatures(id,user_id) on delete set null (signature_id)
);
create index if not exists documents_user_created_idx on public.documents(user_id,created_at desc);
create index if not exists signatures_user_idx on public.signatures(user_id);
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents for each row execute function public.touch_updated_at();
