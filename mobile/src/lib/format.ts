const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

export function fmtDate(iso: string | null | undefined, style: "short" | "long" | "day" | "dayMonth" = "short"): string {
  if (!iso) return "—";
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (style === "dayMonth") return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (style === "day") return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (style === "long") return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function num(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function ageInMonths(birthDate: string, on: Date = new Date()): number {
  const dob = parseDate(birthDate.slice(0, 10));
  let months = (on.getFullYear() - dob.getFullYear()) * 12 + on.getMonth() - dob.getMonth();
  if (on.getDate() < dob.getDate()) months -= 1;
  return Math.max(months, 0);
}

export function formatAge(birthDate: string): string {
  const months = ageInMonths(birthDate);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} bulan`;
  if (rem === 0) return `${years} tahun`;
  return `${years} tahun ${rem} bulan`;
}

export function fmtZ(z: number | null | undefined): string {
  if (z === null || z === undefined) return "—";
  return `${z > 0 ? "+" : ""}${z.toFixed(2).replace(".", ",")}`;
}

export function statusTone(status: string | null | undefined): "good" | "warn" | "bad" | "muted" {
  if (!status) return "muted";
  const s = status.toLowerCase();
  if (s.includes("sangat") || s.includes("severe") || s.includes("buruk") || s.includes("obes")) return "bad";
  if (s === "normal" || s.includes("baik") || s.startsWith("sesuai")) return "good";
  if (s.includes("belum")) return "muted";
  return "warn";
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return !Number.isNaN(d.getTime()) && toDateString(d) === s;
}
