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
  const secs = seconds % 60;

  if (hours > 0) {
    const hourLabel = hours === 1 ? "hour" : "hours";
    if (minutes > 0) {
      const minLabel = minutes === 1 ? "minute" : "minutes";
      return `${hours} ${hourLabel} ${minutes} ${minLabel}`;
    }
    return `${hours} ${hourLabel}`;
  }
  if (minutes > 0) {
    const minLabel = minutes === 1 ? "minute" : "minutes";
    return `${minutes} ${minLabel}`;
  }
  const secLabel = secs === 1 ? "second" : "seconds";
  return `${secs} ${secLabel}`;
}
