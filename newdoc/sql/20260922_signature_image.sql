-- Run once on projects with an existing documents table.
alter table public.documents
 add column if not exists signature_width_mm smallint not null default 40,
 add column if not exists signature_align text not null default 'right',
 add column if not exists signature_gap_mm smallint not null default 14,
 add column if not exists signature_image_x_mm smallint not null default 0,
 add column if not exists signature_image_y_mm smallint not null default 0;

alter table public.documents drop constraint if exists documents_signature_width_mm_check;
alter table public.documents alter column signature_width_mm set default 40;
update public.documents
 set signature_width_mm = greatest(15, least(70, case when signature_width_mm = 58 then 40 else signature_width_mm end));
alter table public.documents add constraint documents_signature_width_mm_check check (signature_width_mm between 15 and 70);
alter table public.documents drop constraint if exists documents_signature_align_check;
alter table public.documents add constraint documents_signature_align_check check (signature_align in ('left','center','right'));
alter table public.documents drop constraint if exists documents_signature_gap_mm_check;
alter table public.documents add constraint documents_signature_gap_mm_check check (signature_gap_mm between 0 and 30);
alter table public.documents drop constraint if exists documents_signature_image_x_mm_check;
alter table public.documents add constraint documents_signature_image_x_mm_check check (signature_image_x_mm between -20 and 20);
alter table public.documents drop constraint if exists documents_signature_image_y_mm_check;
alter table public.documents add constraint documents_signature_image_y_mm_check check (signature_image_y_mm between -10 and 10);
