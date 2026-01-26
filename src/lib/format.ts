// NIL token has 6 decimals (uNIL)
const NIL_DECIMALS = 6;

export function formatNilAmount(amountRaw: bigint): string {
  const amount = Number(amountRaw) / 10 ** NIL_DECIMALS;
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "now";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
