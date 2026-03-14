/** Replace underscores with spaces and capitalize every word. */
export function formatStatus(s: string | null): string {
  if (!s) return "—";
  if (s.toLowerCase().replace(/_/g, " ") === "no interaction yet") return "N/A";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
