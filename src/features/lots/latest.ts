/** Descarta respuestas viejas: solo la última petición iniciada debe pintarse. */
export function createLatestGuard() {
  let current = 0;
  return {
    next: () => ++current,
    isLatest: (id: number) => id === current,
  };
}
