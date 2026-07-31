alter table public.collections
rename column if to id;

alter table public.documents
add column if not exists user_id uuid,
add column if not exists collection_id uuid;

alter table public.documents
add constraint fk_documents_collections
foreign key (collection_id) references public.collections(id) on delete cascade;

alter table public.documents
add constraint fk_documents_user
foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_collection_id on public.documents(collection_id);

