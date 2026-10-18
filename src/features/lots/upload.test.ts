import { describe, expect, test } from "vitest";

import { removeLotPhotos, uploadLotPhotos, validatePhotoFiles, type PhotoStorage } from "./upload";

const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

describe("validatePhotoFiles", () => {
  test("acepta hasta 3 fotos JPG, PNG o WebP de menos de 5 MB", () => {
    expect(validatePhotoFiles([file("a.jpg", "image/jpeg", 1_000_000)])).toBeNull();
    expect(validatePhotoFiles([file("a.png", "image/png", 10), file("b.webp", "image/webp", 10)])).toBeNull();
    expect(validatePhotoFiles([])).toBeNull();
  });

  test("explica qué está mal", () => {
    expect(validatePhotoFiles([file("a.jpg", "image/jpeg", 6_000_000)])).toBe("Cada foto debe pesar menos de 5 MB");
    expect(validatePhotoFiles([file("a.pdf", "application/pdf", 1000)])).toBe("Solo se aceptan fotos JPG, PNG o WebP");
    expect(validatePhotoFiles(Array(4).fill(file("a.jpg", "image/jpeg", 1000)))).toBe("Máximo 3 fotos por lote");
  });
});

// Almacenamiento falso: registra subidas y borrados, y falla en la subida número `failAt`.
function fakeStorage(failAt?: number) {
  const uploaded: string[] = [];
  const removed: string[] = [];
  let calls = 0;
  const storage: PhotoStorage = {
    async upload(path) {
      calls++;
      if (calls === failAt) return { error: { message: "network error" } };
      uploaded.push(path);
      return { error: null };
    },
    async remove(paths) {
      removed.push(...paths);
      return { error: null };
    },
    publicUrl: (path) => `https://cdn.test/lot-photos/${path}`,
  };
  return { storage, uploaded, removed };
}

describe("uploadLotPhotos", () => {
  test("sube a la carpeta del usuario y devuelve URLs públicas", async () => {
    const { storage, uploaded } = fakeStorage();
    const urls = await uploadLotPhotos(storage, "user-1", [file("a.jpg", "image/jpeg", 10), file("b.png", "image/png", 10)]);
    expect(uploaded).toHaveLength(2);
    expect(uploaded[0]).toMatch(/^user-1\/[0-9a-f-]{36}\.jpg$/);
    expect(uploaded[1]).toMatch(/^user-1\/[0-9a-f-]{36}\.png$/);
    expect(urls).toEqual(uploaded.map((p) => `https://cdn.test/lot-photos/${p}`));
  });

  test("si una foto falla a mitad, borra las ya subidas y lanza un error claro", async () => {
    const { storage, uploaded, removed } = fakeStorage(2);
    await expect(
      uploadLotPhotos(storage, "user-1", [file("a.jpg", "image/jpeg", 10), file("b.jpg", "image/jpeg", 10)]),
    ).rejects.toThrow('No se pudo subir la foto "b.jpg". Revisa la conexión e inténtalo de nuevo.');
    expect(removed).toEqual(uploaded);
  });
});

describe("removeLotPhotos", () => {
  test("borra por su ruta en el bucket las fotos de un lote que no se pudo publicar", async () => {
    const { storage, removed } = fakeStorage();
    await removeLotPhotos(storage, [
      "https://abc.supabase.co/storage/v1/object/public/lot-photos/user-1/a.jpg",
      "https://abc.supabase.co/storage/v1/object/public/lot-photos/user-1/b.png",
    ]);
    expect(removed).toEqual(["user-1/a.jpg", "user-1/b.png"]);
  });

  test("con lista vacía no llama al almacenamiento", async () => {
    const { storage, removed } = fakeStorage();
    await removeLotPhotos(storage, []);
    expect(removed).toEqual([]);
  });
});
