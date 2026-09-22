-- Run once on projects that already have the documents table.
alter table public.documents
 add column if not exists signature_width_mm smallint not null default 58 check(signature_width_mm between 30 and 80),
 add column if not exists signature_align text not null default 'right' check(signature_align in ('left','center','right')),
 add column if not exists signature_gap_mm smallint not null default 14 check(signature_gap_mm between 0 and 30);
