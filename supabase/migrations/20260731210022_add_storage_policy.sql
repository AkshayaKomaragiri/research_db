-- 1. Drop existing policies if they already exist (prevents duplicate policy errors)
drop policy if exists "Users can upload files to their own folder" on storage.objects;
drop policy if exists "Users can read their own files" on storage.objects;

-- 2. Policy allowing authenticated users to upload to their folder
create policy "Users can upload files to their own folder" 
on storage.objects 
for insert 
to authenticated 
with check (
  bucket_id = 'user-documents' 
  and (auth.uid() = (storage.foldername(name))[1]::uuid)
);

-- 3. Policy allowing authenticated users to view/download their files
create policy "Users can read their own files" 
on storage.objects 
for select 
to authenticated 
using (
  bucket_id = 'user-documents' 
  and (auth.uid() = (storage.foldername(name))[1]::uuid)
);