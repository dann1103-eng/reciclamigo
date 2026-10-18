const oneDecimal = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });

export function formatKg(kg: number): string {
  return `${oneDecimal.format(kg)} kg`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${oneDecimal.format(meters / 1000)} km`;
}

export function formatUSD(amount: number): string {
  return usd.format(amount);
}
