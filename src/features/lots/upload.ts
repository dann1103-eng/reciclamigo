import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // igual que el límite del bucket lot-photos
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Devuelve el mensaje de error para mostrar, o null si las fotos están bien. */
export function validatePhotoFiles(files: File[]): string | null {
  if (files.length > MAX_PHOTOS) return "Máximo 3 fotos por lote";
  if (files.some((f) => !(f.type in EXTENSIONS))) return "Solo se aceptan fotos JPG, PNG o WebP";
  if (files.some((f) => f.size > MAX_PHOTO_BYTES)) return "Cada foto debe pesar menos de 5 MB";
  return null;
}

/** Lo mínimo de Supabase Storage que necesita la subida (permite probarla sin red). */
export type PhotoStorage = {
  upload(path: string, file: File): Promise<{ error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ error: unknown }>;
  publicUrl(path: string): string;
};

export function supabasePhotoStorage(supabase: SupabaseClient<Database>): PhotoStorage {
  const bucket = supabase.storage.from("lot-photos");
  return {
    upload: (path, file) => bucket.upload(path, file, { contentType: file.type, upsert: false }),
    remove: (paths) => bucket.remove(paths),
    publicUrl: (path) => bucket.getPublicUrl(path).data.publicUrl,
  };
}

/**
 * Sube las fotos a <userId>/<uuid>.<ext> y devuelve sus URLs públicas.
 * Si una falla, borra las que ya subió: nunca se publica un lote con fotos rotas.
 */
export async function uploadLotPhotos(storage: PhotoStorage, userId: string, files: File[]): Promise<string[]> {
  const done: string[] = [];
  for (const file of files) {
    const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? "jpg"}`;
    const { error } = await storage.upload(path, file);
    if (error) {
      if (done.length) await storage.remove(done);
      throw new Error(`No se pudo subir la foto "${file.name}". Revisa la conexión e inténtalo de nuevo.`);
    }
    done.push(path);
  }
  return done.map((path) => storage.publicUrl(path));
}
