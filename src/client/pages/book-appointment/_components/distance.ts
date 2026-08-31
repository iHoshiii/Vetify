/** Metres as somebody would say them out loud, rounded to the precision they'd trust. */
export function away(meters: number): string {
  if (meters < 950) return `${Math.round(meters / 10) * 10} m away`;

  return `${(meters / 1000).toFixed(meters < 9_950 ? 1 : 0)} km away`;
}
