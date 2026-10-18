-- Reciclamigo · 0500 · Fotos de lotes
-- Bucket público (lectura por URL). Solo un comercio sube, y solo a su carpeta <uid>/.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lot-photos', 'lot-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Comercios suben fotos de lotes a su carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lot-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.my_role() = 'generador'
  );

insert into public.app_migrations (name) values ('20261017000500_storage') on conflict do nothing;

commit;
