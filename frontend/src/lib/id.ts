const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export type Tone = "coral" | "teal" | "yellow" | "violet" | "good" | "warn" | "bad" | "muted";

export function parseDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export function ageInMonthsId(birthDate: string, on: Date = new Date()): number {
  const dob = parseDate(birthDate.slice(0, 10));
  let months = (on.getFullYear() - dob.getFullYear()) * 12 + on.getMonth() - dob.getMonth();
  if (on.getDate() < dob.getDate()) months -= 1;
  return Math.max(months, 0);
}

export function formatAgeId(birthDate: string): string {
  const months = ageInMonthsId(birthDate);
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

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return "muted";
  const s = status.toLowerCase();
  if (s.includes("sangat") || s.includes("buruk") || s.includes("obes")) return "bad";
  if (s === "normal" || s.includes("baik") || s.startsWith("sesuai")) return "good";
  if (s.includes("belum")) return "muted";
  return "warn";
}

export function zPlain(z: number | null | undefined): string {
  if (z === null || z === undefined) return "belum diukur";
  if (z < -3) return "jauh di bawah rata-rata";
  if (z < -2) return "di bawah rata-rata";
  if (z > 3) return "jauh di atas rata-rata";
  if (z > 2) return "di atas rata-rata";
  if (z < -1) return "sedikit di bawah rata-rata";
  if (z > 1) return "sedikit di atas rata-rata";
  return "sesuai rata-rata";
}

export interface Verdict {
  icon: string;
  headline: string;
  detail: string;
  tone: Tone;
}

export function growthVerdict(name: string, stunting: string | null | undefined, weight: string | null | undefined, wasting?: string | null): Verdict {
  const s = (stunting ?? "").toLowerCase();
  const w = (weight ?? "").toLowerCase();
  const ws = (wasting ?? "").toLowerCase();
  if (!stunting) return { icon: "ruler", headline: `Yuk, ukur ${name}`, detail: "Masukkan berat dan tinggi hari ini untuk melihat pertumbuhannya.", tone: "muted" };
  if (s.includes("sangat pendek")) return { icon: "stethoscope", headline: `${name} jauh lebih pendek dari seusianya`, detail: "Segera periksa ke Posyandu atau dokter. Pemeriksaan rutin dan makanan bergizi sangat membantu.", tone: "bad" };
  if (s.includes("pendek")) return { icon: "leaf", headline: `${name} sedikit lebih pendek dari seusianya`, detail: "Beri makanan kaya protein setiap hari dan ukur lagi bulan depan.", tone: "warn" };
  if (s.includes("tinggi")) return { icon: "trending-up", headline: `${name} tinggi untuk usianya`, detail: "Bagus! Lanjutkan pola makan dan kebiasaan sehatnya.", tone: "good" };
  if (ws.includes("buruk") || ws.includes("kurang") || w.includes("sangat kurang")) return { icon: "utensils", headline: `${name} perlu makanan yang lebih bergizi`, detail: "Berat badannya kurang untuk tinggi badannya. Makan sedikit tapi sering, dengan telur, ikan, atau tempe.", tone: "warn" };
  if (ws.includes("obes") || ws.includes("lebih") || w.includes("lebih")) return { icon: "apple", headline: `${name} sedikit di atas berat sehat`, detail: "Perbanyak waktu bermain aktif dan kurangi minuman manis.", tone: "warn" };
  return { icon: "sun", headline: `${name} tumbuh dengan baik!`, detail: "Berat dan tinggi badannya sesuai usia. Ukur lagi bulan depan, ya.", tone: "good" };
}

export function nutritionVerdict(pct: number | null | undefined, logged: boolean): Verdict {
  if (pct === null || pct === undefined || !logged) return { icon: "utensils", headline: "Apa yang dimakan hari ini?", detail: "Catat makanan untuk melihat apakah kebutuhan hariannya sudah tercukupi.", tone: "muted" };
  if (pct < 50) return { icon: "coffee", headline: "Masih perlu makan lagi", detail: "Energi hari ini belum sampai setengah. Tambah camilan seperti susu atau buah.", tone: "warn" };
  if (pct < 90) return { icon: "utensils", headline: "Sudah bagus, sedikit lagi", detail: "Sebagian besar kebutuhan energi sudah tercukupi. Satu kali makan lagi cukup.", tone: "good" };
  if (pct <= 130) return { icon: "smile", headline: "Kebutuhan hari ini tercukupi!", detail: "Energi harian sudah terpenuhi. Kerja bagus.", tone: "good" };
  return { icon: "apple", headline: "Sudah lebih dari cukup", detail: "Di atas kebutuhan harian. Besok porsinya bisa sedikit lebih ringan.", tone: "warn" };
}

export function kpspVerdict(interpretation: string | null | undefined, answered: number, total: number): Verdict {
  if (answered < total) return { icon: "puzzle", headline: `${total - answered} pertanyaan lagi`, detail: "Jawab semuanya untuk melihat hasil perkembangannya.", tone: "muted" };
  const s = (interpretation ?? "").toLowerCase();
  if (s.startsWith("sesuai")) return { icon: "party-popper", headline: "Perkembangan sesuai usia", detail: "Semua kemampuan yang diharapkan sudah ada. Cek lagi di tahap usia berikutnya.", tone: "good" };
  if (s.startsWith("meragukan")) return { icon: "gamepad-2", headline: "Beberapa kemampuan masih berkembang", detail: "Latih sambil bermain dan cek lagi dua minggu ke depan.", tone: "warn" };
  return { icon: "stethoscope", headline: "Sebaiknya konsultasi ke petugas kesehatan", detail: "Beberapa kemampuan belum muncul. Bantuan lebih awal lebih baik.", tone: "bad" };
}

export function immunizationVerdict(overdue: number, due: number, nextName: string | null): Verdict {
  if (overdue > 0) return { icon: "syringe", headline: `${overdue} imunisasi terlambat`, detail: "Datang ke Posyandu atau Puskesmas untuk mengejar. Tidak ada kata terlambat.", tone: "bad" };
  if (due > 0) return { icon: "calendar", headline: `${due} imunisasi saatnya diberikan`, detail: nextName ? `${nextName} dijadwalkan bulan ini.` : "Saatnya dosis berikutnya.", tone: "warn" };
  return { icon: "shield-check", headline: "Imunisasi lengkap sesuai jadwal", detail: nextName ? `Berikutnya: ${nextName}.` : "Semua dosis rutin sudah diberikan.", tone: "good" };
}

export const MEAL_LABEL: Record<string, string> = { Breakfast: "Sarapan", Lunch: "Makan siang", Dinner: "Makan malam", Snack: "Camilan" };
export const MEAL_ICON: Record<string, string> = { Breakfast: "sunrise", Lunch: "sun", Dinner: "moon", Snack: "cookie" };
export const DOMAIN_LABEL: Record<string, string> = { "Motorik Kasar": "Gerak tubuh", "Motorik Halus": "Gerak tangan", Bicara: "Bicara", "Bicara & Bahasa": "Bicara & bahasa", Sosialisasi: "Bergaul", "Sosialisasi & Kemandirian": "Bergaul & mandiri" };
export const CATEGORY_LABEL: Record<string, string> = { Growth: "Pertumbuhan", Nutrition: "Makan", Development: "Perkembangan", Immunization: "Imunisasi" };
export const CATEGORY_ICON: Record<string, string> = { Growth: "ruler", Nutrition: "utensils", Development: "puzzle", Immunization: "syringe" };
export const SEVERITY_LABEL: Record<string, string> = { high: "Penting", medium: "Perlu dilihat", low: "Tips" };
export const EVENT_LABEL: Record<string, string> = { Vaccination: "Imunisasi", "Doctor Visit": "Dokter", Checkup: "Pemeriksaan", Other: "Lainnya" };
