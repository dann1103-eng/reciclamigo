const oneDecimal = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
const usdPerLb = new Intl.NumberFormat("es-SV", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${oneDecimal.format(meters / 1000)} km`;
}

export function formatUSD(amount: number): string {
  return usd.format(amount);
}

/** Precio por libra: "$0.09/lb"; un tercer decimal solo si hace falta. */
export function formatPricePerLb(price: number): string {
  return `${usdPerLb.format(price)}/lb`;
}
