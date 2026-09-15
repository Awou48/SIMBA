export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", opts);
}

export function ageInMonths(birthDate: string, on: Date = new Date()): number {
  const dob = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  let months = (on.getFullYear() - dob.getFullYear()) * 12 + on.getMonth() - dob.getMonth();
  if (on.getDate() < dob.getDate()) months -= 1;
  return Math.max(months, 0);
}

export function formatAge(birthDate: string, short = false): string {
  const months = ageInMonths(birthDate);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (short) return years === 0 ? `${rem} mo` : `${years} yr ${rem} mo`;
  if (years === 0) return `${rem} month${rem === 1 ? "" : "s"} old`;
  return `${years} year${years === 1 ? "" : "s"}, ${rem} month${rem === 1 ? "" : "s"} old`;
}

export function fmtZ(z: number | null | undefined): string {
  if (z === null || z === undefined) return "—";
  return `${z > 0 ? "+" : ""}${z.toFixed(2)}`;
}

export function zTone(z: number | null | undefined): "good" | "warn" | "bad" | "muted" {
  if (z === null || z === undefined) return "muted";
  const a = Math.abs(z);
  if (a < 2) return "good";
  if (a < 3) return "warn";
  return "bad";
}

export function statusTone(status: string | null | undefined): "good" | "warn" | "bad" | "muted" {
  if (!status) return "muted";
  const s = status.toLowerCase();
  if (s.includes("sangat") || s.includes("severe") || s.includes("buruk") || s.includes("obes")) return "bad";
  if (s === "normal" || s.includes("baik")) return "good";
  if (s.includes("belum")) return "muted";
  return "warn";
}

export function pct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits)}%`;
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && toDateString(d) === s;
}
